import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import anime from 'animejs';
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
        const biolinkBase = `w-full py-4 px-6 border flex items-center gap-4 rounded-full transition-all hover:scale-[1.03] active:scale-95 backdrop-blur-md shadow-lg opacity-0 mb-3`;
        let themeClasses = "bg-white/10 hover:bg-white/20 border-white/20";

        switch (templateType) {
            case 'hijrah': themeClasses = "bg-emerald-900/60 text-yellow-500 border-yellow-500/40 hover:bg-emerald-800/80 hover:border-yellow-400"; break;
            case 'senja': themeClasses = "bg-white/15 hover:bg-white/25 border-white/30 text-white shadow-orange-900/10"; break;
            case 'cyber': themeClasses = "bg-black/40 border-[#bc13fe] text-[#bc13fe] shadow-[0_0_15px_rgba(188,19,254,0.3)] hover:shadow-[0_0_20px_rgba(188,19,254,0.6)]"; break;
            case 'bermain': themeClasses = "bg-[#FFD700] text-blue-900 border-white border-4 shadow-[0_6px_0_rgba(0,0,0,0.1)] hover:translate-y-[-2px] hover:shadow-[0_8px_0_rgba(0,0,0,0.1)]"; break;
            case 'lofi': themeClasses = "bg-[#fcfaf7] border-[#e5e0d8] text-gray-700 hover:bg-[#fffcf9]"; break;
            default: break;
        }

        return (
            <CardWrapper {...wrapperProps} ref={cardRef} className={`${biolinkBase} ${themeClasses}`}>
                {item.thumbnail && (
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/30 shadow-inner">
                        <img src={getMediaUrl(item.thumbnail)} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex-1 text-left line-clamp-1 font-bold text-sm">{item.title}</div>
                <div className="font-black text-sm whitespace-nowrap">{item.price > 0 ? formatIDR(item.price) : 'Gratis'}</div>
            </CardWrapper>
        );
    }

    if (layout === 'grid') {
        return (
            <CardWrapper
                {...wrapperProps}
                ref={cardRef}
                className={`rounded-3xl overflow-hidden border transition-all hover:scale-[1.05] active:scale-95 opacity-0 shadow-lg ${templateType === 'lofi' ? 'bg-[#fcfaf7] border-[#e5e0d8] p-2 rotate-[-1deg] hover:rotate-0' : templateType === 'cyber' ? 'bg-slate-900/70 border-[#05f9ff]/40 hover:border-[#05f9ff] shadow-[0_0_20px_rgba(5,249,255,0.1)]' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
            >
                <div className="aspect-square relative overflow-hidden">
                    <img src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'} alt={item.title} className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${templateType === 'lofi' ? 'sepia-[10%] opacity-90' : ''}`} />
                    {isCourse && (
                        <div className={`absolute top-2 right-2 text-[8px] px-2 py-1 rounded-lg font-black text-white ${badgeBg || 'bg-blue-600'} shadow-md uppercase tracking-tighter`}>Course</div>
                    )}
                </div>
                <div className="p-4 bg-inherit backdrop-blur-sm">
                    <h3 className="text-xs font-bold line-clamp-2 min-h-[32px] mb-2 leading-tight">{item.title}</h3>
                    <p className="font-black text-sm" style={textStyle}>{item.price > 0 ? formatIDR(item.price) : 'Gratis'}</p>
                </div>
            </CardWrapper>
        );
    }

    // Default Layout (List)
    return (
        <CardWrapper
            {...wrapperProps}
            ref={cardRef}
            className={`flex gap-4 p-4 rounded-3xl border transition-all hover:translate-x-1 hover:bg-white/10 opacity-0 backdrop-blur-sm ${templateType === 'lofi' ? 'bg-[#fcfaf7] border-[#e5e0d8] shadow-sm' : templateType === 'cyber' ? 'bg-slate-900/50 border-[#bc13fe]/30 hover:border-[#bc13fe]/70 shadow-[0_0_15px_rgba(188,19,254,0.1)]' : 'bg-white/5 border-white/10'}`}
        >
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                <img src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1">
                <div>
                    <h3 className="text-sm font-black line-clamp-1 mb-0.5">{item.title}</h3>
                    <p className="text-[10px] opacity-60 font-bold uppercase tracking-wider">{isCourse ? 'E-Course' : item.category || 'Digital Content'}</p>
                </div>
                <p className="font-extrabold text-base" style={textStyle}>{item.price > 0 ? formatIDR(item.price) : 'Gratis'}</p>
            </div>
        </CardWrapper>
    );
};

// --- TEMPLATE 1: HIJRAH ELEGAN ---
export const HijrahElegan = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const bgStyle = isHex ? { backgroundColor: themeColor } : {};
    const textStyle = isHex ? { color: themeColor } : { color: '#fbbf24' };
    const isTransparentHeader = headerStyle === 'transparent';
    const profileTextColor = textColor || (isHex ? '#ffffff' : '#fbbf24');

    return (
        <div className={`min-h-screen text-white ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && (themeColor === 'blue' ? 'bg-[#1e3a8a]' : themeColor === 'purple' ? 'bg-[#4c1d95]' : themeColor === 'rose' ? 'bg-[#881337]' : themeColor === 'dark' ? 'bg-[#111827]' : 'bg-[#064e3b]')}`} style={bgStyle}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto py-16 px-6 flex flex-col items-center relative z-10 h-full overflow-y-auto no-scrollbar">
                <header className={`flex flex-col items-center mb-12 w-full text-center p-6 rounded-3xl transition-all ${isTransparentHeader ? 'bg-transparent' : 'bg-emerald-950/20 backdrop-blur-md border border-white/5'}`}>
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full animate-pulse"></div>
                        <div className="w-28 h-28 rounded-full border-[3px] border-yellow-500 p-1.5 flex items-center justify-center bg-emerald-900/30 backdrop-blur-md relative z-10">
                            <div className="w-full h-full rounded-full bg-emerald-700 overflow-hidden shadow-2xl">
                                <img src={getMediaUrl(profile.picture)} alt={username} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-3xl font-black mb-3 tracking-wider drop-shadow-md uppercase" style={{ color: profileTextColor }}>{profile.name_full || username}</h1>
                    <div className="w-12 h-1 rounded-full mb-4 mx-auto" style={{ backgroundColor: profileTextColor + '40' }}></div>
                    <p className="text-sm leading-relaxed font-medium italic opacity-80 px-4" style={{ color: profileTextColor }}>{profile.shop_description || 'Berbagi inspirasi dan keberkahan.'}</p>
                </header>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}`}>
                    {[...courses, ...products].slice(0, 15).map((item, idx) => (
                        <ProductCard key={idx} item={item} layout={layout} templateType="hijrah" themeColor={themeColor} textStyle={textStyle} badgeBg="bg-yellow-600" isHex={isHex} username={username} isPreview={isPreview} />
                    ))}
                </div>
                <div className="h-12 flex-shrink-0"></div>
            </div>
        </div>
    );
};

// --- TEMPLATE 2: KETENANGAN SENJA ---
export const KetenanganSenja = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const bgStyle = isHex ? { background: `linear-gradient(to bottom, ${themeColor}, #ea580c)` } : {};
    const isTransparentHeader = headerStyle === 'transparent';
    const profileTextColor = textColor || '#ffffff';

    return (
        <div className={`min-h-screen text-white ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-gradient-to-b from-orange-500 via-orange-600 to-amber-700'}`} style={bgStyle}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto py-16 px-6 flex flex-col items-center h-full relative z-10 overflow-y-auto no-scrollbar">
                <header className={`flex flex-col items-center mb-12 w-full text-center p-6 rounded-3xl transition-all ${isTransparentHeader ? 'bg-transparent' : 'bg-white/10 backdrop-blur-md border border-white/10'}`}>
                    <div className="w-24 h-24 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl mb-6 ring-4 ring-orange-400/10">
                        <img src={getMediaUrl(profile.picture)} alt={username} className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight mb-2 drop-shadow-sm uppercase" style={{ color: profileTextColor }}>@{username}</h1>
                    <p className="text-sm opacity-90 font-bold mt-1 italic leading-snug px-6" style={{ color: profileTextColor }}>"{profile.shop_description || 'Menikmati harmoni dalam diam'}"</p>
                </header>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}`}>
                    {[...courses, ...products].slice(0, 15).map((item, idx) => (
                        <ProductCard key={idx} item={item} layout={layout} templateType="senja" themeColor={themeColor} badgeBg="bg-orange-600" username={username} isPreview={isPreview} />
                    ))}
                </div>
                <div className="h-12 flex-shrink-0"></div>
            </div>
        </div>
    );
};

// --- TEMPLATE 3: DUNIA BERMAIN ---
export const DuniaBermain = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const isTransparentHeader = headerStyle === 'transparent';
    const profileTextColor = textColor || '#1e3a8a';

    return (
        <div className={`min-h-screen text-[#1e3a8a] ${getFontClass(font)} relative ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#87CEEB]'}`} style={isHex ? { backgroundColor: themeColor } : {}}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto pt-16 text-center px-6 relative z-10 h-full overflow-y-auto no-scrollbar">
                <header className={`mb-14 p-8 rounded-[3.5rem] transition-all ${isTransparentHeader ? 'bg-transparent' : 'bg-white/40 backdrop-blur-lg border-4 border-white shadow-2xl'}`}>
                    <h1 className="text-5xl font-black drop-shadow-[0_4px_0_rgba(255,255,255,0.8)] uppercase tracking-tighter italic mb-10 transform -rotate-3 scale-110" style={{ color: profileTextColor }}>@{username}</h1>
                    <div className="mb-10 flex justify-center scale-110">
                        <div className="w-36 h-36 bg-[#FFD700] rounded-[2.5rem] border-8 border-white flex items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.1)] relative animate-bounce overflow-hidden transform rotate-6 ring-8 ring-white/20">
                            <img src={getMediaUrl(profile.picture)} className="w-full h-full object-cover" alt="Profile" />
                        </div>
                    </div>
                    <div className={`${isTransparentHeader ? 'bg-white/40' : 'bg-white/20'} backdrop-blur-md p-6 rounded-[2.5rem] border-4 border-white mb-6 shadow-sm inline-block transform hover:rotate-1 transition-transform`}>
                        <p className="font-black text-xl tracking-tight" style={{ color: profileTextColor }}> {profile.shop_description || 'Waktunya Bersenang-senang!'} </p>
                    </div>
                </header>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-6'}`}>
                    {[...courses, ...products].slice(0, 12).map((item, idx) => (
                        <ProductCard key={idx} item={item} layout={layout} templateType="bermain" themeColor={themeColor} textStyle={{ color: '#1e3a8a' }} badgeBg="bg-blue-900" username={username} isPreview={isPreview} />
                    ))}
                </div>
                <div className="h-16 flex-shrink-0"></div>
            </div>
        </div>
    );
};

