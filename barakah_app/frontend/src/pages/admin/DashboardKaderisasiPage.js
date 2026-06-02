import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

// ───────── Dropdown options ─────────
const KELAS_ACADEMY_OPTIONS = ['', 'PRA', 'MUDA-1', 'MUDA-2', 'MUDA-3', 'MADYA-1', 'MADYA-2', 'MADYA-3', 'MADYA-P'];
const JENJANG_PEMAHAMAN_OPTIONS = ['', 'PRA', 'MUDA', 'MADYA', 'UTAMA', 'PETUGAS', 'PENGURUS', 'IBU IBU'];
const JENJANG_KESIAPAN_OPTIONS = ['', 'RELAWAN', 'MUDA', 'MUDA+', 'MADYA', 'MADYA+', 'UTAMA'];
const TUGAS_FUNGSI_OPTIONS = ['', 'UP SR', 'KASI', 'UP RM', 'KAUR', 'AK', 'MPT', 'MK'];
const SADAR_DONASI_OPTIONS = ['', 'WI', 'WZU', 'WZK', 'W5P'];

// ───────── Inline Dropdown Cell ─────────
const InlineDropdown = ({ userId, field, value, options, onSaved }) => {
    const [current, setCurrent] = useState(value || '');
    const [saving, setSaving] = useState(false);

    const handleChange = async (e) => {
        const val = e.target.value;
        setCurrent(val);
        setSaving(true);
        try {
            await axios.patch(
                `${API}/api/auth/users/${userId}/kaderisasi_update/`,
                { [field]: val },
                getAuth()
            );
            onSaved && onSaved(userId, field, val);
        } catch (err) {
            console.error('Gagal menyimpan:', err);
            alert('Gagal menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
            <select
                value={current}
                onChange={handleChange}
                disabled={saving}
                className={`w-full text-xs font-bold border rounded-xl px-2 py-1.5 outline-none transition appearance-none cursor-pointer pr-6
                    ${current
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }
                    ${saving ? 'opacity-60 cursor-wait' : 'hover:border-indigo-400'}
                `}
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt || '— Kosong —'}</option>
                ))}
            </select>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 material-icons text-[12px] text-gray-400 pointer-events-none">
                {saving ? 'sync' : 'expand_more'}
            </span>
        </div>
    );
};

