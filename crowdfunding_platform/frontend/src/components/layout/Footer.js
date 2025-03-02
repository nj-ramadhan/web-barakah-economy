// components/layout/Footer.js
import React from 'react';
import '../../styles/Footer.css';

const Footer = () => {
  return (
    <Footer className="footer">
      <div className="container">
        <div className="flex items-center">
          <img src="/images/logo.png" alt="YPMN" className="logo" />
          <span className="title">YPMN PEDULI</span>
        </div>
      </div>
    </Footer>
  );
};

export default Footer;