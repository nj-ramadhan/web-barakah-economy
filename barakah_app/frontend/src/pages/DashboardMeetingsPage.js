import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMeetings } from '../services/meetingApi';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Helmet } from 'react-helmet';
import { getMediaUrl } from '../utils/mediaUtils';

const DashboardMeetingsPage = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchMeetings = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                const res = await getMeetings();
                setMeetings(res.data);
            } catch (err) {
                console.error('Error fetching meetings:', err);
                setError('Gagal memuat daftar rapat.');
            } finally {
                setLoading(false);
            }
        };

        fetchMeetings();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-20">
            <Helmet>
                <title>Manajemen Rapat | BARAKAH APP</title>
            </Helmet>
            <Header />

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">Manajemen Rapat</h1>
                        <p className="text-sm text-gray-500 font-medium">Kelola rapat internal dan daftar kehadiran</p>
                    </div>
                    <Link 
                        to="/dashboard/meetings/new" 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition shadow-lg shadow-blue-200"
                    >
                        <span className="material-icons">add</span>
                        Buat Rapat
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
                ) : meetings.length === 0 ? (
                    <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-gray-300 text-4xl">groups</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Belum ada Rapat</h3>
                        <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">Anda belum membuat agenda rapat internal.</p>
                        <Link 
                            to="/dashboard/meetings/new" 
                            className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
                        >
                            Buat Rapat Sekarang <span className="material-icons text-sm">arrow_forward</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {meetings.map(meeting => (
                            <div key={meeting.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition">
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
                                        <img 
                                            src={getMediaUrl(meeting.thumbnail) || '/images/event-placeholder.jpg'} 
                                            alt={meeting.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => e.target.src = '/images/event-placeholder.jpg'}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                            <h3 className="text-lg font-black text-gray-900">{meeting.title}</h3>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">Internal</span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                                <span className="material-icons text-sm">calendar_today</span>
                                                {new Date(meeting.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                                <span className="material-icons text-sm">location_on</span>
                                                {meeting.location}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                                <span className="material-icons text-sm">people</span>
                                                {meeting.participant_count || 0} Peserta
                                            </div>
                                        </div>

                                            <Link 
                                                to={`/meetings/${meeting.slug}`}
                                                target="_blank"
                                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1.5"
                                            >
                                                <span className="material-icons text-sm">visibility</span>
                                                Lihat
                                            </Link>
                                            <Link 
                                                to={`/dashboard/meetings/manage/${meeting.slug}`}
                                                className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition flex items-center gap-1.5"
                                            >
                                                <span className="material-icons text-sm">manage_accounts</span>
                                                Kelola & Absensi
                                            </Link>
                                            <Link 
                                                to={`/dashboard/meetings/edit/${meeting.slug}`}
                                                className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition flex items-center gap-1.5"
                                            >
                                                <span className="material-icons text-sm">edit</span>
                                                Edit
                                            </Link>
                                        </div>
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

export default DashboardMeetingsPage;
