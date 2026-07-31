import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE_URL || 'https://api.barakah.cloud';

const getUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
};

const getAuth = () => {
    const user = getUser();
    return user?.access ? { headers: { Authorization: `Bearer ${user.access}` } } : null;
};

const GlobalBlastQueueWidget = () => {
    const user = getUser();
    const isAdmin = user && (user.role === 'admin' || user.is_staff || user.is_superuser);

    const [tasks, setTasks] = useState([]);
    const [isMinimized, setIsMinimized] = useState(() => {
        return localStorage.getItem('blast_widget_minimized') === 'true';
    });
    const [cancellingId, setCancellingId] = useState(null);
    const pollRef = useRef(null);

    const toggleMinimize = () => {
        setIsMinimized((prev) => {
            const next = !prev;
            localStorage.setItem('blast_widget_minimized', String(next));
            return next;
        });
    };

    const fetchQueueStatus = async () => {
        if (!isAdmin) return;
        const auth = getAuth();
        if (!auth) return;
        try {
            const res = await axios.get(`${API}/api/auth/users/blast_queue_status/`, auth);
            if (res.data && Array.isArray(res.data.tasks)) {
                // Filter tasks that are active ('queued', 'processing') or finished recently (< 30s)
                const now = Date.now() / 1000;
                const relevant = res.data.tasks.filter((t) => {
                    if (['queued', 'processing'].includes(t.status)) return true;
                    if (t.updated_at && now - t.updated_at < 30) return true;
                    return false;
                });
                setTasks(relevant);
            }
        } catch (err) {
            // Silently ignore auth or network errors
        }
    };

    useEffect(() => {
        if (!isAdmin) return;

        fetchQueueStatus();
        
        // Dynamic polling interval: 3s if active tasks exist
        pollRef.current = setInterval(() => {
            fetchQueueStatus();
        }, 3000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isAdmin]);

    const handleCancelTask = async (taskId) => {
        if (!isAdmin) return;
        const auth = getAuth();
        if (!auth) return;
        if (!window.confirm('Yakin ingin membatalkan pengiriman blast ini? Sisa antrian tidak akan dikirim.')) return;
        
        setCancellingId(taskId);
        try {
            await axios.post(`${API}/api/auth/users/cancel_blast_task/`, { task_id: taskId }, auth);
            fetchQueueStatus();
        } catch (err) {
            alert('Gagal membatalkan antrian: ' + (err.response?.data?.error || err.message));
        } finally {
            setCancellingId(null);
        }
    };

    if (!isAdmin || !tasks || tasks.length === 0) return null;

    const primaryTask = tasks[0];
    const isWhatsapp = primaryTask.task_type === 'whatsapp';
    const isRunning = ['queued', 'processing'].includes(primaryTask.status);
    const percent = primaryTask.total > 0 ? Math.min(100, Math.round((primaryTask.processed_count / primaryTask.total) * 100)) : 0;

    return (
        <div className="fixed top-4 right-4 z-[999999] max-w-sm w-full animate-fadeIn transition-all">
            {isMinimized ? (
                /* Minimized Badge */
                <div 
                    onClick={toggleMinimize}
                    className="bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-full shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800 transition active:scale-95 group ml-auto max-w-xs"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-gray-400'}`}></span>
                        <span className="material-icons text-base text-emerald-400">
                            {isWhatsapp ? 'chat' : 'email'}
                        </span>
                        <span className="text-xs font-bold truncate">
                            {primaryTask.processed_count}/{primaryTask.total} ({percent}%)
                        </span>
                    </div>
                    <span className="material-icons text-sm text-gray-400 group-hover:text-white transition">
                        open_in_full
                    </span>
                </div>
            ) : (
                /* Expanded Floating Card */
                <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700/80">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-emerald-400 text-lg">
                                {isWhatsapp ? 'chat' : 'email'}
                            </span>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                                    Antrian Blast {isWhatsapp ? 'WhatsApp' : 'Email'}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                    {primaryTask.status === 'processing' ? 'Sedang mengirim bertahap...' : 
                                     primaryTask.status === 'queued' ? 'Menunggu antrian...' : 
                                     primaryTask.status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={toggleMinimize}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                                title="Sembunyikan / Minimize"
                            >
                                <span className="material-icons text-base">close_fullscreen</span>
                            </button>
                        </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                            <span>Progress</span>
                            <span className="text-emerald-400 font-mono font-bold">
                                {primaryTask.processed_count} / {primaryTask.total} ({percent}%)
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-green-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Current Recipient Info */}
                    {isRunning && primaryTask.current_item && (
                        <p className="text-[11px] text-slate-400 truncate mb-3 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                            <span className="text-slate-500 font-bold">Kirim ke:</span> {primaryTask.current_item}
                        </p>
                    )}

                    {/* Result Summary */}
                    <div className="flex items-center justify-between text-[11px] text-slate-300 mb-3">
                        <span className="text-emerald-400 font-semibold">✓ {primaryTask.success_count} Berhasil</span>
                        <span className="text-rose-400 font-semibold">✕ {primaryTask.failed_count} Gagal</span>
                    </div>

                    {/* Cancel Button */}
                    {isRunning && (
                        <button
                            type="button"
                            onClick={() => handleCancelTask(primaryTask.task_id)}
                            disabled={cancellingId === primaryTask.task_id}
                            className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                            <span className="material-icons text-sm">block</span>
                            <span>{cancellingId === primaryTask.task_id ? 'Membatalkan...' : 'Batalkan Antrian'}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalBlastQueueWidget;
