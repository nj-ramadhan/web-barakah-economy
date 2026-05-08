import React, { useState, useEffect, useCallback, useRef } from 'react';
import { manualRegisterParticipant, getAvailableUsers, bulkManualRegister } from '../../services/eventApi';
import UserSelectionOverlay from './UserSelectionOverlay';

const EventManualRegistrationModal = ({ isOpen, onClose, event, registrations = [], onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        user_id: null,
        responses: {}
    });

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSystemAdmin = currentUser?.role === 'admin';

    // User Search/List State
    const [isUserListOpen, setIsUserListOpen] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    
    // Pagination State
    const [page, setPage] = useState(1);
    const [paginationInfo, setPaginationInfo] = useState({ next: null, previous: null, count: 0 });
    
    const searchTimeoutRef = useRef(null);

    // Filtered fields to avoid duplicates for manual entry
    const getFilteredFields = () => {
        if (!event?.form_fields) return [];
        return event.form_fields.filter(field => {
            const label = (field.label || '').toLowerCase();
            const isRedundant = 
                label === 'nama' || 
                label === 'nama lengkap' || 
                label === 'email' || 
                label.includes('whatsapp') || 
                label.includes('nomor wa') ||
                label === 'no hp' ||
                label === 'phone' ||
                label === 'nomor telepon';
            return !isRedundant;
        });
    };

    // Get IDs of users who are already registered
    const registeredUserIds = registrations.map(r => r.user).filter(id => id !== null);

    const fetchUsers = async (query = '', pageNum = 1) => {
        setIsFetchingUsers(true);
        try {
            // Updated to handle pagination parameters
            const res = await getAvailableUsers(event.slug, query, pageNum);
            
            // Backend now returns paginated response: { count, next, previous, results }
            if (res.data.results) {
                setAllUsers(res.data.results);
                setPaginationInfo({
                    next: res.data.next,
                    previous: res.data.previous,
                    count: res.data.count
                });
            } else {
                // Fallback for non-paginated or old API
                setAllUsers(res.data || []);
                setPaginationInfo({ next: null, previous: null, count: (res.data || []).length });
            }
        } catch (err) {
            console.error("Fetch users failed", err);
        } finally {
            setIsFetchingUsers(false);
        }
    };

    useEffect(() => {
        if (isUserListOpen) {
            fetchUsers(userSearch, page);
        }
    }, [isUserListOpen, page]);

    useEffect(() => {
        if (isUserListOpen) {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                setPage(1); // Reset to page 1 on search
                fetchUsers(userSearch, 1);
            }, 500);
        }
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [userSearch]);

    if (!isOpen || !event) return null;

    const handleToggleUserSelection = (userId) => {
        setSelectedUserIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAllFound = () => {
        const foundIds = allUsers.map(u => u.id);
        const allAlreadySelected = foundIds.every(id => selectedUserIds.includes(id));
        
        if (allAlreadySelected) {
            // Remove all found users from selection
            setSelectedUserIds(prev => prev.filter(id => !foundIds.includes(id)));
        } else {
            // Add all found users to selection (deduplicated)
            setSelectedUserIds(prev => [...new Set([...prev, ...foundIds])]);
        }
    };

    const handleConfirmSelection = async () => {
        if (selectedUserIds.length === 0) {
            setIsUserListOpen(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (selectedUserIds.length > 1) {
                await bulkManualRegister(event.slug, { user_ids: selectedUserIds });
            } else {
                const user = allUsers.find(u => u.id === selectedUserIds[0]);
                const directData = {
                    user_id: user.id,
                    name: user.profile?.name_full || user.username,
                    email: user.email || '',
                    phone: user.phone || '',
                    responses: {}
                };
                await manualRegisterParticipant(event.slug, directData);
            }
            
            onSuccess();
            onClose();
            setFormData({ name: '', email: '', phone: '', user_id: null, responses: {} });
            setSelectedUserIds([]);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Gagal mendaftarkan peserta.');
        } finally {
            setLoading(false);
            setIsUserListOpen(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (selectedUserIds.length > 1) {
                // Bulk Register
                await bulkManualRegister(event.slug, { user_ids: selectedUserIds });
            } else {
                // Single Register (Manual or Selected User)
                await manualRegisterParticipant(event.slug, formData);
            }
            
            onSuccess();
            onClose();
            // Reset
            setFormData({ name: '', email: '', phone: '', user_id: null, responses: {} });
            setSelectedUserIds([]);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Gagal mendaftarkan peserta.');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResponseChange = (fieldId, value) => {
        setFormData(prev => ({
            ...prev,
            responses: { ...prev.responses, [fieldId]: value }
        }));
    };

    const filteredFields = getFilteredFields();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl relative my-auto animate-in zoom-in-95 duration-300 border border-white overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gradient-to-br from-white to-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <span className="material-icons text-2xl">person_add</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">Tambah Peserta</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">{event.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-white text-gray-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition shadow-sm border border-gray-100">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-5 rounded-3xl text-xs font-bold border border-red-100 flex items-center gap-4">
                            <span className="material-icons text-xl">error</span>
                            <div className="flex-1">{error}</div>
                        </div>
                    )}

                    {isSystemAdmin && (
                        <div className="mb-8 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setIsUserListOpen(true)}
                                className="group flex items-center gap-3 px-6 py-4 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-all border border-blue-100 shadow-sm"
                            >
                                <span className="material-icons text-xl group-hover:rotate-12 transition-transform">group_add</span>
                                <span className="text-sm font-black uppercase tracking-wider">Pilih dari User Terdaftar</span>
                            </button>
                        </div>
                    )}

                    {selectedUserIds.length > 0 && (
                        <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl animate-in zoom-in-95">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">User Terpilih ({selectedUserIds.length})</h4>
                                <button onClick={() => setSelectedUserIds([])} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Hapus Semua</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedUserIds.map(id => {
                                    const user = allUsers.find(u => u.id === id);
                                    return (
                                        <div key={id} className="px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-[10px] font-bold text-emerald-800 flex items-center gap-2">
                                            <span>{user?.profile?.name_full || user?.username || 'User'}</span>
                                            <button onClick={() => handleToggleUserSelection(id)} className="material-icons text-[12px] hover:text-red-500">close</button>
                                        </div>
                                    );
                                })}
                            </div>
                            {selectedUserIds.length > 1 && (
                                <p className="mt-4 text-[9px] text-emerald-500 font-bold italic uppercase leading-relaxed">
                                    * Anda memilih lebih dari satu user. Pengisian form di bawah akan diabaikan dan sistem akan mendaftarkan seluruh user yang dipilih secara otomatis.
                                </p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={`space-y-8 ${selectedUserIds.length > 1 ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <span className="w-6 h-px bg-gray-100"></span> Informasi Identitas <span className="flex-1 h-px bg-gray-100"></span>
                                </h3>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap *</label>
                                    <input required type="text" name="name" value={formData.name} onChange={handleFormChange}
                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" placeholder="Masukkan nama lengkap" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (Opsional)</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleFormChange}
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" placeholder="peserta@email.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">No. WhatsApp *</label>
                                        <input required type="tel" name="phone" value={formData.phone} onChange={handleFormChange}
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" placeholder="0812XXXXXXXX" />
                                    </div>
                                </div>
                            </div>

                            {filteredFields.length > 0 && (
                                <div className="space-y-6 pt-4">
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span className="w-6 h-px bg-gray-100"></span> Data Tambahan Event <span className="flex-1 h-px bg-gray-100"></span>
                                    </h3>
                                    <div className="space-y-5">
                                        {filteredFields.map(field => (
                                            <div key={field.id} className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{field.label} {field.required ? '*' : '(Opsional)'}</label>
                                                {field.field_type === 'select' ? (
                                                    <div className="relative">
                                                        <select required={field.required} value={formData.responses[field.id] || ''} onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 appearance-none outline-none">
                                                            <option value="">Pilih Opsi</option>
                                                            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                        <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                                    </div>
                                                ) : (
                                                    <input required={field.required} type={field.field_type === 'number' ? 'number' : 'text'} value={formData.responses[field.id] || ''} onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 transition-all outline-none" placeholder={field.label} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-8 border-t border-gray-50 flex flex-col sm:flex-row gap-4">
                            <button type="button" onClick={onClose} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all">BATAL</button>
                            <button type="submit" disabled={loading} className="flex-[2] py-5 bg-gradient-to-br from-green-600 to-emerald-800 text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                {loading ? 'MENYIMPAN...' : selectedUserIds.length > 1 ? `DAFTARKAN ${selectedUserIds.length} PESERTA` : 'TAMBAH PESERTA'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* User Selection Overlay Component */}
            <UserSelectionOverlay
                isOpen={isUserListOpen}
                onClose={() => setIsUserListOpen(false)}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
                isFetchingUsers={isFetchingUsers}
                allUsers={allUsers}
                selectedUserIds={selectedUserIds}
                handleToggleUserSelection={handleToggleUserSelection}
                handleSelectAllFound={handleSelectAllFound}
                handleConfirmSelection={handleConfirmSelection}
                pagination={{
                    current: page,
                    hasNext: !!paginationInfo.next,
                    hasPrev: !!paginationInfo.previous,
                    count: paginationInfo.count,
                    onPageChange: setPage
                }}
            />
        </div>
    );
};

export default EventManualRegistrationModal;
