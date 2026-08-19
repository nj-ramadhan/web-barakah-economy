// pages/admin/DashboardAdminMaintenancePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import '../../styles/Body.css';

const DashboardAdminMaintenancePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [setting, setSetting] = useState({
        is_active: false,
        title: 'Situs Sedang Dalam Pemeliharaan (Maintenance)',
        message: 'Mohon maaf atas ketidaknyamanannya. Kami sedang melakukan peningkatan sistem dan pemeliharaan berkala. Silakan kembali beberapa saat lagi.',
        estimated_end: ''
    });

    const fetchSetting = useCallback(async () => {
        setLoading(true);
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/login');
            return;
        }

        try {
            const user = JSON.parse(userData);
            const res = await axios.get(
                `${process.env.REACT_APP_API_BASE_URL}/api/site-content/maintenance/admin/`,
                {
                    headers: { Authorization: `Bearer ${user.access}` }
                }
            );

            if (res.data) {
                setSetting({
                    is_active: Boolean(res.data.is_active),
                    title: res.data.title || 'Situs Sedang Dalam Pemeliharaan (Maintenance)',
                    message: res.data.message || '',
                    estimated_end: res.data.estimated_end ? res.data.estimated_end.slice(0, 16) : ''
                });
            }
        } catch (error) {
            console.error('Failed fetching maintenance setting:', error);
            if (error.response?.status === 403) {
                alert('Akses ditolak: Menu ini khusus administrator.');
                navigate('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchSetting();
    }, [fetchSetting]);

    const handleToggleActive = async () => {
        const nextState = !setting.is_active;
        const confirmMsg = nextState
            ? 'Aktifkan Mode Maintenance?\n\nPerhatian: Seluruh pengunjung dan user non-admin tidak akan dapat mengakses fitur website dan akan diarahkan ke halaman pemeliharaan. Hanya Administrator yang dapat membuka website.'
            : 'Nonaktifkan Mode Maintenance?\n\nWebsite akan kembali terbuka normal untuk seluruh pengunjung dan member.';

        if (!window.confirm(confirmMsg)) return;

        setSaving(true);
        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/api/site-content/maintenance/admin/`,
                {
                    is_active: nextState,
                    title: setting.title,
                    message: setting.message,
                    estimated_end: setting.estimated_end ? new Date(setting.estimated_end).toISOString() : null
                },
                {
                    headers: { Authorization: `Bearer ${user.access}` }
                }
            );

            setSetting(prev => ({ ...prev, is_active: nextState }));
            alert(res.data.message || 'Status maintenance berhasil diperbarui.');
        } catch (err) {
            console.error('Failed toggling maintenance:', err);
            alert(err.response?.data?.error || 'Gagal mengubah status maintenance.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveDetails = async (e) => {
        e.preventDefault();
        setSaving(true);
        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);

        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_BASE_URL}/api/site-content/maintenance/admin/`,
                {
                    is_active: setting.is_active,
                    title: setting.title,
                    message: setting.message,
                    estimated_end: setting.estimated_end ? new Date(setting.estimated_end).toISOString() : null
                },
                {
                    headers: { Authorization: `Bearer ${user.access}` }
                }
            );

            alert('Pengaturan teks dan jadwal maintenance berhasil disimpan!');
            if (res.data?.setting) {
                setSetting({
                    is_active: Boolean(res.data.setting.is_active),
                    title: res.data.setting.title || '',
                    message: res.data.setting.message || '',
                    estimated_end: res.data.setting.estimated_end ? res.data.setting.estimated_end.slice(0, 16) : ''
                });
            }
        } catch (err) {
            console.error('Failed saving maintenance details:', err);
            alert(err.response?.data?.error || 'Gagal menyimpan pengaturan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Mode Maintenance - Admin BAE</title>
            </Helmet>

            <Header />

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header Title */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition mb-3"
                    >
                        <span className="material-icons text-sm">arrow_back</span>
                        Kembali ke Dashboard
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
                                <span className="material-icons text-amber-500 text-3xl">engineering</span>
                                Mode Maintenance (Perawatan Web)
                            </h1>
                            <p className="text-xs text-gray-500 mt-1">
                                Kontrol penuh akses situs saat sedang dilakukan perbaikan, peningkatan sistem, atau pembersihan data.
                            </p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-xs ${
                                setting.is_active 
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse' 
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                                <span className="material-icons text-sm">
                                    {setting.is_active ? 'warning' : 'check_circle'}
                                </span>
                                {setting.is_active ? 'Maintenance Aktif' : 'Normal / Publik'}
                            </span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            Memuat pengaturan maintenance...
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Switch Card */}
                        <div className={`p-6 rounded-3xl border transition shadow-sm ${
                            setting.is_active
                                ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border-amber-200'
                                : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                                        <span className="material-icons text-amber-600 text-lg">power_settings_new</span>
                                        Status Mode Pemeliharaan
                                    </h3>
                                    <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
                                        {setting.is_active
                                            ? 'Website saat ini DITUTUP untuk publik dan member biasa. Hanya role Administrator yang dapat membuka dan menggunakan website.'
                                            : 'Website saat ini TERBUKA NORMAL untuk seluruh pengunjung dan member.'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleToggleActive}
                                    disabled={saving}
                                    className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md active:scale-95 flex items-center justify-center gap-2 shrink-0 ${
                                        setting.is_active
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    }`}
                                >
                                    <span className="material-icons text-sm">
                                        {setting.is_active ? 'toggle_on' : 'toggle_off'}
                                    </span>
                                    {setting.is_active ? 'Nonaktifkan Maintenance' : 'Aktifkan Maintenance'}
                                </button>
                            </div>
                        </div>

                        {/* Setting Form & Preview Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Form Column */}
                            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                    <span className="material-icons text-gray-600 text-base">edit_note</span>
                                    Pesan &amp; Informasi Pemeliharaan
                                </h3>

                                <form onSubmit={handleSaveDetails} className="space-y-4">
                                    {/* Title */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                            Judul Halaman
                                        </label>
                                        <input
                                            type="text"
                                            value={setting.title}
                                            onChange={(e) => setSetting({ ...setting, title: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                            placeholder="Contoh: Mohon Maaf, Web Sedang Dalam Pemeliharaan"
                                            required
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                            Pesan Permohonan Maaf &amp; Penjelasan
                                        </label>
                                        <textarea
                                            rows="4"
                                            value={setting.message}
                                            onChange={(e) => setSetting({ ...setting, message: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                            placeholder="Tuliskan pesan permohonan maaf dan keterangan pemeliharaan sistem..."
                                            required
                                        ></textarea>
                                    </div>

                                    {/* Estimated End Time */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                            Perkiraan Waktu Selesai (Opsional)
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={setting.estimated_end}
                                            onChange={(e) => setSetting({ ...setting, estimated_end: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Kosongkan jika waktu selesai belum dapat ditentukan secara pasti.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        <span className="material-icons text-base">save</span>
                                        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                    </button>
                                </form>
                            </div>

                            {/* Preview Column */}
                            <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-gray-950 rounded-3xl p-6 border border-gray-800 text-white flex flex-col justify-between shadow-xl">
                                <div>
                                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-800">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                            <span className="material-icons text-xs">visibility</span>
                                            Live Preview Tampilan
                                        </span>
                                        <span className="text-[9px] text-gray-400">Dilihat oleh User Biasa</span>
                                    </div>

                                    <div className="text-center py-4 space-y-3">
                                        <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl mx-auto flex items-center justify-center border border-amber-500/30">
                                            <span className="material-icons text-3xl">engineering</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-white line-clamp-2">
                                            {setting.title || 'Judul Pemeliharaan'}
                                        </h4>
                                        <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-line line-clamp-4">
                                            {setting.message || 'Pesan pemeliharaan...'}
                                        </p>

                                        {setting.estimated_end && (
                                            <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-2 text-center text-[10px] text-emerald-300">
                                                Estimasi: {new Date(setting.estimated_end).toLocaleString('id-ID')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-800 text-center">
                                    <p className="text-[10px] text-gray-400">
                                        User yang belum login akan diarahkan ke Login Page dengan banner maintenance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardAdminMaintenancePage;
