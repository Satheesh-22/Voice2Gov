// src/middleware/auth.js
// JWT authentication + role-based access control middleware

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { sendError } = require('../utils/responseHelper');

// ── Verify JWT and attach user to req ────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 'Not authorised — no token provided', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');

    if (!user)          return sendError(res, 'User not found', 401);
    if (!user.isActive) return sendError(res, 'Account deactivated', 401);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return sendError(res, 'Token expired — please log in again', 401);
    return sendError(res, 'Invalid token', 401);
  }
};

// ── Role guard factory ───────────────────────────────────────────────────────
// Usage: authorise('admin')  or  authorise('admin', 'department')
const authorise = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return sendError(
      res,
      `Role '${req.user.role}' is not authorised for this route`,
      403
    );
  }
  next();
};

module.exports = { protect, authorise };
