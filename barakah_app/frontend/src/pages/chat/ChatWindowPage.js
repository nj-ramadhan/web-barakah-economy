import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
    getMessages, sendMessage, markRead, getSessionDetail, 
    toggleAISession, getConsultantsByCategory, createSession, 
    getChatCommands, closeSession, submitReview 
} from '../../services/chatApi';
import { formatCurrency } from '../../utils/formatters';

const ChatWindowPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [session, setSession] = useState(null);
    const [sending, setSending] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const [showExpertModal, setShowExpertModal] = useState(false);
    const [availableExperts, setAvailableExperts] = useState([]);
    const [loadingExperts, setLoadingExperts] = useState(false);
    const [availableCommands, setAvailableCommands] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', criticism_suggestion: '' });
    const [submittingReview, setSubmittingReview] = useState(false);
    const [showViewReviewModal, setShowViewReviewModal] = useState(false);

    // Marketplace Order & Tracking Modals
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [complaintForm, setComplaintForm] = useState({
        reasonCategory: 'Barang Rusak / Cacat',
        notes: '',
    });
    const [submittingComplaint, setSubmittingComplaint] = useState(false);
    const [completingOrder, setCompletingOrder] = useState(false);

    const builtInCommands = [
        { code: '/pakar', label: 'Chat dengan Pakar', desc: 'AI akan dinonaktifkan sementara', icon: 'person' },
        { code: '/ai', label: 'Aktifkan AI', desc: 'Asisten AI akan mulai menjawab kembali', icon: 'smart_toy' },
        { code: '/selesai', label: 'Akhiri Sesi', desc: 'Menutup sesi konsultasi ini', icon: 'check_circle' }
    ];

    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const isStoreChat = session?.session_type === 'store' || session?.session_type === 'order' || !!session?.product_details || !!session?.order_details || !!session?.seller_details;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchData = async () => {
        try {
            const [msgRes, sessRes, cmdRes] = await Promise.all([
                getMessages(sessionId, 1),
                getSessionDetail(sessionId),
                getChatCommands()
            ]);
            const rawMessages = msgRes.data?.results || (Array.isArray(msgRes.data) ? msgRes.data : []);
            setMessages([...rawMessages].reverse());
            setSession(sessRes.data);
            setAvailableCommands(Array.isArray(cmdRes.data) ? cmdRes.data : (cmdRes.data?.results || []));
            setHasMore(!!msgRes.data?.next);
            setTimeout(scrollToBottom, 50);
            await markRead(sessionId);
        } catch (err) {
            console.error('Failed to load chat data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (pageNum = 1, isInitial = false) => {
        try {
            const res = await getMessages(sessionId, pageNum);
            const newMessages = res.data?.results || (Array.isArray(res.data) ? res.data : []);

            if (isInitial) {
                setMessages([...newMessages].reverse());
                setTimeout(scrollToBottom, 50);
            } else {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
                    if (uniqueNew.length === 0) return prev;

                    if (pageNum === 1) {
                        const updated = [...prev, ...[...uniqueNew].reverse()];
                        setTimeout(scrollToBottom, 50);
                        return updated;
                    }
                    return [...[...uniqueNew].reverse(), ...prev];
                });
            }

            setHasMore(!!res.data?.next);
            await markRead(sessionId);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };


    useEffect(() => {
        setLoading(true);
        fetchData();

        const interval = setInterval(() => {
            fetchMessages(1, false);
        }, 4000);

        return () => clearInterval(interval);
    }, [sessionId]);

    const handleLoadMore = () => {
        if (!hasMore || loading) return;
        setPage(prev => {
            const next = prev + 1;
            fetchMessages(next);
            return next;
        });
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if ((!content.trim() && !file) || sending) return;

        // Command handler: only for consultant sessions
        if (!isStoreChat && content.startsWith('/') && !file) {
            const cmd = filteredCommands.find(c => c.code === content.trim());
            if (cmd) {
                handleCommandSelect(cmd);
                return;
            } else if (content.length > 1) {
                alert('Command tidak dikenal.');
                return;
            }
        }

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
        // Automatically send quick inquiry
        setTimeout(() => {
            const formData = new FormData();
            formData.append('session', sessionId);
            formData.append('content', text);
            formData.append('message_type', 'text');
            sendMessage(formData).then(res => {
                setMessages(prev => [...prev, res.data]);
                setContent('');
                setTimeout(scrollToBottom, 50);
            }).catch(() => {});
        }, 100);
    };

    const handleQuickReply = async (text) => {
        if (!text || sending) return;
        setSending(true);
        const formData = new FormData();
        formData.append('session', sessionId);
        formData.append('content', text);
        formData.append('message_type', 'text');

        try {
            const res = await sendMessage(formData);
            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            alert('Gagal mengirim pesan.');
        } finally {
            setSending(false);
        }
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

    const handleToggleAI = async (isActive) => {
        if (isStoreChat) return;
        try {
            await toggleAISession(sessionId, isActive);
            setSession(prev => ({ ...prev, is_ai_active: isActive }));
        } catch (err) {
            alert('Gagal mengubah status AI.');
        }
    };

    const handleCloseSession = async () => {
        if (!window.confirm('Akhiri sesi ini?')) return;
        try {
            const res = await closeSession(sessionId);
            setSession(res.data);
            handleQuickReply('🏁 *Sesi ini telah dinyatakan selesai.*');
        } catch (err) {
            alert('Gagal menutup sesi.');
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            await submitReview({
                session: sessionId,
                ...reviewForm
            });
            alert('Terima kasih atas review Anda!');
            setShowReviewModal(false);
            fetchData();
        } catch (err) {
            alert('Gagal mengirim review.');
        } finally {
            setSubmittingReview(false);
        }
    };

    // Submit Order Complaint / Return / Dispute
    const handleComplaintSubmit = async (e) => {
        e.preventDefault();
        if (!session?.order_details?.id) return;
        setSubmittingComplaint(true);
        const reasonFull = `${complaintForm.reasonCategory}: ${complaintForm.notes}`;
        try {
            await api.patch(`/orders/seller-orders/${session.order_details.id}/`, {
                status: 'Komplain',
                action: 'request_cancel',
                cancel_request_status: 'pending',
                complaint_reason: reasonFull
            });

            setShowComplaintModal(false);
            alert('Pengajuan komplain/retur barang berhasil dikirim. Penjual dan Admin akan segera meninjau.');
            fetchData();
        } catch (err) {
            alert(err?.response?.data?.error || 'Gagal mengajukan komplain pesanan.');
        } finally {
            setSubmittingComplaint(false);
        }
    };

    // Complete Order
    const handleCompleteOrder = async () => {
        if (!session?.order_details?.id) return;
        if (!window.confirm('Konfirmasi bahwa barang telah Anda terima dengan baik? Pesanan akan diselesaikan.')) return;
        setCompletingOrder(true);
        try {
            await api.patch(`/orders/seller-orders/${session.order_details.id}/`, {
                status: 'Selesai'
            });
            alert('Pesanan telah berhasil diselesaikan! Terima kasih.');
            fetchData();
        } catch (err) {
            alert(err?.response?.data?.error || 'Gagal menyelesaikan pesanan.');
        } finally {
            setCompletingOrder(false);
        }
    };

    const handleCommandSelect = async (cmd) => {
        if (cmd.isBuiltIn) {
            if (cmd.code === '/pakar') {
                await handleToggleAI(false);
                handleQuickReply('🚩 *Mode Pakar diaktifkan. AI dinonaktifkan sementara.*');
            } else if (cmd.code === '/ai') {
                await handleToggleAI(true);
                handleQuickReply('🤖 *Mode AI diaktifkan kembali.*');
            } else if (cmd.code === '/selesai') {
                handleCloseSession();
            }
        } else {
            if (cmd.content) handleQuickReply(cmd.content);
            if (cmd.is_toggle_ai_on) await handleToggleAI(true);
            if (cmd.is_toggle_ai_off) await handleToggleAI(false);
            if (cmd.is_close_session) {
                try {
                    const res = await closeSession(sessionId);
                    setSession(res.data);
                } catch (err) { console.error('Failed to close via command', err); }
            }
            if (cmd.is_request_review) {
                setTimeout(() => setShowReviewModal(true), 1000);
            }
        }
        setContent('');
        setShowCommands(false);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert('File terlalu besar. Maksimal 5MB.');
                return;
            }
            setFile(selectedFile);
        }
    };

    const isExpert = session?.consultant === currentUser?.id;
    const isSeller = session?.seller === currentUser?.id;

    const filteredCommands = [
        ...builtInCommands.map(c => ({ ...c, isBuiltIn: true })).filter(cmd => {
            if (cmd.code === '/ai') return currentUser?.is_staff || currentUser?.role === 'admin';
            if (cmd.code === '/pakar') return !session?.consultant && !currentUser?.is_staff;
            if (cmd.code === '/selesai') return isExpert || currentUser?.is_staff || currentUser?.role === 'admin';
            return true;
        }),
        ...availableCommands
    ];

    const otherUser = session?.seller_details?.username === currentUser.username
        ? session?.user_details
        : (session?.consultant_details?.username === currentUser.username ? session?.user_details : (session?.seller_details || session?.consultant_details || session?.user_details));

    return (
        <div className="flex flex-col h-screen max-h-[100dvh] lg:h-[740px] bg-white lg:rounded-3xl lg:shadow-2xl max-w-md mx-auto relative overflow-hidden lg:my-4 border border-gray-100">
            {/* Header Chat */}
            <div className="bg-white px-3.5 py-3 flex items-center gap-3 shadow-sm z-10 border-b border-gray-100 shrink-0">
                <button onClick={() => navigate('/chat')} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
                    <span className="material-icons text-xl">arrow_back</span>
                </button>

                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 shrink-0 bg-gray-50">
                    {otherUser?.picture ? (
                        <img src={otherUser.picture} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className={`material-icons ${isStoreChat ? 'text-blue-600' : 'text-emerald-600'}`}>
                            {isStoreChat ? 'storefront' : 'psychology'}
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 text-xs truncate">
                        {isStoreChat 
                            ? (session?.seller_details ? `Toko @${session.seller_details.username}` : (session?.product_details?.title || 'Chat Toko'))
                            : (otherUser?.username || session?.category_name || 'Konsultasi')}
                    </h2>
                    <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{isStoreChat ? 'Toko Penjual' : (session?.category_name || 'Pakar Syariah')}</span>
                        {isStoreChat && <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.2 rounded">Penjual Langsung</span>}
                    </p>
                </div>

                {/* WhatsApp button if phone exists */}
                {session?.seller_phone && (
                    <button
                        onClick={handleWhatsAppChat}
                        title="Chat via WhatsApp"
                        className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition shadow-sm shrink-0"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                    </button>
                )}

                {/* Close Session action */}
                {session && session.is_active && (isExpert || isSeller || currentUser?.is_staff || currentUser?.role === 'admin') && (
                    <button
                        onClick={handleCloseSession}
                        className="bg-red-50 text-red-600 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-red-100 transition whitespace-nowrap shrink-0"
                    >
                        <span className="material-icons text-xs">check_circle</span>
                        Selesai
                    </button>
                )}
            </div>


            {/* Pinned Product Card (If Product Chat) */}
            {session?.product_details && (
                <div className="bg-gradient-to-r from-blue-50/95 via-indigo-50/90 to-emerald-50/80 border-b border-blue-100 p-2.5 z-10 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        {session.product_details.thumbnail && (
                            <img
                                src={session.product_details.thumbnail}
                                alt="Product"
                                onClick={() => session.product_details.slug && navigate(`/store/${session.product_details.slug}`)}
                                className="w-12 h-12 rounded-xl object-cover border border-blue-200 shrink-0 cursor-pointer hover:opacity-90 transition"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <h4
                                onClick={() => session.product_details.slug && navigate(`/store/${session.product_details.slug}`)}
                                className="text-xs font-bold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition"
                            >
                                {session.product_details.title}
                            </h4>
                            
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span className="text-xs font-black text-emerald-700">
                                    Rp {formatCurrency(session.product_details.price)}
                                </span>

                                {session.product_details.original_price && (
                                    <span className="text-[10px] text-gray-400 line-through">
                                        Rp {formatCurrency(session.product_details.original_price)}
                                    </span>
                                )}

                                {session.product_details.discount_percentage && (
                                    <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.2 rounded-md">
                                        -{session.product_details.discount_percentage}%
                                    </span>
                                )}

                                {session.product_details.campaign_name && (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md truncate max-w-[130px]">
                                        🏷️ {session.product_details.campaign_name}
                                    </span>
                                )}

                                <span className="text-[10px] text-gray-400 font-normal">
                                    (Stok: {session.product_details.stock} {session.product_details.unit})
                                </span>
                            </div>
                        </div>
                        {session.product_details.slug && (
                            <button
                                onClick={() => navigate(`/store/${session.product_details.slug}`)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold shrink-0 transition shadow-sm active:scale-95"
                            >
                                Lihat
                            </button>
                        )}
                    </div>


                    {/* Quick Inquiry Prompts Chips */}
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5 custom-scrollbar">
                        <button
                            onClick={() => handleQuickInquiry(`Halo, apakah stok ${session.product_details.title} masih tersedia?`)}
                            className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs transition"
                        >
                            ⚡ Tanya Stok
                        </button>
                        <button
                            onClick={() => handleQuickInquiry(`Halo, apakah ada pilihan ukuran / variasi lain untuk produk ini?`)}
                            className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs transition"
                        >
                            ⚡ Tanya Ukuran/Varian
                        </button>
                        <button
                            onClick={() => handleQuickInquiry(`Halo, jika dipesan sekarang apakah bisa langsung dikirim hari ini?`)}
                            className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs transition"
                        >
                            ⚡ Tanya Pengiriman
                        </button>
                        <button
                            onClick={() => handleQuickInquiry(`Halo, apakah harga produk ini masih bisa nego atau ada diskon?`)}
                            className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs transition"
                        >
                            ⚡ Nego Harga
                        </button>
                    </div>
                </div>
            )}

            {/* Pinned Order Status Card (If Order Chat) */}
            {session?.order_details && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-2.5 z-10">
                    <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className="material-icons text-amber-600 text-sm">local_shipping</span>
                            <span className="text-xs font-bold text-gray-900">#{session.order_details.order_number}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            session.order_details.status === 'Dikirim' ? 'bg-blue-100 text-blue-700' :
                            session.order_details.status === 'Selesai' ? 'bg-green-100 text-green-700' :
                            session.order_details.status === 'Komplain' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                        }`}>
                            {session.order_details.status}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-gray-600 mb-2">
                        <span>Total: <b>Rp {formatCurrency(session.order_details.grand_total)}</b></span>
                        {session.order_details.resi_number && (
                            <span className="text-gray-500 font-mono">Resi: {session.order_details.resi_number}</span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowTrackingModal(true)}
                            className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        >
                            <span className="material-icons text-xs">track_changes</span>
                            Lacak Pesanan
                        </button>

                        {session.order_details.status === 'Dikirim' && (
                            <>
                                <button
                                    onClick={handleCompleteOrder}
                                    disabled={completingOrder}
                                    className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                                >
                                    <span className="material-icons text-xs">check</span>
                                    Selesaikan
                                </button>
                                <button
                                    onClick={() => setShowComplaintModal(true)}
                                    className="py-1.5 px-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[10px] font-bold flex items-center gap-0.5 transition"
                                >
                                    <span className="material-icons text-xs">report_problem</span>
                                    Komplain / Retur
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50"
            >
                {hasMore && (
                    <button
                        onClick={handleLoadMore}
                        className="w-full text-center py-1.5 text-xs text-gray-500 font-bold bg-white/80 rounded-full hover:bg-white shadow-xs transition"
                    >
                        Muat pesan terdahulu
                    </button>
                )}

                {loading && page === 1 ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.sender === currentUser?.id;
                        const isOrderUpdate = msg.message_type === 'order_update';
                        const isComplaint = msg.message_type === 'complaint';

                        // Special System Order Notification Bubble
                        if (isOrderUpdate) {
                            return (
                                <div key={msg.id || index} className="flex justify-center my-2">
                                    <div className="max-w-[90%] bg-amber-50 border border-amber-200 rounded-2xl p-3 shadow-xs text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-amber-700 font-bold text-xs mb-1">
                                            <span className="material-icons text-sm">local_shipping</span>
                                            <span>Update Pesanan</span>
                                        </div>
                                        <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                                            {msg.content}
                                        </p>
                                        <p className="text-[9px] text-amber-500 mt-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        // Special Complaint / Return Bubble
                        if (isComplaint) {
                            return (
                                <div key={msg.id || index} className="flex justify-center my-2">
                                    <div className="max-w-[90%] bg-red-50 border border-red-200 rounded-2xl p-3 shadow-xs">
                                        <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs mb-1">
                                            <span className="material-icons text-sm">report_problem</span>
                                            <span>Pengajuan Komplain / Retur</span>
                                        </div>
                                        <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                                            {msg.content}
                                        </p>
                                        <p className="text-[9px] text-red-400 mt-1 text-right">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id || index} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white shadow-sm mb-1">
                                        {msg.sender_picture ? (
                                            <img src={msg.sender_picture} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-icons text-[14px] text-gray-400">person</span>
                                        )}
                                    </div>
                                )}
                                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm ${isMe
                                    ? 'bg-gradient-to-r from-green-700 to-emerald-700 text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                    }`}>
                                    {msg.attachment && (
                                        <div className="mb-2">
                                            {msg.attachment.match(/\.(jpeg|jpg|gif|png)$/) ? (
                                                <img
                                                    src={msg.attachment}
                                                    alt="attachment"
                                                    className="rounded-xl max-w-full h-auto cursor-pointer"
                                                    onClick={() => window.open(msg.attachment, '_blank')}
                                                />
                                            ) : (
                                                <a
                                                    href={msg.attachment}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`flex items-center gap-2 p-2 rounded-xl border ${isMe ? 'bg-green-800 border-green-600' : 'bg-gray-50 border-gray-200'}`}>
                                                    <span className="material-icons text-sm">insert_drive_file</span>
                                                    <span className="text-[10px] truncate max-w-[100px]">Dokumen</span>
                                                    <span className="material-icons text-sm">download</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {msg.content && <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                    <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white px-3 pt-3 pb-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] border-t border-gray-100 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
                {session && !session.is_active ? (

                    <div className="text-center py-3 bg-gray-50 rounded-2xl text-gray-500 text-xs font-bold">
                        Obrolan ini telah ditutup.
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="space-y-2">
                        {file && (
                            <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-xl text-xs">
                                <span className="truncate max-w-[200px] text-gray-700">{file.name}</span>
                                <button type="button" onClick={() => setFile(null)} className="text-red-500 font-bold ml-2">
                                    <span className="material-icons text-sm">close</span>
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 transition"
                            >
                                <span className="material-icons text-lg">attach_file</span>
                            </button>

                            <input
                                type="text"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={isStoreChat ? "Tulis pesan ke penjual..." : "Tulis pesan..."}
                                className="flex-1 px-3.5 py-2.5 bg-gray-50 rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-green-600 focus:bg-white transition"
                            />

                            <button
                                type="submit"
                                disabled={sending || (!content.trim() && !file)}
                                className="w-9 h-9 rounded-xl bg-green-700 hover:bg-green-800 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md shadow-green-200 transition"
                            >
                                {sending ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span className="material-icons text-lg">send</span>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Modal Lacak Pesanan */}
            {showTrackingModal && session?.order_details && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-sm text-gray-900">Lacak Pengiriman</h3>
                            <button onClick={() => setShowTrackingModal(false)} className="material-icons text-gray-400">close</button>
                        </div>
                        <div className="bg-amber-50 rounded-2xl p-3 mb-4">
                            <p className="text-xs font-bold text-amber-800">No. Resi: {session.order_details.resi_number || 'Belum diisi'}</p>
                            <p className="text-[11px] text-amber-700">Kurir: {session.order_details.shipping_courier || 'Ekspedisi'}</p>
                            <p className="text-[11px] text-amber-700">Status: {session.order_details.status}</p>
                        </div>
                        <p className="text-xs text-gray-500 text-center mb-4">
                            Paket sedang dalam proses perjalanan ke alamat tujuan Anda.
                        </p>
                        <button
                            onClick={() => setShowTrackingModal(false)}
                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Ajukan Komplain / Pengembalian */}
            {showComplaintModal && session?.order_details && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-red-600">
                                <span className="material-icons">report_problem</span>
                                <h3 className="font-bold text-sm">Ajukan Komplain / Retur</h3>
                            </div>
                            <button onClick={() => setShowComplaintModal(false)} className="material-icons text-gray-400">close</button>
                        </div>

                        <form onSubmit={handleComplaintSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Alasan Komplain:</label>
                                <select
                                    value={complaintForm.reasonCategory}
                                    onChange={(e) => setComplaintForm(prev => ({ ...prev, reasonCategory: e.target.value }))}
                                    className="w-full p-2.5 border rounded-xl text-xs bg-gray-50 focus:bg-white"
                                >
                                    <option value="Barang Rusak / Cacat Pabrik">Barang Rusak / Cacat dari Penjual</option>
                                    <option value="Kerusakan oleh Jasa Ekspedisi / Kurir">Kerusakan oleh Jasa Ekspedisi / Kurir</option>
                                    <option value="Barang Tidak Sesuai / Salah Kirim">Barang Tidak Sesuai / Salah Kirim</option>
                                    <option value="Barang Tidak Lengkap / Kurang Jumlah">Barang Tidak Lengkap / Kurang Jumlah</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Jelaskan Kendala & Kerusakan:</label>
                                <textarea
                                    required
                                    rows="3"
                                    placeholder="Ceritakan detail kerusakan barang atau kesalahan kirim..."
                                    value={complaintForm.notes}
                                    onChange={(e) => setComplaintForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full p-2.5 border rounded-xl text-xs bg-gray-50 focus:bg-white"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowComplaintModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingComplaint}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-200 transition flex items-center justify-center gap-1"
                                >
                                    {submittingComplaint ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        'Kirim Komplain'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Review Konsultasi Pakar */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl animate-scale-in">
                        <h3 className="font-bold text-sm text-gray-900 mb-2">Beri Ulasan Konsultasi</h3>
                        <form onSubmit={handleReviewSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Rating (1 - 5 Bintang):</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((num) => (
                                        <button
                                            type="button"
                                            key={num}
                                            onClick={() => setReviewForm(prev => ({ ...prev, rating: num }))}
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition ${
                                                reviewForm.rating >= num ? 'bg-amber-400 text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                                            }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Komentar / Masukan:</label>
                                <textarea
                                    rows="2"
                                    className="w-full p-2 border rounded-xl text-xs"
                                    placeholder="Ceritakan kepuasan konsultasi..."
                                    value={reviewForm.comment}
                                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    className="flex-1 py-2 border rounded-xl text-xs font-bold text-gray-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
                                >
                                    {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindowPage;

