import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Radio, 
  Compass, 
  Flame, 
  Mic2, 
  Users,
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  Search, 
  Video, 
  MapPin,
  Check, 
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Headphones,
  Sliders
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CastReachLogo from './CastReachLogo';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarSearch, setSidebarSearch] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSidebarSearch = (e) => {
    if (e.key === 'Enter' && sidebarSearch.trim()) {
      navigate(`/discover?q=${encodeURIComponent(sidebarSearch.trim())}`);
    }
  };

  const dashboardRoute = user?.role === 'admin' ? '/admin' : user?.role === 'host' ? '/host' : '/guest';

  // Primary Apple Music Navigation Links (Only needed, high-priority options)
  const mainNavItems = [
    { label: 'Listen Now', to: '/', icon: Headphones, end: true },
    { label: 'Browse Guests & Shows', to: '/discover', icon: Compass },
    { label: user?.role === 'host' ? 'Host Studio' : 'Guest Portal', to: dashboardRoute, icon: Mic2 },
    { label: 'Schedule & Meets', to: '/bookings', icon: Calendar },
    { label: 'Messages', to: '/messages', icon: MessageSquare },
    { label: 'Studio Analytics', to: '/insights', icon: BarChart3 },
    { label: 'Account Settings', to: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const path = location.pathname.split('/')[1] || '';
    if (!path) return 'Listen Now';
    if (path === 'discover') return 'Browse Guests & Shows';
    if (path === 'host' || path === 'guest') return 'Studio Dashboard';
    if (path === 'bookings') return 'Schedule & Bookings';
    if (path === 'messages') return 'Studio Messages';
    if (path === 'insights') return 'Analytics & Growth';
    if (path === 'settings') return 'Settings';
    if (path === 'pricing') return 'Escrow & Payments';
    if (path === 'profile') return 'Creator Profile';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#13111C',
        color: '#FFFFFF',
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── 1. APPLE MUSIC TRANSLUCENT FROSTED SIDEBAR ── */}
      <aside
        style={{
          width: 250,
          background: 'rgba(20, 17, 28, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(226, 182, 238, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          overflowY: 'auto',
          padding: '24px 16px 120px',
        }}
      >
        <div>
          {/* Logo Brand Header */}
          <div style={{ padding: '0 8px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <NavLink
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <CastReachLogo size={28} textSize={18} />
            </NavLink>
          </div>

          {/* Apple Music Style Search Pill */}
          <div style={{ marginTop: 16, marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                background: '#181923',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 20,
                padding: '8px 14px',
                transition: 'all 0.2s ease',
              }}
            >
              <Search size={14} color="#E2B6EE" />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                onKeyDown={handleSidebarSearch}
                placeholder="Search..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Navigation Section */}
          <div style={{ marginBottom: 24 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#CBD5E1',
                textTransform: 'uppercase',
                padding: '0 10px',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Menu & Studio
            </span>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 12px',
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: isActive ? 750 : 500,
                      color: isActive ? '#FFFFFF' : '#CBD5E1',
                      background: isActive ? '#482F4C' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(226, 182, 238, 0.45)' : 'transparent'}`,
                      boxShadow: isActive ? '0 4px 14px rgba(72, 47, 76, 0.45)' : 'none',
                      textDecoration: 'none',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    })}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.classList.contains('active')) {
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.classList.contains('active')) {
                        e.currentTarget.style.color = '#CBD5E1';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card & Log Out */}
        <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {/* Active Profile Info */}
          <div
            onClick={() => navigate('/settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px',
              borderRadius: 8,
              cursor: 'pointer',
              marginBottom: 10,
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#482F4C',
                border: '1px solid rgba(221, 175, 232, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 12,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {user?.avatar || user?.profilePicture ? (
                <img
                  src={user.avatar || user.profilePicture}
                  alt={user?.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>{user?.name ? user.name.slice(0, 2).toUpperCase() : 'CR'}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 650,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.name || 'Creator'}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: '#DDAFE8',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {user?.role || 'Member'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#F87171',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── 2. MAIN SPACIOUS CONTENT VIEWPORT ── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          background: '#08090A',
          overflowY: 'auto',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 110,
        }}
      >
        {/* Apple Music Header Toolbar with Back & Forward Controls */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: 'rgba(8, 9, 10, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* History Nav Controls (Apple style < and >) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#F5F5F2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#482F4C';
                e.currentTarget.style.borderColor = 'rgba(221, 175, 232, 0.4)';
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = '#F5F5F2';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ArrowLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label="Forward"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#F5F5F2',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#482F4C';
                e.currentTarget.style.borderColor = 'rgba(221, 175, 232, 0.4)';
                e.currentTarget.style.color = '#FFFFFF';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = '#F5F5F2';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <ArrowRight size={16} />
            </button>

            {/* Apple Music Breadcrumb Title */}
            <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>CastReach</span>
              <span style={{ fontSize: 12, color: '#444' }}>/</span>
              <span style={{ fontSize: 13, color: '#DDAFE8', fontWeight: 700 }}>
                {getPageTitle()}
              </span>
            </div>
          </div>

          {/* Quick Header Right Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NavLink
              to="/discover"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#FFFFFF',
                background: '#482F4C',
                border: '1px solid rgba(221, 175, 232, 0.3)',
                padding: '6px 14px',
                borderRadius: 20,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 10px rgba(72, 47, 76, 0.4)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1.5px)';
                e.currentTarget.style.background = '#5C3C62';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = '#482F4C';
              }}
            >
              <Compass size={14} />
              <span>Explore Network</span>
            </NavLink>
          </div>
        </header>

        {/* Content Body Container */}
        <div style={{ flex: 1, padding: '24px 32px' }}>
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
