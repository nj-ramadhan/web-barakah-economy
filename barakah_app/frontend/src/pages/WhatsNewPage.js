import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import siteContentService from '../services/siteContent';

const TAG_COLORS = {
    fitur_baru: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'auto_awesome', label: 'Fitur Baru' },
    peningkatan: { bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: 'trending_up', label: 'Peningkatan' },
    perbaikan: { bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'build', label: 'Perbaikan Bug' },
    pengumuman: { bg: 'bg-purple-100 text-purple-800 border-purple-300', icon: 'campaign', label: 'Pengumuman' },
    promo: { bg: 'bg-rose-100 text-rose-800 border-rose-300', icon: 'local_offer', label: 'Event & Promo' },
};

const WhatsNewPage = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItem, setExpandedItem] = useState(null);

    useEffect(() => {
        const fetchWhatsNew = async () => {
            try {
                const res = await siteContentService.getWhatsNew();
                const raw = res.data?.results || (Array.isArray(res.data) ? res.data : []);
                setItems(raw.filter(i => i.is_published));
                // If there are items, store last seen id to mark badge as read
                if (raw.length > 0) {
                    localStorage.setItem('last_seen_whats_new_id', raw[0].id.toString());
                }
            } catch (err) {
                console.error('Failed to load Whats New:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchWhatsNew();
    }, []);

    const filteredItems = items.filter(item => {
        if (activeFilter !== 'all' && item.tag !== activeFilter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (item.title || '').toLowerCase().includes(q) ||
            (item.version || '').toLowerCase().includes(q) ||
            (item.summary || '').toLowerCase().includes(q)
        );
    });

    const getTag = (tagKey) => TAG_COLORS[tagKey] || TAG_COLORS.fitur_baru;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
            <Header onSearch={setSearchQuery} />

            <div className="max-w-4xl mx-auto w-full px-4 py-6">
                {/* Hero Header Banner */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 sm:p-8 mb-8 shadow-xl">
                    <div className="relative z-10 max-w-xl">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-black uppercase tracking-wider mb-3">
                            <span className="material-icons text-xs text-amber-300">auto_awesome</span>
                            <span>Release Notes & Changelog</span>
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                            Apa yang Baru di Barakah Economy?
                        </h1>
                        <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                            Temukan fitur terbaru, peningkatan performa, dan pembaruan sistem yang kami hadirkan untuk kenyamanan beraktivitas dan bermuamalah Anda.
                        </p>
                    </div>

                    <div className="absolute right-4 bottom-0 opacity-15 pointer-events-none transform translate-y-4">
                        <span className="material-icons text-[140px]">rocket_launch</span>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 custom-scrollbar">
                    <button
                        onClick={() => setActiveFilter('all')}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap shadow-xs ${
                            activeFilter === 'all'
                                ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        Semua Update ({items.length})
                    </button>
                    {Object.entries(TAG_COLORS).map(([key, val]) => {
                        const count = items.filter(i => i.tag === key).length;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveFilter(key)}
                                className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                                    activeFilter === key
                                        ? 'bg-emerald-700 text-white shadow-emerald-700/20'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                <span className="material-icons text-xs">{val.icon}</span>
                                <span>{val.label} ({count})</span>
                            </button>
                        );
                    })}
                </div>

                {/* Timeline / Items Feed */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm">
                        <span className="material-icons text-5xl text-gray-300 mb-2">newspaper</span>
                        <h3 className="text-base font-bold text-gray-700">Tidak ada pembaruan ditemukan</h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                            Coba ubah filter atau kata kunci pencarian Anda.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredItems.map((item) => {
                            const tagInfo = getTag(item.tag);
                            const isExpanded = expandedItem === item.id;

                            return (
                                <article
                                    key={item.id}
                                    className="bg-white rounded-3xl border border-gray-200/80 shadow-sm hover:shadow-md transition duration-200 overflow-hidden"
                                >
                                    {/* Cover Image if Available */}
                                    {item.cover_image && (
                                        <div className="relative h-60 sm:h-72 w-full bg-gray-100 overflow-hidden">
                                            <img
                                                src={item.cover_image}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                                            {/* Version & Tag badges on image */}
                                            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                                                {item.version && (
                                                    <span className="bg-black/70 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-xl border border-white/20">
                                                        {item.version}
                                                    </span>
                                                )}
                                                <span className={`text-xs font-black px-3 py-1 rounded-xl border ${tagInfo.bg}`}>
                                                    {item.badge_label || tagInfo.label}
                                                </span>
                                            </div>

                                            <div className="absolute bottom-3 right-4 text-xs text-white font-bold drop-shadow">
                                                {new Date(item.release_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Header if no cover image */}
                                    {!item.cover_image && (
                                        <div className="p-6 pb-0 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {item.version && (
                                                    <span className="bg-emerald-800 text-white text-xs font-black px-3 py-1 rounded-xl">
                                                        {item.version}
                                                    </span>
                                                )}
                                                <span className={`text-xs font-black px-3 py-1 rounded-xl border ${tagInfo.bg}`}>
                                                    {item.badge_label || tagInfo.label}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 font-bold">
                                                {new Date(item.release_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                    )}

                                    {/* Card Body */}
                                    <div className="p-6">
                                        <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-2 leading-snug">
                                            {item.title}
                                        </h2>

                                        {item.summary && (
                                            <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mb-4 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                                                {item.summary}
                                            </p>
                                        )}

                                        {/* Content Type: Bullet List */}
                                        {item.content_type === 'bullet_list' && Array.isArray(item.bullet_items) && (
                                            <div className="space-y-2 mb-4">
                                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                    Daftar Pembaruan & Fitur:
                                                </h4>
                                                {item.bullet_items.map((bullet, bIdx) => (
                                                    <div key={bIdx} className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                                                        <span className="material-icons text-emerald-600 text-base mt-0.5 shrink-0">check_circle</span>
                                                        <span className="text-xs text-gray-800 leading-relaxed font-medium">{bullet}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Content Type: Rich Text */}
                                        {item.content_type === 'rich_text' && item.content_html && (
                                            <div className={`text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed space-y-2 ${
                                                !isExpanded && item.content_html.length > 300 ? 'line-clamp-4' : ''
                                            }`}>
                                                {item.content_html}
                                            </div>
                                        )}

                                        {/* Toggle expand if long text */}
                                        {item.content_type === 'rich_text' && item.content_html && item.content_html.length > 300 && (
                                            <button
                                                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 mt-2 flex items-center gap-1"
                                            >
                                                <span>{isExpanded ? 'Tampilkan Lebih Sedikit' : 'Baca Selengkapnya'}</span>
                                                <span className="material-icons text-xs">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                            </button>
                                        )}

                                        {/* Action Button (CTA) */}
                                        {item.action_button_text && (
                                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                                <button
                                                    onClick={() => item.action_button_url && (item.action_button_url.startsWith('http') ? window.open(item.action_button_url, '_blank') : navigate(item.action_button_url))}
                                                    className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-black text-xs shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition"
                                                >
                                                    <span>{item.action_button_text}</span>
                                                    <span className="material-icons text-sm">arrow_forward</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default WhatsNewPage;
