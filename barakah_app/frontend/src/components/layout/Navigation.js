import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUnreadChatCount } from '../../services/chatApi';
import PWAInstallGuideModal from '../common/PWAInstallGuideModal';
import MobileNavDrawer from './MobileNavDrawer';
import '../../styles/Navigation.css';

const NavigationButton = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showPwaModal, setShowPwaModal] = useState(false);

  useEffect(() => {
    const logged = !!localStorage.getItem('user');
    setIsLoggedIn(logged);
    if (logged) {
      getUnreadChatCount().then(res => {
        setUnreadChatCount(res.data?.total_unread || 0);
      }).catch(() => {});
    }
  }, [location]);

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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-green-700 dark:bg-green-600 text-white rounded-full shadow-xl z-[1001] flex lg:hidden items-center justify-center gap-2 animate-bounce-subtle"
        >
          <span className="material-icons text-sm">keyboard_arrow_up</span>
          <span className="text-sm font-medium">Buka Menu</span>
        </button>
      )}

      {isNavVisible && (
        <nav
          className="mobile-bottom-nav fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 z-50 rounded-t-2xl shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_-1px_rgba(0,0,0,0.6)] transition-all duration-300 lg:hidden"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 6px), 6px)' }}
        >
          <div className="grid grid-cols-12 items-center px-4 pt-1.5 pb-1 relative w-full">

            {/* Close Toggle Button */}
            <button
              onClick={() => setIsNavVisible(false)}
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center shadow-xs z-[51]"
              title="Sembunyikan Menu"
            >
              <span className="material-icons text-gray-400 dark:text-gray-500 text-xs">keyboard_arrow_down</span>
            </button>

            {/* LAYANAN / MENU LENGKAP (Kiri - 3 cols) */}
            <div className="col-span-3 flex flex-col items-center justify-center relative">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex flex-col items-center justify-center focus:outline-none transition-colors relative text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
                title="Buka Semua Menu"
              >
                <div className="relative">
                  <span className="material-icons text-2xl">grid_view</span>
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md shadow-red-300">
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium mt-0.5">{t('nav.services', 'Menu')}</span>
              </button>
            </div>

            {/* DONASI (Tengah - 6 cols) */}
            <div className="col-span-6 flex justify-center">
              <Link
                to="/charity"
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-green-500 to-green-700 dark:from-green-600 dark:to-green-800 rounded-2xl shadow-md shadow-green-200/60 dark:shadow-green-900/40 text-white hover:scale-102 active:scale-95 transition-all -mt-2"
              >
                <span className="material-icons text-lg">volunteer_activism</span>
                <span className="text-xs font-bold">{t('nav.donation', 'Donasi')}</span>
              </Link>
            </div>

            {/* PROFILE (Kanan - 3 cols) */}
            <Link
              to={isLoggedIn ? "/profile" : `/login?next=${encodeURIComponent(location.pathname + location.search)}`}
              className={`col-span-3 flex flex-col items-center justify-center transition-colors ${isActive('/profile') || isActive('/login') ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {isLoggedIn ? (
                (() => {
                  const user = JSON.parse(localStorage.getItem('user') || '{}');
                  if (user.picture) {
                    return (
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                    );
                  } else {
                    const name = user.name_full || user.username || '?';
                    const initial = name.charAt(0).toUpperCase();
                    return (
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-green-600 text-white flex items-center justify-center font-bold text-[11px] animate-fade-in">
                        {initial}
                      </div>
                    );
                  }
                })()
              ) : (
                <span className="material-icons text-2xl">login</span>
              )}
              <span className="text-[11px] font-medium mt-0.5">
                {isLoggedIn ? t('nav.profile', 'Profile') : t('nav.login', 'Log in')}
              </span>
            </Link>

          </div>
        </nav>
      )}

      <PWAInstallGuideModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
      <MobileNavDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
};

export default NavigationButton;