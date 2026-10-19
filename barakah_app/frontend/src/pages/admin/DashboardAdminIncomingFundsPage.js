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

const formatDateOnly = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const DashboardAdminIncomingFundsPage = () => {
    const navigate = useNavigate();

    // Primary Account Tab: 'commercial' (Store, Event, Digital, Course) vs 'charity' (Donasi & ZIS) vs 'all' (Konsolidasi)
    const [accountTab, setAccountTab] = useState('commercial');

    // Section View: 'incoming' (Uang Masuk) vs 'outgoing' (Uang Keluar & Penarikan) vs 'cashflow' (Arus Kas & Rekonsiliasi)
    const [sectionView, setSectionView] = useState('incoming');

    // Incoming Funds State
    const [loadingIncoming, setLoadingIncoming] = useState(true);
    const [incomingTransactions, setIncomingTransactions] = useState([]);
    const [incomingSummary, setIncomingSummary] = useState(null);
    const [incomingFilteredStats, setIncomingFilteredStats] = useState(null);
    const [deletingIncomingId, setDeletingIncomingId] = useState(null);

    // Incoming Filter States
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
    const [dateRangePreset, setDateRangePreset] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Outgoing Funds State
    const [loadingOutgoing, setLoadingOutgoing] = useState(false);
    const [outgoingTransactions, setOutgoingTransactions] = useState([]);
    const [outgoingSummary, setOutgoingSummary] = useState(null);
    const [outgoingFilteredStats, setOutgoingFilteredStats] = useState(null);
    const [outgoingStatusFilter, setOutgoingStatusFilter] = useState('all');
    const [outgoingCategoryFilter, setOutgoingCategoryFilter] = useState('all');
    const [outgoingSearchQuery, setOutgoingSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(50); // 10, 50, 100, 'all'

    // KPI Summary Collapsible State
    const [isKpiOpen, setIsKpiOpen] = useState(true);

    // Modal States
    const [selectedProof, setSelectedProof] = useState(null);

    // Modal: Input Uang Keluar Manual
    const [showCreateExpenseModal, setShowCreateExpenseModal] = useState(false);
    const [submittingExpense, setSubmittingExpense] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        fund_account: 'commercial',
        category: 'operational',
        title: '',
        amount: '',
        description: '',
        recipient_name: '',
        recipient_account: '',
        transaction_date: new Date().toISOString().split('T')[0],
        status: 'completed',
        proof_file: null,
    });

    // Modal: Process Withdrawal / Expense Status
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [processingItem, setProcessingItem] = useState(null);
    const [submittingProcess, setSubmittingProcess] = useState(false);
    const [processStatus, setProcessStatus] = useState('approved');
    const [processRejectionReason, setProcessRejectionReason] = useState('');
    const [processNotes, setProcessNotes] = useState('');
    const [processProofFile, setProcessProofFile] = useState(null);

    // Fetch Incoming Funds
    const fetchIncomingFunds = useCallback(async () => {
        setLoadingIncoming(true);
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/login');
            return;
        }

        try {
            const user = JSON.parse(userData);
            const url = `${process.env.REACT_APP_API_BASE_URL}/api/transactions/admin/incoming-funds/`;

            const params = {};
            if (accountTab !== 'all') params.account = accountTab;
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

            setIncomingTransactions(response.data.transactions || []);
            setIncomingSummary(response.data.summary || null);
            setIncomingFilteredStats(response.data.filtered_stats || null);
            setCurrentPage(1);
        } catch (error) {
            console.error('Failed fetching incoming funds:', error);
            if (error.response?.status === 403) {
                alert('Akses ditolak: Menu ini khusus administrator.');
                navigate('/dashboard');
            }
        } finally {
            setLoadingIncoming(false);
        }
    }, [accountTab, categoryFilter, statusFilter, paymentMethodFilter, dateRangePreset, customStartDate, customEndDate, searchQuery, navigate]);

    // Fetch Outgoing Funds
    const fetchOutgoingFunds = useCallback(async () => {
        setLoadingOutgoing(true);
        const userData = localStorage.getItem('user');
        if (!userData) return;

        try {
            const user = JSON.parse(userData);
            const url = `${process.env.REACT_APP_API_BASE_URL}/api/transactions/admin/outgoing-funds/`;

            const params = {};
            if (accountTab !== 'all') params.account = accountTab;
            if (outgoingStatusFilter !== 'all') params.status = outgoingStatusFilter;
            if (outgoingCategoryFilter !== 'all') params.category = outgoingCategoryFilter;
            if (outgoingSearchQuery.trim()) params.search = outgoingSearchQuery.trim();

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

            setOutgoingTransactions(response.data.expenses || []);
            setOutgoingSummary(response.data.summary || null);
            setOutgoingFilteredStats(response.data.filtered_stats || null);
            setCurrentPage(1);
        } catch (error) {
            console.error('Failed fetching outgoing funds:', error);
        } finally {
            setLoadingOutgoing(false);
        }
    }, [accountTab, outgoingStatusFilter, outgoingCategoryFilter, outgoingSearchQuery, dateRangePreset, customStartDate, customEndDate]);

    useEffect(() => {
        fetchIncomingFunds();
    }, [fetchIncomingFunds]);

    useEffect(() => {
        fetchOutgoingFunds();
    }, [fetchOutgoingFunds]);

    // Account calculation data for active tab
    const activeAccountData = useMemo(() => {
        if (!incomingSummary?.accounts) {
            return {
                income_verified: 0,
                income_pending: 0,
                expense_completed: 0,
                expense_pending: 0,
                balance: 0,
                qris_label: 'QRIS',
                account_name: 'Akun Terpilih'
            };
        }
        if (accountTab === 'commercial') {
            return incomingSummary.accounts.commercial || {};
        }
        if (accountTab === 'charity') {
            return incomingSummary.accounts.charity || {};
        }
        return incomingSummary.accounts.consolidated || {};
    }, [incomingSummary, accountTab]);

    // Categories tabs depending on active account tab
    const categoryTabs = useMemo(() => {
        if (accountTab === 'commercial') {
            return [
                { id: 'all', label: 'Semua Komersial', icon: 'apps' },
                { id: 'store', label: 'Toko / Sinergy', icon: 'storefront' },
                { id: 'digital', label: 'Produk Digital', icon: 'cloud_download' },
                { id: 'course', label: 'E-Course / Kelas', icon: 'school' },
                { id: 'event', label: 'Event / Tiket', icon: 'confirmation_number' },
            ];
        }
        if (accountTab === 'charity') {
            return [
                { id: 'all', label: 'Semua Sosial / ZISWAF', icon: 'apps' },
                { id: 'charity', label: 'Charity / Donasi', icon: 'volunteer_activism' },
                { id: 'zis', label: 'ZIS Rutin', icon: 'account_balance_wallet' },
            ];
        }
        return [
            { id: 'all', label: 'Semua Kategori', icon: 'apps' },
            { id: 'store', label: 'Toko / Sinergy', icon: 'storefront' },
            { id: 'digital', label: 'Produk Digital', icon: 'cloud_download' },
            { id: 'course', label: 'E-Course / Kelas', icon: 'school' },
            { id: 'event', label: 'Event / Tiket', icon: 'confirmation_number' },
            { id: 'charity', label: 'Charity / Donasi', icon: 'volunteer_activism' },
            { id: 'zis', label: 'ZIS Rutin', icon: 'account_balance_wallet' },
        ];
    }, [accountTab]);

    // Reset category filter if not supported by changed account tab
    useEffect(() => {
        if (accountTab === 'commercial' && (categoryFilter === 'charity' || categoryFilter === 'zis')) {
            setCategoryFilter('all');
        } else if (accountTab === 'charity' && ['store', 'digital', 'course', 'event'].includes(categoryFilter)) {
            setCategoryFilter('all');
        }
    }, [accountTab, categoryFilter]);

    // Active transactions according to section view
    const currentList = sectionView === 'incoming' ? incomingTransactions : outgoingTransactions;

    // Pagination calculations
    const paginatedTransactions = useMemo(() => {
        if (perPage === 'all' || perPage >= currentList.length) {
            return currentList;
        }
        const start = (currentPage - 1) * perPage;
        return currentList.slice(start, start + perPage);
    }, [currentList, currentPage, perPage]);

    const totalPages = useMemo(() => {
        if (perPage === 'all') return 1;
        return Math.ceil(currentList.length / perPage) || 1;
    }, [currentList.length, perPage]);

    // Submit Create Manual Expense
    const handleCreateExpense = async (e) => {
        e.preventDefault();
        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        if (!expenseForm.title.trim()) {
            alert('Judul pengeluaran wajib diisi.');
            return;
        }
        if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
            alert('Nominal pengeluaran harus lebih dari 0.');
            return;
        }

        setSubmittingExpense(true);
        try {
            const formData = new FormData();
            formData.append('title', expenseForm.title.trim());
            formData.append('amount', expenseForm.amount);
            formData.append('description', expenseForm.description.trim());
            formData.append('fund_account', expenseForm.fund_account);
            formData.append('category', expenseForm.category);
            formData.append('recipient_name', expenseForm.recipient_name.trim());
            formData.append('recipient_account', expenseForm.recipient_account.trim());
            formData.append('transaction_date', expenseForm.transaction_date);
            formData.append('status', expenseForm.status);
            if (expenseForm.proof_file) {
                formData.append('proof_file', expenseForm.proof_file);
            }

            const res = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/api/transactions/admin/outgoing-funds/`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${user.access}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            alert(res.data?.message || 'Data pengeluaran berhasil dicatat!');
            setShowCreateExpenseModal(false);
            setExpenseForm({
                fund_account: accountTab === 'charity' ? 'charity' : 'commercial',
                category: accountTab === 'charity' ? 'charity_distribution' : 'operational',
                title: '',
                amount: '',
                description: '',
                recipient_name: '',
                recipient_account: '',
                transaction_date: new Date().toISOString().split('T')[0],
                status: 'completed',
                proof_file: null,
            });

            // Refresh both to update balances
            fetchOutgoingFunds();
            fetchIncomingFunds();
        } catch (err) {
            console.error('Failed creating expense:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan pengeluaran.');
        } finally {
            setSubmittingExpense(false);
        }
    };

    // Open Process Modal (for Withdrawal / Pending Expense)
    const handleOpenProcessModal = (item) => {
        setProcessingItem(item);
        setProcessStatus(item.status === 'pending' ? 'approved' : item.status);
        setProcessRejectionReason(item.rejection_reason || '');
        setProcessNotes(item.description || '');
        setProcessProofFile(null);
        setShowProcessModal(true);
    };

    // Submit Process Withdrawal / Expense
    const handleProcessItem = async (e) => {
        e.preventDefault();
        if (!processingItem) return;

        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        setSubmittingProcess(true);
        try {
            const formData = new FormData();
            formData.append('source_type', processingItem.source_type);
            formData.append('raw_id', processingItem.raw_id);
            formData.append('status', processStatus);
            if (processRejectionReason) {
                formData.append('rejection_reason', processRejectionReason);
            }
            if (processNotes) {
                formData.append('description', processNotes);
            }
            if (processProofFile) {
                formData.append('proof_file', processProofFile);
            }

            const res = await axios.patch(
                `${process.env.REACT_APP_API_BASE_URL}/api/transactions/admin/outgoing-funds/`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${user.access}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            alert(res.data?.message || 'Status berhasil diperbarui!');
            setShowProcessModal(false);
            setProcessingItem(null);

            // Refresh outgoing & incoming funds
            fetchOutgoingFunds();
            fetchIncomingFunds();
        } catch (err) {
            console.error('Failed processing outgoing item:', err);
            alert(err.response?.data?.error || 'Gagal memproses item pengeluaran.');
        } finally {
            setSubmittingProcess(false);
        }
    };

    // Delete single incoming transaction entry (Admin cleanup)
    const handleDeleteIncomingTransaction = async (tx) => {
        const confirmMsg = `Hapus data transaksi #${tx.order_number} (${tx.category_label} - ${tx.title})?\n\nPerhatian: Data ini akan dihapus dari sistem, dan saldo dompet user/penjual terkait akan otomatis ditarik / disesuaikan kembali (pembersihan data bersih).\n\nLanjutkan penghapusan?`;
        if (!window.confirm(confirmMsg)) return;

        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            setDeletingIncomingId(tx.id);
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
            setDeletingIncomingId(null);
        }
    };

    // Delete Outgoing Fund
    const handleDeleteOutgoingTransaction = async (item) => {
        const confirmMsg = `Hapus catatan pengeluaran #${item.title} (${formatIDR(item.amount)})?\n\nLanjutkan penghapusan?`;
        if (!window.confirm(confirmMsg)) return;

        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            await axios.delete(
                `${process.env.REACT_APP_API_BASE_URL}/api/transactions/admin/outgoing-funds/`,
                {
                    headers: { Authorization: `Bearer ${user.access}` },
                    data: { source_type: item.source_type, raw_id: item.raw_id }
                }
            );
            alert('Catatan pengeluaran berhasil dihapus.');
            fetchOutgoingFunds();
            fetchIncomingFunds();
        } catch (err) {
            console.error('Failed deleting outgoing transaction:', err);
            alert('Gagal menghapus pengeluaran.');
        }
    };

    // Export to CSV Function
    const handleExportExcel = (exportAll = false) => {
        const dataToExport = exportAll ? currentList : paginatedTransactions;
        if (!dataToExport || dataToExport.length === 0) {
            alert('Tidak ada data untuk diekspor.');
            return;
        }

        let headers = [];
        let rows = [];

        if (sectionView === 'incoming') {
            headers = [
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
            rows = dataToExport.map(item => [
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
        } else {
            headers = [
                'ID / Ref',
                'Rekening Akun',
                'Kategori',
                'Judul Pengeluaran',
                'Nominal (Rp)',
                'Penerima / Rekening Tujuan',
                'Keterangan',
                'Status',
                'Tanggal Transaksi',
                'Dicatat Oleh'
            ];
            rows = dataToExport.map(item => [
                `"${item.id || ''}"`,
                `"${item.fund_account_label || ''}"`,
                `"${item.category_label || ''}"`,
                `"${(item.title || '').replace(/"/g, '""')}"`,
                item.amount || 0,
                `"${(item.recipient_name ? `${item.recipient_name} (${item.recipient_account || ''})` : item.recipient_account || '').replace(/"/g, '""')}"`,
                `"${(item.description || '').replace(/"/g, '""')}"`,
                `"${item.status_label || item.status || ''}"`,
                `"${item.transaction_date || ''}"`,
                `"${item.created_by || ''}"`
            ]);
        }

        const csvContent = '\uFEFF' + [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `Rekap_${sectionView}_${accountTab}_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Helper Badges
    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'store':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><span className="material-icons text-[11px]">storefront</span> Toko Sinergy</span>;
            case 'digital':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1"><span className="material-icons text-[11px]">cloud_download</span> Produk Digital</span>;
            case 'course':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"><span className="material-icons text-[11px]">school</span> E-Course</span>;
            case 'event':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"><span className="material-icons text-[11px]">confirmation_number</span> Event</span>;
            case 'charity':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><span className="material-icons text-[11px]">volunteer_activism</span> Charity</span>;
            case 'zis':
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1"><span className="material-icons text-[11px]">account_balance_wallet</span> ZIS</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gray-50 text-gray-700 border border-gray-200">{cat}</span>;
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'verified' || status === 'completed' || status === 'approved') {
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="material-icons text-[11px]">check_circle</span>
                    Lunas / Selesai
                </span>
            );
        }
        if (status === 'refunded') {
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <span className="material-icons text-[11px]">restart_alt</span>
                    Batal (Refund)
                </span>
            );
        }
        if (status === 'rejected' || status === 'cancelled') {
            return (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                    <span className="material-icons text-[11px]">cancel</span>
                    Batal / Ditolak
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <span className="material-icons text-[11px]">hourglass_top</span>
                Pending
            </span>
        );
    };

    const getPaymentMethodBadge = (method) => {
        const m = (method || '').toLowerCase();
        if (m.includes('dynaqris') || m.includes('qris')) {
            return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">DynaQRIS</span>;
        }
        if (m.includes('saldo')) {
            return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">Saldo BAE</span>;
        }
        if (m.includes('cod')) {
            return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">COD</span>;
        }
        return <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">Transfer Bank</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <Helmet>
                <title>Manajemen Keuangan & Uang Masuk - Admin BAE</title>
            </Helmet>

            <Header />

            <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
                {/* Top Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-xs text-gray-500 hover:text-emerald-600 transition"
                        >
                            <span className="material-icons">arrow_back</span>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span className="material-icons text-emerald-600">account_balance</span>
                                    Manajemen Keuangan &amp; Uang Masuk
                                </h1>
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-full uppercase tracking-wider">
                                    Dual QRIS &amp; Buku Kas
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Pemisahan Rekening Bisnis/Komersial &amp; Sosial/Charity, input pengeluaran kas, serta approval penarikan saldo seller &amp; user
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => {
                                fetchIncomingFunds();
                                fetchOutgoingFunds();
                            }}
                            className="flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                        >
                            <span className="material-icons text-sm text-emerald-600">refresh</span>
                            Segarkan
                        </button>

                        <button
                            onClick={() => {
                                setExpenseForm(prev => ({
                                    ...prev,
                                    fund_account: accountTab === 'charity' ? 'charity' : 'commercial',
                                    category: accountTab === 'charity' ? 'charity_distribution' : 'operational'
                                }));
                                setShowCreateExpenseModal(true);
                            }}
                            className="flex items-center gap-1.5 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-rose-700 transition shadow-md shadow-rose-200"
                        >
                            <span className="material-icons text-sm">add_circle</span>
                            Catat Uang Keluar
                        </button>

                        <button
                            onClick={() => handleExportExcel(true)}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition shadow-md shadow-emerald-200"
                        >
                            <span className="material-icons text-sm">file_download</span>
                            Ekspor Excel
                        </button>
                    </div>
                </div>

                {/* PRIMARY REKENING / QRIS SEPARATION TABS (2 QRIS SYSTEM) */}
                <div className="bg-white rounded-3xl p-2 shadow-xs border border-slate-200 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Tab 1: Rekening Komersial */}
                        <button
                            type="button"
                            onClick={() => {
                                setAccountTab('commercial');
                                setCurrentPage(1);
                            }}
                            className={`p-3.5 rounded-2xl text-left transition flex items-center justify-between border ${
                                accountTab === 'commercial'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-transparent shadow-md shadow-emerald-200'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    accountTab === 'commercial' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                    <span className="material-icons text-xl">storefront</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-black text-sm tracking-tight">Rekening Komersial</p>
                                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                            accountTab === 'commercial' ? 'bg-emerald-900/60 text-emerald-100' : 'bg-emerald-50 text-emerald-700'
                                        }`}>
                                            QRIS 1
                                        </span>
                                    </div>
                                    <p className={`text-[10px] mt-0.5 font-medium ${accountTab === 'commercial' ? 'text-emerald-100' : 'text-slate-400'}`}>
                                        Store, Event, Produk Digital, E-Course
                                    </p>
                                </div>
                            </div>
                            <span className="material-icons text-lg opacity-80">
                                {accountTab === 'commercial' ? 'check_circle' : 'chevron_right'}
                            </span>
                        </button>

                        {/* Tab 2: Rekening Charity & Sosial */}
                        <button
                            type="button"
                            onClick={() => {
                                setAccountTab('charity');
                                setCurrentPage(1);
                            }}
                            className={`p-3.5 rounded-2xl text-left transition flex items-center justify-between border ${
                                accountTab === 'charity'
                                    ? 'bg-gradient-to-r from-rose-600 to-pink-700 text-white border-transparent shadow-md shadow-rose-200'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    accountTab === 'charity' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                                }`}>
                                    <span className="material-icons text-xl">volunteer_activism</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-black text-sm tracking-tight">Rekening Charity &amp; Sosial</p>
                                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                            accountTab === 'charity' ? 'bg-rose-900/60 text-rose-100' : 'bg-rose-50 text-rose-700'
                                        }`}>
                                            QRIS 2
                                        </span>
                                    </div>
                                    <p className={`text-[10px] mt-0.5 font-medium ${accountTab === 'charity' ? 'text-rose-100' : 'text-slate-400'}`}>
                                        ZISWAF, Infaq &amp; Donasi Kebaikan
                                    </p>
                                </div>
                            </div>
                            <span className="material-icons text-lg opacity-80">
                                {accountTab === 'charity' ? 'check_circle' : 'chevron_right'}
                            </span>
                        </button>

                        {/* Tab 3: Konsolidasi Gabungan */}
                        <button
                            type="button"
                            onClick={() => {
                                setAccountTab('all');
                                setCurrentPage(1);
                            }}
                            className={`p-3.5 rounded-2xl text-left transition flex items-center justify-between border ${
                                accountTab === 'all'
                                    ? 'bg-gradient-to-r from-slate-800 to-indigo-900 text-white border-transparent shadow-md shadow-slate-300'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    accountTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    <span className="material-icons text-xl">account_balance</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-black text-sm tracking-tight">Semua Rekening</p>
                                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                                            accountTab === 'all' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            Konsolidasi
                                        </span>
                                    </div>
                                    <p className={`text-[10px] mt-0.5 font-medium ${accountTab === 'all' ? 'text-slate-200' : 'text-slate-400'}`}>
                                        Total Gabungan Kas Barakah Economy
                                    </p>
                                </div>
                            </div>
                            <span className="material-icons text-lg opacity-80">
                                {accountTab === 'all' ? 'check_circle' : 'chevron_right'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* KPI EXECUTIVE SUMMARY & REKENING BALANCE CARD */}
                <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 mb-6">
                    <div 
                        onClick={() => setIsKpiOpen(!isKpiOpen)}
                        className="flex items-center justify-between cursor-pointer select-none pb-3 border-b border-slate-100"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <span className="material-icons text-lg">query_stats</span>
                            </div>
                            <div>
                                <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-2">
                                    <span>Buku Kas &amp; Saldo:</span>
                                    <span className="text-emerald-700 underline decoration-emerald-300">
                                        {accountTab === 'commercial' ? 'Rekening Komersial (QRIS 1)' : (accountTab === 'charity' ? 'Rekening Charity (QRIS 2)' : 'Konsolidasi Semua Akun')}
                                    </span>
                                </h3>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Kalkulasi otomatis Total Masuk (Lunas) - Total Keluar (Selesai) = Saldo Sisa di Rekening
                                </p>
                            </div>
                        </div>
                        <button className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-700 flex items-center justify-center transition">
                            <span className="material-icons">{isKpiOpen ? 'expand_less' : 'expand_more'}</span>
                        </button>
                    </div>

                    {isKpiOpen && (
                        <div className="pt-4 space-y-4">
                            {/* Key Financial Cards (Calculated Separately per Account) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {/* Total Masuk */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1">
                                        <span>Total Uang Masuk (Lunas)</span>
                                        <span className="material-icons text-emerald-600 text-base">arrow_downward</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {formatIDR(activeAccountData.income_verified || 0)}
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                        {accountTab === 'charity' ? 'Donasi & ZIS Lunas' : 'Penjualan & Tiket Lunas'}
                                    </p>
                                </div>

                                {/* Total Keluar */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1">
                                        <span>Total Uang Keluar (Selesai)</span>
                                        <span className="material-icons text-rose-600 text-base">arrow_upward</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-rose-700 tracking-tight">
                                        {formatIDR(activeAccountData.expense_completed || 0)}
                                    </h2>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                                        {accountTab === 'charity' ? 'Penyaluran Mustahik / Operasional' : 'Operasional, Vendor & Penarikan Dana'}
                                    </p>
                                </div>

                                {/* Sisa Saldo di Rekening (Highlight Utama!) */}
                                <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-4 text-white shadow-lg shadow-emerald-100">
                                    <div className="flex justify-between items-center opacity-90 text-xs font-bold mb-1">
                                        <span>Sisa Saldo Kas di Rekening</span>
                                        <span className="material-icons text-base">account_balance_wallet</span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">
                                        {formatIDR(activeAccountData.balance || 0)}
                                    </h2>
                                    <p className="text-[11px] opacity-80 mt-1 font-medium">
                                        Uang Masuk Lunas − Uang Keluar Selesai
                                    </p>
                                </div>

                                {/* Pending Transactions */}
                                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-100">
                                    <div className="flex justify-between items-center opacity-90 text-xs font-bold mb-1">
                                        <span>Menunggu Proses / Pending</span>
                                        <span className="material-icons text-base">hourglass_top</span>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tight">
                                        {formatIDR((activeAccountData.income_pending || 0) + (activeAccountData.expense_pending || 0))}
                                    </h2>
                                    <p className="text-[11px] opacity-80 mt-1 font-medium">
                                        Masuk: {formatIDR(activeAccountData.income_pending || 0)} • Penarikan/Keluar: {formatIDR(activeAccountData.expense_pending || 0)}
                                    </p>
                                </div>
                            </div>

                            {/* Breakdown Sub-Cards for Categories */}
                            {accountTab === 'commercial' && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                                    {[
                                        { cat: 'store', label: 'Toko / Sinergy', icon: 'storefront' },
                                        { cat: 'digital', label: 'Produk Digital', icon: 'cloud_download' },
                                        { cat: 'course', label: 'E-Course', icon: 'school' },
                                        { cat: 'event', label: 'Event Tiket', icon: 'confirmation_number' },
                                    ].map(c => {
                                        const item = incomingSummary?.by_category?.[c.cat] || { count: 0, verified_amount: 0, pending_amount: 0 };
                                        return (
                                            <div key={c.cat} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                                                <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                                                    <span className="material-icons text-xs text-emerald-600">{c.icon}</span>
                                                    <span className="text-[10px] font-bold uppercase">{c.label}</span>
                                                </div>
                                                <p className="text-xs font-black text-slate-900">{formatIDR(item.verified_amount)}</p>
                                                <p className="text-[9px] text-slate-400 font-medium">{item.count} transaksi ({formatIDR(item.pending_amount)} pending)</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {accountTab === 'charity' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                                    {[
                                        { cat: 'charity', label: 'Charity & Program Donasi', icon: 'volunteer_activism' },
                                        { cat: 'zis', label: 'ZIS Rutin (Zakat, Infaq, Sedekah)', icon: 'account_balance_wallet' },
                                    ].map(c => {
                                        const item = incomingSummary?.by_category?.[c.cat] || { count: 0, verified_amount: 0, pending_amount: 0 };
                                        return (
                                            <div key={c.cat} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                                                        <span className="material-icons text-sm text-rose-600">{c.icon}</span>
                                                        <span className="text-[11px] font-bold uppercase">{c.label}</span>
                                                    </div>
                                                    <p className="text-sm font-black text-slate-900">{formatIDR(item.verified_amount)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                                                        {item.count} Setoran
                                                    </span>
                                                    <p className="text-[9px] text-slate-400 mt-1">Pending: {formatIDR(item.pending_amount)}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SUB-NAVIGATION: UANG MASUK VS UANG KELUAR & PENARIKAN VS ARUS KAS */}
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <button
                        type="button"
                        onClick={() => {
                            setSectionView('incoming');
                            setCurrentPage(1);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                            sectionView === 'incoming'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span className="material-icons text-sm">arrow_downward</span>
                        <span>Uang Masuk (Incoming Funds)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            sectionView === 'incoming' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {incomingTransactions.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setSectionView('outgoing');
                            setCurrentPage(1);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                            sectionView === 'outgoing'
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span className="material-icons text-sm">arrow_upward</span>
                        <span>Uang Keluar &amp; Penarikan Dana</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            sectionView === 'outgoing' ? 'bg-rose-800 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {outgoingTransactions.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSectionView('cashflow')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition ${
                            sectionView === 'cashflow'
                                ? 'bg-slate-800 text-white shadow-md shadow-slate-300'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span className="material-icons text-sm">balance</span>
                        <span>Rekonsiliasi 2 Rekening (Cashflow)</span>
                    </button>
                </div>

                {/* 1. VIEW: UANG MASUK */}
                {sectionView === 'incoming' && (
                    <>
                        {/* Filters Card */}
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 mb-6 space-y-4">
                            {/* Category Sub-Tabs */}
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                {categoryTabs.map(tab => {
                                    const isActive = categoryFilter === tab.id;
                                    const count = tab.id === 'all'
                                        ? incomingTransactions.length
                                        : (incomingSummary?.by_category?.[tab.id]?.count || 0);

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setCategoryFilter(tab.id)}
                                            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center gap-1.5 shrink-0 ${
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="material-icons text-sm">{tab.icon}</span>
                                            <span>{tab.label}</span>
                                            {tab.id !== 'all' && (
                                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Secondary Filters */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                                {/* Search */}
                                <div className="relative">
                                    <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Cari invoice, nama, email, hp..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                    >
                                        <option value="all">Semua Status</option>
                                        <option value="verified">✅ Terverifikasi / Lunas</option>
                                        <option value="pending">⏳ Menunggu Verifikasi</option>
                                        <option value="refunded">⚠️ Batal (Sempat Transfer / Refund)</option>
                                        <option value="rejected">❌ Batal / Ditolak</option>
                                    </select>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <select
                                        value={paymentMethodFilter}
                                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                    >
                                        <option value="all">Semua Metode Pembayaran</option>
                                        <option value="dynaqris">DynaQRIS (Otomatis)</option>
                                        <option value="transfer">Transfer Bank / QRIS Manual</option>
                                        <option value="saldo_bae">100% Saldo BAE</option>
                                        <option value="cod">COD (Bayar di Tempat)</option>
                                    </select>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <select
                                        value={dateRangePreset}
                                        onChange={(e) => setDateRangePreset(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                    >
                                        <option value="all">Semua Waktu</option>
                                        <option value="today">Hari Ini</option>
                                        <option value="7days">7 Hari Terakhir</option>
                                        <option value="month">Bulan Ini</option>
                                        <option value="custom">Pilih Rentang Tanggal...</option>
                                    </select>
                                </div>
                            </div>

                            {dateRangePreset === 'custom' && (
                                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                                    <span className="font-bold text-slate-600">Rentang Tanggal:</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                                        />
                                        <span className="text-slate-400">s/d</span>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Incoming Funds Table Card */}
                        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden mb-6">
                            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-sm text-slate-900 tracking-tight">
                                        Daftar Uang Masuk (
                                        {accountTab === 'commercial' ? 'Rekening Komersial' : (accountTab === 'charity' ? 'Rekening Charity' : 'Semua Rekening')}
                                        )
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                                        {incomingTransactions.length} Data
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-bold">Tampilkan:</span>
                                        <select
                                            value={perPage}
                                            onChange={(e) => {
                                                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                                                setPerPage(val);
                                                setCurrentPage(1);
                                            }}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value={10}>10</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value="all">Semua</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {loadingIncoming ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        Memuat data uang masuk...
                                    </p>
                                </div>
                            ) : incomingTransactions.length === 0 ? (
                                <div className="py-16 text-center">
                                    <span className="material-icons text-5xl text-slate-300 mb-2">receipt_long</span>
                                    <h4 className="text-base font-bold text-slate-700">Tidak Ada Transaksi Uang Masuk</h4>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                                        Belum ada riwayat transaksi masuk pada filter atau kategori yang dipilih.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="py-3.5 px-4">No. Invoice &amp; Tanggal</th>
                                                <th className="py-3.5 px-4">Kategori &amp; Transaksi</th>
                                                <th className="py-3.5 px-4">Pembayar / Donatur</th>
                                                <th className="py-3.5 px-4">Metode Bayar</th>
                                                <th className="py-3.5 px-4 text-right">Nominal Masuk</th>
                                                <th className="py-3.5 px-4 text-center">Status</th>
                                                <th className="py-3.5 px-4 text-center">Aksi / Verif</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {paginatedTransactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                                                    <td className="py-3.5 px-4">
                                                        <p className="font-mono font-bold text-slate-900">{tx.order_number}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                                            {formatDate(tx.created_at)}
                                                        </p>
                                                    </td>

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
                                                        <p className="font-bold text-slate-800 line-clamp-2 leading-tight">
                                                            {tx.title}
                                                        </p>
                                                        {tx.extra_info && (
                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">
                                                                {tx.extra_info}
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <p className="font-bold text-slate-800">{tx.customer_name}</p>
                                                        {tx.customer_email && (
                                                            <p className="text-[10px] text-slate-400">{tx.customer_email}</p>
                                                        )}
                                                        {tx.customer_phone && (
                                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                                📞 {tx.customer_phone}
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        {getPaymentMethodBadge(tx.payment_method)}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-right">
                                                        <p className="font-black text-slate-900 text-sm">
                                                            {formatIDR(tx.grand_total)}
                                                        </p>
                                                        {Number(tx.admin_fee) > 0 && (
                                                            <p className="text-[9px] text-blue-600 font-medium">
                                                                +Biaya: {formatIDR(tx.admin_fee)}
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex justify-center">
                                                            {getStatusBadge(tx.payment_status)}
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                            {tx.payment_proof_url && (
                                                                <button
                                                                    onClick={() => setSelectedProof(getMediaUrl(tx.payment_proof_url))}
                                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition"
                                                                    title="Lihat Bukti Transfer"
                                                                >
                                                                    <span className="material-icons text-sm">image</span>
                                                                </button>
                                                            )}

                                                            {tx.category === 'charity' && (
                                                                <button
                                                                    onClick={() => navigate('/dashboard/admin/campaigns')}
                                                                    className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 transition"
                                                                    title="Daftar Donatur & Verifikasi Donasi"
                                                                >
                                                                    <span className="material-icons text-xs">how_to_reg</span>
                                                                    <span>Verif</span>
                                                                </button>
                                                            )}

                                                            {tx.action_link && tx.category !== 'charity' && (
                                                                <button
                                                                    onClick={() => navigate(tx.action_link)}
                                                                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                                                                    title="Buka Modul Terkait"
                                                                >
                                                                    <span className="material-icons text-sm">open_in_new</span>
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handleDeleteIncomingTransaction(tx)}
                                                                disabled={deletingIncomingId === tx.id}
                                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition disabled:opacity-50"
                                                                title="Hapus data transaksi ini dari sistem"
                                                            >
                                                                {deletingIncomingId === tx.id ? (
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

                            {!loadingIncoming && incomingTransactions.length > 0 && perPage !== 'all' && (
                                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Menampilkan {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, incomingTransactions.length)} dari {incomingTransactions.length} transaksi
                                    </p>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={incomingTransactions.length}
                                        itemsPerPage={perPage}
                                        showSummary={false}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* 2. VIEW: UANG KELUAR & PENARIKAN DANA */}
                {sectionView === 'outgoing' && (
                    <>
                        {/* Outgoing Filters Card */}
                        <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 mb-6 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-2">
                                        <span className="material-icons text-rose-600">receipt</span>
                                        Daftar Pengeluaran &amp; Pengajuan Penarikan Dana
                                    </h3>
                                    <p className="text-[10px] text-slate-400">
                                        Setiap pengajuan penarikan dana seller/user akan masuk ke sini dengan status Pending hingga diproses admin.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setExpenseForm(prev => ({
                                            ...prev,
                                            fund_account: accountTab === 'charity' ? 'charity' : 'commercial',
                                            category: accountTab === 'charity' ? 'charity_distribution' : 'operational'
                                        }));
                                        setShowCreateExpenseModal(true);
                                    }}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition flex items-center gap-1.5 shadow-md shadow-rose-200"
                                >
                                    <span className="material-icons text-sm">add_circle</span>
                                    <span>Input Pengeluaran Baru</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                                {/* Search */}
                                <div className="relative">
                                    <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Cari pengeluaran, penerima, atau keterangan..."
                                        value={outgoingSearchQuery}
                                        onChange={(e) => setOutgoingSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <select
                                        value={outgoingStatusFilter}
                                        onChange={(e) => setOutgoingStatusFilter(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition"
                                    >
                                        <option value="all">Semua Status Pengeluaran</option>
                                        <option value="completed">✅ Selesai (Sudah Dicairkan / Ditransfer)</option>
                                        <option value="pending">⏳ Pending (Menunggu Diproses Admin)</option>
                                        <option value="cancelled">❌ Ditolak / Dibatalkan</option>
                                    </select>
                                </div>

                                {/* Category */}
                                <div>
                                    <select
                                        value={outgoingCategoryFilter}
                                        onChange={(e) => setOutgoingCategoryFilter(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none transition"
                                    >
                                        <option value="all">Semua Kategori Pengeluaran</option>
                                        <option value="withdrawal">Penarikan Dana User / Seller</option>
                                        <option value="charity_distribution">Penyaluran Donasi / Mustahik</option>
                                        <option value="operational">Operasional &amp; Utilitas</option>
                                        <option value="vendor_supplier">Vendor &amp; Supplier</option>
                                        <option value="event_cost">Biaya Operasional Event</option>
                                        <option value="tax_admin">Pajak &amp; Biaya Admin</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Outgoing Table Card */}
                        <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden mb-6">
                            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-sm text-slate-900 tracking-tight">
                                        Daftar Uang Keluar &amp; Penarikan (
                                        {accountTab === 'commercial' ? 'Rekening Komersial' : (accountTab === 'charity' ? 'Rekening Charity' : 'Semua Rekening')}
                                        )
                                    </h3>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                                        {outgoingTransactions.length} Data
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 font-bold">Tampilkan:</span>
                                        <select
                                            value={perPage}
                                            onChange={(e) => {
                                                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                                                setPerPage(val);
                                                setCurrentPage(1);
                                            }}
                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value={10}>10</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value="all">Semua</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {loadingOutgoing ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mb-3"></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        Memuat data pengeluaran kas...
                                    </p>
                                </div>
                            ) : outgoingTransactions.length === 0 ? (
                                <div className="py-16 text-center">
                                    <span className="material-icons text-5xl text-slate-300 mb-2">payments</span>
                                    <h4 className="text-base font-bold text-slate-700">Belum Ada Catatan Uang Keluar</h4>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                                        Klik tombol "Catat Uang Keluar" untuk memasukkan data pengeluaran kas baru.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                <th className="py-3.5 px-4">Tanggal &amp; ID</th>
                                                <th className="py-3.5 px-4">Akun &amp; Kategori</th>
                                                <th className="py-3.5 px-4">Judul &amp; Keterangan</th>
                                                <th className="py-3.5 px-4">Penerima &amp; Rekening</th>
                                                <th className="py-3.5 px-4 text-right">Nominal Keluar</th>
                                                <th className="py-3.5 px-4 text-center">Status</th>
                                                <th className="py-3.5 px-4 text-center">Aksi / Proses</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {paginatedTransactions.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/60 transition">
                                                    <td className="py-3.5 px-4">
                                                        <p className="font-bold text-slate-900">{formatDateOnly(item.transaction_date || item.created_at)}</p>
                                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.id}</p>
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${
                                                                item.fund_account === 'charity'
                                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            }`}>
                                                                {item.fund_account_label}
                                                            </span>
                                                            <span className="text-[11px] font-bold text-slate-700">
                                                                {item.category_label}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 max-w-sm">
                                                        <p className="font-bold text-slate-900 leading-tight">
                                                            {item.title}
                                                        </p>
                                                        {item.description && (
                                                            <p className="text-[11px] text-slate-500 mt-1 leading-snug bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <p className="font-bold text-slate-800">{item.recipient_name || '-'}</p>
                                                        {item.recipient_account && (
                                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                                💳 {item.recipient_account}
                                                            </p>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-right">
                                                        <p className="font-black text-rose-700 text-sm">
                                                            {formatIDR(item.amount)}
                                                        </p>
                                                        {item.source_type === 'withdrawal' && (
                                                            <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                                                Penarikan Saldo
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex justify-center">
                                                            {getStatusBadge(item.status)}
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                            {/* Button: Proses / Selesaikan jika Pending */}
                                                            {item.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleOpenProcessModal(item)}
                                                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition shadow-xs"
                                                                    title="Proses & selesaikan pengeluaran/penarikan ini"
                                                                >
                                                                    <span className="material-icons text-xs">done_all</span>
                                                                    <span>Proses</span>
                                                                </button>
                                                            )}

                                                            {/* Lihat Bukti Transfer / Nota */}
                                                            {item.proof_url && (
                                                                <button
                                                                    onClick={() => setSelectedProof(getMediaUrl(item.proof_url))}
                                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition"
                                                                    title="Lihat Bukti Transfer / Nota"
                                                                >
                                                                    <span className="material-icons text-sm">receipt</span>
                                                                </button>
                                                            )}

                                                            {/* Hapus Catatan */}
                                                            <button
                                                                onClick={() => handleDeleteOutgoingTransaction(item)}
                                                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition"
                                                                title="Hapus data pengeluaran ini"
                                                            >
                                                                <span className="material-icons text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {!loadingOutgoing && outgoingTransactions.length > 0 && perPage !== 'all' && (
                                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Menampilkan {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, outgoingTransactions.length)} dari {outgoingTransactions.length} pengeluaran
                                    </p>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={outgoingTransactions.length}
                                        itemsPerPage={perPage}
                                        showSummary={false}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* 3. VIEW: REKONSILIASI 2 REKENING (CASHFLOW) */}
                {sectionView === 'cashflow' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200">
                            <h3 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2 mb-1">
                                <span className="material-icons text-emerald-600">account_balance</span>
                                Perbandingan Rekonsiliasi 2 Rekening (Dual QRIS Cashflow)
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">
                                Memisahkan rekening operasional komersial dengan rekening sosial/charity demi transparansi dan kepatuhan syariah (tidak tercampur).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Rekening 1: Komersial */}
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl p-5 border border-emerald-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                                                1
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-emerald-950">Rekening Komersial &amp; Bisnis</h4>
                                                <p className="text-[10px] text-emerald-700 font-medium">QRIS 1 • Toko, Event, Digital, E-Course</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded-lg">
                                            Komersial
                                        </span>
                                    </div>

                                    <div className="space-y-2.5 my-4 text-xs">
                                        <div className="flex justify-between p-2 rounded-xl bg-white border border-emerald-100">
                                            <span className="text-slate-600 font-medium">Total Uang Masuk (Lunas):</span>
                                            <span className="font-black text-slate-900">{formatIDR(incomingSummary?.accounts?.commercial?.income_verified || 0)}</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded-xl bg-white border border-emerald-100">
                                            <span className="text-slate-600 font-medium">Total Pengeluaran &amp; Penarikan (Selesai):</span>
                                            <span className="font-black text-rose-600">- {formatIDR(incomingSummary?.accounts?.commercial?.expense_completed || 0)}</span>
                                        </div>
                                        <div className="flex justify-between p-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                                            <span>Sisa Saldo Kas di Rekening:</span>
                                            <span>{formatIDR(incomingSummary?.accounts?.commercial?.balance || 0)}</span>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-slate-500 font-medium">
                                        Menunggu Proses: Masuk {formatIDR(incomingSummary?.accounts?.commercial?.income_pending || 0)} • Penarikan Pending {formatIDR(incomingSummary?.accounts?.commercial?.expense_pending || 0)}
                                    </p>
                                </div>

                                {/* Rekening 2: Charity & Sosial */}
                                <div className="bg-gradient-to-br from-rose-50 to-pink-50/50 rounded-2xl p-5 border border-rose-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                                                2
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm text-rose-950">Rekening Charity &amp; Sosial</h4>
                                                <p className="text-[10px] text-rose-700 font-medium">QRIS 2 • Zakat, Infaq &amp; Donasi</p>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 bg-rose-200 text-rose-900 text-[10px] font-black rounded-lg">
                                            Sosial / ZIS
                                        </span>
                                    </div>

                                    <div className="space-y-2.5 my-4 text-xs">
                                        <div className="flex justify-between p-2 rounded-xl bg-white border border-rose-100">
                                            <span className="text-slate-600 font-medium">Total Donasi Masuk (Lunas):</span>
                                            <span className="font-black text-slate-900">{formatIDR(incomingSummary?.accounts?.charity?.income_verified || 0)}</span>
                                        </div>
                                        <div className="flex justify-between p-2 rounded-xl bg-white border border-rose-100">
                                            <span className="text-slate-600 font-medium">Total Penyaluran Mustahik (Selesai):</span>
                                            <span className="font-black text-rose-600">- {formatIDR(incomingSummary?.accounts?.charity?.expense_completed || 0)}</span>
                                        </div>
                                        <div className="flex justify-between p-2.5 rounded-xl bg-rose-600 text-white font-black text-sm shadow-xs">
                                            <span>Sisa Saldo Kas Donasi:</span>
                                            <span>{formatIDR(incomingSummary?.accounts?.charity?.balance || 0)}</span>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-slate-500 font-medium">
                                        Menunggu Verifikasi: Donasi Masuk {formatIDR(incomingSummary?.accounts?.charity?.income_pending || 0)} • Penyaluran Pending {formatIDR(incomingSummary?.accounts?.charity?.expense_pending || 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: INPUT UANG KELUAR MANUAL */}
            {showCreateExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                                    <span className="material-icons text-base">add_circle</span>
                                </div>
                                <h3 className="font-black text-base text-slate-900 tracking-tight">
                                    Input Catatan Uang Keluar
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateExpenseModal(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
                            >
                                <span className="material-icons text-base">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
                            {/* Pilih Akun Rekening */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Pilih Akun Rekening Kas *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setExpenseForm({ ...expenseForm, fund_account: 'commercial', category: 'operational' })}
                                        className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                                            expenseForm.fund_account === 'commercial'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        <span className="material-icons text-sm text-emerald-600">storefront</span>
                                        <div>
                                            <p className="text-[11px] font-black">Rekening Komersial</p>
                                            <p className="text-[9px] text-slate-400">QRIS 1 • Toko/Event/Digital</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setExpenseForm({ ...expenseForm, fund_account: 'charity', category: 'charity_distribution' })}
                                        className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                                            expenseForm.fund_account === 'charity'
                                                ? 'bg-rose-50 border-rose-500 text-rose-800'
                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        <span className="material-icons text-sm text-rose-600">volunteer_activism</span>
                                        <div>
                                            <p className="text-[11px] font-black">Rekening Charity</p>
                                            <p className="text-[9px] text-slate-400">QRIS 2 • ZISWAF/Mustahik</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Kategori Pengeluaran */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Kategori Pengeluaran *
                                </label>
                                <select
                                    value={expenseForm.category}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                >
                                    {expenseForm.fund_account === 'charity' ? (
                                        <>
                                            <option value="charity_distribution">Penyaluran Donasi / Mustahik / Program</option>
                                            <option value="operational">Operasional Penyaluran / Logistik</option>
                                            <option value="other">Pengeluaran Lainnya</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="operational">Operasional &amp; Utilitas</option>
                                            <option value="vendor_supplier">Vendor, Pengadaan &amp; Supplier</option>
                                            <option value="event_cost">Biaya Penyelenggaraan Event</option>
                                            <option value="withdrawal">Penarikan Dana User / Seller Manual</option>
                                            <option value="tax_admin">Pajak &amp; Biaya Admin Bank</option>
                                            <option value="other">Pengeluaran Lainnya</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Judul Pengeluaran */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Judul Pengeluaran *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Penyaluran Paket Sembako Yatim / Biaya Hosting Server"
                                    value={expenseForm.title}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none font-medium"
                                />
                            </div>

                            {/* Nominal & Tanggal Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Nominal Uang Keluar (Rp) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                                        <input
                                            type="number"
                                            required
                                            min="1000"
                                            step="500"
                                            placeholder="0"
                                            value={expenseForm.amount}
                                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Tanggal Transaksi *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={expenseForm.transaction_date}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, transaction_date: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Keterangan / Deskripsi Rinci */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Keterangan Detail Pengeluaran *
                                </label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Tuliskan keterangan detail rincian pengeluaran agar tercatat akurat dan transparan..."
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none leading-relaxed"
                                />
                            </div>

                            {/* Penerima & Rekening Tujuan */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Nama Penerima (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nama orang / Yayasan / Toko"
                                        value={expenseForm.recipient_name}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, recipient_name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Bank / No. Rekening Tujuan
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: BSI 712345678"
                                        value={expenseForm.recipient_account}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, recipient_account: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Upload Bukti Struk & Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Bukti Struk / Transfer (Opsional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setExpenseForm({ ...expenseForm, proof_file: e.target.files[0] })}
                                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Status Realisasi *
                                    </label>
                                    <select
                                        value={expenseForm.status}
                                        onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                                    >
                                        <option value="completed">✅ Selesai (Sudah Dikeluarkan)</option>
                                        <option value="pending">⏳ Pending (Menunggu Realisasi)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateExpenseModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingExpense}
                                    className="px-5 py-2 bg-rose-600 text-white rounded-xl font-black hover:bg-rose-700 transition shadow-md shadow-rose-200 flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {submittingExpense ? (
                                        <>
                                            <div className="animate-spin h-3.5 w-3.5 border-b-2 border-white rounded-full"></div>
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons text-sm">save</span>
                                            <span>Simpan Pengeluaran</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: PROSES PENARIKAN DANA / UPDATE STATUS PENGELUARAN */}
            {showProcessModal && processingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <span className="material-icons text-base">payments</span>
                                </div>
                                <h3 className="font-black text-base text-slate-900 tracking-tight">
                                    Proses Pengeluaran / Penarikan Dana
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowProcessModal(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
                            >
                                <span className="material-icons text-base">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleProcessItem} className="space-y-4 text-xs">
                            {/* Ringkasan Item */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Judul Transaksi:</span>
                                    <span className="font-bold text-slate-800">{processingItem.title}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Nominal yang Dikeluarkan:</span>
                                    <span className="font-black text-rose-700 text-sm">{formatIDR(processingItem.amount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Penerima &amp; Rekening:</span>
                                    <span className="font-bold text-slate-700">{processingItem.recipient_name} ({processingItem.recipient_account})</span>
                                </div>
                            </div>

                            {/* Pilihan Status */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Tindakan / Status Baru *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setProcessStatus('approved')}
                                        className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                                            processStatus === 'approved' || processStatus === 'completed'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        <span className="material-icons text-sm text-emerald-600">check_circle</span>
                                        <div>
                                            <p className="text-[11px] font-black">Setujui &amp; Selesaikan</p>
                                            <p className="text-[9px] text-slate-400">Dana telah ditransfer</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setProcessStatus('rejected')}
                                        className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                                            processStatus === 'rejected' || processStatus === 'cancelled'
                                                ? 'bg-red-50 border-red-500 text-red-800'
                                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        <span className="material-icons text-sm text-red-600">cancel</span>
                                        <div>
                                            <p className="text-[11px] font-black">Tolak Pengajuan</p>
                                            <p className="text-[9px] text-slate-400">Kembalikan saldo ke dompet</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Alasan jika ditolak */}
                            {(processStatus === 'rejected' || processStatus === 'cancelled') && (
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Alasan Penolakan (Akan dikirim ke User/Seller) *
                                    </label>
                                    <textarea
                                        rows="2"
                                        required
                                        placeholder="Contoh: Nomor rekening tidak cocok dengan nama akun / data tidak valid..."
                                        value={processRejectionReason}
                                        onChange={(e) => setProcessRejectionReason(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none"
                                    />
                                </div>
                            )}

                            {/* Upload Bukti Transfer */}
                            {(processStatus === 'approved' || processStatus === 'completed') && (
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        Upload Bukti Transfer / Struk Bank
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setProcessProofFile(e.target.files[0])}
                                        className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        Screenshot m-Banking / bukti transfer akan tersimpan sebagai lampiran arsip bukti kas.
                                    </p>
                                </div>
                            )}

                            {/* Catatan Tambahan */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Catatan Tambahan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Catatan proses admin..."
                                    value={processNotes}
                                    onChange={(e) => setProcessNotes(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowProcessModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingProcess}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition shadow-md shadow-emerald-200 flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {submittingProcess ? (
                                        <>
                                            <div className="animate-spin h-3.5 w-3.5 border-b-2 border-white rounded-full"></div>
                                            <span>Memproses...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons text-sm">done</span>
                                            <span>Simpan Perubahan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: PREVIEW BUKTI TRANSFER / NOTA */}
            {selectedProof && (
                <div 
                    onClick={() => setSelectedProof(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 cursor-default"
                    >
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
                                <span className="material-icons text-emerald-600 text-sm">image</span>
                                Bukti Transfer / Nota Struk
                            </h4>
                            <button
                                onClick={() => setSelectedProof(null)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
                            >
                                <span className="material-icons text-base">close</span>
                            </button>
                        </div>
                        <div className="p-4 flex justify-center bg-slate-900/5">
                            <img
                                src={selectedProof}
                                alt="Bukti Transaksi"
                                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-xs"
                            />
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                            <a
                                href={selectedProof}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                            >
                                <span className="material-icons text-xs">open_in_new</span>
                                Buka Gambar Ukuran Penuh
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardAdminIncomingFundsPage;
