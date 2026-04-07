import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/layout/Header';
import ImageCropperModal from '../../components/common/ImageCropper';
import CKEditor from '../../components/common/CKEditor';

const DashboardAboutUsPage = () => {
    const [aboutUs, setAboutUs] = useState({
        title: '',
        description: '',
        vision: '',
        mission: '',
        hero_image: null,
        organization_structure_image: null
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cropper, setCropper] = useState({ active: false, image: null, type: null });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/about-us/`);
                const data = res.data.results || res.data;
                if (data && data.length > 0) {
                    setAboutUs(data[0]);
                } else if (data && !Array.isArray(data)) {
                    setAboutUs(data);
                }
            } catch (err) {
                console.error("Error fetching About Us:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAboutUs(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropper({ active: true, image: reader.result, type });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedImageUrl) => {
        const response = await fetch(croppedImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${cropper.type}.jpg`, { type: 'image/jpeg' });
        
        setAboutUs(prev => ({ ...prev, [cropper.type]: file }));
        setCropper({ active: false, image: null, type: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const formData = new FormData();
        
        formData.append('title', aboutUs.title);
        formData.append('description', aboutUs.description);
        formData.append('vision', aboutUs.vision);
        formData.append('mission', aboutUs.mission);
        
        if (aboutUs.hero_image instanceof File) {
            formData.append('hero_image', aboutUs.hero_image);
        }
        if (aboutUs.organization_structure_image instanceof File) {
            formData.append('organization_structure_image', aboutUs.organization_structure_image);
        }

        try {
            const method = aboutUs.id ? 'patch' : 'post';
            const url = aboutUs.id 
                ? `${process.env.REACT_APP_API_BASE_URL}/api/site-content/about-us/${aboutUs.id}/`
                : `${process.env.REACT_APP_API_BASE_URL}/api/site-content/about-us/`;
            
            await axios({
                method,
                url,
                data: formData,
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.access}`
                }
            });
            alert('Konten Tentang Kami berhasil diperbarui!');
        } catch (err) {
            console.error(err);
            alert('Gagal memperbarui konten.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />
            <div className="max-w-4xl mx-auto px-4 pt-10">
                <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
                    <div className="bg-green-700 p-8 text-white">
                        <h1 className="text-2xl font-bold">Manajemen Tentang Kami</h1>
                        <p className="text-green-100 text-sm mt-1">Kelola visi, misi, dan struktur organisasi</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* Hero Image */}
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">Hero Image (Banner)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="h-40 bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center">
                                    {aboutUs.hero_image ? (
                                        <img 
                                            src={aboutUs.hero_image instanceof File ? URL.createObjectURL(aboutUs.hero_image) : aboutUs.hero_image} 
                                            className="w-full h-full object-cover" 
                                            alt="Preview"
                                        />
                                    ) : (
                                        <span className="material-icons text-gray-300 text-4xl">image</span>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, 'hero_image')}
                                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 uppercase">Judul Halaman</label>
                            <input 
                                type="text"
                                name="title"
                                value={aboutUs.title}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition"
                            />
                        </div>

                        {/* Vision & Mission */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 uppercase">Visi</label>
                                <textarea 
                                    name="vision"
                                    rows="4"
                                    value={aboutUs.vision}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700 uppercase">Misi</label>
                                <textarea 
                                    name="mission"
                                    rows="4"
                                    value={aboutUs.mission}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition text-sm"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 uppercase">Deskripsi Lengkap</label>
                            <textarea 
                                name="description"
                                rows="8"
                                value={aboutUs.description}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 transition text-sm"
                            />
                        </div>

                        {/* Organization Structure */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider text-green-700">Struktur Organisasi (Hero Image 2)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="h-64 bg-gray-100 rounded-2xl overflow-hidden border-2 border-dashed border-green-200 flex items-center justify-center">
                                    {aboutUs.organization_structure_image ? (
                                        <img 
                                            src={aboutUs.organization_structure_image instanceof File ? URL.createObjectURL(aboutUs.organization_structure_image) : aboutUs.organization_structure_image} 
                                            className="w-full h-full object-contain" 
                                            alt="Structure Preview"
                                        />
                                    ) : (
                                        <div className="text-center text-gray-300">
                                            <span className="material-icons text-5xl">account_tree</span>
                                            <p className="text-[10px] mt-1 font-bold">BELUM ADA GAMBAR</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <p className="text-xs text-gray-500">Upload bagan struktur organisasi dalam format gambar yang jelas (Rekomendasi: Landscape/Horizontal)</p>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={(e) => handleFileSelect(e, 'organization_structure_image')}
                                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            disabled={submitting}
                            className={`w-full py-4 bg-green-700 text-white rounded-2xl font-bold shadow-xl shadow-green-100 transition active:scale-[0.98] ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-800'}`}
                        >
                            {submitting ? 'MENYIMPAN...' : 'SIMPAN SEMUA PERUBAHAN'}
                        </button>
                    </form>
                </div>
            </div>

            {cropper.active && (
                <ImageCropperModal 
                    image={cropper.image}
                    aspect={cropper.type === 'organization_structure_image' ? 4/3 : 16/9}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropper({ active: false, image: null, type: null })}
                />
            )}
        </div>
    );
};

export default DashboardAboutUsPage;
