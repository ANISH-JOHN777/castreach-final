const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Podcast = require('../models/Podcast');
const Episode = require('../models/Episode');
const Availability = require('../models/Availability');
const { calculateMatch } = require('../services/matchingEngine');
const { rerankMatchesWithAI } = require('../services/aiMatching');
const { globalLimiter } = require('../middleware/rateLimit');
const verifyToken = require('../middleware/verifyToken');

// Apply global rate limiting to discovery endpoints
router.use(globalLimiter);

/**
 * Helper to sanitize user object for public discovery
 */
function sanitizePublicProfile(user, extraData = {}) {
  const u = user.toObject ? user.toObject() : user;
  return {
    id: u._id || u.id,
    displayName: u.displayName || u.name || 'Anonymous User',
    avatar: u.profilePicture || u.avatar || '',
    bio: u.bio || '',
    expertise: Array.isArray(u.expertise) ? u.expertise : [],
    interests: Array.isArray(u.interests) ? u.interests : [],
    languages: Array.isArray(u.languages) ? u.languages : [],
    role: u.role,
    ...extraData,
  };
}

/**
 * Helper for availability filtering query
 */
async function getAvailableUserIds(reqAvailability) {
  if (!reqAvailability || reqAvailability === 'ALL') return null;
  
  const availables = await Availability.find({
    $or: [
      { isBooked: false },
      { slots: { $exists: true, $not: { $size: 0 } } },
      { recurring: { $exists: true } }
    ],
  }).select('user');

  return availables.map((a) => a.user.toString());
}

