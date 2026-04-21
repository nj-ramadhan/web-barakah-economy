import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Helmet } from 'react-helmet';

const DashboardMyEventsPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMyEvents = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/events/my_events/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                setEvents(res.data);
            } catch (err) {
                console.error('Error fetching my events:', err);
                setError('Gagal memuat daftar event Anda.');
            } finally {
                setLoading(false);
            }
        };

        fetchMyEvents();
    }, [navigate]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-bold uppercase">Disetujui</span>;
            case 'pending':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-[10px] font-bold uppercase">Menunggu</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-bold uppercase">Ditolak</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase">{status}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-20">
            <Helmet>
                <title>Event Saya | BARAKAH APP</title>
            </Helmet>
            <Header />

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">Event Saya</h1>
                        <p className="text-sm text-gray-500 font-medium">Kelola semua pengajuan event Anda di sini</p>
                    </div>
                    <Link 
                        to="/event/ajukan" 
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition shadow-lg shadow-green-200"
                    >
                        <span className="material-icons">add</span>
                        Ajukan Event
                    </Link>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 animate-pulse">
                                <div className="flex gap-4">
                                    <div className="w-24 h-24 bg-gray-200 rounded-2xl"></div>
                                    <div className="flex-1 space-y-3">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                                        <div className="h-6 bg-gray-100 rounded-full w-20"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-6 rounded-[2rem] border border-red-100 text-center font-bold">
                        <span className="material-icons text-3xl mb-2">error_outline</span>
                        <p>{error}</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-gray-300 text-4xl">event_busy</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Belum ada Event</h3>
                        <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Anda belum pernah mengajukan event. Mulai ajukan event pertama Anda sekarang!</p>
                        <Link 
                            to="/event/ajukan" 
                            className="inline-flex items-center gap-2 text-green-600 font-bold hover:underline"
                        >
                            Ajukan Sekarang <span className="material-icons text-sm">arrow_forward</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.map(event => (
                            <div key={event.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                                        <img 
                                            src={event.thumbnail || '/images/event-placeholder.jpg'} 
                                            alt={event.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.src = '/images/event-placeholder.jpg'}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                            <h3 className="text-lg font-black text-gray-900">{event.title}</h3>
                                            {getStatusBadge(event.status)}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                                <span className="material-icons text-sm">calendar_today</span>
                                                {new Date(event.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                                <span className="material-icons text-sm">location_on</span>
                                                {event.location}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                                <span className="material-icons text-sm">people</span>
                                                {event.registration_count || 0} Terdaftar
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <Link 
                                                to={`/event/${event.slug}`}
                                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1.5"
                                            >
                                                <span className="material-icons text-sm">visibility</span>
                                                Lihat
                                            </Link>
                                            <Link 
                                                to={`/event/edit/${event.slug}`}
                                                className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition flex items-center gap-1.5"
                                            >
                                                <span className="material-icons text-sm">edit</span>
                                                Edit
                                            </Link>
                                            <Link 
                                                to={`/dashboard/event/submissions/${event.slug}`}
                                                className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition flex items-center gap-1.5"
                                            >
                                                <span className="material-icons text-sm">group</span>
                                                Peserta
                                            </Link>
                                            <Link 
                                                to={`/dashboard/event/scan/${event.slug}`}
                                                className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition flex items-center gap-1.5"
                                            >
                                                <span className="material-icons text-sm">qr_code_scanner</span>
                                                Scan Hadir
                                            </Link>
                                        </div>
                                        
                                        {event.status === 'rejected' && event.rejection_reason && (
                                            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                                                <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Alasan Penolakan:</p>
                                                <p className="text-xs text-red-500">{event.rejection_reason}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <NavigationButton />
        </div>
    );
};

export default DashboardMyEventsPage;
