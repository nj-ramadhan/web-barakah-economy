import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import siteContentService from '../../services/siteContent';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const GlobalPopupManager = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showDonationOffer, setShowDonationOffer] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    // 1. Check for donation offer (post-registration)
    const registeredFlag = sessionStorage.getItem('just_registered');
    if (registeredFlag && currentUser) {
      setShowDonationOffer(true);
      sessionStorage.removeItem('just_registered');
    }

    // 2. Check for announcements (on login/landing)
    const hasSeenAnnouncement = sessionStorage.getItem('announcement_seen');
    if (currentUser && !hasSeenAnnouncement && !showDonationOffer) {
      fetchAnnouncements();
    }
  }, [currentUser, location.pathname]);

  const fetchAnnouncements = async () => {
    try {
      const res = await siteContentService.getAnnouncements();
      if (res.data && res.data.length > 0) {
        setAnnouncements(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    }
  };

  const closeAnnouncements = () => {
    setAnnouncements([]);
    sessionStorage.setItem('announcement_seen', 'true');
  };

  const handleDonationClick = () => {
    setShowDonationOffer(false);
    navigate('/charity');
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'promotion': return 'bg-orange-100 text-orange-700';
      case 'update': return 'bg-blue-100 text-blue-700';
      case 'announcement': return 'bg-green-100 text-green-700';
      case 'info': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (showDonationOffer) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-up border border-white">
          <div className="relative h-48 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-8">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <span className="material-icons text-5xl text-white">volunteer_activism</span>
            </div>
          </div>
          <div className="p-8 text-center space-y-4">
            <h3 className="text-2xl font-black text-gray-900">Alhamdulillah!</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Selamat datang di Barakah Economy Community. Mari awali langkah Barakah Anda dengan berbagi kepada mereka yang membutuhkan.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={handleDonationClick}
                className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-800 transition shadow-lg shadow-green-100"
              >
                Donasi Sekarang
              </button>
              <button 
                onClick={() => setShowDonationOffer(false)}
                className="w-full py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition text-sm"
              >
                Mungkin Nanti
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (announcements.length > 0) {
    return (
      <div className="fixed inset-0 z-[998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up border border-white relative">
          <button 
            onClick={closeAnnouncements}
            className="absolute top-4 right-4 w-10 h-10 bg-black/10 hover:bg-black/20 text-gray-700 rounded-full flex items-center justify-center backdrop-blur-md transition z-[1001]"
          >
            <span className="material-icons">close</span>
          </button>
          
          <Swiper
            modules={[Pagination, Autoplay]}
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            className="w-full"
          >
            {announcements.map((ann) => (
              <SwiperSlide key={ann.id}>
                <div className="flex flex-col h-full">
                  {ann.image && (
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={ann.image} 
                        alt={ann.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md ${getTypeStyles(ann.type)}`}>
                          {ann.type_display}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className={`p-8 space-y-4 ${!ann.image ? 'pt-12' : ''}`}>
                    {!ann.image && (
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getTypeStyles(ann.type)}`}>
                        {ann.type_display}
                      </span>
                    )}
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">
                      {ann.title}
                    </h3>
                    {ann.content && (
                      <div className="text-gray-600 text-sm leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line pb-8">
                        {ann.content}
                      </div>
                    )}
                    {ann.target_url && (
                      <div className="pt-4 pb-4">
                        <a 
                          href={ann.target_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                        >
                          Lihat Selengkapnya
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    );
  }

  return null;
};

export default GlobalPopupManager;
