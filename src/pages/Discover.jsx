import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Heart, 
  MoreVertical, 
  Share2, 
  Search, 
  Sparkles, 
  Mic2, 
  Calendar, 
  Star, 
  Users, 
  Radio, 
  Clock, 
  Check, 
  ExternalLink,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import CreateBookingModal from '../components/CreateBookingModal';

export default function Discover() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTrack, isPlaying, playTrack, favorites, toggleFavorite } = useAudioPlayer();

  // Active filter state
  const initialCategory = searchParams.get('category') || 'New podcasts';
  const [selectedFilter, setSelectedFilter] = useState(initialCategory);
  const [activeViewTab, setActiveViewTab] = useState(searchParams.get('tab') || 'episodes'); // 'episodes' | 'hosts' | 'trending'

  // Booking Modal State
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Server data state
  const [episodes, setEpisodes] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Trending slide index
  const [trendingSlide, setTrendingSlide] = useState(0);

  const filterTabs = [
    'New podcasts',
    'Popular',
    'Business',
    'Technology',
    'Psychology',
    'Sport',
    'Design',
    'All'
  ];

  // Static rich episodes matching Images 2 & 3
  const staticFeaturedEpisodes = [
    {
      id: 'track-3',
      title: 'Healthy lifestyle: The search for harmony',
      host: 'Liam Martinez',
      episodes: '12 episodes',
      category: 'Psychology',
      iconType: 'heart',
      color: '#ec4899',
      duration: 1650,
      cover: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'track-4',
      title: 'Investing in yourself',
      host: 'Noah Davis',
      episodes: '16 episodes',
      category: 'Business',
      iconType: 'clock',
      color: '#8b5cf6',
      duration: 2280,
      cover: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'track-5',
      title: 'How modern gadgets are changing our lives',
      host: 'Jackson Brown',
      episodes: '10 episodes',
      category: 'Technology',
      iconType: 'camera',
      color: '#06b6d4',
      duration: 1920,
      cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'track-1',
      title: 'Psychological approaches to stress reduction',
      host: 'Liam Martinez',
      episodes: '8 episodes',
      category: 'Psychology',
      iconType: 'heart',
      color: '#3b82f6',
      duration: 2040,
      cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    },
  ];

  // Sport tracks from Image 2
  const sportTracks = [
    {
      id: 'track-6',
      title: 'Proper diet',
      host: 'Andrius Peregorius',
      durationStr: '01:25',
      duration: 85,
      category: 'Sport',
      icon: '🍎',
      color: '#ea580c',
      cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'track-7',
      title: 'Just Football Podcast',
      host: 'Andrius Peregorius',
      durationStr: '01:05',
      duration: 65,
      category: 'Sport',
      icon: '⚽',
      color: '#2563eb',
      cover: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'track-8',
      title: "Let's start on Monday",
      host: 'Robert Fox',
      durationStr: '00:12',
      duration: 720,
      category: 'Business',
      icon: '📓',
      color: '#059669',
      cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80',
    },
  ];

  // Featured 3 Cards from Image 2
  const featuredCards = [
    {
      id: 'card-1',
      title: 'Sleep Magic',
      creator: 'Jessica Porter',
      bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      illustration: '🌙',
      color: '#3b82f6',
    },
    {
      id: 'card-2',
      title: 'Work Appropriate',
      creator: 'Crooked media',
      bg: 'linear-gradient(135deg, #fbcfe8, #f472b6)',
      illustration: '💻',
      color: '#f43f5e',
    },
    {
      id: 'card-3',
      title: 'Elizabeth the first',
      creator: 'Imperative Entertainment',
      bg: 'linear-gradient(135deg, #bae6fd, #60a5fa)',
      illustration: '⭐',
      color: '#0284c7',
    },
  ];

  // Fetch server data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [epRes, hostRes, guestRes] = await Promise.all([
          fetch('/api/podcasts/episodes/discover').catch(() => null),
          fetch('/api/discovery/hosts').catch(() => null),
          fetch('/api/discovery/guests').catch(() => null),
        ]);

        if (epRes && epRes.ok) {
          const epData = await epRes.json();
          if (isMounted && epData.episodes) setEpisodes(epData.episodes);
        }
        if (hostRes && hostRes.ok) {
          const hostData = await hostRes.json();
          if (isMounted && hostData.hosts) setHosts(hostData.hosts);
        }
        if (guestRes && guestRes.ok) {
          const guestData = await guestRes.json();
          if (isMounted && guestData.guests) setGuests(guestData.guests);
        }
      } catch (err) {
        console.warn('Discovery data fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter episodes
  const displayEpisodes = staticFeaturedEpisodes.filter((ep) => {
    if (selectedFilter === 'All' || selectedFilter === 'New podcasts' || selectedFilter === 'Popular') {
      return true;
    }
    return ep.category.toLowerCase().includes(selectedFilter.toLowerCase());
  });

  const handleOpenBooking = (target) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedRecipient(target);
    setIsBookingOpen(true);
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', color: '#f3f4f6' }}>
      {/* ── TOP SECTION: TRENDING HERO BANNER (MATCHING IMAGE 3) ────────── */}
      <div style={{ marginBottom: 36 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#9ca3af',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}
        >
          Trending Podcast
        </span>

        <div
          style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
            borderRadius: 24,
            padding: '36px 40px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(37, 99, 235, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 220,
          }}
        >
          <div style={{ maxWidth: 440, zIndex: 2 }}>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 16,
                letterSpacing: '0.02em',
              }}
            >
              People's favorite
            </div>

            <h2
              style={{
                fontSize: 'clamp(24px, 3.5vw, 36px)',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: 14,
                letterSpacing: '-0.02em',
              }}
            >
              How we can <br />
              save this world
            </h2>

            <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 20 }}>
              Ethan Anderson • Global perspectives & deep tech transformations
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() =>
                  playTrack({
                    id: 'track-2',
                    title: 'How we can save this world',
                    host: 'Ethan Anderson',
                    category: 'Technology',
                    cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80',
                    duration: 1800,
                    currentTime: 0,
                  })
                }
                style={{
                  background: '#ffffff',
                  color: '#0f1013',
                  padding: '9px 20px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }}
              >
                <Play size={14} fill="#0f1013" /> Play Now
              </button>

              <button
                type="button"
                onClick={() =>
                  handleOpenBooking({
                    id: 'host-ethan',
                    displayName: 'Ethan Anderson',
                    role: 'host',
                  })
                }
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '9px 18px',
                  borderRadius: 9999,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Book as Guest / Interview
              </button>
            </div>

            {/* Slider Dots matching Image 3 */}
            <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
              <span style={{ width: 22, height: 4, borderRadius: 2, background: '#ffffff' }} />
              <span style={{ width: 6, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
              <span style={{ width: 6, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>

          {/* Right illustration / graphic */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingRight: 20,
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 72,
              }}
            >
              🎙️
            </div>
          </div>
        </div>
      </div>

      {/* ── 3 FEATURED CARDS (MATCHING IMAGE 2) ─────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {featuredCards.map((card) => (
            <div
              key={card.id}
              onClick={() =>
                playTrack({
                  id: card.id,
                  title: card.title,
                  host: card.creator,
                  category: 'Featured',
                  cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
                  duration: 1800,
                  currentTime: 100,
                })
              }
              style={{
                background: card.bg,
                borderRadius: 22,
                padding: '24px 26px',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 32 }}>{card.illustration}</span>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={14} fill="#fff" color="#fff" />
                </div>
              </div>

              <div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {card.creator}
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                  {card.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION: YOU MIGHT LIKE (MATCHING IMAGE 2 & 3) ────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>You might like</h3>
          <button
            type="button"
            onClick={() => setSelectedFilter('All')}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 12,
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            See all
          </button>
        </div>

        {/* Filter Pills Tabs (matching Image 2 & 3) */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 6,
            marginBottom: 20,
            scrollbarWidth: 'none',
          }}
        >
          {filterTabs.map((tab) => {
            const isActive = selectedFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedFilter(tab)}
                style={{
                  background: isActive ? '#ffffff' : '#1c1d24',
                  color: isActive ? '#0f1013' : '#9ca3af',
                  padding: '7px 16px',
                  borderRadius: 9999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(255,255,255,0.2)' : 'none',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Episode Cards Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayEpisodes.map((ep) => {
            const isFav = favorites.includes(ep.id);
            const isPlayingThis = isPlaying && currentTrack?.id === ep.id;

            return (
              <div
                key={ep.id}
                style={{
                  background: '#16171d',
                  borderRadius: 18,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #23252e',
                  transition: 'background 0.2s, transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1c1e26';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#16171d';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Left: Custom Illustration Icon + Titles */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                  {/* Icon Card matching Image 3 (Pink heart, Purple clock, Camera) */}
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: '#23252e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {ep.iconType === 'heart' && (
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: '#ec4899',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Heart size={18} fill="#fff" color="#fff" />
                      </div>
                    )}
                    {ep.iconType === 'clock' && (
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: '#8b5cf6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Clock size={18} color="#fff" />
                      </div>
                    )}
                    {ep.iconType === 'camera' && (
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: '#06b6d4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Radio size={18} color="#fff" />
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4
                      style={{
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: '#f3f4f6',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4,
                      }}
                    >
                      {ep.title}
                    </h4>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>
                      {ep.host} • {ep.episodes}
                    </p>
                  </div>
                </div>

                {/* Right Actions: Play, Like, More */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    type="button"
                    onClick={() =>
                      playTrack({
                        id: ep.id,
                        title: ep.title,
                        host: ep.host,
                        category: ep.category,
                        cover: ep.cover,
                        duration: ep.duration,
                        currentTime: 0,
                      })
                    }
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: isPlayingThis ? '#3b82f6' : '#23252e',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    title={isPlayingThis ? 'Pause' : 'Play'}
                  >
                    {isPlayingThis ? (
                      <Pause size={15} fill="#fff" />
                    ) : (
                      <Play size={15} fill="#fff" style={{ marginLeft: 2 }} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(ep.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isFav ? '#ef4444' : '#6b7280',
                      cursor: 'pointer',
                      padding: 6,
                    }}
                    title="Like"
                  >
                    <Heart size={18} fill={isFav ? '#ef4444' : 'none'} />
                  </button>

                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: 6,
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION: SPORT / TRACK LIST (MATCHING IMAGE 2) ────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>Sport & Fitness</h3>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>See all</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sportTracks.map((track) => {
            const isPlayingThis = isPlaying && currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                style={{
                  background: '#16171d',
                  borderRadius: 16,
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #23252e',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button
                    type="button"
                    onClick={() =>
                      playTrack({
                        id: track.id,
                        title: track.title,
                        host: track.host,
                        category: track.category,
                        cover: track.cover,
                        duration: track.duration,
                        currentTime: 0,
                      })
                    }
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: isPlayingThis ? '#2563eb' : '#23252e',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {isPlayingThis ? <Pause size={14} fill="#fff" /> : <Play size={14} fill="#fff" style={{ marginLeft: 2 }} />}
                  </button>

                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: '#23252e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    {track.icon}
                  </div>

                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>{track.title}</h5>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>
                      {track.host} | {track.durationStr}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(track.id)}
                    style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                  >
                    <Heart size={16} />
                  </button>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION: HOST & GUEST MATCHING MARKETPLACE ───────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>
              🎙️ Podcast Hosts & Guests to Book
            </h3>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              Connect directly with verified show hosts and guest speakers for upcoming recordings
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 18,
          }}
        >
          {hosts.slice(0, 3).map((h) => (
            <div
              key={h.id}
              style={{
                background: '#16171d',
                borderRadius: 20,
                padding: '20px',
                border: '1px solid #23252e',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      background: '#2563eb',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={
                        h.avatar ||
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={h.displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#f3f4f6' }}>
                      {h.displayName}
                    </h4>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#3b82f6',
                        background: 'rgba(59, 130, 246, 0.12)',
                        padding: '2px 8px',
                        borderRadius: 10,
                        fontWeight: 600,
                      }}
                    >
                      Host • {h.podcastCount || 1} Show
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginBottom: 16 }}>
                  {h.bio || 'Experienced podcast host and tech interviewer.'}
                </p>

                {h.expertise && h.expertise.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                    {h.expertise.map((exp, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11,
                          background: '#23252e',
                          color: '#d1d5db',
                          padding: '3px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => handleOpenBooking(h)}
                  style={{
                    flex: 1,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 14px',
                    borderRadius: 12,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Calendar size={14} /> Book Session
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/messages')}
                  style={{
                    background: '#1f2028',
                    color: '#d1d5db',
                    border: '1px solid #2e303d',
                    padding: '9px 14px',
                    borderRadius: 12,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CREATE BOOKING MODAL ─────────────────────────────────────────── */}
      {isBookingOpen && (
        <CreateBookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          recipientUser={selectedRecipient}
          onSuccess={() => {
            setIsBookingOpen(false);
            navigate('/bookings');
          }}
        />
      )}
    </div>
  );
}
