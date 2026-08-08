import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getMediaUrl } from '../../utils/mediaUtils';

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

const SlideOverCartDrawer = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchCartItems = useCallback(async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        try {
            setLoading(true);
            const user = JSON.parse(userStr);
            if (!user.access) return;

            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setCartItems(res.data || []);
        } catch (err) {
            console.error('Error fetching cart for drawer:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleCartUpdate = (event) => {
            fetchCartItems();
            if (event.detail && (event.detail.openDrawer || event.detail.showToast)) {
                setIsOpen(true);
            }
        };

        const handleOpenCartDrawer = () => {
            fetchCartItems();
            setIsOpen(true);
        };

        window.addEventListener('cartUpdated', handleCartUpdate);
        window.addEventListener('openCartDrawer', handleOpenCartDrawer);
        return () => {
            window.removeEventListener('cartUpdated', handleCartUpdate);
            window.removeEventListener('openCartDrawer', handleOpenCartDrawer);
        };
    }, [fetchCartItems]);

    const handleUpdateQty = async (cartItemId, newQty) => {
        if (newQty < 1) return;
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                cart_item_id: cartItemId,
                quantity: newQty
            }, {
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
            });

            fetchCartItems();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveItem = async (productId) => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                data: { product_id: productId },
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
            });

            fetchCartItems();
        } catch (err) {
            console.error(err);
        }
    };

    const getItemPrice = (item) => {
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

    const totalGrandPrice = cartItems.reduce((sum, item) => {
        const itemPrice = getItemPrice(item);
        return sum + (itemPrice * item.quantity);
    }, 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop Overlay */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
                onClick={() => setIsOpen(false)}
            ></div>

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-100 dark:border-gray-800">
                    
                    {/* Drawer Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-emerald-600 text-2xl">shopping_cart</span>
                            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Keranjang Belanja</h2>
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                {cartItems.length}
                            </span>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        >
                            <span className="material-icons text-xl">close</span>
                        </button>
                    </div>

                    {/* Drawer Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                        ) : cartItems.length === 0 ? (
                            <div className="text-center py-16">
                                <span className="material-icons text-5xl text-gray-300 mb-2">remove_shopping_cart</span>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Keranjang Belanja Kosong</p>
                                <p className="text-xs text-gray-400 mt-1">Tambahkan produk impian Anda dari katalog marketplace</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {cartItems.map((item) => {
                                    const thumbUrl = getMediaUrl(item.product?.thumbnail || item.product?.thumbnail_url);
                                    const itemPrice = getItemPrice(item);

                                    return (
                                        <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-3 items-center">
                                            <img 
                                                src={thumbUrl || '/placeholder-image.jpg'} 
                                                alt={item.product?.title} 
                                                className="w-16 h-16 object-cover rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 shrink-0"
                                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.jpg'; }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.product?.title}</h4>
                                                {item.variation && (
                                                    <span className="text-[10px] text-emerald-600 font-semibold block">{item.variation.name}</span>
                                                )}
                                                <p className="text-xs font-black text-emerald-600 mt-1">{formatIDR(itemPrice)}</p>
                                                
                                                <div className="flex items-center gap-2 mt-2">
                                                    <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-0.5">
                                                        <button 
                                                            onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                                            disabled={item.quantity <= 1}
                                                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-emerald-600 disabled:opacity-30"
                                                        >
                                                            <span className="material-icons text-xs">remove</span>
                                                        </button>
                                                        <span className="w-6 text-center text-xs font-bold text-gray-800 dark:text-gray-200">{item.quantity}</span>
                                                        <button 
                                                            onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-emerald-600"
                                                        >
                                                            <span className="material-icons text-xs">add</span>
                                                        </button>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveItem(item.product?.id || item.product)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Hapus"
                                                    >
                                                        <span className="material-icons text-xs">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Drawer Footer */}
                    {cartItems.length > 0 && (
                        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
                            <div className="flex justify-between items-center text-sm font-black text-gray-900 dark:text-white">
                                <span>Total Pembayaran:</span>
                                <span className="text-emerald-600 text-base">{formatIDR(totalGrandPrice)}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/ecommerce/checkout-sinergy');
                                }}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-emerald-900/30 hover:scale-[1.01] transition-transform"
                            >
                                Checkout Sekarang
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/keranjang');
                                }}
                                className="w-full py-2.5 text-xs text-gray-500 hover:text-emerald-600 font-bold transition text-center"
                            >
                                Lihat Keranjang Lengkap →
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SlideOverCartDrawer;
