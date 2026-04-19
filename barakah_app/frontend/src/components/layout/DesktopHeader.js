import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DesktopHeader = () => {
    const [user, setUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.access) {
            setUser(userData);
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
    };

    return (
        <header className="w-full bg-white/90 backdrop-blur-md shadow-sm py-4 px-8 flex justify-between items-center fixed top-0 z-[1000]">
            <Link to="/" className="flex items-center gap-2">
                <img src="/logo.png" alt="Barakah Economy" className="h-10" onError={(e) => { e.target.src = '/icon-512x512.png'; e.target.className = 'h-10 w-10 object-contain'; }} />
                <span className="text-xl font-bold text-green-800">Barakah Economy</span>
            </Link>
            <nav className="flex gap-6 items-center">
                <Link to="/" className="text-gray-600 hover:text-green-700 font-medium transition">Home</Link>
                <Link to="/about" className="text-gray-600 hover:text-green-700 font-medium transition">Tentang Kami</Link>
                <Link to="/chat" className="text-gray-600 hover:text-green-700 font-medium transition">Konsultasi</Link>
                <Link to="/charity" className="text-gray-600 hover:text-green-700 font-medium transition">Charity</Link>
                {/* <Link to="/sinergy" className="text-gray-600 hover:text-green-700 font-medium transition">Sinergy</Link> */}
                <Link to="/academy/ecourse" className="text-gray-600 hover:text-green-700 font-medium transition">E-Course</Link>
                <Link to="/articles" className="text-gray-600 hover:text-green-700 font-medium transition">Artikel</Link>
                <Link to="/kegiatan" className="text-gray-600 hover:text-green-700 font-medium transition">Kegiatan Kami</Link>
                <Link to="/events" className="text-gray-600 hover:text-green-700 font-medium transition">Event</Link>
                <Link to="/digital-products" className="text-gray-600 hover:text-green-700 font-medium transition">Produk Digital</Link>
                <Link to="/forum" className="text-gray-600 hover:text-green-700 font-medium transition">Forum</Link>
                {user ? (
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white font-semibold rounded-lg shadow hover:bg-green-800 transition"
                        >
                            {user.picture ? (
                                <img src={user.picture} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-green-500" />
                            ) : (
                                <span className="material-icons text-lg">person</span>
                            )}
                            {user.username || 'Profile'}
                            <span className="material-icons text-sm">{showProfileMenu ? 'expand_less' : 'expand_more'}</span>
                        </button>
                        {showProfileMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                                <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 text-sm">
                                    <span className="material-icons text-lg text-gray-400">person</span> Profile
                                </Link>
                                <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 text-sm">
                                    <span className="material-icons text-lg text-gray-400">dashboard</span> Dashboard
                                </Link>
                                <hr className="my-1" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm text-left"
                                >
                                    <span className="material-icons text-lg">logout</span> Keluar
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <Link to="/login" className="px-5 py-2 text-green-700 font-semibold hover:bg-green-50 rounded-lg transition">Masuk</Link>
                        <Link to="/register" className="px-5 py-2 bg-green-700 text-white font-semibold rounded-lg shadow hover:bg-green-800 transition">Daftar</Link>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default DesktopHeader;
