import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAdminAllCourses, deleteAdminCourse } from '../../services/ecourseApi';

const AdminAllCoursesPage = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await getAdminAllCourses();
            setCourses(res.data);
        } catch (err) {
            console.error('Failed to fetch all courses:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus course ini? Seluruh data pendaftaran dan materi akan ikut terhapus.')) {
            try {
                await deleteAdminCourse(id);
                setCourses(courses.filter(c => c.id !== id));
                alert('Course berhasil dihapus.');
            } catch (err) {
                alert('Gagal menghapus course.');
            }
        }
    };

    const filteredCourses = courses.filter(c =>
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.instructor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <Header />
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Semua E-Course</h1>
                        <p className="text-xs text-gray-500">Kelola semua course yang diunggah oleh instruktur.</p>
                    </div>
                    <div className="relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Cari course atau instruktur..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 w-full md:w-64 shadow-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                        <p className="text-gray-500">Tidak ada course ditemukan.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Course</th>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Instruktur</th>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Harga</th>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCourses.map((course) => (
                                        <tr key={course.id} className="hover:bg-blue-50/30 transition">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                                        {course.thumbnail ? (
                                                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <span className="material-icons text-sm">image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-xs line-clamp-1">{course.title}</p>
                                                        <p className="text-[10px] text-gray-400">ID: {course.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs font-medium text-gray-700">
                                                {course.instructor_name}
                                            </td>
                                            <td className="p-4 text-xs font-black text-blue-600">
                                                {course.price === 0 ? 'GRATIS' : `Rp ${course.price.toLocaleString('id-ID')}`}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => window.open(`/kelas/${course.slug}`, '_blank')}
                                                        className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-200 transition"
                                                        title="Lihat"
                                                    >
                                                        <span className="material-icons text-[14px]">visibility</span>
                                                    </button>
                                                    <Link
                                                        to={`/dashboard/ecourses/${course.id}/edit`}
                                                        className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition"
                                                        title="Edit Pengaturan"
                                                    >
                                                        <span className="material-icons text-[14px]">settings</span>
                                                    </Link>
                                                    <Link
                                                        to={`/dashboard/ecourses/${course.id}/materials`}
                                                        className="w-8 h-8 flex items-center justify-center bg-purple-50 text-purple-500 rounded-lg hover:bg-purple-600 hover:text-white transition"
                                                        title="Edit Materi"
                                                    >
                                                        <span className="material-icons text-[14px]">auto_stories</span>
                                                    </Link>
                                                    <Link
                                                        to={`/dashboard/ecourses/${course.id}/progress`}
                                                        className="w-8 h-8 flex items-center justify-center bg-green-50 text-green-500 rounded-lg hover:bg-green-600 hover:text-white transition"
                                                        title="Data Peserta"
                                                    >
                                                        <span className="material-icons text-[14px]">group</span>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(course.id)}
                                                        className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition"
                                                        title="Hapus"
                                                    >
                                                        <span className="material-icons text-[14px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default AdminAllCoursesPage;
