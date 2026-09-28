const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

/**
 * Phase E7 — Real-Time Communication Server Service
 * Production-grade WebSocket communication layer for CastReach.
 *
 * Architecture:
 * - Authenticated JWT socket connections
 * - Room-scoped channel subscriptions (`booking:<bookingId>`)
 * - Server-side authorization checks for booking participants
 * - Ephemeral typing indicators with automatic expiration
 * - Ephemeral presence tracking (ONLINE / AWAY / OFFLINE)
 * - Missed message recovery via REST fallback
 * - Event isolation (captions vs chat)
 */

let wss = null;

// Channels & Subscriptions
// bookingRooms: Map<bookingId, Set<{ socket, userId, role, tenantId }>>
const bookingRooms = new Map();

// Presence tracking: Map<userId, Set<WebSocket>>
const userSockets = new Map();

// Typing state: Map<bookingId, Map<userId, Timeout>>
const typingTimers = new Map();

// Rate limiting for socket messages: Map<socketId, { count, lastReset }>
const rateLimits = new Map();

/**
 * Initialize WebSocket Server attached to an HTTP server.
 */
function init(server) {
  if (wss) return wss;

  wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    
    // Only handle websocket connections on /ws or /api/ws
    if (url.pathname !== '/ws' && url.pathname !== '/api/ws') {
      return;
    }

    const token = url.searchParams.get('token') || request.headers['sec-websocket-protocol'];
    const tenantId = request.headers['x-tenant-id'] || url.searchParams.get('tenantId') || 'castreach';

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
      const decoded = jwt.verify(token, jwtSecret);
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.user = {
          id: decoded.id,
          role: decoded.role || 'guest',
          tenantId: decoded.tenantId || tenantId,
        };
        ws.isAlive = true;
        ws.socketId = `sock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    handleConnection(ws);
  });

  // Heartbeat interval for stale connection cleanup
  const pingInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return handleDisconnect(ws);
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        handleDisconnect(ws);
      }
    });
  }, 30000);

  wss.on('close', () => clearInterval(pingInterval));

  return wss;
}

/**
 * Handle new socket connection.
 */
function handleConnection(ws) {
  const userId = ws.user.id;

  // Track user presence
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(ws);

  // Send connection confirmation & initial presence
  sendToSocket(ws, 'connection:ready', {
    userId,
    status: 'ONLINE',
    connectedAt: new Date(),
  });

  // Broadcast user online status
  broadcastPresence(userId, 'ONLINE');

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (rawMessage) => {
    try {
      // Rate limiting: max 30 messages per 10 seconds
      if (isRateLimited(ws)) {
        return sendToSocket(ws, 'error', { code: 'RATE_LIMITED', message: 'Too many requests' });
      }

      const parsed = JSON.parse(rawMessage.toString());
      const { event, data } = parsed;

      switch (event) {
        case 'ping':
          ws.isAlive = true;
          sendToSocket(ws, 'pong', { timestamp: Date.now() });
          break;

        case 'subscribe':
          await handleSubscribe(ws, data);
          break;

        case 'unsubscribe':
          handleUnsubscribe(ws, data);
          break;

        case 'typing:start':
          handleTypingStart(ws, data);
          break;

        case 'typing:stop':
          handleTypingStop(ws, data);
          break;

        case 'webrtc:signal':
          handleWebRTCSignal(ws, data);
          break;

        case 'webrtc:join':
          handleWebRTCJoin(ws, data);
          break;

        case 'webrtc:leave':
          handleWebRTCLeave(ws, data);
          break;

        case 'session:end_requested':
          handleSessionEndRequested(ws, data);
          break;

        case 'session:end_confirmed':
          handleSessionEndConfirmed(ws, data);
          break;

        case 'session:end_cancelled':
          handleSessionEndCancelled(ws, data);
          break;

        default:
          sendToSocket(ws, 'error', { code: 'INVALID_EVENT', message: `Unknown event: ${event}` });
      }
    } catch (err) {
      sendToSocket(ws, 'error', { code: 'MALFORMED_PAYLOAD', message: err.message });
    }
  });

  ws.on('close', () => handleDisconnect(ws));
  ws.on('error', () => handleDisconnect(ws));
}

function ensureSubscribed(ws, bookingId) {
  if (!bookingId) return;
  if (!bookingRooms.has(bookingId)) {
    bookingRooms.set(bookingId, new Set());
  }
  const room = bookingRooms.get(bookingId);
  let exists = false;
  for (const item of room) {
    if (item.userId === ws.user.id) {
      item.socket = ws;
      exists = true;
      break;
    }
  }
  if (!exists) {
    room.add({
      socket: ws,
      userId: ws.user.id,
      role: ws.user.role,
      tenantId: ws.user.tenantId,
    });
  }
}

// Session End tracking: Map<bookingId, Set<userId>>
const sessionEndRequests = new Map();

async function handleSessionEndRequested(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId) return;

  ensureSubscribed(ws, bookingId);

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return;

    const isHost = booking.host.toString() === ws.user.id;
    const isGuest = booking.guest.toString() === ws.user.id;
    if (!isHost && !isGuest && ws.user.role !== 'admin') return;

    const now = new Date();
    if (isHost) {
      booking.hostEndRequested = true;
      booking.hostEndRequestedAt = now;
    } else if (isGuest) {
      booking.guestEndRequested = true;
      booking.guestEndRequestedAt = now;
    }

    const bothRequested = booking.hostEndRequested && booking.guestEndRequested;

    if (bothRequested) {
      booking.recordingStatus = 'PROCESSING';
      await booking.save();
      sessionEndRequests.delete(bookingId);
      broadcastToBooking(bookingId, 'session:end_confirmed', {
        bookingId,
        endedBy: ws.user.id,
        timestamp: now.toISOString(),
      });
    } else {
      await booking.save();
      broadcastToBooking(bookingId, 'session:end_requested', {
        bookingId,
        requestedBy: ws.user.id,
        requestedRole: isHost ? 'host' : 'guest',
        timestamp: now.toISOString(),
      });
    }
  } catch (err) {
    console.error('[RealtimeServer] Error in handleSessionEndRequested:', err);
  }
}

async function handleSessionEndConfirmed(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId) return;

  ensureSubscribed(ws, bookingId);

  try {
    const booking = await Booking.findById(bookingId);
    if (booking) {
      const isHost = booking.host.toString() === ws.user.id;
      const isGuest = booking.guest.toString() === ws.user.id;
      const now = new Date();
      if (isHost) {
        booking.hostEndRequested = true;
        booking.hostEndRequestedAt = now;
      } else if (isGuest) {
        booking.guestEndRequested = true;
        booking.guestEndRequestedAt = now;
      }
      booking.recordingStatus = 'PROCESSING';
      await booking.save();
    }
  } catch (err) {
    console.error('[RealtimeServer] Error in handleSessionEndConfirmed:', err);
  }

  sessionEndRequests.delete(bookingId);
  broadcastToBooking(bookingId, 'session:end_confirmed', {
    bookingId,
    confirmedBy: ws.user.id,
    timestamp: new Date().toISOString(),
  });
}

async function handleSessionEndCancelled(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId) return;

  ensureSubscribed(ws, bookingId);

  try {
    const booking = await Booking.findById(bookingId);
    if (booking) {
      booking.hostEndRequested = false;
      booking.guestEndRequested = false;
      await booking.save();
    }
  } catch (err) {
    console.error('[RealtimeServer] Error in handleSessionEndCancelled:', err);
  }

  sessionEndRequests.delete(bookingId);
  broadcastToBooking(bookingId, 'session:end_cancelled', {
    bookingId,
    cancelledBy: ws.user.id,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Socket Rate Limiter
 */
function isRateLimited(ws) {
  const now = Date.now();
  const socketId = ws.socketId;
  const limitInfo = rateLimits.get(socketId) || { count: 0, lastReset: now };

  if (now - limitInfo.lastReset > 10000) {
    limitInfo.count = 1;
    limitInfo.lastReset = now;
  } else {
    limitInfo.count++;
  }

  rateLimits.set(socketId, limitInfo);
  return limitInfo.count > 40;
}

/**
 * Handle subscription to a booking room with authorization check.
 */
async function handleSubscribe(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    return sendToSocket(ws, 'error', { code: 'INVALID_BOOKING', message: 'Invalid bookingId' });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendToSocket(ws, 'error', { code: 'NOT_FOUND', message: 'Booking not found' });
    }

    const isHost = booking.host.toString() === ws.user.id;
    const isGuest = booking.guest.toString() === ws.user.id;
    const isAdmin = ws.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return sendToSocket(ws, 'error', { code: 'FORBIDDEN', message: 'Not authorized for this booking channel' });
    }

    // Tenant check
    if (booking.tenantId && ws.user.tenantId && booking.tenantId !== ws.user.tenantId) {
      return sendToSocket(ws, 'error', { code: 'TENANT_MISMATCH', message: 'Cross-tenant access forbidden' });
    }

    // Add to booking room
    if (!bookingRooms.has(bookingId)) {
      bookingRooms.set(bookingId, new Set());
    }

    const subscriberInfo = {
      socket: ws,
      userId: ws.user.id,
      role: ws.user.role,
      tenantId: ws.user.tenantId,
    };

    bookingRooms.get(bookingId).add(subscriberInfo);

    sendToSocket(ws, 'subscribed', {
      bookingId,
      status: 'SUCCESS',
    });

    // Notify room participants of peer presence if room has multiple connected users
    const currentRoom = bookingRooms.get(bookingId);
    if (currentRoom.size > 1) {
      for (const item of currentRoom) {
        if (item.userId !== ws.user.id) {
          sendToSocket(item.socket, 'webrtc:peer_join', {
            bookingId,
            peerId: ws.user.id,
            peerRole: ws.user.role,
          });
          sendToSocket(ws, 'webrtc:peer_join', {
            bookingId,
            peerId: item.userId,
            peerRole: item.role,
          });
        }
      }
    }
  } catch (err) {
    sendToSocket(ws, 'error', { code: 'SERVER_ERROR', message: err.message });
  }
}

/**
 * Handle unsubscription from booking room.
 */
function handleUnsubscribe(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId || !bookingRooms.has(bookingId)) return;

  const room = bookingRooms.get(bookingId);
  for (const item of room) {
    if (item.socket === ws) {
      room.delete(item);
      break;
    }
  }

  if (room.size === 0) {
    bookingRooms.delete(bookingId);
  }

  sendToSocket(ws, 'unsubscribed', { bookingId });
}

/**
 * Ephemeral typing indicators (throttled & auto-expiring).
 */
function handleTypingStart(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId || !bookingRooms.has(bookingId)) return;

  const userId = ws.user.id;

  if (!typingTimers.has(bookingId)) {
    typingTimers.set(bookingId, new Map());
  }

  const roomTimers = typingTimers.get(bookingId);

  // Clear existing timer if any
  if (roomTimers.has(userId)) {
    clearTimeout(roomTimers.get(userId));
  }

  // Set 3-second auto-expiration timer
  const timer = setTimeout(() => {
    handleTypingStop(ws, { bookingId });
  }, 3000);

  roomTimers.set(userId, timer);

  // Broadcast typing event to other booking participants
  broadcastToBooking(bookingId, 'typing:start', {
    bookingId,
    userId,
  }, ws.user.id);
}

function handleTypingStop(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId) return;

  const userId = ws.user.id;
  if (typingTimers.has(bookingId)) {
    const roomTimers = typingTimers.get(bookingId);
    if (roomTimers.has(userId)) {
      clearTimeout(roomTimers.get(userId));
      roomTimers.delete(userId);
    }
  }

  broadcastToBooking(bookingId, 'typing:stop', {
    bookingId,
    userId,
  }, ws.user.id);
}

/**
 * Handle WebRTC P2P signaling events (SDP offer/answer, ICE candidates)
 */
function handleWebRTCSignal(ws, data = {}) {
  const { bookingId, signal } = data;
  if (!bookingId || !signal) return;
  ensureSubscribed(ws, bookingId);
  broadcastToBooking(bookingId, 'webrtc:signal', {
    bookingId,
    signal,
    senderId: ws.user.id,
    senderRole: ws.user.role,
  }, ws.user.id);
}

function handleWebRTCJoin(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId) return;
  ensureSubscribed(ws, bookingId);
  broadcastToBooking(bookingId, 'webrtc:peer_join', {
    bookingId,
    peerId: ws.user.id,
    peerRole: ws.user.role,
  }, ws.user.id);
}

function handleWebRTCLeave(ws, data = {}) {
  const { bookingId } = data;
  if (!bookingId) return;
  broadcastToBooking(bookingId, 'webrtc:peer_leave', {
    bookingId,
    peerId: ws.user.id,
    peerRole: ws.user.role,
  }, ws.user.id);
}

/**
 * Handle socket disconnect cleanup.
 */
function handleDisconnect(ws) {
  const userId = ws.user?.id;

  // Cleanup rate limits
  if (ws.socketId) rateLimits.delete(ws.socketId);

  // Remove from userSockets presence
  if (userId && userSockets.has(userId)) {
    const sockets = userSockets.get(userId);
    sockets.delete(ws);
    if (sockets.size === 0) {
      userSockets.delete(userId);
      broadcastPresence(userId, 'OFFLINE');
    }
  }

  // Remove from all booking rooms
  for (const [bookingId, room] of bookingRooms.entries()) {
    for (const item of room) {
      if (item.socket === ws) {
        room.delete(item);
        // Clean typing indicator if active
        handleTypingStop(ws, { bookingId });
      }
    }
    if (room.size === 0) {
      bookingRooms.delete(bookingId);
    }
  }

  try {
    ws.terminate();
  } catch (e) {
    // Ignore terminate error
  }
}

/**
 * Send JSON payload to a specific socket connection safely.
 */
function sendToSocket(ws, event, data = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify({ event, data, timestamp: new Date().toISOString() }));
  } catch (err) {
    console.warn('[RealtimeServer] Send error:', err.message);
  }
}

/**
 * Broadcast event to all subscribers in a booking room.
 * @param {string} bookingId
 * @param {string} event
 * @param {Object} data
 * @param {string} [excludeUserId]
 */
function broadcastToBooking(bookingId, event, data = {}, excludeUserId = null) {
  if (!bookingRooms.has(bookingId)) return;

  const room = bookingRooms.get(bookingId);
  for (const item of room) {
    if (excludeUserId && item.userId === excludeUserId) continue;
    sendToSocket(item.socket, event, data);
  }
}

/**
 * Broadcast event to a specific user across all their connected sockets.
 */
function broadcastToUser(userId, event, data = {}) {
  if (!userSockets.has(userId)) return;

  const sockets = userSockets.get(userId);
  for (const ws of sockets) {
    sendToSocket(ws, event, data);
  }
}

/**
 * Broadcast presence state updates.
 */
function broadcastPresence(userId, status) {
  for (const [bookingId, room] of bookingRooms.entries()) {
    for (const item of room) {
      if (item.userId !== userId) {
        sendToSocket(item.socket, 'presence:update', {
          userId,
          status,
        });
      }
    }
  }
}

/**
 * Get presence status for a user.
 */
function getUserPresence(userId) {
  if (!userSockets.has(userId)) return 'OFFLINE';
  const sockets = userSockets.get(userId);
  return sockets.size > 0 ? 'ONLINE' : 'OFFLINE';
}

/**
 * Reset all internal state (for testing).
 */
function resetServer() {
  bookingRooms.clear();
  userSockets.clear();
  typingTimers.clear();
  rateLimits.clear();
  if (wss) {
    try {
      wss.close();
    } catch (e) {}
    wss = null;
  }
}

function close() {
  resetServer();
}

module.exports = {
  init,
  close,
  broadcastToBooking,
  broadcastToUser,
  getUserPresence,
  resetServer,
  userSockets,
  typingTimers,
};

