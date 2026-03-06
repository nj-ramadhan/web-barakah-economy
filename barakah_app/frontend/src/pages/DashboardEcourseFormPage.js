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
    const [error, setError] = useState(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('it');
    const [price, setPrice] = useState('');
    const [discount, setDiscount] = useState('0');
    const [isActive, setIsActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [hasCertificate, setHasCertificate] = useState(false);
    const [certificateInfo, setCertificateInfo] = useState('');
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
                    setHasCertificate(data.has_certificate || false);
                    setCertificateInfo(data.certificate_info || '');
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
        setError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('discount', discount);
        formData.append('is_active', isActive);
        formData.append('is_featured', isFeatured);
        formData.append('has_certificate', hasCertificate);
        formData.append('certificate_info', certificateInfo);
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
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Gagal menyimpan kursus. Periksa kembali input Anda.';
            setError(msg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
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

            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-gray-100 px-4 py-3 mb-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard/ecourses')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-gray-800 uppercase tracking-widest leading-none mb-1">E-Course</h1>
                            <p className="text-lg font-extrabold text-green-800 leading-none">{isEdit ? 'Edit Info Kursus' : 'Tambah E-Course Baru'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pb-24">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl animate-shake">
                        <div className="flex items-center gap-3 text-red-700">
                            <span className="material-icons">error_outline</span>
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    </div>
                )}

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
                        <p className="mt-2 text-[10px] font-semibold text-red-500 flex items-center gap-1 leading-none">
                            <span className="material-icons text-[12px]">info</span>
                            Jika gambar terlalu besar ({">"}2MB), upload akan gagal. Harap kecilkan ukuran gambar sebelum upload.
                        </p>
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
                            <p className="text-[10px] text-gray-400 mt-1 italic">Isi 0 jika kursus ini Gratis</p>
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

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 bg-gray-50 border border-transparent p-4 rounded-xl cursor-pointer hover:border-blue-100 transition" onClick={() => setHasCertificate(!hasCertificate)}>
                            <input
                                type="checkbox"
                                checked={hasCertificate}
                                onChange={() => setHasCertificate(!hasCertificate)}
                                className="w-5 h-5 mt-0.5 rounded text-blue-700 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-800">Sertifikat Tersedia</p>
                                <p className="text-[10px] text-gray-500">Beri tahu siswa bahwa mereka akan mendapatkan sertifikat setelah selesai.</p>
                            </div>
                        </div>

                        {hasCertificate && (
                            <div className="animate-slide-up">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Informasi Pengiriman Sertifikat</label>
                                <textarea
                                    value={certificateInfo}
                                    onChange={(e) => setCertificateInfo(e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    placeholder="Contoh: Sertifikat akan dikirim via Email dalam 1x24 jam setelah pengisian form detail."
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Catatan ini akan muncul saat siswa selesai menonton semua materi.</p>
                            </div>
                        )}
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
