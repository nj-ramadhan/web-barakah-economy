import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import {
    getLandingPageAdminSettings,
    updateLandingPageAdminSettings,
    getLandingPageAdminAll,
    updateLandingPageAdminItem
} from '../../services/landingPageApi';
import '../../styles/Body.css';

const formatIDR = (val) => {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(val || 0);
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'Masa Aktif Selamanya';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const DashboardAdminLandingPageSettingsPage = () => {
    const [settings, setSettings] = useState({
        price_per_slot: 50000,
        free_quota: 1,
        free_duration_type: '1_month',
        default_free_days: 30,
        subscription_price_monthly: 25000,
        is_active: true,
        instructions: ''
    });
    const [allPages, setAllPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal Edit Masa Aktif LP
    const [selectedLP, setSelectedLP] = useState(null);
    const [showEditExpiryModal, setShowEditExpiryModal] = useState(false);
    const [expiryForm, setExpiryForm] = useState({
        expires_at: '',
        is_published: true,
        is_active: true,
        forever: false
    });
    const [updatingExpiry, setUpdatingExpiry] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [setRes, pagesRes] = await Promise.all([
                getLandingPageAdminSettings(),
                getLandingPageAdminAll()
            ]);
            if (setRes.data) setSettings(setRes.data);
            if (pagesRes.data) setAllPages(pagesRes.data);
        } catch (err) {
            console.error("Error loading admin landing page settings:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateLandingPageAdminSettings(settings);
            alert('Pengaturan harga slot, masa aktif, dan langganan Landing Page berhasil disimpan!');
        } catch (err) {
            console.error("Error saving settings:", err);
            alert('Gagal menyimpan pengaturan.');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenEditExpiry = (lp) => {
        setSelectedLP(lp);
        let dateVal = '';
        if (lp.expires_at) {
            const d = new Date(lp.expires_at);
            dateVal = d.toISOString().slice(0, 16);
        }
        setExpiryForm({
            expires_at: dateVal,
            is_published: !!lp.is_published,
            is_active: !!lp.is_active,
            forever: !lp.expires_at
        });
        setShowEditExpiryModal(true);
    };

    const handleSaveLPExpiry = async (e) => {
        e.preventDefault();
        if (!selectedLP) return;
        setUpdatingExpiry(true);
        try {
            const payload = {
                id: selectedLP.id,
                expires_at: expiryForm.forever ? null : (expiryForm.expires_at ? new Date(expiryForm.expires_at).toISOString() : null),
                is_published: expiryForm.is_published,
                is_active: expiryForm.is_active
            };
            await updateLandingPageAdminItem(payload);
            alert(`Masa aktif landing page "${selectedLP.title}" berhasil diperbarui!`);
            setShowEditExpiryModal(false);
            loadData();
        } catch (err) {
            console.error("Error updating LP expiry:", err);
            alert('Gagal memperbarui masa aktif.');
        } finally {
            setUpdatingExpiry(false);
        }
    };

    const handleAddDaysShortcut = (days) => {
        const base = selectedLP.expires_at ? new Date(selectedLP.expires_at) : new Date();
        const now = new Date();
        const start = base > now ? base : now;
        start.setDate(start.getDate() + days);
        setExpiryForm({
            ...expiryForm,
            expires_at: start.toISOString().slice(0, 16),
            forever: false
        });
    };

    const filteredPages = allPages.filter((p) =>
        (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.seller_username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="body min-h-screen bg-slate-50">
            <Helmet>
                <title>Setting Landing Page & Slot - Admin</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                                <span className="material-icons text-2xl">admin_panel_settings</span>
                            </span>
                            <h1 className="text-2xl font-black text-slate-800">Manajemen Landing Page & Harga Slot</h1>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Atur tarif slot tambahan, durasi aktif gratis (1 bulan / selamanya), tarif perpanjangan langganan bulanan, dan edit masa aktif LP seller.
                        </p>
                    </div>

                    <Link
                        to="/dashboard"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 w-fit"
                    >
                        <span className="material-icons text-sm">arrow_back</span>
                        <span>Kembali ke Dashboard</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: SETTING FORM */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs sticky top-24">
                            <h3 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                                <span className="material-icons text-emerald-600">tune</span>
                                Pengaturan Tarif & Masa Aktif
                            </h3>

                            {loading ? (
                                <p className="text-xs text-slate-400">Memuat data pengaturan...</p>
                            ) : (
                                <form onSubmit={handleSaveSettings} className="space-y-4">
                                    {/* Durasi Free Default */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Durasi Masa Aktif Gratis Default
                                        </label>
                                        <select
                                            value={settings.free_duration_type || '1_month'}
                                            onChange={(e) => setSettings({ ...settings, free_duration_type: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                                        >
                                            <option value="1_month">1 Bulan Free (30 Hari sejak Publish)</option>
                                            <option value="forever">Free Selamanya (Tanpa Kedaluwarsa)</option>
                                            <option value="custom_days">Kustom Jumlah Hari</option>
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Masa aktif hanya terhitung saat LP berstatus <strong>Publish</strong>. Selama masih <strong>Draf/Edit</strong>, masa aktif belum berkurang.
                                        </p>
                                    </div>

                                    {settings.free_duration_type === 'custom_days' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Jumlah Hari Aktif Default (Hari)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={settings.default_free_days || 30}
                                                onChange={(e) => setSettings({ ...settings, default_free_days: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                            />
                                        </div>
                                    )}

                                    {/* Tarif Langganan / Perpanjangan Bulanan */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Tarif Langganan / Perpanjangan (Rp/Bulan)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={settings.subscription_price_monthly}
                                            onChange={(e) => setSettings({ ...settings, subscription_price_monthly: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Biaya yang dibayarkan seller saat memperpanjang masa aktif landing page yang expired atau akan expired.
                                        </p>
                                    </div>

                                    {/* Harga per Slot Tambahan */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Harga per 1 Slot Tambahan (Rp)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={settings.price_per_slot}
                                            onChange={(e) => setSettings({ ...settings, price_per_slot: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Tarif pembelian jika seller ingin membuat landing page ke-2 atau lebih.
                                        </p>
                                    </div>

                                    {/* Kuota Gratis per Akun */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Kuota Gratis per Akun (Default)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={settings.free_quota}
                                            onChange={(e) => setSettings({ ...settings, free_quota: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Petunjuk Pembayaran / Catatan
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={settings.instructions || ''}
                                            onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                                        >
                                            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                        </button>
                                    </div>

                                    <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed">
                                        <span className="font-bold flex items-center gap-1 mb-1">
                                            <span className="material-icons text-xs">sync</span> Listener Sync Aktif:
                                        </span>
                                        Setiap pembelian slot dan langganan masa aktif otomatis diverifikasi oleh <strong>Barakah Listener Webhook</strong> & <strong>DynaQRIS</strong> secara realtime.
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIST OF ALL USER LANDING PAGES */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                                <div>
                                    <h3 className="font-bold text-base text-slate-900">
                                        Rekap Landing Page Seller ({allPages.length})
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Admin dapat melihat dan mengedit masa aktif landing page seller secara langsung.
                                    </p>
                                </div>
                                <div className="w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Cari nama / username / slug..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <p className="text-xs text-slate-400 py-6 text-center">Memuat daftar...</p>
                            ) : filteredPages.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    Tidak ada data landing page yang cocok.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredPages.map((lp) => (
                                        <div key={lp.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border">
                                                    <img
                                                        src={lp.hero_image || lp.logo || '/placeholder-image.jpg'}
                                                        alt={lp.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm text-slate-900">{lp.title}</h4>
                                                    <p className="text-xs text-slate-500">
                                                        Seller: <span className="font-semibold text-slate-700">@{lp.seller_username}</span> ({lp.seller_name})
                                                    </p>
                                                    
                                                    {/* Status Badges */}
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                                                            /lp/{lp.slug}
                                                        </span>

                                                        {/* Publish badge */}
                                                        {lp.is_published ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                Published
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                Draft (Belum dihitung)
                                                            </span>
                                                        )}

                                                        {/* Expiry Badge */}
                                                        {lp.is_published && (
                                                            lp.is_expired ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                                                                    <span className="material-icons text-[11px]">warning</span> Expired
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                                    {lp.days_remaining != null ? `Sisa ${lp.days_remaining} hari` : 'Aktif Selamanya'}
                                                                </span>
                                                            )
                                                        )}

                                                        <span className="text-[10px] text-slate-400">
                                                            • {lp.views_count} views
                                                        </span>
                                                    </div>

                                                    <p className="text-[11px] text-slate-400 mt-1">
                                                        Masa Aktif: <span className="text-slate-600 font-medium">{formatDate(lp.expires_at)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                                <button
                                                    onClick={() => handleOpenEditExpiry(lp)}
                                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                                >
                                                    <span className="material-icons text-sm">schedule</span>
                                                    <span>Edit Masa Aktif</span>
                                                </button>
                                                <Link
                                                    to={`/lp/${lp.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                                >
                                                    <span className="material-icons text-sm">open_in_new</span>
                                                    <span>Lihat</span>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL EDIT MASA AKTIF LP */}
            {showEditExpiryModal && selectedLP && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="font-bold text-base text-slate-800">Edit Masa Aktif Landing Page</h3>
                                <p className="text-xs text-slate-500 font-medium">{selectedLP.title} (@{selectedLP.seller_username})</p>
                            </div>
                            <button
                                onClick={() => setShowEditExpiryModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveLPExpiry} className="space-y-4">
                            {/* Toggle Publish */}
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 block">Status Publikasi</span>
                                    <span className="text-[11px] text-slate-500">
                                        {expiryForm.is_published ? 'Aktif Tayang untuk Publik' : 'Draf (Belum Terhitung Masa Aktif)'}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={expiryForm.is_published}
                                    onChange={(e) => setExpiryForm({ ...expiryForm, is_published: e.target.checked })}
                                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                                />
                            </div>

                            {/* Forever option */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="forever_cb"
                                    checked={expiryForm.forever}
                                    onChange={(e) => setExpiryForm({ ...expiryForm, forever: e.target.checked })}
                                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                                />
                                <label htmlFor="forever_cb" className="text-xs font-bold text-slate-700 cursor-pointer">
                                    Set Masa Aktif Bebas / Selamanya (Tanpa Kedaluwarsa)
                                </label>
                            </div>

                            {/* Specific Expiry Date & Time */}
                            {!expiryForm.forever && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tanggal & Jam Kedaluwarsa
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required={!expiryForm.forever}
                                        value={expiryForm.expires_at}
                                        onChange={(e) => setExpiryForm({ ...expiryForm, expires_at: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                                    />

                                    {/* Quick extension shortcuts */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Tambah:</span>
                                        <button
                                            type="button"
                                            onClick={() => handleAddDaysShortcut(30)}
                                            className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100"
                                        >
                                            +30 Hari
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddDaysShortcut(60)}
                                            className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100"
                                        >
                                            +60 Hari
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddDaysShortcut(90)}
                                            className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100"
                                        >
                                            +90 Hari
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddDaysShortcut(365)}
                                            className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-100"
                                        >
                                            +1 Tahun
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Active Toggle */}
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="active_cb"
                                    checked={expiryForm.is_active}
                                    onChange={(e) => setExpiryForm({ ...expiryForm, is_active: e.target.checked })}
                                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                                />
                                <label htmlFor="active_cb" className="text-xs font-medium text-slate-700 cursor-pointer">
                                    Status Akun LP Aktif (Dapat diakses jika tidak expired)
                                </label>
                            </div>

                            <div className="pt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditExpiryModal(false)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingExpiry}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50"
                                >
                                    {updatingExpiry ? 'Menyimpan...' : 'Simpan Perubahan'}
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

export default DashboardAdminLandingPageSettingsPage;
