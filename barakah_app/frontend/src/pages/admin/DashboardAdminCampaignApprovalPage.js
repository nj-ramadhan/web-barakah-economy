import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

const DashboardAdminCampaignApprovalPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, rejected
    const [searchQuery, setSearchQuery] = useState('');

    const fetchCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/campaigns/pending/?status=all`, getAuth());
            setCampaigns(res.data);
        } catch (err) { 
            console.error(err); 
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { 
            navigate('/dashboard'); 
            return; 
        }
        fetchCampaigns();
    }, [navigate, fetchCampaigns]);

    const handleApprove = async (slug, title) => {
        if (!window.confirm(`Setujui charity "${title}"? Program ini akan aktif dan muncul ke publik.`)) return;
        setProcessing(true);
        try {
            await axios.post(`${API}/api/campaigns/${slug}/approve/`, {}, getAuth());
            alert(`Charity "${title}" berhasil disetujui.`);
            fetchCampaigns();
        } catch (err) { 
            alert('Gagal menyetujui charity'); 
        }
        setProcessing(false);
    };

    const handleSetPending = async (slug, title) => {
        if (!window.confirm(`Ubah status charity "${title}" kembali menjadi PENDING (menunggu)? Program tidak akan tampil ke publik sampai disetujui kembali.`)) return;
        setProcessing(true);
        try {
            await axios.post(`${API}/api/campaigns/${slug}/set_pending/`, {}, getAuth());
            alert(`Status charity "${title}" dikembalikan ke Pending.`);
            fetchCampaigns();
        } catch (err) { 
            alert('Gagal mengubah status ke Pending'); 
        }
        setProcessing(false);
    };

    const openRejectModal = (campaign) => {
        setSelectedCampaign(campaign);
        setRejectReason(campaign.rejection_reason || '');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) { 
            alert('Alasan penolakan wajib diisi'); 
            return; 
        }
        setProcessing(true);
        try {
            await axios.post(`${API}/api/campaigns/${selectedCampaign.slug}/reject/`, { reason: rejectReason }, getAuth());
            alert(`Charity "${selectedCampaign.title}" telah ditolak (Non-Approve).`);
            setShowRejectModal(false);
            fetchCampaigns();
        } catch (err) { 
            alert('Gagal menolak charity'); 
        }
        setProcessing(false);
    };

    // Filter counts
    const totalCount = campaigns.length;
    const pendingCount = campaigns.filter(c => c.approval_status === 'pending').length;
    const approvedCount = campaigns.filter(c => c.approval_status === 'approved').length;
    const rejectedCount = campaigns.filter(c => c.approval_status === 'rejected').length;

    const filteredCampaigns = campaigns.filter(c => {
        if (statusFilter !== 'all' && c.approval_status !== statusFilter) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchTitle = (c.title || '').toLowerCase().includes(q);
            const matchUser = (c.created_by_username || '').toLowerCase().includes(q);
            const matchCat = (c.category || '').toLowerCase().includes(q);
            return matchTitle || matchUser || matchCat;
        }
        return true;
    });

    const CampaignSkeleton = () => (
        <div className="grid gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-48 h-48 bg-gray-200"></div>
                        <div className="flex-1 p-5">
                            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2 mb-4"></div>
                            <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
                            <div className="h-4 bg-gray-100 rounded w-5/6 mb-4"></div>
                            <div className="flex gap-3 mt-4 text-sm text-gray-700 font-bold border-t border-gray-50 pt-4">
                                <div className="h-9 bg-gray-200 rounded-xl w-28"></div>
                                <div className="h-9 bg-gray-200 rounded-xl w-28"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Persetujuan Charity - Admin</title></Helmet>
            <Header />

            <div className="max-w-5xl mx-auto px-4 py-6 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/dashboard')} 
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition"
                        >
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Persetujuan Charity</h1>
                            <p className="text-sm text-gray-500">
                                Kelola seluruh status persetujuan program charity ({pendingCount} pending, {approvedCount} disetujui, {rejectedCount} ditolak)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 overflow-x-auto gap-2">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`py-2.5 px-3 md:px-4 text-xs md:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                statusFilter === 'all'
                                    ? 'text-emerald-700 border-emerald-600 bg-emerald-50/40 rounded-t-lg'
                                    : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                        >
                            <span>Semua</span>
                            <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-gray-200/80 text-gray-700 font-bold">
                                {totalCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('pending')}
                            className={`py-2.5 px-3 md:px-4 text-xs md:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                statusFilter === 'pending'
                                    ? 'text-amber-700 border-amber-500 bg-amber-50/40 rounded-t-lg'
                                    : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                        >
                            <span className="material-icons text-sm text-amber-500">hourglass_top</span>
                            <span>Menunggu (Pending)</span>
                            <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-amber-100 text-amber-800 font-bold">
                                {pendingCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('approved')}
                            className={`py-2.5 px-3 md:px-4 text-xs md:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                statusFilter === 'approved'
                                    ? 'text-green-700 border-green-600 bg-green-50/40 rounded-t-lg'
                                    : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                        >
                            <span className="material-icons text-sm text-green-600">check_circle</span>
                            <span>Disetujui (Approved)</span>
                            <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-green-100 text-green-800 font-bold">
                                {approvedCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('rejected')}
                            className={`py-2.5 px-3 md:px-4 text-xs md:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                statusFilter === 'rejected'
                                    ? 'text-red-700 border-red-600 bg-red-50/40 rounded-t-lg'
                                    : 'text-gray-500 border-transparent hover:text-gray-700'
                            }`}
                        >
                            <span className="material-icons text-sm text-red-500">cancel</span>
                            <span>Ditolak (Non-Approve)</span>
                            <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-red-100 text-red-800 font-bold">
                                {rejectedCount}
                            </span>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari judul charity, nama pengaju, atau kategori..."
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Campaign List */}
                {loading ? (
                    <CampaignSkeleton />
                ) : filteredCampaigns.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                        <span className="material-icons text-5xl text-gray-300">search_off</span>
                        <p className="text-gray-600 font-bold mt-3">Tidak ada data charity yang sesuai</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {searchQuery ? 'Coba ganti kata kunci pencarian Anda.' : 'Belum ada program charity pada status filter ini.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCampaigns.map(c => {
                            const isApproved = c.approval_status === 'approved';
                            const isPending = c.approval_status === 'pending';
                            const isRejected = c.approval_status === 'rejected';

                            return (
                                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                    <div className="flex flex-col md:flex-row">
                                        {c.thumbnail ? (
                                            <img 
                                                src={c.thumbnail} 
                                                alt="" 
                                                className="w-full md:w-56 h-48 md:h-auto object-cover shrink-0" 
                                            />
                                        ) : (
                                            <div className="w-full md:w-56 h-48 md:h-auto bg-gray-100 flex items-center justify-center shrink-0">
                                                <span className="material-icons text-4xl text-gray-300">image</span>
                                            </div>
                                        )}

                                        <div className="flex-1 p-5 flex flex-col justify-between">
                                            <div>
                                                {/* Header Row: Title & Status Badge */}
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="font-bold text-gray-900 text-base md:text-lg">{c.title}</h3>
                                                            {c.is_collaboration && c.collaboration_type === 'waqaf' && (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                                    <span className="material-icons text-[12px]">inventory_2</span>
                                                                    Kolaborasi Waqaf
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Diajukan oleh: <b className="text-gray-700">{c.created_by_username || 'Unknown'}</b> •{' '}
                                                            {new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>

                                                    {/* Current Status Badge */}
                                                    <div>
                                                        {isApproved && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                                                                <span className="material-icons text-sm">check_circle</span>
                                                                Disetujui
                                                            </span>
                                                        )}
                                                        {isPending && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                                                                <span className="material-icons text-sm">hourglass_top</span>
                                                                Menunggu (Pending)
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold">
                                                                <span className="material-icons text-sm">cancel</span>
                                                                Ditolak (Non-Approve)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Category & Details */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold uppercase">
                                                        {c.category}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        Target: <b className="text-gray-800">Rp {Number(c.target_amount || 0).toLocaleString('id-ID')}</b>
                                                    </span>
                                                    <span className="text-xs text-gray-400">•</span>
                                                    <span className="text-xs text-gray-500">
                                                        Terkumpul: <b className="text-emerald-700">Rp {Number(c.current_amount || 0).toLocaleString('id-ID')}</b>
                                                    </span>
                                                </div>

                                                <p className="text-xs sm:text-sm text-gray-600 mt-2.5 line-clamp-2">
                                                    {c.description?.replace(/<[^>]*>/g, '')}
                                                </p>

                                                {/* Rejection Reason Notice if rejected */}
                                                {isRejected && c.rejection_reason && (
                                                    <div className="mt-3 p-2.5 bg-red-50/80 border border-red-100 rounded-xl text-xs text-red-700">
                                                        <span className="font-bold">Alasan Penolakan: </span>
                                                        <span>{c.rejection_reason}</span>
                                                    </div>
                                                )}

                                                {/* Waqaf Products Preview if any */}
                                                {c.is_collaboration && c.collab_products_details?.length > 0 && (
                                                    <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
                                                        <span className="font-bold text-gray-700">Produk Waqaf:</span>
                                                        {c.collab_products_details.map(p => (
                                                            <span key={p.id} className="bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                                                                {p.title} (Rp {Number(p.price).toLocaleString('id-ID')})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Status Adjuster */}
                                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                                                <span className="text-xs text-gray-500 font-bold mr-1">Sesuaikan Status:</span>

                                                {/* Button Setujui (Approve) */}
                                                {!isApproved ? (
                                                    <button 
                                                        onClick={() => handleApprove(c.slug, c.title)} 
                                                        disabled={processing}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-xs disabled:opacity-50"
                                                    >
                                                        <span className="material-icons text-sm">check</span>
                                                        Setujui (Approve)
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100/70 text-emerald-800 rounded-xl text-xs font-bold">
                                                        <span className="material-icons text-sm">check</span>
                                                        Sudah Disetujui
                                                    </span>
                                                )}

                                                {/* Button Jadikan Pending */}
                                                {!isPending ? (
                                                    <button 
                                                        onClick={() => handleSetPending(c.slug, c.title)} 
                                                        disabled={processing}
                                                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                                                    >
                                                        <span className="material-icons text-sm">hourglass_top</span>
                                                        Set Pending
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100/70 text-amber-800 rounded-xl text-xs font-bold">
                                                        <span className="material-icons text-sm">hourglass_top</span>
                                                        Sedang Pending
                                                    </span>
                                                )}

                                                {/* Button Tolak (Non-Approve) */}
                                                {!isRejected ? (
                                                    <button 
                                                        onClick={() => openRejectModal(c)} 
                                                        disabled={processing}
                                                        className="bg-white hover:bg-red-50 text-red-600 border border-red-300 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                                                    >
                                                        <span className="material-icons text-sm">close</span>
                                                        Tolak (Non-Approve)
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => openRejectModal(c)} 
                                                        disabled={processing}
                                                        className="bg-red-100/80 hover:bg-red-200 text-red-700 border border-red-300 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                                                        title="Klik untuk mengubah alasan penolakan"
                                                    >
                                                        <span className="material-icons text-sm">edit</span>
                                                        Ditolak (Ubah Alasan)
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Tolak Charity (Non-Approve)</h2>
                            <p className="text-xs text-gray-500 mt-1 truncate">{selectedCampaign?.title}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Alasan Penolakan *
                                </label>
                                <textarea 
                                    rows="4" 
                                    value={rejectReason} 
                                    onChange={e => setRejectReason(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
                                    placeholder="Jelaskan alasan charity ini ditolak atau belum memenuhi syarat..." 
                                />
                            </div>
                            <p className="text-[11px] text-gray-400 italic">
                                Alasan penolakan akan dicatat dan dapat dilihat oleh pengaju charity pada dashboard mereka.
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button 
                                onClick={() => setShowRejectModal(false)} 
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleReject} 
                                disabled={processing}
                                className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {processing ? 'Memproses...' : 'Simpan Penolakan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardAdminCampaignApprovalPage;
