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
                className={`rounded-3xl overflow-hidden border transition-all hover:scale-[1.05] active:scale-95 opacity-0 shadow-lg ${templateType === 'lofi' ? 'bg-[#fcfaf7] border-[#e5e0d8] p-2 rotate-[-1deg] hover:rotate-0' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
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
            className={`flex gap-4 p-4 rounded-3xl border transition-all hover:translate-x-1 hover:bg-white/10 opacity-0 backdrop-blur-sm ${templateType === 'lofi' ? 'bg-[#fcfaf7] border-[#e5e0d8] shadow-sm' : 'bg-white/5 border-white/10'}`}
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
        <div className={`min-h-screen text-white ${getFontClass(font)} relative overflow-x-hidden ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && (themeColor === 'blue' ? 'bg-[#1e3a8a]' : themeColor === 'purple' ? 'bg-[#4c1d95]' : themeColor === 'rose' ? 'bg-[#881337]' : themeColor === 'dark' ? 'bg-[#111827]' : 'bg-[#064e3b]')}`} style={bgStyle}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto flex flex-col items-center relative z-10 h-full overflow-y-auto no-scrollbar pb-16">
                {profile.shop_thumbnail && (
                    <div className="w-full h-40 relative overflow-hidden flex-shrink-0">
                        <img src={getMediaUrl(profile.shop_thumbnail)} alt="Header" className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 to-transparent"></div>
                    </div>
                )}
                <header className={`flex flex-col items-center mb-10 w-full text-center p-8 rounded-b-[2rem] transition-all ${profile.shop_thumbnail ? '-mt-12 bg-inherit' : 'pt-16'} ${isTransparentHeader ? 'bg-transparent' : 'bg-emerald-950/20 backdrop-blur-md border-b border-white/5'}`}>
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full animate-pulse"></div>
                        <div className="w-28 h-28 rounded-full border-[4px] border-yellow-500 p-1.5 flex items-center justify-center bg-emerald-900/30 backdrop-blur-md relative z-10 shadow-xl">
                            <div className="w-full h-full rounded-full bg-emerald-700 overflow-hidden">
                                <img src={getMediaUrl(profile.picture)} alt={username} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black mb-2 tracking-wider drop-shadow-lg uppercase" style={{ color: profileTextColor }}>{profile.name_full || username}</h1>
                    <p className="text-lg font-bold opacity-80 mb-4" style={{ color: profileTextColor }}>@{username}</p>
                    <div className="w-16 h-1 rounded-full mb-6 mx-auto opacity-30" style={{ backgroundColor: profileTextColor }}></div>
                    <p className="text-sm leading-relaxed font-serif italic max-w-[280px] mx-auto px-4" style={{ color: profileTextColor }}>{profile.shop_description || 'Berbagi inspirasi dan keberkahan.'}</p>
                </header>

                <div className={`w-full px-6 ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}`}>
                    {[...courses, ...products].slice(0, 15).map((item, idx) => (
                        <ProductCard key={idx} item={item} layout={layout} templateType="hijrah" themeColor={themeColor} textStyle={textStyle} badgeBg="bg-yellow-600" isHex={isHex} username={username} isPreview={isPreview} />
                    ))}
                </div>
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
        <div className={`min-h-screen text-white ${getFontClass(font)} relative overflow-x-hidden ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-gradient-to-b from-orange-500 via-orange-600 to-amber-700'}`} style={bgStyle}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto flex flex-col items-center h-full relative z-10 overflow-y-auto no-scrollbar pb-16">
                <div className="w-full h-48 relative flex-shrink-0">
                    <img src={getMediaUrl(profile.shop_thumbnail || profile.picture)} alt="Thumbnail" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-orange-600"></div>
                    <div className="absolute top-8 right-8">
                        <ShareButton size="sm" />
                    </div>
                </div>
                <header className={`flex flex-col items-center mb-12 w-full text-center p-8 transition-all -mt-20 relative z-20 ${isTransparentHeader ? 'bg-transparent' : 'bg-white/10 backdrop-blur-xl rounded-t-[3rem] border-t border-white/20'}`}>
                    <div className="w-28 h-28 rounded-full border-4 border-white/40 overflow-hidden shadow-2xl mb-6 ring-4 ring-orange-400/20 group hover:scale-105 transition-transform">
                        <img src={getMediaUrl(profile.picture)} alt={username} className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2 drop-shadow-md uppercase" style={{ color: profileTextColor }}>@{username}</h1>
                    <div className="px-6 py-2 bg-black/10 backdrop-blur-sm rounded-full mb-4">
                        <p className="text-xs tracking-[0.2em] font-bold opacity-90 uppercase" style={{ color: profileTextColor }}>{profile.name_full || 'Creator'}</p>
                    </div>
                    <p className="text-sm font-medium italic leading-relaxed px-10" style={{ color: profileTextColor }}>"{profile.shop_description || 'Menikmati harmoni dalam diam'}"</p>
                </header>

                <div className={`w-full px-6 ${layout === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'}`}>
                    {[...courses, ...products].slice(0, 15).map((item, idx) => (
                        <ProductCard key={idx} item={item} layout={layout} templateType="senja" themeColor={themeColor} badgeBg="bg-orange-600" username={username} isPreview={isPreview} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const ShareButton = ({ size = "md" }) => (
    <div className={`${size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/40 transition-colors`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
    </div>
);

// --- TEMPLATE 3: AESthetic LO-FI ---
export const AestheticLoFi = ({ profile, username, products, courses, isPreview, themeColor, font, decoration, layout, headerStyle, textColor }) => {
    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const isTransparentHeader = headerStyle === 'transparent';
    const profileTextColor = textColor || '#ffffff';

    return (
        <div className={`min-h-screen text-[#5d5c4b] relative overflow-x-hidden ${getFontClass(font)} ${isPreview ? 'rounded-[2.5rem] h-[650px] overflow-hidden' : ''} ${!isHex && 'bg-[#f4f1ea]'}`} style={isHex ? { backgroundColor: themeColor } : {}}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={isPreview} />
            <div className="max-w-md mx-auto h-full overflow-y-auto no-scrollbar pb-16">
                <div className="w-full h-64 bg-stone-200 relative overflow-hidden rounded-b-[4rem] shadow-xl">
                    <img src={getMediaUrl(profile.shop_thumbnail || profile.picture)} className="w-full h-full object-cover" alt="Shop Hero" />
                    <div className={`absolute inset-0 transition-all ${isTransparentHeader ? 'bg-black/10' : 'bg-stone-900/30 backdrop-blur-[1px]'}`}></div>
                    <div className="absolute bottom-16 left-10 text-left z-20">
                        <h1 className="text-4xl font-serif italic mb-2 drop-shadow-xl" style={{ color: profileTextColor }}>@{username}</h1>
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-[2px] bg-white opacity-60"></span>
                            <p className="text-xs tracking-[0.4em] uppercase font-bold text-white shadow-sm">Slow & Steady</p>
                        </div>
                    </div>
                </div>

                <section className="px-6 space-y-10 -mt-12 bg-inherit rounded-t-[4rem] relative z-30 text-center">
                    <div className={`p-8 rounded-[2.5rem] transition-all max-w-sm mx-auto ${isTransparentHeader ? 'bg-transparent' : 'bg-white/95 backdrop-blur-xl border border-stone-100 shadow-2xl shadow-stone-900/5'}`}>
                        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-6 border-4 border-stone-50 shadow-md">
                            <img src={getMediaUrl(profile.picture)} className="w-full h-full object-cover" alt="A" />
                        </div>
                        <p className="text-lg leading-relaxed italic font-serif" style={{ color: profileTextColor === '#ffffff' ? '#5d5c4b' : profileTextColor }}>
                            "{profile.shop_description || 'Menikmati setiap momen kecil dalam hidup.'}"
                        </p>
                    </div>

                    <div className={`w-full ${layout === 'grid' ? 'grid grid-cols-2 gap-5' : 'flex flex-col gap-6'}`}>
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
        case 'aesthetic_lofi': return <AestheticLoFi {...props} />;
        default: return null;
    }
};

export default StoreTemplates;
