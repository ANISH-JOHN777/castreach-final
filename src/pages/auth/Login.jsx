import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, ShieldCheck, AlertCircle } from 'lucide-react';
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      background: 'var(--cream-warm)',
    }}>
      {/* Left Brand Panel */}
      <div style={{
        background: 'linear-gradient(135deg, var(--plum-deep) 0%, var(--plum-primary) 100%)',
        color: '#fff',
        padding: '60px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={24} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: '#fff' }}>
              CastReach
            </span>
          </Link>

          <h2 style={{ fontSize: 36, color: '#fff', lineHeight: 1.2, marginBottom: 20 }}>
            Welcome back to the studio.
          </h2>
          <p style={{ color: 'var(--lavender-soft)', fontSize: 16, lineHeight: 1.6, maxWidth: 440 }}>
            Access your recording sessions, message guests, authorize escrow holds, and prepare show notes with AI.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: 24, border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 13, color: 'var(--lavender-soft)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={16} /> PLATFORM SECURITY GUARANTEE
          </div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            "CastReach escrow protected our 10-episode tech series payment processing seamlessly."
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="fade-in">
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>Sign In</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Enter your credentials or click a demo account below</p>
          </div>

          <div style={{
            background: 'var(--plum-wash, #f5efff)',
            border: '1px dashed var(--plum-primary)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: 16,
            marginBottom: 24
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--plum-deep)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ⚡ Quick Demo Login (1-Click)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setEmail('demo.host3@castreach.demo');
                  setPassword('password123');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--plum-primary)',
                  background: '#fff',
                  color: 'var(--plum-deep)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🎙️ Host Demo <br />
                <span style={{ fontSize: 11, fontWeight: 400, color: '#666' }}>Sophia Chen</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('demo.guest1@castreach.demo');
                  setPassword('password123');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--plum-primary)',
                  background: '#fff',
                  color: 'var(--plum-deep)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                👥 Guest Demo <br />
                <span style={{ fontSize: 11, fontWeight: 400, color: '#666' }}>Sarah Jenkins</span>
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              border: '1px solid #F3C6C6',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertCircle size={16} color="var(--color-error)" /> {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 15,
                  background: '#fff',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)' }}>
                  Password
                </label>
                <span style={{ fontSize: 12, color: 'var(--plum-primary)', fontWeight: 600, cursor: 'pointer' }}>
                  Forgot password?
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 15,
                  background: '#fff',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--plum-deep), var(--plum-primary))',
                color: '#fff',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontSize: 16,
                fontWeight: 700,
                boxShadow: 'var(--shadow-plum)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Authenticating…' : 'Sign In to Studio'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-muted)' }}>
            New to CastReach?{' '}
            <Link to="/register" style={{ color: 'var(--plum-primary)', fontWeight: 700 }}>
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
