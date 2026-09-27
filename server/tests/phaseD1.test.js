const request = require('supertest');
const { app, makeUser, makeHost, makeAdmin, auth } = require('./helpers');
const Booking = require('../models/Booking');
const Dispute = require('../models/Dispute');
const ProcessedWebhookEvent = require('../models/ProcessedWebhookEvent');
const stripeService = require('../services/stripe');

jest.mock('../services/stripe', () => ({
  createEscrowIntent: jest.fn(async ({ amountCents, currency, hostStripeId, bookingId }) => ({
    clientSecret: 'cs_test_mock_secret',
    paymentIntentId: `pi_test_${bookingId}`,
  })),
  releaseEscrow: jest.fn(async (paymentIntentId, hostStripeId) => ({
    id: paymentIntentId,
    status: 'succeeded',
    transfer: 'tr_test_123',
  })),
  refundPayment: jest.fn(async (paymentIntentId) => ({
    id: `re_test_${paymentIntentId}`,
    status: 'succeeded',
  })),
  createConnectOnboarding: jest.fn(async () => ({ accountLink: 'https://connect.stripe.com/onboard' })),
  retrievePaymentIntent: jest.fn(async (paymentIntentId) => ({
    id: paymentIntentId,
    status: 'requires_payment_method',
    client_secret: 'cs_test_mock_secret',
  })),
}));

describe('Phase D1 — Payment & Escrow Completion', () => {
  let host, guest, unrelatedUser, admin;
  let testBooking;

  beforeEach(async () => {
    jest.clearAllMocks();
    host = await makeHost(10000); // $100 session rate
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
      amountCents: 10000,
      currency: 'usd',
      paymentStatus: 'held',
      stripePaymentIntentId: 'pi_test_hold_123',
    });
  });

  // 1. Payment Intent Creation
  test('1. Guest can create PaymentIntent for confirmed booking', async () => {
    testBooking.paymentStatus = 'unpaid';
    testBooking.stripePaymentIntentId = undefined;
    await testBooking.save();

    const res = await request(app)
      .post('/api/payments/intent')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id });

    expect(res.status).toBe(200);
    expect(res.body.clientSecret).toBe('cs_test_mock_secret');
    expect(stripeService.createEscrowIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 10000,
        currency: 'usd',
        bookingId: testBooking._id.toString(),
      })
    );
  });

  // 2. Amount Tampering Protection
  test('2. Client cannot tamper with session amount', async () => {
    testBooking.paymentStatus = 'unpaid';
    testBooking.stripePaymentIntentId = undefined;
    await testBooking.save();

    const res = await request(app)
      .post('/api/payments/intent')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, amountCents: 100 }); // Attempt tamper

    expect(res.status).toBe(200);
    expect(stripeService.createEscrowIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 10000 }) // Uses server DB rate
    );
  });

  // 3. Currency Tampering Protection
  test('3. Client cannot tamper with booking currency', async () => {
    testBooking.paymentStatus = 'unpaid';
    testBooking.stripePaymentIntentId = undefined;
    await testBooking.save();

    await request(app)
      .post('/api/payments/intent')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, currency: 'eur' });

    expect(stripeService.createEscrowIntent).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'usd' })
    );
  });

  // 4. Connected Account Destination Protection
  test('4. Connected account destination comes strictly from host record', async () => {
    testBooking.paymentStatus = 'unpaid';
    testBooking.stripePaymentIntentId = undefined;
    await testBooking.save();

    await request(app)
      .post('/api/payments/intent')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, hostStripeId: 'acct_hacker' });

    expect(stripeService.createEscrowIntent).not.toHaveBeenCalledWith(
      expect.objectContaining({ hostStripeId: 'acct_hacker' })
    );
  });

  // 5. Payment Hold Status
  test('5. GET /api/payments/:bookingId/details returns held payment status', async () => {
    const res = await request(app)
      .get(`/api/payments/${testBooking._id}/details`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.payment.paymentStatus).toBe('held');
    expect(res.body.payment.amountCents).toBe(10000);
    expect(res.body.payment.platformFeeCents).toBe(1500);
    expect(res.body.payment.hostPayoutCents).toBe(8500);
  });

  // 6. Host Completion Confirmation
  test('6. Host can confirm session completion', async () => {
    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/confirm-completion`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.hostConfirmedCompletion).toBe(true);
    expect(res.body.guestConfirmedCompletion).toBe(false);
    expect(res.body.released).toBe(false);

    const updated = await Booking.findById(testBooking._id);
    expect(updated.hostConfirmedCompletion).toBe(true);
  });

  // 7. Guest Completion Confirmation
  test('7. Guest can confirm session completion', async () => {
    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/confirm-completion`)
      .use(auth(guest.token));

    expect(res.status).toBe(200);
    expect(res.body.guestConfirmedCompletion).toBe(true);
    expect(res.body.hostConfirmedCompletion).toBe(false);
  });

  // 8. Duplicate Completion Confirmation
  test('8. Duplicate completion confirmation is idempotent', async () => {
    await request(app).post(`/api/payments/${testBooking._id}/confirm-completion`).use(auth(host.token));
    const res2 = await request(app).post(`/api/payments/${testBooking._id}/confirm-completion`).use(auth(host.token));

    expect(res2.status).toBe(200);
    expect(res2.body.hostConfirmedCompletion).toBe(true);
  });

  // 9. Single Confirmation Does Not Auto-Release Payment
  test('9. Single party confirmation does NOT automatically release payment', async () => {
    await request(app).post(`/api/payments/${testBooking._id}/confirm-completion`).use(auth(host.token));

    const updated = await Booking.findById(testBooking._id);
    expect(updated.paymentStatus).toBe('held');
    expect(stripeService.releaseEscrow).not.toHaveBeenCalled();
  });

  // 10. Release After Both Host and Guest Confirm
  test('10. Payment automatically releases after BOTH host and guest confirm', async () => {
    await request(app).post(`/api/payments/${testBooking._id}/confirm-completion`).use(auth(host.token));
    const res = await request(app).post(`/api/payments/${testBooking._id}/confirm-completion`).use(auth(guest.token));

    expect(res.status).toBe(200);
    expect(res.body.released).toBe(true);
    expect(res.body.paymentStatus).toBe('released');

    const updated = await Booking.findById(testBooking._id);
    expect(updated.paymentStatus).toBe('released');
    expect(stripeService.releaseEscrow).toHaveBeenCalledWith(
      'pi_test_hold_123',
      undefined,
      `release_${testBooking._id}_v1`
    );
  });

  // 11. Duplicate Release Idempotency
  test('11. Dedicated POST /release is idempotent when already released', async () => {
    testBooking.paymentStatus = 'released';
    await testBooking.save();

    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/release`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('released');
    expect(res.body.message).toContain('already released');
  });

  // 12. Payment Failure Handling
  test('12. Failed stripe release resets status safely', async () => {
    stripeService.releaseEscrow.mockRejectedValueOnce(new Error('Stripe API error'));

    testBooking.hostConfirmedCompletion = true;
    await testBooking.save();

    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/confirm-completion`)
      .use(auth(guest.token));

    expect(res.status).toBe(200);
    expect(res.body.released).toBe(false);

    const updated = await Booking.findById(testBooking._id);
    expect(updated.paymentStatus).toBe('held');
  });

  // 13. Transfer Failure Error Response
  test('13. POST /release returns 500 if Stripe capture throws exception', async () => {
    stripeService.releaseEscrow.mockRejectedValueOnce(new Error('Stripe transfer failure'));
    testBooking.hostConfirmedCompletion = true;
    testBooking.guestConfirmedCompletion = true;
    await testBooking.save();

    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/release`)
      .use(auth(host.token));

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Stripe transfer failure');
  });

  // 14. Host Refund Execution
  test('14. Host can initiate refund for held payment', async () => {
    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/refund`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('refunded');

    const updated = await Booking.findById(testBooking._id);
    expect(updated.paymentStatus).toBe('refunded');
    expect(stripeService.refundPayment).toHaveBeenCalledWith(
      'pi_test_hold_123',
      `refund_${testBooking._id}_v1`
    );
  });

  // 15. Duplicate Refund Idempotency
  test('15. Duplicate refund requests return existing refunded status', async () => {
    testBooking.paymentStatus = 'refunded';
    await testBooking.save();

    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/refund`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('refunded');
    expect(res.body.message).toContain('already refunded');
  });

  // 16. Active Dispute Blocks Payment Release
  test('16. Disputed payment blocks automatic and manual release requests', async () => {
    testBooking.status = 'disputed';
    testBooking.paymentStatus = 'disputed';
    testBooking.hostConfirmedCompletion = true;
    testBooking.guestConfirmedCompletion = true;
    await testBooking.save();

    const releaseRes = await request(app)
      .post(`/api/payments/${testBooking._id}/release`)
      .use(auth(host.token));

    expect(releaseRes.status).toBe(409);
    expect(releaseRes.body.error).toContain('disputed');
  });

  // 17. Admin Payment Release Override
  test('17. Admin can override confirmation requirements to release payment', async () => {
    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/release`)
      .use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('released');
  });

  // 18. Admin Dispute Resolution Action (Refund / Release)
  test('18. Admin dispute resolution executes refund action cleanly', async () => {
    testBooking.status = 'completed';
    await testBooking.save();

    // Create dispute
    const disputeRes = await request(app)
      .post('/api/disputes')
      .use(auth(guest.token))
      .send({ bookingId: testBooking._id, reason: 'technical_issue', description: 'Audio crashed during interview session' });

    expect(disputeRes.status).toBe(201);
    const disputeId = disputeRes.body.dispute._id;

    // Resolve dispute with refund action
    const resolveRes = await request(app)
      .post(`/api/disputes/${disputeId}/resolve`)
      .use(auth(admin.token))
      .send({ resolution: 'Full refund granted to guest due to technical glitch.', action: 'refund' });

    expect(resolveRes.status).toBe(200);

    const updatedBooking = await Booking.findById(testBooking._id);
    expect(updatedBooking.paymentStatus).toBe('refunded');
    expect(stripeService.refundPayment).toHaveBeenCalled();
  });

  // 19. Admin Details Inspection Protection
  test('19. Admin view exposes technical parameters without leaking secret keys', async () => {
    const res = await request(app)
      .get(`/api/payments/${testBooking._id}/details`)
      .use(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.payment.stripePaymentIntentId).toBe('pi_test_hold_123');
    const jsonStr = JSON.stringify(res.body);
    expect(jsonStr).not.toContain('STRIPE_SECRET_KEY');
    expect(jsonStr).not.toContain('sk_live_');
  });

  // 20. IDOR Protection on Payment Endpoints
  test('20. IDOR: Unrelated users are blocked from payment details, confirm, release, and refund', async () => {
    const endpoints = [
      { method: 'get', path: `/api/payments/${testBooking._id}/details` },
      { method: 'post', path: `/api/payments/${testBooking._id}/confirm-completion` },
      { method: 'post', path: `/api/payments/${testBooking._id}/release` },
      { method: 'post', path: `/api/payments/${testBooking._id}/refund` },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.path).use(auth(unrelatedUser.token));
      expect([400, 403]).toContain(res.status);
    }
  });

  // 21. Guest Cannot Directly Initiate Refund
  test('21. Guest cannot directly initiate refund without host/admin role', async () => {
    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/refund`)
      .use(auth(guest.token));

    expect(res.status).toBe(403);
  });

  // 22. Recording Webhook Isolation Assertion
  test('22. Daily recording webhook MUST NOT release payment', async () => {
    const webhookPayload = JSON.stringify({
      type: 'recording.completed',
      payload: {
        room_name: `castreach-${testBooking._id}`,
        download_link: 'https://daily.co/recordings/test.mp4',
        duration: 300,
      },
    });

    await request(app)
      .post('/api/webhooks/daily')
      .set('Content-Type', 'application/json')
      .send(webhookPayload);

    const updated = await Booking.findById(testBooking._id);
    expect(updated.paymentStatus).toBe('held');
  });

  // 23. Invalid Payment State Transitions Rejected
  test('23. Cannot release payment when status is unpaid', async () => {
    testBooking.paymentStatus = 'unpaid';
    await testBooking.save();

    const res = await request(app)
      .post(`/api/payments/${testBooking._id}/release`)
      .use(auth(host.token));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cannot release payment in current state');
  });

  // 24. Audit Trail Event Emission
  test('24. Payment release emits audit log entry', async () => {
    const spy = jest.spyOn(require('../stitcher').audit, 'logReq');

    await request(app)
      .post(`/api/payments/${testBooking._id}/release`)
      .use(auth(admin.token));

    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        collectionName: 'bookings',
        documentId: testBooking._id,
        action: 'update',
        after: expect.objectContaining({ paymentStatus: 'released' }),
      })
    );
  });
});
