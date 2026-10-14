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

    const loadData = async () => {
        setLoading(true);
        try {
            const [pagesRes, quotaRes] = await Promise.all([
                getMyLandingPages(),
                getLandingPageQuota()
            ]);
            const rawPages = pagesRes.data;
            const pagesList = Array.isArray(rawPages) ? rawPages : (rawPages?.results || []);
            setPages(pagesList);
            setQuota(quotaRes.data || null);
        } catch (err) {
            console.error("Error loading landing pages/quota:", err);
            setPages([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenCreate = () => {
        if (quota && !quota.can_create_more) {
            alert(`Kuota Landing Page gratis Anda sudah terpakai (${quota.used_count}/${quota.total_allowed}). Silakan beli slot LP tambahan.`);
            setShowSlotModal(true);
            return;
        }
        navigate('/dashboard/landing-pages/builder');
    };

    const handleOpenEdit = (lp) => {
        navigate(`/dashboard/landing-pages/builder/${lp.slug}`);
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
                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
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
                        <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-emerald-950 block">Total Tagihan:</span>
                                    <span className="text-[11px] text-emerald-700">Durasi +{renewalMonths * 30} Hari</span>
                                </div>
                                <span className="text-lg font-black text-emerald-700">
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
                                    className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
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
