import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Headphones, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'guest' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
            Join the podcast creator marketplace.
          </h2>
          <p style={{ color: 'var(--lavender-soft)', fontSize: 16, lineHeight: 1.6, maxWidth: 440 }}>
            Whether you run a top-ranked show or have industry expertise to share, CastReach provides the studio and security you need.
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: 24, border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 13, color: 'var(--lavender-soft)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} /> CREATOR TRUST
          </div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            "Found 4 incredible expert guests in my first week. Studio recording audio quality is pristine."
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
        <div style={{ width: '100%', maxWidth: 440 }} className="fade-in">
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>Create your Account</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Select your primary role to get started</p>
          </div>

          {error && (
            <div style={{
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              border: '1px solid #F3C6C6',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertCircle size={16} color="var(--color-error)" /> {error}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Role selector */}
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)', marginBottom: 8 }}>
              I want to join CastReach as a:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { value: 'guest', Icon: Mic, label: 'Podcast Guest', sub: 'Appear on shows' },
                { value: 'host',  Icon: Headphones, label: 'Podcast Host',  sub: 'Run a show & book guests' },
              ].map(({ value, Icon, label, sub }) => (
                <div
                  key={value}
                  onClick={() => setForm((f) => ({ ...f, role: value }))}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: `2px solid ${form.role === value ? 'var(--plum-primary)' : 'var(--border-subtle)'}`,
                    background: form.role === value ? 'var(--lavender-mist)' : '#fff',
                    boxShadow: form.role === value ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <Icon size={26} color="var(--plum-primary)" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--plum-deep)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)', marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Jane Doe"
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="jane@example.com"
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--plum-deep)', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="At least 8 characters"
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
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--plum-primary)', fontWeight: 700 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
