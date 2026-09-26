// src/controllers/dashboardController.js
// Analytics and reporting endpoints for the admin dashboard

const Complaint = require('../models/Complaint');
const User      = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// ── GET /api/dashboard/summary ───────────────────────────────────────────────
const getSummary = asyncHandler(async (req, res) => {
  const base = { isDeleted: false };

  // Department filter for non-admin staff
  if (req.user.role === 'department')
    base.assignedDepartment = req.user.department;

  const [
    total, open, inProgress, resolved, rejected, critical,
  ] = await Promise.all([
    Complaint.countDocuments(base),
    Complaint.countDocuments({ ...base, status: 'Submitted' }),
    Complaint.countDocuments({ ...base, status: 'In Progress' }),
    Complaint.countDocuments({ ...base, status: 'Resolved' }),
    Complaint.countDocuments({ ...base, status: 'Rejected' }),
    Complaint.countDocuments({ ...base, 'aiAnalysis.priority.label': 'Critical' }),
  ]);

  // Average resolution time (hours) for resolved complaints
  const resolvedComplaints = await Complaint.find({
    ...base, status: 'Resolved', resolvedAt: { $exists: true },
  }).select('createdAt resolvedAt');

  const avgResolutionHours = resolvedComplaints.length
    ? Math.round(
        resolvedComplaints.reduce(
          (sum, c) => sum + (c.resolvedAt - c.createdAt) / (1000 * 60 * 60), 0
        ) / resolvedComplaints.length
      )
    : null;

  return sendSuccess(res, {
    total, open, inProgress, resolved, rejected, critical,
    avgResolutionHours,
  }, 'Dashboard summary');
});

// ── GET /api/dashboard/by-category ──────────────────────────────────────────
const getByCategory = asyncHandler(async (req, res) => {
  const base = { isDeleted: false };
  if (req.user.role === 'department')
    base.assignedDepartment = req.user.department;

  const data = await Complaint.aggregate([
    { $match: base },
    { $group: { _id: '$aiAnalysis.category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return sendSuccess(res, data.map((d) => ({ category: d._id, count: d.count })));
});

// ── GET /api/dashboard/by-priority ──────────────────────────────────────────
const getByPriority = asyncHandler(async (req, res) => {
  const base = { isDeleted: false };
  if (req.user.role === 'department')
    base.assignedDepartment = req.user.department;

  const data = await Complaint.aggregate([
    { $match: base },
    { $group: { _id: '$aiAnalysis.priority.label', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return sendSuccess(res, data.map((d) => ({ priority: d._id, count: d.count })));
});

// ── GET /api/dashboard/by-status ─────────────────────────────────────────────
const getByStatus = asyncHandler(async (req, res) => {
  const base = { isDeleted: false };
  if (req.user.role === 'department')
    base.assignedDepartment = req.user.department;

  const data = await Complaint.aggregate([
    { $match: base },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return sendSuccess(res, data.map((d) => ({ status: d._id, count: d.count })));
});

// ── GET /api/dashboard/trend?days=30 ─────────────────────────────────────────
// Daily complaint submission count over last N days
const getTrend = asyncHandler(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 30, 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const base = { isDeleted: false, createdAt: { $gte: since } };
  if (req.user.role === 'department')
    base.assignedDepartment = req.user.department;

  const data = await Complaint.aggregate([
    { $match: base },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return sendSuccess(res, data.map((d) => ({ date: d._id, count: d.count })));
});

// ── GET /api/dashboard/recent?limit=5 ────────────────────────────────────────
const getRecent = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  const base  = { isDeleted: false };
  if (req.user.role === 'department')
    base.assignedDepartment = req.user.department;

  const complaints = await Complaint.find(base)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('submittedBy', 'name email');

  return sendSuccess(res, { complaints });
});

module.exports = {
  getSummary, getByCategory, getByPriority, getByStatus, getTrend, getRecent,
};
