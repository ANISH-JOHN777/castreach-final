import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RecommendedGuests from '../components/RecommendedGuests';

const BADGE_LABELS = {
  top_rated:     '⭐ Top Rated',
  fast_responder:'⚡ Fast Responder',
  most_booked:   '🔥 Most Booked',
  verified_host: '✅ Verified Host',
};

const CATEGORIES = [
  'All',
  'AI',
  'Startups',
  'Technology',
  'Business',
  'Marketing',
  'Finance',
  'Health',
  'Design',
];

export default function Discover() {
  const { user, authFetch } = useAuth();
  const navigate            = useNavigate();
  const oppositeRole        = user?.role === 'host' ? 'guest' : 'host';

  const [users,       setUsers]       = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading,     setLoading]     = useState(true);

  // Filter & Search states
  const [search,      setSearch]      = useState('');
  const [query,       setQuery]       = useState('');
  const [category,    setCategory]    = useState('All');
  const [minRating,   setMinRating]   = useState('');
  const [badgeFilter, setBadgeFilter] = useState('');
  const [sortOption,  setSortOption]  = useState('rating');
  const [page,        setPage]        = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        role: oppositeRole,
        page,
        limit: 12,
        sort: sortOption,
      });

      if (query)                     qs.set('q', query);
      if (category && category !== 'All') qs.set('expertise', category);
      if (minRating)                 qs.set('minRating', minRating);
      if (badgeFilter)               qs.set('badge', badgeFilter);

      const res  = await authFetch(`/users?${qs.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (data.pagination) setPagination(data.pagination);
      }
    } catch {
      /* silent catch */
    } finally {
      setLoading(false);
    }
  }, [oppositeRole, page, query, category, minRating, badgeFilter, sortOption, authFetch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  };

  const handleCategorySelect = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setQuery('');
    setCategory('All');
    setMinRating('');
    setBadgeFilter('');
    setSortOption('rating');
    setPage(1);
  };

  const hasActiveFilters = query || category !== 'All' || minRating || badgeFilter || sortOption !== 'rating';

  return (
    <div className="fade-in" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          Discover {oppositeRole === 'host' ? 'Hosts' : 'Guests'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          {user?.role === 'host'
            ? 'Find verified industry experts & compelling guests for your podcast'
            : 'Find active podcast hosts looking for guests in your field'}
        </p>
      </div>

      {/* AI Recommendations */}
      <div style={{ marginBottom: 28 }}>
        <RecommendedGuests />
      </div>

      {/* Search Bar & Primary Actions */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${oppositeRole}s by name, bio, or topic…`}
            style={{
              width: '100%',
              padding: '11px 14px',
              border: '1.5px solid var(--color-border-tertiary)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setQuery(''); setPage(1); }}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <button type="submit" style={btnStyle}>Search</button>
      </form>

      {/* Category Pills Bar */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'none' }}>
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: active ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border-tertiary)',
                background: active ? 'var(--color-accent)' : 'var(--color-background-primary)',
                color: active ? '#fff' : 'var(--color-text-secondary)',
                transition: 'all .15s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Extended Filters & Sort Dropdowns Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 24, padding: '12px 14px', background: 'var(--color-background-secondary)', borderRadius: 10, border: '1px solid var(--color-border-tertiary)' }}>
        {/* Rating Filter */}
        <select
          value={minRating}
          onChange={(e) => { setMinRating(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          <option value="">All Ratings</option>
          <option value="4.5">★ 4.5 & Above</option>
          <option value="4.0">★ 4.0 & Above</option>
          <option value="3.0">★ 3.0 & Above</option>
        </select>

        {/* Badge Filter */}
        <select
          value={badgeFilter}
          onChange={(e) => { setBadgeFilter(e.target.value); setPage(1); }}
          style={selectStyle}
        >
          <option value="">All Badges</option>
          <option value="top_rated">⭐ Top Rated</option>
          <option value="fast_responder">⚡ Fast Responder</option>
          <option value="most_booked">🔥 Most Booked</option>
          <option value="verified_host">✅ Verified Host</option>
        </select>

        {/* Sort Options */}
        <select
          value={sortOption}
          onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
          style={{ ...selectStyle, marginLeft: 'auto' }}
        >
          <option value="rating">Sort: Highest Rated</option>
          <option value="newest">Sort: Recently Joined</option>
          <option value="price_asc">Sort: Price (Low to High)</option>
          <option value="price_desc">Sort: Price (High to Low)</option>
        </select>

        {/* Clear Filters CTA */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              background: 'transparent',
              border: '1px solid var(--color-border-tertiary)',
              borderRadius: 6,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Clear Filters ✕
          </button>
        )}
      </div>

      {/* Marketplace Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState role={oppositeRole} onReset={clearFilters} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {users.map((u) => <UserCard key={u._id} user={u} onView={() => navigate(`/profile/${u._id}`)} />)}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 32 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...pageBtnStyle, opacity: page === 1 ? 0.4 : 1 }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Page {pagination.page} of {pagination.pages} ({pagination.total} {oppositeRole}s)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            style={{ ...pageBtnStyle, opacity: page >= pagination.pages ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function UserCard({ user, onView }) {
  const rateDisplay = user.sessionRateCents && user.sessionRateCents > 0
    ? `$${(user.sessionRateCents / 100).toFixed(0)}/session`
    : 'Free / Flexible';

  return (
    <div
      onClick={onView}
      style={{
        background: 'var(--color-background-primary)',
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: '1.2rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justify: 'space-between',
        transition: 'box-shadow .15s, transform .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div>
        {/* Header Avatar & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: 'var(--color-accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user.name?.[0]?.toUpperCase()
            )}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            {user.podcastName ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🎧 {user.podcastName}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                {user.role}
              </div>
            )}
          </div>
        </div>

        {/* Rating & Rate Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
          {user.avgRating > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)' }}>
              <span style={{ color: '#f59e0b' }}>★</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{user.avgRating.toFixed(1)}</span>
              <span>({user.totalReviews})</span>
            </div>
          ) : (
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>New Member</span>
          )}
          <span style={{ fontWeight: 600, color: 'var(--color-text-info)', background: 'var(--color-background-info)', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
            {rateDisplay}
          </span>
        </div>

        {/* Bio Excerpt */}
        {user.bio && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              marginBottom: 10,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {user.bio}
          </p>
        )}

        {/* Expertise Tags */}
        {user.expertise?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {user.expertise.slice(0, 3).map((t) => (
              <span
                key={t}
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 500,
                  border: '1px solid var(--color-border-tertiary)',
                }}
              >
                {t}
              </span>
            ))}
            {user.expertise.length > 3 && (
              <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
                +{user.expertise.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Badges Footer */}
      {user.badges?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, pt: 8, borderTop: '1px solid var(--color-border-tertiary)' }}>
          {user.badges.slice(0, 2).map((b) => (
            <span
              key={b}
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 10,
                background: 'var(--color-background-warning)',
                color: 'var(--color-text-warning)',
                fontWeight: 600,
              }}
            >
              {BADGE_LABELS[b] || b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)', borderRadius: 12, padding: '1.2rem' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--color-background-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, width: '60%', borderRadius: 4, background: 'var(--color-background-secondary)', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 12, width: '40%', borderRadius: 4, background: 'var(--color-background-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
      <div style={{ height: 12, borderRadius: 4, background: 'var(--color-background-secondary)', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 12, width: '80%', borderRadius: 4, background: 'var(--color-background-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}

function EmptyState({ role, onReset }) {
  return (
    <div style={{ textAlign: 'center', padding: '56px 24px', background: 'var(--color-background-primary)', borderRadius: 12, border: '1px dashed var(--color-border-tertiary)' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{role === 'host' ? '🎧' : '🎤'}</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--color-text-primary)' }}>
        No {role}s match your criteria
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        Try searching for another keyword or clearing your filter selections.
      </div>
      <button onClick={onReset} style={pageBtnStyle}>Reset Filters</button>
    </div>
  );
}

const btnStyle = {
  padding: '11px 22px',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const selectStyle = {
  padding: '7px 12px',
  borderRadius: 6,
  fontSize: 12,
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border-tertiary)',
  cursor: 'pointer',
};

const pageBtnStyle = {
  padding: '8px 16px',
  border: '1px solid var(--color-border-tertiary)',
  borderRadius: 8,
  background: 'var(--color-background-primary)',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};
