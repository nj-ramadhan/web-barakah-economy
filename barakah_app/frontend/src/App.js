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
import SellerProfilePage from './pages/SellerProfilePage';

import { ResponsiveLayout, MobileContainer } from './components/layout/ResponsiveLayout';

const App = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <Router>
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
      <Route path="/ikut-kelas/:slug" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcourseJoinCoursePage /></ResponsiveLayout></PrivateRoute>} />
      <Route path="/konfirmasi-pembayaran-kelas/:slug" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><EcoursePaymentConfirmation /></ResponsiveLayout></PrivateRoute>} />

      {/* Payment Routes */}
      <Route path="/pembayaran-berhasil" element={<ResponsiveLayout isDesktop={isDesktop}><PaymentSuccessPage /></ResponsiveLayout>} />
      <Route path="/pembayaran-gagal" element={<ResponsiveLayout isDesktop={isDesktop}><PaymentFailedPage /></ResponsiveLayout>} />
      <Route path="/pembayaran-tertunda" element={<ResponsiveLayout isDesktop={isDesktop}><PaymentPendingPage /></ResponsiveLayout>} />

      {/* Information Routes */}
      <Route path="/about" element={<ResponsiveLayout isDesktop={isDesktop}><AboutUs /></ResponsiveLayout>} />
      <Route path="/hubungi-kami" element={<ResponsiveLayout isDesktop={isDesktop}><ContactUs /></ResponsiveLayout>} />

      {/* Digital Product Routes (Public) */}
      <Route path="/digital-products" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductListPage /></ResponsiveLayout>} />
      <Route path="/digital-products/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductDetailPage /></ResponsiveLayout>} />
      <Route path="/digital-products/:slug/checkout" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductCheckoutPage /></ResponsiveLayout>} />
      <Route path="/digital-products/payment/:orderNumber" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductPaymentPage /></ResponsiveLayout>} />

      {/* New Lynk.id style routes */}
      <Route path="/digital_produk/:username" element={<ResponsiveLayout isDesktop={isDesktop}><SellerProfilePage /></ResponsiveLayout>} />
      <Route path="/digital_produk/:username/:slug" element={<ResponsiveLayout isDesktop={isDesktop}><DigitalProductDetailPage /></ResponsiveLayout>} />

      {/* Dashboard Routes (Private) */}
      <Route path="/dashboard" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardPage /></ResponsiveLayout></PrivateRoute>} />
      <Route path="/dashboard/digital-products" element={<PrivateRoute><ResponsiveLayout isDesktop={isDesktop}><DashboardDigitalProductsPage /></ResponsiveLayout></PrivateRoute>} />
    </Routes>
  );
};

export default App;
