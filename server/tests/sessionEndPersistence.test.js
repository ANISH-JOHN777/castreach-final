require('./setup');
const request = require('supertest');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const app = require('../app');
const realtimeServer = require('../services/realtimeServer');
const User = require('../models/User');
const Booking = require('../models/Booking');

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_32_chars_minimum_len';

describe('Phase E7 Server-Authoritative Session End & Persistence Test Suite', () => {
  let server, wsUrl;
  let hostUser, guestUser, unauthorizedUser;
  let hostToken, guestToken, unauthorizedToken;
  let booking;

  beforeAll(async () => {
    server = http.createServer(app);
    realtimeServer.init(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    wsUrl = `ws://127.0.0.1:${port}/ws`;
  }, 30000);

  afterAll(async () => {
    realtimeServer.resetServer();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }, 30000);

  beforeEach(async () => {
    hostUser = await User.create({
      name: 'Host Participant',
      email: `host_${Date.now()}_${Math.random()}@example.com`,
      password: 'password123',
      role: 'host',
      tenantId: 'castreach',
    });

    guestUser = await User.create({
      name: 'Guest Participant',
      email: `guest_${Date.now()}_${Math.random()}@example.com`,
      password: 'password123',
      role: 'guest',
      tenantId: 'castreach',
    });

    unauthorizedUser = await User.create({
      name: 'Intruder User',
      email: `unauth_${Date.now()}_${Math.random()}@example.com`,
      password: 'password123',
      role: 'guest',
      tenantId: 'castreach',
    });

    hostToken = jwt.sign({ id: hostUser._id.toString(), role: hostUser.role, tenantId: hostUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });
    guestToken = jwt.sign({ id: guestUser._id.toString(), role: guestUser.role, tenantId: guestUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });
    unauthorizedToken = jwt.sign({ id: unauthorizedUser._id.toString(), role: unauthorizedUser.role, tenantId: unauthorizedUser.tenantId }, JWT_SECRET, { expiresIn: '1h' });

    booking = await Booking.create({
      host: hostUser._id,
      guest: guestUser._id,
      slotStart: new Date(Date.now() + 86400000),
      slotEnd: new Date(Date.now() + 90000000),
      status: 'confirmed',
      paymentStatus: 'held',
      amountCents: 5000,
      tenantId: 'castreach',
      recordingStatus: 'RECORDING',
    });
  }, 30000);

  test('1. Host end request is persisted in MongoDB & does NOT complete session alone', async () => {
    const res = await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionEnded).toBe(false);
    expect(res.body.hostEndRequested).toBe(true);
    expect(res.body.guestEndRequested).toBe(false);

    const b = await Booking.findById(booking._id);
    expect(b.hostEndRequested).toBe(true);
    expect(b.hostEndRequestedAt).toBeDefined();
    expect(b.guestEndRequested).toBe(false);
    expect(b.recordingStatus).toBe('RECORDING');
  });

  test('2. Page refresh / reconnect restores end request state via GET /api/recordings/:bookingId', async () => {
    await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send();

    const getRes = await request(app)
      .get(`/api/recordings/${booking._id}`)
      .set('Authorization', `Bearer ${guestToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.hostEndRequested).toBe(true);
    expect(getRes.body.guestEndRequested).toBe(false);
    expect(getRes.body.hostEndRequestedAt).toBeDefined();
  });

  test('3. Guest confirming end session transitions session to PROCESSING', async () => {
    await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send();

    const confirmRes = await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send();

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.sessionEnded).toBe(true);
    expect(confirmRes.body.recordingStatus).toBe('PROCESSING');

    const b = await Booking.findById(booking._id);
    expect(b.hostEndRequested).toBe(true);
    expect(b.guestEndRequested).toBe(true);
    expect(b.recordingStatus).toBe('PROCESSING');
  });

  test('4. Declining end session resets state in MongoDB', async () => {
    await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send();

    const declineRes = await request(app)
      .post(`/api/recordings/${booking._id}/session-end-decline`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send();

    expect(declineRes.status).toBe(200);
    expect(declineRes.body.hostEndRequested).toBe(false);
    expect(declineRes.body.guestEndRequested).toBe(false);

    const b = await Booking.findById(booking._id);
    expect(b.hostEndRequested).toBe(false);
    expect(b.guestEndRequested).toBe(false);
  });

  test('5. Unauthorized user is blocked from requesting session end', async () => {
    const res = await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${unauthorizedToken}`)
      .send();

    expect(res.status).toBe(403);
  });

  test('6. Payment invariant: Escrow held payment remains intact during session end request', async () => {
    await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${hostToken}`)
      .send();

    await request(app)
      .post(`/api/recordings/${booking._id}/session-end-request`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send();

    const b = await Booking.findById(booking._id);
    expect(b.paymentStatus).toBe('held');
  });
});
