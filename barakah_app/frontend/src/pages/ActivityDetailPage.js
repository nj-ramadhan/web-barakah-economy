import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShareButton from '../components/campaigns/ShareButton';

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
                let content = res.data.content;

                // Parse custom link format [Title | URL]
                content = content.replace(/\[(.*?)\s*\|\s*(https?:\/\/.*?)\]/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-green-700 underline font-semibold">$1</a>');

                // Auto-link plain URLs that are not already in an <a> tag
                const urlRegex = /(?<!href="|">)(https?:\/\/[^\s<]+)/g;
                content = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-green-700 underline font-semibold">$1</a>');

                setActivity({ ...res.data, content });
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
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="material-icons text-sm">calendar_today</span>
                            {new Date(activity.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1.5 opacity-60">
                            <span className="material-icons text-[16px]">visibility</span>
                            <span className="text-xs font-medium">{activity.view_count || 0} kali dilihat</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{activity.title}</h1>
                        <ShareButton slug={id} title={activity.title} type="activity" />
                    </div>
                </div>

                {/* Rich content */}
                <div
                    className="prose prose-green max-w-none text-gray-700 leading-relaxed
                        prose-img:rounded-xl prose-img:shadow-md
                        prose-headings:text-gray-900
                        prose-a:text-green-700 prose-a:underline prose-a:font-semibold
                    "
                    dangerouslySetInnerHTML={{ __html: activity.content }}
                    ref={(el) => {
                        if (el) {
                            el.querySelectorAll('a').forEach(link => {
                                link.setAttribute('target', '_blank');
                                link.setAttribute('rel', 'noopener noreferrer');
                            });
                        }
                    }}
                />
            </div>
            <NavigationButton />
        </div>
    );
};

export default ActivityDetailPage;
