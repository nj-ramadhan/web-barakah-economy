// pages/DigitalProductCheckoutPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import { getDigitalProductBySlug, createDigitalOrder } from '../services/digitalProductApi';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

const formatIDR = (amount) => {
    if (amount === 0 || amount === '0' || amount === 0.00) return 'Gratis';
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};


const DigitalProductCheckoutPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [buyerName, setBuyerName] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await getDigitalProductBySlug(slug);
                setProduct(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();

        // Auto-fill if logged in
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setBuyerName(user.username || '');
            setBuyerEmail(user.email || '');
            setBuyerPhone(user.phone || '');
        }
    }, [slug]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!buyerName || !buyerEmail || !buyerPhone) {
            alert('Mohon lengkapi semua data');
            return;
        }
        setSubmitting(true);
        try {
            const res = await createDigitalOrder({
                digital_product: product.id,
                buyer_name: buyerName,
                buyer_email: buyerEmail,
                buyer_phone: buyerPhone,
                amount: product.price,
            });

            if (product.price == 0) {
                alert('Pesanan berhasil! Silakan cek email Anda untuk link produk digital.');
                navigate('/digital-products');
            } else {
                navigate(`/digital-products/payment/${res.data.order_number}`);
            }
        } catch (err) {
            console.error(err);
            alert('Gagal membuat pesanan. Silakan coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

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
            </div>
        );
    }

    const isFree = product.price == 0;

    return (
        <div className="body">
            <Helmet>
                <title>Checkout - {product.title}</title>
            </Helmet>

            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-8">
                <h1 className="text-lg font-bold mb-4">Checkout</h1>

                {/* Product Summary */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl mb-6">
                    <img
                        src={getMediaUrl(product.thumbnail_url || product.thumbnail) || '/placeholder-image.jpg'}
                        alt={product.title}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                    />
                    <div className="flex-1">
                        <h2 className="font-semibold text-sm line-clamp-2">{product.title}</h2>
                        <p className="text-green-700 font-bold text-sm mt-1">{formatIDR(product.price)}</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                        <input
                            type="text"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="Masukkan nama lengkap"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="email@contoh.com"
                            required
                        />
                        <p className="text-xs text-gray-400 mt-1">Produk digital akan dikirim ke email ini</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                        <input
                            type="tel"
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="08xxxxxxxxxx"
                            required
                        />
                    </div>

                    {/* Total */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700">Total Pembayaran</span>
                            <span className="text-xl font-bold text-green-700">{formatIDR(product.price)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-green-800 transition disabled:opacity-50"
                    >
                        {submitting ? 'Memproses...' : (isFree ? 'Dapatkan Sekarang' : 'Lanjut ke Pembayaran')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DigitalProductCheckoutPage;
