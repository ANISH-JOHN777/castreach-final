import { useState, useEffect } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { realtime } from '../services/realtime';

export default function NewMessageToast({ onOpenMessage }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('cr_token') || localStorage.getItem('token');
    if (token) {
      realtime.connect(token);
    }

    const unsub = realtime.on('message:new', (msg) => {
      if (!msg) return;
      const myId = (user?._id || user?.id)?.toString();
      const senderId = (msg.sender?._id || msg.senderId)?.toString();

      // Don't show toast for messages sent by ourselves
      if (senderId && senderId === myId) return;

      // Don't show toast if user is already on the messages page for this booking
      if (location.pathname.includes(`/messages/${msg.bookingId || msg.booking}`)) {
        return;
      }

      setActiveToast({
        id: msg._id || Date.now(),
        bookingId: msg.bookingId || msg.booking,
        senderName: msg.senderName || msg.sender?.name || 'Participant',
        senderAvatar: msg.senderAvatar || msg.sender?.avatar || '',
        content: msg.content || 'Sent a new message',
        timestamp: Date.now(),
      });

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?.id === (msg._id || Date.now()) ? null : current));
      }, 6000);
    });

    return () => unsub();
  }, [user, location.pathname]);

  if (!activeToast) return null;

  const handleClick = () => {
    if (onOpenMessage) {
      onOpenMessage(activeToast.bookingId);
    } else {
      const isHost = user?.role === 'host';
      const targetDashboard = isHost ? '/host' : '/guest';
      navigate(`${targetDashboard}?tab=messages&booking=${activeToast.bookingId}`);
    }
    setActiveToast(null);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 99999,
        backgroundColor: '#181622',
        border: '1.5px solid rgba(168, 85, 247, 0.4)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 16px rgba(168, 85, 247, 0.25)',
        borderRadius: 14,
        padding: '14px 18px',
        maxWidth: 380,
        width: 'calc(100vw - 48px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#A855F7',
        flexShrink: 0,
      }}>
        <MessageSquare size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 750, color: '#FFFFFF' }}>
            {activeToast.senderName}
          </span>
          <span style={{ fontSize: 10, color: '#A855F7', fontWeight: 700 }}>
            Just now
          </span>
        </div>
        <p style={{
          fontSize: 12,
          color: '#A39EA9',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {activeToast.content}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setActiveToast(null);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#6F6A76',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
