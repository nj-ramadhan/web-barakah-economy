import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import ImageCropperModal from '../../components/common/ImageCropper';
import { getMediaUrl } from '../../utils/mediaUtils';

const DashboardHeroBannersPage = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ 
        id: null, 
        title: '', 
        subtitle: '', 
        image: null, 
        video: null, 
        target_url: '', 
        order: 0, 
        is_active: true 
    });
    const [cropper, setCropper] = useState({ active: false, image: null });

    const fetchBanners = async () => {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/hero-banners/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBanners(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        
        const data = new FormData();
        data.append('title', formData.title);
        data.append('subtitle', formData.subtitle || '');
        data.append('target_url', formData.target_url || '');
        data.append('order', formData.order);
        data.append('is_active', formData.is_active);
        
        if (formData.image instanceof File) data.append('image', formData.image);
        if (formData.video instanceof File) data.append('video', formData.video);

        try {
            if (formData.id) {
                await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/hero-banners/${formData.id}/`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/hero-banners/`, data, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            resetForm();
            fetchBanners();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            alert(`Gagal ${formData.id ? 'mengupdate' : 'menambah'} banner: ${errorMsg}`);
        }
    };

    const resetForm = () => {
        setFormData({ 
            id: null, 
            title: '', 
            subtitle: '', 
            image: null, 
            video: null, 
            target_url: '', 
            order: 0, 
            is_active: true 
        });
    };

    const handleEdit = (banner) => {
        setFormData({
            id: banner.id,
            title: banner.title,
            subtitle: banner.subtitle || '',
            image: banner.image,
            video: banner.video,
            target_url: banner.target_url || '',
            order: banner.order,
            is_active: banner.is_active
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus banner ini?")) return;
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/hero-banners/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBanners();
        } catch (err) {
            alert("Gagal menghapus banner");
        }
    };

    return (
        <div className="body">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => window.history.back()} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">Manajemen Hero Banner</h1>
                        <p className="text-[11px] text-gray-500">Kelola konten visual (Gambar/Video) di bagian atas Landing Page</p>
                    </div>
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition transform active:scale-95">
                        + Tambah Banner
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {banners.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
                                Belum ada banner. Klik tombol + untuk menambahkan.
                            </div>
                        ) : (
                            banners.map(banner => (
                                <div key={banner.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group hover:border-green-300 transition-all flex flex-col md:flex-row">
                                    <div className="md:w-64 h-48 md:h-auto relative bg-gray-900">
                                        {banner.video ? (
                                            <video 
                                                src={getMediaUrl(banner.video)} 
                                                className="w-full h-full object-cover"
                                                muted
                                                loop
                                                autoPlay
                                            />
                                        ) : (
                                            <img 
                                                src={getMediaUrl(banner.image)} 
                                                alt={banner.title} 
                                                className="w-full h-full object-cover" 
                                            />
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                            <span className="material-icons text-[10px]">{banner.video ? 'videocam' : 'image'}</span>
                                            {banner.video ? 'VIDEO' : 'IMAGE'}
                                        </div>
                                        {!banner.is_active && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                                                <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Non-Aktif</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-gray-900">{banner.title}</h3>
                                                <span className="bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded">Order: {banner.order}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{banner.subtitle || 'Tidak ada subjudul'}</p>
                                            {banner.target_url && (
                                                <a href={banner.target_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:underline">
                                                    <span className="material-icons text-[10px]">link</span> {banner.target_url}
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                                            <button onClick={() => handleEdit(banner)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-1">
                                                <span className="material-icons text-sm">edit</span> Edit
                                            </button>
                                            <button onClick={() => handleDelete(banner.id)} className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-1">
                                                <span className="material-icons text-sm">delete</span> Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">{formData.id ? 'Edit Banner' : 'Tambah Banner Baru'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Judul Banner</label>
                                    <input 
                                        type="text" 
                                        placeholder="Contoh: Promo Ramadhan Berkah" 
                                        required 
                                        className="w-full p-3.5 bg-gray-50 border-2 border-gray-50 focus:border-green-500 focus:bg-white rounded-2xl text-sm transition-all" 
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Deskripsi / Subjudul</label>
                                    <textarea 
                                        placeholder="Deskripsi singkat yang tampil di bawah judul" 
                                        className="w-full p-3.5 bg-gray-50 border-2 border-gray-50 focus:border-green-500 focus:bg-white rounded-2xl text-sm transition-all" 
                                        rows="2"
                                        value={formData.subtitle}
                                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                    ></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Urutan Tampil</label>
                                        <input 
                                            type="number" 
                                            placeholder="Order (0, 1, 2...)" 
                                            className="w-full p-3.5 bg-gray-50 border-2 border-gray-50 focus:border-green-500 focus:bg-white rounded-2xl text-sm transition-all" 
                                            value={formData.order}
                                            onChange={(e) => setFormData({ ...formData, order: e.target.value })} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Status</label>
                                        <select 
                                            className="w-full p-3.5 bg-gray-50 border-2 border-gray-50 focus:border-green-500 focus:bg-white rounded-2xl text-sm transition-all appearance-none"
                                            value={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                                        >
                                            <option value="true">Aktif</option>
                                            <option value="false">Non-Aktif</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Link Tujuan (Opsional)</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://barakah.cloud/produk/..." 
                                        className="w-full p-3.5 bg-gray-50 border-2 border-gray-50 focus:border-green-500 focus:bg-white rounded-2xl text-sm transition-all" 
                                        value={formData.target_url}
                                        onChange={(e) => setFormData({ ...formData, target_url: e.target.value })} 
                                    />
                                </div>

                                {/* Media Upload Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Image Upload */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Foto Banner (16:9)</label>
                                        <div className="relative group">
                                            <div className="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group-hover:border-green-400 transition-all">
                                                {formData.image ? (
                                                    <img 
                                                        src={formData.image instanceof File ? URL.createObjectURL(formData.image) : getMediaUrl(formData.image)} 
                                                        alt="Preview" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : <span className="material-icons text-gray-300 text-3xl">add_photo_alternate</span>}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = () => {
                                                                setCropper({ active: true, image: reader.result });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            {formData.image && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setFormData({ ...formData, image: null }); }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition"
                                                >
                                                    <span className="material-icons text-[14px]">close</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Video Upload */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">Video Banner (Landscape)</label>
                                        <div className="relative group">
                                            <div className="w-full aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group-hover:border-blue-400 transition-all">
                                                {formData.video ? (
                                                    <video 
                                                        src={formData.video instanceof File ? URL.createObjectURL(formData.video) : getMediaUrl(formData.video)} 
                                                        className="w-full h-full object-cover"
                                                        muted
                                                    />
                                                ) : <span className="material-icons text-gray-300 text-3xl">videocam</span>}
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            setFormData({ ...formData, video: file });
                                                        }
                                                    }}
                                                />
                                            </div>
                                            {formData.video && (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setFormData({ ...formData, video: null }); }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition"
                                                >
                                                    <span className="material-icons text-[14px]">close</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 italic">* Jika keduanya diisi, video akan diprioritaskan. Gunakan aspek rasio 16:9 untuk hasil terbaik.</p>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="flex-[2] py-4 bg-green-700 text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-green-800 transition transform active:scale-[0.98]">
                                        {formData.id ? 'Simpan Perubahan' : 'Terbitkan Banner'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)} 
                                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {cropper.active && (
                <ImageCropperModal 
                    image={cropper.image}
                    aspect={16 / 9}
                    maxWidth={1920}
                    maxHeight={1080}
                    onCropComplete={(croppedBlob) => {
                        const file = new File([croppedBlob], 'banner_image.jpg', { type: 'image/jpeg' });
                        setFormData({ ...formData, image: file });
                        setCropper({ active: false, image: null });
                    }}
                    onCancel={() => setCropper({ active: false, image: null })}
                />
            )}
            <NavigationButton />
        </div>
    );
};

export default DashboardHeroBannersPage;
