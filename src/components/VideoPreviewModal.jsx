import { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, AlertTriangle, Loader } from 'lucide-react';

function formatSeconds(sec) {
  if (sec === undefined || sec === null || isNaN(sec)) return '00:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoPreviewModal({ title = 'Recording Preview', videoUrl, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Close on Escape keypress
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup media resources on unmount / close
  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    onClose();
  };

  const handleLoadedMetadata = () => {
    setLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime || 0);
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setError(true));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        padding: 20,
      }}
    >
      <div
        ref={containerRef}
        style={{
          background: '#18181b',
          borderRadius: 14,
          maxWidth: 780,
          width: '94vw',
          padding: 20,
          color: '#fff',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
          border: '1px solid #27272a',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f4f4f5' }}>{title}</h3>
            <span style={{ fontSize: 12, color: '#a1a1aa' }}>Secure Post-Meeting Player</span>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close Preview"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#a1a1aa',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Wrapper */}
        <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: 10, overflow: 'hidden', minHeight: 240 }}>
          {loading && !error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#09090b', zIndex: 10 }}>
              <Loader size={28} className="spin" color="#8b5cf6" style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
              <span style={{ fontSize: 13, color: '#a1a1aa' }}>Loading recording preview...</span>
            </div>
          )}

          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#09090b', padding: 20, textAlign: 'center', zIndex: 10 }}>
              <AlertTriangle size={32} color="#ef4444" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fca5a5', marginBottom: 4 }}>Playback Error</div>
              <div style={{ fontSize: 12, color: '#a1a1aa' }}>Unable to play recording preview stream. Please check signed URL or retry.</div>
            </div>
          )}

          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => { setLoading(false); setError(true); }}
            autoPlay
            style={{ width: '100%', maxHeight: 420, display: 'block', margin: '0 auto', background: '#000' }}
          />

          {/* Video Controls Bar */}
          {!error && (
            <div style={{ padding: '10px 14px', background: 'rgba(24,24,27,0.95)', borderTop: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={togglePlayPause}
                style={{ background: '#8b5cf6', border: 'none', color: '#fff', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <span style={{ fontSize: 12, color: '#a1a1aa', fontFamily: 'monospace', minWidth: 44 }}>
                {formatSeconds(currentTime)}
              </span>

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                style={{ flex: 1, accentColor: '#8b5cf6', cursor: 'pointer' }}
              />

              <span style={{ fontSize: 12, color: '#a1a1aa', fontFamily: 'monospace', minWidth: 44 }}>
                {formatSeconds(duration)}
              </span>

              <button
                onClick={toggleMute}
                style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 4 }}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>

              <button
                onClick={toggleFullscreen}
                style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 4 }}
                aria-label="Fullscreen"
              >
                <Maximize size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
