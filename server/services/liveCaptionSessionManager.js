const storage = require('./storage');
const liveCaptionProvider = require('./liveCaptionProvider');
const translationService = require('./translationService');
const { isLanguageSupported } = require('../config/supportedLanguages');

/**
 * Phase E4 — Live Caption Session Manager
 * In-memory room-scoped session management, segment deduplication, out-of-order handling,
 * participant broadcasting, and batch storage persistence upon session completion.
 */

// In-memory active caption sessions map: bookingId -> Session Object
const activeSessions = new Map();

/**
 * Get or create an active live caption session for a booking.
 * @param {string} bookingId
 * @param {Object} options
 * @param {string} [options.sourceLanguage='en']
 * @returns {Object} session state
 */
function getOrCreateSession(bookingId, options = {}) {
  if (!bookingId) throw new Error('bookingId is required.');

  if (!activeSessions.has(bookingId)) {
    const sessionId = `live_sess_${bookingId}_${Date.now()}`;
    const sourceLanguage = isLanguageSupported(options.sourceLanguage) ? options.sourceLanguage : 'en';

    activeSessions.set(bookingId, {
      sessionId,
      bookingId,
      status: 'ACTIVE',
      enabled: true,
      sourceLanguage,
      startedAt: new Date(),
      segments: [], // Array of FINAL segments
      segmentIds: new Set(),
      subscribers: new Map(), // userId -> socket/connection reference
    });
  }

  const session = activeSessions.get(bookingId);
  if (options.sourceLanguage && isLanguageSupported(options.sourceLanguage)) {
    session.sourceLanguage = options.sourceLanguage;
  }
  return session;
}

/**
 * Ingest and process a raw or normalized caption segment into a session.
 * @param {string} bookingId
 * @param {Object} segmentInput
 * @returns {Promise<Object>} processed & normalized segment
 */
async function ingestSegment(bookingId, segmentInput) {
  const session = getOrCreateSession(bookingId);

  const segment = liveCaptionProvider.normalizeSegment(segmentInput);

  // Deduplicate segment ID
  if (session.segmentIds.has(segment.id)) {
    const existing = session.segments.find((s) => s.id === segment.id);
    return existing || segment;
  }

  // Handle out-of-order segments by inserting into sorted timestamp position
  if (segment.isFinal) {
    session.segmentIds.add(segment.id);
    session.segments.push(segment);
    // Keep segments sorted by start time
    session.segments.sort((a, b) => a.start - b.start);
  }

  return segment;
}

/**
 * Ingest, translate (if targetLanguage provided), and broadcast caption segment.
 * @param {string} bookingId
 * @param {Object} segmentInput
 * @param {string} [targetLanguage]
 * @returns {Promise<Object>}
 */
async function processAndTranslateSegment(bookingId, segmentInput, targetLanguage = null) {
  const segment = await ingestSegment(bookingId, segmentInput);

  if (targetLanguage && isLanguageSupported(targetLanguage) && segment.isFinal) {
    try {
      const translation = await translationService.translateSegment({
        segmentId: segment.id,
        text: segment.text,
        sourceLanguage: segment.language || 'en',
        targetLanguage,
      });
      segment.translatedText = translation.translatedText;
      segment.translatedLanguage = translation.targetLanguage;
    } catch (err) {
      console.warn(`[LiveCaptionSession] Translation error for segment ${segment.id}:`, err.message);
    }
  }

  return segment;
}

/**
 * Complete and terminate a live caption session, persisting final buffered segments.
 * @param {string} bookingId
 * @returns {Promise<Object|null>}
 */
async function completeSession(bookingId) {
  if (!activeSessions.has(bookingId)) return null;

  const session = activeSessions.get(bookingId);
  session.status = 'COMPLETED';
  session.endedAt = new Date();

  const objectKey = `transcripts/live/${bookingId}/${session.sessionId}.json`;
  const exportData = {
    type: 'LIVE_CAPTIONS', // Explicitly distinguished from E2 TRANSCRIPT
    bookingId,
    sessionId: session.sessionId,
    sourceLanguage: session.sourceLanguage,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    segmentCount: session.segments.length,
    segments: session.segments,
  };

  try {
    await storage.saveTranscriptJson(objectKey, exportData);
    session.objectKey = objectKey;
  } catch (err) {
    console.error(`[LiveCaptionSession] Failed to persist live captions for ${bookingId}:`, err.message);
  }

  activeSessions.delete(bookingId);
  return session;
}

/**
 * Get active session status summary.
 * @param {string} bookingId
 * @returns {Object|null}
 */
function getSessionStatus(bookingId) {
  if (!activeSessions.has(bookingId)) return null;
  const s = activeSessions.get(bookingId);
  return {
    sessionId: s.sessionId,
    bookingId: s.bookingId,
    status: s.status,
    enabled: s.enabled,
    sourceLanguage: s.sourceLanguage,
    segmentCount: s.segments.length,
    startedAt: s.startedAt,
  };
}

/**
 * List all active live caption sessions for admin inspection.
 * @returns {Array<Object>}
 */
function listActiveSessions() {
  const result = [];
  for (const [bookingId, session] of activeSessions.entries()) {
    result.push({
      bookingId,
      sessionId: session.sessionId,
      status: session.status,
      sourceLanguage: session.sourceLanguage,
      segmentCount: session.segments.length,
      startedAt: session.startedAt,
    });
  }
  return result;
}

function clearAllSessions() {
  activeSessions.clear();
}

module.exports = {
  getOrCreateSession,
  ingestSegment,
  processAndTranslateSegment,
  completeSession,
  getSessionStatus,
  listActiveSessions,
  clearAllSessions,
};
