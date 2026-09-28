==================================================
HOST ↔ GUEST MESSAGING REGRESSION
==================================================

BACKEND MESSAGING: PASS
WEBSOCKET: PASS
MESSAGE PERSISTENCE: PASS

HOST CHAT UI: PASS
GUEST CHAT UI: PASS
BOOKING CHAT ENTRY: PASS
MESSAGES NAVIGATION: PASS

REAL-TIME HOST → GUEST: PASS
REAL-TIME GUEST → HOST: PASS
READ RECEIPTS: PASS
TYPING: PASS
RECONNECT: PASS
MISSED MESSAGE RECOVERY: PASS

IDOR / AUTHORIZATION: PASS

E7 TESTS: 30/30 PASS
E10 TESTS: 30/30 PASS
FULL BACKEND: 829/829 PASS (37/37 suites)
FRONTEND BUILD: PASS

ROOT CAUSE:
1. Missing navigation entry: `Layout.jsx` sidebar navigation (`getRoleNav()`) defined navigation items for Host, Guest, and Admin roles, but lacked a `Messages` navigation item.
2. Missing booking-level messaging action buttons: `BookingDetail.jsx`, `HostDashboard.jsx`, `GuestDashboard.jsx`, and `ParticipantCard` lacked explicit "Message Guest" / "Message Host" action buttons to open booking-centric chat threads directly.
3. WebSocket token key mismatch: `useRealtimeMessages.js` retrieved `token` from `localStorage.getItem('token')`, whereas `AuthContext.jsx` saves the active token as `cr_token`, causing WebSocket connections to attempt unauthenticated fallback.

FIX:
1. `src/components/Layout.jsx`: Added `Messages` nav item (`/messages` with `MessageSquare` icon) for Host, Guest, and Admin navigation menus in `getRoleNav()`.
2. `src/pages/Messages.jsx`: Created dedicated `Messages` page rendering a 2-column conversation list of all user bookings on the left and `BookingChatThread` on the right. Automatically handles deep-linking via `/messages/:bookingId`.
3. `src/App.jsx`: Registered protected routes `/messages` and `/messages/:bookingId`.
4. `src/hooks/useRealtimeMessages.js`: Fixed token resolution to retrieve `cr_token` from `localStorage` (`localStorage.getItem('cr_token') || localStorage.getItem('token') || user?.token`), enabling authenticated WebSocket real-time messaging.
5. `src/pages/BookingDetail.jsx`: Added prominent "Message Guest" / "Message Host" action buttons in the main session action panel and in `ParticipantCard`.
6. `src/pages/host/HostDashboard.jsx` & `src/pages/guest/GuestDashboard.jsx`: Added "Message Guest" / "Message Host" buttons on booking cards leading directly to `/messages/:bookingId`.

FINAL STATUS:
FIXED
==================================================
