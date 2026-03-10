import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const ActivityDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/${id}/`);
                setActivity(res.data);
            } catch (err) {
                console.error(err);
                alert('Kegiatan tidak ditemukan');
                navigate('/kegiatan');
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="body flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!activity) return null;

    return (
        <div className="body">
            <Helmet><title>{activity.title} - Barakah Economy</title></Helmet>
            <Header />
            <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
                {/* Back button */}
                <button
                    onClick={() => navigate('/kegiatan')}
                    className="flex items-center gap-1 text-gray-400 hover:text-green-700 transition mb-4 text-sm"
                >
                    <span className="material-icons text-lg">arrow_back</span>
                    Kembali ke Kegiatan
                </button>

                {/* Header image */}
                <div className="rounded-2xl overflow-hidden mb-6 shadow-md">
                    <img
                        src={getMediaUrl(activity.header_image)}
                        alt={activity.title}
                        className="w-full h-64 md:h-80 object-cover"
                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                    />
                </div>

                {/* Title and date */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <span className="material-icons text-sm">calendar_today</span>
                        {new Date(activity.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{activity.title}</h1>
                </div>

                {/* Rich content */}
                <div
                    className="prose prose-green max-w-none text-gray-700 leading-relaxed
                        prose-img:rounded-xl prose-img:shadow-md
                        prose-headings:text-gray-900
                        prose-a:text-green-700
                    "
                    dangerouslySetInnerHTML={{ __html: activity.content }}
                />
            </div>
            <NavigationButton />
        </div>
    );
};

export default ActivityDetailPage;
