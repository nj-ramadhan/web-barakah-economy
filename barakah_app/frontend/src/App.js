// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import PrivateRoute from './utils/PrivateRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import ForgotPasswordPage from './pages/LoginForgotPasswordPage';
import ResetPasswordPage from './pages/LoginResetPasswordPage';

import Home from './pages/Home';
import DesktopLandingPage from './pages/DesktopLandingPage';
import useMediaQuery from './hooks/useMediaQuery';
import CrowdfundingMainPage from './pages/CrowdfundingMainPage';
import CrowdfundingCampaignDetail from './pages/CrowdfundingCampaignDetail';
import CrowdfundingDonationPage from './pages/CrowdfundingDonationPage';
import CrowdfundingDonationHistoryPage from './pages/CrowdfundingDonationHistoryPage';
import CrowdfundingPaymentConfirmation from './pages/CrowdfundingPaymentConfirmation';

import EcommerceMainPage from './pages/EcommerceMainPage';
import EcommerceWishlistPage from './pages/EcommerceWishlistPage';
import EcommerceCartPage from './pages/EcommerceCartPage';
import EcommerceOrderHistoryPage from './pages/EcommerceOrderHistoryPage';
import EcommerceProductDetail from './pages/EcommerceProductDetail';
import EcommerceCheckoutPage from './pages/EcommerceCheckoutPage';
import EcommercePaymentConfirmation from './pages/EcommercePaymentConfirmation';

import ArticleListPage from "./pages/ArticleListPage";
import ArticleDetailPage from "./pages/ArticleDetailPage";
import ArticleCreatePage from './pages/ArticleCreatePage';
import ArticleUploadImagesPage from './pages/ArticleUploadImagesPage';

import EcourseMainPage from './pages/EcourseMainPage';
import EcourseCourseDetail from './pages/EcourseCourseDetail';
import EcourseJoinCoursePage from './pages/EcourseJoinCoursePage';
import EcoursePaymentConfirmation from './pages/EcoursePaymentConfirmation';
import EcourseViewerPage from './pages/EcourseViewerPage';

import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailedPage from './pages/PaymentFailedPage';
import PaymentPendingPage from './pages/PaymentPendingPage';

import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import AcademyMain from './pages/AcademyMain';
import ActivityListPage from './pages/ActivityListPage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import DashboardUserPage from './pages/admin/DashboardUserPage';

import DigitalProductListPage from './pages/DigitalProductListPage';
import DigitalProductDetailPage from './pages/DigitalProductDetailPage';
import DigitalProductCheckoutPage from './pages/DigitalProductCheckoutPage';
import DigitalProductPaymentPage from './pages/DigitalProductPaymentPage';

import DashboardPage from './pages/DashboardPage';
import DashboardDigitalProductsPage from './pages/DashboardDigitalProductsPage';
import DashboardEcourseListPage from './pages/DashboardEcourseListPage';
import DashboardEcourseFormPage from './pages/DashboardEcourseFormPage';
import DashboardEcourseMaterialsPage from './pages/DashboardEcourseMaterialsPage';
import SellerProfilePage from './pages/SellerProfilePage';
import DashboardShopSettingsPage from './pages/DashboardShopSettingsPage';
import DashboardAdminWithdrawalsPage from './pages/DashboardAdminWithdrawalsPage';
import DashboardRealizationPage from './pages/admin/DashboardRealizationPage';
import DashboardPartnersPage from './pages/admin/DashboardPartnersPage';
import DashboardTestimonialsPage from './pages/admin/DashboardTestimonialsPage';
import DashboardActivitiesPage from './pages/admin/DashboardActivitiesPage';
import ChatListPage from './pages/chat/ChatListPage';
import ChatWindowPage from './pages/chat/ChatWindowPage';
import AdminAllProductsPage from './pages/admin/AdminAllProductsPage';
import AdminAllCoursesPage from './pages/admin/AdminAllCoursesPage';
import AdminConsultantSettingsPage from './pages/admin/AdminConsultantSettingsPage';
import AdminTransactionHistoryPage from './pages/admin/AdminTransactionHistoryPage';

import { ResponsiveLayout, MobileContainer } from './components/layout/ResponsiveLayout';
import ScrollToTop from './components/layout/ScrollToTop';
import NotificationService from './services/NotificationService';
import { getSessions } from './services/chatApi';

