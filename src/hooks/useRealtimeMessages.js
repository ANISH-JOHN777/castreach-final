import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { realtime } from '../services/realtime';

/**
 * useRealtimeMessages — manages real-time messaging, typing indicators, read receipts,
 * and connection status for a specific booking channel, with REST fallback & recovery.
 *
 * Returns { messages, setMessages, loading, error, connectionStatus, typingUser, startTyping, stopTyping, markRead }
 */
export function useRealtimeMessages(bookingId, pollIntervalMs = 10000) {
  const { user, authFetch } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(realtime.status);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Fetch full history via REST
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!bookingId) return;
    if (isInitial) setLoading(true);
    try {
      const res = await authFetch(`/messages/${bookingId}`);
      const data = await res.json();
      if (res.ok && isMountedRef.current) {
        setMessages(data.messages || []);
        setError(null);
      } else if (isMountedRef.current) {
        setError(data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      if (isMountedRef.current) setError(err.message);
    } finally {
      if (isMountedRef.current && isInitial) setLoading(false);
    }
  }, [bookingId, authFetch]);

  // Connect & subscribe to realtime websocket
  useEffect(() => {
    isMountedRef.current = true;
    if (!bookingId) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token') || (user && user.token);
    if (token) {
      realtime.connect(token);
    }
    realtime.subscribe(bookingId);

    // Track status
    const unsubscribeStatus = realtime.onStatusChange((status) => {
      if (isMountedRef.current) setConnectionStatus(status);
    });

    // Listen for new messages
    const unsubscribeNew = realtime.on('message:new', (newMsg) => {
      if (!isMountedRef.current || !newMsg || newMsg.booking !== bookingId) return;
      setMessages((prev) => {
        // Deduplicate by _id
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        // Sort deterministically by createdAt / _id
        const next = [...prev, newMsg];
        return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
    });

    // Listen for read receipts
    const unsubscribeRead = realtime.on('message:read', (data) => {
      if (!isMountedRef.current || data.bookingId !== bookingId) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === data.messageId ? { ...m, isRead: true } : m))
      );
    });

    // Listen for typing events
    const unsubscribeTypingStart = realtime.on('typing:start', (data) => {
      if (!isMountedRef.current || data.bookingId !== bookingId) return;
      if (data.userId !== user?._id) {
        setTypingUser({ userId: data.userId, name: data.senderName || 'Participant' });
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setTypingUser(null);
        }, 4000);
      }
    });

    const unsubscribeTypingStop = realtime.on('typing:stop', (data) => {
      if (!isMountedRef.current || data.bookingId !== bookingId) return;
      if (data.userId !== user?._id) {
        setTypingUser(null);
      }
    });

    // Listen for reconnect to recover missed messages
    const unsubscribeReconnect = realtime.on('reconnect', () => {
      fetchMessages(false);
    });

    // Initial fetch
    fetchMessages(true);

    // Fallback polling only when OFFLINE
    const pollInterval = setInterval(() => {
      if (realtime.status === 'OFFLINE') {
        fetchMessages(false);
      }
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      realtime.unsubscribe(bookingId);
      unsubscribeStatus();
      unsubscribeNew();
      unsubscribeRead();
      unsubscribeTypingStart();
      unsubscribeTypingStop();
      unsubscribeReconnect();
      clearInterval(pollInterval);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [bookingId, user, fetchMessages, pollIntervalMs]);

  const startTyping = useCallback(() => {
    if (bookingId) realtime.startTyping(bookingId);
  }, [bookingId]);

  const stopTyping = useCallback(() => {
    if (bookingId) realtime.stopTyping(bookingId);
  }, [bookingId]);

  const markRead = useCallback(async (messageId) => {
    if (!messageId) return;
    try {
      await authFetch(`/messages/${messageId}/read`, { method: 'POST' });
    } catch {}
  }, [authFetch]);

  return {
    messages,
    setMessages,
    loading,
    error,
    connectionStatus,
    typingUser,
    startTyping,
    stopTyping,
    markRead,
  };
}

/**
 * useNotifications — polls for user notifications.
 */
export function useNotifications(pollIntervalMs = 15000) {
  const { authFetch } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const intervalRef = useRef(null);

  const fetchNotifs = async () => {
    try {
      const res = await authFetch('/notifications');
      const data = await res.json();
      if (res.ok) setNotifications(data.notifications || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifs();
    intervalRef.current = setInterval(fetchNotifs, pollIntervalMs);
    return () => clearInterval(intervalRef.current);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    await authFetch('/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return { notifications, unreadCount, markAllRead };
}

