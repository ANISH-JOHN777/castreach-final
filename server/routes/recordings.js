const express    = require('express');
const router     = express.Router();
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const Booking    = require('../models/Booking');
const verifyToken = require('../middleware/verifyToken');
const { createDailyRoom, createMeetingToken } = require('../services/daily');
const renderWorker = require('../worker/renderWorker');
const realtimeServer = require('../services/realtimeServer');

// ── POST /api/recordings/token — generate short-lived Daily meeting token ───
router.post('/token', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isHost  = booking.host.toString()  === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;

    if (!isHost && !isGuest) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Token generation requires a confirmed booking' });
    }

    let roomUrl = booking.dailyRoomUrl;
    if (!roomUrl) {
      try {
        const roomRes = await createDailyRoom(booking._id.toString(), booking.slotEnd);
        roomUrl = roomRes.roomUrl;
      } catch (err) {
        roomUrl = `https://castreach.daily.co/room-${booking._id}`;
      }
      booking.dailyRoomUrl = roomUrl;
      await booking.save();
    }

    const roomName = `castreach-${booking._id}`;
    const { token } = await createMeetingToken(roomName, isHost, 3600);

    res.json({
      success: true,
      token,
      roomUrl,
      isOwner: isHost,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/recordings/room — create Daily.co room ─────────────────────────
router.post('/room', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id);
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    // Paid sessions require the escrow hold before the room opens (BLK-2).
    if (booking.amountCents > 0 && booking.paymentStatus !== 'held') {
      return res.status(402).json({ error: 'Payment required before joining the recording room' });
    }
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be confirmed first' });
    }

    const { roomUrl } = await createDailyRoom(booking._id.toString(), booking.slotEnd);

    booking.dailyRoomUrl = roomUrl;
    await booking.save();

    res.json({ url: roomUrl });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

const storageService = require('../services/storage');
const requireAdmin = require('../middleware/requireAdmin');

// ── GET /api/recordings — admin: list operational recordings & render jobs ────
router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { recordingStatus, renderStatus, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (recordingStatus) filter.recordingStatus = recordingStatus;
    if (renderStatus) filter['recordingEdit.renderStatus'] = renderStatus;

    const pg  = Math.max(1, parseInt(page,  10));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [recordings, total] = await Promise.all([
      Booking.find(filter)
        .select('recordingStatus recordingReady recordingDuration recordingStartedAt recordingStoppedAt recordingStorage recordingEdit host guest')
        .populate('host', 'name avatar')
        .populate('guest', 'name avatar')
        .sort({ updatedAt: -1 })
        .skip((pg - 1) * lim)
        .limit(lim),
      Booking.countDocuments(filter),
    ]);

    res.json({ success: true, recordings, total, page: pg, limit: lim });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId — get recording URL & storage ──────────────
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const hasEdit = booking.recordingEdit && booking.recordingEdit.updatedAt;
    res.json({
      recordingStatus:    booking.recordingStatus || (booking.recordingReady ? 'READY' : 'NOT_STARTED'),
      recordingReady:     booking.recordingReady,
      recordingUrl:       booking.recordingUrl,
      recordingStartedAt: booking.recordingStartedAt,
      recordingStoppedAt: booking.recordingStoppedAt,
      recordingReadyAt:   booking.recordingReadyAt,
      recordingDuration:  booking.recordingDuration,
      recordingEdit:      hasEdit ? booking.recordingEdit : null,
      recordingStorage:   booking.recordingStorage || null,
      hostEndRequested:   booking.hostEndRequested || false,
      hostEndRequestedAt: booking.hostEndRequestedAt || null,
      guestEndRequested:  booking.guestEndRequested || false,
      guestEndRequestedAt:booking.guestEndRequestedAt || null,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/session-end-request ──────────────────────
router.post('/:bookingId/session-end-request', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isHost  = booking.host.toString()  === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;

    if (!isHost && !isGuest && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Only booking participants can request ending the session' });
    }

    const now = new Date();
    if (isHost) {
      booking.hostEndRequested = true;
      booking.hostEndRequestedAt = now;
    } else if (isGuest) {
      booking.guestEndRequested = true;
      booking.guestEndRequestedAt = now;
    }

    const bothRequested = booking.hostEndRequested && booking.guestEndRequested;

    if (bothRequested) {
      booking.recordingStatus = 'PROCESSING';
      await booking.save();

      realtimeServer.broadcastToBooking(booking._id.toString(), 'session:end_confirmed', {
        bookingId: booking._id.toString(),
        confirmedBy: req.user.id,
        timestamp: now.toISOString(),
      });

      return res.json({
        success: true,
        sessionEnded: true,
        hostEndRequested: booking.hostEndRequested,
        guestEndRequested: booking.guestEndRequested,
        recordingStatus: booking.recordingStatus,
      });
    } else {
      await booking.save();

      realtimeServer.broadcastToBooking(booking._id.toString(), 'session:end_requested', {
        bookingId: booking._id.toString(),
        requestedBy: req.user.id,
        requestedRole: isHost ? 'host' : 'guest',
        timestamp: now.toISOString(),
      });

      return res.json({
        success: true,
        sessionEnded: false,
        hostEndRequested: booking.hostEndRequested,
        guestEndRequested: booking.guestEndRequested,
        recordingStatus: booking.recordingStatus,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/session-end-decline ──────────────────────
router.post('/:bookingId/session-end-decline', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest].some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    booking.hostEndRequested = false;
    booking.guestEndRequested = false;
    await booking.save();

    realtimeServer.broadcastToBooking(booking._id.toString(), 'session:end_cancelled', {
      bookingId: booking._id.toString(),
      cancelledBy: req.user.id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      hostEndRequested: false,
      guestEndRequested: false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId/storage-url — get signed storage URL ──────
router.get('/:bookingId/storage-url', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const accessUrl = storageService.getSignedStorageUrl(booking, true);

    res.json({
      success: true,
      bookingId: booking._id,
      storageStatus: booking.recordingStorage?.status || 'NOT_STORED',
      provider: booking.recordingStorage?.provider || 'local',
      objectKey: booking.recordingStorage?.objectKey || null,
      accessUrl,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/retry-storage — retry failed storage copy ─
router.post('/:bookingId/retry-storage', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    if (!booking.recordingUrl) {
      return res.status(400).json({ error: 'Source recording URL is missing; cannot mirror to storage' });
    }

    booking.recordingStorage = {
      provider: process.env.STORAGE_PROVIDER || (process.env.STORAGE_BUCKET ? 'r2' : 'local'),
      objectKey: `recordings/${booking._id}/original/source.mp4`,
      status: 'STORING',
      contentType: 'video/mp4',
      storedAt: new Date(),
    };
    await booking.save();

    try {
      const storageMeta = await storageService.mirrorRecording(booking._id.toString(), booking.recordingUrl);
      booking.recordingStorage = {
        provider: storageMeta.provider,
        objectKey: storageMeta.objectKey,
        status: 'READY',
        contentType: storageMeta.contentType,
        sizeBytes: storageMeta.sizeBytes,
        storedAt: storageMeta.storedAt,
        error: undefined,
      };
      await booking.save();

      res.json({
        success: true,
        bookingId: booking._id,
        recordingStorage: booking.recordingStorage,
      });
    } catch (err) {
      booking.recordingStorage.status = 'FAILED';
      booking.recordingStorage.error = err.message;
      await booking.save();

      res.status(500).json({
        error: `Storage copy failed: ${err.message}`,
        recordingStorage: booking.recordingStorage,
      });
    }
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId/edit — get saved EDL ──────────────────────
router.get('/:bookingId/edit', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const hasEdit = booking.recordingEdit && booking.recordingEdit.updatedAt;
    res.json({
      success: true,
      bookingId: booking._id,
      recordingStatus: booking.recordingStatus || (booking.recordingReady ? 'READY' : 'NOT_STARTED'),
      sourceDurationSeconds: booking.recordingDuration || null,
      edit: hasEdit ? booking.recordingEdit : null,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/edit — save non-destructive EDL ───────────
router.post('/:bookingId/edit', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const isReady = booking.recordingStatus === 'READY' || booking.recordingReady === true;
    if (!isReady) {
      return res.status(400).json({ error: 'Recording must be READY before saving edit instructions' });
    }

    let { trimStartSeconds, trimEndSeconds, musicTrack, musicVolume } = req.body;
    if (trimStartSeconds === undefined || trimStartSeconds === null || trimEndSeconds === undefined || trimEndSeconds === null) {
      return res.status(400).json({ error: 'trimStartSeconds and trimEndSeconds are required' });
    }

    trimStartSeconds = Number(trimStartSeconds);
    trimEndSeconds = Number(trimEndSeconds);

    if (isNaN(trimStartSeconds) || isNaN(trimEndSeconds)) {
      return res.status(400).json({ error: 'Trim values must be valid numbers' });
    }

    if (trimStartSeconds < 0) {
      return res.status(400).json({ error: 'trimStartSeconds cannot be negative' });
    }

    if (trimEndSeconds <= trimStartSeconds) {
      return res.status(400).json({ error: 'trimEndSeconds must be greater than trimStartSeconds' });
    }

    if (booking.recordingDuration && trimEndSeconds > booking.recordingDuration) {
      return res.status(400).json({ error: `trimEndSeconds cannot exceed recording duration (${booking.recordingDuration}s)` });
    }

    const editedDurationSeconds = Number((trimEndSeconds - trimStartSeconds).toFixed(2));

    booking.recordingEdit = {
      trimStartSeconds,
      trimEndSeconds,
      editedDurationSeconds,
      musicTrack: musicTrack || 'none',
      musicVolume: musicVolume !== undefined ? Number(musicVolume) : 20,
      updatedAt: new Date(),
      updatedBy: req.user.id,
    };

    await booking.save();

    res.json({
      success: true,
      bookingId: booking._id,
      recordingStatus: booking.recordingStatus,
      edit: booking.recordingEdit,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── DELETE /api/recordings/:bookingId/edit — reset EDL edit ─────────────────
router.delete('/:bookingId/edit', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const isReady = booking.recordingStatus === 'READY' || booking.recordingReady === true;
    if (!isReady) {
      return res.status(400).json({ error: 'Recording must be READY to reset edit instructions' });
    }

    await Booking.findByIdAndUpdate(booking._id, { $unset: { recordingEdit: 1 } });

    res.json({
      success: true,
      bookingId: booking._id,
      edit: null,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/render — request asynchronous FFmpeg render ─
router.post('/:bookingId/render', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const isReady = booking.recordingStatus === 'READY' || booking.recordingReady === true;
    if (!isReady) {
      return res.status(400).json({ error: 'Recording lifecycle status must be READY before rendering' });
    }

    if (!booking.recordingStorage || booking.recordingStorage.status !== 'READY') {
      return res.status(400).json({ error: 'Persistent original recording storage is not READY' });
    }

    const edit = booking.recordingEdit;
    if (!edit || edit.trimStartSeconds === undefined || edit.trimEndSeconds === undefined) {
      return res.status(400).json({ error: 'Valid C3.1 EDL edit instructions (trimStartSeconds, trimEndSeconds) are required before rendering' });
    }

    if (edit.trimStartSeconds < 0 || edit.trimEndSeconds <= edit.trimStartSeconds) {
      return res.status(400).json({ error: 'Invalid EDL trim boundaries' });
    }

    // Compute EDL fingerprint hash
    const sourceKey = booking.recordingStorage.objectKey || 'source.mp4';
    const fingerprintStr = `${sourceKey}:${edit.trimStartSeconds}:${edit.trimEndSeconds}`;
    const fingerprint = crypto.createHash('sha256').update(fingerprintStr).digest('hex');

    // Idempotency Checks
    if (['QUEUED', 'PROCESSING'].includes(edit.renderStatus)) {
      return res.status(202).json({
        success: true,
        bookingId: booking._id,
        renderStatus: edit.renderStatus,
        renderJobId: edit.renderJobId,
        message: 'Render job is already in progress',
      });
    }

    if (edit.renderStatus === 'READY' && edit.outputFingerprint === fingerprint) {
      const accessUrl = storageService.getSignedOutputUrl(booking, true);
      return res.status(200).json({
        success: true,
        bookingId: booking._id,
        renderStatus: 'READY',
        renderJobId: edit.renderJobId,
        outputObjectKey: edit.outputObjectKey,
        outputSizeBytes: edit.outputSizeBytes,
        accessUrl,
        message: 'Rendered output for this EDL is already available',
      });
    }

    const renderJobId = `job_${crypto.randomBytes(8).toString('hex')}`;
    booking.recordingEdit.renderStatus = 'QUEUED';
    booking.recordingEdit.renderJobId = renderJobId;
    booking.recordingEdit.renderRequestedAt = new Date();
    booking.recordingEdit.outputFingerprint = fingerprint;
    booking.recordingEdit.renderError = undefined;

    await booking.save();

    // Trigger worker asynchronously in background (non-test environments)
    if (process.env.NODE_ENV !== 'test') {
      setImmediate(() => {
        renderWorker.processNextJob().catch((err) => {
          console.error('Async renderWorker execution warning:', err.message);
        });
      });
    }

    res.status(202).json({
      success: true,
      bookingId: booking._id,
      renderJobId,
      renderStatus: 'QUEUED',
      message: 'Render job queued successfully',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId/render — get rendered recording status & URL ─
router.get('/:bookingId/render', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const edit = booking.recordingEdit;
    if (!edit || !edit.renderStatus || edit.renderStatus === 'NOT_REQUESTED') {
      return res.json({
        success: true,
        bookingId: booking._id,
        renderStatus: 'NOT_REQUESTED',
        renderJobId: null,
      });
    }

    if (edit.renderStatus === 'READY') {
      const accessUrl = storageService.getSignedOutputUrl(booking, true);
      return res.json({
        success: true,
        bookingId: booking._id,
        renderStatus: 'READY',
        renderJobId: edit.renderJobId,
        outputObjectKey: edit.outputObjectKey,
        outputSizeBytes: edit.outputSizeBytes,
        completedAt: edit.renderCompletedAt,
        accessUrl,
      });
    }

    res.json({
      success: true,
      bookingId: booking._id,
      renderStatus: edit.renderStatus,
      renderJobId: edit.renderJobId,
      error: edit.renderError || null,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId/render-url — get signed URL for rendered recording ──
router.get('/:bookingId/render-url', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const edit = booking.recordingEdit;
    if (!edit || edit.renderStatus !== 'READY' || !edit.outputObjectKey) {
      return res.status(400).json({ error: 'Rendered recording is not READY' });
    }

    const accessUrl = storageService.getSignedOutputUrl(booking, true);
    res.json({
      success: true,
      bookingId: booking._id,
      renderStatus: 'READY',
      renderJobId: edit.renderJobId,
      outputObjectKey: edit.outputObjectKey,
      outputSizeBytes: edit.outputSizeBytes,
      accessUrl,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/render/retry — retry a FAILED render job ─────
router.post('/:bookingId/render/retry', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const edit = booking.recordingEdit;
    if (!edit || edit.renderStatus !== 'FAILED') {
      return res.status(400).json({ error: 'Only FAILED render jobs can be retried' });
    }

    const renderJobId = `job_${crypto.randomBytes(8).toString('hex')}`;
    booking.recordingEdit.renderStatus = 'QUEUED';
    booking.recordingEdit.renderJobId = renderJobId;
    booking.recordingEdit.renderRequestedAt = new Date();
    booking.recordingEdit.renderError = undefined;

    await booking.save();

    if (process.env.NODE_ENV !== 'test') {
      setImmediate(() => {
        renderWorker.processNextJob().catch((err) => {
          console.error('Async renderWorker execution warning:', err.message);
        });
      });
    }

    res.status(202).json({
      success: true,
      bookingId: booking._id,
      renderJobId,
      renderStatus: 'QUEUED',
      message: 'Render job retry queued successfully',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/upload — upload recorded session blob ─────
router.post('/:bookingId/upload', verifyToken, express.raw({ type: ['video/webm', 'video/mp4', 'application/octet-stream'], limit: '100mb' }), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Empty recording payload' });
    }

    const targetDir = path.join(process.cwd(), 'scratch', 'storage', 'recordings', booking._id.toString(), 'original');
    await fs.promises.mkdir(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, 'source.mp4');
    await fs.promises.writeFile(targetPath, buffer);

    booking.recordingReady = true;
    booking.recordingStatus = 'READY';
    booking.recordingStorage = {
      provider: 'local',
      objectKey: `recordings/${booking._id}/original/source.mp4`,
      status: 'READY',
      sizeBytes: buffer.length,
      contentType: 'video/mp4',
      storedAt: new Date(),
    };
    await booking.save();

    res.json({
      success: true,
      bookingId: booking._id,
      recordingStorage: booking.recordingStorage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/recordings/:bookingId/stop — stop recording session ─────────────
router.post('/:bookingId/stop', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    if (booking.recordingStatus !== 'READY') {
      booking.recordingStatus = 'PROCESSING';
    }
    await booking.save();

    res.json({ success: true, bookingId: booking._id, recordingStatus: booking.recordingStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId/storage-file — stream original MP4 ─────────
router.get('/:bookingId/storage-file', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '') || req.cookies?.refreshToken;
    let userId = null;
    let userRole = 'guest';

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_jwt_secret_32_chars_minimum_len');
        userId = decoded.id;
        userRole = decoded.role;
      } catch { /* proceed */ }
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Recording not found' });

    if (userId) {
      const isParticipant = [booking.host, booking.guest].some((id) => id.toString() === userId) || userRole === 'admin';
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
    }

    const filePath = path.join(process.cwd(), 'scratch', 'storage', 'recordings', booking._id.toString(), 'original', 'source.mp4');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Recording video file not found on disk' });
    }

    const stat = await fs.promises.stat(filePath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `inline; filename="recording_${booking._id}.mp4"`,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/recordings/:bookingId/output-file — stream rendered edited MP4 ─────
router.get('/:bookingId/output-file', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Recording not found' });

    const edit = booking.recordingEdit;
    if (!edit || !edit.outputObjectKey) {
      return res.status(404).json({ error: 'Edited output recording not found' });
    }

    const filePath = path.join(process.cwd(), 'scratch', 'storage', edit.outputObjectKey);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Edited output file not found on disk' });
    }

    const stat = await fs.promises.stat(filePath);
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
      'Content-Disposition': `inline; filename="edited_${booking._id}.mp4"`,
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
