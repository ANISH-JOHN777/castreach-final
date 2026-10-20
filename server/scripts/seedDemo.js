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
 * Idempotent CastReach Seeding Script
 * Seeds production-grade dataset for realistic evaluation and testing.
 */
async function seedDemoData() {
  const isDemo = process.env.APP_ENV === 'demo' || process.env.NODE_ENV !== 'production';
  if (!isDemo) {
    console.error('ERROR: Seed script is forbidden in production environment.');
    process.exit(1);
  }

  let mongoUri = process.env.MONGODB_URI || 'memory';
  let mongodInstance = null;

  if (mongoose.connection.readyState === 0) {
    if (mongoUri === 'memory' || process.env.NODE_ENV === 'test') {
      const fs = require('fs');
      const dataDir = path.resolve(__dirname, '../.data/db');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const { MongoMemoryReplSet } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
        instanceOpts: [{ dbPath: dataDir }]
      });
      mongoUri = mongodInstance.getUri();
      console.log('[Seed] Created MongoMemoryReplSet instance with persistent storage at', dataDir);
    }
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        const fs = require('fs');
        const dataDir = path.resolve(__dirname, '../.data/db');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        console.warn(`[Seed] Connection to ${mongoUri} failed (${err.message}). Falling back to MongoMemoryReplSet with persistent storage.`);
        const { MongoMemoryReplSet } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryReplSet.create({
          replSet: { count: 1, storageEngine: 'wiredTiger' },
          instanceOpts: [{ dbPath: dataDir }]
        });
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

  console.log('[Seed] Connected to MongoDB. Commencing seed...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const tenantId = 'castreach';

  // ── 1. USERS ─────────────────────────────────────────────────────────
  const adminUsers = [
    {
      name: 'Alexander Wright',
      email: 'admin@castreach.com',
      password: passwordHash,
      role: 'admin',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Alexander Wright',
      email: 'demo.admin@castreach.demo',
      password: passwordHash,
      role: 'admin',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
      tenantId,
      isOnboarded: true,
    }
  ];
  for (const adm of adminUsers) {
    await User.findOneAndUpdate({ email: adm.email }, adm, { upsert: true, new: true });
  }

  const hostsData = [
    {
      name: 'Dr. Elena Rostova',
      email: 'elena.rostova@castreach.com',
      password: passwordHash,
      role: 'host',
      podcastName: 'The AI & Quantum Frontier',
      podcastUrl: 'https://castreach.com/podcasts/ai-frontier',
      expertise: ['Artificial Intelligence', 'Quantum Computing', 'Machine Learning'],
      bio: 'Host of The AI Frontier. Interviewing world leaders in AI, cognitive architecture, and deep tech.',
      sessionRateCents: 15000,
      avgRating: 4.95,
      totalReviews: 24,
      badges: ['top_rated', 'superhost'],
      profilePicture: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.vance@castreach.com',
      password: passwordHash,
      role: 'host',
      podcastName: 'Startup Scaling Playbook',
      podcastUrl: 'https://castreach.com/podcasts/startup-playbook',
      expertise: ['Venture Capital', 'SaaS Scaling', 'Product Strategy'],
      bio: 'Serial entrepreneur and host discussing B2B SaaS growth tactics, unit economics, and go-to-market engines.',
      sessionRateCents: 12000,
      avgRating: 4.88,
      totalReviews: 18,
      badges: ['top_rated'],
      profilePicture: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Sophia Chen',
      email: 'sophia.chen@castreach.com',
      password: passwordHash,
      role: 'host',
      podcastName: 'Cybersecurity Deep Dive',
      podcastUrl: 'https://castreach.com/podcasts/cybersecurity-deep-dive',
      expertise: ['Cybersecurity', 'Cloud Infrastructure', 'Zero Trust'],
      bio: 'CISSP security researcher breaking down enterprise cloud vulnerabilities, supply chain vectors, and perimeter defense.',
      sessionRateCents: 18000,
      avgRating: 5.0,
      totalReviews: 31,
      badges: ['top_rated', 'verified_expert'],
      profilePicture: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
      tenantId,
      isOnboarded: true,
    },
    // Aliases for compatibility
    {
      name: 'Dr. Elena Rostova',
      email: 'demo.host1@castreach.demo',
      password: passwordHash,
      role: 'host',
      podcastName: 'The AI & Quantum Frontier',
      podcastUrl: 'https://castreach.com/podcasts/ai-frontier',
      expertise: ['Artificial Intelligence', 'Quantum Computing', 'Machine Learning'],
      bio: 'Host of The AI Frontier. Interviewing world leaders in AI, cognitive architecture, and deep tech.',
      sessionRateCents: 15000,
      avgRating: 4.95,
      totalReviews: 24,
      badges: ['top_rated', 'superhost'],
      profilePicture: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Sophia Chen',
      email: 'demo.host3@castreach.demo',
      password: passwordHash,
      role: 'host',
      podcastName: 'Cybersecurity Deep Dive',
      podcastUrl: 'https://castreach.com/podcasts/cybersecurity-deep-dive',
      expertise: ['Cybersecurity', 'Cloud Infrastructure', 'Zero Trust'],
      bio: 'CISSP security researcher breaking down enterprise cloud vulnerabilities, supply chain vectors, and perimeter defense.',
      sessionRateCents: 18000,
      avgRating: 5.0,
      totalReviews: 31,
      badges: ['top_rated', 'verified_expert'],
      profilePicture: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
      tenantId,
      isOnboarded: true,
    },
  ];

  const hosts = [];
  for (const h of hostsData) {
    const host = await User.findOneAndUpdate({ email: h.email }, h, { upsert: true, new: true });
    hosts.push(host);
  }

  // Clean up any preexisting mockup guest records
  await User.deleteMany({
    email: {
      $in: [
        'sarah.jenkins@castreach.com',
        'david.miller@castreach.com',
        'amara.patel@castreach.com',
        'demo.guest1@castreach.demo'
      ]
    }
  }).catch(() => {});

  const guestsData = [
    // Authentic Curated Guest Personalities
    {
      name: 'Dr. Andrew Huberman',
      email: 'andrew.huberman@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['Neurobiology', 'Circadian Biology', 'Dopamine & Focus', 'Stress Modulation'],
      bio: 'Tenured professor of neurobiology and ophthalmology at Stanford School of Medicine.',
      sessionRateCents: 150000,
      profilePicture: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Druski (Drew Desbordes)',
      email: 'druski@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['Digital Comedy', 'Brand Building', 'Pop Culture', 'Entertainment Satire'],
      bio: 'Pioneering comedian and entertainment entrepreneur who reshaped digital satire through Coulda Been Records.',
      sessionRateCents: 120000,
      profilePicture: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Tom Holland',
      email: 'tom.holland@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['Mental Health', 'Sobriety', 'Acting Craft', 'Public Vulnerability'],
      bio: 'BAFTA-winning actor known for Spider-Man. Passionate advocate for youth mental health and sobriety.',
      sessionRateCents: 200000,
      profilePicture: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Marcus Vance',
      email: 'marcus.vance.guest@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['B2B SaaS Growth', 'Venture Capital', 'Pricing Architecture', 'Go-to-Market'],
      bio: 'Built and exited two B2B software companies ($140M aggregate exit). Now advises founders.',
      sessionRateCents: 85000,
      profilePicture: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'DJ Shipley',
      email: 'dj.shipley@castreach.demo',
      password: passwordHash,
      role: 'guest',
      expertise: ['Mental Resilience', 'High-Stress Performance', 'Team Leadership', 'Vulnerability & Healing'],
      bio: 'Decorated combat veteran with 17 years in Naval Special Warfare (DEVGRU). Co-founder of GBRS Group.',
      sessionRateCents: 175000,
      profilePicture: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
      tenantId,
      isOnboarded: true,
    },
  ];

  const guests = [];
  for (const g of guestsData) {
    const guest = await User.findOneAndUpdate({ email: g.email }, g, { upsert: true, new: true });
    guests.push(guest);
  }

  const listenersData = [
    {
      name: 'Jordan Reed',
      email: 'jordan.reed@castreach.com',
      password: passwordHash,
      role: 'listener',
      bio: 'Audiophile & tech enthusiast. Tuning in to leading AI and venture podcasts.',
      profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
      interests: ['AI', 'Startups', 'Cybersecurity', 'Design'],
      tenantId,
      isOnboarded: true,
    },
    {
      name: 'Jordan Reed',
      email: 'demo.listener@castreach.demo',
      password: passwordHash,
      role: 'listener',
      bio: 'Audiophile & tech enthusiast. Tuning in to leading AI and venture podcasts.',
      profilePicture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
      interests: ['AI', 'Startups', 'Cybersecurity', 'Design'],
      tenantId,
      isOnboarded: true,
    },
  ];

  for (const l of listenersData) {
    await User.findOneAndUpdate({ email: l.email }, l, { upsert: true, new: true });
  }

  // ── 2. PODCASTS & EPISODES WITH REAL ARTWORK ─────────────────────────────
  const podcastsData = [
    {
      owner: hosts[0]._id,
      title: 'The AI Frontier',
      slug: 'ai-frontier',
      description: 'Deep dives into artificial intelligence, LLMs, and quantum algorithms with leading computer scientists and engineers.',
      category: 'Technology',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      tags: ['AI', 'Machine Learning', 'Quantum'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[1]._id,
      title: 'Startup Scaling Playbook',
      slug: 'startup-scaling-playbook',
      description: 'Actionable insights for venture-backed founders building durable, high-growth technology companies.',
      category: 'Business',
      coverImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
      tags: ['SaaS', 'Venture Capital', 'Growth'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[2]._id,
      title: 'Cybersecurity Deep Dive',
      slug: 'cybersecurity-deep-dive',
      description: 'Analyzing real-world incident response cases, Zero Trust network topologies, and defensive cryptography.',
      category: 'Technology',
      coverImage: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
      tags: ['Security', 'Cloud', 'Zero Trust'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[0]._id,
      title: 'Product Designer: Crafting Modern UIs',
      slug: 'product-designer-crafting-modern-uis',
      description: 'Human-centered design, UI system architectures, design tokens, and user experience leadership.',
      category: 'Design',
      coverImage: 'https://images.unsplash.com/photo-1581291518655-9523c9320e6b?auto=format&fit=crop&w=600&q=80',
      tags: ['Design', 'UI', 'UX'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[1]._id,
      title: 'Digital Marketing Mastery',
      slug: 'digital-marketing-mastery',
      description: 'Customer acquisition, content distribution playbooks, analytics frameworks, and brand strategy.',
      category: 'Business',
      coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
      tags: ['Marketing', 'Growth', 'Brand'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[2]._id,
      title: 'Athletic Performance & Longevity',
      slug: 'athletic-performance-longevity',
      description: 'Sports medicine, physiological adaptation, nutrition regimes, and high-performance recovery.',
      category: 'Sport',
      coverImage: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80',
      tags: ['Sport', 'Fitness', 'Athletics'],
      status: 'PUBLISHED',
      tenantId,
    },
    {
      owner: hosts[0]._id,
      title: 'Mind & Harmony',
      slug: 'mind-harmony',
      description: 'Cognitive behavioral psychology, emotional balance, mindfulness science, and neuroscience.',
      category: 'Psychology',
      coverImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
      tags: ['Psychology', 'Wellness', 'Mindfulness'],
      status: 'PUBLISHED',
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
      showNotes: 'In this episode, Dr. Elena Rostova interviews Sarah Jenkins on building agentic workflows and tool-augmented transformers.',
      episodeNumber: 101,
      seasonNumber: 1,
      duration: 2450,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
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
      showNotes: 'A technical exploration of speech-to-speech architectures and real-time audio tokenization.',
      episodeNumber: 102,
      seasonNumber: 1,
      duration: 1890,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
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
      showNotes: 'Marcus Vance sits down with fintech architect David Miller to discuss dispute mechanics and financial custody.',
      episodeNumber: 45,
      seasonNumber: 2,
      duration: 3100,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
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
      showNotes: 'Sophia Chen breaks down identity-driven network perimeter security and mutual TLS encryption.',
      episodeNumber: 12,
      seasonNumber: 1,
      duration: 2750,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 172800000),
      tenantId,
    },
    {
      podcast: podcasts[3]._id,
      owner: hosts[0]._id,
      title: 'Ep 10: Design Systems at Scale with Sarah Lin',
      slug: 'ep-10-design-systems-at-scale',
      description: 'Architecting component libraries, token hierarchies, and cross-platform UI foundations.',
      showNotes: 'Sarah Lin explains how design tokens bridge Figma and production React applications.',
      episodeNumber: 10,
      seasonNumber: 1,
      duration: 3600,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 86400000),
      tenantId,
    },
    {
      podcast: podcasts[4]._id,
      owner: hosts[2]._id,
      title: 'Proper Diet & Metabolic Health',
      slug: 'proper-diet-metabolic-health',
      description: 'Understanding glucose spikes, macronutrient ratios, and athletic endurance fueling.',
      showNotes: 'Comprehensive breakdown of metabolic flexibility and nutrition for long-distance training.',
      episodeNumber: 1,
      seasonNumber: 1,
      duration: 1850,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 72000000),
      tenantId,
    },
    {
      podcast: podcasts[4]._id,
      owner: hosts[2]._id,
      title: 'Just Football: Modern High-Press Tactics',
      slug: 'just-football-modern-high-press-tactics',
      description: 'Tactical analysis of European counter-pressing structures, transition phases, and physical load.',
      showNotes: 'Tactical deep dive into modern pressing systems and positional play in the premier league.',
      episodeNumber: 2,
      seasonNumber: 1,
      duration: 2150,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 50000000),
      tenantId,
    },
    {
      podcast: podcasts[5]._id,
      owner: hosts[0]._id,
      title: 'Healthy Lifestyle: The Search for Harmony',
      slug: 'healthy-lifestyle-search-for-harmony',
      description: 'Exploring mindfulness, stress physiology, and establishing sustainable daily routines.',
      showNotes: 'Practical frameworks for mental resilience, cognitive recovery, and work-life equilibrium.',
      episodeNumber: 1,
      seasonNumber: 1,
      duration: 2280,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 36000000),
      tenantId,
    },
    {
      podcast: podcasts[5]._id,
      owner: hosts[0]._id,
      title: 'Psychological Approaches to Stress Reduction',
      slug: 'psychological-approaches-to-stress-reduction',
      description: 'Cognitive behavioral tools and somatic practices for managing executive pressure.',
      showNotes: 'Science-backed interventions for mitigating sympathetic nervous system hyperarousal.',
      episodeNumber: 2,
      seasonNumber: 1,
      duration: 2400,
      audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      mediaUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 18000000),
      tenantId,
    },
  ];

  const episodes = [];
  for (const e of episodesData) {
    const episode = await Episode.findOneAndUpdate({ slug: e.slug }, e, { upsert: true, new: true });
    episodes.push(episode);
  }

  // ── 3. REAL BOOKINGS ──────────────────────────────────────────────────────
  const now = Date.now();
  const sampleBookings = [
    {
      host: hosts[0]._id,
      guest: guests[0]._id,
      topics: ['Multimodal AI & Speech Systems'],
      slotStart: new Date(now - 86400000 * 3),
      slotEnd: new Date(now - 86400000 * 3 + 3600000),
      status: 'completed',
      sessionRateCents: 15000,
      platformFeeCents: 2250,
      payoutAmountCents: 12750,
      paymentStatus: 'released',
      paymentIntentId: 'pi_demo_completed_001',
      dailyRoomUrl: 'https://castreach.daily.co/studio-session-101',
      dailyRoomName: 'studio-session-101',
      hostConfirmedCompletion: true,
      guestConfirmedCompletion: true,
      recordingConsent: { hostConsent: true, guestConsent: true },
      recordingStatus: 'PROCESSED',
      rawTrackUrls: {
        host: 'https://storage.example.com/recordings/session101_host.wav',
        guest: 'https://storage.example.com/recordings/session101_guest.wav',
      },
      durationSeconds: 3600,
      tenantId,
    },
    {
      host: hosts[1]._id,
      guest: guests[1]._id,
      topics: ['Marketplace Escrow Architecture & Growth'],
      slotStart: new Date(now + 86400000 * 2),
      slotEnd: new Date(now + 86400000 * 2 + 3600000),
      status: 'confirmed',
      sessionRateCents: 12000,
      platformFeeCents: 1800,
      payoutAmountCents: 10200,
      paymentStatus: 'held',
      paymentIntentId: 'pi_demo_confirmed_002',
      dailyRoomUrl: 'https://castreach.daily.co/studio-session-102',
      dailyRoomName: 'studio-session-102',
      recordingConsent: { hostConsent: true, guestConsent: true },
      recordingStatus: 'SCHEDULED',
      tenantId,
    },
    {
      host: hosts[2]._id,
      guest: guests[2]._id,
      topics: ['Zero Trust Security Audit & Multi-Region Cloud'],
      slotStart: new Date(now + 86400000 * 5),
      slotEnd: new Date(now + 86400000 * 5 + 3600000),
      status: 'pending',
      sessionRateCents: 18000,
      platformFeeCents: 2700,
      payoutAmountCents: 15300,
      paymentStatus: 'pending',
      recordingConsent: { hostConsent: true, guestConsent: false },
      recordingStatus: 'PENDING',
      tenantId,
    },
  ];

  const savedBookings = [];
  for (const b of sampleBookings) {
    const saved = await Booking.findOneAndUpdate(
      { host: b.host, guest: b.guest, topics: b.topics },
      b,
      { upsert: true, new: true }
    );
    savedBookings.push(saved);
  }

  // ── 4. REVIEWS ────────────────────────────────────────────────────────────
  if (savedBookings.length > 0) {
    const sampleReviews = [
      {
        booking: savedBookings[0]._id,
        reviewer: guests[0]._id,
        reviewee: hosts[0]._id,
        rating: 5,
        title: 'Exceptional interview experience',
        comment: 'Dr. Elena Rostova conducted an exceptional interview. High-fidelity audio recording with zero latency.',
        status: 'PUBLISHED',
        tenantId,
      },
      {
        booking: savedBookings[0]._id,
        reviewer: hosts[0]._id,
        reviewee: guests[0]._id,
        rating: 5,
        title: 'Outstanding guest appearance',
        comment: 'Sarah Jenkins provided deep insights into enterprise LLM workflows. Outstanding guest appearance.',
        status: 'PUBLISHED',
        tenantId,
      },
    ];

    for (const r of sampleReviews) {
      await Review.findOneAndUpdate(
        { booking: r.booking, reviewer: r.reviewer },
        r,
        { upsert: true, new: true }
      );
    }
  }

  console.log('[Seed] Database seeding completed successfully with real production records.');
}

module.exports = { seedDemoData };

if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('[Seed] Standalone execution finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Execution failed:', err);
      process.exit(1);
    });
}
