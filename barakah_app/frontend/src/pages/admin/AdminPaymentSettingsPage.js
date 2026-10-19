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
    checkAndroidWebhookStatus,
    getModulePaymentSettings,
    updateModulePaymentSetting,
    getListenerDevices,
    deleteListenerDevice,
    patchListenerDevice
} from '../../services/paymentApi';

const MODULE_DEFINITIONS = [
    { code: 'charity', title: 'Charity & ZISWAF (Donasi)', icon: 'volunteer_activism', color: 'emerald', desc: 'Kotak Amal, Sedekah, Zakat, Infaq & Program Kemanusiaan' },
    { code: 'event', title: 'Event & Tiket', icon: 'confirmation_number', color: 'blue', desc: 'Pendaftaran Event Offline/Online & Tiket Masuk' },
    { code: 'digital', title: 'Produk Digital', icon: 'download', color: 'indigo', desc: 'E-Book, Template, File Unduhan & Lisensi Digital' },
    { code: 'ecourse', title: 'E-Course & Kelas Online', icon: 'school', color: 'purple', desc: 'Video Pembelajaran, Webinar & Kurikulum Online' },
    { code: 'store', title: 'Produk Toko / Store', icon: 'storefront', color: 'amber', desc: 'E-Commerce Produk Fisik, Kuliner, Fashion & Mitra Sinergy' },
    { code: 'landing_page', title: 'Landing Page Builder', icon: 'web', color: 'teal', desc: 'Langganan Slot Ekstra & Perpanjangan Landing Page' },
    { code: 'service', title: 'Jasa & Layanan', icon: 'home_repair_service', color: 'rose', desc: 'Biaya Publikasi & Perpanjangan Listing Jasa 30 Hari' },
];

const AdminPaymentSettingsPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('global'); // 'global', 'plotting', 'listener'
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Global Settings Form State
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
    const [manualQrisFile, setManualQrisFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Module Plotting State (7 Modules)
    const [modulesData, setModulesData] = useState([]);
    const [selectedModuleCode, setSelectedModuleCode] = useState('charity');
    const [moduleForm, setModuleForm] = useState(null);
    const [moduleFile, setModuleFile] = useState(null);
    const [modulePreviewUrl, setModulePreviewUrl] = useState(null);
    const [moduleSaving, setModuleSaving] = useState(false);

    // Multi-Device Barakah Listener State
    const [listenerDevices, setListenerDevices] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const [devicesLoading, setDevicesLoading] = useState(false);

    // Webhook simulation test state
    const [webhookTestPayload, setWebhookTestPayload] = useState('BSI Mobile: Transfer masuk sebesar Rp 50.000 dari Ahmad Fulan');
    const [webhookTesting, setWebhookTesting] = useState(false);
    const [webhookTestResult, setWebhookTestResult] = useState(null);

    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [globalData, modsData, devData] = await Promise.all([
                getAdminPaymentSettings().catch(e => { console.error(e); return {}; }),
                getModulePaymentSettings().catch(e => { console.error(e); return []; }),
                getListenerDevices().catch(e => { console.error(e); return { devices: [], online_count: 0 }; })
            ]);

            if (globalData) {
                setForm({
                    active_mode: globalData.active_mode || 'manual',
                    dynaqris_api_key: globalData.dynaqris_api_key || '',
                    dynaqris_qris_id: globalData.dynaqris_qris_id || '',
                    payment_timeout_minutes: globalData.payment_timeout_minutes || 5,
                    enable_anti_spam: globalData.enable_anti_spam !== undefined ? globalData.enable_anti_spam : true,
                    bank_name: globalData.bank_name || 'Bank Syariah Indonesia (BSI)',
                    account_number: globalData.account_number || '',
                    account_name: globalData.account_name || '',
                    manual_qris_image_url: globalData.manual_qris_image_url || null,
                    android_webhook_enabled: globalData.android_webhook_enabled !== undefined ? globalData.android_webhook_enabled : true,
                    android_webhook_secret: globalData.android_webhook_secret || 'barakah_android_notif_secret_123',
                });
                if (globalData.manual_qris_image_url) {
                    setPreviewUrl(globalData.manual_qris_image_url);
                }
            }

            if (modsData && Array.isArray(modsData)) {
                setModulesData(modsData);
                const currentMod = modsData.find(m => m.module_code === selectedModuleCode) || modsData[0];
                if (currentMod) {
                    setSelectedModuleCode(currentMod.module_code);
                    setModuleForm({ ...currentMod });
                    setModulePreviewUrl(currentMod.manual_qris_image_url || null);
                }
            }

            if (devData) {
                setListenerDevices(devData.devices || []);
                setOnlineCount(devData.online_count || 0);
            }
        } catch (err) {
            console.error("Gagal memuat data pembayaran:", err);
            setMessage({ type: 'error', text: 'Gagal memuat pengaturan pembayaran. Pastikan Anda login sebagai Admin.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // When selecting another module from plotting tabs
    const handleSelectModule = (code) => {
        setSelectedModuleCode(code);
        setModuleFile(null);
        const mod = modulesData.find(m => m.module_code === code);
        if (mod) {
            setModuleForm({ ...mod });
            setModulePreviewUrl(mod.manual_qris_image_url || null);
        } else {
            const def = MODULE_DEFINITIONS.find(d => d.code === code);
            const emptyMod = {
                module_code: code,
                module_title: def ? def.title : code,
                is_custom: false,
                payment_mode: 'default',
                dynaqris_api_key: '',
                dynaqris_qris_id: '',
                bank_name: '',
                account_number: '',
                account_name: '',
                manual_qris_image_url: null,
                notes: ''
            };
            setModuleForm(emptyMod);
            setModulePreviewUrl(null);
        }
    };

    const webhookEndpointUrl = `${window.location.origin.replace('http://localhost:3000', 'https://api.barakah.cloud')}/api/payments/webhook/android-notification/`;

    const handleCopyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookEndpointUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    const handleCopySecret = () => {
        navigator.clipboard.writeText(form.android_webhook_secret);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
    };

    const handleGlobalChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleGlobalFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setManualQrisFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleModuleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setModuleForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleModuleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setModuleFile(file);
            setModulePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleTestConnection = async (customApiKey, customQrisId) => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await testDynaQRISConnection({
                dynaqris_api_key: customApiKey || form.dynaqris_api_key,
                dynaqris_qris_id: customQrisId || form.dynaqris_qris_id
            });
            setTestResult({ success: true, message: res.message || 'Koneksi ke API DynaQRIS berhasil!' });
        } catch (err) {
            const errText = err.response?.data?.error || err.message || 'Gagal terhubung ke DynaQRIS';
            setTestResult({ success: false, error: errText });
        } finally {
            setTesting(false);
        }
    };

    const handleSaveGlobal = async (e) => {
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
            setMessage({ type: 'success', text: 'Pengaturan Metode Pembayaran Global berhasil diperbarui!' });
            if (updated.manual_qris_image_url) {
                setPreviewUrl(updated.manual_qris_image_url);
            }
        } catch (err) {
            console.error("Gagal menyimpan pengaturan global:", err);
            setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan. Silakan periksa kembali isian Anda.' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveModulePlotting = async (e) => {
        e.preventDefault();
        if (!moduleForm) return;
        setModuleSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const formData = new FormData();
            formData.append('module_code', moduleForm.module_code);
            formData.append('module_title', moduleForm.module_title);
            formData.append('is_custom', moduleForm.is_custom);
            formData.append('payment_mode', moduleForm.payment_mode);
            formData.append('dynaqris_api_key', moduleForm.dynaqris_api_key || '');
            formData.append('dynaqris_qris_id', moduleForm.dynaqris_qris_id || '');
            formData.append('bank_name', moduleForm.bank_name || '');
            formData.append('account_number', moduleForm.account_number || '');
            formData.append('account_name', moduleForm.account_name || '');
            formData.append('notes', moduleForm.notes || '');
            if (moduleFile) {
                formData.append('manual_qris_image', moduleFile);
            }

            const updated = await updateModulePaymentSetting(formData);
            
            // Update in local array
            setModulesData(prev => prev.map(m => m.module_code === updated.module_code ? updated : m));
            setModuleForm({ ...updated });
            if (updated.manual_qris_image_url) {
                setModulePreviewUrl(updated.manual_qris_image_url);
            }
            setMessage({ type: 'success', text: `Plotting Pembayaran Modul ${updated.module_title} berhasil disimpan!` });
        } catch (err) {
            console.error("Gagal menyimpan modul:", err);
            setMessage({ type: 'error', text: 'Gagal menyimpan plotting modul. Periksa kembali input Anda.' });
        } finally {
            setModuleSaving(false);
        }
    };

    const handleRefreshDevices = async () => {
        setDevicesLoading(true);
        try {
            const devData = await getListenerDevices();
            setListenerDevices(devData.devices || []);
            setOnlineCount(devData.online_count || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setDevicesLoading(false);
        }
    };

    const handleDeleteDevice = async (deviceId) => {
        if (!window.confirm(`Hapus perangkat "${deviceId}" dari daftar listener?`)) return;
        try {
            await deleteListenerDevice(deviceId);
            setListenerDevices(prev => prev.filter(d => d.device_id !== deviceId));
            setMessage({ type: 'success', text: `Perangkat listener ${deviceId} berhasil dihapus.` });
        } catch (e) {
            setMessage({ type: 'error', text: 'Gagal menghapus perangkat.' });
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
            handleRefreshDevices();
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

    const activeModDef = MODULE_DEFINITIONS.find(d => d.code === selectedModuleCode) || MODULE_DEFINITIONS[0];

    return (
        <div className="body bg-slate-50 min-h-screen pb-24 text-slate-800">
            <Helmet>
                <title>Plotting QRIS & Pembayaran Multi-Modul - Admin BAE</title>
            </Helmet>

            <Header />

            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Back Link */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-700 transition mb-4"
                >
                    <span className="material-icons text-base">arrow_back</span>
                    <span>Kembali ke Dashboard</span>
                </button>

                {/* Main Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
                    {/* Header Title & Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black text-slate-800">Plotting QRIS &amp; Metode Pembayaran</h1>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                                    Multi-Modul &amp; Multi-HP
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                                Konfigurasi saluran QRIS Statis &amp; DynaQRIS otomatis per bagian (Charity, Event, Digital, E-Course, Store, Landing Page, Jasa) dan kelola Barakah Listener Multi-Login.
                            </p>
                        </div>

                        {/* Status Summary Pill */}
                        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 rounded-2xl shadow-md">
                            <span className="material-icons text-2xl text-emerald-200">devices</span>
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-200">Listener Multi-HP</p>
                                <p className="text-xs font-black">
                                    {onlineCount > 0 ? `🟢 ${onlineCount} HP Aktif Standby` : '⚪ Belum ada HP Online'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notification Alert Message */}
                    {message.text && (
                        <div className={`mt-4 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
                            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-lg">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                                <span>{message.text}</span>
                            </div>
                            <button onClick={() => setMessage({ type: '', text: '' })} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="flex flex-wrap gap-2 border-b border-slate-200 pt-5 pb-3">
                        <button
                            onClick={() => setActiveTab('global')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                activeTab === 'global'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                        >
                            <span className="material-icons text-sm">settings</span>
                            <span>1. Pengaturan Global (Default)</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('plotting')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                activeTab === 'plotting'
                                    ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            <span className="material-icons text-sm">view_quilt</span>
                            <span>2. Plotting 7 Bagian Modul</span>
                            <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full">7 Modul</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('listener')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                                activeTab === 'listener'
                                    ? 'bg-teal-700 text-white shadow-md'
                                    : 'bg-teal-50 hover:bg-teal-100 text-teal-800'
                            }`}
                        >
                            <span className="material-icons text-sm">phonelink_ring</span>
                            <span>3. Barakah Listener Multi-HP</span>
                            <span className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-slate-400">
                            <div className="w-9 h-9 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-xs font-medium">Memuat data konfigurasi pembayaran &amp; plotting modul...</p>
                        </div>
                    ) : (
                        <div className="mt-6">
                            {/* ============================================================== */}
                            {/* TAB 1: PENGATURAN GLOBAL                                        */}
                            {/* ============================================================== */}
                            {activeTab === 'global' && (
                                <form onSubmit={handleSaveGlobal} className="space-y-8">
                                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
                                        <span className="material-icons text-blue-600 text-lg shrink-0 mt-0.5">info</span>
                                        <div>
                                            <p className="font-bold mb-0.5">Fungsi Pengaturan Global:</p>
                                            <p className="text-blue-800 leading-relaxed">
                                                Pengaturan ini menjadi konfigurasi default utama. Jika salah satu dari 7 modul di bawah tidak mengaktifkan plot kustom khusus, maka modul tersebut akan secara otomatis menggunakan QRIS &amp; rekening bank dari pengaturan global ini.
                                            </p>
                                        </div>
                                    </div>

                                    {/* SECTION 1: PILIH METODE PEMBAYARAN GLOBAL */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                            <span className="material-icons text-emerald-600 text-base">tune</span>
                                            <span>Metode Pembayaran Utama (Global)</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4">
                                            Tentukan mode pembayaran utama yang digunakan sistem secara default.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Manual */}
                                            <div
                                                onClick={() => setForm(p => ({ ...p, active_mode: 'manual' }))}
                                                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative ${
                                                    form.active_mode === 'manual'
                                                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 mb-2">
                                                        <span className="material-icons text-xl">upload_file</span>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                        form.active_mode === 'manual' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                                                    }`}>
                                                        {form.active_mode === 'manual' && <span className="material-icons text-[10px]">check</span>}
                                                    </div>
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm">QRIS Statis &amp; Transfer Manual</h4>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    User mentransfer ke rekening atau scan QRIS statis dan mengunggah bukti bayar untuk diverifikasi.
                                                </p>
                                            </div>

                                            {/* DynaQRIS */}
                                            <div
                                                onClick={() => setForm(p => ({ ...p, active_mode: 'dynaqris' }))}
                                                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative ${
                                                    form.active_mode === 'dynaqris'
                                                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500/20'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mb-2">
                                                        <span className="material-icons text-xl">qr_code_2</span>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                        form.active_mode === 'dynaqris' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                                                    }`}>
                                                        {form.active_mode === 'dynaqris' && <span className="material-icons text-[10px]">check</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800 text-sm">DynaQRIS Otomatis</h4>
                                                    <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">Rekomendasi</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Konversi otomatis QRIS dengan kode unik nominal acak &amp; verifikasi otomatis realtime via Barakah Listener.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 2: API DYNAQRIS GLOBAL */}
                                    <div className="border-t border-slate-100 pt-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <span className="material-icons text-emerald-600 text-base">api</span>
                                                <span>Kredensial DynaQRIS Global</span>
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => handleTestConnection()}
                                                disabled={testing}
                                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                <span className="material-icons text-sm">{testing ? 'sync' : 'network_check'}</span>
                                                <span>{testing ? 'Testing...' : 'Tes Koneksi API Global'}</span>
                                            </button>
                                        </div>

                                        {testResult && (
                                            <div className={`mb-4 p-3 rounded-xl text-xs font-medium ${
                                                testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                            }`}>
                                                <p className="font-bold">{testResult.success ? '✓ Tes Koneksi Berhasil' : '✗ Tes Koneksi Gagal'}</p>
                                                <p className="mt-0.5">{testResult.message || testResult.error}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">X-API-Key DynaQRIS</label>
                                                <input
                                                    type="text"
                                                    name="dynaqris_api_key"
                                                    value={form.dynaqris_api_key}
                                                    onChange={handleGlobalChange}
                                                    placeholder="dq_live_..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Static QRIS ID (UUID)</label>
                                                <input
                                                    type="text"
                                                    name="dynaqris_qris_id"
                                                    value={form.dynaqris_qris_id}
                                                    onChange={handleGlobalChange}
                                                    placeholder="c7937a09-..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Batas Waktu Pembayaran (Menit)</label>
                                                <input
                                                    type="number"
                                                    name="payment_timeout_minutes"
                                                    value={form.payment_timeout_minutes}
                                                    onChange={handleGlobalChange}
                                                    min="1"
                                                    max="1440"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                />
                                            </div>

                                            <div className="flex items-center pt-5">
                                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        name="enable_anti_spam"
                                                        checked={form.enable_anti_spam}
                                                        onChange={handleGlobalChange}
                                                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-700">Aktifkan Proteksi Anti-Spam</span>
                                                        <p className="text-[10px] text-slate-400">Cegah user spamming pembuatan QRIS baru dalam 10 detik</p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SECTION 3: BANK & QRIS MANUAL GLOBAL */}
                                    <div className="border-t border-slate-100 pt-6">
                                        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                                            <span className="material-icons text-amber-600 text-base">account_balance</span>
                                            <span>Rekening Bank &amp; QRIS Statis Global</span>
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-4">
                                            Data rekening dan QRIS default untuk transfer manual dan QRIS statis.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank</label>
                                                <input
                                                    type="text"
                                                    name="bank_name"
                                                    value={form.bank_name}
                                                    onChange={handleGlobalChange}
                                                    placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label>
                                                <input
                                                    type="text"
                                                    name="account_number"
                                                    value={form.account_number}
                                                    onChange={handleGlobalChange}
                                                    placeholder="7260599187"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama (Pemilik Rekening)</label>
                                                <input
                                                    type="text"
                                                    name="account_name"
                                                    value={form.account_name}
                                                    onChange={handleGlobalChange}
                                                    placeholder="Barakah Economy Community"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Upload Gambar QRIS Statis Global</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleGlobalFileChange}
                                                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                            />
                                            {previewUrl && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <img src={previewUrl} alt="Preview QRIS" className="w-24 h-24 object-contain rounded-xl border border-slate-200 bg-white p-1" />
                                                    <div className="text-xs text-slate-500">
                                                        <p className="font-bold text-slate-700">QRIS Statis Terpasang</p>
                                                        <p className="text-[11px]">Akan ditampilkan jika metode pembayaran menggunakan transfer manual / QRIS statis.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Submit Global */}
                                    <div className="border-t border-slate-100 pt-6 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-8 rounded-2xl shadow-lg shadow-emerald-700/20 transition flex items-center gap-2 disabled:opacity-50 text-xs"
                                        >
                                            {saving ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Menyimpan Pengaturan Global...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons text-base">save</span>
                                                    <span>Simpan Pengaturan Global</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* ============================================================== */}
                            {/* TAB 2: PLOTTING 7 BAGIAN MODUL                                  */}
                            {/* ============================================================== */}
                            {activeTab === 'plotting' && (
                                <div>
                                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 mb-6 flex items-start gap-3">
                                        <span className="material-icons text-emerald-600 text-lg shrink-0 mt-0.5">account_tree</span>
                                        <div>
                                            <p className="font-bold mb-0.5">Plotting Pembayaran Khusus Tiap Modul:</p>
                                            <p className="text-emerald-800 leading-relaxed">
                                                Anda dapat memplot rekening bank, QRIS statis, dan akun DynaQRIS yang <strong>berbeda-beda</strong> untuk masing-masing bagian: <strong>Charity</strong>, <strong>Event</strong>, <strong>Produk Digital</strong>, <strong>E-Course</strong>, <strong>Produk Toko (Store)</strong>, <strong>Landing Page</strong>, dan <strong>Jasa</strong>.
                                                Jika plot kustom dinonaktifkan pada suatu modul, modul tersebut akan otomatis menggunakan pengaturan Global.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 7 Modules Navigation Pill Selector */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mb-6">
                                        {MODULE_DEFINITIONS.map(def => {
                                            const modState = modulesData.find(m => m.module_code === def.code);
                                            const isCustom = modState ? modState.is_custom : false;
                                            const isSelected = selectedModuleCode === def.code;

                                            return (
                                                <button
                                                    key={def.code}
                                                    type="button"
                                                    onClick={() => handleSelectModule(def.code)}
                                                    className={`p-3 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                                                        isSelected
                                                            ? 'border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-500/30'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="material-icons text-emerald-600 text-xl">{def.icon}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                                            isCustom ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                            {isCustom ? 'Kustom' : 'Global'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 truncate">{def.title}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{def.code}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Module Plotting Configuration Form */}
                                    {moduleForm && (
                                        <form onSubmit={handleSaveModulePlotting} className="bg-slate-50/70 border border-slate-200 rounded-3xl p-6 space-y-6">
                                            {/* Module Header & Toggle Custom Switch */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                                                        <span className="material-icons text-2xl">{activeModDef.icon}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-black text-slate-800">{activeModDef.title}</h3>
                                                        <p className="text-xs text-slate-500">{activeModDef.desc}</p>
                                                    </div>
                                                </div>

                                                {/* Enable Custom Plot Toggle */}
                                                <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm select-none">
                                                    <input
                                                        type="checkbox"
                                                        name="is_custom"
                                                        checked={Boolean(moduleForm.is_custom)}
                                                        onChange={handleModuleChange}
                                                        className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-black text-slate-800">
                                                            {moduleForm.is_custom ? '🟢 Plot Khusus Modul Ini Aktif' : '⚪ Gunakan Pengaturan Global'}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400">
                                                            {moduleForm.is_custom ? 'Modul ini memiliki QRIS & Rekening tersendiri' : 'Modul ini mewarisi QRIS & Bank dari Pengaturan Global'}
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>

                                            {moduleForm.is_custom ? (
                                                <div className="space-y-6">
                                                    {/* Mode Selection for this Module */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                            Pilihan Jalur Pembayaran untuk Modul {activeModDef.title}:
                                                        </label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            {[
                                                                { value: 'default', label: 'Default Global', desc: 'Ikuti mode global saat ini' },
                                                                { value: 'dynaqris', label: '⚡ DynaQRIS Otomatis', desc: 'Wajib DynaQRIS untuk modul ini' },
                                                                { value: 'manual', label: '📄 QRIS Statis / Manual', desc: 'Wajib Transfer Manual / QRIS Statis' },
                                                            ].map(opt => (
                                                                <div
                                                                    key={opt.value}
                                                                    onClick={() => setModuleForm(p => ({ ...p, payment_mode: opt.value }))}
                                                                    className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all ${
                                                                        moduleForm.payment_mode === opt.value
                                                                            ? 'border-emerald-600 bg-white shadow-sm ring-1 ring-emerald-500/20'
                                                                            : 'border-slate-200 bg-white/70 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                                                                    <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Custom DynaQRIS Section */}
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-icons text-emerald-600 text-lg">qr_code_2</span>
                                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                                    Kredensial DynaQRIS Khusus Modul Ini (Opsional)
                                                                </h4>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTestConnection(moduleForm.dynaqris_api_key, moduleForm.dynaqris_qris_id)}
                                                                disabled={testing || (!moduleForm.dynaqris_api_key && !moduleForm.dynaqris_qris_id)}
                                                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-xl transition disabled:opacity-40"
                                                            >
                                                                {testing ? 'Testing...' : 'Tes DynaQRIS Modul Ini'}
                                                            </button>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500">
                                                            Biarkan kosong jika ingin tetap menggunakan akun DynaQRIS global, atau isi jika modul ini menggunakan akun DynaQRIS / QRIS ID terpisah.
                                                        </p>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1">X-API-Key DynaQRIS Modul</label>
                                                                <input
                                                                    type="text"
                                                                    name="dynaqris_api_key"
                                                                    value={moduleForm.dynaqris_api_key || ''}
                                                                    onChange={handleModuleChange}
                                                                    placeholder="Kosongkan jika sama dengan global"
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1">Static QRIS ID (UUID) Modul</label>
                                                                <input
                                                                    type="text"
                                                                    name="dynaqris_qris_id"
                                                                    value={moduleForm.dynaqris_qris_id || ''}
                                                                    onChange={handleModuleChange}
                                                                    placeholder="Kosongkan jika sama dengan global"
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Custom Bank & Static QRIS Section */}
                                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                                            <span className="material-icons text-amber-600 text-lg">account_balance</span>
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                                Rekening Bank &amp; QRIS Statis Khusus Modul Ini
                                                            </h4>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500">
                                                            Misal: Untuk Charity/Donasi arahkan ke rekening Yayasan/ZISWAF, sedangkan Store/E-commerce ke rekening Usaha Komersial.
                                                        </p>

                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank Modul</label>
                                                                <input
                                                                    type="text"
                                                                    name="bank_name"
                                                                    value={moduleForm.bank_name || ''}
                                                                    onChange={handleModuleChange}
                                                                    placeholder="Contoh: BSI Rekening Donasi"
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label>
                                                                <input
                                                                    type="text"
                                                                    name="account_number"
                                                                    value={moduleForm.account_number || ''}
                                                                    onChange={handleModuleChange}
                                                                    placeholder="1234567890"
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-700 mb-1">Atas Nama Rekening</label>
                                                                <input
                                                                    type="text"
                                                                    name="account_name"
                                                                    value={moduleForm.account_name || ''}
                                                                    onChange={handleModuleChange}
                                                                    placeholder="Yayasan Barakah Peduli"
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* QRIS Image Upload for Module */}
                                                        <div className="pt-2">
                                                            <label className="block text-xs font-bold text-slate-700 mb-1">Foto Gambar QRIS Statis Khusus Modul Ini</label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleModuleFileChange}
                                                                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                                            />
                                                            {modulePreviewUrl && (
                                                                <div className="mt-3 flex items-center gap-3">
                                                                    <img src={modulePreviewUrl} alt="Preview Modul" className="w-20 h-20 object-contain rounded-xl border border-slate-200 bg-white p-1" />
                                                                    <div className="text-xs text-slate-500">
                                                                        <p className="font-bold text-slate-700">QRIS Statis Modul Terpasang</p>
                                                                        <p className="text-[11px]">User yang checkout modul ini akan melihat gambar QRIS khusus ini.</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan / Panduan Pembeli (Opsional)</label>
                                                            <textarea
                                                                rows="2"
                                                                name="notes"
                                                                value={moduleForm.notes || ''}
                                                                onChange={handleModuleChange}
                                                                placeholder="Contoh: Harap cantumkan kode referensi donasi pada berita transfer..."
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-emerald-600 focus:outline-none transition"
                                                            ></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="py-8 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">
                                                    <span className="material-icons text-3xl text-slate-300 mb-1">lock_clock</span>
                                                    <p className="text-xs font-bold text-slate-700">Menggunakan Pengaturan Global</p>
                                                    <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1">
                                                        Modul ini saat ini menggunakan rekening <strong>{form.bank_name} ({form.account_number})</strong> dan akun DynaQRIS global.
                                                        Centang <em>"Plot Khusus Modul Ini Aktif"</em> di atas jika Anda ingin mengatur rekening bank / QRIS berbeda.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Submit Module Plotting */}
                                            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                                                <p className="text-[11px] text-slate-400">
                                                    Perubahan akan langsung berlaku saat user melakukan checkout / pendaftaran di modul ini.
                                                </p>
                                                <button
                                                    type="submit"
                                                    disabled={moduleSaving}
                                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-6 rounded-2xl shadow-md transition flex items-center gap-2 disabled:opacity-50 text-xs"
                                                >
                                                    {moduleSaving ? (
                                                        <>
                                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            <span>Menyimpan Plotting...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="material-icons text-base">check</span>
                                                            <span>Simpan Plotting {activeModDef.title}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            {/* ============================================================== */}
                            {/* TAB 3: BARAKAH LISTENER MULTI-HP HUB                            */}
                            {/* ============================================================== */}
                            {activeTab === 'listener' && (
                                <div className="space-y-6">
                                    {/* Multi-Device Highlight Banner */}
                                    <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-teal-800/50">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-teal-800/50 pb-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                                                    <span className="material-icons text-2xl">phonelink_ring</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-base font-black text-white">Barakah Listener Multi-Login Hub</h3>
                                                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                            No Device Lock
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-teal-200/80 mt-0.5">
                                                        Multi-login aktif: Pasang aplikasi di banyak HP Android sekaligus tanpa takut saling logout atau berebut sesi.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleRefreshDevices}
                                                    disabled={devicesLoading}
                                                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                                                >
                                                    <span className={`material-icons text-sm ${devicesLoading ? 'animate-spin' : ''}`}>refresh</span>
                                                    <span>Refresh Status HP</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowGuideModal(true)}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow"
                                                >
                                                    <span className="material-icons text-sm">help_outline</span>
                                                    <span>Panduan Setup HP</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Webhook Connection Endpoints */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
                                            <div className="bg-black/30 rounded-2xl p-4 border border-teal-800/40">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                                                        Endpoint URL Webhook (Salin ke HP):
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyWebhookUrl}
                                                        className="text-[10px] text-teal-300 hover:text-white flex items-center gap-1 font-bold"
                                                    >
                                                        <span className="material-icons text-xs">{copiedUrl ? 'check' : 'content_copy'}</span>
                                                        <span>{copiedUrl ? 'Tersalin' : 'Salin URL'}</span>
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={webhookEndpointUrl}
                                                    className="w-full bg-black/40 border border-teal-800/60 rounded-xl px-3 py-2 text-xs font-mono text-teal-200 select-all cursor-text focus:outline-none"
                                                />
                                            </div>

                                            <div className="bg-black/30 rounded-2xl p-4 border border-teal-800/40">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                                                        Secret Token (`X-Android-Secret`):
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopySecret}
                                                        className="text-[10px] text-teal-300 hover:text-white flex items-center gap-1 font-bold"
                                                    >
                                                        <span className="material-icons text-xs">{copiedSecret ? 'check' : 'content_copy'}</span>
                                                        <span>{copiedSecret ? 'Tersalin' : 'Salin Token'}</span>
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={form.android_webhook_secret}
                                                    className="w-full bg-black/40 border border-teal-800/60 rounded-xl px-3 py-2 text-xs font-mono text-teal-200 select-all cursor-text focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* LIST OF REGISTERED ANDROID DEVICES */}
                                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="material-icons text-emerald-600 text-xl">devices_other</span>
                                                <h3 className="text-sm font-bold text-slate-800">
                                                    Daftar HP Android yang Terhubung ({listenerDevices.length} Perangkat)
                                                </h3>
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                Online: <strong className="text-emerald-700">{onlineCount}</strong> / {listenerDevices.length}
                                            </span>
                                        </div>

                                        {listenerDevices.length === 0 ? (
                                            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <span className="material-icons text-4xl text-slate-300 mb-2">phone_android</span>
                                                <p className="text-xs font-bold text-slate-600">Belum Ada HP Android yang Terdaftar</p>
                                                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                                                    Buka aplikasi Barakah Listener di HP Android pengurus/kasir, masukkan URL &amp; Secret Token di atas. HP akan otomatis muncul di sini secara realtime.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {listenerDevices.map(dev => {
                                                    const isOnline = dev.is_online;
                                                    return (
                                                        <div
                                                            key={dev.device_id}
                                                            className={`p-4 rounded-2xl border transition-all ${
                                                                isOnline
                                                                    ? 'bg-emerald-50/40 border-emerald-200 shadow-sm'
                                                                    : 'bg-slate-50 border-slate-200 opacity-80'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                                                        isOnline ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                                                                    }`}>
                                                                        <span className="material-icons text-lg">smartphone</span>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-800">{dev.device_name || 'HP Android'}</h4>
                                                                        <p className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                                                                            ID: {dev.device_id}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                        isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                                                        <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteDevice(dev.device_id)}
                                                                        title="Hapus perangkat"
                                                                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                                                                    >
                                                                        <span className="material-icons text-sm">delete</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                                                                <div className="flex justify-between">
                                                                    <span>Heartbeat Terakhir:</span>
                                                                    <span className="font-semibold text-slate-700">
                                                                        {dev.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleTimeString('id-ID') : '-'}
                                                                    </span>
                                                                </div>
                                                                {dev.last_ip && (
                                                                    <div className="flex justify-between">
                                                                        <span>IP Perangkat:</span>
                                                                        <span className="font-mono text-[10px] text-slate-600">{dev.last_ip}</span>
                                                                    </div>
                                                                )}
                                                                {dev.last_notification_preview && (
                                                                    <div className="mt-2 bg-white/80 p-2 rounded-xl border border-slate-100">
                                                                        <p className="text-[10px] font-bold text-slate-600">Notifikasi Terakhir Diterima:</p>
                                                                        <p className="text-[10px] font-mono text-emerald-700 truncate mt-0.5">
                                                                            {dev.last_notification_preview}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* LIVE SIMULATION WEBHOOK TEST */}
                                    <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
                                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="material-icons text-amber-400 text-lg">science</span>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                                    Uji Coba &amp; Simulasi Notifikasi Masuk ke 7 Modul
                                                </h4>
                                            </div>
                                            <span className="bg-slate-800 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-lg border border-slate-700">
                                                SIMULATOR
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-400 mb-3">
                                            Pilih atau ketik pesan notifikasi uang masuk dari bank/e-wallet untuk menguji verifikasi otomatis ke database transaksi pending.
                                        </p>

                                        {/* Presets */}
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {[
                                                { label: 'BSI Mobile (Rp 50.000)', text: 'BSI Mobile: Transfer masuk sebesar Rp 50.000 dari Ahmad Fulan' },
                                                { label: 'BCA (Rp 100.000)', text: 'm-Transfer BCA: Dana Masuk Sebesar Rp 100.000,00 dari REK 1234567890' },
                                                { label: 'Mandiri (Rp 25.000)', text: 'Livin by Mandiri: Penerimaan transfer Rp 25.000 berhasil diterima' },
                                                { label: 'DANA (Rp 50.000)', text: 'DANA: Kamu menerima saldo DANA sebesar Rp 50.000' },
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

                                        {/* Text Input */}
                                        <div className="mb-3">
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
                                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {webhookTesting ? (
                                                    <>
                                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        <span>Memproses Webhook...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-icons text-sm">send</span>
                                                        <span>Kirim Simulasi Notifikasi</span>
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

                                        {webhookTestResult && (
                                            <div className={`mt-3 p-3.5 rounded-xl text-xs font-mono border transition-all ${
                                                webhookTestResult.matched
                                                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700'
                                                    : webhookTestResult.success
                                                    ? 'bg-amber-950/80 text-amber-200 border-amber-700'
                                                    : 'bg-rose-950/80 text-rose-200 border-rose-700'
                                            }`}>
                                                <div className="flex items-center gap-2 font-bold mb-1">
                                                    <span className="material-icons text-sm">
                                                        {webhookTestResult.matched ? 'check_circle' : webhookTestResult.success ? 'info' : 'error'}
                                                    </span>
                                                    <span>
                                                        {webhookTestResult.matched
                                                            ? '🎉 TRANSAKSI PENDING BERHASIL DIVERIFIKASI OTOMATIS!'
                                                            : webhookTestResult.success
                                                            ? '✓ NOTIFIKASI DITERIMA (Tidak ada transaksi pending dengan nominal tersebut)'
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
                                                                Modul: <span className="uppercase font-bold text-emerald-400">{webhookTestResult.type}</span> (#{webhookTestResult.reference_id})
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Guide Modal */}
            {showGuideModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-emerald-100 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="text-base font-black text-emerald-900 flex items-center gap-2">
                                <span className="material-icons text-emerald-600">phonelink_ring</span>
                                Panduan Barakah Listener Multi-HP
                            </h3>
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200">
                                <p className="font-bold text-emerald-900 mb-1">📱 Fitur Multi-Login:</p>
                                <p className="text-emerald-800">
                                    Anda dapat memasang Barakah Listener di <strong>banyak HP Android sekaligus</strong> (misal: HP Kasir Toko, HP Bendahara Yayasan Donasi, HP Admin Event). Semua HP akan aktif bersamaan tanpa saling menendang dan setiap notifikasi dari HP mana pun akan langsung memverifikasi transaksi 7 modul di website!
                                </p>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-slate-900">Langkah 1: Buka App Barakah Notif Listener</p>
                                <p className="text-slate-600">
                                    Buka aplikasi Barakah Notif Listener di HP Android pengurus / kasir.
                                </p>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-slate-900">Langkah 2: Masukkan Server URL &amp; Secret</p>
                                <div className="bg-slate-50 p-3 rounded-xl font-mono text-[11px] space-y-1 border border-slate-200">
                                    <p><strong>Server URL:</strong> <span className="text-emerald-700">{webhookEndpointUrl}</span></p>
                                    <p><strong>Secret Token:</strong> {form.android_webhook_secret}</p>
                                </div>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-slate-900">Langkah 3: Izinkan Akses Notifikasi</p>
                                <p className="text-slate-600">
                                    Aktifkan izin akses notifikasi agar aplikasi dapat membaca notifikasi uang masuk dari m-Banking (BSI, BCA, Mandiri, BRI) atau E-Wallet (DANA, GoPay, ShopeePay).
                                </p>
                            </div>

                            <div className="border-l-2 border-emerald-500 pl-3 space-y-1">
                                <p className="font-bold text-slate-900">Langkah 4: Selesai &amp; Standby 24/7</p>
                                <p className="text-slate-600">
                                    Status HP akan berubah menjadi <strong>🟢 ONLINE</strong> di dashboard admin ini.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition"
                            >
                                Paham &amp; Tutup
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
