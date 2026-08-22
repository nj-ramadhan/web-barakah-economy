// components/common/GlobalActiveShippingWidget.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const GlobalActiveShippingWidget = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [shippedOrders, setShippedOrders] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDismissed, setIsDismissed] = useState(false);
    const [completingId, setCompletingId] = useState(null);

    const fetchShippedOrders = useCallback(async () => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            setShippedOrders([]);
            return;
        }

        try {
            const user = JSON.parse(userData);
            if (!user?.access) return;

            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });

            const allOrders = response.data || [];
            const activeShipped = allOrders.filter(o => {
                const s = (o.status || '').toLowerCase();
                return s === 'dikirim' || s === 'shipped';
            });

            setShippedOrders(activeShipped);
            if (currentIndex >= activeShipped.length) {
                setCurrentIndex(0);
            }
        } catch (err) {
            // Silently ignore background polling errors
        }
    }, [currentIndex]);

    useEffect(() => {
        fetchShippedOrders();

        // Refresh periodically every 30 seconds
        const interval = setInterval(fetchShippedOrders, 30000);
        return () => clearInterval(interval);
    }, [location.pathname, fetchShippedOrders]);

    const handleCompleteOrder = async (orderId) => {
        if (!window.confirm('Konfirmasi bahwa barang pesanan sudah Anda terima dengan baik? Status akan diubah menjadi Selesai.')) {
            return;
        }

        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            setCompletingId(orderId);
            await axios.patch(
                `${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/`,
                { status: 'Selesai' },
                { headers: { Authorization: `Bearer ${user.access}` } }
            );

            // Re-fetch orders to update list instantly
            await fetchShippedOrders();
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal menyelesaikan pesanan.');
        } finally {
            setCompletingId(null);
        }
    };

    if (isDismissed || shippedOrders.length === 0) {
        return null;
    }

    const currentOrder = shippedOrders[currentIndex] || shippedOrders[0];
    if (!currentOrder) return null;

    const firstItem = currentOrder.items?.[0] || {};
    const totalItemsCount = currentOrder.items?.length || 1;
    const itemTitle = firstItem.product_name || firstItem.product?.title || 'Produk Pesanan';
    const itemImage = firstItem.product_thumbnail || firstItem.product?.thumbnail;

    return (
        <aside
            aria-label="Progress Pengiriman Pesanan"
            className="fixed top-20 right-3 sm:right-6 z-50 max-w-sm w-[calc(100vw-1.5rem)] sm:w-88 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
            <div className="relative bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-purple-200/90 shadow-purple-900/10 hover:shadow-purple-900/15 transition-all">
                {/* Accent Top Bar */}
                <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 rounded-full"></div>

                {/* Header */}
                <div className="flex items-start justify-between gap-2 pt-1 mb-2.5">
                    <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-purple-100 text-purple-700">
                            <span className="material-icons text-lg animate-bounce">local_shipping</span>
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-600"></span>
                            </span>
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                                <span>Paket Sedang Dikirim</span>
                                {shippedOrders.length > 1 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                                        {currentIndex + 1}/{shippedOrders.length}
                                    </span>
                                )}
                            </h4>
                            <p className="text-[10px] font-medium text-gray-500">
                                #{currentOrder.order_number}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {shippedOrders.length > 1 && (
                            <div className="flex items-center mr-1">
                                <button
                                    onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : shippedOrders.length - 1))}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
                                    title="Pesanan Sebelumnya"
                                >
                                    <span className="material-icons text-sm">chevron_left</span>
                                </button>
                                <button
                                    onClick={() => setCurrentIndex((prev) => (prev < shippedOrders.length - 1 ? prev + 1 : 0))}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
                                    title="Pesanan Berikutnya"
                                >
                                    <span className="material-icons text-sm">chevron_right</span>
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
                            title="Tutup (akan muncul lagi saat refresh)"
                        >
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                </div>

                {/* Body / Product Card Preview */}
                <div className="bg-gray-50/90 rounded-xl p-2.5 border border-gray-100 mb-3 flex gap-2.5 items-center">
                    {itemImage ? (
                        <img
                            src={getMediaUrl(itemImage)}
                            alt={itemTitle}
                            className="w-11 h-11 object-cover rounded-lg bg-white border border-gray-200 shrink-0"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                            <span className="material-icons text-base">shopping_bag</span>
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-gray-800 line-clamp-1">
                            {itemTitle}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium">
                            {totalItemsCount > 1 ? `+${totalItemsCount - 1} produk lainnya • ` : ''}
                            {currentOrder.shipping_type === 'kurir_toko' || currentOrder.driver_name ? (
                                <span className="font-bold text-emerald-700">
                                    🛵 Kurir Toko {currentOrder.driver_name ? `(${currentOrder.driver_name})` : ''}
                                </span>
                            ) : (
                                <>
                                    <span className="font-bold text-purple-700">
                                        {currentOrder.shipping_courier ? currentOrder.shipping_courier.toUpperCase() : 'Kurir'}
                                    </span>
                                    {currentOrder.resi_number ? ` (${currentOrder.resi_number})` : ''}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Mini Delivery Steps */}
                <div className="px-1 mb-3">
                    <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="text-emerald-600 flex items-center gap-0.5">
                            <span className="material-icons text-xs">check_circle</span> Diproses
                        </span>
                        <span className="text-purple-600 flex items-center gap-0.5">
                            <span className="material-icons text-xs animate-spin">autorenew</span> Sedang Dikirim
                        </span>
                        <span className="text-gray-400">Selesai</span>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-500 to-purple-600 h-full w-2/3 rounded-full animate-pulse"></div>
                    </div>
                </div>

                {/* Helpful Prompt */}
                <p className="text-[10px] text-gray-500 leading-snug mb-3 px-0.5">
                    Sudah menerima paket ini? Klik tombol di bawah untuk menyelesaikan pesanan.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/riwayat-belanja')}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                    >
                        <span className="material-icons text-sm">visibility</span>
                        <span>Riwayat</span>
                    </button>
                    <button
                        onClick={() => handleCompleteOrder(currentOrder.id)}
                        disabled={completingId === currentOrder.id}
                        className="flex-[2] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-200 hover:shadow-emerald-300 transition-all transform active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {completingId === currentOrder.id ? (
                            <>
                                <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                                <span>Menyelesaikan...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-icons text-sm">check</span>
                                <span>Selesaikan Pesanan</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default GlobalActiveShippingWidget;
