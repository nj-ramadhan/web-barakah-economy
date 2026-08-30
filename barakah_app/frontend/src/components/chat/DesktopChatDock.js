import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    getSessions, getMessages, sendMessage, markRead, 
    getUnreadChatCount, getSessionDetail, getCategories, createSession 
} from '../../services/chatApi';

import { formatCurrency } from '../../utils/formatters';

// Single Floating Chat Box (docked side-by-side to the left)
const FloatingChatBox = ({ session: initialSession, sessionId, onClose, onFocus }) => {
    const navigate = useNavigate();
    const [session, setSession] = useState(initialSession || null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchSessionData = useCallback(async () => {
        try {
            const [sessRes, msgRes] = await Promise.all([
                getSessionDetail(sessionId),
                getMessages(sessionId, 1)
            ]);
            setSession(sessRes.data);
            const raw = msgRes.data?.results || (Array.isArray(msgRes.data) ? msgRes.data : []);
            setMessages([...raw].reverse());
            setTimeout(scrollToBottom, 50);
            await markRead(sessionId);
        } catch (err) {
            console.error('Failed to load floating chat box:', err);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    const pollMessages = useCallback(async () => {
        if (isMinimized) return;
        try {
            const res = await getMessages(sessionId, 1);
            const raw = res.data?.results || (Array.isArray(res.data) ? res.data : []);
            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const uniqueNew = raw.filter(m => !existingIds.has(m.id));
                if (uniqueNew.length === 0) return prev;
                const updated = [...prev, ...[...uniqueNew].reverse()];
                setTimeout(scrollToBottom, 50);
                return updated;
            });
            await markRead(sessionId);
        } catch (err) {
            // silent poll fail
        }
    }, [sessionId, isMinimized]);

    useEffect(() => {
        fetchSessionData();
        const interval = setInterval(pollMessages, 3500);
        return () => clearInterval(interval);
    }, [fetchSessionData, pollMessages]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if ((!content.trim() && !file) || sending) return;

        setSending(true);
        const formData = new FormData();
        formData.append('session', sessionId);
        if (content.trim()) formData.append('content', content);
        if (file) formData.append('attachment', file);
        formData.append('message_type', 'text');

        try {
            const res = await sendMessage(formData);
            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setContent('');
            setFile(null);
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            alert('Gagal mengirim pesan.');
        } finally {
            setSending(false);
        }
    };

    const handleQuickInquiry = (text) => {
        setContent(text);
    };

    const handleWhatsAppChat = () => {
        const phone = session?.seller_phone;
        if (!phone) {
            alert('Nomor WhatsApp penjual belum tersedia.');
            return;
        }
        let cleanPhone = String(phone).replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        }
        const prodTitle = session?.product_details?.title || 'Produk';
        const msg = encodeURIComponent(`Halo Penjual Barakah Economy, saya ingin bertanya mengenai: *${prodTitle}*`);
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    };

    const isStoreChat = session?.session_type === 'store' || session?.session_type === 'order' || !!session?.product_details || !!session?.seller_details;
    const otherUser = session?.seller_details?.username === currentUser.username
        ? session?.user_details
        : (session?.consultant_details?.username === currentUser.username ? session?.user_details : (session?.seller_details || session?.consultant_details || session?.user_details));

    const chatTitle = isStoreChat 
        ? (session?.seller_details ? `Toko @${session.seller_details.username}` : (session?.product_details?.title || 'Chat Toko'))
        : (otherUser?.username || session?.category_name || 'Konsultasi');

    return (
        <div 
            onClick={onFocus}
            className={`w-72 sm:w-80 bg-white rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-200 pointer-events-auto ${
                isMinimized ? 'h-11' : 'h-[460px]'
            }`}
        >
            {/* Header */}
            <div className="bg-emerald-700 text-white px-3 py-2.5 flex items-center justify-between shadow-xs select-none shrink-0 cursor-pointer"
                 onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative shrink-0">
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/40">
                            {otherUser?.picture ? (
                                <img src={otherUser.picture} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-icons text-xs text-white">
                                    {isStoreChat ? 'storefront' : 'psychology'}
                                </span>
                            )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border border-white rounded-full"></span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate leading-tight">
                            {chatTitle}
                        </h4>
                        <p className="text-[9px] text-emerald-100 truncate">
                            {isStoreChat ? 'Penjual Langsung' : (session?.category_name || 'Pakar Syariah')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {session?.seller_phone && (
                        <button
                            onClick={handleWhatsAppChat}
                            title="Chat via WhatsApp"
                            className="w-6 h-6 rounded-md hover:bg-white/20 flex items-center justify-center text-emerald-100 hover:text-white transition"
                        >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={() => navigate(`/chat/${sessionId}`)}
                        title="Buka Layar Penuh"
                        className="w-6 h-6 rounded-md hover:bg-white/20 flex items-center justify-center text-emerald-100 hover:text-white transition"
                    >
                        <span className="material-icons text-xs">open_in_new</span>
                    </button>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        title={isMinimized ? "Perbesar" : "Kecilkan"}
                        className="w-6 h-6 rounded-md hover:bg-white/20 flex items-center justify-center text-emerald-100 hover:text-white transition text-xs font-bold"
                    >
                        {isMinimized ? '▲' : '—'}
                    </button>
                    <button
                        onClick={onClose}
                        title="Tutup Chat"
                        className="w-6 h-6 rounded-md hover:bg-red-500/80 flex items-center justify-center text-emerald-100 hover:text-white transition"
                    >
                        <span className="material-icons text-xs">close</span>
                    </button>
                </div>
            </div>

            {/* If not minimized, show body */}
            {!isMinimized && (
                <>
                    {/* Pinned Product Card (If Product Chat) */}
                    {session?.product_details && (
                        <div className="bg-gradient-to-r from-blue-50/95 to-indigo-50/90 border-b border-blue-100 p-2 z-10 shrink-0">
                            <div className="flex items-center gap-2">
                                {session.product_details.thumbnail && (
                                    <img
                                        src={session.product_details.thumbnail}
                                        alt="Product"
                                        onClick={() => session.product_details.slug && navigate(`/store/${session.product_details.slug}`)}
                                        className="w-9 h-9 rounded-lg object-cover border border-blue-200 shrink-0 cursor-pointer"
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h5
                                        onClick={() => session.product_details.slug && navigate(`/store/${session.product_details.slug}`)}
                                        className="text-[11px] font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600"
                                    >
                                        {session.product_details.title}
                                    </h5>
                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                        <span className="text-[10px] font-black text-emerald-700">
                                            Rp {formatCurrency(session.product_details.price)}
                                        </span>
                                        {session.product_details.original_price && (
                                            <span className="text-[8px] text-gray-400 line-through">
                                                Rp {formatCurrency(session.product_details.original_price)}
                                            </span>
                                        )}
                                        {session.product_details.discount_percentage && (
                                            <span className="text-[8px] font-bold bg-red-100 text-red-600 px-1 py-0.2 rounded">
                                                -{session.product_details.discount_percentage}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {session.product_details.slug && (
                                    <button
                                        onClick={() => navigate(`/store/${session.product_details.slug}`)}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[9px] font-bold shrink-0 transition"
                                    >
                                        Lihat
                                    </button>
                                )}
                            </div>

                            {/* Quick prompts chips */}
                            <div className="flex gap-1 mt-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                                <button
                                    onClick={() => handleQuickInquiry(`Halo, apakah stok ${session.product_details.title} masih ada?`)}
                                    className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs"
                                >
                                    ⚡ Tanya Stok
                                </button>
                                <button
                                    onClick={() => handleQuickInquiry(`Halo, apakah ada pilihan ukuran atau warna lain?`)}
                                    className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs"
                                >
                                    ⚡ Tanya Varian
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Messages Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-slate-50 custom-scrollbar overscroll-contain">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-[11px]">
                                Belum ada pesan. Mulai obrolan sekarang.
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isMe = msg.sender === currentUser?.id;
                                return (
                                    <div key={msg.id || idx} className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[82%] rounded-xl px-3 py-2 shadow-xs text-xs ${
                                            isMe 
                                                ? 'bg-emerald-700 text-white rounded-tr-none' 
                                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                        }`}>
                                            {msg.attachment && (
                                                <div className="mb-1.5">
                                                    <img
                                                        src={msg.attachment}
                                                        alt="attachment"
                                                        className="rounded-lg max-w-full h-auto cursor-pointer max-h-32 object-cover"
                                                        onClick={() => window.open(msg.attachment, '_blank')}
                                                    />
                                                </div>
                                            )}
                                            {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                            <p className={`text-[8px] mt-0.5 text-right ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Bottom Input Area */}
                    <div className="bg-white px-2.5 py-2 border-t border-gray-100 shrink-0">
                        <form onSubmit={handleSend} className="space-y-1.5">
                            {file && (
                                <div className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded-lg text-[10px]">
                                    <span className="truncate max-w-[180px] text-gray-700">{file.name}</span>
                                    <button type="button" onClick={() => setFile(null)} className="text-red-500 font-bold ml-1">✕</button>
                                </div>
                            )}

                            <div className="flex items-center gap-1.5">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => setFile(e.target.files[0] || null)}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 transition"
                                    title="Lampirkan Gambar"
                                >
                                    <span className="material-icons text-sm">attach_file</span>
                                </button>

                                <input
                                    type="text"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Ketik pesan..."
                                    className="flex-1 px-3 py-1.5 bg-gray-50 rounded-lg text-xs border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                                />

                                <button
                                    type="submit"
                                    disabled={sending || (!content.trim() && !file)}
                                    className="w-8 h-8 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition shadow-xs"
                                >
                                    <span className="material-icons text-sm">send</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

// Main Desktop Chat Dock Component (Facebook Classic Style at Bottom-Right)
const DesktopChatDock = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isDockOpen, setIsDockOpen] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'store', 'consultant'
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [unreadStats, setUnreadStats] = useState({ total_unread: 0, store_unread: 0, consultant_unread: 0, by_session: {} });
    const [openChatSessions, setOpenChatSessions] = useState([]); // list of session objects open as floating chat boxes
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    const isLoggedIn = !!localStorage.getItem('user');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Don't render dock if user is already on the dedicated full-screen /chat route
    const isDedicatedChatPage = location.pathname.startsWith('/chat');

    const fetchSessionsList = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const [sessRes, unreadRes] = await Promise.all([
                getSessions(),
                getUnreadChatCount()
            ]);
            const raw = sessRes.data?.results || (Array.isArray(sessRes.data) ? sessRes.data : []);
            setSessions(raw);
            setUnreadStats(unreadRes.data || { total_unread: 0, store_unread: 0, consultant_unread: 0, by_session: {} });
        } catch (err) {
            // silent fail
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (!isLoggedIn) return;
        fetchSessionsList();
        const interval = setInterval(fetchSessionsList, 5000);
        return () => clearInterval(interval);
    }, [isLoggedIn, fetchSessionsList]);

    const handleOpenNewChat = async () => {
        setShowNewChatModal(true);
        if (categories.length === 0) {
            setLoadingCategories(true);
            try {
                const res = await getCategories();
                const raw = res.data?.results || (Array.isArray(res.data) ? res.data : []);
                setCategories(raw.filter(c => c.is_active));
            } catch (err) {
                console.error('Failed to load categories:', err);
            } finally {
                setLoadingCategories(false);
            }
        }
    };

    const handleStartCategoryChat = async (category) => {
        try {
            const res = await createSession(category.id, null);
            setShowNewChatModal(false);
            fetchSessionsList();
            handleOpenSessionBox(res.data);
        } catch (err) {
            alert('Gagal memulai sesi konsultasi. Silakan coba lagi.');
        }
    };

    // Listen to global event 'openDesktopChat'
    useEffect(() => {
        const handleOpenDesktopChat = (e) => {
            const { session, sessionId } = e.detail || {};
            const targetId = sessionId || session?.id;
            if (!targetId) return;

            setOpenChatSessions(prev => {
                if (prev.some(s => s.id === targetId)) {
                    // Bring to front
                    return [prev.find(s => s.id === targetId), ...prev.filter(s => s.id !== targetId)];
                }
                // Limit to maximum 2 open chat tabs simultaneously on desktop
                const newEntry = session || { id: targetId };
                return [newEntry, ...prev.slice(0, 1)];
            });
        };

        window.addEventListener('openDesktopChat', handleOpenDesktopChat);
        return () => window.removeEventListener('openDesktopChat', handleOpenDesktopChat);
    }, []);

    if (!isLoggedIn || isDedicatedChatPage) return null;

    const handleOpenSessionBox = (session) => {
        setOpenChatSessions(prev => {
            if (prev.some(s => s.id === session.id)) {
                return prev;
            }
            // Keep at most 2 side-by-side chat windows on desktop
            return [session, ...prev.slice(0, 1)];
        });
    };

    const handleCloseSessionBox = (sessionId) => {
        setOpenChatSessions(prev => prev.filter(s => s.id !== sessionId));
    };

    // Filter sessions for dock list
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
        const lastMsg = (session.last_message?.content || '').toLowerCase();

        return otherName.includes(q) || categoryName.includes(q) || prodTitle.includes(q) || lastMsg.includes(q);
    });

    return (
        <div className="hidden lg:flex fixed bottom-0 right-6 z-50 items-end gap-3 select-none pointer-events-none">
            {/* Active Floating Chat Windows (Docked to the left of the list) */}
            {openChatSessions.map((openSess) => (
                <FloatingChatBox
                    key={openSess.id}
                    session={openSess}
                    sessionId={openSess.id}
                    onClose={() => handleCloseSessionBox(openSess.id)}
                />
            ))}

            {/* Main Chat Dock Bar & Popup Window (Rightmost) */}
            <div className="flex flex-col items-end pointer-events-auto">
                {isDockOpen ? (
                    <div className="w-80 h-[450px] bg-white rounded-t-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
                        {/* Header */}
                        <div className="bg-emerald-700 text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-lg">forum</span>
                                <h3 className="text-xs font-bold tracking-wide">Obrolan</h3>
                                {unreadStats.total_unread > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ring-1 ring-white">
                                        {unreadStats.total_unread}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleOpenNewChat}
                                    title="Mulai Chat Baru"
                                    className="w-6 h-6 rounded-md hover:bg-white/20 flex items-center justify-center text-emerald-100 hover:text-white transition"
                                >
                                    <span className="material-icons text-xs">add_comment</span>
                                </button>
                                <button
                                    onClick={() => navigate('/chat')}
                                    title="Buka Halaman Chat Lengkap"
                                    className="w-6 h-6 rounded-md hover:bg-white/20 flex items-center justify-center text-emerald-100 hover:text-white transition"
                                >
                                    <span className="material-icons text-xs">open_in_new</span>
                                </button>
                                <button
                                    onClick={() => setIsDockOpen(false)}
                                    title="Tutup"
                                    className="w-6 h-6 rounded-md hover:bg-white/20 flex items-center justify-center text-emerald-100 hover:text-white transition text-xs font-bold"
                                >
                                    —
                                </button>
                            </div>
                        </div>

                        {showNewChatModal ? (
                            /* New Chat Category Selection View */
                            <div className="flex-1 flex flex-col p-3 bg-gray-50 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-2">
                                    <button 
                                        onClick={() => setShowNewChatModal(false)}
                                        className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                                    >
                                        <span className="material-icons text-xs">arrow_back</span>
                                        <span>Kembali</span>
                                    </button>
                                    <span className="text-[10px] text-gray-400 font-semibold">Mulai Chat Baru</span>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsDockOpen(false);
                                        navigate('/store');
                                    }}
                                    className="w-full p-2.5 mb-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-2.5 text-left transition"
                                >
                                    <span className="material-icons text-blue-600 text-lg">storefront</span>
                                    <div>
                                        <h5 className="text-[11px] font-bold text-gray-900">Chat Produk / Toko</h5>
                                        <p className="text-[9px] text-gray-500">Pilih produk di Store lalu klik Chat Penjual</p>
                                    </div>
                                </button>

                                <div className="border-t border-gray-200 pt-2">
                                    <h6 className="text-[10px] font-bold text-gray-600 mb-2 uppercase tracking-wider">Pilih Kategori Konsultasi:</h6>
                                    {loadingCategories ? (
                                        <div className="flex justify-center py-6">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => handleStartCategoryChat(cat)}
                                                    className="p-2.5 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-gray-200 rounded-xl flex flex-col items-center justify-center text-center transition group shadow-2xs"
                                                >
                                                    <span className="material-icons text-emerald-700 text-lg mb-1 group-hover:scale-110 transition-transform">{cat.icon || 'psychology'}</span>
                                                    <span className="text-[10px] font-bold text-gray-800 leading-tight">{cat.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Regular Sessions List View */
                            <>


                        {/* Search Bar */}
                        <div className="p-2 border-b border-gray-100 bg-gray-50/70">
                            <div className="relative">
                                <span className="material-icons absolute left-2.5 top-2 text-xs text-gray-400">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari obrolan / toko..."
                                    className="w-full pl-7 pr-7 py-1 bg-white rounded-lg text-[11px] border border-gray-200 focus:outline-none focus:border-emerald-600 transition"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex border-b border-gray-100 bg-white text-[11px] font-bold text-gray-500 shrink-0">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`flex-1 py-1.5 text-center border-b-2 transition ${
                                    activeTab === 'all' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent hover:bg-gray-50'
                                }`}
                            >
                                Semua
                            </button>
                            <button
                                onClick={() => setActiveTab('store')}
                                className={`flex-1 py-1.5 text-center border-b-2 transition relative ${
                                    activeTab === 'store' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent hover:bg-gray-50'
                                }`}
                            >
                                Toko
                                {unreadStats.store_unread > 0 && (
                                    <span className="ml-1 px-1 bg-red-500 text-white text-[8px] rounded-full font-black">
                                        {unreadStats.store_unread}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('consultant')}
                                className={`flex-1 py-1.5 text-center border-b-2 transition relative ${
                                    activeTab === 'consultant' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent hover:bg-gray-50'
                                }`}
                            >
                                Pakar
                                {unreadStats.consultant_unread > 0 && (
                                    <span className="ml-1 px-1 bg-red-500 text-white text-[8px] rounded-full font-black">
                                        {unreadStats.consultant_unread}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Sessions List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                            {filteredSessions.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <span className="material-icons text-3xl text-gray-300">chat_bubble_outline</span>
                                    <p className="text-xs font-semibold text-gray-400 mt-1">Belum ada obrolan</p>
                                </div>
                            ) : (
                                filteredSessions.map((s) => {
                                    const isStore = s.session_type === 'store' || s.session_type === 'order' || !!s.product || !!s.order;
                                    const other = s.seller_details?.username === currentUser.username
                                        ? s.user_details
                                        : (s.consultant_details?.username === currentUser.username ? s.user_details : (s.seller_details || s.consultant_details || s.user_details));
                                    
                                    const title = isStore 
                                        ? (s.seller_details ? `Toko @${s.seller_details.username}` : (s.product_details?.title || 'Chat Toko'))
                                        : (other?.username || s.category_name || 'Konsultasi');
                                    
                                    const unread = s.unread_count || unreadStats.by_session?.[s.id] || 0;

                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => handleOpenSessionBox(s)}
                                            className="p-2.5 hover:bg-emerald-50/60 cursor-pointer flex items-center gap-2.5 transition group"
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                    {other?.picture ? (
                                                        <img src={other.picture} alt="Avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className={`material-icons text-sm ${isStore ? 'text-blue-600' : 'text-emerald-600'}`}>
                                                            {isStore ? 'storefront' : 'psychology'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h5 className="text-xs font-bold text-gray-900 truncate group-hover:text-emerald-700">
                                                        {title}
                                                    </h5>
                                                    <span className="text-[9px] text-gray-400 shrink-0">
                                                        {s.last_message ? new Date(s.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>

                                                <p className={`text-[10px] truncate ${unread > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                                    {s.last_message ? (s.last_message.attachment ? '📷 [Gambar]' : s.last_message.content) : 'Mulai chat...'}
                                                </p>
                                            </div>

                                            {unread > 0 && (
                                                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                                                    {unread}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        </>
                        )}
                    </div>
                ) : null}


                {/* Bottom Dock Trigger Bar (Always visible at bottom right) */}
                <button
                    onClick={() => {
                        setIsDockOpen(!isDockOpen);
                        if (!isDockOpen) fetchSessionsList();
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-4 rounded-t-xl shadow-2xl flex items-center gap-2 cursor-pointer transition-all duration-200 border-t border-x border-emerald-600/50 hover:-translate-y-0.5 active:scale-95"
                >
                    <div className="relative flex items-center gap-1.5">
                        <span className="material-icons text-base">chat</span>
                        <span>Obrolan</span>
                        {unreadStats.total_unread > 0 && (
                            <span className="ml-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ring-2 ring-white animate-pulse">
                                {unreadStats.total_unread}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-emerald-200">
                        {isDockOpen ? '▼' : '▲'}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default DesktopChatDock;
