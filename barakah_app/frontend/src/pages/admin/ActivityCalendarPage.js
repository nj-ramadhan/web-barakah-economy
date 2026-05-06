import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;

const ActivityCalendarPage = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('monthly'); // weekly, monthly, quarterly, range
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customRange, setCustomRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });

    const getAuth = useCallback(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        return { headers: { Authorization: `Bearer ${user?.access}` } };
    }, []);

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/site-content/activity-calendar/`, getAuth());
            setActivities(res.data);
        } catch (err) {
            console.error("Failed to fetch calendar data:", err);
            if (err.response?.status === 403) {
                alert("Akses ditolak. Halaman ini hanya untuk Admin.");
                navigate('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    }, [getAuth, navigate]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const changeDate = (delta) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'weekly') newDate.setDate(newDate.getDate() + (delta * 7));
        else if (viewMode === 'monthly') newDate.setMonth(newDate.getMonth() + delta);
        else if (viewMode === 'quarterly') newDate.setMonth(newDate.getMonth() + (delta * 3));
        setCurrentDate(newDate);
    };

    const formatMonth = (date) => {
        return date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Helper for monthly grid
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust to Monday start
    };

    const calendarDays = useMemo(() => {
        if (viewMode !== 'monthly') return [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Padding
        for (let i = 0; i < firstDay; i++) {
            days.push({ day: null, date: null, activities: [] });
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateStr = date.toISOString().split('T')[0];
            const dayActivities = activities.filter(act => {
                const start = act.start.split('T')[0];
                const end = act.end.split('T')[0];
                return dateStr >= start && dateStr <= end;
            });
            days.push({ day: d, date, activities: dayActivities });
        }
        return days;
    }, [activities, currentDate, viewMode]);

    const filteredActivities = useMemo(() => {
        if (!activities.length) return [];

        const now = new Date(currentDate);
        let start, end;

        if (viewMode === 'weekly') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            start = new Date(now.setDate(diff));
            start.setHours(0,0,0,0);
            end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23,59,59,999);
        } else if (viewMode === 'monthly') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (viewMode === 'quarterly') {
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        } else if (viewMode === 'range') {
            start = new Date(customRange.start);
            end = new Date(customRange.end);
            end.setHours(23,59,59,999);
        }

        return activities.filter(act => {
            const actStart = new Date(act.start);
            const actEnd = new Date(act.end);
            return actStart <= end && actEnd >= start;
        }).sort((a, b) => new Date(a.start) - new Date(b.start));
    }, [activities, viewMode, currentDate, customRange]);

    const [selectedDateData, setSelectedDateData] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const handleDateClick = (dayObj) => {
        if (!dayObj.day) return;
        setSelectedDateData(dayObj);
        setShowDetailModal(true);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-24">
            <Helmet>
                <title>Kalender Kegiatan Admin - Barakah Economy</title>
            </Helmet>
            <Header />
            
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <span className="material-icons text-white">calendar_month</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Kalender Kegiatan</h1>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Monitoring Dashboard</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm">
                        {['weekly', 'monthly', 'quarterly', 'range'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    viewMode === mode 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                                }`}
                            >
                                {mode === 'weekly' ? 'Mingguan' : mode === 'monthly' ? 'Bulanan' : mode === 'quarterly' ? 'Triwulan' : 'Range'}
                            </button>
                        ))}
                        <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
                        <button 
                            onClick={() => {
                                if (filteredActivities.length === 0) return alert("Tidak ada data untuk di-export");
                                
                                const headers = ["Tipe", "Judul", "Kategori", "Tanggal", "Jam", "Lokasi", "Peserta", "Status"];
                                const csvContent = [
                                    headers.join(","),
                                    ...filteredActivities.map(act => [
                                        act.type === 'event' ? "Event" : "Charity",
                                        `"${act.title.replace(/"/g, '""')}"`,
                                        act.category,
                                        act.start.split('T')[0],
                                        act.time_str,
                                        `"${(act.location || '-').replace(/"/g, '""')}"`,
                                        act.participants_count,
                                        act.status
                                    ].join(","))
                                ].join("\n");

                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement("a");
                                const url = URL.createObjectURL(blob);
                                link.setAttribute("href", url);
                                link.setAttribute("download", `Data_Kegiatan_BAE_${new Date().toISOString().split('T')[0]}.csv`);
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Export CSV"
                        >
                            <span className="material-icons text-sm">download</span>
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Export CSV</span>
                        </button>
                        <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>
                        <button 
                            onClick={fetchActivities}
                            disabled={loading}
                            className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Refresh Data"
                        >
                            <span className={`material-icons text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        </button>
                    </div>
                </div>

                {/* Navigation & Title */}
                {viewMode !== 'range' && (
                    <div className="flex items-center justify-between mb-8 bg-white/80 backdrop-blur-md rounded-[2rem] p-4 shadow-sm border border-white group">
                        <button 
                            onClick={() => changeDate(-1)} 
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-inner"
                        >
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <div className="text-center">
                            <h2 className="text-xl font-black text-gray-800 capitalize tracking-tight">
                                {viewMode === 'weekly' ? `Minggu ke-${Math.ceil(currentDate.getDate() / 7)} ${formatMonth(currentDate)}` :
                                 viewMode === 'monthly' ? formatMonth(currentDate) :
                                 `Triwulan ${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`}
                            </h2>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-1">Navigasi Periode</p>
                        </div>
                        <button 
                            onClick={() => changeDate(1)} 
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-inner"
                        >
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                )}

                {viewMode === 'range' && (
                    <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 shadow-sm border border-white mb-8 animate-slide-down">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                    <span className="material-icons text-xs">calendar_today</span>
                                    Mulai Dari
                                </label>
                                <input 
                                    type="date" 
                                    value={customRange.start}
                                    onChange={e => setCustomRange({...customRange, start: e.target.value})}
                                    className="w-full px-6 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-inner"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                                    <span className="material-icons text-xs">event</span>
                                    Hingga Sampai
                                </label>
                                <input 
                                    type="date" 
                                    value={customRange.end}
                                    onChange={e => setCustomRange({...customRange, end: e.target.value})}
                                    className="w-full px-6 py-4 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/50 backdrop-blur-sm rounded-[3rem] shadow-sm border border-white">
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Menyelaraskan Data...</p>
                    </div>
                ) : (
                    <>
                        {/* Monthly Grid View (Desktop Only) */}
                        {viewMode === 'monthly' && (
                            <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden mb-12 animate-fade-in">
                                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                                        <div key={day} className="py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{day}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 auto-rows-[140px]">
                                    {calendarDays.map((dayObj, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => handleDateClick(dayObj)}
                                            className={`p-3 border-r border-b border-gray-50 group hover:bg-indigo-50/30 transition-all duration-300 relative cursor-pointer ${!dayObj.day ? 'bg-gray-50/30' : ''}`}
                                        >
                                            {dayObj.day && (
                                                <>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`text-sm font-black transition-transform group-hover:scale-110 ${new Date().toDateString() === dayObj.date.toDateString() ? 'bg-indigo-600 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200' : 'text-gray-300 group-hover:text-indigo-400'}`}>
                                                            {dayObj.day}
                                                        </span>
                                                        {dayObj.activities.length > 0 && (
                                                            <div className="flex flex-col items-end">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></div>
                                                                <span className="text-[8px] font-black text-indigo-500 mt-1">{dayObj.activities.length} Kegiatan</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5 overflow-y-auto max-h-[85px] custom-scrollbar pr-1">
                                                        {dayObj.activities.map(act => (
                                                            <div 
                                                                key={act.id} 
                                                                className="px-2.5 py-1.5 rounded-lg text-white cursor-pointer hover:brightness-110 hover:shadow-md transition-all active:scale-95 border border-white/20"
                                                                style={{ 
                                                                    backgroundColor: act.color,
                                                                    background: `linear-gradient(135deg, ${act.color}, ${act.color}dd)` 
                                                                }}
                                                                title={`${act.title} - ${act.time_str}`}
                                                            >
                                                                <div className="flex justify-between items-center gap-1">
                                                                    <span className="text-[8px] font-black truncate flex-1">{act.title}</span>
                                                                    <span className="text-[7px] font-bold opacity-80 shrink-0">{act.time_str}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-0.5 opacity-90">
                                                                    <span className="material-icons text-[7px]">groups</span>
                                                                    <span className="text-[7px] font-bold">{act.participants_count}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* List View (Mobile & Other Modes) */}
                        <div className={`${viewMode === 'monthly' ? 'md:hidden' : ''} space-y-6 animate-fade-in`}>
                            {filteredActivities.length === 0 ? (
                                <div className="bg-white/50 backdrop-blur-sm rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-200">
                                    <div className="w-20 h-20 bg-gray-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <span className="material-icons text-gray-300 text-4xl">event_busy</span>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-800 mb-2">Belum Ada Agenda</h3>
                                    <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">Tidak ada jadwal kegiatan yang ditemukan untuk periode ini.</p>
                                </div>
                            ) : (
                                filteredActivities.map((act) => (
                                    <div key={act.id} className="group bg-white rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-indigo-100 transition-all duration-500 overflow-hidden flex flex-col md:flex-row md:items-center">
                                        {/* Color Bar / Indicator */}
                                        <div className="w-full h-2 md:w-3 md:h-32 shrink-0 transition-all duration-500 group-hover:w-4" style={{ backgroundColor: act.color }}></div>
                                        
                                        <div className="flex-1 p-6 sm:p-8">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    act.type === 'event' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {act.type === 'event' ? 'Event Komunitas' : 'Program Charity'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{act.category}</span>
                                                {act.status === 'pending' && (
                                                    <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-100 animate-pulse">Menunggu Verifikasi</span>
                                                )}
                                            </div>
                                            
                                            <h3 className="text-lg sm:text-xl font-black text-gray-800 group-hover:text-indigo-600 transition-colors mb-4 line-clamp-2">{act.title}</h3>
                                            
                                            <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                                                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold">
                                                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                        <span className="material-icons text-sm">schedule</span>
                                                    </div>
                                                    {formatDate(act.start)} pada {act.time_str}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold">
                                                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                                        <span className="material-icons text-sm">groups</span>
                                                    </div>
                                                    {act.participants_count} Peserta Terdaftar
                                                </div>
                                                {act.location && (
                                                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold">
                                                        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                                                            <span className="material-icons text-sm">location_on</span>
                                                        </div>
                                                        {act.location}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 sm:p-8 border-t md:border-t-0 md:border-l border-gray-50 bg-gray-50/30 md:bg-transparent flex flex-row md:flex-col justify-end gap-3 shrink-0">
                                            <Link 
                                                to={act.url}
                                                target="_blank"
                                                className="flex-1 md:w-32 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 hover:text-indigo-600 transition-all text-center shadow-sm"
                                            >
                                                Lihat Laman
                                            </Link>
                                            {act.type === 'event' && (
                                                <Link 
                                                    to={`/dashboard/admin/events?id=${act.id.split('-')[1]}`}
                                                    className="flex-1 md:w-32 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all text-center shadow-md active:scale-95"
                                                >
                                                    Kelola
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}

                {/* Detail Modal */}
                {showDetailModal && selectedDateData && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up border border-white">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">Agenda {formatDate(selectedDateData.date)}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ditemukan {selectedDateData.activities.length} Kegiatan</p>
                                </div>
                                <button 
                                    onClick={() => setShowDetailModal(false)}
                                    className="w-12 h-12 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm"
                                >
                                    <span className="material-icons">close</span>
                                </button>
                            </div>
                            
                            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {selectedDateData.activities.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                                            <span className="material-icons text-gray-300 text-3xl">event_available</span>
                                        </div>
                                        <p className="text-gray-400 font-bold text-sm">Tidak ada kegiatan terjadwal di hari ini.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {selectedDateData.activities.map(act => (
                                            <div key={act.id} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 hover:border-indigo-100 transition-all">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="material-icons p-2 bg-white rounded-xl shadow-sm text-sm" style={{ color: act.color }}>
                                                        {act.type === 'event' ? 'event' : 'volunteer_activism'}
                                                    </span>
                                                    <div>
                                                        <h4 className="text-base font-black text-gray-800 line-clamp-1">{act.title}</h4>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{act.category}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Waktu & Jam</p>
                                                        <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                                                            <span className="material-icons text-[12px]">schedule</span> {act.time_str} WIB
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Jumlah Peserta</p>
                                                        <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                                                            <span className="material-icons text-[12px]">groups</span> {act.participants_count} Orang
                                                        </p>
                                                    </div>
                                                    {act.location && (
                                                        <div className="space-y-1 col-span-2">
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Lokasi Kegiatan</p>
                                                            <p className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                                                                <span className="material-icons text-[12px]">location_on</span> {act.location}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <Link 
                                                        to={act.url} target="_blank"
                                                        className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-center hover:bg-gray-50 transition-all"
                                                    >
                                                        Halaman Publik
                                                    </Link>
                                                    <Link 
                                                        to={act.type === 'event' ? `/dashboard/admin/events?id=${act.id.split('-')[1]}` : `/dashboard/admin/charity?id=${act.id.split('-')[1]}`}
                                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest text-center hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                                                    >
                                                        Panel Admin
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Legend */}
                <div className="mt-16 flex flex-wrap items-center justify-center gap-8 bg-white/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-lg bg-indigo-600 shadow-md shadow-indigo-100"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Agenda Event</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-lg bg-purple-600 shadow-md shadow-purple-100"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Event Internal</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-lg bg-rose-500 shadow-md shadow-rose-100"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Program Charity</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-lg bg-amber-400 shadow-md shadow-amber-100"></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Menunggu Review</span>
                    </div>
                </div>
            </div>
            
            <NavigationButton />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.6s ease-out forwards;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-down {
                    animation: slideDown 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ActivityCalendarPage;
