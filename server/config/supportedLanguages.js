/**
 * Centralized Supported Languages Configuration for Live Subtitles & Translation.
 */

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
];

function isLanguageSupported(code) {
  if (!code) return false;
  return SUPPORTED_LANGUAGES.some((l) => l.code === code.toLowerCase());
}

function getLanguageLabel(code) {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code?.toLowerCase());
  return lang ? lang.label : code;
}

module.exports = {
  SUPPORTED_LANGUAGES,
  isLanguageSupported,
  getLanguageLabel,
};
