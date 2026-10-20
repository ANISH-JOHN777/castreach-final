import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Search, 
  LayoutGrid,
  Radio,
  Zap,
  Flame,
  Bookmark,
  Share2,
  Calendar,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Rss,
  Headphones,
  Tv,
  ArrowRight,
  Sparkles,
  Layers,
  Users,
  Compass,
  Cpu,
  Smile,
  ShieldCheck,
  Award,
  ExternalLink,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { PODCAST_CATALOG } from '../podcast';
import { GUEST_CATALOG } from '../data/guests';
import GuestProfileModal from '../components/GuestProfileModal';
import CreateBookingModal from '../components/CreateBookingModal';

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [activeNav, setActiveNav] = useState('podcasts');
  const [sortOrder, setSortOrder] = useState('recent');
  const [copiedPlatform, setCopiedPlatform] = useState('');

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [guestForProfile, setGuestForProfile] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [guestForBooking, setGuestForBooking] = useState(null);

  // 1. TOP GENRES (Image 2 style with monthly listeners)
  const TOP_GENRES = [
    { id: 'gen-all', name: 'All Topics', listeners: '180k monthly listeners', icon: Compass },
    { id: 'gen-neuro', name: 'Neuroscience & Cognition', listeners: '74k monthly listeners', icon: Cpu },
    { id: 'gen-tech', name: 'Technology & AI', listeners: '63k monthly listeners', icon: Zap },
    { id: 'gen-comedy', name: 'Comedy & Culture', listeners: '61k monthly listeners', icon: Smile },
    { id: 'gen-mindset', name: 'Mental Health & Mindset', listeners: '59k monthly listeners', icon: ShieldCheck },
    { id: 'gen-business', name: 'Startups & Venture', listeners: '55k monthly listeners', icon: TrendingUp },
  ];

  // 2. LATEST EPISODES (Image 1 Bankless style cards with bold typographic stamps)
  const LATEST_EPISODES = [
    {
      id: 'huberman-habits-01',
      tagTitle: 'MENTAL RESILIENCE?',
      title: 'Become Mentally Dangerous With Daily Habits',
      guestName: 'Dr. Andrew Huberman',
      hostName: 'Raj Shamani',
      published: 'Today',
      coverImage: PODCAST_CATALOG[0]?.coverImage,
      episode: PODCAST_CATALOG[0],
      avatars: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
      ],
      guestId: 'guest-huberman',
    },
    {
      id: 'druski-overnight-success-02',
      tagTitle: 'OVERNIGHT SUCCESS?',
      title: "They're Lying To You About Overnight Success",
      guestName: 'Druski (Drew Desbordes)',
      hostName: 'The Pivot Podcast',
      published: '2 Days ago',
      coverImage: PODCAST_CATALOG[1]?.coverImage,
      episode: PODCAST_CATALOG[1],
      avatars: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=100&auto=format&fit=crop&q=80'
      ],
      guestId: 'guest-druski',
    },
    {
      id: 'tom-holland-anxiety-03',
      tagTitle: 'SOCIAL ANXIETY?',
      title: 'The Mindset That Changed Everything & Sobriety',
      guestName: 'Tom Holland',
      hostName: 'Jay Shetty (On Purpose)',
      published: '3 Days ago',
      coverImage: PODCAST_CATALOG[2]?.coverImage,
      episode: PODCAST_CATALOG[2],
      avatars: [
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100&auto=format&fit=crop&q=80'
      ],
      guestId: 'guest-tomholland',
    },
    {
      id: 'sam-altman-compute-04',
      tagTitle: 'SUPERINTELLIGENCE?',
      title: 'The Next Decade of Autonomous Compute & AGI',
      guestName: 'Sam Altman',
      hostName: 'Lex Fridman Podcast',
      published: '4 Days ago',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      episode: PODCAST_CATALOG[0],
      avatars: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80'
      ],
      guestId: 'guest-huberman',
    },
  ];

  // 3. LISTEN VIA PLATFORMS (Image 1 Bankless style)
  const LISTEN_VIA = [
    {
      id: 'rss',
      title: 'RSS Feed',
      desc: 'CastReach Lossless XML Feed',
      icon: Rss,
      accent: '#F97316',
      badgeBg: 'rgba(249, 115, 22, 0.15)',
      link: 'https://castreach.com/feed.xml',
    },
    {
      id: 'apple',
      title: 'Apple Podcasts',
      desc: 'Official 48kHz HD Channel',
      icon: Headphones,
      accent: '#A855F7',
      badgeBg: 'rgba(168, 85, 247, 0.15)',
      link: 'https://podcasts.apple.com',
    },
    {
      id: 'spotify',
      title: 'Spotify',
      desc: 'Lossless Streaming & Video',
      icon: Radio,
      accent: '#22C55E',
      badgeBg: 'rgba(34, 197, 94, 0.15)',
      link: 'https://spotify.com',
    },
    {
      id: 'youtube',
      title: 'YouTube',
      desc: '4K Studio Multi-Cam Cuts',
      icon: Tv,
      accent: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      link: 'https://youtube.com',
    },
  ];

  // 4. TOP PODCASTS (Image 2 style colorful brand cards)
  const TOP_PODCASTS = [
    {
      id: 'show-doac',
      title: 'THE DIARY OF A CEO',
      subtitle: 'Steven Bartlett',
      bgGradient: 'linear-gradient(135deg, #1C1917, #0C0A09)',
      badge: 'DOAC',
      badgeColor: '#FFFFFF',
      badgeBg: '#000000',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      accent: '#FFFFFF',
      episode: PODCAST_CATALOG[0],
    },
    {
      id: 'show-huberman',
      title: 'HUBERMAN LAB',
      subtitle: 'Dr. Andrew Huberman',
      bgGradient: 'linear-gradient(135deg, #1E1B4B, #0F172A)',
      badge: 'STANFORD',
      badgeColor: '#22C55E',
      badgeBg: 'rgba(34, 197, 94, 0.2)',
      image: PODCAST_CATALOG[0]?.coverImage,
      accent: '#22C55E',
      episode: PODCAST_CATALOG[0],
    },
    {
      id: 'show-pivot',
      title: 'THE PIVOT PODCAST',
      subtitle: 'Ryan Clark & Channing Crowder',
      bgGradient: 'linear-gradient(135deg, #4A044E, #1F0728)',
      badge: 'COULDA BEEN',
      badgeColor: '#A855F7',
      badgeBg: 'rgba(168, 85, 247, 0.2)',
      image: PODCAST_CATALOG[1]?.coverImage,
      accent: '#A855F7',
      episode: PODCAST_CATALOG[1],
    },
    {
      id: 'show-purpose',
      title: 'ON PURPOSE',
      subtitle: 'Jay Shetty',
      bgGradient: 'linear-gradient(135deg, #7F1D1D, #450A0A)',
      badge: 'MINDSET',
      badgeColor: '#F87171',
      badgeBg: 'rgba(239, 68, 68, 0.2)',
      image: PODCAST_CATALOG[2]?.coverImage,
      accent: '#F87171',
      episode: PODCAST_CATALOG[2],
    },
    {
      id: 'show-lex',
      title: 'LEX FRIDMAN PODCAST',
      subtitle: 'Lex Fridman',
      bgGradient: 'linear-gradient(135deg, #022C22, #064E3B)',
      badge: 'AI & AGI',
      badgeColor: '#34D399',
      badgeBg: 'rgba(52, 211, 153, 0.2)',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&auto=format&fit=crop&q=80',
      accent: '#34D399',
      episode: PODCAST_CATALOG[0],
    },
  ];

  // 5. Filtered Episodes for "Browse All Episodes"
  const allBrowseEpisodes = useMemo(() => {
    let list = [
      ...PODCAST_CATALOG,
      {
        id: 'alon-pumpfun-05',
        title: 'The Next Chapter for Pump.Fun | Co-Founder Alon',
        subtitle: 'Decentralized Token Mechanics & Scaled Liquidity Engines',
        host: 'Bankless Rollup',
        guest: 'Alon',
        show: 'Bankless Weekly Rollup',
        category: 'Tech & AI Pioneers',
        audioUrl: PODCAST_CATALOG[0]?.audioUrl,
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
        duration: 3600,
        views: '1.4M plays',
        releaseDate: 'Today',
        publishedTag: 'Published in Rollup · Today',
      }
    ];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(ep => 
        ep.title?.toLowerCase().includes(q) ||
        ep.guest?.toLowerCase().includes(q) ||
        ep.host?.toLowerCase().includes(q) ||
        ep.category?.toLowerCase().includes(q)
      );
    }

    if (selectedGenre !== 'All' && selectedGenre !== 'All Topics') {
      list = list.filter(ep => ep.category?.toLowerCase().includes(selectedGenre.toLowerCase().slice(0, 5)));
    }

    return list;
  }, [searchQuery, selectedGenre]);

  const handlePlayEpisode = (ep) => {
    if (currentTrack?.id === ep.id) {
      togglePlay();
    } else {
      playTrack(ep);
    }
  };

  const handleOpenBooking = (guestId) => {
    const matched = GUEST_CATALOG.find(g => g.id === guestId) || GUEST_CATALOG[0];
    setGuestForBooking(matched);
    setIsBookingModalOpen(true);
  };

  const handleCopyPlatform = (platform) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(platform.link);
      setCopiedPlatform(platform.title);
      setTimeout(() => setCopiedPlatform(''), 2000);
    }
  };

  return (
    <div style={{
      backgroundColor: '#0A090E',
      color: '#FFFFFF',
      minHeight: '100vh',
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      userSelect: 'none',
    }}>
      {/* Toast Alert */}
      {copiedPlatform && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 24,
          zIndex: 9999,
          background: 'rgba(34, 197, 94, 0.95)',
          color: '#000000',
          fontWeight: 700,
          fontSize: 13,
          padding: '8px 18px',
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
        }}>
          <CheckCircle2 size={16} /> Link for {copiedPlatform} copied!
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. LEFT NAVIGATION SIDEBAR (Image 1 Bankless style) */}
      {/* ======================================================== */}
      <aside style={{
        width: 220,
        minWidth: 220,
        backgroundColor: '#09080D',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '24px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Logo with Red Underline Accent (Bankless Style) */}
          <Link to="/" style={{ textDecoration: 'none', paddingLeft: 10 }}>
            <div style={{
              fontSize: 19,
              fontWeight: 900,
              letterSpacing: '0.06em',
              color: '#FFFFFF',
              position: 'relative',
              display: 'inline-block',
            }}>
              CASTREACH
              <div style={{
                position: 'absolute',
                bottom: -4,
                left: 0,
                width: '60%',
                height: 2.5,
                backgroundColor: '#EF4444',
                borderRadius: 2,
              }} />
            </div>
          </Link>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                color: '#9E9AA6',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9E9AA6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <LayoutGrid size={16} />
              <span>Overview</span>
            </Link>

            {/* Active Podcasts Capsule */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
            }}>
              <Play size={14} fill="#EF4444" color="#EF4444" />
              <span>Podcasts</span>
            </div>

            <Link
              to="/listen"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                color: '#9E9AA6',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9E9AA6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Headphones size={16} />
              <span>Listen Room (HD)</span>
            </Link>

            <Link
              to="/find-guests"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                color: '#22C55E',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 700,
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={16} />
              <span>Book Guests</span>
            </Link>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              color: '#9E9AA6',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              <Zap size={16} />
              <span>Premium Feed</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 10,
              color: '#9E9AA6',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              <Sparkles size={16} />
              <span>AI Agents</span>
            </div>
          </nav>
        </div>

        {/* Bottom Escrow Badge */}
        <div style={{
          backgroundColor: '#121118',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 12,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontSize: 11, fontWeight: 700 }}>
            <ShieldCheck size={14} />
            <span>Escrow Protected</span>
          </div>
          <p style={{ margin: 0, fontSize: 10.5, color: '#7E7A87', lineHeight: 1.4 }}>
            Guaranteed funds release upon interview wrap.
          </p>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN STREAMING CONTENT CANVAS */}
      {/* ======================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Top Header & Crypto/Metrics Live Ticker Bar (Image 1 Bankless style) */}
        <header style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: '#0A090E',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Top Bar with Search & User Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 32px',
            gap: 20,
          }}>
            {/* Search Pill */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
              <Search size={15} color="#7E7A87" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search episodes, guests, topics..."
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 999,
                  backgroundColor: '#14131A',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingLeft: 40,
                  paddingRight: 16,
                  color: '#FFFFFF',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            {/* Actions: Sign In, Subscribe, Upgrade to Paid / Book */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Link to="/login" style={{ color: '#E2DFE7', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Sign In
              </Link>
              <button
                type="button"
                onClick={() => handleOpenBooking('guest-huberman')}
                style={{
                  backgroundColor: '#1E1C26',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 999,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Subscribe
              </button>
              <Link
                to="/find-guests"
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 999,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.35)',
                }}
              >
                Book Guest
              </Link>
            </div>
          </div>

          {/* Live Metrics / Crypto Ticker Row (Image 1 style) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '8px 32px',
            backgroundColor: '#07060A',
            borderTop: '1px solid rgba(255, 255, 255, 0.03)',
            fontSize: 11.5,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A39EA9' }}>
              <span style={{ color: '#38BDF8' }}>● ADA</span> $0.61 <span style={{ color: '#EF4444' }}>-0.12%</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A39EA9' }}>
              <span style={{ color: '#38BDF8' }}>● TON</span> $2.94 <span style={{ color: '#22C55E' }}>+0.85%</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A39EA9' }}>
              <span style={{ color: '#F97316' }}>● SHIB</span> $0.00 <span style={{ color: '#EF4444' }}>-0.91%</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A39EA9' }}>
              <span style={{ color: '#EF4444' }}>● AVAX</span> $19.01 <span style={{ color: '#22C55E' }}>+0.38%</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A39EA9' }}>
              <span style={{ color: '#22C55E' }}>● BCH</span> $359.46 <span style={{ color: '#22C55E' }}>+5.84%</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A39EA9' }}>
              <span style={{ color: '#38BDF8' }}>● LINK</span> $12.47 <span style={{ color: '#22C55E' }}>+0.12%</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A39EA9' }}>
              <span style={{ color: '#FBBF24' }}>● LOSSLESS 24-bit</span> 48kHz Master <span style={{ color: '#22C55E' }}>Active</span>
            </span>
          </div>
        </header>

        {/* Scrollable Main Stream */}
        <main style={{
          padding: '28px 32px 100px 32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
        }}>

          {/* ======================================================== */}
          {/* 3. HERO BILLBOARD + TOP GENRES SIDEBAR (Image 2 exact style) */}
          {/* ======================================================== */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 310px',
            gap: 24,
            alignItems: 'stretch',
          }}>
            {/* Cinematic Large Billboard with Floating Episode Pill */}
            <div style={{
              position: 'relative',
              borderRadius: 20,
              backgroundColor: '#121118',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              minHeight: 340,
              display: 'flex',
              padding: '36px',
            }}>
              {/* Left Typography & Details */}
              <div style={{
                flex: 1,
                maxWidth: 480,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 3,
              }}>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: 'clamp(28px, 3.4vw, 42px)',
                    fontWeight: 900,
                    lineHeight: 1.1,
                    letterSpacing: '-0.03em',
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                  }}>
                    BECOME MENTALLY DANGEROUS WITH THESE DAILY HABITS
                  </h1>
                  <p style={{
                    margin: '12px 0 0 0',
                    fontSize: 14,
                    color: '#A39EA9',
                    lineHeight: 1.5,
                  }}>
                    Neurobiologist Dr. Andrew Huberman breaks down circadian photons, dopamine baseline resets, and autonomic nervous system regulation.
                  </p>
                </div>

                {/* Floating Episode Pill Overlay (Image 2 style) */}
                <div style={{
                  marginTop: 24,
                  backgroundColor: 'rgba(20, 18, 27, 0.92)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 14,
                  padding: '10px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 14,
                  maxWidth: 380,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                }}>
                  <img
                    src={PODCAST_CATALOG[0]?.coverImage}
                    alt="Ep1"
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Ep1. Circadian Drive & Reset
                    </div>
                    <div style={{ fontSize: 11, color: '#7E7A87' }}>
                      1 hour 22 minutes
                    </div>
                  </div>

                  {/* Positive Green Play Button */}
                  <button
                    type="button"
                    onClick={() => handlePlayEpisode(PODCAST_CATALOG[0])}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#22C55E',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(34, 197, 94, 0.45)',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isPlaying && currentTrack?.id === PODCAST_CATALOG[0]?.id ? (
                      <Pause size={16} fill="#0D0C12" color="#0D0C12" />
                    ) : (
                      <Play size={16} fill="#0D0C12" color="#0D0C12" style={{ marginLeft: 2 }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Right Speaker Studio Photo (Image 2 style) */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: 0,
                width: '48%',
                overflow: 'hidden',
              }}>
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
                  alt="Speaker"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, #121118 0%, rgba(18, 17, 24, 0.5) 40%, transparent 100%)',
                }} />
              </div>
            </div>

            {/* Right-Hand Sidebar: TOP GENRES (Image 2 exact style) */}
            <div style={{
              backgroundColor: '#121118',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#7E7A87',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}>
                  Top Genres
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {TOP_GENRES.map((g) => {
                    const isSelected = selectedGenre === g.name;
                    const IconComp = g.icon;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGenre(isSelected ? 'All' : g.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '6px 8px',
                          borderRadius: 10,
                          backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          backgroundColor: '#1C1A24',
                          border: isSelected ? '1px solid #22C55E' : '1px solid rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <IconComp size={15} color={isSelected ? '#22C55E' : '#A39EA9'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#22C55E' : '#FFFFFF' }}>
                            {g.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#7E7A87', marginTop: 1 }}>
                            {g.listeners}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* View all genres link */}
              <button
                type="button"
                onClick={() => setSelectedGenre('All')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#22C55E',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>Reset to All Genres</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. LATEST EPISODES ROW (Image 1 Bankless style) */}
          {/* ======================================================== */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                  Latest
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGenre('All')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7E7A87',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                See All
              </button>
            </div>

            {/* 4 Cards Grid (Bankless style) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}>
              {LATEST_EPISODES.map((ep) => {
                const isThisPlaying = isPlaying && currentTrack?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => handlePlayEpisode(ep.episode)}
                    style={{
                      backgroundColor: '#121118',
                      borderRadius: 16,
                      border: isThisPlaying ? '1px solid #22C55E' : '1px solid rgba(255, 255, 255, 0.06)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = isThisPlaying ? '#22C55E' : 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Thumbnail with Bold Headline Stamp */}
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '62%',
                      backgroundColor: '#1A1822',
                    }}>
                      <img
                        src={ep.coverImage}
                        alt={ep.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(10, 9, 14, 0.8) 100%)',
                      }} />

                      {/* Bold Stamp Badge */}
                      <span style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        fontSize: 14,
                        fontWeight: 900,
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      }}>
                        {ep.tagTitle}
                      </span>

                      {/* Play Button Icon Overlay */}
                      <div style={{
                        position: 'absolute',
                        bottom: 10,
                        right: 10,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: isThisPlaying ? '#22C55E' : 'rgba(0,0,0,0.65)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isThisPlaying ? (
                          <Pause size={14} fill="#000000" color="#000000" />
                        ) : (
                          <Play size={14} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: 2 }} />
                        )}
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      <div style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: isThisPlaying ? '#22C55E' : '#FFFFFF',
                        lineHeight: 1.35,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {ep.title}
                      </div>

                      <div style={{
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      }}>
                        <span style={{ fontSize: 11, color: '#7E7A87' }}>
                          {ep.published}
                        </span>

                        {/* Guest Avatars Stack */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {ep.avatars.map((av, aIdx) => (
                            <img
                              key={aIdx}
                              src={av}
                              alt="Avatar"
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                border: '1.5px solid #121118',
                                marginLeft: aIdx > 0 ? -6 : 0,
                                objectFit: 'cover',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. LISTEN VIA SECTION (Image 1 Bankless style) */}
          {/* ======================================================== */}
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#7E7A87',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              Listen Via
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}>
              {LISTEN_VIA.map((plat) => {
                const IconComp = plat.icon;
                return (
                  <div
                    key={plat.id}
                    onClick={() => handleCopyPlatform(plat)}
                    style={{
                      backgroundColor: '#121118',
                      borderRadius: 16,
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#181722';
                      e.currentTarget.style.borderColor = plat.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#121118';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    {/* Platform Icon */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: plat.badgeBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <IconComp size={22} color={plat.accent} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                        {plat.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#7E7A87', marginTop: 2 }}>
                        {plat.desc}
                      </div>
                    </div>

                    {/* Subtle Large Watermark Icon on background */}
                    <IconComp
                      size={64}
                      color={plat.accent}
                      style={{
                        position: 'absolute',
                        right: -10,
                        bottom: -10,
                        opacity: 0.06,
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 6. TOP PODCASTS ROW (Image 2 style graphic album cards) */}
          {/* ======================================================== */}
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#7E7A87',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              Top Podcasts
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 16,
            }}>
              {TOP_PODCASTS.map((show) => (
                <div
                  key={show.id}
                  onClick={() => handlePlayEpisode(show.episode)}
                  style={{
                    backgroundColor: '#121118',
                    borderRadius: 18,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = show.accent;
                    e.currentTarget.style.boxShadow = `0 10px 24px rgba(0,0,0,0.6), 0 0 16px ${show.accent}22`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Square Graphic Cover */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: '100%',
                    background: show.bgGradient,
                    overflow: 'hidden',
                  }}>
                    <img
                      src={show.image}
                      alt={show.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.65,
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 30%, rgba(10, 9, 14, 0.85) 100%)',
                    }} />

                    {/* Top Badge */}
                    <span style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      fontSize: 10,
                      fontWeight: 800,
                      color: show.badgeColor,
                      backgroundColor: show.badgeBg,
                      padding: '3px 8px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                    }}>
                      {show.badge}
                    </span>

                    {/* Center Large Show Name */}
                    <div style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      right: 12,
                      fontSize: 14,
                      fontWeight: 900,
                      color: '#FFFFFF',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}>
                      {show.title}
                    </div>
                  </div>

                  {/* Subtitle */}
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#7E7A87' }}>
                      {show.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 7. BROWSE ALL EPISODES (Image 1 Bankless bottom style) */}
          {/* ======================================================== */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                Browse All Episodes
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Filter Pill */}
                <button
                  type="button"
                  onClick={() => setSelectedGenre('All')}
                  style={{
                    backgroundColor: '#14131A',
                    color: '#A39EA9',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 999,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <SlidersHorizontal size={13} />
                  <span>Filters</span>
                </button>

                {/* Sort Dropdown */}
                <div style={{
                  backgroundColor: '#14131A',
                  color: '#A39EA9',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span>Most Recent</span>
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>

            {/* Episode List Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allBrowseEpisodes.map((ep) => {
                const isThisPlaying = isPlaying && currentTrack?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => handlePlayEpisode(ep)}
                    style={{
                      backgroundColor: '#121118',
                      borderRadius: 16,
                      border: isThisPlaying ? '1px solid #22C55E' : '1px solid rgba(255, 255, 255, 0.06)',
                      padding: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#181722';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#121118';
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      position: 'relative',
                      width: 130,
                      height: 80,
                      minWidth: 130,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: '#1A1822',
                    }}>
                      <img
                        src={ep.coverImage}
                        alt={ep.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Metadata */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#7E7A87', fontWeight: 600, marginBottom: 4 }}>
                        {ep.publishedTag || `Published in ${ep.show || ep.host} · Oct 2024`}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                        {/* Play Icon Circle */}
                        <div style={{
                          width: 32,
                          height: 32,
                          minWidth: 32,
                          borderRadius: '50%',
                          backgroundColor: isThisPlaying ? '#22C55E' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isThisPlaying ? (
                            <Pause size={14} fill="#000000" color="#000000" />
                          ) : (
                            <Play size={14} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
                          )}
                        </div>

                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: isThisPlaying ? '#22C55E' : '#FFFFFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {ep.title}
                        </div>
                      </div>
                    </div>

                    {/* Quick Book Button in Positive Green */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenBooking(ep.guestId || 'guest-huberman');
                      }}
                      style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        color: '#22C55E',
                        padding: '8px 16px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#22C55E';
                        e.currentTarget.style.color = '#000000';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.12)';
                        e.currentTarget.style.color = '#22C55E';
                      }}
                    >
                      Send Invite
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Global Booking & Profile Modals */}
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

      {guestForBooking && (
        <CreateBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          recipientUser={guestForBooking}
          recipient={guestForBooking}
          initialRecipient={guestForBooking}
          guest={guestForBooking}
          onSuccess={() => {
            setIsBookingModalOpen(false);
            navigate('/bookings');
          }}
        />
      )}
    </div>
  );
}
