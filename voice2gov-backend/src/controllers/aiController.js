// src/controllers/aiController.js
// Endpoints:
//   POST /api/ai/chat          — citizen assistant chat
//   POST /api/ai/reanalyze/:id — re-run AI analysis on an existing complaint
//   GET  /api/ai/status        — check if external AI is configured

const Complaint = require('../models/Complaint');
const { chatWithAI, analyzeWithAI } = require('../utils/aiService');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ── GET /api/ai/status ────────────────────────────────────────────────────────
const getStatus = asyncHandler(async (req, res) => {
  const configured = !!process.env.AI_API_KEY;
  return sendSuccess(res, {
    aiEnabled: configured,
    model:     configured ? process.env.AI_MODEL || 'ai-model-v1' : null,
    message:   configured
      ? 'External AI is active — complaints are analyzed by the configured AI service.'
      : 'External AI not configured. Set AI_API_KEY and provider settings in .env to enable.',
  });
});

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
// Body: { messages: [{role, content}], complaintId? }
const chat = asyncHandler(async (req, res) => {
  const { messages, complaintId } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return sendError(res, 'messages array is required', 400);
  }

  if (messages.length > 30) {
    return sendError(res, 'Maximum 30 messages per conversation', 400);
  }

  // Validate message shape
  const valid = messages.every(
    (m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim()
  );
  if (!valid) return sendError(res, 'Each message must have role (user|assistant) and content', 400);

  // Optionally load complaint context
  let context = null;
  if (complaintId) {
    try {
      const complaint = await Complaint.findById(complaintId).lean();
      if (complaint) context = { complaint };
    } catch { /* ignore bad id */ }
  }

  try {
    const { reply, model } = await chatWithAI(messages, context);
    logger.info(`[AI chat] user=${req.user.email} turns=${messages.length}`);
    return sendSuccess(res, { reply, model }, 'Chat response');
  } catch (err) {
    return sendError(res, 'AI assistant is temporarily unavailable. Please try again shortly.', 503);
  }
});

// ── POST /api/ai/reanalyze/:id ────────────────────────────────────────────────
// Re-runs AI analysis on an existing complaint and updates the DB record
const reanalyze = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint || complaint.isDeleted) return sendError(res, 'Complaint not found', 404);

  const aiResult = await analyzeWithAI(complaint.description, complaint.title);

  complaint.aiAnalysis = {
    category:    aiResult.category,
    department:  aiResult.department,
    priority:    aiResult.priority,
    sentiment:   aiResult.sentiment,
    keywords:    aiResult.keywords,
    summary:     aiResult.summary,
    confidence:  aiResult.confidence,
    processedBy: aiResult.processedBy,
  };
  complaint.assignedDepartment = aiResult.department;
  await complaint.save();

  logger.info(`[AI reanalyze] ${complaint.referenceId} → ${aiResult.category} by ${req.user.email}`);
  return sendSuccess(res, { complaint, aiAnalysis: aiResult }, 'Complaint reanalyzed with external AI');
});

module.exports = { getStatus, chat, reanalyze };
