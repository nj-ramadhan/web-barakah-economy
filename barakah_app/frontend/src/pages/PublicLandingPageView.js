import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { getPublicLandingPage } from '../services/landingPageApi';
import { getMediaUrl } from '../utils/mediaUtils';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const formatIDR = (val) => {
    if (!val || Number(val) === 0) return 'Gratis';
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val);
};

const THEME_STYLES = {
    emerald: {
        bg: 'bg-emerald-950/5',
        heroBg: 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900',
        heroText: 'text-white',
        cardBg: 'bg-white',
        cardBorder: 'border-emerald-100',
        badgeBg: 'bg-amber-400 text-amber-950',
        priceColor: 'text-emerald-700',
        btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
        btnSecondary: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200',
        accent: 'text-emerald-600',
    },
    modern_dark: {
        bg: 'bg-slate-950 text-slate-100',
        heroBg: 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950',
        heroText: 'text-white',
        cardBg: 'bg-slate-900 text-slate-100',
        cardBorder: 'border-slate-800',
        badgeBg: 'bg-indigo-500 text-white',
        priceColor: 'text-indigo-400',
        btnPrimary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900',
        btnSecondary: 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700',
        accent: 'text-indigo-400',
    },
    clean_white: {
        bg: 'bg-slate-50 text-slate-900',
        heroBg: 'bg-gradient-to-br from-slate-900 to-slate-800',
        heroText: 'text-white',
        cardBg: 'bg-white',
        cardBorder: 'border-slate-200',
        badgeBg: 'bg-slate-900 text-white',
        priceColor: 'text-slate-900',
        btnPrimary: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-300',
        btnSecondary: 'bg-white text-slate-800 hover:bg-slate-100 border border-slate-300',
        accent: 'text-slate-700',
    },
    sunset_amber: {
        bg: 'bg-amber-50/40 text-stone-900',
        heroBg: 'bg-gradient-to-br from-amber-600 via-orange-600 to-rose-700',
        heroText: 'text-white',
        cardBg: 'bg-white',
        cardBorder: 'border-amber-100',
        badgeBg: 'bg-rose-500 text-white',
        priceColor: 'text-amber-700',
        btnPrimary: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-200',
        btnSecondary: 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200',
        accent: 'text-amber-600',
    },
    ocean_blue: {
        bg: 'bg-sky-50/50 text-slate-900',
        heroBg: 'bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-900',
        heroText: 'text-white',
        cardBg: 'bg-white',
        cardBorder: 'border-sky-100',
        badgeBg: 'bg-sky-500 text-white',
        priceColor: 'text-blue-700',
        btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
        btnSecondary: 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200',
        accent: 'text-blue-600',
    },
    luxury_gold: {
        bg: 'bg-stone-900 text-stone-100',
        heroBg: 'bg-gradient-to-br from-black via-stone-900 to-amber-950',
        heroText: 'text-amber-200',
        cardBg: 'bg-stone-850 bg-stone-900 text-stone-100',
        cardBorder: 'border-amber-500/30',
        badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 font-black',
        priceColor: 'text-amber-400',
        btnPrimary: 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black shadow-amber-900',
        btnSecondary: 'bg-stone-800 text-amber-300 hover:bg-stone-700 border border-amber-500/30',
        accent: 'text-amber-400',
    },
    rose_elegance: {
        bg: 'bg-rose-50/40 text-stone-900',
        heroBg: 'bg-gradient-to-br from-rose-700 via-pink-700 to-purple-900',
        heroText: 'text-white',
        cardBg: 'bg-white',
        cardBorder: 'border-rose-100',
        badgeBg: 'bg-rose-600 text-white',
        priceColor: 'text-rose-700',
        btnPrimary: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
        btnSecondary: 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200',
        accent: 'text-rose-600',
    }
};

const FONT_MAP = {
    'poppins': 'font-[Poppins]',
    'plus-jakarta': 'font-[Plus_Jakarta_Sans,sans-serif]',
    'inter': 'font-sans',
    'outfit': 'font-[Outfit,sans-serif]',
    'serif': 'font-serif',
    'mono': 'font-mono'
};

const DEFAULT_SECTIONS_ORDER = [
    'hero',
    'pricing',
    'cta_button',
    'features',
    'gallery',
    'paragraphs',
    'testimonials',
    'faq',
    'trust_badges',
    'footer'
];