// ───────── Inline Input Cell (text / date) ─────────
const InlineInput = ({ userId, field, value, type = 'text', onSaved }) => {
    const [current, setCurrent] = useState(value || '');
    const [saving, setSaving] = useState(false);

    const save = async (val) => {
        setSaving(true);
        try {
            await axios.patch(
                `${API}/api/auth/users/${userId}/kaderisasi_update/`,
                { [field]: val || null },
                getAuth()
            );
            onSaved && onSaved(userId, field, val || null);
        } catch (err) {
            console.error('Gagal menyimpan:', err);
            alert('Gagal menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative">
            <input
                type={type}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                onBlur={e => save(e.target.value)}
                disabled={saving}
                placeholder={type === 'date' ? 'yyyy-mm-dd' : '—'}
                className={`w-full text-xs border rounded-xl px-2 py-1.5 outline-none transition
                    ${current
                        ? 'bg-purple-50 border-purple-200 text-purple-900 font-bold'
                        : 'bg-gray-50 border-gray-200 text-gray-400'
                    }
                    ${saving ? 'opacity-60 cursor-wait' : 'hover:border-purple-400 focus:ring-1 focus:ring-purple-300'}
                `}
            />
            {saving && (
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 material-icons text-[12px] text-purple-400 animate-spin">sync</span>
            )}
        </div>
    );
};

// ───────── Multi-label filter chip selector ─────────
const LabelFilterChips = ({ labels, selectedIds, onChange }) => (
    <div className="flex flex-wrap gap-1.5">
        {labels.map(l => {
            const active = selectedIds.includes(l.id);
            return (
                <button
                    key={l.id}
                    onClick={() => onChange(active ? selectedIds.filter(x => x !== l.id) : [...selectedIds, l.id])}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition border
                        ${active
                            ? `bg-${l.color || 'green'}-600 text-white border-${l.color || 'green'}-600 shadow-sm`
                            : `bg-white text-gray-500 border-gray-200 hover:border-${l.color || 'green'}-300`
                        }`}
                >
                    {l.code || l.name}
                </button>
            );
        })}
    </div>
);

// ───────── Mobile Card ─────────
const UserKaderisasiCard = ({ user, labels, roles, onSaved }) => {
    const profile = user.profile || {};
    const userLabels = (user.labels || []).map(l => ({ ...l }));
    const userRoles = (user.custom_roles || []).map(r => ({ ...r }));

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-sm">
                        {(profile.name_full || user.username || '?')[0].toUpperCase()}
                    </span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-black text-gray-900 text-sm truncate">{profile.name_full || user.username}</p>
                    <p className="text-[10px] text-gray-400 truncate">@{user.username} · {user.email || '-'}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {profile.id_m && (
                            <span className="text-[9px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">IDM: {profile.id_m}</span>
                        )}
                        {userLabels.map(l => (
                            <span key={l.id} className={`text-[9px] font-black bg-${l.color || 'gray'}-100 text-${l.color || 'gray'}-700 px-1.5 py-0.5 rounded-full`}>
                                {l.code}
                            </span>
                        ))}
                        {userRoles.map(r => (
                            <span key={r.id} className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                                {r.code}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            {/* Kaderisasi fields — dropdown */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kelas Academy</p>
                    <InlineDropdown userId={user.id} field="kelas_academy" value={user.kelas_academy} options={KELAS_ACADEMY_OPTIONS} onSaved={onSaved} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Jenjang Pemahaman</p>
                    <InlineDropdown userId={user.id} field="jenjang_pemahaman" value={user.jenjang_pemahaman} options={JENJANG_PEMAHAMAN_OPTIONS} onSaved={onSaved} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Jenjang Kesiapan</p>
                    <InlineDropdown userId={user.id} field="jenjang_kesiapan" value={user.jenjang_kesiapan} options={JENJANG_KESIAPAN_OPTIONS} onSaved={onSaved} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tugas Fungsi</p>
                    <InlineDropdown userId={user.id} field="tugas_fungsi" value={user.tugas_fungsi} options={TUGAS_FUNGSI_OPTIONS} onSaved={onSaved} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sadar Donasi</p>
                    <InlineDropdown userId={user.id} field="sadar_donasi" value={user.sadar_donasi} options={SADAR_DONASI_OPTIONS} onSaved={onSaved} />
                </div>
            </div>
            {/* Kaderisasi fields — input */}
            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-50">
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rombel</p>
                    <InlineInput userId={user.id} field="rombel" value={user.rombel} type="text" onSaved={onSaved} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tgl. Alih Jenjang</p>
                    <InlineInput userId={user.id} field="tgl_alih_jenjang" value={user.tgl_alih_jenjang} type="date" onSaved={onSaved} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Keterangan</p>
                    <InlineInput userId={user.id} field="keterangan" value={user.keterangan} type="text" onSaved={onSaved} />
                </div>
            </div>
        </div>
    );
};

// ───────── Main Page ─────────
const DashboardKaderisasiPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [labels, setLabels] = useState([]);
    
    useEffect(() => {
        if (location.hash === '#live-stream') {
            setTimeout(() => {
                const el = document.getElementById('live-stream-panel');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                }
            }, 600);
        }
    }, [location.hash]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedLabelIds, setSelectedLabelIds] = useState([]);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [exporting, setExporting] = useState(false);
    const searchTimeout = useRef(null);
    const PAGE_SIZE = 50;

    // ───────── Streaming States ─────────
    const [streamSettings, setStreamSettings] = useState(null);
    const [streamTitle, setStreamTitle] = useState('');
    const [streamDesc, setStreamDesc] = useState('');
    const [isStreamLive, setIsStreamLive] = useState(false);
    const [recordings, setRecordings] = useState([]);
    const [loadingRec, setLoadingRec] = useState(false);
    const [savingStream, setSavingStream] = useState(false);

    const fetchStreamSettings = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/streaming/settings/`, getAuth());
            setStreamSettings(res.data);
            setStreamTitle(res.data.title || '');
            setStreamDesc(res.data.description || '');
            setIsStreamLive(res.data.is_live || false);
        } catch (err) {
            console.error('Gagal mengambil settings streaming:', err);
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

    const handleSaveStreamSettings = async (e) => {
        e.preventDefault();
        setSavingStream(true);
        try {
            const res = await axios.patch(
                `${API}/api/streaming/settings/`,
                {
                    title: streamTitle,
                    description: streamDesc,
                    is_live: isStreamLive
                },
                getAuth()
            );
            alert('Pengaturan live streaming berhasil disimpan!');
            setStreamSettings(res.data);
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

    const fetchLabels = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/auth/labels/`, getAuth());
            setLabels(res.data.results || res.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchUsers = useCallback(async (searchVal, labelIds, pageNum) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchVal) params.append('search', searchVal);
            // Multi-label: send multiple ?label= params
            labelIds.forEach(id => params.append('label', id));
            params.append('page', pageNum);
            params.append('page_size', PAGE_SIZE);
            const res = await axios.get(`${API}/api/auth/users/?${params.toString()}`, getAuth());
            const data = res.data;
            setUsers(data.results || data);
            setTotalCount(data.count || (data.results ? data.results.length : data.length));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }
        fetchLabels();
        fetchStreamSettings();
        fetchRecordings();
    }, [navigate, fetchLabels, fetchStreamSettings, fetchRecordings]);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            setPage(1);
            fetchUsers(search, selectedLabelIds, 1);
        }, 400);
        return () => clearTimeout(searchTimeout.current);
    }, [search, selectedLabelIds, fetchUsers]);

    const handleSaved = (userId, field, val) => {
        setUsers(prev => prev.map(u =>
            u.id === userId ? { ...u, [field]: val } : u
        ));
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            selectedLabelIds.forEach(id => params.append('label', id));
            params.append('page_size', 10000);
            const res = await axios.get(
                `${API}/api/auth/users/export_kaderisasi_csv/?${params.toString()}`,
                { ...getAuth(), responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kaderisasi.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Gagal export CSV.');
        } finally {
            setExporting(false);
        }
    };

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-20 w-full overflow-x-hidden">
            <Helmet><title>Manajemen Kaderisasi | BARAKAH APP</title></Helmet>
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
                            <h1 className="text-xl font-black text-gray-900 leading-tight">Manajemen Kaderisasi</h1>
                            <p className="text-xs text-gray-400 mt-0.5">{totalCount} anggota ditemukan</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 disabled:opacity-60"
                    >
                        <span className="material-icons text-sm">{exporting ? 'sync' : 'download'}</span>
                        {exporting ? 'Mengunduh...' : 'Export CSV'}
                    </button>
                </div>

                {/* ── Filter Panel ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-icons text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Cari nama, username, email, IDM..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 transition"
                        />
                    </div>
                    {/* Label filter */}
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter Label Anggota</p>
                        <LabelFilterChips
                            labels={labels}
                            selectedIds={selectedLabelIds}
                            onChange={setSelectedLabelIds}
                        />
                        {selectedLabelIds.length > 0 && (
                            <button
                                onClick={() => setSelectedLabelIds([])}
                                className="mt-2 text-[10px] text-red-500 font-bold hover:underline"
                            >
                                Reset Filter
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Desktop Table ── */}
                <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-indigo-50 border-b border-indigo-100 sticky top-0 z-10">
                                <tr>
                                    {['ID', 'IDM', 'Nama', 'Username', 'Email', 'Label', 'Custom Role',
                                      'Kelas Academy', 'Jenjang Pemahaman', 'Jenjang Kesiapan', 'Tugas Fungsi', 'Sadar Donasi',
                                      'Rombel', 'Tgl Alih Jenjang', 'Keterangan'].map(h => (
                                        <th key={h} className="px-3 py-3.5 text-[10px] font-black text-indigo-700 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={15} className="px-6 py-12 text-center text-gray-400 text-sm">
                                            <span className="material-icons animate-spin text-2xl text-indigo-400 block mx-auto mb-2">sync</span>
                                            Memuat data...
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={15} className="px-6 py-12 text-center text-gray-400 text-sm">Tidak ada data ditemukan.</td>
                                    </tr>
                                ) : users.map(user => {
                                    const profile = user.profile || {};
                                    return (
                                        <tr key={user.id} className="hover:bg-indigo-50/30 transition">
                                            <td className="px-3 py-2.5 text-gray-400 font-mono">{user.id}</td>
                                            <td className="px-3 py-2.5 font-mono text-gray-600">{profile.id_m || '-'}</td>
                                            <td className="px-3 py-2.5">
                                                <p className="font-bold text-gray-900 whitespace-nowrap max-w-[140px] truncate">{profile.name_full || '-'}</p>
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">@{user.username}</td>
                                            <td className="px-3 py-2.5 text-gray-500 max-w-[160px] truncate">{user.email || '-'}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {(user.labels || []).map(l => (
                                                        <span key={l.id} className={`text-[9px] font-black bg-${l.color || 'gray'}-100 text-${l.color || 'gray'}-700 px-1.5 py-0.5 rounded-full whitespace-nowrap`}>
                                                            {l.code}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {(user.custom_roles || []).map(r => (
                                                        <span key={r.id} className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                            {r.code}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[110px]">
                                                <InlineDropdown userId={user.id} field="kelas_academy" value={user.kelas_academy} options={KELAS_ACADEMY_OPTIONS} onSaved={handleSaved} />
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[130px]">
                                                <InlineDropdown userId={user.id} field="jenjang_pemahaman" value={user.jenjang_pemahaman} options={JENJANG_PEMAHAMAN_OPTIONS} onSaved={handleSaved} />
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[130px]">
                                                <InlineDropdown userId={user.id} field="jenjang_kesiapan" value={user.jenjang_kesiapan} options={JENJANG_KESIAPAN_OPTIONS} onSaved={handleSaved} />
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[110px]">
                                                <InlineDropdown userId={user.id} field="tugas_fungsi" value={user.tugas_fungsi} options={TUGAS_FUNGSI_OPTIONS} onSaved={handleSaved} />
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[110px]">
                                                <InlineDropdown userId={user.id} field="sadar_donasi" value={user.sadar_donasi} options={SADAR_DONASI_OPTIONS} onSaved={handleSaved} />
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[120px]">
                                                <InlineInput userId={user.id} field="rombel" value={user.rombel} type="text" onSaved={handleSaved} />
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[140px]">
                                                <InlineInput userId={user.id} field="tgl_alih_jenjang" value={user.tgl_alih_jenjang} type="date" onSaved={handleSaved} />
                                            </td>
                                            <td className="px-3 py-2.5 min-w-[160px]">
                                                <InlineInput userId={user.id} field="keterangan" value={user.keterangan} type="text" onSaved={handleSaved} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Mobile Card List ── */}
                <div className="md:hidden space-y-3">
                    {loading ? (
                        <div className="text-center py-12">
                            <span className="material-icons animate-spin text-3xl text-indigo-400 block mx-auto mb-2">sync</span>
                            <p className="text-gray-400 text-sm">Memuat data...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">Tidak ada data ditemukan.</div>
                    ) : users.map(user => (
                        <UserKaderisasiCard key={user.id} user={user} labels={labels} onSaved={handleSaved} />
                    ))}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-5">
                        <p className="text-xs text-gray-400">
                            Halaman {page} dari {totalPages} ({totalCount} total)
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => { setPage(p => p - 1); fetchUsers(search, selectedLabelIds, page - 1); }}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                                ← Sebelumnya
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => { setPage(p => p + 1); fetchUsers(search, selectedLabelIds, page + 1); }}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                                Berikutnya →
                            </button>
                        </div>
                    </div>
                )}
                {/* ───────── LIVE STREAMING CONTROL PANEL (KHUSUS ADMIN) ───────── */}
                <div id="live-stream-panel" className="mt-8 border-t border-gray-200 pt-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
                            <span className="material-icons">sensors</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900 leading-tight">Pengaturan Live Streaming (VPS Mandiri)</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Mulai streaming dari OBS dan kelola riwayat penyimpanan VPS</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* LEFT FORM: Streaming Control */}
                        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                            <h3 className="text-sm font-black text-gray-900 border-b border-gray-50 pb-3">Kontrol & Parameter Live</h3>
                            
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
                            <div className="flex-1 overflow-y-auto max-h-[350px] min-h-[250px] space-y-2.5 pr-1">
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
                                        <div key={rec.id} className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-2xl hover:border-indigo-100 hover:bg-indigo-50/10 transition group">
                                            <div className="min-w-0 pr-4">
                                                <p className="font-black text-xs text-gray-800 truncate">{rec.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="font-mono text-[9px] text-gray-400">{rec.file_name}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{rec.formatted_size}</span>
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
                </div>
            </main>

            <NavigationButton />
        </div>
    );
};

export default DashboardKaderisasiPage;
