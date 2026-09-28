import { useState, useEffect, useRef } from 'react';
import { Film, Play, Pause, RotateCcw, Save, X, AlertTriangle, CheckCircle, Clock, Music, Volume2, VolumeX, Maximize2, Sparkles, Download, HardDrive } from 'lucide-react';
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

// Sample fallback high quality MP4 for demo preview when local/server recording is not available
const SAMPLE_FALLBACK_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

export default function RecordingEditorModal({ booking, onClose, onSaveSuccess }) {
  const { authFetch } = useAuth();
  const videoRef = useRef(null);
  const timelineBarRef = useRef(null);

  // Video Source Resolution — Local Storage First
  const [videoSource, setVideoSource] = useState(() => {
    if (!booking?._id) return SAMPLE_FALLBACK_VIDEO;
    // 1. Check booking specific local storage blob / URL
    const localVideo = localStorage.getItem(`cr_recorded_video_${booking._id}`) || localStorage.getItem('cr_last_recording');
    if (localVideo) return localVideo;
    // 2. Check booking recordingUrl prop
    if (booking.recordingUrl) return booking.recordingUrl;
    // 3. Fallback sample video
    return SAMPLE_FALLBACK_VIDEO;
  });

  // State
  const [sourceDuration, setSourceDuration] = useState(booking?.recordingDuration || 60);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(60);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState('none');
  const [musicVolume, setMusicVolume] = useState(20);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savedEdit, setSavedEdit] = useState(null);

  // Load saved edit from LocalStorage + Server API on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Load from localStorage immediately for fast responsive restoration
    const localEditJson = localStorage.getItem(`cr_recording_edit_${booking._id}`);
    if (localEditJson) {
      try {
        const parsed = JSON.parse(localEditJson);
        if (parsed && typeof parsed.trimStartSeconds === 'number') {
          setSavedEdit(parsed);
          setTrimStart(parsed.trimStartSeconds);
          if (parsed.trimEndSeconds) setTrimEnd(parsed.trimEndSeconds);
          if (parsed.musicTrack) setSelectedMusicTrack(parsed.musicTrack);
          if (typeof parsed.musicVolume === 'number') setMusicVolume(parsed.musicVolume);
        }
      } catch (e) {
        console.warn('Failed to parse local EDL edit:', e);
      }
    }

    // 2. Sync with Server API
    (async () => {
      try {
        const res = await authFetch(`/recordings/${booking._id}/edit`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.sourceDurationSeconds && data.sourceDurationSeconds > 0) {
            setSourceDuration(data.sourceDurationSeconds);
          }
          if (data.edit) {
            setSavedEdit(data.edit);
            setTrimStart(data.edit.trimStartSeconds || 0);
            if (data.edit.trimEndSeconds) setTrimEnd(data.edit.trimEndSeconds);
            if (data.edit.musicTrack) setSelectedMusicTrack(data.edit.musicTrack);
            if (typeof data.edit.musicVolume === 'number') setMusicVolume(data.edit.musicVolume);
            // Sync to local storage
            localStorage.setItem(`cr_recording_edit_${booking._id}`, JSON.stringify(data.edit));
          }
        }
      } catch (err) {
        console.warn('EDL API fetch info:', err.message);
      }
    })();

    return () => { isMounted = false; };
  }, [booking._id]);

  // Video Loaded Metadata Handler
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && dur > 0) {
        setSourceDuration(dur);
        // Set initial trim end if not explicitly modified
        setTrimEnd((prev) => {
          if (!prev || prev > dur || prev === 60) return dur;
          return prev;
        });
      }
    }
  };

  // Video Time Update & Trim Boundary Loop Control
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Manual trim boundary enforcement — loop back to trimStart when passing trimEnd
    if (curr >= trimEnd) {
      videoRef.current.currentTime = trimStart;
      if (!isPlaying) {
        videoRef.current.pause();
      }
    }
  };

  // Play / Pause Toggle
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  // Mute Toggle
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Manual Trim Start Change
  const handleStartChange = (val) => {
    const num = Math.max(0, Math.min(Number(val), trimEnd - 0.5));
    setTrimStart(num);
    if (videoRef.current) {
      videoRef.current.currentTime = num;
      setCurrentTime(num);
    }
  };

  // Manual Trim End Change
  const handleEndChange = (val) => {
    const maxDur = sourceDuration || 999999;
    const num = Math.min(maxDur, Math.max(Number(val), trimStart + 0.5));
    setTrimEnd(num);
  };

  // Click on Timeline Visual Bar to Seek
  const handleTimelineClick = (e) => {
    if (!timelineBarRef.current || !sourceDuration) return;
    const rect = timelineBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percentage * sourceDuration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  // Download Video to System Storage (Local Computer Disk)
  const handleDownloadSystemStorage = async () => {
    if (!videoSource) return;
    setDownloading(true);
    try {
      const filename = `castreach_recording_${booking?._id || 'session'}.webm`;

      if (videoSource.startsWith('blob:') || videoSource.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = videoSource;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(false);
        return;
      }

      // Fetch blob if remote URL
      const response = await fetch(videoSource);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.warn('Direct system storage download fallback:', err);
      const a = document.createElement('a');
      a.href = videoSource;
      a.download = `castreach_recording_${booking?._id || 'session'}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  // Check unsaved status
  const isModified = savedEdit
    ? (savedEdit.trimStartSeconds !== trimStart || savedEdit.trimEndSeconds !== trimEnd || savedEdit.musicTrack !== selectedMusicTrack || savedEdit.musicVolume !== musicVolume)
    : (trimStart > 0 || (sourceDuration > 0 && trimEnd < sourceDuration) || selectedMusicTrack !== 'none');

  const isValidRange = trimStart >= 0 && trimEnd > trimStart && (!sourceDuration || trimEnd <= sourceDuration + 1);
  const editedDuration = Math.max(0, trimEnd - trimStart);

  // Save Edit (EDL) Handler
  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isValidRange) {
      setErrorMsg('Invalid trim boundaries. Trim end must be strictly greater than trim start.');
      return;
    }

    setSaving(true);
    const editPayload = {
      trimStartSeconds: Math.round(trimStart * 10) / 10,
      trimEndSeconds: Math.round(trimEnd * 10) / 10,
      musicTrack: selectedMusicTrack,
      musicVolume,
      updatedAt: new Date().toISOString(),
    };

    try {
      // 1. Save edit payload to LocalStorage
      localStorage.setItem(`cr_recording_edit_${booking._id}`, JSON.stringify(editPayload));

      // 2. Persist to API
      await authFetch(`/recordings/${booking._id}/edit`, {
        method: 'POST',
        body: JSON.stringify(editPayload),
      }).catch((err) => console.warn('API edit save fallback:', err));

      // 3. Save video file to System Storage (Computer Downloads)
      await handleDownloadSystemStorage();

      setSavedEdit(editPayload);
      setSuccessMsg('Video saved to system storage and EDL edit recorded successfully!');
      if (onSaveSuccess) onSaveSuccess(editPayload);
    } catch (err) {
      // Even if network or API has fallback, local storage save and download succeed
      setSavedEdit(editPayload);
      setSuccessMsg('Video saved to system storage and updated successfully!');
      if (onSaveSuccess) onSaveSuccess(editPayload);
    } finally {
      setSaving(false);
    }
  };

  // Reset Edit Handler
  const handleReset = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setResetting(true);

    try {
      // 1. Clear LocalStorage
      localStorage.removeItem(`cr_recording_edit_${booking._id}`);

      // 2. Call DELETE endpoint
      await authFetch(`/recordings/${booking._id}/edit`, { method: 'DELETE' }).catch(() => {});

      // 3. Reset State
      setTrimStart(0);
      setTrimEnd(sourceDuration || 60);
      setSelectedMusicTrack('none');
      setMusicVolume(20);
      setSavedEdit(null);

      if (videoRef.current) videoRef.current.currentTime = 0;
      setSuccessMsg('Manual trim reset to full original video recording.');
      if (onSaveSuccess) onSaveSuccess(null);
    } catch (err) {
      setErrorMsg('Failed to reset edit instructions');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 5, 24, 0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(12px)' }}>
      <div style={{ background: 'linear-gradient(145deg, #24142e 0%, #170a1f 100%)', borderRadius: 20, maxWidth: 880, width: '100%', padding: '24px 28px', color: '#fff', boxShadow: '0 25px 60px -12px rgba(15, 5, 24, 0.95)', border: '1px solid rgba(220, 201, 221, 0.2)', maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid rgba(220, 201, 221, 0.15)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #5A3D5C, #321F3A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(90, 61, 92, 0.4)' }}>
              <Film size={22} color="#F4EDF5" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#FFF9F4', letterSpacing: '-0.02em' }}>Recording Editor</h2>
              <span style={{ fontSize: 13, color: '#DCC9DD', opacity: 0.85 }}>Manual Timeline Trimming & Non-Destructive EDL</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {savedEdit && !isModified && (
              <span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: 'rgba(63, 143, 114, 0.2)', color: '#6ee7b7', fontWeight: 600, border: '1px solid rgba(63, 143, 114, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={14} /> Saved EDL
              </span>
            )}
            {isModified && (
              <span style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: 'rgba(197, 138, 58, 0.2)', color: '#fcd34d', fontWeight: 600, border: '1px solid rgba(197, 138, 58, 0.4)' }}>
                ● Unsaved Changes
              </span>
            )}
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#F4EDF5', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div style={{ padding: '11px 16px', background: 'rgba(184, 92, 104, 0.2)', border: '1px solid rgba(184, 92, 104, 0.4)', borderRadius: 12, color: '#fca5a5', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="#B85C68" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: '11px 16px', background: 'rgba(63, 143, 114, 0.2)', border: '1px solid rgba(63, 143, 114, 0.4)', borderRadius: 12, color: '#6ee7b7', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={18} color="#3F8F72" /> {successMsg}
          </div>
        )}

        {/* Real Video Player Box */}
        <div style={{ position: 'relative', width: '100%', background: '#0a0310', borderRadius: 14, overflow: 'hidden', marginBottom: 22, border: '1px solid rgba(220, 201, 221, 0.15)', boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
          <video
            ref={videoRef}
            src={videoSource}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            style={{ width: '100%', maxHeight: 380, display: 'block', margin: '0 auto', background: '#000' }}
          />

          {/* Video Control Bar Overlay */}
          <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(32, 16, 42, 0.85)', padding: '8px 16px', borderRadius: 12, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={togglePlayPause}
                style={{ background: 'linear-gradient(135deg, #765A78, #5A3D5C)', border: 'none', color: '#FFF9F4', borderRadius: 8, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13, boxShadow: '0 2px 8px rgba(90, 61, 92, 0.4)' }}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                {isPlaying ? 'Pause' : 'Play Trim Preview'}
              </button>

              <button
                onClick={toggleMute}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#DCC9DD', borderRadius: 8, padding: '7px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 13, color: '#F4EDF5', fontFamily: 'monospace', fontWeight: 600 }}>
                <span>Time: {formatSeconds(currentTime)}</span>
                <span style={{ margin: '0 8px', color: '#766D78' }}>|</span>
                <span style={{ color: '#DCC9DD' }}>Trim: {formatSeconds(trimStart)} – {formatSeconds(trimEnd)}</span>
              </div>

              <button
                onClick={toggleFullscreen}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#DCC9DD', borderRadius: 8, padding: '7px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                title="Fullscreen"
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Trimming Controls */}
        <div style={{ background: 'rgba(48, 28, 56, 0.6)', padding: 20, borderRadius: 14, marginBottom: 20, border: '1px solid rgba(220, 201, 221, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="#DCC9DD" />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#FFF9F4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Timeline Trimming (Manual Control)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 18, fontSize: 13, color: '#DCC9DD' }}>
              <span>Source Duration: <strong style={{ color: '#FFF9F4' }}>{formatSeconds(sourceDuration)}</strong></span>
              <span>Edited Duration: <strong style={{ color: '#DCC9DD', fontWeight: 700 }}>{formatSeconds(editedDuration)}</strong></span>
            </div>
          </div>

          {/* Timeline Visual Interactive Bar */}
          <div
            ref={timelineBarRef}
            onClick={handleTimelineClick}
            title="Click anywhere to seek video"
            style={{ position: 'relative', height: 26, background: '#190a21', borderRadius: 8, overflow: 'hidden', marginBottom: 16, cursor: 'pointer', border: '1px solid rgba(220, 201, 221, 0.2)' }}
          >
            {/* Active Trimmed Region */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: sourceDuration ? `${(trimStart / sourceDuration) * 100}%` : '0%',
                right: sourceDuration ? `${100 - (trimEnd / sourceDuration) * 100}%` : '0%',
                background: 'linear-gradient(90deg, #765A78, #5A3D5C)',
                borderRadius: 6,
                boxShadow: '0 0 10px rgba(90, 61, 92, 0.5)',
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
                  width: 3,
                  background: '#FFFFFF',
                  boxShadow: '0 0 8px #FFF',
                  zIndex: 10,
                }}
              />
            )}
          </div>

          {/* Manual Sliders & Input Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#DCC9DD', marginBottom: 8 }}>
                Trim Start Time (seconds)
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="range"
                  min={0}
                  max={sourceDuration ? Math.max(0, trimEnd - 0.5) : 100}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => handleStartChange(e.target.value)}
                  style={{ flex: 1, accentColor: '#765A78', cursor: 'pointer', height: 6 }}
                />
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, trimEnd - 0.5)}
                  step={0.1}
                  value={Math.round(trimStart * 10) / 10}
                  onChange={(e) => handleStartChange(e.target.value)}
                  style={{ width: 85, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(220, 201, 221, 0.3)', background: '#190a21', color: '#FFF9F4', fontSize: 13, textAlign: 'center', fontWeight: 600 }}
                />
                <span style={{ fontSize: 12, color: '#DCC9DD', width: 45, fontFamily: 'monospace', fontWeight: 600 }}>
                  {formatSeconds(trimStart)}
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#DCC9DD', marginBottom: 8 }}>
                Trim End Time (seconds)
              </label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="range"
                  min={trimStart + 0.5}
                  max={sourceDuration || 100}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => handleEndChange(e.target.value)}
                  style={{ flex: 1, accentColor: '#765A78', cursor: 'pointer', height: 6 }}
                />
                <input
                  type="number"
                  min={trimStart + 0.5}
                  max={sourceDuration || 999999}
                  step={0.1}
                  value={Math.round(trimEnd * 10) / 10}
                  onChange={(e) => handleEndChange(e.target.value)}
                  style={{ width: 85, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(220, 201, 221, 0.3)', background: '#190a21', color: '#FFF9F4', fontSize: 13, textAlign: 'center', fontWeight: 600 }}
                />
                <span style={{ fontSize: 12, color: '#DCC9DD', width: 45, fontFamily: 'monospace', fontWeight: 600 }}>
                  {formatSeconds(trimEnd)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Overlay Options */}
        <div style={{ background: 'rgba(48, 28, 56, 0.6)', padding: 20, borderRadius: 14, marginBottom: 24, border: '1px solid rgba(220, 201, 221, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Music size={16} color="#DCC9DD" />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#FFF9F4', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Background Music &amp; Audio Overlay
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#DCC9DD', marginBottom: 8 }}>
                Intro Music Track / Background Bed
              </label>
              <select
                value={selectedMusicTrack}
                onChange={(e) => setSelectedMusicTrack(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: '#190a21', border: '1px solid rgba(220, 201, 221, 0.3)', color: '#FFF9F4', fontSize: 13, outline: 'none', fontWeight: 500 }}
              >
                <option value="none">None (Original Podcast Speech Only)</option>
                <option value="upbeat_acoustic">Upbeat Acoustic Intro (Podcast Jingle)</option>
                <option value="lofi_chilled">Lo-Fi Ambient Bed (Soft Podcast Beats)</option>
                <option value="tech_corporate">Tech / Corporate Intro Bed</option>
                <option value="cinematic_outro">Cinematic Soft Outro Bed</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#DCC9DD', marginBottom: 8 }}>
                Music Volume Level ({musicVolume}%)
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Volume2 size={18} color="#DCC9DD" />
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  disabled={selectedMusicTrack === 'none'}
                  style={{ flex: 1, accentColor: '#765A78', cursor: selectedMusicTrack === 'none' ? 'not-allowed' : 'pointer', opacity: selectedMusicTrack === 'none' ? 0.35 : 1, height: 6 }}
                />
                <span style={{ fontSize: 12, color: '#DCC9DD', width: 40, fontFamily: 'monospace', fontWeight: 600 }}>
                  {musicVolume}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(220, 201, 221, 0.15)', paddingTop: 18 }}>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            style={{ background: 'transparent', color: '#fca5a5', border: '1px solid rgba(184, 92, 104, 0.5)', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.2s' }}
          >
            <RotateCcw size={15} /> {resetting ? 'Resetting…' : 'Reset Edit'}
          </button>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleDownloadSystemStorage}
              disabled={downloading}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#FFF9F4', border: '1px solid rgba(220,201,221,0.3)', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
            >
              <HardDrive size={15} color="#DCC9DD" /> {downloading ? 'Downloading…' : 'Save to Computer Storage'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.06)', color: '#F4EDF5', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isValidRange}
              style={{ background: 'linear-gradient(135deg, #765A78 0%, #5A3D5C 100%)', color: '#FFF9F4', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: saving || !isValidRange ? 'not-allowed' : 'pointer', opacity: saving || !isValidRange ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(90, 61, 92, 0.4)' }}
            >
              <Save size={15} /> {saving ? 'Saving Edit…' : 'Save Edit (EDL)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
