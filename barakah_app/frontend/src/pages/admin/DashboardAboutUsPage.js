import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import ImageCropperModal from '../../components/common/ImageCropper';

const API = process.env.REACT_APP_API_BASE_URL;

const DashboardAboutUsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [aboutData, setAboutData] = useState(null);
    const [formData, setFormData] = useState({
        title: 'Tentang Kami',
        description: '',
        vision: '',
        mission: '',
        hero_image: null,
        organization_structure_image: null
    });
    const [newLegalDoc, setNewLegalDoc] = useState({ title: '', image: null });
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [cropper, setCropper] = useState({ show: false, image: null, target: null, aspect: 16/9 });

    const fetchAboutUs = async () => {
        try {
            const res = await axios.get(`${API}/api/site-content/about-us/`);
            if (res.data && res.data.length > 0) {
                const data = res.data[0];
                setAboutData(data);
                setFormData({
                    title: data.title || 'Tentang Kami',
                    description: data.description || '',
                    vision: data.vision || '',
                    mission: data.mission || '',
                    hero_image: null,
                    organization_structure_image: null
                });
            }
        } catch (err) {
            console.error('Error fetching About Us:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAboutUs();
    }, []);

    const handleFileChange = (e, target, aspect) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setCropper({ show: true, image: reader.result, target, aspect });
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;

        const fd = new FormData();
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('vision', formData.vision);
        fd.append('mission', formData.mission);
        
        if (formData.hero_image instanceof File) {
            fd.append('hero_image', formData.hero_image);
        }
        if (formData.organization_structure_image instanceof File) {
            fd.append('organization_structure_image', formData.organization_structure_image);
        }

        try {
            if (aboutData) {
                await axios.patch(`${API}/api/site-content/about-us/${aboutData.id}/`, fd, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post(`${API}/api/site-content/about-us/`, fd, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            }
            alert('Data Tentang Kami berhasil disimpan');
            fetchAboutUs();
        } catch (err) {
            console.error('Error saving About Us:', err);
            alert('Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleUploadLegalDoc = async () => {
        if (!newLegalDoc.title || !newLegalDoc.image || !aboutData) {
            alert('Judul dan gambar wajib diisi');
            return;
        }

        setUploadingDoc(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;

        const fd = new FormData();
        fd.append('about_us', aboutData.id);
        fd.append('title', newLegalDoc.title);
        fd.append('image', newLegalDoc.image);

        try {
            await axios.post(`${API}/api/site-content/about-us-legal-docs/`, fd, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setNewLegalDoc({ title: '', image: null });
            fetchAboutUs();
        } catch (err) {
            console.error('Error uploading document:', err);
            alert('Gagal mengunggah dokumen');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteLegalDoc = async (docId) => {
        if (!window.confirm('Hapus dokumen ini?')) return;

        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;

        try {
            await axios.delete(`${API}/api/site-content/about-us-legal-docs/${docId}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAboutUs();
        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Gagal menghapus dokumen');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex justify-center items-center h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => window.history.back()} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">Manajemen Tentang Kami</h1>
                        <p className="text-gray-500 text-sm">Kelola informasi profil organisasi Barakah Economy</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Judul Halaman</label>
                            <input
                                type="text"
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Deskripsi Utama</label>
                            <textarea
                                rows="6"
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Jelaskan tentang Barakah Economy..."
                            />
                        </div>
                    </div>

                    {/* Vision & Mission */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-green-600 text-lg">visibility</span>
                                <label className="text-sm font-bold text-gray-700">Visi</label>
                            </div>
                            <textarea
                                rows="4"
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                value={formData.vision}
                                onChange={e => setFormData({ ...formData, vision: e.target.value })}
                                placeholder="Visi organisasi..."
                            />
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons text-green-600 text-lg">outlined_flag</span>
                                <label className="text-sm font-bold text-gray-700">Misi</label>
                            </div>
                            <textarea
                                rows="4"
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                value={formData.mission}
                                onChange={e => setFormData({ ...formData, mission: e.target.value })}
                                placeholder="Misi organisasi (gunakan baris baru untuk tiap poin)..."
                            />
                        </div>
                    </div>

                    {/* Media */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-sm font-bold text-gray-900 border-b pb-4 border-gray-50 mb-4">Media & Gambar</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gambar Hero (16:9)</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-4 text-center hover:border-green-400 transition group relative overflow-hidden h-48 flex flex-col items-center justify-center">
                                    {(formData.hero_image || (aboutData && aboutData.hero_image)) ? (
                                        <img 
                                            src={formData.hero_image instanceof Blob ? URL.createObjectURL(formData.hero_image) : (aboutData?.hero_image ? (API + aboutData.hero_image) : '')} 
                                            alt="Hero" 
                                            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition"
                                        />
                                    ) : null}
                                    <input type="file" id="hero_image" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'hero_image', 16/9)} />
                                    <label htmlFor="hero_image" className="relative z-10 flex flex-col items-center cursor-pointer">
                                        <span className="material-icons text-green-600 text-3xl mb-2">add_photo_alternate</span>
                                        <span className="text-xs font-bold text-gray-600">Pilih Gambar Hero</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Struktur Organisasi (A4/Portrait)</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-3xl p-4 text-center hover:border-green-400 transition group relative overflow-hidden h-48 flex flex-col items-center justify-center">
                                    {(formData.organization_structure_image || (aboutData && aboutData.organization_structure_image)) ? (
                                        <img 
                                            src={formData.organization_structure_image instanceof Blob ? URL.createObjectURL(formData.organization_structure_image) : (aboutData?.organization_structure_image ? (API + aboutData.organization_structure_image) : '')} 
                                            alt="Structure" 
                                            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition"
                                        />
                                    ) : null}
                                    <input type="file" id="org_image" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'organization_structure_image', 3/4)} />
                                    <label htmlFor="org_image" className="relative z-10 flex flex-col items-center cursor-pointer">
                                        <span className="material-icons text-blue-600 text-3xl mb-2">account_tree</span>
                                        <span className="text-xs font-bold text-gray-600">Pilih Struktur Organisasi</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bukti Legalitas */}
                    {aboutData && (
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <h3 className="text-sm font-bold text-gray-900 border-b pb-4 border-gray-50 flex items-center gap-2">
                                <span className="material-icons text-green-600">verified</span>
                                Bukti Legalitas
                            </h3>

                            {/* Existing Docs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {aboutData.legal_documents?.map(doc => (
                                    <div key={doc.id} className="relative group rounded-2xl overflow-hidden border border-gray-100 aspect-[3/4]">
                                        <img 
                                            src={API + doc.image} 
                                            alt={doc.title} 
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-3">
                                            <p className="text-white text-[10px] font-bold truncate">{doc.title}</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteLegalDoc(doc.id)}
                                            className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                ))}
                                
                                {/* Add New Form Inline-ish */}
                                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center hover:border-green-300 transition gap-2 bg-gray-50/50 min-h-[160px]">
                                    <input 
                                        type="text" 
                                        placeholder="Judul Dokumen" 
                                        className="w-full text-[10px] p-2 bg-white border border-gray-100 rounded-lg text-center"
                                        value={newLegalDoc.title}
                                        onChange={e => setNewLegalDoc({ ...newLegalDoc, title: e.target.value })}
                                    />
                                    <input 
                                        type="file" 
                                        id="legal_doc_file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = () => setCropper({ show: true, image: reader.result, target: 'legal_doc', aspect: 3/4 });
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                    {newLegalDoc.image ? (
                                        <div className="relative w-full aspect-[3/4] mb-2">
                                            <img src={URL.createObjectURL(newLegalDoc.image)} className="w-full h-full object-cover rounded-xl" alt="Preview"/>
                                            <button 
                                                type="button"
                                                onClick={() => setNewLegalDoc({ ...newLegalDoc, image: null })}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                                            >
                                                <span className="material-icons text-xs">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <label htmlFor="legal_doc_file" className="cursor-pointer flex flex-col items-center">
                                            <span className="material-icons text-gray-400 text-2xl">add_a_photo</span>
                                            <span className="text-[10px] text-gray-400 font-bold mt-1 text-center">Pilih Dokumen</span>
                                        </label>
                                    )}
                                    
                                    {newLegalDoc.image && (
                                        <button 
                                            type="button"
                                            disabled={uploadingDoc}
                                            onClick={handleUploadLegalDoc}
                                            className="w-full py-2 bg-green-700 text-white rounded-xl text-[10px] font-bold hover:bg-green-800 transition"
                                        >
                                            {uploadingDoc ? 'Uploading...' : 'Upload Dokumen'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-5 bg-green-700 text-white rounded-[2rem] font-extrabold shadow-xl shadow-green-100 hover:bg-green-800 transition transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {saving ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-icons">save</span>
                            )}
                            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </form>
            </div>

            <NavigationButton />
            
            {cropper.show && (
                <ImageCropperModal
                    show={cropper.show}
                    image={cropper.image}
                    onClose={() => setCropper({ ...cropper, show: false })}
                    onCropComplete={(croppedFile) => {
                        setFormData({ ...formData, [cropper.target]: croppedFile });
                        setCropper({ ...cropper, show: false });
                    }}
                    aspect={cropper.aspect}
                    maxWidth={1280}
                    title="Crop Gambar Profil"
                />
            )}
        </div>
    );
};

export default DashboardAboutUsPage;
