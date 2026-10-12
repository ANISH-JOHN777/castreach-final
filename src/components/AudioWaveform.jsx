import { useState, useRef } from 'react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function AudioWaveform({
  barCount = 56,
  height = 36,
  interactive = true,
  color = 'var(--accent-lime)',
  showHoverWave = true,
  className = '',
}) {
  const { isPlaying, currentTime, duration, seek, waveformData, formatTime } = useAudioPlayer();
  const [hoverPos, setHoverPos] = useState(null); // 0 to 1
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef(null);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hoverPercent = hoverPos !== null ? hoverPos * 100 : null;

  // Real-time frequency bars from analyser or smooth synthesized curve
  const bars = waveformData && waveformData.length
    ? waveformData.slice(0, barCount)
    : new Array(barCount).fill(16);

  const handleMouseMove = (e) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos);
  };

  const handleClick = (e) => {
    if (!interactive || !seek || !duration || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pos * duration);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setHoverPos(null); }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        height,
        cursor: interactive ? 'pointer' : 'default',
        padding: '0 2px',
        width: '100%',
        userSelect: 'none',
      }}
      title={interactive ? 'Click or drag to seek' : undefined}
    >
      {/* Floating Hover Time Capsule */}
      {interactive && isHovering && hoverPos !== null && duration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: height + 6,
            left: `${hoverPos * 100}%`,
            transform: 'translateX(-50%)',
            background: 'var(--bg-obsidian)',
            border: '1px solid var(--border-medium)',
            color: 'var(--accent-lime)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {formatTime ? formatTime(hoverPos * duration) : `${Math.round(hoverPos * duration)}s`}
        </div>
      )}

      {/* Thin Background Progress Rail (Reveals through bars) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 2,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 1,
          pointerEvents: 'none',
        }}
      />

      {/* Render Individual Waveform Bars with dynamic height, played state & hover reveal */}
      {bars.map((amp, idx) => {
        const barPos = (idx / barCount) * 100;
        const isPlayed = barPos <= progressPercent;
        const isHoveredPast = hoverPercent !== null && barPos <= hoverPercent;

        // When hovered, the wave bars dynamically expand & ripple upward around cursor
        let dynamicHeight = isPlaying ? amp : (idx % 3 === 0 ? 35 : idx % 2 === 0 ? 50 : 22);
        if (isHovering && hoverPos !== null) {
          const dist = Math.abs((idx / barCount) - hoverPos);
          if (dist < 0.15) {
            const rippleBoost = (1 - dist / 0.15) * 35;
            dynamicHeight = Math.min(100, dynamicHeight + rippleBoost);
          }
        }

        return (
          <div
            key={idx}
            style={{
              flex: 1,
              height: `${Math.max(12, dynamicHeight)}%`,
              minHeight: 3,
              borderRadius: 2,
              background: isPlayed
                ? color
                : isHoveredPast
                ? 'rgba(203, 251, 69, 0.45)'
                : 'rgba(255, 255, 255, 0.16)',
              transition: isHovering ? 'height 0.08s ease, background-color 0.1s ease' : 'height 0.15s ease, background-color 0.15s ease',
              transform: isHovering && hoverPos !== null && Math.abs((idx / barCount) - hoverPos) < 0.08 ? 'scaleY(1.15)' : 'scaleY(1)',
              transformOrigin: 'center',
            }}
          />
        );
      })}
    </div>
  );
}
