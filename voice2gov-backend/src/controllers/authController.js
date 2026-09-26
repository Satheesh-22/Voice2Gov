// src/controllers/authController.js
// Handles user registration, login, and profile management

const jwt  = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ── Generate signed JWT ──────────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return sendError(res, 'Validation failed', 400, errors.array());

  const { name, email, password, phone, role, department } = req.body;

  // Prevent self-promotion to admin
  const safeRole = role === 'admin' ? 'citizen' : (role || 'citizen');

  const existing = await User.findOne({ email });
  if (existing) return sendError(res, 'Email already registered', 409);

  const user = await User.create({
    name, email, password, phone,
    role: safeRole,
    department: safeRole === 'department' ? department : undefined,
  });

  logger.info(`New user registered: ${email} (${safeRole})`);

  return sendSuccess(
    res,
    { user, token: generateToken(user._id) },
    'Registration successful',
    201
  );
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return sendError(res, 'Validation failed', 400, errors.array());

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password)))
    return sendError(res, 'Invalid email or password', 401);

  if (!user.isActive)
    return sendError(res, 'Account has been deactivated', 401);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info(`User logged in: ${email}`);

  return sendSuccess(
    res,
    { user, token: generateToken(user._id) },
    'Login successful'
  );
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  return sendSuccess(res, { user }, 'Profile fetched');
});

// ── PUT /api/auth/me ─────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true, runValidators: true,
  });

  return sendSuccess(res, { user }, 'Profile updated');
});

// ── PUT /api/auth/password ───────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return sendError(res, 'Both currentPassword and newPassword are required', 400);

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword)))
    return sendError(res, 'Current password is incorrect', 401);

  user.password = newPassword;
  await user.save();

  return sendSuccess(res, {}, 'Password changed successfully');
});

module.exports = { register, login, getMe, updateProfile, changePassword };
