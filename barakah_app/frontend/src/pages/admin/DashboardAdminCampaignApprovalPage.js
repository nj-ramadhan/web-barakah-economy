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

    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/campaigns/pending/`, getAuth());
            setCampaigns(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }
        fetchPending();
    }, [navigate, fetchPending]);

    const handleApprove = async (slug) => {
        if (!window.confirm('Setujui charity ini?')) return;
        setProcessing(true);
        try {
            await axios.post(`${API}/api/campaigns/${slug}/approve/`, {}, getAuth());
            alert('Charity berhasil disetujui');
            fetchPending();
        } catch (err) { alert('Gagal menyetujui'); }
        setProcessing(false);
    };

    const openRejectModal = (campaign) => {
        setSelectedCampaign(campaign);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) { alert('Alasan penolakan wajib diisi'); return; }
        setProcessing(true);
        try {
            await axios.post(`${API}/api/campaigns/${selectedCampaign.slug}/reject/`, { reason: rejectReason }, getAuth());
            alert('Charity ditolak');
            setShowRejectModal(false);
            fetchPending();
        } catch (err) { alert('Gagal menolak'); }
        setProcessing(false);
    };

    const CampaignSkeleton = () => (
        <div className="grid gap-4 animate-pulse">
            {[1, 2].map(i => (
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
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Persetujuan Charity</h1>
                        <p className="text-sm text-gray-500">{campaigns.length} charity menunggu verifikasi</p>
                    </div>
                </div>

                {loading ? (
                    <CampaignSkeleton />
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="material-icons text-6xl text-gray-300">check_circle</span>
                        <p className="text-gray-500 mt-4 font-medium">Tidak ada charity pending saat ini</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {campaigns.map(c => (
                            <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="flex flex-col md:flex-row">
                                    {c.thumbnail && (
                                        <img src={c.thumbnail} alt="" className="w-full md:w-48 h-48 md:h-auto object-cover" />
                                    )}
                                    <div className="flex-1 p-5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">{c.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Diajukan oleh: <b>{c.created_by_username || 'Unknown'}</b> •{' '}
                                                    {new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                                <span className="inline-block mt-2 px-3 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-bold uppercase">{c.category}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-3 line-clamp-3">{c.description?.replace(/<[^>]*>/g, '')}</p>
                                        <div className="mt-3 text-sm text-gray-700">
                                            <b>Target:</b> Rp {Number(c.target_amount).toLocaleString('id-ID')}
                                        </div>
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={() => handleApprove(c.slug)} disabled={processing}
                                                className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-green-700 transition disabled:opacity-50">
                                                <span className="material-icons text-sm">check</span> Setujui
                                            </button>
                                            <button onClick={() => openRejectModal(c)} disabled={processing}
                                                className="bg-white border border-red-200 text-red-600 px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-red-50 transition disabled:opacity-50">
                                                <span className="material-icons text-sm">close</span> Tolak
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">Tolak Charity</h2>
                            <p className="text-sm text-gray-500 mt-1">{selectedCampaign?.title}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alasan Penolakan *</label>
                                <textarea rows="4" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Jelaskan alasan penolakan..." />
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                            <button onClick={() => setShowRejectModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                            <button onClick={handleReject} disabled={processing}
                                className="bg-red-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-red-700 transition disabled:opacity-50">
                                {processing ? 'Memproses...' : 'Tolak'}
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
