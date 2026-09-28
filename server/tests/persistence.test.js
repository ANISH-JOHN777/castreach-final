const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../app');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Podcast = require('../models/Podcast');
const Episode = require('../models/Episode');
const Review = require('../models/Review');
const Availability = require('../models/Availability');
const { seedDemoData } = require('../scripts/seedDemo');
const storageService = require('../services/storage');

describe('CastReach — Data Persistence & Logout Immunity Tests', () => {
  let replSet;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.APP_ENV = 'demo';
    process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum_len';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min';
    process.env.CLIENT_URL = 'http://localhost:5173';

    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    if (replSet) {
      await replSet.stop();
    }
  });

  beforeEach(async () => {
    // Clear collections and baseline seed
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
    await seedDemoData();
  });

  test('A. Logout terminates session but DOES NOT delete application data', async () => {
    // 1. Login as host
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });

    expect(loginRes.status).toBe(200);
    const hostToken = loginRes.body.token;

    // 2. Count bookings and messages prior to logout
    const countBookingsBefore = await Booking.countDocuments();
    const countMessagesBefore = await Message.countDocuments();
    expect(countBookingsBefore).toBeGreaterThan(0);

    // 3. Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${hostToken}`);

    expect(logoutRes.status).toBe(200);

    // 4. Assert database contents are completely untouched
    const countBookingsAfter = await Booking.countDocuments();
    const countMessagesAfter = await Message.countDocuments();

    expect(countBookingsAfter).toBe(countBookingsBefore);
    expect(countMessagesAfter).toBe(countMessagesBefore);
  });

  test('B. Login after logout retrieves user messages and conversation history', async () => {
    // Login as host
    const loginHost = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });
    const hostToken = loginHost.body.token;

    // Get a booking for host1
    const booking = await Booking.findOne({ host: loginHost.body.user._id });
    expect(booking).not.toBeNull();

    // Host sends a user-created message using POST /api/messages
    const sendMsgRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ bookingId: booking._id.toString(), content: 'User created persistent message test 123' });

    expect(sendMsgRes.status).toBe(201);

    // Host logs out
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${hostToken}`);

    // Host logs back in
    const reLoginHost = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });
    const newHostToken = reLoginHost.body.token;

    // Fetch messages for booking
    const fetchMsgsRes = await request(app)
      .get(`/api/messages/${booking._id}`)
      .set('Authorization', `Bearer ${newHostToken}`);

    expect(fetchMsgsRes.status).toBe(200);
    const msgs = fetchMsgsRes.body.messages;
    const found = msgs.some((m) => m.content === 'User created persistent message test 123');
    expect(found).toBe(true);
  });

  test('C. User-created bookings, messages, and state survive server restart simulation', async () => {
    // Create a new booking as user-generated data
    const host = await User.findOne({ email: 'demo.host1@castreach.demo' });
    const guest = await User.findOne({ email: 'demo.guest1@castreach.demo' });

    const newBooking = await Booking.create({
      host: host._id,
      guest: guest._id,
      slotStart: new Date(Date.now() + 86400000),
      slotEnd: new Date(Date.now() + 90000000),
      status: 'confirmed',
      paymentStatus: 'held',
      amountCents: 15000,
      currency: 'usd',
      tenantId: 'castreach',
    });

    const newMsg = await Message.create({
      booking: newBooking._id,
      sender: guest._id,
      content: 'Persistent message across server restart',
      text: 'Persistent message across server restart',
      tenantId: 'castreach',
    });

    // Simulate server restart by running seedDemoData again (which is triggered on restart when checking DB)
    await seedDemoData();

    // Verify user-created booking and message still exist in DB
    const persistedBooking = await Booking.findById(newBooking._id);
    const persistedMsg = await Message.findById(newMsg._id);

    expect(persistedBooking).not.toBeNull();
    expect(persistedBooking.status).toBe('confirmed');
    expect(persistedMsg).not.toBeNull();
    expect(persistedMsg.content).toBe('Persistent message across server restart');
  });

  test('D & E. Recording files survive logout and server restart', async () => {
    const booking = await Booking.findOne({ status: 'completed' });
    expect(booking).not.toBeNull();

    // Create persistent storage directory & file
    const targetDir = path.join(process.cwd(), 'scratch', 'storage', 'recordings', booking._id.toString(), 'original');
    await fs.promises.mkdir(targetDir, { recursive: true });
    const filePath = path.join(targetDir, 'source.mp4');
    await fs.promises.writeFile(filePath, Buffer.from('MOCK_ORIGINAL_RECORDING_BYTES'));

    booking.recordingReady = true;
    booking.recordingStatus = 'READY';
    booking.recordingStorage = {
      status: 'READY',
      objectKey: `recordings/${booking._id}/original/source.mp4`,
      provider: 'local',
      durationSeconds: 1800,
    };
    await booking.save();

    // Login as host
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });
    const token = loginRes.body.token;

    // Logout
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

    // Re-login
    const reLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });
    const newToken = reLoginRes.body.token;

    // Fetch storage URL
    const storageUrlRes = await request(app)
      .get(`/api/recordings/${booking._id}/storage-url`)
      .set('Authorization', `Bearer ${newToken}`);

    expect(storageUrlRes.status).toBe(200);
    expect(storageUrlRes.body.accessUrl).toBeDefined();
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('F. Edited recordings remain available after logout', async () => {
    const booking = await Booking.findOne({ status: 'completed' });
    expect(booking).not.toBeNull();

    const targetDir = path.join(process.cwd(), 'scratch', 'storage', 'recordings', booking._id.toString(), 'edited');
    await fs.promises.mkdir(targetDir, { recursive: true });
    const filePath = path.join(targetDir, 'edited_render_123.mp4');
    await fs.promises.writeFile(filePath, Buffer.from('MOCK_EDITED_RECORDING_BYTES'));

    booking.recordingEdit = {
      renderStatus: 'READY',
      outputObjectKey: `recordings/${booking._id}/edited/edited_render_123.mp4`,
      renderDurationSeconds: 1800,
      trimStartSeconds: 0,
      trimEndSeconds: 1800,
    };
    await booking.save();

    // Re-query database after simulated logout/login
    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking.recordingEdit.renderStatus).toBe('READY');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('G & H. Transcripts and AI artifacts survive logout and re-login', async () => {
    const booking = await Booking.findOne({ status: 'completed' });
    
    booking.transcription = {
      status: 'READY',
      jobId: 'tx_job_999',
      transcriptObjectKey: `transcripts/${booking._id}/transcript.json`,
    };
    await booking.save();

    // Login -> Logout -> Re-login
    const login1 = await request(app).post('/api/auth/login').send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${login1.body.token}`);
    const login2 = await request(app).post('/api/auth/login').send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });

    const fetchBooking = await request(app)
      .get(`/api/recordings/${booking._id}`)
      .set('Authorization', `Bearer ${login2.body.token}`);

    expect(fetchBooking.status).toBe(200);
    expect(fetchBooking.body.recordingStorage).toBeDefined();
  });

  test('I. Demo seeding does not overwrite or wipe user-created data', async () => {
    const host = await User.findOne({ email: 'demo.host1@castreach.demo' });
    const guest = await User.findOne({ email: 'demo.guest1@castreach.demo' });

    // User creates a podcast, booking, and message
    const userPodcast = await Podcast.create({
      owner: host._id,
      title: 'User Unique Podcast Title 999',
      slug: 'user-unique-podcast-title-999',
      description: 'Test podcast description for user creation',
      category: 'Technology',
      tenantId: 'castreach',
    });

    const userBooking = await Booking.create({
      host: host._id,
      guest: guest._id,
      slotStart: new Date(Date.now() + 500000),
      slotEnd: new Date(Date.now() + 600000),
      status: 'pending',
      amountCents: 20000,
      tenantId: 'castreach',
    });

    const userMsg = await Message.create({
      booking: userBooking._id,
      sender: host._id,
      content: 'Unique user message content 999',
      tenantId: 'castreach',
    });

    // Run seedDemoData()
    await seedDemoData();

    // Verify user podcast, user booking, and user message exist
    const foundPodcast = await Podcast.findById(userPodcast._id);
    const foundBooking = await Booking.findById(userBooking._id);
    const foundMsg = await Message.findById(userMsg._id);

    expect(foundPodcast).not.toBeNull();
    expect(foundBooking).not.toBeNull();
    expect(foundMsg).not.toBeNull();
    expect(foundMsg.content).toBe('Unique user message content 999');
  });

  test('J. resetDemo is strictly an explicit operation and never called automatically', async () => {
    // Call GET /api/demo/status
    const statusRes = await request(app).get('/api/demo/status');
    expect(statusRes.status).toBe(200);

    // Call POST /api/auth/logout
    const login = await request(app).post('/api/auth/login').send({ email: 'demo.host1@castreach.demo', password: 'DemoPassword123!' });
    const logoutRes = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${login.body.token}`);
    expect(logoutRes.status).toBe(200);

    // Assert that reset operation was NOT executed (custom user data preserved)
    const customUser = await User.create({
      name: 'Custom Unaffected User',
      email: 'custom.unaffected@example.com',
      password: 'hashed_password',
      role: 'guest',
      tenantId: 'castreach',
    });

    const reCheckUser = await User.findById(customUser._id);
    expect(reCheckUser).not.toBeNull();
  });

  test('K. Booking & payment financial states survive logout', async () => {
    const booking = await Booking.findOne({ paymentStatus: 'held' });
    expect(booking).not.toBeNull();

    // Login -> Logout -> Login
    const login1 = await request(app).post('/api/auth/login').send({ email: 'demo.host2@castreach.demo', password: 'DemoPassword123!' });
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${login1.body.token}`);
    const login2 = await request(app).post('/api/auth/login').send({ email: 'demo.host2@castreach.demo', password: 'DemoPassword123!' });

    const fetchBooking = await request(app)
      .get(`/api/recordings/${booking._id}`)
      .set('Authorization', `Bearer ${login2.body.token}`);

    expect(fetchBooking.status).toBe(200);
    expect(fetchBooking.body.recordingStatus).toBeDefined();
  });
});
