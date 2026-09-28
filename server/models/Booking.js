const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    host:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    guest:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    slotStart: { type: Date, required: true },
    slotEnd:   { type: Date, required: true },
    topics:    [{ type: String }],
    message:   { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'disputed'],
      default: 'pending',
    },
    // Stripe escrow
    stripePaymentIntentId: { type: String, select: false },
    amountCents:           { type: Number, default: 0 },    // amount in cents
    currency:              { type: String, default: 'usd' },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'held', 'release_pending', 'released', 'refunded', 'disputed', 'failed'],
      default: 'unpaid',
    },
    // Phase D1 Payment Confirmation & Escrow Completion
    hostConfirmedCompletion:  { type: Boolean, default: false },
    hostConfirmedAt:          { type: Date },
    guestConfirmedCompletion: { type: Boolean, default: false },
    guestConfirmedAt:         { type: Date },
    paymentReleasedAt:        { type: Date },
    paymentRefundedAt:        { type: Date },
    paymentDisputedAt:        { type: Date },
    stripeTransferId:         { type: String },
    stripeRefundId:           { type: String },
    // Recording
    dailyRoomUrl:       { type: String },
    recordingUrl:       { type: String },
    recordingReady:     { type: Boolean, default: false },
    recordingStatus:    {
      type: String,
      enum: ['NOT_STARTED', 'RECORDING', 'PROCESSING', 'READY', 'FAILED'],
      default: 'NOT_STARTED',
    },
    recordingStartedAt: { type: Date },
    recordingStoppedAt: { type: Date },
    recordingReadyAt:   { type: Date },
    recordingDuration:  { type: Number },
    // Phase E7 Mutual Session End State
    hostEndRequested:   { type: Boolean, default: false },
    hostEndRequestedAt: { type: Date },
    guestEndRequested:  { type: Boolean, default: false },
    guestEndRequestedAt:{ type: Date },
    // Phase C3.1 Non-Destructive Recording Edit (EDL Metadata)
    recordingEdit: {
      trimStartSeconds:      { type: Number, default: 0 },
      trimEndSeconds:        { type: Number },
      editedDurationSeconds: { type: Number },
      updatedAt:             { type: Date },
      updatedBy:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      // Phase C3.3 FFmpeg Render Job Metadata
      renderStatus: {
        type: String,
        enum: ['NOT_REQUESTED', 'QUEUED', 'PROCESSING', 'READY', 'FAILED'],
        default: 'NOT_REQUESTED',
      },
      renderJobId:       { type: String },
      renderRequestedAt: { type: Date },
      renderStartedAt:   { type: Date },
      renderCompletedAt: { type: Date },
      renderFailedAt:    { type: Date },
      renderError:       { type: String },
      outputObjectKey:   { type: String },
      outputSizeBytes:   { type: Number },
      outputFingerprint: { type: String },
      renderDurationSeconds: { type: Number },
    },
    // Phase C3.2 Persistent Recording Storage Metadata
    recordingStorage: {
      provider:        { type: String, default: 'r2' },
      objectKey:       { type: String },
      status:          { type: String, enum: ['NOT_STORED', 'STORING', 'READY', 'FAILED'], default: 'NOT_STORED' },
      contentType:     { type: String, default: 'video/mp4' },
      sizeBytes:       { type: Number },
      durationSeconds: { type: Number },
      storedAt:        { type: Date },
      error:           { type: String },
    },
    // BUG-4: timestamp set when host first responds (confirm or cancel).
    // Used to compute avgResponseTime and responseRate on User.
    respondedAt: { type: Date },
    // Review
    hostReview:  {
      rating:  { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
    },
    guestReview: {
      rating:  { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
    },
    // Phase E2 Podcast Transcription Metadata
    transcription: {
      status: {
        type: String,
        enum: ['NOT_REQUESTED', 'QUEUED', 'PROCESSING', 'READY', 'FAILED'],
        default: 'NOT_REQUESTED',
        index: true,
      },
      jobId:               { type: String },
      sourceType:          { type: String, enum: ['original', 'edited', 'episode'], default: 'original' },
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

// Overlap detection indexes
bookingSchema.index({ host: 1, slotStart: 1, slotEnd: 1 });
bookingSchema.index({ guest: 1, slotStart: 1 });

// BUG-7: unique partial index prevents two active bookings for the same host
// starting at the identical time, even under concurrent writes. The transaction
// in routes/bookings.js catches overlapping ranges; this catches exact-same-slot
// races that snapshot isolation alone cannot prevent.
bookingSchema.index(
  { host: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
    name: 'unique_active_slot_per_host',
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
