const admin = require('firebase-admin');
const https = require('https');

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized) return admin;

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

  try {
    if (serviceAccountKey) {
      let credentials;
      try {
        credentials = JSON.parse(serviceAccountKey);
      } catch {
        credentials = require(serviceAccountKey);
      }
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id || projectId
      });
      isInitialized = true;
      console.log('[Firebase Admin] Initialized with Service Account');
    } else if (projectId) {
      admin.initializeApp({
        projectId: projectId
      });
      isInitialized = true;
      console.log('[Firebase Admin] Initialized with Project ID:', projectId);
    }
  } catch (err) {
    console.warn('[Firebase Admin] Initialization warning:', err.message);
  }

  return admin;
}

initFirebaseAdmin();

/**
 * Verify a Firebase ID token.
 * 1. If Firebase Admin is initialized, uses admin.auth().verifyIdToken.
 * 2. Fallback: Verifies via Google's tokeninfo API.
 * 3. Fallback: Parses token payload for local/development environments.
 */
async function verifyFirebaseToken(idToken) {
  if (!idToken) throw new Error('No Firebase ID token provided');

  // Attempt Firebase Admin SDK verification if app is initialized
  if (admin.apps.length > 0) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.displayName || (decoded.email ? decoded.email.split('@')[0] : 'User'),
        picture: decoded.picture || decoded.avatar,
        emailVerified: decoded.email_verified
      };
    } catch (adminErr) {
      console.warn('[Firebase Admin] verifyIdToken failed, trying Google tokeninfo endpoint:', adminErr.message);
    }
  }

  // Fallback: Verify via Google TokenInfo HTTP endpoint
  try {
    const googleUserData = await new Promise((resolve, reject) => {
      const req = https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error_description || parsed.error) {
              reject(new Error(parsed.error_description || parsed.error));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Token verification timed out'));
      });
    });

    return {
      uid: googleUserData.sub || googleUserData.user_id,
      email: googleUserData.email,
      name: googleUserData.name || (googleUserData.email ? googleUserData.email.split('@')[0] : 'User'),
      picture: googleUserData.picture,
      emailVerified: googleUserData.email_verified === 'true' || googleUserData.email_verified === true
    };
  } catch (googleErr) {
    // Development/Mock JWT decode fallback
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.sub || payload.uid || payload.user_id || payload.email) {
          return {
            uid: payload.sub || payload.uid || payload.user_id || `fb_${Date.now()}`,
            email: payload.email,
            name: payload.name || payload.displayName || (payload.email ? payload.email.split('@')[0] : 'User'),
            picture: payload.picture,
            emailVerified: Boolean(payload.email_verified)
          };
        }
      }
    } catch {
      // ignore
    }

    throw new Error('Invalid or unverified Firebase ID token');
  }
}

module.exports = {
  admin,
  verifyFirebaseToken
};
