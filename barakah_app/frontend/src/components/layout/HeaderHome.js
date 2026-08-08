import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../../styles/Header.css'; // Import the CSS file
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const HeaderHome = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  const fetchCartCount = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { setCartCount(0); return; }
    try {
      const userObj = JSON.parse(userStr);
      if (!userObj.access) return;
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
        headers: { Authorization: `Bearer ${userObj.access}` }
      });
      const totalItems = (res.data || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(totalItems);
    } catch (err) {}
  };

  useEffect(() => {
    fetchCartCount();
    const handleCartUpdate = () => fetchCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query); // Pass the search query to the parent component
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'id' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="bg-white dark:bg-gray-950 shadow-sm dark:shadow-gray-900 border-b border-transparent dark:border-gray-800 fixed top-0 left-0 w-full z-[900] lg:static lg:shadow-none lg:bg-transparent transition-colors duration-300" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="px-4 py-3 lg:max-w-6xl lg:mx-auto lg:px-6">
        <div className="flex justify-between items-center lg:justify-end">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-xl group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition shadow-sm">
              <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-xl font-black text-green-800 dark:text-green-400 tracking-tighter">Barakah App</span>
          </Link>
          <div className="flex-1 max-w-[160px] sm:max-w-[200px] mx-2 lg:mr-0 lg:ml-auto lg:max-w-[300px]">
            <input
              type="text"
              placeholder={t('header.search')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-1.5 border dark:border-gray-700 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {/* Cart Icon */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openCartDrawer'))}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-100 transition-all duration-200 shrink-0"
              title="Keranjang Belanja"
            >
              <span className="material-icons text-lg sm:text-xl">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Dark/Light Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all duration-200 shrink-0"
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            >
              <span className="material-icons text-lg sm:text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-green-700 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/30 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition border border-green-100 dark:border-green-800 shrink-0 text-xs sm:text-sm"
              title="Switch Language"
            >
              {i18n.language === 'en' ? 'EN' : 'ID'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderHome;