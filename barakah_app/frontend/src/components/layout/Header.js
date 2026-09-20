import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../../styles/Header.css';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import CartToastNotification from '../common/CartToastNotification';

const Header = () => {
  const { i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  const fetchCartCount = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { setCartCount(0); return; }
    try {
      const user = JSON.parse(userStr);
      if (!user.access) return;
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
        headers: { Authorization: `Bearer ${user.access}` }
      });
      const totalItems = (res.data || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(totalItems);
    } catch (err) {
      // quiet fallback
    }
  };

  useEffect(() => {
    fetchCartCount();

    const handleCartUpdate = () => {
      fetchCartCount();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'id' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="bg-white dark:bg-gray-950 shadow-sm dark:shadow-gray-900 border-b border-transparent dark:border-gray-800 fixed top-0 left-0 w-full z-[900] lg:hidden transition-colors duration-300" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <CartToastNotification />
      <div className="container px-4 py-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-xl group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition shadow-sm">
            <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain" />
          </div>
          <span className="text-xl font-black text-green-800 dark:text-green-400 tracking-tighter">Barakah App</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Cart Icon */}
          <Link
            to="/keranjang"
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-100 dark:border-emerald-800 transition-all duration-200"
            title="Keranjang Belanja"
          >
            <span className="material-icons text-xl">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {/* Dark/Light Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            <span className="material-icons text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
          </button>
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="w-10 h-10 flex items-center justify-center text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/30 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition border border-green-100 dark:border-green-800"
            title="Switch Language"
          >
            {i18n.language === 'en' ? 'EN' : 'ID'}
          </button>
          {/* Profile */}
          <Link
            to={localStorage.getItem('user') ? "/profile" : `/login?next=${encodeURIComponent(location.pathname + location.search)}`}
            className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {(() => {
              const userStr = localStorage.getItem('user');
              if (userStr) {
                try {
                  const user = JSON.parse(userStr);
                  if (user.picture) {
                    return <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />;
                  } else {
                    const name = user.name_full || user.username || '?';
                    const initial = name.charAt(0).toUpperCase();
                    return (
                      <div className="w-full h-full bg-green-600 text-white flex items-center justify-center font-bold text-sm animate-fade-in">
                        {initial}
                      </div>
                    );
                  }
                } catch (e) {}
                return <span className="material-icons text-xl">account_circle</span>;
              }
              return <span className="material-icons text-xl">login</span>;
            })()}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;