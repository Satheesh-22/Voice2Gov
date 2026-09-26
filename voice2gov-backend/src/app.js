// src/app.js
// Express application setup — middleware, routes, security headers

const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const path        = require('path');

const authRoutes          = require('./routes/authRoutes');
const complaintRoutes     = require('./routes/complaintRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const aiRoutes            = require('./routes/aiRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl) in development
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── HTTP request logger ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.http(msg.trim()) },
    })
  );
}

// ── Global rate limiter ───────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests — please try again later.' },
});
app.use('/api', limiter);

// ── Static files (uploaded attachments) ──────────────────────────────────────
app.use(
  '/uploads',
  express.static(path.resolve(process.env.UPLOAD_PATH || './uploads'))
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Voice2Gov API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── API root (helpful landing) ───────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Voice2Gov API',
    endpoints: [
      '/api/health',
      '/api/auth',
      '/api/complaints',
      '/api/dashboard',
      '/api/notifications',
      '/api/ai',
    ],
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/complaints',   complaintRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai',           aiRoutes);

// ── 404 & global error handler ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
