import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  CheckCircle2, 
  Star, 
  ArrowRight, 
  SlidersHorizontal, 
  ShieldCheck, 
  MapPin, 
  X,
  RotateCcw,
  Check,
  Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import GuestProfileModal from '../components/GuestProfileModal';
import CreateBookingModal from '../components/CreateBookingModal';
import { useAuth } from '../context/AuthContext';
import { GUEST_CATALOG } from '../data/guests';

function mapExpertiseToCategory(text = '') {
  const lower = String(text).toLowerCase();
  if (lower.includes('neuro') || lower.includes('health') || lower.includes('bio') || lower.includes('med')) return 'Neuroscience & Health';
  if (lower.includes('comedy') || lower.includes('culture') || lower.includes('entertain') || lower.includes('satire')) return 'Comedy & Culture';
  if (lower.includes('mental') || lower.includes('mindset') || lower.includes('psych') || lower.includes('lead')) return 'Mental Health & Mindset';
  if (lower.includes('tech') || lower.includes('ai') || lower.includes('code') || lower.includes('software') || lower.includes('data')) return 'Tech & AI Pioneers';
  if (lower.includes('business') || lower.includes('startup') || lower.includes('venture') || lower.includes('found')) return 'Business & Startups';
  return 'Tech & AI Pioneers';
}

