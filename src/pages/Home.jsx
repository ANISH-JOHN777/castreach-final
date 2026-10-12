import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Radio, 
  Users, 
  ArrowRight,
  Headphones,
  CheckCircle2,
  Calendar,
  Sparkles,
  Volume2,
  Compass,
  Mic,
  MapPin,
  Video,
  Shield,
  Layers
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function Home() {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();
  const [activeCategory, setActiveCategory] = useState('All');
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real episodes from backend
  useEffect(() => {
    let isMounted = true;
    fetch('/api/podcasts/episodes/discover?limit=6')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.episodes) {
          setEpisodes(data.episodes);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handlePlayEpisode = (ep) => {
    playTrack({
      id: ep.id,
      title: ep.title,
      host: ep.owner?.displayName || 'Podcast Host',
      coverImage: ep.podcast?.coverImage || '',
      category: ep.podcast?.category || ep.topics?.[0] || 'Podcast',
      audioUrl: ep.audioUrl,
    });
  };

  const categories = ['All', 'Technology', 'Venture & Startups', 'Culture & Society', 'Design', 'Science'];

  return (
    <div style={{ background: 'var(--bg-obsidian)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <Navbar />

      <main>
        {/* ── HERO SECTION: Stacked "PODCAST / PODCAST" & Electric Arch (Images 1, 2 & 3) ── */}
        <section style={{
          position: 'relative',
          padding: '60px 24px 80px',
          overflow: 'hidden',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {/* Subtle Grid Background */}
          <div className="bg-grid-pattern" style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.6,
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            {/* Top Micro-label */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent-lime)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-lime)' }} />
                REAL-TIME MATCHMAKING & BROADCAST PLATFORM
              </span>
              <span>HOSTS · GUESTS · GOOGLE MEET · IN-PERSON</span>
            </div>

            {/* Huge Stacked Headline matching Image 1: "PODCAST" solid fill + "PODCAST" stroke outline */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 className="headline-huge" style={{ fontSize: 'clamp(3.5rem, 11vw, 9.5rem)', color: 'var(--accent-purple)', marginBottom: -10 }}>
                PODCAST
              </h1>
              <h1 className="headline-huge headline-stroke" style={{ fontSize: 'clamp(3.5rem, 11vw, 9.5rem)' }}>
                PODCAST
              </h1>
            </div>

            {/* Central Stage Visual (Arch Backdrop + Featured Creator + CTA Overlay) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1fr) auto minmax(280px, 1fr)',
              gap: 32,
              alignItems: 'center',
              maxWidth: 1200,
              margin: '0 auto',
            }}>
              {/* Left Statement */}
              <div>
                <p style={{
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  maxWidth: 320,
                  marginBottom: 24,
                }}>
                  Honest talks with industry leaders, founders, and experts. Match, schedule physical studio sessions or Google Meet video calls with zero friction.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Link to="/discover" className="btn-primary-lime" style={{ alignSelf: 'flex-start' }}>
                    <Compass size={16} /> Discover Creators
                  </Link>
                  <Link to="/episodes" className="btn-ghost-dark" style={{ alignSelf: 'flex-start' }}>
                    <Headphones size={16} /> Listen to Episodes
                  </Link>
                </div>
              </div>

              {/* Center Arch Card (Directly inspired by Image 1 & 2) */}
              <div style={{
                position: 'relative',
                width: 320,
                height: 400,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}>
                {/* Electric Purple Arch Background */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '160px 160px 24px 24px',
                  background: 'var(--accent-purple)',
                  overflow: 'hidden',
                }} />

                {/* Creator Silhouette Image */}
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80"
                  alt="Podcast Host & Creator"
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '92%',
                    height: '92%',
                    objectFit: 'cover',
                    borderRadius: '140px 140px 18px 18px',
                    filter: 'grayscale(25%)',
                  }}
                />

                {/* Floating "PLAY PODCAST" Action Pill (Image 1 bottom-right) */}
                <button
                  onClick={() => {
                    if (episodes.length > 0) handlePlayEpisode(episodes[0]);
                  }}
                  className="btn-primary-lime"
                  style={{
                    position: 'absolute',
                    bottom: 18,
                    zIndex: 3,
                    padding: '10px 20px',
                    fontSize: 13,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <Play size={14} fill="var(--text-dark)" /> Play Latest Episode
                </button>
              </div>

              {/* Right Value Box (Host / Guest Dual Pathway) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="bento-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-lime)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Radio size={16} color="var(--text-dark)" />
                    </div>
                    <strong style={{ fontSize: 14 }}>For Podcast Hosts</strong>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Find qualified guest speakers, review prior appearances, and book in-studio or virtual sessions instantly.
                  </p>
                </div>

                <div className="bento-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mic size={16} color="#ffffff" />
                    </div>
                    <strong style={{ fontSize: 14 }}>For Guest Speakers</strong>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Get featured on top shows. Transparent host listener counts, show formats, and gear disclosures.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENTO HIGHLIGHTS & PLATFORM CAPABILITIES (Images 2, 4 & 5) ── */}
        <section style={{ padding: '80px 24px', maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                CONNECTED WORKFLOW
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                Everything Needed to Record & Publish
              </h2>
            </div>
            <Link to="/about" className="btn-ghost-dark" style={{ fontSize: 13 }}>
              Explore Project Details <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Bento Card 1: Google Meet & In-Person Dual Scheduling */}
            <div className="bento-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, marginTop: 4 }}>Dual-Mode Meeting Scheduling</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Connect remotely with automatic Google Meet rooms and calendar synchronization, or schedule in-person studio tapings with physical directions.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <Video size={16} color="var(--accent-lime)" />
                <MapPin size={16} color="var(--accent-purple)" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Synchronized across Google Calendar</span>
              </div>
            </div>

            {/* Bento Card 2: Mutual Profile Transparency */}
            <div className="bento-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, marginTop: 4 }}>Mutual Host & Guest Disclosure</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  No mystery bookings. Guests see verified listener counts, show formats, and equipment. Hosts see speaker expertise, speaking topics, and past appearances.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
                <Shield size={15} color="var(--accent-lime)" />
                <span>Verified creator profiles with zero mock data</span>
              </div>
            </div>

            {/* Bento Card 3: Cloud Studio Recording & Editing */}
            <div className="bento-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, marginTop: 4 }}>Post-Session Studio & Trimming</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Live multi-track audio capture, automated AI transcripts, and non-destructive EDL editing directly in your browser.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
                <Layers size={15} color="var(--accent-tangerine)" />
                <span>FFmpeg lossless video & audio processing</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── LATEST PUBLISHED EPISODES BENTO LIST (Image 4 Inspiration) ── */}
        <section style={{ padding: '40px 24px 100px', maxWidth: 1360, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-lime)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                COMMUNITY RELEASES
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Featured Episodes</h2>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: activeCategory === cat ? 'var(--accent-lime)' : 'var(--border-subtle)',
                    background: activeCategory === cat ? 'var(--accent-lime)' : 'transparent',
                    color: activeCategory === cat ? 'var(--text-dark)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Episode Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {episodes.length > 0 ? (
              episodes.map((ep) => (
                <div key={ep.id} className="bento-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-lime)', background: 'rgba(203, 251, 69, 0.1)', padding: '2px 8px', borderRadius: 6 }}>
                        {ep.podcast?.category || ep.topics?.[0] || 'Podcast'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ep.duration ? `${Math.round(ep.duration / 60)} min` : '42 min'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#ffffff' }}>
                      {ep.title}
                    </h4>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
                      {ep.description ? (ep.description.length > 120 ? `${ep.description.slice(0, 120)}…` : ep.description) : 'An in-depth conversational episode exploring ideas and industry perspectives.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {ep.owner?.displayName?.[0] || 'H'}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {ep.owner?.displayName || 'Podcast Host'}
                      </span>
                    </div>

                    <button
                      onClick={() => handlePlayEpisode(ep)}
                      className="btn-primary-lime"
                      style={{ padding: '6px 14px', fontSize: 12 }}
                    >
                      <Play size={13} fill="var(--text-dark)" /> Play
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-surface)', borderRadius: 16 }}>
                <Headphones size={32} color="var(--accent-lime)" style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 14 }}>No episodes published yet. Explore creator profiles to match and schedule the first session.</p>
                <Link to="/discover" className="btn-primary-lime" style={{ marginTop: 16, display: 'inline-flex' }}>
                  Explore Creators
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
