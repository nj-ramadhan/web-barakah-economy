import React, { useState, useEffect, useMemo } from 'react';
import { forumApi } from '../../services/forumApi';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const DashboardAdminForumPage = () => {
    const [threads, setThreads] = useState([]);
    const [repliesList, setRepliesList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Active tabs and filters
    const [activeMainTab, setActiveMainTab] = useState('threads'); // 'threads' | 'replies'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
    const [searchQuery, setSearchQuery] = useState('');

    // Checkbox selections for bulk actions
    const [selectedThreadIds, setSelectedThreadIds] = useState(new Set());
    const [selectedReplyIds, setSelectedReplyIds] = useState(new Set());

    // Modal state for viewing thread replies
    const [selectedThread, setSelectedThread] = useState(null);
    const [threadReplies, setThreadReplies] = useState([]);
    const [showRepliesModal, setShowRepliesModal] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [threadsRes, repliesRes] = await Promise.all([
                forumApi.getAdminThreads().catch(() => ({ data: [] })),
                forumApi.getAdminReplies().catch(() => ({ data: [] }))
            ]);
            setThreads(threadsRes.data || []);
            setRepliesList(repliesRes.data || []);
        } catch (err) {
            console.error('Failed fetching forum data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Statistics counts
    const threadStats = useMemo(() => {
        const total = threads.length;
        const pending = threads.filter(t => !t.is_approved || t.status === 'pending').length;
        const approved = threads.filter(t => t.is_approved || t.status === 'approved').length;
        const rejected = threads.filter(t => t.status === 'rejected').length;
        return { total, pending, approved, rejected };
    }, [threads]);

    const replyStats = useMemo(() => {
        const total = repliesList.length;
        const spam = repliesList.filter(r => r.is_spam || r.status === 'spam').length;
        const approved = repliesList.filter(r => (r.is_approved || r.status === 'approved') && !r.is_spam).length;
        const rejected = repliesList.filter(r => r.status === 'rejected').length;
        return { total, spam, approved, rejected };
    }, [repliesList]);

    // Filtered lists
    const filteredThreads = useMemo(() => {
        return threads.filter(t => {
            const matchesStatus = 
                statusFilter === 'all' ||
                (statusFilter === 'pending' && (!t.is_approved || t.status === 'pending')) ||
                (statusFilter === 'approved' && (t.is_approved || t.status === 'approved')) ||
                (statusFilter === 'rejected' && t.status === 'rejected');

            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || 
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.content && t.content.toLowerCase().includes(q)) ||
                (t.author_username && t.author_username.toLowerCase().includes(q));

            return matchesStatus && matchesSearch;
        });
    }, [threads, statusFilter, searchQuery]);

    const filteredReplies = useMemo(() => {
        return repliesList.filter(r => {
            const isSpam = r.is_spam || r.status === 'spam';
            const isAppr = (r.is_approved || r.status === 'approved') && !isSpam;
            const isRej = r.status === 'rejected';

            const matchesStatus = 
                statusFilter === 'all' ||
                (statusFilter === 'spam' && isSpam) ||
                (statusFilter === 'approved' && isAppr) ||
                (statusFilter === 'rejected' && isRej) ||
                (statusFilter === 'pending' && (!r.is_approved && !isSpam && !isRej));

            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || 
                (r.content && r.content.toLowerCase().includes(q)) ||
                (r.author_username && r.author_username.toLowerCase().includes(q)) ||
                (r.thread_title && r.thread_title.toLowerCase().includes(q)) ||
                (r.spam_reason && r.spam_reason.toLowerCase().includes(q));

            return matchesStatus && matchesSearch;
        });
    }, [repliesList, statusFilter, searchQuery]);

    // Checkbox toggles for Threads
    const handleToggleSelectThread = (id) => {
        setSelectedThreadIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllThreads = () => {
        if (selectedThreadIds.size === filteredThreads.length && filteredThreads.length > 0) {
            setSelectedThreadIds(new Set());
        } else {
            setSelectedThreadIds(new Set(filteredThreads.map(t => t.id)));
        }
    };

    // Checkbox toggles for Replies
    const handleToggleSelectReply = (id) => {
        setSelectedReplyIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllReplies = () => {
        if (selectedReplyIds.size === filteredReplies.length && filteredReplies.length > 0) {
            setSelectedReplyIds(new Set());
        } else {
            setSelectedReplyIds(new Set(filteredReplies.map(r => r.id)));
        }
    };

    // Single Thread Actions
    const handleApproveThread = async (slug) => {
        try {
            setActionLoading(true);
            await forumApi.approveThread(slug);
            fetchData();
        } catch (err) {
            alert('Gagal menyetujui diskusi');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectThread = async (slug) => {
        if (!window.confirm("Tolak diskusi ini? Diskusi tidak akan tampil di forum publik.")) return;
        try {
            setActionLoading(true);
            await forumApi.rejectThread(slug);
            fetchData();
        } catch (err) {
            alert('Gagal menolak diskusi');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteThread = async (slug) => {
        if (!window.confirm("Yakin ingin menghapus diskusi ini beserta seluruh balasannya secara permanen?")) return;
        try {
            setActionLoading(true);
            await forumApi.deleteThread(slug);
            setSelectedThreadIds(prev => {
                const next = new Set(prev);
                next.delete(slug);
                return next;
            });
            fetchData();
            setShowRepliesModal(false);
        } catch (err) {
            alert('Gagal menghapus diskusi');
        } finally {
            setActionLoading(false);
        }
    };

    // Bulk Thread Actions
    const handleBulkApproveThreads = async () => {
        const ids = Array.from(selectedThreadIds);
        if (ids.length === 0) return;
        if (!window.confirm(`Setujui ${ids.length} diskusi yang dipilih agar tayang ke publik?`)) return;
        try {
            setActionLoading(true);
            await forumApi.bulkApproveThreads(ids);
            setSelectedThreadIds(new Set());
            fetchData();
        } catch (err) {
            alert('Gagal menyetujui diskusi massal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkRejectThreads = async () => {
        const ids = Array.from(selectedThreadIds);
        if (ids.length === 0) return;
        if (!window.confirm(`Tolak ${ids.length} diskusi yang dipilih? Diskusi tidak akan tayang ke publik.`)) return;
        try {
            setActionLoading(true);
            await forumApi.bulkRejectThreads(ids);
            setSelectedThreadIds(new Set());
            fetchData();
        } catch (err) {
            alert('Gagal menolak diskusi massal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDeleteThreads = async () => {
        const ids = Array.from(selectedThreadIds);
        if (ids.length === 0) return;
        if (!window.confirm(`PERINGATAN: Hapus ${ids.length} diskusi terpilih beserta seluruh balasannya secara PERMANEN?`)) return;
        try {
            setActionLoading(true);
            await forumApi.bulkDeleteThreads(ids);
            setSelectedThreadIds(new Set());
            fetchData();
        } catch (err) {
            alert('Gagal menghapus diskusi massal');
        } finally {
            setActionLoading(false);
        }
    };

    // Single Reply Actions
    const handleApproveReply = async (id) => {
        try {
            setActionLoading(true);
            await forumApi.approveReply(id);
            fetchData();
            if (selectedThread) {
                const res = await forumApi.getThread(selectedThread.slug);
                setThreadReplies(res.data.replies || []);
            }
        } catch (err) {
            alert('Gagal menyetujui balasan');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectReply = async (id) => {
        if (!window.confirm("Tolak balasan ini?")) return;
        try {
            setActionLoading(true);
            await forumApi.rejectReply(id);
            fetchData();
            if (selectedThread) {
                const res = await forumApi.getThread(selectedThread.slug);
                setThreadReplies(res.data.replies || []);
            }
        } catch (err) {
            alert('Gagal menolak balasan');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteReply = async (id) => {
        if (!window.confirm("Hapus balasan ini secara permanen?")) return;
        try {
            setActionLoading(true);
            await forumApi.deleteReply(id);
            setSelectedReplyIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            fetchData();
            if (selectedThread) {
                const res = await forumApi.getThread(selectedThread.slug);
                setThreadReplies(res.data.replies || []);
            }
        } catch (err) {
            alert('Gagal menghapus balasan');
        } finally {
            setActionLoading(false);
        }
    };

    // Bulk Reply Actions
    const handleBulkApproveReplies = async () => {
        const ids = Array.from(selectedReplyIds);
        if (ids.length === 0) return;
        if (!window.confirm(`Setujui ${ids.length} balasan yang dipilih agar tayang ke publik?`)) return;
        try {
            setActionLoading(true);
            await forumApi.bulkApproveReplies(ids);
            setSelectedReplyIds(new Set());
            fetchData();
        } catch (err) {
            alert('Gagal menyetujui balasan massal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkRejectReplies = async () => {
        const ids = Array.from(selectedReplyIds);
        if (ids.length === 0) return;
        if (!window.confirm(`Tolak ${ids.length} balasan yang dipilih?`)) return;
        try {
            setActionLoading(true);
            await forumApi.bulkRejectReplies(ids);
            setSelectedReplyIds(new Set());
            fetchData();
        } catch (err) {
            alert('Gagal menolak balasan massal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDeleteReplies = async () => {
        const ids = Array.from(selectedReplyIds);
        if (ids.length === 0) return;
        if (!window.confirm(`PERINGATAN: Hapus ${ids.length} balasan terpilih secara PERMANEN?`)) return;
        try {
            setActionLoading(true);
            await forumApi.bulkDeleteReplies(ids);
            setSelectedReplyIds(new Set());
            fetchData();
        } catch (err) {
            alert('Gagal menghapus balasan massal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewRepliesModal = async (thread) => {
        setSelectedThread(thread);
        try {
            const res = await forumApi.getThread(thread.slug);
            setThreadReplies(res.data.replies || []);
            setShowRepliesModal(true);
        } catch (err) {
            console.error('Failed fetching thread detail:', err);
        }
    };

    const activeStats = activeMainTab === 'threads' ? threadStats : replyStats;
    const activeSelectedCount = activeMainTab === 'threads' ? selectedThreadIds.size : selectedReplyIds.size;
    const activeFilteredCount = activeMainTab === 'threads' ? filteredThreads.length : filteredReplies.length;

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Moderasi & Persetujuan Forum - Admin</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 pb-28">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                                Moderasi & Persetujuan Forum
                            </h1>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Admin Konten
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Tinjau dan setujui kiriman publik (diskusi & balasan) sebelum tayang resmi di platform
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            to="/forum"
                            target="_blank"
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition shadow-xs"
                        >
                            <span className="material-icons text-sm">open_in_new</span>
                            Buka Forum Publik
                        </Link>
                        <button
                            onClick={fetchData}
                            disabled={loading || actionLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-60"
                        >
                            <span className={`material-icons text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
                            Segarkan
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total {activeMainTab === 'threads' ? 'Diskusi' : 'Balasan'}</span>
                            <span className="material-icons text-gray-400 text-lg">forum</span>
                        </div>
                        <div className="text-xl font-black text-gray-800 mt-1">{activeStats.total}</div>
                    </div>

                    {activeMainTab === 'threads' ? (
                        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Butuh Persetujuan</span>
                                <span className="material-icons text-amber-600 text-lg">pending</span>
                            </div>
                            <div className="text-xl font-black text-amber-900 mt-1 flex items-center gap-2">
                                <span>{threadStats.pending}</span>
                                {threadStats.pending > 0 && (
                                    <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.2 rounded-full">
                                        Pending
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider">Terdeteksi Spam</span>
                                <span className="material-icons text-purple-600 text-lg">report</span>
                            </div>
                            <div className="text-xl font-black text-purple-900 mt-1 flex items-center gap-2">
                                <span>{replyStats.spam}</span>
                                {replyStats.spam > 0 && (
                                    <span className="bg-purple-200 text-purple-900 text-[10px] font-black px-2 py-0.2 rounded-full">
                                        Hidden
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                                {activeMainTab === 'threads' ? 'Disetujui (Tayang)' : 'Tayang Langsung'}
                            </span>
                            <span className="material-icons text-emerald-600 text-lg">check_circle</span>
                        </div>
                        <div className="text-xl font-black text-emerald-900 mt-1">{activeStats.approved}</div>
                    </div>

                    <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Ditolak</span>
                            <span className="material-icons text-rose-600 text-lg">cancel</span>
                        </div>
                        <div className="text-xl font-black text-rose-900 mt-1">{activeStats.rejected}</div>
                    </div>
                </div>

                {/* Main Filter & Navigation Tabs */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 mb-6 space-y-4">
                    {/* Content Type Tabs (Threads vs Replies) */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl gap-1 max-w-md">
                        <button
                            onClick={() => {
                                setActiveMainTab('threads');
                                setSelectedThreadIds(new Set());
                                setStatusFilter('all');
                            }}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeMainTab === 'threads'
                                    ? 'bg-white text-emerald-800 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span className="material-icons text-sm">article</span>
                            <span>Diskusi Utama ({threads.length})</span>
                            {threadStats.pending > 0 && (
                                <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                    {threadStats.pending}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setActiveMainTab('replies');
                                setSelectedReplyIds(new Set());
                                setStatusFilter('all');
                            }}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                activeMainTab === 'replies'
                                    ? 'bg-white text-emerald-800 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span className="material-icons text-sm">comment</span>
                            <span>Balasan Postingan ({repliesList.length})</span>
                            {replyStats.spam > 0 && (
                                <span className="bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full" title="Balasan terdeteksi spam otomatis disembunyikan">
                                    {replyStats.spam} Spam
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Status Filter Pills & Search Box */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {(activeMainTab === 'threads' ? [
                                { id: 'all', label: 'Semua Status', count: threadStats.total },
                                { id: 'pending', label: 'Menunggu Persetujuan', count: threadStats.pending, isAlert: threadStats.pending > 0 },
                                { id: 'approved', label: 'Disetujui', count: threadStats.approved },
                                { id: 'rejected', label: 'Ditolak', count: threadStats.rejected }
                            ] : [
                                { id: 'all', label: 'Semua Balasan', count: replyStats.total },
                                { id: 'spam', label: '🚫 Terdeteksi Spam (Hidden)', count: replyStats.spam, isAlert: replyStats.spam > 0 },
                                { id: 'approved', label: 'Tayang Langsung', count: replyStats.approved },
                                { id: 'rejected', label: 'Ditolak', count: replyStats.rejected }
                            ]).map(filter => {
                                const isActive = statusFilter === filter.id;
                                return (
                                    <button
                                        key={filter.id}
                                        onClick={() => setStatusFilter(filter.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                            isActive
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : filter.isAlert
                                                ? 'bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span>{filter.label}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                            isActive ? 'bg-emerald-800 text-white' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {filter.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="relative w-full md:w-72">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
                            <input
                                type="text"
                                placeholder={`Cari ${activeMainTab === 'threads' ? 'judul atau penulis...' : 'isi balasan...'}`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                            />
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Toolbar */}
                {activeFilteredCount > 0 && (
                    <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-200 mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={
                                        activeMainTab === 'threads'
                                            ? selectedThreadIds.size > 0 && selectedThreadIds.size === filteredThreads.length
                                            : selectedReplyIds.size > 0 && selectedReplyIds.size === filteredReplies.length
                                    }
                                    onChange={activeMainTab === 'threads' ? handleSelectAllThreads : handleSelectAllReplies}
                                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer border-gray-300 focus:ring-emerald-500"
                                />
                                <span>Pilih Semua ({activeFilteredCount} item)</span>
                            </label>

                            {activeSelectedCount > 0 && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                                    {activeSelectedCount} dipilih
                                </span>
                            )}
                        </div>

                        {/* Bulk Action Buttons */}
                        {activeSelectedCount > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => {
                                        if (activeMainTab === 'threads') setSelectedThreadIds(new Set());
                                        else setSelectedReplyIds(new Set());
                                    }}
                                    className="px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition cursor-pointer"
                                >
                                    Batal Pilih
                                </button>
                                <button
                                    onClick={activeMainTab === 'threads' ? handleBulkApproveThreads : handleBulkApproveReplies}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                    <span className="material-icons text-xs">check_circle</span>
                                    Setujui Massal ({activeSelectedCount})
                                </button>
                                <button
                                    onClick={activeMainTab === 'threads' ? handleBulkRejectThreads : handleBulkRejectReplies}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                    <span className="material-icons text-xs">cancel</span>
                                    Tolak Massal ({activeSelectedCount})
                                </button>
                                <button
                                    onClick={activeMainTab === 'threads' ? handleBulkDeleteThreads : handleBulkDeleteReplies}
                                    disabled={actionLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                    <span className="material-icons text-xs">delete</span>
                                    Hapus Massal ({activeSelectedCount})
                                </button>
                            </div>
                        ) : (
                            <span className="text-[11px] text-gray-400">
                                💡 Centang kotak untuk melakukan setujui, tolak, atau hapus massal
                            </span>
                        )}
                    </div>
                )}

                {/* Content List Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-3"></div>
                        <p className="text-xs text-gray-500 font-bold">Memuat data forum...</p>
                    </div>
                ) : activeMainTab === 'threads' ? (
                    /* TAB THREADS */
                    filteredThreads.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center shadow-xs">
                            <span className="material-icons text-gray-300 text-5xl mb-2">forum</span>
                            <h3 className="text-sm font-bold text-gray-700">Tidak ada diskusi ditemukan</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada diskusi pada filter ini.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredThreads.map(thread => {
                                const isSelected = selectedThreadIds.has(thread.id);
                                const isPending = !thread.is_approved || thread.status === 'pending';
                                const isApproved = thread.is_approved || thread.status === 'approved';
                                const isRejected = thread.status === 'rejected';

                                return (
                                    <div
                                        key={thread.id}
                                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                            isSelected
                                                ? 'bg-emerald-50/50 border-emerald-400 shadow-md ring-2 ring-emerald-300/30'
                                                : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-xs'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Select box Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelectThread(thread.id)}
                                                className="w-4 h-4 mt-1 text-emerald-600 rounded cursor-pointer border-gray-300 focus:ring-emerald-500 shrink-0"
                                            />

                                            <div className="flex-1 min-w-0">
                                                {/* Header Bar */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {isPending && (
                                                            <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <span className="material-icons text-[11px]">schedule</span>
                                                                Menunggu Persetujuan
                                                            </span>
                                                        )}
                                                        {isApproved && (
                                                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <span className="material-icons text-[11px]">check_circle</span>
                                                                Disetujui (Tayang)
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <span className="material-icons text-[11px]">cancel</span>
                                                                Ditolak
                                                            </span>
                                                        )}

                                                        <span className="text-xs font-bold text-gray-500">
                                                            Oleh: <strong className="text-gray-800">@{thread.author_username}</strong>
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">•</span>
                                                        <span className="text-[11px] text-gray-400">
                                                            {new Date(thread.created_at).toLocaleString('id-ID')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1 text-[11px]">
                                                            <span className="material-icons text-xs text-gray-400">visibility</span>
                                                            {thread.views} view
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[11px]">
                                                            <span className="material-icons text-xs text-gray-400">comment</span>
                                                            {thread.replies_count || 0} balasan
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[11px]">
                                                            <span className="material-icons text-xs text-gray-400">favorite</span>
                                                            {thread.likes_count || 0} suka
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Title and Content */}
                                                <h3 className="text-sm sm:text-base font-black text-gray-900 mb-1 leading-snug">
                                                    {thread.title}
                                                </h3>
                                                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                                                    {thread.content}
                                                </p>

                                                {/* Thread Image preview if any */}
                                                {thread.image && (
                                                    <div className="mt-2">
                                                        <a href={thread.image} target="_blank" rel="noopener noreferrer" className="inline-block">
                                                            <img
                                                                src={thread.image}
                                                                alt={thread.title}
                                                                className="h-16 w-24 object-cover rounded-xl border border-gray-200 shadow-2xs hover:opacity-90 transition"
                                                            />
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 flex-wrap gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Link
                                                            to={`/forum/${thread.slug}`}
                                                            target="_blank"
                                                            className="text-xs font-bold text-gray-600 hover:text-emerald-700 flex items-center gap-1 mr-2 transition"
                                                        >
                                                            <span className="material-icons text-xs">launch</span>
                                                            Lihat di Forum
                                                        </Link>
                                                        <button
                                                            onClick={() => handleViewRepliesModal(thread)}
                                                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <span className="material-icons text-xs">forum</span>
                                                            Moderasi Balasan ({thread.replies_count || 0})
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {!isApproved && (
                                                            <button
                                                                onClick={() => handleApproveThread(thread.slug)}
                                                                disabled={actionLoading}
                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                                                                title="Setujui agar tayang ke publik"
                                                            >
                                                                <span className="material-icons text-xs">check</span>
                                                                Setujui
                                                            </button>
                                                        )}

                                                        {!isRejected && (
                                                            <button
                                                                onClick={() => handleRejectThread(thread.slug)}
                                                                disabled={actionLoading}
                                                                className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                                title="Tolak postingan"
                                                            >
                                                                <span className="material-icons text-xs">close</span>
                                                                Tolak
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handleDeleteThread(thread.slug)}
                                                            disabled={actionLoading}
                                                            className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                            title="Hapus permanen"
                                                        >
                                                            <span className="material-icons text-xs">delete</span>
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    /* TAB REPLIES */
                    filteredReplies.length === 0 ? (
                        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center shadow-xs">
                            <span className="material-icons text-gray-300 text-5xl mb-2">comment</span>
                            <h3 className="text-sm font-bold text-gray-700">Tidak ada balasan ditemukan</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada balasan pada filter ini.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredReplies.map(reply => {
                                const isSelected = selectedReplyIds.has(reply.id);
                                const isSpam = reply.is_spam || reply.status === 'spam';
                                const isApproved = (reply.is_approved || reply.status === 'approved') && !isSpam;
                                const isRejected = reply.status === 'rejected';
                                const isPending = !reply.is_approved && !isSpam && !isRejected;

                                return (
                                    <div
                                        key={reply.id}
                                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                            isSelected
                                                ? 'bg-emerald-50/50 border-emerald-400 shadow-md ring-2 ring-emerald-300/30'
                                                : isSpam
                                                ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300 shadow-xs'
                                                : 'bg-white border-gray-200/80 hover:border-gray-300 shadow-xs'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelectReply(reply.id)}
                                                className="w-4 h-4 mt-1 text-emerald-600 rounded cursor-pointer border-gray-300 focus:ring-emerald-500 shrink-0"
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {isSpam && (
                                                            <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <span className="material-icons text-[11px]">report</span>
                                                                Terdeteksi Spam (Otomatis Disembunyikan)
                                                            </span>
                                                        )}
                                                        {isPending && (
                                                            <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <span className="material-icons text-[11px]">schedule</span>
                                                                Menunggu Persetujuan
                                                            </span>
                                                        )}
                                                        {isApproved && (
                                                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <span className="material-icons text-[11px]">check_circle</span>
                                                                Tayang Langsung
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="text-[10px] font-black bg-gray-100 text-gray-800 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <span className="material-icons text-[11px]">cancel</span>
                                                                Ditolak
                                                            </span>
                                                        )}

                                                        <span className="text-xs font-bold text-gray-500">
                                                            Balasan dari: <strong className="text-gray-800">@{reply.author_username}</strong>
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">•</span>
                                                        <span className="text-[11px] text-gray-400">
                                                            {new Date(reply.created_at).toLocaleString('id-ID')}
                                                        </span>
                                                    </div>

                                                    {reply.thread_title && (
                                                        <span className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-full line-clamp-1 max-w-xs">
                                                            📌 Pada: <strong>{reply.thread_title}</strong>
                                                        </span>
                                                    )}
                                                </div>

                                                {isSpam && reply.spam_reason && (
                                                    <div className="mb-2 px-3 py-1.5 bg-rose-100/70 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-1.5">
                                                        <span className="material-icons text-sm text-rose-600">warning</span>
                                                        <span><strong>Alasan Sistem:</strong> {reply.spam_reason}</span>
                                                    </div>
                                                )}

                                                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/70 p-3 rounded-xl border border-gray-100 mt-1">
                                                    {reply.content}
                                                </p>

                                                <div className="flex items-center justify-end mt-3 pt-2.5 border-t border-gray-100 gap-1.5">
                                                    {isSpam && (
                                                        <button
                                                            onClick={() => handleApproveReply(reply.id)}
                                                            disabled={actionLoading}
                                                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                            title="Bukan spam, izinkan tayang"
                                                        >
                                                            <span className="material-icons text-xs">verified</span>
                                                            Bukan Spam (Tayangkan)
                                                        </button>
                                                    )}
                                                    {!isApproved && !isSpam && (
                                                        <button
                                                            onClick={() => handleApproveReply(reply.id)}
                                                            disabled={actionLoading}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                                                        >
                                                            <span className="material-icons text-xs">check</span>
                                                            Setujui
                                                        </button>
                                                    )}
                                                    {!isRejected && !isSpam && (
                                                        <button
                                                            onClick={() => handleRejectReply(reply.id)}
                                                            disabled={actionLoading}
                                                            className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <span className="material-icons text-xs">close</span>
                                                            Tolak
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteReply(reply.id)}
                                                        disabled={actionLoading}
                                                        className="px-2.5 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                        title="Hapus balasan permanen"
                                                    >
                                                        <span className="material-icons text-xs">delete</span>
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {/* Modal Detail Balasan Suatu Thread */}
            {showRepliesModal && selectedThread && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl animate-fade-in max-h-[90vh] flex flex-col my-auto border border-gray-100">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-black text-gray-900">Daftar Balasan Diskusi</h3>
                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">📌 {selectedThread.title}</p>
                            </div>
                            <button
                                onClick={() => setShowRepliesModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                            {threadReplies.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <span className="material-icons text-4xl mb-1">comments_disabled</span>
                                    <p className="text-xs font-bold">Belum ada balasan pada diskusi ini.</p>
                                </div>
                            ) : (
                                threadReplies.map(reply => {
                                    const isSpam = reply.is_spam || reply.status === 'spam';
                                    const isApproved = (reply.is_approved || reply.status === 'approved') && !isSpam;
                                    const isRejected = reply.status === 'rejected';

                                    return (
                                        <div key={reply.id} className={`p-3.5 rounded-2xl border space-y-2 ${
                                            isSpam ? 'bg-rose-50/40 border-rose-200' : 'bg-gray-50 border-gray-100'
                                        }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-gray-800">@{reply.author_username}</span>
                                                    {isSpam && (
                                                        <span className="text-[9px] font-black bg-rose-100 text-rose-800 px-2 py-0.2 rounded-full flex items-center gap-0.5">
                                                            <span className="material-icons text-[10px]">report</span>
                                                            Spam (Hidden)
                                                        </span>
                                                    )}
                                                    {isApproved && (
                                                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                                                            Tayang
                                                        </span>
                                                    )}
                                                    {isRejected && (
                                                        <span className="text-[9px] font-black bg-gray-100 text-gray-700 px-2 py-0.2 rounded-full">
                                                            Ditolak
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(reply.created_at).toLocaleString('id-ID')}
                                                </span>
                                            </div>

                                            {isSpam && reply.spam_reason && (
                                                <div className="text-[11px] text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-lg">
                                                    ⚠️ <strong>Alasan:</strong> {reply.spam_reason}
                                                </div>
                                            )}

                                            <p className="text-xs text-gray-600 leading-relaxed">{reply.content}</p>

                                            <div className="flex items-center justify-end gap-1.5 pt-1">
                                                {isSpam && (
                                                    <button
                                                        onClick={() => handleApproveReply(reply.id)}
                                                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-lg text-[11px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                                                        title="Bukan spam, tayangkan"
                                                    >
                                                        Tayangkan
                                                    </button>
                                                )}
                                                {!isApproved && !isSpam && (
                                                    <button
                                                        onClick={() => handleApproveReply(reply.id)}
                                                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition cursor-pointer"
                                                    >
                                                        Setujui
                                                    </button>
                                                )}
                                                {!isRejected && !isSpam && (
                                                    <button
                                                        onClick={() => handleRejectReply(reply.id)}
                                                        className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold hover:bg-amber-200 transition cursor-pointer"
                                                    >
                                                        Tolak
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteReply(reply.id)}
                                                    className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold hover:bg-rose-100 transition cursor-pointer"
                                                    title="Hapus permanen"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-[11px] text-gray-400">
                                Total {threadReplies.length} balasan
                            </span>
                            <button
                                onClick={() => setShowRepliesModal(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                Tutup
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
