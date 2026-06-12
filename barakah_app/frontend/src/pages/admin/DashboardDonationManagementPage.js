import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const formatIDR = (amount) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount || 0);
};

const DashboardDonationManagementPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [donations, setDonations] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [campaignFilter, setCampaignFilter] = useState('');
    const [selectedProof, setSelectedProof] = useState(null);

    // Manual donation state
    const [showAddModal, setShowAddModal] = useState(false);
    const [submittingAdd, setSubmittingAdd] = useState(false);
    const [newDonation, setNewDonation] = useState({
        campaign_id: '',
        donor_name: '',
        donor_phone: '',
        donor_email: '',
        amount: '',
        payment_method: 'cash',
        is_anonymous: false,
        message: ''
    });

    const fetchCampaigns = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/`);
            setCampaigns(res.data.results || res.data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchDonations = useCallback(async () => {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/donations/admin-management/`, {
                params: {
                    search: searchTerm,
                    status: statusFilter,
                    campaign_slug: campaignFilter
                },
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setDonations(res.data.results || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, campaignFilter]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || (user.role !== 'admin' && user.username !== 'admin')) {
            navigate('/dashboard');
            return;
        }

        const queryParams = new URLSearchParams(location.search);
        const campaign = queryParams.get('campaign');
        if (campaign) {
            setCampaignFilter(campaign);
        }

        fetchCampaigns();
    }, [navigate, location.search, fetchCampaigns]);

    useEffect(() => {
        fetchDonations();
    }, [fetchDonations]);

    const handleVerify = async (id) => {
        if (!window.confirm('Verifikasi donasi ini?')) return;
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/donations/admin-management/${id}/verify/`, {}, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('Donasi berhasil diverifikasi!');
            fetchDonations();
        } catch (err) {
            console.error(err);
            alert('Gagal memverifikasi donasi');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Tolak donasi ini?')) return;
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/donations/admin-management/${id}/reject/`, {}, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('Donasi berhasil ditolak!');
            fetchDonations();
        } catch (err) {
            console.error(err);
            alert('Gagal menolak donasi');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data donasi ini secara permanen?')) return;
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/donations/admin-management/${id}/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('Data donasi berhasil dihapus!');
            fetchDonations();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus data donasi.');
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setSubmittingAdd(true);
        const user = JSON.parse(localStorage.getItem('user'));
        
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/donations/admin-management/`, newDonation, {
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.access}` 
                }
            });
            alert('Donasi manual berhasil ditambahkan!');
            setShowAddModal(false);
            setNewDonation({
                campaign_id: '',
                donor_name: '',
                donor_phone: '',
                donor_email: '',
                amount: '',
                payment_method: 'cash',
                is_anonymous: false,
                message: ''
            });
            fetchDonations();
        } catch (err) {
            console.error(err);
            const errMsg = err.response?.data?.error || 'Gagal menambahkan donasi manual.';
            alert(errMsg);
        } finally {
            setSubmittingAdd(false);
        }
    };

    const handleExportCSV = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/donations/admin-management/export_csv/`, {
                params: {
                    search: searchTerm,
                    status: statusFilter,
                    campaign_slug: campaignFilter
                },
                headers: { Authorization: `Bearer ${user.access}` },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'data_donatur.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            alert('Gagal mengekspor CSV');
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Manajemen Donatur - Admin</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Daftar Donatur</h1>
                            <p className="text-sm text-gray-500">Kelola dan verifikasi data donasi masuk</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition"
                        >
                            <span className="material-icons text-sm">add</span>
                            Tambah Manual
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition"
                        >
                            <span className="material-icons text-sm">download</span>
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Cari nama atau nomor donatur..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                            >
                                <option value="">Semua Status</option>
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div className="w-full md:w-64">
                            <select
                                value={campaignFilter}
                                onChange={(e) => setCampaignFilter(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                            >
                                <option value="">Semua Charity</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.slug}>{c.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
                    </div>
                ) : donations.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <span className="material-icons text-6xl text-gray-200">payments</span>
                        <p className="text-gray-500 mt-4 font-medium">Tidak ada data donasi ditemukan</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {donations.map(d => (
                            <div key={d.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                d.payment_status === 'verified' ? 'bg-green-50 text-green-700 border border-green-100' : 
                                                d.payment_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 
                                                'bg-red-50 text-red-700 border border-red-100'
                                            }`}>
                                                {d.payment_status}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                {new Date(d.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-lg mb-1">{d.donor_name}</h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <span className="material-icons text-[14px]">phone</span> {d.donor_phone}
                                            </span>
                                            {d.donor_email && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <span className="material-icons text-[14px]">email</span> {d.donor_email}
                                                </span>
                                            )}
                                            <span className="text-xs text-green-700 font-bold flex items-center gap-1">
                                                <span className="material-icons text-[14px]">campaign</span> {d.campaign_title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Nominal:</span>
                                            <span className="text-lg font-black text-gray-900">{formatIDR(d.amount)}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 italic">Metode: {d.payment_method.toUpperCase()}</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row md:flex-col items-center justify-center gap-3">
                                        {d.proof_file_url ? (
                                            <div 
                                                onClick={() => setSelectedProof(d.proof_file_url)}
                                                className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden cursor-zoom-in border border-gray-100 hover:border-green-500 transition"
                                            >
                                                <img src={d.proof_file_url} alt="Bukti" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-100 text-gray-400">
                                                <span className="material-icons">no_photography</span>
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2 w-full min-w-[130px]">
                                            {d.payment_status === 'pending' && (
                                                <div className="flex gap-2 w-full">
                                                    <button 
                                                        onClick={() => handleVerify(d.id)}
                                                        className="flex-1 bg-green-600 text-white px-2 py-1.5 rounded-xl text-[10px] font-bold hover:bg-green-700 transition"
                                                    >
                                                        Verif
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReject(d.id)}
                                                        className="flex-1 bg-yellow-50 text-yellow-700 px-2 py-1.5 rounded-xl text-[10px] font-bold hover:bg-yellow-100 border border-yellow-200 transition"
                                                    >
                                                        Tolak
                                                    </button>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(d.id)}
                                                className="w-full bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-red-100 border border-red-100 transition flex items-center justify-center gap-1"
                                            >
                                                <span className="material-icons text-[12px]">delete</span>
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Donation Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative my-auto animate-scale-up border border-gray-100">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 leading-tight">Tambah Donatur Manual</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Input data donasi langsung (Status: Verified)</p>
                            </div>
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-gray-100 rounded-full transition shadow-inner"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Program Charity *</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={newDonation.campaign_id}
                                        onChange={(e) => setNewDonation(prev => ({ ...prev, campaign_id: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 transition shadow-inner appearance-none pr-10"
                                    >
                                        <option value="">Pilih Program Charity</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>{c.title}</option>
                                        ))}
                                    </select>
                                    <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-100 text-gray-500 shadow-sm">
                                        <span className="material-icons text-lg">visibility_off</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900 leading-tight">Donatur Anonim</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tampilkan sebagai Hamba Allah</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewDonation(prev => {
                                            const nextAnonymous = !prev.is_anonymous;
                                            return {
                                                ...prev,
                                                is_anonymous: nextAnonymous,
                                                donor_name: nextAnonymous ? 'Hamba Allah' : ''
                                            };
                                        });
                                    }}
                                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${newDonation.is_anonymous ? 'bg-green-600' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${newDonation.is_anonymous ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Nama Donatur *</label>
                                <input
                                    type="text"
                                    required
                                    disabled={newDonation.is_anonymous}
                                    value={newDonation.donor_name}
                                    onChange={(e) => setNewDonation(prev => ({ ...prev, donor_name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 transition shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Masukkan nama donatur..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">No. WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={newDonation.donor_phone}
                                        onChange={(e) => setNewDonation(prev => ({ ...prev, donor_phone: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 transition shadow-inner"
                                        placeholder="0812..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={newDonation.donor_email}
                                        onChange={(e) => setNewDonation(prev => ({ ...prev, donor_email: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 transition shadow-inner"
                                        placeholder="donatur@mail.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Nominal Donasi (Rp) *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={newDonation.amount}
                                    onChange={(e) => setNewDonation(prev => ({ ...prev, amount: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 transition shadow-inner"
                                    placeholder="Masukkan nominal..."
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Metode Pembayaran *</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={newDonation.payment_method}
                                        onChange={(e) => setNewDonation(prev => ({ ...prev, payment_method: e.target.value }))}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 transition shadow-inner appearance-none pr-10"
                                    >
                                        <option value="cash">Cash / Tunai</option>
                                        <option value="bsi">Bank Syariah Indonesia (BSI)</option>
                                        <option value="bjb">Bank BJB Syariah</option>
                                        <option value="lainnya">Lainnya</option>
                                    </select>
                                    <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Pesan / Doa (Opsional)</label>
                                <textarea
                                    value={newDonation.message}
                                    onChange={(e) => setNewDonation(prev => ({ ...prev, message: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 transition shadow-inner resize-none"
                                    rows="2"
                                    placeholder="Tulis pesan atau doa..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submittingAdd}
                                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-green-100 transition active:scale-[0.98]"
                            >
                                {submittingAdd ? 'Menyimpan...' : 'Simpan Donasi'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Proof Modal */}
            {selectedProof && (
                <div 
                    className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedProof(null)}
                >
                    <div className="relative max-w-4xl w-full max-h-[90vh]">
                        <button className="absolute -top-12 right-0 text-white flex items-center gap-2">
                            <span className="material-icons">close</span> Tutup
                        </button>
                        <img src={selectedProof} alt="Bukti Transfer" className="w-full h-full object-contain rounded-lg animate-scale-up" />
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardDonationManagementPage;
