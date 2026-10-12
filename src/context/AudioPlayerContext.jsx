import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AudioPlayerContext = createContext(null);

const DEFAULT_TRACKS = [
  {
    id: 'track-1',
    title: 'Psychological approaches to stress reduction',
    host: 'Liam Martinez',
    category: 'Psychology',
    duration: 2040, // 34:00
    currentTime: 1472, // 24:32
    cover: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80',
    color: '#3b82f6',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 12,
  },
  {
    id: 'track-2',
    title: 'How we can save this world',
    host: 'Ethan Anderson',
    category: 'Technology',
    duration: 1800, // 30:00
    currentTime: 420,
    cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80',
    color: '#2563eb',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 28,
  },
  {
    id: 'track-3',
    title: 'Healthy lifestyle: The search for harmony',
    host: 'Liam Martinez',
    category: 'Health',
    duration: 1650, // 27:30
    currentTime: 310,
    cover: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
    color: '#ec4899',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 12,
  },
  {
    id: 'track-4',
    title: 'Investing in yourself',
    host: 'Noah Davis',
    category: 'Business',
    duration: 2280, // 38:00
    currentTime: 850,
    cover: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=400&q=80',
    color: '#8b5cf6',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 16,
  },
  {
    id: 'track-5',
    title: 'How modern gadgets are changing our lives',
    host: 'Jackson Brown',
    category: 'Technology',
    duration: 1920, // 32:00
    currentTime: 120,
    cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=400&q=80',
    color: '#06b6d4',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 10,
  },
  {
    id: 'track-6',
    title: 'Proper diet & metabolic health',
    host: 'Andrius Peregorius',
    category: 'Sport',
    duration: 85, // 01:25
    currentTime: 30,
    cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80',
    color: '#ea580c',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 8,
  },
  {
    id: 'track-7',
    title: 'Just Football Podcast',
    host: 'Andrius Peregorius',
    category: 'Sport',
    duration: 65, // 01:05
    currentTime: 18,
    cover: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=400&q=80',
    color: '#2563eb',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 45,
  },
  {
    id: 'track-8',
    title: "Let's start on Monday",
    host: 'Robert Fox',
    category: 'Business',
    duration: 720, // 12:00
    currentTime: 45,
    cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80',
    color: '#059669',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 22,
  },
  {
    id: 'track-9',
    title: 'Product Designer: Crafting Modern UIs',
    host: 'Sarah Lin',
    category: 'Design',
    duration: 6000, // 100 minutes
    currentTime: 1200,
    cover: 'https://images.unsplash.com/photo-1581291518655-9523c9320e6b?auto=format&fit=crop&w=400&q=80',
    color: '#0284c7',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 10,
  },
  {
    id: 'track-10',
    title: 'Digital Marketing Mastery',
    host: 'Marcus Vance',
    category: 'Marketing',
    duration: 9600, // 160 minutes
    currentTime: 3400,
    cover: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
    color: '#d97706',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
    episodes: 40,
  }
];

export function AudioPlayerProvider({ children }) {
  const [playlist, setPlaylist] = useState(DEFAULT_TRACKS);
  const [currentTrack, setCurrentTrack] = useState(DEFAULT_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(DEFAULT_TRACKS[0].currentTime);
  const [duration, setDuration] = useState(DEFAULT_TRACKS[0].duration);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [favorites, setFavorites] = useState(['track-1', 'track-4']);
  const [following, setFollowing] = useState(['podcaster-1']);

  const audioRef = useRef(null);

  // Sync HTML5 audio playback
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Autoplay policy fallback
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // Volume & Mute sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Time ticker
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            if (isRepeat) {
              return 0;
            } else {
              nextTrack();
              return 0;
            }
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration, isRepeat]);

  const playTrack = (track) => {
    if (!track) return;
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
    setIsPlaying((prev) => !prev);
  };

  const pauseTrack = () => {
    setIsPlaying(false);
  };

  const seek = (timeInSeconds) => {
    const clamped = Math.max(0, Math.min(timeInSeconds, duration));
    setCurrentTime(clamped);
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      try {
        audioRef.current.currentTime = (clamped / duration) * audioRef.current.duration;
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
    if (isNaN(seconds) || seconds < 0) return '00:00';
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
