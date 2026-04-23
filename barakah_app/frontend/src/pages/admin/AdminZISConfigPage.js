import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getZISConfigs, createZISConfig, updateZISConfig } from '../../services/zisApi';

const AdminZISConfigPage = () => {
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingConfig, setEditingConfig] = useState(null);
    const [newCat, setNewCat] = useState('');
    const [formData, setFormData] = useState({
        name: 'Konfigurasi ZIS Utama',
        categories: [],
        bank_name: '',
        account_number: '',
        account_name: '',
        is_active: true
    });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await getZISConfigs();
            if (res.data.length > 0) {
                const config = res.data[0]; // Always use the first one
                setEditingConfig(config);
                setFormData({
                    ...config,
                    categories: Array.isArray(config.categories) ? config.categories : []
                });
                setIsEditing(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = () => {
        if (newCat && formData.categories.length < 8) {
            setFormData(prev => ({
                ...prev,
                categories: [...prev.categories, newCat]
            }));
            setNewCat('');
        }
    };

    const removeCategory = (idx) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.filter((_, i) => i !== idx)
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (formData.categories.length === 0) {
            alert("Harap tambah minimal 1 kategori (Pos)");
            return;
        }

        try {
            if (isEditing && editingConfig) {
                await updateZISConfig(editingConfig.id, formData);
            } else {
                await createZISConfig(formData);
            }
            alert("Konfigurasi berhasil disimpan!");
            fetchConfigs();
        } catch (err) {
            console.error(err);
            alert("Gagal menyimpan konfigurasi");
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-24">
            <Header />
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">Pengaturan ZIS</h1>
                    <p className="text-sm text-gray-500 font-medium">Tentukan kategori (pos) dan detail transfer</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kategori ZIS (Max 8 Pos)</label>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newCat}
                                    onChange={(e) => setNewCat(e.target.value)}
                                    placeholder="Nama Pos (mis: Infaq Rutin)"
                                    className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm"
                                    disabled={formData.categories.length >= 8}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCategory}
                                    disabled={!newCat || formData.categories.length >= 8}
                                    className="bg-green-600 text-white px-6 rounded-2xl font-bold disabled:opacity-50"
                                >
                                    Tambah
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {formData.categories.map((cat, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold text-xs border border-green-100">
                                        {cat}
                                        <button type="button" onClick={() => removeCategory(idx)} className="material-icons text-sm hover:text-red-500">close</button>
                                    </div>
                                ))}
                                {formData.categories.length === 0 && (
                                    <p className="text-xs text-gray-400 italic">Belum ada kategori yang ditambahkan.</p>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Bank</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold"
                                    placeholder="Contoh: Bank Syariah Indonesia (BSI)"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nomor Rekening</label>
                                <input
                                    type="text"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-mono font-bold"
                                    placeholder="Nomor rekening tujuan"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Nama Pemilik Rekening</label>
                                <input
                                    type="text"
                                    value={formData.account_name}
                                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4 text-sm font-bold"
                                    placeholder="Nama di buku tabungan"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gray-900 hover:bg-black text-white font-black py-5 rounded-[2rem] shadow-xl transition-all transform active:scale-95"
                    >
                        Simpan Konfigurasi
                    </button>
                </form>
            </main>
            <NavigationButton />
        </div>
    );
};

export default AdminZISConfigPage;
