import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Headphones,
  Mic,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import loginVideo from '../../media/login.mp4';
import CastReachLogo from '../../components/CastReachLogo';

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // CastReach Design Tokens
  const BTN_PLUM = '#482F4C';
  const BTN_PLUM_HOVER = '#613F66';
  const ACCENT_LAVENDER = '#E2B6EE';
  const ACCENT_LAVENDER_BORDER = 'rgba(226, 182, 238, 0.45)';

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setError('');
    setLoading(true);
    try {
      const createdUser = await register({ ...form, role: 'listener' });
      // Promptly route to onboarding to choose role (Host, Guest, Listener) and setup profile
      if (createdUser && !createdUser.isOnboarded) {
        navigate('/onboarding');
      } else {
        navigate('/listen');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const createdUser = await loginWithGoogle('listener');
      if (createdUser && !createdUser.isOnboarded) {
        navigate('/onboarding');
      } else if (createdUser?.role === 'host') {
        navigate('/host');
      } else if (createdUser?.role === 'guest') {
        navigate('/guest');
      } else {
        navigate('/listen');
      }
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
        gridTemplateColumns: 'minmax(480px, 1.15fr) minmax(420px, 0.85fr)',
        background: '#13111C',
        color: '#FFFFFF',
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="auth-split-layout"
    >
      {/* ── LEFT SECTION: STUDIO ENVIRONMENT & ECOSYSTEM HERO ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '44px 52px',
          borderRight: '1px solid rgba(226, 182, 238, 0.14)',
          background: '#13111C',
        }}
      >
        {/* Ambient Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        >
          <source src={loginVideo} type="video/mp4" />
        </video>

        {/* Ambient Plum Glow Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(35, 22, 44, 0.75) 0%, rgba(19, 17, 28, 0.88) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header: Logo + Join Badge */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <CastReachLogo size={32} textSize={22} color="#FFFFFF" />
          </Link>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: ACCENT_LAVENDER,
              background: 'rgba(72, 47, 76, 0.55)',
              border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
              padding: '3px 10px',
              borderRadius: 999,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            CREATE ACCOUNT
          </span>
        </div>

        {/* Center Content: Headline & Platform Capabilities */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, margin: '60px 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 650,
              color: ACCENT_LAVENDER,
              marginBottom: 18,
            }}
          >
            <Sparkles size={14} />
            <span>CastReach Creator & Guest Ecosystem</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 3.4vw, 44px)',
              fontWeight: 850,
              lineHeight: 1.15,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              margin: '0 0 16px',
            }}
          >
            Connect, collaborate, and broadcast your voice.
          </h1>

          <p
            style={{
              fontSize: 15.5,
              color: '#A9A4B3',
              lineHeight: 1.6,
              margin: '0 0 28px',
            }}
          >
            Join thousands of podcast creators, industry authorities, and listeners building meaningful audio connections.
          </p>

          {/* Role Ecosystem Preview Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(19, 17, 28, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '12px 16px',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: 'rgba(5, 150, 105, 0.2)',
                  color: '#34D399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Headphones size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>For Hosts</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Produce shows, discover & book verified guests, broadcast episodes</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(19, 17, 28, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '12px 16px',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: 'rgba(124, 58, 237, 0.2)',
                  color: '#A78BFA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Mic size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>For Guests</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Get booked, share your domain expertise, expand your authority</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(19, 17, 28, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 14,
                padding: '12px 16px',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: 'rgba(37, 99, 235, 0.2)',
                  color: '#60A5FA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Radio size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>For Listeners</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Stream YouTube-style lossless playback and curated episode collections</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Note */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            maxWidth: 480,
          }}
        >
          <ShieldCheck size={18} color="#E2B6EE" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.45 }}>
            You will choose and configure your role & profile in onboarding right after creating your account.
          </div>
        </div>
      </div>

      {/* ── RIGHT SECTION: REGISTRATION CARD FORM ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 36px',
          background: '#0B0C12',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: '#11121A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 22,
            padding: '36px 32px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(72, 47, 76, 0.35)',
          }}
        >
          {/* Heading */}
          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 850,
                color: '#FFFFFF',
                letterSpacing: '-0.025em',
                margin: '0 0 6px',
              }}
            >
              Create Account
            </h2>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
              Enter your credentials to get started with CastReach
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                color: '#FCA5A5',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                Full Name
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  gap: 10,
                }}
              >
                <User size={16} color="#8A8594" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Chen"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                Email Address
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  gap: 10,
                }}
              >
                <Mail size={16} color="#8A8594" style={{ flexShrink: 0 }} />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  gap: 10,
                }}
              >
                <Lock size={16} color="#8A8594" style={{ flexShrink: 0 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    width: '100%',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8A8594',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                backgroundColor: BTN_PLUM,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                padding: '13px',
                fontSize: 14,
                fontWeight: 750,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                boxShadow: '0 4px 18px rgba(72, 47, 76, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = BTN_PLUM_HOVER;
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = BTN_PLUM;
              }}
            >
              <span>{loading ? 'Creating account…' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
            <span style={{ fontSize: 11, color: '#706B72', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              OR
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          {/* Google Button */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleSignUp}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 12,
              padding: '11px',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 650,
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!googleLoading) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.09)';
            }}
            onMouseLeave={(e) => {
              if (!googleLoading) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{googleLoading ? 'Signing up with Google…' : 'Sign up with Google'}</span>
          </button>

          {/* Bottom link to sign in */}
          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: ACCENT_LAVENDER, fontWeight: 750, textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
