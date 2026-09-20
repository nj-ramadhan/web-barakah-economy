import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import PWAInstallGuideModal from '../common/PWAInstallGuideModal';

const MobileNavDrawer = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const { isDark, toggleTheme } = useTheme();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [showPwaModal, setShowPwaModal] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                setUser(null);
            }
        } else {
            setUser(null);
        }
    }, [isOpen, location.pathname]);

    // Close drawer on route change
    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [location.pathname]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'id' : 'en';
        i18n.changeLanguage(newLang);
    };

    if (!isOpen) return null;

    const userNickname = user?.nickname || user?.profile?.nickname || user?.name_nickname || user?.name_full || user?.first_name || user?.username || 'Sahabat';
    const userRole = user?.position || user?.role || user?.profile?.role || (user?.is_staff ? 'Admin' : 'Anggota');
    const isAdmin = user && (user.username === 'admin' || user.role === 'admin' || user.is_staff || (user.accessible_menus && user.accessible_menus.includes('*')));

    const menuGroups = [
        {
            title: 'Menu Utama',
            items: [
                { to: '/', label: t('header.home', 'Beranda'), icon: 'home', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
                { to: '/about', label: t('header.about', 'Tentang Kami'), icon: 'info', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-400' },
            ]
        },
        {
            title: t('menu.products_services', 'Produk & Layanan'),
            items: [
                { to: '/store', label: t('menu.ecommerce', 'Toko / E-Commerce'), icon: 'storefront', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400' },
                { to: '/academy/ecourse', label: t('menu.ecourse', 'E-Course & Akademi'), icon: 'school', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400' },
                { to: '/digital-products', label: t('menu.digital_products', 'Produk Digital'), icon: 'shopping_bag', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400' },
            ]
        },
        {
            title: t('menu.activities_social', 'Aktivitas & Sosial'),
            items: [
                { to: '/kegiatan', label: t('menu.activities', 'Kegiatan Komunitas'), icon: 'event_note', color: 'text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400' },
                { to: '/event', label: t('menu.event', 'Agenda Event'), icon: 'celebration', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400' },
                { to: '/charity', label: t('menu.social_charity', 'Wakaf & Donasi (Charity)'), icon: 'volunteer_activism', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400' },
            ]
        },
        {
            title: t('menu.info_discussion', 'Info & Diskusi'),
            items: [
                { to: '/whats-new', label: "What's New", icon: 'auto_awesome', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' },
                { to: '/articles', label: t('menu.article', 'Artikel & Wawasan'), icon: 'article', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400' },
                { to: '/forum', label: t('menu.discussion_forum', 'Forum Diskusi'), icon: 'forum', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400' },
                { to: '/chat', label: t('menu.consultation', 'Konsultasi Ahli'), icon: 'support_agent', color: 'text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400' },
            ]
        },
    ];

    const userActivityItems = [
        { to: '/profile', label: 'Profil Saya', icon: 'person', color: 'text-gray-700 dark:text-gray-200' },
        { to: '/riwayat-belanja', label: 'Riwayat Belanja', icon: 'receipt_long', color: 'text-emerald-600 dark:text-emerald-400' },
        { to: '/incaran', label: 'Incaran / Wishlist', icon: 'favorite', color: 'text-rose-500 dark:text-rose-400' },
        { to: '/riwayat-donasi', label: 'Riwayat Donasi', icon: 'history', color: 'text-teal-600 dark:text-teal-400' },
        { to: '/dashboard/sinergy/seller', label: 'Dashboard Mitra Toko', icon: 'store', color: 'text-blue-600 dark:text-blue-400' },
        { to: '/dashboard/sinergy/seller/orders', label: 'Kelola Pesanan Toko', icon: 'local_shipping', color: 'text-indigo-600 dark:text-indigo-400' },
    ];

    return (
        <div className="fixed inset-0 z-[2000] lg:hidden animate-fade-in">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div className="fixed inset-y-0 left-0 max-w-[320px] w-full bg-white dark:bg-gray-950 shadow-2xl flex flex-col z-[2001] border-r border-gray-100 dark:border-gray-800 transition-transform duration-300">
                
                {/* Header Profile / Brand */}
                <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition active:scale-90"
                        title="Tutup Menu"
                    >
                        <span className="material-icons text-lg">close</span>
                    </button>

                    {user ? (
                        <div className="flex items-center gap-3 pt-1">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/60 bg-white/20 flex items-center justify-center shrink-0">
                                {user.picture ? (
                                    <img src={user.picture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-bold">
                                        {(user.name_full || user.username || '?').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-sm truncate text-white leading-tight">{userNickname}</h3>
                                <p className="text-[11px] text-emerald-100 truncate mt-0.5">{user.email || user.username}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-50">
                                    {userRole}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="pt-2 pb-1">
                            <div className="flex items-center gap-2 mb-2">
                                <img src="/logo.png" alt="Barakah App" className="w-7 h-7 object-contain bg-white rounded-lg p-0.5" />
                                <span className="font-black text-lg tracking-tight">Barakah App</span>
                            </div>
                            <p className="text-xs text-emerald-100 mb-3">Masuk untuk kemudahan transaksi dan akses fitur lengkap.</p>
                            <Link
                                to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                                onClick={onClose}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-800 rounded-xl font-bold text-xs shadow-md hover:bg-emerald-50 transition active:scale-95"
                            >
                                <span className="material-icons text-sm">login</span>
                                Masuk ke Akun
                            </Link>
                        </div>
                    )}
                </div>

                {/* Quick Action Bar (Theme, Lang, Cart, PWA) */}
                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={toggleTheme}
                            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-amber-400 hover:bg-gray-100 text-xs flex items-center gap-1 transition"
                            title="Ganti Tema"
                        >
                            <span className="material-icons text-sm">{isDark ? 'light_mode' : 'dark_mode'}</span>
                            <span className="text-[10px] font-semibold">{isDark ? 'Terang' : 'Gelap'}</span>
                        </button>
                        <button
                            onClick={toggleLanguage}
                            className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-gray-100 text-xs flex items-center gap-1 transition"
                            title="Ganti Bahasa"
                        >
                            <span className="material-icons text-sm">language</span>
                            <span className="text-[10px] font-bold">{i18n.language === 'en' ? 'EN' : 'ID'}</span>
                        </button>
                    </div>

                    <button
                        onClick={() => { setShowPwaModal(true); }}
                        className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-1 hover:bg-emerald-100 transition"
                        title="Panduan Pasang Aplikasi"
                    >
                        <span className="material-icons text-sm">install_mobile</span>
                        <span className="text-[10px] font-bold">Pasang App</span>
                    </button>
                </div>

                {/* Scrollable Menu Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5" style={{ scrollbarWidth: 'thin' }}>
                    
                    {/* User Activity Section (If Logged In) */}
                    {user && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
                                Transaksi & Akun Saya
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {userActivityItems.map((item, idx) => (
                                    <Link
                                        key={idx}
                                        to={item.to}
                                        onClick={onClose}
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                                            location.pathname === item.to
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold'
                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60 font-medium'
                                        }`}
                                    >
                                        <span className={`material-icons text-base ${item.color}`}>{item.icon}</span>
                                        <span className="text-xs truncate">{item.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Main Menu Groups (Direct Mirror of Desktop) */}
                    {menuGroups.map((grp, gIdx) => (
                        <div key={gIdx}>
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
                                {grp.title}
                            </p>
                            <div className="space-y-1">
                                {grp.items.map((item, iIdx) => {
                                    const isActive = location.pathname === item.to;
                                    return (
                                        <Link
                                            key={iIdx}
                                            to={item.to}
                                            onClick={onClose}
                                            className={`flex items-center justify-between p-2.5 rounded-xl transition ${
                                                isActive
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-200 font-medium'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                                                    <span className="material-icons text-lg">{item.icon}</span>
                                                </div>
                                                <span className="text-xs truncate">{item.label}</span>
                                            </div>
                                            <span className="material-icons text-gray-300 dark:text-gray-600 text-sm">chevron_right</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Admin Dashboard Link if Admin */}
                    {isAdmin && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-2 px-1">
                                Panel Administrator
                            </p>
                            <Link
                                to="/dashboard/admin/user-management"
                                onClick={onClose}
                                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition"
                            >
                                <span className="material-icons text-amber-600 text-base">admin_panel_settings</span>
                                <span>Buka Dashboard Admin</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Footer Drawer */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    <a
                        href="https://wa.me/6285643848251"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-emerald-600 text-[11px] font-semibold"
                    >
                        <span className="material-icons text-emerald-600 text-sm">chat</span>
                        <span>Bantuan CS</span>
                    </a>

                    {user && (
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                            <span className="material-icons text-sm">logout</span>
                            <span>Keluar</span>
                        </button>
                    )}
                </div>
            </div>

            <PWAInstallGuideModal isOpen={showPwaModal} onClose={() => setShowPwaModal(false)} />
        </div>
    );
};

export default MobileNavDrawer;
