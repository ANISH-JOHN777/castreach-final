const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['booking_request', 'booking_confirmed', 'booking_cancelled',
             'message', 'review', 'review_received', 'review_updated', 'badge', 'profile_view', 'match',
             'payment_confirmed', 'payment_released', 'payment_refunded',
             'podcast_created', 'episode_published', 'episode_unpublished',
             'transcript_ready', 'transcript_failed',
             'ai_content_ready', 'ai_content_failed'],
      required: true,
    },
    title:   { type: String, required: true },
    body:    { type: String },
    link:    { type: String },          // relative URL e.g. /bookings/123
    isRead:  { type: Boolean, default: false },
    meta:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
