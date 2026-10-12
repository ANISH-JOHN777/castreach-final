import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Radio, Mic, Headphones, LogOut, LayoutDashboard, User, Sparkles, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    return '/guest';
  };

  const navLinks = [
    { label: 'HOME', to: '/' },
    { label: 'EPISODES', to: '/episodes' },
    { label: 'DISCOVER', to: '/discover' },
    { label: 'ABOUT PROJECT', to: '/about' },
    { label: 'PRICING', to: '/pricing' },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(8, 8, 10, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      transition: 'all 0.2s ease',
    }}>
      <div style={{
        maxWidth: 1360,
        margin: '0 auto',
        padding: '0 24px',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo matching Image 1: Minimalist typography with Lime & Purple accents */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'var(--accent-lime)',
            color: 'var(--text-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            boxShadow: 'var(--shadow-lime)',
            transition: 'transform 0.15s ease',
          }}>
            <Radio size={20} strokeWidth={2.5} color="#08080a" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}>
              CASTREACH
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'var(--accent-lime)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              PODCAST
            </span>
          </div>
        </Link>

        {/* Center Nav links matching Image 1 header: HOME, EPISODES, ABOUT PROJECT, CLUB, PRICING */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
        }}>
          {navLinks.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--accent-lime)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '6px 0',
                  position: 'relative',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {item.label}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'var(--accent-lime)',
                    borderRadius: 2,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                to={getDashboardPath()}
                className="btn-ghost-dark"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                <LayoutDashboard size={15} />
                Dashboard
              </Link>

              <Link
                to={`/profile/${user._id || user.id}`}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--accent-purple)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  overflow: 'hidden',
                }}
                title={user.name}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.name?.[0]?.toUpperCase() || 'U'
                )}
              </Link>

              <button
                onClick={logout}
                className="btn-ghost-dark"
                style={{ padding: '8px', borderRadius: '50%', minWidth: 38, height: 38, justifyContent: 'center' }}
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link
                to="/login"
                className="btn-ghost-dark"
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Sign In
              </Link>

              <Link
                to="/register"
                className="btn-primary-lime"
                style={{ padding: '9px 20px', fontSize: 13 }}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
