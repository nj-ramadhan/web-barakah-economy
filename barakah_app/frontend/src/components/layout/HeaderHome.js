import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Header.css'; // Import the CSS file
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const HeaderHome = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

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
          <div className="flex-1 max-w-[200px] mx-4 lg:mr-0 lg:ml-auto lg:max-w-[300px]">
            <input
              type="text"
              placeholder={t('header.search')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 lg:hidden">
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
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderHome;