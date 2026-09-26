import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Mic, 
  Shield, 
  Search, 
  Calendar, 
  BarChart2, 
  Settings, 
  Headphones, 
  Bell, 
  User, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useRealtimeMessages';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const getRoleNav = () => {
    const role = user?.role || 'guest';
    if (role === 'admin') {
      return [
        { to: '/control-center', label: 'Admin Control Center', Icon: Shield },
        { to: '/discover', label: 'Discover Creators', Icon: Search },
        { to: '/bookings', label: 'Bookings Audit', Icon: Calendar },
        { to: '/insights', label: 'Platform Insights', Icon: BarChart2 },
        { to: '/settings', label: 'System Settings', Icon: Settings },
      ];
    }
    if (role === 'host') {
      return [
        { to: '/host', label: 'Host Dashboard', Icon: Headphones },
        { to: '/discover', label: 'Find Guests', Icon: Search },
        { to: '/bookings', label: 'Studio Bookings', Icon: Calendar },
        { to: '/insights', label: 'Analytics', Icon: BarChart2 },
        { to: '/settings', label: 'Host Settings', Icon: Settings },
      ];
    }
    return [
      { to: '/guest', label: 'Guest Dashboard', Icon: Mic },
      { to: '/discover', label: 'Discover Shows', Icon: Search },
      { to: '/bookings', label: 'My Bookings', Icon: Calendar },
      { to: '/insights', label: 'Profile Analytics', Icon: BarChart2 },
      { to: '/settings', label: 'Account Settings', Icon: Settings },
    ];
  };

  const navItems = getRoleNav();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--cream-warm)' }}>
      {/* Top Navigation */}
      <header style={{
        height: 64,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Logo */}
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--plum-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Mic size={20} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--plum-deep)' }}>
              Cast<span style={{ color: 'var(--purple-castreach)' }}>Reach</span>
            </span>
          </NavLink>

          {/* User Role Badge */}
          <span style={{
            background: 'var(--lavender-mist)',
            color: 'var(--plum-deep)',
            border: '1px solid var(--border-subtle)',
            padding: '4px 10px',
            borderRadius: 16,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {user?.role || 'Guest'} Mode
          </span>
        </div>

        {/* Right side items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Notifications bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifs((v) => !v); setShowProfile(false); }}
              style={{ background: 'var(--lavender-mist)', border: '1px solid var(--border-subtle)', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            >
              <Bell size={18} color="var(--plum-deep)" />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 18, height: 18, borderRadius: 9,
                  background: 'var(--color-error)', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute', top: 48, right: 0,
                width: 320, background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden', zIndex: 200,
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--plum-deep)' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--plum-primary)', fontWeight: 600, background: 'none' }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n._id}
                        onClick={() => { setShowNotifs(false); if (n.link) navigate(n.link); }}
                        style={{
                          padding: '12px 16px', cursor: n.link ? 'pointer' : 'default',
                          background: n.isRead ? 'transparent' : 'var(--lavender-mist)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontWeight: n.isRead ? 400 : 600, fontSize: 13 }}>{n.title}</div>
                        {n.body && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.body}</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowProfile((v) => !v); setShowNotifs(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'transparent', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--plum-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15, overflow: 'hidden',
              }}>
                {user?.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.name?.[0] || 'U').toUpperCase()}
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--plum-deep)' }}>{user?.name}</span>
            </button>

            {showProfile && (
              <div style={{
                position: 'absolute', top: 48, right: 0,
                width: 220, background: '#fff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden', zIndex: 200,
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--plum-deep)' }}>{user?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role} • {user?.email}</div>
                </div>
                <button onClick={() => { setShowProfile(false); navigate(`/profile/${user?._id}`); }} style={{ width: '100%', padding: '12px 16px', background: 'none', textAlign: 'left', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <User size={16} color="var(--plum-primary)" /> View Profile
                </button>
                <button onClick={() => { setShowProfile(false); navigate('/settings'); }} style={{ width: '100%', padding: '12px 16px', background: 'none', textAlign: 'left', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Settings size={16} color="var(--plum-primary)" /> Account Settings
                </button>
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => { setShowProfile(false); handleLogout(); }} style={{ width: '100%', padding: '12px 16px', background: 'none', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LogOut size={16} color="var(--color-error)" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout (Sidebar + Content Body) */}
      <div style={{ flex: 1, display: 'flex', maxWidth: 1440, margin: '0 auto', width: '100%' }}>
        {/* Left Role Navigation Sidebar */}
        <aside style={{
          width: 240,
          background: '#fff',
          borderRight: '1px solid var(--border-subtle)',
          padding: '28px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 8px' }}>
            Navigation Menu
          </div>

          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/guest' || to === '/host' || to === '/admin'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--plum-deep)' : 'var(--text-muted)',
                background: isActive ? 'var(--lavender-mist)' : 'transparent',
                border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
              })}
            >
              <Icon size={18} color="currentColor" />
              {label}
            </NavLink>
          ))}
        </aside>

        {/* Content Body */}
        <main style={{ flex: 1, padding: 32, maxWidth: 1200, overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
