// pages/DigitalProductDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getDigitalProductBySlug, getDigitalProducts, toggleLikeDigitalProduct } from '../services/digitalProductApi';
import { getMediaUrl } from '../utils/mediaUtils';
import { formatCurrency } from '../utils/formatters';
import UserProfileModal from '../components/modals/UserProfileModal';
import ShareButton from '../components/campaigns/ShareButton';
import '../styles/Body.css';

const formatIDR = (amount) => {
    if (!amount || Number(amount) <= 0) return 'GRATIS';
    return 'Rp ' + formatCurrency(amount);
};

const getCategoryIcon = (categoryKey = '') => {
    const cat = String(categoryKey).toLowerCase();
    if (cat.includes('buku') || cat.includes('ebook') || cat.includes('e-book') || cat.includes('pdf')) return 'menu_book';
    if (cat.includes('desain') || cat.includes('template') || cat.includes('grafis')) return 'design_services';
    if (cat.includes('video') || cat.includes('audio') || cat.includes('musik')) return 'smart_display';
    if (cat.includes('software') || cat.includes('script') || cat.includes('code') || cat.includes('aplikasi')) return 'code';
    if (cat.includes('kursus') || cat.includes('edukasi') || cat.includes('modul')) return 'school';
    if (cat.includes('bisnis') || cat.includes('marketing') || cat.includes('iklan')) return 'trending_up';
    return 'category';
};

