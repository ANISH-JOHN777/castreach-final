import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, ShieldCheck, AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('sophia.chen@castreach.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getRoleRedirect = (user) => {
    if (!user.isOnboarded) return '/onboarding';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    return '/guest';
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(getRoleRedirect(user));
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        background: '#0e0f13',
        color: '#f3f4f6',
      }}
    >
      {/* Left Brand Panel */}
      <div
        style={{
          background: '#121318',
          color: '#fff',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid #1f222b',
        }}
      >
        <div>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48, textDecoration: 'none' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={20} color="#fff" />
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: '#fff' }}>
                Podcast
              </span>
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#60a5fa',
                  background: 'rgba(37, 99, 235, 0.2)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                CastReach
              </span>
            </div>
          </Link>

          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 18, letterSpacing: '-0.02em' }}>
            Welcome back to <br />
            the studio platform.
          </h2>

          <p style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>
            Sign in to manage your recording calendar, review escrow holds, join browser-native audio sessions, and distribute episodes.
          </p>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 16,
            padding: 22,
            border: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <ShieldCheck size={15} /> Platform Security
          </div>
          <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5 }}>
            All sessions are encrypted end-to-end via WebRTC DTLS/SRTP with multi-track local WAV redundancy.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          background: '#0e0f13',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Sign In</h1>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>
              Enter your account credentials to access your studio workspace
            </p>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                Email Address
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#15161c',
                  border: '1px solid #282a36',
                  borderRadius: 12,
                  padding: '0 14px',
                }}
              >
                <Mail size={16} color="#6b7280" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@castreach.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#d1d5db' }}>
                  Password
                </label>
                <span style={{ fontSize: 12, color: '#3b82f6', cursor: 'pointer' }}>
                  Forgot password?
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#15161c',
                  border: '1px solid #282a36',
                  borderRadius: 12,
                  padding: '0 14px',
                }}
              >
                <Lock size={16} color="#6b7280" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 10px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: 9999,
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
