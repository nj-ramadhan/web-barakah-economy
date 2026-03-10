import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const ActivityListPage = () => {
    const [activities, setActivities] = useState([]);
    const [featuredActivities, setFeaturedActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSlide, setActiveSlide] = useState(0);
    const sliderInterval = useRef(null);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/`);
            const allActivities = Array.isArray(res.data) ? res.data : [];
            setActivities(allActivities);
            setFeaturedActivities(allActivities.filter(act => act.is_featured).slice(0, 5));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    useEffect(() => {
        if (featuredActivities.length > 1) {
            sliderInterval.current = setInterval(() => {
                setActiveSlide(prev => (prev + 1) % featuredActivities.length);
            }, 5000);
        }
        return () => { if (sliderInterval.current) clearInterval(sliderInterval.current); };
    }, [featuredActivities]);

    const goToSlide = (index) => {
        setActiveSlide(index);
        if (sliderInterval.current) clearInterval(sliderInterval.current);
        sliderInterval.current = setInterval(() => {
            setActiveSlide(prev => (prev + 1) % featuredActivities.length);
        }, 5000);
    };

    if (loading) {
        return (
            <div className="body flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Kegiatan Kami - Barakah Economy</title></Helmet>
            <HeaderHome onSearch={(q) => { /* Optional: search logic */ }} />

            {/* Featured Section (Slider) */}
            <div className="px-4 pt-4 max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 10 }}>
                {featuredActivities.length > 0 && (
                    <div className="relative rounded-2xl overflow-hidden h-56 lg:h-96 shadow-lg">
                        <div className="h-full">
                            {featuredActivities.map((act, index) => (
                                <div
                                    key={act.id}
                                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                >
                                    <img
                                        src={getMediaUrl(act.header_image)}
                                        alt={act.title}
                                        className="w-full h-56 lg:h-96 object-cover"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 lg:p-10">
                                        <h2 className="text-white font-bold text-lg lg:text-3xl mb-3 line-clamp-2">{act.title}</h2>
                                        <Link
                                            to={`/kegiatan/${act.id}`}
                                            className="inline-block bg-green-700 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-green-800 transition shadow-lg"
                                        >
                                            BACA SELENGKAPNYA
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Indicators */}
                        {featuredActivities.length > 1 && (
                            <div className="absolute bottom-4 right-4 flex space-x-2 z-20 bg-black/20 backdrop-blur-sm p-2 rounded-full">
                                {featuredActivities.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToSlide(index)}
                                        className={`w-2 h-2 rounded-full transition-all ${index === activeSlide ? 'bg-white w-4' : 'bg-white/50'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Activities Grid */}
            <div className="px-4 py-8 max-w-6xl mx-auto">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                    <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
                    Semua Kegiatan Komunitas
                </h2>

                {activities.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                        <span className="material-icons text-5xl mb-2 opacity-20">event_busy</span>
                        <p className="text-sm">Belum ada kegiatan terbaru</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        {activities.map((act) => (
                            <div key={act.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition group">
                                <Link to={`/kegiatan/${act.id}`} className="relative h-32 md:h-40 overflow-hidden">
                                    <img
                                        src={getMediaUrl(act.header_image)}
                                        alt={act.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
                                        <p className="text-[10px] font-bold text-green-700">
                                            {act.date ? new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru'}
                                        </p>
                                    </div>
                                </Link>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="font-bold text-gray-900 text-sm mb-3 line-clamp-2 group-hover:text-green-700 transition flex-1">
                                        {act.title}
                                    </h3>
                                    <Link
                                        to={`/kegiatan/${act.id}`}
                                        className="block text-center bg-gray-50 text-green-700 py-2 rounded-xl text-[10px] font-bold hover:bg-green-700 hover:text-white transition"
                                    >
                                        BACA DETAIL
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default ActivityListPage;

