const Notification = require('../models/Notification');

/**
 * Create a notification for a user.
 * In production: also push via WebSocket / Supabase Realtime / FCM.
 */
async function notify(recipientId, { type, title, body, link, meta } = {}) {
  try {
    const doc = await Notification.create({ recipient: recipientId, type, title, body, link, meta });
    try {
      const { broadcastToUser } = require('./realtimeServer');
      if (broadcastToUser && recipientId) {
        broadcastToUser(recipientId.toString(), 'notification:new', doc);
      }
    } catch {}
    return doc;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

/**
 * Fetch unread notifications for a user.
 */
async function getUnread(userId) {
  return Notification.find({ recipient: userId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(50);
}

/**
 * Mark all as read.
 */
async function markAllRead(userId) {
  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
}

module.exports = { notify, getUnread, markAllRead };
