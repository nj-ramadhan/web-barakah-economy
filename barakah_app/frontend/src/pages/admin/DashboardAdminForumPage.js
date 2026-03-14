import React, { useState, useEffect } from 'react';
import { forumApi } from '../../services/forumApi';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { Helmet } from 'react-helmet';

const DashboardAdminForumPage = () => {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedThread, setSelectedThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [showRepliesModal, setShowRepliesModal] = useState(false);

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const res = await forumApi.getThreads();
            setThreads(res.data);
        } catch (err) {
            console.error('Failed to fetch threads:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThreads();
    }, []);

    const handleDeleteThread = async (slug) => {
        if (!window.confirm("Yakin ingin menghapus diskusi ini beserta seluruh balasannya?")) return;
        try {
            await forumApi.deleteThread(slug);
            fetchThreads();
            setShowRepliesModal(false);
        } catch (err) {
            alert('Gagal menghapus diskusi');
        }
    };

    const handleViewReplies = async (thread) => {
        setSelectedThread(thread);
        try {
            const res = await forumApi.getThread(thread.slug);
            setReplies(res.data.replies || []);
            setShowRepliesModal(true);
        } catch (err) {
            console.error('Failed to fetch replies:', err);
        }
    };

    const handleDeleteReply = async (id) => {
        if (!window.confirm("Hapus balasan ini?")) return;
        try {
            await forumApi.deleteReply(id);
            // Refresh replies for the current selected thread
            const res = await forumApi.getThread(selectedThread.slug);
            setReplies(res.data.replies || []);
            // Also refresh thread list to update reply count
            fetchThreads();
        } catch (err) {
            alert('Gagal menghapus balasan');
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Manajemen Forum - Admin</title>
            </Helmet>
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-800">Manajemen Forum</h1>
                    <p className="text-xs text-gray-500">Moderasi diskusi dan balasan pengguna</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {threads.length === 0 ? (
                            <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center">
                                <span className="material-icons text-gray-300 text-5xl mb-2">forum</span>
                                <p className="text-gray-500 text-sm">Belum ada diskusi di forum.</p>
                            </div>
                        ) : (
                            threads.map(thread => (
                                <div key={thread.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-sm text-gray-800 group-hover:text-green-700 transition line-clamp-1">{thread.title}</h3>
                                            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{thread.content}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1">
                                                    <span className="material-icons text-[12px] text-gray-400">person</span>
                                                    <p className="text-[10px] text-gray-500">{thread.author_username}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-icons text-[12px] text-gray-400">calendar_today</span>
                                                    <p className="text-[10px] text-gray-500">{new Date(thread.created_at).toLocaleDateString('id-ID')}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-icons text-[12px] text-gray-400">comment</span>
                                                    <p className="text-[10px] text-gray-500">{thread.reply_count} Balasan</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            <button 
                                                onClick={() => handleViewReplies(thread)}
                                                className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition"
                                                title="Lihat Balasan"
                                            >
                                                <span className="material-icons text-sm">visibility</span>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteThread(thread.slug)}
                                                className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition"
                                                title="Hapus Diskusi"
                                            >
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {showRepliesModal && selectedThread && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Balasan Diskusi</h3>
                                <p className="text-xs text-gray-500 line-clamp-1">{selectedThread.title}</p>
                            </div>
                            <button onClick={() => setShowRepliesModal(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-4 pr-1 scrollbar-hide">
                            {replies.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <span className="material-icons text-4xl">comments_disabled</span>
                                    <p className="text-sm">Belum ada balasan.</p>
                                </div>
                            ) : (
                                replies.map(reply => (
                                    <div key={reply.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <p className="text-xs font-bold text-gray-700">@{reply.author_username}</p>
                                                    <span className="text-[10px] text-gray-400">•</span>
                                                    <p className="text-[10px] text-gray-400">{new Date(reply.created_at).toLocaleString('id-ID')}</p>
                                                </div>
                                                <p className="text-xs text-gray-600 leading-relaxed">{reply.content}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteReply(reply.id)}
                                                className="w-7 h-7 rounded-full bg-white text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition ml-3"
                                                title="Hapus Balasan"
                                            >
                                                <span className="material-icons text-[14px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <button 
                                onClick={() => handleDeleteThread(selectedThread.slug)}
                                className="w-full py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-2"
                            >
                                <span className="material-icons text-sm">delete_forever</span>
                                Hapus Seluruh Diskusi
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardAdminForumPage;
