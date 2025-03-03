// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';

// import Navigation from './components/layout/Navigation';
// import Footer from './components/layout/Footer';
import Home from './pages/Home';
import CampaignPage from './pages/CampaignPage';
import CampaignDetail from './pages/CampaignDetail';
import DonationPage from './pages/DonationPage';

import EcommercePage from './pages/EcommercePage';
import ProductDetail from './pages/ProductDetail';
import CheckoutPage from './pages/CheckoutPage';

import EcoursePage from './pages/EcoursePage';
import CourseDetail from './pages/CourseDetail';
import JoinCoursePage from './pages/JoinCoursePage';

import PaymentConfirmation from './pages/PaymentConfirmation';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/donasi" element={<CampaignPage />} />
            <Route path="/kampanye/:slug" element={<CampaignDetail />} />
            <Route path="/berdonasi/:slug" element={<DonationPage />} />

            <Route path="/jual-beli" element={<EcommercePage />} />
            <Route path="/produk/:slug" element={<ProductDetail />} />
            <Route path="/beli/:slug" element={<CheckoutPage />} />

            <Route path="/edukasi" element={<EcoursePage />} />
            <Route path="/kelas/:slug" element={<CourseDetail />} />
            <Route path="/ikutkelas/:slug" element={<JoinCoursePage />} />

            {/* <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} /> */}
            <Route path="/konfirmasi-pembayaran" element={<PaymentConfirmation />} />

            <Route path="/tentang-kami" element={<AboutUs />} />
            <Route path="/hubungi-kami" element={<ContactUs />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
