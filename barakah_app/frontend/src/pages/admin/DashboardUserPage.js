import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const DashboardUserPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const fetchUsers = async (page = 1) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.username !== 'admin') {
            navigate('/dashboard');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/accounts/users/`, {
                params: { page },
                headers: { Authorization: `Bearer ${user.access}` }
            });

            // Handle DRF pagination response
            if (response.data.results) {
                setUsers(response.data.results);
                setTotalCount(response.data.count);
                // Calculate total pages (DRF default is usually 10 per page if not specified)
                setTotalPages(Math.ceil(response.data.count / 10));
            } else {
                setUsers(response.data);
                setTotalPages(1);
            }
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data user');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage, navigate]);

    const handleExportXlsx = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/accounts/users/export_xlsx/`, {
                headers: { Authorization: `Bearer ${user.access}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'users.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            alert('Gagal mengekspor data');
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading && users.length === 0) return <div className="text-center py-10">Loading...</div>;

    return (
        <div className="body">
            <Helmet>
                <title>Manajemen User - Admin</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/dashboard')} className="material-icons text-gray-500">arrow_back</button>
                        <h1 className="text-xl font-bold">Manajemen User</h1>
                    </div>
                    <button
                        onClick={handleExportXlsx}
                        className="bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100"
                    >
                        <span className="material-icons text-sm">description</span>
                        Export Excel
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Kontak</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Profile</th>
                                    <th className="px-6 py-4">Tanggal Join</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{u.username}</div>
                                            <div className="text-xs text-gray-500">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{u.phone || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 font-medium">{u.profile?.name_full || '-'}</div>
                                            <div className="text-xs text-gray-500">
                                                {u.profile?.gender === 'l' ? 'Laki-laki' : u.profile?.gender === 'p' ? 'Perempuan' : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(u.date_joined).toLocaleDateString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-full border ${currentPage === 1 ? 'text-gray-300 border-gray-100' : 'text-green-700 border-green-200 hover:bg-green-50'}`}
                        >
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <span className="text-sm font-medium">
                            Halaman {currentPage} dari {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-full border ${currentPage === totalPages ? 'text-gray-300 border-gray-100' : 'text-green-700 border-green-200 hover:bg-green-50'}`}
                        >
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardUserPage;
