// components/layout/Footer.js
import React from 'react';
import '../../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="flex items-center">
          <img src="/images/logo.png" alt="YPMN" className="logo" />
          <span className="title">BARAKAH ECONOMY</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;