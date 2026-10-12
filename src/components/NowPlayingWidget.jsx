import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Heart,
  Volume2,
  VolumeX
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
  } = useAudioPlayer();

  // Waveform amplitude bars (26 bars)
  const [waveBars, setWaveBars] = useState(() =>
    [24, 38, 52, 68, 45, 30, 60, 75, 40, 28, 65, 82, 50, 35, 70, 85, 48, 32, 58, 74, 42, 26, 62, 78, 44, 25]
  );

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setWaveBars([
          Math.floor(Math.random() * 40) + 20,
          Math.floor(Math.random() * 55) + 30,
          Math.floor(Math.random() * 60) + 35,
          Math.floor(Math.random() * 70) + 25,
          Math.floor(Math.random() * 50) + 20,
          Math.floor(Math.random() * 45) + 25,
          Math.floor(Math.random() * 65) + 30,
          Math.floor(Math.random() * 75) + 20,
          Math.floor(Math.random() * 40) + 25,
          Math.floor(Math.random() * 50) + 20,
          Math.floor(Math.random() * 70) + 25,
          Math.floor(Math.random() * 85) + 15,
          Math.floor(Math.random() * 60) + 25,
          Math.floor(Math.random() * 45) + 20,
          Math.floor(Math.random() * 70) + 25,
          Math.floor(Math.random() * 80) + 18,
          Math.floor(Math.random() * 55) + 22,
          Math.floor(Math.random() * 40) + 20,
          Math.floor(Math.random() * 65) + 30,
          Math.floor(Math.random() * 75) + 20,
          Math.floor(Math.random() * 48) + 24,
          Math.floor(Math.random() * 35) + 20,
          Math.floor(Math.random() * 60) + 30,
          Math.floor(Math.random() * 75) + 20,
          Math.floor(Math.random() * 45) + 20,
          Math.floor(Math.random() * 30) + 20,
        ]);
      }, 140);
      return () => clearInterval(interval);
    } else {
      setWaveBars([
        20, 30, 42, 50, 35, 25, 45, 55, 30, 22, 48, 60, 38, 28, 52, 62, 36, 26, 44, 54, 32, 22, 46, 56, 34, 20
      ]);
    }
  }, [isPlaying]);

  if (!currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const progressPercent = progressRatio * 100;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  return (
    <div
      style={{
        background: '#15161c',
        borderRadius: 20,
        padding: '18px 18px',
        border: '1px solid #23252e',
        color: '#f3f4f6',
      }}
    >
      {/* Header */}
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
            color: '#6b7280',
            textTransform: 'uppercase',
          }}
        >
          NOW PLAYING
        </span>
        <button
          type="button"
          onClick={() => toggleFavorite(currentTrack.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isFav ? '#ef4444' : '#6b7280',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={isFav ? '#ef4444' : 'none'} />
        </button>
      </div>

      {/* Track Artwork and Meta */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 14,
            overflow: 'hidden',
            flexShrink: 0,
            background: '#1e2029',
          }}
        >
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

      {/* Waveform Audio Visualizer (matching Image 3) */}
      <div
        onClick={handleSeek}
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
        title="Click anywhere to scrub playback"
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
                background: isPassed ? '#3b82f6' : '#282a36',
                borderRadius: 2,
                transition: 'height 0.12s ease',
              }}
            />
          );
        })}
      </div>

      {/* Time indicators */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          fontFamily: 'monospace',
          color: '#6b7280',
          marginBottom: 16,
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls row matching Image 3 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
        }}
      >
        <button
          type="button"
          onClick={() => setIsShuffle(!isShuffle)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isShuffle ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            padding: 6,
          }}
          title="Shuffle"
        >
          <Shuffle size={15} />
        </button>

        <button
          type="button"
          onClick={prevTrack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#d1d5db',
            cursor: 'pointer',
            padding: 6,
          }}
          title="Previous"
        >
          <SkipBack size={18} />
        </button>

        {/* Clean solid circular Play/Pause button */}
        <button
          type="button"
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
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={18} fill="#0f1013" />
          ) : (
            <Play size={18} fill="#0f1013" style={{ marginLeft: 2 }} />
          )}
        </button>

        <button
          type="button"
          onClick={nextTrack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#d1d5db',
            cursor: 'pointer',
            padding: 6,
          }}
          title="Next"
        >
          <SkipForward size={18} />
        </button>

        <button
          type="button"
          onClick={() => setIsRepeat(!isRepeat)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isRepeat ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            padding: 6,
          }}
          title="Repeat"
        >
          <Repeat size={15} />
        </button>
      </div>
    </div>
  );
}
