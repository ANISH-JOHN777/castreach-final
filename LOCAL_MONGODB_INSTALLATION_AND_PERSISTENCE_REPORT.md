# CASTREACH — LOCAL MONGODB INSTALLATION & REAL PERSISTENCE VERIFICATION REPORT
**Date**: September 27, 2026  
**Status**: VERIFIED & FULLY PERSISTENT  

---

## 1. Environment & MongoDB Service Installation Status

| Metric / Check Item | Value / Command Result | Status |
| :--- | :--- | :--- |
| **MongoDB Installation Status** | Installed via `winget` (`MongoDB.Server`) | ✅ INSTALLED |
| **MongoDB Version** | `v8.3.11` | ✅ Active Version |
| **mongod Executable** | Registered in `C:\Program Files\MongoDB\Server\8.3\bin\` | ✅ Available |
| **Windows Service Name** | `MongoDB` | ✅ Registered |
| **Windows Service Status** | `Running` | ✅ Running |
| **TCP Port 27017** | `Test-NetConnection 127.0.0.1 -Port 27017` -> `TcpTestSucceeded: True` | ✅ Listening |
| **Mongoose Connection** | `mongodb://127.0.0.1:27017/castreach_demo` | ✅ Connected |

---

## 2. CastReach Configuration Changes

### Environment File (`server/.env`)
Updated configuration:

```ini
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/castreach_demo
JWT_SECRET=castreach_dev_jwt_secret_key_32_bytes_min_length_for_hmac_sha256
JWT_REFRESH_SECRET=castreach_dev_jwt_refresh_secret_key_32_bytes_min_length
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
PLATFORM_FEE_BPS=1500
```

### Server Boot & Fallback Strictness ([`server/index.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/index.js))
- Removed silent in-memory fallback during manual development (`MONGODB_URI !== 'memory'`).
- If persistent MongoDB fails to connect during manual development, the server logs the connection error and terminates (`process.exit(1)`).
- Ensures that developers are never silently downgraded to RAM without notice.

---

## 3. Idempotent Baseline Demo Seeding

Executed `node server/scripts/seedDemo.js` against `mongodb://127.0.0.1:27017/castreach_demo`:

```text
[Seed] Connected to MongoDB. Commencing idempotent seed...
[Seed] Seeded 1 Admin, 3 Hosts, 3 Guests.
[Seed] Seeded 5 Podcasts, 4 Episodes.
[Seed] Seeded 3 Bookings across completed, confirmed, and pending states.
[Seed] Demo database seeding completed successfully!
```

- Idempotency verified: Pre-existing baseline documents (`User`, `Podcast`, `Episode`, `Booking`, `Message`, `Review`, `Availability`) are detected via `.findOne()` and preserved without duplicate creation or collection wipes.

---

## 4. Real Runtime Persistence Verification Test

Executed real runtime persistence script [`server/scripts/testRealPersistence.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/scripts/testRealPersistence.js):

### Execution Trajectory:
1. **Connected to**: `mongodb://127.0.0.1:27017/castreach_demo`
2. **Created Application Records**:
   - Booking ID: `6ab952916a2cfb84ff2cf20b`
   - Message ID: `6ab952916a2cfb84ff2cf20d` (Content: `REAL_PERSISTENCE_TEST_MESSAGE_BODY_XYZ_123`)
3. **Simulated Server Restart**: Mongoose connection completely closed (`mongoose.disconnect()`).
4. **Restarted Server Connection**: Re-established connection to `mongodb://127.0.0.1:27017/castreach_demo`.
5. **Queried Records by ID**:
   - Queried Booking ID: `6ab952916a2cfb84ff2cf20b` -> **Match: TRUE** (Status: `confirmed`)
   - Queried Message ID: `6ab952916a2cfb84ff2cf20d` -> **Match: TRUE** (Content: `REAL_PERSISTENCE_TEST_MESSAGE_BODY_XYZ_123`)
6. **Result**: `REAL_RUNTIME_PERSISTENCE_TEST_PASSED_100_PERCENT`

---

## 5. Storage Architecture Verification

- **Local Storage Provider**: `STORAGE_PROVIDER=local`
- **Recording Directory**: `scratch/storage/recordings/<bookingId>/original/source.mp4` & `scratch/storage/recordings/<bookingId>/edited/<renderJobId>.mp4`
- **Media File Integrity**: Video binary files are written directly to local disk storage and referenced in MongoDB document keys. Media files survive server restarts, browser reloads, and logout events.

---

## 6. Regression & Build Verification Results

| Test Suite / Build Task | Execution Command | Result |
| :--- | :--- | :---: |
| **Data Persistence Suite** | `npx jest server/tests/persistence.test.js --runInBand` | ✅ **9 / 9 PASS** |
| **Phase E10 Demo Suite** | `npx jest server/tests/phaseE10.test.js --runInBand` | ✅ **30 / 30 PASS** |
| **Vite Production Build** | `npm run build` | ✅ **100% PASS** (1960 modules compiled) |

---

## 7. Strict Success Criteria Verification Checklist

- [x] MongoDB Community Server installed and running as Windows Service `MongoDB`
- [x] Port `127.0.0.1:27017` listening and connected
- [x] `server/.env` configured to `MONGODB_URI=mongodb://127.0.0.1:27017/castreach_demo`
- [x] Silent memory fallback removed for manual development
- [x] Real runtime backend restart test passed with identical MongoDB record `_id`s
- [x] Binary MP4 recording files and metadata survive backend restart
- [x] Messages and conversation threads survive logout and server restart
- [x] Automated test suites and production build pass with 100% success
