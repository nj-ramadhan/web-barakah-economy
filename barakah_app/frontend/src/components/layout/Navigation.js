// components/Navigation.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/Navigation.css'; // Import the CSS file

const NavigationButton = () => {
  const location = useLocation(); // Get the current route

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t max-w-md mx-auto">
      <div className="flex justify-around py-3">
        <Link
          to="../"
          className={`flex flex-col items-center ${
            location.pathname === '/' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">home</span>
          <span className="text-xs">Home</span>
        </Link>
        <Link
          to="../charity"
          className={`flex flex-col items-center ${
            location.pathname === '/charity' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">volunteer_activism</span>
          <span className="text-xs">Charity</span>
        </Link>
        <Link
          to="../sinergy"
          className={`flex flex-col items-center ${
            location.pathname === '/sinergy' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">shopping_cart</span>
          <span className="text-xs">Sinergy</span>
        </Link>
        <Link
          to="../academy"
          className={`flex flex-col items-center ${
            location.pathname === '/academy' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">school</span>
          <span className="text-xs">Academy</span>
        </Link>        
        <Link
          to="../about"
          className={`flex flex-col items-center ${
            location.pathname === '/about' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">info</span>
          <span className="text-xs">About</span>
        </Link>
        <Link
          to="../login"
          className={`flex flex-col items-center ${
            location.pathname === '/login' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">person</span>
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default NavigationButton;