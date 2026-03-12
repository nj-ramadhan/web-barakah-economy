import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const FloatingChatBubble = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem('user'));
    }, [location]);

    // Don't show bubble on chat pages themselves
    const isChatPage = location.pathname.startsWith('/chat');

    if (!isLoggedIn || isChatPage) return null;

    return (
        <Link
            to="/chat"
            className="fixed bottom-24 right-6 w-14 h-14 bg-green-700 text-white rounded-full shadow-2xl flex items-center justify-center z-[1000] transition transform hover:scale-110 active:scale-95 group animate-bounce-subtle"
            style={{
                boxShadow: '0 8px 32px rgba(21, 128, 61, 0.4)',
                animationDuration: '3s'
            }}
        >
            <span className="material-icons text-2xl group-hover:rotate-12 transition-transform">chat</span>

            {/* Tooltip or Label - hidden on mobile, visible on hover desktop */}
            <span className="absolute right-full mr-4 bg-gray-800 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden md:block uppercase tracking-widest font-bold">
                Tanya Consultant
            </span>

            {/* Notification Badge (Simulated for now) */}
            {/* <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></div> */}
        </Link>
    );
};

export default FloatingChatBubble;
