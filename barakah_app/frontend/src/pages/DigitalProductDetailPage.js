// pages/DigitalProductDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getDigitalProductBySlug } from '../services/digitalProductApi';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const DigitalProductDetailPage = () => {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [shareMessage, setShareMessage] = useState('');

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/api/digital-products/share/${product.seller_name}/${product.slug}`;
        const title = `Cek produk digital ini: ${product.title}`;

        if (navigator.share) {
            navigator.share({
                title: title,
                url: shareUrl
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    setShareMessage('Link berhasil disalin!');
                    setTimeout(() => setShareMessage(''), 3000);
                })
                .catch(err => {
                    console.error('Gagal menyalin link:', err);
                });
        }
    };

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await getDigitalProductBySlug(slug);
                setProduct(res.data);
            } catch (err) {
                console.error('Error fetching digital product:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [slug]);

    if (loading) {
        return (
            <div className="body">
                <Header />
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="body">
                <Header />
                <div className="text-center py-20 text-gray-500">Produk tidak ditemukan</div>
                <NavigationButton />
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>{product.title} - Barakah Economy</title>
                <meta name="description" content={product.description?.substring(0, 150)} />
            </Helmet>

            <Header />

            <div className="pb-40 max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col md:flex-row mx-4 mt-4">
                    <div className="md:w-1/2">
                        <img
                            src={getMediaUrl(product.thumbnail_url || product.thumbnail) || '/placeholder-image.jpg'}
                            alt={product.title}
                            className="w-full h-64 md:h-full object-cover"
                            onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                        />
                    </div>

                    <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-between">
                        <div>
                            <span className="inline-block text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full mb-4">{product.category}</span>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-sm text-gray-400 flex items-center gap-1">
                                    <span className="material-icons text-sm">person</span>
                                    oleh <Link to={`/digital_produk/${product.seller_name}`} className="text-green-700 font-medium hover:underline">@{product.seller_name}</Link>
                                </p>
                                <p className="text-sm text-gray-400 flex items-center gap-1 opacity-60">
                                    <span className="material-icons text-sm">visibility</span>
                                    {product.view_count || 0} orang telah melihat
                                </p>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <p className="text-3xl font-bold text-green-700">{formatIDR(product.price)}</p>
                                <button
                                    onClick={handleShare}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition relative flex items-center justify-center"
                                    title="Bagikan produk"
                                >
                                    <span className="material-icons">share</span>
                                    {shareMessage && (
                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                                            {shareMessage}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="material-icons text-sm">description</span>
                                    Deskripsi
                                </h2>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                            </div>

                            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-700 flex items-start gap-3">
                                <span className="material-icons text-lg">info</span>
                                <p>Produk digital akan dikirim ke email Anda setelah pembayaran berhasil diverifikasi. Pastikan email Anda aktif.</p>
                            </div>
                        </div>

                        {/* Buy button for desktop - visible only on md+ */}
                        <div className="hidden md:block">
                            <Link
                                to={`/digital-products/${product.slug}/checkout`}
                                className="block w-full text-center bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-800 transition"
                            >
                                Beli Sekarang - {formatIDR(product.price)}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Fixed buy button for mobile - hidden on md+ */}
                <div className="md:hidden fixed bottom-24 left-0 right-0 max-w-md mx-auto px-4 pb-2 z-40 flex gap-2">
                    <button
                        onClick={handleShare}
                        className="bg-white border border-gray-200 text-gray-600 p-3 rounded-xl shadow-lg flex items-center justify-center relative"
                    >
                        <span className="material-icons">share</span>
                        {shareMessage && (
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                                {shareMessage}
                            </span>
                        )}
                    </button>
                    <Link
                        to={`/digital-products/${product.slug}/checkout`}
                        className="flex-1 text-center bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-800 transition"
                    >
                        Beli: {formatIDR(product.price)}
                    </Link>
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default DigitalProductDetailPage;
