// pages/EcommerceOrderHistoryPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import Pagination from '../components/common/Pagination';
import BuyerReviewModal from '../components/modals/BuyerReviewModal';
import '../styles/Body.css';

const formatDate = (dateData) => {
    if (!dateData) return 'tidak ada';
    const date = new Date(dateData);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

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

const EcommerceOrderHistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedTab, setSelectedTab] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const ITEMS_PER_PAGE = 8;

    // Transaction Detail Modal States
    const [selectedDetailOrder, setSelectedDetailOrder] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Cancellation Modal States
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedCancelOrder, setSelectedCancelOrder] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [submittingCancel, setSubmittingCancel] = useState(false);

    // Review Modal States
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewProduct, setReviewProduct] = useState(null);
    const [reviewOrderNumber, setReviewOrderNumber] = useState('');

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/login');
                return;
            }
            const user = JSON.parse(userData);
            
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
                headers: { Authorization: `Bearer ${user.access}` },
            });
            
            const sorted = (response.data || []).sort((a, b) => new Date(b.created_at || b.id || 0) - new Date(a.created_at || a.id || 0));
            setOrders(sorted);
        } catch (error) {
            console.error('Error fetching orders:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Status Categorization
    const getStatusCategory = (status) => {
        const s = (status || '').toLowerCase();
        if (['pending', 'menunggu', 'waiting_payment', 'unpaid'].includes(s)) return 'PENDING';
        if (['paid', 'proses', 'processing'].includes(s)) return 'PROCESSING';
        if (['dikirim', 'shipped'].includes(s)) return 'SHIPPED';
        if (['selesai', 'completed', 'delivered'].includes(s)) return 'COMPLETED';
        if (['batal', 'cancelled'].includes(s)) return 'CANCELLED';
        if (['komplain'].includes(s)) return 'COMPLAINT';
        return 'ALL';
    };

    // Filtered Orders
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const cat = getStatusCategory(order.status);
            const matchTab = selectedTab === 'ALL' || cat === selectedTab;
            
            if (!matchTab) return false;

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchOrderNumber = (order.order_number || '').toLowerCase().includes(query);
                const matchSeller = (order.seller_name || '').toLowerCase().includes(query);
                const matchItem = (order.items || []).some(it => (it.product_name || '').toLowerCase().includes(query));
                return matchOrderNumber || matchSeller || matchItem;
            }

            return true;
        });
    }, [orders, selectedTab, searchQuery]);

    // Counts for tabs
    const counts = useMemo(() => {
        const res = { ALL: orders.length, PENDING: 0, PROCESSING: 0, SHIPPED: 0, COMPLETED: 0, CANCELLED: 0 };
        orders.forEach(o => {
            const c = getStatusCategory(o.status);
            if (res[c] !== undefined) res[c]++;
        });
        return res;
    }, [orders]);

    const handleOpenCancelModal = (order) => {
        setSelectedCancelOrder(order);
        setCancelReason('');
        setShowCancelModal(true);
    };

    const handleConfirmCancelOrder = async () => {
        if (!selectedCancelOrder) return;
        const statusLower = (selectedCancelOrder.status || '').toLowerCase();
        const isProcessed = ['proses', 'processing', 'dikirim', 'shipped'].includes(statusLower);

        try {
            setSubmittingCancel(true);
            const userData = localStorage.getItem('user');
            const user = JSON.parse(userData);

            if (isProcessed) {
                await axios.patch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${selectedCancelOrder.id}/`,
                    { 
                        action: 'request_cancel',
                        cancel_request_status: 'pending',
                        complaint_reason: cancelReason || 'Permohonan pembatalan diajukan oleh pembeli' 
                    },
                    { headers: { Authorization: `Bearer ${user.access}` } }
                );
                alert('Permohonan pembatalan berhasil diajukan ke penjual untuk didiskusikan.');
            } else {
                await axios.patch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${selectedCancelOrder.id}/`,
                    { 
                        status: 'Batal', 
                        complaint_reason: cancelReason || 'Dibatalkan oleh pembeli' 
                    },
                    { headers: { Authorization: `Bearer ${user.access}` } }
                );
                alert('Pesanan berhasil dibatalkan.');
            }

            setShowCancelModal(false);
            fetchOrders();
        } catch (err) {
            console.error("Gagal membatalkan pesanan", err);
            alert(err.response?.data?.error || err.response?.data?.message || 'Gagal memproses pembatalan pesanan. Silakan coba lagi.');
        } finally {
            setSubmittingCancel(false);
        }
    };

    const handleCompleteOrder = async (orderId) => {
        if (!window.confirm('Konfirmasi bahwa pesanan telah diterima? Status akan menjadi Selesai dan tidak dapat diubah lagi.')) return;
        
        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/`, 
                { status: 'Selesai' },
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            alert('Terima kasih! Pesanan telah selesai.');
            fetchOrders();
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal mengubah status pesanan');
        }
    };

    const handleComplaintOrder = async (orderId) => {
        const reason = window.prompt('Masukkan alasan komplain / banding (Contoh: Barang belum sampai, atau paket rusak):');
        if (!reason || !reason.trim()) return;

        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/`, 
                { status: 'Komplain', complaint_reason: reason },
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            alert('Komplain / banding berhasil diajukan!');
            fetchOrders();
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal mengajukan komplain');
        }
    };

    const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const getStatusBadge = (status) => {
        const s = (status || '').toLowerCase();
        if (['paid', 'proses', 'processing'].includes(s)) {
            return <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1"><span className="material-icons text-[13px]">hourglass_top</span>Diproses Penjual</span>;
        }
        if (['dikirim', 'shipped'].includes(s)) {
            return <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1"><span className="material-icons text-[13px]">local_shipping</span>Sedang Dikirim</span>;
        }
        if (['selesai', 'completed', 'delivered'].includes(s)) {
            return <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1"><span className="material-icons text-[13px]">check_circle</span>Selesai</span>;
        }
        if (['batal', 'cancelled'].includes(s)) {
            return <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 flex items-center gap-1"><span className="material-icons text-[13px]">cancel</span>Batal</span>;
        }
        if (['komplain'].includes(s)) {
            return <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1"><span className="material-icons text-[13px]">report_problem</span>Komplain</span>;
        }
        return <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1"><span className="material-icons text-[13px]">pending</span>Menunggu Pembayaran</span>;
    };

    const getPaymentMethodLabel = (method) => {
        const m = (method || '').toLowerCase();
        if (m === 'saldo_bae') return '100% Saldo BAE';
        if (m === 'hybrid') return 'Hybrid (Saldo BAE + QRIS)';
        if (m === 'cod') return 'COD (Bayar di Tempat)';
        if (m === 'dynaqris') return 'QRIS Dinamis Otomatis';
        if (m === 'manual') return 'QRIS / Transfer Bank Manual';
        return method || 'QRIS / Transfer Bank';
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Header />
            
            <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <span className="material-icons text-emerald-600">shopping_bag</span>
                            RIWAYAT BELANJA
                        </h1>
                        <p className="text-xs text-gray-500 font-medium mt-1">Daftar pesanan produk e-commerce & Sinergy Anda (Terbaru di atas)</p>
                    </div>
                    <button 
                        onClick={fetchOrders}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition"
                    >
                        <span className="material-icons text-sm text-emerald-600">refresh</span>
                        Muat Ulang
                    </button>
                </div>

                <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-5 flex gap-1 overflow-x-auto scrollbar-none">
                    {[
                        { id: 'ALL', label: 'Semua', icon: 'receipt_long', count: counts.ALL },
                        { id: 'PENDING', label: 'Menunggu Bayar', icon: 'pending', count: counts.PENDING },
                        { id: 'PROCESSING', label: 'Diproses', icon: 'hourglass_top', count: counts.PROCESSING },
                        { id: 'SHIPPED', label: 'Dikirim', icon: 'local_shipping', count: counts.SHIPPED },
                        { id: 'COMPLETED', label: 'Selesai', icon: 'check_circle', count: counts.COMPLETED },
                        { id: 'CANCELLED', label: 'Dibatalkan', icon: 'cancel', count: counts.CANCELLED },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setSelectedTab(tab.id); setCurrentPage(1); }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${selectedTab === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            <span className="material-icons text-[15px]">{tab.icon}</span>
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${selectedTab === tab.id ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative mb-6">
                    <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input 
                        type="text"
                        placeholder="Cari nomor pesanan, nama produk, atau penjual..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <span className="material-icons text-sm">close</span>
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                                </div>
                                <div className="h-16 bg-gray-100 rounded-2xl"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-3xl">shopping_bag</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900">Tidak Ada Riwayat Belanja</h3>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 mb-6">
                            {searchQuery ? 'Tidak ada pesanan yang sesuai dengan kata kunci pencarian Anda.' : 'Belum ada transaksi pada kategori status ini.'}
                        </p>
                        <button 
                            onClick={() => navigate('/store')} 
                            className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                        >
                            Mulai Belanja
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-4">
                            {paginatedOrders.map(order => {
                                const statusLower = (order.status || '').toLowerCase();
                                const isPendingCancelRequest = order.cancel_request_status === 'pending';
                                const totalCalculatedAmount = Number(order.grand_total) > 0 ? Number(order.grand_total) : (Number(order.total_price || 0) + Number(order.shipping_cost || 0) - Number(order.voucher_nominal || 0));

                                return (
                                    <div key={order.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                        <div className="p-5 bg-gray-50/60 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-icons text-emerald-600 text-sm">storefront</span>
                                                    <span className="text-xs font-bold text-gray-800">{order.seller_name || 'Toko Barakah'}</span>
                                                </div>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-xs font-black text-gray-900 font-mono">#{order.order_number}</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-[11px] font-semibold text-gray-500">{formatDate(order.created_at)}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isPendingCancelRequest && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                                        <span className="material-icons text-[12px]">schedule</span>
                                                        Menunggu Respon Batal Penjual
                                                    </span>
                                                )}
                                                {getStatusBadge(order.status)}
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="space-y-3">
                                                {(order.items || []).slice(0, 1).map((item, idx) => (
                                                    <div key={idx} className="flex gap-4 items-center p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                                                        <div className="w-14 h-14 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
                                                            {item.product_image || item.product_thumbnail ? (
                                                                <img src={getMediaUrl(item.product_image || item.product_thumbnail)} alt={item.product_name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-emerald-600"><span className="material-icons text-base">inventory_2</span></div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xs font-black text-gray-900 truncate">{item.product_name}</h4>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                                {order.items.length} Barang • Rp {formatIDR(totalCalculatedAmount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {order.shipping_type === 'kurir_toko' || order.driver_name ? (
                                                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-xs space-y-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                                <span className="material-icons text-base">delivery_dining</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-emerald-900 font-bold text-xs block">🛵 Dikirim Langsung oleh Toko:</span>
                                                                <span className="text-gray-700 font-medium text-[11px]">
                                                                    Pengirim: <strong className="text-gray-900">{order.driver_name || 'Driver Toko'}</strong>
                                                                    {order.driver_phone && <> • Telp/WA: <strong className="font-mono text-gray-900">{order.driver_phone}</strong></>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {order.driver_phone && (
                                                            <a 
                                                                href={`https://wa.me/${order.driver_phone.replace(/[^0-9]/g, '')}`}
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
                                                            >
                                                                <span className="material-icons text-xs">chat</span> Hubungi Driver
                                                            </a>
                                                        )}
                                                    </div>
                                                    {order.delivery_date && (
                                                        <div className="text-[11px] text-emerald-900 bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                                                            <span className="material-icons text-xs text-emerald-600">event</span>
                                                            <span>Jadwal Pengantaran: <strong>{order.delivery_date} {order.delivery_time_slot ? `(Pukul ${order.delivery_time_slot} WIB)` : ''}</strong></span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : order.resi_number ? (
                                                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-icons text-purple-600 text-sm">local_shipping</span>
                                                        <span className="text-gray-600 font-bold">Resi ({order.shipping_courier || 'Kurir'}):</span>
                                                        <span className="font-mono font-black text-purple-900">{order.resi_number}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => { navigator.clipboard.writeText(order.resi_number); alert('Nomor resi berhasil disalin!'); }}
                                                        className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-800 font-black px-2.5 py-1 rounded-lg transition"
                                                    >
                                                        Salin
                                                    </button>
                                                </div>
                                            ) : null}

                                            {((order.payment_method || '').toLowerCase() === 'cod' || Number(order.cod_amount_to_pay) > 0) && (
                                                <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 text-xs flex items-center gap-2 text-amber-900">
                                                    <span className="material-icons text-amber-600 text-base shrink-0">payments</span>
                                                    <span>
                                                        <strong>Tagihan Tunai COD:</strong> Siapkan uang pas sebesar <strong className="text-amber-800 font-black">Rp {formatIDR(order.cod_amount_to_pay || order.grand_total)}</strong> saat paket diserahkan oleh kurir.
                                                    </span>
                                                </div>
                                            )}

                                            {order.cancel_request_reason && (
                                                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-900">
                                                    <span className="font-black uppercase tracking-widest text-[9px] block mb-0.5">Catatan Pembatalan / Diskusi:</span>
                                                    "{order.cancel_request_reason}"
                                                </div>
                                            )}

                                            <div className="pt-3 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="text-xs text-gray-500">
                                                    <span>Metode: </span>
                                                    <span className="font-bold text-gray-800">{getPaymentMethodLabel(order.payment_method)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 justify-between sm:justify-end">
                                                    <span className="text-xs text-gray-500">Total Belanja:</span>
                                                    <span className="text-base font-black text-emerald-600">
                                                        Rp {formatIDR(totalCalculatedAmount)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                                                <button
                                                    onClick={() => { setSelectedDetailOrder(order); setShowDetailModal(true); }}
                                                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <span className="material-icons text-sm">receipt</span>
                                                    Detail
                                                </button>

                                                {['pending', 'menunggu', 'waiting_payment', 'unpaid'].includes(statusLower) && (
                                                    <button
                                                        onClick={() => navigate(`/pembayaran/${order.order_number}`, { state: { orderId: order.id, orderNumber: order.order_number, amount: totalCalculatedAmount, isRepayment: true, addUniqueCode: false, bank: 'qris' } })}
                                                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-emerald-200 flex items-center gap-1.5"
                                                    >
                                                        <span className="material-icons text-sm">payment</span>
                                                        Bayar
                                                    </button>
                                                )}

                                                {order.status === 'Dikirim' && (
                                                    <>
                                                        <button onClick={() => handleCompleteOrder(order.id)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-1"><span className="material-icons text-sm">check_circle</span>Diterima</button>
                                                        <button onClick={() => handleComplaintOrder(order.id)} className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1"><span className="material-icons text-sm">report_problem</span>Komplain</button>
                                                    </>
                                                )}

                                                {!['selesai', 'batal', 'completed', 'cancelled'].includes(statusLower) && (
                                                    <button onClick={() => handleOpenCancelModal(order)} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1"><span className="material-icons text-sm">cancel</span>Batal</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination 
                            currentPage={currentPage}
                            totalItems={filteredOrders.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </main>

            {showDetailModal && selectedDetailOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto scrollbar-thin">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Invoice Transaksi</span>
                                <h3 className="text-lg font-black text-gray-900 font-mono mt-1">#{selectedDetailOrder.order_number}</h3>
                                <p className="text-xs text-gray-400 font-semibold mt-0.5">Waktu: {formatDate(selectedDetailOrder.created_at)}</p>
                            </div>
                            <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"><span className="material-icons text-base">close</span></button>
                        </div>

                        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                            <span className="text-xs font-bold text-gray-600">Status:</span>
                            <div>{getStatusBadge(selectedDetailOrder.status)}</div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-black text-gray-800 flex items-center gap-1.5"><span className="material-icons text-emerald-600 text-sm">inventory_2</span> Rincian Barang</h4>
                            <div className="space-y-2">
                                {(selectedDetailOrder.items || []).map((it, idx) => (
                                    <div key={idx} className="flex gap-3 items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
                                            {it.product_image || it.product_thumbnail ? <img src={getMediaUrl(it.product_image || it.product_thumbnail)} alt={it.product_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-emerald-600"><span className="material-icons text-base">inventory_2</span></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate">{it.product_name}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">{it.quantity} x Rp {formatIDR(it.price)}</p>
                                        </div>
                                        <p className="text-xs font-black text-gray-900">Rp {formatIDR(Number(it.price || 0) * Number(it.quantity || 1))}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Shipping Info in Modal */}
                        {(selectedDetailOrder.shipping_type === 'kurir_toko' || selectedDetailOrder.driver_name || selectedDetailOrder.resi_number || selectedDetailOrder.shipping_courier) && (
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                <h4 className="text-xs font-black text-gray-800 flex items-center gap-1.5 pb-1 border-b border-gray-200">
                                    <span className="material-icons text-indigo-600 text-sm">
                                        {selectedDetailOrder.shipping_type === 'kurir_toko' || selectedDetailOrder.driver_name ? 'delivery_dining' : 'local_shipping'}
                                    </span>
                                    Informasi Pengiriman
                                </h4>
                                {selectedDetailOrder.shipping_type === 'kurir_toko' || selectedDetailOrder.driver_name ? (
                                    <div className="text-xs space-y-1.5 text-gray-700">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Metode Pengiriman:</span>
                                            <span className="font-bold text-emerald-700">🛵 Kirim Sendiri (Kurir Toko)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Nama Pengirim/Driver:</span>
                                            <span className="font-bold text-gray-900">{selectedDetailOrder.driver_name || 'Driver Toko'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Kontak Driver:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-gray-900">{selectedDetailOrder.driver_phone || '-'}</span>
                                                {selectedDetailOrder.driver_phone && (
                                                    <a
                                                        href={`https://wa.me/${selectedDetailOrder.driver_phone.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded hover:bg-emerald-700 transition"
                                                    >
                                                        WA
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {selectedDetailOrder.delivery_date && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Jadwal Pengantaran:</span>
                                                <span className="font-bold text-emerald-800">{selectedDetailOrder.delivery_date} {selectedDetailOrder.delivery_time_slot ? `(Pukul ${selectedDetailOrder.delivery_time_slot} WIB)` : ''}</span>
                                            </div>
                                        )}
                                        {((selectedDetailOrder.payment_method || '').toLowerCase() === 'cod' || Number(selectedDetailOrder.cod_amount_to_pay) > 0) && (
                                            <div className="flex justify-between pt-1 border-t border-gray-200 text-amber-900">
                                                <span className="font-bold">Tagihan Tunai COD:</span>
                                                <span className="font-black text-amber-800">Rp {formatIDR(selectedDetailOrder.cod_amount_to_pay || selectedDetailOrder.grand_total)}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs space-y-1.5 text-gray-700">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Ekspedisi Kurir:</span>
                                            <span className="font-bold text-gray-900">{selectedDetailOrder.shipping_courier || 'Ekspedisi'} {selectedDetailOrder.shipping_service ? `(${selectedDetailOrder.shipping_service})` : ''}</span>
                                        </div>
                                        {selectedDetailOrder.resi_number && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">Nomor Resi:</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{selectedDetailOrder.resi_number}</span>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(selectedDetailOrder.resi_number); alert('Nomor resi disalin!'); }}
                                                        className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded hover:bg-purple-200"
                                                    >
                                                        Salin
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {((selectedDetailOrder.payment_method || '').toLowerCase() === 'cod' || Number(selectedDetailOrder.cod_amount_to_pay) > 0) && (
                                            <div className="flex justify-between pt-1 border-t border-gray-200 text-amber-900">
                                                <span className="font-bold">Tagihan Tunai COD:</span>
                                                <span className="font-black text-amber-800">Rp {formatIDR(selectedDetailOrder.cod_amount_to_pay || selectedDetailOrder.grand_total)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 space-y-2">
                            <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5 pb-1 border-b border-emerald-100"><span className="material-icons text-emerald-600 text-sm">receipt_long</span> Rincian Pembayaran</h4>
                            <div className="flex justify-between text-xs text-gray-600"><span>Total Harga Barang:</span><span className="font-semibold text-gray-800">Rp {formatIDR(selectedDetailOrder.total_price)}</span></div>
                            {Number(selectedDetailOrder.shipping_cost) > 0 && (
                                <div className="flex justify-between text-xs text-gray-600"><span>Ongkos Kirim:</span><span className="font-semibold text-gray-800">+ Rp {formatIDR(selectedDetailOrder.shipping_cost)}</span></div>
                            )}
                            {Number(selectedDetailOrder.voucher_nominal) > 0 && (
                                <div className="flex justify-between text-xs text-emerald-700 font-bold"><span>Diskon Voucher ({selectedDetailOrder.voucher_code || ''}):</span><span>- Rp {formatIDR(selectedDetailOrder.voucher_nominal)}</span></div>
                            )}
                            {(Number(selectedDetailOrder.admin_fee) > 0 || (Number(selectedDetailOrder.grand_total) > (Number(selectedDetailOrder.total_price || 0) + Number(selectedDetailOrder.shipping_cost || 0) - Number(selectedDetailOrder.voucher_nominal || 0)))) && (
                                <div className="flex justify-between text-xs text-amber-700 font-bold">
                                    <span>Biaya Layanan &amp; Admin (Akad Ijarah):</span>
                                    <span>+ Rp {formatIDR(selectedDetailOrder.admin_fee || (Number(selectedDetailOrder.grand_total) - (Number(selectedDetailOrder.total_price || 0) + Number(selectedDetailOrder.shipping_cost || 0) - Number(selectedDetailOrder.voucher_nominal || 0))))}</span>
                                </div>
                            )}
                            {Number(selectedDetailOrder.used_balance) > 0 && (
                                <div className="flex justify-between text-xs text-emerald-700 font-bold"><span>Potongan Saldo BAE:</span><span>- Rp {formatIDR(selectedDetailOrder.used_balance)}</span></div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                                <span className="text-xs font-black text-emerald-950 uppercase">Grand Total</span>
                                <span className="text-lg font-black text-emerald-600">Rp {formatIDR(Number(selectedDetailOrder.grand_total) > 0 ? selectedDetailOrder.grand_total : selectedDetailOrder.total_price)}</span>
                            </div>
                        </div>
                        
                        <div className="pt-2">
                            <button onClick={() => setShowDetailModal(false)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {showCancelModal && selectedCancelOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                            <h3 className="text-base font-black text-gray-900">Batalkan Pesanan</h3>
                            <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <textarea placeholder="Tuliskan alasan pembatalan..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 h-20 outline-none focus:ring-2 focus:ring-emerald-500"></textarea>
                        <button onClick={handleConfirmCancelOrder} disabled={submittingCancel} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-60">{submittingCancel ? 'Memproses...' : 'Konfirmasi Batal'}</button>
                    </div>
                </div>
            )}

            {isReviewModalOpen && reviewProduct && (
                <BuyerReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => { setIsReviewModalOpen(false); setReviewProduct(null); }}
                    product={reviewProduct}
                    orderNumber={reviewOrderNumber}
                    onSuccess={fetchOrders}
                />
            )}

            <NavigationButton />
        </div>
    );
};

export default EcommerceOrderHistoryPage;