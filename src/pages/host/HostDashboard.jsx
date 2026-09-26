import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Headphones, ArrowRight, Star, Radio, Video, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RecommendedGuests from '../../components/RecommendedGuests';

export default function HostDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bookings?limit=10', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then((res) => res.ok ? res.json() : { bookings: [] })
      .then((data) => { setBookings(data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const confirmedSessions = bookings.filter((b) => b.status === 'confirmed');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} className="fade-in">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--plum-deep) 0%, #4D3354 50%, var(--plum-primary) 100%)',
        color: '#fff',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 32px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: 'var(--shadow-plum)',
      }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: 'var(--lavender-soft)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            <Headphones size={14} /> HOST PRODUCTION CENTER
          </span>
          <h1 style={{ fontSize: 32, color: '#fff', marginTop: 12, marginBottom: 8 }}>
            Welcome, Host {user?.name || ''}!
          </h1>
          <p style={{ color: 'var(--lavender-soft)', fontSize: 15, maxWidth: 540 }}>
            Manage guest booking requests, authorize escrow payments, launch WebRTC studio rooms, and recompute host response metrics.
          </p>
        </div>

        <button
          onClick={() => navigate('/discover')}
          style={{
            background: 'var(--cream-warm)',
            color: 'var(--plum-deep)',
            padding: '14px 26px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 800,
            fontSize: 15,
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Find Podcast Guests <ArrowRight size={18} />
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
            Pending Requests
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--plum-deep)' }}>
            {pendingRequests.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--plum-primary)', marginTop: 4 }}>Awaiting your confirmation</div>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
            Confirmed Studio Sessions
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--plum-deep)' }}>
            {confirmedSessions.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4 }}>Ready for WebRTC Studio</div>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
            Stripe Escrow Status
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)' }}>
            Funds Protected
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Released upon completion</div>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
            Host Rating Metric
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--plum-deep)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {user?.avgRating ? user.avgRating.toFixed(1) : '5.0'} <Star size={24} fill="currentColor" color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Based on verified reviews</div>
        </div>
      </div>

      {/* Featured Next Studio Session */}
      {confirmedSessions.length > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          padding: 28,
          border: '2px solid var(--purple-castreach)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              <Radio size={14} color="var(--color-success)" /> UPCOMING RECORDING SESSION
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={14} /> Daily.co HD WebRTC Active
            </span>
          </div>
          <h3 style={{ fontSize: 22, marginBottom: 8 }}>
            Guest: {confirmedSessions[0].guest?.name || 'Guest Creator'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Scheduled Slot: <b>{new Date(confirmedSessions[0].slotStart).toLocaleString()}</b>
          </p>
          <button
            onClick={() => navigate(`/bookings/${confirmedSessions[0]._id}`)}
            style={{
              background: 'linear-gradient(135deg, var(--plum-deep), var(--plum-primary))',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: 14,
              boxShadow: 'var(--shadow-plum)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Launch Production Studio <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Pending Requests Table */}
      <div style={{ background: '#fff', padding: 28, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20 }}>Guest Booking Requests</h2>
          <Link to="/bookings" style={{ color: 'var(--plum-primary)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
            View All Bookings <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 100 }} />
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--cream-warm)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No booking requests currently pending.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.map((b) => (
              <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'var(--lavender-mist)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--plum-deep)' }}>
                    Guest: {b.guest?.name || 'Guest User'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} /> Slot: {new Date(b.slotStart).toLocaleString()} • Amount: ${((b.amountCents || 0) / 100).toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => navigate(`/bookings/${b._id}`)}
                    style={{ background: 'var(--plum-primary)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600 }}
                  >
                    Open Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Guests Matchmaking */}
      <RecommendedGuests />
    </div>
  );
}
