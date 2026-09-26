import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Shorts = lazy(() => import('./pages/Shorts'));
const About = lazy(() => import('./pages/About'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Protected Role Dashboards & Features
const GuestDashboard = lazy(() => import('./pages/guest/GuestDashboard'));
const HostDashboard = lazy(() => import('./pages/host/HostDashboard'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

const Discover = lazy(() => import('./pages/Discover'));
const Bookings = lazy(() => import('./pages/Bookings'));
const BookingDetail = lazy(() => import('./pages/BookingDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Insights = lazy(() => import('./pages/Insights'));
const RecordingRoom = lazy(() => import('./pages/RecordingRoom'));

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--cream-warm)' }}>
    <div style={{ width: 40, height: 40, border: '4px solid var(--border-subtle)', borderTopColor: 'var(--plum-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  const getRoleDefault = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host';
    return '/guest';
  };

  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public Experience Pages */}
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/shorts" element={<Shorts />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Experience Pages */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/guest" element={<GuestDashboard />} />
            <Route path="/host" element={<HostDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />

            <Route path="/discover" element={<Discover />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/bookings/:id" element={<BookingDetail />} />
            <Route path="/bookings/:id/record" element={<RecordingRoom />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getRoleDefault() : '/'} replace />} />
      </Routes>
    </Suspense>
  );
}
