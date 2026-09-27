const Availability = require('../models/Availability');
const Podcast = require('../models/Podcast');
const { getLanguageLabel } = require('../config/supportedLanguages');

/**
 * Phase E5 — Deterministic Host/Guest Matching Engine
 * Calculates multi-dimensional compatibility scores and data-grounded explanations.
 */

/**
 * Calculate Jaccard similarity index between two arrays of strings (case-insensitive).
 */
function calculateSetOverlap(arr1 = [], arr2 = []) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return { score: 0, common: [] };

  const set1 = new Set(arr1.map((s) => String(s).trim().toLowerCase()).filter(Boolean));
  const set2 = new Set(arr2.map((s) => String(s).trim().toLowerCase()).filter(Boolean));

  if (set1.size === 0 || set2.size === 0) return { score: 0, common: [] };

  const common = [];
  for (const item of set1) {
    if (set2.has(item)) {
      common.push(item);
    }
  }

  const unionSize = new Set([...set1, ...set2]).size;
  const score = unionSize === 0 ? 0 : common.length / unionSize;

  return { score, common };
}

/**
 * Calculate availability window overlaps.
 */
function checkAvailabilityOverlap(avail1, avail2) {
  if (!avail1 || !avail2) {
    return { state: 'UNKNOWN', overlappingSlotsCount: 0 };
  }

  const slots1 = avail1.slots || [];
  const slots2 = avail2.slots || [];

  if (slots1.length === 0 && slots2.length === 0) {
    if (avail1.start || avail2.start) {
      return { state: 'AVAILABLE', overlappingSlotsCount: 1 };
    }
    return { state: 'UNKNOWN', overlappingSlotsCount: 0 };
  }

  let overlapCount = 0;
  for (const s1 of slots1) {
    for (const s2 of slots2) {
      if (s1.dayOfWeek === s2.dayOfWeek) {
        if (s1.startTime < s2.endTime && s1.endTime > s2.startTime) {
          overlapCount++;
        }
      }
    }
  }

  if (overlapCount > 0) {
    return { state: 'AVAILABLE', overlappingSlotsCount: overlapCount };
  }

  return { state: 'NO_OVERLAP', overlappingSlotsCount: 0 };
}

/**
 * Calculate deterministic compatibility score between host and guest entities.
 * Supports both positional (hostEntity, guestEntity) and destructured params.
 */
function calculateMatchScore(arg1, arg2) {
  let hostUser, guestUser, hostPodcast, hostAvail, guestAvail;

  if (arg1 && arg1.user && arg2 && arg2.user) {
    hostUser = arg1.user;
    hostPodcast = arg1.podcast;
    hostAvail = arg1.availability;
    guestUser = arg2.user;
    guestAvail = arg2.availability;
  } else if (arg1 && (arg1.requester || arg1.hostEntity)) {
    if (arg1.hostEntity && arg1.guestEntity) {
      hostUser = arg1.hostEntity.user;
      hostPodcast = arg1.hostEntity.podcast;
      hostAvail = arg1.hostEntity.availability;
      guestUser = arg1.guestEntity.user;
      guestAvail = arg1.guestEntity.availability;
    } else {
      const requester = arg1.requester || {};
      const target = arg1.target || {};
      const targetType = arg1.targetType || 'GUEST';
      const targetPodcasts = arg1.targetPodcasts || [];

      if (targetType === 'HOST') {
        hostUser = target;
        guestUser = requester;
        hostPodcast = targetPodcasts[0];
      } else {
        hostUser = requester;
        guestUser = target;
        hostPodcast = targetPodcasts[0];
      }
    }
  } else {
    hostUser = (arg1 && arg1.user) || arg1 || {};
    guestUser = (arg2 && arg2.user) || arg2 || {};
  }

  const reqExpertise = (hostUser && hostUser.expertise) || [];
  const reqInterests = (hostUser && hostUser.interests) || [];
  const reqLanguages = (hostUser && hostUser.languages) || ['en'];

  const tgtExpertise = (guestUser && guestUser.expertise) || [];
  const tgtInterests = (guestUser && guestUser.interests) || [];
  const tgtLanguages = (guestUser && guestUser.languages) || ['en'];

  // Topic overlap
  const combinedReqTopics = [...reqExpertise, ...reqInterests];
  const combinedTgtTopics = [...tgtExpertise, ...tgtInterests];
  const podcastTags = hostPodcast ? (hostPodcast.tags || []) : [];
  const allTgtTopics = [...combinedTgtTopics, ...podcastTags];

  const topicOverlap = calculateSetOverlap(combinedReqTopics, allTgtTopics);
  let topicScore = 40;
  if (topicOverlap.common.length > 0) {
    topicScore = Math.min(100, 50 + topicOverlap.common.length * 25);
  }

  // Language overlap
  const langOverlap = calculateSetOverlap(reqLanguages, tgtLanguages);
  const languageScore = langOverlap.common.length > 0 ? 100 : 20;

  // Category match
  let categoryScore = 50;
  let matchedCategories = [];
  if (hostPodcast && hostPodcast.category) {
    const catOverlap = calculateSetOverlap(combinedTgtTopics, [hostPodcast.category]);
    if (catOverlap.common.length > 0) {
      categoryScore = 100;
      matchedCategories = catOverlap.common;
    }
  }

  // Availability overlap
  const availResult = checkAvailabilityOverlap(hostAvail, guestAvail);
  let availabilityScore = 50;
  if (availResult.state === 'AVAILABLE') availabilityScore = 100;
  if (availResult.state === 'NO_OVERLAP') availabilityScore = 30;

  // Final weighted compatibility score
  const finalScore = Math.round(
    topicScore * 0.4 +
    languageScore * 0.3 +
    categoryScore * 0.15 +
    availabilityScore * 0.15
  );

  const factors = [];
  if (topicOverlap.common.length > 0) {
    factors.push(`Topics: ${topicOverlap.common.join(', ')}`);
  }
  if (langOverlap.common.length > 0) {
    factors.push(`Language Match (${langOverlap.common.join(', ')})`);
  }
  if (matchedCategories.length > 0) {
    factors.push(`Category Match (${matchedCategories.join(', ')})`);
  }
  if (availResult.state === 'AVAILABLE') {
    factors.push('Available overlap window');
  }

  const explanation = [];
  if (topicOverlap.common.length > 0) {
    explanation.push(`Topic overlap in ${topicOverlap.common.slice(0, 3).join(', ')}`);
  }
  if (langOverlap.common.length > 0) {
    const langLabels = langOverlap.common.map(getLanguageLabel).join(', ');
    explanation.push(`Both support ${langLabels}`);
  }
  if (matchedCategories.length > 0) {
    explanation.push(`Podcast category match: ${matchedCategories.join(', ')}`);
  }
  if (availResult.state === 'AVAILABLE') {
    explanation.push('Open calendar availability overlap');
  } else {
    explanation.push('Flexible availability schedule');
  }

  return {
    compatibilityScore: finalScore,
    factors,
    explanation: explanation.join(' · ') || 'Matched on general podcast profile compatibility',
    availabilityState: availResult.state,
  };
}

module.exports = {
  calculateSetOverlap,
  checkAvailabilityOverlap,
  calculateMatchScore,
  calculateMatch: calculateMatchScore,
};
