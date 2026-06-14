import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import CKEditorComponent from '../../components/common/CKEditor';

const API = process.env.REACT_APP_API_BASE_URL || 'https://api.barakah.cloud';

const DashboardUserAgreementPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        content: ''
    });

    const fetchUserAgreement = async () => {
        try {
            const res = await axios.get(`${API}/api/auth/user-agreement/`);
            setFormData({
                title: res.data.title || 'Lembar Kesepakatan & Ketentuan Data',
                subtitle: res.data.subtitle || 'Komitmen Keamanan & Privasi Barakah Economy Community',
                content: res.data.content || ''
            });
        } catch (err) {
            console.error('Error fetching user agreement:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserAgreement();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;

        try {
            await axios.post(`${API}/api/auth/user-agreement/`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            alert('Berhasil! Syarat & Ketentuan persetujuan data telah diperbarui.');
            fetchUserAgreement();
        } catch (err) {
            console.error('Error saving user agreement:', err);
            alert('Gagal menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-20">
                <Header />
                <div className="flex-1 flex flex-col justify-center items-center">
                    <div className="w-12 h-12 border-4 border-green-100 border-t-green-700 rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-32">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-gray-400 shadow-sm border border-gray-100 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">Pengaturan Syarat & Ketentuan</h1>
                            <p className="text-gray-500 font-medium">Atur naskah Lembar Kesepakatan & Ketentuan Data (MS Word Style)</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-10 py-4 bg-green-700 text-white rounded-[1.8rem] font-black shadow-xl shadow-green-100 hover:bg-green-800 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-icons">save</span>}
                        Simpan Pengaturan
                    </button>
                </div>

                <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-gray-200/40 border border-white space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Judul Dokumen</label>
                        <input
                            type="text"
                            className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-lg font-black text-gray-900 focus:border-green-500 focus:bg-white transition-all outline-none"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Contoh: Lembar Kesepakatan & Ketentuan Data"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Sub-judul / Keterangan</label>
                        <input
                            type="text"
                            className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-sm font-semibold text-gray-700 focus:border-green-500 focus:bg-white transition-all outline-none"
                            value={formData.subtitle}
                            onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                            placeholder="Contoh: Komitmen Keamanan & Privasi Barakah Economy Community"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Naskah S&K (Format Word/Rich Text)</label>
                        <div className="border border-gray-200 rounded-[2rem] overflow-hidden bg-gray-50 p-2 focus-within:border-green-500 focus-within:bg-white transition-all">
                            <CKEditorComponent
                                content={formData.content}
                                onChange={data => setFormData({ ...formData, content: data })}
                                placeholder="Tuliskan seluruh syarat dan kebijakan privasi perlindungan data di sini..."
                            />
                        </div>
                    </div>
                </div>
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardUserAgreementPage;
