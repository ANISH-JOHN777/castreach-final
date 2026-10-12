import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, ShieldCheck, AlertCircle, ArrowRight, Lock, Mail, Video, Headphones, Mic } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle('guest');
      navigate(getRoleRedirect(user));
    } catch (err) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 1.1fr) minmax(380px, 1fr)',
        background: 'var(--bg-obsidian)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── LEFT SECTION: Video Background & Brand Ambience ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px',
          borderRight: '1px solid var(--border-subtle)',
          background: '#090a0f',
        }}
      >
        {/* Ambient Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        >
          {/* Public studio broadcast loop video source */}
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-recording-studio-with-microphone-and-headphones-42861-large.mp4"
            type="video/mp4"
          />
        </video>

        {/* Subtle Dark Matte Overlay (Strictly zero neon glow) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(8, 8, 10, 0.75) 0%, rgba(8, 8, 10, 0.95) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Brand Logo: CastReach */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: 'var(--accent-lime)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Radio size={22} strokeWidth={2.5} color="var(--text-dark)" />
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 850, fontSize: 24, color: '#fff', letterSpacing: '-0.02em' }}>
                CASTREACH
              </span>
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--accent-lime)',
                  background: 'rgba(203, 251, 69, 0.12)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.06em',
                }}
              >
                PODCAST
              </span>
            </div>
          </Link>
        </div>

        {/* Center Editorial Quote */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 460 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--accent-lime)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}>
            CONNECTED PRODUCTION
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 850, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
            Speak Loud. Connect Deep.
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The verified network for podcast hosts and guest speakers. Book Google Meet sessions or physical studio tapings with complete data transparency.
          </p>
        </div>

        {/* Bottom Feature Tags */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, color: 'var(--text-secondary)' }}>
            <Video size={13} color="var(--accent-lime)" /> Google Meet Virtual Rooms
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', fontSize: 12, color: 'var(--text-secondary)' }}>
            <Mic size={13} color="var(--accent-purple)" /> In-Person Studio Tapings
          </span>
        </div>
      </div>

      {/* ── RIGHT SECTION: Login Boxes & Firebase Auth ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 32px',
          background: 'var(--bg-carbon)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 850, letterSpacing: '-0.03em', marginBottom: 6, color: '#ffffff' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
              Enter your credentials or continue with Google to access your CastReach dashboard.
            </p>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                background: 'var(--color-danger-bg)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertCircle size={16} color="var(--color-danger)" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Continue with Google Popup Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="btn-ghost-dark"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontWeight: 700,
              fontSize: 13.5,
              opacity: googleLoading ? 0.7 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17c1.8 3.7 5.6 6.5 10.1 6.5z"
              />
            </svg>
            <span>{googleLoading ? 'Connecting to Google…' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 20,
              color: 'var(--text-muted)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            <span>or email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          {/* Login Form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 650,
                  marginBottom: 6,
                  color: 'var(--text-secondary)',
                }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13.5,
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 650,
                  marginBottom: 6,
                  color: 'var(--text-secondary)',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 38px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13.5,
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-lime)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-primary-lime"
              style={{
                width: '100%',
                padding: '12px',
                marginTop: 6,
                fontSize: 14,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Authenticating…' : 'Sign In to CastReach'}
            </button>
          </form>

          {/* Footer Navigation */}
          <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Don&apos;t have an account yet?{' '}
            <Link
              to="/register"
              style={{
                color: 'var(--accent-lime)',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign up for free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
