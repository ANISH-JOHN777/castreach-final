const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');

const Podcast = require('../models/Podcast');
const Episode = require('../models/Episode');
const Booking = require('../models/Booking');
const verifyToken = require('../middleware/verifyToken');
const requireAdmin = require('../middleware/requireAdmin');
const stitcher = require('../stitcher');
const { notify } = require('../services/notifications');
const storageService = require('../services/storage');

// ── SLUG GENERATION HELPERS ──────────────────────────────────────────────────
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

async function generateUniquePodcastSlug(title, currentId = null) {
  let baseSlug = slugify(title) || 'podcast';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (currentId) {
      query._id = { $ne: currentId };
    }
    const existing = await Podcast.findOne(query);
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function generateUniqueEpisodeSlug(podcastId, title, currentId = null) {
  let baseSlug = slugify(title) || 'episode';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { podcast: podcastId, slug };
    if (currentId) {
      query._id = { $ne: currentId };
    }
    const existing = await Episode.findOne(query);
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// ── COVER IMAGE UPLOAD STORAGE ───────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), 'scratch', 'storage', 'covers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DANGEROUS_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.php', '.js', '.html', '.htm'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `cover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext) || !ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new Error('Invalid image file format or extension'));
    }
    cb(null, true);
  },
});

// ── POST /api/podcasts/upload-cover — upload cover image ─────────────────────
router.post('/upload-cover', verifyToken, upload.single('cover'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const fileUrl = `/api/podcasts/cover-file/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// ── GET /api/podcasts/cover-file/:filename — serve uploaded cover images ─────
router.get('/cover-file/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // Path traversal prevention
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  res.sendFile(filePath);
});

// ── POST /api/podcasts — create new podcast ──────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, category, tags, coverImage, language, website } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Podcast title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Podcast description is required' });
    }

    const slug = await generateUniquePodcastSlug(title);
    const podcast = await Podcast.create({
      owner: req.user.id, // Strictly server-derived
      title: title.trim(),
      slug,
      description: description.trim(),
      category: category ? category.trim() : 'General',
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()) : [],
      coverImage: coverImage || '',
      language: language || 'en',
      website: website || '',
      status: 'DRAFT',
    });

    stitcher.audit.logReq(req, {
      collectionName: 'podcasts',
      documentId: podcast._id,
      action: 'create',
      actor: req.user.id,
      after: { title: podcast.title, slug: podcast.slug, status: 'DRAFT' },
    });

    await notify(req.user.id, {
      type: 'podcast_created',
      title: 'Podcast Created',
      body: `Your show "${podcast.title}" has been created as a draft.`,
      link: `/podcasts/${podcast.slug}`,
    });

    res.status(201).json({ success: true, podcast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/podcasts/episodes/discover — Public Episode Discovery ─────────────
router.get('/episodes/discover', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

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
          populate: { path: 'owner', select: 'displayName name profilePicture bio' },
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

// ── GET /api/podcasts — list published podcasts (public discovery) ─────────────
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { status: 'PUBLISHED' };

    const q = req.query.q || req.query.search;
    if (q) {
      const searchRegex = new RegExp(q.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
    }
    if (req.query.category) {
      query.category = new RegExp(`^${req.query.category.trim()}$`, 'i');
    }
    if (req.query.language) {
      query.language = req.query.language.trim();
    }
    if (req.query.tags) {
      const tagsArray = Array.isArray(req.query.tags) ? req.query.tags : req.query.tags.split(',').map((t) => t.trim());
      query.tags = { $in: tagsArray.map((t) => new RegExp(t, 'i')) };
    }

    let sortObj = { createdAt: -1 };
    if (req.query.sort === 'oldest') sortObj = { createdAt: 1 };
    if (req.query.sort === 'title') sortObj = { title: 1 };

    const [podcasts, totalCount] = await Promise.all([
      Podcast.find(query)
        .populate('owner', 'displayName name profilePicture bio')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Podcast.countDocuments(query),
    ]);

    // Attach published episode counts
    const podcastIds = podcasts.map((p) => p._id);
    const episodeCounts = await Episode.aggregate([
      { $match: { podcast: { $in: podcastIds }, status: 'PUBLISHED' } },
      { $group: { _id: '$podcast', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    episodeCounts.forEach((ec) => {
      countMap[ec._id.toString()] = ec.count;
    });

    const enrichedPodcasts = podcasts.map((p) => ({
      ...p.toObject(),
      episodeCount: countMap[p._id.toString()] || 0,
    }));

    res.json({
      success: true,
      podcasts: enrichedPodcasts,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
      totalCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/podcasts/my — list authenticated user's podcasts ─────────────────
router.get('/my', verifyToken, async (req, res) => {
  try {
    const podcasts = await Podcast.find({ owner: req.user.id, status: { $ne: 'ARCHIVED' } }).sort({
      createdAt: -1,
    });

    const podcastIds = podcasts.map((p) => p._id);
    const episodeCounts = await Episode.aggregate([
      { $match: { podcast: { $in: podcastIds }, status: { $ne: 'ARCHIVED' } } },
      { $group: { _id: '$podcast', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    episodeCounts.forEach((ec) => {
      countMap[ec._id.toString()] = ec.count;
    });

    const enriched = podcasts.map((p) => ({
      ...p.toObject(),
      episodeCount: countMap[p._id.toString()] || 0,
    }));

    res.json({ success: true, podcasts: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/podcasts/:idOrSlug — view podcast details ────────────────────────
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);

    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
    const podcast = await Podcast.findOne(query).populate('owner', 'name profilePicture bio');

    if (!podcast) {
      return res.status(404).json({ error: 'Podcast not found' });
    }

    // Authorization check for DRAFT or ARCHIVED podcasts
    const token = req.headers.authorization?.split(' ')[1];
    let callerUser = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        callerUser = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      } catch {}
    }

    const isOwner = callerUser && podcast.owner._id.toString() === callerUser.id;
    const isAdmin = callerUser && callerUser.role === 'admin';

    if (podcast.status !== 'PUBLISHED' && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Podcast is not published' });
    }

    // Fetch published episodes (or all if owner/admin)
    const epQuery = { podcast: podcast._id };
    if (!isOwner && !isAdmin) {
      epQuery.status = 'PUBLISHED';
    } else {
      epQuery.status = { $ne: 'ARCHIVED' };
    }

    const episodes = await Episode.find(epQuery).sort({ episodeNumber: -1, createdAt: -1 });

    res.json({
      success: true,
      podcast: {
        ...podcast.toObject(),
        episodeCount: episodes.filter((e) => e.status === 'PUBLISHED').length,
      },
      episodes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/podcasts/:id — update podcast metadata ───────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const isOwner = podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to modify this podcast' });
    }

    const { title, description, category, tags, coverImage, language, website, status } = req.body;
    const before = {
      title: podcast.title,
      description: podcast.description,
      status: podcast.status,
    };

    if (title && title.trim() !== podcast.title) {
      podcast.title = title.trim();
      podcast.slug = await generateUniquePodcastSlug(title.trim(), podcast._id);
    }
    if (description) podcast.description = description.trim();
    if (category) podcast.category = category.trim();
    if (Array.isArray(tags)) podcast.tags = tags.map((t) => t.trim());
    if (coverImage !== undefined) podcast.coverImage = coverImage;
    if (language) podcast.language = language.trim();
    if (website !== undefined) podcast.website = website.trim();
    if (status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      podcast.status = status;
    }

    await podcast.save();

    stitcher.audit.logReq(req, {
      collectionName: 'podcasts',
      documentId: podcast._id,
      action: 'update',
      actor: req.user.id,
      before,
      after: { title: podcast.title, slug: podcast.slug, status: podcast.status },
    });

    res.json({ success: true, podcast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/podcasts/:id — archive podcast (soft delete) ─────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const isOwner = podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this podcast' });
    }

    podcast.status = 'ARCHIVED';
    await podcast.save();

    // Soft delete associated episodes
    await Episode.updateMany({ podcast: podcast._id }, { status: 'ARCHIVED' });

    stitcher.audit.logReq(req, {
      collectionName: 'podcasts',
      documentId: podcast._id,
      action: 'delete',
      actor: req.user.id,
      after: { status: 'ARCHIVED' },
    });

    res.json({ success: true, message: 'Podcast and episodes archived successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// EPISODE ENDPOINTS
// =============================================================================

// ── POST /api/podcasts/:podcastId/episodes — create episode ──────────────────
router.post('/:podcastId/episodes', verifyToken, async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.podcastId);
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const isOwner = podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to create episodes for this podcast' });
    }

    const {
      title,
      description,
      showNotes,
      episodeNumber,
      seasonNumber,
      coverImage,
      mediaType,
      bookingId,
      sourceType,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Episode title is required' });
    }

    let mediaObjectKey = '';
    let duration = req.body.duration || 0;
    let recordingSource = {};

    // IDOR / Security check for attached recording
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Specified booking recording not found' });
      }

      // Verify caller is party to booking (host or guest) or admin
      const isBookingHost = booking.host.toString() === req.user.id;
      const isBookingGuest = booking.guest.toString() === req.user.id;
      if (!isBookingHost && !isBookingGuest && !isAdmin) {
        return res.status(403).json({ error: 'You are not authorized to use this booking recording' });
      }

      const preferType = sourceType || 'edited';
      if (preferType === 'edited' && booking.recordingEdit?.renderStatus === 'READY') {
        mediaObjectKey = booking.recordingEdit.outputObjectKey;
        duration =
          booking.recordingEdit.renderDurationSeconds ||
          booking.recordingEdit.editedDurationSeconds ||
          booking.recordingStorage?.durationSeconds ||
          booking.recordingDuration ||
          0;
        recordingSource = {
          booking: booking._id,
          sourceType: 'edited',
          objectKey: mediaObjectKey,
        };
      } else if (booking.recordingStorage?.status === 'READY') {
        mediaObjectKey = booking.recordingStorage.objectKey;
        duration = booking.recordingStorage.durationSeconds || booking.recordingDuration || 0;
        recordingSource = {
          booking: booking._id,
          sourceType: 'original',
          objectKey: mediaObjectKey,
        };
      } else {
        return res.status(400).json({ error: 'Selected booking does not have a ready recording asset' });
      }
    } else if (req.body.mediaObjectKey) {
      mediaObjectKey = req.body.mediaObjectKey;
    }

    const slug = await generateUniqueEpisodeSlug(podcast._id, title);

    const episode = await Episode.create({
      podcast: podcast._id,
      owner: req.user.id,
      title: title.trim(),
      slug,
      description: description ? description.trim() : '',
      showNotes: showNotes ? showNotes.trim() : '',
      episodeNumber: parseInt(episodeNumber, 10) || 1,
      seasonNumber: parseInt(seasonNumber, 10) || 1,
      coverImage: coverImage || podcast.coverImage || '',
      mediaObjectKey,
      mediaUrl: req.body.mediaUrl || '',
      mediaType: mediaType || 'video',
      duration,
      recordingSource,
      status: 'DRAFT',
    });

    stitcher.audit.logReq(req, {
      collectionName: 'episodes',
      documentId: episode._id,
      action: 'create',
      actor: req.user.id,
      after: { title: episode.title, slug: episode.slug, podcast: podcast._id },
    });

    res.status(201).json({ success: true, episode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/podcasts/:podcastIdOrSlug/episodes — list podcast episodes ───────
router.get('/:podcastIdOrSlug/episodes', async (req, res) => {
  try {
    const { podcastIdOrSlug } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(podcastIdOrSlug);
    const podQuery = isObjectId ? { _id: podcastIdOrSlug } : { slug: podcastIdOrSlug.toLowerCase() };

    const podcast = await Podcast.findOne(podQuery);
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const token = req.headers.authorization?.split(' ')[1];
    let callerUser = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        callerUser = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      } catch {}
    }

    const isOwner = callerUser && podcast.owner.toString() === callerUser.id;
    const isAdmin = callerUser && callerUser.role === 'admin';

    const query = { podcast: podcast._id };
    if (!isOwner && !isAdmin) {
      query.status = 'PUBLISHED';
    } else {
      query.status = { $ne: 'ARCHIVED' };
    }

    const episodes = await Episode.find(query).sort({ episodeNumber: -1, createdAt: -1 });
    res.json({ success: true, episodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/podcasts/:podcastSlug/episodes/:episodeSlug — episode detail ────
router.get('/:podcastSlug/episodes/:episodeSlug', async (req, res) => {
  try {
    const { podcastSlug, episodeSlug } = req.params;
    const isPodOid = mongoose.Types.ObjectId.isValid(podcastSlug);
    const podQuery = isPodOid ? { _id: podcastSlug } : { slug: podcastSlug.toLowerCase() };

    const podcast = await Podcast.findOne(podQuery).populate('owner', 'name profilePicture bio');
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const isEpOid = mongoose.Types.ObjectId.isValid(episodeSlug);
    const epQuery = isEpOid
      ? { podcast: podcast._id, _id: episodeSlug }
      : { podcast: podcast._id, slug: episodeSlug.toLowerCase() };

    const episode = await Episode.findOne(epQuery);
    if (!episode) return res.status(404).json({ error: 'Episode not found' });

    const token = req.headers.authorization?.split(' ')[1];
    let callerUser = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        callerUser = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      } catch {}
    }

    const isOwner = callerUser && podcast.owner._id.toString() === callerUser.id;
    const isAdmin = callerUser && callerUser.role === 'admin';

    if (episode.status !== 'PUBLISHED' && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Episode is not published' });
    }

    // Signed media URL resolution
    let playableMediaUrl = episode.mediaUrl;
    if (episode.recordingSource?.booking) {
      const booking = await Booking.findById(episode.recordingSource.booking);
      if (booking) {
        if (episode.recordingSource.sourceType === 'edited' && booking.recordingEdit?.renderStatus === 'READY') {
          playableMediaUrl = storageService.getSignedOutputUrl(booking, true);
        } else if (booking.recordingStorage?.status === 'READY') {
          playableMediaUrl = storageService.getSignedStorageUrl(booking, true);
        }
      }
    }

    res.json({
      success: true,
      podcast,
      episode: {
        ...episode.toObject(),
        playableMediaUrl: playableMediaUrl || episode.mediaUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/podcasts/:podcastId/episodes/:episodeId — update episode draft ───
router.put('/:podcastId/episodes/:episodeId', verifyToken, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) return res.status(404).json({ error: 'Episode not found' });

    const podcast = await Podcast.findById(episode.podcast);
    const isOwner = podcast && podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to update this episode' });
    }

    const {
      title,
      description,
      showNotes,
      episodeNumber,
      seasonNumber,
      coverImage,
      mediaType,
      duration,
      mediaObjectKey,
      mediaUrl,
    } = req.body;

    const before = { title: episode.title, status: episode.status };

    if (title && title.trim() !== episode.title) {
      episode.title = title.trim();
      episode.slug = await generateUniqueEpisodeSlug(episode.podcast, title.trim(), episode._id);
    }
    if (description !== undefined) episode.description = description.trim();
    if (showNotes !== undefined) episode.showNotes = showNotes.trim();
    if (episodeNumber !== undefined) episode.episodeNumber = parseInt(episodeNumber, 10);
    if (seasonNumber !== undefined) episode.seasonNumber = parseInt(seasonNumber, 10);
    if (coverImage !== undefined) episode.coverImage = coverImage;
    if (mediaType) episode.mediaType = mediaType;
    if (duration !== undefined) episode.duration = duration;
    if (mediaObjectKey !== undefined) episode.mediaObjectKey = mediaObjectKey;
    if (mediaUrl !== undefined) episode.mediaUrl = mediaUrl;

    await episode.save();

    stitcher.audit.logReq(req, {
      collectionName: 'episodes',
      documentId: episode._id,
      action: 'update',
      actor: req.user.id,
      before,
      after: { title: episode.title, status: episode.status },
    });

    res.json({ success: true, episode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/podcasts/:podcastId/episodes/:episodeId/publish — publish episode
router.post('/:podcastId/episodes/:episodeId/publish', verifyToken, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) return res.status(404).json({ error: 'Episode not found' });

    if (episode.podcast.toString() !== req.params.podcastId) {
      return res.status(400).json({ error: 'Episode does not belong to the specified podcast' });
    }

    const podcast = await Podcast.findById(episode.podcast);
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const isOwner = podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to publish this episode' });
    }

    // ── PUBLISH VALIDATION ──────────────────────────────────────────────────
    if (!episode.title || !episode.title.trim()) {
      return res.status(400).json({ error: 'Cannot publish episode without a valid title' });
    }
    const hasMedia = episode.mediaObjectKey || episode.mediaUrl || episode.recordingSource?.objectKey;
    if (!hasMedia) {
      return res.status(400).json({ error: 'Cannot publish episode without an attached media asset' });
    }

    const before = { status: episode.status, publishedAt: episode.publishedAt };
    episode.status = 'PUBLISHED';
    episode.publishedAt = episode.publishedAt || new Date();
    await episode.save();

    // Ensure parent podcast is also PUBLISHED if it was in DRAFT
    if (podcast.status === 'DRAFT') {
      podcast.status = 'PUBLISHED';
      await podcast.save();
    }

    stitcher.audit.logReq(req, {
      collectionName: 'episodes',
      documentId: episode._id,
      action: 'publish',
      actor: req.user.id,
      before,
      after: { status: 'PUBLISHED', publishedAt: episode.publishedAt },
    });

    await notify(podcast.owner, {
      type: 'episode_published',
      title: 'Episode Published',
      body: `Episode "${episode.title}" is now live on "${podcast.title}".`,
      link: `/podcasts/${podcast.slug}/episodes/${episode.slug}`,
    });

    res.json({ success: true, episode, podcast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/podcasts/:podcastId/episodes/:episodeId/unpublish — unpublish episode
router.post('/:podcastId/episodes/:episodeId/unpublish', verifyToken, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) return res.status(404).json({ error: 'Episode not found' });

    const podcast = await Podcast.findById(episode.podcast);
    const isOwner = podcast && podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to unpublish this episode' });
    }

    const before = { status: episode.status };
    episode.status = 'UNPUBLISHED';
    await episode.save();

    stitcher.audit.logReq(req, {
      collectionName: 'episodes',
      documentId: episode._id,
      action: 'unpublish',
      actor: req.user.id,
      before,
      after: { status: 'UNPUBLISHED' },
    });

    await notify(podcast.owner, {
      type: 'episode_unpublished',
      title: 'Episode Unpublished',
      body: `Episode "${episode.title}" has been taken down from public view.`,
      link: `/podcasts/${podcast.slug}`,
    });

    res.json({ success: true, episode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/podcasts/:podcastId/episodes/:episodeId — soft delete episode
router.delete('/:podcastId/episodes/:episodeId', verifyToken, async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);
    if (!episode) return res.status(404).json({ error: 'Episode not found' });

    const podcast = await Podcast.findById(episode.podcast);
    const isOwner = podcast && podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to delete this episode' });
    }

    episode.status = 'ARCHIVED';
    await episode.save();

    stitcher.audit.logReq(req, {
      collectionName: 'episodes',
      documentId: episode._id,
      action: 'delete',
      actor: req.user.id,
      after: { status: 'ARCHIVED' },
    });

    res.json({ success: true, message: 'Episode archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/podcasts/:podcastId/episodes/:episodeId/transcription ──────────
router.post('/:podcastId/episodes/:episodeId/transcription', verifyToken, async (req, res) => {
  try {
    const { podcastId, episodeId } = req.params;
    const podcast = await Podcast.findById(podcastId);
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const episode = await Episode.findById(episodeId);
    if (!episode || episode.podcast.toString() !== podcast._id.toString()) {
      return res.status(404).json({ error: 'Episode not found for this podcast' });
    }

    const isOwner = podcast.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to request episode transcription' });
    }

    const mediaObjectKey = episode.mediaObjectKey || episode.recordingSource?.objectKey;
    if (!mediaObjectKey) {
      return res.status(400).json({ error: 'Episode does not have an attached media asset for transcription' });
    }

    const language = (req.body.language || 'en').trim();
    const crypto = require('crypto');
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${episodeId}_${mediaObjectKey}_${language}`)
      .digest('hex');

    const tx = episode.transcription || {};

    if (tx.status === 'READY' && tx.fingerprint === fingerprint && tx.transcriptObjectKey) {
      return res.status(200).json({
        success: true,
        message: 'Existing transcript ready',
        jobId: tx.jobId,
        status: 'READY',
        transcription: tx,
      });
    }

    if (tx.status === 'QUEUED' || tx.status === 'PROCESSING') {
      return res.status(200).json({
        success: true,
        message: 'Transcription already in progress',
        jobId: tx.jobId,
        status: tx.status,
        transcription: tx,
      });
    }

    const jobId = `tx_${crypto.randomBytes(8).toString('hex')}`;
    episode.transcription = {
      status: 'QUEUED',
      jobId,
      sourceType: 'episode',
      sourceObjectKey: mediaObjectKey,
      language,
      provider: process.env.TRANSCRIPTION_PROVIDER || 'whisper',
      requestedAt: new Date(),
      attempt: 0,
      fingerprint,
    };

    await episode.save();

    stitcher.audit.logReq(req, {
      collectionName: 'episodes',
      documentId: episode._id,
      action: 'transcribe',
      actor: req.user.id,
      after: { jobId, status: 'QUEUED' },
    });

    const transcriptionWorker = require('../worker/transcriptionWorker');
    setImmediate(() => {
      transcriptionWorker.processNextJob().catch(() => {});
    });

    res.status(202).json({
      success: true,
      jobId,
      status: 'QUEUED',
      transcription: episode.transcription,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/podcasts/:podcastSlug/episodes/:episodeSlug/transcript ──────────
router.get('/:podcastSlug/episodes/:episodeSlug/transcript', async (req, res) => {
  try {
    const { podcastSlug, episodeSlug } = req.params;

    const podcast = await Podcast.findOne({ slug: podcastSlug.toLowerCase() });
    if (!podcast) return res.status(404).json({ error: 'Podcast not found' });

    const episode = await Episode.findOne({
      podcast: podcast._id,
      slug: episodeSlug.toLowerCase(),
    });
    if (!episode) return res.status(404).json({ error: 'Episode not found' });

    // Authorization check for DRAFT episodes
    const token = req.headers.authorization?.split(' ')[1];
    let callerUser = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        callerUser = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      } catch {}
    }

    const isOwner = callerUser && podcast.owner.toString() === callerUser.id;
    const isAdmin = callerUser && callerUser.role === 'admin';

    if (episode.status !== 'PUBLISHED' && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Episode transcript is not available' });
    }

    const tx = episode.transcription;
    if (!tx || tx.status !== 'READY' || !tx.transcriptObjectKey) {
      return res.status(404).json({ error: 'Transcript not available for this episode' });
    }

    const transcriptData = await storageService.getTranscriptJson(tx.transcriptObjectKey);
    if (!transcriptData) {
      return res.status(404).json({ error: 'Transcript content file not found' });
    }

    res.json({
      success: true,
      transcription: tx,
      transcript: transcriptData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/podcasts/:podcastId/episodes/:episodeId/apply-ai-content ───────
router.post('/:podcastId/episodes/:episodeId/apply-ai-content', verifyToken, async (req, res) => {
  try {
    const { podcastId, episodeId } = req.params;
    const { field, content } = req.body;

    if (!['description', 'showNotes', 'title', 'chapters'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field. Allowed: description, showNotes, title, chapters' });
    }

    const episode = await Episode.findById(episodeId);
    if (!episode) return res.status(404).json({ error: 'Episode not found' });

    const isOwner = episode.owner.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (field === 'description') {
      episode.description = typeof content === 'string' ? content : content?.description || '';
    } else if (field === 'showNotes') {
      episode.showNotes = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    } else if (field === 'title') {
      episode.title = typeof content === 'string' ? content : content?.title || episode.title;
    }

    await episode.save();

    res.json({
      success: true,
      message: `Episode ${field} updated with AI suggestion.`,
      episode,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
