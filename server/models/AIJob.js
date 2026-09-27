const mongoose = require('mongoose');

const aiJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['booking', 'episode'],
      required: true,
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Episode',
    },
    artifactType: {
      type: String,
      enum: [
        'SUMMARY',
        'SHOW_NOTES',
        'DESCRIPTION',
        'TITLE_SUGGESTIONS',
        'CHAPTERS',
        'KEY_TOPICS',
        'GUEST_BRIEF',
        'INTERVIEW_PREP',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'READY', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    provider: {
      type: String,
      default: 'anthropic',
    },
    model: {
      type: String,
      default: 'claude-3-5-haiku',
    },
    transcriptFingerprint: {
      type: String,
      required: true,
      index: true,
    },
    artifactObjectKey: {
      type: String,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    attempt: {
      type: Number,
      default: 1,
    },
    error: {
      type: String,
    },
    usage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
    },
    tenantId: {
      type: String,
      default: 'castreach',
      index: true,
    },
  },
  { timestamps: true }
);

aiJobSchema.index({ sourceType: 1, sourceId: 1, artifactType: 1 });

module.exports = mongoose.model('AIJob', aiJobSchema);
