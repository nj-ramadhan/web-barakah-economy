import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import {
    adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
    adminGetProfiles, adminCreateProfile, adminUpdateProfile, adminDeleteProfile,
    searchUsers, adminGetAISettings, adminUpdateAISettings
} from '../../services/chatApi';

const AdminConsultantSettingsPage = () => {
    const [categories, setCategories] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [aiSettings, setAiSettings] = useState({
        api_key: '',
        model_name: 'gpt-4o-mini',
        system_prompt: '',
        is_enabled: false
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('categories');

    // Category Form
    const [catForm, setCatForm] = useState({ name: '', icon: 'chat', is_active: true, is_ai_enabled: false, welcome_message: '' });
    const [editingCatId, setEditingCatId] = useState(null);
    const [showIconPicker, setShowIconPicker] = useState(false);

    const materialIcons = [
        'chat', 'health_and_safety', 'account_balance', 'mosque', 'work',
        'payments', 'psychology', 'school', 'volunteer_activism',
        'trending_up', 'security', 'public', 'description', 'stars',
        'person', 'support_agent', 'calculate', 'history_edu'
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
            const [catRes, profRes, aiRes] = await Promise.all([
                adminGetCategories(),
                adminGetProfiles(),
                adminGetAISettings()
            ]);
            setCategories(catRes.data);
            setProfiles(profRes.data);
            if (aiRes.data) setAiSettings(aiRes.data);
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
            setCatForm({ name: '', icon: 'chat', is_active: true, is_ai_enabled: false, welcome_message: '' });
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
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20 pt-16">
            <Header />
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
                <h1 className="text-xl font-bold text-gray-800 mb-6 font-display">Pengaturan Konsultasi</h1>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'bg-white text-gray-400 border border-gray-100 hover:border-indigo-200'}`}
                    >
                        📂 Kategori
                    </button>
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'profiles' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'bg-white text-gray-400 border border-gray-100 hover:border-indigo-200'}`}
                    >
                        👨‍🏫 Daftar Pakar
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'bg-white text-gray-400 border border-gray-100 hover:border-indigo-200'}`}
                    >
                        🤖 AI Chatbot
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
                                            onClick={() => { setEditingCatId(null); setCatForm({ name: '', icon: 'chat', is_active: true, is_ai_enabled: false, welcome_message: '' }); }}
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
                                            onClick={() => { setEditingCatId(cat.id); setCatForm({ name: cat.name, icon: cat.icon, is_active: cat.is_active, is_ai_enabled: cat.is_ai_enabled, welcome_message: cat.welcome_message || '' }); }}
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
                                    <h2 className="text-xl font-bold text-gray-800">SumoPod AI Integration</h2>
                                    <p className="text-xs text-gray-400 font-medium">Konfigurasi asisten virtual untuk kategori "Tanya AI"</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">SumoPod API Key</label>
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
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">AI Model Name</label>
                                        <select
                                            value={aiSettings.model_name}
                                            onChange={(e) => setAiSettings({ ...aiSettings, model_name: e.target.value })}
                                            className="w-full bg-gray-50/80 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm transition-all appearance-none cursor-pointer"
                                        >
                                            <optgroup label="Fast Models (OpenAI)">
                                                <option value="gpt-4o-mini">gpt-4o-mini (Rekomendasi)</option>
                                                <option value="gpt-4o">gpt-4o (Smart)</option>
                                            </optgroup>
                                            <optgroup label="DeepSeek (Technical)">
                                                <option value="deepseek-chat">deepseek-chat</option>
                                                <option value="deepseek-r1">deepseek-r1</option>
                                            </optgroup>
                                            <optgroup label="Anthropic">
                                                <option value="claude-3-haiku">claude-3-haiku</option>
                                                <option value="claude-3-5-sonnet">claude-3.5-sonnet</option>
                                            </optgroup>
                                        </select>
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
                    </div>
                )}
            </div>

            {/* Icon Picker Modal */}
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
