import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const DashboardTestimonialsPage = () => {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', content: '', rating: 5 });

    const fetchTestimonials = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTestimonials(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTestimonials();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('access_token');
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setFormData({ name: '', content: '', rating: 5 });
            fetchTestimonials();
        } catch (err) {
            alert("Gagal menambah testimoni");
        }
    };

    const handleApprove = async (id, status) => {
        const token = localStorage.getItem('access_token');
        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/${id}/`, { is_approved: status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTestimonials();
        } catch (err) {
            alert("Gagal update status");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus testimoni ini?")) return;
        const token = localStorage.getItem('access_token');
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTestimonials();
        } catch (err) {
            alert("Gagal menghapus testimoni");
        }
    };

    return (
        <div className="body">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold">Manajemen Testimoni</h1>
                    <button onClick={() => setShowModal(true)} className="bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                        + Tambah Testimoni Admin
                    </button>
                </div>

                <div className="space-y-4">
                    {testimonials.map(t => (
                        <div key={t.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${t.is_approved ? 'border-gray-100' : 'border-yellow-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{t.username || t.name}</p>
                                    <div className="flex text-orange-400">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className="material-icons text-xs">{i < t.rating ? 'star' : 'star_border'}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!t.is_approved && (
                                        <button onClick={() => handleApprove(t.id, true)} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[10px] font-bold">Approve</button>
                                    )}
                                    {t.is_approved && (
                                        <button onClick={() => handleApprove(t.id, false)} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-[10px] font-bold">Unapprove</button>
                                    )}
                                    <button onClick={() => handleDelete(t.id)} className="text-red-400 material-icons text-sm">delete</button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 italic">"{t.content}"</p>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up">
                        <h3 className="text-lg font-bold mb-4">Tambah Testimoni Admin</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input type="text" placeholder="Nama Pemberi Testimoni" required className="w-full p-3 bg-gray-50 rounded-xl text-sm" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            <select className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: e.target.value })}>
                                {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>Rating {r}</option>)}
                            </select>
                            <textarea placeholder="Konten Testimoni" required rows="3" className="w-full p-3 bg-gray-50 rounded-xl text-sm" onChange={(e) => setFormData({ ...formData, content: e.target.value })}></textarea>
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

export default DashboardTestimonialsPage;
