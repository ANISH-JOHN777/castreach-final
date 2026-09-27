const mongoose = require('mongoose');

const podcastSchema = new mongoose.Schema(
  {
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
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    coverImage: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    tenantId: {
      type: String,
      default: 'castreach',
      index: true,
    },
  },
  { timestamps: true }
);

podcastSchema.index({ status: 1, category: 1, language: 1 });
podcastSchema.index({ tags: 1 });
podcastSchema.index(
  { title: 'text', description: 'text', tags: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'podcasts_text_search' }
);

module.exports = mongoose.model('Podcast', podcastSchema);