const PublicLandingPageView = () => {
    const { slug } = useParams();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);
    const [carouselIdx, setCarouselIdx] = useState(0);

    useEffect(() => {
        const fetchLP = async () => {
            setLoading(true);
            setFetchError(false);
            try {
                const res = await getPublicLandingPage(slug);
                setPage(res.data);
            } catch (err) {
                console.error('Error loading landing page:', err);
                setFetchError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchLP();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
                <div className="w-14 h-14 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                <h3 className="text-sm font-bold text-slate-700">Memuat Landing Page...</h3>
            </div>
        );
    }

    if (fetchError || !page) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                    <span className="material-icons text-4xl">web_asset_off</span>
                </div>
                <h1 className="text-2xl font-black text-slate-800">Landing Page Tidak Ditemukan</h1>
                <p className="text-sm text-slate-500 mt-2 max-w-md">
                    Halaman dengan alamat <code>/lp/{slug}</code> tidak ditemukan atau telah dinonaktifkan oleh pemiliknya.
                </p>
                <Link
                    to="/"
                    className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition"
                >
                    Kembali ke Beranda
                </Link>
            </div>
        );
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));
    const isOwnerOrAdmin = currentUser && (currentUser.id === page.seller || currentUser.username === page.seller_username || currentUser.role === 'admin' || currentUser.username === 'admin');

    if (page.is_expired) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                    <span className="material-icons text-4xl">hourglass_disabled</span>
                </div>
                <h1 className="text-2xl font-black text-slate-800">Masa Aktif Landing Page Telah Berakhir</h1>
                <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                    Masa aktif landing page <strong>"{page.title}"</strong> ini sudah berakhir.
                    {isOwnerOrAdmin
                        ? ' Sebagai pemilik halaman, Anda dapat memperpanjang masa aktifnya di Dashboard Seller.'
                        : ' Silakan hubungi pemilik produk / toko untuk info ketersediaan penawaran.'}
                </p>
                {isOwnerOrAdmin ? (
                    <Link
                        to="/dashboard/landing-pages"
                        className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition"
                    >
                        Buka Dashboard & Perpanjang
                    </Link>
                ) : (
                    <Link
                        to="/"
                        className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition"
                    >
                        Kembali ke Beranda
                    </Link>
                )}
            </div>
        );
    }

    const theme = THEME_STYLES[page.theme] || THEME_STYLES.emerald;
    const fontClass = FONT_MAP[page.font_family] || 'font-sans';

    const getCtaHref = () => {
        if (page.cta_type === 'whatsapp') {
            const rawPhone = (page.whatsapp_number || '').replace(/[^0-9]/g, '');
            const phone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;
            const message = encodeURIComponent(
                page.whatsapp_message ||
                `Halo ${page.seller_name || page.title}, saya tertarik dengan penawaran Anda di halaman "${page.title}". Mohon info lengkapnya.`
            );
            return `https://wa.me/${phone}?text=${message}`;
        }
        return page.cta_link || '#';
    };

    const ctaHref = getCtaHref();
    const isExternal = page.cta_type === 'whatsapp' || (page.cta_link && page.cta_link.startsWith('http'));

    const carousel = Array.isArray(page.carousel_images) ? page.carousel_images : [];
    const features = Array.isArray(page.features) ? page.features : [];
    const testimonials = Array.isArray(page.testimonials) ? page.testimonials : [];
    const faqs = Array.isArray(page.faq_items) ? page.faq_items : [];
    const paragraphs = Array.isArray(page.paragraphs) ? page.paragraphs : [];

    const sectionsOrder = (Array.isArray(page.sections_order) && page.sections_order.length > 0)
        ? page.sections_order
        : DEFAULT_SECTIONS_ORDER;

    // Render Section Blocks
    const renderHero = () => (
        <section key="hero" className={`relative overflow-hidden ${theme.heroBg} ${theme.heroText} py-14 px-4 sm:px-6`}>
            <div className="max-w-3xl mx-auto text-center relative z-10">
                {page.badge_text && (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-5 shadow-xs">
                        <span className={theme.badgeBg + ' px-3 py-1 rounded-full text-xs font-bold'}>
                            {page.badge_text}
                        </span>
                    </div>
                )}
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
                    {page.hero_headline || page.title}
                </h1>
                <p className="text-sm sm:text-base opacity-90 max-w-2xl mx-auto leading-relaxed mb-6 font-normal">
                    {page.hero_subheadline || page.tagline || page.description}
                </p>
            </div>
            {page.hero_image && (
                <div className="max-w-3xl mx-auto mt-6 relative z-10">
                    <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 bg-white/10">
                        <img
                            src={getMediaUrl(page.hero_image)}
                            alt={page.title}
                            className="w-full h-auto max-h-[460px] object-cover"
                        />
                    </div>
                </div>
            )}
        </section>
    );

    const renderPricing = () => {
        if (!Number(page.price) && !Number(page.slash_price)) return null;
        return (
            <section key="pricing" className="text-center my-6">
                <div className="inline-block bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-lg text-center max-w-md w-full">
                    <span className="text-[11px] uppercase tracking-widest text-emerald-600 block mb-1 font-black">
                        Penawaran Spesial Terbatas
                    </span>
                    <div className="flex items-center justify-center gap-3 my-2">
                        {Number(page.slash_price) > 0 && (
                            <span className="text-base line-through text-slate-400 font-bold">
                                {formatIDR(page.slash_price)}
                            </span>
                        )}
                        <span className="text-3xl sm:text-4xl font-black text-emerald-700">
                            {Number(page.price) > 0 ? formatIDR(page.price) : 'Hubungi Kami'}
                        </span>
                    </div>
                    {page.cta_subtext && (
                        <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5 mt-2">
                            <span className="material-icons text-sm text-emerald-600">verified_user</span>
                            {page.cta_subtext}
                        </p>
                    )}
                </div>
            </section>
        );
    };

    const renderCtaButton = () => (
        <section key="cta_button" className="my-6 text-center max-w-md mx-auto px-4">
            <a
                href={ctaHref}
                target={isExternal ? '_blank' : '_self'}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className={`w-full py-4 px-8 rounded-2xl text-base font-black shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 ${theme.btnPrimary}`}
                style={{
                    backgroundColor: page.button_color || undefined,
                }}
            >
                {page.cta_type === 'whatsapp' && (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.078-1.782-.397-1.378-.57-2.28-1.954-2.35-2.046-.07-.092-.556-.741-.556-1.412 0-.671.353-.999.478-1.135.125-.136.273-.17.364-.17.091 0 .182.001.261.005.084.004.197-.032.308.234.113.272.387.944.421 1.013.034.069.057.149.011.239-.046.091-.069.148-.137.227-.069.079-.145.176-.208.236-.069.068-.141.142-.061.28.08.137.354.584.76 1.026.523.567.965.742 1.102.81.137.069.217.057.297-.034.08-.092.342-.398.433-.535.091-.137.183-.114.308-.068.125.045.798.376.935.445.137.069.228.102.262.16.034.057.034.331-.11.736z"/>
                    </svg>
                )}
                <span>{page.cta_text || 'Beli Sekarang'}</span>
                <span className="material-icons text-xl">arrow_forward</span>
            </a>
            {page.secondary_cta_text && (
                <a
                    href={page.secondary_cta_link || '#'}
                    className="mt-3 inline-block text-xs font-bold text-slate-500 hover:text-emerald-700 underline"
                >
                    {page.secondary_cta_text}
                </a>
            )}
        </section>
    );

    const renderFeatures = () => {
        if (features.length === 0) return null;
        return (
            <section key="features" className="space-y-6 my-6">
                <div className="text-center">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 block mb-1">
                        Kenapa Memilih Kami
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                        Keunggulan Utama
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {features.map((feat, idx) => (
                        <div
                            key={idx}
                            className={`p-5 rounded-2xl border shadow-xs flex items-start gap-4 transition hover:shadow-md ${theme.cardBg} ${theme.cardBorder}`}
                        >
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <span className="material-icons text-2xl">{feat.icon || 'check_circle'}</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-900 mb-1">{feat.title}</h4>
                                <p className="text-xs text-slate-500 leading-relaxed">{feat.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const renderGallery = () => {
        if (carousel.length === 0) return null;
        return (
            <section key="gallery" className="space-y-4 my-6">
                <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-100 aspect-video bg-black/5">
                    <img
                        src={getMediaUrl(carousel[carouselIdx])}
                        alt={`Slide ${carouselIdx + 1}`}
                        className="w-full h-full object-cover transition-all duration-500"
                    />
                    {carousel.length > 1 && (
                        <>
                            <button
                                onClick={() => setCarouselIdx((prev) => (prev > 0 ? prev - 1 : carousel.length - 1))}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition"
                            >
                                <span className="material-icons">chevron_left</span>
                            </button>
                            <button
                                onClick={() => setCarouselIdx((prev) => (prev < carousel.length - 1 ? prev + 1 : 0))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition"
                            >
                                <span className="material-icons">chevron_right</span>
                            </button>
                        </>
                    )}
                </div>
                {carousel.length > 1 && (
                    <div className="flex justify-center gap-2">
                        {carousel.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCarouselIdx(i)}
                                className={`w-3 h-3 rounded-full transition-all ${carouselIdx === i ? 'w-8 bg-emerald-600' : 'bg-slate-300'}`}
                            />
                        ))}
                    </div>
                )}
            </section>
        );
    };

    const renderParagraphs = () => {
        if (paragraphs.length === 0) return null;
        return (
            <section key="paragraphs" className="space-y-6 my-6">
                {paragraphs.map((p, idx) => (
                    <div key={idx} className={`p-6 sm:p-8 rounded-3xl border shadow-sm ${theme.cardBg} ${theme.cardBorder}`}>
                        {p.headline && (
                            <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900 leading-snug">
                                {p.headline}
                            </h3>
                        )}
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                            {p.content}
                        </p>
                    </div>
                ))}
            </section>
        );
    };

    const renderTestimonials = () => {
        if (testimonials.length === 0) return null;
        return (
            <section key="testimonials" className="space-y-6 my-6">
                <div className="text-center">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-amber-600 block mb-1">
                        Bukti Kepuasan
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                        Apa Kata Mereka?
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {testimonials.map((testi, idx) => (
                        <div
                            key={idx}
                            className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between ${theme.cardBg} ${theme.cardBorder}`}
                        >
                            <div>
                                <div className="flex items-center gap-1 text-amber-400 mb-3 text-sm">
                                    {Array.from({ length: Number(testi.rating || 5) }).map((_, i) => (
                                        <span key={i} className="material-icons text-base">star</span>
                                    ))}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-600 italic leading-relaxed mb-4">
                                    "{testi.review}"
                                </p>
                            </div>
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                {testi.avatar ? (
                                    <img
                                        src={getMediaUrl(testi.avatar)}
                                        alt={testi.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                                        {testi.name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <div>
                                    <h5 className="font-bold text-xs text-slate-900">{testi.name}</h5>
                                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                                        <span className="material-icons text-[12px]">verified</span> Pembeli Terverifikasi
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const renderFaq = () => {
        if (faqs.length === 0) return null;
        return (
            <section key="faq" className="space-y-4 my-6">
                <div className="text-center mb-6">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500 block mb-1">
                        Pertanyaan Umum
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                        Sering Ditanyakan (FAQ)
                    </h2>
                </div>
                <div className="space-y-3">
                    {faqs.map((faq, idx) => {
                        const isOpen = activeFaq === idx;
                        return (
                            <div
                                key={idx}
                                className={`rounded-2xl border transition-all ${theme.cardBg} ${theme.cardBorder}`}
                            >
                                <button
                                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                                    className="w-full p-4.5 text-left font-bold text-sm text-slate-900 flex items-center justify-between gap-3"
                                >
                                    <span>{faq.question}</span>
                                    <span className={`material-icons text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}>
                                        expand_more
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="px-4.5 pb-4.5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        );
    };

    const renderTrustBadges = () => {
        const badges = (Array.isArray(page.trust_badges) && page.trust_badges.length > 0)
            ? page.trust_badges
            : [
                { icon: 'verified', title: '100% Produk Original' },
                { icon: 'lock', title: 'Transaksi Aman & Terpercaya' },
                { icon: 'local_shipping', title: 'Pengiriman Cepat' },
                { icon: 'support_agent', title: 'Customer Support Ramah' }
            ];
        return (
            <section key="trust_badges" className="my-6 py-4 px-6 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-center">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {badges.map((b, i) => (
                        <div key={i} className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-xs">
                            <span className="material-icons text-emerald-600 text-base">{b.icon || 'verified'}</span>
                            <span>{b.title}</span>
                        </div>
                    ))}
                </div>
            </section>
        );
    };

    const renderFooter = () => (
        <footer key="footer" className="text-center text-xs text-slate-400 py-6 border-t border-slate-200 my-6">
            <p>© {new Date().getFullYear()} {page.title}. Diberdayakan oleh <Link to="/" className="text-emerald-600 font-bold hover:underline">Barakah Economy</Link></p>
        </footer>
    );

    const renderSectionById = (id) => {
        switch (id) {
            case 'hero': return renderHero();
            case 'pricing': return renderPricing();
            case 'cta_button': return renderCtaButton();
            case 'features': return renderFeatures();
            case 'gallery': return renderGallery();
            case 'paragraphs': return renderParagraphs();
            case 'testimonials': return renderTestimonials();
            case 'faq': return renderFaq();
            case 'trust_badges': return renderTrustBadges();
            case 'footer': return renderFooter();
            default: return null;
        }
    };

    return (
        <div className={`min-h-screen ${theme.bg} ${fontClass} selection:bg-emerald-500 selection:text-white`}>
            <Helmet>
                <title>{page.title} - Landing Page</title>
                <meta name="description" content={page.tagline || page.description || page.title} />
                <meta property="og:title" content={page.title} />
                <meta property="og:description" content={page.tagline || page.description} />
                {page.hero_image && <meta property="og:image" content={getMediaUrl(page.hero_image)} />}
            </Helmet>

            {/* Draft Notification for Seller / Admin */}
            {!page.is_published && isOwnerOrAdmin && (
                <div className="bg-amber-600 text-white text-xs font-bold py-2.5 px-4 text-center sticky top-0 z-50 shadow-md flex items-center justify-center gap-2">
                    <span className="material-icons text-sm">edit_note</span>
                    <span>Mode Draf / Pratinjau Pribadi — Masa aktif 1 bulan belum mulai dihitung sampai Anda mengaktifkan/mempublikasikannya.</span>
                    <Link to="/dashboard/landing-pages" className="underline ml-2 bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded text-[11px]">
                        Buka Dashboard
                    </Link>
                </div>
            )}

            {/* Top Minimal Navigation Bar */}
            <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-100 shadow-2xs">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {page.logo ? (
                            <img
                                src={getMediaUrl(page.logo)}
                                alt={page.title}
                                className="w-9 h-9 rounded-xl object-cover shadow-xs border border-slate-100"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                                {page.title?.charAt(0)?.toUpperCase() || 'B'}
                            </div>
                        )}
                        <div>
                            <h2 className="text-sm font-bold text-slate-800 leading-tight">{page.title}</h2>
                            {page.tagline && <p className="text-[11px] text-slate-500 line-clamp-1">{page.tagline}</p>}
                        </div>
                    </div>
                    <a
                        href={ctaHref}
                        target={isExternal ? '_blank' : '_self'}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95 ${theme.btnPrimary}`}
                    >
                        {page.cta_text || 'Beli Sekarang'}
                    </a>
                </div>
            </header>

            {/* DYNAMIC SECTIONS RENDERED ACCORDING TO USER CONFIGURATION */}
            {sectionsOrder.map((sectionId) => {
                if (sectionId === 'hero') {
                    return <React.Fragment key="hero">{renderHero()}</React.Fragment>;
                }
                return (
                    <main key={sectionId} className="max-w-3xl mx-auto px-4">
                        {renderSectionById(sectionId)}
                    </main>
                );
            })}

            {/* FIXED FLOATING WHATSAPP BUTTON */}
            {page.whatsapp_number && (
                <a
                    href={`https://wa.me/${page.whatsapp_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(page.whatsapp_message || `Halo, saya ingin tanya seputar ${page.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#1EBE5D] text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                    title="Chat via WhatsApp"
                >
                    <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.078-1.782-.397-1.378-.57-2.28-1.954-2.35-2.046-.07-.092-.556-.741-.556-1.412 0-.671.353-.999.478-1.135.125-.136.273-.17.364-.17.091 0 .182.001.261.005.084.004.197-.032.308.234.113.272.387.944.421 1.013.034.069.057.149.011.239-.046.091-.069.148-.137.227-.069.079-.145.176-.208.236-.069.068-.141.142-.061.28.08.137.354.584.76 1.026.523.567.965.742 1.102.81.137.069.217.057.297-.034.08-.092.342-.398.433-.535.091-.137.183-.114.308-.068.125.045.798.376.935.445.137.069.228.102.262.16.034.057.034.331-.11.736z"/>
                    </svg>
                </a>
            )}
        </div>
    );
};

export default PublicLandingPageView;
