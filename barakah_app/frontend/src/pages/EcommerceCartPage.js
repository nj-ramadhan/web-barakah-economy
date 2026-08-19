// pages/EcommerceCartPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

function getCsrfToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        return value;
      }
    }
    return null;
}

const formatIDR = (amount) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount || 0);
};

const EcommerceCartPage = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCartItems = useCallback(async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) {
                navigate('/login');
                return;
            }
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                headers: {
                    Authorization: `Bearer ${user.access}`,
                },
            });
            setCartItems(response.data || []);
        } catch (error) {
            console.error('Error fetching cart items:', error);
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchCartItems();
    }, [fetchCartItems]);

    const removeFromCart = async (productId) => {
        if (!window.confirm('Hapus produk ini dari keranjang?')) return;
        const csrfToken = getCsrfToken();
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) return;

            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                data: { product_id: productId },
                headers: {
                    Authorization: `Bearer ${user.access}`,
                    'X-CSRFToken': csrfToken,
                },
            });

            window.dispatchEvent(new CustomEvent('cartUpdated'));
            fetchCartItems();
        } catch (error) {
            console.error('Error removing item from cart:', error);
            alert('Gagal menghapus item dari keranjang.');
        }
    };

    const handleUpdateQty = async (cartItemId, newQty) => {
        if (newQty < 1) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) return;

            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                cart_item_id: cartItemId,
                quantity: newQty
            }, {
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
            });
            
            fetchCartItems();
            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (error) {
            console.error('Error updating quantity:', error);
            alert('Gagal memperbarui jumlah.');
        }
    };

    const getItemOriginalPrice = (item) => {
        if (!item) return 0;
        const prodP = Number(item.product?.price) || 0;
        let varP = 0;
        if (item.variation) {
            if (item.variation.additional_price !== undefined && item.variation.additional_price !== null) {
                varP = Number(item.variation.additional_price) || 0;
            } else if (item.variation.price !== undefined && item.variation.price !== null) {
                varP = Number(item.variation.price) || 0;
            }
        }
        if (varP >= prodP && prodP > 0) return varP;
        return prodP + varP;
    };

    const getItemPrice = (item) => {
        const base = getItemOriginalPrice(item);
        const promo = item.product?.active_promotion;
        if (!promo) return base;

        if (promo.discount_type === 'percentage') {
            return base - (base * (Number(promo.discount_value) / 100));
        } else if (promo.discount_type === 'nominal') {
            return Math.max(0, base - Number(promo.discount_value));
        } else if (promo.discount_type === 'min_qty_discount' && item.quantity >= Number(promo.min_quantity || 1)) {
            if (promo.is_min_qty_percentage) {
                return base - (base * (Number(promo.discount_value) / 100));
            } else {
                return Math.max(0, base - Number(promo.discount_value));
            }
        }
        return base;
    };

    const totalGrandPrice = cartItems.reduce((sum, item) => {
        const itemPrice = getItemPrice(item);
        return sum + (itemPrice * item.quantity);
    }, 0);

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Keranjang Belanja - Barakah Economy</title></Helmet>
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Keranjang Belanja</h1>
                        <p className="text-xs text-gray-500 font-medium">Kelola produk impian Anda sebelum checkout</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat keranjang...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm my-6">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                            <span className="material-icons text-4xl">shopping_cart</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Keranjang Belanja Anda Kosong</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto mb-6">Jelajahi produk fisik berkualitas di E-Commerce Barakah Community sekarang!</p>
                        <Link
                            to="/store"
                            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                        >
                            Mulai Belanja
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <div className="divide-y divide-gray-100">
                                {cartItems.map((item) => {
                                    const thumbUrl = getMediaUrl(item.product?.thumbnail || item.product?.thumbnail_url);
                                    const itemPrice = getItemPrice(item);

                                    return (
                                        <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100 relative">
                                                    <img 
                                                        src={thumbUrl || '/placeholder-image.jpg'} 
                                                        alt={item.product?.title || 'Produk'}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/placeholder-image.jpg';
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{item.product?.title}</h3>
                                                    {item.variation && (
                                                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                            Variasi: {item.variation.name}
                                                        </span>
                                                    )}
                                                    {item.product?.active_promotion && (
                                                         <span className="inline-block ml-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                             Promo
                                                         </span>
                                                     )}
                                                     <div className="flex items-baseline gap-1.5 mt-1.5">
                                                         <p className="text-xs font-black text-emerald-600">
                                                             {formatIDR(itemPrice)}
                                                         </p>
                                                         {getItemOriginalPrice(item) > itemPrice && (
                                                             <span className="text-[10px] text-gray-400 line-through">
                                                                 {formatIDR(getItemOriginalPrice(item))}
                                                             </span>
                                                         )}
                                                     </div>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Stok: {item.product?.stock || item.product?.total_stock || 'Tersedia'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50">
                                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
                                                    <button
                                                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                                        disabled={item.quantity <= 1}
                                                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-white transition disabled:opacity-30"
                                                    >
                                                        <span className="material-icons text-sm">remove</span>
                                                    </button>
                                                    <span className="w-8 text-center text-xs font-black text-gray-800">{item.quantity}</span>
                                                    <button
                                                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                                        disabled={item.quantity >= (item.product?.stock || 99)}
                                                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-white transition disabled:opacity-30"
                                                    >
                                                        <span className="material-icons text-sm">add</span>
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => removeFromCart(item.product?.id || item.product)}
                                                    className="w-9 h-9 flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition"
                                                    title="Hapus Produk"
                                                >
                                                    <span className="material-icons text-sm">delete_outline</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary Sticky Bar */}
                        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 z-40">
                            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Harga ({cartItems.length} Produk)</span>
                                    <span className="text-lg font-black text-emerald-700">{formatIDR(totalGrandPrice)}</span>
                                </div>
                                <button
                                    onClick={() => navigate('/ecommerce/checkout-sinergy')}
                                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Lanjut ke Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default EcommerceCartPage;