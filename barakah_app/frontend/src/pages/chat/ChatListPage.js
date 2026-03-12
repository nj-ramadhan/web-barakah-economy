import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getSessions, getCategories, createSession, getConsultantsByCategory } from '../../services/chatApi';

const ChatListPage = () => {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);

    // Step Flow State
    const [chatStep, setChatStep] = useState('category'); // 'category' or 'expert'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [experts, setExperts] = useState([]);
    const [loadingExperts, setLoadingExperts] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionsRes, categoriesRes] = await Promise.all([
                    getSessions(),
                    getCategories()
                ]);
                setSessions(sessionsRes.data);
                setCategories(categoriesRes.data.filter(c => c.is_active));
            } catch (err) {
                console.error('Failed to fetch chat data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCategorySelect = async (category) => {
        try {
            const res = await createSession(category.id, null);
            navigate(`/chat/${res.data.id}`);
        } catch (err) {
            alert('Gagal memulai konsultasi. Silakan coba lagi nanti.');
        }
    };

    const handleStartChat = async (consultantId = null) => {
        try {
            const res = await createSession(selectedCategory.id, consultantId);
            navigate(`/chat/${res.data.id}`);
        } catch (err) {
            alert('Gagal memulai konsultasi. Silakan coba lagi nanti.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
            </div>
        );
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20 pt-16">
            <Header />

            <div className="max-w-2xl mx-auto w-full px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-gray-800">Konsultasi</h1>
                    <button
                        onClick={() => {
                            setShowNewChat(true);
                            setChatStep('category');
                        }}
                        className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-green-800 transition"
                    >
                        <span className="material-icons text-sm">add</span>
                        Konsultasi Baru
                    </button>
                </div>

                {sessions.length === 0 && !showNewChat ? (
                    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-green-600 text-4xl">chat_bubble_outline</span>
                        </div>
                        <h2 className="font-bold text-gray-800 text-lg mb-2">Belum ada obrolan</h2>
                        <p className="text-gray-500 text-sm mb-6">Silakan mulai konsultasi baru dengan pakar kami.</p>
                        <button
                            onClick={() => {
                                setShowNewChat(true);
                                setChatStep('category');
                            }}
                            className="bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg"
                        >
                            Pilih Kategori
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session) => {
                            const otherUser = session.consultant_details?.username === currentUser.username
                                ? session.user_details
                                : session.consultant_details;
                            const otherUserRole = otherUser?.role || 'user';
                            const isStaff = otherUser?.is_staff;

                            let borderClass = 'border-gray-100 hover:border-green-200';
                            let iconBg = 'bg-gray-100 text-gray-400';
                            let roleLabel = '';
                            let roleColor = 'text-gray-400';

                            if (isStaff || otherUserRole === 'admin') {
                                borderClass = 'border-rose-100 hover:border-rose-300 bg-rose-50/10';
                                iconBg = 'bg-rose-100 text-rose-500';
                                roleLabel = 'Admin';
                                roleColor = 'text-rose-500';
                            } else if (otherUserRole === 'expert' || session.consultant_details) {
                                borderClass = 'border-green-100 hover:border-green-300 bg-green-50/10';
                                iconBg = 'bg-green-100 text-green-600';
                                roleLabel = 'Pakar';
                                roleColor = 'text-green-600';
                            }

                            return (
                                <div
                                    key={session.id}
                                    onClick={() => navigate(`/chat/${session.id}`)}
                                    className={`bg-white p-4 rounded-2xl shadow-sm border ${borderClass} flex items-center gap-4 cursor-pointer transition relative overflow-hidden`}
                                >
                                    <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                                        <span className="material-icons">{roleLabel === 'Admin' ? 'verified_user' : (roleLabel === 'Pakar' ? 'psychology' : 'person')}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-800 text-sm truncate">
                                                    {otherUser?.username || `Chat ${session.category_name}`}
                                                </h3>
                                                {roleLabel && (
                                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${roleColor} border-current uppercase tracking-wider`}>
                                                        {roleLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {session.last_message ? new Date(session.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{session.category_name}</p>
                                            {session.review && (
                                                <div className="flex items-center gap-0.5 text-amber-500">
                                                    <span className="material-icons text-[10px]">star</span>
                                                    <span className="text-[10px] font-bold">{session.review.rating}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">
                                            {session.last_message
                                                ? (session.last_message.attachment ? '🖼️ Mengirim file' : session.last_message.content)
                                                : 'Klik untuk memulai obrolan'}
                                        </p>
                                    </div>
                                    {session.last_message && !session.last_message.is_read && session.last_message.sender !== currentUser.id && (
                                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-lg shadow-green-200"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Flow Konsultasi Baru */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black/50 z-[1100] flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">
                                Pilih Kategori Konsultasi
                            </h3>
                            <button onClick={() => setShowNewChat(false)} className="material-icons text-gray-400">close</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategorySelect(cat)}
                                    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl hover:bg-green-50 hover:border-green-200 border border-transparent transition"
                                >
                                    <span className="material-icons text-green-700 text-3xl mb-2">{cat.icon || 'chat'}</span>
                                    <span className="text-xs font-bold text-gray-700 text-center">{cat.name}</span>
                                </button>
                            ))}
                        </div>

                        <p className="text-[10px] text-gray-400 text-center italic">
                            Pilih bidang masalah yang ingin Anda konsultasikan.
                        </p>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default ChatListPage;
