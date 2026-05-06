import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
          <Link to="/" className="flex items-center gap-2 group lg:hidden">
            <div className="p-1.5 bg-green-50 rounded-xl group-hover:bg-green-100 transition">
              <img src="/logo.png" alt="Barakah Economy" className="h-6 w-6 object-contain" onError={(e) => { e.target.src = '/icon-512x512.png'; }} />
            </div>
            <span className="text-sm font-black text-green-800 tracking-tighter">BARAKAH ECONOMY</span>
          </Link>
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