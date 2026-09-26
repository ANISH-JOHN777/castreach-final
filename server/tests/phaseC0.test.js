const request = require('supertest');
const { app, makeUser, makeHost, auth } = require('./helpers');
const Booking = require('../models/Booking');
const stripeService = require('../services/stripe');
const crypto = require('crypto');

describe('Phase C0 — Meeting & Recording Safety Foundation Tests', () => {

  // ── 1. Meeting Token Security ────────────────────────────────────────────────
  test('1. Unauthenticated user cannot request token', async () => {
    const res = await request(app)
      .post('/api/recordings/token')
      .send({ bookingId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(401);
  });

  test('2. Unrelated authenticated user cannot request token', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const outsider = await makeUser({ role: 'guest' });

    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .use(auth(host.token));

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(outsider.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(403);
  });

  test('3. Guest can request token for own confirmed booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .use(auth(host.token));

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.success).toBe(true);
    expect(tokenRes.body.token).toBeDefined();
    expect(tokenRes.body.roomUrl).toBeDefined();
  });

  test('4. Host can request token for own confirmed booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .use(auth(host.token));

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(host.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.success).toBe(true);
    expect(tokenRes.body.token).toBeDefined();
  });

  test('5. Guest cannot request token for pending booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(400);
  });

  test('6. Guest cannot request token for cancelled booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .use(auth(guest.token));

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(400);
  });

  test('7. Guest cannot request token for completed booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await request(app).patch(`/api/bookings/${bookingId}/confirm`).use(auth(host.token));
    await request(app).patch(`/api/bookings/${bookingId}/complete`).use(auth(guest.token));

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(400);
  });

  test("8. Booking ID manipulation cannot obtain another user's token", async () => {
    const host = await makeHost();
    const guest1 = await makeUser({ role: 'guest' });
    const guest2 = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest1.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;
    await request(app).patch(`/api/bookings/${bookingId}/confirm`).use(auth(host.token));

    const tamperedRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest2.token))
      .send({ bookingId });

    expect(tamperedRes.status).toBe(403);
  });

  test('9. Token generation does not expose Daily API key', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;
    await request(app).patch(`/api/bookings/${bookingId}/confirm`).use(auth(host.token));

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest.token))
      .send({ bookingId });

    const responseStr = JSON.stringify(tokenRes.body);
    expect(responseStr).not.toContain(process.env.DAILY_API_KEY || 'daily_dummy');
  });

  // ── 2. Mandatory Payment Decoupling Assertions ──────────────────────────────
  test('10 & 11 & 12 & 13 & 15. MANDATORY PAYMENT ASSERTION: recording.completed does NOT release payment, leaves paymentStatus=held, saves recordingUrl, and sets recordingReady=true', async () => {
    const releaseEscrowSpy = jest.spyOn(stripeService, 'releaseEscrow');

    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;
    await request(app).patch(`/api/bookings/${bookingId}/confirm`).use(auth(host.token));

    // Simulate held payment status on booking
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'held',
      stripePaymentIntentId: 'pi_test_held_123',
      dailyRoomUrl: `https://castreach.daily.co/castreach-${bookingId}`,
    });

    const payload = {
      event: 'recording.completed',
      id: `evt_rec_${Date.now()}`,
      payload: {
        room_name: `castreach-${bookingId}`,
        download_link: 'https://api.daily.co/v1/recordings/download/rec_123.mp4',
      },
    };

    const webhookRes = await request(app)
      .post('/api/webhooks/daily')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));

    expect(webhookRes.status).toBe(200);

    // Assert booking state
    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking.recordingReady).toBe(true);
    expect(updatedBooking.recordingUrl).toBe('https://api.daily.co/v1/recordings/download/rec_123.mp4');

    // CRITICAL MANDATORY ASSERTIONS:
    expect(updatedBooking.paymentStatus).toBe('held');
    expect(updatedBooking.paymentStatus).not.toBe('released');
    expect(releaseEscrowSpy).not.toHaveBeenCalled();

    releaseEscrowSpy.mockRestore();
  });

  test('14. Duplicate recording.completed does not duplicate state changes and returns duplicate status', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;
    await request(app).patch(`/api/bookings/${bookingId}/confirm`).use(auth(host.token));
    await Booking.findByIdAndUpdate(bookingId, { dailyRoomUrl: `https://castreach.daily.co/castreach-${bookingId}` });

    const payload = {
      event: 'recording.completed',
      id: `evt_dup_rec_${Date.now()}`,
      payload: {
        room_name: `castreach-${bookingId}`,
        download_link: 'https://api.daily.co/v1/recordings/download/rec_dup.mp4',
      },
    };

    const first = await request(app)
      .post('/api/webhooks/daily')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/webhooks/daily')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
  });

  // ── 3. Webhook Reliability & Vercel Order ────────────────────────────────────
  test('16. Invalid signature is rejected with 400 when secret is set', async () => {
    const originalSecret = process.env.DAILY_WEBHOOK_SECRET;
    try {
      process.env.DAILY_WEBHOOK_SECRET = 'test_secret_key';

      const res = await request(app)
        .post('/api/webhooks/daily')
        .set('Content-Type', 'application/json')
        .set('x-webhook-signature', 'invalid_signature')
        .send(JSON.stringify({ type: 'recording.completed' }));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid signature');
    } finally {
      if (originalSecret !== undefined) process.env.DAILY_WEBHOOK_SECRET = originalSecret;
      else delete process.env.DAILY_WEBHOOK_SECRET;
    }
  });

  test('17. Missing signature is rejected with 400 when secret is set', async () => {
    const originalSecret = process.env.DAILY_WEBHOOK_SECRET;
    try {
      process.env.DAILY_WEBHOOK_SECRET = 'test_secret_key';

      const res = await request(app)
        .post('/api/webhooks/daily')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'recording.completed' }));

      expect(res.status).toBe(400);
    } finally {
      if (originalSecret !== undefined) process.env.DAILY_WEBHOOK_SECRET = originalSecret;
      else delete process.env.DAILY_WEBHOOK_SECRET;
    }
  });

  test('18 & 19. VERCEL ORDER ASSERTION: Valid webhook waits for DB persistence before returning HTTP 200 response', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;
    await request(app).patch(`/api/bookings/${bookingId}/confirm`).use(auth(host.token));
    await Booking.findByIdAndUpdate(bookingId, { dailyRoomUrl: `https://castreach.daily.co/castreach-${bookingId}` });

    const payload = {
      event: 'recording.completed',
      id: `evt_vercel_${Date.now()}`,
      payload: {
        room_name: `castreach-${bookingId}`,
        download_link: 'https://api.daily.co/v1/recordings/download/rec_vercel.mp4',
      },
    };

    const res = await request(app)
      .post('/api/webhooks/daily')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));

    expect(res.status).toBe(200);

    // Database update MUST be completed synchronously before res.json was returned
    const checkBooking = await Booking.findById(bookingId);
    expect(checkBooking.recordingReady).toBe(true);
    expect(checkBooking.recordingUrl).toBe('https://api.daily.co/v1/recordings/download/rec_vercel.mp4');
  });

  test('20. Unknown event does not mutate booking state', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;
    await Booking.findByIdAndUpdate(bookingId, { dailyRoomUrl: `https://castreach.daily.co/castreach-${bookingId}` });

    const res = await request(app)
      .post('/api/webhooks/daily')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'meeting.started', payload: { room_name: `castreach-${bookingId}` } }));

    expect(res.status).toBe(200);
    expect(res.body.ignored).toBe(true);

    const bookingAfter = await Booking.findById(bookingId);
    expect(bookingAfter.recordingReady).toBe(false);
  });
});
