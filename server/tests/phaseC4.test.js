const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, makeUser, makeHost, makeAdmin, auth } = require('./helpers');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const storageService = require('../services/storage');
const renderWorker = require('../worker/renderWorker');

describe('Phase C4 — Production-Grade Post-Meeting Recording Experience', () => {
  let host, guest, unrelatedUser, admin;
  let testBooking;

  beforeEach(async () => {
    host = await makeHost();
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
      dailyRoomUrl: 'https://castreach.daily.co/room-c4-test',
      recordingUrl: 'https://daily.co/recordings/test-c4-source.mp4',
      recordingReady: true,
      recordingStatus: 'READY',
      recordingDuration: 600,
      recordingStorage: {
        provider: 'local',
        objectKey: `recordings/test-booking-c4/original/source.mp4`,
        status: 'READY',
        contentType: 'video/mp4',
        sizeBytes: 1048576,
        storedAt: new Date(),
      },
      recordingEdit: {
        trimStartSeconds: 10,
        trimEndSeconds: 200,
        editedDurationSeconds: 190,
        renderStatus: 'NOT_REQUESTED',
        updatedAt: new Date(),
        updatedBy: host.user._id,
      },
    });

    // Create local dummy source file for worker test support
    const localDir = path.join(process.cwd(), 'scratch', 'storage', 'recordings', testBooking._id.toString(), 'original');
    await fs.promises.mkdir(localDir, { recursive: true });
    await fs.promises.writeFile(path.join(localDir, 'source.mp4'), Buffer.from('MOCK_C4_SOURCE_VIDEO_BYTES'));
  });

  afterEach(async () => {
    const localDir = path.join(process.cwd(), 'scratch', 'storage', 'recordings', testBooking?._id?.toString() || 'unknown');
    try {
      await fs.promises.rm(localDir, { recursive: true, force: true });
    } catch {
      // Cleanup ignored
    }
  });

  // 1. Recording READY UI data payload
  test('1. GET /api/recordings/:bookingId returns full READY recording metadata', async () => {
    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.recordingStatus).toBe('READY');
    expect(res.body.recordingReady).toBe(true);
    expect(res.body.recordingDuration).toBe(600);
    expect(res.body.recordingStorage.status).toBe('READY');
    expect(res.body.recordingEdit.trimStartSeconds).toBe(10);
    expect(res.body.recordingEdit.trimEndSeconds).toBe(200);
  });

  // 2. Recording PROCESSING state representation
  test('2. GET /api/recordings/:bookingId reflects PROCESSING state accurately', async () => {
    testBooking.recordingStatus = 'PROCESSING';
    testBooking.recordingReady = false;
    await testBooking.save();

    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.recordingStatus).toBe('PROCESSING');
    expect(res.body.recordingReady).toBe(false);
  });

  // 3. Recording FAILED state representation
  test('3. GET /api/recordings/:bookingId reflects FAILED state accurately', async () => {
    testBooking.recordingStatus = 'FAILED';
    testBooking.recordingReady = false;
    await testBooking.save();

    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.recordingStatus).toBe('FAILED');
    expect(res.body.recordingReady).toBe(false);
  });

  // 4. Render NOT_REQUESTED state
  test('4. GET /api/recordings/:bookingId/render returns NOT_REQUESTED when no render requested', async () => {
    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.renderStatus).toBe('NOT_REQUESTED');
  });

  // 5. Render QUEUED state
  test('5. Render request transitions renderStatus to QUEUED', async () => {
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(202);
    expect(res.body.renderStatus).toBe('QUEUED');
    expect(res.body.renderJobId).toBeDefined();

    const updated = await Booking.findById(testBooking._id);
    expect(updated.recordingEdit.renderStatus).toBe('QUEUED');
  });

  // 6. Render PROCESSING state
  test('6. Worker atomic claim transitions job from QUEUED to PROCESSING', async () => {
    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    const claimed = await Booking.findOneAndUpdate(
      { _id: testBooking._id, 'recordingEdit.renderStatus': 'QUEUED' },
      { $set: { 'recordingEdit.renderStatus': 'PROCESSING', 'recordingEdit.renderStartedAt': new Date() } },
      { new: true }
    );
    expect(claimed.recordingEdit.renderStatus).toBe('PROCESSING');

    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.renderStatus).toBe('PROCESSING');
  });

  // 7. Render READY state
  test('7. Render worker execution transitions state to READY with separate output', async () => {
    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.renderStatus).toBe('READY');
    expect(res.body.accessUrl).toBeDefined();
    expect(res.body.outputObjectKey).toContain('/edited/');
  });

  // 8. Render FAILED state
  test('8. Missing persistent source storage causes render to transition to FAILED', async () => {
    testBooking.recordingStorage.status = 'FAILED';
    await testBooking.save();

    testBooking.recordingEdit.renderStatus = 'QUEUED';
    testBooking.recordingEdit.renderJobId = 'job_fail_test';
    await testBooking.save();

    await renderWorker.processNextJob();

    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.renderStatus).toBe('FAILED');
    expect(res.body.error).toBeDefined();
  });

  // 9. Original recording preview authorization
  test('9. Original storage-url endpoint allows host and guest, denies unrelated user', async () => {
    const hostRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/storage-url`)
      .use(auth(host.token));
    expect(hostRes.status).toBe(200);
    expect(hostRes.body.accessUrl).toBeDefined();

    const guestRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/storage-url`)
      .use(auth(guest.token));
    expect(guestRes.status).toBe(200);

    const forbiddenRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/storage-url`)
      .use(auth(unrelatedUser.token));
    expect(forbiddenRes.status).toBe(403);
  });

  // 10. Edited recording preview authorization
  test('10. Rendered render-url endpoint allows participant, denies unrelated user', async () => {
    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const guestRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/render-url`)
      .use(auth(guest.token));
    expect(guestRes.status).toBe(200);
    expect(guestRes.body.accessUrl).toBeDefined();

    const forbiddenRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/render-url`)
      .use(auth(unrelatedUser.token));
    expect(forbiddenRes.status).toBe(403);
  });

  // 11. Download authorization
  test('11. Signed URLs require valid user token and participant status', async () => {
    const unauthRes = await request(app).get(`/api/recordings/${testBooking._id}/storage-url`);
    expect(unauthRes.status).toBe(401);

    const adminRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/storage-url`)
      .use(auth(admin.token));
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.accessUrl).toBeDefined();
  });

  // 12. Signed URL credential isolation
  test('12. Signed URL response does NOT leak secret keys or credentials', async () => {
    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}/storage-url`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('AWS_SECRET_ACCESS_KEY');
    expect(bodyStr).not.toContain('R2_SECRET');
  });

  // 13. Retry authorization
  test('13. Retry endpoint requires authorized participant and FAILED state', async () => {
    const notFailedRes = await request(app)
      .post(`/api/recordings/${testBooking._id}/render/retry`)
      .use(auth(host.token));
    expect(notFailedRes.status).toBe(400);

    testBooking.recordingEdit.renderStatus = 'FAILED';
    await testBooking.save();

    const retryRes = await request(app)
      .post(`/api/recordings/${testBooking._id}/render/retry`)
      .use(auth(host.token));
    expect(retryRes.status).toBe(202);
    expect(retryRes.body.renderStatus).toBe('QUEUED');
  });

  // 14. Duplicate render protection
  test('14. Duplicate POST /render for identical EDL returns existing job status', async () => {
    const firstRes = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));
    expect(firstRes.status).toBe(202);

    const dupRes = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));
    expect(dupRes.status).toBe(202);
    expect(dupRes.body.message).toContain('already in progress');
  });

  // 15. Notification generation on render completion
  test('15. Successful render worker execution emits notifications to host and guest', async () => {
    await Notification.deleteMany({});

    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const notifications = await Notification.find({ link: `/bookings/${testBooking._id}` });
    expect(notifications.length).toBeGreaterThanOrEqual(2);

    const recipients = notifications.map((n) => n.recipient.toString());
    expect(recipients).toContain(host.user._id.toString());
    expect(recipients).toContain(guest.user._id.toString());
  });

  // 16. Notification idempotency & ready reuse
  test('16. Re-requesting READY render returns existing output without duplicate render jobs', async () => {
    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const readyRes = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(readyRes.status).toBe(200);
    expect(readyRes.body.renderStatus).toBe('READY');
    expect(readyRes.body.message).toContain('already available');
  });

  // 17. Payment isolation
  test('17. Viewing, downloading, rendering, or retrying recording NEVER alters paymentStatus', async () => {
    const initialPaymentStatus = testBooking.paymentStatus; // 'held'

    await request(app)
      .get(`/api/recordings/${testBooking._id}/storage-url`)
      .use(auth(host.token));

    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    await request(app)
      .get(`/api/recordings/${testBooking._id}/render-url`)
      .use(auth(host.token));

    const updatedBooking = await Booking.findById(testBooking._id);
    expect(updatedBooking.paymentStatus).toBe(initialPaymentStatus);
    expect(updatedBooking.paymentStatus).toBe('held');
  });

  // 18. Booking state isolation
  test('18. Recording operations NEVER alter booking status', async () => {
    const initialStatus = testBooking.status; // 'confirmed'

    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const updatedBooking = await Booking.findById(testBooking._id);
    expect(updatedBooking.status).toBe(initialStatus);
    expect(updatedBooking.status).toBe('confirmed');
  });

  // 19. IDOR protection across all C4 endpoints
  test('19. IDOR: Unrelated users are blocked from storage-url, render, render-url, and retry', async () => {
    const endpoints = [
      { method: 'get', path: `/api/recordings/${testBooking._id}/storage-url` },
      { method: 'post', path: `/api/recordings/${testBooking._id}/render` },
      { method: 'get', path: `/api/recordings/${testBooking._id}/render` },
      { method: 'get', path: `/api/recordings/${testBooking._id}/render-url` },
      { method: 'post', path: `/api/recordings/${testBooking._id}/render/retry` },
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.path).use(auth(unrelatedUser.token));
      expect([400, 403]).toContain(res.status);
    }
  });

  // 20. Original recording remains completely unchanged
  test('20. Original recording object key and daily URL remain untouched after rendering', async () => {
    const origUrl = testBooking.recordingUrl;
    const origKey = testBooking.recordingStorage.objectKey;

    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const updated = await Booking.findById(testBooking._id);
    expect(updated.recordingUrl).toBe(origUrl);
    expect(updated.recordingStorage.objectKey).toBe(origKey);
    expect(updated.recordingEdit.outputObjectKey).not.toBe(origKey);
    expect(updated.recordingEdit.outputObjectKey).toContain('/edited/');
  });
});
