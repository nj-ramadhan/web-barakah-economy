import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMessages, sendMessage, markRead } from '../../services/chatApi';

const ChatWindowPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user'));

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async (pageNum = 1, isInitial = false) => {
        try {
            const res = await getMessages(sessionId, pageNum);
            const newMessages = res.data.results;

            if (isInitial) {
                setMessages(newMessages.reverse());
                setTimeout(scrollToBottom, 100);
            } else {
                setMessages(prev => [...newMessages.reverse(), ...prev]);
            }

            setHasMore(!!res.data.next);
            await markRead(sessionId);
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages(1, true);

        // Polling for new messages every 5 seconds (Simple implementation for now)
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

        setSending(true);
        const formData = new FormData();
        formData.append('session', sessionId);
        if (content.trim()) formData.append('content', content);
        if (file) formData.append('attachment', file);

        try {
            const res = await sendMessage(formData);
            setMessages(prev => [...prev, res.data]);
            setContent('');
            setFile(null);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            alert('Gagal mengirim pesan.');
        } finally {
            setSending(false);
        }
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

    return (
        <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto relative overflow-hidden">
            {/* Header Chat */}
            <div className="bg-white px-4 py-3 flex items-center gap-4 shadow-sm z-10">
                <button onClick={() => navigate('/chat')} className="material-icons text-gray-500">arrow_back</button>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="material-icons text-green-700">person</span>
                </div>
                <div className="flex-1">
                    <h2 className="font-bold text-gray-800 text-sm">Consultant Pakar</h2>
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Online</p>
                </div>
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
                        const isMe = msg.sender === currentUser.id;
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
                                                    className={`flex items-center gap-2 p-2 rounded-lg border ${isMe ? 'bg-green-600 border-green-500' : 'bg-gray-50 border-gray-100'}`}
                                                >
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
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Tulis pesan..."
                        className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-green-500 resize-none max-h-32"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend(e);
                            }
                        }}
                    />

                    <button
                        type="submit"
                        disabled={sending || (!content.trim() && !file)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${content.trim() || file ? 'bg-green-700 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-300'
                            }`}
                    >
                        <span className="material-icons">{sending ? 'sync' : 'send'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindowPage;
