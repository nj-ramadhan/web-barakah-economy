import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { forumApi } from '../services/forumApi';
import UserProfileModal from '../components/modals/UserProfileModal';

const RenderReply = ({ 
    reply, 
    depth = 0, 
    user, 
    isAdmin, 
    replyingTo, 
    setReplyingTo, 
    handleReplySubmit, 
    handleReplyDelete, 
    handleTextChange, 
    replyContent, 
    showMentionDropdown, 
    mentionUsers, 
    handleMentionSelect, 
    renderContentWithMentions, 
    formatDate,
    onOpenProfile,
    handleLikeReply 
}) => {
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
                            <span 
                                className="hover:text-blue-600 cursor-pointer transition-colors"
                                role="button"
                                tabIndex="0"
                                onClick={() => onOpenProfile(reply.author?.id)}
                                onKeyDown={(e) => e.key === 'Enter' && onOpenProfile(reply.author?.id)}
                            >
                                {reply.author?.full_name}
                            </span>
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
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={() => handleLikeReply(reply.id)}
                                className={`flex items-center gap-1 text-sm font-medium transition-colors ${reply.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                            >
                                <span className="material-icons text-[18px]">
                                    {reply.is_liked ? 'favorite' : 'favorite_border'}
                                </span>
                                <span>{reply.likes_count || 0}</span>
                            </button>
                            {(isAdmin || user.id === reply.author?.id) && (
                                <button
                                    onClick={() => handleReplyDelete(reply.id)}
                                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                        {replyingTo !== reply.id && (
                            <button
                                onClick={() => setReplyingTo(reply.id)}
                                className="text-xs flex items-center gap-1 font-medium px-3 py-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                                <span className="material-icons text-[14px]">reply</span> 
                                Balas
                            </button>
                        )}
                    </div>
                )}

                {/* Inline Reply Form */}
                {user && replyingTo === reply.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <form onSubmit={handleReplySubmit}>
                            <div className="relative">
                                <textarea
                                    className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    rows="3"
                                    placeholder={`Balas ${reply.author?.full_name}...`}
                                    value={replyContent}
                                    onChange={handleTextChange}
                                    autoFocus
                                    required
                                ></textarea>
                                {showMentionDropdown && mentionUsers.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg -mt-1 max-h-48 overflow-y-auto">
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
                            <div className="mt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-xs font-bold"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-xs font-bold"
                                >
                                    Kirim Balasan
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Render children replies */}
            {reply.children && reply.children.length > 0 && (
                <div className="mt-2">
                    {reply.children.map(child => (
                        <RenderReply 
                            key={child.id} 
                            reply={child} 
                            depth={depth + 1} 
                            user={user}
                            isAdmin={isAdmin}
                            replyingTo={replyingTo}
                            setReplyingTo={setReplyingTo}
                            handleReplySubmit={handleReplySubmit}
                            handleReplyDelete={handleReplyDelete}
                            handleTextChange={handleTextChange}
                            replyContent={replyContent}
                            showMentionDropdown={showMentionDropdown}
                            mentionUsers={mentionUsers}
                            handleMentionSelect={handleMentionSelect}
                            renderContentWithMentions={renderContentWithMentions}
                            formatDate={formatDate}
                            onOpenProfile={onOpenProfile}
                            handleLikeReply={handleLikeReply}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

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
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'admin' || user?.role === 'staff' || user?.is_staff || user?.is_superuser;

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
    
    const handleLikeThread = async () => {
        if (!user) {
            alert('Silakan login untuk memberikan like');
            return;
        }
        try {
            const res = await forumApi.likeThread(slug);
            if (res.data.status === 'success') {
                // Update local state for immediate feedback
                setThread(prev => ({
                    ...prev,
                    is_liked: res.data.liked,
                    likes_count: res.data.likes_count
                }));
            }
        } catch (error) {
            console.error('Failed to like thread', error);
        }
    };

    const handleLikeReply = async (replyId) => {
        if (!user) {
            alert('Silakan login untuk memberikan like');
            return;
        }
        try {
            const res = await forumApi.likeReply(replyId);
            if (res.data.status === 'success') {
                // We need to update the reply in the thread.replies tree
                // Easiest is to refetch, but for better UX we can update deep state
                // Since it's a tree, it's a bit complex. Let's try deep update.
                const updateReplyInList = (replies) => {
                    return replies.map(r => {
                        if (r.id === replyId) {
                            return { ...r, is_liked: res.data.liked, likes_count: res.data.likes_count };
                        }
                        if (r.children && r.children.length > 0) {
                            return { ...r, children: updateReplyInList(r.children) };
                        }
                        return r;
                    });
                };
                
                setThread(prev => ({
                    ...prev,
                    replies: updateReplyInList(prev.replies)
                }));
            }
        } catch (error) {
            console.error('Failed to like reply', error);
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
                    <span className="material-icons text-[18px]">arrow_back</span> Kembali ke Forum
                </button>

                {/* Main Thread Content */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8 border border-gray-100">
                    <div className="p-6 md:p-8">
                        {/* Thread Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-lg">
                                    {thread.author?.full_name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">
                                        <span 
                                            className="hover:text-blue-600 cursor-pointer transition-colors"
                                            role="button"
                                            tabIndex="0"
                                            onClick={() => {
                                                setSelectedUserId(thread.author?.id);
                                                setIsProfileModalOpen(true);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    setSelectedUserId(thread.author?.id);
                                                    setIsProfileModalOpen(true);
                                                }
                                            }}
                                        >
                                            {thread.author?.full_name}
                                        </span>
                                        {thread.author?.is_expert && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                Pakar
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-gray-500">{formatDate(thread.created_at)} • {thread.views} Dilihat</p>
                                </div>
                            </div>
                            
                            {(isAdmin || user?.id === thread.author?.id) && (
                                <button 
                                    onClick={handleThreadDelete}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1"
                                >
                                    <span className="material-icons text-sm">delete</span> Hapus
                                </button>
                            )}
                        </div>

                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-6 leading-tight">
                            {thread.title}
                        </h1>

                        {thread.image && (
                            <div className="mb-6 rounded-xl overflow-hidden border border-gray-100 max-h-96 flex justify-center bg-gray-50">
                                <img 
                                    src={thread.image.startsWith('http') ? thread.image : `${process.env.REACT_APP_API_BASE_URL}${thread.image}`} 
                                    alt={thread.title}
                                    className="max-h-96 object-contain"
                                />
                            </div>
                        )}

                        <div className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap mb-8">
                            {renderContentWithMentions(thread.content)}
                        </div>

                        <div className="flex items-center gap-6 mb-8 py-4 border-t border-b border-gray-50">
                            <button
                                onClick={handleLikeThread}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                                    thread.is_liked 
                                    ? 'bg-red-50 text-red-600 shadow-sm' 
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <span className={`material-icons ${thread.is_liked ? 'text-red-600' : 'text-gray-400'}`}>
                                    {thread.is_liked ? 'favorite' : 'favorite_border'}
                                </span>
                                <span className="font-bold">{thread.likes_count || 0}</span>
                                <span className="text-sm font-medium">Suka</span>
                            </button>

                            <button 
                                onClick={() => {
                                    const el = document.getElementById('reply-form');
                                    if(el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all duration-200"
                            >
                                <span className="material-icons text-gray-400">forum</span>
                                <span className="font-bold">{thread.replies_count}</span>
                                <span className="text-sm font-medium">Balasan</span>
                            </button>
                        </div>

                        <div className="mt-8 flex items-center gap-4 text-xs text-gray-400 border-t border-gray-50 pt-6">
                            <div className="flex items-center gap-1">
                                <span className="material-icons text-sm">visibility</span>
                                <span>{thread.views} tayangan</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <span className="material-icons text-sm">forum</span>
                                <span>{thread.replies_count} balasan</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8" id="reply-form">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        {user ? (replyingTo ? 'Tambahkan Balasan Baru' : 'Tambahkan Balasan') : 'Login untuk membalas'}
                    </h3>

                    {user ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <form onSubmit={handleReplySubmit}>
                                {replyingTo && (
                                    <div className="mb-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-800 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-sm">info</span>
                                            <span>Anda sedang membalas salah satu komentar di atas.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(null)}
                                            className="text-blue-600 hover:underline font-bold"
                                        >
                                            Ubah jadi balasan umum
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
                                <RenderReply 
                                    key={reply.id} 
                                    reply={reply} 
                                    user={user}
                                    isAdmin={isAdmin}
                                    replyingTo={replyingTo}
                                    setReplyingTo={setReplyingTo}
                                    handleReplySubmit={handleReplySubmit}
                                    handleReplyDelete={handleReplyDelete}
                                    handleTextChange={handleTextChange}
                                    replyContent={replyContent}
                                    showMentionDropdown={showMentionDropdown}
                                    mentionUsers={mentionUsers}
                                    handleMentionSelect={handleMentionSelect}
                                    renderContentWithMentions={renderContentWithMentions}
                                    formatDate={formatDate}
                                    onOpenProfile={(id) => {
                                        setSelectedUserId(id);
                                        setIsProfileModalOpen(true);
                                    }}
                                    handleLikeReply={handleLikeReply}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">Belum ada balasan, jadilah yang pertama membalas!</p>
                    )}
                </div>
            </div>
            <UserProfileModal 
                userId={selectedUserId} 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
            />
        </div>
    );
};

export default ForumThreadDetail;
