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
    <header className="bg-white shadow-sm sticky top-0 z-100">
      <div className="px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <img src="/images/logo.png" alt="BAE Community" className="h-8" />
            <span className="ml-2 font-semibold text-green-700">BARAKAH APP</span>
          </div>
          <div className="flex-1 max-w-[200px] ml-4">
            <input
              type="text"
              placeholder="Cari Program"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border rounded-full text-sm"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderHome;