# CASTREACH — INVESTOR DEMONSTRATION GUIDE

## 1. Executive Summary & Overview
CastReach is an end-to-end podcast booking, intelligence, real-time recording, and automated distribution platform. This guide details how to execute a complete, interactive investor presentation using **100% free, local, and test-mode resources**.

---

## 2. Demonstration Architecture
- **Frontend SPA**: React 19 + Vite (`http://localhost:5173`)
- **Backend API**: Express Node.js Server (`http://localhost:3001`)
- **Real-Time Communication**: Native WebSockets (`ws://localhost:3001/ws`)
- **Database**: MongoDB Replica Set (`MongoMemoryReplSet` in-memory ACID transaction support)
- **Object Storage Abstraction**: Local persistent storage (`scratch/storage/`)
- **AI Intelligence**: Built-in Anthropic Claude adapter with fallback mock support
- **Transcription Engine**: Built-in Whisper audio adapter with fallback mock transcript generator
- **Payment Escrow**: Stripe Connect Test Mode (`sk_test_...`)

---

## 3. Quick Start & Execution Commands

```bash
# 1. Boot Backend API & WebSocket Server in Demo Mode
cd server
APP_ENV=demo npm start

# 2. Start Background Workers (in separate terminals if testing async pipelines)
npm run worker:render
npm run worker:transcription
npm run worker:ai

# 3. Seed Demo Dataset
npm run seed:demo

# 4. Boot React Frontend
cd ..
npm run dev
```

---

## 4. Pre-Configured Demo Accounts

| Role | Email | Password | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Admin** | `demo.admin@castreach.demo` | `DemoPassword123!` | System overview, payouts, disputes, audit logs |
| **Host 1** | `demo.host1@castreach.demo` | `DemoPassword123!` | AI Frontier podcast, session booking, EDL editor |
| **Host 2** | `demo.host2@castreach.demo` | `DemoPassword123!` | Startup Playbook podcast, rate settings |
| **Host 3** | `demo.host3@castreach.demo` | `DemoPassword123!` | Cybersecurity Deep Dive podcast |
| **Guest 1**| `demo.guest1@castreach.demo` | `DemoPassword123!` | AI Engineer guest, session booking, chat |
| **Guest 2**| `demo.guest2@castreach.demo` | `DemoPassword123!` | Fintech guest, escrow hold demonstration |

---

## 5. Step-by-Step Investor Presentation Flow

### Step 1: Guest Discovery & AI Matchmaking
1. Log in as Guest (`demo.guest1@castreach.demo`).
2. Navigate to **Discover** (`/discover`).
3. Search for "Artificial Intelligence" and review host matches.
4. Click on **Dr. Elena Rostova** (`/profile/...`) to view host bio, badges, session rate ($150.00), and published reviews.

### Step 2: Session Booking & Stripe Escrow Hold
1. Click **Book Session**. Select an available calendar slot.
2. Confirm session details. The server calculates the exact rate ($150.00).
3. Complete Stripe test payment (`pi_demo_confirmed_...`). Funds are placed in **Escrow Hold**.

### Step 3: Real-Time Chat & WebSocket Synchronization
1. Open the booking details page (`/booking/...`).
2. Type a chat message. Observe immediate delivery, typing indicators, and read receipts synchronized via native WebSockets (`/ws`).

### Step 4: WebRTC Recording Room & Dual-Track Recording
1. Click **Join Recording Room** (`/recording-room/...`).
2. Grant camera/microphone access to enter the Daily.co WebRTC studio.
3. Observe dual-track audio/video meters and start cloud recording.

### Step 5: EDL Recording Editor & Async Render Pipeline
1. Open **Recording Editor** (`RecordingEditorModal`).
2. Drag trim boundaries, add split points, and adjust gain meters.
3. Click **Render Video**. Background worker (`worker:render`) renders the final MP4 video asynchronously.

### Step 6: Automated Transcription & Speaker Identification
1. Open **Transcript Viewer** (`TranscriptViewer`).
2. Inspect the timestamped, speaker-labeled transcript ("Host" vs "Guest").

### Step 7: AI Podcast Intelligence & Show Notes Engine
1. Open **AI Intelligence Panel** (`AIIntelligencePanel`).
2. Select artifact type (**SUMMARY**, **SHOW_NOTES**, **TITLE_SUGGESTIONS**, **CHAPTERS**).
3. Click **Generate Artifact**. Anthropic Claude constructs JSON artifact.
4. Click **Apply Content** to update the episode metadata with explicit user confirmation.

### Step 8: Live Multilingual Captions Overlay
1. Activate **Live Captions** (`LiveCaptionOverlay`).
2. Select target language (English / Tamil).
3. Observe real-time subtitle stream rendered over video playback.

### Step 9: Podcast Episode Publishing & Public Discovery
1. Attach rendered media asset to episode draft.
2. Click **Publish Episode**.
3. View the live episode on the public podcast portal (`/podcasts/ai-frontier`).

### Step 10: Review Submission & Reputation Score
1. Submit a 5-star rating and comment for the completed booking.
2. Observe immediate recomputation of the host's reputation score and badge updates.

### Step 11: Admin Control Center
1. Log in as Admin (`demo.admin@castreach.demo`).
2. Navigate to **Admin Dashboard** (`/admin`).
3. Review global KPI metrics, financial escrow totals, dispute resolutions, and audit log entries.

---

## 6. One-Click Demo Reset Procedure

To reset the demonstration environment to a clean initial state:

```bash
# Reset database and re-seed demo data (Only when APP_ENV=demo)
npm run reset:demo
```
Or trigger via API request: `POST /api/demo/reset`.
