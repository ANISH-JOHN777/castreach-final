# CASTREACH — LOCAL PERSISTENT MONGODB AUDIT & SWITCH REPORT
**Date**: September 27, 2026  
**Status**: AUDITED & AUDIT COMPLETE — ACTION REQUIRED TO INSTALL LOCAL MONGODB SERVER  

---

## 1. Local Machine MongoDB Availability Audit

As mandated by Section 1 ("Do NOT assume MongoDB is installed. Report exactly what is missing and give me the exact installation step required. Do not modify MONGODB_URI to a dead MongoDB endpoint"), a thorough audit of the host environment was performed:

| Check Item | Command / Path Inspected | Result | Status |
| :--- | :--- | :--- | :--- |
| **mongod binary** | `Get-Command mongod` | Not found | ❌ Missing |
| **mongosh CLI** | `Get-Command mongosh` | Not found | ❌ Missing |
| **MongoDB Service** | `Get-Service *mongo*` | No service registered | ❌ Missing |
| **Program Files** | `C:\Program Files\MongoDB` | Directory does not exist | ❌ Not Installed |
| **TCP Port 27017** | `Test-NetConnection 127.0.0.1 -Port 27017` | `TcpTestSucceeded: False` | ❌ Connection Refused |
| **Local Connection** | `mongodb://127.0.0.1:27017` | Connection Refused (`ECONNREFUSED`) | ❌ Server Offline |

> [!WARNING]
> **LOCAL MONGODB SERVER IS NOT INSTALLED ON THIS MACHINE.**  
> Per Section 1 & Section 3 directives, `MONGODB_URI` was NOT set to `mongodb://127.0.0.1:27017/castreach_demo` while offline, preventing CastReach from crashing on boot due to a dead database endpoint.

---

## 2. Exact Step-by-Step Installation Instructions

To run CastReach with a persistent local MongoDB database, follow these steps to install and start MongoDB Community Server on Windows:

### Step 1: Download & Install MongoDB Community Server
1. Download the **MongoDB Community Server MSI Installer** for Windows from the official site:  
   👉 [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run the installer (`.msi`).
3. Select **"Complete"** installation type.
4. **IMPORTANT**: Keep the checkbox **"Install MongoDB as a Service"** checked (runs service name `MongoDB` automatically on startup).
5. Complete the installation wizard.

### Step 2: (Optional) Install MongoDB Shell (`mongosh`)
1. Download `mongosh` from:  
   👉 [https://www.mongodb.com/try/download/shell](https://www.mongodb.com/try/download/shell)
2. Extract and add `mongosh.exe` to your Windows PATH.

### Step 3: Verify & Start MongoDB Service in PowerShell
Open PowerShell as Administrator and run:

```powershell
# Start MongoDB Service if stopped
Start-Service -Name "MongoDB"

# Verify port 27017 is listening
Test-NetConnection -ComputerName 127.0.0.1 -Port 27017
```

### Step 4: Update `server/.env` to Persistent Connection String
Once `Test-NetConnection` returns `TcpTestSucceeded: True`, update `server/.env`:

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

---

## 3. Database Startup & Fallback Audit

### Previous Behavior
- When `MONGODB_URI=memory` was set, `server/index.js` launched an in-memory `MongoMemoryReplSet` in RAM.
- Previous server code contained a fallback that silently created a `MongoMemoryReplSet` if `mongoose.connect()` failed when pointing to a real URI.

### Code Improvements Made
- [`server/index.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/index.js): **Removed silent memory fallback for manual development mode**. If `MONGODB_URI` points to a persistent database (e.g. `mongodb://127.0.0.1:27017/castreach_demo`) and connection fails, the server now logs the database connection error clearly and exits with `process.exit(1)`. This prevents silent downgrades to RAM!
- [`server/scripts/seedDemo.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/scripts/seedDemo.js): Audited `seedDemoData()`. Seeding is 100% idempotent: it checks for existing records (`Booking.findOne()`, `Message.findOne()`, `Review.findOne()`, `Availability.findOne()`) before creating baseline demo entries. Existing user-created data is **never deleted or overwritten**.

---

## 4. Recording Storage Architecture Audit

- **Metadata Storage**: Stored persistently in MongoDB document fields (`recordingStorage.objectKey`, `recordingStorage.status`, `recordingEdit.outputObjectKey`).
- **Binary Media Files**: Stored on local disk at `scratch/storage/recordings/<bookingId>/original/source.mp4` and `scratch/storage/recordings/<bookingId>/edited/<renderJobId>.mp4`.
- **Persistence Guarantee**: Storage directory `./scratch/storage` is isolated on disk and is **never deleted** on logout, login, backend restart, or demo seed operations.

---

## 5. Automated Regression Results

| Test Suite | Result | Details |
| :--- | :---: | :--- |
| **`server/tests/persistence.test.js`** | ✅ **9 / 9 PASS** | Verified logout session clearing, message retrieval, recording disk file persistence, AI artifacts, and server restart simulation. |
| **`server/tests/phaseE10.test.js`** | ✅ **30 / 30 PASS** | Verified demo seeding idempotency, RBAC, IDOR, transaction safety, and multi-tenant isolation. |
| **Frontend Production Build** | ✅ **100% PASS** | `npm run build` compiled 1960 modules with zero errors. |

---

## 6. Summary Matrix

| Metric | Ephemeral Memory Mode (`MONGODB_URI=memory`) | Persistent Mode (`mongodb://127.0.0.1:27017/castreach_demo`) |
| :--- | :--- | :--- |
| **Database Host** | Ephemeral RAM (`mongodb-memory-server`) | Persistent Local MongoDB Daemon |
| **Data Retention Across Restart** | ❌ Lost on Server Exit | ✅ 100% Retained |
| **User Data After Logout/Login** | ✅ Retained | ✅ Retained |
| **Recordings Storage** | ✅ Stored on Disk (`scratch/storage/`) | ✅ Stored on Disk (`scratch/storage/`) |
| **Silent Fallback to RAM** | N/A (Requested memory) | ❌ Disabled (Fails fast if DB offline) |
