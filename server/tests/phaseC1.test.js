const request = require('supertest');
const { app, makeUser, makeHost, auth } = require('./helpers');
const Booking = require('../models/Booking');
const stripeService = require('../services/stripe');

describe('Phase C1 — Secure Meeting Room & Participant Authorization Tests', () => {

  test('1. Unauthenticated user cannot request meeting token', async () => {
    const res = await request(app)
      .post('/api/recordings/token')
      .send({ bookingId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(401);
  });

  test('2. Unrelated user cannot request meeting token', async () => {
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
    expect(tokenRes.body.isOwner).toBe(true);
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
    expect(tokenRes.body.error).toMatch(/confirmed/i);
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

  test('7. Completed booking follows actual backend contract', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await Booking.findByIdAndUpdate(bookingId, { status: 'completed' });

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(400);
  });

  test('8. Token is never returned to unauthorized participant', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const intruder = await makeUser({ role: 'guest' });

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
      .use(auth(intruder.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(403);
    expect(tokenRes.body.token).toBeUndefined();
  });

  test('9. Token API does not expose Daily API secret key', async () => {
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

    const responseString = JSON.stringify(tokenRes.body);
    expect(responseString).not.toContain(process.env.DAILY_API_KEY || 'SECRET_KEY_NEVER_EXPOSED');
  });

  test('10. Meeting token request preserves paymentStatus held and does not release escrow', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await Booking.findByIdAndUpdate(bookingId, { status: 'confirmed', paymentStatus: 'held' });

    const spyRelease = jest.spyOn(stripeService, 'releaseEscrow');

    const tokenRes = await request(app)
      .post('/api/recordings/token')
      .use(auth(guest.token))
      .send({ bookingId });

    expect(tokenRes.status).toBe(200);

    const updatedBooking = await Booking.findById(bookingId);
    expect(updatedBooking.paymentStatus).toBe('held');
    expect(spyRelease).not.toHaveBeenCalled();

    spyRelease.mockRestore();
  });

});
