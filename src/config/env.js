require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';

// Never boot with a known/guessable signing key. In production a missing secret
// is fatal; in development we fall back to a labelled insecure value with a warning.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production — refusing to start.');
  }
  JWT_SECRET = 'dev-insecure-secret';
  // eslint-disable-next-line no-console
  console.warn('[config] JWT_SECRET is not set — using an INSECURE development fallback.');
}

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  PORT: parseInt(process.env.PORT, 10) || 4000,
  NODE_ENV,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

module.exports = env;
