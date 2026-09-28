==================================================
HOST → GUEST MESSAGE UI
==================================================

HOST MESSAGES NAVIGATION: PASS

HOST BOOKING DETAIL:
MESSAGE GUEST BUTTON: PASS

HOST MESSAGE PAGE:
PASS

GUEST MESSAGES NAVIGATION: PASS

GUEST BOOKING DETAIL:
MESSAGE HOST BUTTON: PASS

HOST → GUEST:
PASS

GUEST → HOST:
PASS

REAL-TIME WITHOUT REFRESH:
PASS

READ RECEIPTS:
PASS

TYPING:
PASS

RECONNECT:
PASS

MISSED MESSAGE RECOVERY:
PASS

AUTHORIZATION:
PASS

E7:
30/30 PASS

E10:
30/30 PASS

FULL BACKEND:
829/829 PASS (37/37 suites)

FRONTEND BUILD:
PASS

ROOT CAUSE:
1. Authorization Header Mismatch on Dashboards: `HostDashboard.jsx` and `GuestDashboard.jsx` executed raw `fetch('/api/bookings', { headers: { Authorization: 'Bearer ' + user?.token } })`. Since `user.token` is undefined (`user` object contains `_id`, `name`, `email`, `role`, but no `.token`), requests failed with 401 Unauthorized, returning an empty `bookings` array. As a result, the Host and Guest dashboards rendered "No booking requests currently pending." and failed to render any booking cards or "Message Guest" / "Message Host" buttons.
2. Missing Sidebar Navigation Items: `Layout.jsx` defined role-based navigation menus but omitted `Messages` (`/messages`) for Host, Guest, and Admin sidebar items.
3. WebSocket Authentication Token Key Mismatch: `useRealtimeMessages.js` resolved `token` from `localStorage.getItem('token')`, whereas `AuthContext.jsx` saves tokens under key `cr_token`, causing WebSocket connections to fail authentication during client startup.

FIX:
1. `src/pages/host/HostDashboard.jsx` & `src/pages/guest/GuestDashboard.jsx`: Replaced raw `fetch` with `authFetch('/bookings')` from `useAuth()`. Now authenticates with `cr_token`, returns HTTP 200, populates all host/guest bookings, and renders booking cards with prominent "Message Guest" / "Message Host" action buttons.
2. `src/components/Layout.jsx`: Added `Messages` (`/messages` with `MessageSquare` icon) to navigation menus in `getRoleNav()` for Host, Guest, and Admin roles.
3. `src/hooks/useRealtimeMessages.js`: Updated token resolution to retrieve `cr_token` from `localStorage` (`localStorage.getItem('cr_token') || localStorage.getItem('token') || user?.token`), enabling authenticated WebSocket real-time messaging.
4. `src/pages/Messages.jsx`: Created a dedicated 2-column Messages page with a conversation list on the left and `BookingChatThread` on the right. Automatically supports deep-linking via `/messages/:bookingId`.
5. `src/pages/BookingDetail.jsx`: Added prominent "Message Guest" / "Message Host" action buttons in the main session action bar and inside `ParticipantCard`.

FINAL STATUS:
FIXED
==================================================
