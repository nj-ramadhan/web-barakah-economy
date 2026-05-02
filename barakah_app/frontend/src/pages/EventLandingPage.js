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
    const CATEGORY_LIMIT = 6;

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

            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Event Seru</h1>
                        <p className="text-gray-500 text-sm">Ikuti berbagai kegiatan positif untuk bekal akhirat</p>
                    </div>
                </div>

                {/* Category Filter Chips */}
                {categories.length > 1 && (
                    <div className="mb-8">
                        <div className={`flex ${isExpanded ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'} gap-2 -mx-4 px-4 pb-2 scroll-smooth transition-all duration-500`}>
                            {(isExpanded ? categories : categories.slice(0, CATEGORY_LIMIT)).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-5 py-2 rounded-full text-[10px] font-black whitespace-nowrap transition-all duration-300 border ${
                                        selectedCategory === cat
                                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-100 scale-105'
                                            : 'bg-white text-gray-600 border-gray-100 hover:border-green-200 hover:bg-green-50/50'
                                    } uppercase tracking-widest`}
                                >
                                    {cat}
                                </button>
                            ))}
                            
                            {categories.length > CATEGORY_LIMIT && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className={`px-5 py-2 rounded-full text-[10px] font-black whitespace-nowrap transition-all duration-300 flex items-center gap-1 ${
                                        isExpanded 
                                            ? 'bg-gray-100 text-gray-800 border-gray-200' 
                                            : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'
                                    } border uppercase tracking-widest`}
                                >
                                    {isExpanded ? (
                                        <>SEMBUNYIKAN <span className="material-icons text-sm">expand_less</span></>
                                    ) : (
                                        <>{`LIHAT SEMUA (${categories.length})`} <span className="material-icons text-sm">expand_more</span></>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
                        <span className="material-icons text-6xl mb-4 opacity-20">event_busy</span>
                        <p className="text-lg font-medium">Belum ada event yang tersedia</p>
                        <p className="text-sm mt-1">Coba cari dengan kata kunci lain atau silakan kembali nanti untuk melihat update terbaru</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {filteredEvents.map((ev) => {
                            const status = getEventStatus(ev.start_date, ev.end_date);
                            return (
                                <Link
                                    key={ev.id}
                                    to={`/event/${ev.slug}`}
                                    className="block group"
                                >
                                    <div className="event-poster-container aspect-[4/5] rounded-[2rem] shadow-xl border border-gray-100">
                                        <img
                                            src={getMediaUrl(ev.header_image || ev.thumbnail)}
                                            alt={ev.title}
                                            className="event-poster-image"
                                            onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                        />
                                        
                                        {/* Finished Overlay */}
                                        {status.isFinished && (
                                            <div className="event-finished-overlay">
                                                <div className="event-finished-text">Selesai</div>
                                            </div>
                                        )}

                                        {/* Status Label (Top Right) */}
                                        {!status.isFinished && (
                                            <div className="absolute top-4 right-4 z-10">
                                                <div className={`${status.color} text-white text-[8px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest backdrop-blur-sm bg-opacity-90`}>
                                                    {status.label}
                                                </div>
                                            </div>
                                        )}

                                        {/* Category Label (Top Left) */}
                                        {ev.category && (
                                            <div className="absolute top-4 left-4 z-10">
                                                <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                                                    <p className="text-[8px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                                                        {ev.category}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Certificate Badge */}
                                        {ev.has_certificate && (
                                            <div className="absolute bottom-4 left-4 z-10">
                                                <div className="bg-amber-500/90 backdrop-blur-sm p-1.5 rounded-full shadow-lg border border-amber-400">
                                                    <span className="material-icons text-[12px] text-white block">verified</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Title Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                            <h3 className="text-white font-black text-sm md:text-base leading-tight mb-2 uppercase tracking-tight">
                                                {ev.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-white/70 text-[10px] font-bold">
                                                <span className="material-icons text-[12px]">calendar_today</span>
                                                {new Date(ev.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
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
