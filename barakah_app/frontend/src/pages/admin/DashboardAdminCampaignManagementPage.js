import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

    // Store Collaboration States for Edit Modal
    const [editIsCollaboration, setEditIsCollaboration] = useState(false);
    const [editSelectedProductIds, setEditSelectedProductIds] = useState([]);
    const [storeProducts, setStoreProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProductDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchStoreProducts = useCallback(() => {
        setLoadingProducts(true);
        axios.get(`${API}/api/products/`)
            .then(res => {
                const list = res.data.results || res.data || [];
                setStoreProducts(list);
            })
            .catch(err => console.error("Error fetching store products:", err))
            .finally(() => setLoadingProducts(false));
    }, []);

    useEffect(() => {
        if (editModalOpen && editIsCollaboration && storeProducts.length === 0) {
            fetchStoreProducts();
        }
    }, [editModalOpen, editIsCollaboration, storeProducts.length, fetchStoreProducts]);

    // Filter and sort products strictly by stock descending (stok terbanyak sampai habis)
    const filteredStoreProducts = useMemo(() => {
        return [...storeProducts]
            .filter(p => !productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase()))
            .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    }, [storeProducts, productSearch]);

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

        // Collaboration States Initialization
        const hasCollab = Boolean(c.is_collaboration && c.collaboration_type === 'waqaf');
        setEditIsCollaboration(hasCollab);
        const prodIds = (c.collab_products && c.collab_products.length > 0)
            ? c.collab_products
            : (c.collab_products_details ? c.collab_products_details.map(p => p.id) : []);
        setEditSelectedProductIds(prodIds);

        if (c.collab_products_details && c.collab_products_details.length > 0) {
            setStoreProducts(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newProds = c.collab_products_details.filter(p => !existingIds.has(p.id));
                return [...prev, ...newProds];
            });
        }

        if (hasCollab && storeProducts.length === 0) {
            fetchStoreProducts();
        }

        setProductSearch('');
        setShowProductDropdown(false);
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
        setEditIsCollaboration(false);
        setEditSelectedProductIds([]);
        setProductSearch('');
        setShowProductDropdown(false);
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

        if (editIsCollaboration && editSelectedProductIds.length === 0) {
            alert('Silakan pilih minimal 1 produk store untuk kolaborasi waqaf atau nonaktifkan fitur kolaborasi.');
            return;
        }

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

            // Collaboration Fields
            fd.append('is_collaboration', editIsCollaboration);
            if (editIsCollaboration) {
                fd.append('collaboration_type', 'waqaf');
                editSelectedProductIds.forEach(pid => {
                    fd.append('collab_products', pid);
                });
            } else {
                fd.append('collaboration_type', '');
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

                            {/* Kolaborasi dengan Store Section */}
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                            <span className="material-icons text-xl">storefront</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">Kolaborasi dengan Store (Waqaf Produk)</h4>
                                            <p className="text-xs text-gray-500">
                                                Hubungkan program charity ini dengan waqaf produk store. Donatur dapat memilih donasi uang tunai bebas atau waqaf produk.
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                                        <input
                                            type="checkbox"
                                            checked={editIsCollaboration}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setEditIsCollaboration(checked);
                                                if (checked && storeProducts.length === 0) {
                                                    fetchStoreProducts();
                                                }
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {editIsCollaboration && (
                                    <div className="pt-3 border-t border-emerald-100/60 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                                                    Pilih Produk Store untuk Kolaborasi Waqaf
                                                </label>
                                                <p className="text-[11px] text-gray-500">
                                                    Bisa pilih banyak produk. Disusun urut dari stok terbanyak sampai habis.
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                                                {editSelectedProductIds.length} Produk Dipilih
                                            </span>
                                        </div>

                                        {/* Dropdown Selector Container */}
                                        <div ref={dropdownRef} className="relative">
                                            <div className="flex items-center bg-white border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-xl px-3 py-1.5 shadow-xs transition">
                                                <span className="material-icons text-gray-400 text-sm mr-2 shrink-0">search</span>
                                                <input
                                                    type="text"
                                                    placeholder="Cari &amp; pilih produk store untuk waqaf..."
                                                    value={productSearch}
                                                    onChange={(e) => {
                                                        setProductSearch(e.target.value);
                                                        setShowProductDropdown(true);
                                                    }}
                                                    onFocus={() => setShowProductDropdown(true)}
                                                    className="w-full bg-transparent text-xs outline-none text-gray-800 placeholder-gray-400 py-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowProductDropdown(prev => !prev)}
                                                    className="ml-2 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold shrink-0 flex items-center gap-1 transition"
                                                >
                                                    <span>{showProductDropdown ? 'Tutup' : 'Buka List'}</span>
                                                    <span className="material-icons text-sm">
                                                        {showProductDropdown ? 'expand_less' : 'expand_more'}
                                                    </span>
                                                </button>
                                            </div>

                                            {/* Dropdown Panel */}
                                            {showProductDropdown && (
                                                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
                                                    <div className="p-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px]">
                                                        <span className="font-bold text-gray-500 uppercase tracking-wider">
                                                            PILIH PRODUK (URUT STOK TERBANYAK)
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowProductDropdown(false)}
                                                            className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                                                        >
                                                            <span>Tutup</span>
                                                            <span className="material-icons text-xs">close</span>
                                                        </button>
                                                    </div>

                                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                                        {loadingProducts ? (
                                                            <div className="text-center py-6 text-xs text-gray-500 flex items-center justify-center gap-2">
                                                                <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                                                <span>Memuat produk store...</span>
                                                            </div>
                                                        ) : filteredStoreProducts.length > 0 ? (
                                                            filteredStoreProducts.map(p => {
                                                                const isSelected = editSelectedProductIds.includes(p.id);
                                                                const stockNum = Number(p.stock) || 0;
                                                                const hasStock = stockNum > 0;
                                                                return (
                                                                    <div
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            if (isSelected) {
                                                                                setEditSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                                                            } else {
                                                                                setEditSelectedProductIds(prev => [...prev, p.id]);
                                                                            }
                                                                        }}
                                                                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition ${
                                                                            isSelected ? 'bg-emerald-50 border border-emerald-300' : 'hover:bg-gray-50 border border-transparent'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            readOnly
                                                                            className="w-4 h-4 text-green-600 rounded cursor-pointer accent-green-600 shrink-0"
                                                                        />
                                                                        {p.thumbnail ? (
                                                                            <img src={p.thumbnail} alt="" className="w-10 h-10 object-cover rounded-lg shrink-0 border border-gray-100" />
                                                                        ) : (
                                                                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                                                <span className="material-icons text-sm text-gray-400">image</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <h5 className="text-xs font-bold text-gray-900 truncate">{p.title}</h5>
                                                                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                                                                {p.discounted_price != null && Number(p.discounted_price) < Number(p.price) ? (
                                                                                    <span className="flex items-center gap-1">
                                                                                        <span className="font-bold text-emerald-700">Rp {Number(p.discounted_price).toLocaleString('id-ID')}</span>
                                                                                        <span className="line-through text-gray-400 text-[9px]">Rp {Number(p.price).toLocaleString('id-ID')}</span>
                                                                                        <span className="bg-red-50 text-red-600 font-bold px-1 rounded text-[8px] uppercase">Kampanye</span>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="font-bold text-emerald-700">Rp {Number(p.price).toLocaleString('id-ID')}</span>
                                                                                )}
                                                                                <span>•</span>
                                                                                <span className={`px-1.5 py-0.2 rounded font-bold ${
                                                                                    hasStock ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-600'
                                                                                }`}>
                                                                                    {hasStock ? `Stok: ${stockNum} ${p.unit || 'pcs'}` : 'Stok: 0 (Habis)'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-center py-6 text-xs text-gray-400">
                                                                Tidak ada produk ditemukan
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Sticky footer with close button */}
                                                    <div className="p-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                                        <span className="text-[11px] text-gray-600 font-medium">
                                                            {editSelectedProductIds.length} produk terpilih
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowProductDropdown(false)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1"
                                                        >
                                                            <span className="material-icons text-sm">check</span>
                                                            <span>Selesai Memilih</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected Products Preview Cards */}
                                        {editSelectedProductIds.length > 0 ? (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                        Produk Waqaf Yang Terpilih ({editSelectedProductIds.length}):
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditSelectedProductIds([])}
                                                        className="text-[10px] text-red-500 hover:underline font-medium"
                                                    >
                                                        Hapus Semua
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                                                    {storeProducts.filter(p => editSelectedProductIds.includes(p.id)).map(p => (
                                                        <div key={p.id} className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-xs">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                {p.thumbnail ? (
                                                                    <img src={p.thumbnail} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0 border border-gray-100" />
                                                                ) : (
                                                                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                                        <span className="material-icons text-sm text-gray-400">inventory_2</span>
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-gray-900 truncate">{p.title}</p>
                                                                    <div className="text-[10px] mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                                        {p.discounted_price != null && Number(p.discounted_price) < Number(p.price) ? (
                                                                            <>
                                                                                <span className="text-emerald-700 font-black">
                                                                                    Rp {Number(p.discounted_price).toLocaleString('id-ID')}
                                                                                </span>
                                                                                <span className="line-through text-gray-400 text-[9px]">
                                                                                    Rp {Number(p.price).toLocaleString('id-ID')}
                                                                                </span>
                                                                                <span className="bg-red-50 text-red-600 text-[8px] font-bold px-1 rounded">
                                                                                    Harga Kampanye
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-emerald-700 font-black">
                                                                                Rp {Number(p.price).toLocaleString('id-ID')}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-gray-400">• Stok {p.stock} {p.unit || 'pcs'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditSelectedProductIds(prev => prev.filter(id => id !== p.id))}
                                                                className="text-gray-400 hover:text-red-600 p-1 transition"
                                                                title="Hapus dari daftar waqaf"
                                                            >
                                                                <span className="material-icons text-sm">close</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                                                <span className="material-icons text-amber-600 text-sm">warning</span>
                                                <span>Anda belum memilih produk. Buka list di atas untuk memilih minimal 1 produk waqaf.</span>
                                            </div>
                                        )}
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
