import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeMessages } from '../hooks/useRealtimeMessages';
import { Send, AlertCircle, Wifi, WifiOff } from 'lucide-react';

/**
 * BookingChatThread — per-booking messaging UI with system messages, real-time presence/typing,
 * sending states, and connection status header.
 * Props: bookingId, booking (populated booking object)
 */
export default function BookingChatThread({ bookingId, booking }) {
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
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
      {booking && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Host: {booking.host?.name || '—'} &nbsp;|&nbsp; Guest: {booking.guest?.name || '—'}
            </div>
            {slotDate && (
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Scheduled: {slotDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {slotDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: currentStatus.bg, color: currentStatus.color,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {connectionStatus === 'CONNECTED' ? <Wifi size={12} /> : <WifiOff size={12} />}
              {currentStatus.text}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, textTransform: 'capitalize', background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>
              {booking.status}
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
    </div>
  );
}

