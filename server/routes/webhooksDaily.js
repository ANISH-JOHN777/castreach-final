const router = require('express').Router();
const crypto = require('crypto');
const Booking = require('../models/Booking');
const ProcessedWebhookEvent = require('../models/ProcessedWebhookEvent');
const notificationService = require('../services/notifications');
const storageService = require('../services/storage');

/**
 * POST /api/webhooks/daily
 *
 * Daily.co recording webhook.
 * Synchronous and Vercel-safe: verifies HMAC signature, checks idempotency,
 * updates recording lifecycle fields, and persists DB updates BEFORE returning HTTP 200.
 * Decoupled from Stripe escrow release: recording lifecycle events NEVER release payment.
 */
router.post('/', async (req, res) => {
  // 1. Verify signature if a secret is configured.
  const secret = process.env.DAILY_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-daily-signature'] || '';
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
  }

  // 2. Parse JSON payload
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const type = event.type || event.event;
  const SUPPORTED_EVENTS = [
    'recording.started',
    'recording.stopped',
    'recording.completed',
    'recording.ready-to-download',
    'recording.error',
    'recording.failed',
  ];

  if (!SUPPORTED_EVENTS.includes(type)) {
    return res.json({ received: true, ignored: true });
  }

  // 3. Idempotency check via ProcessedWebhookEvent
  const eventId = event.id || event.eventId || event.event_id;
  if (eventId) {
    try {
      await ProcessedWebhookEvent.create({ eventId, type });
    } catch (err) {
      if (err.code === 11000) {
        return res.json({ received: true, duplicate: true });
      }
    }
  }

  try {
    const payload = event.payload || event.data?.object || event;
    const roomName = payload.room_name || payload.roomName || payload.room;
    if (!roomName) {
      return res.json({ received: true });
    }

    const safeRoom = roomName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const booking = await Booking.findOne({ dailyRoomUrl: { $regex: `${safeRoom}$` } });
    if (!booking) {
      return res.json({ received: true });
    }

    const timestamp = payload.timestamp ? new Date(payload.timestamp * 1000) : new Date();

    // 4. State Machine Transitions based on Daily Event Type
    if (type === 'recording.started') {
      if (booking.recordingStatus === 'RECORDING') {
        return res.json({ received: true, duplicate: true });
      }
      booking.recordingStatus = 'RECORDING';
      booking.recordingStartedAt = timestamp;
    } else if (type === 'recording.stopped') {
      booking.recordingStatus = 'PROCESSING';
      booking.recordingStoppedAt = timestamp;
    } else if (type === 'recording.completed' || type === 'recording.ready-to-download') {
      const downloadLink = payload.download_link || payload.s3_url || payload.url;

      // Fallback idempotency check if eventId was not sent
      if (!eventId && booking.recordingReady && booking.recordingUrl === downloadLink) {
        return res.json({ received: true, duplicate: true });
      }

      if (downloadLink) {
        booking.recordingUrl = downloadLink;
        booking.recordingReady = true;
        booking.recordingStatus = 'READY';
        booking.recordingReadyAt = timestamp;

        if (payload.duration || payload.recording_duration) {
          booking.recordingDuration = Number(payload.duration || payload.recording_duration);
        }

        // Phase C3.2 Persistent Recording Storage Copy
        if (!booking.recordingStorage || booking.recordingStorage.status !== 'READY') {
          try {
            booking.recordingStorage = {
              provider: process.env.STORAGE_PROVIDER || (process.env.STORAGE_BUCKET ? 'r2' : 'local'),
              objectKey: `recordings/${booking._id}/original/source.mp4`,
              status: 'STORING',
              contentType: 'video/mp4',
              storedAt: new Date(),
            };

            const storageMeta = await storageService.mirrorRecording(booking._id.toString(), downloadLink);
            booking.recordingStorage = {
              provider: storageMeta.provider,
              objectKey: storageMeta.objectKey,
              status: 'READY',
              contentType: storageMeta.contentType,
              sizeBytes: storageMeta.sizeBytes,
              storedAt: storageMeta.storedAt,
              error: undefined,
            };
          } catch (err) {
            console.error('Persistent recording storage copy warning:', err.message);
            booking.recordingStorage = {
              provider: process.env.STORAGE_PROVIDER || 'local',
              objectKey: `recordings/${booking._id}/original/source.mp4`,
              status: 'FAILED',
              error: err.message,
            };
          }
        }
      } else {
        booking.recordingStatus = 'PROCESSING';
      }
    } else if (type === 'recording.error' || type === 'recording.failed') {
      booking.recordingStatus = 'FAILED';
    }

    // 5. Synchronous DB Persistence before responding (Vercel serverless safety)
    await booking.save();

    // 6. Send notifications when recording becomes READY
    if (booking.recordingStatus === 'READY' && (type === 'recording.completed' || type === 'recording.ready-to-download')) {
      const hostId = booking.host.toString();
      const guestId = booking.guest.toString();
      Promise.all([
        notificationService.notify(hostId, {
          type: 'message',
          title: 'Recording ready',
          body: 'Your podcast session recording is now available.',
          link: `/bookings/${booking._id}`,
        }),
        notificationService.notify(guestId, {
          type: 'message',
          title: 'Recording ready',
          body: 'Your podcast session recording is now available.',
          link: `/bookings/${booking._id}`,
        }),
      ]).catch((err) => console.error('Recording ready notify failed:', err.message));
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Daily webhook handler error:', err.message);
    if (eventId) {
      await ProcessedWebhookEvent.deleteOne({ eventId }).catch(() => {});
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
