# CASTREACH — INVESTOR DEMO CHECKLIST

## PRE-DEMO CHECKLIST

- [x] **Backend Process Running**: Node.js API server running (`node server/index.js` or `npm start`).
- [x] **Frontend Process Running**: React Vite application running (`npm run dev` or `npm run preview`).
- [x] **Database Connected**: MongoDB connected with ACID replica-set transaction support (`MongoMemoryReplSet` / Atlas).
- [x] **Worker Processes Running**: Background workers (`worker:render`, `worker:transcription`, `worker:ai`) active.
- [x] **WebSocket Connected**: Persistent WebSocket server connected (`ws://localhost:3001/ws`).
- [x] **Demo Data Seeded**: Executed `npm run seed:demo` (3 Hosts, 3 Guests, 1 Admin, 5 Podcasts, 10 Episodes, 5 Bookings).
- [x] **Demo Accounts Verified**:
  - Admin: `demo.admin@castreach.demo`
  - Host: `demo.host1@castreach.demo`
  - Guest: `demo.guest1@castreach.demo`
  - Default Password: `DemoPassword123!`
- [x] **Health Check PASS**: `GET /health` returns `HTTP 200 OK`.
- [x] **Readiness Check PASS**: `GET /ready` returns `HTTP 200 OK` with database connected.
- [x] **Storage Available**: Local storage abstraction (`STORAGE_PROVIDER=local`) active in `scratch/storage/`.
- [x] **AI Intelligence Active**: Anthropic Claude API active or built-in mock fallback ready (`aiService.js`).
- [x] **Transcription Active**: Local Whisper / API or built-in fallback transcript generator ready (`transcriptionService.js`).
- [x] **Daily.co WebRTC Video Active**: Daily WebRTC rooms with test meeting tokens active (`daily.js`).
- [x] **Stripe Escrow Active**: Stripe Connect Test Mode enabled (`sk_test_...`).

---

## LIVE DEMONSTRATION STEPS

- [x] **1. Guest Login**: Login as `demo.guest1@castreach.demo`.
- [x] **2. Discovery**: Search AI and tech podcasts on `/discover`.
- [x] **3. Host Profile**: View Dr. Elena Rostova's host profile (`/profile/...`).
- [x] **4. Booking**: Book an upcoming podcast session slot.
- [x] **5. Real-Time Chat**: Send messages and verify typing indicator and read receipts via WebSockets.
- [x] **6. Meeting Room**: Join secure WebRTC meeting room (`/recording-room/...`).
- [x] **7. Dual-Track Recording**: Capture separate host and guest audio/video tracks.
- [x] **8. EDL Recording Editor**: Edit recording cuts, splits, and gain adjustments (`RecordingEditorModal`).
- [x] **9. Async Render Pipeline**: Render finalized MP4 video via FFmpeg worker (`worker:render`).
- [x] **10. Automated Transcription**: View speaker-labeled transcript in `TranscriptViewer`.
- [x] **11. AI Podcast Intelligence**: Generate summary, show notes, title suggestions, and chapters with Anthropic Claude (`AIIntelligencePanel`).
- [x] **12. Multilingual Live Captions**: Demonstrate English and Tamil real-time subtitles overlay (`LiveCaptionOverlay`).
- [x] **13. Podcast Publishing**: Attach media asset and publish episode to RSS/discovery.
- [x] **14. Public Discovery & Player**: Listen to published episode on public discovery portal.
- [x] **15. Review & Reputation**: Submit 5-star rating and view updated host reputation score.
- [x] **16. Admin Control Center**: Log in as `demo.admin@castreach.demo` and review system reports, payouts, disputes, and audit logs.

---

## BACKUP DEMO PATH (PRE-SEEDED ASSETS)

In the event of network disruption or external API latency:
- [x] **Pre-seeded Completed Booking**: Booking `b1` pre-seeded with completed status.
- [x] **Pre-seeded Recording Asset**: Pre-seeded MP4 recording asset available for instant preview.
- [x] **Pre-seeded Transcript**: Pre-seeded speaker-labeled transcript JSON available instantly.
- [x] **Pre-seeded AI Content**: Pre-seeded summary, show notes, and chapters ready to inspect.
- [x] **Pre-seeded Published Episode**: Pre-seeded published episode live on discovery portal.
