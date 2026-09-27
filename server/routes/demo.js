const router = require('express').Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Podcast = require('../models/Podcast');
const Episode = require('../models/Episode');
const Review = require('../models/Review');
const { seedDemoData } = require('../scripts/seedDemo');

/**
 * Phase E10 — Demo Environment API Route Handler
 * Strictly active ONLY when APP_ENV === 'demo' or NODE_ENV !== 'production'.
 */

function verifyDemoEnvironment(req, res, next) {
  const isDemo = process.env.APP_ENV === 'demo' || (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test');
  if (!isDemo || process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Forbidden: Demo environment actions are strictly disabled in production.',
    });
  }
  next();
}

// ── GET /api/demo/status — Check Demo Environment Status & Seed Stats ────────
router.get('/status', verifyDemoEnvironment, async (req, res) => {
  try {
    const [userCount, bookingCount, podcastCount, episodeCount, reviewCount] = await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Podcast.countDocuments(),
      Episode.countDocuments(),
      Review.countDocuments(),
    ]);

    res.json({
      status: 'ok',
      appEnv: process.env.APP_ENV || 'demo',
      nodeEnv: process.env.NODE_ENV || 'development',
      seededStats: {
        users: userCount,
        bookings: bookingCount,
        podcasts: podcastCount,
        episodes: episodeCount,
        reviews: reviewCount,
      },
      demoAccounts: {
        admin: 'demo.admin@castreach.demo',
        hosts: ['demo.host1@castreach.demo', 'demo.host2@castreach.demo', 'demo.host3@castreach.demo'],
        guests: ['demo.guest1@castreach.demo', 'demo.guest2@castreach.demo', 'demo.guest3@castreach.demo'],
        password: 'DemoPassword123!',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/demo/reset — Reset & Re-seed Demo Database ──────────────────────
router.post('/reset', verifyDemoEnvironment, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }

    await seedDemoData();

    res.json({
      success: true,
      message: 'CastReach demo environment reset and re-seeded successfully.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
