import { useState } from 'react';
import { Star, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReviewForm({ bookingId, onSuccess }) {
  const { authFetch } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }

    setLoading(true);

    try {
      const res = await authFetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          rating: Number(rating),
          title: title.trim(),
          comment: comment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      if (onSuccess) onSuccess(data.review);
    } catch (err) {
      setError(err.message || 'An error occurred submitting your review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--color-background-secondary, #0f172a)', padding: 20, borderRadius: 12, border: '1px solid var(--color-border-tertiary)' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Leave a Review</h3>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: 13, marginBottom: 12 }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Star Rating Picker */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Rating</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const active = (hoverRating || rating) >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  color: active ? '#f59e0b' : 'var(--color-text-secondary)',
                  transition: 'transform 0.1s',
                }}
              >
                <Star size={24} fill={active ? '#f59e0b' : 'none'} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Headline / Summary (e.g. Great guest, very knowledgeable!)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border-tertiary)',
            background: 'var(--color-background-primary, #1e293b)',
            color: 'var(--color-text-primary, #f8fafc)',
            fontSize: 14,
          }}
        />
      </div>

      {/* Comment */}
      <div style={{ marginBottom: 16 }}>
        <textarea
          placeholder="Write your feedback..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--color-border-tertiary)',
            background: 'var(--color-background-primary, #1e293b)',
            color: 'var(--color-text-primary, #f8fafc)',
            fontSize: 14,
            resize: 'vertical',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 8,
          background: 'var(--color-primary, #6366f1)',
          color: '#fff',
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        <Send size={16} />
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
