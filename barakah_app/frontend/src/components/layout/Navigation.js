import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/Navigation.css';

const LAYANAN_ITEMS = [
  { to: '/', icon: 'home', label: 'Home', color: 'text-green-600' },
  { to: '/chat', icon: 'chat', label: 'Konsultasi', color: 'text-green-600' },
  { to: '/charity', icon: 'volunteer_activism', label: 'Charity', color: 'text-red-500' },
  { to: '/kegiatan', icon: 'event_note', label: 'Kegiatan', color: 'text-green-700' },
  // { to: '/sinergy', icon: 'shopping_bag', label: 'Sinergy', color: 'text-blue-600' }, // Hidden per request
  { to: '/academy/ecourse', icon: 'school', label: 'E-Course', color: 'text-purple-600' },
  { to: '/articles', icon: 'article', label: 'Article', color: 'text-orange-500' },
  { to: '/digital-products', icon: 'storefront', label: 'Produk Digital', color: 'text-emerald-600' },
  { to: '/forum', icon: 'forum', label: 'Forum', color: 'text-blue-500' },
  { to: '/about', icon: 'info', label: 'About', color: 'text-teal-600' },
  { to: '/profile', icon: 'person', label: 'Profile', color: 'text-gray-600' },
];

const NavigationButton = () => {
  const location = useLocation();
  const [isLayananOpen, setIsLayananOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const layananRef = useRef(null);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('user'));
  }, [location]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (layananRef.current && !layananRef.current.contains(event.target)) {
        setIsLayananOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [layananRef]);

  const isActive = (path) => {
    return location.pathname.includes(path) || (path === '/login' && location.pathname === '/login');
  };

  const [isNavVisible, setIsNavVisible] = useState(true);

  return (
    <>
      {/* Floating Open Button when Nav is Hidden */}
      {!isNavVisible && (
        <button
          onClick={() => setIsNavVisible(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-green-700 text-white rounded-full shadow-xl z-[1001] flex items-center justify-center gap-2 animate-bounce-subtle"
        >
          <span className="material-icons text-sm">keyboard_arrow_up</span>
          <span className="text-sm font-medium">Buka Menu</span>
        </button>
      )}

      {isNavVisible && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-w-md mx-auto z-50 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-transform duration-300" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="grid grid-cols-12 items-center px-4 py-2 relative">

            {/* Close Toggle Button */}
            <button
              onClick={() => setIsNavVisible(false)}
              className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm z-[51]"
            >
              <span className="material-icons text-gray-400 text-sm">keyboard_arrow_down</span>
            </button>

            {/* LAYANAN (Kiri - 3 cols) */}
            <div className="col-span-3 flex flex-col items-center justify-center relative" ref={layananRef}>
              {isLayananOpen && (
                <div className="absolute bottom-full mb-4 left-0 w-56 bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 p-3">
                  <div
                    className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {LAYANAN_ITEMS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex flex-col items-center justify-center py-3 px-1 rounded-xl hover:bg-gray-50 transition-colors"
                        onClick={() => setIsLayananOpen(false)}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-1`}>
                          <span className={`material-icons text-xl ${item.color}`}>{item.icon}</span>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                  {/* Arrow */}
                  <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white rotate-45 border-b border-r border-gray-100"></div>
                </div>
              )}

              <button
                onClick={() => setIsLayananOpen(!isLayananOpen)}
                className={`flex flex-col items-center justify-center focus:outline-none transition-colors ${isLayananOpen ? 'text-green-600' : 'text-gray-500'
                  }`}
              >
                <span className="material-icons text-2xl">grid_view</span>
                <span className="text-[11px] font-medium mt-0.5">Layanan</span>
              </button>
            </div>

            {/* KONSULTASI (Tengah - 6 cols) */}
            <div className="col-span-6 flex justify-center">
              <Link
                to="/chat"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-green-500 to-green-700 rounded-2xl shadow-lg shadow-green-200 text-white hover:scale-105 active:scale-95 transition-all -mt-3"
              >
                <span className="material-icons text-xl">chat</span>
                <span className="text-sm font-bold">Konsultasi</span>
              </Link>
            </div>

            {/* PROFILE (Kanan - 3 cols) */}
            <Link
              to={isLoggedIn ? "/profile" : "/login"}
              className={`col-span-3 flex flex-col items-center justify-center transition-colors ${isActive('/profile') || isActive('/login') ? 'text-green-600' : 'text-gray-500'}`}
            >
              <span className="material-icons text-2xl">
                {isLoggedIn ? 'account_circle' : 'login'}
              </span>
              <span className="text-[11px] font-medium mt-0.5">
                {isLoggedIn ? 'Profile' : 'Log in'}
              </span>
            </Link>

          </div>
        </nav>
      )}
    </>
  );
};

export default NavigationButton;