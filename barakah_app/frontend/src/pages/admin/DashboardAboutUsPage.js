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
        legal_description: '',
        hero_image: null,
        organization_structure_image: null
    });
    const [newLegalDoc, setNewLegalDoc] = useState({ title: '', image: null });
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [cropper, setCropper] = useState({ show: false, image: null, target: null, aspect: 16/9 });
    
    const getMediaUrl = (path, file) => {
        if (file instanceof Blob) return URL.createObjectURL(file);
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return API + path;
    };

    const fetchAboutUs = async () => {
        try {
            const res = await axios.get(`${API}/api/site-content/about-us/`);
            const data = Array.isArray(res.data) ? res.data[0] : (res.data.results ? res.data.results[0] : null);
            
            if (data) {
                setAboutData(data);
                setFormData({
                    title: data.title || 'Tentang Kami',
                    description: data.description || '',
                    vision: data.vision || '',
                    mission: data.mission || '',
                    legal_description: data.legal_description || '',
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
        fd.append('legal_description', formData.legal_description);
        
        if (formData.hero_image instanceof File) {
            fd.append('hero_image', formData.hero_image);
        }
        if (formData.organization_structure_image instanceof File) {
            fd.append('organization_structure_image', formData.organization_structure_image);
        }

        try {
            if (aboutData?.id) {
                await axios.patch(`${API}/api/site-content/about-us/${aboutData.id}/`, fd, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post(`${API}/api/site-content/about-us/`, fd, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            }
            alert('Berhasil! Perubahan telah diterapkan.');
            fetchAboutUs();
        } catch (err) {
            console.error('Error saving About Us:', err);
            alert('Gagal menyimpan perubahan. Cek koneksi Anda.');
        } finally {
            setSaving(false);
        }
    };

    const handleUploadLegalDoc = async () => {
        if (!newLegalDoc.title || !newLegalDoc.image || !aboutData) {
            alert('Lengkapi judul dan pilih gambar dokumen');
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
            alert('Gagal mengunggah dokumen legalitas');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteLegalDoc = async (docId) => {
        if (!window.confirm('Hapus dokumen legalitas ini?')) return;

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
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col justify-center items-center">
                    <div className="w-16 h-16 border-4 border-green-100 border-t-green-700 rounded-full animate-spin"></div>
                    <p className="mt-4 text-green-800 font-bold">Menyiapkan Manajemen...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="body bg-[#fcfdfe] min-h-screen">
            <Header />
            <div className="max-w-5xl mx-auto px-4 py-10 pb-32">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-5">
                        <button onClick={() => window.history.back()} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-gray-400 shadow-sm border border-gray-100 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Profil Organisasi</h1>
                            <p className="text-gray-500 font-medium">Sesuaikan wajah Barakah Economy di halaman publik</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-4 bg-green-700 text-white rounded-[1.5rem] font-black shadow-xl shadow-green-100 hover:bg-green-800 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-icons">cloud_upload</span>}
                        {saving ? 'Menyimpan...' : 'Terapkan Perubahan'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form Fields */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/30 border border-gray-50 space-y-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nama Organisasi / Judul</label>
                                <input
                                    type="text"
                                    className="w-full p-5 bg-gray-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-green-500 transition"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Narasi Utama (Deskripsi)</label>
                                <textarea
                                    rows="10"
                                    className="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm leading-relaxed focus:ring-2 focus:ring-green-500 transition"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ceritakan sejarah dan kontribusi organisasi..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-200/30 border border-gray-50">
                                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="material-icons text-green-600">visibility</span>
                                    Visi
                                </h3>
                                <textarea
                                    rows="5"
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-medium italic"
                                    value={formData.vision}
                                    onChange={e => setFormData({ ...formData, vision: e.target.value })}
                                />
                            </div>
                            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-200/30 border border-gray-50">
                                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="material-icons text-blue-600">rocket_launch</span>
                                    Misi
                                </h3>
                                <textarea
                                    rows="5"
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm leading-relaxed"
                                    value={formData.mission}
                                    onChange={e => setFormData({ ...formData, mission: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Bukti Legalitas Section */}
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/30 border border-gray-50 space-y-8">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                <span className="material-icons text-purple-600 font-bold">verified</span>
                                Galeri Legalitas & Sertifikasi
                            </h3>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan Legalitas</label>
                                <textarea 
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm" 
                                    value={formData.legal_description}
                                    onChange={(e) => setFormData({ ...formData, legal_description: e.target.value })}
                                    placeholder="Sebutkan nomor akta, SK kemenkumham, dll..."
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {aboutData?.legal_documents?.map(doc => (
                                    <div key={doc.id} className="relative group rounded-3xl overflow-hidden aspect-[3/4] border-4 border-gray-50">
                                        <img src={getMediaUrl(doc.image)} alt={doc.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-4">
                                            <button onClick={() => handleDeleteLegalDoc(doc.id)} className="w-12 h-12 bg-red-600 text-white rounded-2xl shadow-xl transform scale-75 group-hover:scale-100 transition duration-300 flex items-center justify-center">
                                                <span className="material-icons">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="border-4 border-dashed border-gray-100 rounded-3xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 hover:border-green-200 transition">
                                    <input type="text" placeholder="Nama Dokumen" className="w-full text-xs font-bold p-3 bg-white rounded-xl mb-4 text-center border-none shadow-sm" value={newLegalDoc.title} onChange={e => setNewLegalDoc({ ...newLegalDoc, title: e.target.value })} />
                                    <input type="file" id="legal_doc_file" className="hidden" accept="image/*" onChangeCapture={e => handleFileChange(e, 'legal_doc', 3/4)} />
                                    
                                    {newLegalDoc.image ? (
                                        <div className="w-full aspect-[3/4] relative rounded-2xl overflow-hidden mb-4">
                                            <img src={getMediaUrl(null, newLegalDoc.image)} className="w-full h-full object-cover" alt="Preview"/>
                                            <button onClick={() => setNewLegalDoc({ ...newLegalDoc, image: null })} className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 shadow-lg"><span className="material-icons text-xs">close</span></button>
                                        </div>
                                    ) : (
                                        <label htmlFor="legal_doc_file" className="cursor-pointer text-center">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-gray-300 shadow-sm mx-auto mb-3">
                                                <span className="material-icons text-3xl">add_a_photo</span>
                                            </div>
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tambah Gambar</span>
                                        </label>
                                    )}
                                    
                                    {newLegalDoc.image && (
                                        <button disabled={uploadingDoc} onClick={handleUploadLegalDoc} className="w-full py-3 bg-green-700 text-white rounded-xl text-xs font-black hover:bg-green-800 transition">
                                            {uploadingDoc ? 'Mengunggah...' : 'Upload Dokumen'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Side Media Uploads */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-200/30 border border-gray-50 space-y-6">
                            <h3 className="text-lg font-black text-gray-900 border-b pb-4">Foto Utama (Hero)</h3>
                            <div className="relative group rounded-[2rem] overflow-hidden aspect-video bg-gray-50 border-4 border-white shadow-inner flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                                <img 
                                    src={getMediaUrl(aboutData?.hero_image, formData.hero_image)} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-700" 
                                    alt="Hero Preview" 
                                />
                                <div className="relative z-10 bg-white/90 backdrop-blur px-6 py-3 rounded-full text-xs font-black shadow-2xl group-hover:scale-110 transition">
                                    Ubah Foto Hero
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileChange(e, 'hero_image', 16/9)} />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium text-center uppercase tracking-widest">Rekomendasi rasio 16:9 agar tidak terpotong</p>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-200/30 border border-gray-50 space-y-6">
                            <h3 className="text-lg font-black text-gray-900 border-b pb-4">Struktur Organisasi</h3>
                            <div className="relative group rounded-[2rem] overflow-hidden aspect-[3/4] bg-gray-50 border-4 border-white shadow-inner flex flex-col items-center justify-center cursor-pointer">
                                <img 
                                    src={getMediaUrl(aboutData?.organization_structure_image, formData.organization_structure_image)} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-700" 
                                    alt="Structure Preview" 
                                />
                                <div className="relative z-10 bg-white/90 backdrop-blur px-6 py-3 rounded-full text-xs font-black shadow-2xl group-hover:scale-110 transition">
                                    Ubah Struktur
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileChange(e, 'organization_structure_image', 3/4)} />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium text-center uppercase tracking-widest">Pastikan teks terbaca dengan jelas (Potret)</p>
                        </div>
                    </div>
                </div>
            </div>

            <NavigationButton />
            
            {cropper.show && (
                <ImageCropperModal
                    show={cropper.show}
                    image={cropper.image}
                    onClose={() => setCropper({ ...cropper, show: false })}
                    onCropComplete={(croppedFile) => {
                        if (cropper.target === 'legal_doc') {
                            setNewLegalDoc({ ...newLegalDoc, image: croppedFile });
                        } else {
                            setFormData({ ...formData, [cropper.target]: croppedFile });
                        }
                        setCropper({ ...cropper, show: false });
                    }}
                    aspect={cropper.aspect}
                    maxWidth={1280}
                    title="Sesuaikan Area Gambar"
                />
            )}
        </div>
    );
};

export default DashboardAboutUsPage;
