import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAdminAllTransactions } from '../../services/digitalProductApi';

const formatIDR = (amount) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount || 0);
};

const AdminTransactionHistoryPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const res = await getAdminAllTransactions();
            setTransactions(res.data);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch =
            (t.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.product_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.buyer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.buyer_email || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' || t.type === filterType;

        return matchesSearch && matchesType;
    });

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <Header />
            <div className="max-w-6xl mx-auto w-full px-4 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Riwayat Transaksi (CRM)</h1>
                        <p className="text-xs text-gray-500">Pantau semua transaksi produk digital dan course.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-sm shadow-sm focus:ring-1 focus:ring-green-500"
                        >
                            <option value="all">Semua Tipe</option>
                            <option value="digital">Produk Digital</option>
                            <option value="course">E-Course</option>
                        </select>
                        <div className="relative">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Cari order, produk, atau pembeli..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-green-500 w-full sm:w-64 shadow-sm"
                            />
                        </div>
                        <button
                            onClick={fetchTransactions}
                            className="bg-white border border-gray-100 p-2 rounded-xl text-gray-500 hover:text-green-600 shadow-sm"
                        >
                            <span className="material-icons text-sm">refresh</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                        <span className="material-icons text-4xl text-gray-200 mb-2">receipt_long</span>
                        <p className="text-gray-500">Tidak ada transaksi ditemukan.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3">Order # / Tipe</th>
                                        <th className="px-4 py-3">Produk / Penjual</th>
                                        <th className="px-4 py-3">Pembeli (CRM Data)</th>
                                        <th className="px-4 py-3">Nominal</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Tanggal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredTransactions.map((t) => (
                                        <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50/50 transition">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-800">{t.order_number}</div>
                                                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1 ${t.type === 'digital' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {t.type === 'digital' ? 'DIGITAL' : 'COURSE'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-semibold text-gray-800 line-clamp-1">{t.product_title}</div>
                                                <div className="text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <span className="material-icons text-[10px]">person</span>
                                                    {t.seller_name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-800">{t.buyer_name}</div>
                                                <div className="text-gray-400 flex items-center gap-1">
                                                    <span className="material-icons text-[10px]">email</span>
                                                    {t.buyer_email}
                                                </div>
                                                <div className="text-gray-400 flex items-center gap-1">
                                                    <span className="material-icons text-[10px]">phone</span>
                                                    {t.buyer_phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-900">{formatIDR(t.amount)}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${t.payment_status === 'verified' || t.payment_status === 'paid'
                                                        ? 'bg-green-100 text-green-700'
                                                        : t.payment_status === 'rejected'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {t.payment_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-gray-400 whitespace-nowrap">
                                                {new Date(t.created_at).toLocaleString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                                <div className="text-[10px]">
                                                    {new Date(t.created_at).toLocaleTimeString('id-ID', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default AdminTransactionHistoryPage;
