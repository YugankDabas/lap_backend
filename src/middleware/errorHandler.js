const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Prisma known errors -> friendly codes
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with that unique value already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  const status = err.statusCode || 500;
  const body = { error: err.message || 'Internal server error' };
  if (err.details) body.details = err.details;
  if (status === 500 && env.NODE_ENV !== 'production') {
    body.stack = err.stack;
  }
  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
