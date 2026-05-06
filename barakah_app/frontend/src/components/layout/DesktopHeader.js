import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NavDropdown = ({ title, items }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className={`flex items-center gap-1 font-medium transition py-2 ${isOpen ? 'text-green-700' : 'text-gray-600 hover:text-green-700'}`}>
                {title}
                <span className={`material-icons text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            <div className={`absolute top-full left-0 pt-2 transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <div className="w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100/50 py-3 overflow-hidden">
                    {items.map((item, idx) => (
                        <Link
                            key={idx}
                            to={item.to}
                            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 transition group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-green-100 flex items-center justify-center transition">
                                <span className="material-icons text-xl text-gray-400 group-hover:text-green-600">{item.icon}</span>
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
    const { t, i18n } = useTranslation();

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
        { label: t('menu.ecommerce'), to: '/sinergy', icon: 'handshake' },
        { label: t('menu.ecourse'), to: '/academy/ecourse', icon: 'school' },
        { label: t('menu.digital_products'), to: '/digital-products', icon: 'shopping_bag' },
    ];

    const group2 = [
        { label: t('menu.activities'), to: '/kegiatan', icon: 'event_note' },
        { label: t('menu.event'), to: '/event', icon: 'event' },
        { label: t('menu.social_charity'), to: '/charity', icon: 'favorite' },
    ];

    const group3 = [
        { label: t('menu.information'), to: '/articles', icon: 'info' },
        { label: t('menu.discussion_forum'), to: '/forum', icon: 'forum' },
        { label: t('menu.consultation'), to: '/chat', icon: 'support_agent' },
    ];

    return (
        <header className="w-full bg-white/80 backdrop-blur-lg shadow-sm py-3 px-8 flex justify-between items-center fixed top-0 z-[1000] border-b border-gray-100">
            <Link to="/" className="flex items-center gap-2 group">
                <div className="p-1.5 bg-green-50 rounded-xl group-hover:bg-green-100 transition">
                    <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain" onError={(e) => { e.target.src = '/icon-512x512.png'; }} />
                </div>
                <span className="text-xl font-black text-green-800 tracking-tighter">BARAKAH ECONOMY</span>
            </Link>

            <nav className="flex gap-8 items-center">
                <Link to="/" className="text-gray-600 hover:text-green-700 font-semibold transition">{t('header.home')}</Link>
                <Link to="/about" className="text-gray-600 hover:text-green-700 font-semibold transition">{t('header.about')}</Link>

                <NavDropdown title={t('menu.products_services')} items={group1} />
                <NavDropdown title={t('menu.activities_social')} items={group2} />
                <NavDropdown title={t('menu.info_discussion')} items={group3} />

                {/* Language Switcher */}
                <button
                    onClick={() => {
                        const newLang = i18n.language === 'en' ? 'id' : 'en';
                        i18n.changeLanguage(newLang);
                    }}
                    className="flex items-center gap-1 text-gray-600 hover:text-green-700 font-bold transition px-2 py-1 rounded-lg border border-transparent hover:border-green-200 hover:bg-green-50"
                    title="Switch Language"
                >
                    <span className="material-icons text-sm">language</span>
                    {i18n.language === 'en' ? 'EN' : 'ID'}
                </button>

                {user ? (
                    <div className="relative pl-4 border-l border-gray-200">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-2 p-1.5 pr-4 bg-gray-50 text-gray-700 font-bold rounded-full hover:bg-gray-100 transition border border-gray-100"
                        >
                            {user.picture ? (
                                <img src={user.picture} alt="Profile" className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                                    <span className="material-icons text-xl">person</span>
                                </div>
                            )}
                            <span className="text-sm max-w-[100px] truncate">{user.username || 'Admin'}</span>
                            <span className="material-icons text-gray-400 text-sm transition-transform">{showProfileMenu ? 'expand_less' : 'expand_more'}</span>
                        </button>

                        {showProfileMenu && (
                            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                                <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Akun Saya</p>
                                    <p className="text-sm font-bold text-gray-800 truncate">{user.email || user.username}</p>
                                </div>
                                <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 text-sm font-medium transition">
                                    <span className="material-icons text-lg">person_outline</span> Profile
                                </Link>
                                <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-green-50 hover:text-green-700 text-sm font-medium transition">
                                    <span className="material-icons text-lg">dashboard_customize</span> Dashboard
                                </Link>
                                <hr className="my-1 border-gray-50" />
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm font-bold text-left transition"
                                >
                                    <span className="material-icons text-lg">logout</span> Keluar
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2 items-center pl-4 border-l border-gray-200">
                        <Link to="/login" className="px-5 py-2 text-gray-600 font-bold hover:text-green-700 transition">Masuk</Link>
                        <Link to="/register" className="px-5 py-2 bg-green-700 text-white font-bold rounded-full shadow-lg shadow-green-200 hover:bg-green-800 hover:-translate-y-0.5 transition-all active:scale-95">Daftar</Link>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default DesktopHeader;
