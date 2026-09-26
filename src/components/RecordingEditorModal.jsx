import { useState, useEffect, useRef } from 'react';
import { Film, Play, Pause, RotateCcw, Save, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

export default function RecordingEditorModal({ booking, onClose, onSaveSuccess }) {
  const { authFetch } = useAuth();
  const videoRef = useRef(null);

  const [sourceDuration, setSourceDuration] = useState(booking?.recordingDuration || 0);
  const [trimStart, setTrimStart] = useState(booking?.recordingEdit?.trimStartSeconds || 0);
  const [trimEnd, setTrimEnd] = useState(booking?.recordingEdit?.trimEndSeconds || booking?.recordingDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savedEdit, setSavedEdit] = useState(booking?.recordingEdit || null);

  // Load latest edit metadata from API upon mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await authFetch(`/recordings/${booking._id}/edit`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.sourceDurationSeconds && !sourceDuration) {
            setSourceDuration(data.sourceDurationSeconds);
          }
          if (data.edit) {
            setSavedEdit(data.edit);
            setTrimStart(data.edit.trimStartSeconds || 0);
            if (data.edit.trimEndSeconds) setTrimEnd(data.edit.trimEndSeconds);
          }
        }
      } catch (err) {
        console.warn('Failed to load EDL metadata:', err);
      }
    })();

    return () => { isMounted = false; };
  }, [booking._id]);

  // Video Loaded Metadata callback
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && dur > 0) {
        setSourceDuration(dur);
        if (!trimEnd || trimEnd > dur || (savedEdit && savedEdit.trimEndSeconds > dur)) {
          setTrimEnd(savedEdit?.trimEndSeconds ? Math.min(savedEdit.trimEndSeconds, dur) : dur);
        }
      }
    }
  };

  // Keep video playback within trim range
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // If playback passes trimEnd, loop back to trimStart
    if (curr >= trimEnd) {
      videoRef.current.currentTime = trimStart;
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStartChange = (val) => {
    const num = Math.max(0, Math.min(Number(val), trimEnd - 1));
    setTrimStart(num);
    if (videoRef.current) {
      videoRef.current.currentTime = num;
    }
  };

  const handleEndChange = (val) => {
    const maxDur = sourceDuration || 999999;
    const num = Math.min(maxDur, Math.max(Number(val), trimStart + 1));
    setTrimEnd(num);
  };

  // Check unsaved status
  const isModified = savedEdit
    ? (savedEdit.trimStartSeconds !== trimStart || savedEdit.trimEndSeconds !== trimEnd)
    : (trimStart > 0 || (sourceDuration > 0 && trimEnd < sourceDuration));

  const isValidRange = trimStart >= 0 && trimEnd > trimStart && (!sourceDuration || trimEnd <= sourceDuration + 0.5);
  const editedDuration = Math.max(0, trimEnd - trimStart);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isValidRange) {
      setErrorMsg('Invalid trim boundaries. Trim end must be greater than trim start.');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`/recordings/${booking._id}/edit`, {
        method: 'POST',
        body: JSON.stringify({
          trimStartSeconds: trimStart,
          trimEndSeconds: trimEnd,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save edit instructions');

      setSavedEdit(data.edit);
      setSuccessMsg('Non-destructive edit saved successfully!');
      if (onSaveSuccess) onSaveSuccess(data.edit);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred saving edit instructions.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setResetting(true);

    try {
      const res = await authFetch(`/recordings/${booking._id}/edit`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset edit');

      setTrimStart(0);
      setTrimEnd(sourceDuration);
      setSavedEdit(null);
      setSuccessMsg('Edit instructions reset to full original recording.');
      if (videoRef.current) videoRef.current.currentTime = 0;
      if (onSaveSuccess) onSaveSuccess(null);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset edit');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#18181b', borderRadius: 14, maxWidth: 840, width: '100%', padding: '24px', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', border: '1px solid #27272a', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #27272a', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Film size={22} color="#8b5cf6" />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f4f4f5' }}>Recording Editor</h2>
              <span style={{ fontSize: 12, color: '#a1a1aa' }}>Non-Destructive EDL & Timeline Preview</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {savedEdit && !isModified && (
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} /> Saved EDL
              </span>
            )}
            {isModified && (
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}>
                ● Unsaved Changes
              </span>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: 24, cursor: 'pointer', lineHeight: 1 }} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#ef4444" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#6ee7b7', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} color="#10b981" /> {successMsg}
          </div>
        )}

        {/* Video Player Box */}
        <div style={{ position: 'relative', width: '100%', background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          <video
            ref={videoRef}
            src={booking.recordingUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{ width: '100%', maxHeight: 380, display: 'block', margin: '0 auto' }}
          />
          <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.65)', padding: '6px 12px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
            <button
              onClick={togglePlayPause}
              style={{ background: '#8b5cf6', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'Pause' : 'Play Trim Preview'}
            </button>
            <div style={{ fontSize: 12, color: '#d4d4d8', fontFamily: 'monospace' }}>
              <span>Time: {formatSeconds(currentTime)}</span>
              <span style={{ margin: '0 8px', color: '#52525b' }}>|</span>
              <span>Trim: {formatSeconds(trimStart)} – {formatSeconds(trimEnd)}</span>
            </div>
          </div>
        </div>

        {/* Timeline Range Controls */}
        <div style={{ background: '#27272a', padding: 18, borderRadius: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Timeline Trimming
            </span>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#a1a1aa' }}>
              <span>Source: <strong style={{ color: '#fff' }}>{formatSeconds(sourceDuration)}</strong></span>
              <span>Edited Duration: <strong style={{ color: '#8b5cf6' }}>{formatSeconds(editedDuration)}</strong></span>
            </div>
          </div>

          {/* Timeline Visual Bar */}
          <div style={{ position: 'relative', height: 24, background: '#3f3f46', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
            {/* Active Trimmed Region */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: sourceDuration ? `${(trimStart / sourceDuration) * 100}%` : '0%',
                right: sourceDuration ? `${100 - (trimEnd / sourceDuration) * 100}%` : '0%',
                background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                borderRadius: 4,
              }}
            />
            {/* Playhead Indicator */}
            {sourceDuration > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(currentTime / sourceDuration) * 100}%`,
                  width: 2,
                  background: '#ffffff',
                  boxShadow: '0 0 4px #000',
                }}
              />
            )}
          </div>

          {/* Trim Handles Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 6 }}>
                Trim Start Time (seconds)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="range"
                  min={0}
                  max={sourceDuration ? Math.max(0, trimEnd - 1) : 100}
                  step={0.5}
                  value={trimStart}
                  onChange={(e) => handleStartChange(e.target.value)}
                  style={{ flex: 1, accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, trimEnd - 1)}
                  step={0.5}
                  value={Math.round(trimStart * 10) / 10}
                  onChange={(e) => handleStartChange(e.target.value)}
                  style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: 13, textAlign: 'center' }}
                />
                <span style={{ fontSize: 12, color: '#a1a1aa', width: 50, fontFamily: 'monospace' }}>
                  {formatSeconds(trimStart)}
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 6 }}>
                Trim End Time (seconds)
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="range"
                  min={trimStart + 1}
                  max={sourceDuration || 100}
                  step={0.5}
                  value={trimEnd}
                  onChange={(e) => handleEndChange(e.target.value)}
                  style={{ flex: 1, accentColor: '#8b5cf6', cursor: 'pointer' }}
                />
                <input
                  type="number"
                  min={trimStart + 1}
                  max={sourceDuration || 999999}
                  step={0.5}
                  value={Math.round(trimEnd * 10) / 10}
                  onChange={(e) => handleEndChange(e.target.value)}
                  style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid #3f3f46', background: '#18181b', color: '#fff', fontSize: 13, textAlign: 'center' }}
                />
                <span style={{ fontSize: 12, color: '#a1a1aa', width: 50, fontFamily: 'monospace' }}>
                  {formatSeconds(trimEnd)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #27272a', paddingTop: 16 }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            style={{ background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={15} /> {resetting ? 'Resetting…' : 'Reset Edit'}
          </button>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', color: '#a1a1aa', border: '1px solid #3f3f46', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isValidRange}
              style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: saving || !isValidRange ? 'not-allowed' : 'pointer', opacity: saving || !isValidRange ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Save size={15} /> {saving ? 'Saving Edit…' : 'Save Edit (EDL)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
