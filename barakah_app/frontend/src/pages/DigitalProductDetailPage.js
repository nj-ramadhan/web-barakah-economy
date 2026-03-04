// pages/DigitalProductDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getDigitalProductBySlug } from '../services/digitalProductApi';
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const DigitalProductDetailPage = () => {
    const { slug } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

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

            <div className="pb-24">
                <img
                    src={product.thumbnail || '/placeholder-image.jpg'}
                    alt={product.title}
                    className="w-full h-56 object-cover"
                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                />

                <div className="px-4 py-4">
                    <span className="inline-block text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full mb-2">{product.category}</span>
                    <h1 className="text-xl font-bold text-gray-900 mb-1">{product.title}</h1>
                    <p className="text-xs text-gray-400 mb-3">oleh {product.seller_name}</p>
                    <p className="text-2xl font-bold text-green-700 mb-4">{formatIDR(product.price)}</p>

                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <h2 className="font-semibold text-gray-800 mb-2">Deskripsi</h2>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm text-blue-700">
                        <span className="material-icons text-sm align-middle mr-1">info</span>
                        Produk digital akan dikirim ke email Anda setelah pembayaran berhasil diverifikasi.
                    </div>
                </div>

                {/* Fixed buy button */}
                <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 pb-2">
                    <Link
                        to={`/digital-products/${product.slug}/checkout`}
                        className="block w-full text-center bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-800 transition"
                    >
                        Beli Sekarang - {formatIDR(product.price)}
                    </Link>
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default DigitalProductDetailPage;
