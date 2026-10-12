import { useNavigate } from 'react-router-dom';
import { Clock, Star, Play, Pause, Radio, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function Explore() {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();

  const featuredEpisodes = [
    {
      id: 'track-2',
      title: 'Building Autonomous AI Agents with LangChain',
      host: 'Alex Rivera',
      guest: 'Dr. Sam Vance',
      duration: '48 min',
      durationSec: 2880,
      rating: '4.9',
      tag: 'AI & Tech',
      cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'track-10',
      title: 'The 0-to-1 Product Playbook for B2B Founders',
      host: 'Sarah Jenkins',
      guest: 'Marcus Thorne',
      duration: '55 min',
      durationSec: 3300,
      rating: '5.0',
      tag: 'Startups',
      cover: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'track-9',
      title: 'Scaling Creator Media Brands to $10M ARR',
      host: 'Elena Rostova',
      guest: 'Chloe Zhang',
      duration: '42 min',
      durationSec: 2520,
      rating: '4.85',
      tag: 'Creator Economy',
      cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'track-1',
      title: 'Psychological Approaches to High-Performance States',
      host: 'Liam Martinez',
      guest: 'Dr. Anna Foster',
      duration: '34 min',
      durationSec: 2040,
      rating: '4.95',
      tag: 'Psychology',
      cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    },
  ];

  return (
    <div style={{ background: '#fdfdfd', minHeight: '100vh', color: '#0f172a' }}>
      <Navbar />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '50px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#e0f2fe',
            color: '#0284c7',
            padding: '4px 12px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 12,
          }}>
            <Radio size={14} /> CURATED PODCAST FEED
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Explore Featured Episodes & Podcasts
          </h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>
            Listen to curated recordings created on CastReach, and instantly book the hosts or guests for your own shows.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {featuredEpisodes.map((ep) => {
            const isThisPlaying = isPlaying && currentTrack?.id === ep.id;
            return (
              <div
                key={ep.id}
                style={{
                  background: '#fff',
                  borderRadius: 22,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div style={{ height: 160, position: 'relative' }}>
                  <img src={ep.cover} alt={ep.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(8px)',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {ep.tag}
                  </span>
                </div>

                <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, marginBottom: 8, color: '#0f172a' }}>
                    {ep.title}
                  </h3>

                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
                    Host: <b>{ep.host}</b> • Guest: <b>{ep.guest}</b>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: '#64748b' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={13} /> {ep.duration}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Star size={13} fill="#f59e0b" color="#f59e0b" /> {ep.rating}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() =>
                          playTrack({
                            id: ep.id,
                            title: ep.title,
                            host: ep.host,
                            category: ep.tag,
                            cover: ep.cover,
                            duration: ep.durationSec,
                            currentTime: 0,
                          })
                        }
                        style={{
                          background: isThisPlaying ? '#2563eb' : '#0f172a',
                          color: '#fff',
                          padding: '7px 14px',
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {isThisPlaying ? <Pause size={12} fill="#fff" /> : <Play size={12} fill="#fff" />}
                        {isThisPlaying ? 'Playing' : 'Listen'}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate('/discover')}
                        style={{
                          background: '#f1f5f9',
                          color: '#0f172a',
                          padding: '7px 12px',
                          borderRadius: 9999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
