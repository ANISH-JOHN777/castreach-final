const router = require('express').Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const requireAdmin = require('../middleware/requireAdmin');
const { globalLimiter } = require('../middleware/rateLimit');
const { recomputeUserRating, getUserReputation } = require('../services/reviews');
const { notify } = require('../services/notifications');
const stitcher = require('../stitcher');

// Apply rate limiting
router.use(globalLimiter);

/**
 * Helper to validate integer rating 1-5 strictly.
 */
function isValidRating(val) {
  if (val === undefined || val === null) return false;
  if (typeof val !== 'number' && typeof val !== 'string') return false;
  const num = Number(val);
  if (isNaN(num) || !Number.isInteger(num)) return false;
  return num >= 1 && num <= 5;
}

/**
 * Helper to sanitize user string input for comments/titles (simple XSS prevention).
 */
function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── 1. POST /api/reviews — Create Review ─────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bookingId, rating, title, comment } = req.body;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Valid bookingId is required' });
    }

    if (!isValidRating(rating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const numericRating = Number(rating);
    const cleanTitle = sanitizeText(title).slice(0, 100);
    const cleanComment = sanitizeText(comment).slice(0, 1000);

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Reviews can only be submitted for completed bookings' });
    }

    const isHost = booking.host.toString() === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;

    if (!isHost && !isGuest) {
      return res.status(403).json({ error: 'You are not a participant in this booking' });
    }

    const reviewerId = req.user.id;
    const targetId = req.body.targetUserId || req.body.revieweeId;
    if (targetId && targetId.toString() === reviewerId) {
      return res.status(400).json({ error: 'Self-reviews are not permitted' });
    }

    const revieweeId = isGuest ? booking.host.toString() : booking.guest.toString();

    if (reviewerId === revieweeId) {
      return res.status(400).json({ error: 'Self-reviews are not permitted' });
    }

    // Check for existing duplicate review
    const existingReview = await Review.findOne({ booking: bookingId, reviewer: reviewerId });
    if (existingReview) {
      return res.status(409).json({ error: 'You have already submitted a review for this booking' });
    }

    // Create Review document
    const review = await Review.create({
      booking: booking._id,
      reviewer: reviewerId,
      reviewee: revieweeId,
      rating: numericRating,
      title: cleanTitle,
      comment: cleanComment,
      status: 'PUBLISHED',
      tenantId: req.headers['x-tenant-id'] || 'castreach',
    });

    // Update legacy embedded review fields on Booking for backward compatibility
    if (isGuest) {
      booking.hostReview = { rating: numericRating, comment: cleanComment };
    } else {
      booking.guestReview = { rating: numericRating, comment: cleanComment };
    }
    await booking.save();

    // Recompute target user rating
    await recomputeUserRating(revieweeId);

    // Notify reviewee
    await notify(revieweeId, {
      type: 'review_received',
      title: 'New Review Received',
      body: 'Your podcast partner left you a review.',
      link: `/profile/${revieweeId}`,
    }).catch((err) => console.error('Failed to notify reviewee:', err.message));

    // Audit log
    if (stitcher.audit) {
      stitcher.audit.logReq(req, {
        collectionName: 'reviews',
        documentId: review._id,
        action: 'create',
        actor: reviewerId,
        after: { rating: numericRating, reviewee: revieweeId },
      });
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already submitted a review for this booking' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── 2. GET /api/reviews/user/:userId — Get Public Reviews for User ───────────
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {
      reviewee: userId,
      status: 'PUBLISHED',
    };

    const [reviews, totalCount] = await Promise.all([
      Review.find(query)
        .populate('reviewer', 'displayName name avatar profilePicture role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(query),
    ]);

    const sanitized = reviews.map((r) => {
      const obj = r.toObject();
      const reviewerObj = obj.reviewer || {};
      return {
        id: obj._id,
        rating: obj.rating,
        title: obj.title,
        comment: obj.comment,
        createdAt: obj.createdAt,
        reviewer: {
          id: reviewerObj._id,
          displayName: reviewerObj.displayName || reviewerObj.name || 'Anonymous',
          avatar: reviewerObj.profilePicture || reviewerObj.avatar || '',
          role: reviewerObj.role,
        },
      };
    });

    res.json({
      success: true,
      reviews: sanitized,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      totalCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. GET /api/reviews/booking/:bookingId — Get Reviews for Booking ─────────
router.get('/booking/:bookingId', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isHost = booking.host.toString() === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const reviews = await Review.find({ booking: bookingId, status: { $ne: 'REMOVED' } })
      .populate('reviewer', 'displayName name avatar profilePicture role');

    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 4. GET /api/reviews/me — Get Reviews Written/Received by Current User ────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [written, received] = await Promise.all([
      Review.find({ reviewer: req.user.id, status: { $ne: 'REMOVED' } })
        .populate('reviewee', 'displayName name avatar profilePicture role')
        .sort({ createdAt: -1 }),
      Review.find({ reviewee: req.user.id, status: 'PUBLISHED' })
        .populate('reviewer', 'displayName name avatar profilePicture role')
        .sort({ createdAt: -1 }),
    ]);

    res.json({ success: true, written, received });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 5. PUT /api/reviews/:reviewId — Edit Review ──────────────────────────────
router.put('/:reviewId', verifyToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to edit this review' });
    }

    if (review.status === 'REMOVED') {
      return res.status(400).json({ error: 'Removed reviews cannot be edited' });
    }

    if (rating !== undefined) {
      if (!isValidRating(rating)) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
      }
      review.rating = Number(rating);
    }

    if (title !== undefined) review.title = sanitizeText(title).slice(0, 100);
    if (comment !== undefined) review.comment = sanitizeText(comment).slice(0, 1000);

    await review.save();

    // Recompute reviewee rating
    await recomputeUserRating(review.reviewee);

    // Audit log
    if (stitcher.audit) {
      stitcher.audit.logReq(req, {
        collectionName: 'reviews',
        documentId: review._id,
        action: 'update',
        actor: req.user.id,
      });
    }

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 6. POST /api/reviews/:reviewId/report — Report Review ───────────────────
router.post('/:reviewId/report', verifyToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Report reason is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    review.status = 'FLAGGED';
    review.reportedReason = sanitizeText(reason);
    review.reportedBy = req.user.id;
    review.reportedAt = new Date();
    await review.save();

    if (stitcher.audit) {
      stitcher.audit.logReq(req, {
        collectionName: 'reviews',
        documentId: review._id,
        action: 'flag',
        actor: req.user.id,
        after: { reason: review.reportedReason },
      });
    }

    res.json({ success: true, message: 'Review reported for moderation' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Optional token extractor for public routes that can accept auth
function optionalToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwt = require('jsonwebtoken');
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    } catch (e) {
      // Ignore invalid optional token
    }
  }
  next();
}

// ── 7. GET /api/reputation/:userId & GET /api/reviews/reputation/:userId ───
async function handleReputation(req, res) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy
    if (['private', 'PRIVATE'].includes(targetUser.profileVisibility)) {
      const isOwner = req.user && req.user.id === userId;
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Private profile reputation is protected' });
      }
    }

    const reputation = await getUserReputation(userId);
    res.json({ success: true, reputation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.get('/reputation/:userId', optionalToken, handleReputation);
router.get('/:userId', optionalToken, handleReputation);

module.exports = router;
