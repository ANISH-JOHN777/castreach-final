import { useAudioPlayer } from '../context/AudioPlayerContext';

export default function AudioWaveform({ barCount = 36, height = 36, interactive = true, color = 'var(--accent-lime)' }) {
  const { isPlaying, currentTime, duration, seek, waveformData } = useAudioPlayer();

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bars = waveformData && waveformData.length ? waveformData.slice(0, barCount) : new Array(barCount).fill(15);

  const handleClick = (e) => {
    if (!interactive || !seek || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seek(pos * duration);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        height,
        cursor: interactive ? 'pointer' : 'default',
        padding: '0 2px',
        width: '100%',
      }}
      title={interactive ? 'Click to seek in episode' : undefined}
    >
      {bars.map((amp, idx) => {
        const barPos = (idx / barCount) * 100;
        const isPlayed = barPos <= progressPercent;

        return (
          <div
            key={idx}
            style={{
              flex: 1,
              height: `${Math.max(12, isPlaying ? amp : (idx % 3 === 0 ? 35 : idx % 2 === 0 ? 55 : 20))}%`,
              minHeight: 3,
              borderRadius: 2,
              background: isPlayed ? color : 'rgba(255, 255, 255, 0.16)',
              transition: 'height 0.08s ease, background-color 0.12s ease',
            }}
          />
        );
      })}
    </div>
  );
}
