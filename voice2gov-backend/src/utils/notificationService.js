// src/utils/notificationService.js
// Central service for creating + emitting notifications.
// Called from complaint controller on key events.

const Notification = require('../models/Notification');
const { emitToUser, emitToAdmins, emitToDept } = require('../config/socket');
const logger = require('../config/logger');

// ── Build a safe payload for the socket (no Mongoose ObjectIds) ──────────────
const toPayload = (doc) => ({
  _id:        doc._id.toString(),
  type:       doc.type,
  title:      doc.title,
  message:    doc.message,
  referenceId: doc.referenceId,
  complaintId: doc.complaint?.toString(),
  isRead:     false,
  createdAt:  doc.createdAt,
});

// ── Notify a specific citizen (saves to DB + emits) ──────────────────────────
const notifyUser = async ({ recipientId, type, title, message, complaintId, referenceId }) => {
  try {
    const notif = await Notification.create({
      recipient:   recipientId,
      type, title, message,
      complaint:   complaintId,
      referenceId,
    });
    emitToUser(recipientId, 'notification:new', toPayload(notif));
    return notif;
  } catch (err) {
    logger.warn(`notifyUser failed: ${err.message}`);
  }
};

// ── Broadcast to all admins (no DB record — too many admins) ─────────────────
const broadcastToAdmins = (payload) => {
  try {
    emitToAdmins('notification:new', { ...payload, isRead: false, createdAt: new Date() });
  } catch (err) {
    logger.warn(`broadcastToAdmins failed: ${err.message}`);
  }
};

// ── Broadcast to a department room ───────────────────────────────────────────
const broadcastToDept = (dept, payload) => {
  try {
    emitToDept(dept, 'notification:new', { ...payload, isRead: false, createdAt: new Date() });
  } catch (err) {
    logger.warn(`broadcastToDept(${dept}) failed: ${err.message}`);
  }
};

// ── Icon / colour hints (used by the frontend) ───────────────────────────────
const TYPE_META = {
  new_complaint: { icon: '📋', color: 'blue'   },
  status_update: { icon: '🔄', color: 'amber'  },
  resolved:      { icon: '✅', color: 'green'  },
  escalated:     { icon: '🚨', color: 'red'    },
  assigned:      { icon: '👤', color: 'purple' },
};

module.exports = { notifyUser, broadcastToAdmins, broadcastToDept, TYPE_META };
