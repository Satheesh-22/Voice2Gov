// src/models/Notification.js
// Stores persistent notifications per user

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['new_complaint', 'status_update', 'resolved', 'escalated', 'assigned'],
      required: true,
    },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    referenceId: { type: String },
    isRead:  { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound index: quickly fetch unread count per user
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
