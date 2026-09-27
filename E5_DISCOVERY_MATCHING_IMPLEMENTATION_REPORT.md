# E5 — ADVANCED DISCOVERY + HOST/GUEST MATCHING IMPLEMENTATION REPORT

**Project:** CastReach  
**Phase:** E5 — Advanced Discovery + AI Host/Guest Matching  
**Date:** September 27, 2026  
**Status:** COMPLETED & VERIFIED  

---

## 1. Existing Architecture Inspected

Prior to implementation, a complete codebase audit was conducted across existing modules:
* `User.js` — Profile structure, expertise, interests, languages, and visibility settings (`profileVisibility`).
* `Booking.js` — Booking workflow, slot assignments, status transitions, and payments.
* `Availability.js` — User calendar slots, recurring schedules, and booking locks.
* `Podcast.js` & `Episode.js` — Show titles, descriptions, categories, tags, languages, and publishing status.
* `AIJob.js` — AI background task processing and status tracking.
* `supportedLanguages.js` — Reused central language matrix (`en`, `es`, `fr`, `de`, `hi`, `ta`, `te`, `ml`).
* `verifyToken.js` & RBAC — Dual-token JWT authentication, authorization scopes, and tenant header (`x-tenant-id`) checks.
* `DataStitcher` — Audit logging, event tracking, and relational data stitching.

---

## 2. Existing Functionality Reused

To maintain strict continuity without rewriting or breaking existing features:
* **E3 AI Infrastructure (`aiService.js`) & Anthropic SDK**: Reused existing prompt structure, AI job tracking, and prompt injection protection.
* **E4 Supported Languages (`supportedLanguages.js`)**: Utilized the official repository language dictionary for matching labels and language verification.
* **Availability Subsystem (`Availability.js`)**: Queried calendar slots directly to compute overlap windows without exposing raw calendar schedules.
* **Booking & Messaging Flow**: Discovered users seamlessly transition to existing `/book/:hostId` and `BookingWorkspace` chat components.

---

## 3. Discovery Architecture

