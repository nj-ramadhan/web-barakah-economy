// pages/EcommerceOrderHistoryPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import Pagination from '../components/common/Pagination';
import '../styles/Body.css';

const formatDate = (dateData) => {
    if (!dateData) return 'tidak ada';
    const date = new Date(dateData);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
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
    const ITEMS_PER_PAGE = 10;

    // Cancellation Modal States
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedCancelOrder, setSelectedCancelOrder] = useState(null);
    const [cancelReason, setCancelReason] = useState('');
    const [submittingCancel, setSubmittingCancel] = useState(false);

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
            
            // Sort: Paling atas yang terbaru
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
                // Ajukan diskusi / banding pembatalan kepada penjual
                await axios.patch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${selectedCancelOrder.id}/`,
                    { 
                        action: 'request_cancel',
                        cancel_request_status: 'pending',
                        complaint_reason: cancelReason || 'Permohonan pembatalan diajukan oleh pembeli' 
                    },
                    { headers: { Authorization: `Bearer ${user.access}` } }
                );
                alert('Permohonan pembatalan berhasil diajukan ke penjual untuk didiskusikan. Jika penjual tidak merespon dalam 2x24 jam, sistem akan otomatis membatalkan pesanan.');
            } else {
                // Pembatalan langsung untuk pesanan belum diproses (termasuk COD)
                await axios.patch(
                    `${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${selectedCancelOrder.id}/`,
                    { 
                        status: 'Batal', 
                        complaint_reason: cancelReason || 'Dibatalkan oleh pembeli' 
                    },
                    { headers: { Authorization: `Bearer ${user.access}` } }
                );

                const isCod = (selectedCancelOrder.payment_method || '').toLowerCase() === 'cod';
                if (isCod) {
                    alert('Pesanan COD berhasil dibatalkan langsung.');
                } else {
                    alert('Pesanan berhasil dibatalkan. Dana otomatis dikembalikan (refund) ke Saldo BAE profil Anda.');
                }
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
            alert('Komplain / banding berhasil diajukan! Status pesanan diubah menjadi Komplain dan saldo ditahan.');
            fetchOrders();
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal mengajukan komplain');
        }
    };

    const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Header />
            
            <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <span className="material-icons text-emerald-600">shopping_bag</span>
                            RIWAYAT BELANJA
                        </h1>
                        <p className="text-xs text-gray-500 font-medium mt-1">Daftar pesanan produk e-commerce & Sinergy Anda (Terbaru di atas)</p>
                    </div>
                    <button 
                        onClick={fetchOrders}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition"
                    >
                        <span className="material-icons text-sm">refresh</span>
                        Muat Ulang
                    </button>
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
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8 shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-3xl">shopping_cart</span>
                        </div>
                        <h3 className="text-base font-bold text-gray-900">Belum Ada Riwayat Belanja</h3>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 mb-6">
                            Anda belum pernah melakukan pemesanan produk fisik / sinergy.
                        </p>
                        <button 
                            onClick={() => navigate('/sinergy')} 
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
                                const isCod = (order.payment_method || '').toLowerCase() === 'cod';
                                const isUnprocessed = ['pending', 'menunggu', 'paid'].includes(statusLower);
                                const isProcessed = ['proses', 'processing', 'dikirim', 'shipped'].includes(statusLower);
                                const isTerminal = ['selesai', 'batal', 'completed', 'cancelled'].includes(statusLower);
                                const isPendingCancelRequest = order.cancel_request_status === 'pending';

                                let badgeColor = 'bg-gray-100 text-gray-600';
                                if (['paid', 'proses'].includes(statusLower)) badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                                else if (['dikirim', 'shipped'].includes(statusLower)) badgeColor = 'bg-purple-50 text-purple-700 border-purple-100';
                                else if (['selesai', 'completed'].includes(statusLower)) badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                else if (['komplain'].includes(statusLower)) badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                                else if (['batal', 'cancelled'].includes(statusLower)) badgeColor = 'bg-red-50 text-red-700 border-red-100';
                                else if (['pending', 'menunggu'].includes(statusLower)) badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';

                                return (
                                    <div key={order.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                        <div className="p-5 bg-gray-50/60 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-gray-900">#{order.order_number}</span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-[11px] font-bold text-gray-500">{formatDate(order.created_at)}</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {isPendingCancelRequest && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                                        <span className="material-icons text-[12px]">schedule</span>
                                                        Menunggu Respon Batal Penjual
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${badgeColor}`}>
                                                    {order.status || 'Pending'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            {/* Order Items */}
                                            <div className="space-y-3">
                                                {(order.items || []).map((item, idx) => (
                                                    <div key={idx} className="flex gap-4 items-center p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                                                        <div className="w-14 h-14 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
                                                            {item.product_image || item.product_thumbnail ? (
                                                                <img 
                                                                    src={getMediaUrl(item.product_image || item.product_thumbnail)} 
                                                                    alt={item.product_name} 
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.jpg'; }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-emerald-600">
                                                                    <span className="material-icons text-base">inventory_2</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xs font-black text-gray-900 truncate">{item.product_name}</h4>
                                                            {item.variation_name && (
                                                                <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                                                                    {item.variation_name}
                                                                </span>
                                                            )}
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                                                {item.quantity} Unit • Rp {formatIDR(item.price)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Note / Cancel Reason Display */}
                                            {order.cancel_request_reason && (
                                                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-xs text-amber-900">
                                                    <span className="font-black uppercase tracking-widest text-[9px] block mb-0.5">Catatan Pembatalan / Diskusi:</span>
                                                    "{order.cancel_request_reason}"
                                                </div>
                                            )}

                                            {/* Summary & Payment Info */}
                                            <div className="pt-3 border-t border-gray-50 space-y-2">
                                                <div className="flex justify-between items-center text-[11px] text-gray-500">
                                                    <span>Metode Pembayaran:</span>
                                                    <span className="font-black text-gray-800 uppercase">
                                                        {order.payment_method === 'saldo_bae' ? '100% Saldo BAE' :
                                                         order.payment_method === 'hybrid' ? 'Hybrid (Saldo BAE + QRIS)' :
                                                         order.payment_method === 'cod' ? 'COD (Bayar di Tempat)' :
                                                         order.payment_method || 'QRIS / Transfer'}
                                                    </span>
                                                </div>
                                                {order.used_balance > 0 && (
                                                    <div className="flex justify-between items-center text-[11px] text-emerald-600">
                                                        <span>Saldo BAE Terpotong:</span>
                                                        <span className="font-bold">-Rp {formatIDR(order.used_balance)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                                    <span className="text-xs font-black text-emerald-900 uppercase tracking-widest">Grand Total</span>
                                                    <span className="text-base font-black text-emerald-600">
                                                        Rp {formatIDR(Number(order.grand_total) > 0 ? order.grand_total : order.total_price)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Resi Tracking */}
                                            {order.resi_number && (
                                                <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-indigo-100 text-indigo-600">
                                                            <span className="material-icons text-sm">local_shipping</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block">Nomor Resi ({order.shipping_courier || 'Kurir'})</span>
                                                            <p className="font-mono font-black text-indigo-900 text-xs">{order.resi_number}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(order.resi_number);
                                                            alert('Nomor resi berhasil disalin!');
                                                        }}
                                                        className="px-3 py-1.5 bg-white rounded-xl text-indigo-600 text-[10px] font-bold shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition"
                                                    >
                                                        Salin Resi
                                                    </button>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {order.status === 'Dikirim' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleCompleteOrder(order.id)}
                                                            className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm"
                                                        >
                                                            <span className="material-icons text-sm">check_circle</span>
                                                            Pesanan Diterima
                                                        </button>
                                                        <button 
                                                            onClick={() => handleComplaintOrder(order.id)}
                                                            className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition"
                                                        >
                                                            <span className="material-icons text-sm">report_problem</span>
                                                            Komplain
                                                        </button>
                                                    </>
                                                )}

                                                {/* Cancel / Dispute Button */}
                                                {!isTerminal && (
                                                    isUnprocessed ? (
                                                        <button
                                                            onClick={() => handleOpenCancelModal(order)}
                                                            className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                                                        >
                                                            <span className="material-icons text-sm">cancel</span>
                                                            Batalkan Pesanan
                                                        </button>
                                                    ) : isProcessed ? (
                                                        !isPendingCancelRequest && (
                                                            <button
                                                                onClick={() => handleOpenCancelModal(order)}
                                                                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                                                            >
                                                                <span className="material-icons text-sm">forum</span>
                                                                Ajukan Diskusi / Pembatalan
                                                            </button>
                                                        )
                                                    ) : null
                                                )}

                                                {/* Seller Contact */}
                                                {order.seller_phone && (
                                                    <button 
                                                        onClick={() => {
                                                            const cleanPhone = order.seller_phone.replace(/\D/g, '');
                                                            const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                                                            const msg = encodeURIComponent(`Halo ${order.seller_name}, saya ingin menanyakan pesanan #${order.order_number} (${order.status}).`);
                                                            window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
                                                        }}
                                                        className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-1"
                                                    >
                                                        <span className="material-icons text-sm text-emerald-600">chat</span>
                                                        Hubungi Penjual
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination 
                            currentPage={currentPage}
                            totalItems={orders.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </main>

            {/* Cancel Order Modal */}
            {showCancelModal && selectedCancelOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                                    <span className="material-icons text-red-600">cancel</span> 
                                    {['proses', 'processing', 'dikirim', 'shipped'].includes((selectedCancelOrder.status || '').toLowerCase())
                                        ? `Ajukan Pembatalan #${selectedCancelOrder.order_number}`
                                        : `Batalkan Pesanan #${selectedCancelOrder.order_number}`}
                                </h3>
                                <p className="text-xs text-gray-400 font-bold mt-0.5">Konfirmasi pembatalan & pengembalian</p>
                            </div>
                            <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        {/* Rules notice */}
                        <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-900 space-y-1.5 leading-relaxed">
                            <p className="font-black flex items-center gap-1.5 text-emerald-800">
                                <span className="material-icons text-sm text-emerald-600">info</span> Ketentuan Pembatalan:
                            </p>
                            {['proses', 'processing', 'dikirim', 'shipped'].includes((selectedCancelOrder.status || '').toLowerCase()) ? (
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-800">
                                    <li>Pesanan sudah dalam proses oleh penjual. Pembatalan memerlukan persetujuan / diskusi dengan penjual.</li>
                                    <li>Jika penjual tidak merespon dalam <strong>2 hari (48 jam)</strong>, sistem akan otomatis membatalkan pesanan.</li>
                                    <li>Dana yang telah dibayar akan dikembalikan 100% ke <strong>Saldo BAE</strong> di profil Anda.</li>
                                </ul>
                            ) : (
                                <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-800">
                                    <li>Pesanan belum diproses oleh penjual, pembatalan dapat dilakukan langsung.</li>
                                    {(selectedCancelOrder.payment_method || '').toLowerCase() === 'cod' ? (
                                        <li>Pesanan COD akan langsung dibatalkan tanpa tagihan.</li>
                                    ) : (
                                        <li>Dana pembayaran akan otomatis dikreditkan kembali ke <strong>Saldo BAE</strong> akun Anda secara instan dan dapat ditarik/digunakan kembali.</li>
                                    )}
                                </ul>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">Alasan Pembatalan</label>
                            <textarea
                                placeholder="Tuliskan alasan pembatalan / diskusi..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-emerald-500 h-20 transition"
                            ></textarea>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleConfirmCancelOrder}
                                disabled={submittingCancel}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {submittingCancel ? 'Memproses...' : 'Konfirmasi Batal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default EcommerceOrderHistoryPage;