import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMessages, sendMessage, markRead, getSessionDetail, toggleAISession, getConsultantsByCategory, createSession, getChatCommands, closeSession, submitReview } from '../../services/chatApi';

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

    const builtInCommands = [
        { code: '/pakar', label: 'Chat dengan Pakar', desc: 'AI akan dinonaktifkan sementara', icon: 'person' },
        { code: '/ai', label: 'Aktifkan AI', desc: 'Asisten AI akan mulai menjawab kembali', icon: 'smart_toy' },
        { code: '/selesai', label: 'Akhiri Sesi', desc: 'Menutup sesi konsultasi ini', icon: 'check_circle' }
    ];

    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user'));

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
            setMessages(msgRes.data.results.reverse());
            setSession(sessRes.data);
            setAvailableCommands(cmdRes.data);
            setHasMore(!!msgRes.data.next);
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
            const newMessages = res.data.results;

            if (isInitial) {
                setMessages(newMessages.reverse());
                setTimeout(scrollToBottom, 50);
            } else {
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
                    if (uniqueNew.length === 0) return prev;

                    // If pageNum is 1, these are "new" messages, so append to end
                    if (pageNum === 1) {
                        const updated = [...prev, ...uniqueNew.reverse()];
                        setTimeout(scrollToBottom, 50);
                        return updated;
                    }
                    // If pageNum > 1, these are "older" messages, so prepend to start
                    return [...uniqueNew.reverse(), ...prev];
                });
            }

            setHasMore(!!res.data.next);
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
        }, 5000);

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
        e.preventDefault();
        if ((!content.trim() && !file) || sending) return;

        // Command handler: if content starts with / and it's a known command
        if (content.startsWith('/') && !file) {
            const cmd = filteredCommands.find(c => c.code === content.trim());
            if (cmd) {
                handleCommandSelect(cmd);
                return;
            } else if (content.length > 1) {
                // If it looks like a command but unknown, warn or just send?
                // User said "jangan di tampilkan /{command}", so let's block unknown commands too
                alert('Command tidak dikenal.');
                return;
            }
        }

        setSending(true);
        const formData = new FormData();
        formData.append('session', sessionId);
        if (content.trim()) formData.append('content', content);
        if (file) formData.append('attachment', file);

        try {
            const res = await sendMessage(formData);
            // Append only if NOT already there (prevent double add if poll beat us)
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

    const handleQuickReply = async (text) => {
        if (!text || sending) return;
        setSending(true);
        const formData = new FormData();
        formData.append('session', sessionId);
        formData.append('content', text);

        try {
            const res = await sendMessage(formData);
            setMessages(prev => {
                if (prev.some(m => m.id === res.data.id)) return prev;
                return [...prev, res.data];
            });
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            alert('Gagal mengirim template.');
        } finally {
            setSending(false);
        }
    };

    const handleToggleAI = async (isActive) => {
        try {
            await toggleAISession(sessionId, isActive);
            setSession(prev => ({ ...prev, is_ai_active: isActive }));
        } catch (err) {
            alert('Gagal mengubah status AI.');
        }
    };

    const handleCloseSession = async () => {
        if (!window.confirm('Akhiri sesi konsultasi ini? User tidak akan bisa membalas lagi.')) return;
        try {
            const res = await closeSession(sessionId);
            setSession(res.data);
            handleQuickReply('🏁 *Sesi konsultasi telah dinyatakan selesai oleh pakar.*');
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
            fetchData(); // Refresh to show review state
        } catch (err) {
            alert('Gagal mengirim review.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleCommandSelect = async (cmd) => {
        // Built-in handlers
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
            // Dynamic commands with actions
            if (cmd.content) {
                handleQuickReply(cmd.content);
            }

            // Perform actions if flags are set
            if (cmd.is_toggle_ai_on) await handleToggleAI(true);
            if (cmd.is_toggle_ai_off) await handleToggleAI(false);
            if (cmd.is_close_session) {
                try {
                    const res = await closeSession(sessionId);
                    setSession(res.data);
                } catch (err) { console.error('Failed to close via command', err); }
            }
            if (cmd.is_request_review) {
                setTimeout(() => setShowReviewModal(true), 1000); // Small delay to let message appear
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

    const handleOpenExpertModal = async () => {
        if (!session?.category) return;
        setShowExpertModal(true);
        setLoadingExperts(true);
        try {
            const res = await getConsultantsByCategory(session.category);
            setAvailableExperts(res.data);
        } catch (err) {
            console.error('Failed to load experts:', err);
        } finally {
            setLoadingExperts(false);
        }
    };

    const handleSelectExpert = async (expertId) => {
        try {
            setLoading(true);
            const res = await createSession(session.category, expertId);
            setShowExpertModal(false);
            navigate(`/chat/${res.data.id}`);
        } catch (err) {
            alert('Gagal menghubungkan ke pakar.');
        } finally {
            setLoading(false);
        }
    };

    const isExpert = session?.consultant === currentUser?.id;

    const filteredCommands = [
        ...builtInCommands.map(c => ({ ...c, isBuiltIn: true })).filter(cmd => {
            if (cmd.code === '/ai') return currentUser?.is_staff || currentUser?.role === 'admin';
            if (cmd.code === '/pakar') return !session?.consultant && !currentUser?.is_staff;
            if (cmd.code === '/selesai') return isExpert || currentUser?.is_staff || currentUser?.role === 'admin';
            return true;
        }),
        ...availableCommands
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] lg:h-[700px] bg-white lg:rounded-3xl lg:shadow-2xl max-w-md mx-auto relative overflow-hidden lg:my-4">
            {/* Header Chat */}
            <div className="bg-white px-4 py-3 flex items-center gap-4 shadow-sm z-10">
                <button onClick={() => navigate('/chat')} className="material-icons text-gray-500">arrow_back</button>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-green-700">person</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-800 text-sm truncate">
                        {session ? (
                            session.consultant_details?.username || `Chat ${session.category_name}`
                        ) : 'Memuat...'}
                    </h2>
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${session?.is_ai_active ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                        {session?.category_name || 'Konsultasi'}
                        {session && !session.is_ai_active && (
                            <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[8px] ml-1">PAKAR MODE</span>
                        )}
                    </p>
                </div>
                {session && session.is_active && !session.consultant && (
                    <button
                        onClick={handleOpenExpertModal}
                        className="bg-green-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-green-800 shadow-md transition whitespace-nowrap"
                    >
                        <span className="material-icons text-xs">person</span>
                        Tanya Pakar
                    </button>
                )}
                {session && session.is_active && session.is_ai_active === false && currentUser?.is_staff && (
                    <button
                        onClick={() => handleToggleAI(true)}
                        className="bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-100 transition"
                    >
                        <span className="material-icons text-xs">smart_toy</span>
                        Aktifkan AI
                    </button>
                )}
                {session && session.is_active && (isExpert || currentUser?.is_staff || currentUser?.role === 'admin') && (
                    <button
                        onClick={handleCloseSession}
                        className="bg-red-50 text-red-600 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-red-100 transition whitespace-nowrap"
                    >
                        <span className="material-icons text-xs">check_circle</span>
                        Selesai
                    </button>
                )}
                {session && !session.is_active && !session.review && !isExpert && !currentUser?.is_staff && (
                    <button
                        onClick={() => setShowReviewModal(true)}
                        className="bg-amber-50 text-amber-600 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-amber-100 transition whitespace-nowrap"
                    >
                        <span className="material-icons text-xs">star</span>
                        Beri Review
                    </button>
                )}
                {(isExpert || currentUser?.is_staff || currentUser?.role === 'admin') && session?.review && (
                    <button
                        onClick={() => setShowViewReviewModal(true)}
                        className="bg-amber-100 text-amber-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-amber-200 transition whitespace-nowrap shadow-sm"
                    >
                        <span className="material-icons text-xs">star</span>
                        Lihat Review
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8d9744158120732.jpg')] bg-repeat bg-center"
            >
                {hasMore && (
                    <button
                        onClick={handleLoadMore}
                        className="w-full text-center py-2 text-xs text-gray-500 font-bold bg-white/50 rounded-full hover:bg-white/80 transition"
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
                        return (
                            <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${isMe
                                    ? 'bg-green-700 text-white rounded-tr-none'
                                    : 'bg-white text-gray-800 rounded-tl-none'
                                    }`}>
                                    {msg.attachment && (
                                        <div className="mb-2">
                                            {msg.attachment.match(/\.(jpeg|jpg|gif|png)$/) ? (
                                                <img
                                                    src={msg.attachment}
                                                    alt="attachment"
                                                    className="rounded-lg max-w-full h-auto cursor-pointer"
                                                    onClick={() => window.open(msg.attachment, '_blank')}
                                                />
                                            ) : (
                                                <a
                                                    href={msg.attachment}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`flex items-center gap-2 p-2 rounded-lg border ${isMe ? 'bg-green-600 border-green-500' : 'bg-gray-50 border-gray-100'}`}>
                                                    <span className="material-icons text-sm">insert_drive_file</span>
                                                    <span className="text-[10px] truncate max-w-[100px]">Dokumen</span>
                                                    <span className="material-icons text-sm">download</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
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
            <div className="bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                {session && !session.is_active ? (
                    <div className="text-center py-4 bg-gray-50 rounded-2xl text-gray-500 text-xs font-bold">
                        Sesi konsultasi ini telah ditutup.
                        {session.review ? (
                            <span className="ml-2 text-amber-600">
                                ⭐ Anda memberikan {session.review.rating} bintang
                            </span>
                        ) : (!isExpert && !currentUser?.is_staff && (
                            <button
                                onClick={() => setShowReviewModal(true)}
                                className="ml-2 text-indigo-600 hover:underline flex inline-items items-center gap-0.5"
                            >
                                <span className="material-icons text-xs">edit_note</span>
                                Klik di sini untuk memberi penilaian
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        {session?.category_welcome_message && messages.length < 5 && !content && (
                            <div className="flex overflow-x-auto pb-2 mb-2 gap-2 scrollbar-hide">
                                <button
                                    onClick={() => handleQuickReply(session.category_welcome_message)}
                                    className="flex-shrink-0 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-[10px] font-bold border border-green-100 hover:bg-green-100 transition flex items-center gap-1.5"
                                >
                                    <span className="material-icons text-xs">auto_fix_high</span>
                                    {session.category_welcome_message.length > 30
                                        ? session.category_welcome_message.substring(0, 30) + '...'
                                        : session.category_welcome_message}
                                </button>
                            </div>
                        )}

                        {/* Command Popup */}
                        {showCommands && (
                            <div className="absolute bottom-full left-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-2xl mb-2 overflow-hidden animate-slide-up z-50">
                                <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Pilih Perintah</span>
                                    <button onClick={() => setShowCommands(false)} className="material-icons text-xs text-gray-300">close</button>
                                </div>
                                {/* Combine static built-in and dynamic commands */}
                                {filteredCommands.map((cmd) => (
                                    <button
                                        key={cmd.code}
                                        onClick={() => handleCommandSelect(cmd)}
                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 transition group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <span className="material-icons text-sm">{cmd.icon || 'code'}</span>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-800">{cmd.label}</div>
                                            <div className="text-[9px] text-gray-400">{cmd.desc || (cmd.content && cmd.content.length > 50 ? cmd.content.substring(0, 50) + '...' : cmd.content)}</div>
                                        </div>
                                        <span className="ml-auto text-[10px] font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded uppercase">{cmd.code}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {file && (
                            <div className="bg-gray-50 p-2 rounded-xl mb-3 flex items-center justify-between border border-gray-100 animate-slide-up">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="material-icons text-gray-400 text-sm">attach_file</span>
                                    <span className="text-[10px] text-gray-600 truncate">{file.name}</span>
                                </div>
                                <button onClick={() => setFile(null)} className="material-icons text-gray-400 text-sm">close</button>
                            </div>
                        )}

                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current.click()}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-green-600 transition"
                            >
                                <span className="material-icons">attach_file</span>
                            </button>
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            <textarea
                                rows="1"
                                value={content}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setContent(val);
                                    if (val === '/') setShowCommands(true);
                                    else if (showCommands && !val.startsWith('/')) setShowCommands(false);
                                }}
                                placeholder="Tulis pesan... atau ketik /"
                                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-green-500 resize-none max-h-32"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    } else if (e.key === 'Escape') {
                                        setShowCommands(false);
                                    }
                                }}
                            />

                            <button
                                type="submit"
                                disabled={sending || (!content.trim() && !file)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${content.trim() || file ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-300'
                                    }`}>
                                <span className="material-icons">{sending ? 'sync' : 'send'}</span>
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* Expert Selection Modal */}
            {showExpertModal && (
                <div className="fixed inset-0 bg-black/60 z-[2000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 animate-slide-up shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="material-icons text-green-600">psychology</span>
                                Pilih Pakar {session?.category_name}
                            </h3>
                            <button onClick={() => setShowExpertModal(false)} className="material-icons text-gray-400 hover:text-gray-600 transition">close</button>
                        </div>

                        <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                            {loadingExperts ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                                </div>
                            ) : availableExperts.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-2xl">
                                    <span className="material-icons text-gray-300 text-4xl mb-2">person_off</span>
                                    <p className="text-xs text-gray-500 px-4">Maaf, saat ini belum ada pakar tersedia di kategori ini.</p>
                                </div>
                            ) : (
                                availableExperts.map((exp) => (
                                    <div
                                        key={exp.id}
                                        onClick={() => handleSelectExpert(exp.user)}
                                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-green-200 hover:bg-green-50/50 transition cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:bg-green-600 group-hover:text-white transition-colors">
                                            <span className="material-icons">person</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800 text-sm group-hover:text-green-700 transition-colors">{exp.user_details.username}</div>
                                            <div className="text-[10px] text-gray-400 italic line-clamp-1">{exp.bio || 'Pakar profesional'}</div>
                                        </div>
                                        <span className="material-icons text-gray-300 group-hover:text-green-600 transition-colors">chevron_right</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <p className="text-[9px] text-gray-400 text-center italic mt-4 bg-gray-50 py-2 rounded-lg">
                            Memulai chat dengan pakar akan membuat sesi diskusi baru yang lebih personal.
                        </p>
                    </div>
                </div>
            )}
            {/* Review Modal for User */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Review Konsultasi</h3>
                        <p className="text-[10px] text-gray-400 mb-6">Penilaian Anda sangat berarti untuk meningkatkan kualitas layanan kami.</p>

                        <form onSubmit={handleReviewSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Penilaian Anda</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star} type="button"
                                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${reviewForm.rating >= star ? 'bg-amber-100 text-amber-500' : 'bg-gray-50 text-gray-300'}`}
                                        >
                                            <span className="material-icons">{reviewForm.rating >= star ? 'star' : 'star_outline'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Komentar untuk Pakar</label>
                                <textarea
                                    rows="3"
                                    value={reviewForm.comment}
                                    onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Bagaimana pelayanan pakar tadi?"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Kritik & Saran Platform</label>
                                <textarea
                                    rows="3"
                                    value={reviewForm.criticism_suggestion}
                                    onChange={e => setReviewForm({ ...reviewForm, criticism_suggestion: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Saran untuk kemajuan Barakah App..."
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button" onClick={() => setShowReviewModal(false)}
                                    className="flex-1 py-3.5 bg-gray-50 text-gray-400 rounded-2xl text-xs font-bold"
                                >
                                    Nanti Saja
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100"
                                >
                                    {submittingReview ? 'Mengirim...' : 'Kirim Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Review Modal for Expert/Admin */}
            {showViewReviewModal && session?.review && (
                <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Review Pengguna</h3>
                            <button onClick={() => setShowViewReviewModal(false)} className="material-icons text-gray-400">close</button>
                        </div>

                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="flex justify-center gap-1 text-amber-500 mb-2">
                                    {[...Array(session.review.rating)].map((_, i) => (
                                        <span key={i} className="material-icons text-2xl">star</span>
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{session.review.rating} Bintang</span>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Komentar User</label>
                                <p className="text-xs text-gray-700 italic leading-relaxed">"{session.review.comment || 'Tidak ada komentar'}"</p>
                            </div>

                            {session.review.criticism_suggestion && (
                                <div className="bg-rose-50 p-4 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-rose-400 uppercase mb-2">Kritik/Saran Platform</label>
                                    <p className="text-xs text-rose-700 italic leading-relaxed">"{session.review.criticism_suggestion}"</p>
                                </div>
                            )}

                            <button
                                onClick={() => setShowViewReviewModal(false)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindowPage;
