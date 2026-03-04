// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailedPage from './pages/PaymentFailedPage';
import PaymentPendingPage from './pages/PaymentPendingPage';

import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import AcademyMain from './pages/AcademyMain';

import DigitalProductListPage from './pages/DigitalProductListPage';
import DigitalProductDetailPage from './pages/DigitalProductDetailPage';
import DigitalProductCheckoutPage from './pages/DigitalProductCheckoutPage';
import DigitalProductPaymentPage from './pages/DigitalProductPaymentPage';

import DashboardPage from './pages/DashboardPage';
import DashboardDigitalProductsPage from './pages/DashboardDigitalProductsPage';

const App = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <Router>
      <div className="min-h-screen bg-gray-200 flex justify-center">
        {/* We dynamically apply classes based on route or isDesktop. Let's make the wrapper full width if we are rendering DesktopLandingPage, else max-w-md */}
        {/* We can achieve this by creating a wrapper inside the Router or handling it at the Route level. Let's make an inner component instead, or just conditional classes. */}
        <Routes>
          <Route path="/*" element={<LayoutWrapper isDesktop={isDesktop} />} />
        </Routes>
      </div>
    </Router>
  );
};

const LayoutWrapper = ({ isDesktop }) => {
  return (
    <Routes>
      <Route path="/" element={isDesktop ? <DesktopLandingPage /> : <MobileContainer><Home /></MobileContainer>} />

      {/* Account Routes */}
      <Route path="/login" element={<MobileContainer><LoginPage /></MobileContainer>} />
      <Route path="/register" element={<MobileContainer><RegisterPage /></MobileContainer>} />
      <Route path="/lupa-password" element={<MobileContainer><ForgotPasswordPage /></MobileContainer>} />
      <Route path="/reset-password" element={<MobileContainer><ResetPasswordPage /></MobileContainer>} />

      {/* Logged Account Routes */}
      <Route path="/profile" element={<PrivateRoute><MobileContainer><ProfilePage /></MobileContainer></PrivateRoute>} />
      <Route path="/profile/edit" element={<PrivateRoute><MobileContainer><ProfileEditPage /></MobileContainer></PrivateRoute>} />

      {/* Crowdfunding Routes */}
      <Route path="/charity" element={<MobileContainer><CrowdfundingMainPage /></MobileContainer>} />
      <Route path="/kampanye/:slug" element={<MobileContainer><CrowdfundingCampaignDetail /></MobileContainer>} />
      <Route path="/bayar-donasi/:slug" element={<MobileContainer><CrowdfundingDonationPage /></MobileContainer>} />
      <Route path="/riwayat-donasi" element={<MobileContainer><CrowdfundingDonationHistoryPage /></MobileContainer>} />
      <Route path="/konfirmasi-pembayaran-donasi" element={<MobileContainer><CrowdfundingPaymentConfirmation /></MobileContainer>} />

      {/* Ecommerce Routes */}
      <Route path="/sinergy" element={<MobileContainer><EcommerceMainPage /></MobileContainer>} />
      <Route path="/produk/:slug" element={<MobileContainer><EcommerceProductDetail /></MobileContainer>} />
      <Route path="/incaran" element={<PrivateRoute><MobileContainer><EcommerceWishlistPage /></MobileContainer></PrivateRoute>} />
      <Route path="/keranjang" element={<PrivateRoute><MobileContainer><EcommerceCartPage /></MobileContainer></PrivateRoute>} />
      <Route path="/riwayat-belanja" element={<PrivateRoute><MobileContainer><EcommerceOrderHistoryPage /></MobileContainer></PrivateRoute>} />
      <Route path="/bayar-belanja" element={<PrivateRoute><MobileContainer><EcommerceCheckoutPage /></MobileContainer></PrivateRoute>} />
      <Route path="/konfirmasi-pembayaran-belanja" element={<PrivateRoute><MobileContainer><EcommercePaymentConfirmation /></MobileContainer></PrivateRoute>} />

      {/* Article Routes */}
      <Route path="/articles" element={<MobileContainer><ArticleListPage /></MobileContainer>} />
      <Route path="/articles/create" element={<MobileContainer><ArticleCreatePage /></MobileContainer>} />
      <Route path="/articles/:id" element={<MobileContainer><ArticleDetailPage /></MobileContainer>} />
      <Route path="/articles/:id/upload-images" element={<MobileContainer><ArticleUploadImagesPage /></MobileContainer>} />
      <Route path="/academy/articles" element={<MobileContainer><ArticleListPage /></MobileContainer>} />
      <Route path="/academy/articles/:id" element={<MobileContainer><ArticleDetailPage /></MobileContainer>} />

      {/* Ecourse Routes */}
      <Route path="/academy" element={<MobileContainer><AcademyMain /></MobileContainer>} />
      <Route path="/academy/ecourse" element={<MobileContainer><EcourseMainPage /></MobileContainer>} />
      <Route path="/kelas/:slug" element={<PrivateRoute><MobileContainer><EcourseCourseDetail /></MobileContainer></PrivateRoute>} />
      <Route path="/ikut-kelas/:slug" element={<PrivateRoute><MobileContainer><EcourseJoinCoursePage /></MobileContainer></PrivateRoute>} />
      <Route path="/konfirmasi-pembayaran-kelas/:slug" element={<PrivateRoute><MobileContainer><EcoursePaymentConfirmation /></MobileContainer></PrivateRoute>} />

      {/* Payment Routes */}
      <Route path="/pembayaran-berhasil" element={<MobileContainer><PaymentSuccessPage /></MobileContainer>} />
      <Route path="/pembayaran-gagal" element={<MobileContainer><PaymentFailedPage /></MobileContainer>} />
      <Route path="/pembayaran-tertunda" element={<MobileContainer><PaymentPendingPage /></MobileContainer>} />

      {/* Information Routes */}
      <Route path="/about" element={<MobileContainer><AboutUs /></MobileContainer>} />
      <Route path="/hubungi-kami" element={<MobileContainer><ContactUs /></MobileContainer>} />

      {/* Digital Product Routes (Public) */}
      <Route path="/digital-products" element={<MobileContainer><DigitalProductListPage /></MobileContainer>} />
      <Route path="/digital-products/:slug" element={<MobileContainer><DigitalProductDetailPage /></MobileContainer>} />
      <Route path="/digital-products/:slug/checkout" element={<MobileContainer><DigitalProductCheckoutPage /></MobileContainer>} />
      <Route path="/digital-products/payment/:orderNumber" element={<MobileContainer><DigitalProductPaymentPage /></MobileContainer>} />

      {/* Dashboard Routes (Private) */}
      <Route path="/dashboard" element={<PrivateRoute><MobileContainer><DashboardPage /></MobileContainer></PrivateRoute>} />
      <Route path="/dashboard/digital-products" element={<PrivateRoute><MobileContainer><DashboardDigitalProductsPage /></MobileContainer></PrivateRoute>} />
    </Routes>
  );
};

const MobileContainer = ({ children }) => (
  <div className="w-full max-w-md bg-white min-h-screen relative shadow-lg">
    {children}
  </div>
);
export default App;