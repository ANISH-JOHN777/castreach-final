import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Mic, 
  Calendar, 
  ArrowRight, 
  Radio, 
  MessageSquare, 
  CheckCircle2, 
  Video, 
  Users, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  Edit2, 
  Check, 
  X,
  Headphones,
  Scissors
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import SettlePaymentModal from '../../components/SettlePaymentModal';
import RecordingEditorModal from '../../components/RecordingEditorModal';
import DashboardMessagesView from '../../components/DashboardMessagesView';
import SessionCompletionBanner from '../../components/SessionCompletionBanner';
import NewMessageToast from '../../components/NewMessageToast';

export default function GuestDashboard() {
  const { user, authFetch, setUser } = useAuth();
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

  // Predefined Fee editing state
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [sessionRateDollars, setSessionRateDollars] = useState(
    user?.sessionRateCents ? String(user.sessionRateCents / 100) : '1500'
  );
  const [savingRate, setSavingRate] = useState(false);

  // Propose date modal/drawer state
  const [proposingBookingId, setProposingBookingId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('14:00');
  const [rescheduleNote, setRescheduleNote] = useState('');

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

  // Save updated predefined guest session fee
  const handleSaveRate = async () => {
    setSavingRate(true);
    try {
      const parsedDollars = Math.max(0, parseFloat(sessionRateDollars) || 0);
      const parsedCents = Math.round(parsedDollars * 100);
      const res = await authFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ sessionRateCents: parsedCents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update session fee');
      if (setUser) setUser(data.user);
      setIsEditingRate(false);
      triggerToast(`Session rate updated to $${parsedDollars.toLocaleString()} / episode`);
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setSavingRate(false);
    }
  };

  // Guest accepts requested availability date
  const handleConfirmAvailability = async (bookingId) => {
    setActionLoadingId(bookingId);
    try {
      const res = await authFetch(`/bookings/${bookingId}/confirm`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm booking');

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? data.booking : b))
      );
      triggerToast('Availability confirmed! The podcast session is scheduled.');
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Guest declines requested booking
  const handleDeclineRequest = async (bookingId) => {
    if (!window.confirm('Are you sure you want to decline this podcast invite?')) return;
    setActionLoadingId(bookingId);
    try {
      const res = await authFetch(`/bookings/${bookingId}/decline`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to decline booking');

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? (data.booking || { ...b, status: 'cancelled' }) : b))
      );
      triggerToast('Podcast invite declined.');
    } catch (err) {
      triggerToast(`Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Guest submits a date change / alternative availability
  const handleSubmitDateProposal = async (bookingId) => {
    if (!newDate) {
      return triggerToast('Please select a valid new date');
    }
    setActionLoadingId(bookingId);
    try {
      const proposedStart = `${newDate}T${newTime}:00`;
      const res = await authFetch(`/bookings/${bookingId}/propose-date`, {
        method: 'PATCH',
        body: JSON.stringify({
          proposedSlotStart: proposedStart,
          rescheduleNote: rescheduleNote.trim() || 'Guest requested date change for better availability.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send date change proposal');

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? data.booking : b))
      );
      setProposingBookingId(null);
      setNewDate('');
      setRescheduleNote('');
      triggerToast('Alternative date proposal sent to host!');
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

  const escrowHeldForGuest = bookings
    .filter((b) => ['held', 'release_pending'].includes(b.paymentStatus))
    .reduce((sum, b) => sum + (b.amountCents || 0), 0);

  const totalEarningsSettled = completedSessions
    .filter((b) => b.paymentStatus === 'released')
    .reduce((sum, b) => sum + (b.amountCents || 0), 0);

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'pending') return b.status === 'pending';
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
      {/* ── 1. NAVBAR (Listen, Dashboard, Profile) ── */}
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

      {/* ── 2. MINIMAL PURE BLACK DASHBOARD CONTAINER ── */}
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
          <div style={{ maxWidth: 660 }}>
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
              <Mic size={13} /> GUEST CREATOR &amp; SPEAKER
            </div>
            <h1 style={{
              fontSize: 'clamp(26px, 3.5vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#FFFFFF',
              margin: '0 0 8px 0',
              lineHeight: 1.15,
            }}>
              Welcome back, {user?.name || 'Guest'}
            </h1>
            <p style={{
              color: '#888888',
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
            }}>
              Review incoming invites from podcast hosts, confirm recording dates, or decline requests. Escrow fees are disbursed immediately upon interview completion.
            </p>
          </div>

          {/* Minimal Predefined Rate Card */}
          <div style={{
            background: '#111111',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            padding: '18px 22px',
            minWidth: 260,
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Predefined Session Fee
            </div>

            {isEditingRate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <DollarSign size={15} color="#888888" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={sessionRateDollars}
                    onChange={(e) => setSessionRateDollars(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 26px',
                      borderRadius: 6,
                      backgroundColor: '#1A1A1A',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: '#FFFFFF',
                      fontSize: 15,
                      fontWeight: 750,
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={savingRate}
                  onClick={handleSaveRate}
                  style={{
                    background: '#FFFFFF',
                    color: '#000000',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontWeight: 750,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRate(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF' }}>
                  ${parseFloat(sessionRateDollars || 0).toLocaleString()} <span style={{ fontSize: 13, color: '#888888', fontWeight: 500 }}>/ episode</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingRate(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    padding: '5px 10px',
                    color: '#FFFFFF',
                    fontSize: 11.5,
                    fontWeight: 650,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Edit2 size={11} /> Edit
                </button>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#666666', marginTop: 6 }}>
              Locked in escrow by the host before recording starts.
            </div>
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
              Escrow Held For You
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>
              ${(escrowHeldForGuest / 100).toFixed(2)}
            </div>
            <div style={{ fontSize: 11.5, color: '#22C55E', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={13} color="#22C55E" /> Bonded in escrow
            </div>
          </div>

          <div style={{
            background: '#0A0A0A',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Pending Invites
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: pendingRequests.length > 0 ? '#FFFFFF' : '#888888' }}>
              {pendingRequests.length}
            </div>
            <div style={{ fontSize: 11.5, color: '#888888', marginTop: 4 }}>
              Awaiting your response
            </div>
          </div>

          <div style={{
            background: '#0A0A0A',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Confirmed Sessions
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>
              {confirmedSessions.length}
            </div>
            <div style={{ fontSize: 11.5, color: '#888888', marginTop: 4 }}>
              Scheduled for recording
            </div>
          </div>

          <div style={{
            background: '#0A0A0A',
            padding: '20px 22px',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ fontSize: 11, color: '#888888', textTransform: 'uppercase', fontWeight: 750, letterSpacing: '0.05em', marginBottom: 6 }}>
              Total Earnings Settled
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#FFFFFF' }}>
              ${(totalEarningsSettled / 100).toFixed(2)}
            </div>
            <div style={{ fontSize: 11.5, color: '#22C55E', marginTop: 4 }}>
              Completed &amp; disbursed
            </div>
          </div>
        </div>

        {/* ── 3.5 POST-SESSION COMPLETION & ESCROW SETTLEMENT PROMPT ── */}
        <SessionCompletionBanner bookings={bookings} onSettled={fetchBookings} />

        {/* ── 4. RELATIONAL BOOKING & INVITATION SECTION ── */}
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
                {activeTab === 'messages' ? 'Direct Messages & Host Chats' : 'Podcast Invitations & Sessions'}
              </h2>
              <p style={{ fontSize: 12.5, color: '#888888', margin: '3px 0 0 0' }}>
                {activeTab === 'messages'
                  ? 'Real-time conversation, prep topics, and direct communication with podcast hosts.'
                  : 'Accept, reschedule, or decline incoming invites from podcast hosts.'}
              </p>
            </div>

            {/* Minimal Filter Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${bookings.length})` },
                { id: 'messages', label: `Messages 💬 (${bookings.length})` },
                { id: 'pending', label: `Pending (${pendingRequests.length})` },
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
              Loading guest bookings…
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
              <p style={{ fontSize: 12.5, color: '#888888', maxWidth: 400, margin: '0 auto 16px' }}>
                Your profile is active in the directory. When hosts invite you to their show, invitations will appear here.
              </p>
              <Link
                to="/listen"
                style={{
                  background: '#FFFFFF',
                  color: '#000000',
                  padding: '8px 18px',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: 12.5,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Listen to Episodes
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredBookings.map((b) => {
                const hostName = b.host?.name || 'Podcast Host';
                const hostPodcast = b.host?.podcastName || 'CastReach Original';
                const hostAvatar = b.host?.avatar || '';
                const hasCounterProposal = Boolean(b.proposedSlotStart && b.proposedBy === 'guest');
                const slotDate = new Date(b.slotStart);
                const formattedSlot = slotDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const proposedDate = b.proposedSlotStart ? new Date(b.proposedSlotStart) : null;
                const formattedProposal = proposedDate ? proposedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const amountFormatted = b.amountCents ? `$${(b.amountCents / 100).toFixed(2)}` : '$0.00';
                const isProposingThis = proposingBookingId === b._id;

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
                          : hasCounterProposal 
                            ? '1px solid #F59E0B' 
                            : '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '18px clamp(16px, 3vw, 22px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    {/* Top Row: Host info & Status Badge */}
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
                          {hostAvatar ? (
                            <img src={hostAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Headphones size={20} color="#888888" />
                          )}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 750, color: '#FFFFFF' }}>
                              {hostName}
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
                            Show: <strong style={{ color: '#CCCCCC' }}>{hostPodcast}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Escrow Badge */}
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
                            {b.paymentStatus === 'released' ? 'Payout Released' : 'Held in Escrow'}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 750, color: b.paymentStatus === 'released' ? '#22C55E' : '#FFFFFF' }}>
                            {amountFormatted}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Details Grid */}
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
                        <span><strong>Requested:</strong> {formattedSlot}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#CBD5E1' }}>
                        <Video size={14} color="#22C55E" />
                        <span><strong>Format:</strong> {b.meetingType === 'physical' ? 'Physical Studio' : 'Remote HD Studio'}</span>
                      </div>

                      {b.topics?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#CBD5E1' }}>
                          <Users size={14} color="#888888" />
                          <span><strong>Topic:</strong> {b.topics.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Proposal Status if Guest already proposed new date */}
                    {hasCounterProposal && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}>
                        <div style={{ fontSize: 12.5, color: '#FCD34D' }}>
                          <strong>You proposed an alternative date:</strong> {formattedProposal}
                          {b.rescheduleNote && <span style={{ color: '#E5E7EB', display: 'block', fontSize: 12, marginTop: 2 }}>Note: "{b.rescheduleNote}"</span>}
                        </div>
                        <span style={{ fontSize: 11, color: '#888888', fontStyle: 'italic' }}>
                          Awaiting host confirmation
                        </span>
                      </div>
                    )}

                    {/* Inline Date Change Proposal Form */}
                    {isProposingThis && (
                      <div style={{
                        background: '#161616',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 12,
                        padding: '16px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={15} color="#FFFFFF" />
                          <span>Propose Your Preferred Date &amp; Time</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#888888', marginBottom: 4 }}>
                              Select Available Date
                            </label>
                            <input
                              type="date"
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 6,
                                background: '#0D0D0D',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#FFFFFF',
                                fontSize: 12.5,
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#888888', marginBottom: 4 }}>
                              Time
                            </label>
                            <input
                              type="time"
                              value={newTime}
                              onChange={(e) => setNewTime(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: 6,
                                background: '#0D0D0D',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#FFFFFF',
                                fontSize: 12.5,
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: 11, color: '#888888', marginBottom: 4 }}>
                            Note for Host (Optional)
                          </label>
                          <input
                            type="text"
                            value={rescheduleNote}
                            onChange={(e) => setRescheduleNote(e.target.value)}
                            placeholder="e.g. Free Thursday afternoon after 2 PM"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 6,
                              background: '#0D0D0D',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#FFFFFF',
                              fontSize: 12.5,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setProposingBookingId(null)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#AAAAAA',
                              padding: '6px 12px',
                              borderRadius: 6,
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === b._id}
                            onClick={() => handleSubmitDateProposal(b._id)}
                            style={{
                              background: '#FFFFFF',
                              color: '#000000',
                              border: 'none',
                              padding: '6px 16px',
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <Check size={13} /> Send Proposal to Host
                          </button>
                        </div>
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
                          <ShieldCheck size={13} color="#22C55E" /> Escrow &amp; Payout
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
                          <MessageSquare size={12} color="#A855F7" /> Chat with Host
                        </button>
                      </div>

                      {/* Guest Action Controls (Accept, Change Date, Decline) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {b.status === 'pending' && !hasCounterProposal && (
                          <>
                            {/* Decline Request Button */}
                            <button
                              type="button"
                              disabled={actionLoadingId === b._id}
                              onClick={() => handleDeclineRequest(b._id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#EF4444',
                                padding: '7px 14px',
                                borderRadius: 9999,
                                fontSize: 12.5,
                                fontWeight: 650,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <X size={13} />
                              <span>{actionLoadingId === b._id ? 'Declining…' : 'Decline Request'}</span>
                            </button>

                            {/* Propose different date button */}
                            <button
                              type="button"
                              onClick={() => setProposingBookingId(isProposingThis ? null : b._id)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                color: '#FFFFFF',
                                padding: '7px 14px',
                                borderRadius: 9999,
                                fontSize: 12.5,
                                fontWeight: 650,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <Clock size={13} />
                              <span>Change Date</span>
                            </button>

                            {/* Accept Availability & Confirm */}
                            <button
                              type="button"
                              disabled={actionLoadingId === b._id}
                              onClick={() => handleConfirmAvailability(b._id)}
                              style={{
                                background: '#22C55E',
                                color: '#000000',
                                padding: '7px 18px',
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
                              <span>{actionLoadingId === b._id ? 'Confirming…' : 'Accept & Confirm'}</span>
                            </button>
                          </>
                        )}

                        {b.status === 'confirmed' && (
                          <Link
                            to={`/bookings/${b._id}/record`}
                            style={{
                              background: '#22C55E',
                              color: '#000000',
                              padding: '7px 16px',
                              borderRadius: 9999,
                              fontSize: 12.5,
                              fontWeight: 750,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Video size={13} />
                            <span>Enter Studio Room</span>
                          </Link>
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
