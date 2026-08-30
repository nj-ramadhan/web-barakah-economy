import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import PWAInstallGuideModal from '../common/PWAInstallGuideModal';

import axios from 'axios';


const NavDropdown = ({ title, items }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className={`flex items-center gap-1 font-medium transition py-2 ${isOpen ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400'}`}>
                {title}
                <span className={`material-icons text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            <div className={`absolute top-full left-0 pt-2 transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <div className="w-56 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100/50 dark:border-gray-700/50 py-3 overflow-hidden">
                    {items.map((item, idx) => (
                        <Link
                            key={idx}
                            to={item.to}
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover:bg-green-100 dark:group-hover:bg-green-900/50 flex items-center justify-center transition">
                                <span className="material-icons text-xl text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400">{item.icon}</span>
                            </div>
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

const DesktopHeader = () => {
    const [user, setUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showPwaGuideModal, setShowPwaGuideModal] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    const { t, i18n } = useTranslation();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();

    const fetchCartCount = async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { setCartCount(0); return; }
        try {
            const userObj = JSON.parse(userStr);
            if (!userObj.access) return;
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                headers: { Authorization: `Bearer ${userObj.access}` }
            });
            const totalItems = (res.data || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
            setCartCount(totalItems);
        } catch (err) {}
    };

    useEffect(() => {
        fetchCartCount();
        const handleCartUpdate = () => fetchCartCount();
        window.addEventListener('cartUpdated', handleCartUpdate);
        return () => window.removeEventListener('cartUpdated', handleCartUpdate);
    }, []);

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

    const group1 = [
        { label: t('menu.ecommerce'), to: '/store', icon: 'storefront' },
        { label: t('menu.ecourse'), to: '/academy/ecourse', icon: 'school' },
        { label: t('menu.digital_products'), to: '/digital-products', icon: 'shopping_bag' },
    ];

    const group2 = [
        { label: t('menu.activities'), to: '/kegiatan', icon: 'event_note' },
        { label: t('menu.event'), to: '/event', icon: 'event' },
        { label: t('menu.social_charity'), to: '/charity', icon: 'favorite' },
    ];

    const group3 = [
        { label: "What's New", to: '/whats-new', icon: 'auto_awesome' },
        { label: t('menu.article'), to: '/articles', icon: 'info' },
        { label: t('menu.discussion_forum'), to: '/forum', icon: 'forum' },
        { label: t('menu.consultation'), to: '/chat', icon: 'support_agent' },
    ];


    const profileMenuRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userNickname = user?.nickname || user?.profile?.nickname || user?.name_nickname || user?.profile?.name_nickname || user?.name_full || user?.first_name || user?.username || 'Sahabat';
    const userFullName = user?.name_full || user?.profile?.name_full || '';
    const userEmail = user?.email || user?.profile?.email || user?.username || '';
    const userRole = user?.position || user?.role || user?.profile?.role || (user?.is_staff ? 'Admin' : 'Anggota');

    return (
        <header className="w-full bg-white/80 dark:bg-gray-950/90 backdrop-blur-lg shadow-sm dark:shadow-gray-900 py-3 px-8 flex justify-between items-center fixed top-0 z-[1000] border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
            <Link to="/" className="flex items-center gap-2 group">
                <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-xl group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition">
                    <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain" onError={(e) => { e.target.src = '/icon-512x512.png'; }} />
                </div>
                <span className="text-xl font-black text-green-800 dark:text-green-400 tracking-tighter">Barakah App</span>
            </Link>

            <nav className="flex gap-6 items-center">
                <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 font-semibold transition">{t('header.home')}</Link>
                <Link to="/about" className="text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 font-semibold transition">{t('header.about')}</Link>

                <NavDropdown title={t('menu.products_services')} items={group1} />
                <NavDropdown title={t('menu.activities_social')} items={group2} />
                <NavDropdown title={t('menu.info_discussion')} items={group3} />

                {/* Language Switcher */}
                <button
                    onClick={() => {
                        const newLang = i18n.language === 'en' ? 'id' : 'en';
                        i18n.changeLanguage(newLang);
                    }}
                    className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 font-bold transition px-2 py-1 rounded-lg border border-transparent hover:border-green-200 dark:hover:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                    title="Switch Language"
                >
                    <span className="material-icons text-sm">language</span>
                    {i18n.language === 'en' ? 'EN' : 'ID'}
                </button>

                {/* Dark/Light Mode Toggle */}

                <button
                    onClick={toggleTheme}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                    title={isDark ? 'Mode Terang' : 'Mode Gelap'}
                >
                    <span className="material-icons text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
                </button>

                {/* Cart Drawer Trigger Button */}
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('openCartDrawer'))}
                    className="relative w-10 h-10 flex items-center justify-center rounded-full border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all duration-200"
                    title="Keranjang Belanja"
                >
                    <span className="material-icons text-xl">shopping_cart</span>
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 animate-pulse">
                            {cartCount > 9 ? '9+' : cartCount}
                        </span>
                    )}
                </button>

                {user ? (
                    <div className="relative pl-3 border-l border-gray-200 dark:border-gray-700" ref={profileMenuRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className={`flex items-center gap-2 p-1.5 pr-3.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition border ${
                                showProfileMenu ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            {user.picture ? (
                                <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-white dark:border-gray-700 shadow-sm" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-xs border border-white dark:border-gray-700 shadow-sm animate-fade-in">
                                    {(userNickname || '?').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex flex-col text-left leading-tight max-w-[110px]">
                                <span className="text-xs font-black truncate">{userNickname}</span>
                                <span className="text-[9px] text-gray-400 font-medium truncate">{userRole}</span>
                            </div>
                            <span className={`material-icons text-gray-400 dark:text-gray-500 text-base transition-transform duration-200 ${showProfileMenu ? 'rotate-180 text-emerald-600' : ''}`}>
                                expand_more
                            </span>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 mt-3 w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 z-50 animate-scale-up">
                                {/* User Card Header */}
                                <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/20 rounded-2xl border border-emerald-100/80 dark:border-emerald-900/30 mb-2 flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        {user.picture ? (
                                            <img src={user.picture} alt="Profile" className="w-11 h-11 rounded-2xl object-cover border-2 border-white dark:border-gray-800 shadow-sm" />
                                        ) : (
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-base shadow-sm border-2 border-white dark:border-gray-800">
                                                {(userNickname || '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">
                                                {userNickname}
                                            </p>
                                            <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded-md shrink-0">
                                                {userRole}
                                            </span>
                                        </div>
                                        {userFullName && userFullName !== userNickname && (
                                            <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium truncate">
                                                {userFullName}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                            {userEmail}
                                        </p>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="space-y-0.5">
                                    <Link
                                        to="/profile"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 text-xs font-bold transition group"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 flex items-center justify-center text-gray-500 group-hover:text-emerald-700 transition">
                                            <span className="material-icons text-sm">person_outline</span>
                                        </div>
                                        <div className="flex-1">
                                            <span>Profil & Data Saya</span>
                                        </div>
                                    </Link>

                                    <Link
                                        to="/dashboard"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 text-xs font-bold transition group"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 flex items-center justify-center text-gray-500 group-hover:text-emerald-700 transition">
                                            <span className="material-icons text-sm">dashboard_customize</span>
                                        </div>
                                        <div className="flex-1">
                                            <span>Dashboard & Manajemen</span>
                                        </div>
                                    </Link>

                                    <Link
                                        to="/whats-new"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 text-xs font-bold transition group"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 flex items-center justify-center text-gray-500 group-hover:text-emerald-700 transition">
                                            <span className="material-icons text-sm">auto_awesome</span>
                                        </div>
                                        <div className="flex-1 flex items-center justify-between">
                                            <span>What's New</span>
                                            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">Update</span>
                                        </div>
                                    </Link>

                                    <button
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            setShowPwaGuideModal(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 text-xs font-bold transition group text-left"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 flex items-center justify-center text-gray-500 group-hover:text-emerald-700 transition">
                                            <span className="material-icons text-sm">install_mobile</span>
                                        </div>
                                        <div className="flex-1">
                                            <span>Pasang Aplikasi (PWA)</span>
                                        </div>
                                    </button>
                                </div>

                                <div className="my-1.5 border-t border-gray-100 dark:border-gray-800"></div>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-black text-left transition"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-red-100/60 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                        <span className="material-icons text-sm">logout</span>
                                    </div>
                                    <span>Keluar dari Akun</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2 items-center pl-4 border-l border-gray-200 dark:border-gray-700">
                        <Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} className="px-5 py-2 text-gray-600 dark:text-gray-300 font-bold hover:text-green-700 dark:hover:text-green-400 transition">Masuk</Link>
                        <Link to="/register" className="px-5 py-2 bg-green-700 dark:bg-green-600 text-white font-bold rounded-full shadow-lg shadow-green-200 dark:shadow-green-900/30 hover:bg-green-800 dark:hover:bg-green-500 hover:-translate-y-0.5 transition-all active:scale-95">Daftar</Link>
                    </div>
                )}
            </nav>
            <PWAInstallGuideModal isOpen={showPwaGuideModal} onClose={() => setShowPwaGuideModal(false)} />
        </header>
    );
};

export default DesktopHeader;