const DigitalProductDetailPage = () => {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [liking, setLiking] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await getDigitalProductBySlug(slug);
                setProduct(res.data);
                setIsLiked(res.data.is_liked);
                setLikesCount(res.data.likes_count);
            } catch (err) {
                console.error('Error fetching digital product:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [slug]);

    const [recommendedProducts, setRecommendedProducts] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);

    useEffect(() => {
        if (!product) return;
        const fetchRecommendations = async () => {
            try {
                setLoadingRecommendations(true);
                const res = await getDigitalProducts();
                const all = res.data || [];
                const currentProdId = String(product.id);
                const currentProdSlug = String(product.slug || '');
                const currentCategory = String(product.category || '').toLowerCase().trim();

                const others = all.filter(p => String(p.id) !== currentProdId && String(p.slug || '') !== currentProdSlug);

                const sameCategory = others.filter(p => {
                    if (!currentCategory || !p.category) return false;
                    return String(p.category).toLowerCase().trim() === currentCategory;
                });

                const diffCategory = others.filter(p => {
                    if (!currentCategory || !p.category) return true;
                    return String(p.category).toLowerCase().trim() !== currentCategory;
                });

                const shuffle = (arr) => {
                    const copy = [...arr];
                    for (let i = copy.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [copy[i], copy[j]] = [copy[j], copy[i]];
                    }
                    return copy;
                };

                const result = [...shuffle(sameCategory), ...shuffle(diffCategory)].slice(0, 8);
                setRecommendedProducts(result);
            } catch (err) {
                console.error('Error fetching recommended digital products:', err);
            } finally {
                setLoadingRecommendations(false);
            }
        };
        fetchRecommendations();
    }, [product?.id, product?.slug, product?.category]);

    const handleToggleLike = async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            alert('Anda harus login terlebih dahulu untuk memberikan like.');
            return;
        }

        setLiking(true);
        const prevIsLiked = isLiked;
        const prevLikesCount = likesCount;
        setIsLiked(!prevIsLiked);
        setLikesCount(prevLikesCount + (prevIsLiked ? -1 : 1));

        try {
            const res = await toggleLikeDigitalProduct(product.slug || product.id);
            setIsLiked(res.data.liked);
            setLikesCount(res.data.likes_count);
        } catch (err) {
            console.error('Error toggling like:', err);
            setIsLiked(prevIsLiked);
            setLikesCount(prevLikesCount);
        } finally {
            setLiking(false);
        }
    };

    if (loading) {
        return (
            <div className="body bg-gray-50 min-h-screen">
                <Header />
                <div className="flex flex-col justify-center items-center py-24">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-3"></div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat produk digital...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="body bg-gray-50 min-h-screen">
                <Header />
                <div className="text-center py-20 px-4 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <span className="material-icons text-3xl">inventory_2</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 mb-1">Produk Tidak Ditemukan</h2>
                    <p className="text-xs text-gray-500 mb-4">Produk digital ini mungkin sudah tidak aktif atau tautan telah kedaluwarsa.</p>
                    <Link
                        to="/digital-products"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                        <span className="material-icons text-sm">arrow_back</span>
                        Kembali ke Katalog Digital
                    </Link>
                </div>
                <NavigationButton />
            </div>
        );
    }

    const productSlug = product.slug || product.id;
    const checkoutLink = `/digital-products/${productSlug}/checkout`;

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>{product.title} - Produk Digital | Barakah Economy</title>
                <meta name="description" content={product.description?.replace(/<[^>]*>?/gm, '').substring(0, 160) || `Download produk digital ${product.title} di Barakah Economy.`} />
                <meta property="og:title" content={`${product.title} - Produk Digital`} />
                <meta property="og:description" content={product.description?.replace(/<[^>]*>?/gm, '').substring(0, 160) || `Download produk digital ${product.title} di Barakah Economy.`} />
                <meta property="og:image" content={getMediaUrl(product.thumbnail_url || product.thumbnail)} />
                <meta property="og:type" content="product" />
                <meta property="og:url" content={window.location.href} />
                <link rel="canonical" href={window.location.href} />

                {/* Schema.org JSON-LD Structured Data */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Product",
                        "name": product.title,
                        "description": product.description?.replace(/<[^>]*>?/gm, '').substring(0, 200),
                        "image": [getMediaUrl(product.thumbnail_url || product.thumbnail)],
                        "category": product.category || "Digital Product",
                        "offers": {
                            "@type": "Offer",
                            "price": String(product.price || 0),
                            "priceCurrency": "IDR",
                            "availability": "https://schema.org/InStock",
                            "url": window.location.href
                        }
                    })}
                </script>
            </Helmet>

            <Header />

            <div className="pb-36 max-w-6xl mx-auto px-4 pt-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 overflow-x-auto whitespace-nowrap">
                    <Link to="/" className="hover:text-emerald-700 transition">Beranda</Link>
                    <span className="text-gray-300">/</span>
                    <Link to="/digital-products" className="hover:text-emerald-700 transition">Produk Digital</Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-800 font-semibold truncate max-w-[200px] md:max-w-md">{product.title}</span>
                </div>

                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row">
                    {/* Thumbnail Image */}
                    <div className="md:w-1/2 p-4 md:p-6 bg-gray-50 flex items-center justify-center">
                        <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white">
                            {product.category && (
                                <div className="absolute top-3 left-3 z-10 bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-black px-3 py-1 rounded-xl shadow uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-icons text-xs">{getCategoryIcon(product.category)}</span>
                                    {product.category}
                                </div>
                            )}
                            <img
                                src={getMediaUrl(product.thumbnail_url || product.thumbnail) || '/placeholder-image.jpg'}
                                alt={product.title}
                                className="w-full h-72 md:h-96 object-cover"
                                onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                            />
                            <div className="absolute top-3 right-3 z-10">
                                <ShareButton
                                    slug={product.slug || product.id}
                                    title={product.title}
                                    type="digital_product"
                                    username={product.seller_name}
                                    price={product.price}
                                    description={product.description}
                                    variant="card-icon"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
                        <div>
                            {/* Title & Share */}
                            <div className="flex justify-between items-start gap-4 mb-2">
                                <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight leading-snug">
                                    {product.title}
                                </h1>
                            </div>

                            {/* Creator info & Views */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <img
                                        src={getMediaUrl(product.seller_avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller_name || 'Kreator')}&background=random`}
                                        alt={product.seller_name}
                                        className="w-7 h-7 rounded-full object-cover border border-emerald-100"
                                    />
                                    <div className="text-xs">
                                        <span className="text-gray-400 block text-[10px]">Kreator Produk</span>
                                        <Link
                                            to={`/digital-produk/${product.seller_name}`}
                                            className="text-emerald-700 font-bold hover:underline"
                                        >
                                            @{product.seller_name}
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <div className="flex items-center gap-1" title="Dilihat">
                                        <span className="material-icons text-sm text-emerald-600">visibility</span>
                                        <span className="font-semibold text-gray-600">{product.view_count || 0}</span>
                                    </div>
                                    <button
                                        onClick={handleToggleLike}
                                        disabled={liking}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-xl transition-all active:scale-90 ${
                                            isLiked ? 'bg-red-50 text-red-600 border border-red-100 font-bold' : 'bg-gray-50 text-gray-500 border border-gray-200'
                                        }`}
                                    >
                                        <span className={`material-icons text-sm ${isLiked ? 'text-red-500' : 'text-gray-400'}`}>
                                            {isLiked ? 'favorite' : 'favorite_border'}
                                        </span>
                                        <span>{likesCount}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Price Section */}
                            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 mb-6">
                                <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-0.5">
                                    Harga Produk Digital
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl md:text-3xl font-black text-emerald-700">
                                        {formatIDR(product.price)}
                                    </p>
                                    <span className="text-xs text-gray-400 font-medium">/ akses instan</span>
                                </div>
                            </div>

                            {/* Info Banner */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-6 text-xs text-amber-800 flex items-start gap-2.5">
                                <span className="material-icons text-amber-600 text-lg shrink-0">mark_email_read</span>
                                <p className="leading-relaxed">
                                    File / tautan akses produk digital akan dikirimkan otomatis ke email Anda setelah pembayaran terverifikasi.
                                </p>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                                    <span className="material-icons text-emerald-600 text-base">description</span>
                                    Deskripsi Produk
                                </h2>
                                <div
                                    className="text-xs md:text-sm text-gray-600 leading-relaxed rich-text-content whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-2xl border border-gray-100"
                                    dangerouslySetInnerHTML={{ __html: product.description || 'Tidak ada deskripsi rinci untuk produk digital ini.' }}
                                />
                            </div>
                        </div>

                        {/* Buy button for desktop */}
                        <div className="hidden md:block pt-4 border-t border-gray-100">
                            <Link
                                to={checkoutLink}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95"
                            >
                                <span className="material-icons text-base">shopping_bag</span>
                                Beli Sekarang • {formatIDR(product.price)}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Fixed buy bar for mobile */}
                <div className="md:hidden fixed bottom-16 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 flex items-center gap-2 shadow-lg">
                    <ShareButton
                        slug={product.slug || product.id}
                        title={product.title}
                        type="digital_product"
                        username={product.seller_name}
                        price={product.price}
                        description={product.description}
                        variant="icon"
                    />
                    <Link
                        to={checkoutLink}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                        <span className="material-icons text-sm">shopping_bag</span>
                        Beli: {formatIDR(product.price)}
                    </Link>
                </div>

                {/* Rekomendasi Produk Digital Lainnya */}
                {recommendedProducts.length > 0 && (
                    <div className="mt-14 pt-8 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-emerald-600 rounded-full"></span>
                                <h2 className="text-base md:text-xl font-black text-gray-900 tracking-tight">
                                    Rekomendasi Produk Digital Lainnya
                                </h2>
                            </div>
                            <Link 
                                to="/digital-products" 
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
                            >
                                <span>Lihat Semua Produk Digital</span>
                                <span className="material-icons text-sm">chevron_right</span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                            {recommendedProducts.map((rec) => {
                                const recSlug = rec.slug || rec.id;
                                const isFree = !rec.price || Number(rec.price) <= 0;

                                return (
                                    <div 
                                        key={rec.id} 
                                        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group"
                                    >
                                        <div className="relative">
                                            {rec.category && (
                                                <div className="absolute top-2 left-2 z-10 bg-emerald-600/95 backdrop-blur-xs text-white text-[9px] font-black px-2.5 py-1 rounded-xl shadow uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-icons text-[11px]">{getCategoryIcon(rec.category)}</span>
                                                    {rec.category}
                                                </div>
                                            )}
                                            {isFree && (
                                                <div className="absolute top-2 right-10 z-10 bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow uppercase">
                                                    GRATIS
                                                </div>
                                            )}
                                            <Link to={`/digital-products/${recSlug}`}>
                                                <img
                                                    src={getMediaUrl(rec.thumbnail_url || rec.thumbnail) || '/placeholder-image.jpg'}
                                                    alt={rec.title}
                                                    className="w-full h-36 md:h-44 object-cover group-hover:scale-105 transition-transform duration-300 bg-gray-50"
                                                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                                />
                                            </Link>
                                            <div className="absolute top-2 right-2 z-10">
                                                <ShareButton
                                                    slug={recSlug}
                                                    title={rec.title}
                                                    type="digital_product"
                                                    username={rec.seller_name}
                                                    price={rec.price}
                                                    description={rec.description}
                                                    variant="card-icon"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-3.5 flex flex-col flex-1 justify-between">
                                            <div>
                                                <div className="flex items-center gap-1 text-gray-500 text-[10px] font-medium mb-1">
                                                    <span className="material-icons text-[12px] text-emerald-600 shrink-0">verified</span>
                                                    <span className="truncate max-w-[130px]" title={rec.seller_name}>
                                                        @{rec.seller_name}
                                                    </span>
                                                </div>

                                                <h3 className="text-xs md:text-sm font-semibold mb-1.5 line-clamp-2 min-h-[36px] text-gray-800 hover:text-emerald-700 transition-colors">
                                                    <Link to={`/digital-products/${recSlug}`}>
                                                        {rec.title}
                                                    </Link>
                                                </h3>

                                                <div className="mb-2">
                                                    <p className="text-emerald-700 font-bold text-sm">
                                                        {formatIDR(rec.price)}
                                                    </p>
                                                    <div className="flex items-center justify-between text-[10px] mt-0.5 text-gray-400">
                                                        <span>format: digital download</span>
                                                        {rec.sold_count > 0 && (
                                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                                                                {rec.sold_count} terjual
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <Link
                                                to={`/digital-products/${recSlug}`}
                                                className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all text-[11px] border border-emerald-200 mt-2"
                                            >
                                                <span>Lihat Detail</span>
                                                <span className="material-icons text-xs">arrow_forward</span>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <NavigationButton />
            <UserProfileModal
                userId={selectedUserId}
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
};

export default DigitalProductDetailPage;
