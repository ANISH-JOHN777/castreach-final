import React, { useState, useEffect, useRef } from 'react';

// Apple Music-style time-synchronized caption lines
const DEFAULT_CAPTIONS = [
  { start: 0, end: 3.5, text: "Welcome to the CastReach Studio." },
  { start: 3.5, end: 7.2, text: "Where authentic voices connect and stories unfold." },
  { start: 7.2, end: 11.5, text: "Match with world-class hosts and industry-leading guests." },
  { start: 11.5, end: 15.8, text: "Schedule in physical recording studios or over Google Meet." },
  { start: 15.8, end: 20.0, text: "No fake profiles. Zero pre-seeded credentials." },
  { start: 20.0, end: 25.0, text: "Just high-fidelity audio and transparent conversations." },
  { start: 25.0, end: 30.0, text: "Speak loud. Be heard across the globe." },
];

export default function AppleMusicCaptions({ currentTime = 0, isPlaying = true, captions = DEFAULT_CAPTIONS }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    // Loop through captions or match current time modulo the total caption timeline duration
    const totalDuration = captions[captions.length - 1].end;
    const normalizedTime = totalDuration > 0 ? (currentTime % totalDuration) : 0;

    const idx = captions.findIndex((c) => normalizedTime >= c.start && normalizedTime < c.end);
    if (idx !== -1) {
      setActiveIndex(idx);
    } else {
      setActiveIndex(0);
    }
  }, [currentTime, captions]);

  // Center the active line smoothly
  useEffect(() => {
    if (!containerRef.current) return;
    const activeElem = containerRef.current.children[activeIndex];
    if (activeElem) {
      activeElem.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height: '100%',
        maxHeight: 140,
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '12px 16px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        textAlign: 'center',
        userSelect: 'none',
      }}
    >
      {captions.map((line, idx) => {
        const isActive = idx === activeIndex;
        const isPrev = idx === activeIndex - 1;
        const isNext = idx === activeIndex + 1;

        return (
          <div
            key={idx}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isActive ? '18px' : isPrev || isNext ? '14px' : '12px',
              fontWeight: isActive ? 850 : 600,
              letterSpacing: isActive ? '-0.02em' : '0em',
              color: isActive ? 'var(--accent-lime)' : isPrev || isNext ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.15)',
              transform: isActive ? 'scale(1.04)' : 'scale(0.96)',
              filter: isActive ? 'none' : 'blur(0.5px)',
              transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              lineHeight: 1.35,
              cursor: 'default',
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}
