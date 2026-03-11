import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as anime_module from 'animejs';
const anime = anime_module.default || anime_module;
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

// --- PRODUCT CARD COMPONENT ---
const ProductCard = ({ item, layout, templateType, themeColor, textStyle, badgeBg, isHex, username, isPreview }) => {
    const cardRef = useRef(null);
    const isCourse = !!item.instructor_name || item.student_count !== undefined;
    const targetPath = isCourse
        ? `/kelas/${item.slug}`
        : `/digital-produk/${username}/${item.slug}`;

    const CardWrapper = isPreview ? 'div' : Link;
    const wrapperProps = isPreview ? {} : { to: targetPath };

    useEffect(() => {
        if (cardRef.current) {
            anime({
                targets: cardRef.current,
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 800,
                delay: anime.stagger(100),
                easing: 'easeOutExpo'
            });
        }
    }, []);

    if (layout === 'biolink') {
        return (
            <CardWrapper
                {...wrapperProps}
                ref={cardRef}
                className={`w-full py-4 px-6 border border-white/20 flex items-center gap-4 rounded-full transition-all hover:scale-[1.02] active:scale-95 backdrop-blur-sm shadow-sm opacity-0 ${templateType === 'hijrah' ? 'bg-emerald-800/40 text-yellow-500 border-yellow-500/50 hover:bg-emerald-800/60' : templateType === 'senja' ? 'bg-white/15 hover:bg-white/25 border-white/20' : templateType === 'cyber' ? 'bg-transparent border-[#bc13fe] text-[#bc13fe] shadow-[0_0_10px_#bc13fe] hover:bg-[#bc13fe]/10' : templateType === 'bermain' ? 'bg-[#FFD700] text-blue-900 border-white border-4 shadow-[0_4px_0_rgba(0,0,0,0.1)]' : templateType === 'lofi' ? 'bg-[#fcfaf7] border-[#e5e0d8] text-gray-700' : 'bg-white/10 hover:bg-white/20'}`}
            >
                {item.thumbnail && (
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/30">
                        <img src={getMediaUrl(item.thumbnail)} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex-1 text-left line-clamp-1 font-medium">{item.title}</div>
                <div className="font-bold whitespace-nowrap">{item.price > 0 ? formatIDR(item.price) : 'Gratis'}</div>
            </CardWrapper>
        );
    }

    if (layout === 'grid') {
        return (
            <CardWrapper
                {...wrapperProps}
                ref={cardRef}
                className={`rounded-2xl overflow-hidden border transition-all hover:scale-[1.03] active:scale-95 opacity-0 ${templateType === 'lofi' ? 'bg-[#fcfaf7] border-[#e5e0d8] rotate-[1deg] hover:rotate-0 p-2 shadow-md' : templateType === 'cyber' ? 'bg-slate-900/50 border-[#05f9ff]/30 hover:border-[#05f9ff] shadow-[0_0_15px_rgba(5,249,255,0.1)]' : 'bg-white/10 border-white/20'}`}
            >
                <div className="aspect-square relative">
                    <img src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'} alt={item.title} className={`w-full h-full object-cover ${templateType === 'lofi' ? 'sepia-[20%]' : ''}`} />
                    {isCourse && (
                        <div className={`absolute top-2 right-2 text-[8px] px-2 py-0.5 rounded-full font-bold text-white ${badgeBg || 'bg-blue-600'}`}>Course</div>
                    )}
                </div>
                <div className="p-3">
                    <h3 className="text-xs font-bold line-clamp-2 min-h-[32px] mb-1">{item.title}</h3>
                    <p className="font-black text-xs" style={textStyle}>{item.price > 0 ? formatIDR(item.price) : 'Gratis'}</p>
                </div>
            </CardWrapper>
        );
    }

    // Default Layout
    return (
        <CardWrapper
            {...wrapperProps}
            ref={cardRef}
            className={`flex gap-4 p-3 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 opacity-0 ${templateType === 'lofi' ? 'bg-[#fcfaf7] border-[#e5e0d8] shadow-sm' : templateType === 'cyber' ? 'bg-slate-900/40 border-[#bc13fe]/20 hover:border-[#bc13fe]/50' : 'bg-white/5 border-white/10'}`}
        >
            <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <img src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                    <h3 className="text-sm font-bold line-clamp-2 mb-1">{item.title}</h3>
                    <p className="text-[10px] opacity-60 line-clamp-1">{isCourse ? 'E-Course' : item.category || 'Digital Product'}</p>
                </div>
                <p className="font-bold" style={textStyle}>{item.price > 0 ? formatIDR(item.price) : 'Gratis'}</p>
            </div>
        </CardWrapper>
    );
};

// --- TEMPLATE 1: HIJRAH ELEGAN ---
export const HijrahElegan = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const bgStyle = isHex ? { backgroundColor: themeColor } : {};
    const textStyle = isHex ? { color: themeColor } : { color: '#fbbf24' }; // default yellow-400/500

    return (
        <div
            className={`min-h-screen text-white ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && (themeColor === 'blue' ? 'bg-blue-900' : themeColor === 'purple' ? 'bg-purple-900' : themeColor === 'rose' ? 'bg-rose-900' : themeColor === 'dark' ? 'bg-gray-900' : 'bg-[#064e3b]')}`}
            style={bgStyle}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto py-12 px-6 flex flex-col items-center relative z-10 h-full overflow-y-auto no-scrollbar">
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

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}`}>
                    {[...courses, ...products].slice(0, 12).map((item, idx) => (
                        <ProductCard
                            key={idx}
                            item={item}
                            layout={layout}
                            templateType="hijrah"
                            themeColor={themeColor}
                            textStyle={textStyle}
                            badgeBg="bg-yellow-600"
                            isHex={isHex}
                            username={username}
                            isPreview={isPreview}
                        />
                    ))}
                </div>

                <footer className="mt-8 pb-12 text-center w-full">
                    <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest">
                        Est. 2026 • {profile.name_full || username}
                    </p>
                </footer>
            </div>
        </div>
    );
};

// --- TEMPLATE 2: KETENANGAN SENJA ---
export const KetenanganSenja = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const bgStyle = isHex ? { background: `linear-gradient(to bottom, ${themeColor}, #f59e0b)` } : {};

    return (
        <div
            className={`min-h-screen text-white ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-gradient-to-b from-orange-400 via-orange-500 to-yellow-600'}`}
            style={bgStyle}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto py-12 px-6 flex flex-col items-center justify-start h-full relative z-10 overflow-y-auto no-scrollbar">
                <header className="flex flex-col items-center mb-10 w-full">
                    <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden shadow-xl mb-6">
                        <img src={getMediaUrl(profile.picture)} alt={username} className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-wide">@{username}</h1>
                    <p className="text-sm opacity-90 font-light mt-1 italic text-center px-4">"{profile.shop_description || 'Menikmati harmoni dalam diam'}"</p>
                </header>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}`}>
                    {[...courses, ...products].slice(0, 10).map((item, idx) => (
                        <ProductCard
                            key={idx}
                            item={item}
                            layout={layout}
                            templateType="senja"
                            themeColor={themeColor}
                            badgeBg="bg-orange-600"
                            username={username}
                            isPreview={isPreview}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- TEMPLATE 3: DUNIA BERMAIN ---
export const DuniaBermain = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-[#2c3e50] ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#87CEEB]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto pt-12 text-center px-4 relative z-10 h-full overflow-y-auto no-scrollbar" style={{ animation: 'float 6s ease-in-out infinite' }}>
                <h1 className="text-3xl font-black text-white drop-shadow-lg uppercase tracking-wider italic mb-4">
                    @{username}
                </h1>

                <div className="mb-8 flex justify-center">
                    <div className="w-32 h-32 bg-[#FFD700] rounded-full border-8 border-white flex items-center justify-center shadow-xl relative animate-bounce overflow-hidden">
                        <img src={getMediaUrl(profile.picture)} className="w-full h-full object-cover" alt="Profile" />
                    </div>
                </div>

                <div className="bg-white/30 backdrop-blur-sm p-4 rounded-3xl border-2 border-white/50 mb-8 text-[#2c3e50]">
                    <p className="font-bold">{profile.shop_description || 'Waktunya Bersenang-senang!'}</p>
                </div>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-6'}`}>
                    {[...courses, ...products].slice(0, 8).map((item, idx) => (
                        <ProductCard
                            key={idx}
                            item={item}
                            layout={layout}
                            templateType="bermain"
                            themeColor={themeColor}
                            textStyle={{ color: '#1e3a8a' }}
                            badgeBg="bg-blue-900"
                            username={username}
                            isPreview={isPreview}
                        />
                    ))}
                </div>
                <div className="h-10"></div>
            </div>
        </div>
    );
};

