// pages/EcommerceCartPage.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
    const [selectedItemIds, setSelectedItemIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [processingItem, setProcessingItem] = useState(null);

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
            const data = response.data || [];
            setCartItems(data);

            // Inisialisasi item yang dipilih:
            // Ambil yang is_selected true dari backend; jika belum ada atau semua true, pilih semua
            const selectedFromBackend = data.filter(it => it.is_selected !== false).map(it => it.id);
            if (selectedFromBackend.length > 0) {
                setSelectedItemIds(new Set(selectedFromBackend));
            } else if (data.length > 0) {
                setSelectedItemIds(new Set(data.map(it => it.id)));
            } else {
                setSelectedItemIds(new Set());
            }
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

    // Helper perhitungan harga
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

    // Kelompokkan cart items berdasarkan Seller / Toko
    const storeGroups = useMemo(() => {
        const map = {};
        cartItems.forEach((item) => {
            const sellerKey = String(item.product?.seller_id || item.product?.seller || '0');
            if (!map[sellerKey]) {
                const storeName = item.product?.seller_shop_name || item.product?.seller_name || (sellerKey === '0' ? 'Toko Resmi Barakah' : `Toko #${sellerKey}`);
                map[sellerKey] = {
                    sellerId: sellerKey,
                    storeName,
                    storeCity: item.product?.seller_city_name || '',
                    storeAvatar: item.product?.seller_avatar || '',
                    storeUsername: item.product?.seller_name || '',
                    items: [],
                };
            }
            map[sellerKey].items.push(item);
        });
        return Object.values(map);
    }, [cartItems]);

    // Items terpilih
    const selectedCartItems = useMemo(() => {
        return cartItems.filter((it) => selectedItemIds.has(it.id));
    }, [cartItems, selectedItemIds]);

    const totalSelectedCount = selectedCartItems.reduce((acc, it) => acc + (it.quantity || 1), 0);

    const totalSelectedPrice = useMemo(() => {
        return selectedCartItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0);
    }, [selectedCartItems]);

    const totalSelectedOriginalPrice = useMemo(() => {
        return selectedCartItems.reduce((sum, item) => sum + (getItemOriginalPrice(item) * item.quantity), 0);
    }, [selectedCartItems]);

    const totalSavings = Math.max(0, totalSelectedOriginalPrice - totalSelectedPrice);

    // Status Master Selection
    const isAllSelected = cartItems.length > 0 && cartItems.every((it) => selectedItemIds.has(it.id));
    const isSomeSelected = cartItems.some((it) => selectedItemIds.has(it.id)) && !isAllSelected;

    // Toggle Master Select All
    const handleToggleSelectAll = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (isAllSelected) {
            setSelectedItemIds(new Set());
            if (user?.access) {
                axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, { select_all: false }, {
                    headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
                }).catch(err => console.error(err));
            }
        } else {
            const allIds = new Set(cartItems.map((it) => it.id));
            setSelectedItemIds(allIds);
            if (user?.access) {
                axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, { select_all: true }, {
                    headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
                }).catch(err => console.error(err));
            }
        }
    };

    // Toggle Store Select
    const handleToggleStore = async (store) => {
        const user = JSON.parse(localStorage.getItem('user'));
        const storeItemIds = store.items.map((it) => it.id);
        const isStoreAllSelected = storeItemIds.every((id) => selectedItemIds.has(id));

        const next = new Set(selectedItemIds);
        if (isStoreAllSelected) {
            storeItemIds.forEach((id) => next.delete(id));
        } else {
            storeItemIds.forEach((id) => next.add(id));
        }
        setSelectedItemIds(next);

        if (user?.access) {
            axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                seller_id: store.sellerId,
                is_selected: !isStoreAllSelected,
            }, {
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
            }).catch(err => console.error(err));
        }
    };

    // Toggle Single Item
    const handleToggleItem = async (itemId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        const isCurrentlySelected = selectedItemIds.has(itemId);
        const next = new Set(selectedItemIds);
        if (isCurrentlySelected) {
            next.delete(itemId);
        } else {
            next.add(itemId);
        }
        setSelectedItemIds(next);

        if (user?.access) {
            axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                cart_item_id: itemId,
                is_selected: !isCurrentlySelected,
            }, {
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
            }).catch(err => console.error(err));
        }
    };

    // Update Quantity
    const handleUpdateQty = async (cartItemId, newQty) => {
        if (newQty < 1) return;
        setProcessingItem(cartItemId);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) return;

            // Optimistic update
            setCartItems((prev) =>
                prev.map((item) => (item.id === cartItemId ? { ...item, quantity: newQty } : item))
            );

            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                cart_item_id: cartItemId,
                quantity: newQty,
            }, {
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
            });

            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (error) {
            console.error('Error updating quantity:', error);
            alert('Gagal memperbarui jumlah.');
            fetchCartItems();
        } finally {
            setProcessingItem(null);
        }
    };

    // Hapus Single Item
    const handleRemoveItem = async (item) => {
        if (!window.confirm(`Hapus "${item.product?.title || 'produk ini'}" dari keranjang?`)) return;
        setProcessingItem(item.id);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) return;

            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                data: { cart_item_id: item.id, product_id: item.product?.id || item.product },
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() },
            });

            // Hapus dari state
            setCartItems((prev) => prev.filter((it) => it.id !== item.id));
            setSelectedItemIds((prev) => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });

            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (error) {
            console.error('Error removing item:', error);
            alert('Gagal menghapus item dari keranjang.');
        } finally {
            setProcessingItem(null);
        }
    };

    // Hapus Semua Item Terpilih (Bulk Delete)
    const handleRemoveSelected = async () => {
        const ids = Array.from(selectedItemIds);
        if (ids.length === 0) return;
        if (!window.confirm(`Hapus ${ids.length} produk terpilih dari keranjang?`)) return;

        setActionLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.access) return;

            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                data: { cart_item_ids: ids },
                headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() },
            });

            setCartItems((prev) => prev.filter((it) => !selectedItemIds.has(it.id)));
            setSelectedItemIds(new Set());
            window.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (error) {
            console.error('Error bulk removing items:', error);
            alert('Gagal menghapus produk terpilih.');
            fetchCartItems();
        } finally {
            setActionLoading(false);
        }
    };

    // Core Checkout Function
    const proceedToCheckout = async (targetIdSet) => {
        const ids = Array.from(targetIdSet);
        if (ids.length === 0) {
            alert('Silakan pilih minimal 1 produk untuk checkout.');
            return;
        }

        setActionLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user?.access) {
                // Sinkronkan status is_selected ke database backend agar OrderCreateView hanya memproses item ini
                await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                    selected_ids: ids,
                }, {
                    headers: { Authorization: `Bearer ${user.access}`, 'X-CSRFToken': getCsrfToken() }
                });
            }

            // Simpan juga di sessionStorage & navigation state untuk proteksi ganda di Checkout
            sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(ids));
            navigate('/ecommerce/checkout-sinergy', {
                state: { selectedCartItemIds: ids }
            });
        } catch (error) {
            console.error('Error preparing checkout:', error);
            // Tetap arahkan ke checkout dengan navigasi state jika request patch gagal
            sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(ids));
            navigate('/ecommerce/checkout-sinergy', {
                state: { selectedCartItemIds: ids }
            });
        } finally {
            setActionLoading(false);
        }
    };

    // Checkout produk yang dicentang
    const handleCheckoutSelected = () => {
        proceedToCheckout(selectedItemIds);
    };

    // Checkout semua produk langsung
    const handleCheckoutAll = () => {
        const allIds = new Set(cartItems.map((it) => it.id));
        proceedToCheckout(allIds);
    };

    // Checkout produk dari 1 Toko tertentu saja
    const handleCheckoutStore = (store) => {
        const storeIds = new Set(store.items.map((it) => it.id));
        proceedToCheckout(storeIds);
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Keranjang Belanja - Barakah Economy</title></Helmet>
            <Header />

            <div className="max-w-4xl mx-auto px-4 py-8 pb-36">
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <span>Keranjang Belanja</span>
                            {cartItems.length > 0 && (
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                                    {cartItems.length} Produk ({storeGroups.length} Toko)
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            Produk dikelompokkan per toko untuk kemudahan perhitungan ongkir & checkout
                        </p>
                    </div>

                    {cartItems.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCheckoutAll}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs"
                                title="Langsung checkout seluruh produk dalam keranjang"
                            >
                                <span className="material-icons text-sm">done_all</span>
                                Checkout Semua Langsung
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-xs">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat keranjang belanja...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm my-6">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-inner">
                            <span className="material-icons text-4xl">shopping_cart</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Keranjang Belanja Anda Masih Kosong</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto mb-6">
                            Jelajahi produk fisik berkualitas dari toko mitra di Barakah Store sekarang!
                        </p>
                        <Link
                            to="/store"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:scale-[1.02] transition"
                        >
                            <span className="material-icons text-sm">storefront</span>
                            Mulai Belanja Sekarang
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Master Select All Bar */}
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-4">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={(input) => {
                                        if (input) input.indeterminate = isSomeSelected;
                                    }}
                                    onChange={handleToggleSelectAll}
                                    className="w-5 h-5 rounded-md text-emerald-600 border-gray-300 focus:ring-emerald-500 focus:ring-offset-0 transition cursor-pointer"
                                />
                                <span className="text-xs font-bold text-gray-800">
                                    Pilih Semua ({cartItems.length} Produk)
                                </span>
                            </label>

                            {selectedItemIds.size > 0 && (
                                <button
                                    onClick={handleRemoveSelected}
                                    disabled={actionLoading}
                                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                                >
                                    <span className="material-icons text-sm">delete_sweep</span>
                                    Hapus Terpilih ({selectedItemIds.size})
                                </button>
                            )}
                        </div>

                        {/* List Toko (Seller Groups) */}
                        {storeGroups.map((store) => {
                            const storeItemIds = store.items.map((it) => it.id);
                            const isStoreAllSelected = storeItemIds.every((id) => selectedItemIds.has(id));
                            const isStoreSomeSelected = storeItemIds.some((id) => selectedItemIds.has(id)) && !isStoreAllSelected;
                            const storeSelectedCount = store.items.filter((it) => selectedItemIds.has(it.id)).length;

                            return (
                                <div
                                    key={store.sellerId}
                                    className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 overflow-hidden transition-all hover:shadow-md"
                                >
                                    {/* Store Card Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isStoreAllSelected}
                                                ref={(input) => {
                                                    if (input) input.indeterminate = isStoreSomeSelected;
                                                }}
                                                onChange={() => handleToggleStore(store)}
                                                className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 transition cursor-pointer"
                                            />
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-xs shrink-0">
                                                <span className="material-icons text-base">storefront</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h3 className="text-sm font-black text-gray-900 line-clamp-1">
                                                        {store.storeName}
                                                    </h3>
                                                    <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                                        Mitra Resmi
                                                    </span>
                                                </div>
                                                {store.storeCity && (
                                                    <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                                        <span className="material-icons text-[11px] text-gray-400">location_on</span>
                                                        {store.storeCity}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Aksi Checkout Toko Ini Saja */}
                                        <div className="flex items-center justify-end gap-2 pl-7 sm:pl-0">
                                            <button
                                                onClick={() => handleCheckoutStore(store)}
                                                disabled={actionLoading}
                                                className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-xl border border-emerald-200 transition-all flex items-center gap-1"
                                                title="Langsung checkout semua produk dari toko ini saja"
                                            >
                                                <span>Checkout Toko Ini</span>
                                                <span className="material-icons text-[14px]">arrow_forward</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Items List Under This Store */}
                                    <div className="divide-y divide-gray-100">
                                        {store.items.map((item) => {
                                            const thumbUrl = getMediaUrl(item.product?.thumbnail || item.product?.thumbnail_url);
                                            const itemPrice = getItemPrice(item);
                                            const origPrice = getItemOriginalPrice(item);
                                            const isSelected = selectedItemIds.has(item.id);
                                            const isProcessing = processingItem === item.id;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`py-3.5 first:pt-1 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                                                        isSelected ? 'bg-emerald-50/20 -mx-2 px-2 rounded-2xl' : ''
                                                    }`}
                                                >
                                                    {/* Left: Checkbox + Product Info */}
                                                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleItem(item.id)}
                                                            className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 transition cursor-pointer mt-3 sm:mt-0"
                                                        />

                                                        <Link
                                                            to={`/ecommerce/product/${item.product?.id}`}
                                                            className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100 relative group"
                                                        >
                                                            <img
                                                                src={thumbUrl || '/placeholder-image.jpg'}
                                                                alt={item.product?.title || 'Produk'}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = '/placeholder-image.jpg';
                                                                }}
                                                            />
                                                        </Link>

                                                        <div className="min-w-0 flex-1">
                                                            <Link
                                                                to={`/ecommerce/product/${item.product?.id}`}
                                                                className="text-xs sm:text-sm font-bold text-gray-900 hover:text-emerald-700 transition line-clamp-1"
                                                            >
                                                                {item.product?.title}
                                                            </Link>

                                                            {item.variation && (
                                                                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                                    Variasi: {item.variation.name}
                                                                </span>
                                                            )}

                                                            {item.product?.active_promotion && (
                                                                <span className="inline-block ml-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                                    Promo {item.product.active_promotion.discount_type === 'percentage' ? `${item.product.active_promotion.discount_value}%` : 'Diskon'}
                                                                </span>
                                                            )}

                                                            <div className="flex items-baseline gap-1.5 mt-1">
                                                                <p className="text-xs font-black text-emerald-700">
                                                                    {formatIDR(itemPrice)}
                                                                </p>
                                                                {origPrice > itemPrice && (
                                                                    <span className="text-[10px] text-gray-400 line-through">
                                                                        {formatIDR(origPrice)}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                                Stok: {item.product?.stock || item.product?.total_stock || 'Tersedia'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Right: Quantity Stepper + Trash */}
                                                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1">
                                                            <button
                                                                onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                                                disabled={item.quantity <= 1 || isProcessing}
                                                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-white transition disabled:opacity-30"
                                                            >
                                                                <span className="material-icons text-sm">remove</span>
                                                            </button>
                                                            <span className="w-8 text-center text-xs font-black text-gray-800">
                                                                {item.quantity}
                                                            </span>
                                                            <button
                                                                onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                                                disabled={item.quantity >= (item.product?.stock || 99) || isProcessing}
                                                                className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-emerald-700 rounded-lg hover:bg-white transition disabled:opacity-30"
                                                            >
                                                                <span className="material-icons text-sm">add</span>
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={() => handleRemoveItem(item)}
                                                            disabled={isProcessing}
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
                            );
                        })}

                        {/* Sticky Bottom Bar (Summary & Checkout CTA) */}
                        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 p-4 z-40 shadow-2xl">
                            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                {/* Left Summary Info */}
                                <div className="flex items-center justify-between sm:justify-start gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={(input) => {
                                                if (input) input.indeterminate = isSomeSelected;
                                            }}
                                            onChange={handleToggleSelectAll}
                                            className="w-4 h-4 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500 transition cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-gray-700 hidden sm:inline">
                                            Semua ({cartItems.length})
                                        </span>
                                    </label>

                                    <div className="text-right sm:text-left pl-2 sm:pl-4 border-l border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                                                Total ({selectedItemIds.size} Produk):
                                            </span>
                                            {totalSavings > 0 && (
                                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                                    Hemat {formatIDR(totalSavings)}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-base sm:text-xl font-black text-emerald-700">
                                            {formatIDR(totalSelectedPrice)}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Checkout Buttons */}
                                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                    {/* Checkout Semua Langsung (jika sebagian dipilih) */}
                                    {selectedItemIds.size > 0 && selectedItemIds.size < cartItems.length && (
                                        <button
                                            onClick={handleCheckoutAll}
                                            disabled={actionLoading}
                                            className="flex-1 sm:flex-initial px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition"
                                        >
                                            Checkout Semua ({cartItems.length})
                                        </button>
                                    )}

                                    {/* Primary Checkout Button: Checkout yang dipilih */}
                                    <button
                                        onClick={handleCheckoutSelected}
                                        disabled={selectedItemIds.size === 0 || actionLoading}
                                        className={`flex-1 sm:flex-initial px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all ${
                                            selectedItemIds.size === 0 || actionLoading
                                                ? 'opacity-40 cursor-not-allowed saturate-50'
                                                : 'hover:shadow-emerald-300 hover:scale-[1.02] active:scale-[0.98]'
                                        }`}
                                    >
                                        <span className="material-icons text-sm">shopping_bag</span>
                                        <span>
                                            Checkout ({selectedItemIds.size})
                                        </span>
                                    </button>
                                </div>
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