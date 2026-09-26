// src/server.js
// Entry point — loads env, connects DB, creates HTTP server, attaches Socket.io

require('dotenv').config();
const http           = require('http');
const app            = require('./app');
const connectDB      = require('./config/db');
const logger         = require('./config/logger');
const { initSocket } = require('./config/socket');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Wrap Express in an HTTP server so Socket.io can share the same port
  const server = http.createServer(app);

  // Attach Socket.io to HTTP server
  initSocket(server);

  server.listen(PORT, () => {
    logger.info(`🚀  Voice2Gov API  → http://localhost:${PORT}/api  [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`🔔  Socket.io      → ws://localhost:${PORT}`);
    logger.info(`📋  Health check   → http://localhost:${PORT}/api/health`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
    shutdown('unhandledRejection');
  });
};

startServer();

// touch: restart trigger for nodemon when running automated tests
