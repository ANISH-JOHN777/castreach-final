import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Sparkles, UserCheck, Radio, Headphones, Calendar, Globe, Award, MessageSquare, BookOpen, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
];

const CATEGORIES = [
  'All',
  'Technology',
  'Startups',
  'Business',
  'AI',
  'Marketing',
  'Finance',
  'Health',
  'Design',
];

export default function Discover() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('podcasts'); // podcasts | episodes | hosts | guests | matches
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1, totalCount: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [language, setLanguage] = useState('');
  const [availability, setAvailability] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [page, setPage] = useState(1);

  // Match Finder State
  const [matchResults, setMatchResults] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchTargetType, setMatchTargetType] = useState(user?.role === 'host' ? 'GUEST' : 'HOST');

  const fetchData = useCallback(async () => {
    if (activeTab === 'matches') return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page,
        limit: 12,
        sort: sortOption,
      });

      if (search) qs.set('q', search);
      if (category !== 'All') qs.set('category', category);
      if (language) qs.set('language', language);
      if (availability) qs.set('availability', availability);

      let endpoint = '/podcasts';
      if (activeTab === 'episodes') endpoint = '/discovery/episodes';
      if (activeTab === 'hosts') endpoint = '/discovery/hosts';
      if (activeTab === 'guests') endpoint = '/discovery/guests';

      const res = await authFetch(`${endpoint}?${qs.toString()}`);
      const data = await res.json();
      if (res.ok) {
        if (activeTab === 'podcasts') setItems(data.podcasts || []);
        if (activeTab === 'episodes') setItems(data.episodes || []);
        if (activeTab === 'hosts') setItems(data.hosts || []);
        if (activeTab === 'guests') setItems(data.guests || []);
        setPagination({
          page: data.page || 1,
          limit: data.limit || 12,
          totalPages: data.totalPages || 1,
          totalCount: data.totalCount || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching discovery data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, category, language, availability, sortOption, authFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunMatchEngine = async () => {
    setMatchingLoading(true);
    try {
      const res = await authFetch('/discovery/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: matchTargetType,
          limit: 10,
          filters: {
            language: language || undefined,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMatchResults(data.results || []);
      }
    } catch (err) {
      console.error('Error running match engine:', err);
    } finally {
      setMatchingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'matches') {
      handleRunMatchEngine();
    }
  }, [activeTab, matchTargetType]);

  return (
    <div className="fade-in" style={{ paddingBottom: 40, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radio style={{ color: 'var(--color-primary, #6366f1)' }} /> Discovery Hub
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Discover podcasts, episodes, hosts, guest experts, and AI-powered compatibility matches.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--color-border-tertiary)', marginBottom: 20 }}>
        {[
          { id: 'podcasts', label: 'Podcasts', icon: Radio },
          { id: 'episodes', label: 'Episodes', icon: Headphones },
          { id: 'hosts', label: 'Hosts', icon: BookOpen },
          { id: 'guests', label: 'Guests', icon: UserCheck },
          { id: 'matches', label: 'AI Match Finder', icon: Sparkles },
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-primary, #6366f1)' : '2px solid transparent',
                color: isActive ? 'var(--color-primary, #6366f1)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.2s',
              }}
            >
              <IconComponent size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Controls (for Podcasts, Episodes, Hosts, Guests) */}
      {activeTab !== 'matches' && (
        <div style={{ background: 'var(--color-background-primary, #1e293b)', padding: 16, borderRadius: 12, marginBottom: 24, border: '1px solid var(--color-border-tertiary)' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border-tertiary)',
                  background: 'var(--color-background-secondary, #0f172a)',
                  color: 'var(--color-text-primary, #f8fafc)',
                  fontSize: 14,
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--color-text-secondary)' }} />
            </div>

            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border-tertiary)',
                background: 'var(--color-background-secondary, #0f172a)',
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
              ))}
            </select>

            <select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border-tertiary)',
                background: 'var(--color-background-secondary, #0f172a)',
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>

            {(activeTab === 'hosts' || activeTab === 'guests') && (
              <select
                value={availability}
                onChange={(e) => { setAvailability(e.target.value); setPage(1); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border-tertiary)',
                  background: 'var(--color-background-secondary, #0f172a)',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                }}
              >
                <option value="">Any Availability</option>
                <option value="AVAILABLE">Available Now</option>
              </select>
            )}

            <select
              value={sortOption}
              onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border-tertiary)',
                background: 'var(--color-background-secondary, #0f172a)',
                color: 'var(--color-text-primary)',
                fontSize: 14,
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      )}

      {/* Content Rendering */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
          Loading discovery content...
        </div>
      ) : activeTab === 'matches' ? (
        <div>
          {/* Match Engine Controls */}
          <div style={{ background: 'var(--color-background-primary, #1e293b)', padding: 16, borderRadius: 12, marginBottom: 24, border: '1px solid var(--color-border-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Looking for:</span>
              <button
                onClick={() => setMatchTargetType('GUEST')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: matchTargetType === 'GUEST' ? 'var(--color-primary, #6366f1)' : 'var(--color-background-secondary)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Suitable Guests
              </button>
              <button
                onClick={() => setMatchTargetType('HOST')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: matchTargetType === 'HOST' ? 'var(--color-primary, #6366f1)' : 'var(--color-background-secondary)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 13,
                }}
              >
                Suitable Hosts / Podcasts
              </button>
            </div>
            <button
              onClick={handleRunMatchEngine}
              disabled={matchingLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              <Sparkles size={16} />
              {matchingLoading ? 'Calculating Matches...' : 'Refresh AI Matches'}
            </button>
          </div>

          {/* Results Grid */}
          {matchingLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
              Analyzing topic overlap, expertise compatibility, and language alignment...
            </div>
          ) : matchResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
              No matches found matching your target criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {matchResults.map(({ user: matchUser, compatibilityScore, factors, explanation }) => (
                <div
                  key={matchUser.id}
                  style={{
                    background: 'var(--color-background-primary, #1e293b)',
                    borderRadius: 12,
                    padding: 20,
                    border: '1px solid var(--color-border-tertiary)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <img
                          src={matchUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchUser.displayName)}`}
                          alt={matchUser.displayName}
                          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 16 }}>{matchUser.displayName}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                            {matchUser.role}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{compatibilityScore}%</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                          Compatibility score
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {matchUser.bio || 'No bio provided.'}
                    </p>

                    {/* Factors Tags */}
                    {factors && factors.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {factors.map((f, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 12,
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#a5b4fc',
                              fontWeight: 500,
                            }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Grounded Explanation */}
                    {explanation && (
                      <div style={{ background: 'var(--color-background-secondary, #0f172a)', padding: 10, borderRadius: 8, fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                        <strong>Matched because:</strong> {explanation}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                    <button
                      onClick={() => navigate(`/profile/${matchUser.id}`)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border-tertiary)',
                        background: 'none',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => navigate(`/book/${matchUser.id}`)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--color-primary, #6366f1)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Connect / Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-secondary)' }}>
          No {activeTab} found matching your query.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {items.map((item) => (
            <div
              key={item._id || item.id}
              style={{
                background: 'var(--color-background-primary, #1e293b)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid var(--color-border-tertiary)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {activeTab === 'podcasts' && (
                <>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <img
                      src={item.coverImage || 'https://via.placeholder.com/60?text=Show'}
                      alt={item.title}
                      style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-primary, #6366f1)', fontWeight: 500 }}>
                        {item.category}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {item.episodeCount || 0} episodes
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12, flex: 1, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                  <button
                    onClick={() => navigate(`/podcasts/${item._id || item.id}`)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-tertiary)',
                      background: 'none',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    View Podcast
                  </button>
                </>
              )}

              {activeTab === 'episodes' && (
                <>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                    From: {item.podcast?.title || 'Podcast'}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12, flex: 1, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                  <button
                    onClick={() => navigate(`/podcasts/${item.podcast?.id}/episodes/${item.id}`)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-tertiary)',
                      background: 'none',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Listen Episode
                  </button>
                </>
              )}

              {(activeTab === 'hosts' || activeTab === 'guests') && (
                <>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <img
                      src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName)}`}
                      alt={item.displayName}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{item.displayName}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {item.expertise?.slice(0, 2).join(' · ') || 'Creator'}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12, flex: 1, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.bio || 'No bio provided.'}
                  </p>
                  <button
                    onClick={() => navigate(`/profile/${item.id}`)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-tertiary)',
                      background: 'none',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    View Profile
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
