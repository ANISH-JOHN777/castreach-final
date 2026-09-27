const util = require('util');

/**
 * Phase E8 Production-Grade Structured Logger & Redactor
 * Automatically redacts passwords, JWT tokens, Stripe secrets, API keys, and cookie headers.
 */

const SENSITIVE_KEYS = [
  'password',
  'jwt',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'stripe_secret_key',
  'stripe_webhook_secret',
  'anthropic_api_key',
  'daily_api_key',
  'aws_secret_access_key',
  'credit_card',
  'cvv',
];

function redactObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatMessage(level, message, meta = {}) {
  const sanitizedMeta = redactObject(meta);
  const logEntry = {
    timestamp: new Date().toISOString(),
    severity: level.toUpperCase(),
    service: 'castreach-api',
    message: typeof message === 'string' ? message : util.inspect(message),
    ...(Object.keys(sanitizedMeta).length > 0 && { meta: sanitizedMeta }),
  };

  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(logEntry);
  }

  return `[${logEntry.timestamp}] [${logEntry.severity}] ${logEntry.message} ${
    Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta) : ''
  }`;
}

const logger = {
  info: (msg, meta) => console.log(formatMessage('info', msg, meta)),
  warn: (msg, meta) => console.warn(formatMessage('warn', msg, meta)),
  error: (msg, meta) => console.error(formatMessage('error', msg, meta)),
  redact: redactObject,
};

module.exports = logger;
