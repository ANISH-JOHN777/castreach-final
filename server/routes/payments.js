const router      = require('express').Router();
const Booking     = require('../models/Booking');
const verifyToken = require('../middleware/verifyToken');
const stripeService = require('../services/stripe');

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

    // Re-entrance check: if a PaymentIntent already exists and is still active/usable, return its client secret
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
    });

    // Store the intent now; the hold is only confirmed once Stripe reports the
    // funds are capturable (see webhook). Do NOT mark 'held' optimistically.
    booking.stripePaymentIntentId = paymentIntentId;
    await booking.save();

    res.json({ clientSecret });
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
