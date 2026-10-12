import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio, ShieldCheck, AlertCircle, ArrowRight, Lock, Mail, Headphones } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
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
            Welcome back to <br />
            the podcast studio.
          </h2>

          <p style={{ color: '#9ca3af', fontSize: 16, lineHeight: 1.6, maxWidth: 440 }}>
            Join live multi-track recording sessions, discover top guests and hosts, verify escrow contracts, and stream audio directly to listeners worldwide.
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
            <ShieldCheck size={16} /> ENTERPRISE PLATFORM SECURITY
          </div>
          <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
            Automated Stripe escrow protection, WebRTC encrypted multi-channel audio, and JWT token authentication.
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
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Sign In</h1>
            <p style={{ color: '#9ca3af', fontSize: 14 }}>
              Enter your credentials or click a 1-click demo role below
            </p>
          </div>

          {/* Quick Demo 1-Click Login Box */}
          <div
            style={{
              background: '#16171d',
              border: '1px solid #282a36',
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#60a5fa',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ⚡ Instant 1-Click Demo Accounts
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {/* Host Demo */}
              <button
                type="button"
                onClick={() => handleQuickLogin('demo.host3@castreach.demo', 'password123')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: '1px solid #2f3240',
                  background: '#1d1f27',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700 }}>🎙️ Host</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Sophia Chen</div>
              </button>

              {/* Guest Demo */}
              <button
                type="button"
                onClick={() => handleQuickLogin('demo.guest1@castreach.demo', 'password123')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: '1px solid #2f3240',
                  background: '#1d1f27',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700 }}>👥 Guest</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Sarah Jenkins</div>
              </button>

              {/* Admin Demo */}
              <button
                type="button"
                onClick={() => handleQuickLogin('demo.admin@castreach.demo', 'password123')}
                style={{
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: '1px solid #2f3240',
                  background: '#1d1f27',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700 }}>🛡️ Admin</div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Control Center</div>
              </button>
            </div>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@castreach.demo"
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
                Password
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
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In to Studio'}
              <ArrowRight size={16} />
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#9ca3af' }}>
            New to CastReach?{' '}
            <Link to="/register" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
