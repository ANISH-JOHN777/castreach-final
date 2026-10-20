const router      = require('express').Router();
const mongoose    = require('mongoose');
const Booking     = require('../models/Booking');
const Availability= require('../models/Availability');
const Message     = require('../models/Message');
const User        = require('../models/User');
const verifyToken = require('../middleware/verifyToken');
const { validate, BookingSchema, ReviewSchema } = require('../middleware/validate');
const { triggerBadgeCheck }   = require('../services/badges');
const { notify }              = require('../services/notifications');
const { createDailyRoom }     = require('../services/daily');
const { refundPayment }       = require('../services/stripe');
const { recomputeUserRating, recomputeHostResponseMetrics } = require('../services/reviews');
const { completeBooking }     = require('../services/bookingLifecycle');
const { broadcastToBooking }  = require('../services/realtimeServer');
const stitcher                = require('../stitcher');

// ── GET /api/bookings — list own bookings (paginated) ─────────────────────────
// BUG-8: added pagination — previously returned all bookings with no limit.
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ host: req.user.id }, { guest: req.user.id }] };
    if (status) filter.status = status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('host',  'name avatar podcastName avgRating')
        .populate('guest', 'name avatar expertise avgRating')
        .populate('createdBy', 'name avatar')
        .sort({ slotStart: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    res.json({
      bookings,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /api/bookings/:id ─────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (req.params.id === 'my') {
      const filter = req.user.role === 'admin'
        ? {}
        : { $or: [{ host: req.user.id }, { guest: req.user.id }] };
      const bookings = await Booking.find(filter)
        .populate('host',  'name avatar podcastName avgRating')
        .populate('guest', 'name avatar expertise avgRating')
        .populate('createdBy', 'name avatar')
        .sort({ slotStart: -1 });
      return res.json({ bookings });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('host',  'name email avatar bio podcastName podcastDescription podcastCategory studioLocation preferredMeetingMode equipment typicalFormat listenerCount avgRating totalReviews location socialLinks')
      .populate('guest', 'name email avatar bio expertise speakingTopics priorAppearances location preferredMeetingMode portfolioUrl avgRating totalReviews socialLinks')
      .populate('createdBy', 'name avatar role');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const hostIdStr  = booking.host?._id  ? booking.host._id.toString()  : booking.host?.toString();
    const guestIdStr = booking.guest?._id ? booking.guest._id.toString() : booking.guest?.toString();

    const isParticipant = [hostIdStr, guestIdStr].includes(req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    if (booking.status === 'confirmed' && !booking.dailyRoomUrl) {
      booking.dailyRoomUrl = `https://castreach.daily.co/room-${booking._id}`;
      await booking.save();
    }

    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST /api/bookings — create a booking request ─────────────────────────────
// BUG-7: wrapped in a MongoDB transaction so the overlap check and the insert
// are atomic. Without this, two concurrent requests could both pass the conflict
// check before either creates a document, resulting in double-bookings.
router.post('/', verifyToken, validate(BookingSchema), async (req, res) => {
  let session = null;
  try {
    const topoType = mongoose.connection.client?.topology?.description?.type;
    const isReplicaSet = topoType === 'ReplicaSetWithPrimary' || topoType === 'Sharded' || (typeof topoType === 'string' && topoType.includes('ReplicaSet'));
    if (isReplicaSet) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
  } catch {
    if (session) {
      try { session.endSession(); } catch {}
    }
    session = null;
  }

  const cleanupSession = async (shouldAbort = false) => {
    if (session) {
      try {
        if (shouldAbort && session.inTransaction()) {
          await session.abortTransaction();
        }
      } catch {}
      try { session.endSession(); } catch {}
    }
  };

  try {
    const { 
      hostId, 
      guestId, 
      slotStart, 
      slotEnd, 
      topics, 
      message, 
      meetingType = 'gmeet',
      gmeetUrl,
      physicalLocation,
      agenda 
    } = req.body;

    let effectiveHostId = hostId;
    let effectiveGuestId = guestId;

    if (req.user.role === 'host' || hostId === req.user.id || !hostId) {
      effectiveHostId = req.user.id;
      effectiveGuestId = guestId || (hostId && hostId !== req.user.id ? hostId : null);
    } else if (req.user.role === 'guest' || guestId === req.user.id) {
      effectiveGuestId = req.user.id;
      effectiveHostId = hostId || (guestId && guestId !== req.user.id ? guestId : null);
    } else {
      if (!effectiveHostId) effectiveHostId = req.user.id;
      if (!effectiveGuestId) effectiveGuestId = guestId || hostId;
    }

    // Resolve Guest User (supporting live users, catalog IDs, and on-demand provisioning)
    let guestUser = null;
    if (effectiveGuestId && mongoose.Types.ObjectId.isValid(effectiveGuestId)) {
      let guestQuery = User.findById(effectiveGuestId).select('role isBlocked name email');
      if (session?.inTransaction()) guestQuery = guestQuery.session(session);
      guestUser = await guestQuery;
    }

    if (!guestUser && (effectiveGuestId || req.body.guestName || req.body.guestEmail)) {
      const nameOrSlug = req.body.guestName || String(effectiveGuestId || '');
      const cleanSlug = nameOrSlug.replace(/^guest-/, '').replace(/-/g, ' ').trim();
      
      const queryConditions = [];
      if (req.body.guestEmail) queryConditions.push({ email: req.body.guestEmail.toLowerCase() });
      if (cleanSlug) queryConditions.push({ name: new RegExp('^' + cleanSlug + '$', 'i') });
      if (cleanSlug) queryConditions.push({ name: new RegExp(cleanSlug, 'i') });

      if (queryConditions.length > 0) {
        let findQuery = User.findOne({
          _id: { $ne: req.user.id },
          $or: queryConditions,
        });
        if (session?.inTransaction()) findQuery = findQuery.session(session);
        guestUser = await findQuery;
      }

      if (!guestUser) {
        const guestName = req.body.guestName || (cleanSlug ? cleanSlug.replace(/\b\w/g, (l) => l.toUpperCase()) : 'Special Guest');
        const emailSlug = guestName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        const newGuest = new User({
          name: guestName,
          email: req.body.guestEmail || `${emailSlug}@castreach.demo`,
          role: 'guest',
          bio: req.body.guestBio || 'Professional podcast guest and domain authority.',
          expertise: Array.isArray(req.body.guestExpertise) ? req.body.guestExpertise : ['Guest Speaker', 'Expert Insights'],
          sessionRateCents: req.body.guestRateCents || Math.round((req.body.sessionFee || 500) * 100),
          profilePicture: req.body.guestAvatar || `https://api.dicebear.com/7.x/micah/svg?seed=${encodeURIComponent(guestName)}&backgroundColor=171520`,
          isOnboarded: true,
          tenantId: 'castreach',
        });
        if (session?.inTransaction()) await newGuest.save({ session });
        else await newGuest.save();
        guestUser = newGuest;
      }
      effectiveGuestId = guestUser._id;
    }

    if (!effectiveGuestId || !guestUser) {
      await cleanupSession(true);
      return res.status(400).json({ error: 'Guest participant is required' });
    }

    if (guestUser.isBlocked) {
      await cleanupSession(true);
      return res.status(404).json({ error: 'Guest account is not accessible' });
    }

    if (effectiveHostId && effectiveGuestId && effectiveHostId.toString() === effectiveGuestId.toString()) {
      await cleanupSession(true);
      return res.status(400).json({ error: 'You cannot book yourself as a guest' });
    }

    let hostQuery = User.findById(effectiveHostId).select('role isBlocked sessionRateCents studioLocation podcastName');
    if (session?.inTransaction()) hostQuery = hostQuery.session(session);
    let host = await hostQuery;

    if (!host && req.user) {
      host = await User.findById(req.user.id);
      effectiveHostId = req.user.id;
    }

    if (!host || host.isBlocked) {
      await cleanupSession(true);
      return res.status(404).json({ error: 'Host not found' });
    }

    if (host.role !== 'host' && host._id.toString() === req.user.id) {
      host.role = 'host';
      if (session?.inTransaction()) await host.save({ session });
      else await host.save();
    }

    let start = new Date(slotStart);
    let end   = new Date(slotEnd);

    if (process.env.NODE_ENV !== 'production' && req.body.allowOverlap) {
      start = new Date(start.getTime() + Math.floor(Math.random() * 5000) + 1000);
      end   = new Date(end.getTime() + Math.floor(Math.random() * 5000) + 1000);
    }

    if (end <= start) {
      await cleanupSession(true);
      return res.status(400).json({ error: 'slotEnd must be after slotStart' });
    }
    if (start <= new Date()) {
      await cleanupSession(true);
      return res.status(400).json({ error: 'Cannot book a slot in the past' });
    }

    let conflictQuery = Booking.findOne({
      host:   effectiveHostId,
      status: { $in: ['pending', 'confirmed'] },
      $or:    [{ slotStart: { $lt: end }, slotEnd: { $gt: start } }],
    });
    if (session?.inTransaction()) conflictQuery = conflictQuery.session(session);
    const conflict = await conflictQuery;

    if (conflict) {
      if (process.env.NODE_ENV !== 'production' && req.body.allowOverlap) {
        // Dev/testing mode: allow overlapping test session
      } else {
        await cleanupSession(true);
        const nextAvailable = new Date(new Date(conflict.slotEnd).getTime() + 15 * 60 * 1000);
        return res.status(409).json({ 
          error: 'Slot already booked',
          conflictBookingId: conflict._id,
          conflictStart: conflict.slotStart,
          conflictEnd: conflict.slotEnd,
          suggestedSlotStart: nextAvailable.toISOString(),
        });
      }
    }

    // Resolve meeting details
    const resolvedGmeet = meetingType === 'gmeet'
      ? (gmeetUrl && gmeetUrl.trim() ? gmeetUrl.trim() : `https://meet.google.com/cst-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`)
      : '';

    const resolvedPhysical = meetingType === 'physical'
      ? {
          address: physicalLocation?.address || host.studioLocation || '',
          city: physicalLocation?.city || '',
          studioName: physicalLocation?.studioName || (host.podcastName ? `${host.podcastName} Studio` : 'Main Studio'),
          arrivalNotes: physicalLocation?.arrivalNotes || 'Please arrive 15 minutes before the session.',
        }
      : {};

    // Resolve session amount:
    // 1. Explicit amount passed by host (dollars or cents)
    // 2. Or guest's predefined sessionRateCents
    let sessionAmountCents = 0;
    if (req.body.amountCents) {
      sessionAmountCents = Number(req.body.amountCents);
    } else if (req.body.sessionFee !== undefined && req.body.sessionFee !== null) {
      sessionAmountCents = Math.round(Number(req.body.sessionFee) * 100);
    } else if (guestUser && guestUser.sessionRateCents) {
      sessionAmountCents = Number(guestUser.sessionRateCents);
    }

    // Host books guest: mock payment is held in CastReach escrow
    const initialPaymentStatus = sessionAmountCents > 0 ? 'held' : 'unpaid';

    const bookingData = {
      host:             effectiveHostId,
      guest:            effectiveGuestId,
      createdBy:        req.user.id,
      slotStart:        start,
      slotEnd:          end,
      topics,
      message,
      meetingType,
      gmeetUrl:         resolvedGmeet,
      physicalLocation: resolvedPhysical,
      agenda:           agenda || '',
      amountCents:      sessionAmountCents,
      paymentStatus:    initialPaymentStatus,
    };

    const [booking] = session?.inTransaction()
      ? await Booking.create([bookingData], { session })
      : await Booking.create([bookingData]);

    // Mark matching availability slot as booked inside the transaction if present
    await Availability.updateOne(
      {
        user: effectiveHostId,
        isBooked: false,
        $or: [{ start, end }, { start: { $lt: end }, end: { $gt: start } }],
      },
      { isBooked: true },
      session?.inTransaction() ? { session } : {}
    );

    // Create system message for booking creation with escrow notice
    const escrowHoldText = sessionAmountCents > 0
      ? `Booking request sent. $${(sessionAmountCents / 100).toFixed(2)} mock payment received and held in CastReach escrow.`
      : 'Booking request sent.';

    await Message.create(
      [{
        booking:  booking._id,
        sender:   req.user.id,
        content:  escrowHoldText,
        isSystem: true,
      }],
      session?.inTransaction() ? { session } : {}
    );

    if (message && message.trim()) {
      await Message.create(
        [{
          booking: booking._id,
          sender: req.user.id,
          content: message.trim(),
        }],
        session?.inTransaction() ? { session } : {}
      );
    }

    if (session?.inTransaction()) {
      await session.commitTransaction();
    }
    await cleanupSession(false);

    // Audit — fire-and-forget after commit succeeds.
    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId:     booking._id,
      action:         'create',
      actor:          req.user.id,
      actorRole:      req.user.role,
      after: {
        host:        booking.host,
        guest:       booking.guest,
        slotStart:   booking.slotStart,
        slotEnd:     booking.slotEnd,
        status:      booking.status,
        amountCents: booking.amountCents,
      },
    });

    stitcher.events.emit(stitcher.EVENTS.BOOKING_CREATED, {
      bookingId:   booking._id.toString(),
      hostId:      booking.host.toString(),
      guestId:     booking.guest.toString(),
      amountCents: booking.amountCents,
    });

    // Notify the recipient (e.g. if host created booking, notify guest; if guest created booking, notify host)
    const otherPartyId = req.user.id === effectiveHostId.toString()
      ? effectiveGuestId.toString()
      : effectiveHostId.toString();

    const initiatorName = (req.user.id === effectiveHostId.toString() ? (host?.name || req.user.name) : (guestUser?.name || req.user.name)) || 'A creator';

    notify(otherPartyId, {
      type:  'booking_request',
      title: 'New podcast invitation',
      body:  `You have a new podcast booking invitation from ${initiatorName}.`,
      link:  `/bookings/${booking._id}`,
    }).catch((err) => console.error('Notify failed:', err.message));

    try {
      broadcastToBooking(booking._id.toString(), 'booking:created', { booking });
      const { broadcastToUser } = require('../services/realtimeServer');
      if (broadcastToUser) {
        broadcastToUser(otherPartyId, 'booking:new', {
          bookingId: booking._id.toString(),
          booking,
        });
      }
    } catch (realtimeErr) {
      console.warn('Realtime broadcast warning:', realtimeErr.message);
    }

    return res.status(201).json({ booking });

  } catch (err) {
    if (session) {
      await session.abortTransaction().catch(() => {});
    }
    if (err.code === 11000 || err.code === 112) {
      return res.status(409).json({ error: 'Slot already booked' });
    }
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    if (session) {
      try { session.endSession(); } catch {}
    }
  }
});

// ── PATCH /api/bookings/:id/confirm ──────────────────────────────────────────
router.patch('/:id/confirm', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    const isParticipant = [booking.host.toString(), booking.guest.toString()].includes(req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Cannot confirm' });

    let roomUrl = '';
    try {
      const roomRes = await createDailyRoom(booking._id.toString());
      roomUrl = roomRes.roomUrl;
    } catch (err) {
      roomUrl = `https://castreach.daily.co/room-${booking._id}`;
    }

    const prevStatus     = booking.status;
    booking.status       = 'confirmed';
    booking.dailyRoomUrl = roomUrl;
    booking.respondedAt  = new Date();  // BUG-4
    await booking.save();

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId:     booking._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      before: { status: prevStatus },
      after:  { status: 'confirmed', respondedAt: booking.respondedAt },
    });

    stitcher.events.emit(stitcher.EVENTS.BOOKING_CONFIRMED, {
      bookingId: booking._id.toString(),
      hostId:    booking.host.toString(),
      guestId:   booking.guest.toString(),
    });

    // BUG-3: mark the matching availability slot as booked (best-effort — a
    // booking can exist without a formal availability slot, so no error if absent).
    Availability.updateOne(
      { user: booking.host, start: booking.slotStart, end: booking.slotEnd, isBooked: false },
      { isBooked: true }
    ).catch((err) => console.error('Availability update failed:', err.message));

    // BUG-4: update host response metrics (async, non-blocking).
    recomputeHostResponseMetrics(booking.host.toString())
      .catch((err) => console.error('Response metrics failed:', err.message));

    notify(booking.guest.toString(), {
      type:  'booking_confirmed',
      title: 'Booking confirmed!',
      body:  'Your podcast session has been confirmed.',
      link:  `/bookings/${booking._id}`,
    }).catch((err) => console.error('Notify failed:', err.message));

    // Create system message
    Message.create({
      booking:  booking._id,
      sender:   req.user.id,
      content:  'Booking confirmed.',
      isSystem: true,
    }).catch((err) => console.error('System msg create error:', err.message));

    // Broadcast real-time status update to all room subscribers
    broadcastToBooking(booking._id.toString(), 'booking:updated', {
      bookingId: booking._id.toString(),
      status: 'confirmed',
      dailyRoomUrl: booking.dailyRoomUrl,
    });

    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id/propose-date ──────────────────────────────────────
// Guest (or Host) changes the date / proposes alternative availability
router.patch('/:id/propose-date', verifyToken, async (req, res) => {
  try {
    const { proposedSlotStart, proposedSlotEnd, rescheduleNote } = req.body;
    if (!proposedSlotStart) {
      return res.status(400).json({ error: 'Proposed date/time is required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host.toString(), booking.guest.toString()].includes(req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    const newStart = new Date(proposedSlotStart);
    const newEnd = proposedSlotEnd 
      ? new Date(proposedSlotEnd) 
      : new Date(newStart.getTime() + 60 * 60 * 1000);

    if (newEnd <= newStart) {
      return res.status(400).json({ error: 'Proposed end time must be after start time' });
    }

    booking.proposedSlotStart = newStart;
    booking.proposedSlotEnd = newEnd;
    booking.proposedBy = req.user.id === booking.host.toString() ? 'host' : 'guest';
    booking.rescheduleNote = rescheduleNote || 'Availability counter-proposal sent.';
    await booking.save();

    const formattedProposal = newStart.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const actorRole = req.user.id === booking.host.toString() ? 'Host' : 'Guest';

    await Message.create({
      booking: booking._id,
      sender: req.user.id,
      content: `${actorRole} proposed a new availability date: ${formattedProposal}. Note: "${booking.rescheduleNote}".`,
      isSystem: true,
    });

    const recipient = req.user.id === booking.host.toString() ? booking.guest.toString() : booking.host.toString();
    notify(recipient, {
      type: 'date_proposed',
      title: 'New date proposed for podcast session',
      body: `${actorRole} proposed an alternative availability date: ${formattedProposal}`,
      link: `/bookings/${booking._id}`,
    }).catch(() => {});

    broadcastToBooking(booking._id.toString(), 'booking:updated', {
      bookingId: booking._id.toString(),
      proposedSlotStart: booking.proposedSlotStart,
      proposedSlotEnd: booking.proposedSlotEnd,
      proposedBy: booking.proposedBy,
      rescheduleNote: booking.rescheduleNote,
    });

    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id/accept-proposed-date ──────────────────────────────
// Accepts the proposed date and confirms the booking
router.patch('/:id/accept-proposed-date', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const isParticipant = [booking.host.toString(), booking.guest.toString()].includes(req.user.id) || req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    if (!booking.proposedSlotStart) {
      return res.status(400).json({ error: 'No proposed date to accept' });
    }

    booking.slotStart = booking.proposedSlotStart;
    booking.slotEnd = booking.proposedSlotEnd || new Date(booking.proposedSlotStart.getTime() + 60 * 60 * 1000);
    booking.proposedSlotStart = undefined;
    booking.proposedSlotEnd = undefined;
    booking.proposedBy = undefined;
    booking.rescheduleNote = '';
    booking.status = 'confirmed';
    booking.respondedAt = new Date();

    if (!booking.dailyRoomUrl) {
      booking.dailyRoomUrl = `https://castreach.daily.co/room-${booking._id}`;
    }

    await booking.save();

    const formattedConfirmed = booking.slotStart.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    await Message.create({
      booking: booking._id,
      sender: req.user.id,
      content: `Availability date confirmed for ${formattedConfirmed}! Session is officially scheduled.`,
      isSystem: true,
    });

    const otherParticipant = req.user.id === booking.host.toString() ? booking.guest.toString() : booking.host.toString();
    notify(otherParticipant, {
      type: 'booking_confirmed',
      title: 'New date accepted — Booking confirmed!',
      body: `Session confirmed for ${formattedConfirmed}.`,
      link: `/bookings/${booking._id}`,
    }).catch(() => {});

    broadcastToBooking(booking._id.toString(), 'booking:updated', {
      bookingId: booking._id.toString(),
      status: 'confirmed',
      slotStart: booking.slotStart,
      slotEnd: booking.slotEnd,
      dailyRoomUrl: booking.dailyRoomUrl,
    });

    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id/cancel ────────────────────────────────────────────
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  try {
    // BUG-1 + BUG-6: select stripePaymentIntentId so we can issue the refund.
    const booking = await Booking.findById(req.params.id).select('+stripePaymentIntentId');
    if (!booking) return res.status(404).json({ error: 'Not found' });
    const statusBeforeCancel = booking.status;

    const isParticipant = [booking.host, booking.guest]
      .some((id) => id.toString() === req.user.id);
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Cannot cancel booking in current state' });
    }

    // BUG-6: refund held payment before cancelling.
    if (booking.paymentStatus === 'held' && booking.stripePaymentIntentId) {
      try {
        await refundPayment(booking.stripePaymentIntentId);
        booking.paymentStatus = 'refunded';
      } catch (refundErr) {
        // Log and continue — cancellation proceeds; finance team reconciles manually.
        console.error(`Refund failed for booking ${booking._id}:`, refundErr.message);
      }
    }

    booking.status = 'cancelled';
    // BUG-4: record response time when host declines a pending request.
    if (!booking.respondedAt) booking.respondedAt = new Date();
    await booking.save();

    // Restore availability slot state if present
    Availability.updateOne(
      { user: booking.host, start: booking.slotStart, end: booking.slotEnd, isBooked: true },
      { isBooked: false }
    ).catch((err) => console.error('Availability unmark failed:', err.message));

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId:     booking._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      before: { status: statusBeforeCancel, paymentStatus: booking.paymentStatus },
      after:  { status: 'cancelled',        paymentStatus: booking.paymentStatus },
    });

    stitcher.events.emit(stitcher.EVENTS.BOOKING_CANCELLED, {
      bookingId: booking._id.toString(),
      hostId:    booking.host.toString(),
      guestId:   booking.guest.toString(),
      refunded:  booking.paymentStatus === 'refunded',
    });

    // Send cancellation notification
    const notifyRecipient = booking.host.toString() === req.user.id
      ? booking.guest.toString()
      : booking.host.toString();
    notify(notifyRecipient, {
      type:  'booking_cancelled',
      title: 'Booking cancelled',
      body:  'A podcast booking session was cancelled.',
      link:  `/bookings/${booking._id}`,
    }).catch((err) => console.error('Notify failed:', err.message));

    // Create system message
    const isGuest = booking.guest?.toString() === req.user.id;
    const cancelMsg = isGuest ? 'Guest declined the invitation.' : 'Booking cancelled.';
    Message.create({
      booking:  booking._id,
      sender:   req.user.id,
      content:  cancelMsg,
      isSystem: true,
    }).catch((err) => console.error('System message failed:', err.message));

    // Broadcast real-time status update to all room subscribers
    try {
      broadcastToBooking(booking._id.toString(), 'booking:updated', {
        bookingId: booking._id.toString(),
        status: 'cancelled',
      });
      const { broadcastToUser } = require('../services/realtimeServer');
      if (broadcastToUser) {
        broadcastToUser(notifyRecipient, 'booking:updated', {
          bookingId: booking._id.toString(),
          status: 'cancelled',
        });
      }
    } catch {}

    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id/decline — alias for decline invitation ────────────
router.patch('/:id/decline', verifyToken, async (req, res, next) => {
  // Delegate directly to cancel logic
  req.url = `/${req.params.id}/cancel`;
  return router.handle(req, res, next);
});

// ── POST /api/bookings/:id/review ─────────────────────────────────────────────
router.post('/:id/review', verifyToken, validate(ReviewSchema), async (req, res) => {
  try {
    const { rating, comment, title } = req.body;
    const Review = require('../models/Review');
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Booking not completed' });

    const isHost  = booking.host.toString()  === req.user.id;
    const isGuest = booking.guest.toString() === req.user.id;
    if (!isHost && !isGuest) return res.status(403).json({ error: 'Forbidden' });

    const numRating = Number(rating);
    if (isNaN(numRating) || !Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const reviewerId = req.user.id;
    const reviewedUserId = isGuest ? booking.host.toString() : booking.guest.toString();

    if (reviewerId === reviewedUserId) {
      return res.status(400).json({ error: 'Self-reviews are not permitted' });
    }

    // Check duplicate
    const existingReview = await Review.findOne({ booking: booking._id, reviewer: reviewerId });
    if (existingReview) {
      return res.status(409).json({ error: 'You have already submitted a review for this booking' });
    }

    await Review.create({
      booking: booking._id,
      reviewer: reviewerId,
      reviewee: reviewedUserId,
      rating: numRating,
      title: title || '',
      comment: comment || '',
      status: 'PUBLISHED',
      tenantId: req.headers['x-tenant-id'] || 'castreach',
    });

    if (isGuest) booking.hostReview  = { rating: numRating, comment: comment || '' };
    if (isHost)  booking.guestReview = { rating: numRating, comment: comment || '' };
    await booking.save();

    await recomputeUserRating(reviewedUserId);
    await triggerBadgeCheck(reviewedUserId);

    stitcher.events.emit(stitcher.EVENTS.BOOKING_REVIEWED, {
      bookingId:   booking._id.toString(),
      reviewerId:  req.user.id,
      reviewedId:  reviewedUserId,
      rating: numRating,
    });

    res.json({ booking });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already submitted a review for this booking' });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── PATCH /api/bookings/:id/complete ─────────────────────────────────────────
// BUG-1: must select +stripePaymentIntentId so completeBooking() can find and
// capture the PaymentIntent. Previously the field was excluded (select: false)
// and the escrow release was silently skipped on every session completion.
router.patch('/:id/complete', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .select('+stripePaymentIntentId')
      .populate('host', 'stripeAccountId');
    if (!booking) return res.status(404).json({ error: 'Not found' });

    const isParticipant = [booking.host._id, booking.guest]
      .some((id) => id.toString() === req.user.id);
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Only a confirmed booking can be completed' });
    }

    await completeBooking(booking);

    stitcher.audit.logReq(req, {
      collectionName: 'bookings',
      documentId:     booking._id,
      action:         'update',
      actor:          req.user.id,
      actorRole:      req.user.role,
      before: { status: 'confirmed' },
      after:  { status: 'completed', recordingReady: booking.recordingReady },
    });

    stitcher.events.emit(stitcher.EVENTS.BOOKING_COMPLETED, {
      bookingId: booking._id.toString(),
      hostId:    booking.host._id.toString(),
      guestId:   booking.guest.toString(),
    });

    // Create system message
    const amountStr = booking.amountCents ? `$${(booking.amountCents / 100).toFixed(2)}` : '$0';
    Message.create({
      booking:  booking._id,
      sender:   req.user.id,
      content:  `Podcast completed by host. Escrow payout of ${amountStr} has been released to guest.`,
      isSystem: true,
    }).catch((err) => console.error('System message failed:', err.message));

    broadcastToBooking(booking._id.toString(), 'booking:updated', {
      bookingId: booking._id.toString(),
      status: 'completed',
      paymentStatus: 'released',
    });

    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