// --- TEMPLATE 4: BUKU GAMBAR ---
export const BukuGambar = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-[#4A4A4A] p-6 relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-gradient-to-br from-[#FFD1DC] to-[#AEC6CF]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto h-full overflow-y-auto no-scrollbar">
                <header className="w-full flex flex-col items-center mt-8 mb-10 relative z-10">
                    <div className="text-6xl mb-4 animate-[sway_2s_ease-in-out_infinite]">❤️</div>
                    <h1 className="text-3xl font-bold tracking-wide text-center uppercase">
                        @{username}
                    </h1>
                    <p className="text-lg opacity-80 mt-2 italic text-center">"{profile.shop_description || 'Mari berkreasi hari ini!'}"</p>
                </header>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-6'} relative z-10`}>
                    {[...courses, ...products].slice(0, 10).map((item, idx) => (
                        <ProductCard
                            key={idx}
                            item={item}
                            layout={layout}
                            templateType="lofi"
                            themeColor={themeColor}
                            badgeBg="bg-pink-400"
                            username={username}
                            isPreview={isPreview}
                        />
                    ))}
                </div>
                <div className="h-10"></div>
            </div>
        </div>
    );
};

// --- TEMPLATE 5: NEON CYBER ---
export const NeonCyber = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-slate-100 p-6 relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#0f172a]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto h-full overflow-y-auto no-scrollbar">
                <header className="w-full flex justify-between items-center mb-10 relative z-10">
                    <div className="flex flex-col text-left">
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

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'} relative z-10`}>
                    {[...courses, ...products].slice(0, 10).map((item, idx) => (
                        <ProductCard
                            key={idx}
                            item={item}
                            layout={layout}
                            templateType="cyber"
                            themeColor={themeColor}
                            textStyle={{ color: '#05f9ff', textShadow: '0 0 5px rgba(5,249,255,0.5)' }}
                            badgeBg="bg-[#bc13fe]"
                            username={username}
                            isPreview={isPreview}
                        />
                    ))}
                </div>
                <div className="h-10"></div>
            </div>
        </div>
    );
};

