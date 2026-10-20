import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Mic, 
  Headphones, 
  Users, 
  Video, 
  ShieldCheck, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import loginVideo from '../../media/login.mp4';
import CastReachLogo from '../../components/CastReachLogo';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // CastReach Design Tokens
  const BTN_PLUM = '#482F4C';
  const BTN_PLUM_HOVER = '#613F66';
  const ACCENT_LAVENDER = '#E2B6EE';
  const ACCENT_LAVENDER_BORDER = 'rgba(226, 182, 238, 0.45)';

  const getRoleRedirect = (user) => {
    if (!user) return '/listen';
    if (user.role === 'admin') return '/admin';
    if (!user.isOnboarded) return '/onboarding';
    if (user.role === 'host') return '/host';
    if (user.role === 'guest') return '/guest';
    return '/listen';
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
      const user = await loginWithGoogle();
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
        gridTemplateColumns: 'minmax(500px, 1.15fr) minmax(420px, 0.85fr)',
        background: '#13111C',
        color: '#FFFFFF',
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="auth-split-layout"
    >
      {/* ── LEFT SECTION: STUDIO ENVIRONMENT & VALUE BADGES ── */}
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
            opacity: 0.55,
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
            background: 'linear-gradient(135deg, rgba(35, 22, 44, 0.72) 0%, rgba(19, 17, 28, 0.85) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header: Logo + STUDIO Badge */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <CastReachLogo size={32} textSize={22} />
          </Link>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: ACCENT_LAVENDER,
              background: 'rgba(72, 47, 76, 0.55)',
              border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
              padding: '3px 9px',
              borderRadius: 6,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            STUDIO
          </span>
        </div>

        {/* Middle: Main Value Headline & 3-Column Features */}
        <div style={{ position: 'relative', zIndex: 2, margin: '48px 0 36px' }}>
          <h1
            style={{
              fontSize: 'clamp(32px, 3.8vw, 48px)',
              fontWeight: 850,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
              margin: '0 0 16px',
              color: '#FFFFFF',
              maxWidth: 580,
            }}
          >
            Join the podcast creator <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #A78BFA 0%, #DDAFE8 45%, #C084FC 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              & guest marketplace.
            </span>
          </h1>

          <p
            style={{
              fontSize: 15.5,
              color: '#CBD5E1',
              lineHeight: 1.6,
              maxWidth: 520,
              margin: '0 0 36px',
            }}
          >
            Connect with leading show hosts and verified guest speakers. Meet virtually over Google Meet or physically in recording studios.
          </p>

          {/* 3 Horizontal Feature Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
              maxWidth: 560,
            }}
          >
            {/* Feature 1 */}
            <div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(72, 47, 76, 0.6)',
                  border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ACCENT_LAVENDER,
                  marginBottom: 10,
                }}
              >
                <Mic size={18} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 750, color: '#FFFFFF', marginBottom: 3 }}>
                Verified Hosts
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>
                Trusted & professional podcast creators
              </div>
            </div>

            {/* Feature 2 */}
            <div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(72, 47, 76, 0.6)',
                  border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ACCENT_LAVENDER,
                  marginBottom: 10,
                }}
              >
                <Users size={18} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 750, color: '#FFFFFF', marginBottom: 3 }}>
                Global Guests
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>
                Industry leaders, experts and creators
              </div>
            </div>

            {/* Feature 3 */}
            <div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(72, 47, 76, 0.6)',
                  border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ACCENT_LAVENDER,
                  marginBottom: 10,
                }}
              >
                <Video size={18} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 750, color: '#FFFFFF', marginBottom: 3 }}>
                Flexible Meetings
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.4 }}>
                Online (Google Meet) or in-person studios
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Frosted Glass Feature Banner */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            background: 'rgba(18, 19, 28, 0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            maxWidth: 560,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(72, 47, 76, 0.65)',
                border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ACCENT_LAVENDER,
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: ACCENT_LAVENDER,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                REAL VERIFIED PLATFORM
              </div>
              <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.45 }}>
                Real-time podcast discovery, instant guest scheduling, WebRTC studio recording, and direct messaging between hosts and guests.
              </div>
            </div>
          </div>

          {/* Waveform graphic */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            {[16, 26, 12, 32, 20, 28, 14].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: h,
                  background: 'linear-gradient(180deg, #E2B6EE 0%, #482F4C 100%)',
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT SECTION: FLOATING CARD FORM (LOGIN) ── */}
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
        {/* Floating Card Container matching mockup */}
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: '#11121A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 22,
            padding: '36px 32px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(72, 47, 76, 0.25)',
          }}
        >
          {/* Back Button */}
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 20,
                padding: '6px 14px',
                color: '#CBD5E1',
                fontSize: 12.5,
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#CBD5E1';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          </div>

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
              Sign In
            </h2>
            <p style={{ fontSize: 13.5, color: '#94A3B8', margin: 0 }}>
              Enter your credentials to access your CastReach studio and episodes.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                marginBottom: 18,
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
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  transition: 'all 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ACCENT_LAVENDER;
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(72, 47, 76, 0.4)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Mail size={16} color="#94A3B8" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anderson@gmail.com"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#CBD5E1' }}>
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    setError('Please contact support or sign in with Google to recover your credentials.');
                  }}
                  style={{ fontSize: 11.5, color: ACCENT_LAVENDER, textDecoration: 'none', fontWeight: 600 }}
                >
                  Forgot?
                </a>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = ACCENT_LAVENDER;
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(72, 47, 76, 0.4)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Lock size={16} color="#94A3B8" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                background: BTN_PLUM,
                border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                borderRadius: 24,
                padding: '12px 20px',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 750,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(72, 47, 76, 0.55)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = BTN_PLUM_HOVER;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = BTN_PLUM;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Divider OR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '20px 0',
              color: '#64748B',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
            <span>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: 24,
              padding: '11px 18px',
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
              if (!googleLoading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!googleLoading) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
              }
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{googleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>

          {/* Bottom Switch Link */}
          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: '#94A3B8' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                color: ACCENT_LAVENDER,
                fontWeight: 750,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
