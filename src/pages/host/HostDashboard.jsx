import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Headphones, 
  ArrowRight, 
  Video, 
  Calendar, 
  MessageSquare, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X,
  MapPin,
  Scissors
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import SettlePaymentModal from '../../components/SettlePaymentModal';
import RecordingEditorModal from '../../components/RecordingEditorModal';
import DashboardMessagesView from '../../components/DashboardMessagesView';
import SessionCompletionBanner from '../../components/SessionCompletionBanner';
import NewMessageToast from '../../components/NewMessageToast';

export default function HostDashboard() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [selectedChatBookingId, setSelectedChatBookingId] = useState(searchParams.get('booking') || null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [activeSettleBooking, setActiveSettleBooking] = useState(null);
  const [activeEditBooking, setActiveEditBooking] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchBookings = () => {
    setLoading(true);
    authFetch('/bookings?limit=30')
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => {
        setBookings(data.bookings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, [authFetch]);

  // Sync tab & booking from query params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    const bookingParam = searchParams.get('booking');
    if (bookingParam) {
      setSelectedChatBookingId(bookingParam);
    }
  }, [searchParams]);

  // Auto-open settlement modal if redirected with ?settle=<bookingId>
  useEffect(() => {
    const settleId = searchParams.get('settle');
    if (settleId && bookings.length > 0) {
      const target = bookings.find((b) => b._id === settleId);
      if (target) {
        setActiveSettleBooking(target);
      }
    }
  }, [searchParams, bookings]);

  // Handle Host accepting Guest's newly proposed availability date
  const handleAcceptProposedDate = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      const res = await authFetch(`/bookings/${bookingId}/accept-proposed-date`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept proposed date');

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? data.booking : b))
      );
      triggerToast('Accepted guest proposed date. Session is confirmed.');
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Host cancelling a pending booking request
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Cancel this pending invitation? Held escrow funds will be refunded.')) return;
    setActionLoadingId(bookingId);
    try {
      const res = await authFetch(`/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? (data.booking || { ...b, status: 'cancelled' }) : b))
      );
      triggerToast('Booking invitation cancelled.');
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Host marking podcast completed -> Releases Escrow Payment to Guest
  const handleMarkCompleted = async (bookingId, amountCents) => {
    if (!window.confirm('Mark this podcast session as completed? Held escrow funds will be immediately released to the guest.')) {
      return;
    }
    setActionLoadingId(bookingId);
    try {
      const res = await authFetch(`/bookings/${bookingId}/complete`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete podcast session');

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? data.booking : b))
      );
      const formattedAmount = amountCents ? `$${(amountCents / 100).toFixed(2)}` : '$0.00';
      triggerToast(`Podcast completed. Escrow payout of ${formattedAmount} released to guest.`);
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics
  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const confirmedSessions = bookings.filter((b) => b.status === 'confirmed');
  const completedSessions = bookings.filter((b) => b.status === 'completed');
  
  const escrowInTransit = bookings
    .filter((b) => ['held', 'release_pending'].includes(b.paymentStatus))
    .reduce((sum, b) => sum + (b.amountCents || 0), 0);

  const totalPaidToGuests = completedSessions
    .filter((b) => b.paymentStatus === 'released')
    .reduce((sum, b) => sum + (b.amountCents || 0), 0);

  // Filtered list
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'action') {
      return (b.proposedSlotStart && b.proposedBy === 'guest') || b.status === 'pending';
    }
    if (activeTab === 'confirmed') return b.status === 'confirmed';
    if (activeTab === 'completed') return b.status === 'completed';
    return true;
  });

  return (
    <div style={{
      backgroundColor: '#000000',
      minHeight: '100vh',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* ── 1. NAVBAR (Discover guests, Dashboard, Listen, Profile) ── */}
      <Navbar />

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 86,
          right: 28,
          zIndex: 9999,
          background: '#111111',
          border: '1px solid #22C55E',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 12,
          fontSize: 13.5,
          fontWeight: 650,
          boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <CheckCircle2 size={18} color="#22C55E" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── 2. MINIMAL DASHBOARD CONTAINER ── */}
      <main style={{
        maxWidth: 1360,
        width: '100%',
        margin: '0 auto',
        padding: '36px clamp(20px, 4vw, 56px) 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        boxSizing: 'border-box',
      }}>
        {/* Minimal Hero Header Banner */}
        <div style={{
          background: '#0A0A0A',
          borderRadius: 18,
          padding: '32px clamp(24px, 4vw, 40px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 24,
        }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              <Headphones size={13} /> HOST STUDIO &amp; ESCROW
            </div>
            <h1 style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#FFFFFF',
              margin: '0 0 8px 0',
              lineHeight: 1.15,
            }}>
              Welcome back, {user?.name || 'Host'}
            </h1>
            <p style={{
              color: '#888888',
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}>
              {user?.podcastName ? `Managing "${user.podcastName}" · ` : ''}
              Invite expert guest speakers, manage recording schedules, and hold session fees safely in CastReach Escrow until show wrap.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/find-guests')}
              style={{
                background: '#FFFFFF',
                color: '#000000',
                padding: '11px 22px',
                borderRadius: 9999,
                fontWeight: 750,
                fontSize: 13.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>Discover Guests</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* ── 3. MINIMAL METRICS GRID ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}>
          <div style={{
            background: '#0A0A0A',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Escrow Held In Safety
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>
              ${(escrowInTransit / 100).toFixed(2)}
            </div>
            <div style={{ fontSize: 11.5, color: '#22C55E', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={13} color="#22C55E" /> Disbursed upon episode wrap
            </div>
          </div>

          <div style={{
            background: '#0A0A0A',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Pending Guest Invites
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: pendingRequests.length > 0 ? '#FFFFFF' : '#888888' }}>
              {pendingRequests.length}
            </div>
            <div style={{ fontSize: 11.5, color: '#888888', marginTop: 4 }}>
              Awaiting guest confirmation
            </div>
          </div>

          <div style={{
            background: '#0A0A0A',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Confirmed Scheduled Shows
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>
              {confirmedSessions.length}
            </div>
            <div style={{ fontSize: 11.5, color: '#888888', marginTop: 4 }}>
              Ready for recording
            </div>
          </div>

          <div style={{
            background: '#0A0A0A',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Total Paid to Guests
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>
              ${(totalPaidToGuests / 100).toFixed(2)}
            </div>
            <div style={{ fontSize: 11.5, color: '#22C55E', marginTop: 4 }}>
              Completed &amp; disbursed
            </div>
          </div>
        </div>

        {/* ── 3.5 POST-SESSION COMPLETION & ESCROW SETTLEMENT PROMPT ── */}
        <SessionCompletionBanner bookings={bookings} onSettled={fetchBookings} />

        {/* ── 4. SESSIONS & GUEST INVITATIONS ── */}
        <section style={{
          background: '#0A0A0A',
          borderRadius: 18,
          padding: '24px clamp(18px, 3.5vw, 32px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          {/* Header & Filter Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 20,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            paddingBottom: 16,
          }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 750, color: '#FFFFFF', margin: 0 }}>
                {activeTab === 'messages' ? 'Direct Messages & Guest Chats' : 'Podcast Guest Sessions & Invites'}
              </h2>
              <p style={{ fontSize: 12.5, color: '#888888', margin: '3px 0 0 0' }}>
                {activeTab === 'messages' 
                  ? 'Real-time booking communication, prep notes, and coordination with your guests.' 
                  : 'Track interview bookings, guest proposals, and disburse honorariums upon completion.'}
              </p>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${bookings.length})` },
                { id: 'messages', label: `Messages 💬 (${bookings.length})` },
                { id: 'action', label: `Pending & Counter-Offers (${pendingRequests.length})` },
                { id: 'confirmed', label: `Confirmed (${confirmedSessions.length})` },
                { id: 'completed', label: `Completed (${completedSessions.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    cursor: 'pointer',
                    background: activeTab === tab.id ? '#FFFFFF' : '#141414',
                    color: activeTab === tab.id ? '#000000' : '#888888',
                    border: '1px solid ' + (activeTab === tab.id ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)'),
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages View Tab */}
          {activeTab === 'messages' ? (
            <DashboardMessagesView
              bookings={bookings}
              initialBookingId={selectedChatBookingId}
              onBookingCreated={fetchBookings}
            />
          ) : loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#888888', fontSize: 13 }}>
              Loading guest sessions…
            </div>
          ) : filteredBookings.length === 0 ? (
            <div style={{
              padding: '50px 20px',
              textAlign: 'center',
              backgroundColor: '#0D0D0D',
              borderRadius: 14,
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}>
              <Calendar size={32} color="#555555" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                No bookings in this tab
              </h3>
              <p style={{ fontSize: 12.5, color: '#888888', maxWidth: 420, margin: '0 auto 16px' }}>
                You haven't invited any guests yet or no sessions match this tab. Discover authentic voices in the directory.
              </p>
              <button
                type="button"
                onClick={() => navigate('/find-guests')}
                style={{
                  background: '#FFFFFF',
                  color: '#000000',
                  padding: '8px 18px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 12.5,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>Discover &amp; Invite Guests</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredBookings.map((b) => {
                const guestName = b.guest?.name || 'Guest Creator';
                const guestAvatar = b.guest?.avatar || '';
                const guestExpertise = b.guest?.expertise?.slice(0, 2)?.join(', ') || 'Featured Speaker';
                const hasProposedDate = Boolean(b.proposedSlotStart && b.proposedBy === 'guest');
                const slotDate = new Date(b.slotStart);
                const formattedSlot = slotDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const proposedDate = b.proposedSlotStart ? new Date(b.proposedSlotStart) : null;
                const formattedProposal = proposedDate ? proposedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const amountFormatted = b.amountCents ? `$${(b.amountCents / 100).toFixed(2)}` : '$0.00';

                return (
                  <div
                    key={b._id}
                    style={{
                      backgroundColor: '#111111',
                      borderRadius: 14,
                      border: b.status === 'confirmed' 
                        ? '1px solid rgba(34, 197, 94, 0.4)' 
                        : b.status === 'cancelled'
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : hasProposedDate 
                            ? '1px solid #F59E0B' 
                            : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '18px clamp(16px, 3vw, 22px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    {/* Top Row: Guest Info & Escrow badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          backgroundColor: '#1A1A1A',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {guestAvatar ? (
                            <img src={guestAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Users size={20} color="#888888" />
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 750, color: '#FFFFFF' }}>
                              {guestName}
                            </span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: b.status === 'confirmed' 
                                ? 'rgba(34, 197, 94, 0.12)' 
                                : b.status === 'cancelled'
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : 'rgba(255, 255, 255, 0.08)',
                              color: b.status === 'confirmed' 
                                ? '#22C55E' 
                                : b.status === 'cancelled'
                                  ? '#EF4444'
                                  : '#CBD5E1',
                              border: `1px solid ${b.status === 'confirmed' ? 'rgba(34, 197, 94, 0.3)' : b.status === 'cancelled' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
                            }}>
                              {b.status}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#888888', marginTop: 2 }}>
                            {guestExpertise}
                          </div>
                        </div>
                      </div>

                      {/* Escrow badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '6px 12px',
                        borderRadius: 8,
                      }}>
                        <ShieldCheck size={15} color={b.paymentStatus === 'released' ? '#22C55E' : '#FFFFFF'} />
                        <div>
                          <div style={{ fontSize: 9.5, color: '#888888', textTransform: 'uppercase', fontWeight: 700 }}>
                            {b.paymentStatus === 'released' ? 'Payout Released' : 'CastReach Escrow'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 750, color: b.paymentStatus === 'released' ? '#22C55E' : '#FFFFFF' }}>
                            {amountFormatted}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Details: Scheduled Time, Format, Topic */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 10,
                      background: '#0D0D0D',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#CBD5E1' }}>
                        <Calendar size={14} color="#888888" />
                        <span><strong>Scheduled:</strong> {formattedSlot}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#CBD5E1' }}>
                        {b.meetingType === 'physical' ? <MapPin size={14} color="#F59E0B" /> : <Video size={14} color="#22C55E" />}
                        <span><strong>Format:</strong> {b.meetingType === 'physical' ? (b.physicalLocation?.address || 'Physical Studio') : 'Remote HD Studio'}</span>
                      </div>

                      {b.topics?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#CBD5E1' }}>
                          <Users size={14} color="#888888" />
                          <span><strong>Topic:</strong> {b.topics.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Counter Proposal Notification Banner if Guest Changed Date */}
                    {hasProposedDate && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 10,
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F59E0B', fontWeight: 700, fontSize: 12.5 }}>
                            <AlertCircle size={15} /> Guest Proposed New Availability Date
                          </div>
                          <div style={{ fontSize: 13, color: '#FFFFFF', marginTop: 3 }}>
                            <strong>New Proposed Slot:</strong> {formattedProposal}
                          </div>
                          {b.rescheduleNote && (
                            <div style={{ fontSize: 12, color: '#D1D5DB', marginTop: 2, fontStyle: 'italic' }}>
                              Guest Note: "{b.rescheduleNote}"
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={actionLoadingId === b._id}
                          onClick={() => handleAcceptProposedDate(b._id)}
                          style={{
                            background: '#22C55E',
                            color: '#000000',
                            padding: '7px 16px',
                            borderRadius: 9999,
                            fontWeight: 750,
                            fontSize: 12.5,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>{actionLoadingId === b._id ? 'Confirming…' : 'Accept New Date'}</span>
                        </button>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      paddingTop: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setActiveSettleBooking(b)}
                          style={{
                            fontSize: 12,
                            color: '#22C55E',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            padding: '5px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 700,
                          }}
                        >
                          <ShieldCheck size={13} color="#22C55E" /> Settle Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveEditBooking(b)}
                          style={{
                            fontSize: 12,
                            color: '#FFFFFF',
                            background: 'rgba(168, 85, 247, 0.12)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            padding: '5px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontWeight: 650,
                          }}
                        >
                          <Scissors size={12} color="#A855F7" /> Edit Clips
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChatBookingId(b._id);
                            setActiveTab('messages');
                          }}
                          style={{
                            fontSize: 12,
                            color: '#A855F7',
                            padding: '5px 12px',
                            borderRadius: 6,
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.28)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            cursor: 'pointer',
                            fontWeight: 650,
                          }}
                        >
                          <MessageSquare size={12} color="#A855F7" /> Chat &amp; Message
                        </button>
                      </div>

                      {/* Right Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {b.status === 'pending' && (
                          <button
                            type="button"
                            disabled={actionLoadingId === b._id}
                            onClick={() => handleCancelBooking(b._id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              color: '#EF4444',
                              padding: '6px 14px',
                              borderRadius: 9999,
                              fontSize: 12,
                              fontWeight: 650,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <X size={13} />
                            <span>{actionLoadingId === b._id ? 'Cancelling…' : 'Cancel Invite'}</span>
                          </button>
                        )}

                        {b.status === 'confirmed' && (
                          <>
                            <Link
                              to={`/bookings/${b._id}/record`}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#FFFFFF',
                                padding: '7px 14px',
                                borderRadius: 9999,
                                fontSize: 12.5,
                                fontWeight: 650,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <Video size={13} /> Enter Studio
                            </Link>

                            <button
                              type="button"
                              onClick={() => setActiveSettleBooking(b)}
                              style={{
                                background: '#22C55E',
                                color: '#000000',
                                padding: '7px 16px',
                                borderRadius: 9999,
                                fontSize: 12.5,
                                fontWeight: 750,
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Settle &amp; Release Escrow</span>
                            </button>
                          </>
                        )}

                        {b.status === 'completed' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#22C55E',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            padding: '5px 12px',
                            borderRadius: 9999,
                          }}>
                            <CheckCircle2 size={13} /> Completed · Escrow Disbursed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* In-Dashboard Settle Payment Modal */}
      {activeSettleBooking && (
        <SettlePaymentModal
          booking={activeSettleBooking}
          onClose={() => setActiveSettleBooking(null)}
          onSettled={(updatedBooking) => {
            setBookings((prev) =>
              prev.map((b) => (b._id === updatedBooking._id ? updatedBooking : b))
            );
            fetchBookings();
          }}
          onOpenEditor={(b) => setActiveEditBooking(b)}
        />
      )}

      {/* In-Dashboard Recording Clip Editor Modal */}
      {activeEditBooking && (
        <RecordingEditorModal
          booking={activeEditBooking}
          onClose={() => setActiveEditBooking(null)}
          onSaveSuccess={() => {
            triggerToast('Recording clips saved successfully!');
            fetchBookings();
          }}
        />
      )}

      {/* Real-time New Message Floating Toast */}
      <NewMessageToast
        onOpenMessage={(bId) => {
          setSelectedChatBookingId(bId);
          setActiveTab('messages');
        }}
      />
    </div>
  );
}
