const router      = require('express').Router();
const Booking     = require('../models/Booking');
const verifyToken = require('../middleware/verifyToken');
const { createDailyRoom } = require('../services/daily');

// ── POST /api/recordings/room — create Daily.co room ─────────────────────────
router.post('/room', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id);
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    // Paid sessions require the escrow hold before the room opens (BLK-2).
    if (booking.amountCents > 0 && booking.paymentStatus !== 'held') {
      return res.status(402).json({ error: 'Payment required before joining the recording room' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be confirmed first' });
    }

    const { roomUrl } = await createDailyRoom(booking._id.toString(), booking.slotEnd);

    booking.dailyRoomUrl = roomUrl;
    await booking.save();

    res.json({ url: roomUrl });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId — get recording URL ───────────────────────
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id);
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    res.json({ recordingUrl: booking.recordingUrl, ready: booking.recordingReady });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
