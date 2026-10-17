import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRouter } from '@/lib/router';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import HomePage from '@/pages/HomePage';
import BrowsePage from '@/pages/BrowsePage';
import ServiceDetailPage from '@/pages/ServiceDetailPage';
import AuthPage from '@/pages/AuthPage';
import ProfilePage from '@/pages/ProfilePage';
import BookingsPage from '@/pages/BookingsPage';
import FavoritesPage from '@/pages/FavoritesPage';
import DashboardPage from '@/pages/DashboardPage';
import ReelsPage from '@/pages/ReelsPage';
import ProviderHomePage from '@/pages/ProviderHomePage';
import WorkerHomePage from '@/pages/WorkerHomePage';
import FollowListPage from '@/pages/FollowListPage';
import UserProfilePage from '@/pages/UserProfilePage';
import NotificationsPage from '@/pages/NotificationsPage';
import MessagesPage from '@/pages/MessagesPage';
import MessagesInboxPage from '@/pages/MessagesInboxPage';
import ReferEarnPage from '@/pages/ReferEarnPage';
import PaymentPage from '@/pages/PaymentPage';
import WalletPage from '@/pages/WalletPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import DepthMotion from '@/components/DepthMotion';
import AIAssistantWidget from '@/components/AIAssistantWidget';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useScrollReveal } from '@/lib/useScrollReveal';

function Routes() {
  const { path, navigate } = useRouter();
  const { user, loading, passwordResetMode } = useAuth();
  const cleanPath = path.split('?')[0];

  // While checking session, render a blank screen (no navbar, no tabs, nothing)
  if (loading) return null;

  // Password recovery flow — show AuthPage in reset mode
  if (passwordResetMode) return <AuthPage />;

  // Not logged in — show ONLY the login/register page, nothing else
  if (!user) return <AuthPage />;

  // Logged in but visiting /auth — redirect home
  if (cleanPath === '/auth') {
    navigate('/');
    return null;
  }

  if (cleanPath === '/' || cleanPath === '') {
    return <HomeRoute />;
  }
  if (cleanPath === '/browse') return <BrowsePage />;
  if (cleanPath === '/profile') return <ProfilePage />;
  if (cleanPath === '/bookings') return <BookingsPage />;
  if (cleanPath === '/favorites') return <FavoritesPage />;
  if (cleanPath === '/wallet') return <WalletPage />;
  if (cleanPath === '/refer') return <ReferEarnPage />;
  if (cleanPath === '/dashboard') return <DashboardPage />;
  if (cleanPath === '/reels') return <ReelsPage />;
  if (cleanPath === '/my-reels') return <ReelsPage userId={user.id} />;
  if (cleanPath.startsWith('/profile/') && cleanPath !== '/profile') {
    const profileUserId = cleanPath.replace('/profile/', '');
    return <UserProfilePage userId={profileUserId} />;
  }
  if (cleanPath.startsWith('/followers/')) {
    const followUserId = cleanPath.replace('/followers/', '');
    return <FollowListPage userId={followUserId} mode="followers" />;
  }
  if (cleanPath.startsWith('/following/')) {
    const followUserId = cleanPath.replace('/following/', '');
    return <FollowListPage userId={followUserId} mode="following" />;
  }
  if (cleanPath.startsWith('/service/')) {
    const serviceId = cleanPath.replace('/service/', '');
    return <ServiceDetailPage serviceId={serviceId} />;
  }
  if (cleanPath.startsWith('/payment/')) {
    const payBookingId = cleanPath.replace('/payment/', '');
    return <PaymentPage bookingId={payBookingId} />;
  }
  if (cleanPath === '/admin') return <AdminDashboardPage />;
  if (cleanPath === '/notifications') return <NotificationsPage />;
  if (cleanPath === '/messages') return <MessagesInboxPage />;
  if (cleanPath.startsWith('/messages/')) {
    const msgUserId = cleanPath.replace('/messages/', '');
    return <MessagesPage otherUserId={msgUserId} />;
  }

  return <HomeRoute />;
}

function HomeRoute() {
  const { profile } = useAuth();
  if (profile?.role === 'provider' && profile?.service_type === 'workers') return <WorkerHomePage />;
  if (profile?.role === 'provider') return <ProviderHomePage />;
  return <HomePage />;
}

function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <ErrorBoundary>
          <AppLayout />
        </ErrorBoundary>
      </RouterProvider>
    </AuthProvider>
  );
}

function AppLayout() {
  const { path } = useRouter();
  const { user, loading, passwordResetMode } = useAuth();
  const cleanPath = path.split('?')[0];

  // Fullscreen pages: reels viewer and direct message threads
  const isFullscreen = cleanPath === '/reels' || cleanPath === '/my-reels' || cleanPath.startsWith('/messages/') || cleanPath.startsWith('/payment/');

  // Auth screen: no navbar, no bottom tabs, nothing behind it
  const isAuthScreen = (!loading && !user) || passwordResetMode;

  if (isAuthScreen || loading) {
    return (
      <div className="min-h-screen">
        <Routes />
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes />
        </main>
      </div>
    );
  }

  // App layout: top header + content + bottom tab bar (mobile-app style)
  useScrollReveal();

  return (
    <div className="min-h-screen flex flex-col relative isolate">
      <DepthMotion />
      <Navbar />
      <main className="motion-page relative z-10 flex-1 pb-16">
        <Routes />
      </main>
      <BottomNav />
      <AIAssistantWidget />
    </div>
  );
}

export default App;
