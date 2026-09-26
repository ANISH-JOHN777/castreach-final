const router       = require('express').Router();
const Availability = require('../models/Availability');
const verifyToken  = require('../middleware/verifyToken');
const { validate, AvailabilitySchema } = require('../middleware/validate');

// ── GET /api/availability/:userId — get open slots ────────────────────────────
router.get('/:userId', async (req, res) => {
  try {
    const slots = await Availability.find({
      user:     req.params.userId,
      isBooked: false,
      start:    { $gte: new Date() },
    }).sort({ start: 1 });
    res.json({ slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/availability — set my availability slots ────────────────────────
router.post('/', verifyToken, validate(AvailabilitySchema), async (req, res) => {
  try {
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only hosts can publish availability' });
    }
    const { slots } = req.body;
    const now = new Date();

    for (const s of slots) {
      const start = new Date(s.start);
      const end   = new Date(s.end);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      if (end <= start) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }
      if (start < now) {
        return res.status(400).json({ error: 'Availability slot must be in the future' });
      }
    }

    // Remove future unbooked slots and replace with new ones
    await Availability.deleteMany({ user: req.user.id, isBooked: false, start: { $gte: now } });

    const docs = slots.map(({ start, end }) => ({
      user:  req.user.id,
      start: new Date(start),
      end:   new Date(end),
    }));

    const created = await Availability.insertMany(docs);
    res.status(201).json({ slots: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/availability/:id — remove a slot ──────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const slot = await Availability.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.user.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (slot.isBooked) return res.status(400).json({ error: 'Cannot delete a booked slot' });
    await slot.deleteOne();
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
