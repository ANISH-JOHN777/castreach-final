import { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Heart,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function NowPlayingWidget() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    formatTime,
    isShuffle,
    setIsShuffle,
    isRepeat,
    setIsRepeat,
    favorites,
    toggleFavorite,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    waveformData,
  } = useAudioPlayer();

  const activeTrack = currentTrack || {
    id: 'default',
    title: 'The Daily Recap',
    host: 'Daily News Podcast',
    coverImage: '',
    category: 'Society & Culture'
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isFav = favorites?.includes(activeTrack.id);

  // Dynamic waveform bars from Web Audio API (or default 48-bar array)
  const spectrumBars = waveformData && waveformData.length ? waveformData : new Array(48).fill(12);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 90,
      background: 'rgba(12, 13, 17, 0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border-subtle)',
      padding: '10px 24px',
      display: 'grid',
      gridTemplateColumns: '300px 1fr 280px',
      alignItems: 'center',
      gap: 20,
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
    }}>
      {/* ── Left Track Identification ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 8,
          background: 'var(--accent-purple)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {activeTrack.coverImage ? (
            <img src={activeTrack.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Radio size={20} color="#ffffff" />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: '#ffffff',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}>
            {activeTrack.title}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}>
            {activeTrack.host}
          </div>
        </div>

        <button
          onClick={() => toggleFavorite && toggleFavorite(activeTrack.id)}
          style={{
            background: 'none',
            border: 'none',
            color: isFav ? 'var(--accent-tangerine)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            marginLeft: 4,
            transition: 'transform 0.14s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.85)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Heart size={16} fill={isFav ? 'var(--accent-tangerine)' : 'none'} />
        </button>
      </div>

      {/* ── Center Controls & Interactive Real-Time Waveform ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 620, margin: '0 auto', width: '100%' }}>
        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => setIsShuffle && setIsShuffle(!isShuffle)}
            style={{
              background: 'none',
              border: 'none',
              color: isShuffle ? 'var(--accent-lime)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Shuffle size={14} />
          </button>

          <button
            onClick={prevTrack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
              transition: 'color 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <SkipBack size={16} />
          </button>

          {/* Central Play/Pause button */}
          <button
            onClick={togglePlay}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--accent-lime)',
              color: 'var(--text-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.14s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.14s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying ? (
              <Pause size={16} strokeWidth={2.5} fill="var(--text-dark)" />
            ) : (
              <Play size={16} strokeWidth={2.5} fill="var(--text-dark)" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            onClick={nextTrack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
              transition: 'color 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <SkipForward size={16} />
          </button>

          <button
            onClick={() => setIsRepeat && setIsRepeat(!isRepeat)}
            style={{
              background: 'none',
              border: 'none',
              color: isRepeat ? 'var(--accent-lime)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* ── REAL-TIME INTERACTIVE PODCAST WAVEFORM SCRUBBER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
            {formatTime ? formatTime(currentTime) : '00:00'}
          </span>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              if (seek && duration) seek(pos * duration);
            }}
            style={{
              flex: 1,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              cursor: 'pointer',
              padding: '0 4px',
              position: 'relative',
            }}
            title="Click to seek in podcast"
          >
            {spectrumBars.map((heightPercent, index) => {
              const barProgress = (index / spectrumBars.length) * 100;
              const isPlayed = barProgress <= progressPercent;

              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${Math.max(14, isPlaying ? heightPercent : (index % 3 === 0 ? 30 : index % 2 === 0 ? 45 : 20))}%`,
                    minHeight: 3,
                    borderRadius: 2,
                    background: isPlayed ? 'var(--accent-lime)' : 'rgba(255, 255, 255, 0.16)',
                    transition: 'height 0.08s ease, background-color 0.12s ease',
                  }}
                />
              );
            })}
          </div>

          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: 36 }}>
            {formatTime ? formatTime(duration) : '30:00'}
          </span>
        </div>
      </div>

      {/* ── Right Spectrum Indicator & Volume Control ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
        {/* Real-time VU Indicator Pulse */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isPlaying ? 'var(--accent-lime)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: isPlaying ? 'var(--accent-lime)' : 'var(--text-muted)',
            display: 'inline-block',
          }} />
          <span>{isPlaying ? 'STREAMING' : 'READY'}</span>
        </div>

        {/* Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setIsMuted && setIsMuted(!isMuted)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 2 }}
          >
            {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume || 0.8}
            onChange={(e) => setVolume && setVolume(parseFloat(e.target.value))}
            style={{
              width: 70,
              accentColor: 'var(--accent-lime)',
              cursor: 'pointer',
              height: 3,
            }}
          />
        </div>
      </div>
    </div>
  );
}
