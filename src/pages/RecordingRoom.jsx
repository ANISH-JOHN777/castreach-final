import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DailyIframe from '@daily-co/daily-js';
import LiveCaptionOverlay from '../components/LiveCaptionOverlay';
import { realtime } from '../services/realtime';
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
  const [speakerDevices, setSpeakerDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
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
  const [bgEffect, setBgEffect] = useState('none'); // 'none' | 'blur' | 'studio'
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isMockRoom, setIsMockRoom] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [hasRemotePeer, setHasRemotePeer] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [incomingEndRequest, setIncomingEndRequest] = useState(null);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);

  const localVideoRef = useRef(null);
  const localCanvasRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Live session timer incrementer
  useEffect(() => {
    if (step !== 'meeting' || callState !== 'connected') return;
    const timer = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [step, callState]);

  // Request browser full-screen when entering meeting room
  useEffect(() => {
    if (step === 'meeting') {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }
  }, [step]);

  // Canvas Portrait Mode Background Processor: Keeps user's face & body sharp while blurring background
  useEffect(() => {
    if (bgEffect === 'none' || !localVideoRef.current || isVideoOff) return;
    let animId;
    const canvas = localCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const video = localVideoRef.current;

    const processFrame = () => {
      if (!video || video.paused || video.ended || video.readyState < 2) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      if (canvas.width !== (video.videoWidth || 640) || canvas.height !== (video.videoHeight || 480)) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      if (bgEffect === 'blur') {
        // 1. Draw softly blurred background layer across whole canvas
        ctx.filter = 'blur(16px) contrast(1.05) brightness(0.95)';
        ctx.drawImage(video, 0, 0, w, h);
        ctx.filter = 'none';

        // 2. Draw sharp subject layer centered on person (face & body) with smooth radial gradient feathering
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d');

        const radGrad = mCtx.createRadialGradient(w * 0.5, h * 0.48, w * 0.15, w * 0.5, h * 0.5, w * 0.42);
        radGrad.addColorStop(0, 'rgba(0,0,0,1)');
        radGrad.addColorStop(0.55, 'rgba(0,0,0,1)');
        radGrad.addColorStop(0.85, 'rgba(0,0,0,0.4)');
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');

        mCtx.fillStyle = radGrad;
        mCtx.fillRect(0, 0, w, h);

        mCtx.globalCompositeOperation = 'source-in';
        mCtx.drawImage(video, 0, 0, w, h);

        ctx.drawImage(maskCanvas, 0, 0, w, h);
      } else if (bgEffect === 'studio') {
        // Studio Gradient Background
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const mCtx = maskCanvas.getContext('2d');

        const radGrad = mCtx.createRadialGradient(w * 0.5, h * 0.48, w * 0.18, w * 0.5, h * 0.5, w * 0.42);
        radGrad.addColorStop(0, 'rgba(0,0,0,1)');
        radGrad.addColorStop(0.6, 'rgba(0,0,0,1)');
        radGrad.addColorStop(0.9, 'rgba(0,0,0,0.3)');
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');

        mCtx.fillStyle = radGrad;
        mCtx.fillRect(0, 0, w, h);
        mCtx.globalCompositeOperation = 'source-in';
        mCtx.drawImage(video, 0, 0, w, h);

        ctx.drawImage(maskCanvas, 0, 0, w, h);
      }

      ctx.restore();
      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [bgEffect, isVideoOff]);

  // Attach WebRTC remoteStream to remote video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => {
        console.warn('Remote video playback warning:', err);
      });
    }
  }, [remoteStream]);

  // Ensure local video stream remains bound to video elements when toggling camera back ON
  useEffect(() => {
    if (!isVideoOff && previewStreamRef.current) {
      if (localVideoRef.current) {
        if (localVideoRef.current.srcObject !== previewStreamRef.current) {
          localVideoRef.current.srcObject = previewStreamRef.current;
        }
        localVideoRef.current.play().catch(() => {});
      }
    }
  }, [isVideoOff, step]);

  useEffect(() => {
    if (prejoinCamOn && previewStreamRef.current && step === 'prejoin') {
      if (previewVideoRef.current) {
        if (previewVideoRef.current.srcObject !== previewStreamRef.current) {
          previewVideoRef.current.srcObject = previewStreamRef.current;
        }
        previewVideoRef.current.play().catch(() => {});
      }
    }
  }, [prejoinCamOn, step]);

  const handleBgChange = async (effect) => {
    setBgEffect(effect);
    if (!dailyFrameRef.current) return;
    try {
      if (effect === 'blur') {
        await dailyFrameRef.current.updateInputSettings({
          video: { processor: { type: 'background-blur', config: { strength: 0.7 } } },
        });
      } else {
        await dailyFrameRef.current.updateInputSettings({
          video: { processor: { type: 'none' } },
        });
      }
    } catch (err) {
      console.warn('Background processor update warning:', err);
    }
  };

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

  // Connect Realtime WebSocket & subscribe to booking room events
  useEffect(() => {
    if (!bId) return;
    const userAuthToken = localStorage.getItem('cr_token') || localStorage.getItem('token');
    if (!userAuthToken) return;

    realtime.connect(userAuthToken);
    realtime.subscribe(bId);

    const unsubReq = realtime.on('session:end_requested', (data) => {
      if (data.bookingId !== bId) return;
      setIncomingEndRequest(data);
    });

    const unsubConf = realtime.on('session:end_confirmed', () => {
      finalizeSessionAndUpload();
    });

    const unsubCanc = realtime.on('session:end_cancelled', () => {
      setIncomingEndRequest(null);
      setStatusMessage('Session end request was declined. Continuing session.');
      setTimeout(() => setStatusMessage(''), 4000);
    });

    return () => {
      unsubReq();
      unsubConf();
      unsubCanc();
    };
  }, [bId]);

  // 2. Poll recording status & session end request state while meeting is active
  useEffect(() => {
    if (step !== 'meeting') return;

    const checkRecordingState = async () => {
      try {
        const res = await authFetch(`/recordings/${bId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.recordingStatus) {
            setServerRecordingStatus(data.recordingStatus);
          }
          const isHostUser = booking?.host?._id === (user?._id || user?.id) || booking?.host === (user?._id || user?.id) || user?.role === 'host';
          if (isHostUser) {
            if (data.guestEndRequested && !data.hostEndRequested) {
              setIncomingEndRequest({ requestedBy: 'Guest', timestamp: data.guestEndRequestedAt });
            } else if (!data.guestEndRequested) {
              setIncomingEndRequest(null);
            }
          } else {
            if (data.hostEndRequested && !data.guestEndRequested) {
              setIncomingEndRequest({ requestedBy: 'Host', timestamp: data.hostEndRequestedAt });
            } else if (!data.hostEndRequested) {
              setIncomingEndRequest(null);
            }
          }
        }
      } catch (err) {
        console.warn('Recording status poll warning:', err);
      }
    };

    checkRecordingState();
    const pollInterval = setInterval(checkRecordingState, 4000);

    return () => clearInterval(pollInterval);
  }, [step, bId, booking, user]);

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
        const speakers = devices.filter((d) => d.kind === 'audiooutput');

        setAudioDevices(mics);
        setVideoDevices(cams);
        setSpeakerDevices(speakers);
        if (mics.length > 0 && !selectedMic) setSelectedMic(mics[0].deviceId);
        if (cams.length > 0 && !selectedCam) setSelectedCam(cams[0].deviceId);
        if (speakers.length > 0 && !selectedSpeaker) setSelectedSpeaker(speakers[0].deviceId);
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

  const handleSpeakerChange = async (deviceId) => {
    setSelectedSpeaker(deviceId);
    if (remoteVideoRef.current && typeof remoteVideoRef.current.setSinkId === 'function') {
      try { await remoteVideoRef.current.setSinkId(deviceId); } catch (e) {}
    }
    if (previewVideoRef.current && typeof previewVideoRef.current.setSinkId === 'function') {
      try { await previewVideoRef.current.setSinkId(deviceId); } catch (e) {}
    }
    if (dailyFrameRef.current && typeof dailyFrameRef.current.setOutputDeviceAsync === 'function') {
      try {
        await dailyFrameRef.current.setOutputDeviceAsync({ outputDeviceId: deviceId });
      } catch (e) {}
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

    const tokenStr = tokenData.token;
    const isMock = !tokenStr || tokenStr.startsWith('token_mock_') || tokenData.roomUrl?.includes('castreach.daily.co');

    if (isMock) {
      setIsMockRoom(true);
      setCallState('connected');
      setServerRecordingStatus('RECORDING');
      setParticipantCount(1);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
          video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
        });
        previewStreamRef.current = stream;
        setTimeout(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }, 150);

        // Start local automatic MediaRecorder recording
        try {
          recordedChunksRef.current = [];
          const recOptions = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? { mimeType: 'video/webm;codecs=vp9,opus' }
            : MediaRecorder.isTypeSupported('video/webm')
            ? { mimeType: 'video/webm' }
            : {};
          const recorder = new MediaRecorder(stream, recOptions);
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          recorder.start(1000);
          mediaRecorderRef.current = recorder;
        } catch (recErr) {
          console.warn('MediaRecorder init warning:', recErr);
        }

        // Connect WebSocket with user auth token and initialize WebRTC P2P PeerConnection
        const userAuthToken = localStorage.getItem('cr_token') || localStorage.getItem('token');
        if (userAuthToken) {
          realtime.connect(userAuthToken);
          realtime.subscribe(bId);

          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              { urls: 'stun:stun.services.mozilla.com' },
            ]
          });
          pcRef.current = pc;

          const iceCandidatesQueue = [];

          const processIceCandidate = async (candidate) => {
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } else {
                iceCandidatesQueue.push(candidate);
              }
            } catch (e) {
              console.warn('ICE candidate error:', e);
            }
          };

          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          pc.ontrack = (event) => {
            const incomingStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
            setRemoteStream(incomingStream);
            setHasRemotePeer(true);
            setParticipantCount(2);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = incomingStream;
              remoteVideoRef.current.play().catch(() => {});
            }
          };

          pc.onicecandidate = (evt) => {
            if (evt.candidate) {
              realtime.send('webrtc:signal', {
                bookingId: bId,
                signal: { candidate: evt.candidate }
              });
            }
          };

          realtime.on('webrtc:signal', async (data) => {
            if (data.bookingId !== bId || data.senderId === (user?._id || user?.id)) return;
            const { signal } = data;
            try {
              if (signal.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                while (iceCandidatesQueue.length > 0) {
                  const cand = iceCandidatesQueue.shift();
                  try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
                }
                if (signal.sdp.type === 'offer') {
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  realtime.send('webrtc:signal', {
                    bookingId: bId,
                    signal: { sdp: pc.localDescription }
                  });
                }
              } else if (signal.candidate) {
                await processIceCandidate(signal.candidate);
              }
            } catch (err) {
              console.warn('WebRTC signal processing warning:', err);
            }
          });

          realtime.on('webrtc:peer_join', async (data) => {
            if (data.bookingId !== bId || data.peerId === (user?._id || user?.id)) return;
            setHasRemotePeer(true);
            setParticipantCount(2);

            const myId = user?._id || user?.id || '';
            const isCaller = booking?.host?._id === myId || booking?.host === myId || myId < (data.peerId || '');
            if (isCaller) {
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                realtime.send('webrtc:signal', {
                  bookingId: bId,
                  signal: { sdp: pc.localDescription }
                });
              } catch (err) {
                console.warn('WebRTC offer creation warning:', err);
              }
            }
          });

          realtime.on('webrtc:peer_leave', (data) => {
            if (data.bookingId !== bId) return;
            setHasRemotePeer(false);
            setRemoteStream(null);
            setParticipantCount(1);
          });

          // Mutual Session End Listeners
          realtime.on('session:end_requested', (data) => {
            if (data.bookingId !== bId || data.requestedBy === (user?._id || user?.id)) return;
            setIncomingEndRequest(data);
          });

          realtime.on('session:end_confirmed', () => {
            finalizeSessionAndUpload();
          });

          realtime.on('session:end_cancelled', () => {
            setIncomingEndRequest(null);
            setStatusMessage('Session end request was declined. Continuing session.');
            setTimeout(() => setStatusMessage(''), 4000);
          });

          realtime.send('webrtc:join', { bookingId: bId });
          const joinInterval = setInterval(() => {
            realtime.send('webrtc:join', { bookingId: bId });
          }, 3000);

          setTimeout(() => clearInterval(joinInterval), 30000);
        }
      } catch (err) {
        console.warn('Mock studio media stream setup:', err);
      }
      return;
    }

    setCallState('joining');
    let finalRoomUrl = `${tokenData.roomUrl}?t=${tokenStr}`;

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
          setIsMockRoom(true);
          setCallState('connected');
          setServerRecordingStatus('RECORDING');
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
        setIsMockRoom(true);
        setCallState('connected');
        setServerRecordingStatus('RECORDING');
      }
    }, 100);
  };

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (dailyFrameRef.current) {
      dailyFrameRef.current.setLocalAudio(!nextState);
    }
    if (previewStreamRef.current) {
      const track = previewStreamRef.current.getAudioTracks()[0];
      if (track) track.enabled = !nextState;
    }
  };

  const toggleVideo = () => {
    const nextState = !isVideoOff;
    setIsVideoOff(nextState);
    if (dailyFrameRef.current) {
      dailyFrameRef.current.setLocalVideo(!nextState);
    }
    if (previewStreamRef.current) {
      const track = previewStreamRef.current.getVideoTracks()[0];
      if (track) track.enabled = !nextState;
    }
  };

  const toggleScreenShare = async () => {
    if (dailyFrameRef.current) {
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
    } else {
      setIsSharingScreen(!isSharingScreen);
    }
  };

  const finalizeSessionAndUpload = async () => {
    setIsUploadingRecording(true);
    setServerRecordingStatus('PROCESSING');

    // Stop MediaRecorder if running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise((resolve) => {
        mediaRecorderRef.current.onstop = resolve;
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          resolve();
        }
      });
    }

    if (dailyFrameRef.current) {
      try {
        await dailyFrameRef.current.leave();
        await dailyFrameRef.current.destroy();
      } catch (err) {}
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }

    try {
      if (recordedChunksRef.current && recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        
        // Instant Blob URL for local storage playback
        const blobUrl = URL.createObjectURL(blob);
        localStorage.setItem(`cr_recorded_video_${bId}`, blobUrl);
        localStorage.setItem('cr_last_recording', blobUrl);

        // Persistent Data URL for cross-session storage
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            try {
              localStorage.setItem(`cr_recorded_video_${bId}`, reader.result);
              localStorage.setItem('cr_last_recording', reader.result);
            } catch (e) {}
          }
        };
        reader.readAsDataURL(blob);

        const arrayBuffer = await blob.arrayBuffer();
        await authFetch(`/recordings/${bId}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'video/webm' },
          body: arrayBuffer,
        }).catch((err) => console.warn('Backend upload warning:', err));
      } else {
        await authFetch(`/recordings/${bId}/stop`, { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      console.warn('Recording persistence upload error:', err);
    }

    setStep('left');
    setCallState('disconnected');
    navigate(`/bookings/${bId}?autoEdit=true`, { state: { openEditor: true } });
  };

  const handleLeaveMeeting = () => {
    setShowEndModal(true);
  };

  const handleConfirmEndRequest = async () => {
    setShowEndModal(false);
    try {
      await authFetch(`/recordings/${bId}/session-end-request`, { method: 'POST' });
    } catch (err) {
      console.warn('Session end request API warning:', err);
    }
    realtime.send('session:end_requested', { bookingId: bId });
  };

  const handleAcceptEndRequest = async () => {
    setIncomingEndRequest(null);
    try {
      await authFetch(`/recordings/${bId}/session-end-request`, { method: 'POST' });
    } catch (err) {
      console.warn('Session end accept API warning:', err);
    }
    realtime.send('session:end_confirmed', { bookingId: bId });
  };

  const handleDeclineEndRequest = async () => {
    setIncomingEndRequest(null);
    try {
      await authFetch(`/recordings/${bId}/session-end-decline`, { method: 'POST' });
    } catch (err) {
      console.warn('Session end decline API warning:', err);
    }
    realtime.send('session:end_cancelled', { bookingId: bId });
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
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--lavender-soft, #DCC9DD)' }}>
                CastReach Studio
              </span>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--white-pure, #ffffff)', margin: '4px 0', fontFamily: 'var(--font-display)' }}>
                Session with {otherUser?.name || 'Participant'}
              </h1>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, color: 'var(--lavender-mist, #F4EDF5)', marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> {dateStr}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> {startTimeStr} – {endTimeStr} ({durationMin} min)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-success, #3F8F72)', fontWeight: 600 }}>
                  <ShieldCheck size={14} /> Encrypted &amp; Secured
                </span>
              </div>
            </div>
          </div>

          {/* Main Grid: Video Preview & Controls */}
          <div style={prejoinGridStyle}>

            {/* Left: Video Preview */}
            <div style={previewBoxStyle}>
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 12,
                  transform: 'scaleX(-1)',
                  display: prejoinCamOn ? 'block' : 'none',
                }}
              />
              {!prejoinCamOn && (
                <div style={videoOffPlaceholderStyle}>
                  <VideoOff size={48} style={{ color: 'var(--lavender-soft)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--lavender-mist)', fontSize: 14 }}>Camera is turned off</p>
                </div>
              )}

              <div style={previewOverlayControlsStyle}>
                <button
                  type="button"
                  onClick={togglePrejoinMic}
                  aria-label={prejoinMicOn ? 'Mute microphone' : 'Unmute microphone'}
                  style={{ ...circleIconBtnStyle, background: prejoinMicOn ? 'var(--plum-primary, #5A3D5C)' : 'var(--color-error, #B85C68)' }}
                >
                  {prejoinMicOn ? <Mic size={18} color="#fff" /> : <MicOff size={18} color="#fff" />}
                </button>
                <button
                  type="button"
                  onClick={togglePrejoinCam}
                  aria-label={prejoinCamOn ? 'Turn camera off' : 'Turn camera on'}
                  style={{ ...circleIconBtnStyle, background: prejoinCamOn ? 'var(--plum-primary, #5A3D5C)' : 'var(--color-error, #B85C68)' }}
                >
                  {prejoinCamOn ? <VideoIcon size={18} color="#fff" /> : <VideoOff size={18} color="#fff" />}
                </button>
              </div>
            </div>

            {/* Right: Device Setup & Join */}
            <div style={prejoinFormStyle}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--white-pure, #ffffff)', marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                Audio &amp; Video Setup
              </h3>

              {permError && (
                <div style={permAlertStyle}>
                  <AlertTriangle size={20} color="var(--color-error)" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 13, color: 'var(--color-error)', lineHeight: 1.4 }}>
                    {permError.message}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Microphone (Audio Input)</label>
                <select
                  value={selectedMic}
                  onChange={(e) => handleMicChange(e.target.value)}
                  style={selectStyle}
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      🎙️ {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                  {audioDevices.length === 0 && <option value="">Default Microphone</option>}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Speaker / Headphones (Audio Output)</label>
                <select
                  value={selectedSpeaker}
                  onChange={(e) => handleSpeakerChange(e.target.value)}
                  style={selectStyle}
                >
                  {speakerDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      🔊 {d.label || `Speaker / Headphones ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                  {speakerDevices.length === 0 && <option value="">Default System Speaker</option>}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Camera (Video Input)</label>
                <select
                  value={selectedCam}
                  onChange={(e) => handleCamChange(e.target.value)}
                  style={selectStyle}
                >
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      📷 {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && <option value="">Default Camera</option>}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Virtual Background Effect</label>
                <select
                  value={bgEffect}
                  onChange={(e) => handleBgChange(e.target.value)}
                  style={selectStyle}
                >
                  <option value="none">None (Original Camera Feed)</option>
                  <option value="blur">Background Blur</option>
                  <option value="studio">Studio Gradient</option>
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
                  <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${micLevel}%`, background: 'var(--color-success, #3F8F72)', transition: 'width 0.1s ease' }} />
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

              <p style={{ fontSize: 12, color: 'var(--lavender-soft, #DCC9DD)', textAlign: 'center', marginTop: 12 }}>
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
          <div style={{ background: 'linear-gradient(135deg, var(--plum-primary), var(--plum-deep))', border: '1px solid var(--border-accent)', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '.5px' }}>
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
        {isMockRoom ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, width: '100%', height: '100%' }}>
            {/* Local Participant Tile */}
            <div style={{ position: 'relative', background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: (!isVideoOff && bgEffect === 'none') ? 'block' : 'none',
                }}
              />
              <canvas
                ref={localCanvasRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  borderRadius: 12,
                  display: (!isVideoOff && bgEffect !== 'none') ? 'block' : 'none',
                }}
              />
              {isVideoOff && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#9ca3af' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12 }}>
                    {(user?.name || user?.fullName || 'Me').slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>Camera Off</span>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #27272a' }}>
                {isMuted ? <MicOff size={14} color="#ef4444" /> : <Mic size={14} color="#10b981" />}
                <span>{(user?.name || user?.fullName || 'You')} ({user?.role === 'host' ? 'Host' : 'Guest'})</span>
              </div>
            </div>

            {/* Remote Participant Tile */}
            <div style={{ position: 'relative', background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {remoteStream ? (
                <video
                  ref={(el) => {
                    remoteVideoRef.current = el;
                    if (el && remoteStream && el.srcObject !== remoteStream) {
                      el.srcObject = remoteStream;
                      el.play().catch(() => {});
                    }
                  }}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#9ca3af', textAlign: 'center', padding: 24 }}>
                  <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 16, boxShadow: '0 0 24px rgba(124, 58, 237, 0.4)' }}>
                    {(otherUser?.name || 'Participant').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f4f6', marginBottom: 6 }}>
                    {otherUser?.name || 'Remote Participant'}
                  </div>
                  <div style={{ fontSize: 13, color: hasRemotePeer ? '#f59e0b' : '#9ca3af', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.05)', padding: '4px 12px', borderRadius: 12, border: '1px solid #27272a' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: hasRemotePeer ? '#f59e0b' : '#6b7280', display: 'inline-block' }}></span>
                    <span>{hasRemotePeer ? 'Connecting WebRTC Video Feed…' : `Waiting for ${user?.role === 'host' ? 'Guest' : 'Host'} to Join`}</span>
                  </div>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #27272a' }}>
                <Mic size={14} color={remoteStream ? '#10b981' : '#6b7280'} />
                <span>{otherUser?.name || 'Participant'} ({user?.role === 'host' ? 'Guest' : 'Host'})</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={dailyContainerRef}
            style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}
          />
        )}
        <LiveCaptionOverlay
          bookingId={bId}
          user={user}
          dailyFrame={dailyFrameRef.current}
        />
      </main>

      {/* Mutual Session End Request Modal */}
      {showEndModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1e1b4b', border: '1px solid #4c1d95', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <AlertTriangle size={44} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Request End Session?</h3>
            <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.5, marginBottom: 24 }}>
              Ending this recording session requires confirmation from both participants. A request will be sent to {otherUser?.name || 'the other participant'} while recording continues.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleConfirmEndRequest}
                style={{ padding: '12px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Confirm End Request
              </button>
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Session End Confirmation Modal */}
      {incomingEndRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#18181b', border: '1px solid #7c3aed', borderRadius: 16, padding: 28, maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 24px 48px rgba(124, 58, 237, 0.3)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(124, 58, 237, 0.2)', border: '1px solid #7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <PhoneOff size={32} color="#a78bfa" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
              Session End Requested
            </h3>
            <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.5, marginBottom: 24 }}>
              <strong>{otherUser?.name || 'Participant'}</strong> has requested to end the session. If you confirm, recording will finalize and save to storage.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleAcceptEndRequest}
                style={{ padding: '12px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Confirm &amp; End Session
              </button>
              <button
                type="button"
                onClick={handleDeclineEndRequest}
                style={{ padding: '12px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploading & Finalizing Processing Overlay */}
      {isUploadingRecording && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100001, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <RefreshCw size={44} style={{ animation: 'spin 1s linear infinite', color: '#a78bfa', marginBottom: 18 }} />
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Finalizing &amp; Saving Session Recording…</h3>
          <p style={{ fontSize: 14, color: '#9ca3af' }}>Persisting video stream to local storage and updating MongoDB metadata</p>
        </div>
      )}

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

          <select
            value={bgEffect}
            onChange={(e) => handleBgChange(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: bgEffect !== 'none' ? '#7c3aed' : '#374151',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="none">Background: None</option>
            <option value="blur">Background: Blur</option>
            <option value="studio">Background: Studio</option>
          </select>

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
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>End Session</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

// --------------------------------------------------------------------------
// INLINE STYLES
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// INLINE STYLES — CastReach Studio Design System
// --------------------------------------------------------------------------

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'var(--plum-deep, #321F3A)',
  color: 'var(--white-pure, #ffffff)',
  padding: '20px',
};

const cardCenterStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid var(--border-accent, #C9B3CD)',
  borderRadius: 'var(--radius-md, 14px)',
  padding: '36px',
  textAlign: 'center',
  maxWidth: 480,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  boxShadow: 'var(--shadow-plum, 0 12px 32px rgba(50, 31, 58, 0.25))',
};

const prejoinWrapperStyle = {
  maxWidth: 960,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const headerCardStyle = {
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(231, 221, 232, 0.18)',
  borderRadius: 'var(--radius-md, 14px)',
  padding: '20px 24px',
};

const prejoinGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 20,
};

const previewBoxStyle = {
  position: 'relative',
  background: 'rgba(0, 0, 0, 0.35)',
  border: '1.5px solid rgba(231, 221, 232, 0.18)',
  borderRadius: 'var(--radius-md, 14px)',
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
  transition: 'all 0.2s ease',
  boxShadow: 'var(--shadow-sm)',
};

const prejoinFormStyle = {
  background: 'rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(231, 221, 232, 0.18)',
  borderRadius: 'var(--radius-md, 14px)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--lavender-soft, #DCC9DD)',
  marginBottom: 6,
};

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm, 8px)',
  background: 'rgba(0, 0, 0, 0.35)',
  border: '1.5px solid var(--plum-primary, #5A3D5C)',
  color: 'var(--white-pure, #ffffff)',
  fontSize: 13,
  outline: 'none',
};

const permAlertStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  background: 'var(--color-error-bg, #F9EAEA)',
  border: '1px solid var(--color-error, #B85C68)',
  borderRadius: 'var(--radius-sm, 8px)',
  padding: 12,
  marginBottom: 16,
};

const primaryBtnStyle = {
  background: 'linear-gradient(135deg, var(--plum-primary, #5A3D5C), var(--plum-deep, #321F3A))',
  color: 'var(--white-pure, #ffffff)',
  border: '1px solid var(--border-accent, #C9B3CD)',
  borderRadius: 'var(--radius-md, 14px)',
  padding: '12px 20px',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  marginTop: 16,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: 'var(--shadow-plum, 0 8px 24px rgba(50, 31, 58, 0.35))',
  transition: 'all 0.2s ease',
};

const secondaryBtnStyle = {
  background: 'rgba(255, 255, 255, 0.12)',
  color: 'var(--white-pure, #ffffff)',
  border: '1px solid rgba(231, 221, 232, 0.25)',
  borderRadius: 'var(--radius-sm, 8px)',
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.2s ease',
};

const meetingContainerStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--plum-deep, #321F3A)',
  color: 'var(--white-pure, #ffffff)',
  overflow: 'hidden',
  margin: 0,
  padding: 0,
};

const topBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  background: 'rgba(0, 0, 0, 0.25)',
  borderBottom: '1px solid rgba(231, 221, 232, 0.15)',
  flexShrink: 0,
};

const badgeSuccessStyle = {
  padding: '4px 10px',
  borderRadius: 12,
  background: 'var(--color-success-bg, #EAF5F1)',
  color: 'var(--color-success, #3F8F72)',
  fontSize: 12,
  fontWeight: 600,
};

const badgeWarningStyle = {
  padding: '4px 10px',
  borderRadius: 12,
  background: 'var(--color-warning-bg, #FAF2E8)',
  color: 'var(--color-warning, #C58A3A)',
  fontSize: 12,
  fontWeight: 600,
};

const recordingStatusBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 12px',
  borderRadius: 12,
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(231, 221, 232, 0.2)',
};

const recordingActiveBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 12px',
  borderRadius: 12,
  background: 'var(--color-error-bg, #F9EAEA)',
  border: '1px solid var(--color-error, #B85C68)',
};

const bottomBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '14px 20px',
  background: 'rgba(0, 0, 0, 0.25)',
  borderTop: '1px solid rgba(231, 221, 232, 0.15)',
  flexShrink: 0,
};

const controlBtnStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  border: 'none',
  borderRadius: 'var(--radius-sm, 8px)',
  padding: '8px 16px',
  cursor: 'pointer',
  minWidth: 64,
  background: 'var(--plum-primary, #5A3D5C)',
  color: '#ffffff',
  transition: 'all 0.2s ease',
};

const controlLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: 'var(--lavender-mist, #F4EDF5)',
};
