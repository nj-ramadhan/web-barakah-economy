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
    handleDirectRegister,
    isRegistering = false,
    pagination = { 
        current: 1, 
        total: 0, 
        totalPages: 1,
        pageSize: 10,
        hasNext: false, 
        hasPrev: false, 
        onPageChange: () => {},
        onPageSizeChange: () => {}
    }
}) => {
    if (!isOpen) return null;

    const startItem = pagination.total > 0 ? ((pagination.current - 1) * pagination.pageSize) + 1 : 0;
    const endItem = Math.min(pagination.current * pagination.pageSize, pagination.total);

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="max-w-3xl w-full bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-none">Pilih & Daftar User</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 italic">
                            * Klik user untuk pilih / daftar langsung tanpa isi form lagi
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isRegistering}
                        className="w-8 h-8 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition"
                    >
                        <span className="material-icons text-sm">close</span>
                    </button>
                </div>

                {/* Search & Filter Controls Header */}
                <div className="px-8 py-5 bg-gray-50/80 border-b border-gray-100 backdrop-blur-sm space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Search Input Box */}
                        <div className="flex-1 min-w-[240px] relative">
                            <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                            <input
                                type="text"
                                className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none shadow-sm font-medium"
                                placeholder="Cari nama lengkap, email, no. hp..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                autoFocus
                            />
                            {userSearch ? (
                                <button 
                                    onClick={() => setUserSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                >
                                    <span className="material-icons text-base">cancel</span>
                                </button>
                            ) : isFetchingUsers ? (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                                </div>
                            ) : null}
                        </div>

                        {/* Page Size Dropdown */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tampil</span>
                            <select 
                                value={pagination.pageSize || 10} 
                                onChange={(e) => pagination.onPageSizeChange(e.target.value)}
                                className="bg-white border border-gray-200 rounded-2xl px-3 py-3 text-xs font-black text-green-700 outline-none focus:ring-2 focus:ring-green-500 shadow-sm cursor-pointer"
                            >
                                <option value="10">10 / hal</option>
                                <option value="25">25 / hal</option>
                                <option value="50">50 / hal</option>
                                <option value="100">100 / hal</option>
                            </select>
                        </div>
                    </div>

                    {/* Toolbar Status & Pagination Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-3">
                            {pagination.total > 0 && (
                                <button 
                                    onClick={handleSelectAllFound}
                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-3.5 py-2 rounded-xl transition shadow-sm border border-blue-100 bg-white"
                                >
                                    <span className="material-icons text-sm">
                                        {allUsers.length > 0 && allUsers.every(u => selectedUserIds.includes(u.id)) ? 'check_box' : 'check_box_outline_blank'}
                                    </span>
                                    {allUsers.length > 0 && allUsers.every(u => selectedUserIds.includes(u.id)) ? 'BATAL PILIH SEMUA HALAMAN INI' : 'PILIH SEMUA DI HALAMAN INI'}
                                </button>
                            )}
                            {pagination.total > 0 && (
                                <span className="text-[10px] text-gray-400 font-bold tracking-wider">
                                    {startItem}-{endItem} dari {pagination.total} user
                                </span>
                            )}
                        </div>

                        {/* Pagination Navigation */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button 
                                    disabled={!pagination.hasPrev || isFetchingUsers}
                                    onClick={() => pagination.onPageChange(pagination.current - 1)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl border transition shadow-sm ${!pagination.hasPrev ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
                                >
                                    <span className="material-icons text-sm">chevron_left</span>
                                </button>
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                    Hal {pagination.current} / {pagination.totalPages}
                                </span>
                                <button 
                                    disabled={!pagination.hasNext || isFetchingUsers}
                                    onClick={() => pagination.onPageChange(pagination.current + 1)}
                                    className={`w-9 h-9 flex items-center justify-center rounded-xl border transition shadow-sm ${!pagination.hasNext ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}
                                >
                                    <span className="material-icons text-sm">chevron_right</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* User List Section */}
                <div className="flex-1 relative overflow-hidden flex flex-col min-h-[300px]">
                    {isFetchingUsers && allUsers.length > 0 && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                            <div className="bg-white/90 p-4 rounded-3xl shadow-xl flex items-center gap-3 border border-white">
                                <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Mencari...</span>
                            </div>
                        </div>
                    )}

                    <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar transition-all duration-300 ${isFetchingUsers && allUsers.length === 0 ? 'opacity-60' : 'opacity-100'}`}>
                        {isFetchingUsers && allUsers.length === 0 ? (
                            <div className="space-y-3">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse border border-gray-100"></div>
                                ))}
                            </div>
                        ) : allUsers.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 my-4">
                                <span className="material-icons text-gray-300 text-5xl mb-2">person_search</span>
                                <p className="text-xs font-bold text-gray-500">Tidak ada user ditemukan...</p>
                                <p className="text-[10px] text-gray-400 mt-1">Coba ketik nama lain, email, atau nomor HP di kolom pencarian.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5">
                                {allUsers.map((user) => {
                                    const isSelected = selectedUserIds.includes(user.id);
                                    const displayName = user.full_name || user.profile?.name_full || user.name || user.username;
                                    
                                    return (
                                        <div 
                                            key={user.id} 
                                            onClick={() => handleToggleUserSelection(user.id)}
                                            className={`p-3.5 rounded-2xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                                                isSelected 
                                                ? 'bg-green-50/80 border-green-500 shadow-md shadow-green-900/5' 
                                                : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50/60 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="relative flex-shrink-0">
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                        isSelected 
                                                            ? 'bg-green-600 border-green-600 scale-105 shadow-md shadow-green-600/30' 
                                                            : 'bg-white border-gray-300 group-hover:border-green-400'
                                                    }`}>
                                                        {isSelected && <span className="material-icons text-white text-[14px]">check</span>}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className={`text-xs font-black uppercase tracking-tight truncate transition-colors ${
                                                            isSelected ? 'text-green-900' : 'text-gray-900'
                                                        }`}>
                                                            {displayName}
                                                        </p>
                                                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded-md text-[8px] font-black tracking-widest uppercase flex-shrink-0">#{user.id}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold tracking-tight flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                        <span className="flex items-center gap-1 truncate"><span className="material-icons text-[10px]">alternate_email</span>{user.email || '-'}</span>
                                                        <span className="w-1 h-1 bg-gray-200 rounded-full hidden sm:inline-block"></span>
                                                        <span className="flex items-center gap-1"><span className="material-icons text-[10px]">phone</span>{user.phone || user.profile?.phone || '-'}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDirectRegister(user.id);
                                                    }}
                                                    disabled={isRegistering}
                                                    className="px-3.5 py-2 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-green-700 active:scale-95 transition shadow-sm flex items-center gap-1"
                                                >
                                                    <span className="material-icons text-[12px]">how_to_reg</span>
                                                    Daftar Langsung
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Selection Summary & Action Button */}
                <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                    <div>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mb-0.5">Total Terpilih</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-green-700 tracking-tighter">{selectedUserIds.length}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">User</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleConfirmSelection}
                        disabled={selectedUserIds.length === 0 || isRegistering}
                        className={`px-8 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.15em] transition-all shadow-lg flex items-center gap-2 ${
                            selectedUserIds.length === 0 || isRegistering
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-green-900/20 active:scale-95'
                        }`}
                    >
                        {isRegistering ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                Memproses...
                            </>
                        ) : (
                            <>
                                Daftarkan {selectedUserIds.length > 0 ? `${selectedUserIds.length} User Terpilih` : 'User'}
                                <span className="material-icons text-sm">arrow_forward</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserSelectionOverlay;
