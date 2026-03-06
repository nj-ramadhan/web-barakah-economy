// pages/DashboardEcourseListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMyCourses, updateCourse, deleteCourse } from '../services/ecourseApi';
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    return `${baseUrl}${url}`;
};

const DashboardEcourseListPage = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchCourses = useCallback(async () => {
        try {
            const res = await getMyCourses();
            setCourses(res.data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    const handleToggleActive = async (course) => {
        try {
            const formData = new FormData();
            formData.append('is_active', !course.is_active);
            await updateCourse(course.id, formData);
            fetchCourses();
        } catch (err) {
            console.error(err);
            alert('Gagal mengubah status kursus');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus kursus ini? Semua materi di dalamnya akan ikut terhapus.')) return;
        try {
            await deleteCourse(id);
            fetchCourses();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus kursus');
        }
    };

    return (
        <div className="body">
            <Helmet>
                <title>E-Course Saya - Dashboard</title>
            </Helmet>

            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-xl font-bold">E-Course Saya</h1>
                        <p className="text-xs text-gray-500">Kelola konten pembelajaran Anda</p>
                    </div>
                    <Link
                        to="/dashboard/ecourses/new"
                        className="flex items-center gap-1 bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-800 transition shadow-sm"
                    >
                        <span className="material-icons text-lg">add</span>
                        Buat Kursus
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-gray-400 text-3xl">school</span>
                        </div>
                        <h3 className="font-bold text-gray-800">Belum ada Kursus</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                            Mulai bagikan ilmu Anda dan dapatkan penghasilan dengan membuat E-course pertama Anda.
                        </p>
                        <Link
                            to="/dashboard/ecourses/new"
                            className="inline-block mt-6 text-green-700 font-bold text-sm hover:underline"
                        >
                            Klik di sini untuk membuat kursus baru
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {courses.map((course) => (
                            <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                <div className="flex flex-col sm:flex-row">
                                    <div className="relative w-full sm:w-48 h-32 flex-shrink-0">
                                        <img
                                            src={getMediaUrl(course.thumbnail) || '/placeholder-course.jpg'}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = '/placeholder-course.jpg'; }}
                                        />
                                        {!course.is_active && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <span className="text-[10px] bg-white text-black px-2 py-1 rounded font-bold uppercase tracking-wider">Draft</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] text-green-700 font-bold uppercase tracking-widest">{course.category}</span>
                                                <p className="font-bold text-green-800">{formatIDR(course.price)}</p>
                                            </div>
                                            <h3 className="font-bold text-gray-800 line-clamp-1">{course.title}</h3>
                                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{course.description}</p>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-50">
                                            <div className="flex gap-4 items-center">
                                                <div className="flex items-center gap-1">
                                                    <span className="material-icons text-gray-400 text-sm">people</span>
                                                    <span className="text-xs font-bold text-gray-600">{course.enrollments_count || 0} Siswa</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-icons text-gray-400 text-sm">slow_motion_video</span>
                                                    <span className="text-xs font-bold text-gray-600">{course.materials_count || 0} Materi</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleToggleActive(course)}
                                                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${course.is_active
                                                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-200'
                                                        }`}
                                                    title={course.is_active ? 'Sembunyikan' : 'Tampilkan'}
                                                >
                                                    <span className="material-icons text-lg">
                                                        {course.is_active ? 'visibility' : 'visibility_off'}
                                                    </span>
                                                </button>
                                                <Link
                                                    to={`/dashboard/ecourses/${course.id}/edit`}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                                    title="Edit Info"
                                                >
                                                    <span className="material-icons text-lg">edit</span>
                                                </Link>
                                                <Link
                                                    to={`/dashboard/ecourses/${course.id}/materials`}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition"
                                                    title="Manage Materi"
                                                >
                                                    <span className="material-icons text-lg">auto_stories</span>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(course.id)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition"
                                                    title="Hapus"
                                                >
                                                    <span className="material-icons text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardEcourseListPage;
