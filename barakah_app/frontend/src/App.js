// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './utils/PrivateRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';

import Home from './pages/Home';
import CampaignPage from './pages/CrowdfundingMainPage';
import CampaignDetail from './pages/CrowdfundingCampaignDetail';
import DonationPage from './pages/CrowdfundingDonationPage';
import CrowdfundingPaymentConfirmation from './pages/CrowdfundingPaymentConfirmation';

import EcommercePage from './pages/EcommerceMainPage';
import WishlistPage from './pages/EcommerceWishlistPage';
import CartPage from './pages/EcommerceCartPage';
import OrderHistoryPage from './pages/EcommerceOrderHistoryPage';
import ProductDetail from './pages/EcommerceProductDetail';
import CheckoutPage from './pages/EcommerceCheckoutPage';
import EcommercePaymentConfirmation from './pages/EcommercePaymentConfirmation';

import EcoursePage from './pages/EcoursePage';
import CourseDetail from './pages/CourseDetail';
import JoinCoursePage from './pages/JoinCoursePage';


import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailedPage from './pages/PaymentFailedPage';
import PaymentPendingPage from './pages/PaymentPendingPage';

import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen relative">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/donasi" element={<CampaignPage />} />
            <Route path="/kampanye/:slug" element={<CampaignDetail />} />
            <Route path="/berdonasi/:slug" element={<DonationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/konfirmasi-pembayaran-donasi" element={<CrowdfundingPaymentConfirmation />} />
            <Route path="/pembayaran-berhasil" element={<PaymentSuccessPage />} />
            <Route path="/pembayaran-gagal" element={<PaymentFailedPage />} />
            <Route path="/pembayaran-tertunda" element={<PaymentPendingPage />} />
            <Route path="/tentang-kami" element={<AboutUs />} />
            <Route path="/hubungi-kami" element={<ContactUs />} />

            {/* Private Routes */}
            <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
            <Route path="/profile/edit" element={<PrivateRoute><ProfileEditPage /></PrivateRoute>} />
            <Route path="/jual-beli" element={<PrivateRoute><EcommercePage /></PrivateRoute>} />
            <Route path="/produk/:slug" element={<PrivateRoute><ProductDetail /></PrivateRoute>} />
            <Route path="/incaran" element={<PrivateRoute><WishlistPage /></PrivateRoute>} />
            <Route path="/keranjang" element={<PrivateRoute><CartPage /></PrivateRoute>} />
            <Route path="/bayar-belanja" element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
            <Route path="/konfirmasi-pembayaran-belanja" element={<EcommercePaymentConfirmation />} />
            <Route path="/riwayat-belanja" element={<PrivateRoute><OrderHistoryPage /></PrivateRoute>} />
            <Route path="/edukasi" element={<PrivateRoute><EcoursePage /></PrivateRoute>} />
            <Route path="/kelas/:slug" element={<PrivateRoute><CourseDetail /></PrivateRoute>} />
            <Route path="/ikutkelas/:slug" element={<PrivateRoute><JoinCoursePage /></PrivateRoute>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;