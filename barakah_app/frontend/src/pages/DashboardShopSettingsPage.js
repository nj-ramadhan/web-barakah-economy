import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import BackButton from '../components/global/BackButton';
import NavigationButton from '../components/layout/Navigation';
import ImageCropperModal from '../components/common/ImageCropper';
import ShopDecoration from '../components/profile/ShopDecoration';
import StoreTemplates from '../components/profile/StoreTemplates';
import CurrencyInput from '../components/common/CurrencyInput';
import { parseCurrency } from '../utils/formatters';
import { getNextDateFromDays } from '../utils/dateUtils';
import authService from '../services/auth';
import { getMediaUrl } from '../utils/mediaUtils';
import { safeStorage } from '../utils/storageUtils';
import '../styles/Body.css';

const DashboardShopSettingsPage = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        username: '',
        shop_name: '',
        picture: null,
        shop_thumbnail: null,
        shop_description: '',
        shop_layout: 'default',
        shop_theme_color: 'green',
        shop_font: 'sans',
        shop_decoration: 'none',
        shop_template: 'none',
        // Global Operational Hours, PO & Delivery settings
        is_operational_hours_active: false,
        operational_hours: '',
        is_preorder: false,
        preorder_type: 'days',
        preorder_days: '',
        preorder_days_min: '',
        preorder_days_max: '',
        preorder_duration: '',
        is_delivery_schedule_active: false,
        delivery_schedule_type: 'range',
        delivery_range_min: '',
        delivery_range_max: '',
        delivery_days: '',
        delivery_date: '',
        delivery_note: '',
        out_of_po_shipping_active: false,
        out_of_po_shipping_type: 'flat',
        out_of_po_shipping_cost: 0,
        allow_delivery_timing_choice: false,
        show_sold_count: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cropper, setCropper] = useState({ active: false, image: null });
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const user = safeStorage.getUser();
                if (user && user.id) {
                    const profileData = await authService.getProfile(user.id);
                    setProfile({
                        username: profileData.username || '',
                        shop_name: profileData.shop_name || '',
                        picture: profileData.picture || null,
                        shop_thumbnail: profileData.shop_thumbnail || null,
                        shop_description: profileData.shop_description || '',
                        shop_layout: profileData.shop_layout || 'default',
                        shop_theme_color: profileData.shop_theme_color || 'green',
                        shop_font: profileData.shop_font || 'sans',
                        shop_decoration: profileData.shop_decoration || 'none',
                        shop_template: profileData.shop_template || 'none',
                        is_operational_hours_active: Boolean(profileData.is_operational_hours_active),
                        operational_hours: profileData.operational_hours || '',
                        is_preorder: Boolean(profileData.is_preorder),
                        preorder_type: profileData.preorder_type || 'days',
                        preorder_days: profileData.preorder_days || '',
                        preorder_days_min: profileData.preorder_days_min !== null && profileData.preorder_days_min !== undefined ? profileData.preorder_days_min : '',
                        preorder_days_max: profileData.preorder_days_max !== null && profileData.preorder_days_max !== undefined ? profileData.preorder_days_max : '',
                        preorder_duration: profileData.preorder_duration || '',
                        is_delivery_schedule_active: Boolean(profileData.is_delivery_schedule_active),
                        delivery_schedule_type: profileData.delivery_schedule_type || 'range',
                        delivery_range_min: profileData.delivery_range_min !== null && profileData.delivery_range_min !== undefined ? profileData.delivery_range_min : '',
                        delivery_range_max: profileData.delivery_range_max !== null && profileData.delivery_range_max !== undefined ? profileData.delivery_range_max : '',
                        delivery_days: profileData.delivery_days || '',
                        delivery_date: profileData.delivery_date || '',
                        delivery_note: profileData.delivery_note || '',
                        out_of_po_shipping_active: Boolean(profileData.out_of_po_shipping_active),
                        out_of_po_shipping_type: profileData.out_of_po_shipping_type || 'flat',
                        out_of_po_shipping_cost: profileData.out_of_po_shipping_cost || 0,
                        allow_delivery_timing_choice: profileData.allow_delivery_timing_choice !== undefined && profileData.allow_delivery_timing_choice !== null ? Boolean(profileData.allow_delivery_timing_choice) : false,
                        show_sold_count: profileData.show_sold_count !== undefined && profileData.show_sold_count !== null ? Boolean(profileData.show_sold_count) : true,
                    });
                } else {
                    navigate('/login');
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCopyStoreLink = () => {
        const url = `https://barakah.cloud/store/${profile.shop_name || profile.username}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2500);
        });
    };

    const togglePreorderDay = (day) => {
        const currentDays = typeof profile.preorder_days === 'string'
            ? profile.preorder_days.split(',').map(s => s.trim()).filter(Boolean)
            : (Array.isArray(profile.preorder_days) ? profile.preorder_days : []);
        let updated;
        if (currentDays.includes(day)) {
            updated = currentDays.filter(d => d !== day);
        } else {
            updated = [...currentDays, day];
        }
        setProfile(prev => ({
            ...prev,
            preorder_days: updated.join(', ')
        }));
    };

    const toggleDeliveryDay = (day) => {
        const currentDays = typeof profile.delivery_days === 'string'
            ? profile.delivery_days.split(',').map(s => s.trim()).filter(Boolean)
            : (Array.isArray(profile.delivery_days) ? profile.delivery_days : []);
        let updated;
        if (currentDays.includes(day)) {
            updated = currentDays.filter(d => d !== day);
        } else {
            updated = [...currentDays, day];
        }
        setProfile(prev => ({
            ...prev,
            delivery_days: updated.join(', ')
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (profile.shop_thumbnail instanceof File && profile.shop_thumbnail.size > 5 * 1024 * 1024) {
            alert('File thumbnail toko terlalu besar (Maks 5MB)');
            return;
        }

        setSaving(true);
        try {
            const user = safeStorage.getUser();
            if (user && user.id) {
                const formData = new FormData();

                const fields = [
                    'shop_name', 'shop_description', 'shop_layout', 'shop_theme_color', 
                    'shop_font', 'shop_decoration', 'shop_template',
                    'is_operational_hours_active', 'operational_hours',
                    'is_preorder', 'preorder_type', 'preorder_days', 'preorder_days_min', 'preorder_days_max', 'preorder_duration',
                    'is_delivery_schedule_active', 'delivery_schedule_type', 'delivery_range_min', 'delivery_range_max', 'delivery_days', 'delivery_date', 'delivery_note',
                    'out_of_po_shipping_active', 'out_of_po_shipping_type', 'allow_delivery_timing_choice', 'show_sold_count'
                ];

                fields.forEach(f => {
                    if (profile[f] !== null && profile[f] !== undefined) {
                        formData.append(f, profile[f]);
                    }
                });

                formData.append('out_of_po_shipping_cost', profile.out_of_po_shipping_active && profile.out_of_po_shipping_type === 'flat' ? (parseCurrency(profile.out_of_po_shipping_cost) || 0) : 0);

                if (profile.shop_thumbnail instanceof File) {
                    formData.append('shop_thumbnail', profile.shop_thumbnail);
                }

                await authService.updateProfile(user.id, formData);
                alert('Pengaturan Toko berhasil disimpan');
            }
        } catch (error) {
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Gagal menyimpan pengaturan toko';
            alert('Error: ' + errorMsg);
            console.error('Failed to update shop settings:', error);
        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="body">
                <Header />
                <div className="flex justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                </div>
                <NavigationButton />
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>Pengaturan Toko - Dashboard</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
                <div className="flex items-center gap-2 mb-6">
                    <BackButton />
                    <div>
                        <h1 className="text-xl font-bold">Pengaturan Toko</h1>
                        <p className="text-xs text-gray-500">Sesuaikan tampilan toko digital Anda</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
                        {/* Settings Form */}
                        <div className="flex-1 space-y-5">
                            {/* Live Store URL Banner Card */}
                            <div className="p-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 rounded-2xl text-white shadow-md">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full mb-1">
                                            <span className="material-icons text-xs">storefront</span>
                                            Alamat Resmi Toko Anda
                                        </div>
                                        <p className="text-xs sm:text-sm font-mono font-bold truncate text-emerald-100">
                                            https://barakah.cloud/store/{profile.shop_name || profile.username || 'nama_toko'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleCopyStoreLink}
                                            className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                                            title="Salin Tautan Toko"
                                        >
                                            <span className="material-icons text-sm">{copySuccess ? 'check' : 'content_copy'}</span>
                                            <span>{copySuccess ? 'Tersalin!' : 'Salin'}</span>
                                        </button>
                                        <a
                                            href={`/store/${profile.shop_name || profile.username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow transition flex items-center gap-1 active:scale-95"
                                        >
                                            <span>Lihat Toko</span>
                                            <span className="material-icons text-sm">open_in_new</span>
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-xs text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                                    <span className="font-bold">Info:</span> Semua produk fisik, digital, dan e-course Anda otomatis tampil terpadu di halaman toko ini.
                                </p>
                            </div>

                            {/* Nama Toko / Slug */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1 text-sm">
                                    Nama Toko (Custom URL / Slug)
                                </label>
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1 border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200 transition">
                                    <span className="text-xs font-mono text-gray-400 select-none">barakah.cloud/store/</span>
                                    <input
                                        type="text"
                                        name="shop_name"
                                        placeholder={profile.username || 'nama-toko-anda'}
                                        value={profile.shop_name || ''}
                                        onChange={handleChange}
                                        className="flex-1 bg-transparent py-2.5 text-sm font-bold text-gray-800 outline-none"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                                    Jika diisi, toko Anda akan langsung beralamat di <strong>https://barakah.cloud/store/{profile.shop_name || profile.username}</strong>. Jika dikosongkan, alamat toko otomatis memakai username Anda (<strong>@{profile.username}</strong>).
                                </p>
                            </div>

                            {/* Shop Thumbnail */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-2 text-sm">Thumbnail / Banner Toko</label>
                                <div className="flex flex-col space-y-3">
                                    {profile.shop_thumbnail && (
                                        <div className="w-full h-40 rounded-xl overflow-hidden border bg-gray-50">
                                            <img
                                                src={profile.shop_thumbnail instanceof File ? URL.createObjectURL(profile.shop_thumbnail) : profile.shop_thumbnail}
                                                alt="Shop Thumbnail"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    alert('Ukuran gambar maksimal 5MB');
                                                    return;
                                                }
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    setCropper({ active: true, image: ev.target.result });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            {/* Shop Description */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5 text-sm flex items-center justify-between">
                                    <span>Deskripsi Profil Toko</span>
                                    <span className="text-[11px] font-normal text-gray-400">Tampil di header etalase toko</span>
                                </label>
                                <textarea
                                    name="shop_description"
                                    placeholder="Tuliskan sambutan hangat, profil toko, spesialisasi produk fisik/katalog, jaminan kualitas, dan komitmen layanan toko Anda kepada pembeli..."
                                    value={profile.shop_description || ''}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                                />
                            </div>

                            {/* Template & Gaya Header Toko */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5 text-sm flex items-center justify-between">
                                    <span>Gaya Tampilan Header Toko</span>
                                    <span className="text-[11px] font-semibold text-emerald-600">Desain Toko Modern</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { id: 'none', name: 'Standard Store', desc: 'Banner proporsional & klasik', icon: 'view_carousel', bg: 'from-emerald-700 to-teal-800' },
                                        { id: 'grand_hero', name: 'Grand Showcase', desc: 'Banner megah & luas', icon: 'photo_size_select_actual', bg: 'from-slate-900 to-emerald-950' },
                                        { id: 'compact_clean', name: 'Katalog Cepat', desc: 'Header ringkas minim spasi', icon: 'splitscreen', bg: 'from-blue-700 to-teal-700' },
                                        { id: 'islamic_heritage', name: 'Syariah Signature', desc: 'Aksen islami & badge amanah', icon: 'verified', bg: 'from-emerald-800 to-green-950' },
                                    ].map((tmpl) => {
                                        const isSelected = (profile.shop_template || 'none') === tmpl.id;
                                        return (
                                            <button
                                                key={tmpl.id}
                                                type="button"
                                                onClick={() => setProfile(prev => ({ ...prev, shop_template: tmpl.id }))}
                                                className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 text-left relative overflow-hidden ${
                                                    isSelected 
                                                        ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500' 
                                                        : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50/50'
                                                }`}
                                            >
                                                <div className={`w-full h-11 rounded-xl bg-gradient-to-r ${tmpl.bg} text-white flex items-center justify-center shadow-xs`}>
                                                    <span className="material-icons text-xl">{tmpl.icon}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 leading-tight">{tmpl.name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{tmpl.desc}</p>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xs">
                                                        <span className="material-icons text-[11px] font-bold">check</span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Layout Etalase Toko */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5 text-sm flex items-center justify-between">
                                    <span>Layout Tampilan Produk</span>
                                    <span className="text-[11px] font-normal text-gray-400">Pilih susunan kartu katalog etalase</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { id: 'grid', name: 'Grid Marketplace', desc: 'Standar 4-5 kolom, kartu seimbang & modern', icon: 'grid_view' },
                                        { id: 'compact', name: 'Grid Kompak', desc: 'Kartu rapat & muat banyak dalam satu layar', icon: 'view_module' },
                                        { id: 'list', name: 'Katalog List', desc: 'Baris horizontal fokus spesifikasi & harga', icon: 'view_list' },
                                    ].map((lay) => {
                                        const isSelected = (profile.shop_layout === lay.id) || (lay.id === 'grid' && (!profile.shop_layout || profile.shop_layout === 'default'));
                                        return (
                                            <button
                                                key={lay.id}
                                                type="button"
                                                onClick={() => setProfile(prev => ({ ...prev, shop_layout: lay.id }))}
                                                className={`p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 text-left ${
                                                    isSelected 
                                                        ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500' 
                                                        : 'border-gray-200 bg-white hover:border-emerald-300'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600'}`}>
                                                    <span className="material-icons text-xl">{lay.icon}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-800">{lay.name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{lay.desc}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tema Warna Aksen Toko */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5 text-sm flex items-center justify-between">
                                    <span>Tema Warna Toko</span>
                                    <span className="text-[11px] font-normal text-gray-400">Aksen tombol, badge, dan highlight etalase</span>
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-3">
                                    {[
                                        { id: 'emerald', label: 'Barakah', hex: '#059669', bgClass: 'bg-emerald-600' },
                                        { id: 'blue', label: 'Bahari', hex: '#2563eb', bgClass: 'bg-blue-600' },
                                        { id: 'teal', label: 'Alami', hex: '#0d9488', bgClass: 'bg-teal-600' },
                                        { id: 'amber', label: 'Gold', hex: '#d97706', bgClass: 'bg-amber-600' },
                                        { id: 'purple', label: 'Ungu', hex: '#7c3aed', bgClass: 'bg-purple-600' },
                                        { id: 'rose', label: 'Mewah', hex: '#e11d48', bgClass: 'bg-rose-600' },
                                        { id: 'dark', label: 'Slate', hex: '#0f172a', bgClass: 'bg-slate-900' },
                                    ].map(color => {
                                        const isSelected = profile.shop_theme_color === color.id || profile.shop_theme_color === color.hex;
                                        return (
                                            <button
                                                key={color.id}
                                                type="button"
                                                onClick={() => setProfile(prev => ({ ...prev, shop_theme_color: color.id }))}
                                                className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                                                    isSelected ? 'border-gray-900 ring-2 ring-emerald-400 bg-white shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                                                }`}
                                            >
                                                <span className={`w-5 h-5 rounded-full ${color.bgClass} shadow-xs`}></span>
                                                <span className="text-[10px] font-bold text-gray-700">{color.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                                    <input
                                        type="color"
                                        value={profile.shop_theme_color?.startsWith('#') ? profile.shop_theme_color : '#059669'}
                                        onChange={(e) => setProfile(prev => ({ ...prev, shop_theme_color: e.target.value }))}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 shadow-sm"
                                        title="Pilih Warna Custom HEX"
                                    />
                                    <div className="flex-1">
                                        <p className="text-[11px] font-bold text-gray-700">Warna Kustom (HEX / Brand):</p>
                                        <input
                                            type="text"
                                            placeholder="#059669"
                                            value={profile.shop_theme_color || 'emerald'}
                                            onChange={(e) => setProfile(prev => ({ ...prev, shop_theme_color: e.target.value }))}
                                            className="w-full bg-white px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 uppercase mt-0.5"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Jenis Font & Dekorasi Aksen Latar */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1.5 text-sm">Jenis Font Toko</label>
                                    <select
                                        name="shop_font"
                                        value={profile.shop_font || 'sans'}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                                    >
                                        <option value="sans">Modern Sans (Inter / Bersih & Universal)</option>
                                        <option value="poppins">Poppins (Friendly, Santai & Hangat)</option>
                                        <option value="serif">Classic Serif (Mewah, Elegan & Busana Muslim)</option>
                                        <option value="mono">Tech Mono (Kontemporer & Terstruktur)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1.5 text-sm">Aksen Latar Etalase</label>
                                    <select
                                        name="shop_decoration"
                                        value={profile.shop_decoration || 'none'}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200/80 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                                    >
                                        <option value="none">Minimalis Bersih (Clean White)</option>
                                        <option value="islamic_geometric">Aksen Syariah Geometris (Islamic Pattern)</option>
                                        <option value="soft_dots">Pola Modern Dots & Grid (Marketplace Style)</option>
                                        <option value="warm_gradient">Aksen Gradasi Hangat (Soft Warm Gradient)</option>
                                    </select>
                                </div>
                            </div>

                            {/* PENGATURAN GLOBAL: JAM OPERASIONAL, PRE-ORDER & PENGANTARAN */}
                            <div className="bg-white rounded-2xl p-5 border-2 border-emerald-500/40 shadow-sm space-y-5 mt-6">
                                <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                        <span className="material-icons text-lg">tune</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-900 text-sm">Pengaturan Etalase, Jam Operasional & Pengantaran Toko</h4>
                                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                Global Toko
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500">
                                            Pengaturan ini otomatis diterapkan ke <b>semua produk</b> di toko Anda (cukup diatur sekali tanpa repot per produk).
                                        </p>
                                    </div>
                                </div>

                                {/* 0. Tampilkan / Sembunyikan Jumlah Terjual */}
                                <div className="bg-gradient-to-br from-gray-50 to-emerald-50/20 p-4 rounded-xl border border-gray-200/70">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${profile.show_sold_count ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' : 'bg-gray-200 text-gray-500'}`}>
                                                <span className="material-icons text-lg">visibility</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold text-gray-800">Tampilkan Jumlah Terjual</p>
                                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${profile.show_sold_count ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {profile.show_sold_count ? 'Aktif' : 'Disembunyikan'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-gray-500">
                                                    Bila dimatikan, jumlah produk terjual akan disembunyikan di semua produk toko Anda.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, show_sold_count: !prev.show_sold_count }))}
                                            className={`w-11 h-6 rounded-full transition-all relative ${profile.show_sold_count ? 'bg-emerald-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${profile.show_sold_count ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>

                                {/* 1. Jam Operasional Toko */}
                                <div className="bg-gradient-to-br from-gray-50 to-emerald-50/20 p-4 rounded-xl border border-gray-200/70">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${profile.is_operational_hours_active ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200' : 'bg-gray-200 text-gray-500'}`}>
                                                <span className="material-icons text-lg">storefront</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">Jam Operasional Toko</p>
                                                <p className="text-[10px] text-gray-500">Tampilkan hari & jam buka toko pada halaman profil toko dan produk</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, is_operational_hours_active: !prev.is_operational_hours_active }))}
                                            className={`w-11 h-6 rounded-full transition-all relative ${profile.is_operational_hours_active ? 'bg-emerald-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${profile.is_operational_hours_active ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {profile.is_operational_hours_active && (
                                        <div className="mt-3.5 pt-3.5 border-t border-gray-200/60 space-y-2">
                                            <label className="block text-xs font-semibold text-gray-700">Jam / Hari Buka Toko</label>
                                            <input
                                                type="text"
                                                name="operational_hours"
                                                value={profile.operational_hours || ''}
                                                onChange={handleChange}
                                                placeholder="Contoh: Senin - Sabtu, 08:00 - 17:00 WIB"
                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                                            />
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                <span className="text-[10px] text-gray-400 self-center mr-1">Pilihan Cepat:</span>
                                                {['Setiap Hari (08:00 - 21:00 WIB)', 'Senin - Sabtu (08:00 - 17:00 WIB)', 'Senin - Jumat (09:00 - 17:00 WIB)'].map((preset) => (
                                                    <button
                                                        key={preset}
                                                        type="button"
                                                        onClick={() => setProfile(prev => ({ ...prev, operational_hours: preset }))}
                                                        className="text-[10px] bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 px-2.5 py-1 rounded-lg text-gray-600 transition"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Sistem Pre-Order (PO) */}
                                <div className="bg-gradient-to-br from-gray-50 to-blue-50/20 p-4 rounded-xl border border-gray-200/70">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${profile.is_preorder ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'bg-gray-200 text-gray-500'}`}>
                                                <span className="material-icons text-lg">hourglass_top</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold text-gray-800">Sistem Pre-Order (PO) Global</p>
                                                    {profile.is_preorder && (
                                                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Aktif</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-500">Tandai default semua produk butuh waktu proses PO sebelum dikirimkan</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, is_preorder: !prev.is_preorder }))}
                                            className={`w-11 h-6 rounded-full transition-all relative ${profile.is_preorder ? 'bg-blue-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${profile.is_preorder ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {profile.is_preorder && (
                                        <div className="mt-3.5 pt-3.5 border-t border-gray-200/60 space-y-3.5">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pilih Tipe Jadwal Pre-Order</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { id: 'days', label: 'Pilih Hari Tertentu', icon: 'view_week' },
                                                        { id: 'range', label: 'Rentang Hari', icon: 'date_range' },
                                                    ].map((t) => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => setProfile(prev => ({ ...prev, preorder_type: t.id }))}
                                                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${profile.preorder_type === t.id ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <span className="material-icons text-sm">{t.icon}</span>
                                                            <span>{t.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {profile.preorder_type === 'days' && (
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-semibold text-gray-700">Pilih Hari PO dalam Seminggu</label>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                                                            const currentDays = typeof profile.preorder_days === 'string'
                                                                ? profile.preorder_days.split(',').map(s => s.trim()).filter(Boolean)
                                                                : (Array.isArray(profile.preorder_days) ? profile.preorder_days : []);
                                                            const isSelected = currentDays.includes(day);
                                                            return (
                                                                <button
                                                                    key={day}
                                                                    type="button"
                                                                    onClick={() => togglePreorderDay(day)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isSelected ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {Boolean(profile.preorder_days) && (
                                                        <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/70 space-y-1">
                                                            <p className="text-[11px] text-blue-900 font-medium">
                                                                Dipilih: <span className="font-bold">{profile.preorder_days}</span>
                                                            </p>
                                                            {(() => {
                                                                const daysArr = typeof profile.preorder_days === 'string' ? profile.preorder_days.split(',').map(s=>s.trim()).filter(Boolean) : profile.preorder_days;
                                                                const nextInfo = getNextDateFromDays(daysArr);
                                                                return nextInfo ? (
                                                                    <p className="text-[11px] text-blue-800 font-semibold flex items-center gap-1.5">
                                                                        <span className="material-icons text-[14px] text-blue-600">event</span>
                                                                        <span>Jadwal PO Terdekat: <strong className="text-blue-950 underline">{nextInfo.display}</strong></span>
                                                                    </p>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {profile.preorder_type === 'range' && (
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-700">Waktu / Lama PO (Rentang Hari)</label>
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                name="preorder_days_min"
                                                                value={profile.preorder_days_min}
                                                                onChange={handleChange}
                                                                placeholder="Min (Cth: 3)"
                                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                            />
                                                            <span className="absolute right-3 top-2.5 text-[11px] text-gray-400">Hari</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400 font-bold">s/d</span>
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                name="preorder_days_max"
                                                                value={profile.preorder_days_max}
                                                                onChange={handleChange}
                                                                placeholder="Maks (Cth: 7)"
                                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                            />
                                                            <span className="absolute right-3 top-2.5 text-[11px] text-gray-400">Hari</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[11px] text-gray-500 mb-1">Keterangan Label PO (Opsional)</label>
                                                <input
                                                    type="text"
                                                    name="preorder_duration"
                                                    value={profile.preorder_duration || ''}
                                                    onChange={handleChange}
                                                    placeholder="Contoh: 3 - 7 Hari (Dibuat sesuai pesanan)"
                                                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-400 transition"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 3. Jadwal & Tanggal Pengantaran */}
                                <div className="bg-gradient-to-br from-gray-50 to-amber-50/20 p-4 rounded-xl border border-gray-200/70">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${profile.is_delivery_schedule_active ? 'bg-amber-600 text-white shadow-sm shadow-amber-200' : 'bg-gray-200 text-gray-500'}`}>
                                                <span className="material-icons text-lg">local_shipping</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">Jadwal & Tanggal Pengantaran Toko</p>
                                                <p className="text-[10px] text-gray-500">Bebas pilih rentang hari pengiriman atau tentukan hari/tanggal tertentu</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, is_delivery_schedule_active: !prev.is_delivery_schedule_active }))}
                                            className={`w-11 h-6 rounded-full transition-all relative ${profile.is_delivery_schedule_active ? 'bg-amber-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${profile.is_delivery_schedule_active ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {profile.is_delivery_schedule_active && (
                                        <div className="mt-3.5 pt-3.5 border-t border-gray-200/60 space-y-3.5">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pilih Tipe Jadwal Pengantaran</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'range', label: 'Rentang Hari', icon: 'date_range' },
                                                        { id: 'days', label: 'Pilih Hari Tertentu', icon: 'view_week' },
                                                        { id: 'date', label: 'Tanggal Spesifik', icon: 'event' }
                                                    ].map((t) => (
                                                        <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => setProfile(prev => ({ ...prev, delivery_schedule_type: t.id }))}
                                                            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${profile.delivery_schedule_type === t.id ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                        >
                                                            <span className="material-icons text-sm">{t.icon}</span>
                                                            <span>{t.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {profile.delivery_schedule_type === 'range' && (
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-700">Estimasi Pengantaran (Rentang Hari)</label>
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                name="delivery_range_min"
                                                                value={profile.delivery_range_min}
                                                                onChange={handleChange}
                                                                placeholder="Min (Cth: 1)"
                                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-amber-500 transition"
                                                            />
                                                            <span className="absolute right-3 top-2.5 text-[11px] text-gray-400">Hari</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400 font-bold">s/d</span>
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                name="delivery_range_max"
                                                                value={profile.delivery_range_max}
                                                                onChange={handleChange}
                                                                placeholder="Maks (Cth: 3)"
                                                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-amber-500 transition"
                                                            />
                                                            <span className="absolute right-3 top-2.5 text-[11px] text-gray-400">Hari</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {profile.delivery_schedule_type === 'days' && (
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-700">Pilih Hari Pengantaran dalam Seminggu</label>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                                                            const currentDays = typeof profile.delivery_days === 'string'
                                                                ? profile.delivery_days.split(',').map(s => s.trim()).filter(Boolean)
                                                                : (Array.isArray(profile.delivery_days) ? profile.delivery_days : []);
                                                            const isSelected = currentDays.includes(day);
                                                            return (
                                                                <button
                                                                    key={day}
                                                                    type="button"
                                                                    onClick={() => toggleDeliveryDay(day)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isSelected ? 'bg-amber-500 border-amber-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'}`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {Boolean(profile.delivery_days) && (
                                                        <p className="text-[11px] text-amber-800 font-medium mt-1">
                                                            Dipilih: <span className="font-bold">{profile.delivery_days}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {profile.delivery_schedule_type === 'date' && (
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-700">Tanggal Pengantaran Spesifik</label>
                                                    <input
                                                        type="date"
                                                        name="delivery_date"
                                                        value={profile.delivery_date}
                                                        onChange={handleChange}
                                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-amber-500 transition"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-[11px] text-gray-500 mb-1">Catatan / Waktu Pengantaran (Opsional)</label>
                                                <input
                                                    type="text"
                                                    name="delivery_note"
                                                    value={profile.delivery_note || ''}
                                                    onChange={handleChange}
                                                    placeholder="Contoh: Pengiriman dimulai pukul 13:00 - 16:00 WIB"
                                                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 outline-none focus:ring-2 focus:ring-amber-400 transition"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Tarif Ongkir Flat Luar Jam PO */}
                                <div className="bg-gradient-to-br from-gray-50 to-purple-50/20 p-4 rounded-xl border border-gray-200/70">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${profile.out_of_po_shipping_active ? 'bg-purple-600 text-white shadow-sm shadow-purple-200' : 'bg-gray-200 text-gray-500'}`}>
                                                <span className="material-icons text-lg">local_atm</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold text-gray-800">Ongkir Flat Seller / Luar Jam PO</p>
                                                    {profile.out_of_po_shipping_active && (
                                                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Aktif</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-500">Tetapkan tarif ongkir flat toko (berlaku flat walau beli banyak produk)</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, out_of_po_shipping_active: !prev.out_of_po_shipping_active }))}
                                            className={`w-11 h-6 rounded-full transition-all relative ${profile.out_of_po_shipping_active ? 'bg-purple-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${profile.out_of_po_shipping_active ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {profile.out_of_po_shipping_active && (
                                        <div className="mt-3.5 pt-3.5 border-t border-gray-200/60 space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pilih Tipe Tarif Luar Jam PO</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProfile(prev => ({ ...prev, out_of_po_shipping_type: 'flat' }))}
                                                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${profile.out_of_po_shipping_type === 'flat' ? 'bg-purple-100 border-purple-400 text-purple-900 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="material-icons text-sm">local_atm</span>
                                                        <span>Flat Ongkir</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setProfile(prev => ({ ...prev, out_of_po_shipping_type: 'distance' }))}
                                                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${profile.out_of_po_shipping_type === 'distance' ? 'bg-purple-100 border-purple-400 text-purple-900 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        <span className="material-icons text-sm">straighten</span>
                                                        <span>Sesuai Jarak</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {profile.out_of_po_shipping_type === 'flat' ? (
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-700">Nominal Tarif Ongkir Flat Luar Jam PO (Rp) *</label>
                                                    <div className="max-w-xs">
                                                        <CurrencyInput 
                                                            value={profile.out_of_po_shipping_cost !== undefined && profile.out_of_po_shipping_cost !== null ? profile.out_of_po_shipping_cost : ''} 
                                                            onChange={(e) => setProfile(prev => ({ ...prev, out_of_po_shipping_cost: parseCurrency(e.target.value) }))} 
                                                            placeholder="Contoh: 15.000" 
                                                            className="!px-3.5 !py-2.5 !bg-white !rounded-xl !border-purple-300 !text-purple-800 !font-bold !text-xs !w-full outline-none focus:ring-2 focus:ring-purple-500"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-purple-700 font-medium">
                                                        💡 Tarif ini diterapkan flat per pesanan toko Anda (tidak berlipat ganda meskipun pembeli memesan banyak produk/jumlah banyak).
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs space-y-1">
                                                    <div className="flex items-center gap-1.5 font-bold">
                                                        <span className="material-icons text-purple-600 text-sm">info</span>
                                                        <span>Ongkir Luar Jam PO Dihitung Sesuai Jarak</span>
                                                    </div>
                                                    <p className="text-[11px] text-purple-800 leading-relaxed">
                                                        Pengiriman di luar jam PO akan dihitung tarifnya sesuai jarak oleh penjual / kurir dan akan dikonfirmasikan langsung kepada pembeli setelah checkout.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 5. Fleksibilitas Pengiriman */}
                                <div className="bg-gradient-to-br from-gray-50 to-teal-50/20 p-4 rounded-xl border border-gray-200/70">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${profile.allow_delivery_timing_choice ? 'bg-teal-600 text-white shadow-sm shadow-teal-200' : 'bg-gray-200 text-gray-500'}`}>
                                                <span className="material-icons text-lg">calendar_month</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold text-gray-800">Opsi Pilihan Waktu Kirim Pembeli</p>
                                                    {profile.allow_delivery_timing_choice && (
                                                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Aktif</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-500">Beri pembeli opsi: Ikut jadwal saat ini/minggu ini ATAU kirim ke minggu depannya</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProfile(prev => ({ ...prev, allow_delivery_timing_choice: !prev.allow_delivery_timing_choice }))}
                                            className={`w-11 h-6 rounded-full transition-all relative ${profile.allow_delivery_timing_choice ? 'bg-teal-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${profile.allow_delivery_timing_choice ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-green-700 text-white rounded-xl py-4 font-bold shadow-lg hover:bg-green-800 transition disabled:opacity-50 mt-4"
                            >
                                {saving ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}
                            </button>
                        </div>

                        {/* Live Preview Box */}
                        <div className="w-full lg:w-[350px] flex-shrink-0 bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col items-center">
                            <div className="w-full flex items-center justify-between mb-3 px-1">
                                <h4 className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-1.5">
                                    <span className="material-icons text-sm text-emerald-600">smartphone</span>
                                    <span>Live Preview Toko</span>
                                </h4>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                    Real-time
                                </span>
                            </div>

                            {/* Phone Device Mockup Frame */}
                            <div className="w-full bg-slate-900 rounded-[2.5rem] p-2.5 shadow-2xl border-4 border-slate-800">
                                {/* Top Speaker / Dynamic Island */}
                                <div className="w-24 h-3 bg-slate-800 rounded-b-xl mx-auto -mt-1 mb-1 z-30"></div>

                                {/* Phone Inner Screen */}
                                <div className={`w-full bg-slate-50 rounded-[2rem] overflow-hidden relative h-[610px] flex flex-col text-slate-800 text-left ${
                                    profile.shop_font === 'serif' ? 'font-serif' :
                                    profile.shop_font === 'mono' ? 'font-mono' :
                                    profile.shop_font === 'poppins' ? 'font-[Poppins]' : 'font-sans'
                                }`}>
                                    
                                    {/* Mobile Store Navbar */}
                                    <div className="bg-white/95 px-3 py-2 border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 backdrop-blur-xs">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                                                <span className="material-icons text-[12px]">storefront</span>
                                            </div>
                                            <span className="text-[11px] font-black text-slate-900 truncate max-w-[140px]">
                                                {profile.shop_name || profile.username || 'Barakah Store'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <span className="material-icons text-xs">search</span>
                                            <span className="material-icons text-xs">shopping_bag</span>
                                        </div>
                                    </div>

                                    {/* Scrollable Store Content */}
                                    <div className={`flex-1 overflow-y-auto no-scrollbar relative ${
                                        profile.shop_decoration === 'warm_gradient' ? 'bg-gradient-to-b from-amber-50/40 via-white to-slate-50' :
                                        profile.shop_decoration === 'islamic_geometric' ? 'bg-slate-50 bg-[radial-gradient(#10b981_0.7px,transparent_0.7px)] [background-size:14px_14px]' :
                                        profile.shop_decoration === 'soft_dots' ? 'bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px]' : 'bg-slate-50'
                                    }`}>
                                        
                                        {/* Store Banner / Cover */}
                                        <div className={`w-full relative overflow-hidden shrink-0 transition-all ${
                                            profile.shop_template === 'grand_hero' ? 'h-36' :
                                            profile.shop_template === 'compact_clean' ? 'h-20' :
                                            profile.shop_template === 'islamic_heritage' ? 'h-32' : 'h-28'
                                        } ${
                                            profile.shop_theme_color === 'blue' ? 'bg-gradient-to-r from-blue-900 via-sky-800 to-blue-950' :
                                            profile.shop_theme_color === 'teal' ? 'bg-gradient-to-r from-teal-900 via-cyan-800 to-emerald-950' :
                                            profile.shop_theme_color === 'amber' ? 'bg-gradient-to-r from-amber-900 via-yellow-800 to-stone-900' :
                                            profile.shop_theme_color === 'purple' ? 'bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-950' :
                                            profile.shop_theme_color === 'rose' ? 'bg-gradient-to-r from-rose-900 via-pink-800 to-red-950' :
                                            profile.shop_theme_color === 'dark' ? 'bg-gradient-to-r from-slate-950 via-gray-900 to-slate-900' :
                                            'bg-gradient-to-r from-emerald-800 via-teal-800 to-green-900'
                                        }`}>
                                            {profile.shop_thumbnail ? (
                                                <img
                                                    src={getMediaUrl(profile.shop_thumbnail)}
                                                    alt="Banner Toko"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 opacity-95">
                                                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]"></div>
                                                </div>
                                            )}
                                            
                                            {profile.shop_template === 'islamic_heritage' && (
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-900/90 border border-emerald-400/40 backdrop-blur-xs rounded-full text-[8px] font-black uppercase text-emerald-200 flex items-center gap-1 shadow-sm">
                                                    <span className="material-icons text-[10px] text-amber-400">verified</span>
                                                    <span>Toko Syariah Berkah</span>
                                                </div>
                                            )}

                                            {/* Quick Share pill on banner */}
                                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-xs rounded-full text-[9px] font-bold text-slate-700 shadow-xs flex items-center gap-1">
                                                <span className="material-icons text-[10px] text-emerald-700">share</span>
                                                <span>Bagikan</span>
                                            </div>
                                        </div>

                                        {/* Store Identity Card (Overlapping Banner) */}
                                        <div className="px-3 pb-3 bg-white border-b border-slate-200/80 shadow-2xs">
                                            <div className="flex items-end justify-between -mt-8 relative z-10 mb-2">
                                                {/* Store Avatar */}
                                                <div className="relative group shrink-0">
                                                    <div className="w-16 h-16 rounded-2xl border-2 border-white overflow-hidden bg-white shadow-md flex items-center justify-center">
                                                        {profile.picture ? (
                                                            <img
                                                                src={getMediaUrl(profile.picture)}
                                                                alt={profile.username}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-xl">
                                                                {(profile.shop_name || profile.name_full || profile.username || '?').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-600 text-white p-0.5 rounded-full shadow-xs border border-white">
                                                        <span className="material-icons text-[9px] block">verified</span>
                                                    </div>
                                                </div>

                                                {/* Official Seller Pill */}
                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                                                    <span className="material-icons text-[10px]">storefront</span>
                                                    Official Seller
                                                </span>
                                            </div>

                                            {/* Store Title & Handle Wrapped in White Stabilo Container */}
                                            <div className="bg-white/95 backdrop-blur-xs px-2.5 py-1.5 rounded-xl shadow-xs border border-slate-200/90 inline-block mb-1">
                                                <h3 className="text-sm font-black text-slate-900 leading-tight">
                                                    {profile.shop_name || profile.name_full || profile.username || 'Nama Toko Anda'}
                                                </h3>
                                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                                    @{profile.username || 'penjual'}
                                                </p>
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                                                <span><strong className="text-slate-800 font-bold">128</strong> Pengikut</span>
                                                <span className="text-slate-300">•</span>
                                                <span><strong className="text-slate-800 font-bold">12</strong> Mengikuti</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="flex items-center gap-0.5 text-slate-600 truncate">
                                                    <span className="material-icons text-[11px] text-rose-500">location_on</span>
                                                    {profile.address_city_name || 'Kota Asal'}
                                                </span>
                                            </div>

                                            {/* Store Operational & PO Badges */}
                                            {(profile.is_operational_hours_active || profile.is_preorder || profile.is_delivery_schedule_active) && (
                                                <div className="flex flex-wrap gap-1 mt-2.5">
                                                    {profile.is_operational_hours_active && profile.operational_hours && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-semibold">
                                                            <span className="material-icons text-[10px] text-emerald-600">schedule</span>
                                                            <span>Jam: <strong>{profile.operational_hours}</strong></span>
                                                        </span>
                                                    )}
                                                    {profile.is_preorder && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-semibold">
                                                            <span className="material-icons text-[10px] text-blue-600">hourglass_top</span>
                                                            <span>PO: <strong>{profile.preorder_duration || (profile.preorder_days ? `Hari ${profile.preorder_days}` : 'Aktif')}</strong></span>
                                                        </span>
                                                    )}
                                                    {profile.is_delivery_schedule_active && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-semibold">
                                                            <span className="material-icons text-[10px] text-amber-600">local_shipping</span>
                                                            <span>Kirim: <strong>{profile.delivery_days ? `Hari ${profile.delivery_days}` : (profile.delivery_range_min ? `${profile.delivery_range_min}-${profile.delivery_range_max} Hari` : (profile.delivery_note || 'Jadwal Rutin'))}</strong></span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Store Description Quote */}
                                            <p className="text-[10px] text-slate-600 italic mt-2 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                "{profile.shop_description || 'Selamat datang di toko resmi kami di Barakah Economy!'}"
                                            </p>

                                            {/* Store Action Buttons */}
                                            <div className="flex items-center gap-1.5 mt-2.5">
                                                <button type="button" className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-2xs">
                                                    <span className="material-icons text-xs">chat</span>
                                                    <span>Chat</span>
                                                </button>
                                                <button type="button" className="py-1.5 px-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1">
                                                    <span className="material-icons text-xs text-emerald-600">person_add</span>
                                                    <span>Ikuti</span>
                                                </button>
                                                <button type="button" className="py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-0.5 text-slate-700">
                                                    <span className="material-icons text-xs text-rose-500">favorite</span>
                                                    <span>36</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Store Navigation Tabs */}
                                        <div className="bg-white px-3 pt-2 border-b border-slate-200 flex items-center gap-3 text-[10px] font-bold text-slate-500 sticky top-[37px] z-10">
                                            <span className="pb-1.5 text-emerald-700 border-b-2 border-emerald-600">Semua Produk (4)</span>
                                            <span className="pb-1.5 hover:text-slate-800">Tentang Toko</span>
                                        </div>

                                        {/* Product Catalog Display (Grid vs Compact vs List) */}
                                        {profile.shop_layout === 'list' ? (
                                            /* List Layout Preview */
                                            <div className="p-2.5 flex flex-col gap-2">
                                                {[
                                                    { title: 'Madu Murni Asli Hutan Al-Barakah 500g', price: 'Rp 85.000', sold: '42 terjual', rating: '4.9', icon: 'eco', color: 'from-amber-100 to-orange-100', textIcon: 'text-amber-500' },
                                                    { title: 'Kopi Robusta Al-Barakah Premium 250g', price: 'Rp 45.000', sold: '18 terjual', rating: '4.8', icon: 'coffee', color: 'from-stone-100 to-amber-100', textIcon: 'text-amber-700' },
                                                    { title: 'Kurma Sukari Al-Qassim Super 1kg', price: 'Rp 75.000', sold: '95 terjual', rating: '5.0', icon: 'spa', color: 'from-yellow-50 to-amber-100', textIcon: 'text-amber-600' },
                                                    { title: 'Habbatussauda Oil Softgel 200 Kapsul', price: 'Rp 120.000', sold: '64 terjual', rating: '4.9', icon: 'medication', color: 'from-emerald-50 to-teal-100', textIcon: 'text-emerald-700' },
                                                ].map((p, idx) => (
                                                    <div key={idx} className="bg-white rounded-xl border border-slate-200/90 p-2 shadow-2xs flex items-center gap-2.5">
                                                        <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${p.color} shrink-0 flex items-center justify-center relative overflow-hidden`}>
                                                            <span className={`material-icons ${p.textIcon} text-2xl`}>{p.icon}</span>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-[10px] font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                                                            <p className="text-[11px] font-black text-emerald-700">{p.price}</p>
                                                            <div className="flex items-center gap-2 text-[8px] text-slate-400 mt-0.5">
                                                                <span className="text-amber-500 font-bold">★ {p.rating}</span>
                                                                <span>{p.sold}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : profile.shop_layout === 'compact' ? (
                                            /* Compact Grid Layout Preview */
                                            <div className="p-2 grid grid-cols-2 gap-1.5">
                                                {[
                                                    { title: 'Madu Murni Asli Hutan 500g', price: 'Rp 85.000', rating: '4.9', icon: 'eco', color: 'from-amber-100 to-orange-100', textIcon: 'text-amber-500' },
                                                    { title: 'Kopi Robusta Premium 250g', price: 'Rp 45.000', rating: '4.8', icon: 'coffee', color: 'from-stone-100 to-amber-100', textIcon: 'text-amber-700' },
                                                    { title: 'Kurma Sukari Super 1kg', price: 'Rp 75.000', rating: '5.0', icon: 'spa', color: 'from-yellow-50 to-amber-100', textIcon: 'text-amber-600' },
                                                    { title: 'Habbatussauda Oil 200 Kapsul', price: 'Rp 120.000', rating: '4.9', icon: 'medication', color: 'from-emerald-50 to-teal-100', textIcon: 'text-emerald-700' },
                                                ].map((p, idx) => (
                                                    <div key={idx} className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                                                        <div className={`aspect-4/3 bg-gradient-to-br ${p.color} relative overflow-hidden flex items-center justify-center`}>
                                                            <span className={`material-icons ${p.textIcon} text-2xl`}>{p.icon}</span>
                                                        </div>
                                                        <div className="p-1.5">
                                                            <h4 className="text-[9px] font-bold text-slate-800 line-clamp-1">{p.title}</h4>
                                                            <p className="text-[10px] font-black text-emerald-700">{p.price}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            /* Standard Marketplace Grid Preview */
                                            <div className="p-2.5 grid grid-cols-2 gap-2">
                                                {[
                                                    { title: 'Madu Murni Asli Hutan Al-Barakah 500g', price: 'Rp 85.000', sold: '42 terjual', rating: '4.9', icon: 'eco', color: 'from-amber-100 to-orange-100', textIcon: 'text-amber-500' },
                                                    { title: 'Kopi Robusta Al-Barakah Premium 250g', price: 'Rp 45.000', sold: '18 terjual', rating: '4.8', icon: 'coffee', color: 'from-stone-100 to-amber-100', textIcon: 'text-amber-700' },
                                                    { title: 'Kurma Sukari Al-Qassim Super 1kg', price: 'Rp 75.000', sold: '95 terjual', rating: '5.0', icon: 'spa', color: 'from-yellow-50 to-amber-100', textIcon: 'text-amber-600' },
                                                    { title: 'Habbatussauda Oil Softgel 200 Kapsul', price: 'Rp 120.000', sold: '64 terjual', rating: '4.9', icon: 'medication', color: 'from-emerald-50 to-teal-100', textIcon: 'text-emerald-700' },
                                                ].map((p, idx) => (
                                                    <div key={idx} className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                                                        <div className={`aspect-square bg-gradient-to-br ${p.color} relative overflow-hidden flex items-center justify-center`}>
                                                            <span className={`material-icons ${p.textIcon} text-3xl`}>{p.icon}</span>
                                                            <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[8px] font-bold px-1.5 py-0.2 rounded">Stok Ada</span>
                                                        </div>
                                                        <div className="p-2 flex-1 flex flex-col justify-between">
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-slate-800 line-clamp-2 leading-tight">{p.title}</h4>
                                                                <p className="text-[11px] font-black text-emerald-700 mt-1">{p.price}</p>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[8px] text-slate-400 mt-1 pt-1 border-t border-slate-100">
                                                                <span className="text-amber-500 font-bold">★ {p.rating}</span>
                                                                <span>{p.sold}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                    </div>

                                    {/* Bottom Phone Bar */}
                                    <div className="bg-white py-1.5 flex justify-center border-t border-slate-100 shrink-0">
                                        <div className="w-20 h-1 bg-slate-300 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>
            </div>

            <NavigationButton />
            {cropper.active && (
                <ImageCropperModal
                    image={cropper.image}
                    aspect={16 / 9}
                    maxWidth={1280}
                    maxHeight={720}
                    onCropComplete={(croppedBlob) => {
                        const file = new File([croppedBlob], 'shop_thumbnail.jpg', { type: 'image/jpeg' });
                        setProfile(prev => ({ ...prev, shop_thumbnail: file }));
                        setCropper({ active: false, image: null });
                    }}
                    onCancel={() => setCropper({ active: false, image: null })}
                    title="Potong Thumbnail Toko"
                />
            )}
        </div>
    );
};

export default DashboardShopSettingsPage;
