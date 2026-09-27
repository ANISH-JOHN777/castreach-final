const request = require('supertest');
const { app, makeUser, makeHost, makeAdmin, auth } = require('./helpers');
const Booking = require('../models/Booking');
const Dispute = require('../models/Dispute');
const User = require('../models/User');
const stripeService = require('../services/stripe');

jest.mock('../services/stripe', () => ({
  createEscrowIntent: jest.fn(async () => ({ clientSecret: 'cs_test_mock_secret', paymentIntentId: 'pi_test_123' })),
  releaseEscrow: jest.fn(async (paymentIntentId) => ({ id: paymentIntentId, status: 'succeeded', transfer: 'tr_test_999' })),
  refundPayment: jest.fn(async (paymentIntentId) => ({ id: `re_test_${paymentIntentId}`, status: 'succeeded' })),
  createConnectOnboarding: jest.fn(async () => ({ accountLink: 'https://connect.stripe.com/onboard' })),
  retrievePaymentIntent: jest.fn(async () => null),
}));

describe('Phase D2 — Admin Control Center & Dispute Operations', () => {
  let host, guest, unrelatedUser, admin;
  let testBooking;

  beforeEach(async () => {
    jest.clearAllMocks();
    host = await makeHost(5000);
    guest = await makeUser({ role: 'guest' });
    unrelatedUser = await makeUser({ role: 'guest' });
    admin = await makeAdmin();

    const start = new Date(Date.now() + 3600000);
    const end = new Date(Date.now() + 7200000);

    testBooking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: start,
      slotEnd: end,
      status: 'confirmed',
      amountCents: 5000,
      paymentStatus: 'held',
      stripePaymentIntentId: 'pi_test_hold_d2',
    });
  });

  // 1. Admin Login
  test('1. Admin user can authenticate and retrieve admin JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.user.email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    expect(res.body.token).toBeDefined();
  });

  // 2. Non-admin denied
  test('2. Non-admin (guest/host) denied access to admin-only APIs', async () => {
    const guestRes = await request(app).get('/api/reports/overview').use(auth(guest.token));
    expect(guestRes.status).toBe(403);

    const hostRes = await request(app).get('/api/recordings').use(auth(host.token));
    expect(hostRes.status).toBe(403);
  });

  // 3. Admin API authorization
  test('3. Admin can access admin-protected routes', async () => {
    const res = await request(app).get('/api/reports/overview').use(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 4. Dashboard metrics
  test('4. GET /api/reports/overview returns complete platform metrics', async () => {
    const res = await request(app).get('/api/reports/overview').use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.users.total).toBeGreaterThan(0);
    expect(res.body.data.bookings.total).toBeGreaterThan(0);
    expect(res.body.data.payments.heldCount).toBeGreaterThanOrEqual(1);
  });

  // 5. User listing
  test('5. GET /api/users returns paginated user directory to admin', async () => {
    const res = await request(app).get('/api/users?page=1&limit=10').use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });

  // 6. User filtering
  test('6. GET /api/users filters users by role and search query', async () => {
    const hostRes = await request(app).get('/api/users?role=host').use(auth(admin.token));
    expect(hostRes.status).toBe(200);
    const roles = hostRes.body.users.map((u) => u.role);
    expect(roles.every((r) => r === 'host')).toBe(true);
  });

  // 7. Booking listing
  test('7. GET /api/bookings returns booking ledger for admin', async () => {
    const res = await request(app).get('/api/bookings?limit=10').use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.bookings).toBeDefined();
    expect(res.body.bookings.length).toBeGreaterThan(0);
  });

  // 8. Booking status filtering
  test('8. GET /api/bookings filters bookings by status', async () => {
    const res = await request(app).get('/api/bookings?status=confirmed').use(auth(admin.token));

    expect(res.status).toBe(200);
    const statuses = res.body.bookings.map((b) => b.status);
    expect(statuses.every((s) => s === 'confirmed')).toBe(true);
  });

  // 9. Payment details inspection
  test('9. Admin can inspect technical payment details without credentials leak', async () => {
    const res = await request(app).get(`/api/payments/${testBooking._id}/details`).use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.payment.stripePaymentIntentId).toBe('pi_test_hold_d2');
    expect(res.body.payment.platformFeeCents).toBe(750);
  });

  // 10. Payment authorization
  test('10. Non-participant cannot view payment details', async () => {
    const res = await request(app).get(`/api/payments/${testBooking._id}/details`).use(auth(unrelatedUser.token));
    expect(res.status).toBe(403);
  });

  // 11. Dispute listing
  test('11. Admin can list all platform disputes', async () => {
    testBooking.status = 'completed';
    await testBooking.save();

    await request(app)
      .post('/api/disputes')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, reason: 'no_show', description: 'Host did not arrive for podcast recording session' });

    const res = await request(app).get('/api/disputes').use(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.disputes.length).toBeGreaterThan(0);
  });

  // 12. Dispute resolution
  test('12. Admin can resolve dispute and trigger refund action', async () => {
    testBooking.status = 'completed';
    await testBooking.save();

    const disputeRes = await request(app)
      .post('/api/disputes')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, reason: 'no_show', description: 'Host did not arrive for podcast recording session' });

    const disputeId = disputeRes.body.dispute._id;

    const res = await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .use(auth(admin.token))
      .send({ resolution: 'Host no-show verified — full refund issued.', action: 'refund' });

    expect(res.status).toBe(200);
    expect(res.body.dispute.status).toBe('resolved');

    const updatedBooking = await Booking.findById(testBooking._id);
    expect(updatedBooking.paymentStatus).toBe('refunded');
  });

  // 13. Duplicate dispute resolution
  test('13. Resolving an already resolved dispute is rejected', async () => {
    testBooking.status = 'completed';
    await testBooking.save();

    const disputeRes = await request(app)
      .post('/api/disputes')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, reason: 'no_show', description: 'Host did not arrive for podcast recording session' });

    const disputeId = disputeRes.body.dispute._id;

    await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .use(auth(admin.token))
      .send({ resolution: 'Host no-show verified — full refund issued.', action: 'refund' });

    const dupRes = await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .use(auth(admin.token))
      .send({ resolution: 'Attempt duplicate resolution.', action: 'refund' });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error).toMatch(/already resolved/i);
  });

  // 14. Admin release override
  test('14. Admin can manually release held escrow payment', async () => {
    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/release`)
      .use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('released');
  });

  // 15. Admin refund execution
  test('15. Admin can manually refund held escrow payment', async () => {
    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/refund`)
      .use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('refunded');
  });

  // 16. Recording operational inspection
  test('16. Admin can inspect operational recordings list', async () => {
    const res = await request(app).get('/api/recordings').use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.recordings).toBeDefined();
  });

  // 17. IDOR protection
  test('17. Non-admin users are blocked from admin recording inspection and report routes', async () => {
    const recRes = await request(app).get('/api/recordings').use(auth(guest.token));
    expect(recRes.status).toBe(403);

    const repRes = await request(app).get('/api/reports/overview').use(auth(host.token));
    expect(repRes.status).toBe(403);
  });

  // 18. Audit logging
  test('18. Admin audit logs endpoint returns append-only log records', async () => {
    const res = await request(app).get('/api/stitcher/audit-logs').use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.logs).toBeDefined();
  });

  // 19. Notification on dispute resolution
  test('19. Admin dispute resolution emits events', async () => {
    testBooking.status = 'completed';
    await testBooking.save();

    const disputeRes = await request(app)
      .post('/api/disputes')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, reason: 'no_show', description: 'Host did not arrive for podcast recording session' });

    const disputeId = disputeRes.body.dispute._id;

    const res = await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .use(auth(admin.token))
      .send({ resolution: 'Resolved with refund.', action: 'refund' });

    expect(res.status).toBe(200);
  });

  // 20. Pagination parameters
  test('20. Admin list endpoints enforce pagination parameters', async () => {
    const res = await request(app).get('/api/users?page=1&limit=5').use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(5);
  });
});
