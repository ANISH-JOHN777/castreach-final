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
    <div style={{ background: '#0D0C12', minHeight: '100vh', color: '#FFFFFF', fontFamily: "'Geist Sans', -apple-system, sans-serif" }}>
      <Navbar />

      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '50px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(34, 197, 94, 0.12)',
            color: '#22C55E',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '4px 12px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 12,
          }}>
            <Sparkles size={14} /> BITE-SIZED HIGHLIGHTS
          </div>

          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8, color: '#FFFFFF' }}>
            Podcast Shorts &amp; Audiograms
          </h1>
          <p style={{ color: '#A39EA9', fontSize: 15 }}>
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
                  background: '#181622',
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(34, 197, 94, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.5)';
                }}
              >
                <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                  <img src={s.cover} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.45)',
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
                        background: '#22C55E',
                        color: '#0D0C12',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)',
                        transition: 'transform 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      {isThisPlaying ? <Pause size={20} fill="#0D0C12" /> : <Play size={20} fill="#0D0C12" style={{ marginLeft: 3 }} />}
                    </button>
                  </div>

                  <span
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      background: 'rgba(13, 12, 18, 0.88)',
                      backdropFilter: 'blur(8px)',
                      color: '#22C55E',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      padding: '3px 8px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 650,
                    }}
                  >
                    {s.duration}
                  </span>
                </div>

                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 8, lineHeight: 1.35 }}>
                    {s.title}
                  </h3>
                  <div style={{ fontSize: 13, color: '#A39EA9', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{s.creator}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#6F6A76' }}>
                      <Eye size={13} color="#A39EA9" /> {s.views}
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
