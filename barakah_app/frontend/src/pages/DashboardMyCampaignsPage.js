import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import CurrencyInput from '../components/common/CurrencyInput';
import { formatCurrency } from '../utils/formatters';

const API = process.env.REACT_APP_API_BASE_URL;
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

const STATUS_BADGE = {
    pending: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: 'hourglass_empty', label: 'Menunggu Verifikasi' },
    approved: { color: 'bg-green-50 text-green-700 border-green-200', icon: 'check_circle', label: 'Disetujui' },
    rejected: { color: 'bg-red-50 text-red-700 border-red-200', icon: 'cancel', label: 'Ditolak' },
};

const DashboardMyCampaignsPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [formData, setFormData] = useState({
        title: '', category: 'infak', description: '', target_amount: '', thumbnail: null
    });

    const categories = [
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
        { value: 'lainnya', label: 'Lainnya' },
    ];

    const fetchCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/campaigns/my_campaigns/`, getAuth());
            setCampaigns(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) { navigate('/login'); return; }
        fetchCampaigns();
    }, [navigate, fetchCampaigns]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('title', formData.title);
            fd.append('category', formData.category);
            fd.append('description', formData.description);
            fd.append('target_amount', formData.target_amount);
            if (formData.thumbnail) fd.append('thumbnail', formData.thumbnail);

            await axios.post(`${API}/api/campaigns/submit/`, fd, {
                headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' }
            });
            alert('Charity berhasil diajukan! Menunggu verifikasi admin.');
            setShowForm(false);
            setFormData({ title: '', category: 'infak', description: '', target_amount: '', thumbnail: null });
            setPreviewImage(null);
            fetchCampaigns();
        } catch (err) {
            console.error(err);
            alert('Gagal mengajukan charity');
        }
        setSubmitting(false);
    };

    const toggleVisibility = async (id, currentStatus) => {
        try {
            // Using ID instead of slug for patching is often more reliable in these mixin views
            await axios.patch(`${API}/api/campaigns/${id}/`, {
                is_active: !currentStatus
            }, getAuth());
            fetchCampaigns();
        } catch (err) {
            console.error(err);
            alert('Gagal mengubah status visibilitas');
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { alert('Maksimal 5MB'); return; }
            setFormData({...formData, thumbnail: file});
            const reader = new FileReader();
            reader.onload = (ev) => setPreviewImage(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Charity Saya - BAE</title></Helmet>
            <Header />

            <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Charity Saya</h1>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                        <span className="material-icons text-sm">{showForm ? 'close' : 'add'}</span>
                        {showForm ? 'Tutup Form' : 'Ajukan Baru'}
                    </button>
                </div>

                {/* Submit Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Ajukan Charity Baru</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Judul Charity</label>
                                    <input type="text" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Contoh: Peduli Dhuafa" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori</label>
                                    <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi</label>
                                <textarea rows="4" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Jelaskan detail charity..." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Donasi (Rp)</label>
                                    <CurrencyInput
                                        required
                                        value={formData.target_amount}
                                        onChange={e => setFormData({...formData, target_amount: e.target.value})}
                                        placeholder="50000000"
                                        className="!px-4 !py-2.5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gambar Thumbnail</label>
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm" />
                                    {previewImage && <img src={previewImage} alt="Preview" className="h-24 object-cover rounded-xl mt-2" />}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" disabled={submitting} className="bg-green-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-green-800 transition disabled:opacity-50">
                                    {submitting ? 'Mengirim...' : 'Ajukan Charity'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Campaign List */}
                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div></div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-20">
                        <span className="material-icons text-6xl text-gray-300">campaign</span>
                        <p className="text-gray-500 mt-4 font-medium">Belum ada charity yang diajukan</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {campaigns.map(c => {
                            const badge = STATUS_BADGE[c.approval_status] || STATUS_BADGE.pending;
                            return (
                                <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4">
                                    {c.thumbnail && (
                                        <img src={c.thumbnail} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-gray-900 truncate">{c.title}</h3>
                                            <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.color}`}>
                                                <span className="material-icons text-[12px]">{badge.icon}</span>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description?.replace(/<[^>]*>/g, '')}</p>
                                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                            <span>Target: Rp {formatCurrency(c.target_amount)}</span>
                                            <span>Terkumpul: Rp {formatCurrency(c.current_amount)}</span>
                                        </div>
                                        
                                        {c.approval_status === 'approved' && (
                                            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                        {c.is_active ? 'Tampil (Public)' : 'Disembunyikan'}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => toggleVisibility(c.id, c.is_active)}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${c.is_active ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                                                >
                                                    <span className="material-icons text-sm">{c.is_active ? 'visibility_off' : 'visibility'}</span>
                                                    {c.is_active ? 'SEMBUNYIKAN' : 'PUBLIKASIKAN'}
                                                </button>
                                            </div>
                                        )}

                                        {c.approval_status === 'rejected' && c.rejection_reason && (
                                            <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                                                <b>Alasan ditolak:</b> {c.rejection_reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardMyCampaignsPage;