const NotificationHandler = () => {
  const location = useLocation();
  const lastSessionData = React.useRef({});
  const isFetching = React.useRef(false);
  const pathRef = React.useRef(location.pathname);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // Update pathRef whenever location changes, without re-triggering the interval effect
  React.useEffect(() => {
    pathRef.current = location.pathname;
  }, [location.pathname]);

  React.useEffect(() => {
    if (currentUser) {
      NotificationService.requestPermission();
    }
  }, [currentUser?.id]);

  React.useEffect(() => {
    if (!currentUser) return;

    const checkNewMessages = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const res = await getSessions();
        const sessions = res.data;
        const activeSessionId = pathRef.current.split('/chat/')[1];

        sessions.forEach(session => {
          const lastMsg = session.last_message;
          if (lastMsg && !lastMsg.is_read && lastMsg.sender !== currentUser.id) {
            const prevLastMsgId = lastSessionData.current[session.id];

            // Don't notify if we are currently in that chat window
            if (session.id.toString() !== activeSessionId && lastMsg.id !== prevLastMsgId) {
              const senderName = session.consultant_details?.username || `Chat ${session.category_name}`;
              NotificationService.showNotification(`Pesan Baru dari ${senderName}`, {
                body: lastMsg.content || 'Mengirim file...',
                url: `/chat/${session.id}`
              });
            }
          }
          // Update tracker
          if (session.last_message) {
            lastSessionData.current[session.id] = session.last_message.id;
          }
        });
      } catch (err) {
        console.error('Failed to poll for notifications:', err);
      } finally {
        isFetching.current = false;
      }
    };

    // Initial check on mount
    checkNewMessages();

    const interval = setInterval(checkNewMessages, 30000); // Check every 30s instead of 10s
    return () => clearInterval(interval);
  }, [currentUser?.id]); // Only re-run if user changes, not on every navigation

  return null;
};
const App = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <Router>
      <ScrollToTop />
      <NotificationHandler />
      <div className="min-h-screen bg-gray-100 flex justify-center">
        <Routes>
          <Route path="/*" element={<LayoutWrapper isDesktop={isDesktop} />} />
        </Routes>
      </div>
    </Router>
  );
};

