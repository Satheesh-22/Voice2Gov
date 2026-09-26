// src/routes/complaintRoutes.js

const express  = require('express');
const { body } = require('express-validator');
const {
  submitComplaint, getComplaints, getComplaintById,
  updateComplaintStatus, submitFeedback, deleteComplaint, analyzeOnly,
} = require('../controllers/complaintController');
const { protect, authorise } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ── Validation rules ─────────────────────────────────────────────────────────
const submitRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
];

const statusRules = [
  body('status').notEmpty().withMessage('Status is required'),
];

// ── Routes ────────────────────────────────────────────────────────────────────

// Analyse text without saving (preview AI result)
router.post('/analyze', analyzeOnly);

// Submit a complaint (supports file uploads)
router.post('/', upload.array('attachments', 5), submitRules, submitComplaint);

// List complaints (filtered / paginated)
router.get('/', getComplaints);

// Single complaint detail
router.get('/:id', getComplaintById);

// Update status (admin + department staff only)
router.put(
  '/:id/status',
  authorise('admin', 'department'),
  statusRules,
  updateComplaintStatus
);

// Citizen feedback after resolution
router.post('/:id/feedback', submitFeedback);

// Soft-delete (admin only)
router.delete('/:id', authorise('admin'), deleteComplaint);

module.exports = router;
