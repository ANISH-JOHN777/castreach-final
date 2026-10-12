import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Headphones, ArrowRight, Star, Radio, Video, Calendar, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RecommendedGuests from '../../components/RecommendedGuests';

export default function HostDashboard() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/bookings?limit=10')
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [authFetch]);

  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const confirmedSessions = bookings.filter((b) => b.status === 'confirmed');

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
            <Headphones size={13} /> HOST PRODUCTION CENTER
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 12, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Welcome, Host {user?.name || ''}!
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14.5, maxWidth: 540 }}>
            Manage guest booking requests, authorize escrow payments, launch WebRTC studio rooms, and distribute published episodes.
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
          <Users size={16} /> Find Podcast Guests
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
        <div style={{ background: '#16171d', padding: 22, borderRadius: 18, border: '1px solid #23252e' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            Pending Requests
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f3f4f6' }}>
            {pendingRequests.length}
          </div>
          <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 4 }}>Awaiting confirmation</div>
        </div>

        <div style={{ background: '#16171d', padding: 22, borderRadius: 18, border: '1px solid #23252e' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            Confirmed Sessions
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f3f4f6' }}>
            {confirmedSessions.length}
          </div>
          <div style={{ fontSize: 12, color: '#34d399', marginTop: 4 }}>Ready for WebRTC Studio</div>
        </div>

        <div style={{ background: '#16171d', padding: 22, borderRadius: 18, border: '1px solid #23252e' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            Stripe Escrow Status
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399', marginTop: 6, marginBottom: 2 }}>
            Protected
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Released upon completion</div>
        </div>

        <div style={{ background: '#16171d', padding: 22, borderRadius: 18, border: '1px solid #23252e' }}>
          <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
            Host Rating
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
            {user?.avgRating ? user.avgRating.toFixed(1) : '5.0'} <Star size={20} fill="#f59e0b" color="#f59e0b" />
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Verified guest reviews</div>
        </div>
      </div>

      {/* Featured Next Studio Session */}
      {confirmedSessions.length > 0 && (
        <div
          style={{
            background: '#16171d',
            borderRadius: 20,
            padding: 24,
            border: '2px solid #2563eb',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <Radio size={12} /> UPCOMING RECORDING SESSION
            </span>
            <span style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Video size={14} color="#3b82f6" /> WebRTC 48kHz Active
            </span>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f3f4f6', marginBottom: 6 }}>
            Guest: {confirmedSessions[0].guest?.name || 'Guest Creator'}
          </h3>

          <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Scheduled Slot: <b>{new Date(confirmedSessions[0].slotStart).toLocaleString()}</b>
          </p>

          <button
            type="button"
            onClick={() => navigate(`/bookings/${confirmedSessions[0]._id}/record`)}
            style={{
              background: '#2563eb',
              color: '#fff',
              padding: '11px 22px',
              borderRadius: 9999,
              fontWeight: 700,
              fontSize: 13.5,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            }}
          >
            Launch Production Studio <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Recommended Guests Widget */}
      <RecommendedGuests />
    </div>
  );
}
