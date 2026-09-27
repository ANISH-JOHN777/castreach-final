# CASTREACH — INVESTOR DEMO FREE RESOURCE MATRIX

| COMPONENT | RESOURCE | FREE/LOCAL OPTION | CURRENT CONFIGURATION | LIMITATION | INVESTOR DEMO READY |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Database** | MongoDB | Local MongoDB / MongoMemoryReplSet | `MongoMemoryReplSet` (In-Memory Replica Set) / MongoDB Atlas M0 | 512MB RAM cap on free Atlas; MongoMemoryReplSet resets on server restart | **PASS (100% Free & Transaction Capable)** |
| **Object Storage** | Media Storage | Local Disk Storage Abstraction (`scratch/storage`) | `STORAGE_PROVIDER=local` / Cloudflare R2 Free Tier (10GB) | Pre-signed URL emulation works locally; production bucket requires S3/R2 keys | **PASS (100% Free)** |
| **Frontend SPA** | Web Application | Vercel / Netlify Free Tier / Local Vite dev server | Vite (`http://localhost:5173`) | Free tier domain `*.vercel.app` or local port | **PASS (100% Free)** |
| **Backend REST API** | Express Engine | Local Node.js / Render Free Web Service | Express (`http://localhost:3001`) | Free PaaS sleeps after 15 min inactivity | **PASS (100% Free)** |
| **WebSockets** | Realtime Communication | Native WebSocket Server (`ws://localhost:3001/ws`) | Integrated `ws` upgrade server | Serverless PaaS (Vercel) cannot host persistent WS | **PASS (100% Free Persistent Host)** |
| **Render Worker** | FFmpeg Stticher | Local Node.js worker process (`npm run worker:render`) | Local background worker (`worker/renderWorker.js`) | Requires local `ffmpeg` installed on host system | **PASS (100% Free)** |
| **Transcription Worker** | Speech-to-Text | Built-in `generateFallbackTranscript` / Local Whisper | Fallback transcript generator / OpenAI Whisper API | OpenAI API requires pay-per-minute; fallback provides realistic transcript data | **PASS (Fallback Ready / Free)** |
| **AI Intelligence** | Claude 3.5 Haiku | Built-in `generateMockArtifact` / Anthropic API | Fallback mock generator / Anthropic Claude API | Anthropic API key optional; fallback generates structured JSON for all 8 artifact types | **PASS (Fallback Ready / Free)** |
| **Meeting Rooms** | WebRTC Video | Daily.co Free Tier (5000 min/mo) / Test Room Token | Daily.co Integration with ephemeral tokens | Requires Daily.co free developer API key for live video feed | **PASS (Free Developer Tier / Token Verified)** |
| **Payments & Escrow** | Financial Escrow | Stripe Test Mode (`sk_test_...`) | Stripe Connect Test Mode | Test mode only; no real money moves | **PASS (100% Free Test Mode)** |
| **Notifications** | In-App Alerts | Database-backed notification engine | Native MongoDB `Notification` collection | In-app notification UI active; optional email requires SendGrid key | **PASS (100% Free In-App Engine)** |
| **FFmpeg** | Audio/Video Stitch | Local FFmpeg binary / system package | System `ffmpeg` executable | Must be installed on host system path | **PASS (100% Free Open Source)** |

---

## Technical Summary
CastReach is fully operational for investor demonstrations on **100% FREE AND LOCAL INFRASTRUCTURE**. All AI, transcription, storage, WebSockets, and payment escrow flows function seamlessly using the platform's built-in fallback adapters and test-mode configurations.
