import { useEffect, useRef, useMemo } from 'react';

/**
 * AppleMusicCaptions: Real-time Synchronized Podcast Captions matching Player Mockup
 * - Displays timestamps (mm:ss) on the left
 * - Active caption highlighted in glowing #482F4C container with lavender text
 * - Click any timestamp to jump to that moment
 * - Auto-scroll smoothly centers the active caption when enabled
 */
export default function AppleMusicCaptions({ 
  currentTime = 0, 
  isPlaying = true, 
  captions = [],
  onSeek,
  autoScroll = true,
}) {
  const containerRef = useRef(null);
  const activeLineRef = useRef(null);

  // Fast binary search to resolve the current active cue index
  const activeIndex = useMemo(() => {
    if (!captions || captions.length === 0) return -1;

    let low = 0;
    let high = captions.length - 1;
    let match = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cue = captions[mid];

      if (currentTime >= cue.start && currentTime <= cue.end) {
        return mid;
      } else if (currentTime < cue.start) {
        high = mid - 1;
      } else {
        match = mid;
        low = mid + 1;
      }
    }

    if (match !== -1 && currentTime <= captions[match].end + 3.0) {
      return match;
    }

    if (captions[0] && currentTime < captions[0].start) {
      return -1;
    }

    return match;
  }, [captions, currentTime]);

  // Smooth auto-scroll following the active sentence when autoScroll is ON
  useEffect(() => {
    if (!autoScroll || !activeLineRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const activeEl = activeLineRef.current;

    const offsetTop = activeEl.offsetTop - container.offsetTop;
    const targetScroll = offsetTop - (container.clientHeight / 2) + (activeEl.clientHeight / 2);

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    });
  }, [activeIndex, autoScroll]);

  // Format seconds to mm:ss (e.g. 00:24)
  const formatCueTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!captions || captions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#94A3B8',
        fontSize: 14,
        fontFamily: "'Geist Sans', -apple-system, sans-serif",
      }}>
        No captions available for this master recording.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        scrollBehavior: 'smooth',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(226, 182, 238, 0.3) rgba(255, 255, 255, 0.04)',
        fontFamily: "'Geist Sans', -apple-system, sans-serif",
      }}
    >
      {captions.map((line, idx) => {
        const isActive = idx === activeIndex;

        return (
          <div
            key={`caption-${line.start}-${idx}`}
            ref={isActive ? activeLineRef : null}
            onClick={() => onSeek && onSeek(line.start)}
            title={onSeek ? `Jump to ${formatCueTime(line.start)}` : undefined}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 18,
              padding: '9px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              background: isActive 
                ? 'rgba(72, 47, 76, 0.45)' 
                : 'transparent',
              border: isActive 
                ? '1px solid rgba(226, 182, 238, 0.45)' 
                : '1px solid transparent',
              boxShadow: isActive 
                ? '0 0 16px rgba(72, 47, 76, 0.35)' 
                : 'none',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {/* Timestamp on Left (mm:ss) */}
            <span style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: 12.5,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#E2B6EE' : '#64748B',
              minWidth: 44,
              flexShrink: 0,
            }}>
              {formatCueTime(line.start)}
            </span>

            {/* Spoken Text on Right */}
            <span style={{
              fontSize: 14,
              lineHeight: 1.5,
              fontWeight: isActive ? 750 : 450,
              color: isActive ? '#FFFFFF' : '#94A3B8',
              flex: 1,
            }}>
              {line.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
