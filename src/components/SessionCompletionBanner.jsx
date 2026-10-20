import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, Check, DollarSign, ChevronRight, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { realtime } from '../services/realtime';

export default function SessionCompletionBanner({ bookings = [], onSettled, onOpenDispute }) {
  const { user, authFetch } = useAuth();
  const [loadingId, setLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [dismissedIds, setDismissedIds] = useState([]);

  // Listen for real-time updates so both laptops immediately reflect acceptance
  useEffect(() => {
    const unsub = realtime.on('booking:updated', () => {
      if (onSettled) onSettled();
    });
    const unsubSettled = realtime.on('booking:settled', () => {
      if (onSettled) onSettled();
    });
    return () => {
      unsub();
      unsubSettled();
    };
  }, [onSettled]);

  // Find bookings awaiting completion approval or recently ended
  const pendingSettlementBookings = bookings.filter((b) => {
    if (dismissedIds.includes(b._id)) return false;

    // Eligible if held in escrow or release pending
    const hasEscrow = ['held', 'release_pending'].includes(b.paymentStatus);
    const bothConfirmed = Boolean(b.hostConfirmedCompletion && b.guestConfirmedCompletion);
    const isReleased = b.paymentStatus === 'released';

    // If already released and not both confirmed, or dismissed, skip
    if (isReleased && !bothConfirmed) return false;

    const isConcludedOrPrompted = b.recordingReady || 
      b.recordingStatus === 'READY' || 
      b.status === 'completed' || 
      b.hostConfirmedCompletion || 
      b.guestConfirmedCompletion ||
      (typeof window !== 'undefined' && window.location.search.includes(b._id));

    return (hasEscrow || (isReleased && bothConfirmed)) && isConcludedOrPrompted;
  });

  if (pendingSettlementBookings.length === 0 && !successMsg) {
    return null;
  }

  const handleConfirm = async (b) => {
    setLoadingId(b._id);
    try {
      const res = await authFetch(`/payments/${b._id}/confirm-completion`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm session');

      if (data.released || (data.hostConfirmedCompletion && data.guestConfirmedCompletion)) {
        const guestName = b.guest?.name || 'Guest';
        setSuccessMsg(`🎉 Both parties accepted! $${((b.amountCents || 0) / 100).toFixed(2)} has been credited to ${guestName}'s account balance.`);
      } else {
        setSuccessMsg(`✓ You accepted session completion. As soon as the other party confirms, the honorarium will be credited.`);
      }

      if (onSettled) onSettled();
      setTimeout(() => setSuccessMsg(''), 8000);
    } catch (err) {
      alert(err.message || 'Error confirming session completion');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
      {/* Success Toast / Banner if just settled */}
      {successMsg && (
        <div style={{
          backgroundColor: '#0A0A0A',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#FFFFFF',
          fontSize: 13.5,
          fontWeight: 650,
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.2)',
          animation: 'fadeIn 0.3s ease',
        }}>
          <Sparkles size={20} color="#22C55E" style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pending Settlement Cards */}
      {pendingSettlementBookings.map((b) => {
        const isMeHost = (b.host?._id || b.host)?.toString() === (user?._id || user?.id)?.toString();
        const otherUser = isMeHost ? b.guest : b.host;
        const myConfirmed = isMeHost ? b.hostConfirmedCompletion : b.guestConfirmedCompletion;
        const otherConfirmed = isMeHost ? b.guestConfirmedCompletion : b.hostConfirmedCompletion;
        const bothConfirmed = Boolean((b.hostConfirmedCompletion && b.guestConfirmedCompletion) || b.paymentStatus === 'released');
        const honorariumDollars = ((b.amountCents || 0) / 100).toFixed(2);
        const isLoading = loadingId === b._id;

        return (
          <div
            key={b._id}
            style={{
              backgroundColor: '#0A0A0A',
              borderRadius: 16,
              border: bothConfirmed ? '1.5px solid rgba(34, 197, 94, 0.5)' : '1.5px solid rgba(168, 85, 247, 0.4)',
              padding: '22px 24px',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Glowing Accent Line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: bothConfirmed ? '#22C55E' : 'linear-gradient(90deg, #A855F7, #22C55E)',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ maxWidth: 650 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 750,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#22C55E',
                    background: 'rgba(34, 197, 94, 0.12)',
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <ShieldCheck size={12} /> {bothConfirmed ? 'Escrow Disbursed' : 'Escrow Action Required'}
                  </span>
                  <span style={{ fontSize: 12, color: '#888888' }}>
                    Session with {otherUser?.name || (isMeHost ? 'Guest' : 'Host')}
                  </span>
                </div>

                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', margin: '4px 0 6px' }}>
                  {bothConfirmed 
                    ? 'Session Completed & Escrow Payment Credited!' 
                    : 'Did your podcast recording session conclude successfully?'}
                </h3>
                <p style={{ fontSize: 13, color: '#888888', margin: 0, lineHeight: 1.5 }}>
                  {bothConfirmed
                    ? `Both the host and guest have accepted completion. $${honorariumDollars} USD has been credited directly to the guest's account balance.`
                    : `When both host and guest accept, the held escrow payment of `}
                  {!bothConfirmed && <strong style={{ color: '#FFFFFF' }}>${honorariumDollars} USD</strong>}
                  {!bothConfirmed && ` will be credited directly to the guest's account.`}
                </p>

                {/* Status Badges */}
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 650,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: (b.hostConfirmedCompletion || bothConfirmed) ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${(b.hostConfirmedCompletion || bothConfirmed) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: (b.hostConfirmedCompletion || bothConfirmed) ? '#22C55E' : '#888888',
                  }}>
                    {(b.hostConfirmedCompletion || bothConfirmed) ? <CheckCircle2 size={13} color="#22C55E" /> : <Clock size={13} />}
                    <span>Host Approval: {(b.hostConfirmedCompletion || bothConfirmed) ? 'Accepted' : 'Pending'}</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 650,
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: (b.guestConfirmedCompletion || bothConfirmed) ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${(b.guestConfirmedCompletion || bothConfirmed) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: (b.guestConfirmedCompletion || bothConfirmed) ? '#22C55E' : '#888888',
                  }}>
                    {(b.guestConfirmedCompletion || bothConfirmed) ? <CheckCircle2 size={13} color="#22C55E" /> : <Clock size={13} />}
                    <span>Guest Approval: {(b.guestConfirmedCompletion || bothConfirmed) ? 'Accepted' : 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {bothConfirmed ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(34, 197, 94, 0.16)',
                    border: '1px solid rgba(34, 197, 94, 0.5)',
                    padding: '9px 18px',
                    borderRadius: 10,
                    color: '#22C55E',
                    fontSize: 13,
                    fontWeight: 750,
                    boxShadow: '0 0 16px rgba(34, 197, 94, 0.25)',
                  }}>
                    <CheckCircle2 size={17} color="#22C55E" />
                    <span>✓ Both Accepted · Payment Credited to Guest (${honorariumDollars})</span>
                  </div>
                ) : myConfirmed ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '9px 16px',
                    borderRadius: 10,
                    color: '#22C55E',
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}>
                    <Check size={16} />
                    <span>You Accepted · Waiting for {otherUser?.name || (isMeHost ? 'Guest' : 'Host')}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleConfirm(b)}
                    style={{
                      background: '#22C55E',
                      color: '#000000',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                      transition: 'transform 0.15s ease',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Check size={16} />
                    <span>
                      {isLoading ? 'Confirming…' : isMeHost ? `Yes, Session Completed (Release $${honorariumDollars})` : `Yes, Session Completed (Claim $${honorariumDollars})`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDismissedIds((prev) => [...prev, b._id]);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888888',
                    cursor: 'pointer',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                  }}
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenDispute) onOpenDispute(b);
                    else alert('To report an issue or file a dispute, our moderation team will review the session recording.');
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#EF4444',
                    borderRadius: 10,
                    padding: '9px 14px',
                    fontSize: 12,
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                >
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
