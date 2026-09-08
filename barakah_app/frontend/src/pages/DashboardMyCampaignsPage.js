import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import CurrencyInput from '../components/common/CurrencyInput';
import CKEditorComponent from '../components/common/CKEditor';
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

    // Store Collaboration States
    const [isCollaboration, setIsCollaboration] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
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

    // Filter and sort products strictly by stock descending (stok terbanyak sampai habis)
    const filteredStoreProducts = useMemo(() => {
        return [...storeProducts]
            .filter(p => !productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase()))
            .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    }, [storeProducts, productSearch]);

    const categoryAdditionalAmounts = {
        infak: { value: 25 }, sedekah: { value: 50 }, zakat: { value: 75 }, donasi: { value: 100 },
        bencana: { value: 125 }, kemanusiaan: { value: 150 }, kesehatan: { value: 175 }, lingkungan: { value: 200 },
        pembangunan: { value: 225 }, sosial: { value: 250 }, lainnya: { value: 275 }, default: { value: 300 }
    };
    
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
    ].map(c => ({
        ...c,
        label: `${c.label} - ${categoryAdditionalAmounts[c.value]?.value || 300}`
    }));

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

    useEffect(() => {
        if (showForm && isCollaboration && storeProducts.length === 0) {
            setLoadingProducts(true);
            axios.get(`${API}/api/products/`)
                .then(res => {
                    const list = res.data.results || res.data || [];
                    setStoreProducts(list);
                })
                .catch(err => console.error("Error fetching store products:", err))
                .finally(() => setLoadingProducts(false));
        }
    }, [showForm, isCollaboration, storeProducts.length]);

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

            fd.append('is_collaboration', isCollaboration);
            if (isCollaboration) {
                fd.append('collaboration_type', 'waqaf');
                selectedProductIds.forEach(pid => {
                    fd.append('collab_products', pid);
                });
            }

            await axios.post(`${API}/api/campaigns/submit/`, fd, {
                headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' }
            });
            alert('Charity berhasil diajukan! Menunggu verifikasi admin.');
            setShowForm(false);
            setFormData({ title: '', category: 'infak', description: '', target_amount: '', thumbnail: null });
            setPreviewImage(null);
            setIsCollaboration(false);
            setSelectedProductIds([]);
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
                                <CKEditorComponent content={formData.description} onChange={(val) => setFormData({...formData, description: val})} placeholder="Jelaskan detail charity..." />
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

                            {/* Kolaborasi dengan Store Section */}
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                            <span className="material-icons text-xl">storefront</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">Kolaborasi dengan Store (Waqaf Produk)</h4>
                                            <p className="text-xs text-gray-500">
                                                Hubungkan program charity ini dengan waqaf produk store. Donatur dapat memilih donasi uang tunai bebas atau waqaf produk.
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isCollaboration}
                                            onChange={(e) => setIsCollaboration(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                {isCollaboration && (
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
                                                {selectedProductIds.length} Produk Dipilih
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
                                                                const isSelected = selectedProductIds.includes(p.id);
                                                                const stockNum = Number(p.stock) || 0;
                                                                const hasStock = stockNum > 0;
                                                                return (
                                                                    <div
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            if (isSelected) {
                                                                                setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                                                            } else {
                                                                                setSelectedProductIds(prev => [...prev, p.id]);
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
                                                            {selectedProductIds.length} produk terpilih
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
                                        {selectedProductIds.length > 0 ? (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                        Produk Waqaf Yang Terpilih ({selectedProductIds.length}):
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedProductIds([])}
                                                        className="text-[10px] text-red-500 hover:underline font-medium"
                                                    >
                                                        Hapus Semua
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                                                    {storeProducts.filter(p => selectedProductIds.includes(p.id)).map(p => (
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
                                                                onClick={() => setSelectedProductIds(prev => prev.filter(id => id !== p.id))}
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
                                            <p className="text-[11px] text-gray-400 italic">
                                                Belum ada produk toko yang dipilih. Klik tombol &quot;Buka List&quot; di atas untuk memilih produk waqaf.
                                            </p>
                                        )}
                                    </div>
                                )}
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
                                            <div>
                                                <h3 className="font-bold text-gray-900 truncate">{c.title}</h3>
                                                {c.is_collaboration && c.collaboration_type === 'waqaf' && (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                                        <span className="material-icons text-[12px]">inventory_2</span>
                                                        Kolaborasi Waqaf ({c.collab_products_details?.length || 0} Produk)
                                                    </span>
                                                )}
                                            </div>
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
