import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Search, 
  Library, 
  History, 
  Clock, 
  ThumbsUp, 
  Radio, 
  Tv, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Music, 
  Calendar, 
  X, 
  SkipBack, 
  SkipForward,
  User,
  ArrowRight,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  Settings,
  Subtitles,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { 
  PODCAST_CATALOG, 
  HUBERMAN_EPISODE, 
  DRUSKI_EPISODE, 
  TOM_HOLLAND_EPISODE 
} from '../podcast';
import { GUEST_CATALOG } from '../data/guests';
import GuestProfileModal from '../components/GuestProfileModal';
import CreateBookingModal from '../components/CreateBookingModal';

// Authentic Media Assets (Only Given Assets — Zero Mockup Video)
import brandIcon from '../media/brand_icon_transparent.png';
import hubermanBwAvatar from '../media/huberman_bw.png';
import druskiRealAvatar from '../media/druski_real.png';
import tomHollandBwAvatar from '../media/tom_holland_bw.jpg';
import thumbnail1 from '../podcast/thumbnail1.jpg';
import thumbnail2 from '../podcast/thumbnail2.jpg';
import thumbnail3 from '../podcast/thumbnail3.jpg';

export default function Listen() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Audio Context
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    togglePlay, 
    currentTime, 
    duration, 
    seek, 
    volume, 
    setVolume, 
    isMuted, 
    setIsMuted,
    nextTrack,
    prevTrack 
  } = useAudioPlayer();

  // State
  const [selectedEpisode, setSelectedEpisode] = useState(HUBERMAN_EPISODE);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [toastMessage, setToastMessage] = useState('');
  const [isPlayerOpen, setIsPlayerOpen] = useState(isPlaying);

  useEffect(() => {
    if (isPlaying) {
      setIsPlayerOpen(true);
    }
  }, [isPlaying]);

  // YouTube Video Player States
  const [isHoveringPlayer, setIsHoveringPlayer] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isCcEnabled, setIsCcEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [hoverScrubTime, setHoverScrubTime] = useState(null);
  const [rippleIcon, setRippleIcon] = useState(null); // 'play' | 'pause'

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [guestForProfile, setGuestForProfile] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [guestForBooking, setGuestForBooking] = useState(null);

  // Refs
  const playerContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);

  // 3 Authentic Given Podcast Episodes
  const ALL_EPISODES = useMemo(() => [
    {
      ...HUBERMAN_EPISODE,
      exactThumbnail: thumbnail1,
      avatar: hubermanBwAvatar,
      channelName: 'Dr. Andrew Huberman',
      showName: 'Figuring Out with Raj Shamani',
      subscribers: '4.2M subscribers',
      guestId: 'guest-huberman',
    },
    {
      ...DRUSKI_EPISODE,
      exactThumbnail: thumbnail2,
      avatar: druskiRealAvatar,
      channelName: 'Druski (Drew Desbordes)',
      showName: 'The Pivot Podcast',
      subscribers: '2.8M subscribers',
      guestId: 'guest-druski',
      isMusic: true,
    },
    {
      ...TOM_HOLLAND_EPISODE,
      exactThumbnail: thumbnail3,
      avatar: tomHollandBwAvatar,
      channelName: 'Tom Holland',
      showName: 'On Purpose with Jay Shetty',
      subscribers: '5.1M subscribers',
      guestId: 'guest-tom-holland',
    }
  ], []);

  // Currently active episode in player (defaults to selected or currentTrack)
  const activeEpisode = useMemo(() => {
    if (currentTrack) {
      const match = ALL_EPISODES.find(e => e.id === currentTrack.id);
      if (match) return match;
    }
    return selectedEpisode || ALL_EPISODES[0];
  }, [currentTrack, selectedEpisode, ALL_EPISODES]);

  // Categories
  const CATEGORIES = [
    'All',
    'Lossless 48kHz',
    'Neuroscience & Health',
    'Comedy & Culture',
    'Mental Health & Mindset'
  ];

  // Authentic Subscriptions in Sidebar
  const REAL_SUBSCRIPTIONS = [
    {
      id: 'sub-huberman',
      name: 'Dr. Andrew Huberman',
      avatar: hubermanBwAvatar,
      guestId: 'guest-huberman',
      episode: ALL_EPISODES[0],
    },
    {
      id: 'sub-druski',
      name: 'Druski (Coulda Been)',
      avatar: druskiRealAvatar,
      guestId: 'guest-druski',
      episode: ALL_EPISODES[1],
    },
    {
      id: 'sub-tom',
      name: 'Tom Holland',
      avatar: tomHollandBwAvatar,
      guestId: 'guest-tom-holland',
      episode: ALL_EPISODES[2],
    }
  ];

  // Filter episodes for catalog grid
  const filteredEpisodes = useMemo(() => {
    return ALL_EPISODES.filter((ep) => {
      const matchesCategory = 
        activeCategory === 'All' || 
        activeCategory === 'Lossless 48kHz' ||
        ep.category.toLowerCase().includes(activeCategory.toLowerCase());

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        !query || 
        ep.title.toLowerCase().includes(query) ||
        ep.channelName.toLowerCase().includes(query) ||
        ep.showName.toLowerCase().includes(query) ||
        ep.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [ALL_EPISODES, activeCategory, searchQuery]);

  // Auto-hide controls timer (YouTube style)
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setIsSettingsOpen(false);
      }, 2600);
    }
  }, [isPlaying]);

  const handleMouseMovePlayer = () => {
    setIsHoveringPlayer(true);
    resetControlsTimer();
  };

  const handleMouseLeavePlayer = () => {
    setIsHoveringPlayer(false);
    if (isPlaying) {
      setControlsVisible(false);
      setIsSettingsOpen(false);
    }
  };

  // Center ripple animation
  const triggerRipple = (type) => {
    setRippleIcon(type);
    setTimeout(() => setRippleIcon(null), 550);
  };

  // Toggle Play / Pause on the video player
  const handleTogglePlay = (e) => {
    if (e) e.stopPropagation();
    if (!currentTrack || currentTrack.id !== activeEpisode.id) {
      playTrack(activeEpisode);
      triggerRipple('play');
    } else {
      const willPlay = !isPlaying;
      togglePlay();
      triggerRipple(willPlay ? 'play' : 'pause');
    }
    resetControlsTimer();
  };

  // Click on a podcast card -> plays like YouTube video player with that exact thumbnail!
  const handlePodcastCardClick = (ep) => {
    setSelectedEpisode(ep);
    setIsPlayerOpen(true);
    playTrack(ep);
    triggerToast(`Playing in video player: ${ep.title}`);
    // Smoothly scroll to the YouTube video player stage
    setTimeout(() => {
      if (playerContainerRef.current) {
        playerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Fullscreen API toggle
  const toggleFullscreen = () => {
    const el = playerContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard shortcuts like YouTube
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'm') {
        setIsMuted(!isMuted);
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 'c') {
        setIsCcEnabled(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        seek(Math.min((duration || activeEpisode.duration || 100), (currentTime || 0) + 5));
      } else if (e.key === 'ArrowLeft') {
        seek(Math.max(0, (currentTime || 0) - 5));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, isMuted, isPlaying, activeEpisode]);

  // Real-Time Closed Caption (Subtitle) for the active podcast
  const currentSubtitle = useMemo(() => {
    if (!isCcEnabled || !activeEpisode?.captions) return null;
    const time = currentTime || 0;
    const cue = activeEpisode.captions.find(c => time >= c.start && time <= c.end);
    return cue?.text || null;
  }, [isCcEnabled, activeEpisode, currentTime]);

  // Scrub bar interaction
  const handleScrubClick = (e) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pct * (duration || activeEpisode.duration || 1);
    seek(targetTime);
  };

  const handleScrubMouseMove = (e) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverScrubTime(pct * (duration || activeEpisode.duration || 1));
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleOpenGuest = (guestId) => {
    const guestObj = GUEST_CATALOG.find(g => g.id === guestId);
    if (guestObj) {
      setGuestForProfile(guestObj);
      setIsProfileModalOpen(true);
    }
  };

  const handleOpenBooking = (guestId) => {
    const guestObj = GUEST_CATALOG.find(g => g.id === guestId);
    if (guestObj) {
      setGuestForBooking(guestObj);
      setIsBookingModalOpen(true);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const total = Math.floor(secs);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const rem = total % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
    }
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    if (user.role === 'guest') return '/guest';
    return '/profile';
  };

  const progressPercent = useMemo(() => {
    const d = duration || activeEpisode.duration || 1;
    return Math.min(100, Math.max(0, ((currentTime || 0) / d) * 100));
  }, [currentTime, duration, activeEpisode]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#FFFFFF',
      fontFamily: 'var(--font-family-base, "Geist Sans", -apple-system, sans-serif)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1E1D27',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85)',
          padding: '10px 22px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
        }}>
          <Sparkles size={16} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          01. HOMEPAGE NAVBAR (Exact Match to Home.jsx)
      ────────────────────────────────────────────────────────────────────────── */}
      <nav
        id="listen-top-navbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(9, 8, 15, 0.95)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
          padding: '12px clamp(20px, 4vw, 56px)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}>
          {/* Brand Wordmark & Main Icon */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={brandIcon}
              alt="CastReach Logo"
              style={{
                width: 44,
                height: 44,
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.06em' }}>
              CASTREACH
            </span>
          </Link>

          {/* Center Navigation Links: Dynamic based on role */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            fontSize: 14,
            fontWeight: 600,
          }} className="hidden md:flex">
            {user?.role === 'host' ? (
              <>
                <Link
                  to="/find-guests"
                  style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
                >
                  Discover guests
                </Link>
                <Link
                  to="/host"
                  style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
                >
                  Dashboard
                </Link>
                <Link
                  to="/listen"
                  style={{ color: '#FFFFFF', textDecoration: 'none', position: 'relative', padding: '4px 0' }}
                >
                  <span>Listen</span>
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: '#22C55E',
                    borderRadius: 2,
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                  }} />
                </Link>
                <Link
                  to="/profile"
                  style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
                >
                  Profile
                </Link>
              </>
            ) : user?.role === 'guest' ? (
              <>
                <Link
                  to="/listen"
                  style={{ color: '#FFFFFF', textDecoration: 'none', position: 'relative', padding: '4px 0' }}
                >
                  <span>Listen</span>
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: '#A855F7',
                    borderRadius: 2,
                    boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
                  }} />
                </Link>
                <Link
                  to="/guest"
                  style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/find-guests"
                  style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
                >
                  Discover guests
                </Link>
                <Link
                  to="/listen"
                  style={{ color: '#FFFFFF', textDecoration: 'none', position: 'relative', padding: '4px 0' }}
                >
                  <span>Listen</span>
                  <span style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: '#22C55E',
                    borderRadius: 2,
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                  }} />
                </Link>
                <Link
                  to="/about"
                  style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
                >
                  About
                </Link>
              </>
            )}

            {/* Live Playback Indicator Pill */}
            {isPlaying && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#22C55E',
                  fontSize: 12,
                  fontWeight: 650,
                  animation: 'pulse 2s infinite',
                }}
                className="hidden lg:flex"
                title="Episode is playing"
              >
                <Volume2 size={13} color="#22C55E" />
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeEpisode.title}
                </span>
              </div>
            )}
          </div>

          {/* Right: Search Lens + Sign In / User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Search Lens button */}
            <button
              type="button"
              onClick={() => {
                const searchEl = document.getElementById('listen-search-input');
                if (searchEl) searchEl.focus();
                else navigate('/find-guests');
              }}
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
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#CBD5E1';
              }}
              title="Search podcasts and guests"
            >
              <Search size={15} />
            </button>

            {/* User Profile or Sign In */}
            {user ? (
              <Link
                to={getDashboardPath()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: 999,
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
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#CBD5E1',
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#CBD5E1';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ──────────────────────────────────────────────────────────────────────────
          02. LISTEN BODY (Sidebar + YouTube Video Player of that exact thumbnail)
      ────────────────────────────────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 1400,
        width: '100%',
        margin: '0 auto',
        padding: '20px clamp(16px, 3vw, 32px)',
        display: 'flex',
        gap: '24px',
        boxSizing: 'border-box',
        alignItems: 'flex-start',
      }}>
        {/* LEFT FLOATING SIDEBAR (Previous Style) */}
        <aside style={{
          width: '230px',
          minWidth: '230px',
          backgroundColor: '#0D0D11',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 14px',
          position: 'sticky',
          top: '78px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          flexShrink: 0,
        }} className="hidden xl:flex">
          {/* Section 1: Navigation Menu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button 
              type="button"
              onClick={() => setActiveCategory('All')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '9px 12px',
                borderRadius: 12,
                backgroundColor: activeCategory === 'All' ? 'rgba(255, 255, 255, 0.09)' : 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s ease',
              }}
            >
              <Library size={18} color="#FFFFFF" />
              <span>Library</span>
            </button>

            <button 
              type="button"
              onClick={() => triggerToast('Listening history preserved')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '9px 12px',
                borderRadius: 12,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <History size={18} />
              <span>History</span>
            </button>

            <button 
              type="button"
              onClick={() => navigate('/bookings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '9px 12px',
                borderRadius: 12,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <Tv size={18} />
              <span>Your sessions</span>
            </button>

            <button 
              type="button"
              onClick={() => triggerToast('3 Master Episodes in Watch Later')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '9px 12px',
                borderRadius: 12,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <Clock size={18} />
              <span>Watch later</span>
            </button>

            <button 
              type="button"
              onClick={() => triggerToast('3 Master Episodes in Liked')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '9px 12px',
                borderRadius: 12,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <ThumbsUp size={18} />
              <span>Liked episodes</span>
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.07)', margin: '14px 4px' }} />

          {/* Section 2: Subscriptions */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#71717A',
            letterSpacing: '0.08em',
            padding: '2px 8px 8px 8px',
            textTransform: 'uppercase',
          }}>
            SUBSCRIPTIONS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {REAL_SUBSCRIPTIONS.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => handlePodcastCardClick(sub.episode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 8px',
                  borderRadius: 10,
                  backgroundColor: activeEpisode.id === sub.episode.id ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  color: '#D4D4D8',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.07)'; 
                  e.currentTarget.style.color = '#FFFFFF'; 
                }}
                onMouseLeave={(e) => { 
                  if (activeEpisode.id !== sub.episode.id) {
                    e.currentTarget.style.backgroundColor = 'transparent'; 
                    e.currentTarget.style.color = '#D4D4D8'; 
                  }
                }}
                title={sub.name}
              >
                <img 
                  src={sub.avatar} 
                  alt={sub.name} 
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.name}
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.07)', margin: '14px 4px' }} />

          {/* Section 3: More From CastReach */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#71717A',
            letterSpacing: '0.08em',
            padding: '2px 8px 8px 8px',
            textTransform: 'uppercase',
          }}>
            MORE FROM CASTREACH
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button 
              type="button"
              onClick={() => navigate('/find-guests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '8px 10px',
                borderRadius: 10,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <Tv size={17} />
              <span>CastReach Studio</span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveCategory('Lossless 48kHz')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '8px 10px',
                borderRadius: 10,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#A1A1AA',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <Radio size={17} />
              <span>Lossless Audio</span>
            </button>
          </div>
        </aside>

        {/* MAIN COLUMN */}
        <main style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* SEARCH & CATEGORY CHIPS BAR */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            {/* Quick Filter Input */}
            <div style={{
              position: 'relative',
              width: '260px',
              maxWidth: '100%',
            }}>
              <Search 
                size={14} 
                color="#71717A" 
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }} 
              />
              <input 
                id="listen-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter episodes..."
                style={{
                  width: '100%',
                  height: 36,
                  borderRadius: 999,
                  backgroundColor: '#141419',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingLeft: 38,
                  paddingRight: 32,
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.15s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.backgroundColor = '#1D1C24';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.backgroundColor = '#141419';
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#71717A',
                    cursor: 'pointer',
                    padding: 2,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              padding: '2px 0',
              flex: 1,
            }}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 999,
                      backgroundColor: isActive ? '#FFFFFF' : '#141419',
                      color: isActive ? '#000000' : '#E4E4E7',
                      border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#201F29';
                        e.currentTarget.style.color = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#141419';
                        e.currentTarget.style.color = '#E4E4E7';
                      }
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────────────
              03. YOUTUBE-STYLE VIDEO PLAYER (Plays when podcast is clicked or playing)
          ────────────────────────────────────────────────────────────────────────── */}
          {isPlayerOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Back / Minimize to Grid Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                <button
                  type="button"
                  onClick={() => setIsPlayerOpen(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: 9999,
                    padding: '5px 12px',
                    color: '#CBD5E1',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#FFFFFF';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#CBD5E1';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <ArrowRight size={12} style={{ transform: 'rotate(180deg)' }} />
                  <span>Minimize to Video Grid</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#22C55E', fontWeight: 650 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22C55E', animation: 'pulse 1.5s infinite' }} />
                  <span>YouTube Player Mode · {activeEpisode.showName}</span>
                </div>
              </div>

              <div
                ref={playerContainerRef}
              onClick={handleTogglePlay}
              onMouseMove={handleMouseMovePlayer}
              onMouseLeave={handleMouseLeavePlayer}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 9',
                backgroundColor: '#000000',
                borderRadius: isFullscreen ? 0 : '20px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.95)',
                cursor: controlsVisible ? 'pointer' : 'none',
                userSelect: 'none',
              }}
            >
              {/* Blurred Ambient Glow of that exact thumbnail */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${activeEpisode.exactThumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(32px) brightness(0.4)',
                transform: 'scale(1.15)',
                pointerEvents: 'none',
              }} />

              {/* The EXACT Video Thumbnail of that podcast (Zero mockup video) */}
              <img
                src={activeEpisode.exactThumbnail}
                alt={activeEpisode.title}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  zIndex: 2,
                }}
              />

              {/* YouTube Style Closed Caption (Subtitles) */}
              {currentSubtitle && isCcEnabled && (
                <div style={{
                  position: 'absolute',
                  bottom: controlsVisible ? 68 : 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.88)',
                  color: '#FFFFFF',
                  padding: '6px 16px',
                  borderRadius: 4,
                  fontSize: 'clamp(14px, 1.8vw, 18px)',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  textAlign: 'center',
                  maxWidth: '85%',
                  pointerEvents: 'none',
                  zIndex: 25,
                  transition: 'bottom 0.2s ease',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  {currentSubtitle}
                </div>
              )}

              {/* Center Play/Pause Ripple Animated Icon */}
              {rippleIcon && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 30,
                  animation: 'ping 0.5s cubic-bezier(0, 0, 0.2, 1)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
                }}>
                  {rippleIcon === 'play' ? (
                    <Play size={36} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: 4 }} />
                  ) : (
                    <Pause size={36} fill="#FFFFFF" color="#FFFFFF" />
                  )}
                </div>
              )}

              {/* Top Title Overlay (YouTube style on hover) */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: controlsVisible ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: controlsVisible ? 'auto' : 'none',
                zIndex: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={activeEpisode.avatar}
                    alt={activeEpisode.channelName}
                    style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)' }}
                  />
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                      {activeEpisode.title}
                    </h3>
                    <span style={{ fontSize: 11.5, color: '#22C55E', fontWeight: 600 }}>
                      48kHz Lossless Master • {activeEpisode.channelName}
                    </span>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#22C55E',
                  letterSpacing: '0.04em',
                }}>
                  24-BIT / 48kHz
                </div>
              </div>

              {/* ── YOUTUBE BOTTOM CONTROLS OVERLAY ── */}
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 60%, transparent 100%)',
                  padding: '0 16px 12px 16px',
                  opacity: controlsVisible ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                  pointerEvents: controlsVisible ? 'auto' : 'none',
                  zIndex: 20,
                }}
              >
                {/* 1. YouTube Red Progress Scrubber Bar */}
                <div
                  ref={progressBarRef}
                  onClick={handleScrubClick}
                  onMouseMove={handleScrubMouseMove}
                  onMouseLeave={() => setHoverScrubTime(null)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: isHoveringPlayer ? 6 : 4,
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    cursor: 'pointer',
                    borderRadius: 3,
                    marginBottom: 10,
                    transition: 'height 0.15s ease',
                  }}
                >
                  {/* Played Progress Bar (YouTube Red) */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${progressPercent}%`,
                    backgroundColor: '#FF0000',
                    borderRadius: 3,
                  }} />

                  {/* Scrubber Circular Knob */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${progressPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isHoveringPlayer ? 14 : 0,
                    height: isHoveringPlayer ? 14 : 0,
                    borderRadius: '50%',
                    backgroundColor: '#FF0000',
                    boxShadow: '0 0 4px rgba(0,0,0,0.8)',
                    transition: 'width 0.15s ease, height 0.15s ease',
                  }} />

                  {/* Hover Timestamp Tooltip */}
                  {hoverScrubTime !== null && (
                    <div style={{
                      position: 'absolute',
                      bottom: 14,
                      left: `${Math.min(95, Math.max(5, (hoverScrubTime / (duration || activeEpisode.duration || 1)) * 100))}%`,
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(28, 28, 28, 0.95)',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 3,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      pointerEvents: 'none',
                    }}>
                      {formatTime(hoverScrubTime)}
                    </div>
                  )}
                </div>

                {/* 2. YouTube Controls Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  {/* Left Controls: Prev, Play/Pause, Next, Volume, Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <button
                      type="button"
                      onClick={prevTrack}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0 }}
                      title="Previous"
                    >
                      <SkipBack size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0 }}
                      title={isPlaying ? 'Pause (k / Space)' : 'Play (k / Space)'}
                    >
                      {isPlaying ? (
                        <Pause size={24} fill="#FFFFFF" />
                      ) : (
                        <Play size={24} fill="#FFFFFF" style={{ marginLeft: 2 }} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={nextTrack}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0 }}
                      title="Next"
                    >
                      <SkipForward size={18} />
                    </button>

                    {/* Volume Speaker + Slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setIsMuted(!isMuted)}
                        style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0 }}
                        title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
                      >
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>

                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          setVolume(pct);
                          if (isMuted) setIsMuted(false);
                        }}
                        style={{
                          width: 55,
                          height: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: 2,
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: isMuted ? '0%' : `${volume * 100}%`,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 2,
                        }} />
                      </div>
                    </div>

                    {/* Timestamp: 04:15 / 1:22:00 */}
                    <div style={{ fontSize: 12, color: '#D4D4D8', fontWeight: 500, marginLeft: 4 }}>
                      <span>{formatTime(currentTime)}</span>
                      <span style={{ margin: '0 4px', color: '#71717A' }}>/</span>
                      <span style={{ color: '#A1A1AA' }}>{formatTime(duration || activeEpisode.duration)}</span>
                    </div>
                  </div>

                  {/* Right Controls: Autoplay, Subtitles (CC), Settings, Fullscreen */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Autoplay Toggle */}
                    <div 
                      onClick={() => setIsAutoPlay(!isAutoPlay)}
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                      title={isAutoPlay ? 'Autoplay is on' : 'Autoplay is off'}
                    >
                      <div style={{
                        width: 30,
                        height: 14,
                        borderRadius: 10,
                        backgroundColor: isAutoPlay ? '#22C55E' : 'rgba(255, 255, 255, 0.25)',
                        position: 'relative',
                        transition: 'background-color 0.2s ease',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 1,
                          left: isAutoPlay ? 17 : 2,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          transition: 'left 0.2s ease',
                        }} />
                      </div>
                    </div>

                    {/* Subtitles (CC) Button */}
                    <button
                      type="button"
                      onClick={() => setIsCcEnabled(!isCcEnabled)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isCcEnabled ? '#FFFFFF' : '#71717A',
                        cursor: 'pointer',
                        padding: 0,
                        position: 'relative',
                      }}
                      title="Subtitles / CC (c)"
                    >
                      <Subtitles size={20} />
                      {isCcEnabled && (
                        <span style={{
                          position: 'absolute',
                          bottom: -4,
                          left: 0,
                          right: 0,
                          height: 2,
                          backgroundColor: '#FF0000',
                          borderRadius: 2,
                        }} />
                      )}
                    </button>

                    {/* Settings / Speed Dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                          padding: 0,
                          transform: isSettingsOpen ? 'rotate(45deg)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                        title="Playback speed"
                      >
                        <Settings size={19} />
                      </button>

                      {isSettingsOpen && (
                        <div style={{
                          position: 'absolute',
                          bottom: 32,
                          right: 0,
                          backgroundColor: 'rgba(28, 28, 35, 0.95)',
                          backdropFilter: 'blur(16px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 12,
                          padding: '8px 0',
                          minWidth: 150,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                          zIndex: 50,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#71717A', padding: '4px 14px 6px 14px' }}>
                            PLAYBACK SPEED
                          </div>
                          {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => {
                                setPlaybackSpeed(spd);
                                setIsSettingsOpen(false);
                                triggerToast(`Playback speed: ${spd}x`);
                              }}
                              style={{
                                width: '100%',
                                padding: '6px 14px',
                                background: playbackSpeed === spd ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                color: playbackSpeed === spd ? '#22C55E' : '#FFFFFF',
                                fontSize: 12,
                                fontWeight: playbackSpeed === spd ? 700 : 500,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>{spd === 1 ? 'Normal' : `${spd}x`}</span>
                              {playbackSpeed === spd && <CheckCircle2 size={13} color="#22C55E" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0 }}
                      title={isFullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
                    >
                      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── YOUTUBE VIDEO TITLE, CHANNEL & ACTIONS ── */}
            <div>
              <h1 style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1.35,
                margin: '2px 0 10px 0',
              }}>
                {activeEpisode.title}
              </h1>

              {/* Channel Row & Action Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                paddingBottom: 16,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                {/* Left: Avatar, Name, Subs, Subscribe & Book Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={activeEpisode.avatar}
                    alt={activeEpisode.channelName}
                    onClick={() => handleOpenGuest(activeEpisode.guestId || 'guest-huberman')}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: '1.5px solid rgba(255, 255, 255, 0.2)',
                    }}
                  />
                  <div>
                    <div 
                      onClick={() => handleOpenGuest(activeEpisode.guestId || 'guest-huberman')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <span>{activeEpisode.channelName}</span>
                      <CheckCircle2 size={14} color="#A1A1AA" />
                    </div>
                    <span style={{ fontSize: 11.5, color: '#71717A' }}>
                      {activeEpisode.subscribers} • {activeEpisode.showName}
                    </span>
                  </div>

                  {/* Subscribe Pill Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubscribed(!isSubscribed);
                      triggerToast(isSubscribed ? 'Unsubscribed' : 'Subscribed to channel updates');
                    }}
                    style={{
                      backgroundColor: isSubscribed ? 'rgba(255, 255, 255, 0.1)' : '#FFFFFF',
                      color: isSubscribed ? '#FFFFFF' : '#000000',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginLeft: 8,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>

                  {/* Book Guest Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenBooking(activeEpisode.guestId || 'guest-huberman')}
                    style={{
                      backgroundColor: '#22C55E',
                      color: '#000000',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 10px rgba(34, 197, 94, 0.35)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Calendar size={14} />
                    <span>Book Guest</span>
                  </button>
                </div>

                {/* Right: Like, Share, 48kHz Master Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsLiked(!isLiked)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: isLiked ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                      color: isLiked ? '#22C55E' : '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '8px 16px',
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <ThumbsUp size={15} fill={isLiked ? '#22C55E' : 'none'} />
                    <span>{isLiked ? '143K' : '142K'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText?.(window.location.href);
                      triggerToast('Link copied to clipboard!');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '8px 16px',
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Share2 size={15} />
                    <span>Share</span>
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22C55E',
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22C55E' }} />
                    <span>48kHz Master</span>
                  </div>
                </div>
              </div>

              {/* ── YOUTUBE STYLE DESCRIPTION BOX WITH CHAPTERS ── */}
              <div 
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                style={{
                  backgroundColor: '#14131A',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  marginTop: 14,
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A1822'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#14131A'; }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
                  <span>{activeEpisode.views || '4.2M views'}</span>
                  <span style={{ margin: '0 8px', color: '#71717A' }}>•</span>
                  <span>{activeEpisode.releaseDate || 'Oct 2024'}</span>
                  <span style={{ margin: '0 8px', color: '#71717A' }}>•</span>
                  <span style={{ color: '#22C55E' }}>#{activeEpisode.category || 'Podcast'}</span>
                </div>

                <p style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: '#CBD5E1',
                  margin: 0,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: isDescriptionExpanded ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {activeEpisode.description}
                </p>

                {/* Clickable Chapters list */}
                {activeEpisode.chapters && isDescriptionExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginBottom: 10, letterSpacing: '0.04em' }}>
                      TIMESTAMPS & CHAPTERS:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {activeEpisode.chapters.map((ch) => (
                        <div
                          key={ch.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            seek(ch.start);
                            triggerToast(`Jumped to chapter: ${ch.title}`);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontSize: 12.5,
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: 6,
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <span style={{ color: '#22C55E', fontWeight: 700, minWidth: 44 }}>
                            {formatTime(ch.start)}
                          </span>
                          <span style={{ fontWeight: 600 }}>{ch.title}</span>
                          <span style={{ color: '#71717A', fontSize: 11.5 }}>— {ch.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 700, color: '#A1A1AA', marginTop: 10 }}>
                  {isDescriptionExpanded ? 'Show less' : '...more'}
                </div>
              </div>
            </div>
          </div>
        )}

          {/* ──────────────────────────────────────────────────────────────────────────
              04. EPISODES CATALOG GRID (When clicked, it plays in the YouTube player above!)
          ────────────────────────────────────────────────────────────────────────── */}
          <div style={{ marginTop: isPlayerOpen ? 16 : 8, paddingBottom: 60 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.01em',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>{isPlayerOpen ? 'Up Next & Recommended Episodes' : 'Master Lossless Podcast Episodes'}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#A855F7', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 8px', borderRadius: 999 }}>
                    {filteredEpisodes.length} AVAILABLE
                  </span>
                </h3>
                <p style={{ fontSize: 12.5, color: '#A1A1AA', margin: '4px 0 0 0' }}>
                  {isPlayerOpen 
                    ? 'Switch to another master episode below to stream in video player'
                    : 'Click any video card below to play like YouTube video player with live captions and master audio'}
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: '20px 18px',
            }}>
              {filteredEpisodes.map((ep) => {
                const isSelected = activeEpisode.id === ep.id;
                const isThisPlaying = isPlaying && isSelected;

                return (
                  <div
                    key={ep.id}
                    onClick={() => handlePodcastCardClick(ep)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Thumbnail Container */}
                    <div 
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        backgroundColor: '#16151D',
                        border: isSelected ? '2px solid #22C55E' : '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: isSelected ? '0 6px 24px rgba(34, 197, 94, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.5)',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <img 
                        src={ep.exactThumbnail} 
                        alt={ep.title} 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }} 
                      />

                      {/* Play / Active Overlay */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: isThisPlaying ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isThisPlaying ? 1 : 0,
                        transition: 'opacity 0.18s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={(e) => { if (!isThisPlaying) e.currentTarget.style.opacity = '0'; }}
                      >
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: isThisPlaying ? '#22C55E' : 'rgba(0,0,0,0.75)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                        }}>
                          {isThisPlaying ? (
                            <Pause size={20} fill="#000000" color="#000000" />
                          ) : (
                            <Play size={20} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: 3 }} />
                          )}
                        </div>
                      </div>

                      {/* Duration Badge */}
                      <div style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 6,
                        letterSpacing: '0.02em',
                      }}>
                        {formatTime(ep.duration)}
                      </div>

                      {/* Playing Badge */}
                      {isThisPlaying && (
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: '#22C55E',
                          color: '#000000',
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.04em',
                        }}>
                          PLAYING NOW
                        </div>
                      )}
                    </div>

                    {/* Card Details: Avatar + Metadata */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}>
                      <img 
                        src={ep.avatar} 
                        alt={ep.channelName} 
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1.5px solid rgba(255, 255, 255, 0.15)',
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: isThisPlaying ? '#22C55E' : '#FFFFFF',
                          lineHeight: 1.35,
                          margin: 0,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {ep.title}
                        </h4>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          color: '#A1A1AA',
                          marginTop: 4,
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ep.channelName}
                          </span>
                          <CheckCircle2 size={13} color="#A1A1AA" style={{ flexShrink: 0 }} />
                        </div>

                        <div style={{
                          fontSize: 11.5,
                          color: '#71717A',
                          marginTop: 2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          <span>{ep.views}</span>
                          <span>•</span>
                          <span>{ep.showName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Guest Profile Modal */}
      {guestForProfile && (
        <GuestProfileModal
          guest={guestForProfile}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onRequestInterview={() => {
            setIsProfileModalOpen(false);
            setGuestForBooking(guestForProfile);
            setIsBookingModalOpen(true);
          }}
        />
      )}

      {/* Booking Modal with Escrow Guarantee */}
      {guestForBooking && (
        <CreateBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          recipientUser={guestForBooking}
          recipient={guestForBooking}
          onSuccess={() => {
            setIsBookingModalOpen(false);
            navigate('/bookings');
          }}
        />
      )}
    </div>
  );
}
