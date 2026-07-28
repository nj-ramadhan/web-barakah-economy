import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import {
    adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
    adminGetProfiles, adminCreateProfile, adminUpdateProfile, adminDeleteProfile,
    searchUsers, adminGetAISettings, adminUpdateAISettings,
    adminGetFeedback, adminDeleteFeedback
} from '../../services/chatApi';

const AdminConsultantSettingsPage = () => {
    const [categories, setCategories] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [aiSettings, setAiSettings] = useState({
        api_key: '',
        base_url: 'https://api.openai.com/v1',
        model_name: 'gpt-4o-mini',
        system_prompt: '',
        is_enabled: false
    });
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('categories');

    // Category Form
    const [catForm, setCatForm] = useState({ name: '', icon: 'chat', is_active: true, is_ai_enabled: false, welcome_message: '', ai_system_prompt: '', knowledge_base: '' });
    const [editingCatId, setEditingCatId] = useState(null);
    const [showIconPicker, setShowIconPicker] = useState(false);

    const materialIcons = [
        'chat', 'health_and_safety', 'account_balance', 'mosque', 'work',
        'payments', 'psychology', 'school', 'volunteer_activism',
        'trending_up', 'security', 'public', 'description', 'stars',
        'person', 'support_agent', 'calculate', 'history_edu', 'gavel',
        'restaurant', 'shopping_bag', 'home', 'commute', 'groups',
        'handshake', 'policy', 'balance', 'temple_hindu', 'temple_buddhist',
        'church', 'synagogue', 'business_center', 'leaderboard', 'pie_chart'
    ];

    // Profile Form
    const [profForm, setProfForm] = useState({ user: '', category: '', bio: '', is_available: true });
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [editingProfId, setEditingProfId] = useState(null);


    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const catRes = await adminGetCategories();
            setCategories(catRes.data);

            const profRes = await adminGetProfiles();
            setProfiles(profRes.data);

            try {
                const aiRes = await adminGetAISettings();
                if (aiRes.data) {
                    // Handle list vs object
                    const data = Array.isArray(aiRes.data) ? aiRes.data[0] : aiRes.data;
                    if (data) setAiSettings(data);
                }
            } catch (err) {
                console.error('Failed to fetch AI settings:', err);
            }


            const feedbackRes = await adminGetFeedback();
            setFeedbacks(feedbackRes.data);
        } catch (err) {
            console.error('Failed to fetch consultant data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Category Handlers
    const handleCatSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCatId) {
                await adminUpdateCategory(editingCatId, catForm);
            } else {
                await adminCreateCategory(catForm);
            }
            fetchData();
            setCatForm({ name: '', icon: 'chat', is_active: true, is_ai_enabled: false, welcome_message: '', ai_system_prompt: '', knowledge_base: '' });
            setEditingCatId(null);
        } catch (err) { alert('Gagal menyimpan kategori.'); }
    };

    const handleCatDelete = async (id) => {
        if (window.confirm('Hapus kategori ini?')) {
            try { await adminDeleteCategory(id); fetchData(); } catch (err) { alert('Gagal menghapus.'); }
        }
    };

    // Profile Handlers
    const handleUserSearch = async (e) => {
        const q = e.target.value;
        setUserSearch(q);
        if (q.length > 2) {
            try {
                const res = await searchUsers(q);
                setSearchResults(res.data);
            } catch (err) { console.error(err); }
        } else {
            setSearchResults([]);
        }
    };

    const handleProfSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProfId) {
                await adminUpdateProfile(editingProfId, profForm);
            } else {
                await adminCreateProfile(profForm);
            }
            fetchData();
            setProfForm({ user: '', category: '', bio: '', is_available: true });
            setUserSearch('');
            setEditingProfId(null);
        } catch (err) { alert('Gagal menyimpan profil konsultan.'); }
    };

    const handleProfDelete = async (id) => {
        if (window.confirm('Hapus konsultan ini?')) {
            try { await adminDeleteProfile(id); fetchData(); } catch (err) { alert('Gagal menghapus.'); }
        }
    };

    // AI Settings Handlers
    const handleAISubmit = async (e) => {
        e.preventDefault();
        try {
            await adminUpdateAISettings(aiSettings);
            alert('Settings AI berhasil diperbarui!');
        } catch (err) {
            alert('Gagal memperbarui settings AI.');
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <Header />
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
                <h1 className="text-xl font-bold text-gray-800 mb-6 font-display">Pengaturan Konsultasi</h1>

                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <span className="material-icons text-xs">category</span>
                        Kategori
                    </button>
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${activeTab === 'profiles' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <span className="material-icons text-xs">person</span>
                        Pakar
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <span className="material-icons text-xs">bolt</span>
                        AI Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap ${activeTab === 'feedback' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <span className="material-icons text-xs">rate_review</span>
                        Feedback
                    </button>
                </div>

                {activeTab === 'categories' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <form onSubmit={handleCatSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
                            <h3 className="font-bold text-gray-800 mb-4">{editingCatId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nama Kategori</label>
                                    <input
                                        type="text" required
                                        value={catForm.name}
                                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Contoh: Kesehatan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pilih Icon</label>
                                    <div
                                        onClick={() => setShowIconPicker(true)}
                                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-indigo-600">{catForm.icon || 'chat'}</span>
                                            <span className="text-gray-600">{catForm.icon || 'Pilih icon...'}</span>
                                        </div>
                                        <span className="material-icons text-gray-400">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Template Pesan Selamat Datang (Welcome Message)</label>
                                <textarea
                                    rows="3"
                                    value={catForm.welcome_message}
                                    onChange={(e) => setCatForm({ ...catForm, welcome_message: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Contoh: Halo! Selamat datang di layanan konsultasi ekonomi syariah. Silakan sampaikan pertanyaan Anda..."
                                />
                                <p className="text-[10px] text-gray-400 italic mt-1">*Pesan ini akan otomatis terkirim saat user baru memulai chat di kategori ini.</p>
                            </div>
                            <div className="mt-4">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">AI Personality / System Prompt (Kategori)</label>
                                <textarea
                                    rows="3"
                                    value={catForm.ai_system_prompt || ''}
                                    onChange={(e) => setCatForm({ ...catForm, ai_system_prompt: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Contoh: Anda adalah pakar ekonomi syariah yang bijaksana. Gunakan bahasa yang sopan dan kutipan hadist jika relevan..."
                                />
                                <p className="text-[10px] text-gray-400 italic mt-1">*Jika dikosongkan, akan menggunakan karakter AI global.</p>
                            </div>
                            <div className="mt-4">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Materi / Module (Knowledge Base)</label>
                                <textarea
                                    rows="5"
                                    value={catForm.knowledge_base || ''}
                                    onChange={(e) => setCatForm({ ...catForm, knowledge_base: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 underline-none"
                                    placeholder="Tempel materi, modul, atau teks referensi di sini. AI akan menjawab berdasarkan teks ini agar tidak melenceng..."
                                />
                                <p className="text-[10px] text-gray-400 italic mt-1">*Materi ini akan digunakan AI sebagai basis pengetahuan (grounding).</p>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <div className="flex gap-4 items-center">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={catForm.is_active}
                                                onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
                                                className="sr-only"
                                            />
                                            <div className={`w-10 h-6 rounded-full transition-colors ${catForm.is_active ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${catForm.is_active ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 group-hover:text-indigo-600">Publikasikan</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={catForm.is_ai_enabled}
                                                onChange={(e) => setCatForm({ ...catForm, is_ai_enabled: e.target.checked })}
                                                className="sr-only"
                                            />
                                            <div className={`w-10 h-6 rounded-full transition-colors ${catForm.is_ai_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${catForm.is_ai_enabled ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 group-hover:text-indigo-600">Aktifkan AI</span>
                                    </label>
                                </div>
                                <div className="flex gap-2">
                                    {editingCatId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingCatId(null); setCatForm({ name: '', icon: 'chat', is_active: true, is_ai_enabled: false, welcome_message: '', ai_system_prompt: '', knowledge_base: '' }); }}
                                            className="px-6 py-2.5 rounded-2xl text-sm font-bold text-gray-400 hover:text-gray-600"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                                    >
                                        {editingCatId ? 'Simpan Perubahan' : 'Buat Kategori'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-indigo-200 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                            <span className="material-icons text-indigo-600 group-hover:text-white transition-colors">{cat.icon || 'chat'}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{cat.name}</h4>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <div className={`w-1.5 h-1.5 rounded-full ${cat.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <span className={`text-[10px] font-bold ${cat.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {cat.is_active ? 'PUBLISHED' : 'DRAFT'}
                                                </span>
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <span className={`text-[10px] font-bold ${cat.is_ai_enabled ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                    {cat.is_ai_enabled ? 'AI ACTIVE' : 'MANUAL'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setEditingCatId(cat.id); setCatForm({ name: cat.name, icon: cat.icon, is_active: cat.is_active, is_ai_enabled: cat.is_ai_enabled, welcome_message: cat.welcome_message || '', ai_system_prompt: cat.ai_system_prompt || '', knowledge_base: cat.knowledge_base || '' }); }}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                        >
                                            <span className="material-icons text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleCatDelete(cat.id)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'profiles' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <form onSubmit={handleProfSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
                            <h3 className="font-bold text-gray-800 mb-4">{editingProfId ? 'Edit Profil Pakar' : 'Tambah Pakar Baru'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cari User (Nama / Username)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={handleUserSearch}
                                            disabled={!!editingProfId}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ketik minimal 3 huruf..."
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 mt-2 rounded-2xl shadow-2xl z-20 overflow-hidden border-t-0">
                                                {searchResults.map(user => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => {
                                                            setProfForm({ ...profForm, user: user.id });
                                                            setUserSearch(`${user.username} (${user.email || 'No Email'})`);
                                                            setSearchResults([]);
                                                        }}
                                                        className="p-4 hover:bg-indigo-50 cursor-pointer text-xs border-b border-gray-50 last:border-0 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <span className="font-bold text-gray-800">{user.username}</span>
                                                            <div className="text-gray-400">{user.email}</div>
                                                        </div>
                                                        <span className="material-icons text-gray-200 text-sm">add</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kategori Keahlian</label>
                                        <select
                                            required
                                            value={profForm.category}
                                            onChange={(e) => setProfForm({ ...profForm, category: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                                        >
                                            <option value="">Pilih Kategori</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bio Ringkas</label>
                                        <input
                                            type="text"
                                            value={profForm.bio}
                                            onChange={(e) => setProfForm({ ...profForm, bio: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Gelar atau spesialisasi..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={profForm.is_available}
                                            onChange={(e) => setProfForm({ ...profForm, is_available: e.target.checked })}
                                            className="sr-only"
                                        />
                                        <div className={`w-10 h-6 rounded-full transition-colors ${profForm.is_available ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${profForm.is_available ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 group-hover:text-indigo-600">Terima Konsultasi Baru</span>
                                </label>
                                <div className="flex gap-2">
                                    {editingProfId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingProfId(null); setProfForm({ user: '', category: '', bio: '', is_available: true }); setUserSearch(''); }}
                                            className="px-6 py-2.5 rounded-2xl text-sm font-bold text-gray-400"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={!profForm.user || !profForm.category}
                                        className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 transition"
                                    >
                                        {editingProfId ? 'Simpan Edit' : 'Daftarkan Pakar'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profiles.map(prof => (
                                <div key={prof.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-indigo-200 transition">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-colors">
                                            <span className="material-icons text-gray-300 group-hover:text-white transition-colors">person</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-800 text-sm truncate">{prof.user_details?.username}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{prof.category_name}</span>
                                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                                <span className="text-[10px] text-gray-400 italic truncate">{prof.bio || 'Pakar'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingProfId(prof.id);
                                                setProfForm({ user: prof.user, category: prof.category, bio: prof.bio, is_available: prof.is_available });
                                                setUserSearch(prof.user_details?.username);
                                            }}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                        >
                                            <span className="material-icons text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleProfDelete(prof.id)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="animate-in slide-in-from-bottom-5 duration-500">
                        <form onSubmit={handleAISubmit} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border border-indigo-100">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                                    <span className="material-icons text-3xl">smart_toy</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">AI Integration</h2>
                                    <p className="text-xs text-gray-400 font-medium">Konfigurasi asisten virtual untuk kategori "Tanya AI"</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">API Key</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={aiSettings.api_key}
                                                onChange={(e) => setAiSettings({ ...aiSettings, api_key: e.target.value })}
                                                className="w-full bg-gray-50/80 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm transition-all focus:ring-0"
                                                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                                            />
                                            <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">vpn_key</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">API Base URL</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={aiSettings.base_url}
                                                onChange={(e) => setAiSettings({ ...aiSettings, base_url: e.target.value })}
                                                className="w-full bg-gray-50/80 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm transition-all focus:ring-0"
                                                placeholder="https://ai.sumopod.com/v1"
                                            />
                                            <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">language</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex justify-between items-center w-full">
                                            <span>AI Model Name</span>
                                            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md lowercase font-mono">aktive: {aiSettings.model_name}</span>
                                        </label>
                                        <select
                                            value={aiSettings.model_name}
                                            onChange={(e) => setAiSettings({ ...aiSettings, model_name: e.target.value })}
                                            className="w-full bg-gray-50/80 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm transition-all appearance-none cursor-pointer"
                                        >
                                            <optgroup label="Anthropic">
                                                <option value="claude-fable-5">Claude Fable 5</option>
                                                <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                                                <option value="claude-opus-4-7">Claude Opus 4.7</option>
                                                <option value="claude-opus-4-8">Claude Opus 4.8</option>
                                                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                                                <option value="claude-sonnet-5">Claude Sonnet 5</option>
                                            </optgroup>
                                            <optgroup label="DeepSeek">
                                                <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
                                                <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                                            </optgroup>
                                            <optgroup label="Google (Gemini)">
                                                <option value="gemini/gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                                <option value="gemini/gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                                                <option value="gemini/gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                                                <option value="gemini/gemini-3.5-flash">Gemini 3.5 Flash</option>
                                                <option value="gemini/gemini-embedding-001">Gemini Embedding 001</option>
                                            </optgroup>
                                            <optgroup label="Z.ai (GLM)">
                                                <option value="glm-5">GLM-5</option>
                                                <option value="glm-5-turbo">GLM-5 Turbo</option>
                                                <option value="glm-5.1">GLM-5.1</option>
                                                <option value="glm-5.2">GLM-5.2</option>
                                                <option value="glm-5v-turbo">GLM-5V Turbo</option>
                                            </optgroup>
                                            <optgroup label="OpenAI">
                                                <option value="gpt-4.1">GPT-4.1</option>
                                                <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                                                <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                                                <option value="gpt-4o">GPT-4o</option>
                                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                                <option value="gpt-5">GPT-5</option>
                                                <option value="gpt-5-mini">GPT-5 Mini</option>
                                                <option value="gpt-5-nano">GPT-5 Nano</option>
                                                <option value="gpt-5.4">GPT-5.4</option>
                                                <option value="gpt-5.4-mini">GPT-5.4 Mini</option>
                                                <option value="gpt-5.4-nano">GPT-5.4 Nano</option>
                                                <option value="text-embedding-3-large">Text Embedding 3 Large</option>
                                                <option value="text-embedding-3-small">Text Embedding 3 Small</option>
                                            </optgroup>
                                            <optgroup label="Tencent">
                                                <option value="hy3">Hy3</option>
                                            </optgroup>
                                            <optgroup label="Moonshot">
                                                <option value="kimi-k2.6">Kimi K2.6</option>
                                                <option value="kimi-k2.7">Kimi K2.7</option>
                                                <option value="kimi-k3">Kimi K3</option>
                                            </optgroup>
                                            <optgroup label="Mimo">
                                                <option value="mimo-v2.5">Mimo V2.5</option>
                                                <option value="mimo-v2.5-pro">Mimo V2.5 Pro</option>
                                            </optgroup>
                                            <optgroup label="MiniMax">
                                                <option value="MiniMax-M2.7-highspeed">MiniMax M2.7 Highspeed</option>
                                                <option value="MiniMax-M3">MiniMax M3</option>
                                            </optgroup>
                                            <optgroup label="Alibaba (Qwen)">
                                                <option value="qwen3.6-flash">Qwen 3.6 Flash</option>
                                                <option value="qwen3.6-plus">Qwen 3.6 Plus</option>
                                                <option value="qwen3.7-max">Qwen 3.7 Max</option>
                                                <option value="qwen3.7-plus">Qwen 3.7 Plus</option>
                                                <option value="qwen3.8-max-preview">Qwen 3.8 Max Preview</option>
                                            </optgroup>
                                            <optgroup label="BytePlus (Seed)">
                                                <option value="seed-2-0-code">Seed 2.0 Code</option>
                                                <option value="seed-2-0-lite">Seed 2.0 Lite</option>
                                                <option value="seed-2-0-mini">Seed 2.0 Mini</option>
                                                <option value="seed-2-0-pro">Seed 2.0 Pro</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5 mt-4">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">AI Model Pricing Reference</label>
                                    <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
                                        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Model Name</th>
                                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Provider</th>
                                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Context Window</th>
                                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Input Price</th>
                                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Cache Price</th>
                                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Output Price</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">claude-fable-5</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">anthropic</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$10.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.000</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$50.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">claude-haiku-4-5</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">anthropic</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">200,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.100</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$5.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">claude-opus-4-7</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">anthropic</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$5.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.500</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$25.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">claude-opus-4-8</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">anthropic</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$5.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.500</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$25.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">claude-sonnet-4-6</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">anthropic</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.300</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$15.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">claude-sonnet-5</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">anthropic</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.200</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$10.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">deepseek-v4-flash</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">deepseek</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.16</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.003</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.32</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">deepseek-v4-pro</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">deepseek</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.004</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.95</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gemini/gemini-3-flash-preview</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">gemini</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,048,576</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.050</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gemini/gemini-3.1-flash-lite</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">gemini</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,048,576</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.025</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gemini/gemini-3.1-pro-preview</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">gemini</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,048,576</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.200</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$12.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gemini/gemini-3.5-flash</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">gemini</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,048,576</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.150</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$9.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gemini/gemini-embedding-001</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">gemini</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">2,048</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.15</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <span className="text-gray-400">—</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">glm-5</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">z.ai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">128,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.60</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.120</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">glm-5-turbo</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">z.ai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">128,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.20</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.260</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$4.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">glm-5.1</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">z.ai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">200,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.40</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.260</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$4.40</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">glm-5.2</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">z.ai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.05</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.195</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.30</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">glm-5v-turbo</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">z.ai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">128,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.20</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.260</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$4.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-4.1</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,047,576</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.500</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$8.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-4.1-mini</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,047,576</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.40</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.100</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.60</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-4.1-nano</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,047,576</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.10</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.025</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.40</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-4o</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">128,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.250</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$10.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-4o-mini</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">128,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.15</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.075</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.60</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-5</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">272,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.125</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$10.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-5-mini</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">272,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.025</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-5-nano</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">272,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.05</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.005</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.40</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-5.4</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,050,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.250</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$15.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-5.4-mini</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,050,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.75</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.075</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$4.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">gpt-5.4-nano</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,050,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.20</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.020</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">hy3</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">tencent</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">256,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.13</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.033</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.53</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">kimi-k2.6</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">moonshoot</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">262,100</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.67</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.140</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.39</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">kimi-k2.7</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">moonshoot</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">262,100</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.95</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.190</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$4.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">kimi-k3</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">moonshoot</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.150</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$7.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">mimo-v2.5</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">mimo</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,100,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.14</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.003</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.28</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">mimo-v2.5-pro</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">mimo</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,100,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.43</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.004</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.87</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">MiniMax-M2.7-highspeed</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">sumopod</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">204,800</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.03</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.030</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.12</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">MiniMax-M3</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-700">minimax</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.30</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.060</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.20</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">qwen3.6-flash</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">alibaba</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.025</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">qwen3.6-plus</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">alibaba</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.050</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">qwen3.7-max</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">alibaba</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.125</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.75</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">qwen3.7-plus</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">alibaba</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.32</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.032</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.28</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">qwen3.8-max-preview</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">alibaba</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">1,000,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$1.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.130</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.75</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">seed-2-0-code</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">byteplus</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">256,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.100</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">seed-2-0-lite</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">byteplus</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">224,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.25</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.050</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$2.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">seed-2-0-mini</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">byteplus</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">224,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.10</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.020</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.40</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">seed-2-0-pro</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">byteplus</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">256,000</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.50</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.100</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$3.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">text-embedding-3-large</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">8,191</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.13</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <span className="text-gray-400">—</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">text-embedding-3-small</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">openai</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">8,191</td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.02</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <span className="text-gray-400">—</span>
                                                    </td>
                                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-900">
                                                        <div className="font-medium">$0.00</div>
                                                        <div className="text-xs text-gray-500">/1M tokens</div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">AI Persona / System Prompt</label>
                                    <textarea
                                        rows="4"
                                        value={aiSettings.system_prompt}
                                        onChange={(e) => setAiSettings({ ...aiSettings, system_prompt: e.target.value })}
                                        className="w-full bg-gray-50/80 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-[1.5rem] px-5 py-4 text-sm transition-all focus:ring-0 resize-none"
                                        placeholder="Beritahu AI siapa dia dan bagaimana dia harus menjawab..."
                                    />
                                    <p className="text-[9px] text-gray-400 italic px-1">*Instruksi ini akan menentukan karakter dan gaya bahasa AI.</p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="relative inline-block w-12 h-6 align-middle select-none">
                                            <input
                                                type="checkbox"
                                                id="ai-toggle"
                                                checked={aiSettings.is_enabled}
                                                onChange={(e) => setAiSettings({ ...aiSettings, is_enabled: e.target.checked })}
                                                className="sr-only"
                                            />
                                            <label
                                                htmlFor="ai-toggle"
                                                className={`block h-full rounded-full cursor-pointer transition-colors duration-300 ${aiSettings.is_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${aiSettings.is_enabled ? 'translate-x-6' : ''}`}></div>
                                            </label>
                                        </div>
                                        <span className={`text-xs font-bold ${aiSettings.is_enabled ? 'text-indigo-600' : 'text-gray-400'}`}>
                                            {aiSettings.is_enabled ? 'Sistem AI Aktif' : 'Sistem AI Nonaktif'}
                                        </span>
                                    </div>

                                    <button
                                        type="submit"
                                        className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl text-sm font-bold shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                                    >
                                        Update AI Configuration
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div >
                )}


                {activeTab === 'feedback' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Kritik & Saran Platform</h2>
                                <p className="text-xs text-gray-400">Daftar masukan global dari pengguna</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {feedbacks.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <span className="material-icons text-gray-300 text-4xl mb-2">rate_review</span>
                                    <p className="text-sm text-gray-400 font-bold">Belum ada feedback yang masuk</p>
                                </div>
                            ) : (
                                feedbacks.map((fb) => (
                                    <div key={fb.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 hover:border-indigo-100 transition group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${fb.urgent ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                                    <span className="material-icons text-xl">{fb.urgent ? 'report_problem' : 'rate_review'}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-800">{fb.user_details?.username || 'User'}</span>
                                                        {fb.urgent && (
                                                            <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded-full uppercase">Mendesak</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">{new Date(fb.created_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm('Hapus feedback ini?')) {
                                                        try {
                                                            await adminDeleteFeedback(fb.id);
                                                            fetchData();
                                                        } catch (err) { alert('Gagal menghapus feedback.'); }
                                                    }
                                                }}
                                                className="p-2 text-gray-300 hover:text-rose-500 transition"
                                            >
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                                            {fb.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Icon Picker Modal for Categories */}
            {showIconPicker && (
                <div className="fixed inset-0 bg-black/60 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Pilih Icon Kategori</h3>
                            <button
                                onClick={() => setShowIconPicker(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {materialIcons.map(icon => (
                                <button
                                    key={icon}
                                    onClick={() => {
                                        setCatForm({ ...catForm, icon: icon });
                                        setShowIconPicker(false);
                                    }}
                                    className={`w-full aspect-square flex items-center justify-center rounded-2xl transition ${catForm.icon === icon ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                >
                                    <span className="material-icons text-2xl">{icon}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}


            <NavigationButton />
        </div>
    );
};

export default AdminConsultantSettingsPage;
