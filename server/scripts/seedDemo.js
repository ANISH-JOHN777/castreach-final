const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

// Load environment configuration
require('dotenv').config({ path: path.join(__dirname, '../.env.demo') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const User = require('../models/User');
const Booking = require('../models/Booking');
const Podcast = require('../models/Podcast');
const Episode = require('../models/Episode');
const Review = require('../models/Review');
const Availability = require('../models/Availability');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const AIJob = require('../models/AIJob');
const Dispute = require('../models/Dispute');

/**
 * Idempotent CastReach Demo Seeding Script
 * Safely seeds demonstration data for investor evaluation without duplicating records.
 */
async function seedDemoData() {
  const isDemo = process.env.APP_ENV === 'demo' || process.env.NODE_ENV !== 'production';
  if (!isDemo) {
    console.error('ERROR: Demo seed script is forbidden in production environment.');
    process.exit(1);
  }

  let mongoUri = process.env.MONGODB_URI || 'memory';
  let mongodInstance = null;

  if (mongoose.connection.readyState === 0) {
    if (mongoUri === 'memory' || process.env.NODE_ENV === 'test') {
      const { MongoMemoryReplSet } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
      mongoUri = mongodInstance.getUri();
      console.log('[Seed] Created MongoMemoryReplSet instance for demo transaction compatibility.');
    }
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Seed] Connection to ${mongoUri} failed (${err.message}). Falling back to MongoMemoryReplSet.`);
        const { MongoMemoryReplSet } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        mongoUri = mongodInstance.getUri();
        await mongoose.connect(mongoUri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        });
      } else {
        throw err;
      }
    }
  }

  console.log('[Seed] Connected to MongoDB. Commencing idempotent seed...');

  const passwordHash = await bcrypt.hash('DemoPassword123!', 10);
  const tenantId = 'castreach';

  // ── 1. DEMO USERS ─────────────────────────────────────────────────────────
  const adminData = {
    name: 'CastReach Admin',
    email: 'demo.admin@castreach.demo',
    password: passwordHash,
    role: 'admin',
    tenantId,
    isOnboarded: true,
  };
  const adminUser = await User.findOneAndUpdate({ email: adminData.email }, adminData, { upsert: true, new: true });

  const hostsData = [
    {
      name: 'Dr. Elena Rostova',
      email: 'demo.host1@castreach.demo',
      password: passwordHash,
      role: 'host',
      podcastName: 'The AI & Quantum Frontier',
      podcastUrl: 'https://castreach.demo/podcasts/ai-frontier',
      expertise: ['Artificial Intelligence', 'Quantum Computing', 'Machine Learning'],
      bio: 'Host of The AI Frontier. Interviewing world leaders in AI and deep tech.',
      sessionRateCents: 15000,
      avgRating: 4.9,
      totalReviews: 24,
      badges: ['top_rated', 'superhost'],
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Marcus Vance',
      email: 'demo.host2@castreach.demo',
      password: passwordHash,
      role: 'host',
      podcastName: 'Startup Scaling Playbook',
      podcastUrl: 'https://castreach.demo/podcasts/startup-playbook',
      expertise: ['Venture Capital', 'SaaS Scaling', 'Product Strategy'],
      bio: 'Serial entrepreneur and host discussing B2B SaaS growth tactics.',
      sessionRateCents: 12000,
      avgRating: 4.8,
      totalReviews: 18,
      badges: ['top_rated'],
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Sophia Chen',
      email: 'demo.host3@castreach.demo',
      password: passwordHash,
      role: 'host',
      podcastName: 'Cybersecurity Deep Dive',
      podcastUrl: 'https://castreach.demo/podcasts/cybersecurity-deep-dive',
      expertise: ['Cybersecurity', 'Cloud Infrastructure', 'Zero Trust'],
      bio: 'CISSP security researcher breaking down enterprise security vulnerabilities.',
      sessionRateCents: 18000,
      avgRating: 5.0,
      totalReviews: 31,
      badges: ['top_rated', 'verified_expert'],
      tenantId,
      isOnboarded: true,
    },
  ];

  const hosts = [];
  for (const h of hostsData) {
    const host = await User.findOneAndUpdate({ email: h.email }, h, { upsert: true, new: true });
    hosts.push(host);
  }

  const guestsData = [
    {
      name: 'Sarah Jenkins',
      email: 'demo.guest1@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['AI Engineering', 'LLM Fine-Tuning'],
      bio: 'Lead AI Engineer specializing in multimodal LLM architectures.',
      sessionRateCents: 0,
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'David K. Miller',
      email: 'demo.guest2@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['Fintech Growth', 'Stripe Escrow Architecture'],
      bio: 'Fintech product architect scaling cross-border payments.',
      sessionRateCents: 0,
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Amara Patel',
      email: 'demo.guest3@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['Cloud Architecture', 'DevOps'],
      bio: 'Principal Cloud Architect specializing in Kubernetes & WebSockets.',
      sessionRateCents: 0,
      tenantId,
      isOnboarded: true,
    },
  ];

  const guests = [];
  for (const g of guestsData) {
    const guest = await User.findOneAndUpdate({ email: g.email }, g, { upsert: true, new: true });
    guests.push(guest);
  }

  console.log(`[Seed] Seeded 1 Admin, ${hosts.length} Hosts, ${guests.length} Guests.`);

  // ── 2. DEMO PODCASTS & EPISODES ───────────────────────────────────────────
  const podcastsData = [
    {
      owner: hosts[0]._id,
      title: 'The AI Frontier',
      slug: 'ai-frontier',
      description: 'Deep dives into artificial intelligence, LLMs, and quantum algorithms with top researchers.',
      category: 'Technology',
      tags: ['AI', 'Machine Learning', 'Quantum'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[1]._id,
      title: 'Startup Scaling Playbook',
      slug: 'startup-scaling-playbook',
      description: 'Actionable insights for venture-backed founders building 8-figure SaaS companies.',
      category: 'Business',
      tags: ['SaaS', 'Venture Capital', 'Growth'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[2]._id,
      title: 'Cybersecurity Deep Dive',
      slug: 'cybersecurity-deep-dive',
      description: 'Analyzing recent breaches, Zero Trust architectures, and cloud security best practices.',
      category: 'Technology',
      tags: ['Security', 'Cybersecurity', 'Cloud'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[0]._id,
      title: 'Future of Media & Audio',
      slug: 'future-of-media-audio',
      description: 'Exploring live audio, captions, and automated podcast distribution.',
      category: 'Technology',
      tags: ['Audio', 'Podcasting', 'Media'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[1]._id,
      title: 'Product-Led Growth Masterclass',
      slug: 'product-led-growth-masterclass',
      description: 'Strategies for converting freemium users into enterprise contracts.',
      category: 'Business',
      tags: ['Product', 'Growth', 'Freemium'],
      status: 'DRAFT',
      tenantId,
    },
  ];

  const podcasts = [];
  for (const p of podcastsData) {
    const podcast = await Podcast.findOneAndUpdate({ slug: p.slug }, p, { upsert: true, new: true });
    podcasts.push(podcast);
  }

  const episodesData = [
    {
      podcast: podcasts[0]._id,
      owner: hosts[0]._id,
      title: 'Ep 101: Building Production LLM Agents with Sarah Jenkins',
      slug: 'ep-101-building-production-llm-agents',
      description: 'Exploring context windows, tool calling, and prompt injection defense in enterprise LLMs.',
      showNotes: 'In this episode, Dr. Elena Rostova interviews Sarah Jenkins on building agentic workflows.',
      episodeNumber: 101,
      seasonNumber: 1,
      duration: 2450,
      mediaUrl: 'https://storage.example.com/castreach/media/ep101_sample.mp3',
      mediaObjectKey: 'recordings/demo_ep101/edited/output.mp4',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 604800000),
      tenantId,
    },
    {
      podcast: podcasts[0]._id,
      owner: hosts[0]._id,
      title: 'Ep 102: Multimodal Models and Real-Time Audio Inference',
      slug: 'ep-102-multimodal-models-real-time-audio',
      description: 'How low-latency audio transformers are enabling sub-100ms conversational AI.',
      showNotes: 'A technical exploration of real-time speech-to-speech models.',
      episodeNumber: 102,
      seasonNumber: 1,
      duration: 1890,
      mediaUrl: 'https://storage.example.com/castreach/media/ep102_sample.mp3',
      mediaObjectKey: 'recordings/demo_ep102/edited/output.mp4',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 259200000),
      tenantId,
    },
    {
      podcast: podcasts[1]._id,
      owner: hosts[1]._id,
      title: 'Ep 45: Escrow Payments and Financial Trust with David K. Miller',
      slug: 'ep-45-escrow-payments-financial-trust',
      description: 'How marketplace platforms use automated Stripe escrow to protect hosts and guests.',
      showNotes: 'Marcus Vance sits down with fintech architect David Miller.',
      episodeNumber: 45,
      seasonNumber: 2,
      duration: 3100,
      mediaUrl: 'https://storage.example.com/castreach/media/ep45_sample.mp3',
      mediaObjectKey: 'recordings/demo_ep45/edited/output.mp4',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 432000000),
      tenantId,
    },
    {
      podcast: podcasts[2]._id,
      owner: hosts[2]._id,
      title: 'Ep 12: Zero Trust Network Architecture for Cloud Workloads',
      slug: 'ep-12-zero-trust-architecture-cloud',
      description: 'Preventing lateral movement and securing multi-tenant WebSocket infrastructure.',
      showNotes: 'Sophia Chen breaks down identity-driven network perimeter security.',
      episodeNumber: 12,
      seasonNumber: 1,
      duration: 2750,
      mediaUrl: 'https://storage.example.com/castreach/media/ep12_sample.mp3',
      mediaObjectKey: 'recordings/demo_ep12/edited/output.mp4',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 172800000),
      tenantId,
    },
  ];

  const episodes = [];
  for (const e of episodesData) {
    const episode = await Episode.findOneAndUpdate({ slug: e.slug }, e, { upsert: true, new: true });
    episodes.push(episode);
  }

  console.log(`[Seed] Seeded ${podcasts.length} Podcasts, ${episodes.length} Episodes.`);

  // ── 3. DEMO BOOKINGS & FINANCIAL STATES ───────────────────────────────────
  const now = Date.now();
  const sampleBookings = [
    {
      host: hosts[0]._id,
      guest: guests[0]._id,
      slotStart: new Date(now - 7200000),
      slotEnd: new Date(now - 3600000),
      status: 'completed',
      paymentStatus: 'released',
      paymentIntentId: 'pi_demo_completed_12345',
      amountCents: 15000,
      currency: 'usd',
      recordingReady: true,
      recordingStatus: 'READY',
      recordingStorage: {
        status: 'READY',
        objectKey: 'recordings/demo_b1/original/source.mp4',
        durationSeconds: 3600,
      },
      recordingEdit: {
        renderStatus: 'READY',
        outputObjectKey: 'recordings/demo_b1/edited/output.mp4',
        renderDurationSeconds: 3600,
      },
      transcription: {
        status: 'READY',
        jobId: 'tx_demo_b1_001',
        transcriptObjectKey: 'transcripts/demo_b1/transcript.json',
      },
      tenantId,
    },
    {
      host: hosts[1]._id,
      guest: guests[1]._id,
      slotStart: new Date(now + 86400000),
      slotEnd: new Date(now + 90000000),
      status: 'confirmed',
      paymentStatus: 'held',
      paymentIntentId: 'pi_demo_confirmed_67890',
      amountCents: 12000,
      currency: 'usd',
      tenantId,
    },
    {
      host: hosts[2]._id,
      guest: guests[2]._id,
      slotStart: new Date(now + 172800000),
      slotEnd: new Date(now + 176400000),
      status: 'pending',
      paymentStatus: 'unpaid',
      amountCents: 18000,
      currency: 'usd',
      tenantId,
    },
  ];

  const bookings = [];
  for (const b of sampleBookings) {
    let booking = null;
    if (b.paymentIntentId) {
      booking = await Booking.findOne({ paymentIntentId: b.paymentIntentId });
    }
    if (!booking) {
      booking = await Booking.findOne({ host: b.host, guest: b.guest, slotStart: b.slotStart });
    }
    if (!booking) {
      booking = await Booking.create(b);
    }
    bookings.push(booking);
  }

  console.log(`[Seed] Seeded ${bookings.length} Bookings across completed, confirmed, and pending states.`);

  // ── 4. DEMO CHAT MESSAGES & WEBSOCKET PRE-SEEDED CONVERSATION ─────────────
  const messagesData = [
    {
      booking: bookings[0]._id,
      sender: guests[0]._id,
      content: 'Hi Dr. Rostova, really looking forward to discussing multimodal LLMs today!',
      text: 'Hi Dr. Rostova, really looking forward to discussing multimodal LLMs today!',
      tenantId,
      createdAt: new Date(now - 14400000),
    },
    {
      booking: bookings[0]._id,
      sender: hosts[0]._id,
      content: 'Welcome Sarah! I have our interview prep notes ready. Let’s focus heavily on agent tool calling.',
      text: 'Welcome Sarah! I have our interview prep notes ready. Let’s focus heavily on agent tool calling.',
      tenantId,
      createdAt: new Date(now - 10800000),
    },
    {
      booking: bookings[0]._id,
      sender: guests[0]._id,
      content: 'Perfect. I will share code examples from our production benchmark tests.',
      text: 'Perfect. I will share code examples from our production benchmark tests.',
      tenantId,
      createdAt: new Date(now - 7200000),
    },
  ];

  for (const m of messagesData) {
    const existingMsg = await Message.findOne({ booking: m.booking, sender: m.sender, content: m.content });
    if (!existingMsg) {
      await Message.create(m);
    }
  }

  // ── 5. DEMO REVIEWS & REPUTATION ─────────────────────────────────────────
  const existingReview = await Review.findOne({ booking: bookings[0]._id, reviewer: guests[0]._id });
  if (!existingReview) {
    await Review.create({
      booking: bookings[0]._id,
      reviewer: guests[0]._id,
      reviewee: hosts[0]._id,
      rating: 5,
      title: 'World-class podcast host!',
      comment: 'Dr. Rostova is an incredible interviewer. The recording room audio quality and live subtitles were outstanding.',
      status: 'PUBLISHED',
      tenantId,
    });
  }

  // ── 6. DEMO AVAILABILITY ──────────────────────────────────────────────────
  const avail1 = await Availability.findOne({ user: hosts[0]._id, start: new Date(now + 86400000) });
  if (!avail1) {
    await Availability.create({
      user: hosts[0]._id,
      start: new Date(now + 86400000),
      end: new Date(now + 90000000),
      isBooked: false,
    });
  }

  const avail2 = await Availability.findOne({ user: hosts[1]._id, start: new Date(now + 172800000) });
  if (!avail2) {
    await Availability.create({
      user: hosts[1]._id,
      start: new Date(now + 172800000),
      end: new Date(now + 176400000),
      isBooked: false,
    });
  }

  console.log('[Seed] Demo database seeding completed successfully!');
  if (mongodInstance) {
    console.log('[Seed] Keep-alive ready for demo evaluation server process.');
  }
}

if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('[Seed] Demo script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { seedDemoData };
