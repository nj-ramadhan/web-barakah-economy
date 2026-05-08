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

                {/* Search & Filter Header */}
                <div className="px-8 py-6 bg-gray-50/80 border-b border-gray-100 backdrop-blur-sm">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-1 min-w-[200px] relative">
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                            <input
                                type="text"
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none shadow-sm"
                                placeholder="Cari nama, email, phone..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                            />
                            {isFetchingUsers && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                                </div>
                            )}
                        </div>
                        <select 
                            value={pagination.pageSize} 
                            onChange={(e) => pagination.onPageSizeChange(e.target.value)}
                            className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-black text-green-700 outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                        >
                            <option value="10">10 / hal</option>
                            <option value="25">25 / hal</option>
                            <option value="50">50 / hal</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 px-2 min-h-[40px]">
                        {pagination.total > 0 && (
                            <button 
                                onClick={handleSelectAllFound}
                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition shadow-sm border border-blue-50 bg-white"
                            >
                                <span className="material-icons text-sm">
                                    {allUsers.length > 0 && allUsers.every(u => selectedUserIds.includes(u.id)) ? 'check_box' : 'check_box_outline_blank'}
                                </span>
                                {allUsers.length > 0 && allUsers.every(u => selectedUserIds.includes(u.id)) ? 'BATAL PILIH SEMUA' : 'PILIH SEMUA HASIL'}
                            </button>
                        )}

                        {/* Pagination Controls */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-3">
                                <button 
                                    disabled={!pagination.hasPrev || isFetchingUsers}
                                    onClick={() => pagination.onPageChange(pagination.current - 1)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl border transition shadow-sm ${!pagination.hasPrev ? 'bg-gray-50 text-gray-300' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
                                >
                                    <span className="material-icons">chevron_left</span>
                                </button>
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest bg-white px-5 py-2.5 rounded-xl border border-gray-100 shadow-sm">
                                    Hal {pagination.current}/{pagination.totalPages}
                                </span>
                                <button 
                                    disabled={!pagination.hasNext || isFetchingUsers}
                                    onClick={() => pagination.onPageChange(pagination.current + 1)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl border transition shadow-sm ${!pagination.hasNext ? 'bg-gray-50 text-gray-300' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
                                >
                                    <span className="material-icons">chevron_right</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {allUsers.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 transform -rotate-12">
                                <span className="material-icons text-4xl text-gray-200">person_search</span>
                            </div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">User tidak ditemukan</p>
                            <p className="text-[10px] text-gray-300 mt-2 uppercase tracking-[0.2em]">Coba kata kunci lain</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {allUsers.map(user => (
                                <label 
                                    key={user.id} 
                                    className={`group flex items-center justify-between p-5 rounded-3xl border transition-all cursor-pointer hover:shadow-xl hover:shadow-green-900/5 ${
                                        selectedUserIds.includes(user.id) 
                                            ? 'bg-green-50/50 border-green-200 shadow-lg shadow-green-900/5 ring-1 ring-green-100' 
                                            : 'bg-white border-gray-100 hover:border-green-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedUserIds.includes(user.id)}
                                                onChange={() => handleToggleUserSelection(user.id)}
                                            />
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                selectedUserIds.includes(user.id) 
                                                    ? 'bg-green-600 border-green-600 scale-110 shadow-lg shadow-green-600/30' 
                                                    : 'bg-white border-gray-200 group-hover:border-green-400'
                                            }`}>
                                                {selectedUserIds.includes(user.id) && <span className="material-icons text-white text-[14px]">check</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={`text-sm font-black uppercase tracking-tight transition-colors ${
                                                    selectedUserIds.includes(user.id) ? 'text-green-900' : 'text-gray-900'
                                                }`}>
                                                    {user.full_name || user.username}
                                                </p>
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-md text-[8px] font-black tracking-widest uppercase">#{user.id}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold tracking-tight flex items-center gap-2">
                                                <span className="flex items-center gap-1"><span className="material-icons text-[10px]">alternate_email</span>{user.email}</span>
                                                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                <span className="flex items-center gap-1"><span className="material-icons text-[10px]">phone</span>{user.phone || '-'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`material-icons text-lg transition-all transform ${
                                        selectedUserIds.includes(user.id) ? 'text-green-600 scale-110' : 'text-gray-100 group-hover:text-green-200'
                                    }`}>
                                        {selectedUserIds.includes(user.id) ? 'verified' : 'account_circle'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Selection Summary */}
                <div className="p-8 border-t border-gray-50 bg-white flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                    <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Total Terpilih</p>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-green-700 tracking-tighter">{selectedUserIds.length}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">User</span>
                        </div>
                    </div>
                    <button
                        onClick={handleConfirmSelection}
                        className="bg-gray-900 text-white px-12 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-xl shadow-gray-900/20 active:scale-95 flex items-center gap-3"
                    >
                        Konfirmasi ({selectedUserIds.length})
                        <span className="material-icons text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserSelectionOverlay;
