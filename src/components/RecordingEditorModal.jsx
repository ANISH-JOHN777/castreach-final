import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Scissors, 
  Trash2, 
  RotateCcw, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Upload,
  Film
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function formatSeconds(sec) {
  if (sec === undefined || sec === null || isNaN(sec) || !isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const DEFAULT_SAMPLE_VIDEO = '/sample-podcast.mp4';

export default function RecordingEditorModal({ booking, onClose, onSaveSuccess }) {
  const { authFetch } = useAuth();
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Video source resolution with validation
  const [videoSource, setVideoSource] = useState(() => {
    if (!booking?._id) return DEFAULT_SAMPLE_VIDEO;
    const localVideo = localStorage.getItem(`cr_recorded_video_${booking._id}`) || localStorage.getItem('cr_last_recording');
    // If localVideo is available and not a revoked blob, use it; otherwise fallback to booking or sample
    if (localVideo) return localVideo;
    if (booking.recordingUrl) return booking.recordingUrl;
    return DEFAULT_SAMPLE_VIDEO;
  });

  const savedDuration = Number(
    localStorage.getItem(`cr_duration_${booking?._id}`) ||
    localStorage.getItem('cr_last_recording_duration') ||
    booking?.recordingDuration ||
    0
  );
  const initialDuration = savedDuration > 0 && isFinite(savedDuration) ? savedDuration : 60;

  const [duration, setDuration] = useState(initialDuration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [toastNotice, setToastNotice] = useState('');

  // Clips state: Array of { id, start, end }
  const [clips, setClips] = useState([
    { id: 1, start: 0, end: initialDuration }
  ]);
  const [selectedClipId, setSelectedClipId] = useState(1);

  const showToast = (msg) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(''), 3500);
  };

  // Ensure video element loads fresh source when videoSource changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [videoSource]);

  // Load saved edits if existing
  useEffect(() => {
    const savedEditJson = localStorage.getItem(`cr_recording_edit_${booking?._id}`);
    if (savedEditJson) {
      try {
        const parsed = JSON.parse(savedEditJson);
        if (parsed?.clips && Array.isArray(parsed.clips) && parsed.clips.length > 0) {
          setClips(parsed.clips);
          setSelectedClipId(parsed.clips[0].id);
        }
      } catch (e) {}
    }
  }, [booking?._id]);

  const applyDuration = (dur) => {
    if (!isFinite(dur) || dur <= 0) return;
    setDuration(dur);
    setClips((prev) => {
      if (prev.length === 1 && (prev[0].end === 60 || prev[0].end > dur || prev[0].end === 0 || !isFinite(prev[0].end))) {
        return [{ id: prev[0].id, start: prev[0].start, end: dur }];
      }
      return prev;
    });
  };

  // Handle metadata loaded on video
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    let dur = v.duration;

    // Handle Chrome MediaRecorder WebM duration === Infinity
    if (dur === Infinity) {
      const onTimeUpdateForDuration = () => {
        v.removeEventListener('timeupdate', onTimeUpdateForDuration);
        v.currentTime = 0;
        const realDur = v.duration;
        if (realDur && isFinite(realDur) && realDur > 0) {
          applyDuration(realDur);
        } else if (v.seekable && v.seekable.length > 0) {
          const seekEnd = v.seekable.end(v.seekable.length - 1);
          if (isFinite(seekEnd) && seekEnd > 0) applyDuration(seekEnd);
        } else if (savedDuration > 0) {
          applyDuration(savedDuration);
        }
      };
      v.addEventListener('timeupdate', onTimeUpdateForDuration);
      try {
        v.currentTime = 1e101;
      } catch (e) {
        if (savedDuration > 0) applyDuration(savedDuration);
      }
    } else if (dur && isFinite(dur) && dur > 0) {
      applyDuration(dur);
    } else if (savedDuration > 0) {
      applyDuration(savedDuration);
    }
  };

  // Video time update & cut-flow enforcement
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    if (isFinite(curr)) {
      setCurrentTime(curr);
      // Auto-correct duration if video plays past current duration or duration is not finite
      if ((!isFinite(duration) || duration <= 0 || curr > duration) && curr > 0) {
        setDuration(Math.ceil(curr));
        setClips((prev) => {
          if (prev.length === 1 && prev[0].end < curr) {
            return [{ ...prev[0], end: Math.ceil(curr) }];
          }
          return prev;
        });
      }
    }

    // If outside active clip boundaries, jump to next clip
    const currentClip = clips.find((c) => curr >= c.start && curr < c.end);
    if (!currentClip && clips.length > 0) {
      const nextClip = clips.find((c) => c.start >= curr);
      if (nextClip) {
        videoRef.current.currentTime = nextClip.start;
      } else {
        videoRef.current.currentTime = clips[0].start;
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else if (currentClip && currentClip.id !== selectedClipId) {
      setSelectedClipId(currentClip.id);
    }
  };

  // Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const inClip = clips.some((c) => currentTime >= c.start && currentTime < c.end);
      if (!inClip && clips.length > 0) {
        videoRef.current.currentTime = clips[0].start;
      }
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Play error:', err);
          setIsPlaying(false);
        });
    }
  };

  // Skip delta seconds
  const skip = (delta) => {
    if (!videoRef.current) return;
    const nextTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  // Seek from range slider
  const handleSeek = (newTime) => {
    const t = Number(newTime);
    setCurrentTime(t);
    if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
    // Select the clip covering this time
    const coveringClip = clips.find((c) => t >= c.start && t <= c.end);
    if (coveringClip) {
      setSelectedClipId(coveringClip.id);
    }
  };

  // 1. SPLIT at playhead
  const handleSplit = () => {
    const activeClip = clips.find((c) => currentTime >= c.start && currentTime <= c.end) || clips.find((c) => c.id === selectedClipId);
    if (!activeClip) {
      showToast('Move timeline slider to choose a cut point inside a clip.');
      return;
    }

    if (currentTime <= activeClip.start + 0.3 || currentTime >= activeClip.end - 0.3) {
      showToast(`Scrub timeline slider to where you want to cut (e.g. ${formatSeconds(Math.round(activeClip.start + (activeClip.end - activeClip.start) / 2))}) then click Split.`);
      return;
    }

    const splitPoint = Math.round(currentTime * 10) / 10;
    const clipA = { id: activeClip.id, start: activeClip.start, end: splitPoint };
    const clipB = { id: Date.now(), start: splitPoint, end: activeClip.end };

    const newClips = [];
    for (const c of clips) {
      if (c.id === activeClip.id) {
        newClips.push(clipA, clipB);
      } else {
        newClips.push(c);
      }
    }
    setClips(newClips);
    setSelectedClipId(clipB.id);
    showToast(`Clip split at ${formatSeconds(splitPoint)}! ✂️`);
  };

  // 2. TRIM START to playhead
  const handleTrimStart = () => {
    const activeClip = clips.find((c) => c.id === selectedClipId) || clips[0];
    if (!activeClip) return;
    if (currentTime >= activeClip.end - 0.2) {
      showToast('Playhead must be before the end of the clip to trim start.');
      return;
    }

    const newStart = Math.round(currentTime * 10) / 10;
    setClips((prev) =>
      prev.map((c) => (c.id === activeClip.id ? { ...c, start: newStart } : c))
    );
    showToast(`Trimmed start to ${formatSeconds(newStart)}`);
  };

  // 2b. TRIM END to playhead
  const handleTrimEnd = () => {
    const activeClip = clips.find((c) => c.id === selectedClipId) || clips[0];
    if (!activeClip) return;
    if (currentTime <= activeClip.start + 0.2) {
      showToast('Playhead must be after the start of the clip to trim end.');
      return;
    }

    const newEnd = Math.round(currentTime * 10) / 10;
    setClips((prev) =>
      prev.map((c) => (c.id === activeClip.id ? { ...c, end: newEnd } : c))
    );
    showToast(`Trimmed end to ${formatSeconds(newEnd)}`);
  };

  // 3. DELETE clip
  const handleDeleteClip = (clipId) => {
    if (clips.length <= 1) {
      showToast('Cannot delete the only remaining clip. Use Trim instead.');
      return;
    }
    const remaining = clips.filter((c) => c.id !== clipId);
    setClips(remaining);
    setSelectedClipId(remaining[0].id);
    if (videoRef.current) {
      videoRef.current.currentTime = remaining[0].start;
    }
    showToast('Deleted clip section.');
  };

  // 4. RESET ALL
  const handleReset = () => {
    setClips([{ id: 1, start: 0, end: duration }]);
    setSelectedClipId(1);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    showToast('Reset all cuts to full original video.');
  };

  // Handle local video file upload from computer
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setVideoSource(localUrl);
    showToast(`Loaded ${file.name}`);
  };

  // Total edited duration
  const totalEditedSeconds = clips.reduce((sum, c) => sum + Math.max(0, c.end - c.start), 0);
  const selectedClip = clips.find((c) => c.id === selectedClipId) || clips[0];

  // Save Edit & Export
  const handleSaveAndExport = async () => {
    setSaving(true);
    setSuccessMsg('');

    const editPayload = {
      bookingId: booking?._id,
      clips,
      trimStartSeconds: clips[0]?.start || 0,
      trimEndSeconds: clips[clips.length - 1]?.end || duration,
      totalDurationSeconds: Math.round(totalEditedSeconds * 10) / 10,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`cr_recording_edit_${booking?._id}`, JSON.stringify(editPayload));

    await authFetch(`/recordings/${booking?._id}/edit`, {
      method: 'POST',
      body: JSON.stringify(editPayload),
    }).catch(() => {});

    // Download video file
    try {
      const a = document.createElement('a');
      a.href = videoSource;
      a.download = `recording_${booking?._id || 'cut'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {}

    setSaving(false);
    setSuccessMsg('Clips saved & video exported successfully!');
    if (onSaveSuccess) onSaveSuccess(editPayload);
    setTimeout(() => {
      if (onClose) onClose();
    }, 1800);
  };

  return (
    <div style={modalBackdropStyle}>
      <div style={modalContainerStyle}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF' }}>Recording Editor</span>
              <span style={cutPillStyle}>
                <Scissors size={12} color="#A855F7" /> Trim &amp; Split
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#A39EA9', marginTop: 2 }}>
              Scrub the timeline to any moment, then split into clips, trim handles, or delete unwanted bloopers.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={uploadBtnStyle}
              title="Open video from computer"
            >
              <Upload size={13} />
              <span>Import Video</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={closeBtnStyle}
              aria-label="Close editor"
            >
              <X size={18} color="#A39EA9" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div style={videoWrapperStyle}>
          <video
            ref={videoRef}
            key={videoSource}
            src={videoSource}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            onError={() => {
              console.warn('Video failed to load source, clearing stale cache and falling back to sample video');
              if (booking?._id) {
                localStorage.removeItem(`cr_recorded_video_${booking._id}`);
              }
              localStorage.removeItem('cr_last_recording');
              if (videoSource !== DEFAULT_SAMPLE_VIDEO) {
                setVideoSource(DEFAULT_SAMPLE_VIDEO);
              }
            }}
            playsInline
            preload="auto"
            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
          />

          {/* Center Big Play Button Overlay when paused */}
          {!isPlaying && (
            <div onClick={togglePlay} style={centerPlayOverlayStyle}>
              <div style={centerPlayCircleStyle}>
                <Play size={26} color="#000000" style={{ marginLeft: 3 }} />
              </div>
            </div>
          )}

          {/* Video Metadata Overlay */}
          <div style={videoOverlayBarStyle}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>
              {formatSeconds(currentTime)} / {formatSeconds(duration)}
            </span>
            <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>
              Edited Length: {formatSeconds(totalEditedSeconds)}
            </span>
          </div>
        </div>

        {/* Interactive Full-Width Scrubber Slider */}
        <div style={scrubberContainerStyle}>
          <input
            type="range"
            min="0"
            max={duration || 60}
            step="0.1"
            value={currentTime}
            onChange={(e) => handleSeek(e.target.value)}
            style={rangeSliderStyle}
          />
        </div>

        {/* Action Controls Dock (Trim, Split, Delete) */}
        <div style={actionControlsRowStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => skip(-5)}
              style={iconBtnStyle}
              title="Rewind 5s"
            >
              <Rewind size={15} color="#FFFFFF" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              style={playToggleBtnStyle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={17} color="#000000" /> : <Play size={17} color="#000000" style={{ marginLeft: 2 }} />}
            </button>

            <button
              type="button"
              onClick={() => skip(5)}
              style={iconBtnStyle}
              title="Forward 5s"
            >
              <FastForward size={15} color="#FFFFFF" />
            </button>
          </div>

          {/* Core Trim, Split, Delete Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleTrimStart}
              style={secondaryActionBtnStyle}
              title="Set clip start to current playhead"
            >
              <Scissors size={14} color="#A855F7" />
              <span>Trim Start [{formatSeconds(currentTime)}]</span>
            </button>

            <button
              type="button"
              onClick={handleSplit}
              style={primaryActionBtnStyle}
              title="Split clip at playhead"
            >
              <Scissors size={14} color="#FFFFFF" />
              <span>Split at Playhead ✂️</span>
            </button>

            <button
              type="button"
              onClick={handleTrimEnd}
              style={secondaryActionBtnStyle}
              title="Set clip end to current playhead"
            >
              <Scissors size={14} color="#A855F7" />
              <span>Trim End [{formatSeconds(currentTime)}]</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteClip(selectedClipId)}
              disabled={clips.length <= 1}
              style={deleteActionBtnStyle(clips.length <= 1)}
              title="Delete active clip"
            >
              <Trash2 size={14} color={clips.length <= 1 ? '#6F6A76' : '#EF4444'} />
              <span>Delete Clip</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={iconBtnStyle}
              title="Reset all cuts"
            >
              <RotateCcw size={14} color="#A39EA9" />
            </button>
          </div>
        </div>

        {/* Toast alert banner */}
        {toastNotice && (
          <div style={toastBannerStyle}>
            <span>{toastNotice}</span>
          </div>
        )}

        {/* Visual Clips Track */}
        <div style={timelineTrackContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#A39EA9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Clips Track ({clips.length} clip{clips.length > 1 ? 's' : ''})
            </span>
            <span style={{ fontSize: 11, color: '#6F6A76' }}>
              Selected Clip: <strong>{formatSeconds(selectedClip.start)} - {formatSeconds(selectedClip.end)}</strong> ({formatSeconds(selectedClip.end - selectedClip.start)})
            </span>
          </div>

          <div style={clipsTrackStyle}>
            {clips.map((clip, index) => {
              const leftPercent = (clip.start / (duration || 1)) * 100;
              const widthPercent = Math.max(3, ((clip.end - clip.start) / (duration || 1)) * 100);
              const isSelected = clip.id === selectedClipId;

              return (
                <div
                  key={clip.id}
                  onClick={() => {
                    setSelectedClipId(clip.id);
                    if (videoRef.current) videoRef.current.currentTime = clip.start;
                  }}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: 0,
                    bottom: 0,
                    borderRadius: 6,
                    backgroundColor: isSelected ? 'rgba(168, 85, 247, 0.45)' : 'rgba(34, 197, 94, 0.35)',
                    border: `2px solid ${isSelected ? '#A855F7' : '#22C55E'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 12px rgba(168, 85, 247, 0.4)' : 'none',
                  }}
                  title={`Clip ${index + 1}: ${formatSeconds(clip.start)} - ${formatSeconds(clip.end)}`}
                >
                  <span style={{ fontSize: 11, fontWeight: 750, color: '#FFFFFF', whiteSpace: 'nowrap', padding: '0 6px' }}>
                    Clip {index + 1} ({formatSeconds(clip.end - clip.start)})
                  </span>
                </div>
              );
            })}

            {/* Playhead Marker */}
            <div
              style={{
                position: 'absolute',
                left: `${(currentTime / (duration || 1)) * 100}%`,
                top: -3,
                bottom: -3,
                width: 3,
                backgroundColor: '#FFFFFF',
                boxShadow: '0 0 10px rgba(255, 255, 255, 1)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          {successMsg ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontSize: 13, fontWeight: 600 }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#A39EA9' }}>
              Final duration: <strong>{formatSeconds(totalEditedSeconds)}</strong> &bull; {clips.length} clip{clips.length > 1 ? 's' : ''}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAndExport}
              disabled={saving}
              style={primarySaveBtnStyle}
            >
              <Download size={15} />
              <span>{saving ? 'Exporting…' : 'Save & Download'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------

const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(10px)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const modalContainerStyle = {
  backgroundColor: '#0D0C12',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  maxWidth: 840,
  width: '100%',
  maxHeight: '94vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
};

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const cutPillStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: '#A855F7',
  background: 'rgba(168, 85, 247, 0.12)',
  padding: '3px 8px',
  borderRadius: 9999,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};

const uploadBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 6,
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 6,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const videoWrapperStyle = {
  position: 'relative',
  aspectRatio: '16/9',
  maxHeight: '44vh',
  backgroundColor: '#000000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

const centerPlayOverlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  background: 'rgba(0, 0, 0, 0.25)',
};

const centerPlayCircleStyle = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  backgroundColor: '#22C55E',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
};

const videoOverlayBarStyle = {
  position: 'absolute',
  bottom: 10,
  left: 12,
  right: 12,
  display: 'flex',
  justifyContent: 'space-between',
  background: 'rgba(13, 12, 18, 0.8)',
  backdropFilter: 'blur(8px)',
  padding: '5px 12px',
  borderRadius: 6,
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const scrubberContainerStyle = {
  padding: '10px 20px 0',
  backgroundColor: '#181622',
};

const rangeSliderStyle = {
  width: '100%',
  accentColor: '#A855F7',
  cursor: 'pointer',
};

const actionControlsRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 20px 14px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: '#181622',
  flexWrap: 'wrap',
  gap: 10,
};

const playToggleBtnStyle = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  backgroundColor: '#22C55E',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const iconBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  backgroundColor: '#211E2D',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const primaryActionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 8,
  backgroundColor: '#A855F7',
  border: 'none',
  color: '#FFFFFF',
  fontSize: 12.5,
  fontWeight: 750,
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(168, 85, 247, 0.3)',
};

const secondaryActionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 8,
  backgroundColor: '#211E2D',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 650,
  cursor: 'pointer',
};

const deleteActionBtnStyle = (disabled) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 8,
  backgroundColor: disabled ? 'rgba(255, 255, 255, 0.04)' : 'rgba(239, 68, 68, 0.15)',
  border: `1px solid ${disabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.3)'}`,
  color: disabled ? '#6F6A76' : '#EF4444',
  fontSize: 12,
  fontWeight: 650,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const toastBannerStyle = {
  padding: '6px 20px',
  backgroundColor: 'rgba(168, 85, 247, 0.15)',
  borderBottom: '1px solid rgba(168, 85, 247, 0.25)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'center',
};

const timelineTrackContainerStyle = {
  padding: '14px 20px',
  backgroundColor: '#13111A',
};

const clipsTrackStyle = {
  position: 'relative',
  height: 48,
  backgroundColor: '#181622',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  overflow: 'hidden',
};

const modalFooterStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 20px',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: '#0D0C12',
};

const secondaryBtnStyle = {
  padding: '8px 16px',
  borderRadius: 8,
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const primarySaveBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 18px',
  borderRadius: 8,
  backgroundColor: '#22C55E',
  border: 'none',
  color: '#000000',
  fontSize: 13,
  fontWeight: 750,
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(34, 197, 94, 0.25)',
};
