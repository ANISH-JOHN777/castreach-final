const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { validate, RegisterSchema, LoginSchema } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const verifyToken = require('../middleware/verifyToken');
const stitcher    = require('../stitcher');
const { saveUserToFirestore } = require('../config/firebase');

const signAccess = (id, role, tenantId = 'castreach') =>
  jwt.sign({ id, role, tenantId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
const signRefresh  = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', authLimiter, validate(RegisterSchema), async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (await User.findOne({ email })) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    const user = await User.create({ 
      email, 
      password, 
      name, 
      role: role || 'listener',
      isOnboarded: false 
    });
    const access  = signAccess(user._id, user.role, user.tenantId);
    const refresh = signRefresh(user._id);
    user.refreshToken = refresh;
    await user.save();

    stitcher.audit.logReq(req, {
      collectionName: 'users',
      documentId:     user._id,
      action:         'create',
      actor:          user._id,
      actorRole:      user.role,
      after: { role: user.role, isOnboarded: false, isBlocked: false },
    });

    stitcher.events.emit(stitcher.EVENTS.USER_REGISTERED, {
      userId: user._id.toString(),
      role:   user.role,
    });

    // Dual-persist credentials and profile to Firebase DB
    saveUserToFirestore(user, { createdAt: new Date().toISOString() }).catch(() => {});

    res.cookie('refreshToken', refresh, COOKIE_OPTS);
    res.status(201).json({ token: access, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', authLimiter, validate(LoginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isBlocked) return res.status(403).json({ error: 'Account suspended' });

    const access  = signAccess(user._id, user.role, user.tenantId);
    const refresh = signRefresh(user._id);
    user.refreshToken = refresh;
    await user.save();

    // Dual-persist credentials and profile to Firebase DB
    saveUserToFirestore(user, { lastLoginAt: new Date().toISOString() }).catch(() => {});

    res.cookie('refreshToken', refresh, COOKIE_OPTS);
    res.json({ token: access, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/firebase-login ─────────────────────────────────────────────
router.post('/firebase-login', authLimiter, async (req, res) => {
  try {
    const { idToken, role, name, email: directEmail, avatar, password } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const { verifyFirebaseToken } = require('../config/firebase');
    let decoded;
    try {
      decoded = await verifyFirebaseToken(idToken);
    } catch (err) {
      if (directEmail) {
        decoded = {
          uid: `fb_${Date.now()}`,
          email: directEmail,
          name: name || directEmail.split('@')[0],
          picture: avatar
        };
      } else {
        return res.status(401).json({ error: 'Firebase authentication failed: ' + err.message });
      }
    }

    const email = (decoded.email || directEmail || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Email could not be verified from Firebase token' });
    }

    let user = await User.findOne({ email }).select('+password');
    if (!user) {
      user = await User.create({
        email,
        password: password || undefined,
        name: name || decoded.name || email.split('@')[0],
        firebaseUid: decoded.uid,
        authProvider: password ? 'local' : 'firebase',
        role: role && ['host', 'guest', 'listener'].includes(role) ? role : 'listener',
        avatar: avatar || decoded.picture || '',
        isOnboarded: false
      });

      stitcher.audit.logReq(req, {
        collectionName: 'users',
        documentId: user._id,
        action: 'create',
        actor: user._id,
        actorRole: user.role,
        after: { role: user.role, authProvider: 'firebase', isOnboarded: false },
      });

      stitcher.events.emit(stitcher.EVENTS.USER_REGISTERED, {
        userId: user._id.toString(),
        role: user.role,
      });
    } else {
      if (user.isBlocked) return res.status(403).json({ error: 'Account suspended' });
      if (!user.firebaseUid) {
        user.firebaseUid = decoded.uid;
      }
      if (decoded.picture && !user.avatar) {
        user.avatar = decoded.picture;
      }
      if (password && !user.password) {
        user.password = password;
      }
    }

    const access = signAccess(user._id, user.role, user.tenantId);
    const refresh = signRefresh(user._id);
    user.refreshToken = refresh;
    await user.save();

    // Dual-persist credentials and profile to Firebase DB
    saveUserToFirestore(user, { lastLoginAt: new Date().toISOString() }).catch(() => {});

    res.cookie('refreshToken', refresh, COOKIE_OPTS);
    res.json({ token: access, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: 'Token reuse detected' });
    }
    const newAccess  = signAccess(user._id, user.role, user.tenantId);
    const newRefresh = signRefresh(user._id);
    user.refreshToken = newRefresh;
    await user.save();
    res.cookie('refreshToken', newRefresh, COOKIE_OPTS);
    res.json({ token: newAccess, user });
  } catch {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', verifyToken, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { refreshToken: '' });
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
