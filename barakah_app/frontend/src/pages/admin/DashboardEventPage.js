import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getEvents, updateEvent, deleteEvent } from '../../services/eventApi';

const API = process.env.REACT_APP_API_BASE_URL;

const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

const DashboardEventPage = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editForm, setEditForm] = useState({});

    const fetchEvents = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page };
            if (searchQuery) params.search = searchQuery;
            if (filterStatus) params.status = filterStatus;
            
            const response = await getEvents(params);
            if (response.data.results) {
                setEvents(response.data.results);
                setTotalCount(response.data.count);
                setTotalPages(Math.ceil(response.data.count / 10));
            } else {
                setEvents(response.data);
                setTotalCount(response.data.length);
                setTotalPages(1);
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [searchQuery, filterStatus]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }
        fetchEvents(currentPage);
    }, [navigate, fetchEvents, currentPage]);

    const handleStatusUpdate = async (slug, newStatus) => {
        try {
            await updateEvent(slug, { status: newStatus });
            fetchEvents(currentPage);
        } catch (err) { alert('Gagal update status'); }
    };

    const handleDelete = async (slug) => {
        if (!window.confirm('Yakin ingin menghapus event ini?')) return;
        try {
            await deleteEvent(slug);
            fetchEvents(currentPage);
        } catch (err) { alert('Gagal menghapus event'); }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Management Event - Admin Dashboard</title></Helmet>
            <Header />
            
            <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Management Event</h1>
                        <p className="text-sm text-gray-500">Tinjau dan kelola pengajuan event</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] relative">
                        <span className="material-icons absolute left-3 top-2.5 text-gray-400 text-sm">search</span>
                        <input 
                            type="text" 
                            placeholder="Cari event..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm"
                        />
                    </div>
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 bg-gray-50 border-none rounded-xl text-sm min-w-[150px]"
                    >
                        <option value="">Semua Status</option>
                        <option value="pending">Menunggu</option>
                        <option value="approved">Disetujui</option>
                        <option value="rejected">Ditolak</option>
                        <option value="completed">Selesai</option>
                    </select>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-4 font-bold text-gray-600 uppercase tracking-wider text-[11px]">Event</th>
                                    <th className="px-4 py-4 font-bold text-gray-600 uppercase tracking-wider text-[11px]">Penyelenggara</th>
                                    <th className="px-4 py-4 font-bold text-gray-600 uppercase tracking-wider text-[11px]">Waktu & Tempat</th>
                                    <th className="px-4 py-4 font-bold text-gray-600 uppercase tracking-wider text-[11px]">Pendaftar</th>
                                    <th className="px-4 py-4 font-bold text-gray-600 uppercase tracking-wider text-[11px]">Status</th>
                                    <th className="px-4 py-4 font-bold text-gray-600 uppercase tracking-wider text-[11px] text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 font-medium">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-10 text-gray-400 animate-pulse">Memuat data event...</td></tr>
                                ) : events.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-10 text-gray-400 italic">Tidak ada event ditemukan</td></tr>
                                ) : events.map(ev => (
                                    <tr key={ev.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <img src={ev.thumbnail || '/placeholder-image.jpg'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 line-clamp-1">{ev.title}</p>
                                                    <p className="text-[10px] text-gray-400">ID: {ev.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-xs">
                                            <p className="text-gray-900">{ev.organizer_name}</p>
                                            <p className="text-gray-400 mt-0.5">{ev.organizer_contact || 'No contact'}</p>
                                        </td>
                                        <td className="px-4 py-4 text-xs whitespace-nowrap">
                                            <p className="text-gray-900">{new Date(ev.start_date).toLocaleDateString('id-ID')}</p>
                                            <p className="text-gray-500 mt-0.5 line-clamp-1 max-w-[150px]">{ev.location}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Link 
                                                to={`/dashboard/event/submissions/${ev.slug}`}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-bold hover:bg-blue-600 hover:text-white transition shadow-sm border border-blue-100"
                                            >
                                                <span className="material-icons text-xs">people</span>
                                                {ev.registration_count || 0} DATA
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                ev.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                ev.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                ev.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {ev.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button 
                                                    onClick={() => navigate(`/event/${ev.slug}`)}
                                                    className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-gray-900 hover:text-white transition"
                                                    title="Lihat Event"
                                                >
                                                    <span className="material-icons text-sm">visibility</span>
                                                </button>
                                                
                                                {ev.status === 'pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(ev.slug, 'approved')}
                                                            className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-600 hover:text-white transition"
                                                            title="Setujui"
                                                        >
                                                            <span className="material-icons text-sm">check</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(ev.slug, 'rejected')}
                                                            className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                                                            title="Tolak"
                                                        >
                                                            <span className="material-icons text-sm">close</span>
                                                        </button>
                                                    </>
                                                )}
                                                
                                                <button 
                                                    onClick={() => navigate(`/event/edit/${ev.slug}`)}
                                                    className="w-8 h-8 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-green-700 hover:text-white transition"
                                                    title="Edit Event"
                                                >
                                                    <span className="material-icons text-sm">edit</span>
                                                </button>

                                                <button 
                                                    onClick={() => handleDelete(ev.slug)}
                                                    className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                                                    title="Hapus"
                                                >
                                                    <span className="material-icons text-sm">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination Placeholder */}
                    <div className="px-4 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <p>Showing {events.length} of {totalCount} events</p>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} className="px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50">Prev</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} className="px-3 py-1 bg-white border border-gray-200 rounded-md hover:bg-gray-50">Next</button>
                        </div>
                    </div>
                </div>
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardEventPage;
