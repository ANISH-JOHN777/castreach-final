# C3 RECORDING EDITOR ARCHITECTURE AUDIT REPORT
**CastReach Platform — Phase C3 Architecture Review**

---

## 1. Executive Summary

This read-only architecture audit evaluates the requirements, feasibility, and technical strategy for integrating a Recording Editor into the CastReach platform following the successful completion and approval of Phase C0, Phase C1, and Phase C2.

The objective is to establish a secure, scalable, non-destructive media editing architecture that respects CastReach's core invariants:
1. **Payment Decoupling**: Media editing operations must NEVER trigger payment capture, escrow release (`releaseEscrow`), or payment status modifications.
2. **Authoritative Access Control**: Only authorized booking participants (host, guest, or system admin) may preview, edit, or access recording assets.
3. **Vercel Serverless Safety**: Heavy media processing (FFmpeg video encoding, audio waveform extraction, trimming, concatenating) must not execute inside short-lived, memory-constrained Vercel serverless functions.
4. **Non-Destructive Storage**: Original Daily.co cloud recordings must never be overwritten, mutated, or deleted by edit operations.

---

## 2. Current Architecture

The CastReach platform is built on a decoupled architecture consisting of:
- **Frontend**: React 19 SPA bootstrapped with Vite 6.0, using React Router v6, Lucide React icons, and `@daily-co/daily-js` (v0.92.2) for WebRTC meeting rooms.
- **Backend API**: Node.js v18+ with Express v4.19, Mongoose v8.4 (MongoDB Atlas), JSON Web Tokens (JWT) for authentication, and Supertest / Jest for testing.
- **Deployment**: Vercel Serverless (`server/vercel.js`) mapping Express API routes (`/api/(.*)`) via `@vercel/node` and static frontend hosting via `@vercel/static-build`.
- **Recording Engine**: Daily.co Cloud Recording configured automatically on room creation (`enable_recording: 'cloud'`, `start_cloud_recording: true`) in `server/services/daily.js`.
- **Recording State Machine**:
  - `NOT_STARTED` → `RECORDING` → `PROCESSING` → `READY` / `FAILED`
  - Managed in `server/models/Booking.js` and synchronized via HMAC SHA256 signed webhooks (`server/routes/webhooksDaily.js`) and status polling (`GET /api/recordings/:bookingId`).

---

## 3. Evidence From Repository

Inspection of the repository source code confirms the following current implementation details:

- **Package Dependencies (`package.json` & `server/package.json`)**:
  - Frontend: `@daily-co/daily-js` v0.92.2, `@stripe/stripe-js`, `lucide-react`, `react` v19.0.0, `react-router-dom` v6.27.0.
  - Backend: `@anthropic-ai/sdk`, `bcryptjs`, `cookie-parser`, `cors`, `dotenv`, `express`, `express-rate-limit`, `file-type`, `helmet`, `jsonwebtoken`, `mongoose`, `multer`, `stripe`, `zod`.
  - **Media / Storage / Queue Packages**: NO FFmpeg dependencies (`fluent-ffmpeg`, `ffmpeg-static`, `@ffmpeg/ffmpeg`), NO AWS SDK (`@aws-sdk/client-s3`), NO Redis client (`ioredis`), NO queue runner (`bullmq`), NO storage service (Cloudinary / Supabase / Google Cloud Storage) are currently present.

