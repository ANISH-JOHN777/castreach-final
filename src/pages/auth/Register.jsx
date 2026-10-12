import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, Headphones, Mic, ShieldCheck, AlertCircle, ArrowRight, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'host' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(form.role || 'host');
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Google registration failed');
    } finally {
      setGoogleLoading(false);
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
          background: 'linear-gradient(135deg, #090a0d 0%, #151821 100%)',
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
                width: 44,
                height: 44,
                borderRadius: 14,
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              <Radio size={22} color="#fff" />
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

          <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 18, letterSpacing: '-0.02em' }}>
            Join the podcast creator & guest marketplace.
          </h2>

          <p style={{ color: '#9ca3af', fontSize: 16, lineHeight: 1.6, maxWidth: 440 }}>
            Whether you run an established show, want to be interviewed as an expert guest, or want to stream and listen to top podcasts, CastReach brings it all together.
          </p>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 18,
            padding: 24,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} /> WHAT YOU GET
          </div>
          <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
            WebRTC Studio with local multi-track audio backup, automated AI transcription, live subtitles, and Stripe escrow protection.
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
        <div style={{ width: '100%', maxWidth: 440 }} className="fade-in">
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Create Account</h1>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>
              Choose your role and start your podcast journey
            </p>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
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
            {/* Role selector tabs */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#d1d5db', marginBottom: 8 }}>
                I want to join as:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: 'host' }))}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: form.role === 'host' ? '2px solid #2563eb' : '1px solid #282a36',
                    background: form.role === 'host' ? 'rgba(37, 99, 235, 0.15)' : '#16171d',
                    color: form.role === 'host' ? '#60a5fa' : '#9ca3af',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  <Headphones size={18} /> Podcast Host
                </button>

                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: 'guest' }))}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: form.role === 'guest' ? '2px solid #2563eb' : '1px solid #282a36',
                    background: form.role === 'guest' ? 'rgba(37, 99, 235, 0.15)' : '#16171d',
                    color: form.role === 'guest' ? '#60a5fa' : '#9ca3af',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  <Mic size={18} /> Guest Speaker
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                Full Name
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#16171d',
                  border: '1px solid #282a36',
                  borderRadius: 12,
                  padding: '0 14px',
                }}
              >
                <User size={16} color="#6b7280" />
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Ethan Anderson"
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

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                Email Address
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#16171d',
                  border: '1px solid #282a36',
                  borderRadius: 12,
                  padding: '0 14px',
                }}
              >
                <Mail size={16} color="#6b7280" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="anderson@gmail.com"
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
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#d1d5db', marginBottom: 6 }}>
                Password (min. 8 characters)
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#16171d',
                  border: '1px solid #282a36',
                  borderRadius: 12,
                  padding: '0 14px',
                }}
              >
                <Lock size={16} color="#6b7280" />
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
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
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Creating Account...' : 'Get Started Free'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#282a36' }} />
            <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#282a36' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: 9999,
              background: '#15161c',
              color: '#ffffff',
              border: '1px solid #282a36',
              fontWeight: 600,
              fontSize: 14,
              cursor: googleLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'background 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {googleLoading ? 'Connecting...' : 'Sign up with Google'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
