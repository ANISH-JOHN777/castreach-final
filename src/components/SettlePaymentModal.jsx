import { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  DollarSign, 
  X, 
  AlertCircle, 
  Scissors, 
  RotateCcw,
  ExternalLink,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SettlePaymentModal({ booking, onClose, onSettled, onOpenEditor }) {
  const { authFetch, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!booking) return null;

  const isHost = user?.role === 'host' || booking?.host?._id === (user?._id || user?.id);
  const rawFee = (booking.amountCents || 0) / 100;
  const platformFee = (booking.platformFeeCents || Math.round(booking.amountCents * 0.05)) / 100;
  const totalAmount = rawFee > 0 ? (rawFee + platformFee).toFixed(2) : '0.00';
  const guestPayout = rawFee > 0 ? rawFee.toFixed(2) : '0.00';

  const isReleased = booking.paymentStatus === 'released';
  const isHeld = ['held', 'release_pending'].includes(booking.paymentStatus);
  const isUnpaid = booking.paymentStatus === 'unpaid' && (booking.amountCents || 0) > 0;

  // Settle & Release Escrow to Guest
  const handleRelease = async () => {
    if (!window.confirm(`Release $${guestPayout} from CastReach Escrow to ${booking.guest?.name || 'the guest'}?`)) {
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/payments/${booking._id}/release`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to release payment');

      // Also mark completed if not already
      await authFetch(`/bookings/${booking._id}/complete`, { method: 'PATCH' }).catch(() => {});

      setSuccessMsg(`$${guestPayout} successfully disbursed to ${booking.guest?.name || 'the guest'}!`);
      if (onSettled) onSettled({ ...booking, paymentStatus: 'released', status: 'completed' });
    } catch (err) {
      setErrorMsg(err.message || 'Payment release failed');
    } finally {
      setLoading(false);
    }
  };

  // Deposit Escrow (if unpaid)
  const handleDeposit = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch('/payments/escrow-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking._id, paymentMethod: 'card_escrow' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Escrow deposit failed');

      setSuccessMsg(`$${totalAmount} secured in CastReach Escrow!`);
      if (onSettled) onSettled({ ...booking, paymentStatus: 'held', status: 'confirmed' });
    } catch (err) {
      setErrorMsg(err.message || 'Escrow deposit failed');
    } finally {
      setLoading(false);
    }
  };

  // Refund Payment
  const handleRefund = async () => {
    if (!window.confirm('Cancel session and issue full refund of held escrow funds?')) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/payments/${booking._id}/refund`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');

      setSuccessMsg('Held funds successfully refunded.');
      if (onSettled) onSettled({ ...booking, paymentStatus: 'refunded', status: 'cancelled' });
    } catch (err) {
      setErrorMsg(err.message || 'Refund failed');
    } finally {
      setLoading(false);
    }
  };

  const otherPersonName = isHost ? booking.guest?.name || 'Guest' : booking.host?.name || 'Host';

  return (
    <div style={backdropStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={iconBadgeStyle}>
              <ShieldCheck size={20} color="#22C55E" />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Settle Payment &amp; Escrow
              </h2>
              <p style={{ fontSize: 12, color: '#A39EA9', margin: '2px 0 0' }}>
                Session with {otherPersonName} &bull; {booking.topics?.[0] || 'Podcast Episode'}
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Close modal">
            <X size={18} color="#A39EA9" />
          </button>
        </div>

        {/* Status Pill Card */}
        <div style={{ padding: '20px 24px' }}>
          <div style={statusBannerStyle(isReleased ? 'released' : isHeld ? 'held' : 'unpaid')}>
            {isReleased ? (
              <>
                <CheckCircle2 size={18} color="#22C55E" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: '#22C55E' }}>Payment Settled &amp; Paid Out</div>
                  <div style={{ fontSize: 11.5, color: '#A39EA9', marginTop: 1 }}>
                    ${guestPayout} has been transferred to {booking.guest?.name || 'the guest'}.
                  </div>
                </div>
              </>
            ) : isHeld ? (
              <>
                <Lock size={18} color="var(--color-accent-purple, #A855F7)" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: '#FFFFFF' }}>Funds Bonded in Escrow</div>
                  <div style={{ fontSize: 11.5, color: '#A39EA9', marginTop: 1 }}>
                    ${guestPayout} is safely held by CastReach ready to be released upon session wrap.
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={18} color="#F59E0B" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: '#F59E0B' }}>Deposit Required</div>
                  <div style={{ fontSize: 11.5, color: '#A39EA9', marginTop: 1 }}>
                    Escrow deposit has not yet been authorized.
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Breakdown Box */}
          <div style={breakdownCardStyle}>
            <div style={breakdownRowStyle}>
              <span style={{ fontSize: 13, color: '#A39EA9' }}>Guest Session Honorarium</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>${guestPayout}</span>
            </div>

            <div style={breakdownRowStyle}>
              <span style={{ fontSize: 13, color: '#A39EA9' }}>Platform &amp; HD Recording Fee</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#A39EA9' }}>${platformFee.toFixed(2)}</span>
            </div>

            <div style={{ ...breakdownRowStyle, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 750, color: '#FFFFFF' }}>Total Escrow Custody</span>
              <span style={{ fontSize: 16, fontWeight: 850, color: isReleased ? '#22C55E' : '#FFFFFF' }}>
                ${totalAmount}
              </span>
            </div>
          </div>

          {/* Error / Success Messages */}
          {errorMsg && (
            <div style={alertBoxStyle('error')}>
              <AlertCircle size={15} color="#EF4444" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={alertBoxStyle('success')}>
              <CheckCircle2 size={15} color="#22C55E" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Main Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            {isHost && isHeld && (
              <button
                type="button"
                onClick={handleRelease}
                disabled={loading}
                style={primarySettleBtnStyle}
              >
                <CheckCircle2 size={16} />
                <span>{loading ? 'Releasing…' : `Settle & Release $${guestPayout} to Guest`}</span>
              </button>
            )}

            {isHost && isUnpaid && (
              <button
                type="button"
                onClick={handleDeposit}
                disabled={loading}
                style={primarySettleBtnStyle}
              >
                <Lock size={16} />
                <span>{loading ? 'Securing…' : `Deposit & Bond $${totalAmount} in Escrow`}</span>
              </button>
            )}

            {/* Quick Action: Open Recording Editor right here */}
            {onOpenEditor && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditor(booking);
                }}
                style={secondaryEditorBtnStyle}
              >
                <Scissors size={15} color="var(--color-accent-purple, #A855F7)" />
                <span>Open Recording Clip Editor (Trim / Split)</span>
              </button>
            )}

            {isHost && isHeld && (
              <button
                type="button"
                onClick={handleRefund}
                disabled={loading}
                style={refundBtnStyle}
              >
                <RotateCcw size={13} />
                <span>Cancel &amp; Issue Full Refund</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal Footer */}
        <div style={footerStyle}>
          <span style={{ fontSize: 11, color: '#6F6A76' }}>
            CastReach Guaranteed Escrow &bull; Zero Direct Counterparty Risk
          </span>
          <button type="button" onClick={onClose} style={doneBtnStyle}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STYLES (OBSIDIAN #0D0C12 + VIBRANT ACCENTS)
// -----------------------------------------------------------------------------

const backdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(10px)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const modalCardStyle = {
  backgroundColor: '#0D0C12',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 16,
  maxWidth: 480,
  width: '100%',
  overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 24px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
};

const iconBadgeStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  backgroundColor: 'rgba(34, 197, 94, 0.12)',
  border: '1px solid rgba(34, 197, 94, 0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 6,
  borderRadius: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const statusBannerStyle = (type) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 10,
  backgroundColor: type === 'released' ? 'rgba(34, 197, 94, 0.1)' : type === 'held' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(245, 158, 11, 0.1)',
  border: `1px solid ${type === 'released' ? 'rgba(34, 197, 94, 0.3)' : type === 'held' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
  marginBottom: 16,
});

const breakdownCardStyle = {
  backgroundColor: '#181622',
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '16px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const breakdownRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const alertBoxStyle = (type) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 8,
  backgroundColor: type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
  border: `1px solid ${type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
  color: type === 'error' ? '#EF4444' : '#22C55E',
  fontSize: 12.5,
  fontWeight: 600,
  marginTop: 12,
});

const primarySettleBtnStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: 8,
  backgroundColor: '#22C55E',
  border: 'none',
  color: '#000000',
  fontSize: 13.5,
  fontWeight: 750,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: '0 2px 10px rgba(34, 197, 94, 0.25)',
  transition: 'transform 0.15s ease',
};

const secondaryEditorBtnStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: 8,
  backgroundColor: '#181622',
  border: '1px solid rgba(168, 85, 247, 0.35)',
  color: '#FFFFFF',
  fontSize: 12.5,
  fontWeight: 650,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const refundBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#EF4444',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '6px',
};

const footerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 24px',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  backgroundColor: '#13111A',
};

const doneBtnStyle = {
  padding: '6px 14px',
  borderRadius: 6,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: 650,
  cursor: 'pointer',
};
