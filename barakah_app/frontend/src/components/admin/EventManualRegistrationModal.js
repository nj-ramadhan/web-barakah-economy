import React, { useState, useEffect, useCallback, useRef } from 'react';
import { manualRegisterParticipant, searchUsers } from '../../services/eventApi';

const EventManualRegistrationModal = ({ isOpen, onClose, event, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        user_id: null,
        responses: {}
    });

    // User Search State
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const searchTimeoutRef = useRef(null);

    // Filtered fields to avoid duplicates
    const getFilteredFields = () => {
        if (!event?.form_fields) return [];
        return event.form_fields.filter(field => {
            const label = (field.label || '').toLowerCase();
            // Hide fields that are likely covered by standard fields
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

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!userSearch || userSearch.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await searchUsers(userSearch);
                setSearchResults(res.data.results || res.data || []);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [userSearch]);

    if (!isOpen || !event) return null;

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setFormData(prev => ({
            ...prev,
            user_id: user.id,
            name: user.profile?.name_full || user.username,
            email: user.email || '',
            phone: user.phone || ''
        }));
        setSearchResults([]);
        setUserSearch('');
    };

    const handleClearUser = () => {
        setSelectedUser(null);
        setFormData(prev => ({
            ...prev,
            user_id: null,
            name: '',
            email: '',
            phone: ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await manualRegisterParticipant(event.slug, formData);
            onSuccess();
            onClose();
            // Reset form
            setFormData({ name: '', email: '', phone: '', user_id: null, responses: {} });
            setSelectedUser(null);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Gagal mendaftarkan peserta secara manual.');
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
            responses: {
                ...prev.responses,
                [fieldId]: value
            }
        }));
    };

    const filteredFields = getFilteredFields();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] relative my-auto animate-in zoom-in-95 duration-300 border border-white overflow-hidden">
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
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white text-gray-400 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition shadow-sm border border-gray-100"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 p-5 rounded-3xl text-xs font-bold border border-red-100 flex items-center gap-4 animate-in slide-in-from-top-2">
                            <span className="material-icons text-xl">error</span>
                            <div className="flex-1">{error}</div>
                        </div>
                    )}

                    {/* USER SELECTION SECTION */}
                    <div className="mb-8 p-6 bg-blue-50/30 border border-blue-100/50 rounded-[2rem]">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 block ml-1">Pilih dari User Terdaftar (Opsional)</label>
                        
                        {!selectedUser ? (
                            <div className="relative">
                                <div className="relative">
                                    <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 text-lg">search</span>
                                    <input
                                        type="text"
                                        className="w-full pl-12 pr-5 py-4 bg-white border border-blue-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition outline-none shadow-sm"
                                        placeholder="Cari Username / Nama / Email..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                        {searchResults.map(user => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => handleSelectUser(user)}
                                                className="w-full p-4 flex items-center gap-3 hover:bg-blue-50 transition border-b border-gray-50 last:border-0 text-left"
                                            >
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs shrink-0 overflow-hidden">
                                                    {user.profile?.picture ? (
                                                        <img src={user.profile.picture} alt="p" className="w-full h-full object-cover" />
                                                    ) : (
                                                        user.username.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm truncate">{user.profile?.name_full || user.username}</div>
                                                    <div className="text-[10px] text-gray-400 font-medium truncate italic">@{user.username} • {user.email}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 bg-white border border-blue-200 rounded-2xl flex items-center gap-4 animate-in zoom-in-95">
                                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg overflow-hidden shrink-0 shadow-inner">
                                    {selectedUser.profile?.picture ? (
                                        <img src={selectedUser.profile.picture} alt="p" className="w-full h-full object-cover" />
                                    ) : (
                                        selectedUser.username.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-gray-900 text-sm">{selectedUser.profile?.name_full || selectedUser.username}</span>
                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase rounded">TERPILIH</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight truncate mt-0.5 italic">
                                        @{selectedUser.username} • {selectedUser.email || 'No Email'}
                                    </div>
                                    <div className="text-[10px] text-blue-500 font-bold mt-1">
                                        {selectedUser.phone || 'No Phone Number'}
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleClearUser}
                                    className="w-8 h-8 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg flex items-center justify-center transition"
                                >
                                    <span className="material-icons text-sm">close</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                            {/* Standard Fields Section */}
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <span className="w-6 h-px bg-gray-100"></span>
                                    Informasi Identitas
                                    <span className="flex-1 h-px bg-gray-100"></span>
                                </h3>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap *</label>
                                    <input
                                        required
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none shadow-inner"
                                        placeholder="Masukkan nama lengkap"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email (Opsional)</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none shadow-inner"
                                            placeholder="peserta@email.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">No. WhatsApp *</label>
                                        <input
                                            required
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none shadow-inner"
                                            placeholder="0812XXXXXXXX"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Event Fields */}
                            {filteredFields.length > 0 && (
                                <div className="space-y-6 pt-4">
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span className="w-6 h-px bg-gray-100"></span>
                                        Data Tambahan Event
                                        <span className="flex-1 h-px bg-gray-100"></span>
                                    </h3>
                                    
                                    <div className="space-y-5">
                                        {filteredFields.map(field => (
                                            <div key={field.id} className="space-y-2 animate-in slide-in-from-left-4">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                                    {field.label} {field.required ? '*' : '(Opsional)'}
                                                </label>
                                                {field.field_type === 'select' ? (
                                                    <div className="relative">
                                                        <select
                                                            required={field.required}
                                                            value={formData.responses[field.id] || ''}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none shadow-inner appearance-none"
                                                        >
                                                            <option value="">Pilih Opsi</option>
                                                            {(field.options || []).map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                                    </div>
                                                ) : (
                                                    <input
                                                        required={field.required}
                                                        type={field.field_type === 'number' ? 'number' : 'text'}
                                                        value={formData.responses[field.id] || ''}
                                                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                        className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none shadow-inner"
                                                        placeholder={field.label}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-8 border-t border-gray-50 flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 hover:text-gray-700 transition-all active:scale-95"
                            >
                                BATAL
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-5 bg-gradient-to-br from-green-600 to-emerald-800 text-white rounded-3xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-green-900/20 hover:shadow-green-900/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>MENYIMPAN...</span>
                                    </div>
                                ) : 'TAMBAH PESERTA'}
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-8 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-start gap-3">
                        <span className="material-icons text-amber-500 text-lg shrink-0">info</span>
                        <p className="text-[9px] text-amber-800 font-bold uppercase tracking-tight leading-relaxed italic">
                            Pendaftaran manual akan otomatis disetujui, tiket akan di-generate, dan notifikasi konfirmasi akan dikirimkan ke nomor WhatsApp peserta.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventManualRegistrationModal;
