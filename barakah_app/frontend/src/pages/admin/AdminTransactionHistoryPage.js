import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAdminAllTransactions } from '../../services/digitalProductApi';
import { formatCurrency } from '../../utils/formatters';

const formatIDR = (amount) => {
    return 'Rp ' + formatCurrency(amount);
};

const AdminTransactionHistoryPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await getAdminAllTransactions();
            setTransactions(res.data);
            setCurrentPage(1); // Reset to first page on refresh
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleFilterChange = (e) => {
        setFilterType(e.target.value);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleItemsPerPageChange = (e) => {
        const value = e.target.value === 'all' ? transactions.length : parseInt(e.target.value);
        setItemsPerPage(value);
        setCurrentPage(1);
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

    // Pagination Calculation
    const totalItems = filteredTransactions.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTransactions = itemsPerPage === transactions.length ? filteredTransactions : filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

    const exportToCSV = () => {
        if (filteredTransactions.length === 0) return;

        const headers = ["Order Number", "Type", "Product Title", "Seller", "Buyer Name", "Buyer Email", "Buyer Phone", "Amount", "Status", "Date"];
        const csvRows = [
            headers.join(','),
            ...filteredTransactions.map(t => [
                t.order_number,
                t.type,
                `"${(t.product_title || '').replace(/"/g, '""')}"`,
                t.seller_name,
                `"${(t.buyer_name || '').replace(/"/g, '""')}"`,
                t.buyer_email,
                `'${t.buyer_phone}`, // Add ' to prevent Excel from stripping leading zero
                t.amount,
                t.payment_status,
                new Date(t.created_at).toLocaleString('id-ID')
            ].join(','))
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `transaction_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <Header />
            <div className="max-w-6xl mx-auto w-full px-4 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Riwayat Transaksi (CRM)</h1>
                        <p className="text-xs text-gray-500">Pantau semua transaksi produk digital dan course.</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={exportToCSV}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm"
                            disabled={filteredTransactions.length === 0}
                        >
                            <span className="material-icons text-sm">download</span>
                            Export CSV
                        </button>
                        <select
                            value={filterType}
                            onChange={handleFilterChange}
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
                                onChange={handleSearchChange}
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
                    <>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
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
                                        {currentTransactions.map((t) => (
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

                        {/* Pagination Controls */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Tampilkan:</span>
                                <select
                                    value={itemsPerPage === transactions.length ? 'all' : itemsPerPage}
                                    onChange={handleItemsPerPageChange}
                                    className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-green-500"
                                >
                                    <option value="10">10</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="all">Semua</option>
                                </select>
                                <span className="text-xs text-gray-500 ml-2">Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} dari {totalItems} data</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
                                >
                                    <span className="material-icons text-sm">chevron_left</span>
                                </button>

                                {totalPages <= 7 ? (
                                    Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition ${currentPage === page ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setCurrentPage(1)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold ${currentPage === 1 ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            1
                                        </button>
                                        {currentPage > 3 && <span className="text-gray-400 px-1">...</span>}
                                        {currentPage > 2 && currentPage < totalPages - 1 && (
                                            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-600 text-white text-xs font-bold">
                                                {currentPage}
                                            </button>
                                        )}
                                        {currentPage < totalPages - 2 && <span className="text-gray-400 px-1">...</span>}
                                        <button
                                            onClick={() => setCurrentPage(totalPages)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold ${currentPage === totalPages ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
                                >
                                    <span className="material-icons text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default AdminTransactionHistoryPage;
