import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Heart,
  Maximize2
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function NowPlayingWidget({ compact = false }) {
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
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    favorites,
    toggleFavorite,
  } = useAudioPlayer();

  // Waveform bars simulation
  const [waveBars, setWaveBars] = useState(() =>
    Array.from({ length: 28 }, (_, i) => 20 + Math.sin(i * 0.4) * 15 + Math.random() * 20)
  );

  useEffect(() => {
    let animFrame;
    if (isPlaying) {
      const interval = setInterval(() => {
        setWaveBars(
          Array.from({ length: 28 }, () => Math.floor(Math.random() * 75) + 15)
        );
      }, 120);
      return () => clearInterval(interval);
    } else {
      setWaveBars(
        Array.from({ length: 28 }, (_, i) => Math.max(12, 16 + Math.sin(i * 0.5) * 8))
      );
    }
  }, [isPlaying]);

  if (!currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    seek(ratio * duration);
  };

  return (
    <div
      style={{
        background: '#16171d',
        borderRadius: 20,
        padding: '18px 20px',
        border: '1px solid #23252e',
        color: '#fff',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Title Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#8b8e9b',
            textTransform: 'uppercase',
          }}
        >
          Now Playing
        </span>
        <button
          onClick={() => toggleFavorite(currentTrack.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isFav ? '#ef4444' : '#6b7280',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s, transform 0.2s',
            transform: isFav ? 'scale(1.1)' : 'scale(1)',
          }}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={isFav ? '#ef4444' : 'none'} />
        </button>
      </div>

      {/* Track info with Artwork */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 14,
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            position: 'relative',
          }}
        >
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#f3f4f6',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginBottom: 4,
            }}
            title={currentTrack.title}
          >
            {currentTrack.title}
          </h4>
          <p
            style={{
              fontSize: 12,
              color: '#9ca3af',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentTrack.host}
          </p>
        </div>
      </div>

      {/* Waveform Sound Visualizer & Progress */}
      <div
        onClick={handleSeekClick}
        style={{
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2.5,
          cursor: 'pointer',
          padding: '6px 0',
          marginBottom: 6,
        }}
        title="Click to scrub audio"
      >
        {waveBars.map((height, i) => {
          const barFraction = (i / waveBars.length) * 100;
          const isPassed = barFraction <= progressPercent;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${height}%`,
                maxHeight: '100%',
                background: isPassed
                  ? '#3b82f6'
                  : 'rgba(255, 255, 255, 0.18)',
                borderRadius: 2,
                transition: isPlaying ? 'height 0.12s ease' : 'height 0.4s ease',
              }}
            />
          );
        })}
      </div>

      {/* Time timestamps */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          fontFamily: 'monospace',
          color: '#8b8e9b',
          marginBottom: 14,
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
        }}
      >
        {/* Shuffle */}
        <button
          onClick={() => setIsShuffle(!isShuffle)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isShuffle ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            padding: 6,
          }}
          title={isShuffle ? 'Shuffle on' : 'Shuffle off'}
        >
          <Shuffle size={15} />
        </button>

        {/* Previous */}
        <button
          onClick={prevTrack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#d1d5db',
            cursor: 'pointer',
            padding: 6,
            transition: 'color 0.2s',
          }}
          title="Previous Track"
        >
          <SkipBack size={18} />
        </button>

        {/* Big Play/Pause Button */}
        <button
          onClick={togglePlay}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#ffffff',
            color: '#0f1013',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isPlaying
              ? '0 0 18px rgba(59, 130, 246, 0.6)'
              : '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isPlaying ? 'scale(1.05)' : 'scale(1)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={19} fill="#0f1013" />
          ) : (
            <Play size={19} fill="#0f1013" style={{ marginLeft: 2 }} />
          )}
        </button>

        {/* Next */}
        <button
          onClick={nextTrack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#d1d5db',
            cursor: 'pointer',
            padding: 6,
            transition: 'color 0.2s',
          }}
          title="Next Track"
        >
          <SkipForward size={18} />
        </button>

        {/* Repeat */}
        <button
          onClick={() => setIsRepeat(!isRepeat)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isRepeat ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            padding: 6,
          }}
          title={isRepeat ? 'Repeat on' : 'Repeat off'}
        >
          <Repeat size={15} />
        </button>
      </div>
    </div>
  );
}
