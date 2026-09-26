// src/controllers/notificationController.js
// REST endpoints: list, unread count, mark read, mark all read, delete

const Notification = require('../models/Notification');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// ── GET /api/notifications?page=1&limit=20 ────────────────────────────────────
const getNotifications = asyncHandler(async (req, res) => {
  const page  = Math.max(parseInt(req.query.page,  10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const skip  = (page - 1) * limit;

  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.isRead = false;

  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('complaint', 'title referenceId status'),
    Notification.countDocuments(filter),
  ]);

  return sendPaginated(res, notifications, total, page, limit);
});

// ── GET /api/notifications/unread-count ──────────────────────────────────────
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead:    false,
  });
  return sendSuccess(res, { count });
});

// ── PUT /api/notifications/:id/read ──────────────────────────────────────────
const markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notif) return sendError(res, 'Notification not found', 404);
  return sendSuccess(res, { notification: notif }, 'Marked as read');
});

// ── PUT /api/notifications/read-all ──────────────────────────────────────────
const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );
  return sendSuccess(res, { updated: result.modifiedCount }, 'All marked as read');
});

// ── DELETE /api/notifications/:id ────────────────────────────────────────────
const deleteNotification = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndDelete({
    _id: req.params.id, recipient: req.user._id,
  });
  if (!notif) return sendError(res, 'Notification not found', 404);
  return sendSuccess(res, {}, 'Notification deleted');
});

// ── DELETE /api/notifications  (clear all) ───────────────────────────────────
const clearAll = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipient: req.user._id });
  return sendSuccess(res, {}, 'All notifications cleared');
});

module.exports = {
  getNotifications, getUnreadCount,
  markRead, markAllRead,
  deleteNotification, clearAll,
};
