import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE_URL;

const toLocalDateStr = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAY_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

// ─── Helpers ────────────────────────────────────────────────────────────────
const getStoredTokens = () => {
    try { return JSON.parse(localStorage.getItem('barakah_widget_auth')) || null; }
    catch { return null; }
};
const saveTokens = (data) => localStorage.setItem('barakah_widget_auth', JSON.stringify(data));
const clearTokens = () => localStorage.removeItem('barakah_widget_auth');

const authHeader = (tokens) => ({ headers: { Authorization: `Bearer ${tokens?.access}` } });

// ─── Activity color dots ─────────────────────────────────────────────────────
const TYPE_COLOR = { event: '#6366f1', meeting: '#a855f7', campaign: '#ef4444' };

// ─── Build calendar days array ───────────────────────────────────────────────
const buildCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
};

// ─── Login Screen ────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin, sessionExpired }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/api/accounts/token/`, { username, password });
            const tokens = { access: res.data.access, refresh: res.data.refresh };
            saveTokens(tokens);
            onLogin(tokens);
        } catch {
            setError('Username atau password salah.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] px-6">
            {/* Logo / Branding */}
            <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/30">
                    <span className="material-icons text-white text-3xl">calendar_month</span>
                </div>
                <h1 className="text-xl font-black text-white tracking-tight">Kalender Barakah</h1>
                <p className="text-slate-400 text-xs mt-1">Widget Admin — Masuk untuk melanjutkan</p>
            </div>

            {sessionExpired && (
                <div className="w-full max-w-xs mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2">
                    <span className="material-icons text-amber-400 text-sm">schedule</span>
                    <p className="text-amber-300 text-xs font-semibold">Sesi habis. Silakan masuk kembali.</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
                <div>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Username"
                        required
                        className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                    />
                </div>
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                    />
                </div>
                {error && (
                    <p className="text-rose-400 text-xs text-center font-semibold">{error}</p>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-indigo-500/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? 'Memverifikasi...' : 'Masuk ke Widget'}
                </button>
            </form>

            <p className="mt-6 text-slate-600 text-[10px] text-center">
                Hanya dapat diakses oleh admin Barakah App
            </p>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
                * { font-family: 'Inter', sans-serif; }
            `}</style>
        </div>
    );
};

// ─── Main Widget ─────────────────────────────────────────────────────────────
const CalendarWidgetPage = () => {
    const [tokens, setTokens] = useState(() => getStoredTokens());
    const [sessionExpired, setSessionExpired] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activities, setActivities] = useState([]);
    const [notes, setNotes] = useState({});       // { 'YYYY-MM-DD': noteObj }
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null); // date obj clicked
    const [noteInput, setNoteInput] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const refreshTimer = useRef(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const calendarDays = buildCalendarDays(year, month);
    const today = new Date();
    const todayStr = toLocalDateStr(today);

    // ── Token refresh ────────────────────────────────────────────────────────
    const refreshToken = useCallback(async (currentTokens) => {
        try {
            const res = await axios.post(`${API}/api/accounts/token/refresh/`, {
                refresh: currentTokens.refresh
            });
            const updated = { ...currentTokens, access: res.data.access };
            saveTokens(updated);
            setTokens(updated);
            return updated;
        } catch {
            clearTokens();
            setTokens(null);
            setSessionExpired(true);
            return null;
        }
    }, []);

    // ── Fetch data ───────────────────────────────────────────────────────────
    const fetchData = useCallback(async (tkns) => {
        if (!tkns) return;
        setLoading(true);
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        try {
            const [actRes, noteRes] = await Promise.all([
                axios.get(`${API}/api/site-content/activity-calendar/?start=${startDate}&end=${endDate}`, authHeader(tkns)),
                axios.get(`${API}/api/site-content/calendar-notes/?start=${startDate}&end=${endDate}`, authHeader(tkns)),
            ]);
            setActivities(actRes.data);
            const noteMap = {};
            noteRes.data.forEach(n => { noteMap[n.date] = n; });
            setNotes(noteMap);
            setLastRefresh(new Date());
        } catch (err) {
            if (err.response?.status === 401) {
                const refreshed = await refreshToken(tkns);
                if (refreshed) fetchData(refreshed);
            }
        } finally {
            setLoading(false);
        }
    }, [year, month, refreshToken]);

    // Fetch ketika bulan/token berubah
    useEffect(() => {
        if (tokens) fetchData(tokens);
    }, [tokens, year, month, fetchData]);

    // Auto-refresh setiap 5 menit
    useEffect(() => {
        if (!tokens) return;
        refreshTimer.current = setInterval(() => {
            fetchData(tokens);
        }, 5 * 60 * 1000);
        return () => clearInterval(refreshTimer.current);
    }, [tokens, fetchData]);

    // ── Auth handler ─────────────────────────────────────────────────────────
    const handleLogin = (newTokens) => {
        setTokens(newTokens);
        setSessionExpired(false);
    };

    const handleLogout = () => {
        clearTokens();
        setTokens(null);
        setSessionExpired(false);
        setActivities([]);
        setNotes({});
    };

    // ── Build activity map per date ─────────────────────────────────────────
    const activityByDate = {};
    activities.forEach(act => {
        const dateStr = act.start?.split('T')[0];
        if (!dateStr) return;
        if (!activityByDate[dateStr]) activityByDate[dateStr] = [];
        activityByDate[dateStr].push(act);
    });

    // ── Selected day detail data ─────────────────────────────────────────────
    const selectedDateStr = selectedDay ? toLocalDateStr(selectedDay) : null;
    const selectedActs = selectedDateStr ? (activityByDate[selectedDateStr] || []) : [];
    const selectedNote = selectedDateStr ? notes[selectedDateStr] : null;

    // Sync note input when selection changes
    useEffect(() => {
        if (selectedDateStr) {
            setNoteInput(notes[selectedDateStr]?.content || '');
        } else {
            setNoteInput('');
        }
    }, [selectedDateStr, notes]);

    const handleSaveNote = async () => {
        if (!selectedDateStr) return;
        setNoteSaving(true);
        try {
            if (noteInput.trim()) {
                const res = await axios.post(`${API}/api/site-content/calendar-notes/`, {
                    date: selectedDateStr,
                    content: noteInput.trim()
                }, authHeader(tokens));
                setNotes(prev => ({ ...prev, [selectedDateStr]: res.data }));
            } else {
                await axios.delete(`${API}/api/site-content/calendar-notes/?date=${selectedDateStr}`, authHeader(tokens));
                setNotes(prev => {
                    const next = { ...prev };
                    delete next[selectedDateStr];
                    return next;
                });
            }
        } catch (err) {
            if (err.response?.status === 401) {
                const refreshed = await refreshToken(tokens);
                if (refreshed) {
                    try {
                        if (noteInput.trim()) {
                            const res = await axios.post(`${API}/api/site-content/calendar-notes/`, {
                                date: selectedDateStr,
                                content: noteInput.trim()
                            }, authHeader(refreshed));
                            setNotes(prev => ({ ...prev, [selectedDateStr]: res.data }));
                        } else {
                            await axios.delete(`${API}/api/site-content/calendar-notes/?date=${selectedDateStr}`, authHeader(refreshed));
                            setNotes(prev => {
                                const next = { ...prev };
                                delete next[selectedDateStr];
                                return next;
                            });
                        }
                    } catch (retryErr) {
                        console.error('Gagal menyimpan setelah refresh token:', retryErr);
                        alert('Sesi telah kedaluwarsa. Silakan muat ulang halaman.');
                    }
                }
            } else {
                console.error('Gagal menyimpan catatan:', err);
                alert('Gagal menyimpan catatan. Silakan coba lagi.');
            }
        } finally {
            setNoteSaving(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!selectedDateStr || !notes[selectedDateStr]) return;
        if (!window.confirm('Apakah Anda yakin ingin menghapus catatan untuk tanggal ini?')) return;
        setNoteSaving(true);
        try {
            await axios.delete(`${API}/api/site-content/calendar-notes/?date=${selectedDateStr}`, authHeader(tokens));
            setNotes(prev => {
                const next = { ...prev };
                delete next[selectedDateStr];
                return next;
            });
            setNoteInput('');
        } catch (err) {
            if (err.response?.status === 401) {
                const refreshed = await refreshToken(tokens);
                if (refreshed) {
                    try {
                        await axios.delete(`${API}/api/site-content/calendar-notes/?date=${selectedDateStr}`, authHeader(refreshed));
                        setNotes(prev => {
                            const next = { ...prev };
                            delete next[selectedDateStr];
                            return next;
                        });
                        setNoteInput('');
                    } catch (retryErr) {
                        console.error('Gagal menghapus setelah refresh token:', retryErr);
                    }
                }
            } else {
                console.error('Gagal menghapus catatan:', err);
                alert('Gagal menghapus catatan.');
            }
        } finally {
            setNoteSaving(false);
        }
    };

    // ── Not logged in ────────────────────────────────────────────────────────
    if (!tokens) {
        return <LoginScreen onLogin={handleLogin} sessionExpired={sessionExpired} />;
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-white select-none" style={{ fontFamily: 'Inter, sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
                @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius:4px; }
                .fade-in { animation: fadeIn 0.3s ease; }
                @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
            `}</style>

            {/* ── Header ── */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                <div>
                    <h1 className="text-base font-black tracking-tight">
                        {MONTH_ID[month]} {year}
                    </h1>
                    {lastRefresh && (
                        <p className="text-[9px] text-slate-500 mt-0.5">
                            Diperbarui {lastRefresh.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Month navigation */}
                    <button
                        onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                        className="w-8 h-8 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
                    >
                        <span className="material-icons text-sm">chevron_left</span>
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600/40 transition-all"
                    >
                        Hari ini
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                        className="w-8 h-8 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
                    >
                        <span className="material-icons text-sm">chevron_right</span>
                    </button>
                    {/* Refresh */}
                    <button
                        onClick={() => fetchData(tokens)}
                        disabled={loading}
                        className="w-8 h-8 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
                    >
                        <span className={`material-icons text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-8 h-8 rounded-xl bg-white/5 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-all active:scale-90"
                        title="Keluar"
                    >
                        <span className="material-icons text-sm">logout</span>
                    </button>
                </div>
            </div>

            {/* ── Day Labels ── */}
            <div className="grid grid-cols-7 px-2 mb-1">
                {DAY_SHORT.map(d => (
                    <div key={d} className="text-center text-[9px] font-black text-slate-600 uppercase tracking-wider py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* ── Calendar Grid ── */}
            <div className="grid grid-cols-7 px-2 gap-0.5">
                {calendarDays.map((date, i) => {
                    if (!date) return <div key={i} className="aspect-square" />;
                    const dStr = toLocalDateStr(date);
                    const isToday = dStr === todayStr;
                    const isSelected = dStr === selectedDateStr;
                    const dayActs = activityByDate[dStr] || [];
                    const hasNote = !!notes[dStr];

                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedDay(isSelected ? null : date)}
                            className={`relative flex flex-col items-center pt-1.5 pb-1 rounded-xl transition-all active:scale-90 ${
                                isSelected
                                    ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30'
                                    : isToday
                                    ? 'bg-indigo-600/20 ring-1 ring-indigo-500/50'
                                    : 'hover:bg-white/5'
                            }`}
                            style={{ minHeight: '44px' }}
                        >
                            <span className={`text-[11px] font-black leading-none ${
                                isSelected ? 'text-white' : isToday ? 'text-indigo-400' : 'text-slate-300'
                            }`}>
                                {date.getDate()}
                            </span>

                            {/* Activity dots */}
                            {dayActs.length > 0 && (
                                <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-0.5">
                                    {dayActs.slice(0, 3).map((act, ai) => (
                                        <div
                                            key={ai}
                                            className="w-1 h-1 rounded-full"
                                            style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : (TYPE_COLOR[act.type] || '#6366f1') }}
                                        />
                                    ))}
                                    {dayActs.length > 3 && (
                                        <span className={`text-[7px] font-black leading-none ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                                            +{dayActs.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Note indicator */}
                            {hasNote && !isSelected && (
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Legend ── */}
            <div className="px-4 mt-3 flex items-center gap-4 flex-wrap">
                {[['event','#6366f1','Event'],['meeting','#a855f7','Rapat'],['campaign','#ef4444','Charity']].map(([,color,label]) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[9px] font-semibold text-slate-500">{label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[9px] font-semibold text-slate-500">Catatan</span>
                </div>
            </div>

            {/* ── Detail Panel (muncul saat tanggal diklik) ── */}
            {selectedDay && (
                <div className="mx-3 mt-4 bg-slate-800/60 border border-white/5 rounded-3xl overflow-hidden fade-in">
                    {/* Panel header */}
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-white">
                                {selectedDay.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                                {selectedActs.length} kegiatan {selectedNote ? '· ada catatan' : ''}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedDay(null)}
                            className="w-7 h-7 rounded-lg bg-white/5 text-slate-500 hover:text-slate-300 flex items-center justify-center transition-all"
                        >
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>

                    <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
                        {/* Activities */}
                        {selectedActs.length === 0 ? (
                            <p className="text-slate-600 text-xs text-center py-2">Tidak ada kegiatan.</p>
                        ) : (
                            selectedActs.map(act => (
                                <div
                                    key={act.id}
                                    className="flex items-start gap-3 p-3 rounded-2xl"
                                    style={{ backgroundColor: (TYPE_COLOR[act.type] || '#6366f1') + '15' }}
                                >
                                    <div
                                        className="w-1 self-stretch rounded-full shrink-0"
                                        style={{ backgroundColor: TYPE_COLOR[act.type] || '#6366f1' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{act.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-slate-400">{act.time_str} WIB</span>
                                            {act.location && (
                                                <>
                                                    <span className="text-slate-700">·</span>
                                                    <span className="text-[9px] text-slate-400 truncate">{act.location}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-1">
                                        <span className="material-icons text-slate-500 text-[11px]">groups</span>
                                        <span className="text-[9px] text-slate-500">{act.participants_count}</span>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Note Editor */}
                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-icons text-amber-400 text-sm">edit_note</span>
                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                        {selectedNote ? `Catatan (Oleh: ${selectedNote.updated_by_name || 'Admin'})` : 'Tambah Catatan Draft'}
                                    </p>
                                </div>
                                {selectedNote && (
                                    <button
                                        onClick={handleDeleteNote}
                                        disabled={noteSaving}
                                        className="text-[9px] font-bold text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-wider disabled:opacity-50"
                                    >
                                        Hapus
                                    </button>
                                )}
                            </div>
                            <textarea
                                rows={2}
                                value={noteInput}
                                onChange={e => setNoteInput(e.target.value)}
                                disabled={noteSaving}
                                placeholder="Tulis rencana atau catatan draft untuk hari ini..."
                                className="w-full bg-white/5 border border-amber-500/10 rounded-xl px-3 py-2 text-xs text-amber-100 placeholder-amber-500/20 focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.08] resize-none transition-all leading-relaxed"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[8px] text-amber-500/40 font-bold">
                                    {noteInput.length > 0 ? `${noteInput.length} karakter` : 'Belum ada catatan'}
                                </span>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={noteSaving}
                                    className="px-3 py-1.5 bg-amber-500 text-[#0f172a] text-[9px] font-black rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1"
                                >
                                    <span className="material-icons text-[10px]">{noteSaving ? 'refresh' : 'save'}</span>
                                    {noteSaving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stats ringkas ── */}
            <div className="px-3 mt-4 mb-6 grid grid-cols-3 gap-2">
                {[
                    { label: 'Event', count: activities.filter(a => a.type === 'event').length, color: '#6366f1', icon: 'event' },
                    { label: 'Rapat', count: activities.filter(a => a.type === 'meeting').length, color: '#a855f7', icon: 'groups' },
                    { label: 'Catatan', count: Object.keys(notes).length, color: '#f59e0b', icon: 'edit_note' },
                ].map(s => (
                    <div key={s.label} className="bg-slate-800/60 border border-white/5 rounded-2xl p-3 text-center">
                        <span className="material-icons text-base mb-1" style={{ color: s.color }}>{s.icon}</span>
                        <p className="text-lg font-black text-white leading-none">{s.count}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 font-semibold">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarWidgetPage;
