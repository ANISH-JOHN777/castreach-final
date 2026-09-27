import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DailyIframe from '@daily-co/daily-js';
import LiveCaptionOverlay from '../components/LiveCaptionOverlay';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Clock,
  RefreshCw,
  Volume2,
  Info
} from 'lucide-react';

export default function RecordingRoom() {
  const { id, bookingId } = useParams();
  const bId = id || bookingId;
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();

  // State machine: 'loading' | 'unauthorized' | 'booking_status_error' | 'prejoin' | 'meeting' | 'left' | 'error'
  const [step, setStep] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [booking, setBooking] = useState(null);

  // Pre-join devices & permissions state
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const [prejoinMicOn, setPrejoinMicOn] = useState(true);
  const [prejoinCamOn, setPrejoinCamOn] = useState(true);
  const [permError, setPermError] = useState(null);
  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  // Token data
  const [tokenData, setTokenData] = useState(null);

  // Meeting call state & recording status
  const [callState, setCallState] = useState('joining'); // 'joining' | 'connected' | 'reconnecting' | 'disconnected'
  const [serverRecordingStatus, setServerRecordingStatus] = useState('NOT_STARTED'); // 'NOT_STARTED'|'RECORDING'|'PROCESSING'|'READY'|'FAILED'
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  // Refs
  const previewVideoRef = useRef(null);
  const previewStreamRef = useRef(null);
  const dailyContainerRef = useRef(null);
  const dailyFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // 1. Initial booking load & token fetch
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setStep('loading');
        setErrorMessage('');

        // Fetch booking
        const bRes = await authFetch(`/bookings/${bId}`);
        const bData = await bRes.json();
        if (!bRes.ok) {
          if (bRes.status === 403 || bRes.status === 401) {
            if (isMounted) setStep('unauthorized');
            return;
          }
          throw new Error(bData.error || 'Failed to load booking');
        }

        const b = bData.booking;
        if (isMounted) {
          setBooking(b);
          if (b.recordingStatus) setServerRecordingStatus(b.recordingStatus);
        }

        // Check booking status
        if (b.status === 'pending') {
          if (isMounted) {
            setStatusMessage('Waiting for host confirmation before joining the meeting room.');
            setStep('booking_status_error');
          }
          return;
        }
        if (b.status === 'cancelled') {
          if (isMounted) {
            setStatusMessage('This booking session has been cancelled.');
            setStep('booking_status_error');
          }
          return;
        }
        if (b.status === 'completed') {
          if (isMounted) {
            setStatusMessage('This recording session has already been completed.');
            setStep('booking_status_error');
          }
          return;
        }
        if (b.status === 'disputed') {
          if (isMounted) {
            setStatusMessage('This session is currently under review or dispute.');
            setStep('booking_status_error');
          }
          return;
        }
        if (b.status !== 'confirmed') {
          if (isMounted) {
            setStatusMessage(`Cannot join meeting with status: ${b.status}`);
            setStep('booking_status_error');
          }
          return;
        }

        // Request secure Daily meeting token
        const tRes = await authFetch('/recordings/token', {
          method: 'POST',
          body: JSON.stringify({ bookingId: bId }),
        });
        const tData = await tRes.json();
        if (!tRes.ok) {
          if (tRes.status === 403) {
            if (isMounted) setStep('unauthorized');
            return;
          }
          throw new Error(tData.error || 'Failed to obtain meeting token');
        }

        if (isMounted) {
          setTokenData(tData);
          setStep('prejoin');
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'An error occurred loading the meeting room.');
          setStep('error');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [bId]);

  // 2. Poll recording status while meeting is active
  useEffect(() => {
    if (step !== 'meeting') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await authFetch(`/recordings/${bId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.recordingStatus) {
            setServerRecordingStatus(data.recordingStatus);
          }
        }
      } catch (err) {
        console.warn('Recording status poll warning:', err);
      }
    }, 8000);

    return () => clearInterval(pollInterval);
  }, [step, bId]);

  // 3. Pre-join camera/microphone initialization
  useEffect(() => {
    if (step !== 'prejoin') return;

    let localStream = null;

    async function initPrejoinMedia() {
      try {
        setPermError(null);
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        previewStreamRef.current = localStream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = localStream;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const cams = devices.filter((d) => d.kind === 'videoinput');

        setAudioDevices(mics);
        setVideoDevices(cams);
        if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
        if (cams.length > 0 && !selectedCam) setSelectedCam(cams[0].deviceId);
      } catch (err) {
        console.warn('Prejoin media access error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          if (err.message?.toLowerCase().includes('camera')) {
            setPermError({
              type: 'camera',
              message: 'Camera access is required for video. Allow camera access in your browser settings and try again.',
            });
          } else if (err.message?.toLowerCase().includes('microphone')) {
            setPermError({
              type: 'mic',
              message: 'Microphone access is required for audio. Allow microphone access in your browser settings and try again.',
            });
          } else {
            setPermError({
              type: 'unknown',
              message: 'Camera and microphone permissions are required. Please update your browser permissions to proceed.',
            });
          }
        } else {
          setPermError({
            type: 'unknown',
            message: 'Unable to access audio or video devices. Please check your hardware connection.',
          });
        }
      }
    }

    initPrejoinMedia();

    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
        previewStreamRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [step]);

  const handleMicChange = async (deviceId) => {
    setSelectedMic(deviceId);
    if (!previewStreamRef.current) return;
    try {
      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      const oldAudioTrack = previewStreamRef.current.getAudioTracks()[0];
      if (oldAudioTrack) oldAudioTrack.stop();
      previewStreamRef.current.removeTrack(oldAudioTrack);
      previewStreamRef.current.addTrack(newAudioStream.getAudioTracks()[0]);
    } catch (err) {
      console.warn('Mic switch error:', err);
    }
  };

  const handleCamChange = async (deviceId) => {
    setSelectedCam(deviceId);
    if (!previewStreamRef.current) return;
    try {
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      const oldVideoTrack = previewStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) oldVideoTrack.stop();
      previewStreamRef.current.removeTrack(oldVideoTrack);
      previewStreamRef.current.addTrack(newVideoStream.getVideoTracks()[0]);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = previewStreamRef.current;
      }
    } catch (err) {
      console.warn('Cam switch error:', err);
    }
  };

  const togglePrejoinMic = () => {
    if (previewStreamRef.current) {
      const track = previewStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setPrejoinMicOn(track.enabled);
      }
    }
  };

  const togglePrejoinCam = () => {
    if (previewStreamRef.current) {
      const track = previewStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setPrejoinCamOn(track.enabled);
      }
    }
  };

  const startMicTest = () => {
    if (!previewStreamRef.current || testingMic) return;
    try {
      setTestingMic(true);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(previewStreamRef.current);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkLevel);
      };
      checkLevel();

      setTimeout(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioCtx.state !== 'closed') audioCtx.close();
        setTestingMic(false);
        setMicLevel(0);
      }, 5000);
    } catch (err) {
      console.warn('Mic test failed:', err);
      setTestingMic(false);
    }
  };

  // 4. Join Daily Meeting
  const handleJoinMeeting = async () => {
    if (!tokenData || !tokenData.roomUrl) return;

    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }

    setStep('meeting');
    setCallState('joining');

    let finalRoomUrl = tokenData.roomUrl;
    const tokenStr = tokenData.token;
    if (tokenStr && !tokenStr.startsWith('token_mock_')) {
      finalRoomUrl = `${finalRoomUrl}?t=${tokenStr}`;
    }

    setTimeout(async () => {
      if (!dailyContainerRef.current) return;

      try {
        const frame = DailyIframe.createFrame(dailyContainerRef.current, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px',
            background: '#0d0d0d',
          },
        });
        dailyFrameRef.current = frame;

        // Daily Call Frame Event Listeners
        frame.on('joining-meeting', () => setCallState('joining'));
        frame.on('joined-meeting', (evt) => {
          setCallState('connected');
          const pCount = Object.keys(evt.participants || {}).length || 1;
          setParticipantCount(pCount);
        });
        frame.on('participant-joined', () => {
          const count = Object.keys(frame.participants() || {}).length;
          setParticipantCount(count);
        });
        frame.on('participant-left', () => {
          const count = Object.keys(frame.participants() || {}).length;
          setParticipantCount(count);
        });
        frame.on('reconnecting', () => setCallState('reconnecting'));
        frame.on('recording-started', () => setServerRecordingStatus('RECORDING'));
        frame.on('recording-stopped', () => setServerRecordingStatus('PROCESSING'));
        frame.on('error', (err) => {
          console.error('Daily SDK error:', err);
          setCallState('disconnected');
          setErrorMessage('Connection error occurred during session.');
        });

        await frame.join({
          url: finalRoomUrl,
          audioSource: selectedMic || true,
          videoSource: selectedCam || true,
        });

        if (!prejoinMicOn) {
          frame.setLocalAudio(false);
          setIsMuted(true);
        }
        if (!prejoinCamOn) {
          frame.setLocalVideo(false);
          setIsVideoOff(true);
        }
      } catch (err) {
        console.error('Failed to join Daily room:', err);
        setCallState('disconnected');
        setErrorMessage(err.message || 'Failed to join meeting room.');
      }
    }, 100);
  };

  const toggleMute = () => {
    if (!dailyFrameRef.current) return;
    const nextState = !isMuted;
    dailyFrameRef.current.setLocalAudio(!nextState);
    setIsMuted(nextState);
  };

  const toggleVideo = () => {
    if (!dailyFrameRef.current) return;
    const nextState = !isVideoOff;
    dailyFrameRef.current.setLocalVideo(!nextState);
    setIsVideoOff(nextState);
  };

  const toggleScreenShare = async () => {
    if (!dailyFrameRef.current) return;
    if (isSharingScreen) {
      dailyFrameRef.current.stopScreenShare();
      setIsSharingScreen(false);
    } else {
      try {
        await dailyFrameRef.current.startScreenShare();
        setIsSharingScreen(true);
      } catch (err) {
        console.warn('Screen share error:', err);
      }
    }
  };

  const handleLeaveMeeting = async () => {
    if (dailyFrameRef.current) {
      try {
        await dailyFrameRef.current.leave();
        await dailyFrameRef.current.destroy();
      } catch (err) {
        console.warn('Teardown warning:', err);
      }
      dailyFrameRef.current = null;
    }
    setStep('left');
    navigate(`/bookings/${bId}`);
  };

  const formatSessionTime = () => {
    if (!booking) return {};
    const start = new Date(booking.slotStart);
    const end = new Date(booking.slotEnd);
    const dateStr = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const startTimeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const durationMin = Math.round((end - start) / 60000);
    return { dateStr, startTimeStr, endTimeStr, durationMin };
  };

  const otherUser = booking
    ? (booking.host?._id === (user?._id || user?.id) ? booking.guest : booking.host)
    : null;

  // --------------------------------------------------------------------------
  // RENDER UI STATES
  // --------------------------------------------------------------------------

  if (step === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardCenterStyle}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6', marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f3f4f6' }}>Initializing Secure Studio…</h2>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>Verifying session authorization & generating meeting token</p>
        </div>
      </div>
    );
  }

  if (step === 'unauthorized') {
    return (
      <div style={containerStyle}>
        <div style={cardCenterStyle}>
          <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f3f4f6' }}>Access Denied</h2>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, maxWidth: 420 }}>
            You are not a participant in this meeting. Only authorized booking hosts and guests can enter the recording studio.
          </p>
          <button onClick={() => navigate('/bookings')} style={primaryBtnStyle}>
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  if (step === 'booking_status_error') {
    return (
      <div style={containerStyle}>
        <div style={cardCenterStyle}>
          <Info size={40} style={{ color: '#3b82f6', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f3f4f6' }}>Session Notice</h2>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, maxWidth: 440, lineHeight: 1.5 }}>
            {statusMessage}
          </p>
          <button onClick={() => navigate(`/bookings/${bId}`)} style={primaryBtnStyle}>
            Return to Booking Details
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={containerStyle}>
        <div style={cardCenterStyle}>
          <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f3f4f6' }}>Studio Error</h2>
          <p style={{ fontSize: 14, color: '#ef4444', marginTop: 8 }}>{errorMessage}</p>
          <button onClick={() => window.location.reload()} style={primaryBtnStyle}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (step === 'prejoin') {
    const { dateStr, startTimeStr, endTimeStr, durationMin } = formatSessionTime();

    return (
      <div style={containerStyle}>
        <div style={prejoinWrapperStyle}>

          {/* Session Overview Bar */}
          <div style={headerCardStyle}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#a78bfa' }}>
                CastReach Studio
              </span>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '4px 0' }}>
                Session with {otherUser?.name || 'Participant'}
              </h1>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: '#9ca3af', marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> {dateStr}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> {startTimeStr} – {endTimeStr} ({durationMin} min)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                  <ShieldCheck size={14} /> Encrypted & Secured
                </span>
              </div>
            </div>
          </div>

          {/* Main Grid: Video Preview & Controls */}
          <div style={prejoinGridStyle}>

            {/* Left: Video Preview */}
            <div style={previewBoxStyle}>
              {prejoinCamOn ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, transform: 'scaleX(-1)' }}
                />
              ) : (
                <div style={videoOffPlaceholderStyle}>
                  <VideoOff size={48} style={{ color: '#6b7280', marginBottom: 12 }} />
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Camera is turned off</p>
                </div>
              )}

              <div style={previewOverlayControlsStyle}>
                <button
                  type="button"
                  onClick={togglePrejoinMic}
                  aria-label={prejoinMicOn ? 'Mute microphone' : 'Unmute microphone'}
                  style={{ ...circleIconBtnStyle, background: prejoinMicOn ? 'rgba(31,41,55,0.85)' : '#ef4444' }}
                >
                  {prejoinMicOn ? <Mic size={18} color="#fff" /> : <MicOff size={18} color="#fff" />}
                </button>
                <button
                  type="button"
                  onClick={togglePrejoinCam}
                  aria-label={prejoinCamOn ? 'Turn camera off' : 'Turn camera on'}
                  style={{ ...circleIconBtnStyle, background: prejoinCamOn ? 'rgba(31,41,55,0.85)' : '#ef4444' }}
                >
                  {prejoinCamOn ? <VideoIcon size={18} color="#fff" /> : <VideoOff size={18} color="#fff" />}
                </button>
              </div>
            </div>

            {/* Right: Device Setup & Join */}
            <div style={prejoinFormStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f3f4f6', marginBottom: 16 }}>
                Audio & Video Setup
              </h3>

              {permError && (
                <div style={permAlertStyle}>
                  <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.4 }}>
                    {permError.message}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Microphone</label>
                <select
                  value={selectedMic}
                  onChange={(e) => handleMicChange(e.target.value)}
                  style={selectStyle}
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                  {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Camera</label>
                <select
                  value={selectedCam}
                  onChange={(e) => handleCamChange(e.target.value)}
                  style={selectStyle}
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && <option value="">Default Camera</option>}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={startMicTest}
                  disabled={testingMic}
                  style={secondaryBtnStyle}
                >
                  <Volume2 size={16} />
                  {testingMic ? 'Testing Mic…' : 'Test Microphone'}
                </button>
                {testingMic && (
                  <div style={{ marginTop: 8, height: 6, background: '#374151', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${micLevel}%`, background: '#10b981', transition: 'width 0.1s ease' }} />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleJoinMeeting}
                style={{ ...primaryBtnStyle, width: '100%', padding: '14px', fontSize: 16 }}
              >
                Join Studio Session
              </button>

              <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 12 }}>
                Cloud recording starts automatically. Escrow funds remain safely held.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Live Meeting Interface
  return (
    <div style={meetingContainerStyle}>

      {/* Top Header Navigation & Recording Status Bar */}
      <header style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '.5px' }}>
            CASTREACH
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>
              Session with {otherUser?.name || 'Participant'}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{participantCount} Participant{participantCount > 1 ? 's' : ''}</span>
              <span>•</span>
              <span style={{ color: '#6b7280' }}>Studio Room</span>
            </div>
          </div>
        </div>

        {/* Status Badges & Verified Recording Lifecycle Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {callState === 'joining' && (
            <span style={badgeWarningStyle}>Connecting…</span>
          )}
          {callState === 'reconnecting' && (
            <span style={badgeWarningStyle}>Reconnecting…</span>
          )}
          {callState === 'connected' && (
            <span style={badgeSuccessStyle}>● Connected</span>
          )}

          {/* Verified C2 Recording Indicator */}
          {serverRecordingStatus === 'RECORDING' && (
            <div style={recordingActiveBadgeStyle}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>● Recording</span>
            </div>
          )}

          {serverRecordingStatus === 'PROCESSING' && (
            <div style={recordingStatusBadgeStyle}>
              <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>⏳ Processing Recording…</span>
            </div>
          )}

          {serverRecordingStatus === 'READY' && (
            <div style={recordingStatusBadgeStyle}>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Recording Saved</span>
            </div>
          )}

          {serverRecordingStatus === 'FAILED' && (
            <div style={recordingStatusBadgeStyle}>
              <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>⚠️ Recording Failed</span>
            </div>
          )}

          {(serverRecordingStatus === 'NOT_STARTED' || !serverRecordingStatus) && (
            <div style={recordingStatusBadgeStyle}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6b7280' }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>Studio Ready</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Video Viewport */}
      <main style={{ flex: 1, position: 'relative', width: '100%', overflow: 'hidden', padding: 12 }}>
        <div
          ref={dailyContainerRef}
          style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}
        />
        <LiveCaptionOverlay
          bookingId={bId}
          user={user}
          dailyFrame={dailyFrameRef.current}
        />
      </main>

      {/* Bottom Meeting Controls Bar */}
      <footer style={bottomBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            style={{ ...controlBtnStyle, background: isMuted ? '#ef4444' : '#374151' }}
          >
            {isMuted ? <MicOff size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
            <span style={controlLabelStyle}>{isMuted ? 'Unmuted' : 'Mute'}</span>
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
            style={{ ...controlBtnStyle, background: isVideoOff ? '#ef4444' : '#374151' }}
          >
            {isVideoOff ? <VideoOff size={20} color="#fff" /> : <VideoIcon size={20} color="#fff" />}
            <span style={controlLabelStyle}>{isVideoOff ? 'Cam Off' : 'Camera'}</span>
          </button>

          <button
            type="button"
            onClick={toggleScreenShare}
            aria-label={isSharingScreen ? 'Stop sharing screen' : 'Share screen'}
            style={{ ...controlBtnStyle, background: isSharingScreen ? '#a78bfa' : '#374151' }}
          >
            <Monitor size={20} color="#fff" />
            <span style={controlLabelStyle}>{isSharingScreen ? 'Sharing' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handleLeaveMeeting}
            aria-label="Leave meeting"
            style={{ ...controlBtnStyle, background: '#ef4444', padding: '10px 20px' }}
          >
            <PhoneOff size={20} color="#fff" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Leave Meeting</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

// --------------------------------------------------------------------------
// INLINE STYLES
// --------------------------------------------------------------------------

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#09090b',
  color: '#f3f4f6',
  padding: '20px',
};

const cardCenterStyle = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 16,
  padding: '36px',
  textAlign: 'center',
  maxWidth: 480,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const prejoinWrapperStyle = {
  maxWidth: 960,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const headerCardStyle = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 16,
  padding: '20px 24px',
};

const prejoinGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 20,
};

const previewBoxStyle = {
  position: 'relative',
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 16,
  height: 340,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const videoOffPlaceholderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const previewOverlayControlsStyle = {
  position: 'absolute',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 12,
};

const circleIconBtnStyle = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 0.15s ease',
};

const prejoinFormStyle = {
  background: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 16,
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#9ca3af',
  marginBottom: 6,
};

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  background: '#09090b',
  border: '1px solid #3f3f46',
  color: '#f3f4f6',
  fontSize: 13,
  outline: 'none',
};

const permAlertStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  background: '#450a0a',
  border: '1px solid #7f1d1d',
  borderRadius: 8,
  padding: 12,
  marginBottom: 16,
};

const primaryBtnStyle = {
  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
  color: '#ffffff',
  border: 'none',
  borderRadius: 10,
  padding: '12px 20px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  marginTop: 16,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const secondaryBtnStyle = {
  background: '#27272a',
  color: '#e4e4e7',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const meetingContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  width: '100vw',
  background: '#09090b',
  color: '#f3f4f6',
  overflow: 'hidden',
};

const topBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  background: '#18181b',
  borderBottom: '1px solid #27272a',
  flexShrink: 0,
};

const badgeSuccessStyle = {
  padding: '4px 10px',
  borderRadius: 12,
  background: 'rgba(16,185,129,0.15)',
  color: '#10b981',
  fontSize: 12,
  fontWeight: 600,
};

const badgeWarningStyle = {
  padding: '4px 10px',
  borderRadius: 12,
  background: 'rgba(245,158,11,0.15)',
  color: '#f59e0b',
  fontSize: 12,
  fontWeight: 600,
};

const recordingStatusBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 12px',
  borderRadius: 12,
  background: '#27272a',
  border: '1px solid #3f3f46',
};

const recordingActiveBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 12px',
  borderRadius: 12,
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
};

const bottomBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '14px 20px',
  background: '#18181b',
  borderTop: '1px solid #27272a',
  flexShrink: 0,
};

const controlBtnStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: 'none',
  borderRadius: 10,
  padding: '8px 16px',
  cursor: 'pointer',
  minWidth: 64,
  transition: 'background 0.2s ease',
};

const controlLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: '#d4d4d8',
};