- **Routes & Services**:
  - [server/routes/recordings.js](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/routes/recordings.js): Returns `recordingStatus`, `recordingReady`, `recordingUrl`, `recordingStartedAt`, `recordingStoppedAt`, `recordingReadyAt`, `recordingDuration` to authorized participants.
  - [server/routes/webhooksDaily.js](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/routes/webhooksDaily.js): Processes `recording.started`, `recording.stopped`, `recording.completed`, `recording.ready-to-download`, `recording.error`, `recording.failed`. Stores Daily `download_link` / `s3_url` in `booking.recordingUrl`.
  - [src/pages/RecordingRoom.jsx](file:///c:/Users/manue/OneDrive/Desktop/castreach/src/pages/RecordingRoom.jsx): Renders live studio room with verified recording status indicator polling every 8 seconds.
  - [src/pages/BookingDetail.jsx](file:///c:/Users/manue/OneDrive/Desktop/castreach/src/pages/BookingDetail.jsx): Displays Recording Lifecycle status, Video Preview modal, and Download action button.

---

## 4. Recording Storage Analysis

1. **Storage Location**: Daily cloud recordings are stored in Daily.co's managed cloud infrastructure (hosted on AWS S3).
2. **Output Format**: Daily produces standard mixed MP4 container files containing H.264 video and AAC audio tracks.
3. **Stored URL Type**: `Booking.recordingUrl` holds the direct HTTPS download link (`download_link`, `s3_url`, or `url`) supplied by Daily's `recording.ready-to-download` webhook.
4. **URL Characteristics**: The URL is a temporary, presigned/signed S3 URL provided directly by Daily.
5. **Application Storage Copy**: The application currently does **NOT** copy or persist recording files into application-controlled object storage.
6. **Object Storage Integration**: NO application-level object storage (S3, Cloudflare R2, Supabase Storage, Cloudinary) is configured in the repository.
7. **URL Expiration**: Daily recording download URLs expire according to Daily account retention policies (typically 1 to 7 days).
8. **Expiration Impact on Editing**: If a recording URL expires, client-side fetching or server-side media processing will fail with HTTP 403 Forbidden or HTTP 404 Not Found.
9. **Backend Media Fetching**: The backend can download the media file using standard HTTP `fetch()` prior to URL expiration.
10. **CORS Impact**: Daily S3 download URLs allow direct browser video playback (`<video src={recordingUrl} />`), but decoding audio buffers for waveform rendering via Web Audio API requires CORS (`Access-Control-Allow-Origin: *`) header configuration.
11. **HTTP Range Requests**: Daily download URLs support standard HTTP Range headers (`Range: bytes=...`), enabling video streaming without downloading the complete file.
12. **Streaming**: Media can be streamed progressively by HTML5 media elements.

---

## 5. Media Format Analysis

| Property | Value / Status | Repository Evidence |
| :--- | :--- | :--- |
| **Container Format** | MP4 (.mp4) | Verified Daily webhook payload & `BookingDetail.jsx` preview |
| **Video Codec** | H.264 (AVC) | Daily default cloud recording standard |
| **Audio Codec** | AAC (LC) | Daily default cloud recording standard |
| **Resolution** | 720p / 1080p | Configured dynamically by Daily WebRTC resolution |
| **Frame Rate** | 30 fps | Standard Daily cloud recording target |
| **Audio Sample Rate**| 48 kHz / 44.1 kHz | Standard WebRTC audio stream sample rate |
| **Track Structure** | Single Mixed Track | Daily room properties (`enable_recording: 'cloud'`) produce a single composite MP4 |
| **Participant Tracks**| NOT CONFIGURED | Multi-track / separate participant ISO tracks are not enabled in `createDailyRoom` |
| **Typical Duration** | 30 – 60 minutes | Standard CastReach booking slot duration |
| **Expected File Size**| 300 MB – 1.5 GB | Standard 720p/1080p H.264 MP4 size for 1 hour recording |

---

## 6. Current Frontend Capability

| Editing Capability | Current Status | Repository Evidence |
| :--- | :--- | :--- |
| **Video Preview** | **SUPPORTED NOW** | `BookingDetail.jsx` modal with `<video src={recordingUrl} controls />` |
| **Play / Pause / Seek**| **SUPPORTED NOW** | Native HTML5 video controls |
| **Timeline Display** | **NOT SUPPORTED** | No timeline UI component present in `src/` |
| **Trim (Start / End)** | **NOT SUPPORTED** | No start/end handle state or time markers exist |
| **Cut / Split Section**| **NOT SUPPORTED** | No cut segment data structures exist |
| **Delete Selection** | **NOT SUPPORTED** | No segment exclusion logic exists |
| **Waveform View** | **NOT SUPPORTED** | Web Audio API / peak data extraction not implemented |
| **Subtitle Display** | **NOT SUPPORTED** | No WebVTT / SRT parser or track display components exist |
| **Subtitle Editing** | **NOT SUPPORTED** | No text track editor exists |
| **Multi-track Editing**| **NOT SUPPORTED** | Multi-track audio/video mixing components do not exist |
| **Client Export** | **NOT SUPPORTED** | WebCodecs / MediaRecorder export pipelines do not exist |
| **Download Output** | **PARTIALLY SUPPORTED**| Direct download link for original file exists; edited output does not |

---

## 7. Browser-Side Editing Analysis

Evaluating full client-side editing (e.g. using FFmpeg WASM or HTML5 Canvas/WebCodecs):

- **Feasibility for Micro-Edits (Metadata Trim)**:
  - Client-side previewing of trim points (setting `startTime` and `endTime` playback bounds in standard `<video>` elements) is **100% lightweight and feasible**.
  - Non-destructive playback trims can be stored as Edit Decision Lists (EDL JSON metadata) on the server without decoding or re-encoding media in the browser.
- **Feasibility for Full In-Browser Re-encoding (FFmpeg WASM)**:
  - **Memory Bottlenecks**: FFmpeg WebAssembly requires allocating large SharedArrayBuffers (up to 2GB–4GB limit). Transcoding a 1GB MP4 in WebAssembly routinely causes browser tab crashes (OOM errors), particularly on mobile devices or lower-spec client machines.
  - **CPU & Performance**: Single-threaded or Web-Worker WASM video encoding is 5x to 10x slower than native CPU hardware encoding. A 60-minute podcast export could take 30–90 minutes in a browser tab.
  - **Browser Stability**: Closing or refreshing the browser tab destroys the render state.
- **Conclusion**: Browser-side *previewing & Edit Decision List (EDL) creation* is ideal and lightweight. In-browser *full video re-encoding* is NOT appropriate for CastReach podcast files.

---

## 8. Server-Side Processing Analysis

Evaluating server-side processing directly on CastReach's backend architecture:

- **Vercel Serverless Function Constraints**:
  - Max Execution Duration: 10s (Hobby), 60s (Pro default), 300s (Pro max configurable).
  - Max Memory: 1024 MB (default).
  - Disk Space: Writable `/tmp` directory limited to 512 MB.
  - Process Model: Ephemeral stateless lambdas; no persistent background processes.
- **FFmpeg Execution on Vercel**:
  - **NOT SAFE ON VERCEL**.
  - Transcoding or rendering a 60-minute MP4 video (~1GB) requires downloading the source file, storing it on disk, invoking FFmpeg CPU instructions for minutes, and writing a multi-hundred megabyte output file.
  - This exceeds Vercel's execution time (60s limit), ephemeral disk capacity (512MB `/tmp`), and memory boundaries, triggering HTTP 504 Gateway Timeouts and function invocation crashes.

---

## 9. Asynchronous Job Architecture

- **Repository Audit Result**: **`NO EXISTING MEDIA JOB INFRASTRUCTURE FOUND`**
- **Architecture Requirement**: To support server-side media rendering (trimming, stitching, watermarking, audio export), CastReach requires an asynchronous worker queue operating outside Vercel serverless limits.
- **Target Patterns**:
  - **Option 1 (Lightweight / Low-Cost)**: External microservice (e.g. Express/Node worker on Render / Railway / Fly.io with native FFmpeg installed) receiving HTTP webhooks or polling a queue.
  - **Option 2 (Cloud Managed)**: AWS SQS + AWS Lambda (with custom FFmpeg layer & 15-minute timeout) or AWS Batch / AWS Elemental MediaConvert.
  - **Option 3 (Metadata-Only Architecture - Recommended MVP)**: Non-destructive Edit Decision List (EDL) saving without immediate heavy video re-encoding. Video playback trims are rendered dynamically during client streaming, and export rendering is offloaded on-demand.

---

## 10. Storage Architecture

- **Repository Audit Result**: CastReach currently has **no application-controlled object storage**. Recordings reside solely on Daily's temporary S3 URLs.
- **Requirement for Recording Editor**:
  - Daily download URLs expire after several days.
  - An editor requires persistent access to original source files and rendered edited outputs.
- **Recommended Storage Integration**:
  - **Provider**: AWS S3, Cloudflare R2, or Supabase Storage.
  - **Flow**:
    ```
    Daily Webhook (recording.ready-to-download)
           │
           ▼
    Backend fetches & copies original file to App Object Storage
           │
           ▼
    App Storage (Permanent bucket: s3://castreach-recordings/{tenantId}/{bookingId}/original.mp4)
           │
           ▼
    Edit Request (EDL JSON) → Worker Processing → Rendered Output
           │
           ▼
    App Storage (s3://castreach-recordings/{tenantId}/{bookingId}/edits/{versionId}.mp4)
    ```
  - **Access Control**: Bucket remains strictly private. Frontend requests short-lived Presigned GET URLs (`/api/recordings/:bookingId/url`) generated by backend after verifying participant authorization.

---

## 11. Non-Destructive Editing Model

The original recording must **NEVER** be mutated or overwritten.

### Conceptual Versioning Model:
```
Booking (ID: 6ab742...)
  │
  ├── Original Recording Asset
  │     ├── storageKey: "recordings/booking_6ab742/original.mp4"
  │     ├── duration: 3600 (seconds)
  │     └── createdAt: 2026-09-26T10:00:00Z
  │
  └── Edit Decision List (EDL) Metadata
        ├── versionId: "v1_trim"
        ├── trimStart: 12.5 (seconds)
        ├── trimEnd: 3540.0 (seconds)
        ├── mutedSegments: [{ start: 120, end: 125 }]
        ├── status: "READY" | "PROCESSING" | "FAILED"
        └── outputStorageKey: "recordings/booking_6ab742/edits/v1_trim.mp4"
```

---

## 12. Edit Operations Classification

| Operation | Complexity Class | Architectural Requirement | MVP Candidate? |
| :--- | :--- | :--- | :--- |
| **1. Trim Start/End** | Low | EDL Metadata / FFmpeg `-ss -to -c copy` (Fast stream copy) | **YES (MVP)** |
| **2. Audio-only Export (MP3/WAV)** | Low | FFmpeg `-vn -acodec libmp3lame` | **YES (MVP)** |
| **3. Cut Middle Section** | Medium | Multi-segment EDL / FFmpeg filter_complex concat | **YES (Phase 2)** |
| **4. Split Segments** | Medium | Multi-segment EDL array | **Phase 2** |
| **5. Merge Clips** | Medium | FFmpeg concat demuxer | **Phase 2** |
| **6. Volume Adjustment** | Medium | FFmpeg audio filter (`volume=1.5`) | **Phase 3** |
| **7. Audio Fade In/Out** | Medium | FFmpeg `afade` filter | **Phase 3** |
| **8. Intro / Outro Bumper Insertion**| High | Resolution/framerate matching + FFmpeg concat | **Phase 3** |
| **9. Subtitle / Caption Burn-In** | High | AI Speech-to-Text (Whisper) + FFmpeg `subtitles` filter | **Phase 4** |
| **10. Multi-Track Individual Mixing**| High | Separate Daily ISO track capture + Multi-input FFmpeg | **Phase 4** |

---

## 13. Waveform Architecture

- **Browser-Side Generation (Web Audio API)**:
  - Fetch audio stream → `AudioContext.decodeAudioData()` → Extract channel data amplitude array → Draw canvas waveform.
  - *Limitation*: Requires downloading the entire audio track and decoding it in memory.
- **Precomputed Peak Architecture (Recommended)**:
  - During initial recording ingestion, backend/worker generates a lightweight JSON array of peak amplitudes (e.g. 1,000 floats representing min/max levels across the file).
  - Peak file stored as `waveform.json` (~8 KB file).
  - Frontend instantly loads `waveform.json` and renders canvas timeline without downloading the full multi-hundred megabyte video file.

---

## 14. Processing State Machine

```
   [ UNEDITED / ORIGINAL READY ]
                 │
                 ▼ (POST /api/recordings/:bookingId/edit)
         [ EDIT_REQUESTED ]
                 │
                 ▼ (Worker picks up job)
          [ PROCESSING ]
           ┌─────┴─────┐
           ▼           ▼
       [ READY ]   [ FAILED ]
```

- **Isolation Constraint**: The editing state machine MUST remain completely distinct from `booking.status` and `booking.paymentStatus`. An edit failure or request does not alter booking completion or payment escrow.

---

## 15. Security Analysis

- **Authorization & IDOR**: All edit endpoints (`/api/recordings/:bookingId/edit`) must execute `verifyToken` and assert that `req.user.id` matches `booking.host` or `booking.guest` (or admin).
- **SSRF (Server-Side Request Forgery)**: The backend worker must **NEVER** accept arbitrary media URLs passed in user request bodies. All processing jobs must load media files exclusively from validated Daily.co URLs or verified application object storage keys.
- **FFmpeg Shell Injection**: If invoking FFmpeg via Node CLI, do NOT pass shell strings (`exec('ffmpeg -i ' + url)`). Use `spawn('ffmpeg', args)` with explicit string arguments to prevent command injection.
- **Presigned URL Security**: Never return public AWS/S3 bucket credentials. Generate short-lived presigned GET URLs (15-minute expiration).

---

## 16. Payment Isolation Invariant

> **"Recording editing is independent from payment state."**

For every editing event (`EDIT_REQUESTED`, `PROCESSING`, `READY`, `FAILED`):
- `releaseEscrow()` is **NEVER** called.
- Stripe PaymentIntent is **NEVER** captured, transferred, or refunded.
- `booking.paymentStatus` remains strictly unchanged (held in escrow).
- Escrow payment release remains exclusively governed by `bookingLifecycle.completeBooking()` upon explicit session completion.

---

## 17. Failure Scenarios

| Scenario | System Handling |
| :--- | :--- |
| **Source URL Expired** | Backend detects HTTP 403 on source fetch → Transitions job to `FAILED` with message "Source recording link expired". Payment remains held. |
| **FFmpeg Out of Memory / Timeout** | Worker catches exit code / timeout → Cleans `/tmp` → Transitions job to `FAILED`. Original file remains intact. |
| **User Closes Browser During Render** | Server-side rendering job completes asynchronously. Notification sent when ready. |
| **Duplicate Edit Submission** | Idempotency key on edit request prevents spawning duplicate FFmpeg rendering processes. |
| **Dispute Created While Editing** | Session state moves to `disputed`. Booking workspace locks edits, but existing media files remain untouched. Payment remains held. |

---

## 18. Vercel Compatibility Matrix

| Task / Feature | Vercel Serverless Compatibility | Recommendation |
| :--- | :--- | :--- |
| **Fetch Recording Status API** | **SAFE ON VERCEL** | Run on Express backend (`/api/recordings/:bookingId`) |
| **Save EDL Trim Metadata (JSON)** | **SAFE ON VERCEL** | Save EDL JSON directly in MongoDB |
| **Frontend Trim Preview** | **SAFE ON VERCEL** | Playback bounds managed in client HTML5 `<video>` |
| **Generate Presigned S3 URLs** | **SAFE ON VERCEL** | Generated via AWS SDK in serverless function (<50ms) |
| **Lightweight Audio Waveform JSON**| **POSSIBLE WITH LIMITATIONS**| Extract peaks for short audio (<10MB); avoid heavy video |
| **Full FFmpeg Video Transcoding** | **SHOULD RUN OUTSIDE VERCEL**| Delegate to external worker process (Render / Railway / AWS Lambda) |

---

## 19. Free / Low-Cost Development Path

- **Local Development**:
  - Run Node.js backend locally with `ffmpeg` installed via system PATH (e.g. `choco install ffmpeg` / `brew install ffmpeg`).
  - Use local disk (`/uploads` or `/tmp`) as mock object storage.
  - Store EDL metadata in local MongoDB.
  - ZERO external paid cloud services required during local development.
- **Staging / Production**:
  - Object Storage: Cloudflare R2 (Free tier includes 10GB storage, 0$ egress fees).
  - Heavy Processing: External worker container on Railway / Render free tier or AWS Lambda (1M free requests/month).

---

## 20. Proposed Data Model

```
Booking Schema (Existing)
  │
  └── (New Concept: RecordingEdits Array or Subdocument)
        ├── editId: ObjectId
        ├── createdBy: ObjectId (User)
        ├── title: String
        ├── edl: {
        │     trimStart: Number,   // seconds
        │     trimEnd: Number,     // seconds
        │     mutedRanges: [{ start: Number, end: Number }]
        │   }
        ├── status: Enum ['NOT_EDITED', 'PROCESSING', 'READY', 'FAILED']
        ├── outputUrl: String
        ├── duration: Number
        └── timestamps (createdAt, updatedAt)
```

---

## 21. Proposed API Contract

- **`GET /api/recordings/:bookingId/editor`**:
  - *Auth*: Verified participant.
  - *Response*: `{ originalUrl, duration, waveformUrl, edits: [ { editId, edl, status, outputUrl } ] }`
- **`POST /api/recordings/:bookingId/edit`**:
  - *Auth*: Verified participant.
  - *Body*: `{ trimStart: 10.5, trimEnd: 300.0, format: 'mp4' }`
  - *Response*: `{ success: true, editId, status: 'PROCESSING' }`
- **`GET /api/recordings/:bookingId/edit/:editId`**:
  - *Auth*: Verified participant.
  - *Response*: `{ editId, status, progress, outputUrl }`

---

## 22. Proposed UI Architecture

```
[ Booking Detail Page ] ──(Click "Edit Recording")──► [ Editor Workspace Modal / Page ]
                                                              │
    ┌─────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┐
    │                                                                                                                  │
    ▼                                                                                                                  ▼
[ Video Preview Player ]                                                                                   [ Interactive Timeline ]
  - HTML5 Video                                                                                              - Canvas Waveform
  - Play / Pause / Seek                                                                                      - Drag Handles (Start/End)
  - Time Markers (00:12 / 45:00)                                                                            - Zoom Controls
    │                                                                                                                  │
    └─────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
                                                   [ Action Toolbar ]
                                                     - Preview Trim
                                                     - Reset Handles
                                                     - Render & Export
                                                              │
                                                              ▼
                                                   [ Processing Status Badge ]
                                                     - "Rendering clip..."
                                                     - Download Edited Output
```

---

## 23. Observability & Logging

Key metrics to log persistently:
- `edit_requested`: `bookingId`, `userId`, `trimStart`, `trimEnd`, `sourceDuration`.
- `job_started`: `jobId`, `workerId`, `sourceSizeMB`.
- `job_completed`: `jobId`, `renderDurationMs`, `outputSizeMB`.
- `job_failed`: `jobId`, `errorType`, `ffmpegExitCode`, `stackTrace`.

---

## 24. Test Strategy

1. **Unit & Route Authorization Tests**:
   - Assert `401` for unauthenticated edit requests.
   - Assert `403` for non-participant edit requests.
   - Assert `400` for invalid trim ranges (`trimStart >= trimEnd`, negative times, out of bounds).
2. **State Machine & Payment Invariant Tests**:
   - Assert `paymentStatus` remains `'held'` across edit request, processing, completion, and failure states.
   - Assert `releaseEscrow` is never called.
3. **Media Processing Tests (Local FFmpeg)**:
   - Verify trim operation generates valid playable MP4 file.
   - Verify audio export generates valid MP3 file.
   - Verify behavior on corrupted or missing media files.
4. **Security Tests**:
   - Verify SSRF protection rejects external domain URLs.
   - Verify input sanitization prevents command injection.

---

## 25. Proposed Phase Breakdown

- **Phase C3.1 (Metadata Trim & Preview UI - Vercel Safe)**:
  - Implement frontend timeline trim handles and preview bounds in `<video>`.
  - Save non-destructive EDL JSON (`trimStart`, `trimEnd`) on `Booking` model via Express API.
- **Phase C3.2 (Object Storage Integration)**:
  - Integrate Cloudflare R2 / S3 client to mirror Daily recordings upon webhook receipt.
  - Implement presigned URL endpoint (`GET /api/recordings/:bookingId/url`).
- **Phase C3.3 (Asynchronous FFmpeg Worker & Rendering)**:
  - Build standalone Node.js FFmpeg worker process for trim rendering & audio extraction.
  - Implement asynchronous processing state machine (`PROCESSING` → `READY`).

---

## 26. Blockers, Risks & Summary

### Blockers
1. **Lack of Application Object Storage**: Currently, Daily URLs expire after a few days. Persistent editing requires integrating Cloudflare R2 or S3 storage.
2. **Vercel FFmpeg Execution Limits**: Video rendering cannot execute inside Vercel serverless functions due to 60s timeouts and 512MB disk limits.

### Risks
1. **Bandwidth & Storage Costs**: Storing multi-gigabyte raw video files across thousands of bookings could incur storage costs if retention policies are unmanaged.
2. **Long Rendering Times**: High-resolution video transcoding is CPU intensive; workers must be properly sized.

---

# C3 ARCHITECTURE AUDIT RESULT

## Current Recording Architecture
- Daily.co Cloud Recording automatically captures sessions and delivers temporary download URLs via webhooks. Fully decoupled from Stripe escrow payment lifecycle.

## Recording Storage
- Currently resides exclusively on Daily's managed cloud storage (AWS S3) via temporary download links. No application-controlled object storage is implemented yet.

## Browser Editing Feasibility
- Client-side previewing, trim handle selection, and Edit Decision List (EDL) metadata creation are lightweight and 100% feasible. In-browser video re-encoding via FFmpeg WASM is infeasible for long podcast files due to browser memory/CPU limits.

## Server-Side Editing Feasibility
- Highly feasible using native FFmpeg binaries, but **NOT SAFE ON VERCEL SERVERLESS** due to 60s execution timeouts, 512MB `/tmp` disk bounds, and 1024MB RAM limits.

## Background Processing
- No background queue or worker infrastructure exists in the current repository (`NO EXISTING MEDIA JOB INFRASTRUCTURE FOUND`). Asynchronous processing requires a worker outside Vercel.

## Storage Requirements
- Application object storage (Cloudflare R2 / AWS S3) is required for persistent non-destructive editing beyond Daily's temporary URL expiration window.

## Versioning Model
- Original recording file is kept intact (`original.mp4`). Edits are stored as non-destructive EDL JSON metadata records with optional rendered output files (`v1_trim.mp4`).

## Security Requirements
- Strict participant authorization (`verifyToken` + host/guest check), SSRF prevention against arbitrary URLs, FFmpeg spawn argument array sanitization, and short-lived presigned URLs.

## Payment Isolation
- Editing operations are 100% isolated from payments. `releaseEscrow` is never called. `paymentStatus` remains `'held'`.

## Vercel Compatibility
- API routes, presigned URL generation, and EDL JSON persistence are **SAFE ON VERCEL**. Heavy FFmpeg rendering **SHOULD RUN OUTSIDE VERCEL**.

## Proposed Architecture
- Frontend Timeline & EDL Editor → Vercel Express API (Save EDL) → Presigned Object Storage → Background FFmpeg Worker (Render) → Presigned Download.

## What Can Be Implemented Locally
- Full local development stack using Node.js, local FFmpeg binary, local disk storage, and local MongoDB without any paid cloud subscriptions.

## What Requires New Infrastructure
- Cloudflare R2 / AWS S3 bucket for persistent storage, plus external container/lambda for production FFmpeg background rendering.

## Recommended Phase Breakdown
- Phase C3.1: Non-destructive EDL Metadata Trim & Frontend Timeline Preview (Vercel Safe).
- Phase C3.2: Application Object Storage Mirroring & Presigned URLs.
- Phase C3.3: Background Asynchronous FFmpeg Rendering Worker.

## BLOCKERS
- Direct FFmpeg execution within Vercel serverless environment.
- Temporary nature of Daily download links without application object storage.

## RISKS
- Video rendering CPU bottlenecks if workers are undersized.
- Memory consumption during browser decoding if attempting full client-side WASM render.

## NOT IMPLEMENTED
- Source code changes, package installations, DB migrations, or UI modifications (Audit phase only).

---

## FINAL DECISION

**READY WITH CONDITIONS**

- **Condition 1**: Phase C3 implementation MUST separate non-destructive EDL metadata editing (Vercel-safe) from heavy FFmpeg video rendering.
- **Condition 2**: Heavy FFmpeg rendering MUST NOT execute directly inside Vercel serverless API handlers.
- **Condition 3**: Application object storage (Cloudflare R2 / S3) MUST be introduced before rendering persistent edited outputs to prevent reliance on temporary Daily download URLs.
- **Condition 4**: Strict payment isolation MUST be preserved across all C3 editing endpoints.

---
*End of Phase C3 Read-Only Architecture Audit Report.*
