import React, { useState, useEffect, useCallback } from 'react';
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

    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    const fetchUsers = useCallback(async (page = 1) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.username !== 'admin') {
            navigate('/dashboard');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/auth/users/`, {
                params: { page },
                headers: { Authorization: `Bearer ${user.access}` }
            });

            if (response.data.results) {
                setUsers(response.data.results);
                setTotalCount(response.data.count);
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
    }, [navigate]);

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage, fetchUsers]);

    const handleExportCsv = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/auth/users/export_csv/`, {
                headers: { Authorization: `Bearer ${user.access}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'users_full_data.csv');
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

    const openEditModal = (user) => {
        setEditingUser(user);
        setEditFormData({
            username: user.username,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            is_verified_member: user.is_verified_member,
            profile: { ...(user.profile || {}) }
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/auth/users/${editingUser.id}/`, editFormData, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('Data user berhasil diperbarui');
            setShowEditModal(false);
            fetchUsers(currentPage);
        } catch (err) {
            console.error(err);
            alert('Gagal memperbarui data user');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus user ini?')) return;

        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/auth/users/${userId}/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('User berhasil dihapus');
            fetchUsers(currentPage);
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus user');
        }
    };

    const openDetailModal = (user) => {
        setSelectedUser(user);
        setShowDetailModal(true);
    };

    if (loading && users.length === 0) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
    );

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Manajemen User - Admin</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
                            <p className="text-sm text-gray-500">{totalCount} total pengguna terdaftar</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExportCsv}
                        className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition transform active:scale-95"
                    >
                        <span className="material-icons text-sm">download</span>
                        Export CSV
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">User</th>
                                    <th className="px-6 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">Kontak</th>
                                    <th className="px-6 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">Role</th>
                                    <th className="px-6 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">Profile</th>
                                    <th className="px-6 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">Join Date</th>
                                    <th className="px-6 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-green-50/30 transition group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{u.username}</div>
                                            <div className="text-xs text-gray-500">{u.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">{u.phone || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-gray-900 font-bold">{u.profile?.name_full || '-'}</div>
                                            <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                                <span className="material-icons text-[12px]">{u.profile?.gender === 'l' ? 'male' : u.profile?.gender === 'p' ? 'female' : 'person'}</span>
                                                {u.profile?.gender === 'l' ? 'Laki-laki' : u.profile?.gender === 'p' ? 'Perempuan' : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium">
                                            {new Date(u.date_joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openDetailModal(u)}
                                                    className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-400 hover:text-green-700 hover:border-green-200 transition flex items-center justify-center"
                                                    title="Lihat Detail"
                                                >
                                                    <span className="material-icons text-sm">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-400 hover:text-blue-700 hover:border-blue-200 transition flex items-center justify-center"
                                                    title="Edit User"
                                                >
                                                    <span className="material-icons text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-400 hover:text-red-700 hover:border-red-200 transition flex items-center justify-center"
                                                    title="Hapus User"
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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-10">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition ${currentPage === 1 ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-green-700 border-green-200 hover:bg-green-50 shadow-sm'}`}
                        >
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                                Hal {currentPage} / {totalPages}
                            </span>
                        </div>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition ${currentPage === totalPages ? 'bg-gray-50 text-gray-300 border-gray-100' : 'bg-white text-green-700 border-green-200 hover:bg-green-50 shadow-sm'}`}
                        >
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>

            {/* User Detail Modal */}
            {showDetailModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-slide-up my-auto">
                        <div className="relative h-24 bg-gradient-to-r from-green-600 to-green-800 rounded-t-3xl">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition backdrop-blur-md"
                            >
                                <span className="material-icons">close</span>
                            </button>
                            <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-3xl p-1 shadow-lg border-4 border-white">
                                <div className="w-full h-full bg-green-50 rounded-2xl flex items-center justify-center">
                                    <span className="material-icons text-5xl text-green-700">person</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pt-16 pb-8">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.profile?.name_full || selectedUser.username}</h2>
                                    <p className="text-gray-500 font-medium">@{selectedUser.username} • {selectedUser.role.toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Terdaftar Pada</p>
                                    <p className="text-gray-900 font-bold">{new Date(selectedUser.date_joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Basic Info */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Informasi Dasar</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <DetailItem icon="alternate_email" label="Email" value={selectedUser.email} />
                                        <DetailItem icon="phone" label="No. Telepon" value={selectedUser.phone} />
                                        <DetailItem icon="wc" label="Jenis Kelamin" value={selectedUser.profile?.gender === 'l' ? 'Laki-laki' : selectedUser.profile?.gender === 'p' ? 'Perempuan' : '-'} />
                                        <DetailItem icon="cake" label="Tempat, Tgl Lahir" value={`${selectedUser.profile?.birth_place || '-'}, ${selectedUser.profile?.birth_date || '-'}`} />
                                    </div>
                                </div>

                                {/* Address & Bio */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Domisili & Deskripsi</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <DetailItem icon="location_on" label="Alamat" value={selectedUser.profile?.address || '-'} />
                                        <DetailItem icon="info" label="Bio Singkat" value={selectedUser.profile?.bio || '-'} />
                                    </div>
                                </div>

                                {/* Work & Education */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Pekerjaan & Pendidikan</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <DetailItem icon="work" label="Pekerjaan" value={selectedUser.profile?.occupation || '-'} />
                                        <DetailItem icon="school" label="Pendidikan Terakhir" value={selectedUser.profile?.education || '-'} />
                                    </div>
                                </div>

                                {/* Bank Info */}
                                <div className="space-y-6">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Rekening Bank</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <DetailItem icon="account_balance" label="Bank" value={selectedUser.profile?.bank_name || '-'} />
                                        <DetailItem icon="payments" label="No. Rekening" value={selectedUser.profile?.bank_account_number || '-'} />
                                        <DetailItem icon="badge" label="Atas Nama" value={selectedUser.profile?.bank_account_name || '-'} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-gray-50 rounded-b-3xl border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl animate-slide-up my-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Edit Data User & Profile</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleUpdate}>
                            <div className="p-8 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Account Section */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold text-blue-700 uppercase tracking-widest border-b border-blue-100 pb-2">Data Akun</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <InputGroup label="Username" value={editFormData.username} onChange={v => setEditFormData({ ...editFormData, username: v })} />
                                            <InputGroup label="Email" value={editFormData.email} onChange={v => setEditFormData({ ...editFormData, email: v })} />
                                            <InputGroup label="No. Telepon" value={editFormData.phone} onChange={v => setEditFormData({ ...editFormData, phone: v })} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</label>
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={editFormData.role}
                                                    onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="is_verified"
                                                    checked={editFormData.is_verified_member}
                                                    onChange={e => setEditFormData({ ...editFormData, is_verified_member: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <label htmlFor="is_verified" className="text-sm font-medium text-gray-700">Verified Member</label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profile Section - Basic Info */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Profile: Data Diri</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <InputGroup label="Nama Lengkap" value={editFormData.profile?.name_full} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, name_full: v } })} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jenis Kelamin</label>
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                                                    value={editFormData.profile?.gender || ''}
                                                    onChange={e => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, gender: e.target.value } })}
                                                >
                                                    <option value="">Pilih</option>
                                                    <option value="l">Laki-laki</option>
                                                    <option value="p">Perempuan</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <InputGroup label="Tempat Lahir" value={editFormData.profile?.birth_place} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, birth_place: v } })} />
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tgl Lahir</label>
                                                    <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" value={editFormData.profile?.birth_date || ''} onChange={e => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, birth_date: e.target.value } })} />
                                                </div>
                                            </div>
                                            <InputGroup label="Alamat" value={editFormData.profile?.address} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, address: v } })} />
                                        </div>
                                    </div>

                                    {/* Work & Edu Section */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold text-orange-700 uppercase tracking-widest border-b border-orange-100 pb-2">Pekerjaan & Pendidikan</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <InputGroup label="Pekerjaan" value={editFormData.profile?.job} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, job: v } })} />
                                            <InputGroup label="Instansi" value={editFormData.profile?.work_institution} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, work_institution: v } })} />
                                            <InputGroup label="Pendidikan Terakhir" value={editFormData.profile?.study_level} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, study_level: v } })} />
                                            <InputGroup label="Gaji" value={editFormData.profile?.work_salary} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, work_salary: v } })} type="number" />
                                        </div>
                                    </div>

                                    {/* Bank Section */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold text-purple-700 uppercase tracking-widest border-b border-purple-100 pb-2">Rekening Bank</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <InputGroup label="Nama Bank" value={editFormData.profile?.bank_name} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, bank_name: v } })} />
                                            <InputGroup label="No. Rekening" value={editFormData.profile?.bank_account_number} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, bank_account_number: v } })} />
                                            <InputGroup label="Atas Nama" value={editFormData.profile?.bank_account_name} onChange={v => setEditFormData({ ...editFormData, profile: { ...editFormData.profile, bank_account_name: v } })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition"
                                >
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

const DetailItem = ({ icon, label, value }) => (
    <div className="flex gap-3">
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-icons text-gray-400 text-lg">{icon}</span>
        </div>
        <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
            <p className="text-sm text-gray-800 font-semibold leading-snug">{value}</p>
        </div>
    </div>
);

const InputGroup = ({ label, value, onChange, type = "text" }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);

export default DashboardUserPage;
