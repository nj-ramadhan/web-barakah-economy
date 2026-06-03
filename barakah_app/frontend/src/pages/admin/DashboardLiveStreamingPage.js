import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;

const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

// ─── Hook: Anti-Logout JWT Auto-Refresher ─────────────────────────────────────
const useKeepAlive = (isLiveActive) => {
    const intervalRef = useRef(null);
    const [sessionWarning, setSessionWarning] = useState(false);

    const refreshToken = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user?.refresh) return;

            const res = await axios.post(
                `${API}/api/streaming/extend-session/`,
                { refresh: user.refresh },
                getAuth()
            );

            if (res.data?.access) {
                // Silently update the access token in localStorage
                const updatedUser = { ...user, access: res.data.access };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setSessionWarning(false);
            }
        } catch (err) {
            console.warn('Gagal refresh sesi live:', err);
            setSessionWarning(true);
        }
    }, []);

    useEffect(() => {
        if (isLiveActive) {
            // Refresh immediately when live starts
            refreshToken();
            // Then refresh every 4 minutes (tokens typically expire in 5-10 min)
            intervalRef.current = setInterval(refreshToken, 4 * 60 * 1000);
        } else {
            clearInterval(intervalRef.current);
            setSessionWarning(false);
        }
        return () => clearInterval(intervalRef.current);
    }, [isLiveActive, refreshToken]);

    return { sessionWarning };
};

// ─── Hook: WebRTC WHIP Publisher ──────────────────────────────────────────────
const useWhipPublisher = () => {
    const pcRef = useRef(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [whipError, setWhipError] = useState('');
    const [localStream, setLocalStream] = useState(null);
    const [facingMode, setFacingMode] = useState('environment'); // 'environment'=belakang, 'user'=depan

    const startStream = useCallback(async (whipUrl) => {
        setWhipError('');
        try {
            // 1. Get camera + mic stream from HP
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });
            setLocalStream(stream);

            // 2. Create RTCPeerConnection
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pcRef.current = pc;

            // 3. Add tracks to peer connection
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // 4. Create SDP offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 5. Wait for ICE gathering to complete
            await new Promise((resolve) => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    pc.addEventListener('icegatheringstatechange', () => {
                        if (pc.iceGatheringState === 'complete') resolve();
                    });
                    // Timeout fallback after 5 seconds
                    setTimeout(resolve, 5000);
                }
            });

            // 6. Send SDP offer to MediaMTX WHIP endpoint
            const response = await fetch(whipUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription.sdp,
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`WHIP server error ${response.status}: ${errText}`);
            }

            // 7. Apply SDP answer from server
            const answerSdp = await response.text();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

            setIsPublishing(true);
            return true;

        } catch (err) {
            console.error('Gagal memulai WHIP stream:', err);
            setWhipError(
                err.name === 'NotAllowedError'
                    ? 'Izin kamera/mikrofon ditolak. Berikan akses di pengaturan browser Anda.'
                    : err.name === 'NotFoundError'
                    ? 'Kamera tidak ditemukan pada perangkat ini.'
                    : `Gagal terhubung ke server: ${err.message}`
            );
            return false;
        }
    }, [facingMode]);

    const stopStream = useCallback(async (whipUrl) => {
        // Stop all media tracks
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            setLocalStream(null);
        }
        // Close peer connection
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        // Send WHIP DELETE to notify server
        try {
            await fetch(whipUrl, { method: 'DELETE' });
        } catch (e) { /* ignore */ }
        setIsPublishing(false);
    }, [localStream]);

    const toggleFacing = useCallback(async (whipUrl) => {
        if (isPublishing) {
            // Stop current stream and restart with new facing mode
            await stopStream(whipUrl);
            setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        } else {
            setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
        }
    }, [isPublishing, stopStream]);

    return { isPublishing, whipError, localStream, facingMode, startStream, stopStream, toggleFacing, setWhipError };
};