export default function FindGuests() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Read URL query params if present
  const queryParams = new URLSearchParams(location.search);
  const initialQ = queryParams.get('q') || '';
  const initialCategory = queryParams.get('category') || 'All';

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [selectedBudget, setSelectedBudget] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  // Live database guests from API
  const [apiGuests, setApiGuests] = useState([]);
  const [isLoadingApiGuests, setIsLoadingApiGuests] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingApiGuests(true);
    fetch('/api/users?role=guest&limit=50')
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data) => {
        if (isMounted) {
          setApiGuests(data.users || []);
          setIsLoadingApiGuests(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingApiGuests(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Modals
  const [selectedGuestForProfile, setSelectedGuestForProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedGuestForBooking, setSelectedGuestForBooking] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const categories = [
    'All',
    'Neuroscience & Health',
    'Comedy & Culture',
    'Mental Health & Mindset',
    'Tech & AI Pioneers',
    'Business & Startups'
  ];

  const formats = ['All', 'Remote HD Studio', 'In-Person'];
  const budgetRanges = ['All', 'Under $500', '$500 - $1,500', '$1,500+'];

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedFormat('All');
    setSelectedBudget('All');
    setVerifiedOnly(false);
    setSortBy('relevance');
  };

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'All' || selectedFormat !== 'All' || selectedBudget !== 'All' || verifiedOnly;

  // Seamlessly merge: Logged-in Guest (if applicable) + Live DB Guests + Curated Catalog
  const allGuests = useMemo(() => {
    const list = [];
    const seenIds = new Set();
    const seenEmails = new Set();

    // 1. Current logged-in user if registered/logged in as a guest
    if (user && user.role === 'guest') {
      const uId = String(user._id || user.id || 'current-guest-user');
      seenIds.add(uId);
      if (user.email) seenEmails.add(user.email.toLowerCase());

      const rawRateCents = user.sessionRateCents || 50000;
      const rateDollars = Math.round(rawRateCents / 100);
      const cat = user.podcastCategory || (user.expertise?.[0] ? mapExpertiseToCategory(user.expertise[0]) : 'Tech & AI Pioneers');

      list.push({
        id: uId,
        _id: uId,
        name: user.name || 'Your Guest Profile',
        title: user.podcastName ? `${user.podcastName} · Host & Speaker` : (user.bio ? (user.bio.length > 70 ? user.bio.slice(0, 70) + '...' : user.bio) : 'Verified Podcast Guest & Speaker'),
        avatar: user.avatar || user.profilePicture || `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(user.name || 'guest')}&backgroundColor=171520`,
        coverImage: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
        bio: user.bio || 'Available for high-signal podcast appearances, technical discussions, and industry deep-dives.',
        category: cat,
        expertise: (Array.isArray(user.expertise) && user.expertise.length > 0) ? user.expertise : ['Podcast Guest', 'Thought Leader', 'Industry Insights'],
        suggestedTopics: (Array.isArray(user.speakingTopics) && user.speakingTopics.length > 0) ? user.speakingTopics : [
          'High-leverage industry developments and strategies',
          'Key lessons learned across real-world initiatives',
          'Actionable playbooks for creators and operators'
        ],
        formats: user.typicalFormat ? [user.typicalFormat] : ['Remote HD Studio', 'In-Person'],
        location: user.location || user.studioLocation || 'Remote Studio',
        timeZone: 'UTC',
        languages: (Array.isArray(user.languages) && user.languages.length > 0) ? user.languages : ['English'],
        sessionRate: rateDollars,
        sessionRateCents: rawRateCents,
        rateDisplay: `$${rateDollars.toLocaleString()} / session`,
        rateIncludes: '60-minute recorded interview session + pre-call tech check + multi-platform broadcast rights.',
        availability: 'Accepting bookings this month',
        verified: true,
        rating: user.avgRating || 5.0,
        reviewCount: user.totalReviews || 1,
        badges: ['You (Logged In)', 'Verified Guest', 'Escrow Protected'],
        isLiveUser: true,
        isCurrentUser: true,
      });
    }

    const isMockup = (name = '', email = '') => {
      const lowerN = String(name || '').toLowerCase().trim();
      const lowerE = String(email || '').toLowerCase().trim();
      return (
        lowerN.includes('sarah jenkins') ||
        lowerN.includes('david k. miller') ||
        lowerN.includes('david miller') ||
        lowerN.includes('amara patel') ||
        lowerE.includes('sarah.jenkins') ||
        lowerE.includes('david.miller') ||
        lowerE.includes('amara.patel') ||
        lowerE.includes('demo.guest1')
      );
    };

    // 2. Dynamic database registered guests from MongoDB / Firebase API
    for (const u of apiGuests) {
      if (isMockup(u.name, u.email)) continue;
      const uId = String(u._id || u.id);
      if (seenIds.has(uId)) continue;
      if (u.email && seenEmails.has(u.email.toLowerCase())) continue;
      seenIds.add(uId);
      if (u.email) seenEmails.add(u.email.toLowerCase());

      const rawRateCents = u.sessionRateCents || 50000;
      const rateDollars = Math.round(rawRateCents / 100);
      const cat = u.podcastCategory || (u.expertise?.[0] ? mapExpertiseToCategory(u.expertise[0]) : 'Tech & AI Pioneers');

      list.push({
        id: uId,
        _id: uId,
        email: u.email,
        name: u.name || 'Verified Speaker',
        title: u.podcastName ? `${u.podcastName} · Host & Speaker` : (u.bio ? (u.bio.length > 70 ? u.bio.slice(0, 70) + '...' : u.bio) : 'Independent Industry Specialist'),
        avatar: u.avatar || u.profilePicture || `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(u.name || 'speaker')}&backgroundColor=171520`,
        coverImage: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80',
        bio: u.bio || 'Professional podcast guest specializing in engaging discussions and deep-dive domain insights.',
        category: cat,
        expertise: (Array.isArray(u.expertise) && u.expertise.length > 0) ? u.expertise : ['Podcast Guest', 'Topic Specialist', 'Strategic Insights'],
        suggestedTopics: (Array.isArray(u.speakingTopics) && u.speakingTopics.length > 0) ? u.speakingTopics : [
          'Industry trends and transformative opportunities',
          'Behind the scenes of building in this domain',
          'Actionable advice for creators and ambitious founders'
        ],
        formats: u.typicalFormat ? [u.typicalFormat] : ['Remote HD Studio', 'In-Person'],
        location: u.location || u.studioLocation || 'Remote Studio',
        timeZone: 'UTC',
        languages: (Array.isArray(u.languages) && u.languages.length > 0) ? u.languages : ['English'],
        sessionRate: rateDollars,
        sessionRateCents: rawRateCents,
        rateDisplay: `$${rateDollars.toLocaleString()} / session`,
        rateIncludes: '60-minute recorded interview session + pre-call tech check + multi-platform broadcast rights.',
        availability: 'Accepting bookings this month',
        verified: true,
        rating: u.avgRating || 5.0,
        reviewCount: u.totalReviews || 1,
        badges: ['Verified Guest', 'Escrow Protected'],
        isLiveUser: true,
        isCurrentUser: false,
      });
    }

    // 3. Curated static catalog guests
    for (const g of GUEST_CATALOG) {
      if (!seenIds.has(String(g.id))) {
        seenIds.add(String(g.id));
        list.push(g);
      }
    }

    return list;
  }, [user, apiGuests]);

  const filteredGuests = useMemo(() => {
    let list = allGuests.filter((g) => {
      // Search query filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = g.name.toLowerCase().includes(q);
        const matchesBio = g.bio?.toLowerCase().includes(q);
        const matchesExpertise = g.expertise?.some(e => e.toLowerCase().includes(q));
        const matchesTopic = g.suggestedTopics?.some(t => t.toLowerCase().includes(q));
        if (!matchesName && !matchesBio && !matchesExpertise && !matchesTopic) return false;
      }

      // Category filter
      if (selectedCategory !== 'All' && g.category !== selectedCategory) {
        return false;
      }

      // Format filter
      if (selectedFormat !== 'All') {
        const matchesFormat = g.formats?.some(f => f.toLowerCase().includes(selectedFormat.toLowerCase()));
        if (!matchesFormat) return false;
      }

      // Verified filter
      if (verifiedOnly && !g.verified) {
        return false;
      }

      // Budget filter
      if (selectedBudget === 'Under $500' && g.sessionRate > 500) return false;
      if (selectedBudget === '$500 - $1,500' && (g.sessionRate < 500 || g.sessionRate > 1500)) return false;
      if (selectedBudget === '$1,500+' && g.sessionRate < 1500) return false;

      return true;
    });

    // Sorting
    if (sortBy === 'price-low') {
      list.sort((a, b) => a.sessionRate - b.sessionRate);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.sessionRate - a.sessionRate);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [allGuests, searchTerm, selectedCategory, selectedFormat, selectedBudget, verifiedOnly, sortBy]);

  const handleOpenProfile = (guest) => {
    setSelectedGuestForProfile(guest);
    setIsProfileModalOpen(true);
  };

  const handleOpenBooking = (guest) => {
    setSelectedGuestForBooking({
      _id: guest._id || guest.id,
      id: guest._id || guest.id,
      name: guest.name,
      displayName: guest.name,
      email: guest.email,
      avatar: guest.avatar || guest.profilePicture,
      profilePicture: guest.avatar || guest.profilePicture,
      bio: guest.bio,
      sessionRateCents: (guest.sessionRate || 500) * 100,
      sessionRate: guest.sessionRate || 500,
      rateNum: guest.sessionRate || 500,
      expertise: guest.expertise,
      podcastName: guest.title,
    });
    setIsBookingModalOpen(true);
  };

  return (
    <div style={{ backgroundColor: '#0D0C12', minHeight: '100vh', color: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      <Navbar />

      {/* ── DIRECTORY HEADER ── */}
      <section style={{
        padding: '64px 32px 36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#0F0E15',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#A855F7',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
            <span>CastReach Directory</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 3.8vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            margin: '0 0 10px',
            lineHeight: 1.15,
          }}>
            Discover expert guests
          </h1>

          <p style={{
            fontSize: 16,
            color: '#A39EA9',
            maxWidth: 680,
            margin: '0 0 28px',
            lineHeight: 1.55,
          }}>
            Find the right voice for your next episode. Browse vetted thinkers, compare transparent session rates, and invite them with bonded escrow protection.
          </p>

          {/* Full-width Search Bar */}
          <div style={{
            background: '#171520',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 12,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            maxWidth: 820,
          }}>
            <Search size={18} color="#22C55E" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests by name, subject, or discussion theme..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: 15,
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A39EA9',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 2-COLUMN DIRECTORY BODY (FILTERS ON LEFT, GRID ON RIGHT) ── */}
      <section style={{ padding: '48px 32px 88px', flex: 1 }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 40,
          alignItems: 'start',
        }}>
          {/* ── LEFT SIDEBAR FILTERS ── */}
          <aside style={{
            background: '#171520',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
            position: 'sticky',
            top: 96,
          }}>
            {/* Filter Header & Clear */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 14,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                Filters
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#EF4444')}
                >
                  <RotateCcw size={12} />
                  <span>Clear all</span>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#A855F7', marginBottom: 12 }}>
                Topic / Category
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        background: active ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(168, 85, 247, 0.4)' : 'transparent'}`,
                        borderRadius: 8,
                        padding: '7px 10px',
                        textAlign: 'left',
                        fontSize: 13.5,
                        fontWeight: active ? 700 : 400,
                        color: active ? '#A855F7' : '#A39EA9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>{cat === 'All' ? 'All categories' : cat}</span>
                      {active && <Check size={14} color="#A855F7" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget / Fee Filter */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#22C55E', marginBottom: 12 }}>
                Session Rate
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {budgetRanges.map((b) => {
                  const active = selectedBudget === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBudget(b)}
                      style={{
                        background: active ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(34, 197, 94, 0.4)' : 'transparent'}`,
                        borderRadius: 8,
                        padding: '7px 10px',
                        textAlign: 'left',
                        fontSize: 13.5,
                        fontWeight: active ? 700 : 400,
                        color: active ? '#22C55E' : '#A39EA9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span>{b === 'All' ? 'Any rate' : b}</span>
                      {active && <Check size={14} color="#22C55E" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interview Format Filter */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#A855F7', marginBottom: 12 }}>
                Interview Format
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {formats.map((fmt) => {
                  const active = selectedFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setSelectedFormat(fmt)}
                      style={{
                        background: active ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(168, 85, 247, 0.4)' : 'transparent'}`,
                        borderRadius: 8,
                        padding: '7px 10px',
                        textAlign: 'left',
                        fontSize: 13.5,
                        fontWeight: active ? 700 : 400,
                        color: active ? '#A855F7' : '#A39EA9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{fmt === 'All' ? 'Any format' : fmt}</span>
                      {active && <Check size={14} color="#A855F7" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verified Only Toggle */}
            <div style={{
              paddingTop: 16,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                fontSize: 13.5,
                color: '#FFFFFF',
                fontWeight: 600,
              }}>
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  style={{
                    accentColor: '#22C55E',
                    width: 16,
                    height: 16,
                    cursor: 'pointer',
                  }}
                />
                <span>Verified guests only</span>
              </label>
            </div>
          </aside>

          {/* ── RIGHT RESULTS COLUMN ── */}
          <main>
            {/* Results Bar: Count & Sort */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
              flexWrap: 'wrap',
              gap: 14,
            }}>
              <div style={{ fontSize: 14, color: '#A39EA9' }}>
                Showing <strong style={{ color: '#22C55E' }}>{filteredGuests.length}</strong> {filteredGuests.length === 1 ? 'expert' : 'experts'}
              </div>

              {/* Sort Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#A39EA9' }}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    background: '#171520',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 13.5,
                    color: '#FFFFFF',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="relevance">Featured</option>
                  <option value="rating">Top Rated</option>
                  <option value="price-low">Fee: Low to High</option>
                  <option value="price-high">Fee: High to Low</option>
                </select>
              </div>
            </div>

            {/* Results Grid */}
            {filteredGuests.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 24,
              }}>
                {filteredGuests.map((guest) => (
                  <div
                    key={guest.id}
                    style={{
                      background: guest.isCurrentUser ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.08) 0%, #171520 40%)' : '#171520',
                      border: guest.isCurrentUser ? '1.5px solid rgba(34, 197, 94, 0.65)' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 16,
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: guest.isCurrentUser ? '0 8px 30px rgba(34, 197, 94, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.4)',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = guest.isCurrentUser ? '#22C55E' : '#A855F7';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = guest.isCurrentUser ? '0 12px 36px rgba(34, 197, 94, 0.25)' : '0 12px 32px rgba(168, 85, 247, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = guest.isCurrentUser ? 'rgba(34, 197, 94, 0.65)' : 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = guest.isCurrentUser ? '0 8px 30px rgba(34, 197, 94, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.4)';
                    }}
                  >
                    <div>
                      {/* Current User Live Badge */}
                      {guest.isCurrentUser && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#22C55E',
                          fontSize: 11,
                          fontWeight: 750,
                          letterSpacing: '0.04em',
                          marginBottom: 12,
                        }}>
                          <Sparkles size={12} color="#22C55E" />
                          <span>YOU (YOUR PUBLIC GUEST CARD)</span>
                        </div>
                      )}

                      {/* Identity Row: Avatar, Name, Rating */}
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                        <img
                          src={guest.avatar}
                          alt={guest.name}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: 12,
                            objectFit: 'cover',
                            border: guest.isCurrentUser ? '2px solid #22C55E' : '2px solid rgba(168, 85, 247, 0.35)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <h3 style={{
                              fontSize: 17,
                              fontWeight: 700,
                              margin: 0,
                              color: '#FFFFFF',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {guest.name}
                            </h3>
                            {guest.verified && (
                              <CheckCircle2 size={16} color="#22C55E" style={{ flexShrink: 0 }} title="Verified Guest" />
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Star size={13} fill="#22C55E" color="#22C55E" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#22C55E' }}>
                              {guest.rating}
                            </span>
                            <span style={{ fontSize: 12.5, color: '#A39EA9' }}>
                              ({guest.reviewCount || 24})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* One-Line Expertise */}
                      <p style={{
                        fontSize: 13.5,
                        color: '#A39EA9',
                        lineHeight: 1.5,
                        margin: '0 0 14px',
                        minHeight: 40,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {guest.title}
                      </p>

                      {/* Location & Tags */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 12.5,
                        color: '#706B72',
                        marginBottom: 16,
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} color="#A855F7" />
                          {guest.location?.split(',')[0]}
                        </span>
                        <span>·</span>
                        <span>{guest.formats?.[0] || 'Remote HD Studio'}</span>
                      </div>
                    </div>

                    {/* Bottom Fee & Primary Action */}
                    <div>
                      <div style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: 12,
                        marginBottom: 14,
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: 12.5, color: '#A39EA9' }}>Session fee</span>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 17, fontWeight: 750, color: '#22C55E' }}>
                            {guest.sessionRate === 0 ? 'Pro Bono' : `$${guest.sessionRate.toLocaleString()}`}
                          </span>
                          <span style={{ fontSize: 12, color: '#A39EA9', marginLeft: 3 }}>
                            / session
                          </span>
                        </div>
                      </div>

                      {guest.isCurrentUser ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(guest)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#FFFFFF',
                              borderRadius: 8,
                              height: 38,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#22C55E';
                              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            }}
                          >
                            Preview
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate('/guest')}
                            style={{
                              background: '#22C55E',
                              border: 'none',
                              color: '#0D0C12',
                              borderRadius: 8,
                              height: 38,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              boxShadow: '0 2px 12px rgba(34, 197, 94, 0.3)',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#34D399';
                              e.currentTarget.style.boxShadow = '0 4px 18px rgba(34, 197, 94, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#22C55E';
                              e.currentTarget.style.boxShadow = '0 2px 12px rgba(34, 197, 94, 0.3)';
                            }}
                          >
                            <span>Dashboard</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(guest)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#FFFFFF',
                              borderRadius: 8,
                              height: 38,
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#A855F7';
                              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            }}
                          >
                            Profile
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenBooking(guest)}
                            style={{
                              background: '#22C55E',
                              border: 'none',
                              color: '#0D0C12',
                              borderRadius: 8,
                              height: 38,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              boxShadow: '0 2px 12px rgba(34, 197, 94, 0.3)',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#34D399';
                              e.currentTarget.style.boxShadow = '0 4px 18px rgba(34, 197, 94, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#22C55E';
                              e.currentTarget.style.boxShadow = '0 2px 12px rgba(34, 197, 94, 0.3)';
                            }}
                          >
                            <span>Send Invite</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Clean Empty State */
              <div style={{
                background: '#171520',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
                padding: '64px 32px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#A39EA9',
                }}>
                  <Search size={22} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>
                  No expert guests found
                </h3>
                <p style={{ fontSize: 14.5, color: '#A39EA9', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.5 }}>
                  We couldn’t find any guests matching your current filters. Try searching with different keywords or reset your filters.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    background: '#22C55E',
                    color: '#0D0C12',
                    border: 'none',
                    borderRadius: 8,
                    height: 40,
                    padding: '0 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                  }}
                >
                  Reset all filters
                </button>
              </div>
            )}
          </main>
        </div>
      </section>

      {/* Guest Profile Modal */}
      <GuestProfileModal
        guest={selectedGuestForProfile}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onRequestInterview={(guest) => handleOpenBooking(guest)}
      />

      {/* Booking Invitation Modal */}
      <CreateBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialRecipient={selectedGuestForBooking}
        recipientUser={selectedGuestForBooking}
        recipient={selectedGuestForBooking}
        guest={selectedGuestForBooking}
        onSuccess={() => navigate('/bookings')}
      />

      <Footer />
    </div>
  );
}
