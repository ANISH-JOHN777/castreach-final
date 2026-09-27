const router      = require('express').Router();
const User        = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const { upload, verifyMimeBytes } = require('../middleware/upload');

// Public projection — never expose email/PII when listing or viewing others (BLK-5).
const PUBLIC_FIELDS = '-__v -email -refreshToken -stripeAccountId';

// ── GET /api/users?role=host&q=search&expertise=AI&minRating=4&badge=top_rated&sort=rating ─────
router.get('/', verifyToken, async (req, res) => {
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
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const targetId = req.params.id === 'me' ? req.user.id : req.params.id;
    // A user viewing their own profile keeps their email; others get the public view.
    const projection = targetId === req.user.id ? '-__v' : PUBLIC_FIELDS;
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
    const ALLOWED = ['name', 'bio', 'expertise', 'podcastName', 'podcastUrl', 'socialLinks', 'isOnboarded', 'sessionRateCents'];
    const updates = {};
    ALLOWED.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users/me/avatar ─────────────────────────────────────────────────
router.post('/me/avatar', verifyToken, upload.single('avatar'), verifyMimeBytes, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // In production: upload req.file.buffer to Supabase Storage / S3 and get URL
    // Here we return a placeholder
    const avatarUrl = `https://storage.example.com/avatars/${req.user.id}-${Date.now()}`;
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: avatarUrl }, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
