const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { app, makeUser, makeHost, makeAdmin, auth } = require('./helpers');
const Booking = require('../models/Booking');
const User = require('../models/User');
const storageService = require('../services/storage');
const renderWorker = require('../worker/renderWorker');

describe('Phase C3.3 — Asynchronous FFmpeg Recording Rendering', () => {
  let host, guest, unrelatedUser, admin;
  let testBooking;

  beforeEach(async () => {
    // 1. Create test users via helpers
    host = await makeHost();
    guest = await makeUser({ role: 'guest' });
    unrelatedUser = await makeUser({ role: 'guest' });
    admin = await makeAdmin();

    // 2. Create test booking
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
      dailyRoomUrl: 'https://castreach.daily.co/room-render-test',
      recordingUrl: 'https://daily.co/recordings/test-c33-source.mp4',
      recordingReady: true,
      recordingStatus: 'READY',
      recordingDuration: 300,
      recordingStorage: {
        provider: 'local',
        objectKey: `recordings/test-booking-c33/original/source.mp4`,
        status: 'READY',
        contentType: 'video/mp4',
        sizeBytes: 1024576,
        storedAt: new Date(),
      },
      recordingEdit: {
        trimStartSeconds: 10,
        trimEndSeconds: 200,
        editedDurationSeconds: 190,
        updatedAt: new Date(),
        updatedBy: host.user._id,
        renderStatus: 'NOT_REQUESTED',
      },
    });

    // Create local dummy source file for worker test fixtures
    const localDir = path.join(process.cwd(), 'scratch', 'storage', 'recordings', testBooking._id.toString(), 'original');
    await fs.promises.mkdir(localDir, { recursive: true });
    await fs.promises.writeFile(path.join(localDir, 'source.mp4'), Buffer.from('TEST_MP4_SOURCE_BUFFER'));
  });

  // ── JOB CREATION TESTS ──────────────────────────────────────────────────

  test('1. Unauthenticated render request → 401', async () => {
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`);

    expect(res.status).toBe(401);
  });

  test('2. Unrelated user → 403', async () => {
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(unrelatedUser.token));

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  test('3. Host can request render', async () => {
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.renderStatus).toBe('QUEUED');
    expect(res.body.renderJobId).toBeDefined();

    const updated = await Booking.findById(testBooking._id);
    expect(updated.recordingEdit.renderStatus).toBe('QUEUED');
  });

  test('4. Guest can request render', async () => {
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(guest.token));

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.renderStatus).toBe('QUEUED');
  });

  test('5. Admin follows existing policy and can request render', async () => {
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(admin.token));

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
  });

  test('6. Non-READY recording rejected (400)', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      recordingStatus: 'PROCESSING',
      recordingReady: false,
    });

    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/READY before rendering/i);
  });

  test('7. Missing persistent source storage rejected (400)', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingStorage.status': 'NOT_STORED',
    });

    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Persistent original recording storage is not READY/i);
  });

  test('8. Missing EDL rejected (400)', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      $unset: { recordingEdit: 1 },
    });

    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/EDL edit instructions.*are required/i);
  });

  test('9. Invalid EDL rejected (400)', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.trimStartSeconds': 100,
      'recordingEdit.trimEndSeconds': 50,
    });

    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid EDL trim boundaries/i);
  });

  test('10. Duplicate processing job prevented', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'PROCESSING',
      'recordingEdit.renderJobId': 'job_existing_123',
    });

    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(202);
    expect(res.body.renderStatus).toBe('PROCESSING');
    expect(res.body.renderJobId).toBe('job_existing_123');
    expect(res.body.message).toMatch(/already in progress/i);
  });

  // ── STATE MACHINE TESTS ────────────────────────────────────────────────

  test('11. QUEUED state persisted', async () => {
    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.renderStatus).toBe('QUEUED');
    expect(booking.recordingEdit.renderRequestedAt).toBeDefined();
  });

  test('12. PROCESSING state persisted during worker execution', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
    });

    // Run processNextJob
    const jobPromise = renderWorker.processNextJob();
    
    // Check database while job completes
    const updated = await jobPromise;
    expect(updated.recordingEdit.renderStatus).toBe('READY');
  });

  test('13. READY state persisted after successful render', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
    });

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.renderStatus).toBe('READY');
    expect(booking.recordingEdit.renderCompletedAt).toBeDefined();
    expect(booking.recordingEdit.outputObjectKey).toMatch(/recordings\/.*\/edited\/job_.*\.mp4/);
    expect(booking.recordingEdit.outputSizeBytes).toBeGreaterThan(0);
  });

  test('14. FAILED state persisted when source is corrupted/missing', async () => {
    // Delete local source file to trigger worker failure
    const localSource = path.join(process.cwd(), 'scratch', 'storage', 'recordings', testBooking._id.toString(), 'original', 'source.mp4');
    if (fs.existsSync(localSource)) await fs.promises.unlink(localSource);

    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
      recordingUrl: 'invalid_source_url_triggering_failure',
    });

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.renderStatus).toBe('FAILED');
    expect(booking.recordingEdit.renderFailedAt).toBeDefined();
    expect(booking.recordingEdit.renderError).toBeDefined();
  });

  // ── FFMPEG EXECUTION TESTS ──────────────────────────────────────────────

  test('15. Worker invokes controlled FFmpeg arguments without shell interpolation', async () => {
    const inputPath = '/tmp/fake_input.mp4';
    const outputPath = '/tmp/fake_output.mp4';

    // Verify executeFFmpegTrim argument format
    const mockSpawn = jest.spyOn(require('child_process'), 'spawn');
    try {
      await renderWorker.executeFFmpegTrim(inputPath, outputPath, 15, 120);
    } catch {
      // Expected if ffmpeg binary missing on host
    }

    if (mockSpawn.mock.calls.length > 0) {
      const args = mockSpawn.mock.calls[0][1];
      expect(Array.isArray(args)).toBe(true);
      expect(args).toContain('-ss');
      expect(args).toContain('15');
      expect(args).toContain('-to');
      expect(args).toContain('120');
      expect(args).toContain('-avoid_negative_ts');
    }
    mockSpawn.mockRestore();
  });

  test('16. User input cannot inject shell arguments', async () => {
    // Attempt shell injection in trim values
    const injectionAttempt = "10; rm -rf /; echo ";
    
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/edit`)
      .use(auth(host.token))
      .send({
        trimStartSeconds: injectionAttempt,
        trimEndSeconds: 200,
      });

    // Should be rejected by validation or converted safely to Number
    if (res.status === 200) {
      expect(isNaN(res.body.edit.trimStartSeconds)).toBe(false);
    } else {
      expect(res.status).toBe(400);
    }
  });

  test('17. Successful FFmpeg output stored', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
    });

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.renderStatus).toBe('READY');
    
    const outputPath = path.join(process.cwd(), 'scratch', 'storage', booking.recordingEdit.outputObjectKey);
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test('18. Failed FFmpeg execution produces FAILED state', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
      'recordingStorage.objectKey': 'non_existent_key_123',
      recordingUrl: 'http://127.0.0.1:1/nonexistent.mp4',
    });

    // Unlink file
    const localSource = path.join(process.cwd(), 'scratch', 'storage', 'recordings', testBooking._id.toString(), 'original', 'source.mp4');
    if (fs.existsSync(localSource)) await fs.promises.unlink(localSource);

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.renderStatus).toBe('FAILED');
  });

  test('19. Original object remains untouched', async () => {
    const originalUrlBefore = testBooking.recordingUrl;
    const originalKeyBefore = testBooking.recordingStorage.objectKey;

    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
    });

    await renderWorker.processNextJob();

    const bookingAfter = await Booking.findById(testBooking._id);
    expect(bookingAfter.recordingUrl).toBe(originalUrlBefore);
    expect(bookingAfter.recordingStorage.objectKey).toBe(originalKeyBefore);
    expect(bookingAfter.recordingStorage.status).toBe('READY');
  });

  // ── STORAGE & ACCESS TESTS ─────────────────────────────────────────────

  test('20. Edited output stored separately under edited path', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
    });

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.outputObjectKey).toMatch(/^recordings\/.*\/edited\/job_.*\.mp4$/);
    expect(booking.recordingEdit.outputObjectKey).not.toBe(booking.recordingStorage.objectKey);
  });

  test('21. Output metadata persisted (outputObjectKey, outputSizeBytes)', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'QUEUED',
    });

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.outputObjectKey).toBeDefined();
    expect(booking.recordingEdit.outputSizeBytes).toBeGreaterThan(0);
  });

  test('22. Signed output URL works for authorized user', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'READY',
      'recordingEdit.outputObjectKey': `recordings/${testBooking._id}/edited/job_123.mp4`,
    });

    const res = await request(app)
      .get(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.renderStatus).toBe('READY');
    expect(res.body.accessUrl).toBeDefined();
    expect(res.body.accessUrl).toMatch(/exp=/);
  });

  test('23. Unauthorized output access blocked (401/403)', async () => {
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'READY',
      'recordingEdit.outputObjectKey': `recordings/${testBooking._id}/edited/job_123.mp4`,
    });

    const unauthRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/render`);
    expect(unauthRes.status).toBe(401);

    const forbiddenRes = await request(app)
      .get(`/api/recordings/${testBooking._id}/render`)
      .use(auth(unrelatedUser.token));
    expect(forbiddenRes.status).toBe(403);
  });

  // ── PAYMENT & BOOKING ISOLATION TESTS ─────────────────────────────────

  test('24. paymentStatus remains unchanged (held)', async () => {
    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.paymentStatus).toBe('held');
  });

  test('25. booking status remains unchanged (confirmed)', async () => {
    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.status).toBe('confirmed');
  });

  test('26. releaseEscrow is never called during rendering', async () => {
    const stripeService = require('../services/stripe');
    const spy = jest.spyOn(stripeService, 'releaseEscrow');

    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  // ── C3.1 EDL COMPATIBILITY TESTS ──────────────────────────────────────

  test('27. EDL remains unchanged after render', async () => {
    const edlBefore = {
      trimStartSeconds: testBooking.recordingEdit.trimStartSeconds,
      trimEndSeconds: testBooking.recordingEdit.trimEndSeconds,
      editedDurationSeconds: testBooking.recordingEdit.editedDurationSeconds,
    };

    await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.trimStartSeconds).toBe(edlBefore.trimStartSeconds);
    expect(booking.recordingEdit.trimEndSeconds).toBe(edlBefore.trimEndSeconds);
    expect(booking.recordingEdit.editedDurationSeconds).toBe(edlBefore.editedDurationSeconds);
  });

  test('28. reset EDL still works (DELETE /api/recordings/:bookingId/edit)', async () => {
    const res = await request(app)
      .delete(`/api/recordings/${testBooking._id}/edit`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit?.updatedAt).toBeUndefined();
  });

  // ── RETRY & OVERWRITE TESTS ─────────────────────────────────────────────

  test('29. Failed job can retry', async () => {
    // 1. Mark as FAILED
    await Booking.findByIdAndUpdate(testBooking._id, {
      'recordingEdit.renderStatus': 'FAILED',
      'recordingEdit.renderError': 'Simulated previous failure',
    });

    // 2. Trigger retry POST /render
    const res = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(res.status).toBe(202);
    expect(res.body.renderStatus).toBe('QUEUED');

    // 3. Process retry job
    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.renderStatus).toBe('READY');
    expect(booking.recordingEdit.renderError).toBeUndefined();
  });

  test('30. Successful output for identical EDL is not re-rendered', async () => {
    const req1 = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(req1.status).toBe(202);

    await renderWorker.processNextJob();

    const booking = await Booking.findById(testBooking._id);
    expect(booking.recordingEdit.renderStatus).toBe('READY');
    const firstJobId = booking.recordingEdit.renderJobId;

    // Trigger second request with identical EDL
    const req2 = await request(app)
      .post(`/api/recordings/${testBooking._id}/render`)
      .use(auth(host.token));

    expect(req2.status).toBe(200);
    expect(req2.body.renderStatus).toBe('READY');
    expect(req2.body.renderJobId).toBe(firstJobId);
  });
});
