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
  VolumeX,
  Radio,
  ExternalLink
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

  const [waveBars, setWaveBars] = useState(() => [
    28, 45, 60, 80, 50, 35, 65, 85, 42, 30, 70, 90, 55, 38, 75, 95, 52, 34, 62, 80, 44, 28, 68, 84, 46, 26
  ]);

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
          Math.floor(Math.random() * 50) + 22,
          Math.floor(Math.random() * 30) + 15,
        ]);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  const activeTrack = currentTrack || {
    id: 'default',
    title: 'The Daily Recap',
    host: 'Daily News Podcast',
    coverImage: '',
    category: 'Society & Culture'
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 25;
  const isFav = favorites?.includes(activeTrack.id);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 90,
      background: 'rgba(14, 14, 18, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border-subtle)',
      padding: '10px 24px',
      display: 'grid',
      gridTemplateColumns: '300px 1fr 280px',
      alignItems: 'center',
      gap: 20,
      boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.6)',
    }}>
      {/* Track Identification (Image 4 bottom left) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'var(--accent-tangerine)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(255, 87, 34, 0.3)',
          overflow: 'hidden',
        }}>
          {activeTrack.coverImage ? (
            <img src={activeTrack.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Radio size={22} color="#ffffff" />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 14,
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
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.85)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Heart size={16} fill={isFav ? 'var(--accent-tangerine)' : 'none'} />
        </button>
      </div>

      {/* Center Controls & Waveform Progress (Image 4 center) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 640, margin: '0 auto', width: '100%' }}>
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
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--accent-lime)',
              color: 'var(--text-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-lime)',
              transition: 'transform 0.15s ease, background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying ? (
              <Pause size={17} strokeWidth={2.5} fill="var(--text-dark)" />
            ) : (
              <Play size={17} strokeWidth={2.5} fill="var(--text-dark)" style={{ marginLeft: 2 }} />
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

        {/* Progress bar + Waveform indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
            {formatTime ? formatTime(currentTime || 342) : '05:42'}
          </span>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              if (seek && duration) seek(pos * duration);
            }}
            style={{
              flex: 1,
              height: 4,
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: 2,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-lime))',
              borderRadius: 2,
              transition: 'width 0.1s linear',
            }} />
          </div>

          <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: 36 }}>
            {formatTime ? formatTime(duration || 1320) : '22:00'}
          </span>
        </div>
      </div>

      {/* Right Waveform Spectrum & Volume (Image 4 bottom right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14 }}>
        {/* Animated Audio Equalizer Bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 22 }}>
          {waveBars.slice(0, 16).map((h, i) => (
            <div
              key={i}
              style={{
                width: 2.5,
                height: `${isPlaying ? h : 20}%`,
                background: i % 2 === 0 ? 'var(--accent-lime)' : 'var(--accent-purple)',
                borderRadius: 1,
                transition: 'height 0.15s ease',
              }}
            />
          ))}
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
