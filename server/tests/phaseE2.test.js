const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Podcast = require('../models/Podcast');
const Episode = require('../models/Episode');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const storageService = require('../services/storage');
const transcriptionWorker = require('../worker/transcriptionWorker');

describe('Phase E2 — Podcast Transcription Suite', () => {
  let hostToken, hostUser, hostId;
  let guestToken, guestUser, guestId;
  let adminToken, adminUser;
  let unauthorizedToken, unauthorizedUser, unauthId;
  let readyBooking, pendingRecordingBooking;
  let testPodcast, testEpisode;

  beforeEach(async () => {
    // Setup test users
    const hostRes = await request(app).post('/api/auth/register').send({
      name: 'Transcribe Host',
      email: `txhost_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'Password123!',
      role: 'host',
    });
    hostToken = hostRes.body.token;
    hostUser = hostRes.body.user;
    hostId = hostUser._id || hostUser.id;

    const guestRes = await request(app).post('/api/auth/register').send({
      name: 'Transcribe Guest',
      email: `txguest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'Password123!',
      role: 'guest',
    });
    guestToken = guestRes.body.token;
    guestUser = guestRes.body.user;
    guestId = guestUser._id || guestUser.id;

    const unauthRes = await request(app).post('/api/auth/register').send({
      name: 'Unauth User',
      email: `txunauth_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'Password123!',
      role: 'host',
    });
    unauthorizedToken = unauthRes.body.token;
    unauthorizedUser = unauthRes.body.user;
    unauthId = unauthorizedUser._id || unauthorizedUser.id;

    adminUser = await User.create({
      name: 'Admin Tx User',
      email: `admin_e2_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'Password123!',
      role: 'admin',
    });

    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: 'admin' },
      process.env.JWT_SECRET || 'dev_secret'
    );

    const now = new Date();
    const end = new Date(now.getTime() + 3600000);

    // Ready booking fixture
    readyBooking = await Booking.create({
      host: hostId,
      guest: guestId,
      slotStart: now,
      slotEnd: end,
      status: 'completed',
      amountCents: 6000,
      paymentStatus: 'released',
      recordingStatus: 'READY',
      recordingReady: true,
      recordingStorage: {
        status: 'READY',
        provider: 'local',
        objectKey: 'recordings/mock_e2_booking/original/source.mp4',
        durationSeconds: 150,
      },
    });

    // Unready recording booking fixture
    pendingRecordingBooking = await Booking.create({
      host: hostId,
      guest: guestId,
      slotStart: now,
      slotEnd: end,
      status: 'confirmed',
      recordingStatus: 'PROCESSING',
      recordingStorage: {
        status: 'STORING',
      },
    });

    // Podcast and Episode fixtures
    testPodcast = await Podcast.create({
      owner: hostId,
      title: 'Transcription Show',
      slug: `tx-show-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      description: 'Show with transcriptions.',
      status: 'PUBLISHED',
    });

    testEpisode = await Episode.create({
      podcast: testPodcast._id,
      owner: hostId,
      title: 'Transcribed Episode',
      slug: `tx-ep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      mediaObjectKey: 'recordings/mock_e2_ep/source.mp4',
      duration: 180,
      status: 'PUBLISHED',
    });
  });

  describe('1. Transcription Requests & Authorization', () => {
    it('allows authorized booking participant to request transcription', async () => {
      const res = await request(app)
        .post(`/api/transcriptions/booking/${readyBooking._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ language: 'en' });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('QUEUED');
      expect(res.body.jobId).toBeDefined();

      const updated = await Booking.findById(readyBooking._id);
      expect(updated.transcription.status).toBe('QUEUED');
    });

    it('blocks unauthorized users from requesting transcription (IDOR protection)', async () => {
      const res = await request(app)
        .post(`/api/transcriptions/booking/${readyBooking._id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/unauthorized/i);
    });

    it('rejects transcription request for missing booking', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/transcriptions/booking/${fakeId}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects transcription request when recording is not READY', async () => {
      const res = await request(app)
        .post(`/api/transcriptions/booking/${pendingRecordingBooking._id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not ready for transcription/i);
    });
  });

  describe('2. Podcast Episode Transcription Authorization & Retrieval', () => {
    it('allows show owner to request episode transcription', async () => {
      const res = await request(app)
        .post(`/api/podcasts/${testPodcast._id}/episodes/${testEpisode._id}/transcription`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('QUEUED');
    });

    it('prevents non-owner from requesting episode transcription', async () => {
      const res = await request(app)
        .post(`/api/podcasts/${testPodcast._id}/episodes/${testEpisode._id}/transcription`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Idempotency & Duplicate Job Prevention', () => {
    it('returns existing QUEUED or PROCESSING job on duplicate request', async () => {
      // First request
      const res1 = await request(app)
        .post(`/api/transcriptions/booking/${readyBooking._id}`)
        .set('Authorization', `Bearer ${hostToken}`);
      expect(res1.status).toBe(202);

      // Duplicate request
      const res2 = await request(app)
        .post(`/api/transcriptions/booking/${readyBooking._id}`)
        .set('Authorization', `Bearer ${hostToken}`);
      expect(res2.status).toBe(200);
      expect(res2.body.message).toMatch(/already in progress/i);
      expect(res2.body.jobId).toBe(res1.body.jobId);
    });

    it('returns existing READY transcript on identical fingerprint request', async () => {
      const objectKey = `transcripts/booking/${readyBooking._id}/test_ready.json`;
      await storageService.saveTranscriptJson(objectKey, {
        language: 'en',
        durationSeconds: 150,
        segments: [{ start: 0, end: 5, text: 'Hello', speaker: 'Host' }],
      });

      const crypto = require('crypto');
      const sourceKey = readyBooking.recordingStorage.objectKey;
      const fp = crypto.createHash('sha256').update(`${readyBooking._id}_${sourceKey}_en`).digest('hex');

      readyBooking.transcription = {
        status: 'READY',
        jobId: 'tx_existing_ready',
        transcriptObjectKey: objectKey,
        segmentCount: 1,
        fingerprint: fp,
      };
      await readyBooking.save();

      const res = await request(app)
        .post(`/api/transcriptions/booking/${readyBooking._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ language: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.message).toMatch(/existing transcript ready/i);
    });
  });

  describe('4. Background Worker Processing & Stale Job Recovery', () => {
    it('atomically claims job and generates normalized transcript JSON', async () => {
      // Set QUEUED state directly for deterministic worker testing
      readyBooking.transcription = {
        status: 'QUEUED',
        jobId: 'tx_claim_41',
        sourceType: 'original',
        sourceObjectKey: readyBooking.recordingStorage.objectKey,
        language: 'en',
      };
      await readyBooking.save();

      // Run worker
      const processedBooking = await transcriptionWorker.processNextBookingTranscription();
      expect(processedBooking).toBeDefined();
      expect(processedBooking.transcription.status).toBe('READY');
      expect(processedBooking.transcription.segmentCount).toBeGreaterThan(0);
      expect(processedBooking.transcription.transcriptObjectKey).toBeDefined();

      // Retrieve transcript content
      const contentRes = await request(app)
        .get(`/api/transcriptions/booking/${readyBooking._id}/content`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(contentRes.status).toBe(200);
      expect(contentRes.body.transcript.segments.length).toBeGreaterThan(0);
      expect(contentRes.body.transcript.segments[0].text).toBeDefined();
    });

    it('recovers stale PROCESSING job after timeout', async () => {
      readyBooking.transcription = {
        status: 'PROCESSING',
        jobId: 'tx_stale_123',
        startedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago (stale)
        sourceType: 'original',
        sourceObjectKey: readyBooking.recordingStorage.objectKey,
        language: 'en',
      };
      await readyBooking.save();

      const recovered = await transcriptionWorker.processNextBookingTranscription();
      expect(recovered).toBeDefined();
      expect(recovered.transcription.status).toBe('READY');
    });

    it('handles worker failure gracefully and allows retry', async () => {
      readyBooking.transcription = {
        status: 'FAILED',
        jobId: 'tx_failed_999',
        failedAt: new Date(),
        error: 'Simulated transcription error',
      };
      await readyBooking.save();

      const retryRes = await request(app)
        .post(`/api/transcriptions/booking/${readyBooking._id}/retry`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(retryRes.status).toBe(202);
      expect(retryRes.body.status).toBe('QUEUED');

      const retriedBooking = await Booking.findById(readyBooking._id);
      expect(retriedBooking.transcription.status).toBe('QUEUED');
    });
  });

  describe('5. Access Control & State Isolation', () => {
    it('blocks unauthorized access to transcript content', async () => {
      const objectKey = `transcripts/booking/${readyBooking._id}/secret.json`;
      await storageService.saveTranscriptJson(objectKey, {
        language: 'en',
        segments: [{ start: 0, end: 5, text: 'Private talk' }],
      });

      readyBooking.transcription = {
        status: 'READY',
        transcriptObjectKey: objectKey,
      };
      await readyBooking.save();

      const res = await request(app)
        .get(`/api/transcriptions/booking/${readyBooking._id}/content`)
        .set('Authorization', `Bearer ${unauthorizedToken}`);

      expect(res.status).toBe(403);
    });

    it('ensures transcription does NOT mutate payment or booking status', async () => {
      const originalStatus = readyBooking.status;
      const originalPayment = readyBooking.paymentStatus;
      const originalAmount = readyBooking.amountCents;

      readyBooking.transcription = {
        status: 'QUEUED',
        jobId: 'tx_iso_52',
        sourceType: 'original',
        sourceObjectKey: readyBooking.recordingStorage.objectKey,
      };
      await readyBooking.save();

      await transcriptionWorker.processNextBookingTranscription();

      const updated = await Booking.findById(readyBooking._id);
      expect(updated.status).toBe(originalStatus);
      expect(updated.paymentStatus).toBe(originalPayment);
      expect(updated.amountCents).toBe(originalAmount);
    });

    it('publishes notifications and audit logs on successful transcription', async () => {
      readyBooking.transcription = {
        status: 'QUEUED',
        jobId: 'tx_audit_53',
        sourceType: 'original',
        sourceObjectKey: readyBooking.recordingStorage.objectKey,
      };
      await readyBooking.save();

      await transcriptionWorker.processNextBookingTranscription();

      const notifications = await Notification.find({ recipient: hostId, type: 'transcript_ready' });
      expect(notifications.length).toBeGreaterThanOrEqual(1);

      const logs = await AuditLog.find({ collectionName: 'bookings', action: 'transcribe' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('delivers public episode transcript for published episodes', async () => {
      const epObjectKey = `transcripts/episode/${testEpisode._id}/pub_ep.json`;
      await storageService.saveTranscriptJson(epObjectKey, {
        language: 'en',
        segments: [{ start: 0, end: 10, text: 'Public episode content' }],
      });

      testEpisode.transcription = {
        status: 'READY',
        transcriptObjectKey: epObjectKey,
      };
      await testEpisode.save();

      const res = await request(app).get(
        `/api/podcasts/${testPodcast.slug}/episodes/${testEpisode.slug}/transcript`
      );

      expect(res.status).toBe(200);
      expect(res.body.transcript.segments[0].text).toBe('Public episode content');
    });
  });
});
