const router = require('express').Router();
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Episode = require('../models/Episode');
const Podcast = require('../models/Podcast');
const verifyToken = require('../middleware/verifyToken');
const storageService = require('../services/storage');
const transcriptionWorker = require('../worker/transcriptionWorker');
const stitcher = require('../stitcher');

/**
 * Phase E2 Podcast Transcription API Routes
 */

// ── POST /api/transcriptions/booking/:bookingId — request booking transcription ─────────────
router.post('/booking/:bookingId', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Participant or admin authorization
    const isHost = booking.host.toString() === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to request transcription for this booking' });
    }

    // Verify eligible recording exists
    const sourceType = req.body.sourceType || (booking.recordingEdit?.renderStatus === 'READY' ? 'edited' : 'original');
    let sourceObjectKey = '';

    if (sourceType === 'edited' && booking.recordingEdit?.renderStatus === 'READY') {
      sourceObjectKey = booking.recordingEdit.outputObjectKey;
    } else if (booking.recordingStorage?.status === 'READY') {
      sourceObjectKey = booking.recordingStorage.objectKey;
    } else if (booking.recordingReady || booking.recordingStatus === 'READY') {
      sourceObjectKey = `recordings/${bookingId}/original/source.mp4`;
    } else {
      return res.status(400).json({ error: 'Booking recording asset is not ready for transcription' });
    }

    const language = (req.body.language || 'en').trim();
    const fingerprint = crypto
      .createHash('sha256')
      .update(`${bookingId}_${sourceObjectKey}_${language}`)
      .digest('hex');

    const tx = booking.transcription || {};

    // Re-use existing READY transcript if identical fingerprint
    if (tx.status === 'READY' && tx.fingerprint === fingerprint && tx.transcriptObjectKey) {
      return res.status(200).json({
        success: true,
        message: 'Existing transcript ready',
        jobId: tx.jobId,
        status: 'READY',
        transcription: tx,
      });
    }

    // Prevent duplicate active jobs
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

    booking.transcription = {
      status: 'QUEUED',
      jobId,
      sourceType,
      sourceObjectKey,
      language,
      provider: process.env.TRANSCRIPTION_PROVIDER || 'whisper',
      requestedAt: new Date(),
      attempt: 0,
      fingerprint,
    };

    await booking.save();

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId: booking._id,
      action: 'transcribe',
      actor: req.user.id,
      after: { jobId, status: 'QUEUED', sourceType },
    });

    // Trigger worker processing out-of-band
    setImmediate(() => {
      transcriptionWorker.processNextJob().catch(() => {});
    });

    res.status(202).json({
      success: true,
      jobId,
      status: 'QUEUED',
      transcription: booking.transcription,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/transcriptions/booking/:bookingId — get transcription status ───────
router.get('/booking/:bookingId', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isHost = booking.host.toString() === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view transcription for this booking' });
    }

    res.json({
      success: true,
      transcription: booking.transcription || { status: 'NOT_REQUESTED' },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/transcriptions/booking/:bookingId/content — get transcript content ─
router.get('/booking/:bookingId/content', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isHost = booking.host.toString() === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to access transcript content for this booking' });
    }

    const tx = booking.transcription;
    if (!tx || tx.status !== 'READY' || !tx.transcriptObjectKey) {
      return res.status(400).json({ error: 'Transcript is not ready' });
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

// ── POST /api/transcriptions/booking/:bookingId/retry — retry failed job ─────────
router.post('/booking/:bookingId/retry', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isHost = booking.host.toString() === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to retry transcription for this booking' });
    }

    const tx = booking.transcription || {};
    if (tx.status !== 'FAILED') {
      return res.status(400).json({ error: 'Only failed transcription jobs can be retried' });
    }

    const newJobId = `tx_${crypto.randomBytes(8).toString('hex')}`;

    booking.transcription.status = 'QUEUED';
    booking.transcription.jobId = newJobId;
    booking.transcription.requestedAt = new Date();
    booking.transcription.error = undefined;
    booking.transcription.failedAt = undefined;

    await booking.save();

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId: booking._id,
      action: 'retry',
      actor: req.user.id,
      after: { jobId: newJobId, status: 'QUEUED' },
    });

    setImmediate(() => {
      transcriptionWorker.processNextJob().catch(() => {});
    });

    res.status(202).json({
      success: true,
      jobId: newJobId,
      status: 'QUEUED',
      transcription: booking.transcription,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
