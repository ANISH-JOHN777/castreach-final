import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Repeat, 
  Shuffle, 
  ThumbsUp, 
  ThumbsDown,
  Quote,
  ListMusic,
  Share2,
  Check,
  Radio,
  Sliders,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AppleMusicCaptions from '../components/AppleMusicCaptions';
import AudioWaveform from '../components/AudioWaveform';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { HUBERMAN_EPISODE } from '../podcast';

export default function Episodes() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    playTrack,
    seek,
    formatTime,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    isShuffle,
    setIsShuffle,
    isRepeat,
    setIsRepeat,
  } = useAudioPlayer();

  // Color Tokens - Pure Dark Theme with Green, Red, Purple primary accents
  const BG_COLOR = '#0D0C12';
  const CARD_BG = '#171520';
  const BRAND_GREEN = '#22C55E';
  const BRAND_RED = '#EF4444';
  const BRAND_PURPLE = '#A855F7';

  const [activeTab, setActiveTab] = useState('captions'); // 'captions' | 'queue'
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const episode = currentTrack?.id === HUBERMAN_EPISODE.id ? currentTrack : HUBERMAN_EPISODE;
  const isCurrentActive = currentTrack?.id === episode.id && isPlaying;

  const handlePlayCurrent = () => {
    if (currentTrack?.id === episode.id) {
      togglePlay();
    } else {
      playTrack(episode);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
    const audioEl = document.querySelector('audio');
    if (audioEl) audioEl.playbackRate = speeds[nextIdx];
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Curated Queue for the episode sidebar (Image 1 style)
  const playlistItems = [
    {
      id: HUBERMAN_EPISODE.id,
      index: '01',
      title: 'Become Mentally Dangerous With These Daily Habits',
      artist: 'Dr. Andrew Huberman × Raj Shamani',
      duration: '1:22:00',
      active: true,
    },
    {
      id: 'ep-2',
      index: '02',
      title: 'Circadian Light, Cortisol & Dopamine Baselines',
      artist: 'Huberman Lab Protocols',
      duration: '45:10',
      active: false,
    },
    {
      id: 'ep-3',
      index: '03',
      title: 'Rapid Stress Reduction: The Physiological Sigh',
      artist: 'Neurobiology Masterclass',
      duration: '32:40',
      active: false,
    },
    {
      id: 'ep-4',
      index: '04',
      title: 'Deep Focus Blocks & Friction Learning',
      artist: 'High Performance Daily',
      duration: '38:15',
      active: false,
    },
  ];

  return (
    <div style={{
      background: BG_COLOR,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      userSelect: 'none',
    }}>
      {/* ── TOP SLIM NAV HEADER (Compact & Reachable) ── */}
      <header style={{
        height: 56,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(20, 21, 26, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexShrink: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'rgba(255, 255, 255, 0.7)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            transition: 'color 0.15s ease'
          }}>
            <ArrowLeft size={16} /> Home
          </Link>

          <div style={{ height: 16, width: 1, background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isCurrentActive ? BRAND_GREEN : 'rgba(255, 255, 255, 0.3)',
              boxShadow: isCurrentActive ? `0 0 8px ${BRAND_GREEN}` : 'none'
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
              NOW PLAYING STUDIO
            </span>
          </div>
        </div>

        {/* Center Pill Tab Switcher: Captions vs Queue */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: 3,
          borderRadius: 9999,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <button
            onClick={() => setActiveTab('captions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 16px',
              borderRadius: 9999,
              border: 'none',
              background: activeTab === 'captions' ? BRAND_GREEN : 'transparent',
              color: activeTab === 'captions' ? '#14151a' : 'rgba(255, 255, 255, 0.65)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Quote size={13} /> Synchronized Captions
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 16px',
              borderRadius: 9999,
              border: 'none',
              background: activeTab === 'queue' ? BRAND_GREEN : 'transparent',
              color: activeTab === 'queue' ? '#14151a' : 'rgba(255, 255, 255, 0.65)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ListMusic size={13} /> Episode Queue
          </button>
        </div>

        {/* Right Tools (Speed + Share) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={cycleSpeed}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '5px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              color: playbackSpeed > 1 ? BRAND_GREEN : 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
            }}
          >
            {playbackSpeed}x SPEED
          </button>

          <button
            onClick={handleShare}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={13} color={BRAND_GREEN} /> : <Share2 size={13} />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </header>

      {/* ── MAIN STAGE (ZERO OVER-SCROLL: EXACT 2-COLUMN BALANCED VIEWPORT) ── */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 480px) 1fr',
        gap: 24,
        padding: '20px 24px 92px',
        maxWidth: 1560,
        width: '100%',
        margin: '0 auto',
        overflow: 'hidden',
      }}>
        {/* ── LEFT COLUMN: FOCUSED HERO ART + METADATA (Image 1 Style) ── */}
        <section style={{
          background: CARD_BG,
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
        }}>
          {/* Top Artwork with Smooth Play Badge Overlay */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/11',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#0d0e12',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
          onClick={handlePlayCurrent}
          >
            <img
              src={episode.coverImage || episode.cover}
              alt={episode.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.4s ease',
                transform: isCurrentActive ? 'scale(1.02)' : 'scale(1)',
              }}
            />

            {/* Ambient vignette */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(15, 16, 21, 0.75) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />

            {/* Big Center Play / Pause Indicator */}
            <div style={{
              position: 'absolute',
              bottom: 14,
              right: 14,
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: BRAND_GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.5)',
              transition: 'transform 0.15s ease',
            }}>
              {isCurrentActive ? (
                <Pause size={22} fill="#14151a" color="#14151a" />
              ) : (
                <Play size={22} fill="#14151a" color="#14151a" style={{ marginLeft: 3 }} />
              )}
            </div>

            {/* Category Pill Tag */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'rgba(20, 21, 26, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              color: BRAND_GREEN,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              {episode.category || 'NEUROSCIENCE'}
            </div>
          </div>

          {/* Episode Title & Host Metadata */}
          <div style={{ margin: '16px 0 10px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {episode.show}
            </div>
            <h1 style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.3,
              margin: '0 0 6px',
              color: '#ffffff',
            }}>
              {episode.title}
            </h1>
            <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
              {episode.host}
            </div>
          </div>

          {/* Live Waveform Spectrum Bar (Integrated into Left Card) */}
          <div style={{
            background: 'rgba(15, 16, 21, 0.65)',
            borderRadius: 12,
            padding: '10px 14px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>
              <span>AUDIO FREQUENCY MONITOR</span>
              <span style={{ color: BRAND_GREEN, fontWeight: 700 }}>
                {isCurrentActive ? '● LIVE' : 'STANDBY'}
              </span>
            </div>
            <AudioWaveform barCount={44} height={32} color={BRAND_GREEN} interactive={true} />
          </div>
        </section>

        {/* ── RIGHT COLUMN: INTERACTIVE CAPTIONS OR PLAYLIST QUEUE ── */}
        <section style={{
          background: CARD_BG,
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
        }}>
          {activeTab === 'captions' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Header Info */}
              <div style={{
                padding: '14px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(15, 16, 21, 0.35)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: BRAND_GREEN, letterSpacing: '0.04em' }}>
                  <Sparkles size={14} /> LIVE SYNCHRONIZED CAPTIONS
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)' }}>
                  Click any sentence to seek audio
                </div>
              </div>

              {/* Scrolling Captions Container */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <AppleMusicCaptions
                  currentTime={currentTime}
                  isPlaying={isCurrentActive}
                  captions={episode.captions}
                  onSeek={seek}
                />
              </div>
            </div>
          ) : (
            /* Queue / Playlist View (Image 1 Style) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: 12,
                fontWeight: 700,
                color: BRAND_GREEN,
                letterSpacing: '0.04em',
                background: 'rgba(15, 16, 21, 0.35)'
              }}>
                EPISODE CHAPTERS & UP NEXT
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {playlistItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.id === HUBERMAN_EPISODE.id) handlePlayCurrent();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: item.active ? 'rgba(72, 47, 76, 0.4)' : 'rgba(255, 255, 255, 0.03)',
                      border: item.active ? `1px solid ${BRAND_GREEN}` : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!item.active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      if (!item.active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: item.active ? BRAND_GREEN : 'rgba(255, 255, 255, 0.4)', minWidth: 24 }}>
                      {item.index}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: item.active ? BRAND_GREEN : '#ffffff',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                        {item.artist}
                      </div>
                    </div>

                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {item.duration}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── BOTTOM DOCK CONTROLS (Image 1 YouTube Music Floating Glass Scrubber) ── */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 74,
        background: 'rgba(20, 21, 26, 0.96)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 340px) 1fr minmax(200px, 260px)',
        alignItems: 'center',
        padding: '0 24px',
        zIndex: 9999,
      }}>
        {/* Left: Mini Track Information */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img
            src={episode.coverImage || episode.cover}
            alt=""
            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}>
              {episode.title}
            </div>
            <div style={{
              fontSize: 11.5,
              color: 'rgba(255, 255, 255, 0.5)',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}>
              {episode.host}
            </div>
          </div>
        </div>

        {/* Center: Playback Buttons + Red (#98111E) Seekbar (Matching Image 1) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, maxWidth: 640, width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* 15s Back */}
            <button
              onClick={() => seek(currentTime - 15)}
              title="Rewind 15s"
              style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', padding: 4 }}
            >
              <SkipBack size={17} />
            </button>

            {/* Play / Pause button */}
            <button
              onClick={handlePlayCurrent}
              title={isCurrentActive ? 'Pause' : 'Play'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isCurrentActive ? (
                <Pause size={17} fill="#14151a" color="#14151a" />
              ) : (
                <Play size={17} fill="#14151a" color="#14151a" style={{ marginLeft: 2 }} />
              )}
            </button>

            {/* 30s Forward */}
            <button
              onClick={() => seek(currentTime + 30)}
              title="Forward 30s"
              style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', padding: 4 }}
            >
              <SkipForward size={17} />
            </button>

            {/* Red Seekbar Track */}
            <div style={{ width: 280, display: 'flex', alignItems: 'center', gap: 10, marginLeft: 6 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.5)', minWidth: 36, textAlign: 'right' }}>
                {formatTime ? formatTime(currentTime) : '0:00'}
              </span>

              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime || 0}
                onChange={(e) => seek(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 9999,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  background: `linear-gradient(to right, ${BRAND_RED} ${progressPercent}%, rgba(255, 255, 255, 0.15) ${progressPercent}%)`,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />

              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.5)', minWidth: 36 }}>
                {formatTime ? formatTime(duration) : '0:00'}
              </span>
            </div>

            {/* Feedback Thumbs */}
            <button
              onClick={() => { setDisliked(!disliked); if (liked) setLiked(false); }}
              title="Dislike"
              style={{ background: 'none', border: 'none', color: disliked ? BRAND_RED : 'rgba(255, 255, 255, 0.55)', cursor: 'pointer', padding: 4 }}
            >
              <ThumbsDown size={15} fill={disliked ? BRAND_RED : 'none'} />
            </button>

            <button
              onClick={() => { setLiked(!liked); if (disliked) setDisliked(false); }}
              title="Like"
              style={{ background: 'none', border: 'none', color: liked ? BRAND_GREEN : 'rgba(255, 255, 255, 0.55)', cursor: 'pointer', padding: 4 }}
            >
              <ThumbsUp size={15} fill={liked ? BRAND_GREEN : 'none'} />
            </button>
          </div>
        </div>

        {/* Right: Sound & Shuffle/Repeat */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{ background: 'none', border: 'none', color: isMuted ? BRAND_RED : 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', padding: 4 }}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          <button
            onClick={() => setIsRepeat(!isRepeat)}
            title="Repeat"
            style={{ background: 'none', border: 'none', color: isRepeat ? BRAND_GREEN : 'rgba(255, 255, 255, 0.55)', cursor: 'pointer', padding: 4 }}
          >
            <Repeat size={15} />
          </button>

          <button
            onClick={() => setIsShuffle(!isShuffle)}
            title="Shuffle"
            style={{ background: 'none', border: 'none', color: isShuffle ? BRAND_GREEN : 'rgba(255, 255, 255, 0.55)', cursor: 'pointer', padding: 4 }}
          >
            <Shuffle size={15} />
          </button>
        </div>
      </footer>
    </div>
  );
}
