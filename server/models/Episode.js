const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema(
  {
    podcast: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Podcast',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    showNotes: {
      type: String,
      default: '',
      trim: true,
    },
    episodeNumber: {
      type: Number,
      default: 1,
    },
    seasonNumber: {
      type: Number,
      default: 1,
    },
    coverImage: {
      type: String,
      default: '',
    },
    mediaObjectKey: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['audio', 'video', 'both'],
      default: 'video',
    },
    duration: {
      type: Number,
      default: 0,
    },
    recordingSource: {
      booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
      sourceType: {
        type: String,
        enum: ['original', 'edited', 'custom'],
        default: 'edited',
      },
      objectKey: {
        type: String,
        default: '',
      },
    },
    status: {
      type: String,
      enum: ['DRAFT', 'READY', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    tenantId: {
      type: String,
      default: 'castreach',
      index: true,
    },
    // Phase E2 Podcast Episode Transcription Metadata
    transcription: {
      status: {
        type: String,
        enum: ['NOT_REQUESTED', 'QUEUED', 'PROCESSING', 'READY', 'FAILED'],
        default: 'NOT_REQUESTED',
        index: true,
      },
      jobId:               { type: String },
      sourceType:          { type: String, default: 'episode' },
      sourceObjectKey:     { type: String },
      language:            { type: String, default: 'en' },
      durationSeconds:     { type: Number, default: 0 },
      provider:            { type: String, default: 'whisper' },
      transcriptObjectKey: { type: String },
      segmentCount:        { type: Number, default: 0 },
      requestedAt:         { type: Date },
      startedAt:           { type: Date },
      completedAt:         { type: Date },
      failedAt:            { type: Date },
      error:               { type: String },
      attempt:             { type: Number, default: 0 },
      fingerprint:         { type: String },
    },
    // Phase E3 AI Podcast Intelligence Metadata
    aiContent: {
      type: Map,
      of: new mongoose.Schema(
        {
          status: {
            type: String,
            enum: ['NOT_REQUESTED', 'QUEUED', 'PROCESSING', 'READY', 'FAILED'],
            default: 'NOT_REQUESTED',
          },
          jobId: { type: String },
          artifactObjectKey: { type: String },
          updatedAt: { type: Date },
          error: { type: String },
        },
        { _id: false }
      ),
      default: {},
    },
  },
  { timestamps: true }
);

// Compound index for unique episode slug per podcast
episodeSchema.index({ podcast: 1, slug: 1 }, { unique: true });
episodeSchema.index({ status: 1, createdAt: -1 });
episodeSchema.index(
  { title: 'text', description: 'text', showNotes: 'text' },
  { weights: { title: 10, description: 5, showNotes: 1 }, name: 'episodes_text_search' }
);

module.exports = mongoose.model('Episode', episodeSchema);
