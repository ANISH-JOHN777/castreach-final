import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowLeft, User, Headphones, Volume2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import CastReachLogo from './CastReachLogo';
import { realtime } from '../services/realtime';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTrack, isPlaying } = useAudioPlayer();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isHome = location.pathname === '/';

  // Smooth scroll listener for dynamic shrink animation
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setIsScrolled(scrollPos > 36);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-time unread messages notification listener
  useEffect(() => {
    if (!user) return;
    const unsub = realtime.on('message:new', (msg) => {
      if (!msg) return;
      const myId = (user?._id || user?.id)?.toString();
      const senderId = (msg.sender?._id || msg.senderId)?.toString();
      if (senderId && senderId !== myId) {
        setUnreadCount((prev) => prev + 1);
      }
    });
    return () => unsub();
  }, [user]);

  // Reset unread count when user opens messages view
  useEffect(() => {
    if (location.search.includes('tab=messages') || location.pathname.startsWith('/messages')) {
      setUnreadCount(0);
    }
  }, [location.search, location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Role-specific nav links:
  // Host: Discover guests, Dashboard, Messages, Listen, Profile
  // Guest: Listen, Dashboard, Messages, Profile
  // Public/About: Discover guests, Listen, About
  const navLinks = useMemo(() => {
    const isHost = user?.role === 'host' || location.pathname.startsWith('/host');
    const isGuest = user?.role === 'guest' || location.pathname.startsWith('/guest');

    if (isHost) {
      return [
        { label: 'Discover guests', to: '/find-guests' },
        { label: 'Dashboard', to: '/host' },
        { label: 'Messages', to: '/host?tab=messages', isMessages: true },
        { label: 'Listen', to: '/listen' },
        { label: 'Profile', to: '/profile' },
      ];
    }
    if (isGuest) {
      return [
        { label: 'Listen', to: '/listen' },
        { label: 'Dashboard', to: '/guest' },
        { label: 'Messages', to: '/guest?tab=messages', isMessages: true },
        { label: 'Profile', to: '/profile' },
      ];
    }
    return [
      { label: 'Discover guests', to: '/find-guests' },
      { label: 'Listen', to: '/listen' },
      { label: 'About', to: '/about' },
    ];
  }, [user?.role, location.pathname]);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    if (user.role === 'guest') return '/guest';
    return '/profile';
  };

  const isItemActive = (to) => {
    if (to.includes('tab=messages')) {
      return location.search.includes('tab=messages') || location.pathname.startsWith('/messages');
    }
    if (location.search.includes('tab=messages')) {
      if (to === '/host' || to === '/guest') return false;
    }
    if (to === '/listen' && (location.pathname === '/listen' || location.pathname === '/discover')) {
      return true;
    }
    if (to === '/find-guests' && (location.pathname === '/find-guests' || location.pathname === '/guests')) {
      return true;
    }
    if (to === '/host' && location.pathname.startsWith('/host')) {
      return true;
    }
    if (to === '/guest' && location.pathname.startsWith('/guest')) {
      return true;
    }
    if (to === '/profile' && location.pathname.startsWith('/profile')) {
      return true;
    }
    return location.pathname === to;
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: isScrolled ? 'rgba(0, 0, 0, 0.94)' : '#000000',
          backdropFilter: isScrolled ? 'blur(20px) saturate(140%)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(20px) saturate(140%)' : 'none',
          borderTop: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isScrolled ? '0 12px 36px rgba(0, 0, 0, 0.9)' : 'none',
          padding: isScrolled ? '10px clamp(20px, 4vw, 56px)' : '14px clamp(20px, 4vw, 56px)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          {/* ── LEFT: Wordmark & Back Button ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isHome && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Go back"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 9999,
                  padding: '5px 10px',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <Link 
              to="/" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                textDecoration: 'none',
              }}
            >
              <CastReachLogo 
                size={44}
                textSize={16} 
                color="#FFFFFF" 
              />
            </Link>
          </div>

          {/* ── CENTER: Nav Links & Live Playback Pill ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              gap: isScrolled ? 20 : 26,
              transition: 'gap 0.3s ease',
            }} className="hidden md:flex">
              {navLinks.map((item) => {
                const active = isItemActive(item.to);
                const linkColor = active ? '#FFFFFF' : '#A39EA9';
                const hoverColor = '#FFFFFF';

                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    style={{
                      fontSize: isScrolled ? 13.5 : 14,
                      fontWeight: active ? 650 : 500,
                      color: linkColor,
                      textDecoration: 'none',
                      padding: '6px 0',
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'color 0.2s ease, font-size 0.3s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = hoverColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = linkColor; }}
                  >
                    <span>{item.label}</span>
                    {item.isMessages && unreadCount > 0 && (
                      <span style={{
                        background: '#A855F7',
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 9999,
                        padding: '1px 6px',
                        boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)',
                        animation: 'pulse 1.8s infinite',
                      }}>
                        {unreadCount}
                      </span>
                    )}
                    {active && (
                      <span style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '10%',
                        right: '10%',
                        height: 2,
                        background: '#A855F7', // Vivid Purple Active Accent
                        borderRadius: 2,
                        boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
                      }} />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Audio Live Pill indicator in navbar if playing (Green & Purple) */}
            {isPlaying && currentTrack && (
              <div
                onClick={() => navigate('/listen')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 9999,
                  background: 'rgba(34, 197, 94, 0.15)', // Neon Green Accent
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#22C55E',
                  fontSize: 12,
                  fontWeight: 650,
                  cursor: 'pointer',
                  animation: 'pulse 2s infinite',
                }}
                className="hidden lg:flex"
                title="Episode is playing"
              >
                <Volume2 size={13} color="#22C55E" />
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.title}
                </span>
              </div>
            )}
          </div>

          {/* ── RIGHT: Search Lens, User state & Sign in ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search Lens Button */}
            <button
              type="button"
              onClick={() => navigate('/find-guests')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#CBD5E1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#CBD5E1';
              }}
              title="Search guests and podcasts"
            >
              <Search size={15} />
            </button>

            {/* User Profile / Dashboard Pill */}
            {user ? (
              <Link
                to={getDashboardPath()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 550,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: isScrolled ? 9999 : 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <User size={14} color="#A855F7" />
                <span className="hidden sm:inline">
                  {user.name?.split(' ')[0] || (user.role === 'listener' ? 'Profile' : 'Dashboard')}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                style={{
                  fontSize: isScrolled ? 13.5 : 14,
                  fontWeight: 550,
                  color: '#CBD5E1',
                  textDecoration: 'none',
                  padding: '7px 16px',
                  borderRadius: 9999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#CBD5E1';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                Sign in
              </Link>
            )}

            {/* Mobile menu trigger */}
            <button
              type="button"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ── MOBILE ACCORDION MENU ── */}
        {mobileMenuOpen && (
          <div style={{
            background: 'rgba(15, 13, 21, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 18,
            marginTop: 8,
            padding: '20px 24px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15)',
          }} className="md:hidden">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {navLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  style={{
                    fontSize: 16,
                    fontWeight: isItemActive(item.to) ? 600 : 500,
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    padding: '8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{item.label}</span>
                  {item.isMessages && unreadCount > 0 && (
                    <span style={{
                      background: '#A855F7',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 800,
                      borderRadius: 9999,
                      padding: '2px 8px',
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </Link>
              ))}

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {user ? (
                  <Link
                    to={getDashboardPath()}
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#A982BD',
                      textDecoration: 'none',
                    }}
                  >
                    Open {user.role === 'host' ? 'Host Dashboard' : user.role === 'guest' ? 'Guest Dashboard' : 'My Profile'}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#FFFFFF',
                      textDecoration: 'none',
                    }}
                  >
                    Sign in to your account
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
