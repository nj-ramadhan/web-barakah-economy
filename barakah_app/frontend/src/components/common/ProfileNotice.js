import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const ProfileNotice = () => {
    const [user, setUser] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.access) {
            setUser(userData);
        } else {
            setUser(null);
        }
    }, [location.pathname]);

    if (!user || user.is_profile_complete !== false) return null;
    
    // Don't show notice if already on the edit profile page
    if (location.pathname === '/profile/edit') return null;

    return (
        <div className="bg-orange-500 text-white px-4 py-2 text-center text-xs sm:text-sm font-bold relative z-[2000] animate-pulse">
            <div className="flex items-center justify-center gap-2">
                <span className="material-icons text-sm sm:text-base">warning</span>
                <span>Data belum lengkap! Harap tambahkan Nama Lengkap dan No. Telp di Profil Anda.</span>
                <Link to="/profile/edit" className="bg-white text-orange-600 px-3 py-1 rounded-full text-[10px] sm:text-xs uppercase hover:bg-orange-50 transition">
                    Lengkapi Sekarang
                </Link>
            </div>
        </div>
    );
};

export default ProfileNotice;
