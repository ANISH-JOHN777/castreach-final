const router      = require('express').Router();
const Booking     = require('../models/Booking');
const verifyToken = require('../middleware/verifyToken');
const stripeService = require('../services/stripe');
const { notify } = require('../services/notifications');
const stitcher = require('../stitcher');

const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS, 10) || 1500;

// ── GET /api/payments/:bookingId/details — get detailed payment status ─────────
router.get('/:bookingId/details', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .select('+stripePaymentIntentId')
      .populate('host', 'name avatar stripeAccountId')
      .populate('guest', 'name avatar');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isHost  = booking.host._id.toString() === req.user.id || booking.host.toString() === req.user.id;
    const isGuest = booking.guest._id.toString() === req.user.id || booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const applicationFeeCents = Math.round((booking.amountCents * PLATFORM_FEE_BPS) / 10000);
    const hostPayoutCents = Math.max(0, booking.amountCents - applicationFeeCents);

    const payload = {
      bookingId: booking._id,
      amountCents: booking.amountCents,
      currency: booking.currency,
      paymentStatus: booking.paymentStatus,
      platformFeeCents: applicationFeeCents,
      hostPayoutCents,
      hostConfirmedCompletion: booking.hostConfirmedCompletion || false,
      hostConfirmedAt: booking.hostConfirmedAt || null,
      guestConfirmedCompletion: booking.guestConfirmedCompletion || false,
      guestConfirmedAt: booking.guestConfirmedAt || null,
      paymentReleasedAt: booking.paymentReleasedAt || null,
      paymentRefundedAt: booking.paymentRefundedAt || null,
      paymentDisputedAt: booking.paymentDisputedAt || null,
    };

    if (isAdmin) {
      payload.stripePaymentIntentId = booking.stripePaymentIntentId || null;
      payload.stripeTransferId = booking.stripeTransferId || null;
      payload.stripeRefundId = booking.stripeRefundId || null;
      payload.hostStripeAccountId = booking.host?.stripeAccountId || null;
    }

    res.json({ success: true, payment: payload });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/payments/intent — create Stripe PaymentIntent (escrow hold) ─────
router.post('/intent', verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).select('+stripePaymentIntentId').populate('host', 'stripeAccountId');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guest.toString() !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Booking must be confirmed before payment' });
    if (!(booking.amountCents > 0)) return res.status(400).json({ error: 'This session is free — no payment required' });
    if (booking.paymentStatus !== 'unpaid') {
      return res.status(400).json({ error: 'Payment has already been processed or authorized for this booking' });
    }

    if (booking.stripePaymentIntentId) {
      try {
        const existingIntent = await stripeService.retrievePaymentIntent(booking.stripePaymentIntentId);
        if (existingIntent && ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
          return res.json({ clientSecret: existingIntent.client_secret });
        }
      } catch (err) {
        // If retrieval fails (e.g. invalid mock/id in dev), proceed to create a new intent safely
      }
    }

    const { clientSecret, paymentIntentId } = await stripeService.createEscrowIntent({
      amountCents:      booking.amountCents,
      currency:         booking.currency,
      hostStripeId:     booking.host?.stripeAccountId,
      bookingId:        booking._id.toString(),
      idempotencyKey:   `intent_${booking._id}_v1`,
    });

    booking.stripePaymentIntentId = paymentIntentId;
    await booking.save();

    res.json({ clientSecret });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/payments/:bookingId/confirm-completion ─────────────────────────
router.post('/:bookingId/confirm-completion', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .select('+stripePaymentIntentId')
      .populate('host', 'stripeAccountId');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isHost  = booking.host._id.toString() === req.user.id || booking.host.toString() === req.user.id;
    const isGuest = booking.guest._id.toString() === req.user.id || booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!['confirmed', 'completed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking must be confirmed or completed to confirm session completion' });
    }

    if (booking.paymentStatus === 'disputed' || booking.status === 'disputed') {
      return res.status(409).json({ error: 'Payment is currently disputed and cannot be automatically released' });
    }

    const now = new Date();
    if (isHost || isAdmin) {
      booking.hostConfirmedCompletion = true;
      if (!booking.hostConfirmedAt) booking.hostConfirmedAt = now;
    }
    if (isGuest || isAdmin) {
      booking.guestConfirmedCompletion = true;
      if (!booking.guestConfirmedAt) booking.guestConfirmedAt = now;
    }

    // Auto-release condition: Both host and guest confirmed (or admin override) and paymentStatus === 'held'
    const bothConfirmed = booking.hostConfirmedCompletion && booking.guestConfirmedCompletion;
    let released = false;

    if ((bothConfirmed || isAdmin) && booking.paymentStatus === 'held' && booking.stripePaymentIntentId) {
      booking.paymentStatus = 'release_pending';
      await booking.save();

      try {
        const intent = await stripeService.releaseEscrow(
          booking.stripePaymentIntentId,
          booking.host?.stripeAccountId,
          `release_${booking._id}_v1`
        );
        booking.paymentStatus = 'released';
        booking.paymentReleasedAt = new Date();
        if (intent?.transfer) booking.stripeTransferId = String(intent.transfer);
        released = true;
      } catch (err) {
        console.error(`Escrow release error for booking ${booking._id}:`, err.message);
        // Leave paymentStatus as release_pending or fallback to held for reconciliation
        booking.paymentStatus = 'held';
      }
    }

    await booking.save();

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId:     booking._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      after: {
        hostConfirmedCompletion: booking.hostConfirmedCompletion,
        guestConfirmedCompletion: booking.guestConfirmedCompletion,
        paymentStatus: booking.paymentStatus,
      },
    });

    const hostId = booking.host._id.toString();
    const guestId = booking.guest._id.toString();

    notify(isHost ? guestId : hostId, {
      type: 'payment_confirmed',
      title: 'Session completion confirmed',
      body: released
        ? 'Both parties confirmed completion — session payment has been released to the host!'
        : 'Session completion has been confirmed.',
      link: `/bookings/${booking._id}`,
    }).catch(() => {});

    res.json({
      success: true,
      bookingId: booking._id,
      hostConfirmedCompletion: booking.hostConfirmedCompletion,
      guestConfirmedCompletion: booking.guestConfirmedCompletion,
      paymentStatus: booking.paymentStatus,
      released,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/payments/:bookingId/release — dedicated payment release ─────────
router.post('/:bookingId/release', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .select('+stripePaymentIntentId')
      .populate('host', 'stripeAccountId');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isHost  = booking.host._id.toString() === req.user.id || booking.host.toString() === req.user.id;
    const isGuest = booking.guest._id.toString() === req.user.id || booking.guest.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (booking.paymentStatus === 'released') {
      return res.json({ success: true, message: 'Payment is already released', paymentStatus: 'released' });
    }

    if (booking.paymentStatus === 'disputed' || booking.status === 'disputed') {
      return res.status(409).json({ error: 'Payment is currently disputed. Admin dispute resolution required before releasing funds.' });
    }

    if (!['held', 'release_pending'].includes(booking.paymentStatus)) {
      return res.status(400).json({ error: `Cannot release payment in current state (${booking.paymentStatus})` });
    }

    const releaseEligible = (booking.hostConfirmedCompletion && booking.guestConfirmedCompletion) || isAdmin;
    if (!releaseEligible) {
      return res.status(400).json({ error: 'Payment release requires completion confirmation from both host and guest (or admin approval)' });
    }

    booking.paymentStatus = 'release_pending';
    await booking.save();

    if (booking.stripePaymentIntentId) {
      const intent = await stripeService.releaseEscrow(
        booking.stripePaymentIntentId,
        booking.host?.stripeAccountId,
        `release_${booking._id}_v1`
      );
      if (intent?.transfer) booking.stripeTransferId = String(intent.transfer);
    }

    booking.paymentStatus = 'released';
    booking.paymentReleasedAt = new Date();
    await booking.save();

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId:     booking._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      after:          { paymentStatus: 'released' },
    });

    const hostId = booking.host._id.toString();
    const guestId = booking.guest._id.toString();
    Promise.all([
      notify(hostId, {
        type: 'payment_released',
        title: 'Payment released!',
        body: 'Escrow payment for your session has been released.',
        link: `/bookings/${booking._id}`,
      }),
      notify(guestId, {
        type: 'payment_released',
        title: 'Payment released',
        body: 'Payment for your completed podcast session has been processed.',
        link: `/bookings/${booking._id}`,
      }),
    ]).catch(() => {});

    res.json({ success: true, bookingId: booking._id, paymentStatus: 'released' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/payments/:bookingId/refund — refund payment ─────────────────────
router.post('/:bookingId/refund', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).select('+stripePaymentIntentId');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isHost  = booking.host.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isAdmin) {
      return res.status(403).json({ error: 'Only the host or admin can initiate a payment refund' });
    }

    if (booking.paymentStatus === 'refunded') {
      return res.json({ success: true, message: 'Payment is already refunded', paymentStatus: 'refunded' });
    }

    if (!['held', 'release_pending', 'released', 'disputed'].includes(booking.paymentStatus)) {
      return res.status(400).json({ error: `Cannot refund payment in current state (${booking.paymentStatus})` });
    }

    if (booking.stripePaymentIntentId) {
      const refundObj = await stripeService.refundPayment(
        booking.stripePaymentIntentId,
        `refund_${booking._id}_v1`
      );
      if (refundObj?.id) booking.stripeRefundId = String(refundObj.id);
    }

    booking.paymentStatus = 'refunded';
    booking.paymentRefundedAt = new Date();
    await booking.save();

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId:     booking._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      after:          { paymentStatus: 'refunded' },
    });

    notify(booking.guest.toString(), {
      type: 'payment_refunded',
      title: 'Payment refunded',
      body: 'Your podcast session payment has been refunded.',
      link: `/bookings/${booking._id}`,
    }).catch(() => {});

    res.json({ success: true, bookingId: booking._id, paymentStatus: 'refunded' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/payments/connect — create Stripe Connect onboarding link ────────
router.post('/connect', verifyToken, async (req, res) => {
  try {
    const { accountLink } = await stripeService.createConnectOnboarding(
      req.user.id,
      `${process.env.CLIENT_URL}/settings?stripe=success`,
      `${process.env.CLIENT_URL}/settings?stripe=refresh`,
    );
    res.json({ url: accountLink });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
