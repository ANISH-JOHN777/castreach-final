const request = require('supertest');
const { app, makeUser, makeHost, auth } = require('./helpers');
const Booking = require('../models/Booking');
const ProcessedWebhookEvent = require('../models/ProcessedWebhookEvent');
const stripeService = require('../services/stripe');
const dailyService = require('../services/daily');
const notificationService = require('../services/notifications');

describe('Phase C2 — Automatic Recording & Recording Lifecycle Tests', () => {

  test('1. Automatic recording configuration (start_cloud_recording) is sent when Daily room is created', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      if (url.includes('/rooms')) {
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({
            url: `https://castreach.daily.co/${body.name}`,
            properties: body.properties,
          }),
        };
      }
      return { ok: false, status: 400 };
    });

    const result = await dailyService.createDailyRoom('test_booking_123', new Date().toISOString());

    expect(result.roomUrl).toBe('https://castreach.daily.co/castreach-test_booking_123');
    expect(fetchSpy).toHaveBeenCalled();
    const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(callBody.properties.enable_recording).toBe('cloud');
    expect(callBody.properties.start_cloud_recording).toBe(true);

    fetchSpy.mockRestore();
  });

  test('2. recording.started event updates recording status to RECORDING', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-start',
    });

    const payload = {
      type: 'recording.started',
      id: 'event_c2_start_1',
      payload: {
        room_name: 'castreach-testroom-c2-start',
        timestamp: Math.floor(Date.now() / 1000),
      },
    };

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const updated = await Booking.findById(booking._id);
    expect(updated.recordingStatus).toBe('RECORDING');
    expect(updated.recordingStartedAt).toBeDefined();
  });

  test('3. recording.started event does NOT release payment (paymentStatus remains held)', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-payment1',
    });

    const spyRelease = jest.spyOn(stripeService, 'releaseEscrow');

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.started',
        id: 'event_c2_start_pay',
        payload: { room_name: 'castreach-testroom-c2-payment1' },
      });

    expect(res.status).toBe(200);

    const updated = await Booking.findById(booking._id);
    expect(updated.paymentStatus).toBe('held');
    expect(updated.status).toBe('confirmed');
    expect(spyRelease).not.toHaveBeenCalled();

    spyRelease.mockRestore();
  });

  test('4. recording.stopped event moves status to PROCESSING', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      recordingStatus: 'RECORDING',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-stop',
    });

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.stopped',
        id: 'event_c2_stop_1',
        payload: { room_name: 'castreach-testroom-c2-stop' },
      });

    expect(res.status).toBe(200);

    const updated = await Booking.findById(booking._id);
    expect(updated.recordingStatus).toBe('PROCESSING');
    expect(updated.recordingStoppedAt).toBeDefined();
  });

  test('5. recording.ready-to-download / completed sets recordingReady true and recordingStatus READY', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      recordingStatus: 'PROCESSING',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-ready',
    });

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.ready-to-download',
        id: 'event_c2_ready_1',
        payload: {
          room_name: 'castreach-testroom-c2-ready',
          download_link: 'https://s3.daily.co/recordings/test-rec-123.mp4',
          duration: 1840,
        },
      });

    expect(res.status).toBe(200);

    const updated = await Booking.findById(booking._id);
    expect(updated.recordingReady).toBe(true);
    expect(updated.recordingStatus).toBe('READY');
    expect(updated.recordingUrl).toBe('https://s3.daily.co/recordings/test-rec-123.mp4');
    expect(updated.recordingDuration).toBe(1840);
    expect(updated.recordingReadyAt).toBeDefined();
  });

  test('6. recording.completed event saves recordingUrl and does NOT release payment', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-completed',
    });

    const spyRelease = jest.spyOn(stripeService, 'releaseEscrow');

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.completed',
        id: 'event_c2_completed_1',
        payload: {
          room_name: 'castreach-testroom-c2-completed',
          download_link: 'https://s3.daily.co/recordings/completed-rec.mp4',
        },
      });

    expect(res.status).toBe(200);

    const updated = await Booking.findById(booking._id);
    expect(updated.recordingReady).toBe(true);
    expect(updated.recordingStatus).toBe('READY');
    expect(updated.recordingUrl).toBe('https://s3.daily.co/recordings/completed-rec.mp4');
    expect(updated.paymentStatus).toBe('held');
    expect(updated.status).toBe('confirmed');
    expect(spyRelease).not.toHaveBeenCalled();

    spyRelease.mockRestore();
  });

  test('7. recording.error / failure event moves state to FAILED', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-fail',
    });

    const res = await request(app)
      .post('/api/webhooks/daily')
      .send({
        type: 'recording.error',
        id: 'event_c2_fail_1',
        payload: { room_name: 'castreach-testroom-c2-fail' },
      });

    expect(res.status).toBe(200);

    const updated = await Booking.findById(booking._id);
    expect(updated.recordingStatus).toBe('FAILED');
    expect(updated.recordingReady).toBe(false);
  });

  test('8. Duplicate recording.completed webhook is idempotent via ProcessedWebhookEvent', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-idem',
    });

    const webhookData = {
      type: 'recording.completed',
      id: 'event_c2_idempotent_unique_1',
      payload: {
        room_name: 'castreach-testroom-c2-idem',
        download_link: 'https://s3.daily.co/recordings/idem.mp4',
      },
    };

    const res1 = await request(app).post('/api/webhooks/daily').send(webhookData);
    expect(res1.status).toBe(200);
    expect(res1.body.duplicate).toBeUndefined();

    const res2 = await request(app).post('/api/webhooks/daily').send(webhookData);
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);
  });

  test('9. Invalid Daily webhook HMAC signature is rejected', async () => {
    const originalSecret = process.env.DAILY_WEBHOOK_SECRET;
    process.env.DAILY_WEBHOOK_SECRET = 'test_secret_key';

    try {
      const payload = JSON.stringify({ type: 'recording.started', payload: { room_name: 'castreach-invalid-sig' } });

      const res = await request(app)
        .post('/api/webhooks/daily')
        .set('Content-Type', 'application/json')
        .set('x-webhook-signature', 'invalid_signature_hex')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/signature/i);
    } finally {
      if (originalSecret) {
        process.env.DAILY_WEBHOOK_SECRET = originalSecret;
      } else {
        delete process.env.DAILY_WEBHOOK_SECRET;
      }
    }
  });

  test('10. Unrelated user cannot access GET /api/recordings/:bookingId (403)', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const intruder = await makeUser({ role: 'guest' });

    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
    });

    const res = await request(app)
      .get(`/api/recordings/${booking._id}`)
      .use(auth(intruder.token));

    expect(res.status).toBe(403);
  });

  test('11. Unauthenticated user cannot access GET /api/recordings/:bookingId (401)', async () => {
    const res = await request(app).get('/api/recordings/507f1f77bcf86cd799439011');
    expect(res.status).toBe(401);
  });

  test('12. Host and Guest can access GET /api/recordings/:bookingId status', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });

    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      recordingStatus: 'READY',
      recordingReady: true,
      recordingUrl: 'https://s3.daily.co/rec-test.mp4',
    });

    const hostRes = await request(app)
      .get(`/api/recordings/${booking._id}`)
      .use(auth(host.token));

    expect(hostRes.status).toBe(200);
    expect(hostRes.body.recordingStatus).toBe('READY');
    expect(hostRes.body.recordingReady).toBe(true);
    expect(hostRes.body.recordingUrl).toBe('https://s3.daily.co/rec-test.mp4');

    const guestRes = await request(app)
      .get(`/api/recordings/${booking._id}`)
      .use(auth(guest.token));

    expect(guestRes.status).toBe(200);
    expect(guestRes.body.recordingStatus).toBe('READY');
  });

  test('13. PaymentStatus remains held throughout complete recording lifecycle', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });

    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      paymentStatus: 'held',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-lifecycle',
    });

    const spyRelease = jest.spyOn(stripeService, 'releaseEscrow');

    // 1. Started
    await request(app).post('/api/webhooks/daily').send({
      type: 'recording.started',
      id: 'event_lifecycle_1',
      payload: { room_name: 'castreach-testroom-c2-lifecycle' },
    });
    let b = await Booking.findById(booking._id);
    expect(b.paymentStatus).toBe('held');
    expect(b.recordingStatus).toBe('RECORDING');

    // 2. Stopped
    await request(app).post('/api/webhooks/daily').send({
      type: 'recording.stopped',
      id: 'event_lifecycle_2',
      payload: { room_name: 'castreach-testroom-c2-lifecycle' },
    });
    b = await Booking.findById(booking._id);
    expect(b.paymentStatus).toBe('held');
    expect(b.recordingStatus).toBe('PROCESSING');

    // 3. Ready
    await request(app).post('/api/webhooks/daily').send({
      type: 'recording.completed',
      id: 'event_lifecycle_3',
      payload: {
        room_name: 'castreach-testroom-c2-lifecycle',
        download_link: 'https://s3.daily.co/rec-full.mp4',
      },
    });
    b = await Booking.findById(booking._id);
    expect(b.paymentStatus).toBe('held');
    expect(b.recordingStatus).toBe('READY');
    expect(b.recordingReady).toBe(true);

    expect(spyRelease).not.toHaveBeenCalled();
    spyRelease.mockRestore();
  });

  test('14. Duplicate recording.started webhook is idempotent', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-start-idem',
    });

    const payload = {
      type: 'recording.started',
      id: 'event_start_idem_1',
      payload: { room_name: 'castreach-testroom-c2-start-idem' },
    };

    const res1 = await request(app).post('/api/webhooks/daily').send(payload);
    expect(res1.status).toBe(200);

    const res2 = await request(app).post('/api/webhooks/daily').send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);
  });

  test('15. Recording ready notification is generated for host & guest', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-notify',
    });

    const spyNotify = jest.spyOn(notificationService, 'notify');

    await request(app).post('/api/webhooks/daily').send({
      type: 'recording.ready-to-download',
      id: 'event_notify_1',
      payload: {
        room_name: 'castreach-testroom-c2-notify',
        download_link: 'https://s3.daily.co/rec-notify.mp4',
      },
    });

    expect(spyNotify).toHaveBeenCalledTimes(2);
    expect(spyNotify).toHaveBeenCalledWith(host.user._id.toString(), expect.objectContaining({ title: 'Recording ready' }));
    expect(spyNotify).toHaveBeenCalledWith(guest.user._id.toString(), expect.objectContaining({ title: 'Recording ready' }));

    spyNotify.mockRestore();
  });

  test('16. Duplicate recording.completed webhook does not duplicate notification', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-notify-dup',
    });

    const spyNotify = jest.spyOn(notificationService, 'notify');

    const payload = {
      type: 'recording.completed',
      id: 'event_notify_dup_1',
      payload: {
        room_name: 'castreach-testroom-c2-notify-dup',
        download_link: 'https://s3.daily.co/rec-notify-dup.mp4',
      },
    };

    await request(app).post('/api/webhooks/daily').send(payload);
    expect(spyNotify).toHaveBeenCalledTimes(2);

    spyNotify.mockClear();

    await request(app).post('/api/webhooks/daily').send(payload);
    expect(spyNotify).not.toHaveBeenCalled();

    spyNotify.mockRestore();
  });

  test('17. Missing recording URL in completed payload moves status to PROCESSING', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-nourl',
    });

    const res = await request(app).post('/api/webhooks/daily').send({
      type: 'recording.completed',
      id: 'event_nourl_1',
      payload: {
        room_name: 'castreach-testroom-c2-nourl',
        // download_link missing
      },
    });

    expect(res.status).toBe(200);

    const b = await Booking.findById(booking._id);
    expect(b.recordingReady).toBe(false);
    expect(b.recordingStatus).toBe('PROCESSING');
  });

  test('18. Database failure returns 500 and does not mark event processed', async () => {
    const host = await makeHost();
    const guest = await makeUser({ role: 'guest' });
    const booking = await Booking.create({
      host: host.user._id,
      guest: guest.user._id,
      slotStart: new Date(),
      slotEnd: new Date(Date.now() + 3600000),
      status: 'confirmed',
      dailyRoomUrl: 'https://castreach.daily.co/castreach-testroom-c2-dbfail',
    });

    const spySave = jest.spyOn(Booking.prototype, 'save').mockRejectedValueOnce(new Error('DB Connection Timeout'));

    const res = await request(app).post('/api/webhooks/daily').send({
      type: 'recording.completed',
      id: 'event_dbfail_1',
      payload: {
        room_name: 'castreach-testroom-c2-dbfail',
        download_link: 'https://s3.daily.co/rec-dbfail.mp4',
      },
    });

    expect(res.status).toBe(500);

    // Event should not be stored in ProcessedWebhookEvent so Daily can retry
    const processed = await ProcessedWebhookEvent.findOne({ eventId: 'event_dbfail_1' });
    expect(processed).toBeNull();

    spySave.mockRestore();
  });

});
