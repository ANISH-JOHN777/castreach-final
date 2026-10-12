import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Heart, 
  MoreVertical, 
  Share2, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  Radio, 
  Activity,
  Layers,
  Sparkles,
  Compass,
  ArrowRight,
  Headphones,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import CreateBookingModal from '../components/CreateBookingModal';

export default function Discover() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTrack, isPlaying, playTrack, favorites, toggleFavorite } = useAudioPlayer();

  const initialCategory = searchParams.get('category') || 'New podcasts';
  const [selectedFilter, setSelectedFilter] = useState(initialCategory);

  // Booking Modal
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Live database data
  const [episodes, setEpisodes] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Professional Curated Episodes with real cover photography
  const curatedEpisodes = [
    {
      id: 'track-3',
      title: 'Healthy Lifestyle: The Search for Harmony',
      host: 'Liam Martinez',
      episodes: '12 episodes',
      category: 'Psychology',
      cover: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
      duration: 1650,
      durationStr: '27:30',
      themeColor: '#e11d48',
    },
    {
      id: 'track-4',
      title: 'Investing in Yourself',
      host: 'Noah Davis',
      episodes: '16 episodes',
      category: 'Business',
      cover: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=400&q=80',
      duration: 2280,
      durationStr: '38:00',
      themeColor: '#7c3aed',
    },
    {
      id: 'track-5',
      title: 'How Modern Gadgets Are Changing Our Lives',
      host: 'Jackson Brown',
      episodes: '10 episodes',
      category: 'Technology',
      cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80',
      duration: 1920,
      durationStr: '32:00',
      themeColor: '#0284c7',
    },
    {
      id: 'track-1',
      title: 'Psychological Approaches to Stress Reduction',
      host: 'Liam Martinez',
      episodes: '8 episodes',
      category: 'Psychology',
      cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
      duration: 2040,
      durationStr: '34:00',
      themeColor: '#2563eb',
    },
  ];

  // Featured Category Tracks (matching Image 2)
  const categoryTracks = [
    {
      id: 'track-6',
      title: 'Proper Diet & Metabolic Health',
      host: 'Andrius Peregorius',
      durationStr: '01:25',
      duration: 85,
      category: 'Sport',
      cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'track-7',
      title: 'Just Football Podcast',
      host: 'Andrius Peregorius',
      durationStr: '01:05',
      duration: 65,
      category: 'Sport',
      cover: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'track-8',
      title: "Let's Start on Monday",
      host: 'Robert Fox',
      durationStr: '00:12',
      duration: 720,
      category: 'Business',
      cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80',
    },
  ];

  // Featured 3 Cards (matching Image 2)
  const featuredCards = [
    {
      id: 'card-1',
      title: 'Sleep Magic',
      creator: 'Jessica Porter',
      bg: '#1e3a8a',
      cover: 'https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'card-2',
      title: 'Work Appropriate',
      creator: 'Crooked Media',
      bg: '#831843',
      cover: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'card-3',
      title: 'Elizabeth the First',
      creator: 'Imperative Entertainment',
      bg: '#0c4a6e',
      cover: 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?auto=format&fit=crop&w=600&q=80',
    },
  ];

  // Fetch real data from server
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
        console.warn('Discovery fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayEpisodes = curatedEpisodes.filter((ep) => {
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
      {/* ── TRENDING PODCAST HERO (MATCHING IMAGE 3) ──────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#6b7280',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 12,
          }}
        >
          TRENDING PODCAST
        </span>

        <div
          style={{
            background: '#1d4ed8',
            borderRadius: 24,
            padding: '36px 40px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
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
                background: 'rgba(255, 255, 255, 0.16)',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 14,
                letterSpacing: '0.02em',
              }}
            >
              People's favorite
            </div>

            <h2
              style={{
                fontSize: 'clamp(26px, 3.5vw, 36px)',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: 10,
                letterSpacing: '-0.02em',
              }}
            >
              How we can <br />
              save this world
            </h2>

            <p style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.85)', marginBottom: 20 }}>
              Ethan Anderson • Global perspectives & technological solutions
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
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
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

            {/* Slider Dots */}
            <div style={{ display: 'flex', gap: 6, marginTop: 22 }}>
              <span style={{ width: 20, height: 4, borderRadius: 2, background: '#ffffff' }} />
              <span style={{ width: 6, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
              <span style={{ width: 6, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>

          {/* Right artwork image */}
          <div
            style={{
              width: 170,
              height: 170,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80"
              alt="Episode Cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
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
                  cover: card.cover,
                  duration: 1800,
                  currentTime: 0,
                })
              }
              style={{
                background: card.bg,
                borderRadius: 22,
                padding: '24px 24px',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'rgba(255, 255, 255, 0.75)',
                    letterSpacing: '0.04em',
                  }}
                >
                  Featured Show
                </span>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={14} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
                </div>
              </div>

              <div>
                <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  {card.creator}
                </span>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginTop: 3 }}>
                  {card.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── YOU MIGHT LIKE (MATCHING IMAGES 2 & 3) ───────────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
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
              color: '#6b7280',
              cursor: 'pointer',
            }}
          >
            See all
          </button>
        </div>

        {/* Clean Filter Pills Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
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
                  background: isActive ? '#ffffff' : '#181920',
                  color: isActive ? '#0f1013' : '#9ca3af',
                  padding: '7px 16px',
                  borderRadius: 9999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: isActive ? '#ffffff' : '#23252e',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
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
                  background: '#15161c',
                  borderRadius: 18,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #23252e',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                  {/* Clean Artwork Thumbnail */}
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: '#23252e',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={ep.cover}
                      alt={ep.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                      background: isPlayingThis ? '#2563eb' : '#23252e',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
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
                  >
                    <Heart size={18} fill={isFav ? '#ef4444' : 'none'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SPORT & RECENT TRACKS (MATCHING IMAGE 2) ──────────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>Sport</h3>
          <span style={{ fontSize: 12, color: '#6b7280' }}>See all</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categoryTracks.map((track) => {
            const isPlayingThis = isPlaying && currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                style={{
                  background: '#15161c',
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
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#23252e',
                    }}
                  >
                    <img
                      src={track.cover}
                      alt={track.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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

      {/* ── PODCAST HOSTS & GUESTS (REAL DATA) ────────────────────────────── */}
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
              Podcast Hosts & Guests
            </h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Verified show hosts and guest speakers ready for recording sessions
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
                background: '#15161c',
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
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#2563eb',
                      overflow: 'hidden',
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
                        color: '#60a5fa',
                        background: 'rgba(37, 99, 235, 0.15)',
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
                  {h.bio || 'Verified podcast host and technology interviewer.'}
                </p>

                {h.expertise && h.expertise.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                    {h.expertise.map((exp, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 11,
                          background: '#1f2129',
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

      {/* Booking Modal */}
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
