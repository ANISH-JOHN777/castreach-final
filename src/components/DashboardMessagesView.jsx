import { useState, useEffect } from 'react';
import { Search, Calendar, MessageSquare, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BookingChatThread from './BookingChatThread';

export default function DashboardMessagesView({ bookings = [], initialBookingId, onBookingCreated }) {
  const { user } = useAuth();
  const [selectedBookingId, setSelectedBookingId] = useState(initialBookingId || (bookings.length > 0 ? bookings[0]._id : null));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialBookingId) {
      setSelectedBookingId(initialBookingId);
    } else if (!selectedBookingId && bookings.length > 0) {
      setSelectedBookingId(bookings[0]._id);
    }
  }, [initialBookingId, bookings]);

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

  if (bookings.length === 0) {
    return (
      <div style={{
        backgroundColor: '#0A0A0A',
        borderRadius: 16,
        border: '1px dashed rgba(255, 255, 255, 0.12)',
        padding: '56px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'rgba(168, 85, 247, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}>
          <MessageSquare size={26} color="#A855F7" />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 750, color: '#FFFFFF', marginBottom: 6 }}>
          No Messages Yet
        </h3>
        <p style={{ fontSize: 13, color: '#888888', maxWidth: 420, margin: '0 auto 18px', lineHeight: 1.5 }}>
          You have no active podcast booking conversations. Messages are created automatically when you request or confirm an interview session.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 340px) 1fr',
      height: 640,
      background: '#0A0A0A',
      borderRadius: 16,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
      overflow: 'hidden',
    }}>
      {/* ── LEFT: CONVERSATIONS LIST ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#000000',
      }}>
        {/* Search Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#0A0A0A',
            borderRadius: 8,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <Search size={14} color="#A39EA9" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 12.5,
                width: '100%',
                color: '#FFFFFF',
              }}
            />
          </div>
        </div>

        {/* Conversation Items */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(() => {
            const sortedBookings = [...filteredBookings].sort((a, b) => {
              const dateA = new Date(a.createdAt || a.slotStart).getTime();
              const dateB = new Date(b.createdAt || b.slotStart).getTime();
              return dateB - dateA;
            });

            if (sortedBookings.length === 0) {
              return (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#A39EA9' }}>
                  No matching conversations found
                </div>
              );
            }

            return sortedBookings.map((b) => {
              const isHost = (b.host?._id || b.host)?.toString() === (user?._id || user?.id)?.toString();
              const otherUser = isHost ? b.guest : b.host;
              const isSelected = activeBooking && activeBooking._id === b._id;
              const slotDate = b.slotStart ? new Date(b.slotStart) : null;

              return (
                <div
                  key={b._id}
                  onClick={() => setSelectedBookingId(b._id)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                    borderLeft: isSelected ? '4px solid #A855F7' : '4px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: isSelected ? 750 : 600, color: '#FFFFFF' }}>
                      {otherUser?.name || (isHost ? 'Guest Participant' : 'Host')}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                      textTransform: 'capitalize',
                      background: b.status === 'confirmed' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: b.status === 'confirmed' ? '#22C55E' : '#F59E0B',
                      border: `1px solid ${b.status === 'confirmed' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    }}>
                      {b.status}
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, color: '#A39EA9', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isHost ? `Guest · ${b.guest?.name || 'Guest'}` : `Host · ${b.host?.podcastName || b.host?.name || 'Host'}`}
                    {b.topics?.[0] ? ` — "${b.topics[0]}"` : ''}
                  </div>

                  {slotDate && (
                    <div style={{ fontSize: 10.5, color: '#6F6A76', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} />
                      {slotDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ── RIGHT: ACTIVE CHAT THREAD ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: '#0A0A0A',
      }}>
        {activeBooking ? (
          <BookingChatThread
            bookingId={activeBooking._id}
            booking={activeBooking}
            onBookingCreated={onBookingCreated}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888888', fontSize: 13 }}>
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
