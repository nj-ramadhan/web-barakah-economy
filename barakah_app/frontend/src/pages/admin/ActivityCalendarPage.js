import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;

const ActivityCalendarPage = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('monthly'); // weekly, monthly, quarterly, range
    const [currentDate, setCurrentDate] = useState(new Date());
    const [customRange, setCustomRange] = useState({ 
        start: new Date().toISOString().split('T')[0], 
        end: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0] 
    });

    const getAuth = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return { headers: { Authorization: `Bearer ${user?.access}` } };
    };

    const fetchActivities = async () => {
        setLoading(true);
        try {
            // We fetch everything for simplicity in the frontend filtering, 
            // but the API supports start/end if we wanted to optimize.
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
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    // Date Utilities
    const formatDate = (date) => {
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
    };

    const formatMonth = (date) => {
        return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    };

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    // Filtering Logic
    const filteredActivities = useMemo(() => {
        if (!activities.length) return [];

        const now = new Date(currentDate);
        let start, end;

        if (viewMode === 'weekly') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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
            // Overlap check
            return actStart <= end && actEnd >= start;
        }).sort((a, b) => new Date(a.start) - new Date(b.start));
    }, [activities, viewMode, currentDate, customRange]);

    // Calendar Grid Generation (Monthly)
    const calendarDays = useMemo(() => {
        if (viewMode !== 'monthly') return [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month); // 0 = Sun, 1 = Mon ...
        
        // Adjust first day to start from Monday (1)
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

        const days = [];
        // Padding for previous month
        for (let i = 0; i < adjustedFirstDay; i++) {
            days.push({ day: null, date: null });
        }
        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const acts = activities.filter(act => {
                const s = new Date(act.start);
                const e = new Date(act.end);
                const d = new Date(year, month, i);
                d.setHours(0,0,0,0);
                const dEnd = new Date(d);
                dEnd.setHours(23,59,59,999);
                return s <= dEnd && e >= d;
            });
            days.push({ day: i, date, activities: acts });
        }
        return days;
    }, [activities, currentDate, viewMode]);

    const changeDate = (offset) => {
        const next = new Date(currentDate);
        if (viewMode === 'weekly') next.setDate(next.getDate() + (offset * 7));
        else if (viewMode === 'monthly') next.setMonth(next.getMonth() + offset);
        else if (viewMode === 'quarterly') next.setMonth(next.getMonth() + (offset * 3));
        setCurrentDate(next);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Helmet>
                <title>Kalender Kegiatan Admin - Barakah Economy</title>
            </Helmet>
            <Header />
            <NavigationButton />

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                            <span className="material-icons text-indigo-600">calendar_month</span>
                            Kalender Kegiatan
                        </h1>
                        <p className="text-sm text-gray-500 font-medium">Monitoring jadwal event dan kampanye charity</p>
                    </div>

                    <div className="flex items-center bg-white p-1 rounded-2xl shadow-sm border border-gray-100 self-start">
                        {['weekly', 'monthly', 'quarterly', 'range'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    viewMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {mode === 'weekly' ? 'Mingguan' : mode === 'monthly' ? 'Bulanan' : mode === 'quarterly' ? 'Triwulan' : 'Range'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Navigation & Title */}
                {viewMode !== 'range' && (
                    <div className="flex items-center justify-between mb-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <button onClick={() => changeDate(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <h2 className="text-lg font-black text-gray-700 capitalize">
                            {viewMode === 'weekly' ? `Minggu ke-${Math.ceil(currentDate.getDate() / 7)} ${formatMonth(currentDate)}` :
                             viewMode === 'monthly' ? formatMonth(currentDate) :
                             `Triwulan ${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`}
                        </h2>
                        <button onClick={() => changeDate(1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition">
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                )}

                {viewMode === 'range' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mulai Dari</label>
                                <input 
                                    type="date" 
                                    value={customRange.start}
                                    onChange={e => setCustomRange({...customRange, start: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Hingga Sampai</label>
                                <input 
                                    type="date" 
                                    value={customRange.end}
                                    onChange={e => setCustomRange({...customRange, end: e.target.value})}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none transition-all font-bold text-gray-700"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Memuat Data Kalender...</p>
                    </div>
                ) : (
                    <>
                        {/* Monthly Grid View (Desktop Only) */}
                        {viewMode === 'monthly' && (
                            <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                                        <div key={day} className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{day}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 auto-rows-[120px]">
                                    {calendarDays.map((dayObj, i) => (
                                        <div key={i} className={`p-2 border-r border-b border-gray-50 group hover:bg-indigo-50/20 transition-colors ${!dayObj.day ? 'bg-gray-50/30' : ''}`}>
                                            {dayObj.day && (
                                                <>
                                                    <span className={`text-xs font-bold ${new Date().toDateString() === dayObj.date.toDateString() ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-400'}`}>
                                                        {dayObj.day}
                                                    </span>
                                                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                                        {dayObj.activities.map(act => (
                                                            <div 
                                                                key={act.id} 
                                                                className="px-2 py-1 rounded text-[8px] font-bold text-white truncate cursor-pointer hover:brightness-110"
                                                                style={{ backgroundColor: act.color }}
                                                                title={act.title}
                                                                onClick={() => window.open(act.url, '_blank')}
                                                            >
                                                                {act.title}
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
                        <div className={`${viewMode === 'monthly' ? 'md:hidden' : ''} space-y-4`}>
                            {filteredActivities.length === 0 ? (
                                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-icons text-gray-300 text-3xl">event_busy</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-1">Tidak Ada Kegiatan</h3>
                                    <p className="text-sm text-gray-400">Belum ada jadwal untuk periode ini.</p>
                                </div>
                            ) : (
                                filteredActivities.map((act) => (
                                    <div key={act.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row md:items-center">
                                        {/* Status Line */}
                                        <div className="w-1.5 h-full md:w-2" style={{ backgroundColor: act.color }}></div>
                                        
                                        <div className="flex-1 p-5">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                                    act.type === 'event' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {act.type === 'event' ? 'Event' : 'Charity'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{act.category}</span>
                                                {act.status === 'pending' && (
                                                    <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter animate-pulse">MENUNGGU REVIEW</span>
                                                )}
                                            </div>
                                            
                                            <h3 className="text-base font-black text-gray-800 group-hover:text-indigo-600 transition-colors mb-2">{act.title}</h3>
                                            
                                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                                                    <span className="material-icons text-sm">schedule</span>
                                                    {formatDate(act.start)} {new Date(act.start).toDateString() !== new Date(act.end).toDateString() && `- ${formatDate(act.end)}`}
                                                </div>
                                                {act.location && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                                                        <span className="material-icons text-sm">location_on</span>
                                                        {act.location}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-5 border-t md:border-t-0 md:border-l border-gray-50 bg-gray-50/50 md:bg-transparent flex justify-end gap-3">
                                            <Link 
                                                to={act.url}
                                                target="_blank"
                                                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition shadow-sm"
                                            >
                                                Lihat Detail
                                            </Link>
                                            {act.type === 'event' && (
                                                <Link 
                                                    to={`/dashboard/admin/events?id=${act.id.split('-')[1]}`}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
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
                
                {/* Legend */}
                <div className="mt-12 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kegiatan Event</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kampanye Charity</span>
                    </div>
                </div>
            </div>
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E5E7EB;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #D1D5DB;
                }
            `}</style>
        </div>
    );
};

export default ActivityCalendarPage;
