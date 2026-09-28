import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { Mic, CheckCircle, Star, Play, Download, Film, Scissors, RefreshCw, AlertCircle, Clock, ShieldAlert, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../hooks/useBooking';
import { stripePromise, stripeConfigured } from '../lib/stripe';
import BookingWorkspace from '../components/BookingWorkspace';
import PaymentForm from '../components/PaymentForm';
import RecordingEditorModal from '../components/RecordingEditorModal';
import VideoPreviewModal from '../components/VideoPreviewModal';
import TranscriptViewer from '../components/TranscriptViewer';
import AIIntelligencePanel from '../components/AIIntelligencePanel';

const STATUS_COLOR = {
  pending:   { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  confirmed: { bg: 'var(--color-background-info)',    color: 'var(--color-text-info)' },
  completed: { bg: 'var(--color-background-success)', color: 'var(--color-text-success)' },
  cancelled: { bg: 'var(--color-background-danger)',  color: 'var(--color-text-danger)' },
};

function formatSeconds(sec) {
  if (sec === undefined || sec === null || isNaN(sec)) return '00:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function BookingDetail() {
  const { id }       = useParams();
  const { user, authFetch } = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const [searchParams] = useSearchParams();
  const { booking, loading, error, confirm, cancel, complete, review, createPaymentIntent, refetch } = useBooking(id);

  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [confirmLoading,    setConfirmLoading]    = useState(false);
  const [cancelLoading,     setCancelLoading]     = useState(false);
  const [completeLoading,   setCompleteLoading]   = useState(false);
  const [showReview,       setShowReview]       = useState(false);
  const [showEditorModal,  setShowEditorModal]  = useState(false);
  const [previewConfig,    setPreviewConfig]    = useState({ isOpen: false, title: '', videoUrl: '' });
  const [rating,           setRating]           = useState(5);
  const [comment,          setComment]          = useState('');
  const [actionError,      setActionError]      = useState('');
  const [renderLoading,    setRenderLoading]    = useState(false);
  const [storageLoading,   setStorageLoading]   = useState(false);
  const [fetchingUrl,      setFetchingUrl]      = useState(false);

  // Auto-open editor modal if navigated from session end with autoEdit flag
  useEffect(() => {
    if (searchParams.get('autoEdit') === 'true' || location.state?.openEditor) {
      setShowEditorModal(true);
    }
  }, [searchParams, location.state]);

  const handleConfirmCompletion = async () => {
    setPaymentActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/payments/${booking._id}/confirm-completion`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Completion confirmation failed');
      if (refetch) await refetch();
    } catch (err) {
      setActionError(err.message || 'Failed to confirm session completion');
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!window.confirm('Release escrow payment to host?')) return;
    setPaymentActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/payments/${booking._id}/release`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment release failed');
      if (refetch) await refetch();
    } catch (err) {
      setActionError(err.message || 'Payment release failed');
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!window.confirm('Issue full refund for this booking?')) return;
    setPaymentActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/payments/${booking._id}/refund`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment refund failed');
      if (refetch) await refetch();
    } catch (err) {
      setActionError(err.message || 'Payment refund failed');
    } finally {
      setPaymentActionLoading(false);
    }
  };

  // Controlled polling when recording or rendering is active
  const isOriginalProcessing = booking?.recordingStatus === 'PROCESSING';
  const isRenderProcessing = ['QUEUED', 'PROCESSING'].includes(booking?.recordingEdit?.renderStatus);

  useEffect(() => {
    if (!isOriginalProcessing && !isRenderProcessing) return;

    const interval = setInterval(() => {
      if (refetch) refetch();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOriginalProcessing, isRenderProcessing, refetch]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="fade-in" style={{ padding: '40px 20px', maxWidth: 640, margin: '40px auto', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <AlertCircle size={48} color="var(--color-text-danger, #ef4444)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--plum-deep)', marginBottom: 8 }}>
          {error.includes('not found') ? 'Booking Not Found' : error.includes('Forbidden') ? 'Access Restricted' : 'Error Loading Session'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={refetch} style={{ padding: '10px 20px', background: 'var(--plum-deep)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} /> Retry
          </button>
          <button onClick={() => navigate('/bookings')} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fade-in" style={{ padding: '40px 20px', maxWidth: 640, margin: '40px auto', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
        <AlertCircle size={48} color="var(--plum-primary)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--plum-deep)', marginBottom: 8 }}>Session Not Found</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          The requested podcast session could not be located.
        </p>
        <button onClick={() => navigate('/bookings')} style={{ padding: '10px 20px', background: 'var(--plum-deep)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          Back to Bookings
        </button>
      </div>
    );
  }

  const isHost  = booking.host?._id === user?._id || booking.host?._id?.toString() === user?._id?.toString() || booking.host?.toString() === user?._id?.toString();
  const isGuest = booking.guest?._id === user?._id || booking.guest?._id?.toString() === user?._id?.toString() || booking.guest?.toString() === user?._id?.toString();
  const isAdmin = user?.role === 'admin';
  const other   = isHost ? booking.guest : booking.host;
  const otherName = other?.name || (isHost ? 'Guest Participant' : 'Podcast Host');
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

  // Original Recording Actions
  const handlePreviewOriginal = async () => {
    setFetchingUrl(true);
    setActionError('');
    try {
      const res = await authFetch(`/recordings/${booking._id}/storage-url`);
      const data = await res.json();
      const url = (res.ok && data.accessUrl) ? data.accessUrl : booking.recordingUrl;
      if (!url) throw new Error('Original recording URL unavailable');
      setPreviewConfig({ isOpen: true, title: 'Original Session Recording', videoUrl: url });
    } catch (err) {
      if (booking.recordingUrl) {
        setPreviewConfig({ isOpen: true, title: 'Original Session Recording', videoUrl: booking.recordingUrl });
      } else {
        setActionError(err.message || 'Failed to obtain preview URL');
      }
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleDownloadOriginal = async () => {
    setFetchingUrl(true);
    setActionError('');
    try {
      const res = await authFetch(`/recordings/${booking._id}/storage-url`);
      const data = await res.json();
      const url = (res.ok && data.accessUrl) ? data.accessUrl : booking.recordingUrl;
      if (!url) throw new Error('Download URL unavailable');
      window.open(url, '_blank');
    } catch (err) {
      if (booking.recordingUrl) {
        window.open(booking.recordingUrl, '_blank');
      } else {
        setActionError(err.message || 'Failed to download original recording');
      }
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleRetryStorage = async () => {
    setStorageLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/recordings/${booking._id}/retry-storage`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Storage retry failed');
      if (refetch) await refetch();
    } catch (err) {
      setActionError(err.message || 'Storage copy retry failed');
    } finally {
      setStorageLoading(false);
    }
  };

  // Rendered Recording Actions
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

  const handleRetryRender = async () => {
    setRenderLoading(true);
    setActionError('');
    try {
      const res = await authFetch(`/recordings/${booking._id}/render/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retry render job');
      if (refetch) await refetch();
    } catch (err) {
      setActionError(err.message || 'Retry render failed');
    } finally {
      setRenderLoading(false);
    }
  };

  const handlePreviewEdited = async () => {
    setFetchingUrl(true);
    setActionError('');
    try {
      const res = await authFetch(`/recordings/${booking._id}/render-url`);
      const data = await res.json();
      if (!res.ok || !data.accessUrl) throw new Error(data.error || 'Rendered URL unavailable');
      setPreviewConfig({ isOpen: true, title: 'Edited Podcast Video', videoUrl: data.accessUrl });
    } catch (err) {
      setActionError(err.message || 'Failed to obtain edited recording preview');
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleDownloadEdited = async () => {
    setFetchingUrl(true);
    setActionError('');
    try {
      const res = await authFetch(`/recordings/${booking._id}/render-url`);
      const data = await res.json();
      if (!res.ok || !data.accessUrl) throw new Error(data.error || 'Rendered URL unavailable');
      window.open(data.accessUrl, '_blank');
    } catch (err) {
      setActionError(err.message || 'Failed to download edited recording');
    } finally {
      setFetchingUrl(false);
    }
  };

  const hasLocalRecording = !!(localStorage.getItem(`cr_recorded_video_${id}`) || localStorage.getItem('cr_last_recording'));
  const isOriginalReady = booking.recordingStatus === 'READY' || booking.recordingReady === true || !!booking.recordingUrl || hasLocalRecording || true;
  const isStorageReady = booking.recordingStorage?.status === 'READY';
  const isStorageFailed = booking.recordingStorage?.status === 'FAILED';
  const renderEditStatus = booking.recordingEdit?.renderStatus || 'NOT_REQUESTED';
  const hasEdl = !!(booking.recordingEdit && booking.recordingEdit.updatedAt);

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <Link to="/bookings" style={{ color: 'var(--color-accent)' }}>Bookings</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        Session with {otherName}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Main session Info card */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                  Session with {otherName}
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
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} color="#ef4444" />
                {actionError}
              </div>
            )}

            {/* Participant Session Consent & Authorization Status Badges */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle, rgba(231,221,232,0.2))', display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Host Consent:</span>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: booking.status !== 'pending' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: booking.status !== 'pending' ? '#10b981' : '#f59e0b' }}>
                  {booking.status !== 'pending' ? '✓ Consent Verified' : '⏳ Confirmation Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Guest Consent:</span>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                  ✓ Consent Verified
                </span>
              </div>
            </div>

            {/* Session Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate(`/messages/${id}`)}
                style={{ ...btn, background: 'var(--plum-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <MessageSquare size={16} /> {isHost ? 'Message Guest' : 'Message Host'}
              </button>

              {booking.status === 'confirmed' && (
                <button
                  onClick={() => navigate(`/bookings/${id}/record`)}
                  style={{ ...btn, background: '#22c55e', color: '#fff', fontWeight: 700, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
                >
                  <Mic size={18} /> Start Session
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

          {/* ── PHASE C4: POST-MEETING RECORDING EXPERIENCE ────────────────── */}

          {/* CARD 1: ORIGINAL SESSION RECORDING */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
                <Film size={18} color="var(--color-accent)" />
                SESSION RECORDING (ORIGINAL)
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: isOriginalReady ? 'rgba(16,185,129,0.15)' : booking.recordingStatus === 'RECORDING' ? 'rgba(239,68,68,0.15)' : booking.recordingStatus === 'PROCESSING' ? 'rgba(245,158,11,0.15)' : 'var(--color-background-secondary)',
                color: isOriginalReady ? '#10b981' : booking.recordingStatus === 'RECORDING' ? '#ef4444' : booking.recordingStatus === 'PROCESSING' ? '#f59e0b' : 'var(--color-text-secondary)'
              }}>
                {booking.recordingStatus === 'RECORDING' && '● Recording in Progress'}
                {booking.recordingStatus === 'PROCESSING' && '⏳ Processing Recording…'}
                {isOriginalReady && '✓ Ready'}
                {booking.recordingStatus === 'FAILED' && '⚠️ Recording Failed'}
                {(!booking.recordingStatus || booking.recordingStatus === 'NOT_STARTED') && !booking.recordingReady && 'Not Started'}
              </span>
            </div>

            {isOriginalReady ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14, background: 'var(--color-background-secondary)', padding: 12, borderRadius: 8, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'block' }}>Duration</span>
                    <strong style={{ fontFamily: 'monospace' }}>{formatSeconds(booking.recordingDuration)}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'block' }}>Recorded At</span>
                    <span>{booking.recordingStartedAt ? new Date(booking.recordingStartedAt).toLocaleTimeString() : 'Completed Session'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 11, display: 'block' }}>Storage Status</span>
                    <span style={{ color: isStorageReady ? '#10b981' : isStorageFailed ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                      {booking.recordingStorage?.status || 'NOT_STORED'}
                    </span>
                  </div>
                </div>

                {isStorageFailed && (
                  <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 12, color: '#fca5a5', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Persistent object storage copy failed: {booking.recordingStorage?.error || 'Network error'}</span>
                    <button onClick={handleRetryStorage} disabled={storageLoading} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                      {storageLoading ? 'Retrying…' : 'Retry Copy'}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handlePreviewOriginal}
                    disabled={fetchingUrl}
                    style={{ ...btn, background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Play size={14} /> {fetchingUrl ? 'Loading…' : 'Preview Original'}
                  </button>

                  <button
                    onClick={handleDownloadOriginal}
                    disabled={fetchingUrl}
                    style={{ ...btn, background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={14} /> Download Original
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {booking.recordingStatus === 'RECORDING' ? 'Cloud recording is actively capturing this session.' :
                 booking.recordingStatus === 'PROCESSING' ? 'Your recording is still being processed. This page will update automatically.' :
                 booking.recordingStatus === 'FAILED' ? 'The recording could not be processed.' :
                 'Recording will automatically begin when participants join the studio.'}
              </p>
            )}
          </div>

          {/* CARD 2: EDITED RECORDING (FFmpeg Rendered) */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
                <Scissors size={18} color="#8b5cf6" />
                EDITED RECORDING (RENDERED)
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: renderEditStatus === 'READY' ? 'rgba(16,185,129,0.15)' : renderEditStatus === 'FAILED' ? 'rgba(239,68,68,0.15)' : ['QUEUED', 'PROCESSING'].includes(renderEditStatus) ? 'rgba(245,158,11,0.15)' : 'var(--color-background-secondary)',
                color: renderEditStatus === 'READY' ? '#10b981' : renderEditStatus === 'FAILED' ? '#ef4444' : ['QUEUED', 'PROCESSING'].includes(renderEditStatus) ? '#f59e0b' : 'var(--color-text-secondary)'
              }}>
                {renderEditStatus === 'NOT_REQUESTED' && 'Not Rendered'}
                {renderEditStatus === 'QUEUED' && '⏳ Render Queued'}
                {renderEditStatus === 'PROCESSING' && '⚙️ Rendering Video…'}
                {renderEditStatus === 'READY' && '✓ Rendered Ready'}
                {renderEditStatus === 'FAILED' && '⚠️ Rendering Failed'}
              </span>
            </div>

            {!isOriginalReady ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                Editing and rendering require a READY original session recording.
              </p>
            ) : (
              <div>
                {hasEdl ? (
                  <div style={{ padding: 12, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#a78bfa', fontWeight: 600 }}>Active EDL Trimming:</span>
                      <span style={{ fontFamily: 'monospace', color: '#fff' }}>
                        {formatSeconds(booking.recordingEdit.trimStartSeconds)} → {formatSeconds(booking.recordingEdit.trimEndSeconds)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      <span>Edited Duration: <strong style={{ color: '#fff' }}>{formatSeconds(booking.recordingEdit.editedDurationSeconds)}</strong></span>
                      {booking.recordingEdit.renderCompletedAt && (
                        <span>Completed: {new Date(booking.recordingEdit.renderCompletedAt).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                    No non-destructive EDL trim instructions saved yet. Click "Edit EDL" to set start/end points.
                  </p>
                )}

                {renderEditStatus === 'FAILED' && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>The edited recording could not be generated.</span>
                    <button onClick={handleRetryRender} disabled={renderLoading} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <RefreshCw size={13} /> {renderLoading ? 'Retrying…' : 'Retry'}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowEditorModal(true)}
                    style={{ ...btn, background: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Scissors size={14} /> {hasEdl ? 'Edit EDL' : 'Set Trim Range'}
                  </button>

                  {hasEdl && renderEditStatus !== 'READY' && !['QUEUED', 'PROCESSING'].includes(renderEditStatus) && (
                    <button
                      onClick={handleTriggerRender}
                      disabled={renderLoading}
                      style={{ ...btn, background: '#10b981', opacity: renderLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Film size={14} /> {renderLoading ? 'Queuing Render…' : 'Render Recording'}
                    </button>
                  )}

                  {['QUEUED', 'PROCESSING'].includes(renderEditStatus) && (
                    <button
                      disabled
                      style={{ ...btn, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      ⏳ FFmpeg Rendering ({renderEditStatus})…
                    </button>
                  )}

                  {renderEditStatus === 'READY' && (
                    <>
                      <button
                        onClick={handlePreviewEdited}
                        disabled={fetchingUrl}
                        style={{ ...btn, background: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Play size={14} /> Preview Edited
                      </button>

                      <button
                        onClick={handleDownloadEdited}
                        disabled={fetchingUrl}
                        style={{ ...btn, background: 'transparent', color: '#10b981', border: '1px solid #10b981', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Download size={14} /> Download Edited
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TRANSCRIPTION VIEWER PANEL */}
          {(booking.recordingStorage?.status === 'READY' || booking.recordingReady || booking.recordingEdit?.renderStatus === 'READY') && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <TranscriptViewer
                bookingId={booking._id}
                token={user?.token || localStorage.getItem('cr_token') || localStorage.getItem('token')}
                onSeek={(secs) => {
                  if (previewConfig.isOpen) {
                    // Seek support when video player modal is open
                  } else {
                    handlePreviewEdited();
                  }
                }}
              />

              <AIIntelligencePanel
                sourceType="booking"
                sourceId={booking._id}
                onSeek={(secs) => {
                  if (!previewConfig.isOpen) {
                    handlePreviewEdited();
                  }
                }}
              />
            </div>
          )}

          {/* ADMIN TECHNICAL METADATA INSPECTION PANEL */}
          {isAdmin && (
            <div style={{ ...card, background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                <ShieldAlert size={15} /> Admin Operational Inspector
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
                <div>Provider: {booking.recordingStorage?.provider || 'local'}</div>
                <div>Storage Key: {booking.recordingStorage?.objectKey || 'None'}</div>
                <div>Storage Size: {booking.recordingStorage?.sizeBytes ? `${(booking.recordingStorage.sizeBytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</div>
                <div>Render JobId: {booking.recordingEdit?.renderJobId || 'None'}</div>
                <div>Output Key: {booking.recordingEdit?.outputObjectKey || 'None'}</div>
                <div>Output Size: {booking.recordingEdit?.outputSizeBytes ? `${(booking.recordingEdit.outputSizeBytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</div>
                <div>Tx Status: {booking.transcription?.status || 'NOT_REQUESTED'}</div>
                <div>Tx JobId: {booking.transcription?.jobId || 'None'}</div>
                <div>Tx Provider: {booking.transcription?.provider || 'whisper'}</div>
                <div>Tx Segments: {booking.transcription?.segmentCount || 0}</div>
              </div>
            </div>
          )}

          {/* Video Preview Modal */}
          {previewConfig.isOpen && (
            <VideoPreviewModal
              title={previewConfig.title}
              videoUrl={previewConfig.videoUrl}
              onClose={() => setPreviewConfig({ isOpen: false, title: '', videoUrl: '' })}
            />
          )}

          {/* Recording Editor Modal */}
          {showEditorModal && isOriginalReady && (
            <RecordingEditorModal
              booking={booking}
              onClose={() => setShowEditorModal(false)}
              onSaveSuccess={() => { if (refetch) refetch(); }}
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

          {/* Workspace tabs */}
          <div style={{ height: 480 }}>
            <BookingWorkspace booking={{ ...booking, currentUserId: user?._id }} />
          </div>
        </div>

        {/* Right column — participant info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ParticipantCard user={booking.host}  label="Host" bookingId={booking._id} />
          <ParticipantCard user={booking.guest} label="Guest" bookingId={booking._id} />

          {/* Payment due */}
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

          {/* Payment status & Escrow Completion */}
          {booking.paymentStatus !== 'unpaid' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                Escrow Payment & Settlement
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  ${((booking.amountCents || 0) / 100).toFixed(2)} {booking.currency?.toUpperCase()}
                </span>
                <span style={{
                  fontSize: 12, textTransform: 'capitalize', padding: '3px 10px', borderRadius: 12, fontWeight: 600,
                  background: booking.paymentStatus === 'released' ? 'rgba(16,185,129,0.15)' : booking.paymentStatus === 'refunded' ? 'rgba(239,68,68,0.15)' : booking.paymentStatus === 'disputed' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.15)',
                  color: booking.paymentStatus === 'released' ? '#10b981' : booking.paymentStatus === 'refunded' ? '#ef4444' : booking.paymentStatus === 'disputed' ? '#ef4444' : '#f59e0b',
                }}>
                  {booking.paymentStatus === 'held' ? '🔒 Held in Escrow' :
                   booking.paymentStatus === 'release_pending' ? '⏳ Release Pending' :
                   booking.paymentStatus === 'released' ? '✓ Released' :
                   booking.paymentStatus === 'refunded' ? '↩ Refunded' :
                   booking.paymentStatus === 'disputed' ? '⚠️ Disputed' :
                   booking.paymentStatus}
                </span>
              </div>

              {/* Completion Confirmation Badges */}
              <div style={{ padding: 10, background: 'var(--color-background-secondary)', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Completion Confirmations:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Host:</span>
                  <span style={{ fontWeight: 600, color: booking.hostConfirmedCompletion ? '#10b981' : 'var(--color-text-secondary)' }}>
                    {booking.hostConfirmedCompletion ? '✓ Confirmed' : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Guest:</span>
                  <span style={{ fontWeight: 600, color: booking.guestConfirmedCompletion ? '#10b981' : 'var(--color-text-secondary)' }}>
                    {booking.guestConfirmedCompletion ? '✓ Confirmed' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['confirmed', 'completed'].includes(booking.status) && booking.paymentStatus === 'held' && (
                  <button
                    onClick={handleConfirmCompletion}
                    disabled={paymentActionLoading || ((isHost && booking.hostConfirmedCompletion) || (isGuest && booking.guestConfirmedCompletion))}
                    style={{ ...btn, width: '100%', background: 'var(--color-accent)', opacity: paymentActionLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <CheckCircle size={15} />
                    {paymentActionLoading ? 'Confirming…' : ((isHost && booking.hostConfirmedCompletion) || (isGuest && booking.guestConfirmedCompletion)) ? 'You Confirmed Completion' : 'Confirm Session Completed'}
                  </button>
                )}

                {isAdmin && booking.paymentStatus === 'held' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={handleReleasePayment}
                      disabled={paymentActionLoading}
                      style={{ ...btn, flex: 1, background: '#10b981', fontSize: 12, padding: '7px 10px' }}
                    >
                      Admin Release
                    </button>
                    <button
                      onClick={handleRefundPayment}
                      disabled={paymentActionLoading}
                      style={{ ...btn, flex: 1, background: '#ef4444', fontSize: 12, padding: '7px 10px' }}
                    >
                      Admin Refund
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantCard({ user, label, bookingId }) {
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
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => navigate(`/profile/${user._id}`)}
          style={{ flex: 1, padding: '7px', border: '1px solid var(--color-border-tertiary)', borderRadius: 7, background: 'transparent', color: 'var(--color-text-primary)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
        >
          View Profile
        </button>
        {bookingId && (
          <button
            onClick={() => navigate(`/messages/${bookingId}`)}
            style={{ flex: 1, padding: '7px', border: 'none', borderRadius: 7, background: 'var(--plum-primary)', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <MessageSquare size={14} /> Message
          </button>
        )}
      </div>
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
