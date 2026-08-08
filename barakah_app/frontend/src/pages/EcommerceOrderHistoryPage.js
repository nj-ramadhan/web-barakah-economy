// pages/EcommerceOrderHistoryPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

const formatIDR = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};

const getStatusStyles = (status) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'paid':
    case 'berhasil':
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'shipped':
    case 'dikirim':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'delivered':
    case 'selesai':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'pending':
    case 'menunggu':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'cod':
      return 'bg-violet-50 text-violet-700 border-violet-100';
    case 'failed':
    case 'gagal':
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-100';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-100';
  }
};

const EcommerceOrderHistoryPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cancellation & Refund Modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedCancelOrder, setSelectedCancelOrder] = useState(null);
    const [refundBank, setRefundBank] = useState('BSI');
    const [refundAccount, setRefundAccount] = useState('');
    const [refundHolder, setRefundHolder] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [submittingCancel, setSubmittingCancel] = useState(false);

    const handleOpenCancelModal = (order) => {
        const s = (order.status || '').toLowerCase();
        if (s === 'dikirim' || s === 'shipped' || s === 'proses' || s === 'processing' || s === 'selesai' || s === 'completed') {
            alert('Pesanan sedang diproses atau telah dikirim oleh penjual dan tidak dapat dibatalkan.');
            return;
        }
        setSelectedCancelOrder(order);
        setShowCancelModal(true);
    };

    const handleConfirmCancelOrder = async () => {
        if (!selectedCancelOrder) return;
        const isNonCod = (selectedCancelOrder.payment_method || '').toLowerCase() !== 'cod';
        if (isNonCod && (!refundAccount || !refundHolder)) {
            alert('Mohon isi Nomor Rekening dan Atas Nama Rekening untuk pengembalian dana (refund).');
            return;
        }

        try {
            setSubmittingCancel(true);
            const userData = localStorage.getItem('user');
            const user = JSON.parse(userData);

            const reasonMsg = `Dibatalkan Pembeli. Bank Refund: ${refundBank} - ${refundAccount} a.n ${refundHolder}. Alasan: ${cancelReason || '-'}`;

            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${selectedCancelOrder.id}/`, 
                { status: 'Batal', complaint_reason: reasonMsg },
                { headers: { Authorization: `Bearer ${user.access}` } }
            );

            const waMsg = encodeURIComponent(`Halo Admin Deny Setiawan / Seller, saya mengajukan pembatalan pesanan #${selectedCancelOrder.order_number}.\n` +
                `Metode Bayar: ${selectedCancelOrder.payment_method}\n` +
                `Data Refund: Bank ${refundBank} - ${refundAccount} a.n ${refundHolder}\n` +
                `Alasan: ${cancelReason || '-'}\n` +
                `Mohon dikonfirmasi & dilakukan refund.`
            );

            alert('Pesanan berhasil dibatalkan. Pengajuan refund akan diproses dalam waktu 2x24 jam (bisa lebih cepat).');
            setShowCancelModal(false);
            fetchOrders();

            // Direct WA contact to Admin Deny Setiawan
            window.open(`https://wa.me/6285808274600?text=${waMsg}`, '_blank');
        } catch (err) {
            console.error("Gagal membatalkan pesanan", err);
            alert(err.response?.data?.error || 'Gagal membatalkan pesanan. Silakan coba lagi.');
        } finally {
            setSubmittingCancel(false);
        }
    };

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
    
            setOrders(response.data);
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
        const reason = window.prompt('Masukkan alasan komplain / banding (Contoh: Barang belum sampai, atau paket bermasalah):');
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

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Header />
            
            <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">RIWAYAT BELANJA</h1>
                        <p className="text-xs text-gray-500 font-medium mt-1">DAFTAR PESANAN PRODUK E-COMMERCE ANDA</p>
                    </div>
                    <button 
                        onClick={() => navigate('/belanja')}
                        className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-xl shadow-gray-100 border border-gray-100 hover:scale-105 transition-all"
                    >
                        <span className="material-icons">add_shopping_cart</span>
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-sm"></div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-12 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <span className="material-icons text-4xl text-gray-300">shopping_bag</span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">Belum ada pesanan</h3>
                        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">Anda belum pernah melakukan pembelian produk E-commerce.</p>
                        <button
                            onClick={() => navigate('/belanja')}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm tracking-wide hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                        >
                            BELANJA SEKARANG
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => {
                            const isCancellable = !['proses', 'processing', 'dikirim', 'shipped', 'selesai', 'completed', 'batal', 'cancelled'].includes((order.status || '').toLowerCase());
                            const payStatusText = (order.payment_method || '').toLowerCase() === 'cod' ? 'BAYAR DI TEMPAT (COD)' : ((order.status || '').toLowerCase() === 'paid' ? 'SUDAH DIBAYAR (LUNAS via QRIS/Transfer)' : 'MENUNGGU PEMBAYARAN');

                            return (
                                <div key={order.id} className="group bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-500 overflow-hidden">
                                    <div className="p-6 border-b border-gray-50 bg-gradient-to-br from-white to-gray-50/30">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Order ID</span>
                                                <h3 className="font-mono font-black text-gray-900 text-sm">{order.order_number}</h3>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                                                {order.status || 'Pending'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-icons text-sm">calendar_today</span>
                                                <span className="text-[10px] font-bold">{formatDate(order.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-icons text-sm text-emerald-600">storefront</span>
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{order.seller_name || 'BAE Store'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div className="space-y-3">
                                            {(order.items || []).map((item, idx) => (
                                                <div key={idx} className="flex gap-4 items-center p-3 bg-gray-50/50 rounded-2xl border border-gray-50 group-hover:bg-gray-50 transition-colors">
                                                    <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
                                                        {item.product_thumbnail || item.thumbnail ? (
                                                            <img 
                                                                src={getMediaUrl(item.product_thumbnail || item.thumbnail)} 
                                                                alt={item.product_name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.jpg'; }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-emerald-600">
                                                                <span className="material-icons text-sm">inventory_2</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-gray-900 truncate">{item.product_name}</h4>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.quantity} Unit • {formatIDR(item.price)}</p>
                                                        {item.purchase_instructions && (
                                                            <div className="mt-2 p-2 bg-emerald-100/50 rounded-lg border border-emerald-100 text-[9px] text-emerald-800 leading-relaxed italic">
                                                                <span className="font-bold uppercase tracking-tighter block mb-0.5">ℹ️ Instruksi:</span>
                                                                {item.purchase_instructions}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {order.buyer_note && (
                                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-xs text-orange-800">
                                                <span className="font-black uppercase tracking-widest text-[9px] block mb-1">Catatan Anda ke Penjual:</span>
                                                "{order.buyer_note}"
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-gray-50 mt-4 space-y-3">
                                            <div className="flex justify-between items-center text-[10px] px-2">
                                                <span className="font-bold text-gray-400 uppercase tracking-widest">Metode Bayar & Status</span>
                                                <span className="font-bold text-emerald-700 uppercase tracking-widest">{order.payment_method || 'Manual'} ({payStatusText})</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                                <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Total Bayar</span>
                                                <span className="text-base font-black text-emerald-600">
                                                    {formatIDR(Number(order.grand_total) > 0 ? order.grand_total : order.total_price)}
                                                </span>
                                            </div>
                                        </div>

                                        {order.resi_number && (
                                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex justify-between items-center group/resi hover:bg-indigo-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-indigo-100 text-indigo-600">
                                                        <span className="material-icons">local_shipping</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-0.5">Nomor Resi {order.shipping_courier ? `(${order.shipping_courier})` : ''}</span>
                                                        <p className="font-mono font-black text-indigo-900 text-sm">{order.resi_number}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(order.resi_number);
                                                        alert('Nomor resi berhasil disalin!');
                                                    }}
                                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                                                    title="Salin Resi"
                                                >
                                                    <span className="material-icons text-sm">content_copy</span>
                                                </button>
                                            </div>
                                        )}

                                        {order.status === 'Dikirim' && (
                                            <div className="flex gap-2 mb-2">
                                                <button 
                                                    onClick={() => handleCompleteOrder(order.id)}
                                                    className="flex-[2] flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                                                >
                                                    <span className="material-icons text-sm">check_circle</span>
                                                    Pesanan Diterima
                                                </button>
                                                <button 
                                                    onClick={() => handleComplaintOrder(order.id)}
                                                    className="flex-1 flex items-center justify-center gap-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <span className="material-icons text-sm">report_problem</span>
                                                    Komplain / Banding
                                                </button>
                                            </div>
                                        )}

                                        {order.status === 'Komplain' && (
                                            <div className="p-4 bg-red-50/80 rounded-2xl border border-red-100 text-xs text-red-800 space-y-1 mb-2">
                                                <span className="font-black uppercase tracking-widest text-[9px] block text-red-700">⚠️ Status Komplain / Banding Ditinjau:</span>
                                                <p className="font-semibold">"{order.complaint_reason || 'Barang belum diterima / paket bermasalah'}"</p>
                                                <p className="text-[10px] text-red-600 italic">Saldo penjual ditahan hingga komplain selesai diselesaikan.</p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {order.seller_phone && (
                                                <button 
                                                    onClick={() => {
                                                        const cleanPhone = order.seller_phone.replace(/\D/g, '');
                                                        const finalPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
                                                        const msg = encodeURIComponent(`Halo ${order.seller_name}, saya ingin bertanyakan pesanan #${order.order_number}.\nStatus Pembayaran: ${payStatusText}\nStatus Pesanan: ${order.status}`);
                                                        window.open(`https://wa.me/${finalPhone}?text=${msg}`, '_blank');
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <span className="material-icons text-base">chat</span>
                                                    Hubungi Penjual
                                                </button>
                                            )}

                                            {/* Cancel Order Button */}
                                            {isCancellable ? (
                                                <button
                                                    onClick={() => handleOpenCancelModal(order)}
                                                    className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                                                >
                                                    <span className="material-icons text-sm">cancel</span>
                                                    Batalkan Pesanan
                                                </button>
                                            ) : (
                                                ['proses', 'processing', 'dikirim', 'shipped'].includes((order.status || '').toLowerCase()) && (
                                                    <div className="w-full text-center text-[10px] text-gray-400 italic py-1">
                                                        ⚠️ Pesanan sedang diproses/dikirim oleh penjual dan tidak dapat dibatalkan.
                                                    </div>
                                                )
                                            )}
                                            
                                            {order.payment_proof && (
                                                <a 
                                                    href={order.payment_proof.startsWith('http') ? order.payment_proof : `${process.env.REACT_APP_API_BASE_URL}${order.payment_proof}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100"
                                                >
                                                    <span className="material-icons text-base">receipt_long</span>
                                                    Bukti Transfer
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Cancel Order Modal */}
            {showCancelModal && selectedCancelOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-fade-in space-y-4 border border-gray-100">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                    <span className="material-icons text-red-600">cancel</span> Batalkan Pesanan #{selectedCancelOrder.order_number}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Pengajuan pembatalan & pengembalian dana (refund)</p>
                            </div>
                            <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        {/* Refund Instructions */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed space-y-2">
                            <p className="font-bold flex items-center gap-1.5">
                                <span className="material-icons text-sm text-amber-700">info</span> Syarat & Ketentuan Pengembalian Dana:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                                <li>Pengembalian dana (refund) untuk pembayaran QRIS / Transfer diproses maksimal <strong>2x24 jam</strong> (bisa lebih cepat).</li>
                                <li>Tim kami & <strong>Deny Setiawan (085808274600)</strong> akan segera melakukan follow-up.</li>
                                <li className="text-red-700 font-bold">
                                    Transfer refund ke rekening <u>selain Bank Syariah Indonesia (BSI)</u> akan dikenakan biaya admin antar-bank.
                                </li>
                            </ul>
                            <div className="pt-2 flex items-center justify-between border-t border-amber-200/60 mt-2">
                                <span className="text-[10px] text-amber-900 font-medium">Ingin memohon keringanan tanpa potongan admin?</span>
                                <a 
                                    href={`https://wa.me/6285808274600?text=${encodeURIComponent(`Halo Admin Deny Setiawan (085808274600), saya memohon keringanan bebas potongan biaya admin untuk refund pesanan #${selectedCancelOrder.order_number}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition"
                                >
                                    Hubungi Admin Deny (WA)
                                </a>
                            </div>
                        </div>

                        {/* Refund Form */}
                        {(selectedCancelOrder.payment_method || '').toLowerCase() !== 'cod' && (
                            <div className="space-y-3 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Bank Pengembalian</label>
                                    <select 
                                        value={refundBank} 
                                        onChange={(e) => setRefundBank(e.target.value)}
                                        className="w-full text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none"
                                    >
                                        <option value="BSI">BSI (Bank Syariah Indonesia) - Bebas Biaya Admin</option>
                                        <option value="BCA">BCA (Bank Central Asia)</option>
                                        <option value="Mandiri">Bank Mandiri</option>
                                        <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                                        <option value="BNI">BNI (Bank Negara Indonesia)</option>
                                        <option value="Bank Jago">Bank Jago / Seabank / Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nomor Rekening Refund</label>
                                    <input 
                                        type="text"
                                        placeholder="Contoh: 7123456789"
                                        value={refundAccount}
                                        onChange={(e) => setRefundAccount(e.target.value)}
                                        className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Atas Nama Rekening</label>
                                    <input 
                                        type="text"
                                        placeholder="Contoh: Deny Setiawan"
                                        value={refundHolder}
                                        onChange={(e) => setRefundHolder(e.target.value)}
                                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Pembatalan</label>
                            <textarea
                                placeholder="Contoh: Berubah pikiran / Salah memilih varian produk"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl p-2.5 outline-none h-16"
                            ></textarea>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleConfirmCancelOrder}
                                disabled={submittingCancel}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                            >
                                {submittingCancel ? 'Memproses...' : 'Kirim Pengajuan Pembatalan'}
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