import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import ImageCropperModal from '../../components/common/ImageCropper';

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const DashboardPartnersPage = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', logo: null, order: 0 });
    const [cropper, setCropper] = useState({ active: false, image: null });

    const fetchPartners = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/partners/`);
            setPartners(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        const data = new FormData();
        data.append('name', formData.name);
        data.append('order', formData.order);
        data.append('description', formData.description || '');
        data.append('type', formData.type || 'partner');
        if (formData.logo) data.append('logo', formData.logo);

        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/partners/`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setShowModal(false);
            setFormData({ name: '', logo: null, order: 0 });
            fetchPartners();
        } catch (err) {
            alert("Gagal menambah partner");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus partner ini?")) return;
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/partners/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPartners();
        } catch (err) {
            alert("Gagal menghapus partner");
        }
    };

    return (
        <div className="body">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold">Manajemen Partner</h1>
                    <button onClick={() => setShowModal(true)} className="bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                        + Tambah Partner
                    </button>
                </div>

                <div className="space-y-4">
                    {partners.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={getMediaUrl(p.logo)} alt={p.name} className="h-10 w-16 object-contain" />
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{p.name}</p>
                                    <p className="text-[10px] text-gray-400">Order: {p.order}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(p.id)} className="material-icons text-red-400">delete</button>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up">
                        <h3 className="text-lg font-bold mb-4">Tambah Partner Baru</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    placeholder="Nama Partner" 
                                    required 
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <select 
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm appearance-none"
                                        value={formData.type || 'partner'}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="partner">Partner Kami</option>
                                        <option value="mitra">Mitra Kami</option>
                                    </select>
                                    <input 
                                        type="number" 
                                        placeholder="Order" 
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm" 
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: e.target.value })} 
                                    />
                                </div>
                                <textarea 
                                    placeholder="Deskripsi Partner (untuk modal)" 
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm" 
                                    rows="3"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Logo Partner (1:1 Recommended)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                                            {formData.logo ? (
                                                <img 
                                                    src={formData.logo instanceof File ? URL.createObjectURL(formData.logo) : getMediaUrl(formData.logo)} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-contain" 
                                                />
                                            ) : <span className="material-icons text-gray-300 text-lg">image</span>}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="partner-logo-upload"
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
                                        <label 
                                            htmlFor="partner-logo-upload"
                                            className="flex-1 py-2 text-center bg-green-50 text-green-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-green-100 transition"
                                        >
                                            Pilih & Potong Logo
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button type="submit" className="flex-1 py-3 bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition">
                                        {formData.id ? 'Simpan' : 'Tambah'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setShowModal(false); setFormData({ name: '', logo: null, order: 0, description: '', type: 'partner' }); }} 
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
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
                    aspect={1}
                    onCropComplete={async (croppedImageUrl) => {
                        const response = await fetch(croppedImageUrl);
                        const blob = await response.blob();
                        const file = new File([blob], 'partner_logo.jpg', { type: 'image/jpeg' });
                        setFormData({ ...formData, logo: file });
                        setCropper({ active: false, image: null });
                    }}
                    onCancel={() => setCropper({ active: false, image: null })}
                />
            )}
            <NavigationButton />
        </div>
    );
};

export default DashboardPartnersPage;
