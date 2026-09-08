import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import CurrencyInput from '../../components/common/CurrencyInput';
import CKEditorComponent from '../../components/common/CKEditor';

const API = process.env.REACT_APP_API_BASE_URL;
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

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
    { value: 'lainnya', label: 'Lainnya' },
];

const DashboardAdminCampaignManagementPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const idParam = queryParams.get('id');

    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(idParam || '');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Edit Modal States
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editPreviewImage, setEditPreviewImage] = useState(null);
    const [editHasUnlimitedDeadline, setEditHasUnlimitedDeadline] = useState(true);
    const [editFormData, setEditFormData] = useState({
        title: '',
        category: 'infak',
        description: '',
        target_amount: '',
        thumbnail: null,
        deadline: ''
    });

    const fetchAllCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/campaigns/`, getAuth());
            setCampaigns(res.data.results || res.data);
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data charity');
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
        if (!window.confirm(`Apakah Anda yakin ingin menghapus charity "${title}"?`)) return;
        try {
            await axios.delete(`${API}/api/campaigns/${slug}/`, getAuth());
            alert('Charity berhasil dihapus');
            fetchAllCampaigns();
        } catch (err) {
            alert('Gagal menghapus charity');
        }
    };

    const handleOpenEdit = (c) => {
        setEditingCampaign(c);
        setEditFormData({
            title: c.title || '',
            category: c.category || 'infak',
            description: c.description || '',
            target_amount: String(c.target_amount || ''),
            thumbnail: null,
            deadline: c.deadline ? c.deadline.split('T')[0] : ''
        });
        setEditHasUnlimitedDeadline(!c.deadline);
        setEditPreviewImage(c.thumbnail || null);
        setEditModalOpen(true);
    };

    const handleCloseEdit = () => {
        setEditModalOpen(false);
        setEditingCampaign(null);
        setEditFormData({
            title: '',
            category: 'infak',
            description: '',
            target_amount: '',
            thumbnail: null,
            deadline: ''
        });
        setEditPreviewImage(null);
        setEditHasUnlimitedDeadline(true);
    };

    const handleEditImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { 
                alert('Maksimal ukuran gambar adalah 5MB'); 
                return; 
            }
            setEditFormData(prev => ({ ...prev, thumbnail: file }));
            const reader = new FileReader();
            reader.onload = (ev) => setEditPreviewImage(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingCampaign) return;
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', editFormData.title);
            fd.append('category', editFormData.category);
            fd.append('description', editFormData.description);
            fd.append('target_amount', editFormData.target_amount);
            if (editFormData.thumbnail) {
                fd.append('thumbnail', editFormData.thumbnail);
            }

            if (!editHasUnlimitedDeadline && editFormData.deadline) {
                fd.append('deadline', `${editFormData.deadline}T23:59:59`);
            } else {
                fd.append('deadline', '');
            }

            await axios.patch(`${API}/api/campaigns/${editingCampaign.slug}/`, fd, {
                headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' }
            });

            alert('Charity berhasil diperbarui! Riwayat donatur dan nominal terkumpul tetap aman.');
            handleCloseEdit();
            fetchAllCampaigns();
        } catch (err) {
            console.error(err);
            alert('Gagal memperbarui charity');
        }
        setSaving(false);
    };

    const filteredCampaigns = campaigns.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Manajemen Charity - Admin</title></Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manajemen Charity</h1>
                            <p className="text-sm text-gray-500">Kelola semua program charity dan galang dana yang sedang berjalan</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/dashboard/my-campaigns')} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                        <span className="material-icons text-sm">add</span> Buat Charity
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Cari judul charity..."
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
                        <p className="text-gray-500 mt-4 font-medium">Tidak ada charity ditemukan</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCampaigns.map(c => (
                            <div key={c.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 hover:shadow-md transition">
                                {c.thumbnail ? (
                                    <img src={c.thumbnail} alt="" className="w-full sm:w-36 h-36 object-cover rounded-2xl shrink-0" />
                                ) : (
                                    <div className="w-full sm:w-36 h-36 bg-gray-100 rounded-2xl flex items-center justify-center shrink-0">
                                        <span className="material-icons text-3xl text-gray-300">image</span>
                                    </div>
                                )}
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{c.title}</h3>
                                                {c.is_collaboration && c.collaboration_type === 'waqaf' && (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                        <span className="material-icons text-[12px]">inventory_2</span>
                                                        Kolaborasi Waqaf ({c.collab_products_details?.length || 0} Produk)
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                c.approval_status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' : 
                                                c.approval_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'
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
                                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <span className="material-icons text-[12px]">event</span> 
                                                Batas: {c.deadline ? new Date(c.deadline).toLocaleDateString('id-ID') : 'Tanpa Batas'}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-xs">
                                            <span className="text-gray-500">Terkumpul: <b className="text-emerald-700">Rp {Number(c.current_amount || 0).toLocaleString('id-ID')}</b></span>
                                            <span className="text-gray-500">Target: <b className="text-gray-900">Rp {Number(c.target_amount || 0).toLocaleString('id-ID')}</b></span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                            <div 
                                                className="bg-green-600 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, ((c.current_amount || 0) / (c.target_amount || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap justify-end gap-2 mt-4 pt-2 border-t border-gray-50">
                                        <button
                                            onClick={() => navigate(`/kampanye/${c.slug}`)}
                                            className="px-3 py-1.5 bg-gray-50 text-gray-600 text-[11px] font-bold rounded-lg hover:bg-gray-100 transition"
                                        >
                                            Detail
                                        </button>
                                        <button
                                            onClick={() => handleOpenEdit(c)}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1 shadow-xs"
                                        >
                                            <span className="material-icons text-xs">edit</span>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => navigate(`/dashboard/admin/donations?campaign=${c.slug}`)}
                                            className="px-3 py-1.5 bg-green-50 text-green-600 text-[11px] font-bold rounded-lg hover:bg-green-100 transition"
                                        >
                                            Donatur
                                        </button>
                                        <button
                                            onClick={() => navigate(`/dashboard/admin/charity?campaign=${c.slug}`)}
                                            className="px-3 py-1.5 bg-orange-50 text-orange-600 text-[11px] font-bold rounded-lg hover:bg-orange-100 transition"
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

            {/* Edit Charity Modal */}
            {editModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Edit Program Charity</h2>
                                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                                    Perubahan ini aman dan <b>tidak akan mengubah</b> nominal terkumpul (Rp {Number(editingCampaign?.current_amount || 0).toLocaleString('id-ID')}) maupun riwayat donasi yang sudah masuk.
                                </p>
                            </div>
                            <button 
                                onClick={handleCloseEdit} 
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center shrink-0 transition"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Judul Charity *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-green-500" 
                                        value={editFormData.title} 
                                        onChange={e => setEditFormData({ ...editFormData, title: e.target.value })} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori *</label>
                                    <select 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-green-500" 
                                        value={editFormData.category} 
                                        onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Donasi (Rp) *</label>
                                    <CurrencyInput
                                        required
                                        value={editFormData.target_amount}
                                        onChange={e => setEditFormData({ ...editFormData, target_amount: e.target.value })}
                                        placeholder="50000000"
                                        className="!px-4 !py-2.5"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ganti Thumbnail (Opsional)</label>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleEditImageChange} 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs" 
                                    />
                                    {editPreviewImage && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <img src={editPreviewImage} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-200" />
                                            <span className="text-[11px] text-gray-500">Thumbnail saat ini / preview baru</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Batas Waktu */}
                            <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                    Batas Waktu Berakhirnya Charity
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label 
                                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                            editHasUnlimitedDeadline 
                                                ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500/20 shadow-xs' 
                                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="editDeadlineOption"
                                            checked={editHasUnlimitedDeadline}
                                            onChange={() => {
                                                setEditHasUnlimitedDeadline(true);
                                                setEditFormData(prev => ({ ...prev, deadline: '' }));
                                            }}
                                            className="mt-0.5 w-4 h-4 text-emerald-600 accent-emerald-600"
                                        />
                                        <div>
                                            <div className="text-xs font-bold flex items-center gap-1.5">
                                                <span className="material-icons text-sm text-emerald-600">all_inclusive</span>
                                                <span>Tidak Ada Batasan</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Charity aktif tanpa batas waktu (unlimited)</p>
                                        </div>
                                    </label>

                                    <label 
                                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                            !editHasUnlimitedDeadline 
                                                ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500/20 shadow-xs' 
                                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="editDeadlineOption"
                                            checked={!editHasUnlimitedDeadline}
                                            onChange={() => setEditHasUnlimitedDeadline(false)}
                                            className="mt-0.5 w-4 h-4 text-emerald-600 accent-emerald-600"
                                        />
                                        <div>
                                            <div className="text-xs font-bold flex items-center gap-1.5">
                                                <span className="material-icons text-sm text-gray-600">event</span>
                                                <span>Tentukan Tanggal</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Pilih batas tanggal charity berakhir</p>
                                        </div>
                                    </label>
                                </div>

                                {!editHasUnlimitedDeadline && (
                                    <div className="pt-2 border-t border-gray-200/60">
                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block mb-1">
                                            Pilih Tanggal Berakhir *
                                        </label>
                                        <input
                                            type="date"
                                            required={!editHasUnlimitedDeadline}
                                            value={editFormData.deadline || ''}
                                            onChange={e => setEditFormData(prev => ({ ...prev, deadline: e.target.value }))}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Deskripsi */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi Charity</label>
                                <CKEditorComponent 
                                    content={editFormData.description} 
                                    onChange={(val) => setEditFormData({ ...editFormData, description: val })} 
                                    placeholder="Jelaskan detail program charity..." 
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-gray-50 border-t flex items-center justify-end gap-3 -mx-6 -mb-6 mt-6 rounded-b-3xl">
                                <button 
                                    type="button"
                                    onClick={handleCloseEdit} 
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="bg-green-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-green-800 transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <span className="material-icons text-sm">save</span>
                                    <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardAdminCampaignManagementPage;
