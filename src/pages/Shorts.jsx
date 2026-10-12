import { useState } from 'react';
import { Film, Eye, Play, Pause, Heart, Sparkles, Radio } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function Shorts() {
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();

  const shorts = [
    {
      id: 'short-1',
      title: 'AI Agent Architecture in 60 Seconds',
      creator: 'Elena Rostova',
      views: '24.5k',
      likes: '1.8k',
      duration: '01:00',
      cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'short-2',
      title: 'The #1 Mistake Early Stage Founders Make',
      creator: 'Marcus Vance',
      views: '18.2k',
      likes: '1.2k',
      duration: '00:45',
      cover: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'short-3',
      title: 'How to Prepare 5 Interview Topics with AI',
      creator: 'Sophia Chen',
      views: '32.1k',
      likes: '2.4k',
      duration: '01:15',
      cover: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'short-4',
      title: 'High-Impact Audio Equalization Settings',
      creator: 'Sarah Lin',
      views: '14.8k',
      likes: '980',
      duration: '00:52',
      cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=400&q=80',
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
            background: '#eff6ff',
            color: '#2563eb',
            padding: '4px 12px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 12,
          }}>
            <Sparkles size={14} /> BITE-SIZED HIGHLIGHTS
          </div>

          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Podcast Shorts & Audiograms
          </h1>
          <p style={{ color: '#64748b', fontSize: 15 }}>
            High-impact takeaways clipped directly from CastReach live recording studio sessions.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {shorts.map((s) => {
            const isThisPlaying = isPlaying && currentTrack?.id === s.id;
            return (
              <div
                key={s.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 22,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                  <img src={s.cover} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        playTrack({
                          id: s.id,
                          title: s.title,
                          host: s.creator,
                          category: 'Shorts',
                          cover: s.cover,
                          duration: 60,
                          currentTime: 0,
                        })
                      }
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        background: '#ffffff',
                        color: '#0f172a',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {isThisPlaying ? <Pause size={20} fill="#0f172a" /> : <Play size={20} fill="#0f172a" style={{ marginLeft: 3 }} />}
                    </button>
                  </div>

                  <span
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#fff',
                      padding: '3px 8px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {s.duration}
                  </span>
                </div>

                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8, lineHeight: 1.35 }}>
                    {s.title}
                  </h3>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{s.creator}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={13} /> {s.views}
                    </span>
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
