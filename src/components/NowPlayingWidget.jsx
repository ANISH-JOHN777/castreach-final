import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  ChevronDown, 
  RotateCcw, 
  RotateCw, 
  SkipBack,
  SkipForward,
  MessageSquare,
  ListMusic,
  Headphones,
  Clock,
  Radio,
  X,
  Heart
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import AppleMusicCaptions from './AppleMusicCaptions';
import { HUBERMAN_EPISODE } from '../podcast';

export default function NowPlayingWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentTrack,
    hasStartedPlayback,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    formatTime,
    favorites,
    toggleFavorite,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    playTrack,
    playlist,
    nextTrack,
    prevTrack,
  } = useAudioPlayer();

  const [isExpanded, setIsExpanded] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showCaptions, setShowCaptions] = useState(true); // Captions on by default matching mockup
  const [autoScroll, setAutoScroll] = useState(true); // Auto-scroll toggle matching mockup
  const [showQueue, setShowQueue] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // CastReach Design Tokens — Pure Dark Theme (Green, Red, Purple accents)
  const BTN_PLUM = '#22C55E';
  const BTN_PLUM_HOVER = '#34D399';
  const ACCENT_LAVENDER = '#E7D6EF';
  const ACCENT_LAVENDER_BORDER = 'rgba(168, 85, 247, 0.35)';
  const CANVAS_DARK = '#0D0C12';
  const CARD_DARK = '#171520';
  const BORDER_LIGHT = 'rgba(255, 255, 255, 0.12)';
  const TEXT_PRI = '#FFFFFF';
  const TEXT_SEC = '#A8A4AC';

  // Active Track fallback
  const activeTrack = currentTrack || HUBERMAN_EPISODE;
  const isFav = favorites?.includes(activeTrack.id);

  // If user triggers playback from elsewhere or changes tracks, un-dismiss
  useEffect(() => {
    if (isPlaying) {
      setIsDismissed(false);
    }
  }, [isPlaying, currentTrack?.id]);

  const handleCloseMiniPlayer = (e) => {
    if (e) e.stopPropagation();
    if (isPlaying) {
      togglePlay();
    }
    setIsDismissed(true);
    setShowQueue(false);
  };

  // Close full player or queue on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showQueue) setShowQueue(false);
        else if (isExpanded) setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, showQueue]);

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setSpeed(nextSpeed);
    const audioEl = document.querySelector('audio');
    if (audioEl) audioEl.playbackRate = nextSpeed;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Format time mm:ss
  const formatScrubberTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Hide on auth, recording, or dedicated listen pages
  const isAuthPage = location.pathname.includes('/login') || 
                     location.pathname.includes('/register') || 
                     location.pathname.includes('/onboarding') ||
                     location.pathname.includes('/record') ||
                     location.pathname === '/listen' ||
                     location.pathname === '/discover';

  if (isAuthPage || !hasStartedPlayback || !activeTrack) {
    return null;
  }

  // If user closed the mini player UI, render discrete floating dock pill
  if (isDismissed) {
    return (
      <button
        type="button"
        onClick={() => setIsDismissed(false)}
        style={{
          position: 'fixed',
          bottom: 22,
          right: 24,
          zIndex: 9998,
          background: 'linear-gradient(135deg, rgba(46, 32, 54, 0.96) 0%, rgba(28, 22, 36, 0.98) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(226, 182, 238, 0.45)',
          borderRadius: 30,
          padding: '8px 18px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          fontSize: 13,
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(72, 47, 76, 0.4)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
          e.currentTarget.style.borderColor = '#E2B6EE';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.45)';
        }}
        title="Reopen Mini Player"
      >
        <Headphones size={15} color="#E2B6EE" />
        <span>Open Player</span>
      </button>
    );
  }

  return (
    <>
      {/* ── QUEUE & LISTENING HISTORY POPUP DRAWER ── */}
      {showQueue && (
        <div
          style={{
            position: 'fixed',
            bottom: 96,
            right: 28,
            width: 360,
            maxHeight: 460,
            background: '#211C30',
            border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
            borderRadius: 14,
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), 0 0 20px rgba(72, 47, 76, 0.4)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.18s ease',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(226, 182, 238, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#1A1525',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ListMusic size={16} color={ACCENT_LAVENDER} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                Queue & History
              </span>
            </div>
            <button
              onClick={() => setShowQueue(false)}
              style={{ background: 'none', border: 'none', color: TEXT_SEC, cursor: 'pointer', padding: 4 }}
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ padding: '14px', overflowY: 'auto', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT_LAVENDER, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Now Playing
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px',
                background: 'rgba(72, 47, 76, 0.35)',
                borderRadius: 8,
                border: `1px solid ${ACCENT_LAVENDER_BORDER}`,
                marginBottom: 16,
              }}
            >
              <img
                src={activeTrack.cover || activeTrack.coverImage}
                alt=""
                style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 750, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeTrack.title}
                </div>
                <div style={{ fontSize: 11.5, color: '#CBD5E1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {activeTrack.host} • {activeTrack.show}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              Upcoming Queue
            </div>
            {(playlist || []).map((item) => {
              const isCurrent = item.id === activeTrack.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    playTrack(item);
                    setShowQueue(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    background: isCurrent ? 'rgba(72, 47, 76, 0.4)' : 'transparent',
                    border: `1px solid ${isCurrent ? ACCENT_LAVENDER_BORDER : 'transparent'}`,
                    marginBottom: 4,
                  }}
                  onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                >
                  <img
                    src={item.cover || item.coverImage}
                    alt=""
                    style={{ width: 34, height: 34, borderRadius: 4, objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isCurrent ? 750 : 600, color: isCurrent ? ACCENT_LAVENDER : TEXT_PRI, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_SEC, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.host} • {item.show}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 1. FLOATING MINI ISLAND PLAYER BAR (Clicking opens /listen) ── */}
      <div
        onClick={() => navigate('/listen')}
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 760,
          zIndex: 9998,
          background: 'rgba(13, 12, 18, 0.95)',
          WebkitBackdropFilter: 'blur(28px) saturate(150%)',
          backdropFilter: 'blur(28px) saturate(150%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: 24,
          padding: '10px 18px 12px 16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(168, 85, 247, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          color: '#FFFFFF',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
          e.currentTarget.style.boxShadow = '0 22px 55px rgba(0, 0, 0, 0.85), 0 0 32px rgba(168, 85, 247, 0.28)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.35)';
          e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(168, 85, 247, 0.18)';
        }}
        title="Click anywhere to open Listen page"
      >
        {/* Main Row: Artwork + Info + Controls + Open Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
        }}>
          {/* Left: Square Artwork + Track Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: '#1A1526',
                flexShrink: 0,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                position: 'relative',
              }}
            >
              <img
                src={activeTrack.cover || activeTrack.coverImage}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {isPlaying && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}>
                  <span style={{ width: 3, height: 12, backgroundColor: '#22C55E', borderRadius: 2, animation: 'pulse 1s infinite' }} />
                  <span style={{ width: 3, height: 18, backgroundColor: '#22C55E', borderRadius: 2, animation: 'pulse 0.7s infinite' }} />
                  <span style={{ width: 3, height: 10, backgroundColor: '#22C55E', borderRadius: 2, animation: 'pulse 1.2s infinite' }} />
                </div>
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              {/* Device line */}
              <div style={{
                fontSize: 11,
                color: '#A8A4AC',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginBottom: 2,
              }}>
                <Headphones size={11} color="#A855F7" />
                <span style={{ color: '#C084FC', fontWeight: 600 }}>CastReach Master 48kHz</span>
                <span style={{ color: '#71717A' }}>· Click to open Listen</span>
              </div>

              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}>
                  {activeTrack.title}
                </span>
                <span style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  background: 'rgba(34, 197, 94, 0.18)',
                  color: '#22C55E',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  padding: '1px 5px',
                  borderRadius: 4,
                  lineHeight: 1.2,
                  flexShrink: 0,
                }}>
                  LIVE
                </span>
              </div>

              {/* Artist / Host line */}
              <div style={{
                fontSize: 11.5,
                color: '#94A3B8',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                marginTop: 1,
              }}>
                {activeTrack.guest ? `${activeTrack.guest} · ${activeTrack.show}` : activeTrack.host}
              </div>
            </div>
          </div>

          {/* Right: Tactile Playback Controls */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); seek(currentTime - 15); }}
              style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 4 }}
              title="Rewind 15s"
            >
              <RotateCcw size={16} />
            </button>

            {/* Central Play/Pause Button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#22C55E',
                color: '#0D0C12',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.45)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.background = '#34D399';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#22C55E';
              }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={16} fill="#0D0C12" color="#0D0C12" />
              ) : (
                <Play size={16} fill="#0D0C12" color="#0D0C12" style={{ marginLeft: 2 }} />
              )}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); seek(currentTime + 15); }}
              style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 4 }}
              title="Forward 15s"
            >
              <RotateCw size={16} />
            </button>

            {/* Open in Listen Pill */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate('/listen'); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: 9999,
                padding: '4px 10px',
                fontSize: 11.5,
                fontWeight: 650,
                color: '#E2B6EE',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                e.currentTarget.style.color = '#E2B6EE';
              }}
              title="Open in Listen Page"
            >
              <Maximize2 size={12} />
              <span>Listen</span>
            </button>

            <button
              type="button"
              onClick={handleCloseMiniPlayer}
              style={{
                background: 'none',
                border: 'none',
                color: '#706B72',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              title="Dismiss Player"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrubber Line (Matching Image 1) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <span style={{ fontSize: 10.5, fontFamily: "'Geist Mono', monospace", color: '#A8A4AC', minWidth: 32 }}>
            {formatScrubberTime(currentTime)}
          </span>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              seek(clickPos * (duration || 1));
            }}
            style={{
              flex: 1,
              height: 4,
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 9999,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #22C55E 0%, #A855F7 100%)',
              borderRadius: 9999,
              transition: 'width 0.1s linear',
            }} />
          </div>

          <span style={{ fontSize: 10.5, fontFamily: "'Geist Mono', monospace", color: '#A8A4AC', minWidth: 32, textAlign: 'right' }}>
            {formatScrubberTime(duration)}
          </span>
        </div>
      </div>
      {/* ── 2. DEDICATED FULL PLAYER VIEW (EXACT MATCH WITH USER MOCKUP IMAGE) ── */}
      {isExpanded && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: CANVAS_DARK,
            color: TEXT_PRI,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 36px 32px',
            animation: 'fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden',
            fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* Ambient Purple/Plum Aurora Waves in Backdrop (from reference image) */}
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '-8%',
              width: 580,
              height: 480,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(120, 50, 135, 0.28) 0%, rgba(72, 47, 76, 0.12) 55%, transparent 75%)',
              filter: 'blur(75px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '10%',
              right: '-8%',
              width: 620,
              height: 520,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(90, 40, 105, 0.24) 0%, rgba(72, 47, 76, 0.08) 55%, transparent 75%)',
              filter: 'blur(80px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* ── TOP BAR: NOW PLAYING PILL + METADATA + CAPTIONS TOGGLE + MINIMIZE ── */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 18,
            }}
          >
            {/* Left: [ ▶ NOW PLAYING ] + Category • Show */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(72, 47, 76, 0.45)',
                  border: '1px solid rgba(226, 182, 238, 0.35)',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 10px rgba(72, 47, 76, 0.35)',
                }}
              >
                <Play size={11} fill="#FFFFFF" color="#FFFFFF" />
                <span>NOW PLAYING</span>
              </div>

              <span style={{ fontSize: 13.5, color: '#94A3B8', fontWeight: 500 }}>
                {activeTrack.category || 'Neuroscience & High Performance'} &nbsp;&bull;&nbsp; {activeTrack.show || activeTrack.host || 'Figuring Out'}
              </span>
            </div>

            {/* Right: [ Captions: On ] + [ ∨ Minimize ] */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowCaptions(!showCaptions)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: showCaptions ? 'rgba(72, 47, 76, 0.4)' : 'rgba(255, 255, 255, 0.06)',
                  border: `1px solid ${showCaptions ? 'rgba(226, 182, 238, 0.45)' : 'rgba(255, 255, 255, 0.14)'}`,
                  borderRadius: 20,
                  padding: '7px 16px',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: showCaptions ? '0 2px 12px rgba(72, 47, 76, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(72, 47, 76, 0.6)';
                  e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showCaptions ? 'rgba(72, 47, 76, 0.4)' : 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = showCaptions ? 'rgba(226, 182, 238, 0.45)' : 'rgba(255, 255, 255, 0.14)';
                }}
              >
                <MessageSquare size={13} color={ACCENT_LAVENDER} />
                <span>Captions: {showCaptions ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: 20,
                  padding: '7px 18px',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                }}
              >
                <ChevronDown size={15} />
                <span>Minimize</span>
              </button>
            </div>
          </div>

          {/* ── CENTER STAGE: 2 BALANCED CARDS (EPISODE CARD + CAPTIONS CARD) ── */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 0',
              overflow: 'hidden',
              width: '100%',
              maxWidth: 1240,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: showCaptions ? 'minmax(340px, 440px) minmax(460px, 660px)' : 'minmax(380px, 520px)',
                gap: 32,
                alignItems: 'stretch',
                width: '100%',
                maxHeight: 'calc(100vh - 270px)',
                minHeight: 460,
              }}
            >
              {/* ── LEFT CARD: ARTWORK & EPISODE DETAILS ── */}
              <div
                style={{
                  background: CARD_DARK,
                  border: '1px solid rgba(226, 182, 238, 0.22)',
                  borderRadius: 20,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(72, 47, 76, 0.25)',
                }}
              >
                {/* Artwork */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 10',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: '#151220',
                    border: '1px solid rgba(226, 182, 238, 0.2)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <img
                    src={activeTrack.cover || activeTrack.coverImage}
                    alt={activeTrack.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>

                {/* Typography & Metadata */}
                <div style={{ marginTop: 20 }}>
                  {/* Show Pill Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span
                      style={{
                        background: 'rgba(72, 47, 76, 0.5)',
                        border: '1px solid rgba(226, 182, 238, 0.35)',
                        color: ACCENT_LAVENDER,
                        borderRadius: 20,
                        padding: '4px 12px',
                        fontSize: 11,
                        fontWeight: 750,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {activeTrack.show || 'Figuring Out'}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      margin: '0 0 8px',
                      lineHeight: 1.3,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {activeTrack.title}
                  </h2>

                  {/* Host / Guest */}
                  <div style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>
                    {activeTrack.host || activeTrack.guest || 'Raj Shamani'}
                  </div>
                </div>

                {/* Footer Metadata Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 22,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: 12.5,
                    color: '#94A3B8',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Headphones size={13} color={ACCENT_LAVENDER} />
                      <span>{activeTrack.views || '4.9M+ plays'}</span>
                    </span>
                    <span>&bull;</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={13} color={ACCENT_LAVENDER} />
                      <span>{Math.floor(activeTrack.duration ? activeTrack.duration / 60 : 42)} min</span>
                    </span>
                  </div>

                  {/* [ 📶 Master ] Pill */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(72, 47, 76, 0.45)',
                      border: '1px solid rgba(226, 182, 238, 0.35)',
                      borderRadius: 20,
                      padding: '3px 10px',
                      fontSize: 11.5,
                      fontWeight: 750,
                      color: ACCENT_LAVENDER,
                    }}
                  >
                    <Radio size={12} />
                    <span>Master</span>
                  </div>
                </div>
              </div>

              {/* ── RIGHT CARD: SYNCHRONIZED CAPTIONS WITH TIMESTAMPS ── */}
              {showCaptions && (
                <div
                  style={{
                    background: CARD_DARK,
                    border: '1px solid rgba(226, 182, 238, 0.22)',
                    borderRadius: 20,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(72, 47, 76, 0.25)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Captions Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MessageSquare size={15} color={ACCENT_LAVENDER} />
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#FFFFFF',
                        }}
                      >
                        CAPTIONS
                      </span>
                    </div>

                    {/* Auto-scroll Toggle Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                        Auto-scroll
                      </span>
                      <button
                        type="button"
                        onClick={() => setAutoScroll(!autoScroll)}
                        style={{
                          width: 38,
                          height: 20,
                          borderRadius: 20,
                          background: autoScroll ? '#8B5CF6' : 'rgba(255, 255, 255, 0.15)',
                          border: 'none',
                          padding: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: autoScroll ? 'flex-end' : 'flex-start',
                          transition: 'all 0.2s ease',
                          boxShadow: autoScroll ? '0 0 10px rgba(139, 92, 246, 0.6)' : 'none',
                        }}
                        title={autoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Captions List */}
                  <div style={{ flex: 1, minHeight: 260, position: 'relative', overflow: 'hidden' }}>
                    <AppleMusicCaptions
                      currentTime={currentTime}
                      isPlaying={isPlaying}
                      captions={activeTrack.captions}
                      onSeek={seek}
                      autoScroll={autoScroll}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BOTTOM AUDIO CONTROLS & TIMELINE SCRUBBER ── */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              maxWidth: 1080,
              width: '100%',
              margin: '0 auto',
            }}
          >
            {/* Timeline Scrubber */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", color: '#94A3B8', minWidth: 42, textAlign: 'right' }}>
                {formatScrubberTime(currentTime)}
              </span>

              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime || 0}
                  onChange={(e) => seek(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 5,
                    borderRadius: 9999,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: `linear-gradient(to right, #8B5CF6 0%, #DDAFE8 ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%)`,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>

              <span style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", color: '#94A3B8', minWidth: 42 }}>
                {formatScrubberTime(duration)}
              </span>
            </div>

            {/* Playback Controls Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              {/* Left Placeholder spacer to balance volume on right */}
              <div style={{ width: 140 }} />

              {/* Centered Main Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* Speed Toggle */}
                <button
                  type="button"
                  onClick={cycleSpeed}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 20,
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'Geist Mono', monospace",
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(72, 47, 76, 0.4)';
                    e.currentTarget.style.borderColor = ACCENT_LAVENDER_BORDER;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  title="Playback Speed"
                >
                  {speed}x
                </button>

                {/* Rewind 10s */}
                <button
                  type="button"
                  onClick={() => seek(Math.max(0, currentTime - 10))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    padding: 6,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Rewind 10s"
                >
                  <RotateCcw size={22} />
                  <span style={{ position: 'absolute', fontSize: 8.5, fontWeight: 800, top: 12 }}>10</span>
                </button>

                {/* Previous Track */}
                <button
                  type="button"
                  onClick={prevTrack}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    padding: 6,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Previous Track"
                >
                  <SkipBack size={20} fill="#FFFFFF" />
                </button>

                {/* Main Play/Pause Button (#482F4C with Lavender Ring Glow) */}
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: BTN_PLUM,
                    border: '2px solid rgba(226, 182, 238, 0.6)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 24px rgba(72, 47, 76, 0.8), 0 4px 16px rgba(0, 0, 0, 0.6)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.08)';
                    e.currentTarget.style.background = BTN_PLUM_HOVER;
                    e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.9)';
                    e.currentTarget.style.boxShadow = '0 0 32px rgba(120, 50, 135, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = BTN_PLUM;
                    e.currentTarget.style.borderColor = 'rgba(226, 182, 238, 0.6)';
                    e.currentTarget.style.boxShadow = '0 0 24px rgba(72, 47, 76, 0.8), 0 4px 16px rgba(0, 0, 0, 0.6)';
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={24} fill="#FFFFFF" color="#FFFFFF" />
                  ) : (
                    <Play size={24} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: 3 }} />
                  )}
                </button>

                {/* Next Track */}
                <button
                  type="button"
                  onClick={nextTrack}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    padding: 6,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Next Track"
                >
                  <SkipForward size={20} fill="#FFFFFF" />
                </button>

                {/* Forward 30s */}
                <button
                  type="button"
                  onClick={() => seek(Math.min(duration, currentTime + 30))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    padding: 6,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  title="Forward 30s"
                >
                  <RotateCw size={22} />
                  <span style={{ position: 'absolute', fontSize: 8.5, fontWeight: 800, top: 12 }}>30</span>
                </button>
              </div>

              {/* Right: Volume Control with Lavender Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 140, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsMuted && setIsMuted(!isMuted)}
                  style={{ background: 'none', border: 'none', color: isMuted ? '#F43F5E' : '#FFFFFF', cursor: 'pointer', padding: 2 }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : (volume ?? 0.8)}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    setVolume && setVolume(newVol);
                    if (isMuted && setIsMuted) setIsMuted(false);
                  }}
                  style={{
                    width: 80,
                    height: 4,
                    borderRadius: 9999,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    background: `linear-gradient(to right, #C084FC ${(isMuted ? 0 : (volume ?? 0.8)) * 100}%, rgba(255, 255, 255, 0.18) ${(isMuted ? 0 : (volume ?? 0.8)) * 100}%)`,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
