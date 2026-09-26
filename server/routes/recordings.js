const router      = require('express').Router();
const crypto      = require('crypto');
const Booking     = require('../models/Booking');
const verifyToken = require('../middleware/verifyToken');
const { createDailyRoom, createMeetingToken } = require('../services/daily');
const renderWorker = require('../worker/renderWorker');

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
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
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

    let { trimStartSeconds, trimEndSeconds } = req.body;
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

module.exports = router;
