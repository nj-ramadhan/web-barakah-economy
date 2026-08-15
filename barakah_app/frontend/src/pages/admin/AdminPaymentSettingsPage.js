import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { 
    getAdminPaymentSettings, 
    updateAdminPaymentSettings, 
    testDynaQRISConnection,
    testAndroidWebhook,
    checkAndroidWebhookStatus 
} from '../../services/paymentApi';

const AdminPaymentSettingsPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Webhook simulation test state
    const [webhookTestPayload, setWebhookTestPayload] = useState('BSI Mobile: Transfer masuk sebesar Rp 50.000 dari Ahmad Fulan');
    const [webhookTesting, setWebhookTesting] = useState(false);
    const [webhookTestResult, setWebhookTestResult] = useState(null);

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
        android_webhook_enabled: true,
        android_webhook_secret: 'barakah_android_notif_secret_123',
    });

    const [copiedUrl, setCopiedUrl] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
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
                    android_webhook_enabled: data.android_webhook_enabled !== undefined ? data.android_webhook_enabled : true,
                    android_webhook_secret: data.android_webhook_secret || 'barakah_android_notif_secret_123',
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

    const webhookEndpointUrl = `${window.location.origin.replace('http://localhost:3000', 'https://api.barakah.cloud')}/api/payments/webhook/android-notification/`;

    const handleCopyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookEndpointUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

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

    const handleSendTestWebhook = async () => {
        if (!webhookTestPayload.trim()) return;
        setWebhookTesting(true);
        setWebhookTestResult(null);

        try {
            const res = await testAndroidWebhook({
                text: webhookTestPayload.trim(),
                secret: form.android_webhook_secret,
                title: 'Simulasi Test Webhook Admin'
            });
            setWebhookTestResult(res);
        } catch (err) {
            const errDetail = err.response?.data?.error || err.response?.data?.message || err.message || 'Gagal mengirim simulasi notifikasi ke webhook';
            setWebhookTestResult({
                success: false,
                matched: false,
                error: errDetail
            });
        } finally {
            setWebhookTesting(false);
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
            formData.append('android_webhook_enabled', form.android_webhook_enabled);
            formData.append('android_webhook_secret', form.android_webhook_secret);
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

                            {/* SECTION 4: WEBHOOK NOTIFIKASI HP ANDROID (AUTO VERIFY) */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                            <span className="material-icons text-emerald-600 text-lg">phonelink_ring</span>
                                            <span>WebHook Notifikasi HP Android (Auto-Verify Realtime)</span>
                                        </h3>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            form.android_webhook_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${form.android_webhook_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                            <span>{form.android_webhook_enabled ? 'Webhook Aktif' : 'Nonaktif'}</span>
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowGuideModal(true)}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition self-start sm:self-auto"
                                    >
                                        <span className="material-icons text-sm">help_outline</span>
                                        <span>Panduan &amp; App Listener Android</span>
                                    </button>
                                </div>

                                <p className="text-xs text-gray-500 mb-4">
                                    Verifikasi otomatis 100% tanpa Payment Gateway! Setiap kali m-Banking/E-Wallet di HP Android menerima notifikasi uang masuk, sistem akan membaca nominalnya dan langsung memverifikasi transaksi pending (Event, Donasi, E-commerce, Produk Digital, E-Course).
                                </p>

                                <div className="space-y-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 mb-4">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            name="android_webhook_enabled"
                                            checked={form.android_webhook_enabled}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-gray-800">Aktifkan Listener Webhook Notifikasi Android</span>
                                            <p className="text-[10px] text-gray-500">Menerima dan memproses notifikasi transfer bank/e-wallet secara otomatis</p>
                                        </div>
                                    </label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                                Secret Token (`X-Android-Secret`)
                                            </label>
                                            <input
                                                type="text"
                                                name="android_webhook_secret"
                                                value={form.android_webhook_secret}
                                                onChange={handleChange}
                                                placeholder="barakah_android_notif_secret_123"
                                                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:border-emerald-600 focus:outline-none transition"
                                                required
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Kunci rahasia untuk memvalidasi request dari aplikasi Android</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                                Endpoint URL Webhook (Salin ke App Android)
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={webhookEndpointUrl}
                                                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-gray-600 select-all cursor-text"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCopyWebhookUrl}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shrink-0 flex items-center gap-1"
                                                >
                                                    <span className="material-icons text-sm">{copiedUrl ? 'check' : 'content_copy'}</span>
                                                    <span>{copiedUrl ? 'Tersalin' : 'Salin'}</span>
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-emerald-700 font-medium mt-1">Tempelkan URL ini di aplikasi Barakah Notif Listener / Forwarder HP</p>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 5: LIVE TEST & SIMULASI NOTIFIKASI WEBHOOK */}
                                <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-amber-400 text-lg">science</span>
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                                Uji Coba &amp; Simulasi Webhook Notifikasi
                                            </h4>
                                        </div>
                                        <span className="bg-slate-800 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-lg border border-slate-700">
                                            LIVE TEST TOOL
                                        </span>
                                    </div>

                                    <p className="text-[11px] text-slate-400 mb-3">
                                        Gunakan form simulasi ini untuk menguji parsing regex nominal dan auto-verifikasi transaksi pending secara realtime tanpa perlu mentransfer uang beneran.
                                    </p>

                                    {/* Preset Templates */}
                                    <div className="mb-3">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                                            Pilih Contoh Notifikasi Bank / E-Wallet:
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: 'BSI Mobile (Rp 50.000)', text: 'BSI Mobile: Transfer masuk sebesar Rp 50.000 dari Ahmad Fulan' },
                                                { label: 'BCA (Rp 100.000)', text: 'm-Transfer BCA: Dana Masuk Sebesar Rp 100.000,00 dari REK 1234567890' },
                                                { label: 'Mandiri (Rp 25.000)', text: 'Livin by Mandiri: Penerimaan transfer Rp 25.000 berhasil diterima' },
                                                { label: 'DANA (Rp 50.000)', text: 'DANA: Kamu menerima saldo DANA sebesar Rp 50.000' },
                                                { label: 'GoPay (Rp 20.000)', text: 'GoPay: Transfer masuk sebesar Rp 20.000 berhasil diterima' },
                                                { label: 'ShopeePay (Rp 75.000)', text: 'ShopeePay: Pembayaran QRIS Rp 75.000 berhasil masuk ke saldo Anda' }
                                            ].map((preset, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setWebhookTestPayload(preset.text)}
                                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium px-2.5 py-1 rounded-lg border border-slate-700 transition"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Input Message */}
                                    <div className="mb-3">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Teks Notifikasi yang Diuji:
                                        </label>
                                        <input
                                            type="text"
                                            value={webhookTestPayload}
                                            onChange={(e) => setWebhookTestPayload(e.target.value)}
                                            placeholder="Contoh: Transfer masuk sebesar Rp 50.000 dari Tester"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono focus:border-emerald-500 focus:outline-none transition"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={handleSendTestWebhook}
                                            disabled={webhookTesting || !webhookTestPayload.trim()}
                                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950 disabled:opacity-50"
                                        >
                                            {webhookTesting ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Memproses Webhook...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons text-sm">send</span>
                                                    <span>Kirim Uji Coba ke Webhook</span>
                                                </>
                                            )}
                                        </button>

                                        {webhookTestResult && (
                                            <button
                                                type="button"
                                                onClick={() => setWebhookTestResult(null)}
                                                className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                                            >
                                                Bersihkan Hasil
                                            </button>
                                        )}
                                    </div>

                                    {/* Test Result Display */}
                                    {webhookTestResult && (
                                        <div className={`mt-3 p-3.5 rounded-xl text-xs font-mono border transition-all ${
                                            webhookTestResult.matched
                                                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700'
                                                : webhookTestResult.success
                                                ? 'bg-amber-950/80 text-amber-200 border-amber-700'
                                                : 'bg-red-950/80 text-red-200 border-red-700'
                                        }`}>
                                            <div className="flex items-center gap-2 font-bold mb-1">
                                                <span className="material-icons text-sm">
                                                    {webhookTestResult.matched ? 'check_circle' : webhookTestResult.success ? 'info' : 'error'}
                                                </span>
                                                <span>
                                                    {webhookTestResult.matched
                                                        ? '🎉 TRANSAKSI PENDING BERHASIL DIVERIFIKASI OTOMATIS!'
                                                        : webhookTestResult.success
                                                        ? '✓ NOTIFIKASI TERBACA SERVER (Tidak ada transaksi pending dengan nominal tersebut)'
                                                        : '✗ GAGAL MEMPROSES WEBHOOK'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] opacity-90 mt-1">{webhookTestResult.message || webhookTestResult.error}</p>
                                            {webhookTestResult.extracted_amounts && webhookTestResult.extracted_amounts.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-300">
                                                    <span>Nominal Terdeteksi: </span>
                                                    <span className="font-bold text-white">
                                                        {webhookTestResult.extracted_amounts.map(a => 'Rp ' + Number(a).toLocaleString('id-ID')).join(', ')}
                                                    </span>
                                                    {webhookTestResult.type && (
                                                        <span className="ml-3">
                                                            Tipe: <span className="uppercase font-bold text-emerald-400">{webhookTestResult.type}</span> (#{webhookTestResult.reference_id})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
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

            {/* Guide Modal */}
            {showGuideModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-emerald-100 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                            <h3 className="text-base font-black text-emerald-800 flex items-center gap-2">
                                <span className="material-icons text-emerald-600">phonelink_ring</span>
                                Panduan Setting HP Android
                            </h3>
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
                            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                                <p className="font-bold text-emerald-900 mb-1">📱 Prinsip Kerja:</p>
                                <p className="text-emerald-800">
                                    Aplikasi di HP Android Anda akan mendeteksi notifikasi transfer bank/e-wallet masuk (BSI Mobile, BCA, DANA, GoPay, OVO, ShopeePay) lalu langsung mengirim nominalnya ke server website ini untuk memverifikasi transaksi pending secara otomatis!
                                </p>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-gray-900">Langkah 1: Install Aplikasi Listener di Play Store</p>
                                <p className="text-gray-600">
                                    Buka Google Play Store di HP Android pengurus/toko, cari dan install aplikasi gratis bernama: <strong>Notification Forwarder</strong> atau <strong>MacroDroid</strong>.
                                </p>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-gray-900">Langkah 2: Tambahkan Rule Webhook HTTP POST</p>
                                <p className="text-gray-600">Pilih aplikasi bank yang ingin dibaca notifikasinya (BSI Mobile, BCA, DANA, dll).</p>
                                <p className="text-gray-600">Pilih tipe aksi: <strong>HTTP Request / Webhook (POST)</strong>.</p>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-gray-900">Langkah 3: Masukkan Data Server</p>
                                <div className="bg-gray-50 p-3 rounded-xl font-mono text-[11px] space-y-1 border border-gray-200">
                                    <p><strong>URL:</strong> <span className="text-emerald-700">{webhookEndpointUrl}</span></p>
                                    <p><strong>Method:</strong> POST</p>
                                    <p><strong>Header Name:</strong> X-Android-Secret</p>
                                    <p><strong>Header Value:</strong> {form.android_webhook_secret}</p>
                                    <p><strong>Body JSON:</strong> &#123;"text": "Transfer masuk sebesar Rp 121.00"&#125;</p>
                                </div>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-gray-900">Langkah 4: Simpan & Tes Transaksi</p>
                                <p className="text-gray-600">
                                    Simpan rule. Sekarang setiap ada notifikasi transfer masuk di HP Android Anda, transaksi QRIS di website akan <strong>otomatis 100% lunas & e-tiket terkirim!</strong>
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition"
                            >
                                Paham & Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default AdminPaymentSettingsPage;
