// src/routes/aiRoutes.js
const express = require('express');
const { getStatus, chat, reanalyze } = require('../controllers/aiController');
const { protect, authorise } = require('../middleware/auth');

const router = express.Router();

// Status is public (no auth needed to check if external AI is enabled)
router.get('/status', getStatus);

// Chat — any authenticated user
router.post('/chat', protect, chat);

// Re-analyze — admin or department only
router.post('/reanalyze/:id', protect, authorise('admin', 'department'), reanalyze);

module.exports = router;
