// src/middleware/errorHandler.js
// Global error handler + async wrapper

const logger = require('../config/logger');
const { sendError } = require('../utils/responseHelper');

// ── Wrap async route handlers to forward errors ──────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ── 404 for unmatched routes ─────────────────────────────────────────────────
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

// ── Central error handler ────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  logger.error(`${err.message} — ${req.method} ${req.originalUrl}`);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendError(res, messages.join('. '), 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(res, `Duplicate value for ${field}`, 409);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return sendError(res, `Invalid ID format: ${err.value}`, 400);
  }

  // JWT errors (already handled in auth middleware but safety net)
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, `File too large. Max size: ${process.env.MAX_FILE_SIZE_MB || 10} MB`, 413);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message    = statusCode === 500 ? 'Internal server error' : err.message;

  return sendError(res, message, statusCode);
};

module.exports = { asyncHandler, notFound, errorHandler };
