// pages/admin/DashboardAdminIncomingFundsPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import Pagination from '../../components/common/Pagination';
import '../../styles/Body.css';

const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const DashboardAdminIncomingFundsPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [filteredStats, setFilteredStats] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Filter States
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
    const [dateRangePreset, setDateRangePreset] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // KPI Summary Collapsible State
    const [isKpiOpen, setIsKpiOpen] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50); // 10, 50, 100, 'all'

    // Proof Modal State
    const [selectedProof, setSelectedProof] = useState(null);

    const fetchIncomingFunds = useCallback(async () => {
        setLoading(true);
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/login');
            return;
        }

        try {
            const user = JSON.parse(userData);
            let url = `${process.env.REACT_APP_API_BASE_URL}/api/transactions/admin/incoming-funds/`;

            const params = {};
            if (categoryFilter !== 'all') params.category = categoryFilter;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (paymentMethodFilter !== 'all') params.payment_method = paymentMethodFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            if (dateRangePreset === 'today') {
                const today = new Date().toISOString().split('T')[0];
                params.start_date = today;
                params.end_date = today;
            } else if (dateRangePreset === '7days') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                params.start_date = d.toISOString().split('T')[0];
            } else if (dateRangePreset === 'month') {
                const d = new Date();
                d.setDate(1);
                params.start_date = d.toISOString().split('T')[0];
            } else if (dateRangePreset === 'custom') {
                if (customStartDate) params.start_date = customStartDate;
                if (customEndDate) params.end_date = customEndDate;
            }

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${user.access}` },
                params
            });

            setTransactions(response.data.transactions || []);
            setSummary(response.data.summary || null);
            setFilteredStats(response.data.filtered_stats || null);
            setCurrentPage(1);
        } catch (error) {
            console.error('Failed fetching incoming funds:', error);
            if (error.response?.status === 403) {
                alert('Akses ditolak: Menu ini khusus administrator.');
                navigate('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    }, [categoryFilter, statusFilter, paymentMethodFilter, dateRangePreset, customStartDate, customEndDate, searchQuery, navigate]);

    useEffect(() => {
        fetchIncomingFunds();
    }, [fetchIncomingFunds]);

    // Categories tabs
    const categoryTabs = [
        { id: 'all', label: 'Semua Kategori', icon: 'apps' },
        { id: 'store', label: 'Toko / Sinergy', icon: 'storefront' },
        { id: 'digital', label: 'Produk Digital', icon: 'cloud_download' },
        { id: 'course', label: 'E-Course / Kelas', icon: 'school' },
        { id: 'event', label: 'Event / Tiket', icon: 'confirmation_number' },
        { id: 'charity', label: 'Charity / Donasi', icon: 'volunteer_activism' },
        { id: 'zis', label: 'ZIS Rutin', icon: 'account_balance_wallet' },
    ];

    // Pagination calculations
    const paginatedTransactions = useMemo(() => {
        if (perPage === 'all' || perPage >= transactions.length) {
            return transactions;
        }
        const start = (currentPage - 1) * perPage;
        return transactions.slice(start, start + perPage);
    }, [transactions, currentPage, perPage]);

    const totalPages = useMemo(() => {
        if (perPage === 'all') return 1;
        return Math.ceil(transactions.length / perPage) || 1;
    }, [transactions.length, perPage]);

    // Delete single transaction entry (Admin cleanup)
    const handleDeleteTransaction = async (tx) => {
        const confirmMsg = `Hapus data transaksi #${tx.order_number} (${tx.category_label} - ${tx.title})?\n\nPerhatian: Data ini akan dihapus dari sistem, dan saldo dompet user/penjual terkait akan otomatis ditarik / disesuaikan kembali (pembersihan data bersih).\n\nLanjutkan penghapusan?`;
        if (!window.confirm(confirmMsg)) return;

        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            setDeletingId(tx.id);
            const res = await axios.delete(
                `${process.env.REACT_APP_API_BASE_URL}/api/transactions/admin/incoming-funds/`,
                {
                    headers: { Authorization: `Bearer ${user.access}` },
                    data: { category: tx.category, raw_id: tx.raw_id }
                }
            );
            alert(res.data?.message || `Data transaksi ${tx.order_number} berhasil dihapus.`);
            fetchIncomingFunds();
        } catch (err) {
            console.error('Failed deleting transaction:', err);
            alert(err.response?.data?.error || 'Gagal menghapus data transaksi.');
        } finally {
            setDeletingId(null);
        }
    };

    // Export to CSV Function
    const handleExportExcel = (exportAll = false) => {
        const dataToExport = exportAll ? transactions : paginatedTransactions;
        if (!dataToExport || dataToExport.length === 0) {
            alert('Tidak ada data untuk diekspor.');
            return;
        }

        const headers = [
            'No. Invoice / Pesanan',
            'Kategori',
            'Judul Transaksi / Produk',
            'Penjual / Vendor',
            'Nama Pembayar / Donatur',
            'Email',
            'No. Telepon / WA',
            'Nominal Pokok (Rp)',
            'Biaya Layanan / Admin (Rp)',
            'Ongkir (Rp)',
            'Total Pembayaran (Rp)',
            'Metode Pembayaran',
            'Status Pembayaran',
            'Status Asli',
            'Tanggal & Waktu',
            'Informasi Tambahan'
        ];

        const rows = dataToExport.map(item => [
            `"${item.order_number || ''}"`,
            `"${item.category_label || ''}"`,
            `"${(item.title || '').replace(/"/g, '""')}"`,
            `"${(item.seller_name ? `${item.seller_name} (@${item.seller_username})` : '').replace(/"/g, '""')}"`,
            `"${(item.customer_name || '').replace(/"/g, '""')}"`,
            `"${item.customer_email || ''}"`,
            `"${item.customer_phone || ''}"`,
            item.base_amount || 0,
            item.admin_fee || 0,
            item.shipping_cost || 0,
            item.grand_total || 0,
            `"${item.payment_method || ''}"`,
            `"${item.payment_status || ''}"`,
            `"${item.raw_status || ''}"`,
            `"${formatDate(item.created_at)}"`,
            `"${(item.extra_info || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `Rekap_Uang_Masuk_BAE_${categoryFilter}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper Badges
    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'store':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><span className="material-icons text-[12px]">storefront</span> Toko Sinergy</span>;
            case 'digital':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1"><span className="material-icons text-[12px]">cloud_download</span> Produk Digital</span>;
            case 'course':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"><span className="material-icons text-[12px]">school</span> E-Course</span>;
            case 'event':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"><span className="material-icons text-[12px]">confirmation_number</span> Event</span>;
            case 'charity':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><span className="material-icons text-[12px]">volunteer_activism</span> Charity</span>;
            case 'zis':
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1"><span className="material-icons text-[12px]">account_balance_wallet</span> ZIS</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gray-50 text-gray-700 border border-gray-200">{cat}</span>;
        }
    };

    const getStatusBadge = (status, raw) => {
        if (status === 'verified') {
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="material-icons text-[12px]">check_circle</span>
                    Lunas / Terverifikasi
                </span>
            );
        }
        if (status === 'refunded') {
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1" title="Uang sempat masuk/ditransfer lalu dibatalkan & direfund">
                    <span className="material-icons text-[12px]">restart_alt</span>
                    Batal (Sempat Transfer / Refund)
                </span>
            );
        }
        if (status === 'rejected') {
            return (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                    <span className="material-icons text-[12px]">cancel</span>
                    Batal / Ditolak
                </span>
            );
        }
        return (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <span className="material-icons text-[12px]">hourglass_top</span>
                Menunggu Verifikasi
            </span>
        );
    };

    const getPaymentMethodBadge = (method) => {
        const m = (method || '').toLowerCase();
        if (m.includes('dynaqris') || m.includes('qris')) {
            return <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">DynaQRIS</span>;
        }
        if (m.includes('saldo')) {
            return <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">Saldo BAE</span>;
        }
        if (m.includes('cod')) {
            return <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">COD</span>;
        }
        return <span className="text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">Transfer Manual</span>;
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Manajemen Uang Masuk - Admin BAE</title>
            </Helmet>
            <Header />

            <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
                {/* Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-emerald-600 transition"
                        >
                            <span className="material-icons">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
                                <span className="material-icons text-emerald-600">account_balance</span>
                                Manajemen Uang Masuk (Incoming Funds Hub)
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Rekapitulasi & audit seluruh arus kas masuk dari Event, Charity, E-Course, Produk Digital, dan Toko Sinergy
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchIncomingFunds}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                        >
                            <span className="material-icons text-sm text-emerald-600">refresh</span>
                            Segarkan
                        </button>
                        <button
                            onClick={() => handleExportExcel(true)}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition shadow-md shadow-emerald-200"
                        >
                            <span className="material-icons text-sm">file_download</span>
                            Ekspor Excel (Semua Data)
                        </button>
                    </div>
                </div>

                {/* Collapsible Executive Summary & KPI Section */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
                    <div 
                        onClick={() => setIsKpiOpen(!isKpiOpen)}
                        className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-gray-100"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <span className="material-icons text-lg">insights</span>
                            </div>
                            <div>
                                <h3 className="font-black text-sm text-gray-800 tracking-tight">
                                    Ringkasan Eksekutif &amp; KPI Uang Masuk
                                </h3>
                                <p className="text-[10px] text-gray-400 font-medium">
                                    Klik untuk {isKpiOpen ? 'menyembunyikan' : 'membuka'} kartu kalkulasi total dan per kategori
                                </p>
                            </div>
                        </div>
                        <button className="w-8 h-8 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-700 flex items-center justify-center transition">
                            <span className="material-icons">{isKpiOpen ? 'expand_less' : 'expand_more'}</span>
                        </button>
                    </div>

                    {isKpiOpen && (
                        <div className="pt-4 space-y-4 animate-in fade-in duration-300">
                            {/* Top Totals Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-lg shadow-emerald-100">
                                    <div className="flex justify-between items-center opacity-80 text-xs font-bold mb-1">
                                        <span>Total Uang Masuk (Lunas)</span>
                                        <span className="material-icons text-base">verified</span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">
                                        {formatIDR(summary?.total_income_all || 0)}
                                    </h2>
                                    <p className="text-[11px] opacity-75 mt-1 font-medium">
                                        Dari {summary?.total_count || 0} total transaksi terdata
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-100">
                                    <div className="flex justify-between items-center opacity-80 text-xs font-bold mb-1">
                                        <span>Total Uang Masuk (Pending)</span>
                                        <span className="material-icons text-base">hourglass_top</span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">
                                        {formatIDR(summary?.total_income_pending || 0)}
                                    </h2>
                                    <p className="text-[11px] opacity-75 mt-1 font-medium">
                                        Menunggu konfirmasi / verifikasi pembayaran
                                    </p>
                                </div>

                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 text-white shadow-lg shadow-indigo-100">
                                    <div className="flex justify-between items-center opacity-80 text-xs font-bold mb-1">
                                        <span>Hasil Filter Saat Ini</span>
                                        <span className="material-icons text-base">filter_alt</span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">
                                        {formatIDR(filteredStats?.total_verified_amount || 0)}
                                    </h2>
                                    <p className="text-[11px] opacity-75 mt-1 font-medium">
                                        {filteredStats?.total_count || 0} transaksi ({formatIDR(filteredStats?.total_pending_amount || 0)} pending)
                                    </p>
                                </div>
                            </div>

                            {/* Category Breakdown Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    { cat: 'store', label: 'Toko / Sinergy', icon: 'storefront' },
                                    { cat: 'digital', label: 'Produk Digital', icon: 'cloud_download' },
                                    { cat: 'course', label: 'E-Course', icon: 'school' },
                                    { cat: 'event', label: 'Event Tiket', icon: 'confirmation_number' },
                                    { cat: 'charity', label: 'Charity Donasi', icon: 'volunteer_activism' },
                                    { cat: 'zis', label: 'ZIS Rutin', icon: 'account_balance_wallet' },
                                ].map(c => {
                                    const item = summary?.by_category?.[c.cat] || { count: 0, verified_amount: 0, pending_amount: 0 };
                                    return (
                                        <div key={c.cat} className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 hover:border-emerald-200 transition">
                                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                                <span className="material-icons text-sm">{c.icon}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{c.label}</span>
                                            </div>
                                            <p className="text-xs font-black text-gray-800">
                                                {formatIDR(item.verified_amount)}
                                            </p>
                                            <p className="text-[9px] text-gray-400 font-medium mt-0.5">
                                                {item.count} pesanan
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Payment Methods Distribution */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100 text-xs">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-2">Metode:</span>
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl font-bold border border-emerald-100">
                                    DynaQRIS: {formatIDR(summary?.by_payment_method?.dynaqris?.amount || 0)} ({summary?.by_payment_method?.dynaqris?.count || 0})
                                </span>
                                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-xl font-bold border border-gray-200">
                                    Transfer Manual: {formatIDR(summary?.by_payment_method?.transfer?.amount || 0)} ({summary?.by_payment_method?.transfer?.count || 0})
                                </span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-xl font-bold border border-blue-100">
                                    Saldo BAE: {formatIDR(summary?.by_payment_method?.saldo_bae?.amount || 0)} ({summary?.by_payment_method?.saldo_bae?.count || 0})
                                </span>
                                <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-xl font-bold border border-amber-100">
                                    COD: {formatIDR(summary?.by_payment_method?.cod?.amount || 0)} ({summary?.by_payment_method?.cod?.count || 0})
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filter Controls Card */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6 space-y-4">
                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {categoryTabs.map(tab => {
                            const isActive = categoryFilter === tab.id;
                            const count = tab.id === 'all'
                                ? transactions.length
                                : (summary?.by_category?.[tab.id]?.count || 0);

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setCategoryFilter(tab.id)}
                                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 shrink-0 ${
                                        isActive
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className="material-icons text-sm">{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    {tab.id !== 'all' && (
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-emerald-800 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Secondary Filters Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                        {/* Search Query */}
                        <div className="relative">
                            <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Cari invoice, nama, email, hp, atau produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            />
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            >
                                <option value="all">Semua Status</option>
                                <option value="verified">✅ Terverifikasi / Lunas</option>
                                <option value="pending">⏳ Menunggu Verifikasi</option>
                                <option value="refunded">⚠️ Batal (Sempat Transfer / Refund)</option>
                                <option value="rejected">❌ Batal / Ditolak</option>
                            </select>
                        </div>

                        {/* Payment Method Filter */}
                        <div>
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            >
                                <option value="all">Semua Metode Pembayaran</option>
                                <option value="dynaqris">DynaQRIS (Otomatis)</option>
                                <option value="transfer">Transfer Bank / QRIS Manual</option>
                                <option value="saldo_bae">100% Saldo BAE</option>
                                <option value="cod">COD (Bayar di Tempat)</option>
                            </select>
                        </div>

                        {/* Date Preset */}
                        <div>
                            <select
                                value={dateRangePreset}
                                onChange={(e) => setDateRangePreset(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            >
                                <option value="all">Semua Waktu</option>
                                <option value="today">Hari Ini</option>
                                <option value="7days">7 Hari Terakhir</option>
                                <option value="month">Bulan Ini</option>
                                <option value="custom">Pilih Rentang Tanggal...</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom Date Range if selected */}
                    {dateRangePreset === 'custom' && (
                        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
                            <span className="font-bold text-gray-600">Rentang Tanggal:</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                                />
                                <span className="text-gray-400">s/d</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Table Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    {/* Table Header Bar */}
                    <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/40">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-gray-800 tracking-tight">
                                Daftar Transaksi Uang Masuk
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                                {transactions.length} Data
                            </span>
                        </div>

                        {/* Per Page Selector & Quick Export */}
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-400 font-bold">Tampilkan:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                                        setPerPage(val);
                                        setCurrentPage(1);
                                    }}
                                    className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                                >
                                    <option value={10}>10</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value="all">Semua</option>
                                </select>
                            </div>

                            <button
                                onClick={() => handleExportExcel(false)}
                                className="flex items-center gap-1 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm"
                                title="Ekspor halaman yang sedang ditampilkan"
                            >
                                <span className="material-icons text-sm text-emerald-600">table_view</span>
                                Ekspor Halaman Ini
                            </button>
                        </div>
                    </div>

                    {/* Table Content */}
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Memuat data uang masuk...
                            </p>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-16 text-center">
                            <span className="material-icons text-5xl text-gray-300 mb-2">receipt_long</span>
                            <h4 className="text-base font-bold text-gray-700">Tidak Ada Transaksi Ditemukan</h4>
                            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                                Coba ubah kategori, status pembayaran, atau kata kunci pencarian Anda.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                        <th className="py-3.5 px-4">No. Invoice & Tanggal</th>
                                        <th className="py-3.5 px-4">Kategori &amp; Transaksi</th>
                                        <th className="py-3.5 px-4">Pembayar / Donatur</th>
                                        <th className="py-3.5 px-4">Metode Bayar</th>
                                        <th className="py-3.5 px-4 text-right">Nominal Masuk</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-center">Aksi / Verif</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {paginatedTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50/60 transition">
                                            {/* Invoice & Date */}
                                            <td className="py-3.5 px-4">
                                                <p className="font-mono font-bold text-gray-800">{tx.order_number}</p>
                                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                    {formatDate(tx.created_at)}
                                                </p>
                                            </td>

                                            {/* Category & Title */}
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                    {getCategoryBadge(tx.category)}
                                                    {tx.seller_name && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                            <span className="material-icons text-[11px]">store</span>
                                                            {tx.seller_name} (@{tx.seller_username})
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-bold text-gray-800 line-clamp-2 leading-tight">
                                                    {tx.title}
                                                </p>
                                                {tx.extra_info && (
                                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-snug">
                                                        {tx.extra_info}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Customer / Donor */}
                                            <td className="py-3.5 px-4">
                                                <p className="font-bold text-gray-800">{tx.customer_name}</p>
                                                {tx.customer_email && (
                                                    <p className="text-[10px] text-gray-400">{tx.customer_email}</p>
                                                )}
                                                {tx.customer_phone && (
                                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                        📞 {tx.customer_phone}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Payment Method */}
                                            <td className="py-3.5 px-4">
                                                {getPaymentMethodBadge(tx.payment_method)}
                                            </td>

                                            {/* Amount */}
                                            <td className="py-3.5 px-4 text-right">
                                                <p className="font-black text-gray-900 text-sm">
                                                    {formatIDR(tx.grand_total)}
                                                </p>
                                                {Number(tx.admin_fee) > 0 && (
                                                    <p className="text-[9px] text-blue-600 font-medium">
                                                        +Biaya Layanan: {formatIDR(tx.admin_fee)}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex justify-center">
                                                    {getStatusBadge(tx.payment_status, tx.raw_status)}
                                                </div>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    {/* Payment Proof Button */}
                                                    {tx.payment_proof_url && (
                                                        <button
                                                            onClick={() => setSelectedProof(getMediaUrl(tx.payment_proof_url))}
                                                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-700 transition"
                                                            title="Lihat Bukti Transfer"
                                                        >
                                                            <span className="material-icons text-sm">image</span>
                                                        </button>
                                                    )}

                                                    {/* Special Charity Action Button */}
                                                    {tx.category === 'charity' && (
                                                        <button
                                                            onClick={() => navigate('/dashboard/admin/campaigns')}
                                                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 transition"
                                                            title="Daftar Donatur & Verifikasi Donasi"
                                                        >
                                                            <span className="material-icons text-xs">how_to_reg</span>
                                                            <span>Verif Donatur</span>
                                                        </button>
                                                    )}

                                                    {/* Link to Origin Module */}
                                                    {tx.action_link && tx.category !== 'charity' && (
                                                        <button
                                                            onClick={() => navigate(tx.action_link)}
                                                            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
                                                            title="Buka Modul Terkait"
                                                        >
                                                            <span className="material-icons text-sm">open_in_new</span>
                                                        </button>
                                                    )}

                                                    {/* Delete Entry Button */}
                                                    <button
                                                        onClick={() => handleDeleteTransaction(tx)}
                                                        disabled={deletingId === tx.id}
                                                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition disabled:opacity-50"
                                                        title="Hapus data transaksi ini dari sistem"
                                                    >
                                                        {deletingId === tx.id ? (
                                                            <div className="animate-spin h-3.5 w-3.5 border-b-2 border-red-600 rounded-full"></div>
                                                        ) : (
                                                            <span className="material-icons text-sm">delete</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    {!loading && transactions.length > 0 && perPage !== 'all' && (
                        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/40">
                            <p className="text-xs text-gray-500 font-medium">
                                Menampilkan {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, transactions.length)} dari {transactions.length} transaksi
                            </p>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={transactions.length}
                                itemsPerPage={perPage}
                                showSummary={false}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Proof Modal */}
            {selectedProof && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedProof(null)}
                >
                    <div
                        className="bg-white rounded-3xl p-4 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-sm text-gray-800">Bukti Pembayaran / Transfer</h4>
                            <button
                                onClick={() => setSelectedProof(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>
                        <div className="rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center max-h-[70vh]">
                            <img
                                src={selectedProof}
                                alt="Bukti Pembayaran"
                                className="max-w-full max-h-[70vh] object-contain"
                            />
                        </div>
                        <div className="mt-3 flex justify-end">
                            <a
                                href={selectedProof}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
                            >
                                <span className="material-icons text-sm">download</span>
                                Unduh Gambar
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardAdminIncomingFundsPage;
