import { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Disc, 
  Download, 
  ExternalLink, 
  Monitor, 
  CheckCircle2, 
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react';

export default function GoogleMeetStudioWidget() {
  const [meetUrl, setMeetUrl] = useState('https://meet.google.com/new');
  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSource, setRecordingSource] = useState('camera'); // 'camera' or 'screen'
  const [recordedBlobUrl, setRecordedBlobUrl] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Stop tracks on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // 1. Start Local Camera Stream
  const startCamera = async () => {
    setErrorMsg('');
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setRecordingSource('camera');
      setMicMuted(false);
      setVideoDisabled(false);
    } catch (err) {
      console.error('Camera error:', err);
      setErrorMsg('Unable to access camera & microphone. Please check browser permissions.');
    }
  };

  // 2. Start Screen/Tab Capture (Ideal for capturing active Google Meet tab)
  const startScreenCapture = async () => {
    setErrorMsg('');
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setRecordingSource('screen');

      // Auto stop if user clicks browser's native "Stop sharing"
      stream.getVideoTracks()[0].onended = () => {
        if (isRecording) {
          stopRecording();
        }
        stopStream();
      };
    } catch (err) {
      console.error('Screen capture error:', err);
      setErrorMsg('Screen share cancelled or not supported.');
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video Track
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  // 3. Start Recording
  const startRecording = async () => {
    setErrorMsg('');
    if (!streamRef.current) {
      // Auto-start camera if no stream is currently active
      await startCamera();
      if (!streamRef.current) return;
    }

    try {
      recordedChunksRef.current = [];
      const stream = streamRef.current;

      // Select supported mimeType
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/mp4';
          }
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
      };

      recorder.start(1000); // 1-second chunks for reliability
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording start error:', err);
      setErrorMsg('Failed to initialize video recording.');
    }
  };

  // 4. Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        background: '#13141a',
        border: '1px solid #1f2129',
        borderRadius: 20,
        padding: '18px 20px',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Header bar: Google Meet Title & Live REC status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Video size={14} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Google Meet Studio
            </span>
            <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 6 }}>
              • Virtual Call & HD Video Recorder
            </span>
          </div>
        </div>

        {isRecording && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulse 1s infinite',
              }}
            />
            REC {formatTimer(recordingDuration)}
          </div>
        )}
      </div>

      {/* Video Viewport / Capture Area */}
      <div
        style={{
          width: '100%',
          height: 160,
          background: '#090a0d',
          borderRadius: 14,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #1c1d24',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraActive ? 'block' : 'none',
          }}
        />

        {!cameraActive && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
              }}
            >
              <Video size={18} color="#60a5fa" />
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 10px' }}>
              Camera & Screen Recorder Standby
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Turn On Camera
              </button>
              <button
                type="button"
                onClick={startScreenCapture}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#d1d5db',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                title="Select your Google Meet tab to record both parties"
              >
                <Monitor size={12} /> Record Meet Tab
              </button>
            </div>
          </div>
        )}

        {/* Floating controls on video stream */}
        {cameraActive && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              padding: '4px 10px',
              borderRadius: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={toggleMute}
                style={{
                  background: micMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
                title={micMuted ? 'Unmute' : 'Mute'}
              >
                {micMuted ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
              <button
                type="button"
                onClick={toggleVideo}
                style={{
                  background: videoDisabled ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
                title={videoDisabled ? 'Enable Video' : 'Disable Video'}
              >
                {videoDisabled ? <VideoOff size={13} /> : <Video size={13} />}
              </button>
            </div>

            <button
              type="button"
              onClick={stopStream}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Close Feed
            </button>
          </div>
        )}
      </div>

      {/* Google Meet Link Input & Quick Join */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={meetUrl}
          onChange={(e) => setMeetUrl(e.target.value)}
          placeholder="https://meet.google.com/..."
          style={{
            flex: 1,
            background: '#1a1b22',
            border: '1px solid #262832',
            borderRadius: 10,
            padding: '7px 12px',
            fontSize: 12,
            color: '#fff',
            outline: 'none',
          }}
        />
        <a
          href={meetUrl || 'https://meet.google.com/new'}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#2563eb',
            color: '#fff',
            borderRadius: 10,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          <ExternalLink size={13} /> Open Meet
        </a>
      </div>

      {/* Recording Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            style={{
              flex: 1,
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
            }}
          >
            <Disc size={15} /> Start Recording Meet
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            style={{
              flex: 1,
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 12px rgba(220, 38, 38, 0.45)',
            }}
          >
            <Disc size={15} /> Stop & Save Video
          </button>
        )}

        {recordedBlobUrl && (
          <a
            href={recordedBlobUrl}
            download={`castreach-meet-recording-${Date.now()}.webm`}
            style={{
              background: '#DDAFE8',
              color: '#2D1233',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
            title="Download recorded Google Meet video"
          >
            <Download size={14} /> Download
          </a>
        )}
      </div>

      {/* Success Download Notice when recorded */}
      {recordedBlobUrl && !isRecording && (
        <div
          style={{
            background: 'rgba(120, 70, 127, 0.1)',
            border: '1px solid rgba(120, 70, 127, 0.25)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 11,
            color: '#DDAFE8',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CheckCircle2 size={13} />
          <span>Recording ready! Click Download to save video locally.</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> {errorMsg}
        </div>
      )}
    </div>
  );
}
