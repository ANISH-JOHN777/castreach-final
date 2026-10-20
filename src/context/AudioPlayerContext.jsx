import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PODCAST_CATALOG } from '../podcast';

const AudioPlayerContext = createContext(null);

const DEFAULT_TRACKS = PODCAST_CATALOG;

export function AudioPlayerProvider({ children }) {
  const [playlist, setPlaylist] = useState(DEFAULT_TRACKS);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [favorites, setFavorites] = useState(['track-1', 'track-4']);
  const [following, setFollowing] = useState(['podcaster-1']);

  // Real-time Audio Frequency Spectrum Data
  const [waveformData, setWaveformData] = useState(() => new Array(48).fill(12));

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize Web Audio API Analyser for real-time waveform
  const setupAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128; // gives 64 frequency data bins
      analyser.smoothingTimeConstant = 0.8;

      // Note: audio element crossOrigin allowed for CORS streams
      audioRef.current.crossOrigin = 'anonymous';
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      // Fallback for browsers or restricted cross-origin origins
      console.warn('[AudioWaveform] Web Audio API fallback:', e.message);
    }
  };

  // Real-time spectrum analysis loop
  useEffect(() => {
    let active = true;

    const renderRealtimeWaveform = () => {
      if (!active) return;

      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Normalize first 48 frequency bins into 0-100% amplitudes
        const bars = [];
        for (let i = 0; i < 48; i++) {
          const val = dataArray[i] || 0;
          bars.push(Math.max(10, Math.round((val / 255) * 100)));
        }
        setWaveformData(bars);
      } else if (isPlaying) {
        // High-precision synthetic modulation if Web Audio context is waiting for gesture
        const time = Date.now() / 150;
        const bars = [];
        for (let i = 0; i < 48; i++) {
          const mod = Math.sin(time + i * 0.4) * 0.5 + 0.5;
          const amp = Math.round(15 + mod * 75);
          bars.push(amp);
        }
        setWaveformData(bars);
      } else {
        // Idle calm waveform
        setWaveformData((prev) => prev.map((v) => Math.max(8, Math.round(v * 0.85))));
      }

      animationFrameRef.current = requestAnimationFrame(renderRealtimeWaveform);
    };

    if (isPlaying) {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      renderRealtimeWaveform();
    } else {
      renderRealtimeWaveform();
    }

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // Load published backend episodes if available
  useEffect(() => {
    let mounted = true;
    fetch('/api/podcasts/episodes/discover?limit=12')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data?.episodes?.length) {
          const mapped = data.episodes.map((ep, idx) => ({
            id: ep.id || ep._id,
            title: ep.title,
            host: ep.owner?.displayName || ep.owner?.name || 'Podcast Host',
            category: ep.podcast?.category || ep.topics?.[0] || 'Podcast',
            duration: ep.duration || 1800,
            currentTime: 0,
            cover: ep.podcast?.coverImage || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80',
            color: ['#7c3aed', '#cbfb45', '#f97316', '#3b82f6'][idx % 4],
            audioUrl: ep.audioUrl || 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
            episodes: ep.podcast?.title || 'Episode',
          }));
          setPlaylist(mapped);
          if (mapped[0]) {
            setCurrentTrack((curr) => curr && curr.id && !curr.id.startsWith('track-') ? curr : mapped[0]);
            setDuration(mapped[0].duration);
          }
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Sync HTML5 audio playback
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      setupAudioContext();
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // Volume & Mute sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Load audio duration and sync currentTime directly with the audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextTrack();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isRepeat, currentTrack]);

  const playTrack = (track) => {
    if (!track) return;
    setupAudioContext();
    setHasStartedPlayback(true);
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    setCurrentTrack(track);
    setCurrentTime(track.currentTime || 0);
    setDuration(track.duration || 1800);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setupAudioContext();
    if (!currentTrack && playlist[0]) {
      setCurrentTrack(playlist[0]);
    }
    setHasStartedPlayback(true);
    setIsPlaying((prev) => !prev);
  };

  const pauseTrack = () => {
    setIsPlaying(false);
  };

  const seek = (timeInSeconds) => {
    const clamped = Math.max(0, Math.min(timeInSeconds, duration));
    setCurrentTime(clamped);
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = clamped;
      } catch {}
    }
  };

  const nextTrack = () => {
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    if (currentIndex === -1) {
      playTrack(playlist[0]);
      return;
    }
    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * playlist.length);
      playTrack(playlist[nextIndex]);
    } else {
      const nextIndex = (currentIndex + 1) % playlist.length;
      playTrack(playlist[nextIndex]);
    }
  };

  const prevTrack = () => {
    if (currentTime > 5) {
      seek(0);
      return;
    }
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIndex]);
  };

  const toggleFavorite = (trackId) => {
    setFavorites((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const toggleFollow = (podcasterId) => {
    setFollowing((prev) =>
      prev.includes(podcasterId) ? prev.filter((id) => id !== podcasterId) : [...prev, podcasterId]
    );
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        playlist,
        setPlaylist,
        currentTrack,
        hasStartedPlayback,
        isPlaying,
        currentTime,
        duration,
        volume,
        setVolume,
        isMuted,
        setIsMuted,
        isShuffle,
        setIsShuffle,
        isRepeat,
        setIsRepeat,
        favorites,
        toggleFavorite,
        following,
        toggleFollow,
        playTrack,
        togglePlay,
        pauseTrack,
        seek,
        nextTrack,
        prevTrack,
        formatTime,
        waveformData,
      }}
    >
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl || 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'}
        loop={isRepeat}
        preload="auto"
      />
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
}
