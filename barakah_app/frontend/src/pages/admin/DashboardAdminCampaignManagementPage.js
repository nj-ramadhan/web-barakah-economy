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

const DashboardAdminCampaignManagementPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const fetchAllCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            // The existing CampaignViewSet returns approved campaigns by default for public,
            // but for authenticated staff it handles queryset filtering accordingly.
            // Let's use the standard list endpoint.
            const res = await axios.get(`${API}/api/campaigns/`, getAuth());
            setCampaigns(res.data.results || res.data);
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data kampanye');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        fetchAllCampaigns();
    }, [navigate, fetchAllCampaigns]);

    const handleDelete = async (slug, title) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus kampanye "${title}"?`)) return;
        try {
            await axios.delete(`${API}/api/campaigns/${slug}/`, getAuth());
            alert('Kampanye berhasil dihapus');
            fetchAllCampaigns();
        } catch (err) {
            alert('Gagal menghapus kampanye');
        }
    };

    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const CATEGORIES = [
        { value: 'infak', label: 'Infak Barakah' },
        { value: 'sedekah', label: 'Sedekah Barakah' },
        { value: 'zakat', label: 'Zakat Barakah' },
        { value: 'donasi', label: 'Donasi Barakah' },
        { value: 'bencana', label: 'Bantuan Bencana Alam' },
        { value: 'kemanusiaan', label: 'Bantuan Kemanusiaan' },
        { value: 'kesehatan', label: 'Bantuan Kesehatan' },
        { value: 'lingkungan', label: 'Bantuan Lingkungan' },
        { value: 'pembangunan', label: 'Bantuan Pembangunan' },
        { value: 'sosial', label: 'Bantuan Sosial' },
    ];

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Manajemen Kampanye - Admin</title></Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manajemen Kampanye</h1>
                            <p className="text-sm text-gray-500">Kelola semua kampanye dan galang dana yang sedang berjalan</p>
                        </div>
                    </div>
                    {/* Reuse NewCampaign if needed, or link to create */}
                    <button onClick={() => navigate('/dashboard/my-campaigns')} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                        <span className="material-icons text-sm">add</span> Buat Kampanye
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Cari judul kampanye..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                        />
                    </div>
                    <div className="w-full md:w-56">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                        >
                            <option value="all">Semua Kategori</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <span className="material-icons text-6xl text-gray-200">campaign</span>
                        <p className="text-gray-500 mt-4 font-medium">Tidak ada kampanye ditemukan</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCampaigns.map(c => (
                            <div key={c.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
                                {c.thumbnail && (
                                    <img src={c.thumbnail} alt="" className="w-full sm:w-32 h-32 object-cover rounded-2xl" />
                                )}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{c.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                c.approval_status === 'approved' ? 'bg-green-50 text-green-700' : 
                                                c.approval_status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                                {c.approval_status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <span className="material-icons text-[12px]">category</span> {c.category}
                                            </span>
                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <span className="material-icons text-[12px]">calendar_today</span> {new Date(c.created_at).toLocaleDateString('id-ID')}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs">
                                            <span className="text-gray-500">Terkumpul: <b className="text-gray-900">Rp {Number(c.current_amount).toLocaleString('id-ID')}</b></span>
                                            <span className="text-gray-500">Target: <b className="text-gray-900">Rp {Number(c.target_amount).toLocaleString('id-ID')}</b></span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                            <div 
                                                className="bg-green-600 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, (c.current_amount / c.target_amount) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            onClick={() => navigate(`/kampanye/${c.slug}`)}
                                            className="px-4 py-1.5 bg-gray-50 text-gray-600 text-[11px] font-bold rounded-lg hover:bg-gray-100 transition"
                                        >
                                            Detail
                                        </button>
                                        <button
                                            onClick={() => navigate(`/dashboard/admin/donations?campaign=${c.slug}`)}
                                            className="px-4 py-1.5 bg-green-50 text-green-600 text-[11px] font-bold rounded-lg hover:bg-green-100 transition"
                                        >
                                            Donatur
                                        </button>
                                        <button
                                            onClick={() => navigate(`/dashboard/admin/charity?campaign=${c.slug}`)}
                                            className="px-4 py-1.5 bg-orange-50 text-orange-600 text-[11px] font-bold rounded-lg hover:bg-orange-100 transition"
                                        >
                                            Realisasi
                                        </button>
                                        <button
                                            onClick={() => handleDelete(c.slug, c.title)}
                                            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                            title="Hapus"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
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

export default DashboardAdminCampaignManagementPage;
