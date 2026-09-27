const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    title:    { type: String, trim: true, maxlength: 100, default: '' },
    comment:  { type: String, trim: true, maxlength: 1000, default: '' },
    status: {
      type: String,
      enum: ['PUBLISHED', 'HIDDEN', 'FLAGGED', 'REMOVED'],
      default: 'PUBLISHED',
      index: true,
    },
    reportedReason: { type: String, default: '' },
    reportedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedAt:     { type: Date },
    tenantId:       { type: String, default: 'castreach', index: true },
  },
  { timestamps: true }
);

// Prevent duplicate reviews per reviewer on the same booking
reviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

// Compound indexes for user reputation calculations and profile lookups
reviewSchema.index({ reviewee: 1, status: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
