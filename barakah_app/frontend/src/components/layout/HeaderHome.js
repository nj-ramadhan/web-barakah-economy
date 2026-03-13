// components/layout/HeaderHome.js
import React, { useState } from 'react';
import '../../styles/Header.css'; // Import the CSS file

const HeaderHome = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query); // Pass the search query to the parent component
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-100 lg:static lg:shadow-none lg:bg-transparent" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="px-4 py-3 lg:max-w-6xl lg:mx-auto lg:px-6">
        <div className="flex justify-between items-center lg:justify-end">
          <div className="flex items-center lg:hidden">
            <img src="/images/logo.png" alt="BAE Community" className="h-8" />
            <span className="ml-2 font-semibold text-green-700">BARAKAH APP</span>
          </div>
          <div className="flex-1 max-w-[200px] mx-4 lg:mr-0 lg:ml-auto lg:max-w-[300px]">
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <a
              href={localStorage.getItem('user') ? "/profile" : "/login"}
              className="w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-50 rounded-full"
            >
              <span className="material-icons text-xl">{localStorage.getItem('user') ? 'account_circle' : 'login'}</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderHome;