const { isLanguageSupported } = require('../config/supportedLanguages');

/**
 * Phase E4 — Live Caption Provider Abstraction
 * Normalizes speech-to-text events into standard CastReach caption segment structures.
 */

let segmentCounter = 1;

/**
 * Normalize raw speech event into a CastReach caption segment.
 * @param {Object} rawData
 * @param {string} [rawData.speakerId]
 * @param {string} [rawData.speakerName]
 * @param {number} [rawData.start]
 * @param {number} [rawData.end]
 * @param {string} rawData.text
 * @param {string} [rawData.language='en']
 * @param {boolean} [rawData.isFinal=true]
 * @param {number} [rawData.confidence]
 * @returns {Object} normalized caption segment
 */
function normalizeSegment(rawData) {
  if (!rawData || typeof rawData.text !== 'string') {
    throw new Error('Invalid segment data: text string is required.');
  }

  const id = rawData.id || `cap_seg_${Date.now()}_${segmentCounter++}`;
  const language = isLanguageSupported(rawData.language) ? rawData.language.toLowerCase() : 'en';
  const start = typeof rawData.start === 'number' ? Math.max(0, rawData.start) : 0;
  const end = typeof rawData.end === 'number' ? Math.max(start, rawData.end) : start + 3;
  const isFinal = typeof rawData.isFinal === 'boolean' ? rawData.isFinal : true;

  return {
    id,
    speakerId: rawData.speakerId || 'unknown_speaker',
    speakerName: rawData.speakerName || 'Speaker',
    start,
    end,
    text: rawData.text.trim(),
    language,
    isFinal,
    ...(typeof rawData.confidence === 'number' ? { confidence: rawData.confidence } : {}),
  };
}

/**
 * Generate mock live caption segments for testing or dev.
 * @param {string} speakerName
 * @param {string} text
 * @param {string} language
 * @returns {Object}
 */
function generateMockLiveSegment(speakerName = 'Host', text = 'Live CastReach caption text.', language = 'en') {
  return normalizeSegment({
    speakerId: 'mock_speaker_1',
    speakerName,
    text,
    language,
    start: 0,
    end: 3,
    isFinal: true,
  });
}

module.exports = {
  normalizeSegment,
  generateMockLiveSegment,
};
