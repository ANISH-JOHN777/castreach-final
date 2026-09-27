const router = require('express').Router();
const crypto = require('crypto');
const verifyToken = require('../middleware/verifyToken');
const { authLimiter } = require('../middleware/rateLimit');
const Booking = require('../models/Booking');
const Episode = require('../models/Episode');
const AIJob = require('../models/AIJob');
const storage = require('../services/storage');
const aiService = require('../services/aiService');
const aiWorker = require('../worker/aiWorker');
const AuditLog = require('../models/AuditLog');

/**
 * Phase E3 — AI Podcast Intelligence Routes
 * Asynchronous job queueing, status checking, artifact content retrieval, retry, and confirmation.
 */

/**
 * Helper: Authorize access to a booking or episode resource.
 */
async function getAuthorizedResource(sourceType, sourceId, reqUser) {
  if (!['booking', 'episode'].includes(sourceType)) {
    throw { status: 400, message: 'Invalid sourceType. Must be "booking" or "episode".' };
  }

  let resource = null;
  let isAuthorized = false;

  if (sourceType === 'booking') {
    resource = await Booking.findById(sourceId);
    if (!resource) throw { status: 404, message: 'Booking not found.' };

    const isHost = resource.host.toString() === reqUser.id;
    const isGuest = resource.guest.toString() === reqUser.id;
    const isAdmin = reqUser.role === 'admin';
    isAuthorized = isHost || isGuest || isAdmin;
  } else if (sourceType === 'episode') {
    resource = await Episode.findById(sourceId);
    if (!resource) throw { status: 404, message: 'Episode not found.' };

    const isOwner = resource.owner.toString() === reqUser.id;
    const isAdmin = reqUser.role === 'admin';
    isAuthorized = isOwner || isAdmin;
  }

  if (!isAuthorized) {
    throw { status: 403, message: 'Forbidden: You do not have permission to access AI content for this resource.' };
  }

  return resource;
}

/**
 * Helper: Derive transcript object key & verify E2 transcript readiness.
 */
function verifyTranscriptReadiness(resource, sourceType) {
  const transcription = resource.transcription;
  if (!transcription || transcription.status !== 'READY' || !transcription.transcriptObjectKey) {
    throw {
      status: 400,
      message: `Transcript is not READY for this ${sourceType}. Please generate an E2 transcript first.`,
    };
  }
  return transcription.transcriptObjectKey;
}

