import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/Navigation.css';

const NavigationButton = () => {
  const location = useLocation();
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);
  const academyRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (academyRef.current && !academyRef.current.contains(event.target)) {
        setIsAcademyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [academyRef]);

  // Class standar untuk semua item agar seragam ukurannya
  const navItemClass = "flex flex-col items-center justify-center w-full"; 

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t max-w-md mx-auto z-50">
      {/* Gunakan items-center agar vertikalnya pas di tengah */}
      <div className="flex justify-between items-center py-2 px-2">
        
        {/* HOME */}
        <Link
          to="/"
          className={`${navItemClass} ${
            location.pathname === '/' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">home</span>
          <span className="text-[10px] mt-1">Home</span>
        </Link>

        {/* CHARITY */}
        <Link
          to="/charity"
          className={`${navItemClass} ${
            location.pathname === '/charity' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">volunteer_activism</span>
          <span className="text-[10px] mt-1">Charity</span>
        </Link>

        {/* SINERGY */}
        <Link
          to="/sinergy"
          className={`${navItemClass} ${
            location.pathname === '/sinergy' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">shopping_cart</span>
          <span className="text-[10px] mt-1">Sinergy</span>
        </Link>

        {/* --- ACADEMY (WRAPPER) --- */}
        {/* Class wrapper ini harus sama strukturnya dengan navItemClass */}
        <div 
            className={`${navItemClass} relative`} 
            ref={academyRef}
        >
          
          {/* MENU DROPUP */}
          {isAcademyOpen && (
            <div className="absolute bottom-full mb-4 left-1/2 transform -translate-x-1/2 w-32 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.1)] rounded-lg border border-gray-100 flex flex-col overflow-hidden z-50">
              <Link 
                to="/academy/ecourse" 
                className="px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 text-center border-b"
                onClick={() => setIsAcademyOpen(false)}
              >
                E-Course
              </Link>
              <Link 
                to="/academy/articles" 
                className="px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 text-center"
                onClick={() => setIsAcademyOpen(false)}
              >
                Articles
              </Link>
              
              {/* Panah kecil di bawah menu (Opsional, biar cantik) */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-b border-r border-gray-100"></div>
            </div>
          )}

          {/* TOMBOL ACADEMY */}
          <button
            onClick={() => setIsAcademyOpen(!isAcademyOpen)}
            className={`flex flex-col items-center justify-center w-full focus:outline-none ${
              location.pathname.includes('/academy') ? 'text-green-600' : 'text-gray-600'
            }`}
          >
            <span className="material-icons">school</span>
            <span className="text-[10px] mt-1">Academy</span>
          </button>
        </div>
        {/* --- END ACADEMY --- */}

        {/* ABOUT */}
        <Link
          to="/about"
          className={`${navItemClass} ${
            location.pathname === '/about' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">info</span>
          <span className="text-[10px] mt-1">About</span>
        </Link>

        {/* PROFILE */}
        <Link
          to="/login"
          className={`${navItemClass} ${
            location.pathname === '/login' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <span className="material-icons">person</span>
          <span className="text-[10px] mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default NavigationButton;