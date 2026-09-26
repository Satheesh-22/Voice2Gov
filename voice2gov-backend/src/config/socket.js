// src/config/socket.js
// Socket.io server — JWT authentication + room-based targeting
//
// Room strategy:
//   user:{userId}          — every authenticated user's personal room
//   room:admin             — all admin users
//   room:dept:{deptName}   — department staff for a specific dept

const { Server } = require('socket.io');
const jwt         = require('jsonwebtoken');
const User        = require('../models/User');
const logger      = require('./logger');

let io = null;   // singleton

// ── Initialise Socket.io (called once in server.js) ─────────────────────────
const initSocket = (httpServer) => {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin:      allowedOrigins,
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  60_000,
    pingInterval: 25_000,
  });

  // ── JWT authentication middleware ────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token
               || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) return next(new Error('AUTH_MISSING'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) return next(new Error('AUTH_INVALID'));
      socket.user = user;
      next();
    } catch {
      next(new Error('AUTH_INVALID'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { user } = socket;

    // Personal room — used for direct messages to a specific user
    socket.join(`user:${user._id}`);

    // Role-based rooms
    if (user.role === 'admin') {
      socket.join('room:admin');
    }
    if (user.role === 'department' && user.department) {
      socket.join(`room:dept:${user.department}`);
    }

    logger.info(`🔌 Socket connected: ${user.name} (${user.role}) [${socket.id}]`);

    // Acknowledge successful connection
    socket.emit('connected', {
      userId:  user._id,
      name:    user.name,
      role:    user.role,
    });

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: ${user.name} — ${reason}`);
    });

    socket.on('error', (err) => {
      logger.warn(`Socket error for ${user.name}: ${err.message}`);
    });
  });

  logger.info('🔔  Socket.io initialised');
  return io;
};

// ── Accessor used by notification service ────────────────────────────────────
const getIO = () => io;

// ── Helpers used by notification service ────────────────────────────────────
const emitToUser  = (userId, event, payload) =>
  io?.to(`user:${userId}`).emit(event, payload);

const emitToAdmins = (event, payload) =>
  io?.to('room:admin').emit(event, payload);

const emitToDept  = (dept, event, payload) =>
  io?.to(`room:dept:${dept}`).emit(event, payload);

module.exports = { initSocket, getIO, emitToUser, emitToAdmins, emitToDept };
