import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import {
    adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
    adminGetProfiles, adminCreateProfile, adminUpdateProfile, adminDeleteProfile,
    searchUsers
} from '../../services/chatApi';

const AdminConsultantSettingsPage = () => {
    const [categories, setCategories] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('categories');

    // Category Form
    const [catForm, setCatForm] = useState({ name: '', icon: '', is_active: true });
    const [editingCatId, setEditingCatId] = useState(null);

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
            const [catRes, profRes] = await Promise.all([
                adminGetCategories(),
                adminGetProfiles()
            ]);
            setCategories(catRes.data);
            setProfiles(profRes.data);
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
            setCatForm({ name: '', icon: '', is_active: true });
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

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20 pt-16">
            <Header />
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
                <h1 className="text-xl font-bold text-gray-800 mb-6">Pengaturan Konsultasi</h1>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'categories' ? 'bg-purple-700 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
                    >
                        Kategori
                    </button>
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${activeTab === 'profiles' ? 'bg-purple-700 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
                    >
                        Daftar Pakar
                    </button>
                </div>

                {activeTab === 'categories' ? (
                    <div className="space-y-6">
                        <form onSubmit={handleCatSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                            <h3 className="font-bold text-gray-800 mb-4">{editingCatId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nama Kategori</label>
                                    <input
                                        type="text" required
                                        value={catForm.name}
                                        onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-purple-500"
                                        placeholder="Contoh: Kesehatan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Material Icon</label>
                                    <input
                                        type="text"
                                        value={catForm.icon}
                                        onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-purple-500"
                                        placeholder="Contoh: health_and_safety"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={catForm.is_active}
                                        onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
                                        className="rounded text-purple-700 focus:ring-purple-500"
                                    />
                                    <span className="text-xs text-gray-600">Aktif</span>
                                </label>
                                <div className="flex gap-2">
                                    {editingCatId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingCatId(null); setCatForm({ name: '', icon: '', is_active: true }); }}
                                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="bg-purple-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-100"
                                    >
                                        {editingCatId ? 'Perbarui' : 'Simpan Kategori'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {categories.map(cat => (
                                <div key={cat.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                                            <span className="material-icons text-purple-700">{cat.icon || 'chat'}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm">{cat.name}</h4>
                                            <span className={`text-[10px] font-bold ${cat.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                                {cat.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setEditingCatId(cat.id); setCatForm({ name: cat.name, icon: cat.icon, is_active: cat.is_active }); }}
                                            className="p-2 text-gray-400 hover:text-purple-700 transition"
                                        >
                                            <span className="material-icons text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleCatDelete(cat.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <form onSubmit={handleProfSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
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
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-purple-500"
                                            placeholder="Ketik minimal 3 huruf..."
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 mt-1 rounded-xl shadow-xl z-20 overflow-hidden">
                                                {searchResults.map(user => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => {
                                                            setProfForm({ ...profForm, user: user.id });
                                                            setUserSearch(`${user.username} (${user.email || 'No Email'})`);
                                                            setSearchResults([]);
                                                        }}
                                                        className="p-3 hover:bg-gray-50 cursor-pointer text-xs border-b border-gray-50 last:border-0"
                                                    >
                                                        <span className="font-bold">{user.username}</span> - {user.email}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Kategori</label>
                                        <select
                                            required
                                            value={profForm.category}
                                            onChange={(e) => setProfForm({ ...profForm, category: e.target.value })}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-purple-500 appearance-none"
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
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-purple-500"
                                            placeholder="Pakar Ekonomi Syariah..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={profForm.is_available}
                                        onChange={(e) => setProfForm({ ...profForm, is_available: e.target.checked })}
                                        className="rounded text-purple-700 focus:ring-purple-500"
                                    />
                                    <span className="text-xs text-gray-600">Tersedia untuk chat</span>
                                </label>
                                <div className="flex gap-2">
                                    {editingProfId && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingProfId(null); setProfForm({ user: '', category: '', bio: '', is_available: true }); setUserSearch(''); }}
                                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition"
                                        >
                                            Batal
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={!profForm.user || !profForm.category}
                                        className="bg-purple-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-100 disabled:bg-gray-200"
                                    >
                                        {editingProfId ? 'Perbarui' : 'Simpan Pakar'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {profiles.map(prof => (
                                <div key={prof.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="material-icons text-gray-400">person</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-800 text-sm truncate">{prof.username}</h4>
                                            <p className="text-[10px] text-purple-600 font-bold uppercase">{prof.category_name}</p>
                                            <p className="text-[10px] text-gray-400 truncate italic">{prof.bio || 'Tidak ada bio'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingProfId(prof.id);
                                                setProfForm({ user: prof.user, category: prof.category, bio: prof.bio, is_available: prof.is_available });
                                                setUserSearch(prof.username);
                                            }}
                                            className="p-2 text-gray-400 hover:text-purple-700 transition"
                                        >
                                            <span className="material-icons text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleProfDelete(prof.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default AdminConsultantSettingsPage;
