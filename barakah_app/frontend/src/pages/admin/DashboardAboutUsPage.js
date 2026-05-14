import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import ImageCropperModal from '../../components/common/ImageCropper';
import { getMediaUrl } from '../../utils/mediaUtils';

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
    const [cropper, setCropper] = useState({ show: false, image: null, target: null, aspect: 1/1, personnelIdx: null });

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

    const handleFileChange = (e, target, aspect, personnelIdx = null) => {
        const file = e.target.files[0];
        if (file) {
            // Skip cropper if aspect is null
            if (aspect === null) {
                if (target === 'legal_doc') {
                    uploadLegalDocDirect(file);
                } else {
                    setFormData(prev => ({ ...prev, [target]: file }));
                }
                return;
            }
            const reader = new FileReader();
            reader.onload = () => setCropper({ show: true, image: reader.result, target, aspect, personnelIdx });
            reader.readAsDataURL(file);
        }
    };

    const uploadLegalDocDirect = async (file) => {
        setUploadingDoc(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        const fd = new FormData();
        fd.append('about_us', aboutData.id);
        fd.append('title', `Doc ${aboutData?.legal_documents?.length + 1}`);
        fd.append('image', file, `legal_doc_${Date.now()}.jpg`);
        try {
            await axios.post(`${API}/api/site-content/about-us-legal-docs/`, fd, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAboutUs();
        } catch (err) {
            console.error(err);
            alert('Gagal mengunggah dokumen.');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleSaveMain = async (e) => {
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
        if (formData.hero_image) {
            if (formData.hero_image instanceof File) {
                fd.append('hero_image', formData.hero_image);
            } else if (formData.hero_image instanceof Blob) {
                fd.append('hero_image', formData.hero_image, 'hero_image.jpg');
            }
        }
        if (formData.organization_structure_image) {
            if (formData.organization_structure_image instanceof File) {
                fd.append('organization_structure_image', formData.organization_structure_image);
            } else if (formData.organization_structure_image instanceof Blob) {
                fd.append('organization_structure_image', formData.organization_structure_image, 'structure.jpg');
            }
        }

        try {
            if (aboutData?.id) {
                await axios.patch(`${API}/api/site-content/about-us/${aboutData.id}/`, fd, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API}/api/site-content/about-us/`, fd, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            alert('Berhasil! Profil organisasi telah diperbarui.');
            fetchAboutUs();
        } catch (err) {
            console.error('Error saving About Us:', err);
            alert('Gagal menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    };


    const handleDeleteLegalDoc = async (id) => {
        if (!window.confirm('Hapus dokumen ini?')) return;
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        try {
            await axios.delete(`${API}/api/site-content/about-us-legal-docs/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAboutUs();
        } catch (err) {
            console.error('Error deleting legal doc:', err);
        }
    };

    const [fullPhoto, setFullPhoto] = useState(null);

    const getImagePreview = (dbValue, newValue) => {
        if (newValue) {
            if (newValue instanceof File || newValue instanceof Blob) {
                return URL.createObjectURL(newValue);
            }
            return newValue;
        }
        return getMediaUrl(dbValue);
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
            <div className="max-w-6xl mx-auto px-4 py-24">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-gray-400 shadow-sm border border-gray-100 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900">Manajemen Tentang Kami</h1>
                            <p className="text-gray-500 font-medium">Kelola profil, legalitas, dan personil organisasi</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleSaveMain}
                        disabled={saving}
                        className="px-10 py-4 bg-green-700 text-white rounded-[1.8rem] font-black shadow-xl shadow-green-100 hover:bg-green-800 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="material-icons">save</span>}
                        Simpan Perubahan Utama
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT PANEL: General Info */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Section 1: Content */}
                        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-gray-200/40 border border-white space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nama Organisasi</label>
                                <input
                                    type="text"
                                    className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] text-xl font-black text-gray-900 focus:border-green-500 focus:bg-white transition-all outline-none"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Deskripsi Utama</label>
                                <textarea
                                    rows="8"
                                    className="w-full p-6 bg-gray-50 border-2 border-transparent rounded-[2rem] text-gray-600 leading-relaxed focus:border-green-500 focus:bg-white transition-all outline-none ring-0 h-64"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ceritakan sejarah dan kontribusi organisasi..."
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Visi</label>
                                    <textarea
                                        rows="4"
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm italic focus:border-green-500 focus:bg-white transition-all outline-none"
                                        value={formData.vision}
                                        onChange={e => setFormData({ ...formData, vision: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Misi</label>
                                    <textarea
                                        rows="4"
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm focus:border-green-500 focus:bg-white transition-all outline-none"
                                        value={formData.mission}
                                        onChange={e => setFormData({ ...formData, mission: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>


                        {/* Section 3: Legal Docs (GRID PHOTO) */}
                        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-gray-200/40 border border-white space-y-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Galeri Legalitas & Sertifikat</h2>
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Klik gambar untuk melihat resolusi penuh</p>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Narasi Legalitas</label>
                                <textarea className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm" value={formData.legal_description} onChange={(e) => setFormData({ ...formData, legal_description: e.target.value })} placeholder="Keterangan tambahan legalitas organisasi..." />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                {aboutData?.legal_documents?.map(doc => (
                                    <div key={doc.id} className="relative group rounded-[2rem] overflow-hidden aspect-[3/4] border-4 border-gray-50 shadow-sm transition hover:shadow-xl hover:border-green-100">
                                        <img 
                                            src={getMediaUrl(doc.image)} 
                                            alt={doc.title} 
                                            className="w-full h-full object-cover cursor-pointer" 
                                            onClick={() => setFullPhoto(getMediaUrl(doc.image))}
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-4">
                                            <div className="flex gap-2">
                                                <button onClick={() => setFullPhoto(getMediaUrl(doc.image))} className="w-10 h-10 bg-white text-gray-900 rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition"><span className="material-icons text-sm">visibility</span></button>
                                                <button onClick={() => handleDeleteLegalDoc(doc.id)} className="w-10 h-10 bg-red-600 text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition"><span className="material-icons text-sm">delete</span></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <label className="border-4 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center bg-gray-50 aspect-[3/4] cursor-pointer hover:bg-green-50 hover:border-green-200 transition group">
                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'legal_doc', null)} />
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-gray-300 group-hover:text-green-500 transition mb-3">
                                        <span className="material-icons text-3xl">add_photo_alternate</span>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center px-4 leading-tight">Unggah Dokumen Baru</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Images */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-gray-200/40 border border-white space-y-6">
                            <h3 className="text-xl font-black text-gray-900 border-b border-gray-50 pb-4">Foto Utama (Hero)</h3>
                            <div className="relative group rounded-[2rem] overflow-hidden aspect-video bg-gray-100 border-4 border-white shadow-inner flex items-center justify-center cursor-pointer">
                                <img 
                                    src={getImagePreview(aboutData?.hero_image, formData.hero_image)} 
                                    className="absolute inset-0 w-full h-full object-cover transition duration-700 opacity-80 group-hover:opacity-100" 
                                    alt="Hero Preview" 
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                                <div className="relative z-10 bg-white/95 backdrop-blur px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl group-hover:scale-110 transition">Pilih Foto Hero</div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileChange(e, 'hero_image', null)} />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest">Rasio 16:9 agar tampilan optimal</p>
                        </div>

                        <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-gray-200/40 border border-white space-y-6">
                            <h3 className="text-xl font-black text-gray-900 border-b border-gray-50 pb-4">Foto Team / Struktur</h3>
                            <div className="relative group rounded-[2.5rem] overflow-hidden aspect-[3/4] bg-gray-100 border-4 border-white flex items-center justify-center cursor-pointer">
                                <img 
                                    src={getImagePreview(aboutData?.organization_structure_image, formData.organization_structure_image)} 
                                    className="absolute inset-0 w-full h-full object-cover transition duration-700 opacity-80 group-hover:opacity-100" 
                                    alt="Structure Preview" 
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                                <div className="relative z-10 bg-white/95 backdrop-blur px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl group-hover:scale-110 transition">Pilih Gambar Tim</div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileChange(e, 'organization_structure_image', null)} />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest">Ukuran Bebas. Tampil di Beranda & Tentang Kami.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FULL PHOTO OVERLAY */}
            {fullPhoto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setFullPhoto(null)}>
                    <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center border-8 border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                        <img src={fullPhoto} className="max-w-full max-h-full object-contain" alt="Full" />
                        <button onClick={() => setFullPhoto(null)} className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur transition"><span className="material-icons">close</span></button>
                    </div>
                </div>
            )}


            <NavigationButton />
            
            {cropper.show && (
                <ImageCropperModal
                    show={cropper.show}
                    image={cropper.image}
                    onClose={() => setCropper({ ...cropper, show: false })}
                    onCropComplete={(croppedFile) => {
                        if (cropper.target === 'legal_doc') {
                            setNewLegalDoc({ title: aboutData?.legal_documents?.length + 1, image: croppedFile });
                            // Trigger immediate upload for legal docs to match previous behavior
                            const autoUpload = async () => {
                                setUploadingDoc(true);
                                const user = JSON.parse(localStorage.getItem('user'));
                                const token = user?.access;
                                const fd = new FormData();
                                fd.append('about_us', aboutData.id);
                                fd.append('title', `Doc ${aboutData?.legal_documents?.length + 1}`);
                                fd.append('image', croppedFile, `legal_doc_${Date.now()}.jpg`);
                                try {
                                    await axios.post(`${API}/api/site-content/about-us-legal-docs/`, fd, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    fetchAboutUs();
                                } catch (err) { console.error(err); } finally { setUploadingDoc(false); }
                            };
                            autoUpload();
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
