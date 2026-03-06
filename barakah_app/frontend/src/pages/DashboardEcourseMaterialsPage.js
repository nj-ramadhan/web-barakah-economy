// pages/DashboardEcourseMaterialsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getCourseMaterials, createMaterial, updateMaterial, deleteMaterial, getCourseDetail } from '../services/ecourseApi';
import '../styles/Body.css';

const DashboardEcourseMaterialsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [youtubeLink, setYoutubeLink] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [order, setOrder] = useState('0');

    const fetchData = useCallback(async () => {
        try {
            const [courseRes, materialsRes] = await Promise.all([
                getCourseDetail(id),
                getCourseMaterials(id)
            ]);
            setCourse(courseRes.data);
            setMaterials(materialsRes.data);
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data materi');
            navigate('/dashboard/ecourses');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setYoutubeLink('');
        setPdfFile(null);
        setOrder(materials.length.toString());
        setEditingMaterial(null);
        setShowForm(false);
    };

    const handleEdit = (mat) => {
        setEditingMaterial(mat);
        setTitle(mat.title);
        setDescription(mat.description || '');
        setYoutubeLink(mat.youtube_link || '');
        setOrder(mat.order.toString());
        setShowForm(true);
    };

    const handleDelete = async (matId) => {
        if (!window.confirm('Yakin ingin menghapus materi ini?')) return;
        try {
            await deleteMaterial(matId);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus materi');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData();
        formData.append('course', id);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('youtube_link', youtubeLink);
        formData.append('order', order);
        if (pdfFile) {
            formData.append('pdf_file', pdfFile);
        }

        try {
            if (editingMaterial) {
                await updateMaterial(editingMaterial.id, formData);
                alert('Materi diperbarui');
            } else {
                await createMaterial(formData);
                alert('Materi ditambahkan');
            }
            resetForm();
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan materi. Periksa kembali input Anda.');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to extract YouTube ID
    const getYTID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
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
                <title>Kelola Materi - {course?.title}</title>
            </Helmet>

            <Header />

            <div className="max-w-3xl mx-auto px-4 py-4 pb-24">
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <button onClick={() => navigate('/dashboard/ecourses')} className="hover:text-green-700 transition">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h1 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Manajemen Materi</h1>
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-6">{course?.title}</h2>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700">Langkah / Materi ({materials.length})</h3>
                    {!showForm && (
                        <button
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-800 transition"
                        >
                            Tambah Materi
                        </button>
                    )}
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border-2 border-green-100 p-6 mb-8 space-y-4 animate-slide-up">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-green-800">{editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}</h4>
                            <button type="button" onClick={resetForm} className="material-icons text-gray-400">close</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-3">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Judul Langkah/Materi *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="Contoh: Pengenalan Dasar Tools"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Urutan</label>
                                <input
                                    type="number"
                                    value={order}
                                    onChange={(e) => setOrder(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Link Video (YouTube) *</label>
                            <input
                                type="url"
                                value={youtubeLink}
                                onChange={(e) => setYoutubeLink(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                placeholder="https://www.youtube.com/watch?v=..."
                                required
                            />
                            {getYTID(youtubeLink) && (
                                <div className="mt-2 aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
                                    <img src={`https://img.youtube.com/vi/${getYTID(youtubeLink)}/mqdefault.jpg`} alt="Preview" className="h-full object-contain opacity-50" />
                                    <span className="absolute material-icons text-white text-4xl">play_circle_filled</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">File Pendukung (PDF)</label>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setPdfFile(e.target.files[0])}
                                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Catatan/Instruksi (Opsional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                placeholder="Pesan untuk siswa atau rangkuman materi..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-green-800 transition disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : (editingMaterial ? 'Update Materi' : 'Simpan & Tambah Materi')}
                        </button>
                    </form>
                )}

                <div className="space-y-4">
                    {[...materials].sort((a, b) => a.order - b.order).map((mat, index) => (
                        <div key={mat.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-4">
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-green-700">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-800 text-sm leading-tight">{mat.title}</h4>
                                <div className="flex gap-3 mt-1">
                                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                        <span className="material-icons text-xs">videocam</span> Video
                                    </span>
                                    {mat.pdf_file && (
                                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5 font-bold">
                                            <span className="material-icons text-xs">description</span> PDF Terlampir
                                        </span>
                                    )}
                                </div>
                                {mat.description && <p className="text-[11px] text-gray-400 mt-2 line-clamp-1 italic">"{mat.description}"</p>}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                                <button
                                    onClick={() => handleEdit(mat)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                >
                                    <span className="material-icons text-base">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(mat.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                                >
                                    <span className="material-icons text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {materials.length === 0 && !showForm && (
                        <div className="text-center py-12 text-gray-400">
                            <span className="material-icons text-5xl mb-2 opacity-20">movie_filter</span>
                            <p className="text-sm">Belum ada materi pembelajaran</p>
                            <p className="text-xs mt-1">Gunakan tombol di atas untuk mulai menambahkan materi</p>
                        </div>
                    )}
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardEcourseMaterialsPage;
