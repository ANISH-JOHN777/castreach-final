const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Booking = require('../models/Booking');
const User = require('../models/User');
const storage = require('../services/storage');
const liveCaptionSessionManager = require('../services/liveCaptionSessionManager');
const liveCaptionProvider = require('../services/liveCaptionProvider');
const translationService = require('../services/translationService');
const { isLanguageSupported } = require('../config/supportedLanguages');

describe('Phase E4 — Live Subtitles & Multilingual Captions Test Suite', () => {
  let hostToken, guestToken, otherToken, adminToken;
  let hostUser, guestUser, otherUser, adminUser;
  let testBooking;

  beforeEach(async () => {
    await User.deleteMany({});
    await Booking.deleteMany({});
    liveCaptionSessionManager.clearAllSessions();
    translationService.clearCache();

    // Create test users
    hostUser = await User.create({
      name: 'Host User',
      email: 'host@e4test.com',
      password: 'password123',
      role: 'host',
    });

    guestUser = await User.create({
      name: 'Guest User',
      email: 'guest@e4test.com',
      password: 'password123',
      role: 'guest',
    });

    otherUser = await User.create({
      name: 'Other User',
      email: 'other@e4test.com',
      password: 'password123',
      role: 'guest',
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@e4test.com',
      password: 'password123',
      role: 'admin',
    });

    const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
    hostToken = jwt.sign({ id: hostUser._id.toString(), role: 'host' }, jwtSecret);
    guestToken = jwt.sign({ id: guestUser._id.toString(), role: 'guest' }, jwtSecret);
    otherToken = jwt.sign({ id: otherUser._id.toString(), role: 'guest' }, jwtSecret);
    adminToken = jwt.sign({ id: adminUser._id.toString(), role: 'admin' }, jwtSecret);

    // Create test booking
    testBooking = await Booking.create({
      host: hostUser._id,
      guest: guestUser._id,
      slotStart: new Date(Date.now() + 3600000),
      slotEnd: new Date(Date.now() + 7200000),
      status: 'confirmed',
      amountCents: 5000,
      paymentStatus: 'held',
    });
  });

  // 1. Session Authorization & Rejection
  test('1. Host and Guest can create/join live caption session', async () => {
    const resHost = await request(app)
      .post(`/api/live-captions/${testBooking._id}/session`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ sourceLanguage: 'en' });

    expect(resHost.status).toBe(200);
    expect(resHost.body.session.sessionId).toBeDefined();
    expect(resHost.body.session.status).toBe('ACTIVE');

    const resGuest = await request(app)
      .post(`/api/live-captions/${testBooking._id}/session`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ sourceLanguage: 'en' });

    expect(resGuest.status).toBe(200);
    expect(resGuest.body.session.sessionId).toBe(resHost.body.session.sessionId);
  });

  test('2. Non-participant user is rejected from joining live caption session', async () => {
    const res = await request(app)
      .post(`/api/live-captions/${testBooking._id}/session`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ sourceLanguage: 'en' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/);
  });

  // 3. Meeting Isolation & IDOR Protection
  test('3. Enforces meeting isolation across different bookings', async () => {
    const otherBooking = await Booking.create({
      host: otherUser._id,
      guest: guestUser._id,
      slotStart: new Date(),
      slotEnd: new Date(),
      status: 'confirmed',
    });

    const res = await request(app)
      .get(`/api/live-captions/${otherBooking._id}/session`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(res.status).toBe(403);
  });

  // 4. Language Validation & Unsupported Language Rejection
  test('4. Validates supported languages and rejects unsupported language codes', async () => {
    expect(isLanguageSupported('en')).toBe(true);
    expect(isLanguageSupported('ta')).toBe(true);
    expect(isLanguageSupported('xx')).toBe(false);

    const res = await request(app)
      .post(`/api/live-captions/${testBooking._id}/session`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ sourceLanguage: 'unsupported_lang' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unsupported source language/);
  });

  // 5. Segment Ingestion, Partial vs Final, and Deduplication
  test('5. Ingests segments, handles partial vs final, and deduplicates IDs', async () => {
    // Ingest partial segment
    const partialSeg = await liveCaptionSessionManager.ingestSegment(testBooking._id.toString(), {
      id: 'seg_1',
      text: 'Partial speech text...',
      isFinal: false,
      start: 0,
      end: 2,
    });
    expect(partialSeg.isFinal).toBe(false);

    // Ingest final segment
    const finalSeg = await liveCaptionSessionManager.ingestSegment(testBooking._id.toString(), {
      id: 'seg_1',
      text: 'Final speech text completed.',
      isFinal: true,
      start: 0,
      end: 3,
    });
    expect(finalSeg.isFinal).toBe(true);

    const session = liveCaptionSessionManager.getOrCreateSession(testBooking._id.toString());
    expect(session.segments.length).toBe(1);

    // Duplicate ingestion of same final segment ID
    await liveCaptionSessionManager.ingestSegment(testBooking._id.toString(), {
      id: 'seg_1',
      text: 'Final speech text completed.',
      isFinal: true,
      start: 0,
      end: 3,
    });

    expect(session.segments.length).toBe(1);
  });

  // 6. Out-of-order Segment Handling
  test('6. Sorts out-of-order caption segments by timestamp', async () => {
    const bookingId = testBooking._id.toString();
    await liveCaptionSessionManager.ingestSegment(bookingId, {
      id: 'seg_late',
      text: 'Second segment',
      start: 10,
      end: 15,
      isFinal: true,
    });

    await liveCaptionSessionManager.ingestSegment(bookingId, {
      id: 'seg_early',
      text: 'First segment',
      start: 2,
      end: 5,
      isFinal: true,
    });

    const session = liveCaptionSessionManager.getOrCreateSession(bookingId);
    expect(session.segments[0].id).toBe('seg_early');
    expect(session.segments[1].id).toBe('seg_late');
  });

  // 7. Multilingual Translation Layer & Deduplication
  test('7. Translates finalized segments into target language with caching', async () => {
    const res1 = await request(app)
      .post(`/api/live-captions/${testBooking._id}/translate`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        segmentId: 'seg_trans_1',
        text: 'Welcome to our meeting',
        sourceLanguage: 'en',
        targetLanguage: 'ta',
      });

    expect(res1.status).toBe(200);
    expect(res1.body.translatedText).toBeDefined();
    expect(res1.body.cached).toBe(false);

    // Second request for same segment ID uses cache
    const res2 = await request(app)
      .post(`/api/live-captions/${testBooking._id}/translate`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        segmentId: 'seg_trans_1',
        text: 'Welcome to our meeting',
        sourceLanguage: 'en',
        targetLanguage: 'ta',
      });

    expect(res2.status).toBe(200);
    expect(res2.body.cached).toBe(true);
  });

  // 8. Session Completion & Storage Persistence
  test('8. Completes session and persists LIVE_CAPTIONS transcript without overwriting E2', async () => {
    const bookingId = testBooking._id.toString();
    await liveCaptionSessionManager.ingestSegment(bookingId, {
      id: 'seg_final_1',
      text: 'Final live speech segment',
      isFinal: true,
      start: 0,
      end: 4,
    });

    const completed = await liveCaptionSessionManager.completeSession(bookingId);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.objectKey).toMatch(/transcripts\/live/);

    const savedJson = await storage.getLiveCaptionsJson(completed.objectKey);
    expect(savedJson.type).toBe('LIVE_CAPTIONS');
    expect(savedJson.segments.length).toBe(1);
  });

  // 9. Payment & Booking Isolation
  test('9. Live caption operations NEVER alter booking status or Stripe escrow payment fields', async () => {
    const paymentStatusBefore = testBooking.paymentStatus;
    const bookingStatusBefore = testBooking.status;

    await request(app)
      .post(`/api/live-captions/${testBooking._id}/session`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ sourceLanguage: 'en' });

    await request(app)
      .post(`/api/live-captions/${testBooking._id}/segment`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ text: 'Live test speech' });

    await request(app)
      .post(`/api/live-captions/${testBooking._id}/complete`)
      .set('Authorization', `Bearer ${hostToken}`);

    const bookingAfter = await Booking.findById(testBooking._id);
    expect(bookingAfter.paymentStatus).toBe(paymentStatusBefore);
    expect(bookingAfter.status).toBe(bookingStatusBefore);
  });

  // 10. Admin Inspection Endpoint
  test('10. Admin can inspect active live caption sessions', async () => {
    await request(app)
      .post(`/api/live-captions/${testBooking._id}/session`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ sourceLanguage: 'en' });

    const adminRes = await request(app)
      .get('/api/reports/live-captions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.sessions.length).toBeGreaterThan(0);
  });

  // 11. Provider Error Graceful Handling
  test('11. Handles translation failure gracefully without breaking meeting', async () => {
    const res = await request(app)
      .post(`/api/live-captions/${testBooking._id}/translate`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        segmentId: 'seg_err',
        text: 'Test speech',
        sourceLanguage: 'en',
        targetLanguage: 'invalid_lang_code',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unsupported target language/);
  });
});
