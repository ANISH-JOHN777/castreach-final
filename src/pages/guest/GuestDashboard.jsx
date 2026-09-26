import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Calendar, ArrowRight, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RecommendedGuests from '../../components/RecommendedGuests';

export default function GuestDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bookings?limit=5', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then((res) => res.ok ? res.json() : { bookings: [] })
      .then((data) => { setBookings(data.bookings || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const profileCompletion = user?.bio && user?.expertise?.length ? 100 : 75;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} className="fade-in">
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--plum-deep) 0%, var(--plum-primary) 100%)',
        color: '#fff',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: 'var(--shadow-md)',
      }}>
        <div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: 'var(--lavender-soft)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            <Mic size={14} /> GUEST CREATOR PORTAL
          </span>
          <h1 style={{ fontSize: 32, color: '#fff', marginTop: 12, marginBottom: 8 }}>
            Good day, {user?.name || 'Creator'}!
          </h1>
          <p style={{ color: 'var(--lavender-soft)', fontSize: 15, maxWidth: 520 }}>
            Ready for your next podcast appearance? Explore verified show hosts and manage your upcoming interview sessions.
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
          Explore Show Hosts <ArrowRight size={18} />
        </button>
      </div>

      {/* Grid Layout: Profile Completion Meter + Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {/* Profile Completion Meter */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--plum-deep)' }}>Profile Completion</span>
            <span style={{ fontWeight: 800, color: 'var(--plum-primary)' }}>{profileCompletion}%</span>
          </div>
          <div style={{ width: '100%', height: 10, background: 'var(--lavender-mist)', borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ width: `${profileCompletion}%`, height: '100%', background: 'linear-gradient(90deg, var(--plum-primary), var(--purple-castreach))', borderRadius: 5 }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Complete your podcast topics & biography to increase booking requests by 3x.
          </p>
        </div>

        {/* Guest Stats Cards */}
        <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--lavender-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--plum-primary)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Bookings</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--plum-deep)' }}>
              {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: 24, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--lavender-mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
            <Radio size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Recorded Episodes</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--plum-deep)' }}>
              {bookings.filter(b => b.status === 'completed').length}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions Timeline */}
      <div style={{ background: '#fff', padding: 28, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20 }}>Upcoming Podcast Appearances</h2>
          <Link to="/bookings" style={{ color: 'var(--plum-primary)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>View All <ArrowRight size={16} /></Link>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 80 }} />
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--cream-warm)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
            <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, marginBottom: 6 }}>No upcoming bookings yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Your scheduled podcast interview sessions will appear right here.
            </p>
            <button onClick={() => navigate('/discover')} style={{ background: 'var(--plum-primary)', color: '#fff', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 14 }}>
              Discover Show Hosts
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bookings.map((b) => (
              <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: 'var(--lavender-mist)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--plum-deep)', fontSize: 15 }}>Show: {b.host?.podcastName || b.host?.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} /> {new Date(b.slotStart).toLocaleString()} • Status: <span style={{ fontWeight: 700, color: 'var(--plum-primary)' }}>{b.status.toUpperCase()}</span>
                  </div>
                </div>
                <button onClick={() => navigate(`/bookings/${b._id}`)} style={{ background: 'var(--plum-deep)', color: '#fff', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600 }}>
                  Open Workspace
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matchmaking Component */}
      <RecommendedGuests />
    </div>
  );
}
