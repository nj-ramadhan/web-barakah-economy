// pages/EventScanPage.js – Halaman Scan Kehadiran QR Code Event
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { Html5Qrcode } from 'html5-qrcode';
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
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [scanResult, setScanResult] = useState(null); // { status, message, registration }
    const [recentScans, setRecentScans] = useState([]);
    const [selectedSession, setSelectedSession] = useState('');
    const inputRef = useRef(null);
    const scannerRef = useRef(null); // To store Html5Qrcode instance

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
                if (res.data.sessions && res.data.sessions.length > 0) {
                    setSelectedSession(res.data.sessions[0].id);
                }
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
                { unique_code: cleanCode, session_id: selectedSession || null },
                getAuth()
            );
            setScanResult(res.data);
            fetchEvent(); // Re-fetch event to update attendance counters

            if (res.data.status === 'success') {
                setIsCameraOpen(false);
            }

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
    }, [slug]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleScan(manualCode);
    };

    const [cameras, setCameras] = useState([]);
    const [activeCameraIndex, setActiveCameraIndex] = useState(0);
    const [cameraLoading, setCameraLoading] = useState(false);

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                    console.log("Scanner stopped successfully");
                }
            } catch (err) {
                console.error("Scanner stop fail", err);
            }
        }
    };

    const startScanner = async (index = activeCameraIndex) => {
        if (!isCameraOpen) return;
        
        setCameraLoading(true);
        try {
            // Clean up previous instance if any
            await stopScanner();
            
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            let availableCameras = [];
            try {
                availableCameras = await Html5Qrcode.getCameras();
                setCameras(availableCameras);
            } catch (e) {
                console.error("Failed to get cameras", e);
            }

            let cameraId = { facingMode: "environment" };
            
            if (availableCameras.length > 0) {
                // If we have cameras, pick the one at index, or try to find a "back" camera on first load
                if (index === 0 && activeCameraIndex === 0) {
                    const backCam = availableCameras.find(c => 
                        c.label.toLowerCase().includes('back') || 
                        c.label.toLowerCase().includes('rear') ||
                        c.label.toLowerCase().includes('environment')
                    );
                    if (backCam) {
                        cameraId = backCam.id;
                        const idx = availableCameras.indexOf(backCam);
                        setActiveCameraIndex(idx);
                    } else {
                        cameraId = availableCameras[0].id;
                    }
                } else if (availableCameras[index]) {
                    cameraId = availableCameras[index].id;
                }
            }

            await scanner.start(
                cameraId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    handleScan(decodedText);
                    // Removed setIsCameraOpen(false) to allow continuous scanning
                },
                () => {} // silent error during framing
            );
        } catch (err) {
            console.error("Scanner start fail", err);
            // Fallback for some browsers
            if (err.toString().includes("Permission denied")) {
                alert("Izin kamera ditolak. Silakan berikan izin di pengaturan browser Anda.");
            } else {
                alert("Gagal membuka kamera: " + err);
            }
            setIsCameraOpen(false);
        } finally {
            setCameraLoading(false);
        }
    };

    const switchCamera = () => {
        if (cameras.length <= 1) return;
        const nextIndex = (activeCameraIndex + 1) % cameras.length;
        setActiveCameraIndex(nextIndex);
        startScanner(nextIndex);
    };

    useEffect(() => {
        if (isCameraOpen) {
            startScanner();
        } else {
            stopScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isCameraOpen]);

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
        <div className="body min-h-screen bg-gray-50 pb-20">
            <Helmet>
                <title>Scan Kehadiran – {event?.title || 'Event'}</title>
            </Helmet>
            <Header />
            <NavigationButton />

            <div className="max-w-md mx-auto px-4 py-6">
                {/* Header Event - More Compact */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white mb-4 shadow-lg shadow-purple-100">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons text-xl">qr_code_scanner</span>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-tight">Scan Kehadiran</h1>
                            <p className="text-purple-200 text-[10px] line-clamp-1">{event?.title}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm border border-white/10">
                            <p className="text-lg font-black">{event?.sessions && event.sessions.length > 0 ? event.sessions.length : 1}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">Sesi</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm border border-white/10">
                            <p className="text-lg font-black">{selectedSession ? (event?.sessions?.find(s => s.id == selectedSession)?.attendance_count || 0) : (event?.attended_count || 0)}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">Hadir</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-2 text-center backdrop-blur-sm border border-white/10">
                            <p className="text-lg font-black">{event?.registration_count || 0}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">Total</p>
                        </div>
                    </div>
                </div>

                {/* Session Selector - Horizontal Tabs */}
                {event?.sessions && event.sessions.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1 flex justify-between">
                            Pilih Sesi
                            <span className="text-purple-600">Sesi: {event.sessions.find(s => s.id == selectedSession)?.title || 'Umum'}</span>
                        </label>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
                            {event.sessions.map(ses => (
                                <button
                                    key={ses.id}
                                    onClick={() => setSelectedSession(ses.id)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 ${
                                        selectedSession == ses.id 
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200 scale-105' 
                                        : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-purple-200'
                                    }`}
                                >
                                    {ses.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Kode */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="KODE TIKET"
                            value={manualCode}
                            onChange={e => setManualCode(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            maxLength={20}
                            className="flex-1 px-4 py-3 bg-gray-50 border-2 border-purple-100 focus:border-purple-500 rounded-xl text-sm font-black text-center tracking-[0.2em] outline-none transition-all"
                            autoComplete="off"
                        />
                        <button
                            onClick={() => setIsCameraOpen(!isCameraOpen)}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-sm ${
                                isCameraOpen ? 'bg-red-500 text-white' : 'bg-purple-100 text-purple-600'
                            }`}
                            title="Buka Kamera"
                        >
                            <span className="material-icons">{isCameraOpen ? 'videocam_off' : 'photo_camera'}</span>
                        </button>
                    </div>

                    {isCameraOpen && (
                        <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="overflow-hidden rounded-xl border-2 border-purple-500 bg-black aspect-square max-h-[250px] mx-auto relative group">
                                <div id="qr-reader" className="w-full h-full"></div>
                                
                                {cameraLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                                        <div className="animate-spin w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full"></div>
                                    </div>
                                )}

                                <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30">
                                    <div className="w-full h-full border-2 border-purple-400 rounded-lg"></div>
                                </div>

                                {/* Switch Camera Button */}
                                {cameras.length > 1 && !cameraLoading && (
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            switchCamera();
                                        }}
                                        className="absolute bottom-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all z-20 active:scale-90"
                                        title="Switch Camera"
                                    >
                                        <span className="material-icons text-xl">flip_camera_ios</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-[9px] text-purple-600 font-bold mt-2 text-center uppercase tracking-widest">
                                {cameras.length > 1 ? 'Klik icon putar untuk ganti kamera' : 'Arahkan QR Code ke Kotak'}
                            </p>
                            {cameras.length > 0 && activeCameraIndex < cameras.length && (
                                <p className="text-[8px] text-gray-400 text-center mt-1 truncate px-4">
                                    Aktif: {cameras[activeCameraIndex].label || `Camera ${activeCameraIndex + 1}`}
                                </p>
                            )}
                        </div>
                    )}
                    
                    {!isCameraOpen && (
                        <div className="mt-2 text-center">
                             <button 
                                onClick={() => handleScan(manualCode)} 
                                disabled={scanning || !manualCode.trim()} 
                                className="text-[10px] font-black text-purple-600 uppercase tracking-widest py-1 px-4 rounded-full border border-purple-100 hover:bg-purple-50 disabled:opacity-30"
                             >
                                {scanning ? 'MEMPROSES...' : 'KIRIM MANUAL'}
                             </button>
                        </div>
                    )}
                </div>

                {/* Hasil Scan - Overlay compact */}
                {scanResult && (
                    <div className={`rounded-xl overflow-hidden mb-4 shadow-md border animate-in zoom-in-95 ${
                        scanResult.status === 'success' ? 'bg-emerald-50 border-emerald-200' :
                        scanResult.status === 'already_attended' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
                    }`}>
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <span className={`material-icons text-2xl ${
                                    scanResult.status === 'success' ? 'text-emerald-600' :
                                    scanResult.status === 'already_attended' ? 'text-orange-600' : 'text-red-600'
                                }`}>{resultIcon[scanResult.status] || 'info'}</span>
                                <div className="flex-1">
                                    <p className={`font-black text-xs uppercase tracking-widest ${
                                        scanResult.status === 'success' ? 'text-emerald-800' :
                                        scanResult.status === 'already_attended' ? 'text-orange-800' : 'text-red-800'
                                    }`}>
                                        {scanResult.status === 'success' ? 'Berhasil Terpindai' :
                                         scanResult.status === 'already_attended' ? 'Sudah Ada Data' : 'Gagal Verifikasi'}
                                    </p>
                                    <p className="text-[10px] text-gray-600 font-medium leading-tight">
                                        {scanResult.message} 
                                        {event?.sessions?.length > 0 && selectedSession && (
                                            <span className="block mt-1 font-bold text-[9px] text-purple-700 uppercase">
                                                Sesi: {event.sessions.find(s => Number(s.id) === Number(selectedSession))?.title}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Riwayat Scan */}
                {recentScans.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <span className="material-icons text-xs">history</span>
                                Riwayat Scan
                            </h2>
                            <span className="text-[10px] font-bold text-white bg-purple-500 px-2 rounded-full">{recentScans.length}</span>
                        </div>
                        <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                            {recentScans.map((scan, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2 transition hover:bg-gray-50">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        scan.scanStatus === 'success' ? 'bg-emerald-100' : 
                                        scan.scanStatus === 'already_attended' ? 'bg-orange-100' : 'bg-red-100'
                                    }`}>
                                        <span className={`material-icons text-[14px] ${
                                            scan.scanStatus === 'success' ? 'text-emerald-600' : 
                                            scan.scanStatus === 'already_attended' ? 'text-orange-600' : 'text-red-600'
                                        }`}>
                                            {scan.scanStatus === 'success' ? 'check' : 
                                             scan.scanStatus === 'already_attended' ? 'priority_high' : 'close'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-700 truncate capitalize">{scan.name || 'Hamba Allah'}</p>
                                        <p className="text-[9px] text-gray-400 font-mono tracking-tighter">{scan.unique_code}</p>
                                    </div>
                                    <span className="text-[8px] font-bold text-gray-400 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded-full">{scan.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link
                        to={`/dashboard/event/submissions/${slug}`}
                        className="text-purple-600 text-[11px] font-black uppercase tracking-widest hover:underline flex items-center justify-center gap-1"
                    >
                        <span className="material-icons text-sm">group</span>
                        Data Pendaftar & Kehadiran
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default EventScanPage;
