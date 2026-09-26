import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    return '/guest';
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 249, 244, 0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'linear-gradient(135deg, var(--plum-deep), var(--plum-primary))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <Mic size={22} color="#fff" />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '-0.03em',
              color: 'var(--plum-deep)',
            }}>
              Cast<span style={{ color: 'var(--purple-castreach)' }}>Reach</span>
            </span>
            <span style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginTop: -4,
            }}>
              Podcast Studio & Marketplace
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}>
          <Link to="/" style={{ fontWeight: 600, color: 'var(--plum-deep)', fontSize: 14 }}>Home</Link>
          <Link to="/explore" style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 14 }}>Explore</Link>
          <Link to="/shorts" style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 14 }}>Shorts</Link>
          <Link to="/discover" style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 14 }}>Discover</Link>
          <Link to="/about" style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 14 }}>About</Link>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user ? (
            <>
              <button
                onClick={() => navigate(getDashboardPath())}
                style={{
                  background: 'var(--plum-primary)',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: 14,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                Dashboard ({user.role})
              </button>
              <button
                onClick={() => logout().then(() => navigate('/'))}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-subtle)',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: 'var(--plum-deep)',
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '9px 18px',
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  background: 'linear-gradient(135deg, var(--plum-deep), var(--plum-primary))',
                  color: '#fff',
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: 14,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                Join CastReach
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
