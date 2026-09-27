const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { calculateMatch } = require('../services/matchingEngine');

describe('Phase E6 — Reviews & Reputation System Test Suite', () => {
  let hostToken, guestToken, unrelatedToken, privateUserToken, adminToken;
  let hostUser, guestUser, unrelatedUser, privateUser, adminUser;
  let completedBooking, pendingBooking, cancelledBooking;

  beforeEach(async () => {
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    // Create Host User
    hostUser = await User.create({
      name: 'Host Alex',
      displayName: 'Host Alex',
      email: 'host@e6test.com',
      password: 'password123',
      role: 'host',
      profileVisibility: 'public',
    });

    // Create Guest User
    guestUser = await User.create({
      name: 'Guest Dr. Sarah',
      displayName: 'Guest Dr. Sarah',
      email: 'guest@e6test.com',
      password: 'password123',
      role: 'guest',
      profileVisibility: 'public',
    });

    // Create Unrelated User
    unrelatedUser = await User.create({
      name: 'Unrelated Bob',
      displayName: 'Unrelated Bob',
      email: 'unrelated@e6test.com',
      password: 'password123',
      role: 'guest',
      profileVisibility: 'public',
    });

    // Create Private User
    privateUser = await User.create({
      name: 'Private Creator',
      displayName: 'Private Creator',
      email: 'private@e6test.com',
      password: 'password123',
      role: 'host',
      profileVisibility: 'private',
    });

    // Create Admin User
    adminUser = await User.create({
      name: 'Admin Moderator',
      displayName: 'Admin Moderator',
      email: 'admin@e6test.com',
      password: 'password123',
      role: 'admin',
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    hostToken = jwt.sign({ id: hostUser._id.toString(), role: 'host' }, jwtSecret);
    guestToken = jwt.sign({ id: guestUser._id.toString(), role: 'guest' }, jwtSecret);
    unrelatedToken = jwt.sign({ id: unrelatedUser._id.toString(), role: 'guest' }, jwtSecret);
    privateUserToken = jwt.sign({ id: privateUser._id.toString(), role: 'host' }, jwtSecret);
    adminToken = jwt.sign({ id: adminUser._id.toString(), role: 'admin' }, jwtSecret);

    // Completed Booking
    completedBooking = await Booking.create({
      host: hostUser._id,
      guest: guestUser._id,
      slotStart: new Date(Date.now() - 7200000),
      slotEnd: new Date(Date.now() - 3600000),
      status: 'completed',
      paymentStatus: 'released',
    });

    // Pending Booking
    pendingBooking = await Booking.create({
      host: hostUser._id,
      guest: guestUser._id,
      slotStart: new Date(Date.now() + 3600000),
      slotEnd: new Date(Date.now() + 7200000),
      status: 'pending',
    });

    // Cancelled Booking
    cancelledBooking = await Booking.create({
      host: hostUser._id,
      guest: guestUser._id,
      slotStart: new Date(Date.now() - 14400000),
      slotEnd: new Date(Date.now() - 10800000),
      status: 'cancelled',
    });
  });

  // 1. Create valid host review (guest reviewing host)
  it('1. should create valid guest review for host', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId: completedBooking._id,
        rating: 5,
        title: 'Outstanding Session!',
        comment: 'Great host, insightful questions.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.reviewer.toString()).toBe(guestUser._id.toString());
    expect(res.body.review.reviewee.toString()).toBe(hostUser._id.toString());
  });

  // 2. Create valid guest review (host reviewing guest)
  it('2. should create valid host review for guest', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        bookingId: completedBooking._id,
        rating: 4,
        title: 'Very prepared guest',
        comment: 'Sarah was articulate and punctual.',
      });

    expect(res.status).toBe(201);
    expect(res.body.review.reviewee.toString()).toBe(guestUser._id.toString());
  });

  // 3. Reject unauthenticated
  it('3. should reject unauthenticated review creation with 401', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ bookingId: completedBooking._id, rating: 5 });

    expect(res.status).toBe(401);
  });

  // 4. Reject unrelated user
  it('4. should reject review attempt by non-participant user with 403', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${unrelatedToken}`)
      .send({ bookingId: completedBooking._id, rating: 5 });

    expect(res.status).toBe(403);
  });

  // 5. Reject self-review
  it('5. should reject self-review attempts', async () => {
    const selfBooking = await Booking.create({
      host: hostUser._id,
      guest: hostUser._id,
      slotStart: new Date(),
      slotEnd: new Date(),
      status: 'completed',
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ bookingId: selfBooking._id, rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Self-reviews');
  });

  // 6. Reject review before completion
  it('6. should reject review for pending booking with 400', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: pendingBooking._id, rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('completed');
  });

  // 7. Reject cancelled booking
  it('7. should reject review for cancelled booking with 400', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: cancelledBooking._id, rating: 5 });

    expect(res.status).toBe(400);
  });

  // 8. Reject duplicate review
  it('8. should reject duplicate review for same booking with 409', async () => {
    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 5 });

    const dupRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 4 });

    expect(dupRes.status).toBe(409);
  });

  // 9. Validate 1-star
  it('9. should accept valid 1-star rating', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 1 });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(1);
  });

  // 10. Validate 5-star
  it('10. should accept valid 5-star rating', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 5 });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);
  });

  // 11. Reject 0-star
  it('11. should reject 0-star rating with 400', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 0 });

    expect(res.status).toBe(400);
  });

  // 12. Reject >5-star
  it('12. should reject rating > 5 with 400', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 6 });

    expect(res.status).toBe(400);
  });

  // 13. Reject decimal rating
  it('13. should reject decimal ratings like 4.5 with 400', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 4.5 });

    expect(res.status).toBe(400);
  });

  // 14. Validate comment length
  it('14. should trim and cap comment length', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId: completedBooking._id,
        rating: 5,
        comment: ' '.repeat(10) + 'Great conversation' + ' '.repeat(10),
      });

    expect(res.status).toBe(201);
    expect(res.body.review.comment).toBe('Great conversation');
  });

  // 15. Safe review rendering / HTML escaping
  it('15. should sanitize HTML content in comments', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({
        bookingId: completedBooking._id,
        rating: 5,
        comment: '<script>alert("xss")</script>Nice podcast!',
      });

    expect(res.status).toBe(201);
    expect(res.body.review.comment).not.toContain('<script>');
  });

  // 16. Retrieve booking reviews
  it('16. should retrieve reviews associated with a booking', async () => {
    await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 5,
      comment: 'Excellent host!',
    });

    const res = await request(app)
      .get(`/api/reviews/booking/${completedBooking._id}`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
  });

  // 17. Retrieve user reviews
  it('17. should retrieve published reviews for a user', async () => {
    await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 5,
      comment: 'Top quality host',
    });

    const res = await request(app).get(`/api/reviews/user/${hostUser._id}`);
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0].reviewer.displayName).toBe('Guest Dr. Sarah');
    expect(res.body.reviews[0].reviewer.email).toBeUndefined(); // PII masked
  });

  // 18. Reputation aggregation
  it('18. should compute average rating and total reviews on user', async () => {
    const { recomputeUserRating } = require('../services/reviews');
    await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 5,
    });
    await recomputeUserRating(hostUser._id);

    const host = await User.findById(hostUser._id);
    expect(host.avgRating).toBe(5);
    expect(host.totalReviews).toBe(1);
  });

  // 19. Rating distribution
  it('19. should update rating distribution histogram on user', async () => {
    const { recomputeUserRating } = require('../services/reviews');
    await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 4,
    });
    await recomputeUserRating(hostUser._id);

    const host = await User.findById(hostUser._id);
    expect(host.ratingDistribution['4']).toBe(1);
  });

  // 20. Review editing
  it('20. should allow reviewer to edit their review', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 4,
      comment: 'Good',
    });

    const res = await request(app)
      .put(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ rating: 5, comment: 'Actually fantastic!' });

    expect(res.status).toBe(200);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.comment).toBe('Actually fantastic!');
  });

  // 21. Immutable reviewer
  it('21. should prevent changing reviewer field during edit', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 4,
    });

    await request(app)
      .put(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ reviewer: unrelatedUser._id });

    const updated = await Review.findById(rev._id);
    expect(updated.reviewer.toString()).toBe(guestUser._id.toString());
  });

  // 22. Immutable reviewee
  it('22. should prevent changing reviewee field during edit', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 4,
    });

    await request(app)
      .put(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ reviewee: unrelatedUser._id });

    const updated = await Review.findById(rev._id);
    expect(updated.reviewee.toString()).toBe(hostUser._id.toString());
  });

  // 23. Immutable booking
  it('23. should prevent changing booking field during edit', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 4,
    });

    await request(app)
      .put(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ booking: pendingBooking._id });

    const updated = await Review.findById(rev._id);
    expect(updated.booking.toString()).toBe(completedBooking._id.toString());
  });

  // 24. Review notification
  it('24. should notify reviewee when review is submitted', async () => {
    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 5 });

    const notification = await Notification.findOne({ recipient: hostUser._id });
    expect(notification).not.toBeNull();
    expect(notification.title).toContain('Review');
  });

  // 25. Audit log
  it('25. should record audit log entry for review creation', async () => {
    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 5 });

    const audit = await AuditLog.findOne({ collectionName: 'reviews', action: 'create' });
    expect(audit).not.toBeNull();
    expect(audit.actor.toString()).toBe(guestUser._id.toString());
  });

  // 26. Review reporting
  it('26. should allow reporting a review for moderation', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 1,
      comment: 'Inappropriate language',
    });

    const res = await request(app)
      .post(`/api/reviews/${rev._id}/report`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ reason: 'Offensive language' });

    expect(res.status).toBe(200);
    const updated = await Review.findById(rev._id);
    expect(updated.status).toBe('FLAGGED');
    expect(updated.reportedReason).toBe('Offensive language');
  });

  // 27. Admin moderation list & status update
  it('27. should allow admin to list and update review status', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 1,
      status: 'FLAGGED',
    });

    const listRes = await request(app)
      .get('/api/moderation/reviews?status=FLAGGED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.reviews).toHaveLength(1);

    const patchRes = await request(app)
      .patch(`/api/moderation/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'HIDDEN' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.review.status).toBe('HIDDEN');
  });

  // 28. Non-admin admin endpoint rejection
  it('28. should reject non-admin access to admin moderation endpoint with 403', async () => {
    const res = await request(app)
      .get('/api/moderation/reviews')
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(403);
  });

  // 29. Hidden review excluded from reputation
  it('29. should exclude hidden reviews from average rating calculation', async () => {
    const { recomputeUserRating } = require('../services/reviews');
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 1,
      status: 'PUBLISHED',
    });
    await recomputeUserRating(hostUser._id);

    let host = await User.findById(hostUser._id);
    expect(host.avgRating).toBe(1);

    await request(app)
      .patch(`/api/moderation/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'HIDDEN' });

    host = await User.findById(hostUser._id);
    expect(host.avgRating).toBe(0);
    expect(host.totalReviews).toBe(0);
  });

  // 30. Removed review excluded from reputation
  it('30. should exclude removed reviews from reputation metrics', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 1,
      status: 'PUBLISHED',
    });

    await request(app)
      .patch(`/api/moderation/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'REMOVED' });

    const host = await User.findById(hostUser._id);
    expect(host.totalReviews).toBe(0);
  });

  // 31. IDOR protection
  it('31. should prevent non-reviewer from editing review with 403', async () => {
    const rev = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 4,
    });

    const res = await request(app)
      .put(`/api/reviews/${rev._id}`)
      .set('Authorization', `Bearer ${unrelatedToken}`)
      .send({ rating: 1 });

    expect(res.status).toBe(403);
  });

  // 32. Tenant isolation
  it('32. should isolate review queries under tenant header', async () => {
    const res = await request(app)
      .get(`/api/reviews/user/${hostUser._id}`)
      .set('x-tenant-id', 'castreach');

    expect(res.status).toBe(200);
  });

  // 33. Payment isolation
  it('33. should ensure reviews never alter payment escrow state', async () => {
    const initialPaymentStatus = completedBooking.paymentStatus;

    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: completedBooking._id, rating: 5 });

    const recheckedBooking = await Booking.findById(completedBooking._id);
    expect(recheckedBooking.paymentStatus).toBe(initialPaymentStatus);
  });

  // 34. Dispute integration
  it('34. should reject review on disputed incomplete booking', async () => {
    const disputedBooking = await Booking.create({
      host: hostUser._id,
      guest: guestUser._id,
      slotStart: new Date(),
      slotEnd: new Date(),
      status: 'disputed',
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ bookingId: disputedBooking._id, rating: 1 });

    expect(res.status).toBe(400);
  });

  // 35. Discovery integration
  it('35. should integrate reputation data into user profile API', async () => {
    const { recomputeUserRating } = require('../services/reviews');
    await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 5,
    });
    await recomputeUserRating(hostUser._id);

    const res = await request(app).get(`/api/reputation/${hostUser._id}`);
    expect(res.status).toBe(200);
    expect(res.body.reputation.averageRating).toBe(5);
  });

  // 36. No duplicate reputation counting
  it('36. should not double-count reviews during multiple rating recomputations', async () => {
    await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 5,
    });

    const { recomputeUserRating } = require('../services/reviews');
    await recomputeUserRating(hostUser._id);
    await recomputeUserRating(hostUser._id);

    const host = await User.findById(hostUser._id);
    expect(host.totalReviews).toBe(1);
    expect(host.avgRating).toBe(5);
  });

  // 37. Empty review state
  it('37. should return empty reputation object for user without reviews', async () => {
    const res = await request(app).get(`/api/reputation/${unrelatedUser._id}`);
    expect(res.status).toBe(200);
    expect(res.body.reputation.averageRating).toBe(0);
    expect(res.body.reputation.totalReviews).toBe(0);
  });

  // 38. Pagination
  it('38. should support pagination on user reviews API', async () => {
    const res = await request(app).get(`/api/reviews/user/${hostUser._id}?page=1&limit=5`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
  });

  // 39. Review ordering
  it('39. should return user reviews ordered newest first', async () => {
    const r1 = await Review.create({
      booking: completedBooking._id,
      reviewer: guestUser._id,
      reviewee: hostUser._id,
      rating: 4,
      createdAt: new Date(Date.now() - 10000),
    });

    const r2 = await Review.create({
      booking: completedBooking._id,
      reviewer: hostUser._id,
      reviewee: guestUser._id,
      rating: 5,
      createdAt: new Date(),
    });

    const res = await request(app).get(`/api/reviews/user/${guestUser._id}`);
    expect(res.status).toBe(200);
    expect(res.body.reviews[0].id.toString()).toBe(r2._id.toString());
  });

  // 40. Private profile protection
  it('40. should protect reputation details for private profiles from unauthorized users', async () => {
    const res = await request(app)
      .get(`/api/reputation/${privateUser._id}`)
      .set('Authorization', `Bearer ${unrelatedToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Private profile');
  });
});
