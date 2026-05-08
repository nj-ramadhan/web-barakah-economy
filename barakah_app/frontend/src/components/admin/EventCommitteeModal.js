import React, { useState, useEffect } from 'react';
import { getAvailableCommittees, manageCommittee, sendScanLink } from '../../services/eventApi';

const EventCommitteeModal = ({ slug, onClose, committees, onRefresh }) => {
    const [search, setSearch] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (search.length >= 3) {
            const delayDebounceFn = setTimeout(() => {
                handleSearch();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setAvailableUsers([]);
        }
    }, [search]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const res = await getAvailableCommittees(slug, search);
            setAvailableUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleManage = async (user, operation) => {
        if (operation === 'add') {
            if (!user.username || !user.email || !user.phone) {
                alert('Gagal: Panitia harus memiliki data profil lengkap (Username, Email, dan No HP) untuk menerima link scan otomatis.');
                return;
            }
        }

        try {
            const res = await manageCommittee(slug, user.id, operation);
            onRefresh();
            if (operation === 'add') {
                setAvailableUsers(prev => prev.filter(u => u.id !== user.id));
                alert(res.data.message);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Gagal memproses panitia.';
            alert(errorMsg);
        }
    };

    const handleSendLink = async (userId = null) => {
        setIsSending(true);
        try {
            const res = await sendScanLink(slug, userId ? [userId] : null);
            alert(res.data.message);
        } catch (err) {
            alert('Gagal mengirim link scan.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white transform animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-br from-white to-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <span className="material-icons text-2xl">groups</span>
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 uppercase tracking-tight">Kelola Panitia Scan</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Atur siapa saja yang berhak scan QR</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Add New Committee */}
                    <div className="mb-8">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Tambah Panitia (Email / Phone / Username)</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/30 outline-none transition-all"
                                placeholder="Cari user..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">search</span>
                        </div>

                        {loading && <p className="text-center py-4 text-xs text-gray-400">Mencari...</p>}

                        {availableUsers.length > 0 && (
                            <div className="mt-4 bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50 overflow-hidden">
                                {availableUsers.map(user => (
                                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                                <span className="material-icons text-lg">person</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{user.full_name || user.username}</p>
                                                <p className="text-[10px] text-gray-400">{user.email} {user.phone && `• ${user.phone}`}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleManage(user, 'add')}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition"
                                        >
                                            Jadikan Panitia
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Current Committees */}
                    <div>
                        <div className="flex justify-between items-center mb-4 px-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Panitia Saat Ini ({committees.length})</label>
                            {committees.length > 0 && (
                                <button 
                                    onClick={() => handleSendLink()} 
                                    disabled={isSending}
                                    className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:underline disabled:opacity-50"
                                >
                                    <span className="material-icons text-xs">send</span> Kirim Link ke Semua
                                </button>
                            )}
                        </div>
                        
                        {committees.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                                <span className="material-icons text-gray-200 text-4xl mb-2">people_outline</span>
                                <p className="text-xs text-gray-400 italic">Belum ada panitia yang ditugaskan.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {committees.map(user => (
                                    <div key={user.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                                                <span className="material-icons text-lg">verified_user</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{user.full_name || user.username}</p>
                                                <p className="text-[10px] text-gray-400">{user.email} {user.phone && `• ${user.phone}`}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSendLink(user.id)}
                                                className="w-9 h-9 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition"
                                                title="Kirim Link Scan"
                                            >
                                                <span className="material-icons text-lg">send</span>
                                            </button>
                                            <button
                                                onClick={() => handleManage(user, 'remove')}
                                                className="w-9 h-9 flex items-center justify-center text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition"
                                                title="Hapus dari Panitia"
                                            >
                                                <span className="material-icons text-lg">person_remove</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-50 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="w-full bg-white border border-gray-200 text-gray-900 font-black py-4 rounded-2xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventCommitteeModal;
