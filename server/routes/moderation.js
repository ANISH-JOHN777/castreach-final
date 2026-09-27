const router       = require('express').Router();
const User         = require('../models/User');
const Report       = require('../models/Report');
const Review       = require('../models/Review');
const verifyToken  = require('../middleware/verifyToken');
const requireAdmin = require('../middleware/requireAdmin');
const { validate, ReportSchema } = require('../middleware/validate');
const stitcher     = require('../stitcher');
const { recomputeUserRating } = require('../services/reviews');

// ── POST /api/moderation/report — report a user ───────────────────────────────
router.post('/report', verifyToken, validate(ReportSchema), async (req, res) => {
  try {
    const { reportedId, reason } = req.body;

    const reported = await User.findById(reportedId);
    if (!reported) return res.status(404).json({ error: 'User not found' });
    if (reportedId === req.user.id) return res.status(400).json({ error: 'Cannot report yourself' });

    const report = await Report.create({
      reporter: req.user.id,
      reported: reportedId,
      reason,
    });

    stitcher.audit.logReq(req, {
      collectionName: 'reports',
      documentId:     report._id,
      action:         'create',
      actor:          req.user.id,
      actorRole:      req.user.role,
      after: { reporter: req.user.id, reported: reportedId, status: 'open' },
    });

    stitcher.events.emit(stitcher.EVENTS.REPORT_FILED, {
      reportId:   report._id.toString(),
      reporterId: req.user.id,
      reportedId,
    });

    res.json({ message: 'Report received. Our team will review it.', reportId: report._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/moderation/reports — admin: list reports by status ───────────────
router.get('/reports', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'open' } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = {};
    if (status !== 'all') filter.status = status;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'name')
        .populate('reported', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Report.countDocuments(filter),
    ]);

    res.json({ reports, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/moderation/reviews — admin: list/search reviews for moderation ─────
router.get('/reviews', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, rating, q, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (rating) filter.rating = Number(rating);
    if (q) {
      filter.$or = [
        { title: new RegExp(q.trim(), 'i') },
        { comment: new RegExp(q.trim(), 'i') },
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('reviewer', 'name displayName email')
        .populate('reviewee', 'name displayName email')
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l),
      Review.countDocuments(filter),
    ]);

    res.json({ success: true, reviews, pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/moderation/reviews/:reviewId — admin: update review status ─────
router.patch('/reviews/:reviewId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['PUBLISHED', 'HIDDEN', 'FLAGGED', 'REMOVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const oldStatus = review.status;
    review.status = status;
    await review.save();

    // Recompute reviewee rating so hidden/removed reviews do not count towards reputation
    await recomputeUserRating(review.reviewee);

    stitcher.audit.logReq(req, {
      collectionName: 'reviews',
      documentId:     review._id,
      action:         'moderation_update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      before: { status: oldStatus },
      after:  { status },
    });

    res.json({ success: true, message: `Review status updated to ${status}`, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/moderation/block/:userId — admin block ─────────────────────────
router.post('/block/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBlocked: true },
      { new: true }
    ).select('-email -password -refreshToken -stripeAccountId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    stitcher.audit.logReq(req, {
      collectionName: 'users',
      documentId:     user._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      before: { isBlocked: false },
      after:  { isBlocked: true },
    });

    stitcher.events.emit(stitcher.EVENTS.USER_BLOCKED, {
      userId:  user._id.toString(),
      actorId: req.user.id,
    });

    res.json({ message: 'User blocked', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/moderation/unblock/:userId — admin unblock ─────────────────────
router.post('/unblock/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBlocked: false },
      { new: true }
    ).select('-email -password -refreshToken -stripeAccountId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    stitcher.audit.logReq(req, {
      collectionName: 'users',
      documentId:     user._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      before: { isBlocked: true },
      after:  { isBlocked: false },
    });

    stitcher.events.emit(stitcher.EVENTS.USER_UNBLOCKED, {
      userId:  user._id.toString(),
      actorId: req.user.id,
    });

    res.json({ message: 'User unblocked', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
