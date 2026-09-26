// src/models/Complaint.js
// Core complaint schema with AI analysis fields, file attachments, and timeline

const mongoose = require('mongoose');

// ── Sub-schema: status update entry (timeline) ───────────────────────────────
const StatusUpdateSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['Submitted', 'Acknowledged', 'In Progress', 'Resolved', 'Rejected', 'Escalated'],
      required: true,
    },
    note: { type: String, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String },
  },
  { timestamps: true }
);

// ── Sub-schema: AI analysis result ──────────────────────────────────────────
const AIAnalysisSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: [
        'Infrastructure',
        'Water Supply',
        'Electricity',
        'Sanitation',
        'Noise',
        'Safety',
        'General',
      ],
      default: 'General',
    },
    department: { type: String },
    priority: {
      label: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium',
      },
      score: { type: Number, min: 1, max: 10, default: 5 },
    },
    sentiment: {
      type: String,
      enum: ['Highly negative', 'Negative', 'Neutral', 'Positive'],
      default: 'Neutral',
    },
    keywords: [{ type: String }],
    summary: { type: String },
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
    processedBy: {
      type: String,
      enum: ['rule-based', 'ml-model', 'ai-api'],
      default: 'rule-based',
    },
  },
  { _id: false }
);

// ── Sub-schema: file attachment ──────────────────────────────────────────────
const AttachmentSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    type: { type: String, enum: ['image', 'video', 'audio', 'document'] },
  },
  { _id: false }
);

// ── Main complaint schema ────────────────────────────────────────────────────
const ComplaintSchema = new mongoose.Schema(
  {
    // Auto-generated readable reference ID: C-YYYYMMDD-XXXX
    referenceId: {
      type: String,
      unique: true,
      index: true,
    },

    // Submission details
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    inputType: {
      type: String,
      enum: ['text', 'voice', 'image', 'video'],
      default: 'text',
    },
    location: {
      address: { type: String, trim: true },
      coordinates: {
        lat: Number,
        lng: Number,
      },
      pincode: String,
    },

    // Who submitted
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // AI analysis
    aiAnalysis: { type: AIAnalysisSchema, default: () => ({}) },

    // Current status & history
    status: {
      type: String,
      enum: ['Submitted', 'Acknowledged', 'In Progress', 'Resolved', 'Rejected', 'Escalated'],
      default: 'Submitted',
      index: true,
    },
    statusHistory: [StatusUpdateSchema],

    // Assigned department staff
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedDepartment: { type: String },

    // File attachments (images, voice recordings, video)
    attachments: [AttachmentSchema],

    // Resolution
    resolvedAt: Date,
    resolutionNote: String,

    // Citizen feedback after resolution
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },

    // Soft-delete
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: time to resolve (hours) ────────────────────────────────────────
ComplaintSchema.virtual('resolutionTimeHours').get(function () {
  if (!this.resolvedAt) return null;
  return Math.round(
    (this.resolvedAt - this.createdAt) / (1000 * 60 * 60)
  );
});

// ── Indexes for common queries ───────────────────────────────────────────────
ComplaintSchema.index({ 'aiAnalysis.category': 1 });
ComplaintSchema.index({ 'aiAnalysis.priority.label': 1 });
ComplaintSchema.index({ createdAt: -1 });
ComplaintSchema.index({ submittedBy: 1, status: 1 });

// ── Pre-save: generate referenceId ──────────────────────────────────────────
ComplaintSchema.pre('save', function (next) {
  if (!this.referenceId) {
    const date = new Date();
    const datePart =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.referenceId = `C-${datePart}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('Complaint', ComplaintSchema);
