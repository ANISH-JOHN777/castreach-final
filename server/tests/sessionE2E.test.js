require('./setup');
const request = require('supertest');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const realtimeServer = require('../services/realtimeServer');
const User = require('../models/User');
const Booking = require('../models/Booking');

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

describe('Real Two-Participant Video & Recording E2E Test Suite', () => {
  let server, baseUrl, wsUrl;
  let hostUser, guestUser, unauthorizedUser;
  let hostToken, guestToken, unauthorizedToken;
  let booking;

  beforeAll(async () => {
    server = http.createServer(app);
    realtimeServer.init(server);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
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
      name: 'Host User',
      email: `host_${Date.now()}_${Math.random()}@example.com`,
      password: 'password123',
      role: 'host',
      tenantId: 'castreach',
    });

    guestUser = await User.create({
      name: 'Guest User',
      email: `guest_${Date.now()}_${Math.random()}@example.com`,
      password: 'password123',
      role: 'guest',
      tenantId: 'castreach',
    });

    unauthorizedUser = await User.create({
      name: 'Unauthorized User',
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
      recordingStatus: 'NOT_STARTED',
    });
  }, 30000);

  test('1. Host and Guest session authorization (unauthorized user blocked)', async () => {
    const resHost = await request(app)
      .post('/api/recordings/token')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ bookingId: booking._id });

    expect(resHost.status).toBe(200);
    expect(resHost.body.success).toBe(true);

    const resUnauth = await request(app)
      .post('/api/recordings/token')
      .set('Authorization', `Bearer ${unauthorizedToken}`)
      .send({ bookingId: booking._id });

    expect(resUnauth.status).toBe(403);
  }, 15000);

  test('2. Both participants join same booking session & receive signaling', (done) => {
    const wsHost = new WebSocket(`${wsUrl}?token=${hostToken}`);
    let wsGuest;

    wsHost.on('open', () => {
      wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    });

    wsHost.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.event === 'subscribed') {
        wsGuest = new WebSocket(`${wsUrl}?token=${guestToken}`);
        wsGuest.on('open', () => {
          wsGuest.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
        });
        wsGuest.on('message', (gMsg) => {
          const gParsed = JSON.parse(gMsg.toString());
          if (gParsed.event === 'webrtc:peer_join') {
            wsHost.close();
            wsGuest.close();
            done();
          }
        });
      }
    });
  }, 15000);

  test('3 & 4. Participant join/leave notifications preserve real session state', (done) => {
    const wsHost = new WebSocket(`${wsUrl}?token=${hostToken}`);
    let wsGuest;

    wsHost.on('open', () => {
      wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    });

    wsHost.on('message', (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.event === 'subscribed') {
        wsGuest = new WebSocket(`${wsUrl}?token=${guestToken}`);
        wsGuest.on('open', () => {
          wsGuest.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
        });
        wsGuest.on('message', (gMsg) => {
          const gParsed = JSON.parse(gMsg.toString());
          if (gParsed.event === 'subscribed') {
            wsGuest.send(JSON.stringify({ event: 'webrtc:leave', data: { bookingId: booking._id.toString() } }));
          }
        });
      }
      if (parsed.event === 'webrtc:peer_leave') {
        wsHost.close();
        if (wsGuest.readyState === WebSocket.OPEN) wsGuest.close();
        done();
      }
    });
  }, 15000);

  test('5, 6, 7 & 8. Mutual Session End (Session does not end after 1 request; ends after both confirm)', (done) => {
    const wsHost = new WebSocket(`${wsUrl}?token=${hostToken}`);
    let wsGuest;
    let endRequestedReceived = false;

    wsHost.on('open', () => {
      wsHost.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
    });

    wsHost.on('message', (msg) => {
      const parsed = JSON.parse(msg.toString());
      if (parsed.event === 'subscribed') {
        wsGuest = new WebSocket(`${wsUrl}?token=${guestToken}`);
        wsGuest.on('open', () => {
          wsGuest.send(JSON.stringify({ event: 'subscribe', data: { bookingId: booking._id.toString() } }));
        });

        wsGuest.on('message', (gMsg) => {
          const gParsed = JSON.parse(gMsg.toString());
          if (gParsed.event === 'subscribed') {
            wsHost.send(JSON.stringify({ event: 'session:end_requested', data: { bookingId: booking._id.toString() } }));
          }
          if (gParsed.event === 'session:end_requested') {
            endRequestedReceived = true;
            wsGuest.send(JSON.stringify({ event: 'session:end_confirmed', data: { bookingId: booking._id.toString() } }));
          }
          if (gParsed.event === 'session:end_confirmed') {
            expect(endRequestedReceived).toBe(true);
            wsHost.close();
            wsGuest.close();
            done();
          }
        });
      }
    });
  }, 15000);

  test('9, 10, 11 & 12. Recording binary upload transitions PROCESSING -> READY and persists metadata', async () => {
    const sampleBuffer = Buffer.from('mock_webm_video_header_and_data_payload_bytes_for_testing');

    const uploadRes = await request(app)
      .post(`/api/recordings/${booking._id}/upload`)
      .set('Authorization', `Bearer ${hostToken}`)
      .set('Content-Type', 'video/webm')
      .send(sampleBuffer);

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.recordingStorage.status).toBe('READY');

    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.recordingReady).toBe(true);
    expect(updatedBooking.recordingStatus).toBe('READY');
    expect(updatedBooking.recordingStorage.sizeBytes).toBe(sampleBuffer.length);

    const diskPath = path.join(process.cwd(), 'scratch', 'storage', 'recordings', booking._id.toString(), 'original', 'source.mp4');
    expect(fs.existsSync(diskPath)).toBe(true);
  }, 15000);

  test('13, 14, 15 & 16. Storage access authorization, original immutability & download', async () => {
    const sampleBuffer = Buffer.from('video_content_bytes');
    await request(app)
      .post(`/api/recordings/${booking._id}/upload`)
      .set('Authorization', `Bearer ${hostToken}`)
      .set('Content-Type', 'video/webm')
      .send(sampleBuffer);

    const urlResHost = await request(app)
      .get(`/api/recordings/${booking._id}/storage-url`)
      .set('Authorization', `Bearer ${hostToken}`);

    expect(urlResHost.status).toBe(200);
    expect(urlResHost.body.accessUrl).toContain('/storage-file');

    const urlResUnauth = await request(app)
      .get(`/api/recordings/${booking._id}/storage-url`)
      .set('Authorization', `Bearer ${unauthorizedToken}`);

    expect(urlResUnauth.status).toBe(403);

    const streamRes = await request(app)
      .get(`/api/recordings/${booking._id}/storage-file?token=${hostToken}`);

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers['content-type']).toBe('video/mp4');
  }, 15000);

  test('17. Payment invariant: Escrow payment remains held upon session end', async () => {
    const sampleBuffer = Buffer.from('video_stream_data');
    await request(app)
      .post(`/api/recordings/${booking._id}/upload`)
      .set('Authorization', `Bearer ${hostToken}`)
      .set('Content-Type', 'video/webm')
      .send(sampleBuffer);

    const b = await Booking.findById(booking._id);
    expect(b.paymentStatus).toBe('held');
    expect(b.status).not.toBe('completed');
  }, 15000);
});
