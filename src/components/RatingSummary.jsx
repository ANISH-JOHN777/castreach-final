import { Star } from 'lucide-react';

export default function RatingSummary({ averageRating = 0, totalReviews = 0, distribution = {} }) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...distribution };

  return (
    <div style={{ background: 'var(--color-background-primary, #1e293b)', padding: 20, borderRadius: 12, border: '1px solid var(--color-border-tertiary)', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        {/* Big Rating */}
        <div style={{ textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-text-primary, #f8fafc)' }}>
            {averageRating ? Number(averageRating).toFixed(1) : '0.0'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 2, margin: '4px 0' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                fill={star <= Math.round(averageRating) ? '#f59e0b' : 'none'}
                color={star <= Math.round(averageRating) ? '#f59e0b' : 'var(--color-text-secondary)'}
              />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = dist[stars] || 0;
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
                <span style={{ width: 24, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{stars}★</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--color-background-secondary, #0f172a)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <span style={{ width: 24, color: 'var(--color-text-secondary)' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
