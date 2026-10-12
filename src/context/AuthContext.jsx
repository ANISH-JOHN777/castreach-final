import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut as fbSignOut, 
  onAuthStateChanged 
} from '../config/firebase';

const API = import.meta.env.VITE_API_URL || '/api';

const AuthContext = createContext(null);

async function parseResponse(res) {
  const text = await res.text();
  if (!text) {
    if (res.ok) return {};
    throw new Error(`Server error ${res.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 500) throw new Error('Server error — backend may be unreachable');
    if (res.status === 502 || res.status === 503) throw new Error('Backend is offline — please try again later');
    if (res.status === 429) throw new Error('Too many attempts — please wait 15 minutes');
    throw new Error(`Unexpected response (${res.status})`);
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('cr_token') || localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cr_user') || localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const saveAuth = (newToken, newUser) => {
    if (newToken) {
      setToken(newToken);
      localStorage.setItem('cr_token', newToken);
      localStorage.setItem('token', newToken);
    }
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('cr_user', JSON.stringify(newUser));
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cr_token');
    localStorage.removeItem('token');
    localStorage.removeItem('cr_user');
    localStorage.removeItem('user');
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    } catch { /* swallow */ }

    try {
      await fbSignOut(auth);
    } catch { /* swallow */ }

    clearAuth();
  };

  const refreshAccessToken = async () => {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        clearAuth();
        return null;
      }
      const data = await res.json();
      const newToken = data.token;
      const refreshedUser = data.user;

      if (user && refreshedUser && (refreshedUser._id || refreshedUser.id) !== (user._id || user.id)) {
        console.warn('Refresh token belongs to a different user. Clearing session to prevent cross-account mutation.');
        clearAuth();
        return null;
      }

      saveAuth(newToken, refreshedUser || user);
      return newToken;
    } catch {
      clearAuth();
      return null;
    }
  };

  const authFetch = useCallback(
    async (path, opts = {}) => {
      let res;
      try {
        res = await fetch(`${API}${path}`, {
          ...opts,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...opts.headers,
          },
        });
      } catch {
        throw new Error('Cannot reach server — check your connection');
      }

      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetch(`${API}${path}`, {
            ...opts,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshed}`,
              ...opts.headers,
            },
          });
        }
      }
      return res;
    },
    [token]
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/auth/me`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) return Promise.reject();
        const text = await r.text();
        return text ? JSON.parse(text) : {};
      })
      .then(({ user: serverUser }) => {
        saveAuth(token, serverUser);
      })
      .catch(() => {
        refreshAccessToken().finally(() => setLoading(false));
      })
      .finally(() => setLoading(false));
  }, []);

  // Sync Firebase authentication with backend MongoDB user session
  const syncWithBackendFirebase = async ({ idToken, role, name, email, avatar }) => {
    const res = await fetch(`${API}/auth/firebase-login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, role, name, email, avatar }),
    });

    const data = await parseResponse(res);
    if (!res.ok) throw new Error(data.error || `Authentication sync failed (${res.status})`);
    saveAuth(data.token, data.user);
    return data.user;
  };

  // Login: Try Firebase first, sync with backend, fall back to backend password verification
  const login = async (email, password) => {
    let firebaseError = null;
    try {
      // 1. Attempt Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      return await syncWithBackendFirebase({
        idToken,
        email: userCredential.user.email,
        name: userCredential.user.displayName,
        avatar: userCredential.user.photoURL,
      });
    } catch (fbErr) {
      firebaseError = fbErr;
    }

    // 2. Direct backend database authentication (fallback if Firebase is unconfigured or user was seeded in MongoDB)
    let res;
    try {
      res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error(firebaseError ? firebaseError.message : 'Cannot reach server — is the backend running?');
    }

    const data = await parseResponse(res);
    if (!res.ok) {
      throw new Error(data.error || (firebaseError ? firebaseError.message : `Login failed (${res.status})`));
    }
    saveAuth(data.token, data.user);
    return data.user;
  };

  // Google Sign-In via Firebase
  const loginWithGoogle = async (role = 'guest') => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const idToken = await userCredential.user.getIdToken();
    return await syncWithBackendFirebase({
      idToken,
      role,
      email: userCredential.user.email,
      name: userCredential.user.displayName,
      avatar: userCredential.user.photoURL,
    });
  };

  // Register: Create user via Firebase Auth, then sync with backend MongoDB
  const register = async (fields) => {
    const { email, password, name, role } = fields;
    let firebaseError = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      return await syncWithBackendFirebase({
        idToken,
        email,
        name,
        role: role || 'guest'
      });
    } catch (fbErr) {
      firebaseError = fbErr;
    }

    // Direct backend registration fallback
    let res;
    try {
      res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
    } catch {
      throw new Error(firebaseError ? firebaseError.message : 'Cannot reach server — is the backend running?');
    }

    const data = await parseResponse(res);
    if (!res.ok) throw new Error(data.error || (firebaseError ? firebaseError.message : `Registration failed (${res.status})`));
    saveAuth(data.token, data.user);
    return data.user;
  };

  const setCustomUser = (updatedUser) => {
    if (updatedUser) {
      saveAuth(token, updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      loginWithGoogle,
      register, 
      logout, 
      authFetch, 
      setUser: setCustomUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
