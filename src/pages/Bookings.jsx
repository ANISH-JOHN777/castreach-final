import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Video, ArrowRight, ShieldCheck } from 'lucide-react';
import { useBookings } from '../hooks/useBooking';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLOR = {
  pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  confirmed: { bg: 'rgba(37, 99, 235, 0.15)', color: '#60a5fa', border: 'rgba(37, 99, 235, 0.3)' },
  completed: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  disputed: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
};

export default function Bookings() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const { bookings, loading, error } = useBookings(filter);

  return (
    <div className="fade-in" style={{ maxWidth: 960, margin: '0 auto', color: '#f3f4f6' }}>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Podcast Bookings & Sessions</h1>
          <p style={{ color: '#9ca3af', fontSize: 13.5 }}>Manage scheduled recordings, escrow status, and enter recording rooms</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/discover?tab=hosts')}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '9px 18px',
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Book New Session <ArrowRight size={14} />
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#16171d', padding: 4, borderRadius: 14, width: 'fit-content', border: '1px solid #23252e' }}>
        {STATUS_TABS.map(({ value, label }) => {
          const isActive = filter === value;
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: isActive ? '#2563eb' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? '#ffffff' : '#9ca3af',
                borderRadius: 10,
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: 12, color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : bookings.length === 0 ? (
        <Empty filter={filter} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {bookings.map((b) => (
            <BookingRow key={b._id} booking={b} onClick={() => navigate(`/bookings/${b._id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking, onClick }) {
  const s = STATUS_COLOR[booking.status] || STATUS_COLOR.pending;
  const start = new Date(booking.slotStart);
  const navigate = useNavigate();

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: '#16171d',
        border: '1px solid #23252e',
        borderRadius: 16,
        padding: '16px 20px',
        cursor: 'pointer',
        transition: 'transform 0.2s, background 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#1a1c24';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#16171d';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Date block */}
      <div style={{ width: 50, textAlign: 'center', flexShrink: 0, background: '#20222c', padding: '8px 4px', borderRadius: 12 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>
          {start.toLocaleString('default', { month: 'short' })}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: '#f3f4f6' }}>{start.getDate()}</div>
      </div>

      <div style={{ width: 1, height: 42, background: '#23252e' }} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4, color: '#f3f4f6' }}>
          Session with {booking.host?.name || 'Host'} &amp; {booking.guest?.name || 'Guest'}
        </div>
        <div style={{ fontSize: 12.5, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>•</span>
          <span>{booking.topics?.slice(0, 2).join(', ') || 'Podcast Collaboration'}</span>
        </div>
      </div>

      {/* Action / Recording Room Shortcut */}
      {booking.status === 'confirmed' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/bookings/${booking._id}/record`);
          }}
          style={{
            background: 'rgba(37, 99, 235, 0.2)',
            color: '#60a5fa',
            border: '1px solid rgba(37, 99, 235, 0.4)',
            padding: '6px 14px',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Video size={13} /> Enter Studio
        </button>
      )}

      {/* Status badge */}
      <span
        style={{
          padding: '5px 12px',
          borderRadius: 20,
          fontSize: 11.5,
          fontWeight: 700,
          background: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
          flexShrink: 0,
          textTransform: 'capitalize',
        }}
      >
        {booking.status}
      </span>

      <ChevronRight size={16} color="#6b7280" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '16px 20px', background: '#16171d', border: '1px solid #23252e', borderRadius: 16 }}>
      <div style={{ width: 50, height: 46, borderRadius: 12, background: '#20222c' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 16, width: '45%', borderRadius: 4, background: '#20222c', marginBottom: 8 }} />
        <div style={{ height: 12, width: '30%', borderRadius: 4, background: '#20222c' }} />
      </div>
    </div>
  );
}

function Empty({ filter }) {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', background: '#16171d', borderRadius: 20, border: '1px solid #23252e' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <Calendar size={48} color="#3b82f6" />
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: '#f3f4f6' }}>
        No {filter || ''} bookings found
      </h3>
      <p style={{ fontSize: 13.5, color: '#9ca3af', marginBottom: 20 }}>
        Browse verified podcast hosts and guests to schedule your next studio recording session.
      </p>
      <button
        type="button"
        onClick={() => navigate('/discover?tab=hosts')}
        style={{
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          padding: '10px 22px',
          borderRadius: 9999,
          fontSize: 13.5,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Discover Hosts & Guests
      </button>
    </div>
  );
}
