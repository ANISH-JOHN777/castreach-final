const router      = require('express').Router();
const User        = require('../models/User');
const Booking     = require('../models/Booking');
const Availability = require('../models/Availability');
const Podcast     = require('../models/Podcast');
const verifyToken = require('../middleware/verifyToken');
const { upload, verifyMimeBytes } = require('../middleware/upload');
const jwt = require('jsonwebtoken');
const { saveUserToFirestore } = require('../config/firebase');

// Public projection — never expose email/PII when listing or viewing others (BLK-5).
const PUBLIC_FIELDS = '-__v -email -refreshToken -stripeAccountId';

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch {
      // invalid token, proceed unauthenticated
    }
  }
  next();
};

// ── GET /api/users?role=guest&q=search&expertise=AI&minRating=4&badge=top_rated&sort=rating ─────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { role, q, expertise, minRating, badge, sort } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const filter = { isBlocked: false };
    if (role) filter.role = role;
    if (q)    filter.$text = { $search: q };
    if (expertise) filter.expertise = { $in: [expertise] };
    if (badge)     filter.badges = badge;
    if (minRating && !isNaN(parseFloat(minRating))) {
      filter.avgRating = { $gte: parseFloat(minRating) };
    }

    let sortOption = { avgRating: -1, totalReviews: -1 };
    if (sort === 'newest')     sortOption = { createdAt: -1 };
    if (sort === 'price_asc')  sortOption = { sessionRateCents: 1 };
    if (sort === 'price_desc') sortOption = { sessionRateCents: -1 };
    if (sort === 'rating')     sortOption = { avgRating: -1, totalReviews: -1 };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(PUBLIC_FIELDS)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/recommendations — AI-matched candidates ───────────────────
router.get('/recommendations', verifyToken, async (req, res) => {
  try {
    const { getRecommendations } = require('../services/matchmaking');
    const recommendations = await getRecommendations(req.user.id, 5);
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const isSelf = req.params.id === 'me';
    if (isSelf && !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const targetId = isSelf ? req.user.id : req.params.id;
    // A user viewing their own profile keeps their email; others get the public view.
    const isViewingOwn = req.user && req.user.id === targetId;
    const projection = isViewingOwn ? '-__v' : PUBLIC_FIELDS;
    const user = await User.findById(targetId).select(projection);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/users/me — update own profile ──────────────────────────────────
router.patch('/me', verifyToken, async (req, res) => {
  try {
    const ALLOWED = [
      'name', 'bio', 'expertise', 'interests', 'languages',
      'podcastName', 'podcastUrl', 'podcastDescription', 'podcastCategory',
      'studioLocation', 'preferredMeetingMode', 'equipment', 'typicalFormat',
      'targetAudience', 'listenerCount', 'speakingTopics', 'priorAppearances',
      'location', 'portfolioUrl', 'sessionRateCents', 'socialLinks', 'avatar',
      'profilePicture', 'profileVisibility', 'isOnboarded', 'role'
    ];
    const updates = {};
    ALLOWED.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });

    // Dual-persist profile updates to Firebase DB
    if (user) {
      saveUserToFirestore(user, { updatedAt: new Date().toISOString() }).catch(() => {});
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, tenantId: user.tenantId || 'castreach' },
      process.env.JWT_SECRET || 'castreach_secure_jwt_secret_key_production_grade_super_random_777_888_999',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/me — permanently delete account ─────────────────────────
router.delete('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await Promise.all([
      User.findByIdAndDelete(userId),
      Booking.deleteMany({ $or: [{ host: userId }, { guest: userId }] }).catch(() => {}),
      Availability.deleteMany({ user: userId }).catch(() => {}),
      Podcast.deleteMany({ owner: userId }).catch(() => {}),
    ]);

    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/me/avatar ─────────────────────────────────────────────────
router.post('/me/avatar', verifyToken, upload.single('avatar'), verifyMimeBytes, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `https://storage.example.com/avatars/${req.user.id}-${Date.now()}`;
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl }, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
