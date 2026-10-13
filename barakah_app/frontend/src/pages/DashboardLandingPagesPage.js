import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import DynaQRISModal from '../components/common/DynaQRISModal';
import {
    getMyLandingPages,
    getLandingPageQuota,
    createLandingPage,
    updateLandingPage,
    deleteLandingPage,
    createLandingPageSlotOrder,
    createLandingPageRenewalOrder,
    togglePublishLandingPage
} from '../services/landingPageApi';
import { generateDynaQRIS } from '../services/paymentApi';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

const formatIDR = (val) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val || 0);
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'Masa Aktif Selamanya';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const THEMES = [
    { key: 'emerald', label: 'Emerald Islamic (Hijau Berkah & Amber)' },
    { key: 'modern_dark', label: 'Dark Luxury (Elegan Gelap & Indigo)' },
    { key: 'clean_white', label: 'Clean Minimalist (Putih Bersih & Hitam)' },
    { key: 'sunset_amber', label: 'Sunset Amber (Hangat & Oranye)' },
    { key: 'ocean_blue', label: 'Ocean Blue (Biru Laut & Segar)' },
    { key: 'luxury_gold', label: 'Royal Gold (Emas Mewah & Hitam)' },
    { key: 'rose_elegance', label: 'Rose Elegance (Merah Muda & Romantis)' },
];

const LAYOUTS = [
    { key: 'standard', label: 'Standard Sales Page (Rinci & Lengkap)' },
    { key: 'centered_hero', label: 'Centered Hero (Fokus Headline & Tombol)' },
    { key: 'biolink_style', label: 'Biolink Fast Action (Ringkas & Cepat)' },
    { key: 'split_banner', label: 'Split Banner Showcase' },
    { key: 'grid_showcase', label: 'Grid Product Showcase' },
];

const FONTS = [
    { key: 'poppins', label: 'Poppins (Bersih & Modern)' },
    { key: 'plus-jakarta', label: 'Plus Jakarta Sans (Resmi & Elegan)' },
    { key: 'inter', label: 'Inter (Standar Internasional)' },
    { key: 'outfit', label: 'Outfit (Trendy & Ramah)' },
    { key: 'serif', label: 'Serif (Klasik & Premium)' },
    { key: 'mono', label: 'Monospace (Unik & Modern)' },
];

