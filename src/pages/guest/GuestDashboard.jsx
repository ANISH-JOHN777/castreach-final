import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Calendar, ArrowRight, Radio, MessageSquare, CheckCircle, Video, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function GuestDashboard() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/bookings?limit=5')
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authFetch]);

  const profileCompletion = user?.bio && user?.expertise?.length ? 100 : 75;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 960, margin: '0 auto', color: '#f3f4f6' }} className="fade-in">
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
          color: '#fff',
          borderRadius: 24,
          padding: '36px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 16px 36px rgba(37, 99, 235, 0.35)',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            <Mic size={13} /> GUEST CREATOR PORTAL
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 12, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Good day, {user?.name || 'Creator'}!
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14.5, maxWidth: 520 }}>
            Ready for your next podcast appearance? Explore verified show hosts and manage your upcoming interview sessions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/discover?tab=hosts')}
          style={{
            background: '#ffffff',
            color: '#0f1013',
            padding: '12px 24px',
            borderRadius: 9999,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Users size={16} /> Explore Podcast Hosts
        </button>
      </div>

      {/* Profile & Session Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Profile Readiness */}
        <div style={{ background: '#16171d', padding: 24, borderRadius: 20, border: '1px solid #23252e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>Profile Readiness</h3>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>{profileCompletion}%</span>
          </div>

          <div style={{ height: 8, background: '#23252e', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ width: `${profileCompletion}%`, height: '100%', background: '#3b82f6', borderRadius: 4 }} />
          </div>

          <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginBottom: 16 }}>
            {profileCompletion === 100
              ? 'Your speaker profile and expertise tags are fully optimized for podcast host discovery!'
              : 'Add your latest expertise tags and speaking bio to maximize booking requests from top hosts.'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/settings')}
            style={{
              background: '#23252e',
              color: '#f3f4f6',
              border: '1px solid #2e303d',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Edit Speaker Profile
          </button>
        </div>

        {/* Quick Booking Summary */}
        <div style={{ background: '#16171d', padding: 24, borderRadius: 20, border: '1px solid #23252e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>Upcoming Bookings</h3>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{bookings.length} Total</span>
          </div>

          {bookings.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 10 }}>
              No booked sessions yet. Find hosts in Discover to schedule your first guest appearance.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookings.slice(0, 2).map((b) => (
                <div
                  key={b._id}
                  onClick={() => navigate(`/bookings/${b._id}`)}
                  style={{
                    background: '#1d1f27',
                    padding: '12px 14px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <h5 style={{ fontSize: 13.5, fontWeight: 600, color: '#f3f4f6' }}>
                      {b.host?.name || 'Show Host'}
                    </h5>
                    <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
                      {new Date(b.slotStart).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: b.status === 'confirmed' ? '#34d399' : '#fbbf24',
                      textTransform: 'capitalize',
                    }}
                  >
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/bookings')}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: 18,
            }}
          >
            View All Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
