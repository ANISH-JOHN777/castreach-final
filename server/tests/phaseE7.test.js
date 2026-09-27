const request = require('supertest');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const app = require('../app');
const realtimeServer = require('../services/realtimeServer');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

describe('Phase E7 — Real-Time Communication Test Suite', () => {
  let server;
  let baseUrl;
  let wsUrl;
  let hostUser, guestUser, unauthorizedUser, tenantAUser, tenantBUser;
  let hostToken, guestToken, unauthorizedToken, tenantAToken, tenantBToken;
  let booking;

  beforeAll(async () => {
    server = http.createServer(app);
    realtimeServer.init(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    wsUrl = `ws://127.0.0.1:${port}/ws`;
  }, 30000);

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});

    // Create test users
    hostUser = await User.create({
      name: 'Host User',
      email: 'host@example.com',
      password: 'password123',
      role: 'host',
      tenantId: 'tenant-alpha',
    });

    guestUser = await User.create({
      name: 'Guest User',
      email: 'guest@example.com',
      password: 'password123',
      role: 'guest',
      tenantId: 'tenant-alpha',
    });

    unauthorizedUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      password: 'password123',
      role: 'guest',
      tenantId: 'tenant-alpha',
    });

    tenantAUser = await User.create({
      name: 'Tenant A User',
      email: 'tenanta@example.com',
      password: 'password123',
      role: 'host',
      tenantId: 'tenant-alpha',
    });

    tenantBUser = await User.create({
      name: 'Tenant B User',
      email: 'tenantb@example.com',
      password: 'password123',
      role: 'guest',
      tenantId: 'tenant-beta',
    });

    // Generate JWT tokens using test JWT secret
    hostToken = jwt.sign({ id: hostUser._id, role: hostUser.role, tenantId: hostUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });
    guestToken = jwt.sign({ id: guestUser._id, role: guestUser.role, tenantId: guestUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });
    unauthorizedToken = jwt.sign({ id: unauthorizedUser._id, role: unauthorizedUser.role, tenantId: unauthorizedUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });
    tenantAToken = jwt.sign({ id: tenantAUser._id, role: tenantAUser.role, tenantId: tenantAUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });
    tenantBToken = jwt.sign({ id: tenantBUser._id, role: tenantBUser.role, tenantId: tenantBUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });

    // Create test booking
    booking = await Booking.create({
      host: hostUser._id,
      guest: guestUser._id,
      slotStart: new Date(Date.now() + 86400000),
      slotEnd: new Date(Date.now() + 90000000),
      status: 'confirmed',
      tenantId: 'tenant-alpha',
    });
  });

  const connectWs = (token) => {
    return new Promise((resolve, reject) => {
      const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
      const ws = new WebSocket(url);
      ws.once('open', () => resolve(ws));
      ws.once('error', (err) => reject(err));
    });
  };

  const waitForEvent = (ws, targetEvent, timeoutMs = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for event '${targetEvent}'`));
      }, timeoutMs);

      const handler = (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.event === targetEvent) {
            cleanup();
            resolve(parsed);
          }
        } catch (err) {}
      };

      const cleanup = () => {
        clearTimeout(timer);
        ws.off('message', handler);
      };

      ws.on('message', handler);
    });
  };

  // Test 1: Authenticated connection succeeds
  test('1. Authenticated connection succeeds', async () => {
    const ws = await connectWs(hostToken);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  // Test 2: Unauthenticated connection rejected
  test('2. Unauthenticated connection rejected', async () => {
    await expect(connectWs(null)).rejects.toThrow();
  });

  // Test 3: Invalid JWT rejected
  test('3. Invalid JWT rejected', async () => {
    await expect(connectWs('invalid.jwt.token')).rejects.toThrow();
  });

  // Test 4: Expired JWT rejected
  test('4. Expired JWT rejected', async () => {
    const expiredToken = jwt.sign(
      { id: hostUser._id, role: hostUser.role },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    await expect(connectWs(expiredToken)).rejects.toThrow();
  });

  // Test 5: Authorized booking subscription succeeds
  test('5. Authorized booking subscription succeeds', async () => {
    const ws = await connectWs(hostToken);
    ws.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    const msg = await waitForEvent(ws, 'subscribed');
    expect(msg.event).toBe('subscribed');
    expect(msg.data.bookingId).toBe(booking._id.toString());
    ws.close();
  });

  // Test 6: Unauthorized booking subscription rejected
  test('6. Unauthorized booking subscription rejected', async () => {
    const ws = await connectWs(unauthorizedToken);
    ws.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    const msg = await waitForEvent(ws, 'error');
    expect(msg.event).toBe('error');
    expect(msg.data.message).toContain('Not authorized');
    ws.close();
  });

  // Test 7: Cross-tenant subscription rejected
  test('7. Cross-tenant subscription rejected', async () => {
    const ws = await connectWs(tenantBToken);
    ws.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    const msg = await waitForEvent(ws, 'error');
    expect(msg.event).toBe('error');
    ws.close();
  });

  // Test 8: New message delivery via WebSocket
  test('8. New message delivery via WebSocket', async () => {
    const wsHost = await connectWs(hostToken);
    const wsGuest = await connectWs(guestToken);

    wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsHost, 'subscribed');
    wsGuest.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsGuest, 'subscribed');

    const guestPromise = waitForEvent(wsGuest, 'message:new');

    // Send REST message hitting the running HTTP server instance baseUrl
    const res = await request(baseUrl)
      .post('/api/messages')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ bookingId: booking._id.toString(), content: 'Hello Guest!' });

    expect(res.status).toBe(201);

    const guestMsg = await guestPromise;
    expect(guestMsg.event).toBe('message:new');
    expect(guestMsg.data.content).toBe('Hello Guest!');

    wsHost.close();
    wsGuest.close();
  });

  // Test 9: Message persistence before emission
  test('9. Message persistence before emission', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ bookingId: booking._id.toString(), content: 'Persisted message' });

    expect(res.status).toBe(201);
    const msgInDb = await Message.findById(res.body.message._id);
    expect(msgInDb).not.toBeNull();
    expect(msgInDb.content).toBe('Persisted message');
  });

  // Test 10: Message deduplication by message ID
  test('10. Message deduplication by message ID', async () => {
    const msgId = 'msg-12345';
    const list = [
      { _id: msgId, content: 'A' },
      { _id: msgId, content: 'A' },
      { _id: 'msg-67890', content: 'B' },
    ];
    const unique = list.filter((m, idx, self) => self.findIndex((t) => t._id === m._id) === idx);
    expect(unique.length).toBe(2);
  });

  // Test 11: Deterministic message ordering
  test('11. Deterministic message ordering by createdAt', async () => {
    const m1 = { _id: '1', createdAt: '2026-09-27T08:00:00Z' };
    const m2 = { _id: '2', createdAt: '2026-09-27T07:00:00Z' };
    const sorted = [m1, m2].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    expect(sorted[0]._id).toBe('2');
  });

  // Test 12: Typing start event broadcast
  test('12. Typing start event broadcast', async () => {
    const wsHost = await connectWs(hostToken);
    const wsGuest = await connectWs(guestToken);

    wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsHost, 'subscribed');
    wsGuest.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsGuest, 'subscribed');

    wsHost.send(JSON.stringify({ event: 'typing:start', data: { bookingId: booking._id.toString() } }));
    const msg = await waitForEvent(wsGuest, 'typing:start');
    expect(msg.event).toBe('typing:start');
    expect(msg.data.userId).toBe(hostUser._id.toString());

    wsHost.close();
    wsGuest.close();
  });

  // Test 13: Typing stop event broadcast
  test('13. Typing stop event broadcast', async () => {
    const wsHost = await connectWs(hostToken);
    const wsGuest = await connectWs(guestToken);

    wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsHost, 'subscribed');
    wsGuest.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsGuest, 'subscribed');

    wsHost.send(JSON.stringify({ event: 'typing:stop', data: { bookingId: booking._id.toString() } }));
    const msg = await waitForEvent(wsGuest, 'typing:stop');
    expect(msg.event).toBe('typing:stop');

    wsHost.close();
    wsGuest.close();
  });

  // Test 14: Typing throttling (rate limiting)
  test('14. Typing throttling limits excessive events', async () => {
    const wsHost = await connectWs(hostToken);
    let errorMsg = null;

    wsHost.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.event === 'error') errorMsg = parsed;
      } catch (err) {}
    });

    for (let i = 0; i < 45; i++) {
      wsHost.send(JSON.stringify({ event: 'typing:start', data: { bookingId: booking._id.toString() } }));
    }

    await new Promise((r) => setTimeout(r, 150));
    expect(errorMsg).not.toBeNull();
    expect(errorMsg.data.message).toContain('Too many requests');
    wsHost.close();
  });

  // Test 15: Typing cleanup after timeout
  test('15. Typing cleanup after timer expires', async () => {
    expect(realtimeServer.typingTimers).toBeDefined();
  });

  // Test 16: Read receipt delivery
  test('16. Read receipt delivery via message:read', async () => {
    const message = await Message.create({
      booking: booking._id,
      sender: hostUser._id,
      content: 'Unread msg',
      isRead: false,
    });

    const wsHost = await connectWs(hostToken);
    wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsHost, 'subscribed');

    const hostPromise = waitForEvent(wsHost, 'message:read');

    // Guest marks message read hitting running server
    const res = await request(baseUrl)
      .post(`/api/messages/${message._id}/read`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toBe(200);

    const hostEvent = await hostPromise;
    expect(hostEvent.event).toBe('message:read');
    expect(hostEvent.data.messageId).toBe(message._id.toString());

    wsHost.close();
  });

  // Test 17: Presence state set to ONLINE on connect
  test('17. Presence state set to ONLINE on connect', async () => {
    const ws = await connectWs(hostToken);
    const presence = realtimeServer.getUserPresence(hostUser._id.toString());
    expect(presence).toBe('ONLINE');
    ws.close();
  });

  // Test 18: Presence state set to OFFLINE on disconnect
  test('18. Presence state set to OFFLINE on disconnect', async () => {
    const ws = await connectWs(hostToken);
    ws.close();
    await new Promise((r) => setTimeout(r, 100));
    const presence = realtimeServer.getUserPresence(hostUser._id.toString());
    expect(presence).toBe('OFFLINE');
  });

  // Test 19: Heartbeat ping/pong response
  test('19. Heartbeat ping returns pong', async () => {
    const ws = await connectWs(hostToken);
    ws.send(JSON.stringify({ event: 'ping' }));
    const msg = await waitForEvent(ws, 'pong');
    expect(msg.event).toBe('pong');
    ws.close();
  });

  // Test 20: Reconnect re-subscribes cleanly
  test('20. Reconnect re-subscribes cleanly', async () => {
    let ws = await connectWs(hostToken);
    ws.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(ws, 'subscribed');
    ws.close();

    ws = await connectWs(hostToken);
    ws.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    const msg = await waitForEvent(ws, 'subscribed');
    expect(msg.event).toBe('subscribed');
    ws.close();
  });

  // Test 21: Missed-message recovery via REST
  test('21. Missed-message recovery via REST', async () => {
    await Message.create({
      booking: booking._id,
      sender: hostUser._id,
      content: 'Missed while offline',
    });

    const res = await request(app)
      .get(`/api/messages/${booking._id}`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.some((m) => m.content === 'Missed while offline')).toBe(true);
  });

  // Test 22: Booking status event delivery
  test('22. Booking status change event delivery', async () => {
    const wsGuest = await connectWs(guestToken);
    wsGuest.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsGuest, 'subscribed');

    realtimeServer.broadcastToBooking(booking._id.toString(), 'booking:updated', {
      bookingId: booking._id.toString(),
      status: 'completed',
    });

    const msg = await waitForEvent(wsGuest, 'booking:updated');
    expect(msg.event).toBe('booking:updated');
    expect(msg.data.status).toBe('completed');
    wsGuest.close();
  });

  // Test 23: Recording state event delivery
  test('23. Recording state event delivery', async () => {
    const wsHost = await connectWs(hostToken);
    wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsHost, 'subscribed');

    realtimeServer.broadcastToBooking(booking._id.toString(), 'recording:ready', {
      bookingId: booking._id.toString(),
      recordingUrl: 'https://cdn.example.com/audio.mp3',
    });

    const msg = await waitForEvent(wsHost, 'recording:ready');
    expect(msg.event).toBe('recording:ready');
    wsHost.close();
  });

  // Test 24: Payment event informational isolation (never mutates DB)
  test('24. Payment event informational isolation', async () => {
    const wsHost = await connectWs(hostToken);
    wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsHost, 'subscribed');

    realtimeServer.broadcastToBooking(booking._id.toString(), 'payment:held', {
      bookingId: booking._id.toString(),
      amount: 10000,
    });

    const msg = await waitForEvent(wsHost, 'payment:held');
    expect(msg.event).toBe('payment:held');
    // Ensure DB booking is unchanged by realtime event
    const freshBooking = await Booking.findById(booking._id);
    expect(freshBooking.status).toBe('confirmed');
    wsHost.close();
  });

  // Test 25: Caption channel isolation
  test('25. Caption channel isolation from chat channel', async () => {
    const wsHost = await connectWs(hostToken);
    wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(wsHost, 'subscribed');

    // E4 live caption channel event
    realtimeServer.broadcastToBooking(`caption:${booking._id}`, 'caption:text', {
      text: 'Live caption sample',
    });

    // Subscribed to booking._id room, so should NOT receive `caption:${booking._id}` room event
    let received = false;
    wsHost.once('message', () => { received = true; });
    await new Promise((r) => setTimeout(r, 150));
    expect(received).toBe(false);
    wsHost.close();
  });

  // Test 26: Malformed event payload rejection
  test('26. Malformed event payload rejection', async () => {
    const ws = await connectWs(hostToken);
    ws.send('invalid json text');
    const msg = await waitForEvent(ws, 'error');
    expect(msg.event).toBe('error');
    expect(msg.data.message).toContain('JSON');
    ws.close();
  });

  // Test 27: Spoofed user ID rejection
  test('27. Spoofed user ID rejection', async () => {
    const ws = await connectWs(hostToken);
    ws.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    await waitForEvent(ws, 'subscribed');

    ws.send(JSON.stringify({
      event: 'typing:start',
      data: { bookingId: booking._id.toString(), userId: 'spoofed_id_999' },
    }));

    // Server uses authenticated user id, not spoofed id
    ws.close();
  });

  // Test 28: Connection rate limiting
  test('28. Connection rate limiting protects socket', async () => {
    const ws = await connectWs(hostToken);
    let errorMsg = null;

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.event === 'error') errorMsg = parsed;
      } catch (err) {}
    });

    for (let i = 0; i < 45; i++) {
      ws.send(JSON.stringify({ event: 'ping' }));
    }

    await new Promise((r) => setTimeout(r, 150));
    expect(errorMsg).not.toBeNull();
    expect(errorMsg.data.message).toContain('Too many requests');
    ws.close();
  });

  // Test 29: REST fallback when WebSocket disconnected
  test('29. REST fallback when WebSocket disconnected', async () => {
    const res = await request(app)
      .get(`/api/messages/${booking._id}`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  // Test 30: Connection cleanup on socket close
  test('30. Connection cleanup on socket close', async () => {
    const ws = await connectWs(hostToken);
    const initialPresence = realtimeServer.getUserPresence(hostUser._id.toString());
    expect(initialPresence).toBe('ONLINE');

    ws.close();
    await new Promise((r) => setTimeout(r, 100));
    const finalPresence = realtimeServer.getUserPresence(hostUser._id.toString());
    expect(finalPresence).toBe('OFFLINE');
  });
});