// ── 1. GET /api/discovery/hosts — Discover hosts ─────────────────────────────
router.get('/hosts', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {
      role: { $in: ['host', 'both'] },
      profileVisibility: { $nin: ['private', 'PRIVATE'] },
    };

    const q = req.query.q || req.query.search;
    if (q) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query.$or = [{ displayName: searchRegex }, { bio: searchRegex }, { expertise: searchRegex }, { interests: searchRegex }];
    }

    if (req.query.topic) {
      const topicRegex = new RegExp(req.query.topic.trim(), 'i');
      query.$or = query.$or ? query.$or.concat([{ expertise: topicRegex }, { interests: topicRegex }]) : [{ expertise: topicRegex }, { interests: topicRegex }];
    }

    if (req.query.language) {
      query.languages = req.query.language.trim();
    }

    if (req.query.availability) {
      const userIds = await getAvailableUserIds(req.query.availability);
      if (userIds) {
        query._id = { $in: userIds };
      }
    }

    let sortObj = { createdAt: -1 };
    if (req.query.sort === 'name') sortObj = { displayName: 1 };
    if (req.query.sort === 'oldest') sortObj = { createdAt: 1 };

    const [users, totalCount] = await Promise.all([
      User.find(query).sort(sortObj).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    // Attach podcast counts
    const userIds = users.map((u) => u._id);
    const podcastCounts = await Podcast.aggregate([
      { $match: { owner: { $in: userIds }, status: 'PUBLISHED' } },
      { $group: { _id: '$owner', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    podcastCounts.forEach((pc) => {
      countMap[pc._id.toString()] = pc.count;
    });

    const results = users.map((u) =>
      sanitizePublicProfile(u, {
        podcastCount: countMap[u._id.toString()] || 0,
      })
    );

    res.json({
      success: true,
      hosts: results,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      totalCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 2. GET /api/discovery/guests — Discover guests ────────────────────────────
router.get('/guests', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {
      role: { $in: ['guest', 'both'] },
      profileVisibility: { $nin: ['private', 'PRIVATE'] },
    };

    const q = req.query.q || req.query.search;
    if (q) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query.$or = [{ displayName: searchRegex }, { bio: searchRegex }, { expertise: searchRegex }, { interests: searchRegex }];
    }

    if (req.query.expertise) {
      const expRegex = new RegExp(req.query.expertise.trim(), 'i');
      query.expertise = expRegex;
    }

    if (req.query.topic) {
      const topicRegex = new RegExp(req.query.topic.trim(), 'i');
      query.$or = query.$or ? query.$or.concat([{ expertise: topicRegex }, { interests: topicRegex }]) : [{ expertise: topicRegex }, { interests: topicRegex }];
    }

    if (req.query.language) {
      query.languages = req.query.language.trim();
    }

    if (req.query.availability) {
      const userIds = await getAvailableUserIds(req.query.availability);
      if (userIds) {
        query._id = { $in: userIds };
      }
    }

    let sortObj = { createdAt: -1 };
    if (req.query.sort === 'name') sortObj = { displayName: 1 };
    if (req.query.sort === 'oldest') sortObj = { createdAt: 1 };

    const [users, totalCount] = await Promise.all([
      User.find(query).sort(sortObj).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    // Check availability status per user
    const userIds = users.map((u) => u._id);
    const availabilities = await Availability.find({ user: { $in: userIds } });
    const availMap = {};
    availabilities.forEach((a) => {
      availMap[a.user.toString()] = (a.isBooked === false || a.slots?.length > 0 || !!a.recurring) ? 'AVAILABLE' : 'NO_OVERLAP';
    });

    const results = users.map((u) =>
      sanitizePublicProfile(u, {
        podcastAppearances: 0,
        availability: availMap[u._id.toString()] || 'UNKNOWN',
      })
    );

    res.json({
      success: true,
      guests: results,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      totalCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 3. GET /api/discovery/episodes — Public Episode Discovery ────────────────
router.get('/episodes', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Only published episodes of published podcasts
    const publishedPodcasts = await Podcast.find({ status: 'PUBLISHED' }).select('_id title category language coverImage owner');
    const podcastIds = publishedPodcasts.map((p) => p._id);

    const query = {
      podcast: { $in: podcastIds },
      status: 'PUBLISHED',
    };

    const q = req.query.q || req.query.search;
    if (q) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { showNotes: searchRegex }, { topics: searchRegex }];
    }

    if (req.query.language) {
      query.language = req.query.language.trim();
    }

    if (req.query.tags) {
      const tagsArray = Array.isArray(req.query.tags) ? req.query.tags : req.query.tags.split(',').map((t) => t.trim());
      query.topics = { $in: tagsArray.map((t) => new RegExp(t, 'i')) };
    }

    let sortObj = { publishedAt: -1, createdAt: -1 };
    if (req.query.sort === 'oldest') sortObj = { publishedAt: 1, createdAt: 1 };
    if (req.query.sort === 'title') sortObj = { title: 1 };

    const [episodes, totalCount] = await Promise.all([
      Episode.find(query)
        .populate({
          path: 'podcast',
          select: 'title category language coverImage owner',
          populate: { path: 'owner', select: 'displayName profilePicture bio' },
        })
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Episode.countDocuments(query),
    ]);

    const results = episodes.map((ep) => {
      const obj = ep.toObject();
      const podcastObj = obj.podcast || {};
      const ownerObj = podcastObj.owner || {};

      return {
        id: obj._id,
        title: obj.title,
        description: obj.description,
        showNotes: obj.showNotes,
        duration: obj.duration,
        audioUrl: obj.audioUrl,
        publishedAt: obj.publishedAt,
        topics: obj.topics || [],
        language: obj.language || podcastObj.language || 'en',
        podcast: {
          id: podcastObj._id,
          title: podcastObj.title,
          category: podcastObj.category,
          coverImage: podcastObj.coverImage,
        },
        owner: {
          id: ownerObj._id,
          displayName: ownerObj.displayName || ownerObj.name || 'Podcast Host',
          avatar: ownerObj.profilePicture || '',
        },
      };
    });

    res.json({
      success: true,
      episodes: results,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      totalCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for /api/podcasts/episodes/discover
router.get('/episodes/discover', async (req, res) => {
  req.url = '/episodes';
  return router.handle(req, res);
});

// ── 4. POST /api/discovery/matches — Matching Engine Endpoint ────────────────
router.post('/matches', verifyToken, async (req, res) => {
  try {
    const { targetType, targetId, limit = 10, filters = {} } = req.body;

    if (!targetType || !['HOST', 'GUEST'].includes(targetType.toUpperCase())) {
      return res.status(400).json({ error: 'targetType must be either "HOST" or "GUEST".' });
    }

    const type = targetType.toUpperCase();
    const effectiveTargetId = targetId || req.user.id;

    // Fetch target user profile
    const targetUser = await User.findById(effectiveTargetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user profile not found.' });
    }

    let targetPodcast = null;
    if (type === 'HOST') {
      targetPodcast = await Podcast.findOne({ owner: targetUser._id, status: 'PUBLISHED' }).sort({ createdAt: -1 });
    }

    // Determine candidate query (HARD FILTERS & PRIVACY)
    const candidateRole = type === 'HOST' ? { $in: ['host', 'both'] } : { $in: ['guest', 'both'] };
    const candidateQuery = {
      _id: { $ne: targetUser._id },
      role: candidateRole,
      profileVisibility: { $nin: ['private', 'PRIVATE'] },
    };

    if (filters.language) {
      candidateQuery.languages = filters.language;
    }

    if (filters.expertise) {
      candidateQuery.expertise = new RegExp(filters.expertise.trim(), 'i');
    }

    const candidates = await User.find(candidateQuery).limit(100);

    // Fetch podcasts for candidates if searching for hosts
    const candidateUserIds = candidates.map((c) => c._id);
    const candidatePodcasts = await Podcast.find({ owner: { $in: candidateUserIds }, status: 'PUBLISHED' });
    const podMap = {};
    candidatePodcasts.forEach((p) => {
      podMap[p.owner.toString()] = p;
    });

    // Fetch availabilities
    const allUserIds = [targetUser._id, ...candidateUserIds];
    const availabilities = await Availability.find({ user: { $in: allUserIds } });
    const availMap = {};
    availabilities.forEach((a) => {
      availMap[a.user.toString()] = a;
    });

    const targetAvail = availMap[targetUser._id.toString()];

    // Run deterministic baseline matching engine
    const deterministicMatches = candidates.map((candidate) => {
      const candidatePod = podMap[candidate._id.toString()];
      const candidateAvail = availMap[candidate._id.toString()];

      const hostEntity = type === 'HOST' 
        ? { user: targetUser, podcast: targetPodcast, availability: targetAvail }
        : { user: candidate, podcast: candidatePod, availability: candidateAvail };

      const guestEntity = type === 'HOST'
        ? { user: candidate, availability: candidateAvail }
        : { user: targetUser, availability: targetAvail };

      const matchResult = calculateMatch(hostEntity, guestEntity);

      return {
        user: sanitizePublicProfile(candidate),
        compatibilityScore: matchResult.compatibilityScore,
        factors: matchResult.factors,
        explanation: matchResult.explanation,
      };
    });

    // Sort deterministically by compatibility score descending
    deterministicMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Run optional AI re-ranking
    const targetEntityInfo = {
      type,
      user: targetUser,
      podcast: targetPodcast,
    };

    const finalResults = await rerankMatchesWithAI(targetEntityInfo, deterministicMatches, { limit });

    res.json({
      success: true,
      results: finalResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
