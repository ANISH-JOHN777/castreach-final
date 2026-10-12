import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Search, 
  Headphones, 
  Radio, 
  Clock, 
  Share2, 
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  User,
  SlidersHorizontal
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function Episodes() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const categories = ['All', 'Technology', 'Venture & Startups', 'Culture & Society', 'Design', 'Science', 'Entertainment'];

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const query = category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
    fetch(`/api/podcasts/episodes/discover${query}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) {
          const list = data?.episodes || [];
          setEpisodes(list);
          if (list.length > 0 && !selectedEpisode) {
            setSelectedEpisode(list[0]);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [category]);

  const filteredEpisodes = episodes.filter((ep) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ep.title?.toLowerCase().includes(q) ||
      ep.description?.toLowerCase().includes(q) ||
      ep.owner?.displayName?.toLowerCase().includes(q) ||
      ep.podcast?.title?.toLowerCase().includes(q)
    );
  });

  const handlePlay = (ep) => {
    playTrack({
      id: ep.id,
      title: ep.title,
      host: ep.owner?.displayName || ep.podcast?.title || 'Podcast Host',
      coverImage: ep.podcast?.coverImage || '',
      category: ep.podcast?.category || ep.topics?.[0] || 'Podcast',
      audioUrl: ep.audioUrl,
    });
  };

  return (
    <div style={{ background: 'var(--bg-obsidian)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 24px 120px' }}>
        {/* Header Breadcrumb & Title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            ARCHIVE & BROADCASTS
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 850, letterSpacing: '-0.03em', margin: 0 }}>
              All Episodes
            </h1>
            
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 280 }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search episodes, hosts, topics…"
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 38px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Categories Bar */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 32 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 12.5,
                fontWeight: 650,
                whiteSpace: 'nowrap',
                border: '1px solid',
                borderColor: category === cat ? 'var(--accent-lime)' : 'var(--border-subtle)',
                background: category === cat ? 'var(--accent-lime)' : 'var(--bg-surface)',
                color: category === cat ? 'var(--text-dark)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Content Layout (Left Featured + Right Episode Bento List) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 28, alignItems: 'start' }}>
          {/* Left: Featured Episode Spotlight Card */}
          {selectedEpisode ? (
            <div className="bento-card" style={{ padding: 24, position: 'sticky', top: 96 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-lime)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                NOW VIEWING
              </div>

              <div style={{
                height: 220,
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-purple)',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {selectedEpisode.podcast?.coverImage ? (
                  <img src={selectedEpisode.podcast.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Radio size={48} color="#ffffff" />
                )}
                <button
                  onClick={() => handlePlay(selectedEpisode)}
                  className="btn-primary-lime"
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 14,
                    padding: '8px 16px',
                    fontSize: 12,
                  }}
                >
                  <Play size={14} fill="var(--text-dark)" /> Play
                </button>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#ffffff' }}>
                {selectedEpisode.title}
              </h3>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Host: <strong style={{ color: '#fff' }}>{selectedEpisode.owner?.displayName || 'Host'}</strong></span>
                <span>·</span>
                <span>{selectedEpisode.duration ? `${Math.round(selectedEpisode.duration / 60)} min` : '35 min'}</span>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
                {selectedEpisode.description || selectedEpisode.showNotes || 'A conversation-focused episode recorded on CastReach platform.'}
              </p>

              {selectedEpisode.topics?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  {selectedEpisode.topics.map((t, idx) => (
                    <span key={idx} style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--bg-surface-elevated)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => handlePlay(selectedEpisode)}
                className="btn-primary-lime"
                style={{ width: '100%' }}
              >
                <Play size={15} fill="var(--text-dark)" /> Stream Audio Episode
              </button>
            </div>
          ) : (
            <div className="bento-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an episode to view show notes and audio details.
            </div>
          )}

          {/* Right: List of Episodes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ width: 32, height: 32, border: '3px solid var(--border-subtle)', borderTopColor: 'var(--accent-lime)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                Loading latest episodes…
              </div>
            ) : filteredEpisodes.length > 0 ? (
              filteredEpisodes.map((ep) => {
                const isSelected = selectedEpisode?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => setSelectedEpisode(ep)}
                    className="bento-card"
                    style={{
                      padding: 18,
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--accent-lime)' : 'var(--border-subtle)',
                      background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 16,
                      alignItems: 'center',
                    }}
                  >
                    {/* Play Mini Trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(ep);
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'var(--bg-obsidian)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--accent-lime)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-lime)';
                        e.currentTarget.style.color = 'var(--text-dark)';
                        e.currentTarget.style.transform = 'scale(1.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-obsidian)';
                        e.currentTarget.style.color = 'var(--accent-lime)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                    </button>

                    {/* Metadata */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-lime)', textTransform: 'uppercase' }}>
                          {ep.podcast?.category || ep.topics?.[0] || 'Podcast'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {ep.duration ? `${Math.round(ep.duration / 60)}m` : '40m'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
                        {ep.title}
                      </h4>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Host: {ep.owner?.displayName || 'Host'}
                      </div>
                    </div>

                    {/* Date / Right label */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                      {ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bento-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Headphones size={36} color="var(--accent-lime)" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>No episodes found</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Try selecting another category or clearing your search term.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
