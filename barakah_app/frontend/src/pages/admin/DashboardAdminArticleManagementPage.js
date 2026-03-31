import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const API = process.env.REACT_APP_API_BASE_URL;
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

const DashboardAdminArticleManagementPage = () => {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchAllArticles = useCallback(async () => {
        setLoading(true);
        try {
            // Get all articles (endpoint supports list for everyone, but management needs all)
            const res = await axios.get(`${API}/api/articles/`, getAuth());
            setArticles(res.data.results || res.data);
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data artikel');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        fetchAllArticles();
    }, [navigate, fetchAllArticles]);

    const handleDelete = async (slug, title) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus artikel "${title}"?`)) return;
        try {
            await axios.delete(`${API}/api/articles/${slug}/`, getAuth());
            alert('Artikel berhasil dihapus');
            fetchAllArticles();
        } catch (err) {
            alert('Gagal menghapus artikel');
        }
    };

    const filteredArticles = articles.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || a.status === parseInt(statusFilter);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Manajemen Artikel - Admin</title></Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manajemen Artikel</h1>
                            <p className="text-sm text-gray-500">Kelola semua artikel yang diterbitkan oleh pengguna</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/dashboard/articles')} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                        <span className="material-icons text-sm">add</span> Tulis Artikel
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Cari judul artikel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                        >
                            <option value="all">Semua Status</option>
                            <option value="1">Published</option>
                            <option value="2">Draft</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-600"></div>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <span className="material-icons text-6xl text-gray-200">article</span>
                        <p className="text-gray-500 mt-4 font-medium">Tidak ada artikel ditemukan</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Artikel</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Tanggal</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredArticles.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 line-clamp-1">{a.title}</span>
                                                    <span className="text-[10px] text-gray-400 mt-0.5">Slug: {a.slug}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                                    a.status === 1 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {a.status === 1 ? 'PUBLISHED' : 'DRAFT'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600 font-medium">{a.date}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/dashboard/articles/${a.slug}`)}
                                                        className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                                                        title="Edit"
                                                    >
                                                        <span className="material-icons text-sm">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(a.slug, a.title)}
                                                        className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                                                        title="Hapus"
                                                    >
                                                        <span className="material-icons text-sm">delete</span>
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

export default DashboardAdminArticleManagementPage;
