import React, { useState, useEffect, useCallback } from 'react';
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

    const fetchStreamSettings = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/streaming/settings/`, getAuth());
            setStreamSettings(res.data);
            setStreamTitle(res.data.title || '');
            setStreamDesc(res.data.description || '');
            setIsStreamLive(res.data.is_live || false);
            setLatencyMode(res.data.latency_mode || 'low');
            setSaveRecording(res.data.save_recording !== false);
            setThumbnailPreview(res.data.thumbnail ? `${API}${res.data.thumbnail}` : '');
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
        fetchStreamSettings();
        fetchRecordings();

        // Poll streaming settings (for active OBS status checks) every 10 seconds
        const pollInterval = setInterval(() => {
            fetchStreamSettings();
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
        if (!window.confirm('Apakah Anda yakin ingin meregenerasi stream key? Key lama di OBS Anda tidak akan berfungsi lagi.')) return;
        try {
            const res = await axios.post(`${API}/api/streaming/settings/`, {}, getAuth());
            alert(res.data.message);
            setStreamSettings(prev => ({ ...prev, stream_key: res.data.stream_key }));
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
                            <p className="text-xs text-gray-400 mt-0.5">Atur siaran langsung OBS dan kelola riwayat rekaman video VPS</p>
                        </div>
                    </div>
                </div>

                {loadingSettings ? (
                    <div className="text-center py-20">
                        <span className="material-icons animate-spin text-4xl text-indigo-500 block mx-auto mb-3">sync</span>
                        <p className="text-gray-400 text-sm">Memuat pengaturan streaming...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* LEFT FORM: Streaming Control */}
                        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-black text-gray-900">Kontrol & Parameter Live</h3>
                                {streamSettings && (
                                    <div className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${streamSettings.is_obs_active ? 'bg-green-500 animate-ping' : 'bg-gray-400'}`}></span>
                                        <span className={`w-2 h-2 rounded-full ${streamSettings.is_obs_active ? 'bg-green-500' : 'bg-gray-400'} -ml-3`}></span>
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${streamSettings.is_obs_active ? 'text-green-600' : 'text-gray-400'}`}>
                                            {streamSettings.is_obs_active ? 'ON STREAM' : 'OFF STREAM'}
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
                                            title="Ganti Stream Key lama. Ini juga akan langsung mematikan/memutuskan koneksi OBS aktif (Force Off-Stream)"
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
