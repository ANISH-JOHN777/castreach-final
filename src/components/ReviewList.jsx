import { useState } from 'react';
import { Star, Flag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReviewList({ reviews = [], onReport }) {
  const { authFetch } = useAuth();
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportMsg, setReportMsg] = useState('');

  const handleReport = async (reviewId) => {
    if (!reportReason.trim()) return;
    try {
      const res = await authFetch(`/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      if (res.ok) {
        setReportMsg('Review reported to moderators.');
        setReportingId(null);
        setReportReason('');
        if (onReport) onReport(reviewId);
      }
    } catch (err) {
      console.error('Report review failed:', err);
    }
  };

  if (!reviews || reviews.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-secondary)', background: 'var(--color-background-primary)', borderRadius: 12 }}>
        No reviews yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reportMsg && (
        <div style={{ padding: 10, borderRadius: 8, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: 13 }}>
          {reportMsg}
        </div>
      )}

      {reviews.map((r) => {
        const reviewerName = r.reviewer?.displayName || r.reviewer?.name || 'Anonymous User';
        const reviewerAvatar = r.reviewer?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}`;
        const isReporting = reportingId === (r.id || r._id);

        return (
          <div
            key={r.id || r._id}
            style={{
              background: 'var(--color-background-primary, #1e293b)',
              padding: 16,
              borderRadius: 12,
              border: '1px solid var(--color-border-tertiary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img
                  src={reviewerAvatar}
                  alt={reviewerName}
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{reviewerName}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      fill={s <= r.rating ? '#f59e0b' : 'none'}
                      color={s <= r.rating ? '#f59e0b' : 'var(--color-text-secondary)'}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setReportingId(isReporting ? null : (r.id || r._id))}
                  title="Report review"
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                >
                  <Flag size={14} />
                </button>
              </div>
            </div>

            {r.title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.title}</div>}
            {r.comment && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>{r.comment}</p>}

            {isReporting && (
              <div style={{ marginTop: 12, padding: 10, background: 'var(--color-background-secondary)', borderRadius: 8 }}>
                <input
                  type="text"
                  placeholder="Reason for reporting this review..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border-tertiary)',
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                />
                <button
                  onClick={() => handleReport(r.id || r._id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Submit Report
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
