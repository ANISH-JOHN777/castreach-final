const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

/**
 * Recompute a user's avgRating, totalReviews, and ratingDistribution from every published review.
 *
 * Primary source: Review model (status: 'PUBLISHED')
 * Secondary fallback: Legacy hostReview/guestReview fields on Booking
 */
async function recomputeUserRating(userId) {
  const oid = new mongoose.Types.ObjectId(userId);

  // 1. Check standalone Review collection
  const [reviewResult] = await Review.aggregate([
    { $match: { reviewee: oid, status: 'PUBLISHED' } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
        r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]);

  let avgRating = 0;
  let totalReviews = 0;
  let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (reviewResult && reviewResult.count > 0) {
    avgRating = Math.round(reviewResult.avg * 100) / 100;
    totalReviews = reviewResult.count;
    ratingDistribution = {
      1: reviewResult.r1 || 0,
      2: reviewResult.r2 || 0,
      3: reviewResult.r3 || 0,
      4: reviewResult.r4 || 0,
      5: reviewResult.r5 || 0,
    };
  } else {
    // 2. Fallback to Booking model hostReview/guestReview
    const [bookingResult] = await Booking.aggregate([
      { $match: { $or: [{ host: oid }, { guest: oid }] } },
      {
        $project: {
          rating: {
            $cond: [
              { $eq: ['$host', oid] },
              '$hostReview.rating',
              '$guestReview.rating',
            ],
          },
        },
      },
      { $match: { rating: { $ne: null } } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
          r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        },
      },
    ]);

    if (bookingResult && bookingResult.count > 0) {
      avgRating = Math.round(bookingResult.avg * 100) / 100;
      totalReviews = bookingResult.count;
      ratingDistribution = {
        1: bookingResult.r1 || 0,
        2: bookingResult.r2 || 0,
        3: bookingResult.r3 || 0,
        4: bookingResult.r4 || 0,
        5: bookingResult.r5 || 0,
      };
    }
  }

  await User.findByIdAndUpdate(userId, { avgRating, totalReviews, ratingDistribution });

  return { avgRating, totalReviews, ratingDistribution };
}

/**
 * Fetch a user's complete reputation profile.
 */
async function getUserReputation(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  const recentReviews = await Review.find({ reviewee: userId, status: 'PUBLISHED' })
    .populate('reviewer', 'displayName avatar profilePicture role')
    .sort({ createdAt: -1 })
    .limit(10);

  const sanitizedRecent = recentReviews.map((r) => ({
    id: r._id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: r.createdAt,
    reviewer: r.reviewer
      ? {
          id: r.reviewer._id,
          displayName: r.reviewer.displayName || r.reviewer.name || 'Anonymous',
          avatar: r.reviewer.profilePicture || r.reviewer.avatar || '',
          role: r.reviewer.role,
        }
      : null,
  }));

  return {
    userId: user._id,
    displayName: user.displayName || user.name,
    averageRating: user.avgRating || 0,
    totalReviews: user.totalReviews || 0,
    ratingDistribution: user.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    recentReviews: sanitizedRecent,
  };
}

/**
 * Recompute responseRate and avgResponseTime for a host.
 */
async function recomputeHostResponseMetrics(hostId) {
  const oid = new mongoose.Types.ObjectId(hostId);

  const [totalReceived, [result]] = await Promise.all([
    Booking.countDocuments({ host: oid }),
    Booking.aggregate([
      { $match: { host: oid, respondedAt: { $exists: true, $ne: null } } },
      {
        $project: {
          responseMinutes: {
            $divide: [
              { $subtract: ['$respondedAt', '$createdAt'] },
              60000,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: '$responseMinutes' },
          respondedCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const respondedCount = result?.respondedCount ?? 0;
  const responseRate = totalReceived > 0 ? Math.round((respondedCount / totalReceived) * 100) / 100 : 0;
  const avgResponseTime = result ? Math.round(result.avg) : 0;

  await User.findByIdAndUpdate(hostId, { responseRate, avgResponseTime });
  return { responseRate, avgResponseTime };
}

module.exports = {
  recomputeUserRating,
  getUserReputation,
  recomputeHostResponseMetrics,
};
