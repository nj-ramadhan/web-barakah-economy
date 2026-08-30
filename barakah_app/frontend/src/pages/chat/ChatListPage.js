import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderHome from '../../components/layout/HeaderHome';
import NavigationButton from '../../components/layout/Navigation';
import { getSessions, getCategories, createSession, getUnreadChatCount } from '../../services/chatApi';

const ChatListPage = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'store', 'consultant'
    const [unreadStats, setUnreadStats] = useState({ total_unread: 0, store_unread: 0, consultant_unread: 0, by_session: {} });

    const fetchData = async () => {
        try {
            const [sessionsRes, categoriesRes, unreadRes] = await Promise.all([
                getSessions(),
                getCategories(),
                getUnreadChatCount()
            ]);
            const rawSessions = sessionsRes.data?.results || (Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
            setSessions(rawSessions);
            const rawCategories = categoriesRes.data?.results || (Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
            setCategories(rawCategories.filter(c => c.is_active));
            setUnreadStats(unreadRes.data || { total_unread: 0, store_unread: 0, consultant_unread: 0, by_session: {} });
        } catch (err) {
            console.error('Failed to fetch chat data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            getSessions().then(res => {
                const rawSessions = res.data?.results || (Array.isArray(res.data) ? res.data : []);
                setSessions(rawSessions);
            }).catch(() => {});
            getUnreadChatCount().then(res => setUnreadStats(res.data)).catch(() => {});
        }, 6000);
        return () => clearInterval(interval);
    }, []);


    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const handleCategorySelect = async (category) => {
        try {
            const res = await createSession(category.id, null);
            navigate(`/chat/${res.data.id}`);
        } catch (err) {
            alert('Gagal memulai konsultasi. Silakan coba lagi nanti.');
        }
    };

    // Filter sessions by tab and search
    const filteredSessions = sessions.filter(session => {
        const isStoreChat = session.session_type === 'store' || session.session_type === 'order' || !!session.product || !!session.order;
        const isConsultantChat = session.session_type === 'consultant' || (!isStoreChat && !session.seller);

        if (activeTab === 'store' && !isStoreChat) return false;
        if (activeTab === 'consultant' && !isConsultantChat) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();

        const otherUser = session.seller_details?.username === currentUser.username
            ? session.user_details
            : (session.consultant_details?.username === currentUser.username ? session.user_details : (session.seller_details || session.consultant_details || session.user_details));

        const otherName = (otherUser?.username || '').toLowerCase();
        const categoryName = (session.category_name || '').toLowerCase();
        const prodTitle = (session.product_details?.title || '').toLowerCase();
        const orderNum = (session.order_details?.order_number || '').toLowerCase();
        const lastMsg = (session.last_message?.content || '').toLowerCase();

        return otherName.includes(q) || categoryName.includes(q) || prodTitle.includes(q) || orderNum.includes(q) || lastMsg.includes(q);
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
                <HeaderHome onSearch={setSearchQuery} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
            <HeaderHome onSearch={setSearchQuery} />

            <div className="max-w-2xl mx-auto w-full px-4 py-4">
                {/* Header Title & New Chat Action */}
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Pesan & Chat</h1>
                        <p className="text-xs text-gray-500">Tanya penjual toko & konsultasi pakar syariah</p>
                    </div>
                    <button
                        onClick={() => setShowNewChat(true)}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-green-600 to-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-green-200 hover:shadow-lg transition"
                    >
                        <span className="material-icons text-sm">add_comment</span>
                        <span>Mulai Chat</span>
                    </button>
                </div>

                {/* Tabs Filter with Live Red Count Badges */}
                <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-4 gap-1">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                            activeTab === 'all' ? 'bg-green-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <span>Semua</span>
                        {unreadStats.total_unread > 0 ? (
                            <span className="bg-red-600 text-white text-[10px] font-black min-w-4 h-4 px-1.5 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                                {unreadStats.total_unread > 99 ? '99+' : unreadStats.total_unread}
                            </span>
                        ) : (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {sessions.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('store')}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                            activeTab === 'store' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <span className="material-icons text-xs">storefront</span>
                        <span>Toko & Pesanan</span>
                        {unreadStats.store_unread > 0 ? (
                            <span className="bg-red-600 text-white text-[10px] font-black min-w-4 h-4 px-1.5 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                                {unreadStats.store_unread > 99 ? '99+' : unreadStats.store_unread}
                            </span>
                        ) : (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'store' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {sessions.filter(s => s.session_type === 'store' || s.session_type === 'order' || !!s.product || !!s.order).length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('consultant')}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
                            activeTab === 'consultant' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <span className="material-icons text-xs">psychology</span>
                        <span>Pakar Syariah</span>
                        {unreadStats.consultant_unread > 0 ? (
                            <span className="bg-red-600 text-white text-[10px] font-black min-w-4 h-4 px-1.5 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                                {unreadStats.consultant_unread > 99 ? '99+' : unreadStats.consultant_unread}
                            </span>
                        ) : (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'consultant' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {sessions.filter(s => s.session_type === 'consultant' || (!s.product && !s.order && !s.seller)).length}
                            </span>
                        )}
                    </button>
                </div>

                {sessions.length === 0 && !showNewChat ? (
                    <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 mt-2">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-green-600 text-4xl">chat_bubble_outline</span>
                        </div>
                        <h2 className="font-bold text-gray-800 text-base mb-1">Belum ada percakapan</h2>
                        <p className="text-gray-500 text-xs mb-6 max-w-xs mx-auto">
                            Mulai obrolan dengan penjual toko untuk menanyakan produk, atau konsultasi dengan pakar syariah kami.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => navigate('/store')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-200 transition flex items-center justify-center gap-1.5"
                            >
                                <span className="material-icons text-sm">storefront</span>
                                Jelajahi Toko
                            </button>
                            <button
                                onClick={() => setShowNewChat(true)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition flex items-center justify-center gap-1.5"
                            >
                                <span className="material-icons text-sm">psychology</span>
                                Konsultasi Pakar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filteredSessions.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400">
                                <span className="material-icons text-4xl mb-1 opacity-20">search_off</span>
                                <p className="text-xs font-semibold">Tidak ada obrolan yang sesuai</p>
                            </div>
                        ) : (
                            filteredSessions.map((session) => {
                                const isStoreSession = session.session_type === 'store' || session.session_type === 'order' || !!session.product || !!session.order;
                                
                                const otherUser = session.seller_details?.username === currentUser.username
                                    ? session.user_details
                                    : (session.consultant_details?.username === currentUser.username ? session.user_details : (session.seller_details || session.consultant_details || session.user_details));

                                const isOrderChat = !!session.order_details || session.session_type === 'order';
                                const unreadCount = session.unread_count || unreadStats.by_session?.[String(session.id)] || 0;

                                return (
                                    <div
                                        key={session.id}
                                        onClick={() => navigate(`/chat/${session.id}`)}
                                        className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all flex items-center gap-3 cursor-pointer relative overflow-hidden group"
                                    >
                                        {/* Avatar / Thumbnail */}
                                        <div className="relative shrink-0">
                                            {session.product_details?.thumbnail ? (
                                                <img
                                                    src={session.product_details.thumbnail}
                                                    alt="product"
                                                    className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                                                />
                                            ) : (
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm ${
                                                    isStoreSession ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    <span className="material-icons">
                                                        {isOrderChat ? 'local_shipping' : (isStoreSession ? 'storefront' : 'psychology')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <h3 className="font-bold text-gray-900 text-xs truncate max-w-[160px] sm:max-w-[240px]">
                                                        {isStoreSession 
                                                            ? (session.seller_details ? `Toko @${session.seller_details.username}` : (session.product_details?.title || 'Chat Toko'))
                                                            : (otherUser?.username || session.category_name || 'Konsultasi Syariah')}
                                                    </h3>
                                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                                        isOrderChat 
                                                            ? 'bg-amber-100 text-amber-700' 
                                                            : (isStoreSession ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')
                                                    }`}>
                                                        {isOrderChat ? 'Pesanan' : (isStoreSession ? 'Toko' : (session.category_name || 'Pakar'))}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 shrink-0">
                                                    {session.last_message ? new Date(session.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>

                                            {/* Subtitle / Product / Order reference */}
                                            {session.product_details && (
                                                <p className="text-[11px] font-semibold text-blue-600 truncate mb-0.5">
                                                    🛍️ {session.product_details.title}
                                                </p>
                                            )}
                                            {session.order_details && (
                                                <p className="text-[11px] font-semibold text-amber-600 truncate mb-0.5">
                                                    📦 #{session.order_details.order_number} ({session.order_details.status})
                                                </p>
                                            )}

                                            <p className={`text-[11px] truncate ${unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                {session.last_message
                                                    ? (session.last_message.attachment ? '🖼️ Mengirim lampiran' : session.last_message.content)
                                                    : 'Klik untuk membuka ruang chat'}
                                            </p>
                                        </div>

                                        {/* Unread Indicator with Red Circle Count */}
                                        {unreadCount > 0 && (
                                            <div className="shrink-0 flex flex-col items-end">
                                                <span className="bg-red-600 text-white text-[10px] font-black min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shadow-md shadow-red-200">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Modal Pilihan Mulai Chat Baru */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1100] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 animate-slide-up shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Mulai Obrolan Baru</h3>
                                <p className="text-xs text-gray-500">Pilih jenis percakapan yang Anda inginkan</p>
                            </div>
                            <button onClick={() => setShowNewChat(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200">
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        {/* Fast Choice Cards */}
                        <div className="space-y-3 mb-6">
                            <button
                                onClick={() => {
                                    setShowNewChat(false);
                                    navigate('/store');
                                }}
                                className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 flex items-center gap-3.5 text-left transition active:scale-98"
                            >
                                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-200">
                                    <span className="material-icons text-2xl">storefront</span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900">Chat dengan Penjual Toko</h4>
                                    <p className="text-[11px] text-gray-500">Cari produk di Toko dan klik tombol Chat Penjual</p>
                                </div>
                            </button>

                            <div className="border-t border-gray-100 pt-3">
                                <h5 className="text-xs font-bold text-gray-700 mb-2.5">Pilih Kategori Konsultasi Pakar:</h5>
                                <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleCategorySelect(cat)}
                                            className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-2xl hover:bg-emerald-50 hover:border-emerald-200 border border-gray-100 transition"
                                        >
                                            <span className="material-icons text-emerald-700 text-2xl mb-1">{cat.icon || 'chat'}</span>
                                            <span className="text-[11px] font-bold text-gray-700 text-center leading-tight">{cat.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button (FAB) for New Chat */}

            <button
                onClick={() => setShowNewChat(true)}
                title="Mulai Chat Baru"
                className="fixed bottom-20 right-5 z-40 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold py-2.5 px-4 rounded-2xl shadow-xl shadow-green-600/30 flex items-center gap-2 transition active:scale-95 group hover:-translate-y-0.5"
            >
                <span className="material-icons text-xl group-hover:rotate-12 transition-transform">add_comment</span>
                <span className="text-xs">Chat Baru</span>
            </button>

            <NavigationButton />
        </div>
    );
};


export default ChatListPage;
