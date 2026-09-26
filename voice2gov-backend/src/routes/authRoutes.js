// src/routes/authRoutes.js

const express  = require('express');
const { body } = require('express-validator');
const {
  register, login, getMe, updateProfile, changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── Validation rules ─────────────────────────────────────────────────────────
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/register', registerRules, register);
router.post('/login', loginRules, login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
