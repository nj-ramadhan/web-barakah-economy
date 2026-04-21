// pages/EcommerceOrderHistoryPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
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

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div className="body bg-gray-50/50 min-h-screen">
            <Header />
            
            <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">RIWAYAT BELANJA</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Daftar pesanan produk Sinergy Anda</p>
                    </div>
                    <button 
                        onClick={() => navigate('/belanja')}
                        className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors"
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
                        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">Anda belum pernah melakukan pembelian produk Sinergy.</p>
                        <button
                            onClick={() => navigate('/belanja')}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm tracking-wide hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                        >
                            BELANJA SEKARANG
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map((order) => (
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
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <span className="material-icons text-sm">calendar_today</span>
                                        <span className="text-xs font-bold">{formatDate(order.created_at)}</span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="space-y-3">
                                        {(order.items || []).map((item, idx) => (
                                            <div key={idx} className="flex gap-4 items-center p-3 bg-gray-50/50 rounded-2xl border border-gray-50 group-hover:bg-gray-50 transition-colors">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
                                                    <span className="material-icons text-emerald-600">inventory_2</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-gray-900 truncate">{item.product_name}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.quantity} Unit • {formatIDR(item.price)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-gray-50 mt-4">
                                        <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                                            <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Total Bayar</span>
                                            <span className="text-base font-black text-emerald-600">
                                                {formatIDR(Number(order.grand_total) > 0 ? order.grand_total : order.total_price)}
                                            </span>
                                        </div>
                                    </div>

                                    {order.payment_proof && (
                                        <a 
                                            href={order.payment_proof.startsWith('http') ? order.payment_proof : `${process.env.REACT_APP_API_BASE_URL}${order.payment_proof}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100"
                                        >
                                            <span className="material-icons text-base">receipt_long</span>
                                            Lihat Bukti Transfer
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <NavigationButton />
        </div>
    );
};

export default EcommerceOrderHistoryPage;