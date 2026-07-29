import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAdminPaymentSettings, updateAdminPaymentSettings, testDynaQRISConnection } from '../../services/paymentApi';

const AdminPaymentSettingsPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const [form, setForm] = useState({
        active_mode: 'manual',
        dynaqris_api_key: 'dq_live_623412215126097e2fe48e086a4e2d15',
        dynaqris_qris_id: 'c7937a09-5a9a-49bd-a93b-e013af429995',
        payment_timeout_minutes: 5,
        enable_anti_spam: true,
        bank_name: 'Bank Syariah Indonesia (BSI)',
        account_number: '7260599187',
        account_name: 'Barakah Economy Community',
        manual_qris_image_url: null,
    });

    const [manualQrisFile, setManualQrisFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getAdminPaymentSettings();
                setForm({
                    active_mode: data.active_mode || 'manual',
                    dynaqris_api_key: data.dynaqris_api_key || 'dq_live_623412215126097e2fe48e086a4e2d15',
                    dynaqris_qris_id: data.dynaqris_qris_id || 'c7937a09-5a9a-49bd-a93b-e013af429995',
                    payment_timeout_minutes: data.payment_timeout_minutes || 5,
                    enable_anti_spam: data.enable_anti_spam !== undefined ? data.enable_anti_spam : true,
                    bank_name: data.bank_name || 'Bank Syariah Indonesia (BSI)',
                    account_number: data.account_number || '7260599187',
                    account_name: data.account_name || 'Barakah Economy Community',
                    manual_qris_image_url: data.manual_qris_image_url || null,
                });
                if (data.manual_qris_image_url) {
                    setPreviewUrl(data.manual_qris_image_url);
                }
            } catch (err) {
                console.error("Gagal mengambil pengaturan metode pembayaran:", err);
                setMessage({ type: 'error', text: 'Gagal memuat pengaturan pembayaran. Pastikan Anda memiliki akses Admin.' });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setManualQrisFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await testDynaQRISConnection({
                dynaqris_api_key: form.dynaqris_api_key,
                dynaqris_qris_id: form.dynaqris_qris_id
            });
            setTestResult({ success: true, message: res.message || 'Koneksi ke API DynaQRIS berhasil!' });
        } catch (err) {
            const errText = err.response?.data?.error || err.message || 'Gagal terhubung ke DynaQRIS';
            setTestResult({ success: false, error: errText });
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('active_mode', form.active_mode);
            formData.append('dynaqris_api_key', form.dynaqris_api_key);
            formData.append('dynaqris_qris_id', form.dynaqris_qris_id);
            formData.append('payment_timeout_minutes', form.payment_timeout_minutes);
            formData.append('enable_anti_spam', form.enable_anti_spam);
            formData.append('bank_name', form.bank_name);
            formData.append('account_number', form.account_number);
            formData.append('account_name', form.account_name);
            if (manualQrisFile) {
                formData.append('manual_qris_image', manualQrisFile);
            }

            const updated = await updateAdminPaymentSettings(formData);
            setMessage({ type: 'success', text: 'Pengaturan metode pembayaran berhasil diperbarui!' });
            if (updated.manual_qris_image_url) {
                setPreviewUrl(updated.manual_qris_image_url);
            }
        } catch (err) {
            console.error("Gagal menyimpan pengaturan:", err);
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan. Silakan periksa kembali isian Anda.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen pb-24">
            <Helmet>
                <title>Pengaturan Metode Pembayaran - Admin BAE</title>
            </Helmet>

            <Header />

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Back Link & Header */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-700 transition mb-4"
                >
                    <span className="material-icons text-base">arrow_back</span>
                    <span>Kembali ke Dashboard</span>
                </button>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-gray-800">Pengaturan Metode Pembayaran</h1>
                                <span className="bg-green-100 text-green-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                                    Khusus Admin
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Kelola metode pembayaran aktif yang berlaku di seluruh transaksi sistem (Event, E-commerce, Produk Digital, Donasi/Charity).
                            </p>
                        </div>

                        {/* Active Mode Status Badge */}
                        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-2xl shadow-md">
                            <span className="material-icons text-lg">verified_user</span>
                            <div>
                                <p className="text-[9px] uppercase font-bold tracking-widest text-emerald-100">Mode Aktif Saat Ini</p>
                                <p className="text-xs font-black">
                                    {form.active_mode === 'dynaqris' ? '⚡ DynaQRIS Otomatis' : '📄 Kirim Bukti Transfer'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`mt-4 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
                            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                            <span className="material-icons text-xl">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                            <span>{message.text}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-12 text-center text-gray-400">
                            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm">Memuat pengaturan pembayaran...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
                            {/* SECTION 1: METODE PEMBAYARAN AKTIF (TOGGLE / SELECTION) */}
                            <div>
                                <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="material-icons text-green-600 text-lg">tune</span>
                                    <span>Pilih Metode Pembayaran Aktif</span>
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    Pilih salah satu metode pembayaran di bawah. Pilihan ini akan otomatis berlaku untuk semua fitur pembayaran di website.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Option 1: Manual Transfer */}
                                    <div
                                        onClick={() => setForm((prev) => ({ ...prev, active_mode: 'manual' }))}
                                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative overflow-hidden ${
                                            form.active_mode === 'manual'
                                                ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 mb-3">
                                                <span className="material-icons text-2xl">upload_file</span>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                form.active_mode === 'manual' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                                            }`}>
                                                {form.active_mode === 'manual' && <span className="material-icons text-xs">check</span>}
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-800 text-sm">Kirim Bukti Transfer (Manual)</h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Pembeli melakukan transfer manual ke rekening bank / QRIS dan mengunggah foto bukti bayar untuk diverifikasi.
                                        </p>
                                    </div>

                                    {/* Option 2: DynaQRIS */}
                                    <div
                                        onClick={() => setForm((prev) => ({ ...prev, active_mode: 'dynaqris' }))}
                                        className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative overflow-hidden ${
                                            form.active_mode === 'dynaqris'
                                                ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mb-3">
                                                <span className="material-icons text-2xl">qr_code_2</span>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                                form.active_mode === 'dynaqris' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                                            }`}>
                                                {form.active_mode === 'dynaqris' && <span className="material-icons text-xs">check</span>}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-gray-800 text-sm">DynaQRIS Otomatis</h4>
                                            <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                                                Rekomendasi
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Sistem secara otomatis mengonversi QRIS statis menjadi Dynamic QRIS dengan nominal tepat, countdown timer, & verifikasi otomatis.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: KONFIGURASI DYNAQRIS */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                        <span className="material-icons text-emerald-600 text-lg">api</span>
                                        <span>Pengaturan API DynaQRIS</span>
                                    </h3>

                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testing}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <span className="material-icons text-sm">{testing ? 'sync' : 'network_check'}</span>
                                        <span>{testing ? 'Testing...' : 'Tes Koneksi API'}</span>
                                    </button>
                                </div>

                                {testResult && (
                                    <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                                        testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}>
                                        <p className="font-bold">{testResult.success ? '✓ Tes Koneksi Berhasil' : '✗ Tes Koneksi Gagal'}</p>
                                        <p className="mt-0.5">{testResult.message || testResult.error}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            X-API-Key DynaQRIS
                                        </label>
                                        <input
                                            type="text"
                                            name="dynaqris_api_key"
                                            value={form.dynaqris_api_key}
                                            onChange={handleChange}
                                            placeholder="dq_live_..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                            required
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Dapatkan di dashboard.dynaqris.web.id → API Keys</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Static QRIS ID (UUID)
                                        </label>
                                        <input
                                            type="text"
                                            name="dynaqris_qris_id"
                                            value={form.dynaqris_qris_id}
                                            onChange={handleChange}
                                            placeholder="c7937a09-5a9a-49bd-a93b-e013af429995"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                            required
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Dapatkan di dashboard.dynaqris.web.id → Static QRIS</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Batas Waktu Pembayaran (Menit)
                                        </label>
                                        <input
                                            type="number"
                                            name="payment_timeout_minutes"
                                            value={form.payment_timeout_minutes}
                                            onChange={handleChange}
                                            min="1"
                                            max="1440"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                            required
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Lama countdown timer pembayaran sebelum expired (misal: 15 menit)</p>
                                    </div>

                                    <div className="flex items-center pt-4">
                                        <label className="flex items-center gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                name="enable_anti_spam"
                                                checked={form.enable_anti_spam}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-gray-700">Aktifkan Proteksi Anti-Spam</span>
                                                <p className="text-[10px] text-gray-400">Mencegah pembuatan QRIS berulang kali dalam waktu singkat</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: KONFIGURASI BANK MANUAL */}
                            <div className="border-t border-gray-100 pt-6">
                                <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="material-icons text-amber-600 text-lg">account_balance</span>
                                    <span>Pengaturan Rekening Transfer Manual</span>
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Nama Bank
                                        </label>
                                        <input
                                            type="text"
                                            name="bank_name"
                                            value={form.bank_name}
                                            onChange={handleChange}
                                            placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Nomor Rekening
                                        </label>
                                        <input
                                            type="text"
                                            name="account_number"
                                            value={form.account_number}
                                            onChange={handleChange}
                                            placeholder="7260599187"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Atas Nama (Pemilik Rekening)
                                        </label>
                                        <input
                                            type="text"
                                            name="account_name"
                                            value={form.account_name}
                                            onChange={handleChange}
                                            placeholder="Barakah Economy Community"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Foto QRIS Transfer Manual (Opsional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                    />
                                    {previewUrl && (
                                        <div className="mt-2">
                                            <p className="text-[10px] text-gray-400 mb-1">Preview Gambar QRIS Manual:</p>
                                            <img src={previewUrl} alt="Preview QRIS Manual" className="w-32 h-32 object-contain rounded-xl border border-gray-200" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="border-t border-gray-100 pt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons text-lg">save</span>
                                            <span>Simpan Pengaturan Pembayaran</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default AdminPaymentSettingsPage;
