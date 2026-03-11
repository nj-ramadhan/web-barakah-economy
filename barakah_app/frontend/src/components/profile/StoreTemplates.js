import React from 'react';
import ShopDecoration from './ShopDecoration';

// Common functions helper
const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    return `${baseUrl}${url}`;
};

const getFontClass = (font) => {
    switch (font) {
        case 'serif': return 'font-serif';
        case 'mono': return 'font-mono';
        case 'poppins': return 'font-[Poppins]';
        default: return 'font-sans';
    }
};

// --- TEMPLATE 1: HIJRAH ELEGAN ---
export const HijrahElegan = ({ profile, username, products, courses, isPreview, themeColor, font, decoration }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const bgStyle = isHex ? { backgroundColor: themeColor } : {};
    const textStyle = isHex ? { color: themeColor } : {};

    return (
        <div
            className={`min-h-screen text-white ${getFontClass(font)} selection:bg-yellow-500 selection:text-emerald-900 relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && (themeColor === 'blue' ? 'bg-blue-900' : themeColor === 'purple' ? 'bg-purple-900' : themeColor === 'rose' ? 'bg-rose-900' : themeColor === 'dark' ? 'bg-gray-900' : 'bg-[#064e3b]')}`}
            style={bgStyle}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto py-12 px-6 flex flex-col items-center relative z-10">
                <header className="flex flex-col items-center mb-10 w-full">
                    <div className="mb-6 animate-bounce">
                        <div className="w-28 h-28 rounded-full border-2 border-yellow-500 p-1 flex items-center justify-center bg-emerald-800/50 backdrop-blur-sm">
                            <div className="w-full h-full rounded-full bg-emerald-700 overflow-hidden">
                                <img src={getMediaUrl(profile.picture)} alt={username} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-2xl font-semibold text-yellow-500 mb-2 tracking-wide text-center">
                        {profile.name_full || username}
                    </h1>
                    <p className="text-sm text-emerald-200 text-center px-4 leading-relaxed opacity-90">
                        {profile.shop_description || 'Berbagi inspirasi dan keberkahan.'}
                    </p>
                </header>

                <nav className="w-full flex flex-col gap-4">
                    {[...courses, ...products].slice(0, 10).map((item, idx) => (
                        <a key={idx} href={`/${item.slug || '#'}`} className="w-full py-4 px-6 border border-yellow-500/50 bg-emerald-800/40 text-yellow-500 font-medium rounded-full text-center hover:bg-emerald-800/60 transition-all active:scale-95 backdrop-blur-sm">
                            {item.title} - <span className="font-bold">{item.price > 0 ? formatIDR(item.price) : 'Gratis'}</span>
                        </a>
                    ))}
                </nav>

                <footer className="mt-auto pt-12 text-center">
                    <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest">
                        Est. 2026 • {profile.name_full || username}
                    </p>
                </footer>
            </div>
        </div>
    );
};

// --- TEMPLATE 2: KETENANGAN SENJA ---
export const KetenanganSenja = ({ profile, username, products, courses, isPreview, themeColor, font, decoration }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const bgStyle = isHex ? { background: `linear-gradient(to bottom, ${themeColor}, #f59e0b)` } : {};

    return (
        <div
            className={`min-h-screen text-white ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-gradient-to-b from-orange-400 via-orange-500 to-yellow-600'}`}
            style={bgStyle}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto py-12 px-6 flex flex-col items-center justify-start h-full relative z-10">
                <header className="flex flex-col items-center mb-10">
                    <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden shadow-xl mb-6">
                        <img src={getMediaUrl(profile.picture)} alt={username} className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-wide">@{username}</h1>
                    <p className="text-sm opacity-90 font-light mt-1 italic text-center">"{profile.shop_description || 'Menikmati harmoni dalam diam'}"</p>
                </header>

                <nav className="w-full space-y-4">
                    {[...courses, ...products].slice(0, 8).map((item, idx) => (
                        <a key={idx} href="#" className="block w-full py-4 px-6 rounded-2xl text-center font-medium shadow-sm bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/25 transition">
                            {item.title}
                        </a>
                    ))}
                </nav>
            </div>
        </div>
    );
};

