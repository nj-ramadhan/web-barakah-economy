import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import ImageCropperModal from '../../components/common/ImageCropper';

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const DashboardActivitiesPage = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        header_image: null,
        content: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [cropper, setCropper] = useState({ show: false, image: null });

    const fetchActivities = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/`);
            setActivities(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("Ukuran gambar terlalu besar. Maksimal 5MB.");
                e.target.value = null;
                return;
            }
            const reader = new FileReader();
            reader.onload = () => setCropper({ show: true, image: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        const data = new FormData();
        data.append('title', formData.title);
        data.append('content', formData.content);
        data.append('date', formData.date);
        if (formData.header_image instanceof File) {
            data.append('header_image', formData.header_image);
        }

        try {
            if (isEditing) {
                await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/${currentId}/`, data, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/`, data, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }
            setShowModal(false);
            resetForm();
            fetchActivities();
            alert(isEditing ? "Kegiatan berhasil diupdate" : "Kegiatan berhasil ditambah");
        } catch (err) {
            alert("Gagal menyimpan kegiatan");
            console.error(err);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            header_image: null,
            content: '',
            date: new Date().toISOString().split('T')[0]
        });
        setIsEditing(false);
        setCurrentId(null);
    };

    const handleEdit = (activity) => {
        setFormData({
            title: activity.title,
            header_image: activity.header_image,
            content: activity.content,
            date: activity.date
        });
        setIsEditing(true);
        setCurrentId(activity.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Hapus kegiatan ini?")) return;
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.access;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchActivities();
        } catch (err) {
            alert("Gagal menghapus kegiatan");
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Manajemen Kegiatan</h1>
                        <p className="text-xs text-gray-500">Kelola informasi kegiatan komunitas</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:bg-green-800 transition"
                    >
                        + Tambah Kegiatan
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {activities.length === 0 ? (
                            <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center">
                                <span className="material-icons text-gray-300 text-5xl mb-2">event_busy</span>
                                <p className="text-gray-500 text-sm">Belum ada kegiatan yang ditambahkan.</p>
                            </div>
                        ) : (
                            activities.map(activity => (
                                <div key={activity.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                            <img src={getMediaUrl(activity.header_image)} alt={activity.title} className="h-full w-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 group-hover:text-green-700 transition">{activity.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="material-icons text-[12px] text-gray-400">calendar_today</span>
                                                <p className="text-[10px] text-gray-500">{new Date(activity.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(activity)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition">
                                            <span className="material-icons text-sm">edit</span>
                                        </button>
                                        <button onClick={() => handleDelete(activity.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition">
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">{isEditing ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 ml-1">Judul Kegiatan</label>
                                <input
                                    type="text"
                                    placeholder="Masukkan judul menarik..."
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Tanggal Kegiatan</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Gambar Header</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            required={!isEditing}
                                            className="hidden"
                                            id="header_image"
                                            onChange={handleFileChange}
                                        />
                                        <label htmlFor="header_image" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition truncate">
                                            <span className="material-icons text-green-700">image</span>
                                            {formData.header_image ? (formData.header_image.name || 'Ganti Gambar') : 'Pilih Gambar...'}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 ml-1">Keterangan / Konten</label>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-green-500 transition">
                                    {/* Placeholder for Rich Text Editor Note */}
                                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex gap-2">
                                        <button type="button" className="material-icons text-sm text-gray-400">format_bold</button>
                                        <button type="button" className="material-icons text-sm text-gray-400">format_italic</button>
                                        <button type="button" className="material-icons text-sm text-gray-400">format_list_bulleted</button>
                                        <span className="text-[10px] text-gray-400 italic ml-auto pt-1">Rich content supported</span>
                                    </div>
                                    <textarea
                                        placeholder="Tulis detail kegiatan di sini... (Mendukung HTML)"
                                        required
                                        rows="8"
                                        className="w-full p-4 bg-gray-50 border-none rounded-b-2xl text-sm focus:ring-0 transition"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    ></textarea>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">* Gunakan format [Judul Link | URL] untuk membuat link, atau masukkan URL biasa.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-4 bg-green-700 text-white rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition transform active:scale-95">
                                    {isEditing ? 'Update Kegiatan' : 'Simpan Kegiatan'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition">
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ImageCropperModal
                show={cropper.show}
                image={cropper.image}
                onClose={() => setCropper({ show: false, image: null })}
                onCropComplete={(croppedFile) => {
                    setFormData({ ...formData, header_image: croppedFile });
                    setCropper({ show: false, image: null });
                }}
                aspect={16/9}
                maxWidth={1280}
                maxHeight={720}
                title="Crop Gambar Kegiatan"
            />
            <NavigationButton />
        </div>
    );
};

export default DashboardActivitiesPage;
