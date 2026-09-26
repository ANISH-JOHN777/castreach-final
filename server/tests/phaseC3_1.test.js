const request = require('supertest');
const { app, makeUser, makeHost, auth } = require('./helpers');
const Booking = require('../models/Booking');

describe('Phase C3.1 — Non-Destructive Recording Editor (EDL & Authorization)', () => {
  let host, guest, unrelatedUser;
  let confirmedBooking;

  beforeEach(async () => {
    // 1. Create Test Users using project test helpers
    host = await makeHost();
    guest = await makeUser({ role: 'guest' });
    unrelatedUser = await makeUser({ role: 'guest' });

    // 2. Create Confirmed Booking with READY recording
    confirmedBooking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(Date.now() + 3600000),
      slotEnd: new Date(Date.now() + 7200000),
      status: 'confirmed',
      amountCents: 5000,
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/test-room-c31',
      recordingUrl: 'https://daily-recordings.s3.amazonaws.com/test-c31.mp4',
      recordingReady: true,
      recordingStatus: 'READY',
      recordingDuration: 3600,
    });
  });

  // 1. Authentication & Authorization
  test('1. GET /api/recordings/:id/edit requires authentication (401)', async () => {
    const res = await request(app).get(`/api/recordings/${confirmedBooking._id}/edit`);
    expect(res.status).toBe(401);
  });

  test('2. GET /api/recordings/:id/edit blocks unrelated user (403)', async () => {
    const res = await request(app)
      .get(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(unrelatedUser.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  test('3. GET /api/recordings/:id/edit allows booking host (200)', async () => {
    const res = await request(app)
      .get(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sourceDurationSeconds).toBe(3600);
    expect(res.body.edit).toBeNull();
  });

  test('4. GET /api/recordings/:id/edit allows booking guest (200)', async () => {
    const res = await request(app)
      .get(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(guest.token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 2. POST Edit Validation & Authorization
  test('5. POST /api/recordings/:id/edit requires authentication (401)', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .send({ trimStartSeconds: 10, trimEndSeconds: 300 });
    expect(res.status).toBe(401);
  });

  test('6. POST /api/recordings/:id/edit blocks unrelated user (403)', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(unrelatedUser.token))
      .send({ trimStartSeconds: 10, trimEndSeconds: 300 });
    expect(res.status).toBe(403);
  });

  test('7. POST /api/recordings/:id/edit allows booking host to save EDL', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 15, trimEndSeconds: 3000 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.edit.trimStartSeconds).toBe(15);
    expect(res.body.edit.trimEndSeconds).toBe(3000);
    expect(res.body.edit.editedDurationSeconds).toBe(2985);
  });

  test('8. POST /api/recordings/:id/edit allows booking guest to save EDL', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(guest.token))
      .send({ trimStartSeconds: 20, trimEndSeconds: 2500 });
    expect(res.status).toBe(200);
    expect(res.body.edit.trimStartSeconds).toBe(20);
    expect(res.body.edit.trimEndSeconds).toBe(2500);
    expect(res.body.edit.editedDurationSeconds).toBe(2480);
  });

  test('9. POST /api/recordings/:id/edit rejects missing trim values (400)', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('10. POST /api/recordings/:id/edit rejects negative start time (400)', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: -5, trimEndSeconds: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/negative/i);
  });

  test('11. POST /api/recordings/:id/edit rejects end <= start (400)', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 100, trimEndSeconds: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/greater than/i);
  });

  test('12. POST /api/recordings/:id/edit rejects end > duration (400)', async () => {
    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 10, trimEndSeconds: 4000 }); // duration is 3600
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exceed recording duration/i);
  });

  test('13. POST /api/recordings/:id/edit rejects non-ready recording (400)', async () => {
    const unreadyBooking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(),
      status: 'confirmed',
      recordingStatus: 'PROCESSING',
      recordingReady: false,
    });

    const res = await request(app)
      .post(`/api/recordings/${unreadyBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 0, trimEndSeconds: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be READY/i);
  });

  test('14. POST /api/recordings/:id/edit persists valid EDL in MongoDB', async () => {
    await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 30, trimEndSeconds: 1800 });

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.recordingEdit).toBeDefined();
    expect(updated.recordingEdit.trimStartSeconds).toBe(30);
    expect(updated.recordingEdit.trimEndSeconds).toBe(1800);
    expect(updated.recordingEdit.editedDurationSeconds).toBe(1770);
    expect(updated.recordingUrl).toBe('https://daily-recordings.s3.amazonaws.com/test-c31.mp4'); // Original URL untouched
    expect(updated.recordingReady).toBe(true);
    expect(updated.recordingStatus).toBe('READY');
  });

  test('15. DELETE /api/recordings/:id/edit resets saved EDL back to null', async () => {
    // First save an edit
    await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 30, trimEndSeconds: 1800 });

    // Then delete/reset edit
    const res = await request(app)
      .delete(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.edit).toBeNull();

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.recordingEdit?.updatedAt).toBeUndefined();
  });

  // 3. MANDATORY INVARIANT SAFETY ASSERTIONS
  test('16. Payment status remains held across POST and DELETE edit operations', async () => {
    expect(confirmedBooking.paymentStatus).toBe('held');

    // Save Edit
    await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 5, trimEndSeconds: 100 });

    let fresh = await Booking.findById(confirmedBooking._id);
    expect(fresh.paymentStatus).toBe('held');
    expect(fresh.amountCents).toBe(5000);

    // Delete Edit
    await request(app)
      .delete(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token));

    fresh = await Booking.findById(confirmedBooking._id);
    expect(fresh.paymentStatus).toBe('held');
    expect(fresh.amountCents).toBe(5000);
  });

  test('17. Booking status remains confirmed across edit operations', async () => {
    expect(confirmedBooking.status).toBe('confirmed');

    await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 10, trimEndSeconds: 500 });

    const fresh = await Booking.findById(confirmedBooking._id);
    expect(fresh.status).toBe('confirmed');
  });

  test('18. Original recordingUrl, recordingStatus, and dailyRoomUrl remain untouched', async () => {
    const origUrl = confirmedBooking.recordingUrl;
    const origStatus = confirmedBooking.recordingStatus;
    const origDailyUrl = confirmedBooking.dailyRoomUrl;

    await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/edit`)
      .use(auth(host.token))
      .send({ trimStartSeconds: 5, trimEndSeconds: 120 });

    const fresh = await Booking.findById(confirmedBooking._id);
    expect(fresh.recordingUrl).toBe(origUrl);
    expect(fresh.recordingStatus).toBe(origStatus);
    expect(fresh.dailyRoomUrl).toBe(origDailyUrl);
  });
});
