const router      = require('express').Router();
const Message     = require('../models/Message');
const Booking     = require('../models/Booking');
const verifyToken = require('../middleware/verifyToken');
const { validate, MessageSchema } = require('../middleware/validate');
const { notify } = require('../services/notifications');

const realtimeServer = require('../services/realtimeServer');

// ── GET /api/messages/:bookingId ──────────────────────────────────────────────
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    // Find all bookings between the host and guest so conversation history is continuous
    const relatedBookings = await Booking.find({
      $or: [
        { host: booking.host, guest: booking.guest },
        { host: booking.guest, guest: booking.host },
      ],
    }).select('_id');
    const relatedBookingIds = relatedBookings.map((b) => b._id);

    const messages = await Message.find({ booking: { $in: relatedBookingIds } })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    // Mark unread messages as read across related bookings
    const updateRes = await Message.updateMany(
      { booking: { $in: relatedBookingIds }, sender: { $ne: req.user.id }, isRead: false },
      { isRead: true }
    );

    if (updateRes.modifiedCount > 0) {
      realtimeServer.broadcastToBooking(req.params.bookingId, 'message:read', {
        bookingId: req.params.bookingId,
        readBy: req.user.id,
        count: updateRes.modifiedCount,
      }, req.user.id);
    }

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/messages — send message ─────────────────────────────────────────
router.post('/', verifyToken, validate(MessageSchema), async (req, res) => {
  try {
    const { bookingId, content } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const message = await Message.create({
      booking: bookingId,
      sender:  req.user.id,
      content,
    });

    const recipientId = booking.host.toString() === req.user.id
      ? booking.guest.toString()
      : booking.host.toString();

    await notify(recipientId, {
      type:  'message',
      title: 'New message',
      body:  content.slice(0, 60),
      link:  `/bookings/${bookingId}`,
    });

    const populated = await message.populate('sender', 'name avatar');
    const msgObj = populated.toObject();

    // Broadcast real-time message event to booking channel subscribers
    realtimeServer.broadcastToBooking(bookingId, 'message:new', {
      _id: msgObj._id,
      id: msgObj._id,
      booking: bookingId,
      bookingId,
      sender: msgObj.sender,
      senderId: req.user.id,
      senderName: msgObj.sender?.name || 'User',
      senderAvatar: msgObj.sender?.avatar || '',
      content: msgObj.content,
      createdAt: msgObj.createdAt,
      isRead: false,
    });

    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/messages/:messageId/read — mark message as read ─────────────────
router.post('/:messageId/read', verifyToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const booking = await Booking.findById(message.booking);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    message.isRead = true;
    await message.save();

    realtimeServer.broadcastToBooking(booking._id.toString(), 'message:read', {
      bookingId: booking._id.toString(),
      messageId: message._id.toString(),
      readBy: req.user.id,
    });

    res.json({ message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

