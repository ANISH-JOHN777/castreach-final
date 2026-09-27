export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
];

export function isLanguageSupported(code) {
  if (!code) return false;
  return SUPPORTED_LANGUAGES.some((l) => l.code === code.toLowerCase());
}

export function getLanguageLabel(code) {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code?.toLowerCase());
  return lang ? lang.label : code;
}