// --- TEMPLATE 3: DUNIA BERMAIN ---
export const DuniaBermain = ({ profile, username, products, courses, isPreview, themeColor, font, decoration }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-[#2c3e50] ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#87CEEB]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto pt-12 text-center px-4 relative z-10">
                <h1 className="text-3xl font-black text-white drop-shadow-lg uppercase tracking-wider italic mb-4">
                    @{username}
                </h1>

                <div className="mb-8 flex justify-center">
                    <div className="w-32 h-32 bg-[#FFD700] rounded-full border-8 border-white flex items-center justify-center shadow-xl relative animate-bounce">
                        <img src={getMediaUrl(profile.picture)} className="w-full h-full object-cover rounded-full" alt="Profile" />
                    </div>
                </div>

                <div className="bg-white/30 backdrop-blur-sm p-4 rounded-3xl border-2 border-white/50 mb-8 text-[#2c3e50]">
                    <p className="font-bold">{profile.shop_description || 'Waktunya Bersenang-senang!'}</p>
                </div>

                <div className="flex flex-col gap-6">
                    {[...courses, ...products].slice(0, 6).map((item, idx) => (
                        <button key={idx} className="w-full py-5 bg-[#FFD700] text-blue-900 text-xl font-black rounded-full shadow-[0_8px_0_rgba(0,0,0,0.15)] border-4 border-white uppercase tracking-wide active:translate-y-1 active:shadow-none transition-all">
                            {item.title}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- TEMPLATE 4: BUKU GAMBAR ---
export const BukuGambar = ({ profile, username, products, courses, isPreview, themeColor, font, decoration }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-[#4A4A4A] p-6 relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-gradient-to-br from-[#FFD1DC] to-[#AEC6CF]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <header className="w-full flex flex-col items-center mt-8 mb-10 relative z-10">
                <div className="text-6xl mb-4 animate-[sway_2s_ease-in-out_infinite]">❤️</div>
                <h1 className="text-3xl font-bold tracking-wide text-center uppercase">
                    @{username}
                </h1>
                <p className="text-lg opacity-80 mt-2 italic text-center">"{profile.shop_description || 'Mari berkreasi hari ini!'}"</p>
            </header>

            <div className="space-y-6 relative z-10">
                {[...courses, ...products].slice(0, 7).map((item, idx) => (
                    <div key={idx} className="w-full py-4 bg-white border-[3px] border-[#4A4A4A] rounded-[255px_15px_225px_15px/15px_225px_15px_255px] font-bold text-center hover:scale-105 transition-transform cursor-pointer shadow-sm">
                        {item.title}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- TEMPLATE 5: NEON CYBER ---
export const NeonCyber = ({ profile, username, products, courses, isPreview, themeColor, font, decoration }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-slate-100 p-6 relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#0f172a]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <header className="w-full flex justify-between items-center mb-10 relative z-10">
                <div className="flex flex-col">
                    <h1 className="text-xl font-black tracking-tighter italic text-[#05f9ff] drop-shadow-[0_0_8px_rgba(5,249,255,0.6)]">@{username}</h1>
                    <span className="text-[8px] uppercase tracking-[0.3em] text-[#bc13fe] font-bold">STATUS: DEPLOYED</span>
                </div>
                <div className="w-12 h-12 rounded-full border border-[#05f9ff] flex items-center justify-center bg-slate-800 shadow-[0_0_10px_#05f9ff]">
                    <img src={getMediaUrl(profile.picture)} className="w-full h-full object-cover rounded-full" alt="P" />
                </div>
            </header>

            <div className="text-center mb-10 relative z-10">
                <p className="text-slate-400 text-xs italic"> {profile.shop_description || 'Sistem Aktif - Siap Beraksi'} </p>
            </div>

            <div className="space-y-4 relative z-10">
                {[...courses, ...products].slice(0, 8).map((item, idx) => (
                    <button key={idx} className="w-full py-4 bg-transparent border-2 border-[#bc13fe] rounded-lg text-[#bc13fe] font-bold tracking-widest uppercase shadow-[0_0_10px_#bc13fe] hover:bg-[#bc13fe]/10 transition-all">
                        {item.title}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- TEMPLATE 6: AESthetic LO-FI ---
export const AestheticLoFi = ({ profile, username, products, courses, isPreview, themeColor, font, decoration }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-[#5d5c4b] relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#f2ede4]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
                <img src={getMediaUrl(profile.shop_thumbnail || profile.picture)} className="w-full h-full object-cover opacity-100" alt="B" />
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute bottom-6 left-6 text-white text-left">
                    <h1 className="text-2xl italic">@{username}</h1>
                    <p className="text-[10px] tracking-widest uppercase">Tenang & Teduh</p>
                </div>
            </div>

            <section className="p-6 space-y-6 -mt-8 bg-inherit rounded-t-3xl relative z-10 text-center">
                <div className="bg-[#fcfaf7]/80 backdrop-blur-sm p-4 rounded-2xl border border-[#e5e0d8]">
                    <p className="text-sm leading-relaxed italic text-gray-600 px-4">
                        "{profile.shop_description || 'Menikmati setiap momen kecil dalam hidup.'}"
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...courses, ...products].slice(0, 6).map((item, idx) => (
                        <div key={idx} className="bg-[#fcfaf7] pt-3 pb-8 px-3 shadow-md border border-[#e5e0d8] transform rotate-[1deg] hover:rotate-0 transition-transform">
                            <img src={getMediaUrl(item.thumbnail)} className="w-full aspect-square object-cover sepia-[20%] mb-2" alt="T" />
                            <p className="text-sm italic">{item.title}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

// --- MAIN EXPORT WRAPPER ---
const StoreTemplates = ({ templateName, profile, username, products = [], courses = [], isPreview = false, themeColor, font, decoration }) => {
    const props = { profile, username, products, courses, isPreview, themeColor, font, decoration };

    switch (templateName) {
        case 'hijrah_elegan': return <HijrahElegan {...props} />;
        case 'ketenangan_senja': return <KetenanganSenja {...props} />;
        case 'dunia_bermain': return <DuniaBermain {...props} />;
        case 'buku_gambar': return <BukuGambar {...props} />;
        case 'neon_cyber': return <NeonCyber {...props} />;
        case 'aesthetic_lofi': return <AestheticLoFi {...props} />;
        default: return null;
    }
};

export default StoreTemplates;
