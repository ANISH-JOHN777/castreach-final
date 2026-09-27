const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { authLimiter } = require('../middleware/rateLimit');
const Booking = require('../models/Booking');
const liveCaptionSessionManager = require('../services/liveCaptionSessionManager');
const translationService = require('../services/translationService');
const { isLanguageSupported } = require('../config/supportedLanguages');

/**
 * Phase E4 — Live Captions & Multilingual Translation Routes
 * Session initialization, segment ingestion, real-time translation, and completion.
 */

/**
 * Helper: Authorize booking participant (Host, Guest, or Admin).
 */
async function authorizeBookingParticipant(bookingId, reqUser) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw { status: 404, message: 'Booking not found.' };
  }

  const isHost = booking.host.toString() === reqUser.id;
  const isGuest = booking.guest.toString() === reqUser.id;
  const isAdmin = reqUser.role === 'admin';

  if (!isHost && !isGuest && !isAdmin) {
    throw { status: 403, message: 'Forbidden: You are not a participant in this booking session.' };
  }

  if (['cancelled', 'disputed'].includes(booking.status)) {
    throw { status: 400, message: `Cannot run live captions for booking in ${booking.status} status.` };
  }

  return booking;
}

// ── 1. POST /api/live-captions/:bookingId/session — Start/Join Session ───────
router.post('/:bookingId/session', verifyToken, authLimiter, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { sourceLanguage = 'en' } = req.body;

    if (!isLanguageSupported(sourceLanguage)) {
      return res.status(400).json({ error: `Unsupported source language code: ${sourceLanguage}` });
    }

    await authorizeBookingParticipant(bookingId, req.user);

    const session = liveCaptionSessionManager.getOrCreateSession(bookingId, { sourceLanguage });

    res.status(200).json({
      success: true,
      session: {
        sessionId: session.sessionId,
        bookingId: session.bookingId,
        status: session.status,
        enabled: session.enabled,
        sourceLanguage: session.sourceLanguage,
        startedAt: session.startedAt,
      },
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── 2. GET /api/live-captions/:bookingId/session — Get Session Status ───────
router.get('/:bookingId/session', verifyToken, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    await authorizeBookingParticipant(bookingId, req.user);

    const status = liveCaptionSessionManager.getSessionStatus(bookingId);
    if (!status) {
      return res.json({ success: true, enabled: false, status: 'DISABLED' });
    }

    res.json({ success: true, session: status });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── 3. POST /api/live-captions/:bookingId/segment — Ingest & Broadcast ─────
router.post('/:bookingId/segment', verifyToken, authLimiter, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { text, speakerName, speakerId, start, end, language, isFinal, targetLanguage } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Caption text is required.' });
    }

    await authorizeBookingParticipant(bookingId, req.user);

    const processedSegment = await liveCaptionSessionManager.processAndTranslateSegment(
      bookingId,
      {
        text,
        speakerName: speakerName || req.user.name || 'Participant',
        speakerId: speakerId || req.user.id,
        start,
        end,
        language: language || 'en',
        isFinal: isFinal !== undefined ? isFinal : true,
      },
      targetLanguage || null
    );

    res.status(201).json({
      success: true,
      segment: processedSegment,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── 4. POST /api/live-captions/:bookingId/translate — Translate Final Segment
router.post('/:bookingId/translate', verifyToken, authLimiter, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { segmentId, text, sourceLanguage = 'en', targetLanguage } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Caption text is required for translation.' });
    }

    if (!targetLanguage || !isLanguageSupported(targetLanguage)) {
      return res.status(400).json({ error: `Unsupported target language code: ${targetLanguage}` });
    }

    await authorizeBookingParticipant(bookingId, req.user);

    const result = await translationService.translateSegment({
      segmentId,
      text,
      sourceLanguage,
      targetLanguage,
    });

    res.json({
      success: true,
      segmentId,
      translatedText: result.translatedText,
      targetLanguage: result.targetLanguage,
      cached: result.cached,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// ── 5. POST /api/live-captions/:bookingId/complete — Complete & Persist Session
router.post('/:bookingId/complete', verifyToken, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    await authorizeBookingParticipant(bookingId, req.user);

    const completed = await liveCaptionSessionManager.completeSession(bookingId);

    res.json({
      success: true,
      message: 'Live caption session completed and persisted.',
      session: completed
        ? {
            sessionId: completed.sessionId,
            segmentCount: completed.segments.length,
            objectKey: completed.objectKey,
          }
        : null,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