const LayoutWrapper = ({ isDesktop }) => {
  return (
    <div className="w-full">
      <Routes>
        <Route path="/" element={isDesktop ? <DesktopLandingPage /> : <MobileContainer><Home /></MobileContainer>} />

        {/* Account Routes */}
        <Route path="/login" element={<MobileContainer><LoginPage /></MobileContainer>} />
        <Route path="/register" element={<MobileContainer><RegisterPage /></MobileContainer>} />
        <Route path="/lupa-password" element={<MobileContainer><ForgotPasswordPage /></MobileContainer>} />
        <Route path="/reset-password" element={<MobileContainer><ResetPasswordPage /></MobileContainer>} />

        {/* Logged Account Routes */}
        <Route path="/profile" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><ProfilePage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/profile/edit" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><ProfileEditPage /></ResponsiveLayout></PrivateRoute>} />

        {/* Crowdfunding Routes */}
        <Route path="/charity" element={<ResponsiveLayout isDesktop={isDesktop}><CrowdfundingMainPage /></ResponsiveLayout>} />
        <Route path="/kampanye/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><CrowdfundingCampaignDetail /></ResponsiveLayout>} />
        <Route path="/bayar-donasi/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><CrowdfundingDonationPage /></ResponsiveLayout>} />
        <Route path="/riwayat-donasi" element={<ResponsiveLayout isDesktop={isDesktop}><CrowdfundingDonationHistoryPage /></ResponsiveLayout>} />
        <Route path="/konfirmasi-pembayaran-donasi" element={<ResponsiveLayout isDesktop={isDesktop}><CrowdfundingPaymentConfirmation /></ResponsiveLayout>} />

        {/* Ecommerce Routes */}
        <Route path="/sinergy" element={<ResponsiveLayout isDesktop={isDesktop}><EcommerceMainPage /></ResponsiveLayout>} />
        <Route path="/produk/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><EcommerceProductDetail /></ResponsiveLayout>} />
        <Route path="/incaran" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcommerceWishlistPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/keranjang" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcommerceCartPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/riwayat-belanja" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcommerceOrderHistoryPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/bayar-belanja" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcommerceCheckoutPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/konfirmasi-pembayaran-belanja" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcommercePaymentConfirmation /></ResponsiveLayout></PrivateRoute>} />

        {/* Article Routes */}
        <Route path="/articles" element={<ResponsiveLayout isDesktop={isDesktop}><ArticleListPage /></ResponsiveLayout>} />
        <Route path="/articles/create" element={<ResponsiveLayout isDesktop={isDesktop}><ArticleCreatePage /></ResponsiveLayout>} />
        <Route path="/articles/:id" element={<ResponsiveLayout isDesktop={isDesktop}><ArticleDetailPage /></ResponsiveLayout>} />
        <Route path="/articles/:id/upload-images" element={<ResponsiveLayout isDesktop={isDesktop}><ArticleUploadImagesPage /></ResponsiveLayout>} />
        <Route path="/academy/articles" element={<ResponsiveLayout isDesktop={isDesktop}><ArticleListPage /></ResponsiveLayout>} />
        <Route path="/academy/articles/:id" element={<ResponsiveLayout isDesktop={isDesktop}><ArticleDetailPage /></ResponsiveLayout>} />

        {/* Ecourse Routes */}
        <Route path="/academy" element={<ResponsiveLayout isDesktop={isDesktop}><AcademyMain /></ResponsiveLayout>} />
        <Route path="/academy/ecourse" element={<ResponsiveLayout isDesktop={isDesktop}><EcourseMainPage /></ResponsiveLayout>} />
        <Route path="/kelas/:slug" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcourseCourseDetail /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/kelas/buka/:slug" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcourseViewerPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/ikut-kelas/:slug" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcourseJoinCoursePage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/konfirmasi-pembayaran-kelas/:slug" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcoursePaymentConfirmation /></ResponsiveLayout></PrivateRoute>} />

        {/* Payment Routes */}
        <Route path="/pembayaran-berhasil" element={<ResponsiveLayout isDesktop={isDesktop}><PaymentSuccessPage /></ResponsiveLayout>} />
        <Route path="/pembayaran-gagal" element={<ResponsiveLayout isDesktop={isDesktop}><PaymentFailedPage /></ResponsiveLayout>} />
        <Route path="/pembayaran-tertunda" element={<ResponsiveLayout isDesktop={isDesktop}><PaymentPendingPage /></ResponsiveLayout>} />

        {/* Information Routes */}
        <Route path="/about" element={<ResponsiveLayout isDesktop={isDesktop}><AboutUs /></ResponsiveLayout>} />
        <Route path="/hubungi-kami" element={<ResponsiveLayout isDesktop={isDesktop}><ContactUs /></ResponsiveLayout>} />

        {/* Activity Routes */}
        <Route path="/kegiatan" element={<ResponsiveLayout isDesktop={isDesktop}><ActivityListPage /></ResponsiveLayout>} />
        <Route path="/kegiatan/:id" element={<ResponsiveLayout isDesktop={isDesktop}><ActivityDetailPage /></ResponsiveLayout>} />

        {/* Chat Routes */}
        <Route path="/chat" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><ChatListPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/chat/:sessionId" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop} hideFooter={true}><ChatWindowPage /></ResponsiveLayout></PrivateRoute>} />

        {/* Digital Product Routes (Public) */}
        <Route path="/digital-products" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductListPage /></ResponsiveLayout>} />
        <Route path="/digital-products/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductDetailPage /></ResponsiveLayout>} />
        <Route path="/digital-products/:slug/checkout" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductCheckoutPage /></ResponsiveLayout>} />
        <Route path="/digital-products/payment/:orderNumber" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductPaymentPage /></ResponsiveLayout>} />

        {/* New Lynk.id style routes */}
        <Route path="/digital-produk/:username" element={<ResponsiveLayout isDesktop={isDesktop}><SellerProfilePage /></ResponsiveLayout>} />
        <Route path="/digital-produk/:username/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductDetailPage /></ResponsiveLayout>} />

        {/* Alias routes to support legacy underscore format and prevent blank page */}
        <Route path="/digital_produk/:username" element={<ResponsiveLayout isDesktop={isDesktop}><SellerProfilePage /></ResponsiveLayout>} />
        <Route path="/digital_produk/:username/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductDetailPage /></ResponsiveLayout>} />

        {/* Catch-all username route for store profile (e.g. /myusername) */}
        <Route path="/:username" element={<ResponsiveLayout isDesktop={isDesktop}><SellerProfilePage /></ResponsiveLayout>} />


        {/* Dashboard Routes (Private) */}
        <Route path="/dashboard" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/shop-settings" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardShopSettingsPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/withdrawals" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardAdminWithdrawalsPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/charity" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardRealizationPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/partners" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardPartnersPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/testimonials" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardTestimonialsPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/activities" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardActivitiesPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/users" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardUserPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/all-products" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><AdminAllProductsPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/all-courses" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><AdminAllCoursesPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/consultants" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><AdminConsultantSettingsPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/admin/transactions" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><AdminTransactionHistoryPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/digital-products" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardDigitalProductsPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/ecourses" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardEcourseListPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/ecourses/new" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardEcourseFormPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/ecourses/:id/edit" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardEcourseFormPage /></ResponsiveLayout></PrivateRoute>} />
        <Route path="/dashboard/ecourses/:id/materials" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardEcourseMaterialsPage /></ResponsiveLayout></PrivateRoute>} />
      </Routes>
    </div>
  );
};

export default App;
