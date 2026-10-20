import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { realtime } from '../services/realtime';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  PhoneOff,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Users
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

  // Pre-join devices & permissions
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const [prejoinMicOn, setPrejoinMicOn] = useState(true);
  const [prejoinCamOn, setPrejoinCamOn] = useState(true);
  const [permError, setPermError] = useState(null);
  const [usingVirtualMedia, setUsingVirtualMedia] = useState(false);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);

  // Meeting states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [bgBlur, setBgBlur] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasRemotePeer, setHasRemotePeer] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [incomingEndRequest, setIncomingEndRequest] = useState(null);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting | live | disconnected

  // Refs
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const isNegotiatingRef = useRef(false);
  const pcRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const localAnalyserRef = useRef(null);
  const remoteAnalyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const recordingCanvasRef = useRef(null);
  const compositorLoopRef = useRef(null);
  const mixerAudioCtxRef = useRef(null);
  const mixerDestRef = useRef(null);
  const remoteAudioSourceRef = useRef(null);

  // Helper to draw video onto composite recording canvas with cover aspect ratio
  const drawVideoCover = (ctx, video, dx, dy, dWidth, dHeight) => {
    if (!video || video.readyState < 2 || !video.videoWidth) {
      return false;
    }
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = dWidth / dHeight;
    const videoRatio = vw / vh;
    let sx, sy, sWidth, sHeight;

    if (videoRatio > targetRatio) {
      sHeight = vh;
      sWidth = vh * targetRatio;
      sx = (vw - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = vw;
      sHeight = vw / targetRatio;
      sx = 0;
      sy = (vh - sHeight) / 2;
    }

    try {
      ctx.drawImage(video, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Session timer
  useEffect(() => {
    if (step !== 'meeting') return;
    const timer = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 1. Initial Booking Load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setStep('loading');
        setErrorMessage('');

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
        if (!isMounted) return;
        setBooking(b);

        if (b.status === 'cancelled') {
          setStatusMessage('This booking session has been cancelled.');
          setStep('booking_status_error');
          return;
        }

        setStep('prejoin');
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'An error occurred loading the studio.');
          setStep('error');
        }
      }
    })();

    return () => { isMounted = false; };
  }, [bId]);

  // ── High-Fidelity Virtual Media Generator (Hardware-in-Use / Localhost Fallback) ──
  const createVirtualVideoTrack = (userName = 'Participant') => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      const initials = (userName || 'Me').slice(0, 2).toUpperCase();

      let angle = 0;
      const draw = () => {
        angle += 0.04;
        ctx.fillStyle = '#0D0C12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Glowing radial ambient aura
        const grad = ctx.createRadialGradient(640, 360, 50, 640, 360, 420);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.2)');
        grad.addColorStop(1, 'rgba(13, 12, 18, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pulsating glowing circle
        const pulseRadius = 105 + Math.sin(angle) * 7;
        ctx.beginPath();
        ctx.arc(640, 320, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#A855F7';
        ctx.stroke();

        // Secondary outer pulse ring
        const outerRadius = pulseRadius + 22 + Math.cos(angle * 0.8) * 5;
        ctx.beginPath();
        ctx.arc(640, 320, outerRadius, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.stroke();

        // Avatar Core Circle
        ctx.beginPath();
        ctx.arc(640, 320, 85, 0, Math.PI * 2);
        ctx.fillStyle = '#1A1726';
        ctx.fill();

        // Initials Text
        ctx.font = 'bold 50px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, 640, 320);

        // Participant Name
        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(userName, 640, 455);

        // Status pill
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#22C55E';
        ctx.fillText('● Studio Live Feed (Virtual Camera)', 640, 488);
      };

      const timer = setInterval(draw, 50); // 20 FPS
      draw();

      const stream = canvas.captureStream(25);
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => clearInterval(timer));
      }
      return track;
    } catch (e) {
      console.warn('Virtual video track creation failed:', e);
      return null;
    }
  };

  const createVirtualAudioTrack = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioCtx();
      const dest = actx.createMediaStreamDestination();
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.00001; // barely audible carrier tone for WebRTC packetization
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      return dest.stream.getAudioTracks()[0];
    } catch (e) {
      console.warn('Virtual audio track creation failed:', e);
      return null;
    }
  };

  const acquireStudioMedia = async ({ preferredCamId, preferredMicId, userName = 'Participant' }) => {
    // 1. Try real video + real audio
    try {
      const constraints = {
        video: preferredCamId ? { deviceId: { ideal: preferredCamId } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: preferredMicId ? { deviceId: { ideal: preferredMicId } } : true,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      return { stream: s, isSimulatedVideo: false, isSimulatedAudio: false };
    } catch (errCombined) {
      console.warn('[Studio] Combined getUserMedia failed:', errCombined.name, errCombined.message);
    }

    // 2. Try real audio only, with virtual video track (handles single-webcam lock on Windows localhost)
    let audioTrack = null;
    let isSimulatedAudio = false;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: preferredMicId ? { deviceId: { ideal: preferredMicId } } : true,
      });
      audioTrack = audioStream.getAudioTracks()[0];
    } catch (errAudio) {
      console.warn('[Studio] Microphone unavailable, generating virtual studio audio:', errAudio.message);
      audioTrack = createVirtualAudioTrack();
      isSimulatedAudio = true;
    }

    // 3. Try separate video, or virtual video track if hardware is locked
    let videoTrack = null;
    let isSimulatedVideo = false;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: preferredCamId ? { deviceId: { ideal: preferredCamId } } : true,
      });
      videoTrack = videoStream.getVideoTracks()[0];
    } catch (errVideo) {
      console.warn('[Studio] Webcam busy or unavailable. Activating virtual studio video feed.');
      videoTrack = createVirtualVideoTrack(userName);
      isSimulatedVideo = true;
    }

    const stream = new MediaStream();
    if (videoTrack) stream.addTrack(videoTrack);
    if (audioTrack) stream.addTrack(audioTrack);

    return { stream, isSimulatedVideo, isSimulatedAudio };
  };

  // 2. Prejoin Media Initialization
  useEffect(() => {
    if (step !== 'prejoin') return;

    async function initMedia() {
      try {
        setPermError(null);
        const acquired = await acquireStudioMedia({
          preferredCamId: selectedCam,
          preferredMicId: selectedMic,
          userName: user?.name || user?.fullName || 'Participant',
        });

        localStreamRef.current = acquired.stream;
        setLocalStream(acquired.stream);
        setUsingVirtualMedia(acquired.isSimulatedVideo);

        // Setup Audio Analyser for Prejoin Mic Meter
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioCtx.createMediaStreamSource(acquired.stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          localAnalyserRef.current = { ctx: audioCtx, analyser };

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (localAnalyserRef.current?.analyser) {
              localAnalyserRef.current.analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              const avg = sum / dataArray.length;
              setLocalAudioLevel(Math.min(100, Math.round(avg * 1.5)));
              animFrameRef.current = requestAnimationFrame(updateMeter);
            }
          };
          updateMeter();
        } catch (e) {
          console.warn('Audio meter init error:', e);
        }

        // Enumerate devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const mics = devices.filter((d) => d.kind === 'audioinput');
          const cams = devices.filter((d) => d.kind === 'videoinput');
          setAudioDevices(mics);
          setVideoDevices(cams);
          if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
          if (cams.length > 0 && !selectedCam) setSelectedCam(cams[0].deviceId);
        } catch (devErr) {
          console.warn('Device enumeration error:', devErr);
        }
      } catch (err) {
        console.warn('Media access error:', err);
        setPermError('Please allow camera and microphone access in your browser to use the studio.');
      }
    }

    initMedia();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [step]);

  // Helper: Safely add queued or live ICE candidate
  const processCandidate = async (pc, candidate) => {
    if (!pc) return;
    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('[WebRTC] addIceCandidate error:', e);
      }
    } else {
      iceCandidatesQueueRef.current.push(candidate);
    }
  };

  // Helper: Flush candidates queue
  const flushCandidatesQueue = async (pc) => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const c = iceCandidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn('[WebRTC] flush candidate error:', e);
      }
    }
  };

  // 3. Join Meeting & Start WebRTC Realtime
  const handleJoinMeeting = async () => {
    setStep('meeting');
    setConnectionStatus('connecting');

    // Ensure we have active stream
    let stream = localStreamRef.current;
    if (!stream || stream.getTracks().every((t) => t.readyState === 'ended')) {
      const acquired = await acquireStudioMedia({
        preferredCamId: selectedCam,
        preferredMicId: selectedMic,
        userName: user?.name || user?.fullName || 'Participant',
      });
      stream = acquired.stream;
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (acquired.isSimulatedVideo) setUsingVirtualMedia(true);
    } else {
      setLocalStream(stream);
    }

    // Apply prejoin mute / video off settings
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      if (audioTrack) audioTrack.enabled = prejoinMicOn;
      if (videoTrack) videoTrack.enabled = prejoinCamOn;
      setIsMuted(!prejoinMicOn);
      setIsVideoOff(!prejoinCamOn);
    }

    // Setup multi-party composite recording (records BOTH Host and Guest side-by-side with mixed audio)
    if (stream) {
      try {
        recordedChunksRef.current = [];

        // 1. Setup Audio Mixer
        let mixedAudioTrack = null;
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const mixerCtx = new AudioCtx();
          mixerAudioCtxRef.current = mixerCtx;
          const mixerDest = mixerCtx.createMediaStreamDestination();
          mixerDestRef.current = mixerDest;

          if (stream.getAudioTracks().length > 0) {
            const localSource = mixerCtx.createMediaStreamSource(stream);
            localSource.connect(mixerDest);
          }
          mixedAudioTrack = mixerDest.stream.getAudioTracks()[0] || null;
        } catch (mixerErr) {
          console.warn('[Studio] Audio mixer init error:', mixerErr);
        }

        // 2. Setup Composite 1280x720 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        recordingCanvasRef.current = canvas;
        const ctx = canvas.getContext('2d');

        const isHostUser = user?.role === 'host' || booking?.host?._id === (user?._id || user?.id);
        const hostName = (isHostUser ? user?.name : otherUser?.name) || 'Host';
        const guestName = (isHostUser ? otherUser?.name : user?.name) || 'Guest';

        const renderCompositeFrame = () => {
          // Clear background
          ctx.fillStyle = '#0D0C12';
          ctx.fillRect(0, 0, 1280, 720);

          // Left = Host, Right = Guest
          const hostVideo = isHostUser ? localVideoRef.current : remoteVideoRef.current;
          const guestVideo = isHostUser ? remoteVideoRef.current : localVideoRef.current;

          // ── LEFT PANE: HOST (0 to 640) ──
          const hostDrawn = drawVideoCover(ctx, hostVideo, 0, 0, 640, 720);
          if (!hostDrawn) {
            ctx.fillStyle = '#12101A';
            ctx.fillRect(0, 0, 640, 720);
            ctx.beginPath();
            ctx.arc(320, 320, 60, 0, Math.PI * 2);
            ctx.fillStyle = '#1E1B2E';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#A855F7';
            ctx.stroke();

            ctx.font = 'bold 36px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hostName.slice(0, 2).toUpperCase(), 320, 320);

            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#A39EA9';
            ctx.fillText(hostVideo ? 'Camera Off' : 'Connecting Host…', 320, 410);
          }

          // Host Name Badge
          ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(24, 656, 210, 36, 8);
            ctx.fill();
          } else {
            ctx.fillRect(24, 656, 210, 36);
          }
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#A855F7';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('HOST · ' + hostName, 38, 674);

          // ── RIGHT PANE: GUEST (640 to 1280) ──
          const guestDrawn = drawVideoCover(ctx, guestVideo, 640, 0, 640, 720);
          if (!guestDrawn) {
            ctx.fillStyle = '#10141A';
            ctx.fillRect(640, 0, 640, 720);
            ctx.beginPath();
            ctx.arc(960, 320, 60, 0, Math.PI * 2);
            ctx.fillStyle = '#172224';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#22C55E';
            ctx.stroke();

            ctx.font = 'bold 36px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(guestName.slice(0, 2).toUpperCase(), 960, 320);

            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#A39EA9';
            ctx.fillText(guestVideo ? 'Camera Off' : 'Waiting for Guest…', 960, 410);
          }

          // Guest Name Badge
          ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(664, 656, 210, 36, 8);
            ctx.fill();
          } else {
            ctx.fillRect(664, 656, 210, 36);
          }
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#22C55E';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('GUEST · ' + guestName, 678, 674);

          // Divider line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(640, 0);
          ctx.lineTo(640, 720);
          ctx.stroke();

          // Top Header Studio Brand & Rec Pill
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(24, 20, 200, 30, 6);
            ctx.fill();
          } else {
            ctx.fillRect(24, 20, 200, 30);
          }
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('CASTREACH STUDIO', 36, 35);

          // Top Right REC Indicator
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(1230, 35, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'right';
          ctx.fillText('REC', 1218, 35);

          compositorLoopRef.current = requestAnimationFrame(renderCompositeFrame);
        };

        compositorLoopRef.current = requestAnimationFrame(renderCompositeFrame);

        // 3. Build composite media stream from canvas + mixed audio
        let recordingStream = stream;
        try {
          const canvasStream = canvas.captureStream(30);
          const canvasVideoTrack = canvasStream.getVideoTracks()[0];
          const recTracks = [];
          if (canvasVideoTrack) recTracks.push(canvasVideoTrack);
          if (mixedAudioTrack) {
            recTracks.push(mixedAudioTrack);
          } else if (stream.getAudioTracks()[0]) {
            recTracks.push(stream.getAudioTracks()[0]);
          }
          if (recTracks.length > 0) {
            recordingStream = new MediaStream(recTracks);
          }
        } catch (capErr) {
          console.warn('[Studio] Canvas captureStream fallback:', capErr);
          recordingStream = stream;
        }

        const mimeOptions = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4'
        ];
        const supportedMime = mimeOptions.find((m) => {
          try {
            return MediaRecorder.isTypeSupported(m);
          } catch (e) {
            return false;
          }
        });
        const rec = supportedMime ? new MediaRecorder(recordingStream, { mimeType: supportedMime }) : new MediaRecorder(recordingStream);
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        rec.onerror = (e) => {
          console.warn('[Studio] MediaRecorder error event:', e);
        };
        rec.onstop = () => {
          console.log('[Studio] MediaRecorder stopped successfully');
        };
        rec.start(1000);
        mediaRecorderRef.current = rec;
      } catch (recErr) {
        console.warn('MediaRecorder error:', recErr);
      }
    }

    // Connect WebSocket & WebRTC
    const userAuthToken = localStorage.getItem('cr_token') || localStorage.getItem('token');
    if (!userAuthToken) return;

    realtime.connect(userAuthToken);
    realtime.subscribe(bId);

    // Create RTCPeerConnection with STUN & TURN
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turn:openrelay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelay',
          credential: 'openrelay'
        }
      ]
    });
    pcRef.current = pc;
    iceCandidatesQueueRef.current = [];

    // Add local tracks
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        realtime.send('webrtc:signal', {
          bookingId: bId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('live');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectionStatus('connecting');
      }
    };

    // Incoming remote track - persistent stream accumulation
    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      const existing = remoteStreamRef.current.getTracks().find((t) => t.kind === event.track.kind);
      if (existing) {
        remoteStreamRef.current.removeTrack(existing);
      }
      remoteStreamRef.current.addTrack(event.track);

      setRemoteStream(remoteStreamRef.current);
      setHasRemotePeer(true);
      setConnectionStatus('live');

      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
        remoteVideoRef.current.play().catch(() => {});
      }

      // Setup audio analyzer for remote participant
      if (event.track.kind === 'audio' && !remoteAnalyserRef.current) {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioCtx();
          const singleTrackStream = new MediaStream([event.track]);
          const src = audioCtx.createMediaStreamSource(singleTrackStream);
          const an = audioCtx.createAnalyser();
          an.fftSize = 64;
          src.connect(an);
          remoteAnalyserRef.current = { ctx: audioCtx, analyser: an };

          const remoteData = new Uint8Array(an.frequencyBinCount);
          const pollRemoteAudio = () => {
            if (remoteAnalyserRef.current?.analyser) {
              remoteAnalyserRef.current.analyser.getByteFrequencyData(remoteData);
              let sum = 0;
              for (let i = 0; i < remoteData.length; i++) sum += remoteData[i];
              setRemoteAudioLevel(Math.min(100, Math.round((sum / remoteData.length) * 1.5)));
              requestAnimationFrame(pollRemoteAudio);
            }
          };
          pollRemoteAudio();
        } catch (e) {
          console.warn('[WebRTC] Remote audio analyser error:', e);
        }
      }

      // Mix remote participant audio into composite recording
      if (event.track.kind === 'audio' && mixerAudioCtxRef.current && mixerDestRef.current) {
        try {
          const remoteMixStream = new MediaStream([event.track]);
          const remoteSource = mixerAudioCtxRef.current.createMediaStreamSource(remoteMixStream);
          remoteSource.connect(mixerDestRef.current);
          remoteAudioSourceRef.current = remoteSource;
          console.log('[Mixer] Remote participant audio mixed into composite recording stream');
        } catch (mixErr) {
          console.warn('[Mixer] Error connecting remote audio to mixer:', mixErr);
        }
      }
    };

    // Safe Offer/Answer signaling with negotiation lock
    const sendOffer = async () => {
      try {
        if (!pc || pc.signalingState !== 'stable' || isNegotiatingRef.current) return;
        isNegotiatingRef.current = true;
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        realtime.send('webrtc:signal', {
          bookingId: bId,
          signal: { sdp: pc.localDescription }
        });
      } catch (err) {
        console.warn('[WebRTC] Error creating offer:', err);
      } finally {
        isNegotiatingRef.current = false;
      }
    };

    // Handle inbound signals
    realtime.on('webrtc:signal', async (data) => {
      const myUserId = (user?._id || user?.id)?.toString();
      if (data.bookingId !== bId || data.senderId === myUserId) return;
      const { signal } = data;
      try {
        if (signal.sdp) {
          if (signal.sdp.type === 'offer') {
            if (pc.signalingState !== 'stable') {
              console.warn('[WebRTC] Glare/unstable offer received; rolling back');
              await Promise.all([
                pc.setLocalDescription({ type: 'rollback' }).catch(() => {}),
                pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
              ]);
            } else {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            }
            await flushCandidatesQueue(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            realtime.send('webrtc:signal', {
              bookingId: bId,
              signal: { sdp: pc.localDescription }
            });
          } else if (signal.sdp.type === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
              await flushCandidatesQueue(pc);
            }
          }
        } else if (signal.candidate) {
          await processCandidate(pc, signal.candidate);
        }
      } catch (err) {
        console.warn('[WebRTC] Signal handling error:', err);
      }
    });

    // When a peer joins
    realtime.on('webrtc:peer_join', async (data) => {
      const myUserId = (user?._id || user?.id)?.toString();
      if (data.bookingId !== bId || data.peerId === myUserId) return;
      setHasRemotePeer(true);
      const hostId = (booking?.host?._id || booking?.host)?.toString();
      const isHost = myUserId === hostId || user?.role === 'host';
      if (isHost) {
        setTimeout(sendOffer, 350);
      }
    });

    // When a peer leaves
    realtime.on('webrtc:peer_leave', (data) => {
      if (data.bookingId !== bId) return;
      setHasRemotePeer(false);
      setRemoteStream(null);
      remoteStreamRef.current = null;
      setConnectionStatus('connecting');
    });

    // Session end events
    realtime.on('session:end_requested', (data) => {
      if (data.bookingId !== bId || data.requestedBy === (user?._id || user?.id)) return;
      setIncomingEndRequest(data);
    });

    realtime.on('session:end_confirmed', () => {
      finishAndRedirect();
    });

    // Announce our presence in room once
    realtime.send('webrtc:join', { bookingId: bId });
  };

  // Synchronize local stream with localVideoRef DOM element whenever mounted
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, step]);

  // Synchronize remote stream whenever remoteVideoRef mounts or remoteStream arrives
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, hasRemotePeer, step]);

  // Controls
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    }
  };

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      // Revert to camera
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const camTrack = camStream.getVideoTracks()[0];
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = camStream;
        }
        localStreamRef.current = camStream;
        setIsSharingScreen(false);
      } catch (e) {
        console.warn('Revert screen share error:', e);
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => toggleScreenShare();
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsSharingScreen(true);
      } catch (err) {
        console.warn('Screen share error:', err);
      }
    }
  };

  // Finalize session and navigate back to dashboard with settlement
  const finishAndRedirect = async () => {
    setIsEndingSession(true);

    if (compositorLoopRef.current) {
      cancelAnimationFrame(compositorLoopRef.current);
      compositorLoopRef.current = null;
    }
    if (mixerAudioCtxRef.current && mixerAudioCtxRef.current.state !== 'closed') {
      mixerAudioCtxRef.current.close().catch(() => {});
    }

    // Stop recording and save to local storage
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        await new Promise((resolve) => {
          mediaRecorderRef.current.onstop = resolve;
          mediaRecorderRef.current.stop();
        });
      } catch (e) {}
    }

    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const blobUrl = URL.createObjectURL(blob);
      localStorage.setItem(`cr_recorded_video_${bId}`, blobUrl);
      localStorage.setItem('cr_last_recording', blobUrl);
      localStorage.setItem(`cr_duration_${bId}`, String(sessionSeconds));
      localStorage.setItem('cr_last_recording_duration', String(sessionSeconds));

      // Persist to backend server so recording is accessible for editing across all laptops
      try {
        await authFetch(`/recordings/${bId}/upload?duration=${sessionSeconds}`, {
          method: 'POST',
          headers: { 'Content-Type': 'video/webm' },
          body: blob,
        });
      } catch (uploadErr) {
        console.warn('Server recording upload error:', uploadErr);
      }
    }

    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }

    // Notify backend session completion
    await authFetch(`/recordings/${bId}/stop`, { method: 'POST' }).catch(() => {});

    // Navigate to clean in-dashboard settlement modal
    const isHost = user?.role === 'host' || booking?.host?._id === (user?._id || user?.id);
    const targetDashboard = isHost ? '/host' : '/guest';
    navigate(`${targetDashboard}?settle=${bId}`);
  };

  const handleEndSessionClick = () => {
    setShowEndModal(true);
  };

  const handleConfirmEnd = async () => {
    setShowEndModal(false);
    realtime.send('session:end_confirmed', { bookingId: bId });
    await finishAndRedirect();
  };

  // Render Loading / Error States
  if (step === 'loading') {
    return (
      <div style={fullScreenCenterStyle}>
        <RefreshCw size={36} color="var(--color-accent-purple, #A855F7)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, color: '#A39EA9', fontSize: 14 }}>Connecting to CastReach Studio…</p>
      </div>
    );
  }

  if (step === 'error' || step === 'booking_status_error') {
    return (
      <div style={fullScreenCenterStyle}>
        <div style={errorCardStyle}>
          <AlertTriangle size={36} color="#EF4444" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>Unable to Enter Studio</h2>
          <p style={{ fontSize: 14, color: '#A39EA9', marginBottom: 20 }}>{statusMessage || errorMessage}</p>
          <button
            onClick={() => navigate(user?.role === 'host' ? '/host' : '/guest')}
            style={primaryButtonStyle}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const otherUser = user?.role === 'host' ? booking?.guest : booking?.host;

  // 4. Prejoin Screen
  if (step === 'prejoin') {
    return (
      <div style={fullScreenPageStyle}>
        {/* Top Minimal Bar */}
        <div style={prejoinTopBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={logoIconStyle}>CR</div>
            <span style={{ fontSize: 15, fontWeight: 750, color: '#FFFFFF', letterSpacing: '-0.02em' }}>CastReach Studio</span>
          </div>
          <span style={secureBadgeStyle}>
            <ShieldCheck size={14} color="#22C55E" /> Encrypted P2P Audio &amp; Video
          </span>
        </div>

        {/* Center Container */}
        <div style={prejoinContentStyle}>
          <div style={prejoinGridStyle}>
            {/* Left: Video Preview */}
            <div style={previewBoxStyle}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: usingVirtualMedia ? 'none' : 'scaleX(-1)',
                  display: prejoinCamOn ? 'block' : 'none',
                }}
              />
              {usingVirtualMedia && (
                <div style={virtualMediaBadgeStyle}>
                  <Sparkles size={11} color="#A855F7" />
                  <span>Virtual Studio Feed Active</span>
                </div>
              )}
              {!prejoinCamOn && (
                <div style={cameraOffPlaceholderStyle}>
                  <VideoOff size={44} color="#6F6A76" />
                  <span style={{ fontSize: 13, color: '#A39EA9', marginTop: 10 }}>Camera Off</span>
                </div>
              )}

              {/* Floating Camera & Mic Quick Controls */}
              <div style={previewControlsOverlayStyle}>
                <button
                  type="button"
                  onClick={() => {
                    const next = !prejoinMicOn;
                    setPrejoinMicOn(next);
                    if (localStreamRef.current) {
                      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
                    }
                  }}
                  style={{
                    ...roundControlBtnStyle,
                    background: prejoinMicOn ? '#211E2D' : '#EF4444',
                  }}
                >
                  {prejoinMicOn ? <Mic size={18} color="#FFFFFF" /> : <MicOff size={18} color="#FFFFFF" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !prejoinCamOn;
                    setPrejoinCamOn(next);
                    if (localStreamRef.current) {
                      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
                    }
                  }}
                  style={{
                    ...roundControlBtnStyle,
                    background: prejoinCamOn ? '#211E2D' : '#EF4444',
                  }}
                >
                  {prejoinCamOn ? <VideoIcon size={18} color="#FFFFFF" /> : <VideoOff size={18} color="#FFFFFF" />}
                </button>
              </div>

              {/* Live Audio Input Level bar */}
              <div style={audioLevelBarStyle}>
                <div style={{ height: '100%', width: `${localAudioLevel}%`, background: '#22C55E', transition: 'width 0.1s linear' }} />
              </div>
            </div>

            {/* Right: Session Information & Join Button */}
            <div style={prejoinDetailsCardStyle}>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent-purple, #A855F7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Ready to Record
                </span>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF', marginTop: 4 }}>
                  Session with {otherUser?.name || 'Participant'}
                </h1>
                {booking?.topics?.length > 0 && (
                  <p style={{ fontSize: 13, color: '#A39EA9', marginTop: 4 }}>
                    Topic: {booking.topics.join(', ')}
                  </p>
                )}
              </div>

              {permError && (
                <div style={permErrorBoxStyle}>
                  <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#EF4444' }}>{permError}</span>
                </div>
              )}

              {/* Minimal Device Selectors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={deviceLabelStyle}>Microphone</label>
                  <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    style={selectInputStyle}
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Microphone'}</option>
                    ))}
                    {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                  </select>
                </div>

                <div>
                  <label style={deviceLabelStyle}>Camera</label>
                  <select
                    value={selectedCam}
                    onChange={(e) => setSelectedCam(e.target.value)}
                    style={selectInputStyle}
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Camera'}</option>
                    ))}
                    {videoDevices.length === 0 && <option value="">Default Camera</option>}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleJoinMeeting}
                style={joinStudioBtnStyle}
              >
                Join Studio Session
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, fontSize: 12, color: '#6F6A76' }}>
                <Clock size={13} />
                <span>Cloud &amp; local audio track recording starts on entry</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Clean, Minimal Live Meeting Interface
  return (
    <div style={meetingFullScreenStyle}>
      {/* Top Header Floating Glass Bar */}
      <header style={meetingHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={logoIconStyle}>CR</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
              {otherUser?.name || 'Studio Session'}
            </div>
            <div style={{ fontSize: 11, color: '#A39EA9' }}>
              {booking?.topics?.[0] || 'Podcast Recording'}
            </div>
          </div>
        </div>

        {/* Center Live Recording Timer */}
        <div style={recordingTimerPillStyle}>
          <div style={redPulseDotStyle} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>REC</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#A39EA9', marginLeft: 4 }}>
            {formatTimer(sessionSeconds)}
          </span>
        </div>

        {/* Right Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={connectionStatusPillStyle(connectionStatus)}>
            ● {connectionStatus === 'live' ? 'Live' : 'Connecting…'}
          </span>
          <span style={participantCountPillStyle}>
            <Users size={12} /> {hasRemotePeer ? 2 : 1}
          </span>
        </div>
      </header>

      {/* Main Video Viewport: Clean Minimal Responsive Split Screen */}
      <main style={mainVideoGridStyle(hasRemotePeer)}>
        {/* Remote Participant Tile */}
        <div style={videoTileContainerStyle}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 12,
              display: (hasRemotePeer && remoteStream) ? 'block' : 'none',
            }}
          />
          {(!hasRemotePeer || !remoteStream) && (
            <div style={waitingTileContainerStyle}>
              <div style={waitingAvatarCircleStyle}>
                {(otherUser?.name || 'P').slice(0, 2).toUpperCase()}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                Waiting for {otherUser?.name || 'Guest'} to connect
              </h3>
              <p style={{ fontSize: 12, color: '#A39EA9' }}>
                They will appear automatically as soon as they open the studio link
              </p>
            </div>
          )}

          {/* Remote Name & Audio Pill */}
          {(hasRemotePeer && remoteStream) && (
            <div style={participantBadgeOverlayStyle}>
              <div style={audioIndicatorDot(remoteAudioLevel > 15)} />
              <span>{otherUser?.name || 'Participant'}</span>
            </div>
          )}
        </div>

        {/* Local Participant Tile */}
        <div style={videoTileContainerStyle}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: (!usingVirtualMedia && !isSharingScreen) ? 'scaleX(-1)' : 'none',
              borderRadius: 12,
              filter: bgBlur ? 'blur(8px)' : 'none',
              display: isVideoOff ? 'none' : 'block',
            }}
          />
          {isVideoOff && (
            <div style={cameraOffTilePlaceholderStyle}>
              <div style={avatarCircleStyle}>
                {(user?.name || user?.fullName || 'Me').slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: '#A39EA9', marginTop: 8 }}>Camera Turned Off</span>
            </div>
          )}

          {/* Local Name & Audio Pill */}
          <div style={participantBadgeOverlayStyle}>
            <div style={audioIndicatorDot(localAudioLevel > 15 && !isMuted)} />
            <span>{user?.name || 'You'} ({user?.role === 'host' ? 'Host' : 'Guest'})</span>
            {isMuted && <MicOff size={11} color="#EF4444" style={{ marginLeft: 4 }} />}
          </div>
        </div>
      </main>

      {/* Floating Bottom Control Dock */}
      <footer style={floatingBottomDockContainerStyle}>
        <div style={dockCapsuleStyle}>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            style={dockButtonStyle(isMuted)}
          >
            {isMuted ? <MicOff size={18} color="#FFFFFF" /> : <Mic size={18} color="#FFFFFF" />}
            <span style={dockButtonLabelStyle}>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
            style={dockButtonStyle(isVideoOff)}
          >
            {isVideoOff ? <VideoOff size={18} color="#FFFFFF" /> : <VideoIcon size={18} color="#FFFFFF" />}
            <span style={dockButtonLabelStyle}>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>

          <button
            type="button"
            onClick={toggleScreenShare}
            aria-label={isSharingScreen ? 'Stop screen sharing' : 'Share screen'}
            style={dockButtonStyle(false, isSharingScreen)}
          >
            <Monitor size={18} color={isSharingScreen ? 'var(--color-accent-purple, #A855F7)' : '#FFFFFF'} />
            <span style={dockButtonLabelStyle}>{isSharingScreen ? 'Sharing' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={() => setBgBlur((b) => !b)}
            aria-label="Toggle background blur"
            style={dockButtonStyle(false, bgBlur)}
          >
            <Sparkles size={18} color={bgBlur ? 'var(--color-accent-purple, #A855F7)' : '#FFFFFF'} />
            <span style={dockButtonLabelStyle}>{bgBlur ? 'Blurred' : 'Blur BG'}</span>
          </button>

          <div style={{ width: 1, height: 28, background: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={handleEndSessionClick}
            aria-label="End session"
            style={endSessionBtnStyle}
          >
            <PhoneOff size={17} color="#FFFFFF" />
            <span>End Meeting</span>
          </button>
        </div>
      </footer>

      {/* Clean End Session Confirmation Modal */}
      {showEndModal && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={modalIconCircleStyle}>
              <PhoneOff size={24} color="#EF4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
              Wrap Up This Session?
            </h3>
            <p style={{ fontSize: 13, color: '#A39EA9', lineHeight: 1.5, marginBottom: 20 }}>
              The recording will be finalized and saved. You will be returned to your dashboard to review the recording and settle payment.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                style={secondaryModalBtnStyle}
              >
                Keep Talking
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                style={dangerModalBtnStyle}
              >
                End &amp; Settle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming End Request Modal */}
      {incomingEndRequest && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={modalIconCircleStyle}>
              <PhoneOff size={24} color="#A855F7" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>
              Session Wrap Requested
            </h3>
            <p style={{ fontSize: 13, color: '#A39EA9', lineHeight: 1.5, marginBottom: 20 }}>
              <strong>{otherUser?.name || 'The other participant'}</strong> has requested to end the recording session.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setIncomingEndRequest(null)}
                style={secondaryModalBtnStyle}
              >
                Decline
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                style={primaryModalBtnStyle}
              >
                Accept &amp; Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ending Loading Overlay */}
      {isEndingSession && (
        <div style={modalBackdropStyle}>
          <RefreshCw size={36} color="var(--color-accent-purple, #A855F7)" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>Finalizing Recording…</h3>
          <p style={{ fontSize: 13, color: '#A39EA9', marginTop: 4 }}>Saving recording to dashboard</p>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// SLEEK MINIMAL STYLES (PURE OBSIDIAN #0D0C12 + VIBRANT ACCENTS)
// -----------------------------------------------------------------------------

const fullScreenPageStyle = {
  minHeight: '100vh',
  backgroundColor: '#0D0C12',
  color: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const fullScreenCenterStyle = {
  minHeight: '100vh',
  backgroundColor: '#0D0C12',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const prejoinTopBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 28px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const logoIconStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'linear-gradient(135deg, #A855F7, #7E22CE)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 12,
  color: '#FFFFFF',
};

const secureBadgeStyle = {
  fontSize: 12,
  color: '#22C55E',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 600,
  background: 'rgba(34, 197, 94, 0.1)',
  padding: '4px 10px',
  borderRadius: 9999,
  border: '1px solid rgba(34, 197, 94, 0.2)',
};

const prejoinContentStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 20px',
};

const prejoinGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(320px, 480px) minmax(320px, 440px)',
  gap: 28,
  maxWidth: 960,
  width: '100%',
};

const previewBoxStyle = {
  position: 'relative',
  aspectRatio: '16/10',
  backgroundColor: '#181622',
  borderRadius: 14,
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const virtualMediaBadgeStyle = {
  position: 'absolute',
  top: 12,
  left: 12,
  backgroundColor: 'rgba(24, 22, 34, 0.88)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(168, 85, 247, 0.4)',
  padding: '5px 12px',
  borderRadius: 9999,
  fontSize: 11.5,
  fontWeight: 650,
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  zIndex: 10,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
};

const cameraOffPlaceholderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const previewControlsOverlayStyle = {
  position: 'absolute',
  bottom: 14,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 12,
};

const roundControlBtnStyle = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.15s ease',
};

const audioLevelBarStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: 3,
  background: 'rgba(255, 255, 255, 0.1)',
};

const prejoinDetailsCardStyle = {
  backgroundColor: '#181622',
  borderRadius: 14,
  border: '1px solid rgba(255, 255, 255, 0.09)',
  padding: '28px 24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const permErrorBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 8,
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  marginBottom: 16,
};

const deviceLabelStyle = {
  display: 'block',
  fontSize: 11.5,
  fontWeight: 700,
  color: '#A39EA9',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const selectInputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  backgroundColor: '#211E2D',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#FFFFFF',
  fontSize: 13,
  outline: 'none',
};

const joinStudioBtnStyle = {
  width: '100%',
  padding: '13px',
  borderRadius: 8,
  background: 'linear-gradient(135deg, #A855F7, #7E22CE)',
  border: 'none',
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 750,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, opacity 0.15s ease',
  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.25)',
};

const meetingFullScreenStyle = {
  height: '100vh',
  width: '100vw',
  backgroundColor: '#0D0C12',
  color: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
  fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const meetingHeaderStyle = {
  height: 56,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: 'rgba(13, 12, 18, 0.85)',
  backdropFilter: 'blur(12px)',
  zIndex: 10,
};

const recordingTimerPillStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(239, 68, 68, 0.12)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  padding: '4px 12px',
  borderRadius: 9999,
};

const redPulseDotStyle = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  backgroundColor: '#EF4444',
  boxShadow: '0 0 8px #EF4444',
};