const DashboardLandingPagesPage = () => {
    const navigate = useNavigate();
    const [pages, setPages] = useState([]);
    const [quota, setQuota] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showBuilderModal, setShowBuilderModal] = useState(false);
    const [editingPage, setEditingPage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Slot Purchase Modal State
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [slotQty, setSlotQty] = useState(1);
    const [buyingSlot, setBuyingSlot] = useState(false);

    // Renewal (Langganan) Modal State
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [renewingPage, setRenewingPage] = useState(null);
    const [renewalMonths, setRenewalMonths] = useState(1);
    const [renewing, setRenewing] = useState(false);

    // DynaQRIS State
    const [qrisData, setQrisData] = useState(null);
    const [showDynaQRIS, setShowDynaQRIS] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [activeOrderType, setActiveOrderType] = useState('slot');

    // Active Builder Tab
    const [activeTab, setActiveTab] = useState('basic');

    // Builder Form State
    const [formData, setFormData] = useState({
        title: '',
        tagline: '',
        description: '',
        hero_headline: '',
        hero_subheadline: '',
        price: '',
        slash_price: '',
        badge_text: 'PROMO TERBATAS',
        cta_text: 'Beli Sekarang',
        cta_subtext: 'Garansi 100% Kepuasan',
        cta_type: 'whatsapp',
        cta_link: '',
        whatsapp_number: '',
        whatsapp_message: '',
        secondary_cta_text: '',
        secondary_cta_link: '',
        theme: 'emerald',
        layout: 'standard',
        font_family: 'poppins',
        primary_color: '#10b981',
        background_color: '#f8fafc',
        text_color: '#0f172a',
        button_color: '#10b981',
        is_active: true,
        is_published: true,
        features: [],
        testimonials: [],
        faq_items: [],
        paragraphs: []
    });

    const [logoFile, setLogoFile] = useState(null);
    const [heroFile, setHeroFile] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pagesRes, quotaRes] = await Promise.all([
                getMyLandingPages(),
                getLandingPageQuota()
            ]);
            setPages(pagesRes.data || []);
            setQuota(quotaRes.data || null);
        } catch (err) {
            console.error("Error loading landing pages/quota:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const resetForm = () => {
        setFormData({
            title: '',
            tagline: '',
            description: '',
            hero_headline: '',
            hero_subheadline: '',
            price: '',
            slash_price: '',
            badge_text: 'PROMO TERBATAS',
            cta_text: 'Beli Sekarang',
            cta_subtext: 'Garansi 100% Kepuasan',
            cta_type: 'whatsapp',
            cta_link: '',
            whatsapp_number: '',
            whatsapp_message: '',
            secondary_cta_text: '',
            secondary_cta_link: '',
            theme: 'emerald',
            layout: 'standard',
            font_family: 'poppins',
            primary_color: '#10b981',
            background_color: '#f8fafc',
            text_color: '#0f172a',
            button_color: '#10b981',
            is_active: true,
            is_published: true,
            features: [
                { title: 'Produk Berkualitas', description: 'Diproduksi dengan bahan dan standar terbaik.', icon: 'star' },
                { title: 'Pengiriman Cepat', description: 'Pesanan segera diproses setelah pembayaran.', icon: 'local_shipping' }
            ],
            testimonials: [
                { name: 'Ahmad Fauzi', review: 'Pelayanannya sangat ramah dan kualitas barang sesuai deskripsi!', rating: 5 }
            ],
            faq_items: [
                { question: 'Bagaimana cara pemesanannya?', answer: 'Klik tombol Beli Sekarang untuk langsung terhubung ke WhatsApp kami.' }
            ],
            paragraphs: []
        });
        setLogoFile(null);
        setHeroFile(null);
        setEditingPage(null);
        setActiveTab('basic');
    };

    const handleOpenCreate = () => {
        if (quota && !quota.can_create_more) {
            alert(`Kuota Landing Page gratis Anda sudah terpakai (${quota.used_count}/${quota.total_allowed}). Silakan beli slot LP tambahan.`);
            setShowSlotModal(true);
            return;
        }
        resetForm();
        setShowBuilderModal(true);
    };

    const handleOpenEdit = (lp) => {
        setEditingPage(lp);
        setFormData({
            title: lp.title || '',
            tagline: lp.tagline || '',
            description: lp.description || '',
            hero_headline: lp.hero_headline || '',
            hero_subheadline: lp.hero_subheadline || '',
            price: lp.price || '',
            slash_price: lp.slash_price || '',
            badge_text: lp.badge_text || '',
            cta_text: lp.cta_text || 'Beli Sekarang',
            cta_subtext: lp.cta_subtext || '',
            cta_type: lp.cta_type || 'whatsapp',
            cta_link: lp.cta_link || '',
            whatsapp_number: lp.whatsapp_number || '',
            whatsapp_message: lp.whatsapp_message || '',
            secondary_cta_text: lp.secondary_cta_text || '',
            secondary_cta_link: lp.secondary_cta_link || '',
            theme: lp.theme || 'emerald',
            layout: lp.layout || 'standard',
            font_family: lp.font_family || 'poppins',
            primary_color: lp.primary_color || '#10b981',
            background_color: lp.background_color || '#f8fafc',
            text_color: lp.text_color || '#0f172a',
            button_color: lp.button_color || '#10b981',
            is_active: lp.is_active !== undefined ? lp.is_active : true,
            is_published: lp.is_published !== undefined ? lp.is_published : true,
            features: Array.isArray(lp.features) ? lp.features : [],
            testimonials: Array.isArray(lp.testimonials) ? lp.testimonials : [],
            faq_items: Array.isArray(lp.faq_items) ? lp.faq_items : [],
            paragraphs: Array.isArray(lp.paragraphs) ? lp.paragraphs : []
        });
        setLogoFile(null);
        setHeroFile(null);
        setActiveTab('basic');
        setShowBuilderModal(true);
    };

    const handleSavePage = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert('Judul atau Nama Landing Page wajib diisi.');
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach((key) => {
                if (['features', 'testimonials', 'faq_items', 'paragraphs'].includes(key)) {
                    data.append(key, JSON.stringify(formData[key]));
                } else if (formData[key] !== null && formData[key] !== undefined) {
                    data.append(key, formData[key]);
                }
            });

            if (logoFile) data.append('logo', logoFile);
            if (heroFile) data.append('hero_image', heroFile);

            if (editingPage) {
                await updateLandingPage(editingPage.slug, data);
                alert('Landing Page berhasil diperbarui!');
            } else {
                await createLandingPage(data);
                alert('Landing Page baru berhasil dibuat!');
            }

            setShowBuilderModal(false);
            loadData();
        } catch (err) {
            console.error("Error saving landing page:", err);
            const msg = err.response?.data?.detail || err.response?.data?.title?.[0] || 'Gagal menyimpan Landing Page.';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (slug) => {
        if (!window.confirm('Yakin ingin menghapus Landing Page ini? Tindakan ini tidak dapat dibatalkan.')) return;
        try {
            await deleteLandingPage(slug);
            alert('Landing Page berhasil dihapus.');
            loadData();
        } catch (err) {
            console.error("Error deleting LP:", err);
            alert('Gagal menghapus Landing Page.');
        }
    };

    const handleTogglePublish = async (lp) => {
        try {
            const res = await togglePublishLandingPage(lp.slug);
            const statusText = res.data.is_published
                ? 'dipublikasikan (masa aktif 1 bulan mulai berjalan)'
                : 'diubah menjadi Draf (masa aktif dihentikan)';
            alert(`Landing page berhasil ${statusText}.`);
            loadData();
        } catch (err) {
            console.error("Error toggling publish:", err);
            alert('Gagal mengubah status publikasi.');
        }
    };

    // --- PURCHASE EXTRA SLOTS ---
    const handleBuySlot = async () => {
        if (slotQty < 1) return;
        setBuyingSlot(true);
        try {
            const orderRes = await createLandingPageSlotOrder(slotQty, 'dynaqris');
            const createdOrder = orderRes.data;
            setActiveOrderId(createdOrder.order_number);
            setActiveOrderType('slot');

            // Generate DynaQRIS
            const qrisRes = await generateDynaQRIS({
                amount: createdOrder.amount,
                reference_id: createdOrder.order_number,
                type: 'landing_page',
                add_unique_code: false
            });

            setQrisData(qrisRes);
            setShowSlotModal(false);
            setShowDynaQRIS(true);
        } catch (err) {
            console.error("Error creating slot order:", err);
            alert('Gagal membuat pesanan slot Landing Page.');
        } finally {
            setBuyingSlot(false);
        }
    };

    // --- RENEW / EXTEND EXPIRY ---
    const handleOpenRenewal = (lp) => {
        setRenewingPage(lp);
        setRenewalMonths(1);
        setShowRenewalModal(true);
    };

    const handleBuyRenewal = async () => {
        if (!renewingPage) return;
        setRenewing(true);
        try {
            const orderRes = await createLandingPageRenewalOrder(renewingPage.id, renewalMonths, 'dynaqris');
            const createdOrder = orderRes.data;
            setActiveOrderId(createdOrder.order_number);
            setActiveOrderType('renewal');

            const qrisRes = await generateDynaQRIS({
                amount: createdOrder.amount,
                reference_id: createdOrder.order_number,
                type: 'landing_page',
                add_unique_code: false
            });

            setQrisData(qrisRes);
            setShowRenewalModal(false);
            setShowDynaQRIS(true);
        } catch (err) {
            console.error("Error creating renewal order:", err);
            alert('Gagal membuat pesanan perpanjangan landing page.');
        } finally {
            setRenewing(false);
        }
    };

    const handleDynaSuccess = () => {
        setShowDynaQRIS(false);
        if (activeOrderType === 'renewal') {
            alert('Alhamdulillah! Pembayaran perpanjangan masa aktif Landing Page berhasil diverifikasi. Masa aktif landing page Anda telah bertambah.');
        } else {
            alert('Alhamdulillah! Pembayaran slot Landing Page berhasil diverifikasi. Kuota Anda telah bertambah.');
        }
        loadData();
    };

    return (
        <div className="body min-h-screen bg-slate-50">
            <Helmet>
                <title>Landing Page Builder - Barakah Economy</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
                {/* Header Title & CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                                <span className="material-icons text-2xl">web</span>
                            </span>
                            <h1 className="text-2xl font-black text-slate-800">Landing Page Builder</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Buat landing page promosi instan untuk produk atau tokomu. Default 1 LP gratis selama 1 bulan saat dipublish.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowSlotModal(true)}
                            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                        >
                            <span className="material-icons text-sm text-amber-600">add_shopping_cart</span>
                            <span>Beli Slot Tambahan</span>
                        </button>
                        <button
                            onClick={handleOpenCreate}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 active:scale-95"
                        >
                            <span className="material-icons text-sm">add</span>
                            <span>Buat Landing Page</span>
                        </button>
                    </div>
                </div>

                {/* QUOTA STATUS CARD */}
                {quota && (
                    <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white mb-8 shadow-xl relative overflow-hidden">
                        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
                            <span className="material-icons text-9xl">auto_fix_high</span>
                        </div>
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 block mb-1">
                                    Status Kuota & Masa Aktif
                                </span>
                                <h3 className="text-xl font-black">
                                    {quota.used_count} dari {quota.total_allowed} Halaman Digunakan
                                </h3>
                                <p className="text-xs text-emerald-100/90 mt-1">
                                    1 Landing Page Gratis bawaan (aktif saat dipublish) + {quota.extra_slots} slot tambahan berbayar.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center sm:text-right shrink-0">
                                    <span className="text-[10px] block text-emerald-200">Tarif Tambah Slot:</span>
                                    <span className="text-base font-black text-amber-300">
                                        {formatIDR(quota.price_per_slot)} <span className="text-[10px] font-normal text-white">/ slot</span>
                                    </span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center sm:text-right shrink-0">
                                    <span className="text-[10px] block text-emerald-200">Tarif Langganan / Perpanjang:</span>
                                    <span className="text-base font-black text-emerald-300">
                                        {formatIDR(quota.subscription_price_monthly || 25000)} <span className="text-[10px] font-normal text-white">/ bulan</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* LANDING PAGES LIST */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-3" />
                        <p className="text-xs text-slate-500 font-medium">Memuat data landing page Anda...</p>
                    </div>
                ) : pages.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm max-w-lg mx-auto">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-3xl">post_add</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Belum Ada Landing Page</h3>
                        <p className="text-xs text-slate-500 mt-1 mb-6">
                            Anda memiliki 1 kuota Landing Page gratis. Buat halaman penjualan pertamamu sekarang!
                        </p>
                        <button
                            onClick={handleOpenCreate}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                        >
                            Mulai Desain Landing Page
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pages.map((lp) => (
                            <div
                                key={lp.id}
                                className={`bg-white rounded-3xl overflow-hidden border transition flex flex-col justify-between ${
                                    lp.is_expired ? 'border-rose-200 shadow-rose-100/50' : 'border-slate-200/80 shadow-xs hover:shadow-lg'
                                }`}
                            >
                                <div>
                                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                                        <img
                                            src={getMediaUrl(lp.hero_image || lp.logo) || '/placeholder-image.jpg'}
                                            alt={lp.title}
                                            className="w-full h-full object-cover"
                                        />
                                        
                                        {/* Status Badges Overlay */}
                                        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 max-w-[85%]">
                                            {lp.is_published ? (
                                                lp.is_expired ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow flex items-center gap-1">
                                                        <span className="material-icons text-[11px]">hourglass_disabled</span> Expired
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow">
                                                        Online
                                                    </span>
                                                )
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow">
                                                    Draf (Belum Terhitung)
                                                </span>
                                            )}

                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                                                {lp.theme_display || lp.theme}
                                            </span>
                                        </div>

                                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                                            <span className="material-icons text-[12px]">visibility</span>
                                            {lp.views_count} views
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <h3 className="font-bold text-base text-slate-900 line-clamp-1">{lp.title}</h3>
                                            <button
                                                onClick={() => handleTogglePublish(lp)}
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition shrink-0 ${
                                                    lp.is_published
                                                        ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                                                }`}
                                            >
                                                {lp.is_published ? 'Jadikan Draf' : 'Publish Sekarang'}
                                            </button>
                                        </div>

                                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                                            {lp.tagline || lp.description || 'Tidak ada deskripsi singkat.'}
                                        </p>

                                        {/* Masa Aktif Info Card */}
                                        <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-400 font-medium">Masa Aktif:</span>
                                                <span className="font-bold text-slate-700">
                                                    {!lp.is_published
                                                        ? 'Belum berjalan (Draf)'
                                                        : formatDate(lp.expires_at)}
                                                </span>
                                            </div>
                                            {lp.is_published && (
                                                <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-200/60">
                                                    <span className="text-slate-400">Status:</span>
                                                    {lp.is_expired ? (
                                                        <span className="font-black text-rose-600 flex items-center gap-0.5">
                                                            <span className="material-icons text-xs">error</span> Masa Habis
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-emerald-700">
                                                            {lp.days_remaining != null ? `Sisa ${lp.days_remaining} hari` : 'Aktif Selamanya'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-semibold">Harga Jual</span>
                                                <span className="text-sm font-black text-emerald-600">
                                                    {formatIDR(lp.price)}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-400 block font-semibold">CTA Button</span>
                                                <span className="text-xs font-bold text-slate-700">
                                                    {lp.cta_text}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-3 p-2 bg-slate-50 rounded-xl flex items-center justify-between text-[11px] text-slate-600 border border-slate-100">
                                            <span className="font-mono truncate max-w-[180px]">/lp/{lp.slug}</span>
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/lp/${lp.slug}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert('Link berhasil disalin ke clipboard: ' + url);
                                                }}
                                                className="text-emerald-700 font-bold hover:underline shrink-0"
                                            >
                                                Salin Link
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <Link
                                            to={`/lp/${lp.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                                        >
                                            <span className="material-icons text-sm">open_in_new</span>
                                            <span>Buka</span>
                                        </Link>
                                        <button
                                            onClick={() => handleOpenRenewal(lp)}
                                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                                            title="Perpanjang Masa Aktif Landing Page"
                                        >
                                            <span className="material-icons text-sm">update</span>
                                            <span>Perpanjang</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleOpenEdit(lp)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                                        >
                                            <span className="material-icons text-sm">edit</span>
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(lp.slug)}
                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                            title="Hapus Landing Page"
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

            {/* MODAL BUILDER / EDITOR */}
            {showBuilderModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-6">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-base text-slate-800">
                                    {editingPage ? `Edit Landing Page: ${editingPage.title}` : 'Buat Landing Page Baru'}
                                </h3>
                                <p className="text-xs text-slate-500">Atur semua elemen banner, CTA, harga, warna, dan konten.</p>
                            </div>
                            <button
                                onClick={() => setShowBuilderModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        {/* Navigation Tabs inside Builder */}
                        <div className="flex border-b border-slate-100 bg-white px-5 overflow-x-auto gap-4 text-xs font-bold text-slate-500">
                            {[
                                { id: 'basic', label: '1. Info & Branding', icon: 'badge' },
                                { id: 'pricing_cta', label: '2. Harga & Tombol CTA', icon: 'payments' },
                                { id: 'styling', label: '3. Tema, Font & Warna', icon: 'palette' },
                                { id: 'content', label: '4. Modul Konten & FAQ', icon: 'view_agenda' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${activeTab === tab.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent hover:text-slate-700'}`}
                                >
                                    <span className="material-icons text-sm">{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Form Content */}
                        <form onSubmit={handleSavePage} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* TAB 1: BASIC & BRANDING */}
                            {activeTab === 'basic' && (
                                <div className="space-y-4">
                                    {/* Publication status switch */}
                                    <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-emerald-950 block">Status Publikasi Landing Page</span>
                                            <span className="text-[11px] text-emerald-700">
                                                {formData.is_published
                                                    ? '✅ Langsung Terbit (Masa aktif 1 bulan mulai terhitung saat disimpan)'
                                                    : '📝 Simpan sebagai Draf (Belum online, masa aktif belum dihitung)'}
                                            </span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_published}
                                                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Toko / Judul Landing Page *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="Contoh: Madu Murni Barakah"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Tagline Singkat</label>
                                            <input
                                                type="text"
                                                value={formData.tagline}
                                                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                                placeholder="Contoh: 100% Asli dari Hutan Tropis Nusantara"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Utama / Narasi Singkat</label>
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Jelaskan penawaran terbaik produk atau layanan Anda..."
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Upload Logo Toko / Brand</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setLogoFile(e.target.files[0])}
                                                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                            />
                                            {editingPage?.logo && !logoFile && (
                                                <img src={getMediaUrl(editingPage.logo)} alt="Logo" className="w-12 h-12 object-cover rounded-xl mt-2 border" />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Upload Hero Banner / Foto Produk Utama</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setHeroFile(e.target.files[0])}
                                                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                            />
                                            {editingPage?.hero_image && !heroFile && (
                                                <img src={getMediaUrl(editingPage.hero_image)} alt="Banner" className="w-20 h-12 object-cover rounded-xl mt-2 border" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Headline Utama di Hero Banner</label>
                                            <input
                                                type="text"
                                                value={formData.hero_headline}
                                                onChange={(e) => setFormData({ ...formData, hero_headline: e.target.value })}
                                                placeholder="Contoh: Solusi Sehat Alami Setiap Hari"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Subheadline di Hero Banner</label>
                                            <input
                                                type="text"
                                                value={formData.hero_subheadline}
                                                onChange={(e) => setFormData({ ...formData, hero_subheadline: e.target.value })}
                                                placeholder="Contoh: Terbukti berkhasiat & bergaransi 100%."
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: PRICING & CALL TO ACTION */}
                            {activeTab === 'pricing_cta' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Nominal Harga Jual (Rp)</label>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                placeholder="150000"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Harga Coret (Sebelum Diskon Rp)</label>
                                            <input
                                                type="number"
                                                value={formData.slash_price}
                                                onChange={(e) => setFormData({ ...formData, slash_price: e.target.value })}
                                                placeholder="250000"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Badge Promo</label>
                                            <input
                                                type="text"
                                                value={formData.badge_text}
                                                onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                                                placeholder="DISKON 50%"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Target Tombol CTA</label>
                                        <select
                                            value={formData.cta_type}
                                            onChange={(e) => setFormData({ ...formData, cta_type: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                                        >
                                            <option value="whatsapp">Hubungkan Langsung ke WhatsApp (wa.me)</option>
                                            <option value="direct_link">Direct Link Eksternal (URL Khusus)</option>
                                        </select>
                                    </div>

                                    {formData.cta_type === 'whatsapp' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                            <div>
                                                <label className="block text-xs font-bold text-emerald-900 mb-1">Nomor WhatsApp *</label>
                                                <input
                                                    type="text"
                                                    value={formData.whatsapp_number}
                                                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                                    placeholder="08123456789 atau 628123456789"
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-emerald-900 mb-1">Pesan Pembuka Otomatis</label>
                                                <input
                                                    type="text"
                                                    value={formData.whatsapp_message}
                                                    onChange={(e) => setFormData({ ...formData, whatsapp_message: e.target.value })}
                                                    placeholder="Halo, saya ingin pesan produk ini..."
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Tautan Direct Link (URL)</label>
                                            <input
                                                type="url"
                                                value={formData.cta_link}
                                                onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                                                placeholder="https://tokoanda.com/checkout"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Teks Tombol CTA Utama</label>
                                            <input
                                                type="text"
                                                value={formData.cta_text}
                                                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                                placeholder="Contoh: Pesan Sekarang"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Subteks di Bawah Tombol CTA</label>
                                            <input
                                                type="text"
                                                value={formData.cta_subtext}
                                                onChange={(e) => setFormData({ ...formData, cta_subtext: e.target.value })}
                                                placeholder="Garansi 100% Uang Kembali"
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: STYLING & DESIGN */}
                            {activeTab === 'styling' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Tema</label>
                                            <select
                                                value={formData.theme}
                                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                                            >
                                                {THEMES.map((th) => (
                                                    <option key={th.key} value={th.key}>{th.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Gaya Tata Letak (Layout)</label>
                                            <select
                                                value={formData.layout}
                                                onChange={(e) => setFormData({ ...formData, layout: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                                            >
                                                {LAYOUTS.map((lo) => (
                                                    <option key={lo.key} value={lo.key}>{lo.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Pilihan Font</label>
                                            <select
                                                value={formData.font_family}
                                                onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                                            >
                                                {FONTS.map((f) => (
                                                    <option key={f.key} value={f.key}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Warna Container</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={formData.background_color}
                                                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                                                    className="w-9 h-9 rounded-lg cursor-pointer border"
                                                />
                                                <span className="text-xs font-mono">{formData.background_color}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Warna Teks</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={formData.text_color}
                                                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                                                    className="w-9 h-9 rounded-lg cursor-pointer border"
                                                />
                                                <span className="text-xs font-mono">{formData.text_color}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Warna Tombol CTA</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={formData.button_color}
                                                    onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                                                    className="w-9 h-9 rounded-lg cursor-pointer border"
                                                />
                                                <span className="text-xs font-mono">{formData.button_color}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Warna Aksen</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={formData.primary_color}
                                                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                                    className="w-9 h-9 rounded-lg cursor-pointer border"
                                                />
                                                <span className="text-xs font-mono">{formData.primary_color}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: CONTENT & FAQS */}
                            {activeTab === 'content' && (
                                <div className="space-y-6">
                                    {/* Features section */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-800">Keunggulan & Manfaat ({formData.features.length})</label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    features: [...formData.features, { title: 'Keunggulan Baru', description: 'Deskripsi manfaat', icon: 'check_circle' }]
                                                })}
                                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100"
                                            >
                                                + Tambah Keunggulan
                                            </button>
                                        </div>
                                        {formData.features.map((feat, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-xl mb-2 flex items-center gap-2 border">
                                                <input
                                                    type="text"
                                                    value={feat.title}
                                                    onChange={(e) => {
                                                        const copy = [...formData.features];
                                                        copy[idx].title = e.target.value;
                                                        setFormData({ ...formData, features: copy });
                                                    }}
                                                    placeholder="Judul"
                                                    className="w-1/3 px-3 py-1.5 rounded-lg border text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    value={feat.description}
                                                    onChange={(e) => {
                                                        const copy = [...formData.features];
                                                        copy[idx].description = e.target.value;
                                                        setFormData({ ...formData, features: copy });
                                                    }}
                                                    placeholder="Deskripsi singkat"
                                                    className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const copy = formData.features.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, features: copy });
                                                    }}
                                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                                >
                                                    <span className="material-icons text-sm">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Testimonials */}
                                    <div className="pt-3 border-t">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-800">Testimoni Pelanggan ({formData.testimonials.length})</label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    testimonials: [...formData.testimonials, { name: 'Nama Pembeli', review: 'Komentar pembeli yang puas', rating: 5 }]
                                                })}
                                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100"
                                            >
                                                + Tambah Testimoni
                                            </button>
                                        </div>
                                        {formData.testimonials.map((testi, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-xl mb-2 flex items-center gap-2 border">
                                                <input
                                                    type="text"
                                                    value={testi.name}
                                                    onChange={(e) => {
                                                        const copy = [...formData.testimonials];
                                                        copy[idx].name = e.target.value;
                                                        setFormData({ ...formData, testimonials: copy });
                                                    }}
                                                    placeholder="Nama pembeli"
                                                    className="w-1/4 px-3 py-1.5 rounded-lg border text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    value={testi.review}
                                                    onChange={(e) => {
                                                        const copy = [...formData.testimonials];
                                                        copy[idx].review = e.target.value;
                                                        setFormData({ ...formData, testimonials: copy });
                                                    }}
                                                    placeholder="Ulasan"
                                                    className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const copy = formData.testimonials.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, testimonials: copy });
                                                    }}
                                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                                >
                                                    <span className="material-icons text-sm">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* FAQs */}
                                    <div className="pt-3 border-t">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-800">Tanya Jawab (FAQ) ({formData.faq_items.length})</label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    faq_items: [...formData.faq_items, { question: 'Pertanyaan umum?', answer: 'Jawaban penjelasan.' }]
                                                })}
                                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100"
                                            >
                                                + Tambah FAQ
                                            </button>
                                        </div>
                                        {formData.faq_items.map((faq, idx) => (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-xl mb-2 border space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={faq.question}
                                                        onChange={(e) => {
                                                            const copy = [...formData.faq_items];
                                                            copy[idx].question = e.target.value;
                                                            setFormData({ ...formData, faq_items: copy });
                                                        }}
                                                        placeholder="Pertanyaan"
                                                        className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-bold"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const copy = formData.faq_items.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, faq_items: copy });
                                                        }}
                                                        className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                                    >
                                                        <span className="material-icons text-sm">close</span>
                                                    </button>
                                                </div>
                                                <textarea
                                                    rows={2}
                                                    value={faq.answer}
                                                    onChange={(e) => {
                                                        const copy = [...formData.faq_items];
                                                        copy[idx].answer = e.target.value;
                                                        setFormData({ ...formData, faq_items: copy });
                                                    }}
                                                    placeholder="Jawaban"
                                                    className="w-full px-3 py-1.5 rounded-lg border text-xs"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBuilderModal(false)}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                                >
                                    {submitting ? 'Menyimpan...' : (formData.is_published ? 'Simpan & Publikasikan' : 'Simpan Draf')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL BUY EXTRA SLOT */}
            {showSlotModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
                        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-3xl">add_shopping_cart</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 text-center">Beli Slot Landing Page Tambahan</h3>
                        <p className="text-xs text-slate-500 text-center mt-1 mb-6">
                            Buat lebih banyak landing page untuk berbagai produk dan campaign Anda.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center text-xs mb-2">
                                    <span className="text-slate-500">Harga per Slot:</span>
                                    <span className="font-bold text-slate-800">{formatIDR(quota?.price_per_slot || 50000)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                                    <span className="font-bold text-slate-700">Jumlah Slot Tambahan:</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSlotQty(Math.max(1, slotQty - 1))}
                                            className="w-7 h-7 bg-white rounded-lg border text-sm font-bold flex items-center justify-center"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center font-black text-sm">{slotQty}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSlotQty(slotQty + 1)}
                                            className="w-7 h-7 bg-white rounded-lg border text-sm font-bold flex items-center justify-center"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-900">Total Pembayaran:</span>
                                <span className="text-lg font-black text-emerald-700">
                                    {formatIDR((quota?.price_per_slot || 50000) * slotQty)}
                                </span>
                            </div>

                            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                                Pembayaran otomatis terverifikasi via QRIS / Notifikasi Transfer Bank Barakah. Kuota langsung bertambah setelah lunas.
                            </p>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={() => setShowSlotModal(false)}
                                    className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleBuySlot}
                                    disabled={buyingSlot}
                                    className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                                >
                                    {buyingSlot ? 'Memproses...' : 'Bayar Sekarang'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PERPANJANG MASA AKTIF (RENEWAL / LANGGANAN) */}
            {showRenewalModal && renewingPage && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
                        <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-3xl">update</span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 text-center">Perpanjang Masa Aktif Landing Page</h3>
                        <p className="text-xs text-slate-500 text-center mt-1 mb-6">
                            Perpanjang durasi aktif online halaman <strong>"{renewingPage.title}"</strong>.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Tarif Langganan / Bulan:</span>
                                    <span className="font-bold text-slate-800">
                                        {formatIDR(quota?.subscription_price_monthly || 25000)}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Durasi Perpanjangan:</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { m: 1, label: '1 Bln' },
                                            { m: 3, label: '3 Bln' },
                                            { m: 6, label: '6 Bln' },
                                            { m: 12, label: '1 Thn' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.m}
                                                type="button"
                                                onClick={() => setRenewalMonths(opt.m)}
                                                className={`py-2 rounded-xl text-xs font-bold border transition ${
                                                    renewalMonths === opt.m
                                                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-purple-950 block">Total Tagihan:</span>
                                    <span className="text-[11px] text-purple-700">Durasi +{renewalMonths * 30} Hari</span>
                                </div>
                                <span className="text-lg font-black text-purple-700">
                                    {formatIDR((quota?.subscription_price_monthly || 25000) * renewalMonths)}
                                </span>
                            </div>

                            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                                Pembayaran diverifikasi otomatis oleh <strong>Barakah Listener</strong>. Masa aktif akan otomatis diperpanjang setelah pembayaran masuk.
                            </p>

                            <div className="flex items-center gap-2 pt-2">
                                <button
                                    onClick={() => setShowRenewalModal(false)}
                                    className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleBuyRenewal}
                                    disabled={renewing}
                                    className="w-1/2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                                >
                                    {renewing ? 'Memproses...' : 'Bayar QRIS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DYNAQRIS MODAL POPUP */}
            {showDynaQRIS && qrisData && (
                <DynaQRISModal
                    isOpen={showDynaQRIS}
                    onClose={() => setShowDynaQRIS(false)}
                    qrisData={qrisData}
                    onSuccess={handleDynaSuccess}
                    referenceId={activeOrderId}
                    transactionType="landing_page"
                />
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardLandingPagesPage;
