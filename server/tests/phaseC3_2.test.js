const request = require('supertest');
const { app, makeUser, makeHost, auth } = require('./helpers');
const Booking = require('../models/Booking');
const storageService = require('../services/storage');
const stripeService = require('../services/stripe');

describe('Phase C3.2 — Persistent Recording Storage & Access Control', () => {
  let host, guest, unrelatedUser;
  let confirmedBooking;

  beforeEach(async () => {
    // 1. Create Test Users
    host = await makeHost();
    guest = await makeUser({ role: 'guest' });
    unrelatedUser = await makeUser({ role: 'guest' });

    // 2. Create Confirmed Booking with READY recording and EDL
    confirmedBooking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(Date.now() + 3600000),
      slotEnd: new Date(Date.now() + 7200000),
      status: 'confirmed',
      amountCents: 5000,
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/test-room-c32',
      recordingUrl: 'https://daily-recordings.s3.amazonaws.com/test-c32.mp4',
      recordingReady: true,
      recordingStatus: 'READY',
      recordingDuration: 3600,
      recordingEdit: {
        trimStartSeconds: 15,
        trimEndSeconds: 3000,
        editedDurationSeconds: 2985,
        updatedAt: new Date(),
        updatedBy: host.user._id,
      },
    });
  });

  // 1. Access Control & Authorization
  test('1. Unauthenticated user cannot access storage URL (401)', async () => {
    const res = await request(app).get(`/api/recordings/${confirmedBooking._id}/storage-url`);
    expect(res.status).toBe(401);
  });

  test('2. Unrelated user cannot access storage URL (403)', async () => {
    const res = await request(app)
      .get(`/api/recordings/${confirmedBooking._id}/storage-url`)
      .use(auth(unrelatedUser.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/i);
  });

  test('3. Authorized host can access storage URL (200)', async () => {
    const res = await request(app)
      .get(`/api/recordings/${confirmedBooking._id}/storage-url`)
      .use(auth(host.token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessUrl).toBeDefined();
    expect(res.body.accessUrl).not.toMatch(/STORAGE_SECRET/i); // Credentials never leaked
  });

  test('4. Authorized guest can access storage URL (200)', async () => {
    const res = await request(app)
      .get(`/api/recordings/${confirmedBooking._id}/storage-url`)
      .use(auth(guest.token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 2. Daily Webhook Mirroring & Storage Metadata Persistence
  test('5. Daily ready-to-download webhook copies recording to persistent storage', async () => {
    // Mock fetch for Daily recording stream download
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url.includes('test-c32-webhook.mp4')) {
        return {
          ok: true,
          headers: new Map([
            ['content-type', 'video/mp4'],
            ['content-length', '1048576'],
          ]),
          arrayBuffer: async () => Buffer.from('mock_video_bytes_c32'),
        };
      }
      return { ok: true, status: 200 };
    });

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.ready-to-download',
        id: 'event_c32_mirror_1',
        payload: {
          room_name: 'test-room-c32',
          download_link: 'https://daily-recordings.s3.amazonaws.com/test-c32-webhook.mp4',
          duration: 3600,
        },
      });

    expect(res.status).toBe(200);

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.recordingStorage).toBeDefined();
    expect(updated.recordingStorage.status).toBe('READY');
    expect(updated.recordingStorage.objectKey).toBe(`recordings/${confirmedBooking._id}/original/source.mp4`);
    expect(updated.recordingStorage.sizeBytes).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });

  test('6. Duplicate webhook event handled idempotently without duplicate storage copies', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      headers: new Map([['content-type', 'video/mp4']]),
      arrayBuffer: async () => Buffer.from('mock_video_bytes_c32'),
    }));

    const eventPayload = {
      type: 'recording.ready-to-download',
      id: 'event_c32_idem_1',
      payload: {
        room_name: 'test-room-c32',
        download_link: 'https://daily-recordings.s3.amazonaws.com/test-c32-idem.mp4',
      },
    };

    // First delivery
    const res1 = await request(app).post('/api/webhooks/daily').send(eventPayload);
    expect(res1.status).toBe(200);

    // Duplicate delivery
    const res2 = await request(app).post('/api/webhooks/daily').send(eventPayload);
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);

    fetchSpy.mockRestore();
  });

  test('7. Storage failure during webhook produces FAILED storage status cleanly', async () => {
    const mirrorSpy = jest.spyOn(storageService, 'mirrorRecording').mockRejectedValueOnce(new Error('S3 Bucket Connection Refused'));

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.ready-to-download',
        id: 'event_c32_fail_1',
        payload: {
          room_name: 'test-room-c32',
          download_link: 'https://daily-recordings.s3.amazonaws.com/test-c32-fail.mp4',
        },
      });

    expect(res.status).toBe(200); // Webhook responds 200 to Daily

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.recordingStorage).toBeDefined();
    expect(updated.recordingStorage.status).toBe('FAILED');
    expect(updated.recordingStorage.error).toMatch(/Connection Refused/i);

    mirrorSpy.mockRestore();
  });

  // 3. Storage Retry & SSRF Protection
  test('8. Retry endpoint recovers FAILED storage status cleanly', async () => {
    // Set booking storage state to FAILED
    confirmedBooking.recordingStorage = {
      provider: 'local',
      objectKey: `recordings/${confirmedBooking._id}/original/source.mp4`,
      status: 'FAILED',
      error: 'Previous network timeout',
    };
    await confirmedBooking.save();

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      headers: new Map([['content-type', 'video/mp4']]),
      arrayBuffer: async () => Buffer.from('mock_video_retry_bytes'),
    }));

    const res = await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/retry-storage`)
      .use(auth(host.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordingStorage.status).toBe('READY');

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.recordingStorage.status).toBe('READY');

    fetchSpy.mockRestore();
  });

  test('9. SSRF Protection: Rejects untrusted external domain URLs', async () => {
    const isTrusted = storageService.isTrustedDailyUrl('https://malicious-attacker-host.com/exploit.mp4');
    expect(isTrusted).toBe(false);

    await expect(
      storageService.mirrorRecording('booking_123', 'https://malicious-attacker-host.com/exploit.mp4')
    ).rejects.toThrow(/Untrusted recording source URL/i);
  });

  test('10. Rejects empty (0 bytes) recording download', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      headers: new Map([['content-type', 'video/mp4']]),
      arrayBuffer: async () => Buffer.from(''), // 0 bytes
    }));

    await expect(
      storageService.mirrorRecording('booking_123', 'https://daily-recordings.s3.amazonaws.com/empty.mp4')
    ).rejects.toThrow(/empty/i);

    fetchSpy.mockRestore();
  });

  // 4. MANDATORY INVARIANT SAFETY & COMPATIBILITY ASSERTIONS
  test('11. C3.1 EDL metadata remains intact after storage mirroring', async () => {
    expect(confirmedBooking.recordingEdit.trimStartSeconds).toBe(15);
    expect(confirmedBooking.recordingEdit.trimEndSeconds).toBe(3000);

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      headers: new Map([['content-type', 'video/mp4']]),
      arrayBuffer: async () => Buffer.from('mock_bytes'),
    }));

    await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.ready-to-download',
        id: 'event_c32_compat_1',
        payload: {
          room_name: 'test-room-c32',
          download_link: 'https://daily-recordings.s3.amazonaws.com/test-c32-compat.mp4',
        },
      });

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.recordingEdit).toBeDefined();
    expect(updated.recordingEdit.trimStartSeconds).toBe(15);
    expect(updated.recordingEdit.trimEndSeconds).toBe(3000);
    expect(updated.recordingEdit.editedDurationSeconds).toBe(2985);

    fetchSpy.mockRestore();
  });

  test('12. Payment status remains held across persistent storage mirroring and retry', async () => {
    const spyRelease = jest.spyOn(stripeService, 'releaseEscrow');

    expect(confirmedBooking.paymentStatus).toBe('held');

    // Trigger retry
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      headers: new Map([['content-type', 'video/mp4']]),
      arrayBuffer: async () => Buffer.from('mock_bytes'),
    }));

    await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/retry-storage`)
      .use(auth(host.token));

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.paymentStatus).toBe('held');
    expect(updated.status).toBe('confirmed');
    expect(spyRelease).not.toHaveBeenCalled();

    spyRelease.mockRestore();
    fetchSpy.mockRestore();
  });

  test('13. Original recordingUrl, recordingStatus, and dailyRoomUrl remain untouched', async () => {
    const origUrl = confirmedBooking.recordingUrl;
    const origStatus = confirmedBooking.recordingStatus;
    const origRoom = confirmedBooking.dailyRoomUrl;

    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
      ok: true,
      headers: new Map([['content-type', 'video/mp4']]),
      arrayBuffer: async () => Buffer.from('mock_bytes'),
    }));

    await request(app)
      .post(`/api/recordings/${confirmedBooking._id}/retry-storage`)
      .use(auth(host.token));

    const updated = await Booking.findById(confirmedBooking._id);
    expect(updated.recordingUrl).toBe(origUrl);
    expect(updated.recordingStatus).toBe(origStatus);
    expect(updated.dailyRoomUrl).toBe(origRoom);

    fetchSpy.mockRestore();
  });
});
