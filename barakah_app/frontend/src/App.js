// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Navigation from './components/layout/Navigation';
// import Footer from './components/layout/Footer';
import Home from './pages/Home';
import EcommercePage from './pages/EcommercePage';
import CampaignPage from './pages/CampaignPage';
import EcoursePage from './pages/EcoursePage';
import DonationPage from './pages/DonationPage';
import CampaignDetail from './pages/CampaignDetail';
import PaymentConfirmation from './pages/PaymentConfirmation';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
// import CampaignSlider from './components/campaigns/CampaignSlider';
// import CampaignGrid from './components/campaigns/CampaignGrid';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-200 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jual-beli" element={<EcommercePage />} />
            <Route path="/donasi" element={<CampaignPage />} />
            <Route path="/edukasi" element={<EcoursePage />} />
            <Route path="/donasi/:slug" element={<DonationPage />} />
            <Route path="/kampanye/:slug" element={<CampaignDetail />} />
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