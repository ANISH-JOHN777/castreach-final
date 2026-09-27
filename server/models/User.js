const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, select: false },
    role:       { type: String, enum: ['host', 'guest', 'admin'], default: 'guest' },
    avatar:     { type: String, default: '' },
    bio:        { type: String, maxlength: 500, default: '' },
    expertise:  [{ type: String, trim: true }],           // e.g. ["AI", "Startups"]
    interests:  [{ type: String, trim: true }],           // e.g. ["Podcasting", "Tech"]
    languages:  [{ type: String, trim: true, default: ['en'] }], // E4 supported language codes
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'PUBLIC', 'PRIVATE'],
      default: 'public',
      index: true,
    },
    podcastName:{ type: String, default: '' },             // for hosts
    podcastUrl: { type: String, default: '' },
    sessionRateCents: { type: Number, default: 0, min: 0 }, // host's per-session price; 0 = free
    socialLinks:{
      twitter:   { type: String, default: '' },
      linkedin:  { type: String, default: '' },
      website:   { type: String, default: '' },
    },
    avgRating:      { type: Number, default: 0 },
    totalReviews:   { type: Number, default: 0 },
    ratingDistribution: { type: Object, default: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    responseRate:   { type: Number, default: 0 },          // 0–1
    avgResponseTime:{ type: Number, default: 0 },          // minutes
    badges:         [{ type: String }],
    stripeAccountId:{ type: String, select: false },       // Stripe Connect for hosts
    refreshToken:   { type: String, select: false },
    isOnboarded:    { type: Boolean, default: false },
    isBlocked:      { type: Boolean, default: false, index: true },
    tenantId:       { type: String, default: 'castreach', index: true },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method — compare plain password to hash
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.stripeAccountId;
  return obj;
};

// BUG-2: text index for full-text search on GET /users?q=
// Weights: name (10) > expertise (5) > bio (1). Mongoose creates this on
// startup in dev; in production run migration 001_users_text_index.
userSchema.index(
  { name: 'text', bio: 'text', expertise: 'text' },
  { weights: { name: 10, expertise: 5, bio: 1 }, name: 'users_text_search' }
);

// Compound index for fast discovery filtering
userSchema.index({ role: 1, profileVisibility: 1, isBlocked: 1 });
userSchema.index({ languages: 1 });
userSchema.index({ expertise: 1 });

module.exports = mongoose.model('User', userSchema);
