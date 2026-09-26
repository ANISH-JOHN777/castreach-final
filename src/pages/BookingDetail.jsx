import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { Mic, CheckCircle, Star, Play, Download, Film, Scissors } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../hooks/useBooking';
import { stripePromise, stripeConfigured } from '../lib/stripe';
import BookingWorkspace from '../components/BookingWorkspace';
import PaymentForm from '../components/PaymentForm';
import RecordingEditorModal from '../components/RecordingEditorModal';

const STATUS_COLOR = {
  pending:   { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  confirmed: { bg: 'var(--color-background-info)',    color: 'var(--color-text-info)' },
  completed: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)' },
  cancelled: { bg: 'var(--color-background-danger)',  color: 'var(--color-text-danger)' },
};

export default function BookingDetail() {
  const { id }       = useParams();
  const { user, authFetch } = useAuth();
  const navigate     = useNavigate();
  const { booking, loading, error, confirm, cancel, complete, review, createPaymentIntent, refetch } = useBooking(id);

  const [confirmLoading,    setConfirmLoading]    = useState(false);
  const [cancelLoading,     setCancelLoading]     = useState(false);
  const [completeLoading,   setCompleteLoading]   = useState(false);
  const [showReview,       setShowReview]       = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditorModal,  setShowEditorModal]  = useState(false);
  const [rating,           setRating]           = useState(5);
  const [comment,          setComment]          = useState('');
  const [actionError,      setActionError]      = useState('');
  const [renderLoading,    setRenderLoading]    = useState(false);

  if (loading) return <Spinner />;
  if (error)   return <Error msg={error} />;
  if (!booking) return null;

  const isHost  = booking.host?._id  === user?._id || booking.host?.toString() === user?._id;
  const isGuest = booking.guest?._id === user?._id || booking.guest?.toString() === user?._id;
  const other   = isHost ? booking.guest : booking.host;
  const s       = STATUS_COLOR[booking.status] || {};
  const start   = new Date(booking.slotStart);
  const end     = new Date(booking.slotEnd);

  const handleConfirm = async () => {
    setConfirmLoading(true);
    setActionError('');
    try { await confirm(); } catch (e) { setActionError(e.message); }
    finally { setConfirmLoading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    setCancelLoading(true);
    setActionError('');
    try { await cancel(); } catch (e) { setActionError(e.message); }
    finally { setCancelLoading(false); }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this session as complete? This releases payment to the host and opens reviews.')) return;
    setCompleteLoading(true);
    setActionError('');
    try { await complete(); } catch (e) { setActionError(e.message); }
    finally { setCompleteLoading(false); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setActionError('');
    try {
      await review({ rating: Number(rating), comment });
      setShowReview(false);
    } catch (e) {
      setActionError(e.message);
    }
  };

  const handleTriggerRender = async () => {
    setRenderLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/recordings/${booking._id}/render`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger render');
      if (refetch) await refetch();
    } catch (err) {
      setActionError(err.message || 'Render request failed');
    } finally {
      setRenderLoading(false);
    }
  };

  const renderEditStatus = booking.recordingEdit?.renderStatus || 'NOT_REQUESTED';

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <Link to="/bookings" style={{ color: 'var(--color-accent)' }}>Bookings</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        Session with {other?.name}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* Left — workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info card */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                  Session with {other?.name}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {start.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {' · '}
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
                {booking.status}
              </span>
            </div>

            {/* Topics */}
            {booking.topics?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Topics</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {booking.topics.map((t) => (
                    <span key={t} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, background: 'var(--color-background-info)', color: 'var(--color-text-info)' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Booking message */}
            {booking.message && (
              <div style={{ padding: '10px 14px', background: 'var(--color-background-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-secondary)', borderLeft: '3px solid var(--color-accent)' }}>
                {booking.message}
              </div>
            )}

            {actionError && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-background-danger)', borderRadius: 8, color: 'var(--color-text-danger)', fontSize: 13 }}>
                {actionError}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              {booking.status === 'confirmed' && booking.dailyRoomUrl && (
                <button onClick={() => navigate(`/bookings/${id}/record`)} style={{ ...btn, background: '#22c55e', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Mic size={16} /> Join Recording Room
                </button>
              )}
              {booking.status === 'confirmed' && (
                <button onClick={handleComplete} disabled={completeLoading} style={{ ...btn, background: 'var(--color-accent)', opacity: completeLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={16} /> {completeLoading ? 'Completing…' : 'Mark Session Complete'}
                </button>
              )}
              {isHost && booking.status === 'pending' && (
                <button onClick={handleConfirm} disabled={confirmLoading} style={{ ...btn, background: 'var(--color-accent)', opacity: confirmLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={16} /> {confirmLoading ? 'Confirming…' : 'Confirm Booking'}
                </button>
              )}
              {booking.status === 'completed' && (
                <button onClick={() => setShowReview(true)} style={{ ...btn, background: 'var(--color-accent-purple)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={16} /> Leave Review
                </button>
              )}
              {['pending', 'confirmed'].includes(booking.status) && (
                <button onClick={handleCancel} disabled={cancelLoading} style={{ ...btn, background: 'transparent', color: 'var(--color-text-danger)', border: '1px solid var(--color-text-danger)', opacity: cancelLoading ? 0.7 : 1 }}>
                  {cancelLoading ? 'Cancelling…' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
      {/* Recording Lifecycle Status Card */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
            <Film size={18} color="var(--color-accent)" />
            Recording Lifecycle
          </div>
          <span style={{
            padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: (booking.recordingStatus === 'READY' || booking.recordingReady) ? 'rgba(16,185,129,0.15)' : booking.recordingStatus === 'RECORDING' ? 'rgba(239,68,68,0.15)' : 'var(--color-background-secondary)',
            color: (booking.recordingStatus === 'READY' || booking.recordingReady) ? '#10b981' : booking.recordingStatus === 'RECORDING' ? '#ef4444' : 'var(--color-text-secondary)'
          }}>
            {booking.recordingStatus === 'RECORDING' && '● Recording in Progress'}
            {booking.recordingStatus === 'PROCESSING' && '⏳ Processing Recording…'}
            {(booking.recordingStatus === 'READY' || booking.recordingReady) && '✓ Recording Ready'}
            {booking.recordingStatus === 'FAILED' && '⚠️ Recording Failed'}
            {(!booking.recordingStatus || booking.recordingStatus === 'NOT_STARTED') && !booking.recordingReady && 'Not Started'}
          </span>
        </div>

        {(booking.recordingReady || booking.recordingUrl) ? (
          <div style={{ marginTop: 10, padding: 12, background: 'var(--color-background-secondary)', borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 12, lineHeight: 1.4 }}>
              The cloud recording for this session is ready. You can preview, trim non-destructively, or trigger an asynchronous FFmpeg render.
            </p>

            {booking.recordingEdit && (
              <div style={{ padding: '8px 12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, fontSize: 12, color: '#a78bfa', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Scissors size={14} />
                  <span>
                    Saved Edit (EDL): Trim {booking.recordingEdit.trimStartSeconds}s – {booking.recordingEdit.trimEndSeconds}s ({booking.recordingEdit.editedDurationSeconds}s active)
                  </span>
                </div>
                <span style={{ fontWeight: 600, color: renderEditStatus === 'READY' ? '#10b981' : renderEditStatus === 'FAILED' ? '#ef4444' : '#f59e0b' }}>
                  Render: {renderEditStatus}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowPreviewModal(true)}
                style={{ ...btn, background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Play size={14} /> Preview Original
              </button>

              <button
                onClick={() => setShowEditorModal(true)}
                style={{ ...btn, background: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Scissors size={14} /> Edit EDL
              </button>

              {booking.recordingEdit && renderEditStatus !== 'READY' && renderEditStatus !== 'QUEUED' && renderEditStatus !== 'PROCESSING' && (
                <button
                  onClick={handleTriggerRender}
                  disabled={renderLoading}
                  style={{ ...btn, background: '#10b981', opacity: renderLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Film size={14} /> {renderLoading ? 'Queuing Render…' : renderEditStatus === 'FAILED' ? 'Retry Render' : 'Render Edited Video (FFmpeg)'}
                </button>
              )}

              {(renderEditStatus === 'QUEUED' || renderEditStatus === 'PROCESSING') && (
                <button
                  disabled
                  style={{ ...btn, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  ⏳ FFmpeg Rendering ({renderEditStatus})…
                </button>
              )}

              <a
                href={booking.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...btn, background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> Download Original
              </a>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {booking.recordingStatus === 'RECORDING' ? 'Cloud recording is actively capturing this session.' :
             booking.recordingStatus === 'PROCESSING' ? 'Recording has stopped and is currently being rendered.' :
             booking.recordingStatus === 'FAILED' ? 'Cloud recording encountered an issue during capture.' :
             'Recording will automatically begin when participants join the studio.'}
          </p>
        )}
      </div>

          {/* Video Preview Modal */}
          {showPreviewModal && booking.recordingUrl && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: '#18181b', borderRadius: 12, maxWidth: 720, width: '100%', padding: 20, color: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Recording Preview</h3>
                  <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
                <video src={booking.recordingUrl} controls autoPlay style={{ width: '100%', borderRadius: 8, maxHeight: 400, background: '#000' }} />
              </div>
            </div>
          )}

          {/* Phase C3.1 Recording Editor Modal */}
          {showEditorModal && booking.recordingUrl && (
            <RecordingEditorModal
              booking={booking}
              onClose={() => setShowEditorModal(false)}
              onSaveSuccess={() => { refetch(); }}
            />
          )}

          {/* Review form */}
          {showReview && (
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Leave a Review</h3>
              <form onSubmit={submitReview}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n} type="button" onClick={() => setRating(n)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Star size={24} fill={n <= rating ? '#f59e0b' : 'none'} color={n <= rating ? '#f59e0b' : '#9ca3af'} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience…"
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', fontSize: 13, resize: 'vertical', marginBottom: 12 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" style={{ ...btn, flex: 1, background: 'var(--color-accent)' }}>Submit Review</button>
                  <button type="button" onClick={() => setShowReview(false)} style={{ ...btn, background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-tertiary)' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Workspace tabs (chat, notes, AI, checklist) */}
          <div style={{ height: 480 }}>
            <BookingWorkspace booking={{ ...booking, currentUserId: user?._id }} />
          </div>
        </div>

        {/* Right — participant info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ParticipantCard user={booking.host}  label="Host" />
          <ParticipantCard user={booking.guest} label="Guest" />

          {/* Payment due — guest collects card once the host confirms */}
          {isGuest
            && booking.status === 'confirmed'
            && booking.amountCents > 0
            && booking.paymentStatus === 'unpaid' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Payment due</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                ${((booking.amountCents || 0) / 100).toFixed(2)} {booking.currency?.toUpperCase()}
              </div>
              {stripeConfigured ? (
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    amountLabel={`$${((booking.amountCents || 0) / 100).toFixed(2)}`}
                    createPaymentIntent={createPaymentIntent}
                    onPaid={refetch}
                  />
                </Elements>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--color-text-danger)' }}>
                  Payments are not configured (VITE_STRIPE_PUBLISHABLE_KEY missing).
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 10, lineHeight: 1.5 }}>
                Your card is authorized now and only charged after the session is completed.
              </div>
            </div>
          )}

          {/* Payment status */}
          {booking.paymentStatus !== 'unpaid' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-text-secondary)', marginBottom: 8 }}>Payment</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>
                  ${((booking.amountCents || 0) / 100).toFixed(2)} {booking.currency?.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, textTransform: 'capitalize', padding: '3px 10px', borderRadius: 12, background: 'var(--color-background-success)', color: 'var(--color-text-success)' }}>
                  {booking.paymentStatus}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantCard({ user, label }) {
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div style={card}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-text-secondary)', marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 38, height: 38, borderRadius: 19, background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden', flexShrink: 0 }}>
          {user.avatar
            ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
          {user.podcastName && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{user.podcastName}</div>}
        </div>
      </div>
      {user.bio && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{user.bio}</p>}
      <button
        onClick={() => navigate(`/profile/${user._id}`)}
        style={{ width: '100%', padding: '7px', border: '1px solid var(--color-border-tertiary)', borderRadius: 7, background: 'transparent', color: 'var(--color-text-primary)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
      >
        View Profile
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--color-border-tertiary)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    </div>
  );
}

function Error({ msg }) {
  return (
    <div style={{ padding: '16px', background: 'var(--color-background-danger)', borderRadius: 8, color: 'var(--color-text-danger)', fontSize: 13 }}>
      {msg}
    </div>
  );
}

const card = {
  background: 'var(--color-background-primary)',
  border: '1px solid var(--color-border-tertiary)',
  borderRadius: 12, padding: '1.2rem',
};
const btn = {
  padding: '9px 18px', border: 'none', borderRadius: 8,
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
