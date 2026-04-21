// pages/EventScanPage.js – Halaman Scan Kehadiran QR Code Event
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;

const EventScanPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [manualCode, setManualCode] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null); // { status, message, registration }
    const [recentScans, setRecentScans] = useState([]);
    const inputRef = useRef(null);

    const getAuth = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return { headers: { Authorization: `Bearer ${user?.access}` } };
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) { navigate('/login'); return; }

        const fetchEvent = async () => {
            try {
                const res = await axios.get(`${API}/api/events/${slug}/`, getAuth());
                setEvent(res.data);
            } catch {
                navigate('/dashboard/my-events');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [slug, navigate]);

    // Auto-focus input saat halaman dibuka
    useEffect(() => {
        if (!loading && inputRef.current) {
            inputRef.current.focus();
        }
    }, [loading]);

    const handleScan = useCallback(async (code = manualCode) => {
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) return;

        setScanning(true);
        setScanResult(null);
        try {
            const res = await axios.post(
                `${API}/api/events/${slug}/scan_attendance/`,
                { unique_code: cleanCode },
                getAuth()
            );
            setScanResult(res.data);

            // Tambahkan ke recent scans
            setRecentScans(prev => [{
                ...res.data.registration,
                scanStatus: res.data.status,
                message: res.data.message,
                time: new Date().toLocaleTimeString('id-ID'),
            }, ...prev.slice(0, 19)]);

            setManualCode('');
            if (inputRef.current) inputRef.current.focus();
        } catch (err) {
            setScanResult({
                status: 'error',
                message: err.response?.data?.error || 'Gagal memproses kode.',
            });
        } finally {
            setScanning(false);
        }
    }, [manualCode, slug]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleScan();
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
        </div>
    );

    const resultColor = {
        success: 'from-green-500 to-emerald-500',
        already_attended: 'from-yellow-500 to-orange-400',
        error: 'from-red-500 to-pink-500',
    };
    const resultIcon = {
        success: 'check_circle',
        already_attended: 'warning',
        error: 'cancel',
    };

    return (
        <div className="body min-h-screen bg-gray-50 pb-24">
            <Helmet>
                <title>Scan Kehadiran – {event?.title || 'Event'}</title>
            </Helmet>
            <Header />

            <div className="max-w-lg mx-auto px-4 py-6">
                {/* Header Event */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white mb-6 shadow-xl shadow-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="material-icons text-3xl">qr_code_scanner</span>
                        <div>
                            <h1 className="text-lg font-black">Scan Kehadiran</h1>
                            <p className="text-purple-200 text-xs line-clamp-1">{event?.title}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-white/20 rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black">{recentScans.length}</p>
                            <p className="text-[10px] uppercase tracking-widest">Scan Sesi Ini</p>
                        </div>
                        <div className="bg-white/20 rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black">{recentScans.filter(r => r.scanStatus === 'success').length}</p>
                            <p className="text-[10px] uppercase tracking-widest">Berhasil</p>
                        </div>
                        <div className="bg-white/20 rounded-2xl p-3 text-center">
                            <p className="text-2xl font-black">{event?.registration_count || 0}</p>
                            <p className="text-[10px] uppercase tracking-widest">Total Peserta</p>
                        </div>
                    </div>
                </div>

                {/* Input Kode */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 mb-4">
                    <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="material-icons text-purple-600">keyboard</span>
                        Input Kode Tiket
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">
                        Scan QR Code peserta menggunakan scanner eksternal (kode otomatis terdeteksi), 
                        atau ketik kode 8 karakter secara manual.
                    </p>
                    <div className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Contoh: A1B2C3D4"
                            value={manualCode}
                            onChange={e => setManualCode(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            maxLength={20}
                            className="flex-1 px-4 py-3.5 bg-gray-50 border-2 border-purple-200 focus:border-purple-500 rounded-2xl text-lg font-black text-center tracking-[0.3em] uppercase outline-none transition"
                            autoComplete="off"
                        />
                        <button
                            onClick={() => handleScan()}
                            disabled={scanning || !manualCode.trim()}
                            className="px-5 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {scanning ? (
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            ) : (
                                <span className="material-icons">send</span>
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                        Tekan Enter atau klik tombol untuk konfirmasi kehadiran
                    </p>
                </div>

                {/* Hasil Scan */}
                {scanResult && (
                    <div className={`rounded-3xl overflow-hidden mb-4 shadow-lg`}>
                        <div className={`bg-gradient-to-r ${resultColor[scanResult.status] || 'from-gray-400 to-gray-500'} p-6 text-white`}>
                            <div className="flex items-center gap-3">
                                <span className="material-icons text-4xl">{resultIcon[scanResult.status] || 'info'}</span>
                                <div>
                                    <p className="font-black text-lg">
                                        {scanResult.status === 'success' ? 'Selamat Datang!' :
                                         scanResult.status === 'already_attended' ? 'Sudah Hadir' : 'Kode Tidak Valid'}
                                    </p>
                                    <p className="text-white/90 text-sm">{scanResult.message}</p>
                                </div>
                            </div>
                            {scanResult.registration && (
                                <div className="mt-4 bg-white/20 rounded-2xl p-4">
                                    <p className="text-xs text-white/70 uppercase tracking-widest font-bold mb-1">Peserta</p>
                                    <p className="font-black text-xl">{scanResult.registration.name}</p>
                                    <p className="text-white/80 text-xs font-mono mt-1">{scanResult.registration.unique_code}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Riwayat Scan */}
                {recentScans.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-50">
                            <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                <span className="material-icons text-purple-600 text-sm">history</span>
                                Riwayat Scan ({recentScans.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                            {recentScans.map((scan, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                        scan.scanStatus === 'success' ? 'bg-green-100' : 
                                        scan.scanStatus === 'already_attended' ? 'bg-yellow-100' : 'bg-red-100'
                                    }`}>
                                        <span className={`material-icons text-sm ${
                                            scan.scanStatus === 'success' ? 'text-green-600' : 
                                            scan.scanStatus === 'already_attended' ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                            {scan.scanStatus === 'success' ? 'check' : 
                                             scan.scanStatus === 'already_attended' ? 'warning' : 'close'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{scan.name || 'Unknown'}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{scan.unique_code}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 shrink-0">{scan.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Link ke Daftar Peserta */}
                <div className="mt-4 text-center">
                    <Link
                        to={`/dashboard/event/submissions/${slug}`}
                        className="text-purple-600 text-sm font-bold hover:underline flex items-center justify-center gap-1"
                    >
                        <span className="material-icons text-sm">group</span>
                        Lihat semua daftar peserta & kehadiran
                    </Link>
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default EventScanPage;
