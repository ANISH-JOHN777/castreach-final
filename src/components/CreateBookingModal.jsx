import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Video, 
  MapPin, 
  ShieldCheck, 
  Lock,
  Send 
} from 'lucide-react';

export default function CreateBookingModal({ 
  isOpen, 
  onClose, 
  recipientUser, 
  recipient, 
  initialRecipient, 
  guest, 
  onSuccess 
}) {
  const { user, authFetch } = useAuth();
  const targetRecipient = recipientUser || recipient || initialRecipient || guest;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  // Pick an initial slot that avoids static collision
  const getDynamicInitialTime = () => {
    const curHour = new Date().getHours();
    const slotHour = Math.max(10, Math.min(20, (curHour + 3) % 24));
    return `${slotHour.toString().padStart(2, '0')}:00`;
  };

  const [topic, setTopic] = useState('Podcast Recording Session');
  const [date, setDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState(getDynamicInitialTime());
  const [durationMin, setDurationMin] = useState('60');
  const [suggestedSlot, setSuggestedSlot] = useState(null);
  
  // Resolve fee from rateNum or sessionRateCents or rate or sessionRate
  const initialRate = targetRecipient?.rateNum 
    ? String(targetRecipient.rateNum) 
    : targetRecipient?.sessionRate
      ? String(targetRecipient.sessionRate)
      : targetRecipient?.sessionRateCents 
        ? String(targetRecipient.sessionRateCents / 100)
        : targetRecipient?.rate?.replace(/[^0-9]/g, '') || '1500';

  const [amount, setAmount] = useState(initialRate);
  
  // Meeting Mode: 'gmeet' or 'physical'
  const [meetingType, setMeetingType] = useState('gmeet');
  const [gmeetUrl, setGmeetUrl] = useState('');
  const [studioAddress, setStudioAddress] = useState(targetRecipient?.studioLocation || targetRecipient?.location || '');
  const [studioCity, setStudioCity] = useState('');
  const [studioName, setStudioName] = useState(targetRecipient?.podcastName ? `${targetRecipient.podcastName} Studio` : 'Main Recording Studio');
  const [arrivalNotes, setArrivalNotes] = useState('Please arrive 15 minutes before the session starts.');
  const [agenda, setAgenda] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const rawFee = Math.max(0, parseFloat(amount) || 0);
  const platformFee = Math.round(rawFee * 0.1);
  const totalEscrowHold = rawFee + platformFee;

  const handleSubmit = async (e, forceOverlap = false) => {
    if (e && e.preventDefault) e.preventDefault();
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

      const durationMinutes = parseInt(durationMin, 10) || 60;
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      // Validate location if in-person
      if (meetingType === 'physical' && !studioAddress.trim()) {
        setErrorMsg('Please provide the physical studio or meeting address.');
        setSubmitting(false);
        return;
      }

      const isTargetHost = targetRecipient?.role === 'host';

      let computedHostId = null;
      let computedGuestId = null;

      if (isTargetHost) {
        computedHostId = targetRecipient?._id || targetRecipient?.id;
        computedGuestId = user?._id || user?.id;
      } else {
        computedHostId = user?._id || user?.id;
        computedGuestId = targetRecipient?._id || targetRecipient?.id;
      }

      const payload = {
        hostId: computedHostId,
        guestId: computedGuestId,
        guestName: targetRecipient?.name || targetRecipient?.displayName,
        guestEmail: targetRecipient?.email,
        guestAvatar: targetRecipient?.avatar || targetRecipient?.profilePicture,
        guestBio: targetRecipient?.bio,
        guestExpertise: targetRecipient?.expertise,
        guestRateCents: Math.round(rawFee * 100),
        slotStart: startDate.toISOString(),
        slotEnd: endDate.toISOString(),
        topics: [topic.trim() || 'Podcast Recording'],
        message: agenda.trim() || `Booked session for "${topic.trim()}"`,
        sessionFee: rawFee,
        meetingType: meetingType,
        gmeetUrl: meetingType === 'gmeet' ? gmeetUrl.trim() : undefined,
        location: meetingType === 'physical' ? studioAddress.trim() : 'Remote HD Studio',
        studioLocation: meetingType === 'physical' ? studioAddress.trim() : undefined,
        studioCity: meetingType === 'physical' ? studioCity.trim() : undefined,
        studioName: meetingType === 'physical' ? studioName.trim() : undefined,
        arrivalInstructions: meetingType === 'physical' ? arrivalNotes.trim() : undefined,
        allowOverlap: forceOverlap || undefined,
      };

      const res = await authFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.suggestedSlotStart) {
          try {
            const dt = new Date(data.suggestedSlotStart);
            const sugDate = dt.toISOString().split('T')[0];
            const sugTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            setSuggestedSlot({ date: sugDate, time: sugTime });
          } catch (e) {}
        }
        throw new Error(data.error || 'Failed to create booking.');
      }

      const newBooking = data.booking;

      // Lock Escrow if there is a session fee
      if (newBooking?._id && rawFee > 0) {
        try {
          await authFetch(`/escrow/${newBooking._id}/deposit`, {
            method: 'POST',
            body: JSON.stringify({
              amount: rawFee,
              currency: 'USD',
            }),
          });
        } catch (escrowErr) {
          console.warn('Escrow deposit notice:', escrowErr.message);
        }
      }

      // Send system message in chat
      try {
        const formattedDate = startDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const modeDesc = meetingType === 'gmeet' ? 'Remote HD Studio' : `In-Person Studio (${studioAddress.trim()})`;
        await authFetch('/messages', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: newBooking._id,
            content: `Interview Arranged: "${topic}" via ${modeDesc} on ${formattedDate} at ${formattedTime}. Escrow hold: $${rawFee.toFixed(2)} held safely by CastReach.`,
          }),
        });
      } catch (err) {
        console.warn('System message notification warning:', err);
      }

      setSuccessMsg('Invitation sent successfully!');
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

  const isTargetHost = targetRecipient?.role === 'host';

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={iconBadgeStyle}>
              <Calendar size={18} color="#22C55E" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#FFFFFF' }}>
                {isTargetHost ? 'Request Interview on Show' : 'Send Invite to Guest'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#A39EA9' }}>
                Set session details and send your invitation
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={closeBtnStyle}>
            <X size={18} color="#A39EA9" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={errorAlertStyle}>
              <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 700 }}>{errorMsg}</span>
                {errorMsg.toLowerCase().includes('already booked') && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#A39EA9', lineHeight: 1.4 }}>
                      This time slot is already reserved. Choose another hour or click below:
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {suggestedSlot && (
                        <button
                          type="button"
                          onClick={() => {
                            setDate(suggestedSlot.date);
                            setStartTime(suggestedSlot.time);
                            setErrorMsg('');
                            setSuggestedSlot(null);
                          }}
                          style={autoFixBtnStyle}
                        >
                          ⚡ Switch to Next Open ({suggestedSlot.time})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const [h, m] = startTime.split(':');
                          const nextH = ((parseInt(h, 10) + 2) % 24).toString().padStart(2, '0');
                          setStartTime(`${nextH}:${m || '00'}`);
                          setErrorMsg('');
                        }}
                        style={autoFixBtnStyle}
                      >
                        +2 Hours
                      </button>
                      <button
                        type="button"
                        onClick={(ev) => handleSubmit(ev, true)}
                        style={devBypassBtnStyle}
                        title="Allow overlapping session for rapid prototype testing"
                      >
                        ⚡ Allow Overlap (Test Mode)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div style={successAlertStyle}>
              <CheckCircle size={16} color="#22C55E" />
              <span style={{ fontSize: 13, color: '#22C55E', fontWeight: 600 }}>{successMsg}</span>
            </div>
          )}

          {/* Recipient Profile Card */}
          {targetRecipient && (
            <div style={{
              background: '#0D0C12',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}>
              <div style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                background: '#171520',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 16,
                flexShrink: 0,
                overflow: 'hidden',
              }}>
                {targetRecipient.avatar || targetRecipient.profilePicture ? (
                  <img src={targetRecipient.avatar || targetRecipient.profilePicture} alt={targetRecipient.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  targetRecipient.name?.charAt(0)?.toUpperCase() || 'G'
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>{targetRecipient.name}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    color: '#22C55E',
                  }}>
                    {targetRecipient.role === 'host' ? 'Host' : 'Guest Expert'}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#A39EA9', marginTop: 2 }}>
                  {isTargetHost 
                    ? (targetRecipient.podcastName || 'Podcast Host') 
                    : (targetRecipient.expertise?.slice(0, 2).join(', ') || targetRecipient.title || 'Guest Contributor')}
                </div>
              </div>
            </div>
          )}

          {/* MEETING MODE: Virtual vs In-Person */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Interview Format</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setMeetingType('gmeet')}
                style={{
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: meetingType === 'gmeet' ? '1.5px solid #22C55E' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: meetingType === 'gmeet' ? 'rgba(34, 197, 94, 0.15)' : '#0D0C12',
                  color: meetingType === 'gmeet' ? '#22C55E' : '#A39EA9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: meetingType === 'gmeet' ? 700 : 500,
                  fontSize: 13,
                  boxShadow: meetingType === 'gmeet' ? '0 0 14px rgba(34, 197, 94, 0.2)' : 'none',
                }}
              >
                <Video size={16} color={meetingType === 'gmeet' ? '#22C55E' : '#A39EA9'} />
                <span>Remote HD Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setMeetingType('physical')}
                style={{
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: meetingType === 'physical' ? '1.5px solid #A855F7' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: meetingType === 'physical' ? 'rgba(168, 85, 247, 0.15)' : '#0D0C12',
                  color: meetingType === 'physical' ? '#A855F7' : '#A39EA9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: meetingType === 'physical' ? 700 : 500,
                  fontSize: 13,
                  boxShadow: meetingType === 'physical' ? '0 0 14px rgba(168, 85, 247, 0.2)' : 'none',
                }}
              >
                <MapPin size={16} color={meetingType === 'physical' ? '#A855F7' : '#A39EA9'} />
                <span>In-Person Studio</span>
              </button>
            </div>
          </div>

          {/* Conditional Physical Address */}
          {meetingType === 'physical' && (
            <div style={{ marginBottom: 18, background: '#0D0C12', padding: 14, borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Studio Address *</label>
                <input
                  type="text"
                  required
                  value={studioAddress}
                  onChange={(e) => setStudioAddress(e.target.value)}
                  placeholder="e.g. 100 Broadway, Studio 4A, New York, NY"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Arrival / Check-in Notes</label>
                <input
                  type="text"
                  value={arrivalNotes}
                  onChange={(e) => setArrivalNotes(e.target.value)}
                  placeholder="e.g. Front desk badge, soundcheck 15 mins prior."
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Session Topic */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Episode Topic / Working Title</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Neuroscience & Dopamine Baselines"
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
              </select>
            </div>

            <div>
              <label style={labelStyle}>Session Fee ($ USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6B6B66', fontSize: 14, fontWeight: 500 }}>
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
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Discussion Agenda & Angle (Optional)</label>
            <textarea
              rows="3"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Outline specific discussion themes, research angles, or interview objectives..."
              style={textareaStyle}
            />
          </div>

          {/* 100% Escrow Protection Breakdown Box */}
          {rawFee > 0 && (
            <div style={{
              background: '#0D0C12',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              borderRadius: 12,
              padding: '16px',
              marginBottom: 20,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={16} color="#22C55E" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                    Session Summary
                  </span>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#22C55E',
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.35)',
                  padding: '2px 8px',
                  borderRadius: 4,
                }}>
                  Secure
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#A39EA9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Guest Session Fee:</span>
                  <strong style={{ color: '#FFFFFF' }}>${rawFee.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Service Fee (10%):</span>
                  <strong style={{ color: '#A855F7' }}>${platformFee.toFixed(2)}</strong>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: 8,
                  marginTop: 4,
                  fontSize: 14.5,
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}>
                  <span>Total Amount:</span>
                  <span style={{ color: '#22C55E' }}>${totalEscrowHold.toFixed(2)}</span>
                </div>
              </div>

              <div style={{
                fontSize: 12,
                color: '#A39EA9',
                marginTop: 10,
                lineHeight: 1.45,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <Lock size={12} color="#A855F7" style={{ flexShrink: 0 }} />
                <span>Held safely in escrow and released to the guest after the recording wraps.</span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 16 }}>
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
              <Send size={15} />
              <span>{submitting ? 'Sending Invite…' : 'Send Invite'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// INLINE STYLES — DARK IMMERSION SYSTEM (GREEN, RED, PURPLE ACCENTS)
// --------------------------------------------------------------------------

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16,
};

const modalStyle = {
  background: '#171520',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 32px rgba(34, 197, 94, 0.1)',
  maxWidth: 540,
  width: '100%',
  overflow: 'hidden',
  color: '#FFFFFF',
  fontFamily: 'inherit',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  background: '#110F18',
};

const iconBadgeStyle = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: 'rgba(34, 197, 94, 0.12)',
  border: '1px solid rgba(34, 197, 94, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: 'none',
  padding: 6,
  borderRadius: 6,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 650,
  color: '#FFFFFF',
  marginBottom: 6,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.14)',
  background: '#0D0C12',
  color: '#FFFFFF',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.14)',
  background: '#0D0C12',
  color: '#FFFFFF',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const textareaStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.14)',
  background: '#0D0C12',
  color: '#FFFFFF',
  fontSize: 14,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const errorAlertStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  background: 'rgba(239, 68, 68, 0.12)',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  borderRadius: 10,
  padding: '12px 14px',
  marginBottom: 16,
};

const autoFixBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  backgroundColor: 'rgba(34, 197, 94, 0.2)',
  border: '1px solid rgba(34, 197, 94, 0.4)',
  color: '#22C55E',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const devBypassBtnStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  backgroundColor: 'rgba(168, 85, 247, 0.2)',
  border: '1px solid rgba(168, 85, 247, 0.4)',
  color: '#A855F7',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const successAlertStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.35)',
  borderRadius: 8,
  padding: '10px 14px',
  marginBottom: 16,
};

const cancelBtnStyle = {
  padding: '9px 18px',
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  color: '#FFFFFF',
  fontWeight: 600,
  fontSize: 13.5,
  cursor: 'pointer',
};

const submitBtnStyle = {
  padding: '9px 20px',
  borderRadius: 8,
  background: '#22C55E',
  color: '#0D0C12',
  border: 'none',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  boxShadow: '0 4px 18px rgba(34, 197, 94, 0.35)',
  transition: 'all 0.15s ease',
};
