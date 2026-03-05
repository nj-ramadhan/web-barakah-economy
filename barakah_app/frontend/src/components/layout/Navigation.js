import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/Navigation.css';

const LAYANAN_ITEMS = [
  { to: '/', icon: 'home', label: 'Home', color: 'text-green-600' },
  { to: '/charity', icon: 'volunteer_activism', label: 'Charity', color: 'text-red-500' },
  { to: '/sinergy', icon: 'shopping_bag', label: 'Sinergy', color: 'text-blue-600' },
  { to: '/academy/ecourse', icon: 'school', label: 'E-Course', color: 'text-purple-600' },
  { to: '/articles', icon: 'article', label: 'Article', color: 'text-orange-500' },
  { to: '/digital-products', icon: 'storefront', label: 'Produk Digital', color: 'text-emerald-600' },
  { to: '/about', icon: 'info', label: 'About', color: 'text-teal-600' },
  { to: '/profile', icon: 'person', label: 'Profile', color: 'text-gray-600' },
];

const NavigationButton = () => {
  const location = useLocation();
  const [isLayananOpen, setIsLayananOpen] = useState(false);
  const layananRef = useRef(null);

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-w-md mx-auto z-50 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="grid grid-cols-12 items-center px-4 py-2 relative">

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

        {/* DONASI (Tengah - 6 cols) */}
        <div className="col-span-6 flex justify-center">
          <Link
            to="/charity"
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-green-500 to-green-700 rounded-2xl shadow-lg shadow-green-200 text-white hover:scale-105 active:scale-95 transition-all -mt-3"
          >
            <span className="material-icons text-xl">volunteer_activism</span>
            <span className="text-sm font-bold">Donasi</span>
          </Link>
        </div>

        {/* PROFILE (Kanan - 3 cols) */}
        <Link
          to="/profile"
          className={`col-span-3 flex flex-col items-center justify-center transition-colors ${location.pathname.includes('/profile') || location.pathname === '/login' ? 'text-green-600' : 'text-gray-500'
            }`}
        >
          <span className="material-icons text-2xl">account_circle</span>
          <span className="text-[11px] font-medium mt-0.5">Profile</span>
        </Link>

      </div>
    </nav>
  );
};

export default NavigationButton;