import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Radio, 
  Compass, 
  Flame, 
  Layers, 
  Mic2, 
  Clock, 
  ListMusic, 
  Heart, 
  Download, 
  Video, 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  Search, 
  UserPlus, 
  Check, 
  Shield, 
  ChevronRight,
  Headphones,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import NowPlayingWidget from './NowPlayingWidget';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { following, toggleFollow, playTrack } = useAudioPlayer();

  const [searchQuery, setSearchQuery] = useState('');

  // Top Podcasters matching Image 2 & 3
  const topPodcasters = [
    {
      id: 'podcaster-1',
      name: 'Anna Johnson',
      followers: '25k followers',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      role: 'Host',
      topic: 'Tech & Psychology',
    },
    {
      id: 'podcaster-2',
      name: 'Benjamin Thompson',
      followers: '50k followers',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      role: 'Host',
      topic: 'Venture & Growth',
    },
    {
      id: 'podcaster-3',
      name: 'Noah Davis',
      followers: '120k followers',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      role: 'Guest Speaker',
      topic: 'Personal Finance',
    },
    {
      id: 'podcaster-4',
      name: 'Andrius Peregorius',
      followers: '185k followers',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
      role: 'Host',
      topic: 'Health & Sports',
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Determine if on studio or booking recording page (needs wide layout)
  const isFullWidthPage = location.pathname.includes('/record') || location.pathname.includes('/bookings/');

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#0e0f13',
        color: '#f3f4f6',
        fontFamily: 'var(--font-body)',
        overflowX: 'hidden',
      }}
    >
      {/* ── LEFT NAVIGATION SIDEBAR (MATCHING IMAGE 2 & 3) ───────────────── */}
      <aside
        style={{
          width: 250,
          background: '#14151a',
          borderRight: '1px solid #1f2129',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          overflowY: 'auto',
          padding: '24px 16px',
        }}
      >
        <div>
          {/* User Profile Header (Ethan Anderson style) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 10px 20px',
              borderBottom: '1px solid #1f2129',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                flexShrink: 0,
              }}
            >
              <img
                src={
                  user?.profilePicture ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                }
                alt={user?.name || 'User'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#f9fafb',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'Ethan Anderson'}
              </h4>
              <p
                style={{
                  fontSize: 11,
                  color: '#6b7280',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email || 'anderson@gmail.com'}
              </p>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#3b82f6',
                  marginTop: 2,
                }}
              >
                {user?.role || 'host'} pro
              </span>
            </div>
          </div>

          {/* SECTION: MENU */}
          <div style={{ marginBottom: 24 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#6b7280',
                textTransform: 'uppercase',
                padding: '0 12px',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Menu
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <NavLink
                to="/discover"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                })}
              >
                <Compass size={18} />
                <span>Discover</span>
              </NavLink>

              <NavLink
                to="/explore"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                })}
              >
                <Flame size={18} />
                <span>Trending</span>
              </NavLink>

              <NavLink
                to="/shorts"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                })}
              >
                <Layers size={18} />
                <span>Genre</span>
              </NavLink>

              <NavLink
                to="/discover?tab=hosts"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive && location.search.includes('hosts') ? '#3b82f6' : '#9ca3af',
                  background:
                    isActive && location.search.includes('hosts')
                      ? 'rgba(59, 130, 246, 0.12)'
                      : 'transparent',
                  borderLeft:
                    isActive && location.search.includes('hosts')
                      ? '3px solid #3b82f6'
                      : '3px solid transparent',
                  transition: 'all 0.15s ease',
                })}
              >
                <Mic2 size={18} />
                <span>Speaker & Guests</span>
              </NavLink>
            </div>
          </div>

          {/* SECTION: LIBRARY */}
          <div style={{ marginBottom: 24 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#6b7280',
                textTransform: 'uppercase',
                padding: '0 12px',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Library
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <NavLink
                to="/discover?tab=recent"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: '#9ca3af',
                  borderLeft: '3px solid transparent',
                }}
              >
                <Clock size={18} />
                <span>Recent</span>
              </NavLink>

              <NavLink
                to="/discover?tab=playlist"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: '#9ca3af',
                  borderLeft: '3px solid transparent',
                }}
              >
                <ListMusic size={18} />
                <span>Playlist</span>
              </NavLink>

              <NavLink
                to="/discover?tab=favorites"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: '#9ca3af',
                  borderLeft: '3px solid transparent',
                }}
              >
                <Heart size={18} />
                <span>Favorites</span>
              </NavLink>

              <NavLink
                to="/discover?tab=downloads"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: '#9ca3af',
                  borderLeft: '3px solid transparent',
                }}
              >
                <Download size={18} />
                <span>Downloads</span>
              </NavLink>
            </div>
          </div>

          {/* SECTION: STUDIO & CUSTOMIZE */}
          <div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#6b7280',
                textTransform: 'uppercase',
                padding: '0 12px',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Studio & Tools
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <NavLink
                to="/bookings"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                })}
              >
                <Calendar size={18} />
                <span>Bookings & Escrow</span>
              </NavLink>

              <NavLink
                to="/messages"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                })}
              >
                <MessageSquare size={18} />
                <span>Messages</span>
              </NavLink>

              <NavLink
                to="/insights"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                })}
              >
                <BarChart3 size={18} />
                <span>Insights & AI</span>
              </NavLink>

              <NavLink
                to="/settings"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                })}
              >
                <Settings size={18} />
                <span>Settings</span>
              </NavLink>
            </div>
          </div>
        </div>

        {/* LOG OUT BUTTON */}
        <div style={{ paddingTop: 16, borderTop: '1px solid #1f2129' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 13.5,
              fontWeight: 600,
              color: '#ef4444',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          background: '#0e0f13',
          padding: '28px 32px 100px',
          overflowY: 'auto',
          minHeight: '100vh',
        }}
      >
        {children || <Outlet />}
      </main>

      {/* ── RIGHT COLUMN (MATCHING IMAGE 2 & 3) ──────────────────────────── */}
      {!isFullWidthPage && (
        <aside
          style={{
            width: 320,
            background: '#121318',
            borderLeft: '1px solid #1f2129',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
            height: '100vh',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            overflowY: 'auto',
          }}
        >
          <div>
            {/* QUICK SEARCH INPUT */}
            <div style={{ marginBottom: 24 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Quick Search
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#1a1b22',
                  border: '1px solid #262832',
                  borderRadius: 14,
                  padding: '10px 14px',
                }}
              >
                <Search size={16} color="#6b7280" />
                <input
                  type="text"
                  placeholder="Search podcasts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      navigate(`/discover?q=${encodeURIComponent(searchQuery)}`);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: 13,
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* TOP PODCASTERS SECTION */}
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                  }}
                >
                  Top Podcasters
                </span>
                <NavLink
                  to="/discover?tab=hosts"
                  style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}
                >
                  See all
                </NavLink>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topPodcasters.map((podcaster) => {
                  const isFollowed = following.includes(podcaster.id);
                  return (
                    <div
                      key={podcaster.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: '#2563eb',
                          }}
                        >
                          <img
                            src={podcaster.avatar}
                            alt={podcaster.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h5
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#f3f4f6',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {podcaster.name}
                          </h5>
                          <span style={{ fontSize: 11, color: '#6b7280' }}>
                            {podcaster.followers}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFollow(podcaster.id)}
                        style={{
                          background: isFollowed ? 'rgba(59, 130, 246, 0.15)' : '#1f2028',
                          color: isFollowed ? '#3b82f6' : '#d1d5db',
                          border: isFollowed ? '1px solid #3b82f6' : '1px solid #2e303d',
                          borderRadius: 9999,
                          padding: '5px 12px',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isFollowed ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* NOW PLAYING WIDGET (STICKY DOCK MATCHING IMAGE 3) */}
          <div>
            <NowPlayingWidget />
          </div>
        </aside>
      )}
    </div>
  );
}
