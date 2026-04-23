import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';
import { getLandingEvents } from '../services/eventApi';

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const getEventStatus = (startStr, endStr) => {
    const now = new Date();
    const start = new Date(startStr);
    // Use end_date if available, otherwise assume 4 hours duration
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 4 * 60 * 60 * 1000);

    if (now < start) {
        return { label: 'Akan Datang', color: 'bg-blue-600' };
    } else if (now >= start && now <= end) {
        return { label: 'Berlangsung', color: 'bg-green-600' };
    } else {
        return { label: 'Selesai', color: 'bg-gray-500' };
    }
};

const EventLandingPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredEvents, setFilteredEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await getLandingEvents();
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setEvents(data);
                setFilteredEvents(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query) {
            setFilteredEvents(events);
        } else {
            const filtered = events.filter(ev =>
                ev.title.toLowerCase().includes(query.toLowerCase()) ||
                ev.location.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredEvents(filtered);
        }
    };

    if (loading) {
        return (
            <div className="body flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>Event Seru - Barakah Economy</title>
                <meta name="description" content="Temukan berbagai event menarik dari komunitas Barakah Economy" />
            </Helmet>

            <HeaderHome onSearch={handleSearch} />

            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Event Seru</h1>
                        <p className="text-gray-500 text-sm">Ikuti berbagai kegiatan positif untuk bekal akhirat</p>
                    </div>
                </div>

                {filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
                        <span className="material-icons text-6xl mb-4 opacity-20">event_busy</span>
                        <p className="text-lg font-medium">Belum ada event yang tersedia</p>
                        <p className="text-sm mt-1">Coba cari dengan kata kunci lain atau silakan kembali nanti untuk melihat update terbaru</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {filteredEvents.map((ev) => (
                            <Link
                                key={ev.id}
                                to={`/event/${ev.slug}`}
                                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition group flex flex-col h-full"
                            >
                                <div className="h-56 relative overflow-hidden">
                                    {/* Diagonal Status Stamp */}
                                    {(() => {
                                        const status = getEventStatus(ev.start_date, ev.end_date);
                                        return (
                                            <div className="absolute top-0 left-0 overflow-hidden w-28 h-28 pointer-events-none z-10">
                                                <div className={`absolute top-6 left-[-45px] -rotate-45 ${status.color} text-white text-[8px] font-black py-1 w-44 text-center shadow-lg uppercase tracking-tight`}>
                                                    {status.label}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <img
                                        src={getMediaUrl(ev.header_image || ev.thumbnail)}
                                        alt={ev.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                                        <p className="text-xs font-bold text-green-700">
                                            {ev.is_featured ? '⭐ UNGGULAN' : 'EVENT'}
                                        </p>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                        <div className="flex items-center gap-2 text-white/90 text-xs font-medium">
                                            <span className="material-icons text-sm">location_on</span>
                                            {ev.location}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="font-bold text-gray-900 text-xl group-hover:text-green-700 transition-colors line-clamp-2 mb-3">
                                        {ev.title}
                                    </h3>
                                    <div className="flex items-center justify-between mb-4 flex-1">
                                        <p className="text-gray-500 text-sm line-clamp-2">
                                            {ev.short_description || ev.description?.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                        </p>
                                        <div className="flex items-center gap-1 opacity-40 ml-2">
                                            <span className="material-icons text-[14px]">visibility</span>
                                            <span className="text-[10px] font-bold">{ev.view_count || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                            <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center text-green-700">
                                                <span className="material-icons text-xs">calendar_today</span>
                                            </div>
                                            {new Date(ev.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <span className="text-green-700 text-xs font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                            LIHAT DETAIL <span className="material-icons text-sm">arrow_forward</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default EventLandingPage;
