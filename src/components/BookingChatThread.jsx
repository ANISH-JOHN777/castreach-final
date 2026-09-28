import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeMessages } from '../hooks/useRealtimeMessages';
import { Send, AlertCircle, Wifi, WifiOff, Calendar, Check, X, Clock, DollarSign } from 'lucide-react';
import CreateBookingModal from './CreateBookingModal';
import { realtime } from '../services/realtime';

/**
 * BookingChatThread — per-booking messaging UI with system messages, real-time presence/typing,
 * sending states, and connection status header.
 * Props: bookingId, booking (populated booking object)
 */
export default function BookingChatThread({ bookingId, booking, onBookingCreated }) {
  const { user, authFetch } = useAuth();
  const {
    messages,
    setMessages,
    loading,
    error,
    connectionStatus,
    typingUser,
    startTyping,
    stopTyping,
  } = useRealtimeMessages(bookingId);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [failedMsg, setFailedMsg] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [currentBooking, setCurrentBooking] = useState(booking);
  const [liveStatus, setLiveStatus] = useState(booking?.status || 'pending');

  useEffect(() => {
    setCurrentBooking(booking);
    if (booking?.status) {
      setLiveStatus(booking.status);
    }
  }, [booking]);

  const activeBooking = currentBooking || booking;
  const activeBookingId = activeBooking?._id || bookingId;

  // Real-time synchronization of booking status changes
  useEffect(() => {
    const unsubUpdate = realtime.on('booking:updated', (data) => {
      if ((data.bookingId === activeBookingId || data.bookingId === bookingId) && data.status) {
        setLiveStatus(data.status);
      }
    });
    return () => unsubUpdate();
  }, [bookingId, activeBookingId]);

  // Sync status if confirmation message appears in thread
  useEffect(() => {
    const hasAcceptMsg = messages.some((m) =>
      m.content?.toLowerCase().includes('accepted') || m.content?.toLowerCase().includes('confirmed')
    );
    if (hasAcceptMsg && liveStatus === 'pending') {
      setLiveStatus('confirmed');
    }
  }, [messages, liveStatus]);

  const isMeHost = activeBooking?.host?._id === user?._id || activeBooking?.host === user?._id;
  const otherUser = isMeHost ? activeBooking?.guest : activeBooking?.host;

  const createdById = activeBooking?.createdBy?._id || activeBooking?.createdBy?.toString() || activeBooking?.guest?._id || activeBooking?.guest;
  const isInitiator = createdById === (user?._id || user?.id);

  const handleAcceptBooking = async () => {
    const targetId = activeBooking?._id || bookingId;
    if (actionLoading || !targetId) return;
    setActionLoading(true);
    setLiveStatus('confirmed');
    try {
      const res = await authFetch(`/bookings/${targetId}/confirm`, {
        method: 'PATCH',
      });
      if (res.ok) {
        realtime.send('booking:updated', { bookingId: targetId, status: 'confirmed' });
        const slotDate = activeBooking?.slotStart ? new Date(activeBooking.slotStart) : new Date();
        const dateStr = slotDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await authFetch('/messages', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: targetId,
            content: `🎉 ${user?.name || 'Participant'} accepted the session booking request for ${dateStr} at ${timeStr}. Stored in My Bookings!`,
          }),
        });
      }
    } catch (err) {
      console.error('Accept booking error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineBooking = async () => {
    const targetId = activeBooking?._id || bookingId;
    if (actionLoading || !targetId) return;
    setActionLoading(true);
    setLiveStatus('cancelled');
    try {
      const res = await authFetch(`/bookings/${targetId}/cancel`, {
        method: 'PATCH',
      });
      if (res.ok) {
        realtime.send('booking:updated', { bookingId: targetId, status: 'cancelled' });
        await authFetch('/messages', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: targetId,
            content: `❌ Session Booking Request declined.`,
          }),
        });
      }
    } catch (err) {
      console.error('Decline booking error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const QUICK_MESSAGES = [
    'Looking forward to the session!',
    'What topics should we focus on?',
    'Can you share your podcast RSS?',
    'All set for our recording time!',
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    startTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const send = async (contentStr = input.trim()) => {
    if (!contentStr || sending) return;
    stopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      booking: bookingId,
      sender: { _id: user?._id, name: user?.name, avatar: user?.avatar },
      content: contentStr,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    setSending(true);
    setFailedMsg(null);

    try {
      const res = await authFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({ bookingId, content: contentStr }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? { ...data.message, status: 'sent' } : m))
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? { ...m, status: 'failed' } : m))
        );
        setFailedMsg(contentStr);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: 'failed' } : m))
      );
      setFailedMsg(contentStr);
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg) => {
    const senderId = msg.sender?._id || msg.sender;
    return senderId === user?._id;
  };

  const slotDate = booking?.slotStart ? new Date(booking.slotStart) : null;

  const statusColors = {
    CONNECTED: { bg: '#e6f4ea', color: '#137333', text: 'Connected' },
    CONNECTING: { bg: '#fef7e0', color: '#b06000', text: 'Connecting…' },
    RECONNECTING: { bg: '#fef7e0', color: '#b06000', text: 'Reconnecting…' },
    OFFLINE: { bg: '#fce8e6', color: '#c5221f', text: 'Offline' },
  };
  const currentStatus = statusColors[connectionStatus] || statusColors.OFFLINE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-background-primary)' }}>
      {/* Header */}
      {activeBooking && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Host: {activeBooking.host?.name || '—'} &nbsp;|&nbsp; Guest: {activeBooking.guest?.name || '—'}
            </div>
            {slotDate && (
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Scheduled: {slotDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm, 8px)',
                background: 'var(--plum-primary, #5A3D5C)',
                color: 'var(--white-pure, #ffffff)',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(50, 31, 58, 0.15))',
                transition: 'background 0.2s ease',
              }}
            >
              <Calendar size={14} /> Book New Session
            </button>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: currentStatus.bg, color: currentStatus.color,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {connectionStatus === 'CONNECTED' ? <Wifi size={12} /> : <WifiOff size={12} />}
              {currentStatus.text}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, textTransform: 'capitalize', background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
              {liveStatus}
            </span>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-secondary)', fontSize: 13 }}>
            Loading conversation…
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-danger)', fontSize: 12, padding: 10 }}>
            {error}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13, padding: '24px 0' }}>
            Start the conversation about your upcoming session.
          </div>
        )}

        {/* Pinned Interactive Session Booking Proposal Card */}
        {activeBooking && (
          <div style={{
            margin: '6px 0 12px 0',
            padding: '16px',
            borderRadius: 14,
            background: 'var(--white-pure, #ffffff)',
            border: '1.5px solid var(--border-subtle, #e2e8f0)',
            boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.05))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--plum-primary, #5A3D5C)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--plum-deep, #1e1b4b)' }}>
                  {activeBooking.topics?.[0] || 'Podcast Recording Session'}
                </span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, textTransform: 'capitalize',
                background: liveStatus === 'confirmed' ? 'var(--color-success-bg, #ecfdf5)' : liveStatus === 'cancelled' ? 'var(--color-error-bg, #fef2f2)' : 'var(--color-warning-bg, #fffbeb)',
                color: liveStatus === 'confirmed' ? 'var(--color-success, #10b981)' : liveStatus === 'cancelled' ? 'var(--color-error, #ef4444)' : 'var(--color-warning, #f59e0b)',
              }}>
                {liveStatus === 'pending' ? (isInitiator ? '● Proposal Sent' : '● Action Required') : liveStatus === 'confirmed' ? '✓ Confirmed & Booked' : liveStatus}
              </span>
            </div>

            {slotDate && (
              <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginBottom: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} /> Scheduled: {slotDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {activeBooking.amountCents && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--plum-deep, #1e1b4b)', fontWeight: 600 }}>
                    <DollarSign size={14} /> Rate: ${(activeBooking.amountCents / 100).toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {/* Actions when booking status is pending */}
            {liveStatus === 'pending' && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle, #e2e8f0)' }}>
                {!isInitiator ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleAcceptBooking}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: 'var(--color-success, #10b981)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <Check size={14} /> {actionLoading ? 'Confirming…' : 'Accept Booking'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDeclineBooking}
                      disabled={actionLoading}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: 'transparent',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        color: 'var(--color-error, #ef4444)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <X size={14} /> Decline
                    </button>

                    <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)', marginLeft: 'auto' }}>
                      Accepting confirms session and adds to My Bookings
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--color-warning, #f59e0b)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} /> Booking proposal sent. Waiting for {otherUser?.name || 'Participant'} to accept.
                  </div>
                )}
              </div>
            )}

            {liveStatus === 'confirmed' && (
              <div style={{ fontSize: 12, color: 'var(--color-success, #10b981)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle, #e2e8f0)' }}>
                <Check size={14} /> {isInitiator ? `🎉 ${otherUser?.name || 'Participant'} accepted your booking request!` : '✓ You accepted this booking request.'} Stored in My Bookings.
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg._id} style={{ alignSelf: 'center', margin: '8px 0', padding: '4px 14px', borderRadius: 16, background: 'var(--lavender-mist)', border: '1px solid var(--border-subtle)', color: 'var(--plum-deep)', fontSize: 11, fontWeight: 600, textAlign: 'center' }}>
                {msg.content}
              </div>
            );
          }

          const me = isMe(msg);
          return (
            <div key={msg._id} style={{ display: 'flex', flexDirection: me ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              <img
                src={msg.sender?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || 'U')}&size=28&background=random`}
                alt=""
                style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: me ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                <div style={{
                  padding: '9px 13px', borderRadius: 14,
                  background: me ? 'var(--plum-primary)' : 'var(--color-background-secondary)',
                  color: me ? '#fff' : 'var(--color-text-primary)',
                  fontSize: 13, lineHeight: 1.5,
                  borderBottomRightRadius: me ? 3 : 14,
                  borderBottomLeftRadius: me ? 14 : 3,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 10, color: 'var(--color-text-secondary)' }}>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {me && msg.status === 'sending' && <span style={{ color: 'var(--color-text-secondary)' }}>• sending…</span>}
                  {me && (msg.status === 'sent' || !msg.status) && (
                    <span style={{ color: 'var(--color-success)' }}>{msg.isRead ? '• Read' : '• Delivered'}</span>
                  )}
                  {me && msg.status === 'failed' && (
                    <span style={{ color: 'var(--color-danger)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <AlertCircle size={10} /> failed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic', paddingLeft: 36 }}>
            <span>{typingUser.name} is typing…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Replies */}
      <div style={{ padding: '6px 12px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK_MESSAGES.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={sending}
            style={{
              padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer',
              border: '1px solid var(--color-border-tertiary)',
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Composer Input */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--color-border-tertiary)', marginTop: 6 }}>
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message (Shift+Enter for newline)…"
          rows={1}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 12, border: '1.5px solid var(--color-border-tertiary)',
            background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13,
            resize: 'none', lineHeight: 1.4, outline: 'none',
          }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || sending}
          style={{
            padding: '8px 16px', borderRadius: 12, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            background: input.trim() && !sending ? 'var(--plum-primary)' : 'var(--color-border-tertiary)',
            color: '#fff', display: 'flex', alignItems: 'center', gap: 4, opacity: sending ? 0.7 : 1,
          }}
        >
          <Send size={14} /> {sending ? '…' : 'Send'}
        </button>
      </div>

      <CreateBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        recipientUser={otherUser}
        onSuccess={(newBooking) => {
          setCurrentBooking(newBooking);
          setLiveStatus(newBooking?.status || 'pending');
          if (onBookingCreated) {
            onBookingCreated(newBooking);
          }
        }}
      />
    </div>
  );
}

