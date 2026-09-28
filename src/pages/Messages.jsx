import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Calendar, User, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBookings } from '../hooks/useBooking';
import BookingChatThread from '../components/BookingChatThread';

export default function Messages() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { bookings, loading, error, refetch } = useBookings('');
  
  const [selectedBookingId, setSelectedBookingId] = useState(bookingId || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state if URL param changes
  useEffect(() => {
    if (bookingId) {
      setSelectedBookingId(bookingId);
    } else if (bookings.length > 0 && !selectedBookingId) {
      setSelectedBookingId(bookings[0]._id);
    }
  }, [bookingId, bookings]);

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const hostName = b.host?.name?.toLowerCase() || '';
    const guestName = b.guest?.name?.toLowerCase() || '';
    const podcastName = b.host?.podcastName?.toLowerCase() || '';
    const topics = b.topics?.join(' ')?.toLowerCase() || '';
    return hostName.includes(query) || guestName.includes(query) || podcastName.includes(query) || topics.includes(query);
  });

  const activeBooking = bookings.find((b) => b._id === selectedBookingId) || (bookings.length > 0 ? bookings[0] : null);

  const handleSelectBooking = (id) => {
    setSelectedBookingId(id);
    navigate(`/messages/${id}`, { replace: true });
  };

  const handleBookingCreated = (newBooking) => {
    refetch();
    if (newBooking?._id) {
      setSelectedBookingId(newBooking._id);
      navigate(`/messages/${newBooking._id}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ height: 28, width: 200, background: 'var(--color-border-primary)', borderRadius: 6, marginBottom: 20 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, height: 600 }}>
          <div style={{ background: 'var(--white-pure)', borderRadius: 14, border: '1px solid var(--border-subtle)', opacity: 0.7 }} />
          <div style={{ background: 'var(--white-pure)', borderRadius: 14, border: '1px solid var(--border-subtle)', opacity: 0.7 }} />
        </div>
      </div>
    );
  }

  if (error || !user) {
    const isUnauth = !user || (typeof error === 'string' && (error.includes('401') || error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('token')));
    return (
      <div style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', padding: 24, borderRadius: 16, textAlign: 'center', maxWidth: 440, border: '1px solid var(--border-subtle)' }}>
          <AlertCircle size={36} style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--color-error)' }}>
            {isUnauth ? 'Authentication Required' : 'Unable to Load Conversations'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
            {isUnauth ? 'Please log in to view your messages and podcast booking conversations.' : error}
          </p>
          {isUnauth ? (
            <button onClick={() => navigate('/login')} style={primaryBtnStyle}>
              Log In
            </button>
          ) : (
            <button onClick={refetch} style={primaryBtnStyle}>
              <RefreshCw size={16} /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--plum-deep)', margin: 0 }}>Messages &amp; Conversations</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Real-time messaging threads for all your studio sessions and bookings
        </p>
      </div>

      {bookings.length === 0 ? (
        <div style={emptyContainerStyle}>
          <MessageSquare size={48} color="var(--plum-primary)" style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--plum-deep)', marginBottom: 8 }}>No Messages Yet</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 420, marginBottom: 20 }}>
            You haven't requested or confirmed any podcast sessions yet. Conversations are created automatically for each booking session.
          </p>
          <button onClick={() => navigate('/discover')} style={primaryBtnStyle}>
            Discover Hosts &amp; Creators
          </button>
        </div>
      ) : (
        <div style={workspaceStyle}>
          {/* Left: Conversations List */}
          <div style={sidebarStyle}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={searchContainerStyle}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search conversations…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={searchInputStyle}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {(() => {
                const sortedBookings = [...filteredBookings].sort((a, b) => {
                  const dateA = new Date(a.createdAt || a.slotStart).getTime();
                  const dateB = new Date(b.createdAt || b.slotStart).getTime();
                  return dateB - dateA;
                });

                const groupedConversations = [];
                const seenUserIds = new Set();

                for (const b of sortedBookings) {
                  const isHost = b.host?._id === user?._id || b.host?.toString() === user?._id;
                  const otherUser = isHost ? b.guest : b.host;
                  const otherUserId = otherUser?._id || otherUser?.toString() || b._id;

                  if (!seenUserIds.has(otherUserId)) {
                    seenUserIds.add(otherUserId);
                    groupedConversations.push({
                      counterpartId: otherUserId,
                      otherUser,
                      isHost,
                      booking: b,
                    });
                  }
                }

                if (groupedConversations.length === 0) {
                  return (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                      No matching conversations found
                    </div>
                  );
                }

                return groupedConversations.map(({ counterpartId, otherUser, isHost, booking: b }) => {
                  const isSelected = activeBooking && (
                    (activeBooking.host?._id || activeBooking.host) === counterpartId ||
                    (activeBooking.guest?._id || activeBooking.guest) === counterpartId ||
                    activeBooking._id === b._id
                  );
                  const slotDate = b.slotStart ? new Date(b.slotStart) : null;

                  return (
                    <div
                      key={b._id}
                      onClick={() => handleSelectBooking(b._id)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--lavender-mist)' : 'transparent',
                        borderLeft: isSelected ? '4px solid var(--plum-primary)' : '4px solid transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 600, color: 'var(--plum-deep)' }}>
                          {otherUser?.name || 'Participant'}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          textTransform: 'capitalize',
                          background: b.status === 'confirmed' ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                          color: b.status === 'confirmed' ? 'var(--color-success)' : 'var(--color-warning)',
                        }}>
                          {b.status}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isHost ? `Guest · ${b.guest?.name || 'Guest User'}` : `Host · ${b.host?.podcastName || b.host?.name || 'Host'}`}
                      </div>

                      {slotDate && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={12} />
                          {slotDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right: Active Chat Thread View */}
          <div style={chatContainerStyle}>
            {activeBooking ? (
              <BookingChatThread bookingId={activeBooking._id} booking={activeBooking} onBookingCreated={handleBookingCreated} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                Select a conversation from the sidebar
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// STYLES
// ---------------------------------------------------------
const containerStyle = {
  padding: '24px 20px',
  maxWidth: 1280,
  margin: '0 auto',
};

const workspaceStyle = {
  display: 'grid',
  gridTemplateColumns: '320px 1fr',
  height: 650,
  background: 'var(--white-pure)',
  borderRadius: 14,
  border: '1px solid var(--border-subtle)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
};

const sidebarStyle = {
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid var(--border-subtle)',
  background: 'var(--white-pure)',
};

const chatContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
};

const searchContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  background: 'var(--cream-warm)',
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
};

const searchInputStyle = {
  border: 'none',
  background: 'transparent',
  outline: 'none',
  fontSize: 13,
  width: '100%',
  color: 'var(--plum-deep)',
};

const emptyContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 20px',
  textAlign: 'center',
  background: 'var(--white-pure)',
  borderRadius: 14,
  border: '1px dashed var(--border-subtle)',
};

const primaryBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  background: 'var(--plum-deep)',
  color: '#fff',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
};