// ── 1. POST /api/ai/:sourceType/:sourceId/generate — Queue AI Job ───────────
router.post('/:sourceType/:sourceId/generate', verifyToken, authLimiter, async (req, res, next) => {
  try {
    const { sourceType, sourceId } = req.params;
    const { artifactType } = req.body;

    if (!artifactType || !aiService.SUPPORTED_ARTIFACT_TYPES.includes(artifactType)) {
      return res.status(400).json({
        error: `Invalid artifactType. Allowed types: ${aiService.SUPPORTED_ARTIFACT_TYPES.join(', ')}`,
      });
    }

    const resource = await getAuthorizedResource(sourceType, sourceId, req.user);
    const transcriptObjectKey = verifyTranscriptReadiness(resource, sourceType);

    // Compute deterministic transcript fingerprint for idempotency
    const transcriptFingerprint = crypto
      .createHash('sha256')
      .update(`${sourceType}:${sourceId}:${transcriptObjectKey}:${artifactType}`)
      .digest('hex');

    // Check if matching job is already QUEUED or PROCESSING
    const activeJob = await AIJob.findOne({
      sourceType,
      sourceId,
      artifactType,
      status: { $in: ['QUEUED', 'PROCESSING'] },
    });

    if (activeJob) {
      return res.status(202).json({
        jobId: activeJob.jobId,
        status: activeJob.status,
        artifactType: activeJob.artifactType,
        message: 'AI generation job is already active.',
      });
    }

    // Check if READY job with same fingerprint exists
    const readyJob = await AIJob.findOne({
      sourceType,
      sourceId,
      artifactType,
      transcriptFingerprint,
      status: 'READY',
    });

    if (readyJob) {
      return res.status(200).json({
        jobId: readyJob.jobId,
        status: 'READY',
        artifactType: readyJob.artifactType,
        artifactObjectKey: readyJob.artifactObjectKey,
        message: 'AI artifact is already generated and up to date.',
      });
    }

    // Create new QUEUED AI Job
    const jobId = `ai_job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newJob = await AIJob.create({
      jobId,
      owner: req.user.id,
      sourceType,
      sourceId,
      bookingId: sourceType === 'booking' ? sourceId : undefined,
      episodeId: sourceType === 'episode' ? sourceId : undefined,
      artifactType,
      status: 'QUEUED',
      transcriptFingerprint,
      requestedAt: new Date(),
    });

    // Update parent model aiContent sub-document status
    const updatePath = `aiContent.${artifactType}`;
    if (sourceType === 'booking') {
      await Booking.findByIdAndUpdate(sourceId, {
        $set: {
          [`${updatePath}.status`]: 'QUEUED',
          [`${updatePath}.jobId`]: jobId,
          [`${updatePath}.updatedAt`]: new Date(),
          [`${updatePath}.error`]: null,
        },
      });
    } else {
      await Episode.findByIdAndUpdate(sourceId, {
        $set: {
          [`${updatePath}.status`]: 'QUEUED',
          [`${updatePath}.jobId`]: jobId,
          [`${updatePath}.updatedAt`]: new Date(),
          [`${updatePath}.error`]: null,
        },
      });
    }

    // Audit log
    await AuditLog.create({
      collectionName: 'AIJob',
      documentId: newJob._id,
      action: 'ai_generate',
      actor: req.user.id,
      actorRole: req.user.role,
      after: { jobId, sourceType, sourceId, artifactType, status: 'QUEUED' },
    });

    // Trigger background worker (non-blocking)
    setImmediate(() => {
      aiWorker.processNextJob().catch((err) => {
        console.error('[AIWorker] Background execution error:', err.message);
      });
    });

    return res.status(202).json({
      jobId,
      status: 'QUEUED',
      artifactType,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// ── 2. GET /api/ai/:sourceType/:sourceId — Get AI Content Status Summary ────
router.get('/:sourceType/:sourceId', verifyToken, async (req, res, next) => {
  try {
    const { sourceType, sourceId } = req.params;
    const resource = await getAuthorizedResource(sourceType, sourceId, req.user);

    const jobs = await AIJob.find({ sourceType, sourceId }).sort({ createdAt: -1 });

    const artifactStatuses = {};
    for (const type of aiService.SUPPORTED_ARTIFACT_TYPES) {
      const latestJob = jobs.find((j) => j.artifactType === type);
      const parentMeta = resource.aiContent ? resource.aiContent.get(type) : null;

      artifactStatuses[type] = {
        status: parentMeta?.status || latestJob?.status || 'NOT_REQUESTED',
        jobId: parentMeta?.jobId || latestJob?.jobId || null,
        artifactObjectKey: parentMeta?.artifactObjectKey || latestJob?.artifactObjectKey || null,
        updatedAt: parentMeta?.updatedAt || latestJob?.updatedAt || null,
        error: parentMeta?.error || latestJob?.error || null,
      };
    }

    res.json({
      sourceType,
      sourceId,
      artifacts: artifactStatuses,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// ── 3. GET /api/ai/:sourceType/:sourceId/:artifactType — Get Artifact Content 
router.get('/:sourceType/:sourceId/:artifactType', verifyToken, async (req, res, next) => {
  try {
    const { sourceType, sourceId, artifactType } = req.params;

    if (!aiService.SUPPORTED_ARTIFACT_TYPES.includes(artifactType)) {
      return res.status(400).json({ error: `Invalid artifactType: ${artifactType}` });
    }

    const resource = await getAuthorizedResource(sourceType, sourceId, req.user);

    const parentMeta = resource.aiContent ? resource.aiContent.get(artifactType) : null;
    let artifactObjectKey = parentMeta?.artifactObjectKey;
    let jobId = parentMeta?.jobId;
    let status = parentMeta?.status;

    if (!artifactObjectKey) {
      const latestJob = await AIJob.findOne({ sourceType, sourceId, artifactType, status: 'READY' }).sort({ createdAt: -1 });
      if (latestJob) {
        artifactObjectKey = latestJob.artifactObjectKey;
        jobId = latestJob.jobId;
        status = 'READY';
      }
    }

    if (!artifactObjectKey || status !== 'READY') {
      return res.status(404).json({
        error: `Artifact ${artifactType} is not READY or has not been generated.`,
        status: status || 'NOT_REQUESTED',
      });
    }

    const content = await storage.getAiArtifactJson(artifactObjectKey);
    if (!content) {
      return res.status(404).json({ error: 'Artifact content file missing from persistent storage.' });
    }

    res.json({
      sourceType,
      sourceId,
      artifactType,
      status: 'READY',
      jobId,
      content,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

// ── 4. POST /api/ai/:sourceType/:sourceId/:artifactType/retry — Retry Job ──
router.post('/:sourceType/:sourceId/:artifactType/retry', verifyToken, authLimiter, async (req, res, next) => {
  try {
    const { sourceType, sourceId, artifactType } = req.params;

    if (!aiService.SUPPORTED_ARTIFACT_TYPES.includes(artifactType)) {
      return res.status(400).json({ error: `Invalid artifactType: ${artifactType}` });
    }

    const resource = await getAuthorizedResource(sourceType, sourceId, req.user);
    const transcriptObjectKey = verifyTranscriptReadiness(resource, sourceType);

    // Find previous failed job
    const previousJob = await AIJob.findOne({ sourceType, sourceId, artifactType }).sort({ createdAt: -1 });
    if (!previousJob || previousJob.status !== 'FAILED') {
      return res.status(400).json({ error: 'Cannot retry: Only previously FAILED jobs may be retried.' });
    }

    const jobId = `ai_job_retry_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const transcriptFingerprint = crypto
      .createHash('sha256')
      .update(`${sourceType}:${sourceId}:${transcriptObjectKey}:${artifactType}`)
      .digest('hex');

    const newJob = await AIJob.create({
      jobId,
      owner: req.user.id,
      sourceType,
      sourceId,
      bookingId: sourceType === 'booking' ? sourceId : undefined,
      episodeId: sourceType === 'episode' ? sourceId : undefined,
      artifactType,
      status: 'QUEUED',
      transcriptFingerprint,
      attempt: previousJob.attempt + 1,
      requestedAt: new Date(),
    });

    const updatePath = `aiContent.${artifactType}`;
    if (sourceType === 'booking') {
      await Booking.findByIdAndUpdate(sourceId, {
        $set: {
          [`${updatePath}.status`]: 'QUEUED',
          [`${updatePath}.jobId`]: jobId,
          [`${updatePath}.updatedAt`]: new Date(),
          [`${updatePath}.error`]: null,
        },
      });
    } else {
      await Episode.findByIdAndUpdate(sourceId, {
        $set: {
          [`${updatePath}.status`]: 'QUEUED',
          [`${updatePath}.jobId`]: jobId,
          [`${updatePath}.updatedAt`]: new Date(),
          [`${updatePath}.error`]: null,
        },
      });
    }

    await AuditLog.create({
      collectionName: 'AIJob',
      documentId: newJob._id,
      action: 'retry',
      actor: req.user.id,
      actorRole: req.user.role,
      after: { jobId, sourceType, sourceId, artifactType, status: 'QUEUED', attempt: newJob.attempt },
    });

    setImmediate(() => {
      aiWorker.processNextJob().catch((err) => {
        console.error('[AIWorker] Retry background execution error:', err.message);
      });
    });

    return res.status(202).json({
      jobId,
      status: 'QUEUED',
      artifactType,
      attempt: newJob.attempt,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
