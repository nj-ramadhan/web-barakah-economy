import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { forumApi } from '../services/forumApi';
import { FaUserCircle, FaArrowLeft, FaReply } from 'react-icons/fa';

const ForumThreadDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [thread, setThread] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyContent, setReplyContent] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // id of parent reply
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionUsers, setMentionUsers] = useState([]);
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchThread();
    }, [slug]);

    const fetchThread = async () => {
        try {
            const res = await forumApi.getThread(slug);
            setThread(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch thread:', error);
            setLoading(false);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        try {
            await forumApi.replyToThread({
                thread: thread.id,
                content: replyContent,
                parent: replyingTo
            });
            setReplyContent('');
            setReplyingTo(null);
            fetchThread(); // Refresh thread
        } catch (error) {
            console.error('Failed to submit reply', error);
            alert('Gagal membalas');
        }
    };

    const handleThreadDelete = async () => {
        if (!window.confirm("Yakin ingin menghapus thread ini beserta seluruh balasannya?")) return;
        try {
            await forumApi.deleteThread(slug);
            navigate('/forum');
        } catch (error) {
            alert('Gagal menghapus thread');
        }
    };

    const handleReplyDelete = async (id) => {
        if (!window.confirm("Yakin ingin menghapus balasan ini?")) return;
        try {
            await forumApi.deleteReply(id);
            fetchThread();
        } catch (error) {
            alert('Gagal menghapus balasan');
        }
    };

    const handleTextChange = async (e) => {
        const value = e.target.value;
        setReplyContent(value);

        const cursor = e.target.selectionStart;
        setCursorPosition(cursor);

        // Find if user is typing a mention word
        const textBeforeCursor = value.substring(0, cursor);
        const match = textBeforeCursor.match(/@([\w.]*)$/);

        if (match) {
            const query = match[1];
            setShowMentionDropdown(true);
            setMentionQuery(query);
            try {
                const res = await forumApi.searchUsers(query);
                setMentionUsers(res.data);
            } catch (err) { }
        } else {
            setShowMentionDropdown(false);
            setMentionUsers([]);
        }
    };

    const handleMentionSelect = (username) => {
        const textBeforeCursor = replyContent.substring(0, cursorPosition);
        const textAfterCursor = replyContent.substring(cursorPosition);
        const match = textBeforeCursor.match(/@([\w.]*)$/);
        if (match) {
            const newTextBefore = textBeforeCursor.substring(0, match.index) + `@${username} `;
            setReplyContent(newTextBefore + textAfterCursor);
            setShowMentionDropdown(false);
            setMentionUsers([]);
        }
    };

    const renderContentWithMentions = (text) => {
        if (!text) return null;
        const parts = text.split(/(@[\w\.]+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                return (
                    <span key={index} className="text-blue-600 font-semibold cursor-pointer">
                        {part}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center py-20 w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center py-20 w-full text-center">
                <p className="text-gray-500">Thread tidak ditemukan.</p>
            </div>
        );
    }

    // Recursive component to render replies
    const RenderReply = ({ reply, depth = 0 }) => {
        const isExpert = reply.is_expert;

        return (
            <div className={`mt-4 ${depth > 0 ? 'ml-6 md:ml-12 border-l-2 border-gray-200 pl-4' : ''}`}>
                <div className={`bg-white rounded-lg shadow-sm border ${isExpert ? 'border-green-300 bg-green-50' : 'border-gray-200'} p-4`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isExpert ? 'bg-green-200 text-green-900' : 'bg-blue-100 text-blue-800'}`}>
                            {reply.author?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                {reply.author?.full_name}
                                {isExpert && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Pakar
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(reply.created_at)}</p>
                        </div>
                    </div>
                    <div className="text-gray-800 text-sm md:text-base whitespace-pre-wrap">
                        {renderContentWithMentions(reply.content)}
                    </div>

                    {user && (
                        <div className="mt-3 flex justify-between items-center">
                            <div className="flex gap-4">
                                {(isAdmin || user.id === reply.author?.id) && (
                                    <button
                                        onClick={() => handleReplyDelete(reply.id)}
                                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                                    >
                                        Hapus
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setReplyingTo(reply.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
                            >
                                <FaReply className="text-[10px]" /> Balas
                            </button>
                        </div>
                    )}
                </div>

                {/* Render children replies */}
                {reply.children && reply.children.length > 0 && (
                    <div className="mt-2">
                        {reply.children.map(child => (
                            <RenderReply key={child.id} reply={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Helmet>
                <title>{thread.title} - Forum Barakah Economy</title>
                <meta name="description" content={thread.content.substring(0, 150) + '...'} />
            </Helmet>

            <div className="py-6">
                <button
                    onClick={() => navigate('/forum')}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4 text-sm font-medium"
                >
                    <FaArrowLeft /> Kembali ke Forum
                </button>

                {/* Main Thread Content */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{thread.title}</h1>

                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-lg">
                            {thread.author?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                {thread.author?.full_name}
                                {thread.author?.is_expert && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Pakar
                                    </span>
                                )}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(thread.created_at)}</p>
                        </div>

                        {(isAdmin || user?.id === thread.author?.id) && (
                            <button
                                onClick={handleThreadDelete}
                                className="text-xs text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 font-medium"
                            >
                                Hapus Thread
                            </button>
                        )}
                    </div>

                    <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">
                        {renderContentWithMentions(thread.content)}
                    </div>

                    <div className="mt-6 flex items-center gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
                        <span>{thread.views} tayangan</span>
                        <span>•</span>
                        <span>{thread.replies_count} balasan</span>
                    </div>
                </div>

                {/* Reply Form */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        {user ? (replyingTo ? 'Balas Komentar' : 'Tambahkan Balasan') : 'Login untuk membalas'}
                    </h3>

                    {user ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <form onSubmit={handleReplySubmit}>
                                {replyingTo && (
                                    <div className="mb-2 text-xs text-gray-500 flex justify-between items-center">
                                        <span>Membalas komentar spesifik</span>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(null)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            Batal membalas ini
                                        </button>
                                    </div>
                                )}
                                <div className="relative">
                                    <textarea
                                        className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        rows="4"
                                        placeholder="Tulis balasan Anda... Ketik @ untuk mention"
                                        value={replyContent}
                                        onChange={handleTextChange}
                                        required
                                    ></textarea>

                                    {/* Mention Dropdown */}
                                    {showMentionDropdown && mentionUsers.length > 0 && (
                                        <div className="absolute z-10 w-64 bg-white border border-gray-200 rounded-md shadow-lg -mt-1 max-h-48 overflow-y-auto">
                                            {mentionUsers.map((u) => (
                                                <div
                                                    key={u.id}
                                                    onClick={() => handleMentionSelect(u.username)}
                                                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex flex-col border-b last:border-0"
                                                >
                                                    <span className="font-semibold text-sm text-gray-800">{u.name}</span>
                                                    <span className="text-xs text-gray-500">@{u.username}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                                    >
                                        Kirim Balasan
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col items-center justify-center">
                            <p className="text-sm text-blue-800 mb-3">Anda harus masuk untuk membalas diskusi ini.</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                            >
                                Login Sekarang
                            </button>
                        </div>
                    )}
                </div>

                {/* Replies List */}
                <div className="mt-8 mb-12">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Semua Balasan</h3>
                    {thread.replies && thread.replies.length > 0 ? (
                        <div className="space-y-4 text-sm md:text-base">
                            {thread.replies.map(reply => (
                                <RenderReply key={reply.id} reply={reply} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">Belum ada balasan, jadilah yang pertama membalas!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForumThreadDetail;
