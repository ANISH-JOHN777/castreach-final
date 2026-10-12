import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';

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
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged
};

export default app;
