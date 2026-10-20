import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { 
  Mic, 
  CheckCircle, 
  Star, 
  Play, 
  Download, 
  Film, 
  Scissors, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  MessageSquare,
  Video,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Mail,
  User as UserIcon,
  Calendar as CalendarIcon,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  Lock
} from 'lucide-react';
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

function getGoogleCalendarUrl(booking) {
  if (!booking?.slotStart || !booking?.slotEnd) return '#';
  const start = new Date(booking.slotStart).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const end = new Date(booking.slotEnd).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const title = encodeURIComponent(booking.topics?.[0] ? `Podcast: ${booking.topics[0]}` : 'CastReach Podcast Recording Session');
  const details = encodeURIComponent(
    `CastReach Podcast Session\n` +
    `Mode: ${booking.meetingType === 'physical' ? 'In-Person Studio' : 'Google Meet'}\n` +
    (booking.meetingType === 'physical' ? `Location: ${booking.physicalLocation?.address || 'Studio'}\n` : `Meeting Link: ${booking.gmeetUrl}\n`) +
    (booking.agenda ? `Agenda: ${booking.agenda}\n` : '')
  );
  const loc = encodeURIComponent(booking.meetingType === 'physical' ? (booking.physicalLocation?.address || 'Podcast Studio') : (booking.gmeetUrl || 'Google Meet'));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${loc}`;
}

function formatSeconds(sec) {
  if (sec === undefined || sec === null || isNaN(sec) || !isFinite(sec) || sec < 0) return '00:00';
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
  const [copiedLink,       setCopiedLink]       = useState(false);

  const handleCopyLink = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

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

  const handleDepositEscrow = async () => {
    setPaymentActionLoading(true);
    setActionError('');
    try {
      const res = await authFetch('/payments/escrow-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking._id, paymentMethod: 'card_escrow' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Escrow deposit failed');
      if (refetch) await refetch();
    } catch (err) {
      setActionError(err.message || 'Escrow deposit failed');
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!window.confirm('Release CastReach Escrow funds to the guest? This completes financial settlement for this session.')) return;
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
      <div className="fade-in" style={{ padding: '40px 20px', maxWidth: 640, margin: '40px auto', textAlign: 'center', background: '#181622', borderRadius: 16, border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>
          {error.includes('not found') ? 'Booking Not Found' : error.includes('Forbidden') ? 'Access Restricted' : 'Error Loading Session'}
        </h2>
        <p style={{ fontSize: 14, color: '#A39EA9', marginBottom: 24, lineHeight: 1.5 }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={refetch} style={{ padding: '10px 20px', background: '#22C55E', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={15} /> Retry
          </button>
          <button onClick={() => navigate('/bookings')} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#FFFFFF', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fade-in" style={{ padding: '40px 20px', maxWidth: 640, margin: '40px auto', textAlign: 'center', background: '#181622', borderRadius: 16, border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <AlertCircle size={48} color="var(--color-accent-purple, #A855F7)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>Session Not Found</h2>
        <p style={{ fontSize: 14, color: '#A39EA9', marginBottom: 24 }}>
          The requested podcast session could not be located.
        </p>
        <button onClick={() => navigate('/bookings')} style={{ padding: '10px 20px', background: '#22C55E', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
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

  // Escrow Lifecycle Stepper Calculations
  const isEscrowDeposited = ['held', 'release_pending', 'released'].includes(booking.paymentStatus);
  const isSessionDone = booking.status === 'completed' || booking.recordingStatus === 'READY' || !!booking.recordingUrl || booking.paymentStatus === 'released';
  const isSettled = booking.paymentStatus === 'released';

  const stepperSteps = [
    {
      title: '1. Request & Booking',
      subtitle: booking.status === 'pending' ? 'Pending Acceptance' : 'Confirmed & Scheduled',
      state: booking.status === 'cancelled' ? 'cancelled' : 'done',
    },
    {
      title: '2. Escrow Protection',
      subtitle: isEscrowDeposited ? `$${((booking.amountCents || 0) / 100).toFixed(2)} Held Safely` : 'Awaiting Host Deposit',
      state: isEscrowDeposited ? 'done' : 'active',
    },
    {
      title: '3. HD Studio Recording',
      subtitle: isSessionDone ? 'Session Concluded' : (isEscrowDeposited ? 'Studio Room Ready' : 'Pending Escrow'),
      state: isSessionDone ? 'done' : (isEscrowDeposited ? 'active' : 'upcoming'),
    },
    {
      title: '4. Settlement & Payout',
      subtitle: isSettled ? 'Paid Out to Guest' : (isSessionDone ? 'Ready for Release' : 'Pending Session'),
      state: isSettled ? 'done' : (isSessionDone ? 'active' : 'upcoming'),
    },
  ];

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <Link to="/bookings" style={{ color: 'var(--color-accent)' }}>Bookings</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        Session with {otherName}
      </div>

      {/* ── CASTREACH ESCROW & PRODUCTION LIFECYCLE STEPPER ── */}
      <div style={{
        background: '#181622',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 20,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 750, color: '#FFFFFF' }}>
                CastReach Escrow &amp; Settlement Loop
              </div>
              <div style={{ fontSize: 12, color: '#A39EA9' }}>
                Payment is held safely in CastReach Escrow and disbursed only after the interview recording is completed.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#22C55E', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '5px 12px', borderRadius: 20 }}>
            <Lock size={13} /> 100% Honorarium Protection
          </div>
        </div>

        {/* Stepper Progress Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {stepperSteps.map((step, idx) => {
            const isDone = step.state === 'done';
            const isActive = step.state === 'active';
            return (
              <div
                key={step.title}
                style={{
                  background: isDone ? 'rgba(34, 197, 94, 0.08)' : isActive ? 'rgba(168, 85, 247, 0.12)' : '#13111A',
                  border: isDone ? '1.5px solid rgba(34, 197, 94, 0.35)' : isActive ? '2px solid #A855F7' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  boxShadow: isActive ? '0 4px 12px rgba(168, 85, 247, 0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    background: isDone ? '#22C55E' : isActive ? '#A855F7' : '#292537',
                    color: isDone ? '#000000' : '#ffffff'
                  }}>
                    {isDone ? <Check size={13} /> : idx + 1}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: isDone ? '#22C55E' : isActive ? '#A855F7' : '#6F6A76'
                  }}>
                    {isDone ? 'Completed' : isActive ? 'Current Step' : 'Upcoming'}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginTop: 2 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 11, color: '#A39EA9', lineHeight: 1.3 }}>
                  {step.subtitle}
                </div>
              </div>
            );
          })}
        </div>
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
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: booking.status !== 'pending' ? 'rgba(72,47,76,0.35)' : 'rgba(245,158,11,0.15)', color: booking.status !== 'pending' ? '#482F4C' : '#f59e0b' }}>
                  {booking.status !== 'pending' ? 'Consent Verified' : 'Confirmation Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Guest Consent:</span>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'rgba(72,47,76,0.35)', color: '#482F4C' }}>
                  Consent Verified
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
                  style={{ ...btn, background: '#482F4C', color: '#fff', fontWeight: 700, padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}
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

          {/* ── MEETING CONNECTION & LOCATION CARD ── */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
                {booking.meetingType === 'physical' ? (
                  <>
                    <MapPin size={18} color="var(--color-accent)" />
                    In-Person Studio Session
                  </>
                ) : (
                  <>
                    <Video size={18} color="var(--color-accent)" />
                    Google Meet Video Call
                  </>
                )}
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: booking.meetingType === 'physical' ? 'rgba(59,130,246,0.15)' : 'rgba(72,47,76,0.35)',
                color: booking.meetingType === 'physical' ? '#3b82f6' : '#482F4C'
              }}>
                {booking.meetingType === 'physical' ? 'Physical Studio' : 'Virtual / GMeet'}
              </span>
            </div>

            {booking.meetingType === 'physical' ? (
              <div>
                <div style={{ background: 'var(--color-background-secondary)', padding: '14px 16px', borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {booking.physicalLocation?.studioName || 'Podcast Studio Venue'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <MapPin size={14} />
                    <span>{booking.physicalLocation?.address || 'Address provided upon confirmation'}</span>
                  </div>
                  {booking.physicalLocation?.city && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      City / Region: {booking.physicalLocation.city}
                    </div>
                  )}
                  {booking.physicalLocation?.arrivalNotes && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle, rgba(231,221,232,0.15))', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>Arrival & Check-in Notes:</strong>
                      <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>{booking.physicalLocation.arrivalNotes}</p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {booking.physicalLocation?.address && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.physicalLocation.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...btn, background: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <MapPin size={15} /> Open in Google Maps <ExternalLink size={13} />
                    </a>
                  )}
                  <a
                    href={getGoogleCalendarUrl(booking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...btn, background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-tertiary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <CalendarIcon size={15} /> Add to Google Calendar
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 0, marginBottom: 12, lineHeight: 1.5 }}>
                  This episode will be hosted over Google Meet. Both participants can join directly at the scheduled time.
                </p>
                <div style={{ background: 'var(--color-background-secondary)', padding: '12px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <Video size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {booking.gmeetUrl || 'https://meet.google.com/new'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyLink(booking.gmeetUrl || 'https://meet.google.com/new')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, flexShrink: 0 }}
                    title="Copy Meeting Link"
                  >
                    {copiedLink ? <Check size={14} color="#482F4C" /> : <Copy size={14} />}
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href={booking.gmeetUrl || 'https://meet.google.com/new'}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...btn, background: '#482F4C', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  >
                    <Video size={16} /> Join Google Meet <ExternalLink size={14} />
                  </a>
                  <a
                    href={getGoogleCalendarUrl(booking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...btn, background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-tertiary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <CalendarIcon size={15} /> Add to Google Calendar
                  </a>
                </div>
              </div>
            )}

            {/* Session Agenda & Discussion Guide */}
            {booking.agenda && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle, rgba(231,221,232,0.15))' }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  Session Agenda & Talking Points
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--color-background-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {booking.agenda}
                </div>
              </div>
            )}
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
                background: isOriginalReady ? 'rgba(72,47,76,0.35)' : booking.recordingStatus === 'RECORDING' ? 'rgba(239,68,68,0.15)' : booking.recordingStatus === 'PROCESSING' ? 'rgba(245,158,11,0.15)' : 'var(--color-background-secondary)',
                color: isOriginalReady ? '#482F4C' : booking.recordingStatus === 'RECORDING' ? '#ef4444' : booking.recordingStatus === 'PROCESSING' ? '#f59e0b' : 'var(--color-text-secondary)'
              }}>
                {booking.recordingStatus === 'RECORDING' && 'Recording in Progress'}
                {booking.recordingStatus === 'PROCESSING' && 'Processing Recording...'}
                {isOriginalReady && 'Ready'}
                {booking.recordingStatus === 'FAILED' && 'Recording Failed'}
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
                    <span style={{ color: isStorageReady ? '#482F4C' : isStorageFailed ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
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
                background: renderEditStatus === 'READY' ? 'rgba(72,47,76,0.35)' : renderEditStatus === 'FAILED' ? 'rgba(239,68,68,0.15)' : ['QUEUED', 'PROCESSING'].includes(renderEditStatus) ? 'rgba(245,158,11,0.15)' : 'var(--color-background-secondary)',
                color: renderEditStatus === 'READY' ? '#482F4C' : renderEditStatus === 'FAILED' ? '#ef4444' : ['QUEUED', 'PROCESSING'].includes(renderEditStatus) ? '#f59e0b' : 'var(--color-text-secondary)'
              }}>
                {renderEditStatus === 'NOT_REQUESTED' && 'Not Rendered'}
                {renderEditStatus === 'QUEUED' && 'Render Queued'}
                {renderEditStatus === 'PROCESSING' && 'Rendering Video...'}
                {renderEditStatus === 'READY' && 'Rendered Ready'}
                {renderEditStatus === 'FAILED' && 'Rendering Failed'}
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
                      style={{ ...btn, background: '#482F4C', opacity: renderLoading ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
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
                        style={{ ...btn, background: '#482F4C', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Play size={14} /> Preview Edited
                      </button>

                      <button
                        onClick={handleDownloadEdited}
                        disabled={fetchingUrl}
                        style={{ ...btn, background: 'transparent', color: '#482F4C', border: '1px solid #482F4C', display: 'inline-flex', alignItems: 'center', gap: 6 }}
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

          {/* ── CASTREACH ESCROW & SETTLEMENT HUB ── */}
          {booking.paymentStatus === 'unpaid' && (
            <div style={{ ...card, border: '1px solid rgba(255, 255, 255, 0.1)', background: '#181622', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
                  <ShieldCheck size={17} color="#22C55E" /> CastReach Escrow Protection
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', fontWeight: 600 }}>
                  Awaiting Deposit
                </span>
              </div>

              <div style={{ background: '#211E2D', padding: 12, borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#A39EA9' }}>Guest Honorarium:</span>
                  <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
                    ${((booking.amountCents || 0) / 100).toFixed(2)} {booking.currency?.toUpperCase() || 'USD'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, color: '#A39EA9' }}>
                  <span>Platform Protection (10%):</span>
                  <span>${(((booking.amountCents || 0) / 100) * 0.1).toFixed(2)}</span>
                </div>
                <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '6px 0 8px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--color-accent-purple, #A855F7)' }}>
                  <span>Total Escrow Deposit:</span>
                  <span>${(((booking.amountCents || 0) / 100) * 1.1).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: '#A39EA9', lineHeight: 1.45, marginBottom: 14 }}>
                🔒 Funds will be safely locked in CastReach Escrow and released only after the recording session concludes.
              </div>

              {(isHost || isAdmin) ? (
                <div>
                  <button
                    onClick={handleDepositEscrow}
                    disabled={paymentActionLoading}
                    style={{
                      ...btn,
                      width: '100%',
                      background: '#22C55E',
                      color: '#000000',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '11px 16px',
                      borderRadius: 10,
                      fontWeight: 750,
                      boxShadow: '0 4px 14px rgba(34, 197, 94, 0.25)',
                      cursor: paymentActionLoading ? 'not-allowed' : 'pointer',
                      opacity: paymentActionLoading ? 0.7 : 1
                    }}
                  >
                    <Lock size={15} />
                    {paymentActionLoading ? 'Securing Escrow…' : 'Deposit into CastReach Escrow'}
                  </button>

                  {stripeConfigured && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#A39EA9', marginBottom: 8 }}>Or Pay with Credit Card:</div>
                      <Elements stripe={stripePromise}>
                        <PaymentForm
                          amountLabel={`$${(((booking.amountCents || 0) / 100) * 1.1).toFixed(2)}`}
                          createPaymentIntent={createPaymentIntent}
                          onPaid={refetch}
                        />
                      </Elements>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '10px 12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: 8, fontSize: 12, color: '#A855F7', fontWeight: 500 }}>
                  Awaiting Host to deposit the session honorarium into Escrow before studio recording.
                </div>
              )}
            </div>
          )}

          {/* ESCROW HELD & SETTLEMENT CONTROLS */}
          {['held', 'release_pending'].includes(booking.paymentStatus) && (
            <div style={{ ...card, border: '1px solid rgba(34, 197, 94, 0.3)', background: '#181622', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#22C55E' }}>
                  <ShieldCheck size={18} color="#22C55E" /> Funds Held in Escrow
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', fontWeight: 700 }}>
                  Protected
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#FFFFFF' }}>
                  ${((booking.amountCents || 0) / 100).toFixed(2)}
                </span>
                <span style={{ fontSize: 12, color: '#A39EA9', fontWeight: 600 }}>
                  {booking.currency?.toUpperCase() || 'USD'} Held Safely
                </span>
              </div>

              {/* Completion Confirmation Statuses */}
              <div style={{ padding: 12, background: '#211E2D', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 600, color: '#FFFFFF', marginBottom: 8 }}>Session Completion Approvals:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#A39EA9' }}>Host Approval:</span>
                  <span style={{ fontWeight: 700, color: booking.hostConfirmedCompletion ? '#22C55E' : '#F59E0B' }}>
                    {booking.hostConfirmedCompletion ? '✓ Confirmed' : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#A39EA9' }}>Guest Approval:</span>
                  <span style={{ fontWeight: 700, color: booking.guestConfirmedCompletion ? '#22C55E' : '#F59E0B' }}>
                    {booking.guestConfirmedCompletion ? '✓ Confirmed' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Actions for Session Wrap-up & Settlement */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['confirmed', 'completed'].includes(booking.status) && (
                  <>
                    <button
                      onClick={handleConfirmCompletion}
                      disabled={paymentActionLoading || ((isHost && booking.hostConfirmedCompletion) || (isGuest && booking.guestConfirmedCompletion))}
                      style={{
                        ...btn,
                        width: '100%',
                        background: ((isHost && booking.hostConfirmedCompletion) || (isGuest && booking.guestConfirmedCompletion)) ? '#e2e8f0' : 'var(--plum-primary)',
                        color: ((isHost && booking.hostConfirmedCompletion) || (isGuest && booking.guestConfirmedCompletion)) ? '#64748b' : '#ffffff',
                        opacity: paymentActionLoading ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <CheckCircle size={15} />
                      {paymentActionLoading ? 'Saving Confirmation…' : ((isHost && booking.hostConfirmedCompletion) || (isGuest && booking.guestConfirmedCompletion)) ? 'You Confirmed Session Complete' : 'Confirm Session Completed'}
                    </button>

                    {(isHost || isAdmin) && (
                      <button
                        onClick={handleReleasePayment}
                        disabled={paymentActionLoading}
                        style={{
                          ...btn,
                          width: '100%',
                          background: '#482F4C',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          fontWeight: 700,
                          boxShadow: '0 4px 12px rgba(72,47,76,0.2)'
                        }}
                      >
                        <DollarSign size={15} />
                        {paymentActionLoading ? 'Releasing…' : 'Settle & Release Escrow to Guest'}
                      </button>
                    )}
                  </>
                )}

                {isAdmin && (
                  <button
                    onClick={handleRefundPayment}
                    disabled={paymentActionLoading}
                    style={{ ...btn, width: '100%', background: '#ef4444', fontSize: 12, padding: '7px 10px', marginTop: 4 }}
                  >
                    Admin Emergency Refund
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ESCROW RELEASED / SETTLED */}
          {booking.paymentStatus === 'released' && (
            <div style={{ ...card, border: '1.5px solid rgba(22,163,74,0.3)', background: 'linear-gradient(180deg, #ffffff 0%, rgba(22,163,74,0.03) 100%)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                  <CheckCircle2 size={18} /> Escrow Settled & Paid Out
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(22,163,74,0.1)', color: '#16a34a', fontWeight: 700 }}>
                  Completed
                </span>
              </div>

              <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>
                ${((booking.amountCents || 0) / 100).toFixed(2)}
              </div>

              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 12 }}>
                Payment successfully disbursed to guest. Both parties are covered by CastReach Guarantee.
              </div>

              {booking.paymentReleasedAt && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                  Released on: {new Date(booking.paymentReleasedAt).toLocaleString()}
                </div>
              )}

              <button
                onClick={() => setShowReview(true)}
                style={{ ...btn, width: '100%', background: '#482F4C', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Star size={15} fill="#fbbf24" color="#fbbf24" /> Leave Mutual Review
              </button>
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

  const isHostRole = label.toLowerCase().includes('host') || user.role === 'host';

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--color-text-secondary)' }}>
          {label} Profile
        </div>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: isHostRole ? 'rgba(124,58,237,0.1)' : 'rgba(59,130,246,0.1)', color: isHostRole ? 'var(--color-accent)' : '#3b82f6', fontWeight: 600, textTransform: 'capitalize' }}>
          {user.role || (isHostRole ? 'Host' : 'Guest')}
        </span>
      </div>

      {/* Avatar & Main Identification */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, overflow: 'hidden', flexShrink: 0 }}>
          {user.avatar
            ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          {user.podcastName && (
            <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user.podcastName}
            </div>
          )}
          {user.email && (
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Mail size={12} /> {user.email}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
          {user.bio}
        </p>
      )}

      {/* Host-specific details */}
      {isHostRole && (
        <div style={{ background: 'var(--color-background-secondary)', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {user.listenerCount !== undefined && user.listenerCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Audience:</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{user.listenerCount.toLocaleString()} listeners</strong>
            </div>
          )}
          {user.typicalFormat && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Show Format:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{user.typicalFormat}</span>
            </div>
          )}
          {user.studioLocation && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Studio City:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{user.studioLocation}</span>
            </div>
          )}
          {user.equipment && (
            <div style={{ marginTop: 2, paddingTop: 4, borderTop: '1px solid var(--border-subtle, rgba(231,221,232,0.1))' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: 11 }}>Recording Gear:</span>
              <span style={{ color: 'var(--color-text-primary)', fontSize: 11 }}>{user.equipment}</span>
            </div>
          )}
        </div>
      )}

      {/* Guest-specific details */}
      {!isHostRole && (
        <div style={{ background: 'var(--color-background-secondary)', padding: '10px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {user.location && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Location:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{user.location}</span>
            </div>
          )}
          {user.speakingTopics?.length > 0 && (
            <div style={{ marginTop: 2 }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: 11, marginBottom: 4 }}>Key Topics:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {user.speakingTopics.map((topic, i) => (
                  <span key={i} style={{ padding: '2px 6px', borderRadius: 6, background: 'var(--color-background-info)', color: 'var(--color-text-info)', fontSize: 10, fontWeight: 500 }}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
          {user.portfolioUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Globe size={12} color="var(--color-accent)" />
              <a href={user.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.portfolioUrl}
              </a>
            </div>
          )}
          {user.priorAppearances?.length > 0 && (
            <div style={{ marginTop: 2, paddingTop: 4, borderTop: '1px solid var(--border-subtle, rgba(231,221,232,0.1))' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block', fontSize: 11 }}>Prior Appearances:</span>
              <span style={{ color: 'var(--color-text-primary)', fontSize: 11 }}>{user.priorAppearances.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
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