// --- TEMPLATE 4: BUKU GAMBAR ---
export const BukuGambar = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const isTransparentHeader = headerStyle === 'transparent';
    const profileTextColor = textColor || '#4A4A4A';

    return (
        <div className={`min-h-screen text-[#4A4A4A] p-6 relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#fff5f7]'}`} style={isHex ? { backgroundColor: themeColor } : {}}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto h-full overflow-y-auto no-scrollbar pb-10">
                <header className={`w-full flex flex-col items-center mt-12 mb-12 relative z-10 text-center p-8 rounded-[2.5rem] transition-all ${isTransparentHeader ? 'bg-transparent' : 'bg-white/60 backdrop-blur-md border-2 border-pink-100 shadow-sm'}`}>
                    <div className="text-7xl mb-6 animate-[bounce_3s_infinite] drop-shadow-lg text-pink-300">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-center border-b-4 border-pink-200 inline-block px-2 uppercase transform rotate-1" style={{ color: profileTextColor, borderColor: profileTextColor + '40' }}>@{username}</h1>
                    <p className="text-lg opacity-80 mt-6 italic font-medium max-w-[280px]" style={{ color: profileTextColor }}>"{profile.shop_description || ''}"</p>
                </header>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-5' : 'flex flex-col gap-6'} relative z-10`}>
                    {[...courses, ...products].slice(0, 15).map((item, idx) => (
                        <ProductCard key={idx} item={item} layout={layout} templateType="lofi" themeColor={themeColor} badgeBg="bg-pink-400" username={username} isPreview={isPreview} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- TEMPLATE 5: NEON CYBER ---
export const NeonCyber = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const isTransparentHeader = headerStyle === 'transparent';
    const profileTextColor = textColor || '#05f9ff';

    return (
        <div className={`min-h-screen text-slate-100 p-6 relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#050810]'}`} style={isHex ? { backgroundColor: themeColor } : {}}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto h-full overflow-y-auto no-scrollbar pb-12">
                <header className={`w-full flex justify-between items-center mb-14 relative z-10 mt-6 p-6 rounded-2xl transition-all ${isTransparentHeader ? 'bg-transparent border-l-4 border-[#05f9ff]' : 'bg-slate-900/60 backdrop-blur-xl border-l-4 border-[#05f9ff] border-y border-r border-white/5 shadow-[0_0_30px_rgba(5,249,255,0.05)]'}`}>
                    <div className="flex flex-col text-left">
                        <h1 className="text-2xl font-black tracking-tighter italic drop-shadow-[0_0_12px_rgba(5,249,255,0.7)]" style={{ color: profileTextColor }}>@{username}</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_green]"></span>
                            <span className="text-[10px] uppercase tracking-[0.4em] text-[#bc13fe] font-black"></span>
                        </div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl border-2 border-[#bc13fe] flex items-center justify-center bg-slate-800 shadow-[0_0_15px_rgba(188,19,254,0.4)] rotate-3">
                        <img src={getMediaUrl(profile.picture)} className="w-full h-full object-cover rounded-xl" alt="P" />
                    </div>
                </header>

                <div className="bg-slate-900/30 border border-white/5 p-4 rounded-xl mb-10 text-center relative z-10">
                    <p className="text-xs font-mono uppercase tracking-widest tracking-tighter italic" style={{ color: profileTextColor }}> {profile.shop_description || ''} </p>
                </div>

                <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-5'} relative z-10`}>
                    {[...courses, ...products].slice(0, 15).map((item, idx) => (
                        <ProductCard key={idx} item={item} layout={layout} templateType="cyber" themeColor={themeColor} textStyle={{ color: '#05f9ff', textShadow: '0 0 8px rgba(5,249,255,0.6)' }} badgeBg="bg-[#bc13fe]" username={username} isPreview={isPreview} />
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- TEMPLATE 6: AESthetic LO-FI ---
export const AestheticLoFi = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const isTransparentHeader = headerStyle === 'transparent';
    const profileTextColor = textColor || '#ffffff';

    return (
        <div className={`min-h-screen text-[#5d5c4b] relative ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#f4f1ea]'}`} style={isHex ? { backgroundColor: themeColor } : {}}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto h-full overflow-y-auto no-scrollbar">
                <div className="w-full h-56 bg-stone-200 relative overflow-hidden rounded-b-[3rem] shadow-lg">
                    <img src={getMediaUrl(profile.shop_thumbnail || profile.picture)} className="w-full h-full object-cover" alt="B" />
                    <div className={`absolute inset-0 transition-all ${isTransparentHeader ? 'bg-transparent' : 'bg-stone-900/20 backdrop-blur-[2px]'}`}></div>
                    <div className="absolute bottom-10 left-8 text-left z-10">
                        <h1 className="text-3xl font-serif italic mb-1 drop-shadow-md" style={{ color: profileTextColor }}>@{username}</h1>
                        <p className="text-[11px] tracking-[0.3em] uppercase opacity-80 font-bold" style={{ color: profileTextColor }}> </p>
                    </div>
                </div>

                <section className="px-6 space-y-8 -mt-10 bg-inherit rounded-t-[3rem] relative z-20 text-center pb-12">
                    <div className={`p-6 rounded-3xl transition-all max-w-[320px] mx-auto ${isTransparentHeader ? 'bg-transparent' : 'bg-white/90 backdrop-blur-lg border border-stone-200 shadow-xl'}`}>
                        <p className="text-base leading-relaxed italic font-serif" style={{ color: profileTextColor === '#ffffff' ? '#5d5c4b' : profileTextColor }}>
                            "{profile.shop_description || 'Menikmati setiap momen kecil dalam hidup.'}"
                        </p>
                    </div>

                    <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-5' : 'flex flex-col gap-5'}`}>
                        {[...courses, ...products].slice(0, 15).map((item, idx) => (
                            <ProductCard key={idx} item={item} layout={layout} templateType="lofi" themeColor={themeColor} badgeBg="bg-stone-500" username={username} isPreview={isPreview} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

// --- MAIN EXPORT WRAPPER ---
const StoreTemplates = ({ templateName, profile, username, products = [], courses = [], isPreview = false, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const props = { profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor };

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