// --- TEMPLATE 6: AESthetic LO-FI ---
export const AestheticLoFi = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');

    return (
        <div
            className={`min-h-screen text-[#5d5c4b] relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#f2ede4]'}`}
            style={isHex ? { backgroundColor: themeColor } : {}}
        >
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto h-full overflow-y-auto no-scrollbar">
                <div className="w-full h-48 bg-gray-200 relative overflow-hidden rounded-b-[2.5rem]">
                    <img src={getMediaUrl(profile.shop_thumbnail || profile.picture)} className="w-full h-full object-cover opacity-100" alt="B" />
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute bottom-6 left-6 text-white text-left">
                        <h1 className="text-2xl italic">@{username}</h1>
                        <p className="text-[10px] tracking-widest uppercase">Tenang & Teduh</p>
                    </div>
                </div>

                <section className="p-6 space-y-6 -mt-8 bg-inherit rounded-t-[2.5rem] relative z-10 text-center">
                    <div className="bg-[#fcfaf7]/80 backdrop-blur-sm p-4 rounded-2xl border border-[#e5e0d8]">
                        <p className="text-sm leading-relaxed italic text-gray-600 px-4">
                            "{profile.shop_description || 'Menikmati setiap momen kecil dalam hidup.'}"
                        </p>
                    </div>

                    <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}`}>
                        {[...courses, ...products].slice(0, 8).map((item, idx) => (
                            <ProductCard
                                key={idx}
                                item={item}
                                layout={layout}
                                templateType="lofi"
                                themeColor={themeColor}
                                badgeBg="bg-stone-500"
                                username={username}
                                isPreview={isPreview}
                            />
                        ))}
                    </div>
                    <div className="h-10"></div>
                </section>
            </div>
        </div>
    );
};

// --- MAIN EXPORT WRAPPER ---
const StoreTemplates = ({ templateName, profile, username, products = [], courses = [], isPreview = false, themeColor, font, decoration, layout }) => {
    const props = { profile, username, products, courses, isPreview, themeColor, font, decoration, layout };

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
