import React from 'react';

const UserSelectionOverlay = ({ 
    isOpen, 
    onClose, 
    userSearch, 
    setUserSearch, 
    isFetchingUsers, 
    allUsers, 
    selectedUserIds, 
    handleToggleUserSelection, 
    handleSelectAllFound, 
    handleConfirmSelection,
    pagination = { current: 1, total: 1, hasNext: false, hasPrev: false, onPageChange: () => {} }
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-white">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none">Pilih User</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 italic">* Menyembunyikan user yang sudah terdaftar</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition">
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100 space-y-3">
                    <div className="relative">
                        <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm"
                            placeholder="Cari Username / Nama / Email / No Telp..."
                            value={userSearch}
                            onChange={(e) => {
                                setUserSearch(e.target.value);
                                pagination.onPageChange(1); // Reset to page 1 on search
                            }}
                        />
                        {isFetchingUsers && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                        )}
                    </div>
                    
                    {allUsers.length > 0 && (
                        <div className="flex items-center justify-between px-2">
                            <button 
                                onClick={handleSelectAllFound}
                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-3 py-2 rounded-xl transition"
                            >
                                <span className="material-icons text-sm">
                                    {allUsers.every(u => selectedUserIds.includes(u.id)) ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                                {allUsers.every(u => selectedUserIds.includes(u.id)) ? 'Batal Pilih Semua' : 'Pilih Semua Hasil'}
                            </button>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-3">
                                <button 
                                    disabled={!pagination.hasPrev || isFetchingUsers}
                                    onClick={() => pagination.onPageChange(pagination.current - 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition shadow-sm"
                                >
                                    <span className="material-icons text-sm">chevron_left</span>
                                </button>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Halaman {pagination.current}</span>
                                <button 
                                    disabled={!pagination.hasNext || isFetchingUsers}
                                    onClick={() => pagination.onPageChange(pagination.current + 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition shadow-sm"
                                >
                                    <span className="material-icons text-sm">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 custom-scrollbar bg-gray-50/30">
                    {allUsers.length === 0 && !isFetchingUsers ? (
                        <div className="text-center py-20 opacity-40">
                            <span className="material-icons text-5xl">person_search</span>
                            <p className="text-xs font-black uppercase tracking-widest mt-3">User tidak ditemukan</p>
                        </div>
                    ) : (
                        allUsers.map(user => (
                            <label
                                key={user.id}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
                                    selectedUserIds.includes(user.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 hover:border-blue-100'
                                }`}
                            >
                                <div className="flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user.id)}
                                        onChange={() => handleToggleUserSelection(user.id)}
                                        className="hidden"
                                    />
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                        selectedUserIds.includes(user.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                    }`}>
                                        {selectedUserIds.includes(user.id) && <span className="material-icons text-[14px] text-white">check</span>}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                                    <div className="font-bold text-gray-900 text-sm truncate">{user.full_name || user.username}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate text-right">
                                        {user.email || 'No Email'} • {user.phone || 'No Phone'}
                                    </div>
                                </div>
                            </label>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-gray-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Terpilih</p>
                        <p className="text-xl font-black text-blue-600 leading-none">{selectedUserIds.length} <span className="text-[10px] text-gray-400">User</span></p>
                    </div>
                    <button
                        onClick={handleConfirmSelection}
                        disabled={selectedUserIds.length === 0}
                        className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        KONFIRMASI ({selectedUserIds.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserSelectionOverlay;