const connectionStatusPillStyle = (status) => ({
  fontSize: 11,
  fontWeight: 650,
  padding: '3px 9px',
  borderRadius: 9999,
  background: status === 'live' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
  color: status === 'live' ? '#22C55E' : '#F59E0B',
  border: `1px solid ${status === 'live' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
});

const participantCountPillStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#A39EA9',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255, 255, 255, 0.05)',
  padding: '3px 8px',
  borderRadius: 6,
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const mainVideoGridStyle = (hasTwo) => ({
  flex: 1,
  display: 'grid',
  gridTemplateColumns: hasTwo ? '1fr 1fr' : '1fr',
  gap: 14,
  padding: 16,
  paddingBottom: 84, // Space for floating bottom dock
  height: 'calc(100vh - 56px)',
  overflow: 'hidden',
});

const videoTileContainerStyle = {
  position: 'relative',
  backgroundColor: '#181622',
  borderRadius: 14,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const waitingTileContainerStyle = {
  backgroundColor: '#181622',
  borderRadius: 14,
  border: '1px dashed rgba(255, 255, 255, 0.12)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 24,
};

const waitingAvatarCircleStyle = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #211E2D, #292537)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  fontWeight: 750,
  color: '#FFFFFF',
  marginBottom: 14,
};

const avatarCircleStyle = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: '#211E2D',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  fontWeight: 700,
  color: '#FFFFFF',
};

const cameraOffTilePlaceholderStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const participantBadgeOverlayStyle = {
  position: 'absolute',
  bottom: 12,
  left: 12,
  background: 'rgba(13, 12, 18, 0.8)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '5px 10px',
  borderRadius: 6,
  fontSize: 11.5,
  fontWeight: 650,
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const audioIndicatorDot = (speaking) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: speaking ? '#22C55E' : '#6F6A76',
  boxShadow: speaking ? '0 0 6px #22C55E' : 'none',
  transition: 'background-color 0.1s ease',
});

const floatingBottomDockContainerStyle = {
  position: 'absolute',
  bottom: 16,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 20,
};

const dockCapsuleStyle = {
  pointerEvents: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(24, 22, 34, 0.92)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  padding: '7px 12px',
  borderRadius: 9999,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
};

const dockButtonStyle = (isAlert, isActive) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  padding: '6px 12px',
  borderRadius: 8,
  border: 'none',
  background: isAlert ? '#EF4444' : isActive ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
  color: '#FFFFFF',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
});

const dockButtonLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: '#A39EA9',
};

const endSessionBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 9999,
  border: 'none',
  backgroundColor: '#EF4444',
  color: '#FFFFFF',
  fontSize: 12.5,
  fontWeight: 750,
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
};

const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
};

const modalCardStyle = {
  backgroundColor: '#181622',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 14,
  padding: '24px 28px',
  maxWidth: 400,
  width: '100%',
  textAlign: 'center',
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
};

const modalIconCircleStyle = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 12px',
};

const secondaryModalBtnStyle = {
  padding: '8px 16px',
  borderRadius: 8,
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const dangerModalBtnStyle = {
  padding: '8px 16px',
  borderRadius: 8,
  backgroundColor: '#EF4444',
  border: 'none',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const primaryModalBtnStyle = {
  padding: '8px 16px',
  borderRadius: 8,
  backgroundColor: '#22C55E',
  border: 'none',
  color: '#000000',
  fontSize: 13,
  fontWeight: 750,
  cursor: 'pointer',
};

const primaryButtonStyle = {
  padding: '10px 20px',
  borderRadius: 8,
  backgroundColor: '#22C55E',
  border: 'none',
  color: '#000000',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const errorCardStyle = {
  backgroundColor: '#181622',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 14,
  padding: '32px 28px',
  maxWidth: 420,
  width: '100%',
  textAlign: 'center',
};
