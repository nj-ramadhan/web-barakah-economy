// components/layout/Header.js
import React from 'react';
import '../../styles/Header.css';

const Header = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-[1001] lg:hidden">
      <div className="container px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/images/logo.png" alt="BAE Community" className="h-8 w-8 object-contain" />
          <span className="font-black text-green-800 tracking-tighter text-sm">BARAKAH APP</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={localStorage.getItem('access_token') ? "/profile" : "/login"}
            className="w-10 h-10 flex items-center justify-center text-gray-500 bg-gray-50 rounded-full"
          >
            <span className="material-icons text-xl">{localStorage.getItem('access_token') ? 'account_circle' : 'login'}</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;