import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NowPlayingWidget from './components/NowPlayingWidget';
import NewMessageToast from './components/NewMessageToast';

function MessagesRedirect() {
  const { user } = useAuth();
  const { bookingId } = useParams();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'listener') return <Navigate to="/listen" replace />;
  const target = user.role === 'host' ? '/host' : '/guest';
  const url = bookingId ? `${target}?tab=messages&booking=${bookingId}` : `${target}?tab=messages`;
  return <Navigate to={url} replace />;
}

// Public Pages
const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Shorts = lazy(() => import('./pages/Shorts'));
const About = lazy(() => import('./pages/About'));
const Episodes = lazy(() => import('./pages/Episodes'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const FindGuests = lazy(() => import('./pages/FindGuests'));
const ForHosts = lazy(() => import('./pages/ForHosts'));
const ForGuests = lazy(() => import('./pages/ForGuests'));

// Protected Role Dashboards & Features
const GuestDashboard = lazy(() => import('./pages/guest/GuestDashboard'));
const HostDashboard = lazy(() => import('./pages/host/HostDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

const Discover = lazy(() => import('./pages/Discover'));
const Listen = lazy(() => import('./pages/Listen'));
const Messages = lazy(() => import('./pages/Messages'));
const Bookings = lazy(() => import('./pages/Bookings'));
const BookingDetail = lazy(() => import('./pages/BookingDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Insights = lazy(() => import('./pages/Insights'));
const RecordingRoom = lazy(() => import('./pages/RecordingRoom'));

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0D0C12' }}>
    <div style={{ width: 40, height: 40, border: '3px solid rgba(255, 255, 255, 0.1)', borderTopColor: '#A855F7', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  const getRoleDefault = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/control-center';
    if (!user.isOnboarded) return '/onboarding';
    if (user.role === 'host') return '/host';
    if (user.role === 'guest') return '/guest';
    return '/listen'; // listener
  };

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public Experience Pages */}
        <Route 
          path="/" 
          element={
            !user 
              ? <Home /> 
              : !user.isOnboarded 
                ? <Navigate to="/onboarding" replace /> 
                : user.role === 'host' 
                  ? <Navigate to="/host" replace /> 
                  : user.role === 'guest' 
                    ? <Navigate to="/guest" replace /> 
                    : user.role === 'admin' 
                      ? <Navigate to="/admin" replace /> 
                      : <Navigate to="/listen" replace />
          } 
        />
        <Route path="/discover" element={<Discover />} />
        <Route path="/listen" element={<Listen />} />

        {/* Discover guests: For hosts & visitors; guests directed to their guest workspace */}
        <Route 
          path="/find-guests" 
          element={user?.role === 'guest' ? <Navigate to="/guest" replace /> : <FindGuests />} 
        />
        <Route 
          path="/guests" 
          element={user?.role === 'guest' ? <Navigate to="/guest" replace /> : <FindGuests />} 
        />
        <Route 
          path="/for-hosts" 
          element={user?.role === 'guest' ? <Navigate to="/guest" replace /> : user?.role === 'listener' ? <Navigate to="/listen" replace /> : <ForHosts />} 
        />
        <Route 
          path="/for-guests" 
          element={user?.role === 'host' ? <Navigate to="/host" replace /> : user?.role === 'listener' ? <Navigate to="/listen" replace /> : <ForGuests />} 
        />
        <Route path="/episodes" element={<Navigate to="/discover" replace />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={user ? <Navigate to={getRoleDefault()} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={getRoleDefault()} replace /> : <Register />} />

        {/* Private Hidden Admin Login Entry Point */}
        <Route
          path="/control-center"
          element={
            !user ? (
              <AdminLogin />
            ) : user.role === 'admin' ? (
              <Layout><AdminDashboard /></Layout>
            ) : (
              <Navigate to={getRoleDefault()} replace />
            )
          }
        />

        {/* Protected Experience Pages */}
        <Route element={<ProtectedRoute />}>
          {/* Guest Dashboard: with Homepage-Style Navbar (Listen, Dashboard, Profile) */}
          <Route 
            path="/guest" 
            element={
              user?.role === 'guest' || user?.role === 'admin' ? (
                <GuestDashboard />
              ) : (
                <Navigate to={getRoleDefault()} replace />
              )
            } 
          />

          {/* Host Dashboard: with Homepage-Style Navbar (Discover guests, Dashboard, Listen, Profile) */}
          <Route 
            path="/host" 
            element={
              user?.role === 'host' || user?.role === 'admin' ? (
                <HostDashboard />
              ) : (
                <Navigate to={getRoleDefault()} replace />
              )
            } 
          />

          <Route element={<Layout />}>
            <Route
              path="/admin"
              element={
                user?.role === 'admin' ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to={getRoleDefault()} replace />
                )
              }
            />
            <Route 
              path="/messages" 
              element={<MessagesRedirect />} 
            />
            <Route 
              path="/messages/:bookingId" 
              element={<MessagesRedirect />} 
            />
            <Route 
              path="/bookings" 
              element={user?.role === 'listener' ? <Navigate to="/listen" replace /> : <Bookings />} 
            />
            <Route 
              path="/bookings/:id" 
              element={user?.role === 'listener' ? <Navigate to="/listen" replace /> : <BookingDetail />} 
            />
            
            <Route path="/insights" element={<Insights />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Profile: with authentic Homepage-style Navbar */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />

          <Route path="/bookings/:id/record" element={<RecordingRoom />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getRoleDefault() : '/'} replace />} />
      </Routes>
      <NowPlayingWidget />
      <NewMessageToast />
    </Suspense>
  );
}
