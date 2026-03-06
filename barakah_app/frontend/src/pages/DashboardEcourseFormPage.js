// pages/DashboardEcourseFormPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { createCourse, updateCourse, getCourseDetail } from '../services/ecourseApi';
import '../styles/Body.css';

const CATEGORY_CHOICES = [
    { value: 'it', label: 'Programming & Development' },
    { value: 'bisnis', label: 'Business & Entrepreneurship' },
    { value: 'kreatif', label: 'Design & Creativity' },
    { value: 'personal', label: 'Personal Development' },
    { value: 'akademik', label: 'Academics & Test Prep' },
];

const DashboardEcourseFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('it');
    const [price, setPrice] = useState('');
    const [discount, setDiscount] = useState('0');
    const [isActive, setIsActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);

    useEffect(() => {
        if (isEdit) {
            const fetchDetail = async () => {
                try {
                    const res = await getCourseDetail(id); // Backend supports detail by ID too now
                    const data = res.data;
                    setTitle(data.title);
                    setDescription(data.description);
                    setCategory(data.category);
                    setPrice(data.price.toString());
                    setDiscount(data.discount.toString());
                    setIsActive(data.is_active);
                    setIsFeatured(data.is_featured);
                    setThumbnailPreview(data.thumbnail);
                } catch (err) {
                    console.error(err);
                    alert('Gagal mengambil data kursus');
                    navigate('/dashboard/ecourses');
                } finally {
                    setLoading(false);
                }
            };
            fetchDetail();
        }
    }, [id, isEdit, navigate]);

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Ukuran gambar terlalu besar. Maksimal 2MB.');
                return;
            }
            setThumbnail(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('discount', discount);
        formData.append('is_active', isActive);
        formData.append('is_featured', isFeatured);
        if (thumbnail) {
            formData.append('thumbnail', thumbnail);
        }

        try {
            if (isEdit) {
                await updateCourse(id, formData);
                alert('Kursus berhasil diperbarui');
            } else {
                const res = await createCourse(formData);
                alert('Kursus berhasil dibuat. Silakan tambahkan materi.');
                navigate(`/dashboard/ecourses/${res.data.id}/materials`);
                return;
            }
            navigate('/dashboard/ecourses');
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan kursus. Periksa kembali input Anda.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="body flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>{isEdit ? 'Edit Kursus' : 'Buat Kursus Baru'} - Dashboard</title>
            </Helmet>

            <Header />

            <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
                <div className="flex items-center gap-2 mb-6 text-gray-400">
                    <button onClick={() => navigate('/dashboard/ecourses')} className="hover:text-green-700 transition">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Info Kursus' : 'Buat Kursus Baru'}</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                    {/* Thumbnail Upload */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Thumbnail Kursus</label>
                        <div
                            onClick={() => document.getElementById('course-thumb').click()}
                            className="aspect-video border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition overflow-hidden"
                        >
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <span className="material-icons text-gray-300 text-4xl mb-2">add_photo_alternate</span>
                                    <p className="text-xs text-gray-400">Upload Banner / Cover Kursus</p>
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Rekomendasi 1280x720px (Maks 2MB)</p>
                                </>
                            )}
                        </div>
                        <input
                            id="course-thumb"
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            className="hidden"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Judul Kursus *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                            placeholder="Contoh: Mastering Digital Marketing 2024"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deskripsi Singkat *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                            placeholder="Jelaskan apa saja yang akan dipelajari di kursus ini..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                            >
                                {CATEGORY_CHOICES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Harga (Rp) *</label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                placeholder="Harga Jual"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-pointer" onClick={() => setIsActive(!isActive)}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => setIsActive(!isActive)}
                                className="w-5 h-5 rounded text-green-700 focus:ring-green-500"
                            />
                            <div>
                                <p className="text-sm font-bold text-gray-800">Aktif</p>
                                <p className="text-[10px] text-gray-500">Tampilkan ke publik</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-pointer" onClick={() => setIsFeatured(!isFeatured)}>
                            <input
                                type="checkbox"
                                checked={isFeatured}
                                onChange={() => setIsFeatured(!isFeatured)}
                                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <div>
                                <p className="text-sm font-bold text-gray-800">Unggulan</p>
                                <p className="text-[10px] text-gray-500">Muncul di halaman utama</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-green-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-50"
                        >
                            {submitting ? 'Sedang Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Kursus & Lanjut ke Materi')}
                        </button>
                    </div>
                </form>
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardEcourseFormPage;
