const request = require('supertest');
const { app, makeUser, makeHost, auth } = require('./helpers');
const Availability = require('../models/Availability');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

describe('Phase A & B — Communication & Scheduling Workflow Tests', () => {

  // ── Authentication ───────────────────────────────────────────────────────────
  test('1. unauthenticated user cannot create booking', async () => {
    const res = await request(app).post('/api/bookings').send({
      hostId: '507f1f77bcf86cd799439011',
      slotStart: new Date(Date.now() + 3600000).toISOString(),
      slotEnd: new Date(Date.now() + 7200000).toISOString(),
    });
    expect(res.status).toBe(401);
  });

  test('2. unauthenticated user cannot access private booking chat', async () => {
    const res = await request(app).get('/api/messages/507f1f77bcf86cd799439011');
    expect(res.status).toBe(401);
  });

  // ── Authorization & Booking Creation ─────────────────────────────────────────
  test('3. guest can create booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });

    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const res = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({
        hostId: host.user._id,
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
        topics: ['Podcast Production'],
        message: 'Excited to record!',
      });

    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.status).toBe('pending');
  });

  test('4. host cannot create a booking as guest targeting themselves', async () => {
    const host = await makeHost();
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const res = await request(app)
      .post('/api/bookings')
      .use(auth(host.token))
      .send({
        hostId: host.user._id,
        slotStart: start.toISOString(),
        slotEnd: end.toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot book yourself/i);
  });

  test('5. host can manage own availability', async () => {
    const host = await makeHost();
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const res = await request(app)
      .post('/api/availability')
      .use(auth(host.token))
      .send({
        slots: [{ start: start.toISOString(), end: end.toISOString() }],
      });

    expect(res.status).toBe(201);
    expect(res.body.slots.length).toBe(1);
  });

  test('6. guest cannot modify host availability', async () => {
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const res = await request(app)
      .post('/api/availability')
      .use(auth(guest.token))
      .send({
        slots: [{ start: start.toISOString(), end: end.toISOString() }],
      });

    expect(res.status).toBe(403);
  });

  test('7. host can confirm own booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    const confirmRes = await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .use(auth(host.token));

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.booking.status).toBe('confirmed');
  });

  test("8. unrelated host cannot confirm another host's booking", async () => {
    const host1 = await makeHost();
    const host2 = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host1.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    const confirmRes = await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .use(auth(host2.token));

    expect(confirmRes.status).toBe(403);
  });

  test('9. guest cannot confirm a host booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    const confirmRes = await request(app)
      .patch(`/api/bookings/${bookingId}/confirm`)
      .use(auth(guest.token));

    expect(confirmRes.status).toBe(403);
  });

  // ── Messaging & IDOR Protection ──────────────────────────────────────────────
  test('10. guest can message host for own booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    const msgRes = await request(app)
      .post('/api/messages')
      .use(auth(guest.token))
      .send({ bookingId, content: 'Hello Host!' });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.message.content).toBe('Hello Host!');
  });

  test('11. host can message guest for own booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    const msgRes = await request(app)
      .post('/api/messages')
      .use(auth(host.token))
      .send({ bookingId, content: 'Welcome Guest!' });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.message.content).toBe('Welcome Guest!');
  });

  test('12. unrelated user cannot access conversation (IDOR protection)', async () => {
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

    const getRes = await request(app)
      .get(`/api/messages/${bookingId}`)
      .use(auth(outsider.token));

    expect(getRes.status).toBe(403);
  });

  test('13. retrieving booking conversation returns user and system messages', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    const getRes = await request(app)
      .get(`/api/messages/${bookingId}`)
      .use(auth(guest.token));

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.messages)).toBe(true);
    expect(getRes.body.messages.some(m => m.content === 'Booking request sent.')).toBe(true);
  });

  // ── Scheduling & Validation ──────────────────────────────────────────────────
  test('14. valid future slot can be booked', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const res = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    expect(res.status).toBe(201);
  });

  test('15. past slot rejected', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() - 3600000);
    const end = new Date(Date.now() - 1800000);

    const res = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    expect(res.status).toBe(400);
  });

  test('16. invalid time range (end <= start) rejected', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 80000000);

    const res = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    expect(res.status).toBe(400);
  });

  test('17. already-booked slot rejected', async () => {
    const host = await makeHost();
    const guest1 = await makeUser({ role: 'guest' });
    const guest2 = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    await request(app)
      .post('/api/bookings')
      .use(auth(guest1.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const conflictRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest2.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    expect(conflictRes.status).toBe(409);
  });

  test('18. availability slot becomes booked (isBooked: true) after successful booking', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const availRes = await request(app)
      .post('/api/availability')
      .use(auth(host.token))
      .send({ slots: [{ start: start.toISOString(), end: end.toISOString() }] });

    expect(availRes.status).toBe(201);
    const slotId = availRes.body.slots[0]._id;

    await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const updatedSlot = await Availability.findById(slotId);
    expect(updatedSlot.isBooked).toBe(true);
  });

  test('19. cancelled booking restores availability slot (isBooked: false)', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    const availRes = await request(app)
      .post('/api/availability')
      .use(auth(host.token))
      .send({ slots: [{ start: start.toISOString(), end: end.toISOString() }] });

    const slotId = availRes.body.slots[0]._id;

    const bookingRes = await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const bookingId = bookingRes.body.booking._id;

    await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .use(auth(host.token));

    const restoredSlot = await Availability.findById(slotId);
    expect(restoredSlot.isBooked).toBe(false);
  });

  // ── Notifications ────────────────────────────────────────────────────────────
  test('20. host receives booking notification', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const notifRes = await request(app)
      .get('/api/notifications')
      .use(auth(host.token));

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.some(n => n.type === 'booking_request')).toBe(true);
  });

  test('21. guest receives confirmation notification', async () => {
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

    const notifRes = await request(app)
      .get('/api/notifications')
      .use(auth(guest.token));

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.some(n => n.type === 'booking_confirmed')).toBe(true);
  });

  test('22. mark all notifications read works', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 90000000);

    await request(app)
      .post('/api/bookings')
      .use(auth(guest.token))
      .send({ hostId: host.user._id, slotStart: start.toISOString(), slotEnd: end.toISOString() });

    const readRes = await request(app)
      .post('/api/notifications/read-all')
      .use(auth(host.token));

    expect(readRes.status).toBe(200);

    const notifRes = await request(app)
      .get('/api/notifications')
      .use(auth(host.token));

    expect(notifRes.body.notifications.every(n => n.isRead)).toBe(true);
  });
});
