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
    
    // Personnel States
    const [personnelList, setPersonnelList] = useState([]);
    const [editingPersonnel, setEditingPersonnel] = useState(null);
    const [showPersonnelModal, setShowPersonnelModal] = useState(false);
    const [personnelFormData, setPersonnelFormData] = useState({
        name: '',
        job_title: '',
        hierarchy_code: '',
        order: 0,
        image: null,
        social_media: []
    });

    const [newLegalDoc, setNewLegalDoc] = useState({ title: '', image: null });
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [cropper, setCropper] = useState({ show: false, image: null, target: null, aspect: 1/1, personnelIdx: null });
    
    const getMediaUrl = (path, file) => {
        if (file instanceof Blob) return URL.createObjectURL(file);
        if (!path) return '';
        if (path.startsWith('http')) return path;
        
        // Extract origin from API URL (e.g. https://domain.com/api -> https://domain.com)
        const origin = API.replace(/\/api\/?$/, '');
        
        let cleanPath = path;
        // If path already has /media/ or media/, just ensure it has leading slash
        if (cleanPath.startsWith('/media/') || cleanPath.startsWith('media/')) {
            cleanPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
        } else {
            // Otherwise prepend /media/
            cleanPath = cleanPath.startsWith('/') ? `/media${cleanPath}` : `/media/${cleanPath}`;
        }
        
        return `${origin}${cleanPath}`;
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
                setPersonnelList(data.personnel || []);
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
            const reader = new FileReader();
            reader.onload = () => setCropper({ show: true, image: reader.result, target, aspect, personnelIdx });
            reader.readAsDataURL(file);
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
        
        if (formData.hero_image instanceof File || formData.hero_image instanceof Blob) {
            fd.append('hero_image', formData.hero_image);
        }
        if (formData.organization_structure_image instanceof File || formData.organization_structure_image instanceof Blob) {
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
            alert('Berhasil! Profil organisasi telah diperbarui.');
            fetchAboutUs();
        } catch (err) {
            console.error('Error saving About Us:', err);
            alert('Gagal menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    };

    // --- Personnel Management ---
    const handleOpenPersonnelModal = (person = null) => {
        if (person) {
            setEditingPersonnel(person);
            setPersonnelFormData({
                name: person.name,
                job_title: person.job_title,
                hierarchy_code: person.hierarchy_code,
                order: person.order || 0,
                image: null,
                social_media: person.social_media || []
            });
        } else {
            setEditingPersonnel(null);
            setPersonnelFormData({
                name: '',
                job_title: '',
                hierarchy_code: '',
                order: 0,
                image: null,
                social_media: []
            });
        }
        setShowPersonnelModal(true);
    };

    const handleSavePersonnel = async () => {
        if (!personnelFormData.name || !personnelFormData.job_title || !personnelFormData.hierarchy_code) {
            alert('Lengkapi nama, jabatan, dan kode hierarki');
            return;
        }

        setSaving(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;

        const fd = new FormData();
        fd.append('about_us', aboutData.id);
        fd.append('name', personnelFormData.name);
        fd.append('job_title', personnelFormData.job_title);
        fd.append('hierarchy_code', personnelFormData.hierarchy_code);
        fd.append('order', personnelFormData.order);
        
        if (personnelFormData.image instanceof File || personnelFormData.image instanceof Blob) {
            fd.append('image', personnelFormData.image);
        }

        try {
            let personId = editingPersonnel?.id;
            if (personId) {
                await axios.patch(`${API}/api/site-content/personnel/${personId}/`, fd, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
            } else {
                const res = await axios.post(`${API}/api/site-content/personnel/`, fd, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
                personId = res.data.id;
            }

            // Save Social Media
            // Strategy: Get existing IDs and delete them, then add from personnelFormData.social_media
            if (editingPersonnel?.id && editingPersonnel.social_media) {
                for (const sm of editingPersonnel.social_media) {
                    await axios.delete(`${API}/api/site-content/personnel-social-media/${sm.id}/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
            }

            for (const sm of personnelFormData.social_media) {
                await axios.post(`${API}/api/site-content/personnel-social-media/`, {
                    personnel: personId,
                    icon: sm.icon,
                    link: sm.link
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            setShowPersonnelModal(false);
            fetchAboutUs();
        } catch (err) {
            console.error('Error saving personnel:', err);
            alert('Gagal menyimpan data personil');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePersonnel = async (id) => {
        if (!window.confirm('Hapus personil ini?')) return;
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        try {
            await axios.delete(`${API}/api/site-content/personnel/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAboutUs();
        } catch (err) {
            console.error('Error deleting personnel:', err);
        }
    };

    const addSocialMedia = () => {
        setPersonnelFormData({
            ...personnelFormData,
            social_media: [...personnelFormData.social_media, { icon: 'instagram', link: '' }]
        });
    };

    const handleSocialChange = (idx, field, val) => {
        const newList = [...personnelFormData.social_media];
        newList[idx][field] = val;
        setPersonnelFormData({ ...personnelFormData, social_media: newList });
    };

    const removeSocial = (idx) => {
        setPersonnelFormData({
            ...personnelFormData,
            social_media: personnelFormData.social_media.filter((_, i) => i !== idx)
        });
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

                        {/* Section 2: Personnel Management */}
                        <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl shadow-gray-200/40 border border-white">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">Daftar Personil (Bagan)</h2>
                                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mt-1">Gunakan kode hirarki (1, 1.1, 1.1.1) untuk bagan pohon</p>
                                </div>
                                <button 
                                    onClick={() => handleOpenPersonnelModal()}
                                    className="w-14 h-14 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center hover:bg-green-700 hover:text-white transition shadow-lg shadow-green-50"
                                >
                                    <span className="material-icons text-3xl">person_add</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {personnelList.length > 0 ? (
                                    personnelList.map((p) => (
                                        <div key={p.id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-5 group hover:bg-white hover:shadow-xl hover:border-green-100 transition-all duration-300">
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                                                <img src={getMediaUrl(p.image)} alt={p.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none mb-1">{p.hierarchy_code}</p>
                                                <h4 className="font-black text-gray-900 truncate">{p.name}</h4>
                                                <p className="text-xs text-gray-500 font-medium truncate">{p.job_title}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleOpenPersonnelModal(p)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition"><span className="material-icons text-sm">edit</span></button>
                                                <button onClick={() => handleDeletePersonnel(p.id)} className="p-2 text-red-300 hover:bg-red-50 rounded-lg transition"><span className="material-icons text-sm">delete</span></button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-10 text-center text-gray-300 italic font-medium">Belum ada personil yang ditambahkan.</div>
                                )}
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
                                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'legal_doc', 3/4)} />
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
                                    src={getMediaUrl(aboutData?.hero_image, formData.hero_image)} 
                                    className="absolute inset-0 w-full h-full object-cover transition duration-700 opacity-80 group-hover:opacity-100" 
                                    alt="Hero Preview" 
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                                <div className="relative z-10 bg-white/95 backdrop-blur px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl group-hover:scale-110 transition">Pilih Foto Hero</div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileChange(e, 'hero_image', 16/9)} />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest">Rasio 16:9 agar tampilan optimal</p>
                        </div>

                        <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-gray-200/40 border border-white space-y-6">
                            <h3 className="text-xl font-black text-gray-900 border-b border-gray-50 pb-4">Struktur (Bagan Fix)</h3>
                            <div className="relative group rounded-[2.5rem] overflow-hidden aspect-[3/4] bg-gray-100 border-4 border-white flex items-center justify-center cursor-pointer">
                                <img 
                                    src={getMediaUrl(aboutData?.organization_structure_image, formData.organization_structure_image)} 
                                    className="absolute inset-0 w-full h-full object-cover transition duration-700 opacity-80 group-hover:opacity-100" 
                                    alt="Structure Preview" 
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                                <div className="relative z-10 bg-white/95 backdrop-blur px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl group-hover:scale-110 transition">Ubah Gambar Bagan</div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileChange(e, 'organization_structure_image', 3/4)} />
                            </div>
                            <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest">Gunakan Gambar PNG/JPG resolusi tinggi</p>
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

            {/* PERSONNEL MODAL */}
            {showPersonnelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-2xl font-black text-gray-900">{editingPersonnel ? 'Edit Personil' : 'Tambah Personil'}</h3>
                            <button onClick={() => setShowPersonnelModal(false)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 transition"><span className="material-icons">close</span></button>
                        </div>
                        <div className="p-8 pt-0 overflow-y-auto flex-1 space-y-6">
                            <div className="flex flex-col md:flex-row gap-8 mt-4">
                                <div className="md:w-1/3 flex flex-col items-center">
                                    <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden bg-gray-100 border-4 border-white shadow-xl group cursor-pointer">
                                        <img 
                                            src={getMediaUrl(editingPersonnel?.image, personnelFormData.image)} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                                            alt="Profile"
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                                            <span className="material-icons text-white">add_a_photo</span>
                                        </div>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e => handleFileChange(e, 'personnel_image', 1/1)} />
                                    </div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-3">Pass Foto (1:1)</p>
                                </div>
                                <div className="md:w-2/3 space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                                        <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-base font-black outline-none focus:ring-2 focus:ring-green-500 transition" value={personnelFormData.name} onChange={e => setPersonnelFormData({...personnelFormData, name: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Jabatan</label>
                                            <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 transition" value={personnelFormData.job_title} onChange={e => setPersonnelFormData({...personnelFormData, job_title: e.target.value})} placeholder="CEO, Manager, dll" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hirarki (1.1, 1.2...)</label>
                                            <input type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-green-500 transition" value={personnelFormData.hierarchy_code} onChange={e => setPersonnelFormData({...personnelFormData, hierarchy_code: e.target.value})} placeholder="Contoh: 1.1" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Urutan (Angka)</label>
                                        <input type="number" className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-green-500 transition" value={personnelFormData.order} onChange={e => setPersonnelFormData({...personnelFormData, order: parseInt(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-black text-gray-900 border-l-4 border-green-600 pl-3">Media Sosial</h4>
                                    <button onClick={addSocialMedia} className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-black hover:bg-green-700 hover:text-white transition">+ Tambah Sosmed</button>
                                </div>
                                <div className="space-y-3">
                                    {personnelFormData.social_media.map((sm, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select 
                                                className="p-3 bg-gray-50 border-none rounded-xl text-xs font-bold outline-none"
                                                value={sm.icon}
                                                onChange={(e) => handleSocialChange(idx, 'icon', e.target.value)}
                                            >
                                                <option value="instagram">Instagram</option>
                                                <option value="facebook">Facebook</option>
                                                <option value="linkedin">LinkedIn</option>
                                                <option value="twitter">X (Twitter)</option>
                                                <option value="whatsapp">WhatsApp</option>
                                                <option value="language">Website</option>
                                            </select>
                                            <input 
                                                type="text" 
                                                className="flex-1 p-3 bg-gray-50 border-none rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-blue-400"
                                                placeholder="https://..."
                                                value={sm.link}
                                                onChange={(e) => handleSocialChange(idx, 'link', e.target.value)}
                                            />
                                            <button onClick={() => removeSocial(idx)} className="text-red-300 hover:text-red-500 transition"><span className="material-icons">delete_outline</span></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 pt-4 bg-gray-50/50 flex gap-4">
                            <button onClick={() => setShowPersonnelModal(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black transition hover:bg-gray-100">Batal</button>
                            <button onClick={handleSavePersonnel} disabled={saving} className="flex-1 py-4 bg-green-700 text-white rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-800 transition transform active:scale-95 disabled:opacity-50">
                                {saving ? 'Ganti Menyimpan...' : 'Simpan Data'}
                            </button>
                        </div>
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
                                fd.append('image', croppedFile);
                                try {
                                    await axios.post(`${API}/api/site-content/about-us-legal-docs/`, fd, {
                                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                                    });
                                    fetchAboutUs();
                                } catch (err) { console.error(err); } finally { setUploadingDoc(false); }
                            };
                            autoUpload();
                        } else if (cropper.target === 'personnel_image') {
                            setPersonnelFormData({ ...personnelFormData, image: croppedFile });
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
