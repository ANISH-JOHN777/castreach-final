const Stripe = require('stripe');
const User   = require('../models/User');
const { requireFeatureEnv } = require('../config/validateEnv');

// Platform commission in basis points (default 15%). Configure via env.
const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS, 10) || 1500;

// Lazily constructed so importing this module never fails when Stripe is not
// configured. Every exported function goes through getStripe(), which 503s with
// a clear message if STRIPE_SECRET_KEY is absent.
let stripeClient = null;
function getStripe() {
  requireFeatureEnv('stripe');
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  }
  return stripeClient;
}

/**
 * Create a PaymentIntent in manual capture mode (escrow hold).
 * Guest is charged but money isn't transferred until recording completes.
 * The platform takes its fee via application_fee_amount when funds are routed
 * to a connected host account (BLK-2).
 */
async function createEscrowIntent({ amountCents, currency = 'usd', hostStripeId, bookingId, idempotencyKey }) {
  const stripe = getStripe();
  const applicationFee = Math.round((amountCents * PLATFORM_FEE_BPS) / 10000);

  const options = idempotencyKey ? { idempotencyKey } : undefined;
  const intent = await stripe.paymentIntents.create(
    {
      amount:                 amountCents,
      currency,
      capture_method:         'manual',           // hold, don't capture yet
      transfer_data:          hostStripeId ? { destination: hostStripeId } : undefined,
      application_fee_amount: hostStripeId ? applicationFee : undefined,
      metadata:               { bookingId, applicationFee: String(applicationFee) },
      description:            `CastReach booking ${bookingId}`,
    },
    options
  );

  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

/**
 * Capture the held PaymentIntent and transfer to host.
 * Accepts optional idempotencyKey for safe retry.
 */
async function releaseEscrow(paymentIntentId, hostStripeId, idempotencyKey) {
  if (!paymentIntentId) return null;
  const options = idempotencyKey ? { idempotencyKey } : undefined;
  const intent = await getStripe().paymentIntents.capture(paymentIntentId, options);
  return intent;
}

/**
 * Refund a payment (held or already captured).
 * Accepts optional idempotencyKey for safe retry.
 */
async function refundPayment(paymentIntentId, idempotencyKey) {
  if (!paymentIntentId) return null;
  const stripe = getStripe();
  const options = idempotencyKey ? { idempotencyKey } : undefined;

  let existingIntent = null;
  try {
    existingIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    // If retrieval fails (e.g. unit test mock), proceed with fallback cancel
  }

  if (existingIntent && existingIntent.status === 'succeeded') {
    // Already captured -> create refund
    return await stripe.refunds.create({ payment_intent: paymentIntentId }, options);
  }

  // Not captured yet -> cancel PaymentIntent
  return await stripe.paymentIntents.cancel(paymentIntentId, options);
}

/**
 * Create Stripe Connect onboarding link for hosts.
 */
async function createConnectOnboarding(userId, returnUrl, refreshUrl) {
  const stripe = getStripe();
  const user = await User.findById(userId).select('+stripeAccountId');

  let accountId = user?.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' });
    accountId = account.id;
    await User.findByIdAndUpdate(userId, { stripeAccountId: accountId });
  }

  const link = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: refreshUrl,
    return_url:  returnUrl,
    type:        'account_onboarding',
  });

  return { accountLink: link.url };
}

/**
 * Retrieve an existing PaymentIntent from Stripe.
 */
async function retrievePaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;
  return await getStripe().paymentIntents.retrieve(paymentIntentId);
}

module.exports = { createEscrowIntent, releaseEscrow, refundPayment, createConnectOnboarding, retrievePaymentIntent };
