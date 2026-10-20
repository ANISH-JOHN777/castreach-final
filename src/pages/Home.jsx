import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Star,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Play,
  Pause,
  Headphones,
  Sparkles,
  Radio,
  Clock,
  User,
  Volume2,
  Menu,
  X,
  ExternalLink,
  Mic,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Footer from '../components/Footer';
import GuestProfileModal from '../components/GuestProfileModal';
import CreateBookingModal from '../components/CreateBookingModal';
import { GUEST_CATALOG } from '../data/guests';
import { PODCAST_CATALOG } from '../podcast';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import heroSlide1 from '../media/hero_slide_1.jpg';
import heroSlide2 from '../media/hero_slide_2.jpg';
import heroSlide3 from '../media/hero_slide_3.jpg';
import heroSlide4 from '../media/hero_slide_4.jpg';
import step1Img from '../media/process_step1_cast.jpg';
import step2Img from '../media/process_step2_cast.jpg';
import step3Img from '../media/process_step3_cast.jpg';
import losslessWaveImg from '../media/lossless_soundwave.png';
import brandIcon from '../media/brand_icon_transparent.png';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();

  // Sticky bottom navbar state & mobile menu toggle
  const [isHeroDockSticky, setIsHeroDockSticky] = useState(false);
  const [heroMobileMenuOpen, setHeroMobileMenuOpen] = useState(false);

  // Search & Filters
  const [heroSearch, setHeroSearch] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('All');

  // Hero background slideshow
  const heroSlides = useMemo(() => [
    { id: 1, image: heroSlide1, position: 'center 38%' }, // Tom Holland wide interview
    { id: 2, image: heroSlide2, position: 'center 28%' }, // Andrew Huberman in dark studio
    { id: 3, image: heroSlide3, position: 'center 40%' }, // B&W studio conversation
    { id: 4, image: heroSlide4, position: 'center 40%' }, // Studio lounge interview
  ], []);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Modals state
  const [selectedGuestForProfile, setSelectedGuestForProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedGuestForBooking, setSelectedGuestForBooking] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Horizontal scroll container reference for Featured Voices
  const guestScrollRef = useRef(null);

  const scrollGuestCards = (direction) => {
    if (guestScrollRef.current) {
      const scrollAmount = direction === 'left' ? -360 : 360;
      guestScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Scroll listener for sticky hero bottom dock
  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('hero-photographic-section');
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();
        setIsHeroDockSticky(rect.bottom <= 0);
      } else {
        setIsHeroDockSticky(window.scrollY > 400);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Role-based links for the sticky dock navbar
  const heroNavLinks = useMemo(() => {
    if (!user) {
      return [
        { label: 'Home', to: '/' },
        { label: 'Discover guests', to: '/find-guests' },
        { label: 'Episodes', to: '/discover' },
        { label: 'Listen Room', to: '/listen' },
        { label: 'About', to: '/about' },
      ];
    }
    if (user.role === 'listener') {
      return [
        { label: 'Listen Room', to: '/listen' },
        { label: 'My Profile', to: '/profile' },
        { label: 'About', to: '/about' },
      ];
    }
    if (user.role === 'host') {
      return [
        { label: 'Discover guests', to: '/find-guests' },
        { label: 'Host Dashboard', to: '/host' },
        { label: 'Listen Room', to: '/listen' },
        { label: 'Profile', to: '/profile' },
      ];
    }
    if (user.role === 'guest') {
      return [
        { label: 'Guest Dashboard', to: '/guest' },
        { label: 'Listen Room', to: '/listen' },
        { label: 'Profile', to: '/profile' },
      ];
    }
    return [
      { label: 'Discover guests', to: '/find-guests' },
      { label: 'Listen Room', to: '/listen' },
      { label: 'Profile', to: '/profile' },
    ];
  }, [user]);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    if (user.role === 'guest') return '/guest';
    return '/profile';
  };

  const categories = [
    'All',
    'Neuroscience & Health',
    'Comedy & Culture',
    'Mental Health & Mindset',
    'Mindset & Leadership',
    'Business & Startups'
  ];

  // Exclusively show authentic curated guests (Huberman, Tom Holland, etc. with black & white avatars)
  const allFeaturedGuests = useMemo(() => {
    return GUEST_CATALOG;
  }, []);

  // Filter guests for horizontal carousel
  const featuredGuests = useMemo(() => {
    return allFeaturedGuests.filter((g) => {
      if (selectedCategoryTab !== 'All' && g.category !== selectedCategoryTab) return false;
      return true;
    });
  }, [allFeaturedGuests, selectedCategoryTab]);

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroSearch.trim()) params.set('q', heroSearch.trim());
    navigate(`/find-guests?${params.toString()}`);
  };

  const handleQuickTheme = (topic) => {
    navigate(`/find-guests?q=${encodeURIComponent(topic)}`);
  };

  const handleOpenProfile = (guest) => {
    setSelectedGuestForProfile(guest);
    setIsProfileModalOpen(true);
  };

  const handleOpenBooking = (guest) => {
    setSelectedGuestForBooking({
      _id: guest.id,
      id: guest.id,
      name: guest.name,
      displayName: guest.name,
      profilePicture: guest.avatar,
      sessionRateCents: (guest.sessionRate || 500) * 100,
      expertise: guest.expertise,
      podcastName: guest.title,
    });
    setIsBookingModalOpen(true);
  };

  const spotlightTrack = PODCAST_CATALOG[0] || {
    id: 'huberman-habits-01',
    title: 'Become Mentally Dangerous With These Daily Habits',
    host: 'Raj Shamani',
    guest: 'Dr. Andrew Huberman',
    show: 'Figuring Out',
    duration: 3600,
    coverImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
  };

  const isSpotlightPlaying = isPlaying && currentTrack?.id === spotlightTrack.id;

  return (
    <div style={{ backgroundColor: '#09080F', minHeight: '100vh', color: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* ──────────────────────────────────────────────────────────────────────────
          01. ULTRA-CLEAN EDITORIAL HERO (Jay Shetty Reference Style)
          - Full bleed photographic backdrop
          - Top floating minimalist bar (Search icon, links, centered bold wordmark, right links)
          - Pure visual focus on the human host/studio photograph
          - Minimal bottom pill CTAs
      ────────────────────────────────────────────────────────────────────────── */}
      <section
        id="hero-photographic-section"
        style={{
          position: 'relative',
          minHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09080F',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Slideshow background layers with smooth cross-fade (no zoom in) */}
        {heroSlides.map((slide, idx) => (
          <div
            key={slide.id}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundPosition: slide.position,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              opacity: currentHeroSlide === idx ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        ))}

        {/* Soft cinematic dark gradient overlays so top header and lower CTA remain readable while table and subjects stay crisp */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(9, 8, 15, 0.72) 0%, rgba(9, 8, 15, 0.1) 32%, rgba(9, 8, 15, 0.35) 60%, #09080F 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* ── TOP HERO FLOATING NAVBAR (Preserve Centered CASTREACH, Clean Minimal) ── */}
        <header
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px clamp(20px, 4vw, 56px)',
            width: '100%',
          }}
        >
          {/* Centered Editorial Logo & Brand Icon */}
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              fontSize: 'clamp(20px, 2.8vw, 26px)',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              textShadow: '0 2px 18px rgba(0,0,0,0.95)',
              whiteSpace: 'nowrap',
            }}
          >
            <img
              src={brandIcon}
              alt="CastReach Logo"
              style={{
                width: 56,
                height: 56,
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.8))',
              }}
            />
            <span style={{ fontSize: 'clamp(22px, 3vw, 28px)', letterSpacing: '0.1em' }}>CASTREACH</span>
          </Link>
        </header>

        {/* ── HERO CENTER-LOWER HEADLINE & PILL CTAS ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 5,
            maxWidth: 960,
            width: '100%',
            margin: '0 auto',
            textAlign: 'center',
            padding: '0 clamp(20px, 4vw, 40px) 48px',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#A855F7',
              marginBottom: 14,
            }}
          >
            Discover · Book · Stream
          </div>

          <h1
            style={{
              fontSize: 'clamp(38px, 5.5vw, 70px)',
              fontWeight: 850,
              letterSpacing: '-0.035em',
              lineHeight: 1.06,
              color: '#FFFFFF',
              margin: '0 auto 18px',
              maxWidth: 780,
              textShadow: '0 4px 28px rgba(0, 0, 0, 0.9)',
            }}
          >
            Conversations that move culture.
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 1.8vw, 19px)',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.5,
              maxWidth: 540,
              margin: '0 auto 32px',
              textShadow: '0 2px 12px rgba(0, 0, 0, 0.85)',
              fontWeight: 450,
            }}
          >
            Connect with vetted podcast guests, schedule verified studio interviews, and listen in master audio.
          </p>

          {/* Minimal Pill Buttons matching Jay Shetty & HDTGM bottom style */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link
              to="/find-guests"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#22C55E',
                color: '#08070B',
                padding: '13px 30px',
                borderRadius: 999,
                fontWeight: 750,
                fontSize: 14.5,
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#34D399'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#22C55E'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <span>Explore guests</span>
              <ArrowRight size={15} />
            </Link>

            <Link
              to="/listen"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(15, 14, 23, 0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '13px 26px',
                borderRadius: 999,
                fontWeight: 650,
                fontSize: 14.5,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(15, 14, 23, 0.7)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Headphones size={15} color="#C084FC" />
              <span>Listen to episodes</span>
            </Link>
          </div>

          {/* Interactive Slideshow Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            {heroSlides.map((_, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => setCurrentHeroSlide(sIdx)}
                style={{
                  width: currentHeroSlide === sIdx ? 24 : 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: currentHeroSlide === sIdx ? '#22C55E' : 'rgba(255, 255, 255, 0.28)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: currentHeroSlide === sIdx ? '0 0 10px rgba(34, 197, 94, 0.7)' : 'none',
                }}
                title={`Slide ${sIdx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          02. HERO BOTTOM DOCK (Sticky Navbar on Scroll)
      ────────────────────────────────────────────────────────────────────────── */}
      <nav
        id="hero-bottom-navbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: isHeroDockSticky ? 'rgba(9, 8, 15, 0.94)' : '#09080F',
          backdropFilter: isHeroDockSticky ? 'blur(20px) saturate(140%)' : 'none',
          WebkitBackdropFilter: isHeroDockSticky ? 'blur(20px) saturate(140%)' : 'none',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: isHeroDockSticky ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isHeroDockSticky ? '0 12px 36px rgba(0, 0, 0, 0.8), 0 0 24px rgba(168, 85, 247, 0.16)' : 'none',
          padding: isHeroDockSticky ? '10px clamp(20px, 4vw, 56px)' : '14px clamp(20px, 4vw, 56px)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{
          maxWidth: 1360,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}>
          {/* Brand Wordmark & Main Icon */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src={brandIcon}
              alt="CastReach Logo"
              style={{
                width: 44,
                height: 44,
                objectFit: 'contain',
                display: 'block',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.06em' }}>
              CASTREACH
            </span>
          </Link>

          {/* Center Navigation Links: Discover guests, Listen, About */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            fontSize: 14,
            fontWeight: 600,
          }} className="hidden md:flex">
            <Link
              to="/find-guests"
              style={{
                color: '#CBD5E1',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
            >
              Discover guests
            </Link>
            <Link
              to="/listen"
              style={{
                color: '#CBD5E1',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
            >
              Listen
            </Link>
            <Link
              to="/about"
              style={{
                color: '#CBD5E1',
                textDecoration: 'none',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; }}
            >
              About
            </Link>

            {/* Live Playback Indicator Pill */}
            {isPlaying && currentTrack && (
              <div
                onClick={() => navigate('/listen')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  color: '#22C55E',
                  fontSize: 12,
                  fontWeight: 650,
                  cursor: 'pointer',
                  animation: 'pulse 2s infinite',
                }}
                className="hidden lg:flex"
                title="Playing now"
              >
                <Volume2 size={13} color="#22C55E" />
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentTrack.title}
                </span>
              </div>
            )}
          </div>

          {/* Right: Search Lens + Sign In / User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Search Lens button */}
            <button
              type="button"
              onClick={() => navigate('/find-guests')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#CBD5E1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#CBD5E1';
              }}
              title="Search guests and podcasts"
            >
              <Search size={15} />
            </button>

            {/* User Profile or Sign In */}
            {user ? (
              <Link
                to={getDashboardPath()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <User size={14} color="#A855F7" />
                <span className="hidden sm:inline">
                  {user.name?.split(' ')[0] || (user.role === 'listener' ? 'Profile' : 'Dashboard')}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: '#CBD5E1',
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#CBD5E1';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                Sign in
              </Link>
            )}

            {/* Role-tailored Action CTA (Positive Green) */}
            {user?.role === 'listener' ? (
              <button
                type="button"
                onClick={() => navigate('/listen')}
                style={{
                  background: '#22C55E',
                  color: '#0D0C12',
                  border: 'none',
                  borderRadius: 999,
                  height: 36,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 12px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#34D399'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#22C55E'; }}
              >
                <span>Listen now</span>
                <ArrowRight size={14} />
              </button>
            ) : user?.role === 'guest' ? (
              <button
                type="button"
                onClick={() => navigate('/guest')}
                style={{
                  background: '#22C55E',
                  color: '#0D0C12',
                  border: 'none',
                  borderRadius: 999,
                  height: 36,
                  padding: '0 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 12px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#34D399'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#22C55E'; }}
              >
                <span>Dashboard</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/find-guests')}
                style={{
                  background: '#22C55E',
                  color: '#0D0C12',
                  border: 'none',
                  borderRadius: 999,
                  height: 36,
                  padding: '0 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 12px rgba(34, 197, 94, 0.4)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#34D399'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#22C55E'; }}
              >
                <span>Book Guest</span>
                <ArrowRight size={14} />
              </button>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              type="button"
              className="md:hidden"
              onClick={() => setHeroMobileMenuOpen(!heroMobileMenuOpen)}
              aria-label="Toggle menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {heroMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {heroMobileMenuOpen && (
          <div style={{
            background: 'rgba(10, 9, 15, 0.98)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }} className="md:hidden">
            {heroNavLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setHeroMobileMenuOpen(false)}
                style={{
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  padding: '6px 0',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* ──────────────────────────────────────────────────────────────────────────
          03. FEATURED VOICES — CLEAN EDITORIAL GUEST CARDS
      ────────────────────────────────────────────────────────────────────────── */}
      {/* ──────────────────────────────────────────────────────────────────────────
          03. FEATURED VOICES — HORIZONTAL SCROLLING TRANSPARENT CARDS
      ────────────────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '72px clamp(20px, 4vw, 56px)',
        backgroundColor: '#000000', // Pitch black color
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1360, margin: '0 auto' }}>
          {/* Header Row with Title & Scroll Navigation Arrows */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 32,
            gap: 20,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontSize: 11.5,
                fontWeight: 750,
                color: '#C084FC',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                FEATURED VOICES
              </div>
              <h2 style={{
                fontSize: 'clamp(28px, 3.5vw, 38px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#FFFFFF',
                margin: 0,
              }}>
                Meet your next great guest.
              </h2>
            </div>

            {/* Right side: View All + Carousel Arrow Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Link
                to="/find-guests"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#22C55E',
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                  marginRight: 6,
                }}
              >
                <span>View all guests</span>
                <ArrowRight size={16} />
              </Link>

              {/* Prev Arrow */}
              <button
                type="button"
                onClick={() => scrollGuestCards('left')}
                aria-label="Scroll left"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                <ChevronLeft size={20} />
              </button>

              {/* Next Arrow */}
              <button
                type="button"
                onClick={() => scrollGuestCards('right')}
                aria-label="Scroll right"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* ── HORIZONTAL SCROLLING ROW OF TRANSPARENT GUEST CARDS ── */}
          <div
            ref={guestScrollRef}
            style={{
              display: 'flex',
              gap: 24,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              paddingBottom: 20,
              paddingTop: 8,
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none', // Hide standard scrollbar for sleek editorial feel
              msOverflowStyle: 'none',
            }}
          >
            {featuredGuests.map((guest) => (
              <div
                key={guest.id}
                style={{
                  flex: '0 0 310px',
                  scrollSnapAlign: 'start',
                  backgroundColor: 'transparent', // Fully transparent background
                  borderRadius: 20,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.45)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.55), 0 0 24px rgba(168, 85, 247, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.35)';
                }}
              >
                <div>
                  {/* Portrait Area — Transparent PNG Friendly Frame */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '92%', // Generous portrait space for cutout images
                      overflow: 'hidden',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onClick={() => handleOpenProfile(guest)}
                  >
                    <img
                      src={guest.avatar}
                      alt={guest.name}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'grayscale(100%) contrast(1.08)',
                        transition: 'transform 0.4s ease, filter 0.4s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    />

                    {/* Subtle transparent bottom shade so text is ultra-legible */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 65%, rgba(9, 8, 15, 0.8) 100%)',
                      pointerEvents: 'none',
                    }} />
                  </div>

                  {/* Content Area */}
                  <div style={{ padding: '18px 20px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <h3
                        onClick={() => handleOpenProfile(guest)}
                        style={{
                          fontSize: 18,
                          fontWeight: 750,
                          color: '#FFFFFF',
                          margin: 0,
                          cursor: 'pointer',
                        }}
                      >
                        {guest.name}
                      </h3>
                      {guest.verified && <CheckCircle2 size={16} color="#22C55E" />}
                    </div>

                    <p style={{
                      fontSize: 13,
                      color: '#94A3B8',
                      lineHeight: 1.5,
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {guest.bio}
                    </p>
                  </div>
                </div>

                {/* Bottom Card Footer: Price & Booking Button */}
                <div style={{
                  padding: '14px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)', // Soft glass transparent touch
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Session Rate
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF' }}>
                      ${guest.sessionRate || 500}{' '}
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: '#64748B' }}>/ session</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenProfile(guest)}
                      style={{
                        padding: '7px 11px',
                        borderRadius: 8,
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        color: '#CBD5E1',
                        fontSize: 12,
                        fontWeight: 650,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                        e.currentTarget.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                        e.currentTarget.style.color = '#CBD5E1';
                      }}
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenBooking(guest)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        backgroundColor: '#22C55E',
                        color: '#0D0C12',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 750,
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(34, 197, 94, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#34D399'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#22C55E'; }}
                    >
                      Book
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          04. HOW IT WORKS — THREE SIMPLE STEPS (Zero Clutter)
      {/* ──────────────────────────────────────────────────────────────────────────
          04. HOW IT WORKS (Minimal Process matching reference image style)
          - Pitch black background
          - Clean centered heading & subtitle
          - 3 columns with rounded photographic cards
          - Prominent orange circular badges overlapping the top-left of each photo
          - Clean bold titles and refined descriptions below each photo
      ────────────────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '96px clamp(20px, 5vw, 64px)',
        backgroundColor: '#000000',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          {/* Centered Heading & Subtitle */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{
              fontSize: 'clamp(32px, 4vw, 46px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#FFFFFF',
              margin: '0 0 16px',
            }}>
              How it Works
            </h2>
            <p style={{
              fontSize: 'clamp(15px, 1.8vw, 17px)',
              color: '#CBD5E1',
              lineHeight: 1.6,
              maxWidth: 620,
              margin: '0 auto',
              fontWeight: 400,
            }}>
              It’s never been easier to connect, record, and broadcast.
              <br />
              Seamless booking and studio streaming from anywhere in the world.
            </p>
          </div>

          {/* 3 Step Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 'clamp(28px, 4vw, 36px)',
          }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                borderRadius: 20,
                overflow: 'visible',
                marginBottom: 22,
              }}>
                {/* Vibrant Orange Number Badge positioned overlapping top-left */}
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: -14,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#E85A18',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  boxShadow: '0 4px 16px rgba(232, 90, 24, 0.55)',
                  zIndex: 2,
                  letterSpacing: '0.02em',
                }}>
                  01
                </div>

                {/* Card Image Container */}
                <div style={{
                  width: '100%',
                  aspectRatio: '16 / 10',
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#111018',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                }}>
                  <img
                    src={step1Img}
                    alt="Discover & Book Guests"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.4s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                </div>
              </div>

              <h3 style={{
                fontSize: 20,
                fontWeight: 750,
                color: '#FFFFFF',
                margin: '0 0 10px',
                letterSpacing: '-0.015em',
              }}>
                Book Online in 2 Min.
              </h3>
              <p style={{
                fontSize: 14.5,
                color: '#94A3B8',
                lineHeight: 1.6,
                margin: 0,
                fontWeight: 400,
              }}>
                Easily search, message, and lock dates with verified podcast voices using our secure instant booking platform.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                borderRadius: 20,
                overflow: 'visible',
                marginBottom: 22,
              }}>
                {/* Vibrant Orange Number Badge positioned overlapping top-left */}
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: -14,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#E85A18',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  boxShadow: '0 4px 16px rgba(232, 90, 24, 0.55)',
                  zIndex: 2,
                  letterSpacing: '0.02em',
                }}>
                  02
                </div>

                {/* Card Image Container */}
                <div style={{
                  width: '100%',
                  aspectRatio: '16 / 10',
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#111018',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                }}>
                  <img
                    src={step2Img}
                    alt="Studio Session Recording"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.4s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                </div>
              </div>

              <h3 style={{
                fontSize: 20,
                fontWeight: 750,
                color: '#FFFFFF',
                margin: '0 0 10px',
                letterSpacing: '-0.015em',
              }}>
                Connect in Studio or Remote
              </h3>
              <p style={{
                fontSize: 14.5,
                color: '#94A3B8',
                lineHeight: 1.6,
                margin: 0,
                fontWeight: 400,
              }}>
                Record with broadcast-grade audio pipelines or sync up at verified production studios. Built-in escrow protects every session.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                borderRadius: 20,
                overflow: 'visible',
                marginBottom: 22,
              }}>
                {/* Vibrant Orange Number Badge positioned overlapping top-left */}
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: -14,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#E85A18',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  boxShadow: '0 4px 16px rgba(232, 90, 24, 0.55)',
                  zIndex: 2,
                  letterSpacing: '0.02em',
                }}>
                  03
                </div>

                {/* Card Image Container */}
                <div style={{
                  width: '100%',
                  aspectRatio: '16 / 10',
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#111018',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                }}>
                  <img
                    src={step3Img}
                    alt="Stream in Master Quality"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.4s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                </div>
              </div>

              <h3 style={{
                fontSize: 20,
                fontWeight: 750,
                color: '#FFFFFF',
                margin: '0 0 10px',
                letterSpacing: '-0.015em',
              }}>
                Stream in Master Clarity
              </h3>
              <p style={{
                fontSize: 14.5,
                color: '#94A3B8',
                lineHeight: 1.6,
                margin: 0,
                fontWeight: 400,
              }}>
                Feel the clarity of uncompressed master audio. Listeners experience crisp speech, real-time sync, and immersive soundscapes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          05. LOSSLESS 48kHz MASTER AUDIO — HIGH QUALITY SOUND FOR CONVENIENT HEARING
          - Pitch black background (#000000)
          - No video or square thumbnail artwork clutter
          - Minimalist glowing multi-colored acoustic soundwave inspired by reference
          - Refined, high-fidelity audio controls & audio pipeline specifications
      ────────────────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '96px clamp(20px, 4vw, 56px)',
        backgroundColor: '#000000',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', textAlign: 'center' }}>
          
          {/* Top Pill Tag */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 999,
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.28)',
            color: '#22C55E',
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            <Volume2 size={13} color="#22C55E" />
            <span>Lossless 48kHz Studio Master</span>
          </div>

          {/* Section Heading */}
          <h2 style={{
            fontSize: 'clamp(32px, 4.2vw, 48px)',
            fontWeight: 850,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            margin: '0 auto 16px',
            lineHeight: 1.15,
            maxWidth: 720,
          }}>
            High quality sound for effortless, convenient hearing.
          </h2>

          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 17px)',
            color: '#94A3B8',
            maxWidth: 580,
            lineHeight: 1.6,
            margin: '0 auto 40px',
            fontWeight: 400,
          }}>
            No harsh compression or distorted frequencies. Tuned with broadcast-grade acoustics so you can absorb every idea, interview, and nuance with complete clarity.
          </p>

          {/* ── THE SIGNATURE ACOUSTIC SOUNDWAVE VISUALIZER (Reference Style) ── */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 680,
            margin: '0 auto 44px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Ambient soft glow behind the waveform */}
            <div style={{
              position: 'absolute',
              width: '60%',
              height: 120,
              background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.15) 0%, rgba(168, 85, 247, 0.12) 40%, rgba(0,0,0,0) 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
              zIndex: 0,
            }} />

            {/* Glowing Acoustic Soundwave SVG */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: 560,
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}>
              <svg
                viewBox="0 0 600 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.45)) drop-shadow(0 0 18px rgba(168, 85, 247, 0.35))',
                }}
              >
                {/* Baseline reference audio line */}
                <line x1="0" y1="60" x2="600" y2="600" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />

                {/* 1. Purple / Deep Blue top swell wave */}
                <path
                  d="M 0 60 Q 150 60, 230 52 Q 300 22, 370 52 Q 450 60, 600 60"
                  stroke="#6366F1"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    transition: 'all 0.5s ease',
                    opacity: isSpotlightPlaying ? 1 : 0.85,
                  }}
                />

                {/* 2. Cyan / Turquoise middle high-crest wave */}
                <path
                  d="M 0 60 Q 140 60, 220 50 Q 280 40, 310 46 Q 360 56, 420 59 Q 490 60, 600 60"
                  stroke="#22D3EE"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    transition: 'all 0.5s ease',
                    opacity: isSpotlightPlaying ? 1 : 0.9,
                  }}
                />

                {/* 3. Orange / Coral warm middle contour */}
                <path
                  d="M 0 60 Q 160 60, 240 60 Q 300 62, 340 70 Q 390 73, 440 62 Q 500 60, 600 60"
                  stroke="#FB923C"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{
                    transition: 'all 0.5s ease',
                    opacity: isSpotlightPlaying ? 1 : 0.85,
                  }}
                />

                {/* 4. Vivid Magenta / Pink deep bottom harmonic wave */}
                <path
                  d="M 0 60 Q 170 60, 230 63 Q 270 82, 320 80 Q 360 74, 430 62 Q 490 60, 600 60"
                  stroke="#F43F5E"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    transition: 'all 0.5s ease',
                    opacity: isSpotlightPlaying ? 1 : 0.9,
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Three Clean Audio Pillars (No Clutter, Pure Sound Definition) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 24,
            maxWidth: 820,
            margin: '40px auto 0',
          }}>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: 15, fontWeight: 750, color: '#FFFFFF', marginBottom: 4 }}>
                Direct Vocal Dynamics
              </div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                Zero dynamic range clipping; human tone and cadence remain intact.
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: 15, fontWeight: 750, color: '#FFFFFF', marginBottom: 4 }}>
                Sub-Millisecond Sync
              </div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                Real-time synchronized transcripts without latency drift.
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: 15, fontWeight: 750, color: '#FFFFFF', marginBottom: 4 }}>
                Acoustic Comfort
              </div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                Calibrated frequency curves built specifically for fatigue-free long listening.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          06. THREE ROLE CARDS — CHOOSE YOUR PATH (Host, Guest, Listener)
      ────────────────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '72px clamp(20px, 4vw, 56px)',
        backgroundColor: '#09080E',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{
              fontSize: 'clamp(28px, 3.5vw, 38px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              margin: '0 0 10px',
            }}>
              Sound has a place. People have a voice.
            </h2>
            <p style={{ fontSize: 15, color: '#A39EA9', maxWidth: 500, margin: '0 auto' }}>
              Choose your role and join the CastReach ecosystem.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {/* Host Card */}
            <div
              onClick={() => navigate('/register?role=host')}
              style={{
                backgroundColor: '#059669',
                borderRadius: 20,
                padding: '32px 28px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 32px rgba(5, 150, 105, 0.35)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Headphones size={28} color="#FFFFFF" />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.25)' }}>
                    HOST
                  </span>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 850, margin: '0 0 8px', color: '#FFFFFF' }}>I am a Host</h3>
                <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5, margin: 0 }}>
                  Discover verified guest experts, schedule studio recordings, and distribute episodes.
                </p>
              </div>
              <div style={{ marginTop: 28, fontWeight: 800, fontSize: 13.5, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Launch Host Account</span>
                <ArrowRight size={15} />
              </div>
            </div>

            {/* Guest Card */}
            <div
              onClick={() => navigate('/register?role=guest')}
              style={{
                backgroundColor: '#7C3AED',
                borderRadius: 20,
                padding: '32px 28px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 32px rgba(124, 58, 237, 0.35)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Mic size={28} color="#FFFFFF" />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.25)' }}>
                    GUEST
                  </span>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 850, margin: '0 0 8px', color: '#FFFFFF' }}>I am a Guest</h3>
                <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5, margin: 0 }}>
                  Get invited to top shows, share your domain expertise, and expand your audience.
                </p>
              </div>
              <div style={{ marginTop: 28, fontWeight: 800, fontSize: 13.5, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Create Guest Profile</span>
                <ArrowRight size={15} />
              </div>
            </div>

            {/* Listener Card */}
            <div
              onClick={() => navigate('/register?role=listener')}
              style={{
                backgroundColor: '#2563EB',
                borderRadius: 20,
                padding: '32px 28px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 32px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Radio size={28} color="#FFFFFF" />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.25)' }}>
                    LISTENER
                  </span>
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 850, margin: '0 0 8px', color: '#FFFFFF' }}>I am a Listener</h3>
                <p style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5, margin: 0 }}>
                  Stream lossless 48kHz audio masterclasses and explore curated episode playlists.
                </p>
              </div>
              <div style={{ marginTop: 28, fontWeight: 800, fontSize: 13.5, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Start Listening</span>
                <ArrowRight size={15} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Guest Profile Modal */}
      {isProfileModalOpen && selectedGuestForProfile && (
        <GuestProfileModal
          guest={selectedGuestForProfile}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onBookSession={() => {
            setIsProfileModalOpen(false);
            handleOpenBooking(selectedGuestForProfile);
          }}
        />
      )}

      {/* Booking Modal */}
      {isBookingModalOpen && selectedGuestForBooking && (
        <CreateBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          guest={selectedGuestForBooking}
        />
      )}
    </div>
  );
}
