import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, DollarSign, FileText, X, CheckCircle, AlertCircle, Video, MapPin, Radio, User, Sparkles } from 'lucide-react';

export default function CreateBookingModal({ isOpen, onClose, recipientUser, onSuccess }) {
  const { user, authFetch } = useAuth();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [topic, setTopic] = useState('Podcast Recording Session');
  const [date, setDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState('14:00');
  const [durationMin, setDurationMin] = useState('60');
  const [amount, setAmount] = useState(recipientUser?.sessionRateCents ? String(recipientUser.sessionRateCents / 100) : '0');
  
  // Meeting Mode: 'gmeet' or 'physical'
  const [meetingType, setMeetingType] = useState('gmeet');
  const [gmeetUrl, setGmeetUrl] = useState('');
  const [studioAddress, setStudioAddress] = useState(recipientUser?.studioLocation || recipientUser?.location || '');
  const [studioCity, setStudioCity] = useState('');
  const [studioName, setStudioName] = useState(recipientUser?.podcastName ? `${recipientUser.podcastName} Studio` : 'Main Recording Studio');
  const [arrivalNotes, setArrivalNotes] = useState('Please arrive 15 minutes before the session starts.');
  const [agenda, setAgenda] = useState('');

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

      if (meetingType === 'physical' && !studioAddress.trim()) {
        setErrorMsg('Please enter the physical studio address for the in-person session.');
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

      const payload = {
        hostId,
        guestId,
        slotStart: startDate.toISOString(),
        slotEnd: endDate.toISOString(),
        topics: [topic.trim() || 'Podcast Session'],
        message: agenda.trim(),
        meetingType,
        gmeetUrl: meetingType === 'gmeet' ? gmeetUrl.trim() : '',
        physicalLocation: meetingType === 'physical' ? {
          address: studioAddress.trim(),
          city: studioCity.trim(),
          studioName: studioName.trim(),
          arrivalNotes: arrivalNotes.trim(),
        } : {},
        agenda: agenda.trim(),
      };

      const res = await authFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
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
        const modeDesc = meetingType === 'gmeet' ? 'Google Meet (Virtual)' : `In-Person (${studioAddress.trim()})`;
        await authFetch('/messages', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: newBooking._id,
            content: `New Session Booking Requested: "${topic}" via ${modeDesc} on ${formattedDate} at ${formattedTime}.`,
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

  const isTargetHost = recipientUser?.role === 'host';

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBadgeStyle}>
              <Calendar size={20} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f3f4f6', margin: 0 }}>
                Schedule Podcast Session
              </h2>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0 0' }}>
                Connect and schedule with {recipientUser?.name || 'Creator'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            <X size={18} color="#9ca3af" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', maxHeight: '82vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={errorAlertStyle}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#f87171' }}>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={successAlertStyle}>
              <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>{successMsg}</span>
            </div>
          )}

          {/* Participant Details Summary Card */}
          {recipientUser && (
            <div style={{
              background: '#15161c',
              border: '1px solid #23252e',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 18,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {recipientUser.avatar ? (
                  <img src={recipientUser.avatar} alt={recipientUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  recipientUser.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#f3f4f6' }}>{recipientUser.name}</span>
                  <span style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isTargetHost ? 'rgba(37, 99, 235, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isTargetHost ? '#60a5fa' : '#34d399',
                  }}>
                    {recipientUser.role || 'Creator'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {isTargetHost 
                    ? (recipientUser.podcastName || 'Podcast Host') 
                    : (recipientUser.expertise?.join(', ') || recipientUser.bio || 'Guest Contributor')}
                </div>
                {(recipientUser.studioLocation || recipientUser.location) && (
                  <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MapPin size={11} /> {recipientUser.studioLocation || recipientUser.location}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEETING MODE SELECTION: Google Meet vs In-Person */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Meeting Mode (Select how you will meet)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setMeetingType('gmeet')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: meetingType === 'gmeet' ? '2px solid #2563eb' : '1px solid #23252e',
                  background: meetingType === 'gmeet' ? 'rgba(37, 99, 235, 0.15)' : '#15161c',
                  color: meetingType === 'gmeet' ? '#60a5fa' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  transition: 'all 0.2s',
                }}
              >
                <Video size={16} color={meetingType === 'gmeet' ? '#60a5fa' : '#9ca3af'} />
                <span>Google Meet (Virtual)</span>
              </button>

              <button
                type="button"
                onClick={() => setMeetingType('physical')}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: meetingType === 'physical' ? '2px solid #2563eb' : '1px solid #23252e',
                  background: meetingType === 'physical' ? 'rgba(37, 99, 235, 0.15)' : '#15161c',
                  color: meetingType === 'physical' ? '#60a5fa' : '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  transition: 'all 0.2s',
                }}
              >
                <MapPin size={16} color={meetingType === 'physical' ? '#60a5fa' : '#9ca3af'} />
                <span>In-Person (Studio)</span>
              </button>
            </div>
          </div>

          {/* Conditional: Google Meet Details */}
          {meetingType === 'gmeet' && (
            <div style={{ marginBottom: 18, background: '#15161c', padding: 14, borderRadius: 10, border: '1px solid #23252e' }}>
              <label style={labelStyle}>Google Meet Link (Optional)</label>
              <input
                type="url"
                value={gmeetUrl}
                onChange={(e) => setGmeetUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz (Auto-generated if blank)"
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: '#6b7280', margin: '6px 0 0 0' }}>
                Leave empty to have a direct Google Meet link created for both participants upon scheduling.
              </p>
            </div>
          )}

          {/* Conditional: In-Person Studio Details */}
          {meetingType === 'physical' && (
            <div style={{ marginBottom: 18, background: '#15161c', padding: 14, borderRadius: 10, border: '1px solid #23252e' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Studio / Meeting Physical Address *</label>
                <input
                  type="text"
                  required
                  value={studioAddress}
                  onChange={(e) => setStudioAddress(e.target.value)}
                  placeholder="e.g. 742 Evergreen Terrace, Studio B, New York, NY"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>City / Location</label>
                  <input
                    type="text"
                    value={studioCity}
                    onChange={(e) => setStudioCity(e.target.value)}
                    placeholder="e.g. New York, NY"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Studio Name</label>
                  <input
                    type="text"
                    value={studioName}
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="e.g. Midtown Audio Lab"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Arrival / Entry Instructions</label>
                <input
                  type="text"
                  value={arrivalNotes}
                  onChange={(e) => setArrivalNotes(e.target.value)}
                  placeholder="e.g. Check in with security on 4th floor, buzzer 402."
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Session Topic */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Podcast Episode Topic / Title</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Deep Tech & AI Infrastructure Episode"
              style={inputStyle}
            />
          </div>

          {/* Date & Time */}
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

          {/* Duration & Fee */}
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
                <option value="120">120 Minutes</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Session Fee ($ USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14, fontWeight: 600 }}>
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  style={{ ...inputStyle, paddingLeft: 24 }}
                />
              </div>
            </div>
          </div>

          {/* Agenda & Talking Points */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Discussion Agenda & Preparation Notes (Optional)</label>
            <textarea
              rows="3"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Outline specific discussion topics, interview questions, or equipment notes..."
              style={textareaStyle}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #23252e', paddingTop: 16 }}>
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
              {submitting ? 'Creating Booking…' : 'Schedule Session'}
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
  background: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(5px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16,
};

const modalStyle = {
  background: '#111216',
  borderRadius: 18,
  border: '1px solid #23252e',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  maxWidth: 540,
  width: '100%',
  overflow: 'hidden',
  color: '#f3f4f6',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 24px',
  borderBottom: '1px solid #23252e',
  background: '#15161c',
};

const iconBadgeStyle = {
  width: 38,
  height: 38,
  borderRadius: 10,
  background: 'rgba(37, 99, 235, 0.15)',
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
  fontSize: 12.5,
  fontWeight: 600,
  color: '#d1d5db',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 10,
  border: '1px solid #282a36',
  background: '#161820',
  color: '#f3f4f6',
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 10,
  border: '1px solid #282a36',
  background: '#161820',
  color: '#f3f4f6',
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle = {
  width: '100%',
  padding: '11px 13px',
  borderRadius: 10,
  border: '1px solid #282a36',
  background: '#161820',
  color: '#f3f4f6',
  fontSize: 13.5,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const errorAlertStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 16,
};

const successAlertStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: 10,
  padding: '10px 14px',
  marginBottom: 16,
};

const cancelBtnStyle = {
  padding: '10px 18px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid #282a36',
  color: '#9ca3af',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const submitBtnStyle = {
  padding: '10px 20px',
  borderRadius: 8,
  background: '#2563eb',
  color: '#ffffff',
  border: 'none',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
  transition: 'background 0.2s ease',
};