// ─── Main Dashboard Component ──────────────────────────────────────────────────
const DashboardLiveStreamingPage = () => {
    const navigate = useNavigate();
    
    // Streaming States
    const [streamSettings, setStreamSettings] = useState(null);
    const [streamTitle, setStreamTitle] = useState('');
    const [streamDesc, setStreamDesc] = useState('');
    const [isStreamLive, setIsStreamLive] = useState(false);
    const [latencyMode, setLatencyMode] = useState('low');
    const [saveRecording, setSaveRecording] = useState(true);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState('');
    const [recordings, setRecordings] = useState([]);
    const [loadingRec, setLoadingRec] = useState(false);
    const [savingStream, setSavingStream] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);

    // HP Live tab state
    const [activeTab, setActiveTab] = useState('obs'); // 'obs' | 'hp'
    const [hpLiveLoading, setHpLiveLoading] = useState(false);
    const videoPreviewRef = useRef(null);

    // WebRTC hook
    const {
        isPublishing,
        whipError,
        localStream,
        facingMode,
        startStream,
        stopStream,
        toggleFacing,
        setWhipError,
    } = useWhipPublisher();

    // Anti-logout hook — active when OBS is live OR HP is publishing
    const isAnyLiveActive = isStreamLive || isPublishing;
    const { sessionWarning } = useKeepAlive(isAnyLiveActive);

    // Attach local camera stream to video preview element
    useEffect(() => {
        if (videoPreviewRef.current && localStream) {
            videoPreviewRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Re-start stream after facing mode change
    const pendingRestartRef = useRef(false);
    useEffect(() => {
        if (pendingRestartRef.current && !isPublishing && streamSettings?.whip_url) {
            pendingRestartRef.current = false;
            handleStartHpLive();
        }
        // eslint-disable-next-line
    }, [facingMode, isPublishing]);

    const fetchStreamSettings = useCallback(async (isInitial = false) => {
        try {
            const res = await axios.get(`${API}/api/streaming/settings/`, getAuth());
            setStreamSettings(res.data);
            
            // Only overwrite inputs on initial load to prevent wiping out what admin is typing!
            if (isInitial) {
                setStreamTitle(res.data.title || '');
                setStreamDesc(res.data.description || '');
                setIsStreamLive(res.data.is_live || false);
                setLatencyMode(res.data.latency_mode || 'low');
                setSaveRecording(res.data.save_recording !== false);
                setThumbnailPreview(res.data.thumbnail ? `${API}${res.data.thumbnail}` : '');
            }
        } catch (err) {
            console.error('Gagal mengambil settings streaming:', err);
        } finally {
            setLoadingSettings(false);
        }
    }, []);

    const fetchRecordings = useCallback(async () => {
        setLoadingRec(true);
        try {
            const res = await axios.get(`${API}/api/streaming/recordings/`, getAuth());
            setRecordings(res.data.results || res.data);
        } catch (err) {
            console.error('Gagal mengambil rekaman:', err);
        } finally {
            setLoadingRec(false);
        }
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }
        fetchStreamSettings(true);
        fetchRecordings();

        // Poll streaming settings (for active OBS status checks) every 10 seconds
        const pollInterval = setInterval(() => {
            fetchStreamSettings(false);
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [navigate, fetchStreamSettings, fetchRecordings]);

    const handleSaveStreamSettings = async (e) => {
        e.preventDefault();
        setSavingStream(true);
        try {
            const formData = new FormData();
            formData.append('title', streamTitle);
            formData.append('description', streamDesc);
            formData.append('is_live', isStreamLive);
            formData.append('latency_mode', latencyMode);
            formData.append('save_recording', saveRecording);
            if (thumbnailFile) {
                formData.append('thumbnail', thumbnailFile);
            }

            const auth = getAuth();
            const config = {
                headers: {
                    ...auth.headers,
                    'Content-Type': 'multipart/form-data'
                }
            };

            const res = await axios.patch(
                `${API}/api/streaming/settings/`,
                formData,
                config
            );
            alert('Pengaturan live streaming berhasil disimpan!');
            setStreamSettings(res.data);
            if (res.data.thumbnail) {
                setThumbnailPreview(`${API}${res.data.thumbnail}`);
                setThumbnailFile(null);
            }
        } catch (err) {
            console.error('Gagal menyimpan setelan streaming:', err);
            alert('Gagal menyimpan setelan.');
        } finally {
            setSavingStream(false);
        }
    };

    const handleRegenerateStreamKey = async () => {
        if (!window.confirm('Apakah Anda yakin ingin meregenerasi stream key? Key lama di OBS Anda tidak akan berfungsi lagi. Jika ada live via HP, siaran tersebut juga akan terputus.')) return;
        try {
            const res = await axios.post(`${API}/api/streaming/settings/`, {}, getAuth());
            alert(res.data.message);
            setStreamSettings(prev => ({ ...prev, stream_key: res.data.stream_key, whip_url: res.data.whip_url }));
            fetchStreamSettings();
        } catch (err) {
            console.error('Gagal meregenerasi stream key:', err);
            alert('Gagal meregenerasi stream key.');
        }
    };

    const handleSyncRecordings = async () => {
        try {
            const res = await axios.post(`${API}/api/streaming/recordings/sync_recordings/`, {}, getAuth());
            alert(res.data.message);
            fetchRecordings();
        } catch (err) {
            console.error('Gagal sinkronisasi rekaman:', err);
        }
    };

    const handleDeleteRecording = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus rekaman ini secara permanen dari VPS untuk menghemat memori? Tindakan ini tidak dapat dibatalkan.')) return;
        try {
            await axios.delete(`${API}/api/streaming/recordings/${id}/`, getAuth());
            alert('Rekaman berhasil dihapus permanen.');
            fetchRecordings();
        } catch (err) {
            console.error('Gagal menghapus rekaman:', err);
            alert('Gagal menghapus rekaman.');
        }
    };

    // ─── HP LIVE CONTROLS ──────────────────────────────────────────────────────

    const handleStartHpLive = async () => {
        if (!streamSettings?.whip_url) {
            alert('Konfigurasi server belum siap. Refresh halaman dan coba lagi.');
            return;
        }
        setHpLiveLoading(true);
        setWhipError('');
        try {
            const success = await startStream(streamSettings.whip_url);
            if (success) {
                // Notify backend that HP stream has started
                await axios.post(`${API}/api/streaming/whip-status/`, { action: 'start' }, getAuth());
                fetchStreamSettings(false);
            }
        } finally {
            setHpLiveLoading(false);
        }
    };

    const handleStopHpLive = async () => {
        if (!window.confirm('Hentikan siaran live via HP? Penonton akan kehilangan akses ke stream ini.')) return;
        setHpLiveLoading(true);
        try {
            await stopStream(streamSettings?.whip_url || '');
            // Notify backend that HP stream has stopped
            await axios.post(`${API}/api/streaming/whip-status/`, { action: 'stop' }, getAuth());
            fetchStreamSettings(false);
        } finally {
            setHpLiveLoading(false);
        }
    };

    const handleSwitchCamera = async () => {
        if (isPublishing) {
            // Stop → change facing → restart
            await stopStream(streamSettings?.whip_url || '');
            pendingRestartRef.current = true;
        }
        toggleFacing(streamSettings?.whip_url || '');
    };

    const isHpStreamingDb = streamSettings?.is_hp_streaming_active;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-20 w-full overflow-x-hidden">
            <Helmet><title>Manajemen Live Streaming | BARAKAH APP</title></Helmet>
            <Header />

            <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6 min-w-0">
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-indigo-700 transition"
                        >
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-gray-900 leading-tight">Manajemen Live Streaming</h1>
                            <p className="text-xs text-gray-400 mt-0.5">Live via HP langsung dari browser · OBS Studio · Kelola rekaman VPS</p>
                        </div>
                    </div>
                    {/* Global live status badge */}
                    {streamSettings && (
                        <div className="flex items-center gap-2">
                            {isPublishing && (
                                <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider animate-pulse shadow-lg shadow-red-200">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                                    LIVE via HP
                                </span>
                            )}
                            {streamSettings.is_obs_active && !isPublishing && (
                                <span className="flex items-center gap-1.5 bg-green-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-green-200">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                    LIVE via OBS
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Session Warning Banner ── */}
                {sessionWarning && (
                    <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <span className="material-icons text-amber-500">warning</span>
                        <div>
                            <p className="text-xs font-black text-amber-800">Peringatan Sesi</p>
                            <p className="text-[10px] text-amber-600 mt-0.5">
                                Gagal memperpanjang sesi otomatis. Siaran tetap berjalan, namun login mungkin akan expired. Simpan pekerjaan Anda.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Anti-logout Active Banner ── */}
                {isAnyLiveActive && !sessionWarning && (
                    <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                        <span className="material-icons text-green-600 text-sm">shield</span>
                        <p className="text-[10px] font-semibold text-green-700">
                            <strong>Sesi Dilindungi</strong> — Selama siaran berlangsung, token login Anda diperpanjang otomatis setiap 4 menit. Logout manual juga diblokir untuk mencegah gangguan.
                        </p>
                    </div>
                )}

                {loadingSettings ? (
                    <div className="text-center py-20">
                        <span className="material-icons animate-spin text-4xl text-indigo-500 block mx-auto mb-3">sync</span>
                        <p className="text-gray-400 text-sm">Memuat pengaturan streaming...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* LEFT FORM: Streaming Control */}
                        <div className="lg:col-span-5 flex flex-col gap-5">

                            {/* ── Tab Switcher ── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
                                <button
                                    onClick={() => setActiveTab('hp')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition ${
                                        activeTab === 'hp'
                                            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-100'
                                            : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="material-icons text-sm">smartphone</span>
                                    Live via HP
                                    {isPublishing && (
                                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('obs')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition ${
                                        activeTab === 'obs'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                            : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="material-icons text-sm">computer</span>
                                    OBS Studio
                                    {streamSettings?.is_obs_active && (
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                                    )}
                                </button>
                            </div>

                            {/* ══ TAB: LIVE VIA HP ══ */}
                            {activeTab === 'hp' && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-red-500 to-pink-500 px-5 py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-black text-white">Live Langsung dari HP</h3>
                                                <p className="text-[10px] text-red-100 mt-0.5">Tanpa OBS · Tanpa software tambahan · Langsung dari browser</p>
                                            </div>
                                            {isPublishing && (
                                                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1 rounded-full">
                                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                                    <span className="text-[10px] font-black text-white uppercase">ON AIR</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        {/* Camera Preview */}
                                        <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-200">
                                            {localStream ? (
                                                <video
                                                    ref={videoPreviewRef}
                                                    autoPlay
                                                    muted
                                                    playsInline
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                                    <span className="material-icons text-white/30 text-5xl mb-3">videocam_off</span>
                                                    <p className="text-white/40 text-xs">Preview kamera akan muncul di sini</p>
                                                    <p className="text-white/25 text-[9px] mt-1">Klik "Mulai Live" untuk mengaktifkan kamera</p>
                                                </div>
                                            )}
                                            {/* Live indicator overlay */}
                                            {isPublishing && (
                                                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full">
                                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                                    <span className="text-[9px] font-black text-white uppercase tracking-wider">LIVE</span>
                                                </div>
                                            )}
                                            {/* Camera switch button */}
                                            {localStream && (
                                                <button
                                                    onClick={handleSwitchCamera}
                                                    className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/60 transition"
                                                    title="Ganti kamera depan/belakang"
                                                >
                                                    <span className="material-icons text-sm">flip_camera_android</span>
                                                </button>
                                            )}
                                            {/* Viewer count overlay */}
                                            {isPublishing && streamSettings?.viewer_count > 0 && (
                                                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur px-2.5 py-1 rounded-full">
                                                    <span className="material-icons text-white text-xs">visibility</span>
                                                    <span className="text-[10px] font-bold text-white">{streamSettings.viewer_count} menonton</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Error message */}
                                        {whipError && (
                                            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                                                <span className="material-icons text-red-500 text-sm flex-shrink-0 mt-0.5">error</span>
                                                <p className="text-[10px] text-red-700 leading-relaxed">{whipError}</p>
                                            </div>
                                        )}

                                        {/* Camera selection info */}
                                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-100">
                                            <span className="material-icons text-gray-400 text-sm">
                                                {facingMode === 'environment' ? 'camera_rear' : 'camera_front'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-bold text-gray-700">
                                                    Kamera {facingMode === 'environment' ? 'Belakang (Rear)' : 'Depan (Selfie)'}
                                                </p>
                                                <p className="text-[9px] text-gray-400">Gunakan tombol flip untuk berganti kamera</p>
                                            </div>
                                        </div>

                                        {/* DB Sync Warning (if DB says HP live but local not publishing) */}
                                        {isHpStreamingDb && !isPublishing && (
                                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                                <span className="material-icons text-amber-500 text-sm flex-shrink-0">info</span>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-800">Siaran HP Terdeteksi Aktif</p>
                                                    <p className="text-[10px] text-amber-600 mt-0.5 leading-relaxed">
                                                        Server mendeteksi siaran HP aktif dari sesi lain. Jika siaran sudah berhenti, klik "Hentikan Paksa" di bawah.
                                                    </p>
                                                    <button
                                                        onClick={() => axios.post(`${API}/api/streaming/whip-status/`, { action: 'stop' }, getAuth()).then(() => fetchStreamSettings(false))}
                                                        className="mt-2 text-[9px] font-black text-red-600 hover:underline"
                                                    >
                                                        Hentikan Paksa →
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Start / Stop Button */}
                                        {!isPublishing ? (
                                            <button
                                                onClick={handleStartHpLive}
                                                disabled={hpLiveLoading}
                                                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider hover:from-red-600 hover:to-pink-600 transition shadow-lg shadow-red-100 disabled:opacity-60"
                                            >
                                                {hpLiveLoading ? (
                                                    <>
                                                        <span className="material-icons animate-spin text-base">sync</span>
                                                        Menghubungkan ke Server...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-icons text-base">play_circle_filled</span>
                                                        Mulai Live dari HP
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleStopHpLive}
                                                disabled={hpLiveLoading}
                                                className="w-full flex items-center justify-center gap-2.5 bg-gray-800 text-white py-3.5 rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-gray-900 transition shadow-lg disabled:opacity-60"
                                            >
                                                {hpLiveLoading ? (
                                                    <>
                                                        <span className="material-icons animate-spin text-base">sync</span>
                                                        Menghentikan...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-icons text-base">stop_circle</span>
                                                        Stop Live
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {/* Info box */}
                                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 space-y-1.5">
                                            <div className="flex items-center gap-1.5 text-blue-700">
                                                <span className="material-icons text-sm">tips_and_updates</span>
                                                <p className="text-[10px] font-black uppercase tracking-wider">Tips Live via HP</p>
                                            </div>
                                            <ul className="text-[10px] text-blue-700/80 space-y-0.5 list-disc list-inside leading-relaxed">
                                                <li>Pastikan koneksi internet HP stabil (WiFi / 4G)</li>
                                                <li>Izinkan akses kamera & mikrofon saat diminta</li>
                                                <li>Gunakan kamera belakang untuk kualitas terbaik</li>
                                                <li>Sesi login terlindungi otomatis selama live berlangsung</li>
                                                <li>Layar HP tidak akan terkunci saat streaming aktif</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══ TAB: OBS STUDIO ══ */}
                            {activeTab === 'obs' && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <h3 className="text-sm font-black text-gray-900">Kontrol & Parameter Live</h3>
                                        {streamSettings && (
                                            <div className="flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-full ${streamSettings.is_obs_active ? 'bg-green-500 animate-ping' : 'bg-gray-400'}`}></span>
                                                <span className={`w-2 h-2 rounded-full ${streamSettings.is_obs_active ? 'bg-green-500' : 'bg-gray-400'} -ml-3`}></span>
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${streamSettings.is_obs_active ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {streamSettings.is_obs_active ? `ON STREAM (${streamSettings.viewer_count || 0} Menonton)` : 'OFF STREAM'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <form onSubmit={handleSaveStreamSettings} className="space-y-4">
                                        {/* Toggle Live status */}
                                        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div>
                                                <p className="text-xs font-black text-gray-800">Status Live Streaming</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">Aktifkan untuk menampilkan popup beranda</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isStreamLive} 
                                                    onChange={(e) => setIsStreamLive(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {/* Toggle Save Recording status */}
                                        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div>
                                                <p className="text-xs font-black text-gray-800">Simpan Rekaman Siaran</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">Simpan otomatis hasil live di riwayat VPS</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={saveRecording} 
                                                    onChange={(e) => setSaveRecording(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>

                                        {/* Title input */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Judul Streaming</label>
                                            <input 
                                                type="text" 
                                                placeholder="Ketik judul live stream..."
                                                value={streamTitle}
                                                onChange={(e) => setStreamTitle(e.target.value)}
                                                className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400 transition"
                                                required
                                            />
                                        </div>

                                        {/* Description input */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi Streaming</label>
                                            <textarea 
                                                placeholder="Ketik deskripsi atau info kajian..."
                                                value={streamDesc}
                                                onChange={(e) => setStreamDesc(e.target.value)}
                                                rows={3}
                                                className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
                                            />
                                        </div>

                                        {/* Thumbnail Preview & Upload */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thumbnail Sharing & Poster</label>
                                            <div className="flex gap-4 items-center bg-gray-50 border border-gray-200 rounded-2xl p-3">
                                                {/* Preview Image */}
                                                <div className="w-16 h-10 bg-gray-200 border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                                                    {thumbnailPreview ? (
                                                        <img src={thumbnailPreview} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="material-icons text-gray-400 text-lg">image</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <label className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer hover:bg-indigo-100 hover:text-indigo-800 transition">
                                                        Pilih Gambar
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    setThumbnailFile(file);
                                                                    setThumbnailPreview(URL.createObjectURL(file));
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                    <p className="text-[8px] text-gray-400 mt-1 truncate">
                                                        {thumbnailFile ? thumbnailFile.name : 'Format JPEG/PNG. Opsional.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Latency Mode Choice */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pilihan Latency (Delay Pemutar)</label>
                                            <select
                                                value={latencyMode}
                                                onChange={(e) => setLatencyMode(e.target.value)}
                                                className="w-full text-xs border border-gray-200 rounded-xl px-3.5 py-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400 transition"
                                            >
                                                <option value="low">Low Latency (Delay ~2-3 detik, Terbaik untuk Chat Interaktif)</option>
                                                <option value="standard">Standard Latency (Delay ~10-15 detik, Buffer Tebal & Lebih Stabil)</option>
                                            </select>
                                            <p className="text-[9px] text-gray-400 leading-normal mt-0.5">
                                                * Pilih Standard Latency jika banyak penonton mengeluhkan buffering karena koneksi internet lambat.
                                            </p>
                                        </div>

                                        {/* Save Button */}
                                        <button
                                            type="submit"
                                            disabled={savingStream}
                                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-60"
                                        >
                                            <span className="material-icons text-sm">{savingStream ? 'sync' : 'save'}</span>
                                            {savingStream ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                        </button>
                                    </form>

                                    {/* OBS Info Block */}
                                    {streamSettings && (
                                        <div className="pt-4 border-t border-gray-50 space-y-3.5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Konfigurasi OBS Studio</h4>
                                                <button 
                                                    onClick={handleRegenerateStreamKey}
                                                    className="text-[9px] text-red-500 font-bold hover:underline"
                                                    title="Ganti Stream Key lama. Ini juga akan langsung mematikan/memutuskan koneksi OBS aktif dan Live via HP (Force Off-Stream)"
                                                >
                                                    Regenerasi Stream Key
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Server URL</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input 
                                                            type="text" 
                                                            value={streamSettings.rtmp_url || 'rtmp://barakah.cloud:1935/live'} 
                                                            readOnly 
                                                            className="flex-1 bg-gray-50 text-[10px] font-mono border border-gray-200 rounded-lg px-2 py-1 outline-none select-all" 
                                                        />
                                                        <button 
                                                            onClick={() => { navigator.clipboard.writeText(streamSettings.rtmp_url || 'rtmp://barakah.cloud:1935/live'); alert('RTMP URL disalin!'); }} 
                                                            className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-indigo-600 transition"
                                                        >
                                                            <span className="material-icons text-xs">content_copy</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Stream Key</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <input 
                                                            type="text" 
                                                            value={streamSettings.stream_key || ''} 
                                                            readOnly 
                                                            className="flex-1 bg-gray-50 text-[10px] font-mono border border-gray-200 rounded-lg px-2 py-1 outline-none select-all" 
                                                        />
                                                        <button 
                                                            onClick={() => { navigator.clipboard.writeText(streamSettings.stream_key || ''); alert('Stream Key disalin!'); }} 
                                                            className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 hover:text-indigo-600 transition"
                                                        >
                                                            <span className="material-icons text-xs">content_copy</span>
                                                        </button>
                                                    </div>
                                                    <p className="text-[8px] text-red-500 font-semibold leading-normal mt-1">
                                                        * Klik "Regenerasi Stream Key" di atas untuk memutuskan siaran OBS aktif secara paksa (Force Off-Stream) dari web.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Latency & OBS Guide Block */}
                                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 bg-indigo-50/25 p-3.5 rounded-2xl border border-indigo-100/40">
                                        <div className="flex items-center gap-1.5 text-indigo-700">
                                            <span className="material-icons text-sm">bolt</span>
                                            <h4 className="text-[10px] font-black uppercase tracking-wider">Panduan Ultra-Low Latency (~2s Delay)</h4>
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-normal">
                                            Server RTMP Anda telah dioptimalkan secara otomatis untuk <strong>Low Latency</strong>. Supaya delay sangat minim, atur <strong>OBS Studio</strong> Anda sebagai berikut:
                                        </p>
                                        <ul className="text-[10px] text-gray-600 list-disc list-inside space-y-1 mt-1 font-semibold">
                                            <li><strong>Keyframe Interval:</strong> 1 atau 2 detik (wajib)</li>
                                            <li><strong>Rate Control:</strong> CBR (Constant Bitrate)</li>
                                            <li><strong>Tune:</strong> zerolatency (krusial untuk interaksi chat)</li>
                                            <li><strong>Profile:</strong> baseline atau main</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* RIGHT GRID: Recordings Management */}
                        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-full space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-50 pb-3 flex-shrink-0">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900">Riwayat Rekaman Live (Hemat Memori)</h3>
                                    <p className="text-[10px] text-gray-400">Total {recordings.length} rekaman di dalam VPS</p>
                                </div>
                                <button
                                    onClick={handleSyncRecordings}
                                    className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-xl text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-700 transition"
                                >
                                    <span className="material-icons text-xs">sync</span>
                                    Sinkronisasi VPS
                                </button>
                            </div>

                            {/* Recordings List */}
                            <div className="flex-1 overflow-y-auto max-h-[480px] min-h-[300px] space-y-2.5 pr-1">
                                {loadingRec ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-400">
                                        <span className="material-icons animate-spin text-2xl text-indigo-400 mb-2">sync</span>
                                        <p className="text-xs">Memindai berkas VPS...</p>
                                    </div>
                                ) : recordings.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center py-12 text-gray-400">
                                        <span className="material-icons text-gray-300 text-3xl mb-2">video_file</span>
                                        <p className="text-xs">Belum ada rekaman tersimpan.</p>
                                        <p className="text-[10px] text-gray-300 mt-0.5">Semua siaran langsung akan tersimpan di sini secara otomatis.</p>
                                    </div>
                                ) : (
                                    recordings.map(rec => (
                                        <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/10 transition group gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Visual Video Thumbnail representation */}
                                                <div className="w-16 h-10 rounded-xl bg-slate-900 border border-gray-200/60 overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm">
                                                    {streamSettings?.thumbnail ? (
                                                        <img src={`${API}${streamSettings.thumbnail}`} alt="Cover" className="w-full h-full object-cover opacity-80" />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 to-indigo-600/80 flex items-center justify-center">
                                                            <span className="material-icons text-white/90 text-sm">videocam</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/10 transition">
                                                        <span className="material-icons text-white text-base">play_circle_filled</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="min-w-0">
                                                    <p className="font-black text-xs text-gray-800 truncate">{rec.title}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-mono text-[9px] text-gray-400">{rec.file_name}</span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{rec.formatted_size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {/* Download link */}
                                                <a 
                                                    href={`${API}/media/recordings/${rec.file_name}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center transition shadow-sm"
                                                    title="Unduh Rekaman"
                                                >
                                                    <span className="material-icons text-sm">download</span>
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteRecording(rec.id)}
                                                    className="w-8 h-8 rounded-xl bg-white border border-gray-200 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-300 flex items-center justify-center transition shadow-sm"
                                                    title="Hapus Permanen dari VPS"
                                                >
                                                    <span className="material-icons text-sm">delete_outline</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </main>

            <NavigationButton />
        </div>
    );
};

export default DashboardLiveStreamingPage;
