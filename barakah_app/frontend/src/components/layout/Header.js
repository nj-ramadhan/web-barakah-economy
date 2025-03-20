// components/layout/Header.js
import React from 'react';
import '../../styles/Header.css';

const Header = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-100">
      <div className="container">
        <div className="flex items-center">
          <img src="/images/logo.png" alt="BAE Community" className="logo" />
          <span className="title">BARAKAH APP</span>
        </div>
      </div>
    </header>
  );
};

export default Header;