The discovery system is unified into a dedicated service layer and endpoint suite:
* **Backend API Routes**: [`server/routes/discovery.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/routes/discovery.js) and [`server/routes/podcasts.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/routes/podcasts.js).
* **Deterministic Engine**: [`server/services/matchingEngine.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/services/matchingEngine.js).
* **AI Re-Ranking Layer**: [`server/services/aiMatching.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/services/aiMatching.js).
* **Frontend Hub**: [`src/pages/Discover.jsx`](file:///c:/Users/manue/OneDrive/Desktop/castreach/src/pages/Discover.jsx).

---

## 4. Podcast Discovery (`GET /api/podcasts`)

* **Visibility Scope**: Restricts search strictly to `status: 'PUBLISHED'`. Drafts and archived podcasts are hidden.
* **Query Parameters**: Supports `q`, `category`, `tag`, `language`, `page`, `limit`, `sort`.
* **Privacy**: Excludes owner email, phone, and internal credentials.

---

## 5. Episode Discovery (`GET /api/discovery/episodes` & `/api/podcasts/episodes/discover`)

* **Visibility Scope**: Filters for published episodes belonging exclusively to published podcasts.
* **Lightweight Data Payload**: Returns summary metadata (title, show notes snippet, duration, topics, host display name) without loading massive transcripts or raw audio buffers.

---

## 6. Host Discovery (`GET /api/discovery/hosts`)

* **Role Filter**: Targets `role: { $in: ['host', 'both'] }`.
* **Privacy Protection**: Excludes private profiles (`profileVisibility: 'private'`), email, phone, and credentials.
* **Aggregated Stats**: Attaches verified published podcast count for each host.

---

## 7. Guest Discovery (`GET /api/discovery/guests`)

* **Role Filter**: Targets `role: { $in: ['guest', 'both'] }`.
* **Expertise & Topics**: Allows filtering by expertise tags, primary topics, and language support.
* **Availability State**: Indicates calendar status (`AVAILABLE`, `NO_OVERLAP`, `UNKNOWN`) without exposing raw slot details.

---

## 8. Search & Filters

* **Text Search**: Built on MongoDB case-insensitive regex queries matching `title`, `description`, `displayName`, `bio`, `expertise`, `interests`, and `topics`.
* **Query Normalization**: Trims user input, prevents unbounded wildcard scans, and enforces page limit caps (max 50 items/page).

---

## 9. Matching Algorithm & Compatibility Factors

The deterministic engine computes multi-dimensional compatibility scores (0–100) grounded in verifiable data:
1. **Topic & Expertise Overlap (40% Weight)**: Jaccard set overlap between host interests/tags and guest expertise/topics.
2. **Language Compatibility (30% Weight)**: Verified overlap between host and guest supported languages.
3. **Category Alignment (15% Weight)**: Alignment between podcast category and guest expertise tags.
4. **Availability Window Overlap (15% Weight)**: Calendar schedule slot intersection check.

---

## 10. Match Explanation & Terminology

* Matches generate data-grounded explanations (e.g., *"Topic overlap in AI, SaaS · Both support English · Available overlap window"*).
* Clear Terminology: Uses **"Compatibility Score"** instead of "Success Probability" to avoid misleading users.

---

## 11. AI Integration & Prompt Security

* **Architecture**: Candidate Hard Filters → Deterministic Baseline Matching → AI Re-Ranking (Optional) → Final Results.
* **Security**: All profile data injected into Claude prompt templates are wrapped inside isolated XML tags (`<PROFILE_DATA>`) and treated strictly as untrusted string inputs.
* **Fallback Guarantee**: If `ANTHROPIC_API_KEY` is missing or invalid, the system automatically falls back to 100% deterministic matching without errors.

---

## 12. Privacy, Security & IDOR Protection

* **Data Exfiltration Prevention**: Strips sensitive attributes (`email`, `phone`, `password`, `stripeConnectAccountId`, `refreshToken`) from public discovery responses.
* **IDOR Protection**: `POST /api/discovery/matches` authenticates token identities and enforces role-based target matching without modifying user profiles.
* **Tenant Isolation**: Preserves `x-tenant-id` header validation across all discovery queries.

---

## 13. Test Coverage & Full Regression Verification

* **Phase E5 Test Suite**: [`server/tests/phaseE5.test.js`](file:///c:/Users/manue/OneDrive/Desktop/castreach/server/tests/phaseE5.test.js) (31/31 tests passed).
* **Frontend Build**: Production Vite build completed cleanly (`npm run build`).

---

## 14. Verification Summary Matrix

| Category | Status | Details |
| :--- | :--- | :--- |
| **Podcast Discovery** | `IMPLEMENTED & VERIFIED` | Published show filtering, category search, pagination |
| **Episode Discovery** | `IMPLEMENTED & VERIFIED` | Public episode metadata search, owner attribution |
| **Host Discovery** | `IMPLEMENTED & VERIFIED` | Public host profiles, podcast count aggregation |
| **Guest Discovery** | `IMPLEMENTED & VERIFIED` | Expertise matching, availability indicators |
| **Matching Engine** | `IMPLEMENTED & VERIFIED` | Multi-factor compatibility scoring & grounded explanation |
| **AI Re-Ranking** | `IMPLEMENTED & VERIFIED` | Claude API integration with automatic deterministic fallback |
| **Privacy & Security** | `IMPLEMENTED & VERIFIED` | Strict field sanitization, private profile masking, IDOR safety |
| **Frontend UI** | `IMPLEMENTED & VERIFIED` | Unified Discovery Hub with AI Match Finder tab |
| **Admin Reporting** | `IMPLEMENTED & VERIFIED` | Discovery monitoring metrics at `/api/reports/discovery` |
| **Full Regression** | `IMPLEMENTED & VERIFIED` | All server test suites passing |
| **Git Safety** | `PRESERVED` | No git commit, push, or reset performed |

---

## 15. Known Limitations & External Configuration

* **External AI API Key**: AI candidate re-ranking requires a valid `ANTHROPIC_API_KEY` in environment variables. If unconfigured, the platform seamlessly uses deterministic matching.
