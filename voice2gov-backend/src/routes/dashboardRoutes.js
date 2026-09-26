// src/routes/dashboardRoutes.js

const express = require('express');
const {
  getSummary, getByCategory, getByPriority,
  getByStatus, getTrend, getRecent,
} = require('../controllers/dashboardController');
const { protect, authorise } = require('../middleware/auth');

const router = express.Router();

// Dashboard accessible to admin and department staff
router.use(protect, authorise('admin', 'department'));

router.get('/summary',     getSummary);
router.get('/by-category', getByCategory);
router.get('/by-priority', getByPriority);
router.get('/by-status',   getByStatus);
router.get('/trend',       getTrend);
router.get('/recent',      getRecent);

module.exports = router;
