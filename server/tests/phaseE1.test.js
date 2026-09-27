const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Podcast = require('../models/Podcast');
const Episode = require('../models/Episode');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

describe('Phase E1 — Podcast Creation & Publishing Suite', () => {
  let hostToken, hostUser, hostId;
  let guestToken, guestUser, guestId;
  let adminToken, adminUser;
  let unauthorizedToken, unauthorizedUser, unauthId;
  let completedBooking;

  beforeEach(async () => {
    // Register test users
    const hostRes = await request(app).post('/api/auth/register').send({
      name: 'Podcast Host',
      email: `podhost_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'Password123!',
      role: 'host',
    });
    hostToken = hostRes.body.token;
    hostUser = hostRes.body.user;

    const guestRes = await request(app).post('/api/auth/register').send({
      name: 'Podcast Guest',
      email: `podguest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'Password123!',
      role: 'guest',
    });
    guestToken = guestRes.body.token;
    guestUser = guestRes.body.user;

    const unauthRes = await request(app).post('/api/auth/register').send({
      name: 'Other User',
      email: `other_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
      password: 'Password123!',
      role: 'host',
    });
    unauthorizedToken = unauthRes.body.token;
    unauthorizedUser = unauthRes.body.user;

    // Create admin user directly in database
    adminUser = await User.create({
      name: 'Admin User',
      email: `admin_e1_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@example.com`,
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

    hostId = hostUser._id || hostUser.id;
    guestId = guestUser._id || guestUser.id;
    unauthId = unauthorizedUser._id || unauthorizedUser.id;

    // Create a completed booking with ready recording
    completedBooking = await Booking.create({
      host: hostId,
      guest: guestId,
      slotStart: now,
      slotEnd: end,
      status: 'completed',
      amountCents: 5000,
      paymentStatus: 'released',
      recordingStatus: 'READY',
      recordingStorage: {
        status: 'READY',
        provider: 'local',
        objectKey: 'recordings/mock_e1_booking/original/source.mp4',
        durationSeconds: 120,
      },
      recordingEdit: {
        renderStatus: 'READY',
        outputObjectKey: 'recordings/mock_e1_booking/edited/render123.mp4',
        renderDurationSeconds: 110,
      },
    });
  });

  describe('1. Podcast Creation & Validation', () => {
    it('creates a new podcast in DRAFT status with server-derived owner', async () => {
      const res = await request(app)
        .post('/api/podcasts')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'The Tech Frontier',
          description: 'Exploring modern technology and engineering.',
          category: 'Technology',
          tags: ['tech', 'software', 'ai'],
          owner: unauthId, // Client attempt to override owner should be ignored
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.podcast.title).toBe('The Tech Frontier');
      expect(res.body.podcast.slug).toBe('the-tech-frontier');
      expect(res.body.podcast.owner.toString()).toBe(hostId.toString());
      expect(res.body.podcast.status).toBe('DRAFT');
    });

    it('rejects podcast creation without required fields', async () => {
      const res = await request(app)
        .post('/api/podcasts')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/i);
    });

    it('handles slug collision by appending incrementing counter', async () => {
      // Create first podcast
      await request(app)
        .post('/api/podcasts')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'The Tech Frontier',
          description: 'First show.',
        });

      // Create duplicate title podcast
      const res = await request(app)
        .post('/api/podcasts')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'The Tech Frontier',
          description: 'Duplicate title show.',
        });

      expect(res.status).toBe(201);
      expect(res.body.podcast.slug).toBe('the-tech-frontier-1');
    });
  });

  describe('2. Podcast Ownership & Modification', () => {
    let testPodcast;

    beforeEach(async () => {
      testPodcast = await Podcast.create({
        owner: hostId,
        title: 'Original Show Title',
        slug: `show-${Date.now()}`,
        description: 'Original description',
        status: 'DRAFT',
      });
    });

    it('allows owner to update podcast metadata', async () => {
      const res = await request(app)
        .put(`/api/podcasts/${testPodcast._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Updated Show Title',
          description: 'Updated show description text.',
        });

      expect(res.status).toBe(200);
      expect(res.body.podcast.title).toBe('Updated Show Title');
      expect(res.body.podcast.description).toBe('Updated show description text.');
    });

    it('blocks unauthorized users from updating podcast (IDOR protection)', async () => {
      const res = await request(app)
        .put(`/api/podcasts/${testPodcast._id}`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({ title: 'Hacked Show Title' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/unauthorized/i);
    });

    it('allows admin to update or unpublish podcasts', async () => {
      const res = await request(app)
        .put(`/api/podcasts/${testPodcast._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Admin updated description' });

      expect(res.status).toBe(200);
      expect(res.body.podcast.description).toBe('Admin updated description');
    });

    it('archives podcast and associated episodes on deletion', async () => {
      const episode = await Episode.create({
        podcast: testPodcast._id,
        owner: hostId,
        title: 'Show Episode',
        slug: 'show-episode',
        status: 'DRAFT',
      });

      const res = await request(app)
        .delete(`/api/podcasts/${testPodcast._id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);

      const updatedPod = await Podcast.findById(testPodcast._id);
      expect(updatedPod.status).toBe('ARCHIVED');

      const updatedEp = await Episode.findById(episode._id);
      expect(updatedEp.status).toBe('ARCHIVED');
    });
  });

  describe('3. Episode Creation & Recording Attachment', () => {
    let podcast;

    beforeEach(async () => {
      podcast = await Podcast.create({
        owner: hostId,
        title: 'CastReach Insider',
        slug: `castreach-insider-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: 'Inside CastReach.',
        status: 'PUBLISHED',
      });
    });

    it('creates episode draft attached to an authorized booking recording', async () => {
      const res = await request(app)
        .post(`/api/podcasts/${podcast._id}/episodes`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Episode 1: Building Escrow',
          description: 'Deep dive into CastReach escrow payments.',
          bookingId: completedBooking._id.toString(),
          sourceType: 'edited',
        });

      expect(res.status).toBe(201);
      expect(res.body.episode.title).toBe('Episode 1: Building Escrow');
      expect(res.body.episode.mediaObjectKey).toBe(completedBooking.recordingEdit.outputObjectKey);
      expect(res.body.episode.duration).toBe(110);
      expect(res.body.episode.status).toBe('DRAFT');
    });

    it('rejects attaching an unauthorized recording (IDOR protection)', async () => {
      const now = new Date();
      const secretBooking = await Booking.create({
        host: unauthId,
        guest: guestId,
        slotStart: now,
        slotEnd: new Date(now.getTime() + 3600000),
        status: 'completed',
        amountCents: 10000,
        recordingStatus: 'READY',
        recordingStorage: {
          status: 'READY',
          objectKey: 'recordings/secret_booking/source.mp4',
        },
      });

      const res = await request(app)
        .post(`/api/podcasts/${podcast._id}/episodes`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Stolen Recording Episode',
          bookingId: secretBooking._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not authorized to use this booking recording/i);
    });

    it('prevents non-owner from creating episodes for a podcast', async () => {
      const res = await request(app)
        .post(`/api/podcasts/${podcast._id}/episodes`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({ title: 'Unwanted Episode' });

      expect(res.status).toBe(403);
    });
  });

  describe('4. Draft Visibility & Public Access', () => {
    let podcast, draftEpisode, publishedEpisode;

    beforeEach(async () => {
      podcast = await Podcast.create({
        owner: hostId,
        title: 'Public Show',
        slug: `public-show-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: 'A show with public & draft episodes.',
        status: 'PUBLISHED',
      });

      draftEpisode = await Episode.create({
        podcast: podcast._id,
        owner: hostId,
        title: 'Top Secret Draft',
        slug: 'top-secret-draft',
        mediaObjectKey: 'recordings/draft.mp4',
        duration: 300,
        status: 'DRAFT',
      });

      publishedEpisode = await Episode.create({
        podcast: podcast._id,
        owner: hostId,
        title: 'Welcome Episode',
        slug: 'welcome-episode',
        mediaObjectKey: 'recordings/welcome.mp4',
        duration: 450,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      });
    });

    it('hides draft episodes from public episode listings', async () => {
      const res = await request(app).get(`/api/podcasts/${podcast.slug}/episodes`);

      expect(res.status).toBe(200);
      expect(res.body.episodes).toHaveLength(1);
      expect(res.body.episodes[0].slug).toBe('welcome-episode');
    });

    it('denies public access to direct draft episode URLs', async () => {
      const res = await request(app).get(`/api/podcasts/${podcast.slug}/episodes/${draftEpisode.slug}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not published/i);
    });

    it('allows podcast owner to view draft episode details', async () => {
      const res = await request(app)
        .get(`/api/podcasts/${podcast.slug}/episodes/${draftEpisode.slug}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
      expect(res.body.episode.slug).toBe('top-secret-draft');
    });
  });

  describe('5. Publishing & Unpublishing Workflow', () => {
    let podcast, episode;

    beforeEach(async () => {
      podcast = await Podcast.create({
        owner: hostId,
        title: 'Publish Test Show',
        slug: `publish-show-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: 'Test show for publish operations.',
        status: 'DRAFT',
      });

      episode = await Episode.create({
        podcast: podcast._id,
        owner: hostId,
        title: 'Ready Episode',
        slug: 'ready-episode',
        mediaObjectKey: 'recordings/ready.mp4',
        duration: 180,
        status: 'DRAFT',
      });
    });

    it('rejects publishing an episode without valid media asset', async () => {
      const emptyEp = await Episode.create({
        podcast: podcast._id,
        owner: hostId,
        title: 'Empty Media Episode',
        slug: 'empty-media',
        status: 'DRAFT',
      });

      const res = await request(app)
        .post(`/api/podcasts/${podcast._id}/episodes/${emptyEp._id}/publish`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/without an attached media asset/i);
    });

    it('publishes episode and automatically sets parent podcast status to PUBLISHED', async () => {
      const res = await request(app)
        .post(`/api/podcasts/${podcast._id}/episodes/${episode._id}/publish`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
      expect(res.body.episode.status).toBe('PUBLISHED');
      expect(res.body.podcast.status).toBe('PUBLISHED');

      const updatedPod = await Podcast.findById(podcast._id);
      expect(updatedPod.status).toBe('PUBLISHED');
    });

    it('allows unpublishing an episode and removes it from public access', async () => {
      // Publish first
      await request(app)
        .post(`/api/podcasts/${podcast._id}/episodes/${episode._id}/publish`)
        .set('Authorization', `Bearer ${hostToken}`);

      // Unpublish
      const unpubRes = await request(app)
        .post(`/api/podcasts/${podcast._id}/episodes/${episode._id}/unpublish`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(unpubRes.status).toBe(200);
      expect(unpubRes.body.episode.status).toBe('UNPUBLISHED');

      // Verify public access blocked
      const publicRes = await request(app).get(`/api/podcasts/${podcast.slug}/episodes/${episode.slug}`);
      expect(publicRes.status).toBe(403);
    });
  });

  describe('6. Discovery, Search, Pagination & Cover Upload', () => {
    beforeEach(async () => {
      await Podcast.create({
        owner: hostId,
        title: 'AI Revolution Podcast',
        slug: `ai-revolution-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: 'Artificial intelligence deep dives.',
        category: 'Technology',
        tags: ['ai', 'machine-learning'],
        status: 'PUBLISHED',
      });

      await Podcast.create({
        owner: hostId,
        title: 'Startup Growth Secrets',
        slug: `startup-growth-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        description: 'Scaling modern venture startups.',
        category: 'Business',
        tags: ['business', 'startups'],
        status: 'PUBLISHED',
      });
    });

    it('lists published podcasts with search filtering', async () => {
      const res = await request(app).get('/api/podcasts?search=AI');

      expect(res.status).toBe(200);
      expect(res.body.podcasts).toHaveLength(1);
      expect(res.body.podcasts[0].title).toBe('AI Revolution Podcast');
    });

    it('supports category filtering and pagination', async () => {
      const res = await request(app).get('/api/podcasts?category=Business&page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.podcasts.length).toBeGreaterThanOrEqual(1);
      expect(res.body.podcasts[0].category).toBe('Business');
    });

    it('rejects uploading dangerous executable files as cover images', async () => {
      const res = await request(app)
        .post('/api/podcasts/upload-cover')
        .set('Authorization', `Bearer ${hostToken}`)
        .attach('cover', Buffer.from('console.log("bad")'), 'malicious.js');

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Invalid image file format/i);
    });
  });

  describe('7. Audit Logging & Notifications', () => {
    it('creates audit logs and notifications for podcast & episode publishing actions', async () => {
      const pod = await Podcast.create({
        owner: hostId,
        title: 'Audited Show',
        slug: `audited-show-${Date.now()}`,
        description: 'Audit test.',
        status: 'DRAFT',
      });

      const ep = await Episode.create({
        podcast: pod._id,
        owner: hostId,
        title: 'Audited Episode',
        slug: 'audited-episode',
        mediaObjectKey: 'recordings/audit.mp4',
        duration: 120,
        status: 'DRAFT',
      });

      await request(app)
        .post(`/api/podcasts/${pod._id}/episodes/${ep._id}/publish`)
        .set('Authorization', `Bearer ${hostToken}`);

      const notifications = await Notification.find({ recipient: hostId, type: 'episode_published' });
      expect(notifications.length).toBeGreaterThanOrEqual(1);

      const logs = await AuditLog.find({ collectionName: 'episodes', action: 'publish' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });
});

