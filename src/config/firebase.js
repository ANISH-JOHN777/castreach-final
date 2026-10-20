import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Real Firebase Web App Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDswBh7LwHLnb1wi_cGtjz673f_JZ_aZ_0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "castreach.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "castreach",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "castreach.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "348216278901",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:348216278901:web:b7a7076e0221f3f4e2dd3c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-YNFCFW88LQ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  firestoreInstance = getFirestore(app);
}
export const db = firestoreInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Persist user credentials and complete profile in Firebase Firestore DB
 */
export async function saveUserProfileToFirestore(user, extra = {}) {
  try {
    if (!user) return;
    const uid = String(user.firebaseUid || user._id || user.id || auth.currentUser?.uid || user.email || '');
    if (!uid) return;

    const userDocRef = doc(db, 'users', uid);
    const profilePayload = {
      uid,
      mongoId: user._id ? String(user._id) : uid,
      email: user.email || '',
      name: user.name || user.displayName || '',
      role: user.role || 'guest',
      bio: user.bio || '',
      expertise: Array.isArray(user.expertise) ? user.expertise : (user.expertise ? [user.expertise] : []),
      sessionRateCents: user.sessionRateCents || 50000,
      sessionRate: (user.sessionRateCents ? Math.round(user.sessionRateCents / 100) : (user.sessionRate || 500)),
      avatar: user.avatar || user.profilePicture || '',
      location: user.location || user.studioLocation || 'Remote Studio',
      podcastName: user.podcastName || '',
      isOnboarded: user.isOnboarded !== undefined ? Boolean(user.isOnboarded) : false,
      authProvider: user.authProvider || 'credentials',
      lastSeenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...extra
    };

    // Use Promise.race with a timeout so network drops or channel resets fail silently in background
    await Promise.race([
      setDoc(userDocRef, profilePayload, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]).catch(() => {});

    // Also persist credentials tracking record in 'credentials'
    if (user.email) {
      const credDocRef = doc(db, 'credentials', uid);
      await Promise.race([
        setDoc(credDocRef, {
          uid,
          email: user.email,
          role: user.role || 'guest',
          authProvider: user.authProvider || 'credentials',
          lastLoginAt: new Date().toISOString(),
          profileRef: `users/${uid}`,
          ...extra
        }, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]).catch(() => {});
    }
  } catch (err) {
    // Suppress background sync errors from flooding user console
  }
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
};

export default app;

