// src/routes/notificationRoutes.js
const express = require('express');
const {
  getNotifications, getUnreadCount,
  markRead, markAllRead,
  deleteNotification, clearAll,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);   // all notification routes require auth

router.get('/',               getNotifications);
router.get('/unread-count',   getUnreadCount);
router.put('/read-all',       markAllRead);
router.delete('/',            clearAll);
router.put('/:id/read',       markRead);
router.delete('/:id',         deleteNotification);

module.exports = router;
