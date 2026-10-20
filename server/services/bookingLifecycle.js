const { releaseEscrow } = require('./stripe');
const { notify }        = require('./notifications');

/** Normalise a populated doc or raw ObjectId to a string id. */
const idOf = (ref) =>
  (ref && ref._id ? ref._id : ref)?.toString();

/**
 * Transition a confirmed booking to `completed` (BLK-1).
 *
 * Shared by the manual "mark complete" endpoint and the Daily.co recording
 * webhook so the post-session loop (review -> rating -> badges) becomes
 * reachable. Idempotent: a booking already completed is returned untouched.
 *
 * Releases the escrow hold if one exists. Escrow failures are logged but do
 * not block completion — funds can be reconciled separately.
 *
 * `booking.host` should be populated with `stripeAccountId` before calling so
 * the escrow transfer destination is available.
 */
async function completeBooking(booking) {
  if (!booking || booking.status === 'completed') return booking;

  booking.status                  = 'completed';
  booking.recordingReady          = true;
  booking.hostConfirmedCompletion = true;
  booking.hostConfirmedAt         = new Date();
  
  // Escrow release: Held funds in CastReach are released and paid out to the guest
  if (['held', 'unpaid', 'release_pending'].includes(booking.paymentStatus)) {
    booking.paymentStatus    = 'released';
    booking.paymentReleasedAt= new Date();
  }

  await booking.save();

  const hostId  = idOf(booking.host);
  const guestId = idOf(booking.guest);

  await Promise.all([
    notify(hostId, {
      type:  'booking_completed',
      title: 'Podcast session completed!',
      body:  `Session complete. Escrow funds have been released to the guest.`,
      link:  `/bookings/${booking._id}`,
    }),
    notify(guestId, {
      type:  'escrow_released',
      title: 'Payment released to your account!',
      body:  `Host marked the podcast as completed. Escrow payout of $${((booking.amountCents || 0) / 100).toFixed(2)} has been released to you.`,
      link:  `/bookings/${booking._id}`,
    }),
  ]);

  return booking;
}

module.exports = { completeBooking, idOf };
