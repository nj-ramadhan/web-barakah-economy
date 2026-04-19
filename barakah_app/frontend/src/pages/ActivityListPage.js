import React, { useState, useEffect } from 'react';
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
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredActivities, setFilteredActivities] = useState([]);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/`);
                const data = Array.isArray(res.data) ? res.data : [];
                setActivities(data);
                setFilteredActivities(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivities();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query) {
            setFilteredActivities(activities);
        } else {
            const filtered = activities.filter(act => 
                act.title.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredActivities(filtered);
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
            <Helmet><title>Kegiatan Kami - Barakah Economy</title></Helmet>
            <HeaderHome onSearch={handleSearch} />
            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Kegiatan Kami</h1>
                <p className="text-gray-500 text-sm mb-6">Program dan aktivitas komunitas BAE</p>

                {activities.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <span className="material-icons text-5xl mb-2 opacity-20">event_busy</span>
                        <p className="text-sm">Belum ada kegiatan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activities.map((act) => (
                            <Link
                                key={act.id}
                                to={`/kegiatan/${act.id}`}
                                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition group"
                            >
                                <div className="h-48 overflow-hidden">
                                    <img
                                        src={getMediaUrl(act.header_image)}
                                        alt={act.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span className="material-icons text-sm">calendar_today</span>
                                            {new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-40">
                                            <span className="material-icons text-[14px]">visibility</span>
                                            <span className="text-[10px] font-bold">{act.view_count || 0}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-green-700 transition-colors line-clamp-2">
                                        {act.title}
                                    </h3>
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

export default ActivityListPage;
