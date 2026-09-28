import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, DollarSign, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function CreateBookingModal({ isOpen, onClose, recipientUser, onSuccess }) {
  const { user, authFetch } = useAuth();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [topic, setTopic] = useState('Podcast Recording Session');
  const [date, setDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState('14:00');
  const [durationMin, setDurationMin] = useState('60');
  const [amount, setAmount] = useState('150');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const startDateTimeStr = `${date}T${startTime}:00`;
      const startDate = new Date(startDateTimeStr);
      if (isNaN(startDate.getTime()) || startDate <= new Date()) {
        setErrorMsg('Please select a valid future date and time for the session.');
        setSubmitting(false);
        return;
      }

      const durNum = parseInt(durationMin, 10) || 60;
      const endDate = new Date(startDate.getTime() + durNum * 60000);

      const isMeHost = user?.role === 'host';
      const hostId = isMeHost ? user._id : (recipientUser?._id || recipientUser?.id);
      const guestId = isMeHost ? (recipientUser?._id || recipientUser?.id) : user._id;

      if (!hostId || !guestId) {
        setErrorMsg('Unable to determine session host and guest. Please try again.');
        setSubmitting(false);
        return;
      }

      const res = await authFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          hostId,
          guestId,
          slotStart: startDate.toISOString(),
          slotEnd: endDate.toISOString(),
          topics: [topic.trim() || 'Podcast Session'],
          message: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session booking');
      }

      const newBooking = data.booking;

      // Send system message in chat
      try {
        const formattedDate = startDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await authFetch('/messages', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: newBooking._id,
            content: `📅 New Session Booking Requested: "${topic}" for ${formattedDate} at ${formattedTime} ($${amount}). Added to My Bookings.`,
          }),
        });
      } catch (err) {
        console.warn('System message notification warning:', err);
      }

      setSuccessMsg('Session booking created successfully! Added to My Bookings.');
      setTimeout(() => {
        if (onSuccess) onSuccess(newBooking);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred creating the booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBadgeStyle}>
              <Calendar size={20} color="var(--plum-primary, #5A3D5C)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--plum-deep)', margin: 0 }}>
                Request Session Booking
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Propose a new podcast recording with {recipientUser?.name || 'Participant'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            <X size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {errorMsg && (
            <div style={errorAlertStyle}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#dc2626' }}>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={successAlertStyle}>
              <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>{successMsg}</span>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Podcast / Episode Topic</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Cybersecurity & AI Deep Dive Episode"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Proposed Date</label>
              <input
                type="date"
                required
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Duration</label>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                style={selectStyle}
              >
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes</option>
                <option value="90">90 Minutes</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Proposed Rate / Escrow ($)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150"
                  style={{ ...inputStyle, paddingLeft: 24 }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Session Agenda &amp; Notes (Optional)</label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Outline key discussion points, questions, or technical requirements..."
              style={textareaStyle}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={submitBtnStyle}
            >
              {submitting ? 'Creating Booking…' : 'Confirm & Request Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// INLINE STYLES
// --------------------------------------------------------------------------

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16,
};

const modalStyle = {
  background: 'var(--white-pure, #ffffff)',
  borderRadius: 16,
  border: '1px solid var(--border-subtle, #e2e8f0)',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
  maxWidth: 520,
  width: '100%',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px',
  borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
  background: 'var(--cream-warm, #fafaf9)',
};

const iconBadgeStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  background: 'var(--lavender-mist, #F4EDF5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  padding: 6,
  borderRadius: 8,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--plum-deep, #1e1b4b)',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-subtle, #cbd5e1)',
  background: 'var(--white-pure, #ffffff)',
  color: 'var(--plum-deep, #0f172a)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-subtle, #cbd5e1)',
  background: 'var(--white-pure, #ffffff)',
  color: 'var(--plum-deep, #0f172a)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-subtle, #cbd5e1)',
  background: 'var(--white-pure, #ffffff)',
  color: 'var(--plum-deep, #0f172a)',
  fontSize: 13,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const errorAlertStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 8,
  padding: '10px 14px',
  marginBottom: 16,
};

const successAlertStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  borderRadius: 8,
  padding: '10px 14px',
  marginBottom: 16,
};

const cancelBtnStyle = {
  padding: '10px 16px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid var(--border-subtle, #cbd5e1)',
  color: 'var(--text-muted, #64748b)',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const submitBtnStyle = {
  padding: '10px 18px',
  borderRadius: 8,
  background: 'var(--plum-primary, #5A3D5C)',
  color: 'var(--white-pure, #ffffff)',
  border: 'none',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-plum, 0 4px 12px rgba(50, 31, 58, 0.2))',
  transition: 'background 0.2s ease',
};
