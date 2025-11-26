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

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen relative">
          <Routes>
            {/* Account Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/lupa-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Logged Account Routes */}
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/profile/edit" element={<PrivateRoute><ProfileEditPage /></PrivateRoute>} />

            {/* Crowdfunding Routes */}
            <Route path="/charity" element={<CrowdfundingMainPage />} />
            <Route path="/kampanye/:slug" element={<CrowdfundingCampaignDetail />} />
            <Route path="/bayar-donasi/:slug" element={<CrowdfundingDonationPage />} />
            <Route path="/riwayat-donasi" element={<CrowdfundingDonationHistoryPage />} />
            <Route path="/konfirmasi-pembayaran-donasi" element={<CrowdfundingPaymentConfirmation />} />

            {/* Ecommerce Routes */}
            <Route path="/sinergy" element={<EcommerceMainPage />} />
            <Route path="/produk/:slug" element={<EcommerceProductDetail />} />
            <Route path="/incaran" element={<PrivateRoute><EcommerceWishlistPage /></PrivateRoute>} />
            <Route path="/keranjang" element={<PrivateRoute><EcommerceCartPage /></PrivateRoute>} />
            <Route path="/riwayat-belanja" element={<PrivateRoute><EcommerceOrderHistoryPage /></PrivateRoute>} />
            <Route path="/bayar-belanja" element={<PrivateRoute><EcommerceCheckoutPage /></PrivateRoute>} />
            <Route path="/konfirmasi-pembayaran-belanja" element={<PrivateRoute><EcommercePaymentConfirmation /></PrivateRoute>} />
            
            {/* Article Routes */}
            <Route path="/articles" element={<ArticleListPage />} />
            <Route path="/articles/create" element={<ArticleCreatePage />} />
            <Route path="/articles/:id" element={<ArticleDetailPage />} />
            <Route path="/articles/:id/upload-images" element={<ArticleUploadImagesPage />} />
            <Route path="/academy/articles" element={<ArticleListPage />} />
            <Route path="/academy/articles/:id" element={<ArticleDetailPage />} />  

            {/* Ecourse Routes */}
            <Route path="/academy" element={<AcademyMain />} />
            <Route path="/academy/ecourse" element={<EcourseMainPage />} />
            <Route path="/kelas/:slug" element={<PrivateRoute><EcourseCourseDetail /></PrivateRoute>} />
            <Route path="/ikut-kelas/:slug" element={<PrivateRoute><EcourseJoinCoursePage /></PrivateRoute>} />
            <Route path="/konfirmasi-pembayaran-kelas/:slug" element={<PrivateRoute><EcoursePaymentConfirmation /></PrivateRoute>} />

            {/* Payment Routes */}
            <Route path="/pembayaran-berhasil" element={<PaymentSuccessPage />} />
            <Route path="/pembayaran-gagal" element={<PaymentFailedPage />} />
            <Route path="/pembayaran-tertunda" element={<PaymentPendingPage />} />

            {/* Information Routes */}
            <Route path="/about" element={<AboutUs />} />
            <Route path="/hubungi-kami" element={<ContactUs />} />

          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;