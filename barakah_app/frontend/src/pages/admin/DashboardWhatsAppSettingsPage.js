import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import api from '../../services/api';

const SYSTEM_MODULES = [
    {
        icon: 'storefront',
        title: 'Barakah Store (UMKM)',
        desc: 'Notifikasi konfirmasi pesanan pembeli, info pembayaran, dan resi kurir.',
        color: 'emerald'
    },
    {
        icon: 'school',
        title: 'E-Course & Sertifikasi',
        desc: 'Konfirmasi pendaftaran kelas, kelulusan ujian, dan penerbitan e-sertifikat.',
        color: 'blue'
    },
    {
        icon: 'inventory_2',
        title: 'Marketplace Produk Digital',
        desc: 'Tautan unduhan instan produk (e-book, tools, template) & nota transaksi.',
        color: 'indigo'
    },
    {
        icon: 'confirmation_number',
        title: 'Event & Kegiatan Komunitas',
        desc: 'Tiket QR Code pendaftaran, konfirmasi peserta, dan pengingat H-1 kegiatan.',
        color: 'teal'
    },
    {
        icon: 'volunteer_activism',
        title: 'Donasi & Program Charity',
        desc: 'Kwitansi otomatis bukti donasi terverifikasi dan laporan progres penyaluran.',
        color: 'rose'
    },
    {
        icon: 'security',
        title: 'Keamanan & Autentikasi',
        desc: 'Peringatan login baru, bantuan reset password darurat, dan verifikasi akun.',
        color: 'amber'
    },
    {
        icon: 'groups',
        title: 'Agenda & Rapat Internal',
        desc: 'Undangan rapat pengurus, link absensi digital scan QR, dan ringkasan notulensi.',
        color: 'purple'
    },
    {
        icon: 'campaign',
        title: 'Pengecualian: Menu Broadcast',
        desc: 'Menu broadcast tetap bebas memilih nomor pengirim khusus saat pengiriman massal.',
        color: 'gray',
        isException: true
    }
];

const DashboardWhatsAppSettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [setting, setSetting] = useState(null);
    const [devices, setDevices] = useState([]);
    const [serverUrl, setServerUrl] = useState('');
    const [savingId, setSavingId] = useState(null);
    const [feedback, setFeedback] = useState(null);

    // Test send state
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState("Assalamu'alaikum! Ini adalah pesan pengujian dari Barakah Economy WhatsApp Gateway. Sistem notifikasi otomatis berjalan lancar! ✅");
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Fetch Gateway Settings & Connected Devices
    const fetchGatewayData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/site-content/whatsapp-gateway/');
            if (res.data) {
                setSetting(res.data.setting);
                setDevices(res.data.connected_devices || []);
                setServerUrl(res.data.server_url || 'https://bae.dailykas.com');
            }
        } catch (err) {
            console.error('Failed to load WhatsApp Gateway settings:', err);
            setFeedback({
                type: 'error',
                message: 'Gagal memuat konfigurasi WhatsApp Gateway dari server.'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGatewayData();
    }, [fetchGatewayData]);

    // Set Default WhatsApp Device
    const handleSetDefaultDevice = async (device) => {
        try {
            setSavingId(device.id);
            setFeedback(null);

            const payload = {
                default_device_id: device.id,
                default_device_name: device.name,
                default_device_phone: device.phone
            };

            const res = await api.post('/site-content/whatsapp-gateway/', payload);
            setSetting(res.data.setting);
            setFeedback({
                type: 'success',
                message: res.data.message || `Nomor default sistem berhasil diubah ke: ${device.name}`
            });
        } catch (err) {
            console.error('Failed to set default device:', err);
            setFeedback({
                type: 'error',
                message: err.response?.data?.error || 'Gagal menyimpan nomor WhatsApp default.'
            });
        } finally {
            setSavingId(null);
        }
    };

    // Test Send Message
    const handleTestSend = async (e) => {
        e?.preventDefault();
        if (!testPhone.trim()) {
            alert('Harap masukkan nomor WhatsApp tujuan pengujian.');
            return;
        }

        try {
            setIsTesting(true);
            setTestResult(null);

            const payload = {
                phone: testPhone.trim(),
                message: testMessage.trim(),
                device_id: setting?.default_device_id || null
            };

            const res = await api.post('/site-content/whatsapp-gateway/test-send/', payload);
            setTestResult({
                type: 'success',
                message: res.data.message || 'Pesan tes berhasil terkirim ke WhatsApp tujuan!'
            });
        } catch (err) {
            console.error('Test send failed:', err);
            setTestResult({
                type: 'error',
                message: err.response?.data?.error || 'Gagal mengirim pesan tes WhatsApp.'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const currentDefaultId = setting?.default_device_id;
    const currentDefaultDevice = devices.find(d => d.id === currentDefaultId);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
            <Header />

            <div className="max-w-7xl mx-auto w-full px-4 py-6">
                {/* Breadcrumb & Navigation */}
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-4">
                    <Link to="/dashboard" className="hover:text-emerald-700">Dashboard</Link>
                    <span className="material-icons text-xs text-gray-400">chevron_right</span>
                    <span className="text-gray-700">Admin</span>
                    <span className="material-icons text-xs text-gray-400">chevron_right</span>
                    <span className="text-emerald-700 font-extrabold">Pengaturan Gateway WhatsApp</span>
                </div>

                {/* Hero Header Banner */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-teal-900 via-emerald-800 to-teal-950 text-white p-6 sm:p-8 mb-8 shadow-xl">
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-black uppercase tracking-wider">
                                <span className="material-icons text-xs text-amber-300">phonelink_setup</span>
                                <span>Default Transactional Gateway</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/10">
                                <span className="material-icons text-xs text-emerald-400">dns</span>
                                <span>{serverUrl}</span>
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                            Pilih Nomor WhatsApp Pengirim Utama
                        </h1>
                        <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                            Pilih akun WhatsApp yang dijadikan sebagai <strong>nomor pengirim default sistem</strong>. 
                            Seluruh pesan otomatis transaksi, pendaftaran, kwitansi, pesanan, dan verifikasi akun akan dikirimkan melalui nomor ini.
                        </p>
                    </div>

                    <div className="absolute right-4 bottom-0 opacity-15 pointer-events-none transform translate-y-4">
                        <span className="material-icons text-[140px]">settings_phone</span>
                    </div>
                </div>

                {/* Alert Feedback if Any */}
                {feedback && (
                    <div className={`p-4 rounded-2xl text-xs font-bold mb-6 flex items-center justify-between gap-3 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                            : 'bg-rose-50 border border-rose-300 text-rose-800'
                    }`}>
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-base">
                                {feedback.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            <span>{feedback.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column: Connected Devices Selection (7 Cols) */}
                    <div className="lg:col-span-7 space-y-6">

                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                                        <span className="material-icons text-lg">devices</span>
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-gray-900">Perangkat WhatsApp Terhubung</h2>
                                        <p className="text-xs text-gray-500">Pilih salah satu nomor di bawah ini sebagai pengirim default sistem</p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={fetchGatewayData}
                                    disabled={loading}
                                    className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition flex items-center gap-1"
                                >
                                    <span className={`material-icons text-xs ${loading ? 'animate-spin' : ''}`}>sync</span>
                                    <span>Segarkan</span>
                                </button>
                            </div>

                            {/* Connected Devices Cards */}
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                </div>
                            ) : devices.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-gray-200 text-gray-400 space-y-2">
                                    <span className="material-icons text-4xl text-gray-300">phonelink_off</span>
                                    <p className="text-xs font-bold text-gray-700">Tidak ada perangkat WhatsApp yang terhubung</p>
                                    <p className="text-[11px] max-w-sm mx-auto text-gray-500">
                                        Silakan hubungkan akun WhatsApp melalui server GoWA ({serverUrl}) terlebih dahulu.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3 pt-2">
                                    {devices.map((device) => {
                                        const isCurrentDefault = device.id === currentDefaultId;
                                        const isSaving = savingId === device.id;

                                        return (
                                            <div
                                                key={device.id}
                                                className={`p-5 rounded-3xl border transition-all duration-200 ${
                                                    isCurrentDefault
                                                        ? 'bg-emerald-50/70 border-emerald-400 shadow-md ring-2 ring-emerald-500/20'
                                                        : 'bg-white border-gray-200/80 hover:border-gray-300 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                                                            isCurrentDefault
                                                                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/25'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {device.name ? device.name.slice(0, 2).toUpperCase() : 'WA'}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="text-sm font-black text-gray-900 truncate">
                                                                    {device.name || 'WhatsApp Account'}
                                                                </h3>
                                                                {isCurrentDefault && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-700 text-white shadow-xs">
                                                                        <span className="material-icons text-[11px]">star</span>
                                                                        <span>Default Sistem Aktif</span>
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-xs font-mono font-bold text-gray-600 mt-0.5">
                                                                {device.phone ? `+${device.phone}` : device.jid}
                                                            </p>

                                                            <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                                                                ID: {device.id}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 self-center sm:self-auto w-full sm:w-auto justify-end">
                                                        {isCurrentDefault ? (
                                                            <div className="px-4 py-2 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center gap-1.5 border border-emerald-300">
                                                                <span className="material-icons text-sm text-emerald-700">check_circle</span>
                                                                <span>Terpilih</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetDefaultDevice(device)}
                                                                disabled={isSaving}
                                                                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm flex items-center gap-1.5"
                                                            >
                                                                {isSaving ? (
                                                                    <>
                                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                                        <span>Menyimpan...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="material-icons text-xs">radio_button_unchecked</span>
                                                                        <span>Jadikan Default Sistem</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Summary Note */}
                            <div className="mt-4 p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-xs text-gray-600 space-y-1">
                                <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                    <span className="material-icons text-sm text-emerald-600">info</span>
                                    <span>Bagaimana Pengaturan Ini Bekerja?</span>
                                </p>
                                <p className="text-[11px] leading-relaxed">
                                    Ketika nomor default diubah, seluruh fungsi pengiriman pesan otomatis (store order, sertifikat e-course, tiket event, donasi, login OTP) di backend akan langsung menggunakan nomor WhatsApp yang Anda pilih secara realtime tanpa perlu restart server.
                                </p>
                            </div>
                        </div>

                        {/* SECTION: Live Test Send Message */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                                    <span className="material-icons text-lg">send</span>
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900">Uji Coba Pengiriman Pesan (Test Send)</h2>
                                    <p className="text-xs text-gray-500">Pastikan nomor default dapat mengirim pesan ke nomor WhatsApp Anda</p>
                                </div>
                            </div>

                            <form onSubmit={handleTestSend} className="space-y-3 pt-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">
                                        Nomor WhatsApp Tujuan Tes:
                                    </label>
                                    <input
                                        type="text"
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="Contoh: 08123456789 atau +6281234567890"
                                        className="w-full p-3 rounded-2xl border border-gray-300 text-xs font-mono focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-700 block mb-1">
                                        Isi Pesan Uji Coba:
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={testMessage}
                                        onChange={(e) => setTestMessage(e.target.value)}
                                        className="w-full p-3 rounded-2xl border border-gray-300 text-xs leading-relaxed focus:ring-emerald-500 focus:border-emerald-500"
                                    ></textarea>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-[11px] text-gray-400">
                                        Mengirim via: <strong>{currentDefaultDevice?.name || 'Nomor Default Terpilih'}</strong>
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={isTesting || !testPhone.trim()}
                                        className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition"
                                    >
                                        {isTesting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                <span>Mengirim Tes...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-icons text-sm">send</span>
                                                <span>Kirim Pesan Tes</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {testResult && (
                                    <div className={`p-3.5 rounded-2xl text-xs font-bold mt-3 flex items-center gap-2 ${
                                        testResult.type === 'success'
                                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                            : 'bg-rose-50 border border-rose-300 text-rose-800'
                                    }`}>
                                        <span className="material-icons text-base">
                                            {testResult.type === 'success' ? 'check_circle' : 'error'}
                                        </span>
                                        <span>{testResult.message}</span>
                                    </div>
                                )}
                            </form>
                        </div>

                    </div>

                    {/* Right Column: Impacted Modules Overview (5 Cols) */}
                    <div className="lg:col-span-5 space-y-6">

                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4 sticky top-6">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-emerald-700 text-lg">auto_awesome</span>
                                <h3 className="text-sm font-black text-gray-900">Modul Sistem yang Terpengaruh</h3>
                            </div>

                            <p className="text-xs text-gray-500 leading-relaxed">
                                Pengaturan nomor default ini otomatis aktif dan mengontrol pengiriman notifikasi WhatsApp pada seluruh pilar layanan:
                            </p>

                            <div className="space-y-2.5">
                                {SYSTEM_MODULES.map((mod, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-2xl border flex items-start gap-3 transition ${
                                            mod.isException
                                                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                                : 'bg-slate-50/80 border-gray-200 text-gray-800'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                            mod.isException
                                                ? 'bg-amber-200 text-amber-900'
                                                : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                            <span className="material-icons text-base">{mod.icon}</span>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold truncate">{mod.title}</h4>
                                                {mod.isException && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                                                        Kustom
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 leading-normal mt-0.5">
                                                {mod.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                                <Link
                                    to="/dashboard/admin/broadcast-wa"
                                    className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                                >
                                    <span>Buka Menu Broadcast WhatsApp</span>
                                    <span className="material-icons text-xs">arrow_forward</span>
                                </Link>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardWhatsAppSettingsPage;
