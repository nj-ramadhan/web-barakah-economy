import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';

const DashboardSinergySellerOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [localResi, setLocalResi] = useState({}); // { orderId: resiValue }


    const statusOptions = ['Pending', 'Proses', 'Dikirim', 'Selesai', 'Batal'];

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.is_superuser || false;

    const fetchOrders = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setOrders(res.data);
        } catch (error) {
            console.error("Failed fetching seller orders", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleExportCSV = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/export-csv/`, {
                headers: { Authorization: `Bearer ${user.access}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'rekap_pesanan_sinergy.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Gagal mengekspor CSV');
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus pesanan ini?')) return;
        if (!user) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setOrders(orders.filter(o => o.id !== orderId));
            alert('Pesanan berhasil dihapus');
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal menghapus pesanan');
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        if (!user) return;
        
        const resiToSave = localResi[orderId] !== undefined ? localResi[orderId] : orders.find(o => o.id === orderId)?.resi_number;
        
        setUpdatingId(orderId);
        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/`, 
                { 
                    status: newStatus,
                    resi_number: resiToSave
                },
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            // Update local state
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus, resi_number: resiToSave } : o));
            alert('Status pesanan berhasil diperbarui!');
        } catch (error) {
            alert('Gagal mengubah status pesanan');
        } finally {
            setUpdatingId(null);
        }
    };


    const [sendingWaId, setSendingWaId] = useState(null);

    const handleSendWa = async (orderId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        setSendingWaId(orderId);
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/send-wa-update/`, 
                {},
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            alert(res.data.message || 'Pemberitahuan WA berhasil dikirim!');
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal mengirim WA. Pastikan nomor HP pembeli valid.');
        } finally {
            setSendingWaId(null);
        }
    };

    const formatIDR = (amount) => {
        return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount || 0);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Proses': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Dikirim': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'Selesai': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Batal': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Kelola Pesanan - Barakah Economy</title></Helmet>
            <Header />
            
            <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard/sinergy/seller" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-emerald-600 transition">
                            <span className="material-icons">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Manajemen Pesanan Masuk</h1>
                            <p className="text-sm text-gray-500">Proses pemesanan produk fisik Sinergy Anda</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                    >
                        <span className="material-icons text-sm text-emerald-600">file_download</span>
                        EKSPOR CSV
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Memuat data pesanan...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-4xl text-gray-300">shopping_basket</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-700">Belum Ada Pesanan</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Pesanan pelanggan akan muncul di sini setelah mereka melakukan checkout produk Anda.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                {/* Order Header */}
                                <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4 bg-gray-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-emerald-600 text-white p-2 rounded-lg">
                                            <span className="material-icons text-sm">receipt</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Nomor Pesanan</p>
                                            <p className="text-sm font-bold text-gray-800">{order.order_number}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                        <p className="text-[11px] text-gray-400 font-medium">
                                            {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => handleDeleteOrder(order.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition shadow-sm border border-red-100"
                                                title="Hapus Pesanan (Admin Only)"
                                            >
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Buyer Info */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-icons text-sm">person</span> Informasi Pembeli
                                        </h4>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-sm font-bold text-gray-800">{order.buyer_details?.name_full || order.buyer_details?.username}</p>
                                            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                <span className="material-icons text-[14px]">phone</span> {order.buyer_details?.phone || '-'}
                                            </p>
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Alamat Pengiriman</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    {order.buyer_details?.address}<br />
                                                    {order.buyer_details?.address_city_name}, {order.buyer_details?.address_province}<br />
                                                    {order.buyer_details?.address_postal_code}
                                                </p>
                                            </div>
                                            {order.buyer_note && (
                                                <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                                    <p className="text-[10px] font-bold text-orange-800 uppercase mb-1">Catatan dari Pembeli</p>
                                                    <p className="text-xs text-orange-900 italic">"{order.buyer_note}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="md:col-span-1 space-y-4">
                                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-icons text-sm">inventory_2</span> Produk Dipesan
                                        </h4>
                                        <div className="space-y-3">
                                            {order.items?.map(item => (
                                                <div key={item.id} className="flex gap-3">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                                                        {item.product_image ? (
                                                            <img src={`${process.env.REACT_APP_API_BASE_URL}${item.product_image}`} alt={item.product_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-icons text-gray-400">image</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.product_name}</p>
                                                        {item.variation_name && <p className="text-[10px] text-emerald-600 font-medium">Varian: {item.variation_name}</p>}
                                                        <p className="text-[10px] text-gray-500">{item.quantity} x {formatIDR(item.price / item.quantity)}</p>
                                                        {item.purchase_instructions && (
                                                            <p className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 border border-blue-100">
                                                                <span className="font-bold">Info Produk:</span> {item.purchase_instructions}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="pt-3 border-t border-gray-100">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-500">Subtotal</span>
                                                    <span className="font-bold">{formatIDR(order.total_price)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs mt-1">
                                                    <span className="text-gray-500">Ongkir ({order.shipping_courier})</span>
                                                    <span className="font-bold">{formatIDR(order.shipping_cost)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm font-black text-emerald-700 mt-2 p-2 bg-emerald-50 rounded-lg">
                                                    <span>Total</span>
                                                    <span>{formatIDR(order.grand_total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Controls */}
                                    <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Update Status</label>
                                                <div className="relative">
                                                    <select 
                                                        value={order.status}
                                                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                                        disabled={updatingId === order.id}
                                                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none transition disabled:opacity-50"
                                                    >
                                                        {statusOptions.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        {updatingId === order.id ? (
                                                            <div className="animate-spin h-4 w-4 border-b-2 border-emerald-600 rounded-full"></div>
                                                        ) : (
                                                            <span className="material-icons text-gray-400">expand_more</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor Resi Pengiriman</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text"
                                                        placeholder="Masukkan No. Resi..."
                                                        value={localResi[order.id] !== undefined ? localResi[order.id] : (order.resi_number || '')}
                                                        onChange={(e) => setLocalResi({ ...localResi, [order.id]: e.target.value })}
                                                        disabled={updatingId === order.id}
                                                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none transition disabled:opacity-50"
                                                    />
                                                    <button 
                                                        onClick={() => handleUpdateStatus(order.id, order.status)}
                                                        disabled={updatingId === order.id}
                                                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                                                        title="Simpan Resi"
                                                    >
                                                        <span className="material-icons text-sm">save</span>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleSendWa(order.id)}
                                                disabled={sendingWaId === order.id}
                                                className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition group disabled:opacity-50"
                                            >
                                                {sendingWaId === order.id ? (
                                                    <div className="animate-spin h-3 w-3 border-b-2 border-emerald-600 rounded-full"></div>
                                                ) : (
                                                    <span className="material-icons text-sm">whatsapp</span>
                                                )}
                                                KIRIM NOTIFIKASI WA
                                            </button>

                                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                                <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                                                    <span className="font-bold">Info:</span> Klik <span className="font-bold italic">Simpan</span> untuk update status & resi. Klik <span className="font-bold italic text-emerald-700">Kirim Notifikasi WA</span> untuk mengirim update manual ke pembeli.
                                                </p>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                        ))}
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardSinergySellerOrdersPage;
