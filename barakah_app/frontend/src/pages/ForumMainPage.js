import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { forumApi } from '../services/forumApi';

const ForumMainPage = () => {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newThread, setNewThread] = useState({ title: '', content: '', image: null });
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionUsers, setMentionUsers] = useState([]);
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        fetchThreads();
    }, []);

    const fetchThreads = async () => {
        try {
            const res = await forumApi.getThreads();
            setThreads(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch threads:', error);
            setLoading(false);
        }
    };

    const handleCreateThread = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newThread.title);
            formData.append('content', newThread.content);
            if (newThread.image) {
                formData.append('image', newThread.image);
            }
            
            await forumApi.createThread(formData);
            setShowForm(false);
            setNewThread({ title: '', content: '', image: null });
            fetchThreads();
        } catch (error) {
            console.error('Failed to create thread', error);
            alert('Gagal membuat thread');
        }
    };

    const handleTextChange = async (e) => {
        const value = e.target.value;
        setNewThread({ ...newThread, content: value });

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
        const textBeforeCursor = newThread.content.substring(0, cursorPosition);
        const textAfterCursor = newThread.content.substring(cursorPosition);
        const match = textBeforeCursor.match(/@([\w.]*)$/);
        if (match) {
            const newTextBefore = textBeforeCursor.substring(0, match.index) + `@${username} `;
            setNewThread({ ...newThread, content: newTextBefore + textAfterCursor });
            setShowMentionDropdown(false);
            setMentionUsers([]);
        }
    };

    const renderContentWithMentions = (text) => {
        if (!text) return null;
        const parts = text.split(/(@[\w\.]+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                return <span key={index} className="text-blue-600 font-semibold">{part}</span>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Helmet>
                <title>Forum Tanya Jawab - Barakah Economy</title>
                <meta name="description" content="Forum diskusi dan tanya jawab Barakah Economy. Diskusikan berbagai topik seputar bisnis, fiqih, dan ummat." />
            </Helmet>

            <div className="py-8 flex flex-col md:flex-row justify-between items-center bg-white shadow-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Forum Tanya Jawab</h1>
                    <p className="mt-2 text-gray-600">Diskusikan topik, tanya pakar, dan berbagai pengalaman.</p>
                </div>
                <div className="mt-4 md:mt-0">
                    {user ? (
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                        >
                            <span className="material-icons mr-2 text-[18px]">add</span> Buat Diskusi
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none"
                        >
                            Login untuk Diskusi
                        </button>
                    )}
                </div>
            </div>

            {showForm && user && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                    <h2 className="text-xl font-bold mb-4">Buat Diskusi Baru</h2>
                    <form onSubmit={handleCreateThread}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Judul</label>
                            <input
                                type="text"
                                required
                                value={newThread.title}
                                onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Judul diskusi..."
                            />
                        </div>
                        <div className="mb-4 relative">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Isi Diskusi</label>
                            <textarea
                                required
                                rows="5"
                                value={newThread.content}
                                onChange={handleTextChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Tulis pertanyaan atau diskusi Anda di sini... Ketik @ untuk mention"
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
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">Unggah Gambar (Opsional, Max 5MB)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file && file.size > 5 * 1024 * 1024) {
                                        alert('Ukuran gambar maksimal 5MB');
                                        e.target.value = null;
                                        setNewThread({ ...newThread, image: null });
                                    } else {
                                        setNewThread({ ...newThread, image: file });
                                    }
                                }}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Posting
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">Belum ada diskusi yang dibuat.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {threads.map((thread) => (
                        <Link
                            to={`/forum/${thread.slug}`}
                            key={thread.id}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col h-full overflow-hidden"
                        >
                            <div className="p-4 flex flex-col flex-grow">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-sm flex-shrink-0">
                                        {thread.author?.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {thread.author?.full_name}
                                            {thread.author?.is_expert && (
                                                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Pakar
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500">{formatDate(thread.created_at)}</p>
                                    </div>
                                </div>

                                <h3 className="text-md md:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                    {thread.title}
                                </h3>

                                <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-grow">
                                    {renderContentWithMentions(thread.content)}
                                </p>
                            </div>

                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <span className="material-icons text-gray-400 text-[16px]">chat</span>
                                    <span>{thread.replies_count} Balasan</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="material-icons text-gray-400 text-[16px]">visibility</span>
                                    <span>{thread.views} Dilihat</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ForumMainPage;
