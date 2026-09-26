// src/controllers/complaintController.js
// Full complaint lifecycle: submit → AI analysis → status updates → resolution

const { validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const { analyzeComplaint }         = require('../utils/nlpEngine');
const { analyzeWithService }       = require('../utils/nlpService');
const { analyzeWithAI }            = require('../utils/aiService');
const { notifyUser, broadcastToAdmins, broadcastToDept } = require('../utils/notificationService');

// ── Analysis priority chain ───────────────────────────────────────────────────
// 1. External AI provider (best accuracy) — when AI_API_KEY and provider settings are set
// 2. Python NLP service                     — when NLP_SERVICE_URL is set
// 3. JS rule-based engine                   — always-available fallback
const runNLP = async (text, title) => {
  if (process.env.AI_API_KEY && process.env.EXTERNAL_AI_HOST && process.env.EXTERNAL_AI_PATH) return analyzeWithAI(text, title);
  if (process.env.NLP_SERVICE_URL)   return analyzeWithService(text, title);
  return analyzeComplaint(text, title);
};
const { annotateFileType } = require('../middleware/upload');
const { sendSuccess, sendError, sendPaginated } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ── POST /api/complaints  (submit new complaint) ─────────────────────────────
const submitComplaint = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return sendError(res, 'Validation failed', 400, errors.array());

  const { title, description, inputType, address, lat, lng, pincode } = req.body;

  // 1. Run NLP / AI analysis (Python service or JS fallback)
  const aiResult = await runNLP(description, title);

  // 2. Process uploaded files (if any)
  const attachments = req.files ? annotateFileType(req.files) : [];

  // 3. Build complaint document
  const complaint = await Complaint.create({
    title,
    description,
    inputType: inputType || 'text',
    location: {
      address: address || '',
      coordinates: { lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined },
      pincode,
    },
    submittedBy: req.user._id,
    aiAnalysis: {
      category:    aiResult.category,
      department:  aiResult.department,
      priority:    aiResult.priority,
      sentiment:   aiResult.sentiment,
      keywords:    aiResult.keywords,
      summary:     aiResult.summary,
      confidence:  aiResult.confidence,
      processedBy: aiResult.processedBy,
    },
    assignedDepartment: aiResult.department,
    attachments,
    statusHistory: [{
      status:      'Submitted',
      note:        'Complaint received and analysed by AI',
      updatedBy:   req.user._id,
      updatedByName: req.user.name,
    }],
  });

  logger.info(`Complaint submitted: ${complaint.referenceId} by ${req.user.email}`);

  // ── Real-time: notify admins and relevant department ────────────────────
  const notifPayload = {
    type:        'new_complaint',
    title:       `New ${aiResult.priority.label} complaint`,
    message:     `"${title}" — routed to ${aiResult.department}`,
    referenceId: complaint.referenceId,
    complaintId: complaint._id.toString(),
  };
  broadcastToAdmins(notifPayload);
  broadcastToDept(aiResult.department, notifPayload);

  return sendSuccess(res, { complaint }, 'Complaint submitted successfully', 201);
});

// ── GET /api/complaints  (list — filtered, paginated) ────────────────────────
const getComplaints = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 10, status, category, priority,
    search, sortBy = 'createdAt', order = 'desc',
  } = req.query;

  const filter = { isDeleted: false };

  // Citizens see only their own complaints
  if (req.user.role === 'citizen') filter.submittedBy = req.user._id;

  // Department staff see only their department's complaints
  if (req.user.role === 'department')
    filter.assignedDepartment = req.user.department;

  if (status)   filter.status = status;
  if (category) filter['aiAnalysis.category'] = category;
  if (priority) filter['aiAnalysis.priority.label'] = priority;
  if (search)   filter.$text = { $search: search };

  const skip  = (Number(page) - 1) * Number(limit);
  const sort  = { [sortBy]: order === 'asc' ? 1 : -1 };

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('submittedBy', 'name email phone')
      .populate('assignedTo', 'name email'),
    Complaint.countDocuments(filter),
  ]);

  return sendPaginated(res, complaints, total, page, limit);
});

// ── GET /api/complaints/:id ──────────────────────────────────────────────────
const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('submittedBy', 'name email phone')
    .populate('assignedTo', 'name email')
    .populate('statusHistory.updatedBy', 'name');

  if (!complaint || complaint.isDeleted)
    return sendError(res, 'Complaint not found', 404);

  // Citizens can only view their own
  if (
    req.user.role === 'citizen' &&
    complaint.submittedBy._id.toString() !== req.user._id.toString()
  ) {
    return sendError(res, 'Not authorised to view this complaint', 403);
  }

  return sendSuccess(res, { complaint });
});

// ── PUT /api/complaints/:id/status  (admin / department only) ────────────────
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const VALID = ['Acknowledged', 'In Progress', 'Resolved', 'Rejected', 'Escalated'];
  if (!VALID.includes(status))
    return sendError(res, `Invalid status. Must be one of: ${VALID.join(', ')}`, 400);

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.isDeleted)
    return sendError(res, 'Complaint not found', 404);

  complaint.status = status;
  complaint.statusHistory.push({
    status,
    note: note || '',
    updatedBy: req.user._id,
    updatedByName: req.user.name,
  });

  if (status === 'Resolved') {
    complaint.resolvedAt = new Date();
    complaint.resolutionNote = note || '';
  }

  await complaint.save();
  logger.info(`${complaint.referenceId} → ${status} by ${req.user.email}`);

  // ── Real-time: notify the citizen who submitted the complaint ───────────
  const isResolved = status === 'Resolved';
  await notifyUser({
    recipientId: complaint.submittedBy,
    type:        isResolved ? 'resolved' : 'status_update',
    title:       isResolved
                   ? `✅ Complaint resolved`
                   : `🔄 Complaint ${status}`,
    message:     isResolved
                   ? `"${complaint.title}" has been resolved. ${note ? `Note: ${note}` : 'Thank you for reporting!'}`
                   : `"${complaint.title}" is now ${status}.${note ? ` Note: ${note}` : ''}`,
    complaintId: complaint._id,
    referenceId: complaint.referenceId,
  });

  return sendSuccess(res, { complaint }, 'Status updated');
});

// ── POST /api/complaints/:id/feedback ────────────────────────────────────────
const submitFeedback = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5)
    return sendError(res, 'Rating must be between 1 and 5', 400);

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.isDeleted)
    return sendError(res, 'Complaint not found', 404);

  if (complaint.submittedBy.toString() !== req.user._id.toString())
    return sendError(res, 'Not authorised', 403);

  if (complaint.status !== 'Resolved')
    return sendError(res, 'Feedback can only be submitted for resolved complaints', 400);

  complaint.feedback = { rating: Number(rating), comment, submittedAt: new Date() };
  await complaint.save();

  return sendSuccess(res, { feedback: complaint.feedback }, 'Feedback submitted');
});

// ── DELETE /api/complaints/:id  (soft-delete, admin only) ────────────────────
const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return sendError(res, 'Complaint not found', 404);

  complaint.isDeleted = true;
  await complaint.save();

  return sendSuccess(res, {}, 'Complaint deleted');
});

// ── POST /api/complaints/analyze  (analyse without saving) ───────────────────
const analyzeOnly = asyncHandler(async (req, res) => {
  const { text, title } = req.body;
  if (!text && !title)
    return sendError(res, 'Provide text or title to analyze', 400);

  const result = await runNLP(text || '', title || '');
  return sendSuccess(res, result, 'Analysis complete');
});

module.exports = {
  submitComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  submitFeedback,
  deleteComplaint,
  analyzeOnly,
};
