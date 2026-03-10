import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

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
    const navigate = useNavigate();

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
        const token = localStorage.getItem('access_token');
        const data = new FormData();
        data.append('name', formData.name);
        data.append('order', formData.order);
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
        const token = localStorage.getItem('access_token');
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
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" placeholder="Nama Partner" required className="w-full p-3 bg-gray-50 rounded-xl text-sm" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            <input type="number" placeholder="Order" className="w-full p-3 bg-gray-50 rounded-xl text-sm" onChange={(e) => setFormData({ ...formData, order: e.target.value })} />
                            <input type="file" accept="image/*" required className="text-xs" onChange={(e) => setFormData({ ...formData, logo: e.target.files[0] })} />
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 py-3 bg-green-700 text-white rounded-xl font-bold">Simpan</button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Batal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <NavigationButton />
        </div>
    );
};

export default DashboardPartnersPage;
