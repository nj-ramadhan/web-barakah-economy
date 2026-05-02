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
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 4 * 60 * 60 * 1000);

    const isFinished = now > end;
    
    if (now < start) {
        return { label: 'Akan Datang', color: 'bg-blue-600', isFinished };
    } else if (now >= start && now <= end) {
        return { label: 'Berlangsung', color: 'bg-green-600', isFinished };
    } else {
        return { label: 'Selesai', color: 'bg-gray-500', isFinished };
    }
};

const EventLandingPage = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [isExpanded, setIsExpanded] = useState(false);
    const CATEGORY_LIMIT = 1; // Show only 'Semua' initially

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await getLandingEvents();
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setEvents(data);
                setFilteredEvents(data);
                
                // Extract unique categories
                const cats = ['Semua', ...new Set(data.map(ev => ev.category).filter(Boolean))];
                setCategories(cats);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    useEffect(() => {
        let result = events;
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(ev =>
                ev.title.toLowerCase().includes(query) ||
                ev.location.toLowerCase().includes(query)
            );
        }
        
        if (selectedCategory !== 'Semua') {
            result = result.filter(ev => ev.category === selectedCategory);
        }
        
        setFilteredEvents(result);
    }, [searchQuery, selectedCategory, events]);

    const handleSearch = (query) => {
        setSearchQuery(query);
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

            <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Event Seru</h1>
                        <p className="text-gray-500 text-sm">Ikuti berbagai kegiatan positif untuk bekal akhirat</p>
                    </div>
                </div>

                {/* Category Filter Chips */}
                {categories.length > 1 && (
                    <div className="mb-8">
                        <div className="flex flex-wrap gap-2 transition-all duration-500 mb-4">
                            {(isExpanded ? categories : categories.slice(0, CATEGORY_LIMIT)).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all duration-300 border ${
                                        selectedCategory === cat
                                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-100 scale-105'
                                            : 'bg-white text-gray-600 border-gray-100 hover:border-green-200 hover:bg-green-50/50'
                                    } uppercase tracking-widest`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        
                        {categories.length > CATEGORY_LIMIT && (
                            <div className="flex justify-center md:justify-start">
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className={`px-8 py-2 rounded-xl text-[10px] font-black transition-all duration-300 flex items-center gap-2 ${
                                        isExpanded 
                                            ? 'bg-gray-100 text-gray-800 border-gray-200' 
                                            : 'bg-white text-green-700 border-green-600 hover:bg-green-50'
                                    } border uppercase tracking-widest shadow-sm`}
                                >
                                    {isExpanded ? (
                                        <>SEMBUNYIKAN KATEGORI <span className="material-icons text-sm">expand_less</span></>
                                    ) : (
                                        <>{`LIHAT SEMUA KATEGORI (${categories.length})`} <span className="material-icons text-sm">expand_more</span></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
                        <span className="material-icons text-6xl mb-4 opacity-20">event_busy</span>
                        <p className="text-lg font-medium">Belum ada event yang tersedia</p>
                        <p className="text-sm mt-1">Coba cari dengan kata kunci lain atau silakan kembali nanti untuk melihat update terbaru</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {filteredEvents.map((ev) => {
                            const status = getEventStatus(ev.start_date, ev.end_date);
                            return (
                                <Link
                                    key={ev.id}
                                    to={`/event/${ev.slug}`}
                                    className="block group"
                                >
                                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md border border-gray-100 group-hover:shadow-xl transition">
                                        <img
                                            src={getMediaUrl(ev.header_image || ev.thumbnail)}
                                            alt={ev.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                        />
                                        {/* Finished Overlay */}
                                        {status.isFinished && (
                                            <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                                                <span className="text-white font-bold text-sm uppercase tracking-widest border-2 border-white/50 px-3 py-1 rounded rotate-[-10deg]">Selesai</span>
                                            </div>
                                        )}
                                        {/* Date Badge */}
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
                                            <p className="text-[10px] font-bold text-green-700">
                                                {new Date(ev.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        {/* Status Badge */}
                                        {!status.isFinished && (
                                            <div className="absolute top-3 right-3">
                                                <span className={`${status.color} text-white text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                        )}
                                        {/* Certificate Badge */}
                                        {ev.has_certificate && (
                                            <div className="absolute top-3 right-3 mt-7">
                                                <div className="bg-amber-500/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-amber-400">
                                                    <span className="material-icons text-[12px] text-white block">verified</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* Bottom Gradient Overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 md:p-4 pt-12 md:pt-16">
                                            {ev.category && (
                                                <span className="inline-block text-[8px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full mb-1.5 font-bold uppercase tracking-wider">{ev.category}</span>
                                            )}
                                            <h3 className="text-white font-bold text-xs md:text-sm leading-tight line-clamp-2 mb-0.5">{ev.title}</h3>
                                            <div className="flex items-center gap-1 text-white/60 text-[10px]">
                                                <span className="material-icons text-[12px]">location_on</span>
                                                <span className="line-clamp-1">{ev.location || 'Online'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default EventLandingPage;
