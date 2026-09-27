/**
 * Phase E7 — Client Real-Time Service
 * Manages WebSocket connection, subscription channels, heartbeat, reconnects,
 * typing indicators, presence, and event listeners.
 */

class RealtimeClient {
  constructor() {
    this.ws = null;
    this.token = null;
    this.status = 'OFFLINE'; // OFFLINE | CONNECTING | CONNECTED | RECONNECTING
    this.subscriptions = new Set(); // Set of active bookingIds
    this.listeners = new Map(); // event -> Set<handler>
    this.statusListeners = new Set(); // Set<handler>
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.pingTimer = null;
  }

  setStatus(status) {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((fn) => fn(status));
    }
  }

  onStatusChange(fn) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  connect(token) {
    if (!token) return;
    if (this.ws && (this.status === 'CONNECTED' || this.status === 'CONNECTING')) {
      if (this.token === token) return;
      this.disconnect();
    }

    this.token = token;
    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Resubscribe to existing active rooms after reconnect
        for (const bookingId of this.subscriptions) {
          this.send('subscribe', { bookingId });
        }

        // Notify reconnect listeners for missed message recovery
        this.emit('reconnect', { timestamp: new Date() });
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event) {
            this.emit(parsed.event, parsed.data);
          }
        } catch (err) {
          console.warn('[RealtimeClient] Parse error:', err);
        }
      };

      this.ws.onclose = (e) => {
        this.stopHeartbeat();
        if (this.status !== 'OFFLINE') {
          this.setStatus('RECONNECTING');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[RealtimeClient] Socket error:', err);
      };
    } catch (err) {
      console.error('[RealtimeClient] Connection error:', err);
      this.setStatus('OFFLINE');
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('OFFLINE');
      return;
    }

    const delay = Math.min(10000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      if (this.token) this.connect(this.token);
    }, delay);
  }

  disconnect() {
    this.setStatus('OFFLINE');
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.subscriptions.clear();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.token = null;
  }

  send(event, data = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify({ event, data }));
      return true;
    } catch (err) {
      console.warn('[RealtimeClient] Send error:', err);
      return false;
    }
  }

  subscribe(bookingId) {
    if (!bookingId) return;
    this.subscriptions.add(bookingId);
    if (this.status === 'CONNECTED') {
      this.send('subscribe', { bookingId });
    }
  }

  unsubscribe(bookingId) {
    if (!bookingId) return;
    this.subscriptions.delete(bookingId);
    if (this.status === 'CONNECTED') {
      this.send('unsubscribe', { bookingId });
    }
  }

  startTyping(bookingId) {
    if (bookingId) this.send('typing:start', { bookingId });
  }

  stopTyping(bookingId) {
    if (bookingId) this.send('typing:stop', { bookingId });
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((fn) => fn(data));
    }
  }
}

export const realtime = new RealtimeClient();
