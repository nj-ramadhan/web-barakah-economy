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

const DashboardUserPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterLabel, setFilterLabel] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Sorting
    const [sortField, setSortField] = useState('');
    const [sortDir, setSortDir] = useState(''); // '', 'asc', 'desc'

    // Modals
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    // WA Blast
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [blastMessage, setBlastMessage] = useState('');
    const [blasting, setBlasting] = useState(false);
    const [blastResult, setBlastResult] = useState(null);

    // Roles & Labels for dropdowns
    const [allRoles, setAllRoles] = useState([]);
    const [allLabels, setAllLabels] = useState([]);

    const fetchMeta = useCallback(async () => {
        try {
            const [rolesRes, labelsRes] = await Promise.all([
                axios.get(`${API}/api/auth/roles/`, getAuth()),
                axios.get(`${API}/api/auth/labels/`, getAuth()),
            ]);
            setAllRoles(rolesRes.data.results || rolesRes.data);
            setAllLabels(labelsRes.data.results || labelsRes.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchUsers = useCallback(async (page = 1) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }

        setLoading(true);
        try {
            const params = { page };
            if (searchQuery) params.search = searchQuery;
            if (filterRole) params.role = filterRole;
            if (filterLabel) params.label = filterLabel;
            if (filterDateFrom) params.date_from = filterDateFrom;
            if (filterDateTo) params.date_to = filterDateTo;
            if (sortField && sortDir) {
                params.ordering = sortDir === 'desc' ? `-${sortField}` : sortField;
            }

            const response = await axios.get(`${API}/api/auth/users/`, {
                params,
                headers: { Authorization: `Bearer ${user.access}` }
            });

            if (response.data.results) {
                setUsers(response.data.results);
                setTotalCount(response.data.count);
                setTotalPages(Math.ceil(response.data.count / 10));
            } else {
                setUsers(response.data);
                setTotalCount(response.data.length);
                setTotalPages(1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [navigate, searchQuery, filterRole, filterLabel, filterDateFrom, filterDateTo, sortField, sortDir]);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage, fetchUsers]);

    // Sort handler
    const handleSort = (field) => {
        if (sortField === field) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortField(''); setSortDir(''); }
            else setSortDir('asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
        setCurrentPage(1);
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return 'unfold_more';
        if (sortDir === 'asc') return 'arrow_upward';
        return 'arrow_downward';
    };

    // Select for WA Blast
    const toggleSelectUser = (id) => {
        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleSelectAll = () => {
        if (selectedUserIds.length === users.length) setSelectedUserIds([]);
        else setSelectedUserIds(users.map(u => u.id));
    };

    const handleExportCsv = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            const response = await axios.get(`${API}/api/auth/users/export_csv/`, {
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
        } catch (err) { alert('Gagal export'); }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setEditFormData({
            username: user.username,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            is_verified_member: user.is_verified_member,
            profile: { ...(user.profile || {}) },
            custom_role_ids: (user.custom_roles || []).map(r => r.id),
            label_ids: (user.labels || []).map(l => l.id),
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.put(`${API}/api/auth/users/${editingUser.id}/`, editFormData, {
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
            await axios.delete(`${API}/api/auth/users/${userId}/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('User berhasil dihapus');
            fetchUsers(currentPage);
        } catch (err) { alert('Gagal menghapus user'); }
    };

    const openDetailModal = (user) => { setSelectedUser(user); setShowDetailModal(true); };

    // WA Blast
    const handleBlast = async () => {
        if (!blastMessage.trim()) { alert('Tulis pesan terlebih dahulu'); return; }
        setBlasting(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const res = await axios.post(`${API}/api/auth/users/blast_whatsapp/`, {
                user_ids: selectedUserIds,
                message: blastMessage
            }, { headers: { Authorization: `Bearer ${user.access}` } });
            setBlastResult(res.data);
        } catch (err) {
            alert('Gagal mengirim blast');
        } finally {
            setBlasting(false);
        }
    };

    if (loading && users.length === 0) return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
    );

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Manajemen User - Admin</title></Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
                            <p className="text-sm text-gray-500">{totalCount} total pengguna terdaftar</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {selectedUserIds.length > 0 && (
                            <button onClick={() => { setBlastResult(null); setShowBlastModal(true); }}
                                className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-green-700 transition">
                                <span className="material-icons text-sm">chat</span>
                                Blast WA ({selectedUserIds.length})
                            </button>
                        )}
                        <button onClick={handleExportCsv}
                            className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                            <span className="material-icons text-sm">download</span> Export CSV
                        </button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                    <div className="flex flex-wrap gap-3">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                <input type="text" placeholder="Cari nama, email, phone..." value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                        </div>
                        <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                            <option value="">Semua Role</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="seller">Seller</option>
                            <option value="staff">Staff</option>
                        </select>
                        <select value={filterLabel} onChange={e => { setFilterLabel(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                            <option value="">Semua Label</option>
                            {allLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" placeholder="Dari" />
                        <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" placeholder="Sampai" />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-4">
                                        <input type="checkbox" checked={selectedUserIds.length === users.length && users.length > 0}
                                            onChange={toggleSelectAll} className="w-4 h-4 text-green-600 rounded" />
                                    </th>
                                    <SortHeader label="User" field="username" sortField={sortField} sortDir={sortDir} onSort={handleSort} getSortIcon={getSortIcon} />
                                    <th className="px-4 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">Kontak</th>
                                    <SortHeader label="Role" field="role" sortField={sortField} sortDir={sortDir} onSort={handleSort} getSortIcon={getSortIcon} />
                                    <th className="px-4 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">Label</th>
                                    <SortHeader label="Profile" field="profile__name_full" sortField={sortField} sortDir={sortDir} onSort={handleSort} getSortIcon={getSortIcon} />
                                    <SortHeader label="Join Date" field="date_joined" sortField={sortField} sortDir={sortDir} onSort={handleSort} getSortIcon={getSortIcon} />
                                    <th className="px-4 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px]">Verified</th>
                                    <th className="px-4 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-green-50/30 transition group">
                                        <td className="px-4 py-3">
                                            <input type="checkbox" checked={selectedUserIds.includes(u.id)}
                                                onChange={() => toggleSelectUser(u.id)} className="w-4 h-4 text-green-600 rounded" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-gray-900 text-xs">{u.username}</div>
                                            <div className="text-[11px] text-gray-500">{u.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 text-xs">{u.phone || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                {u.role}
                                            </span>
                                            {(u.custom_roles || []).map(r => (
                                                <span key={r.id} className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-100">{r.name}</span>
                                            ))}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(u.labels || []).map(l => (
                                                <span key={l.id} className={`inline-block mr-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-${l.color}-50 text-${l.color}-700 border border-${l.color}-100`}>{l.name}</span>
                                            ))}
                                            {(!u.labels || u.labels.length === 0) && <span className="text-gray-400 text-xs">-</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-900 font-bold text-xs">{u.profile?.name_full || '-'}</div>
                                            <div className="text-[11px] text-gray-500">{u.profile?.gender === 'l' ? 'L' : u.profile?.gender === 'p' ? 'P' : '-'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(u.date_joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {u.is_verified_member
                                                ? <span className="material-icons text-green-600 text-lg">verified</span>
                                                : <span className="material-icons text-gray-300 text-lg">cancel</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openDetailModal(u)} className="w-7 h-7 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-green-700 hover:border-green-200 transition flex items-center justify-center" title="Detail">
                                                    <span className="material-icons text-sm">visibility</span>
                                                </button>
                                                <button onClick={() => openEditModal(u)} className="w-7 h-7 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-700 hover:border-blue-200 transition flex items-center justify-center" title="Edit">
                                                    <span className="material-icons text-sm">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} className="w-7 h-7 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-700 hover:border-red-200 transition flex items-center justify-center" title="Hapus">
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
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition ${currentPage === 1 ? 'bg-gray-50 text-gray-300' : 'bg-white text-green-700 border-green-200 hover:bg-green-50 shadow-sm'}`}>
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">Hal {currentPage}/{totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl border transition ${currentPage === totalPages ? 'bg-gray-50 text-gray-300' : 'bg-white text-green-700 border-green-200 hover:bg-green-50 shadow-sm'}`}>
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ============ DETAIL MODAL ============ */}
            {showDetailModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-auto">
                        <div className="relative h-24 bg-gradient-to-r from-green-600 to-green-800 rounded-t-3xl">
                            <button onClick={() => setShowDetailModal(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition backdrop-blur-md">
                                <span className="material-icons">close</span>
                            </button>
                            <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-3xl p-1 shadow-lg border-4 border-white">
                                <div className="w-full h-full bg-green-50 rounded-2xl flex items-center justify-center">
                                    <span className="material-icons text-5xl text-green-700">person</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-8 pt-16 pb-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.profile?.name_full || selectedUser.username}</h2>
                                    <p className="text-gray-500 font-medium">@{selectedUser.username} • {selectedUser.role.toUpperCase()}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {(selectedUser.custom_roles||[]).map(r => <span key={r.id} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">{r.name}</span>)}
                                        {(selectedUser.labels||[]).map(l => <span key={l.id} className={`px-2 py-0.5 bg-${l.color}-50 text-${l.color}-700 rounded-full text-[10px] font-bold`}>{l.name}</span>)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Terdaftar</p>
                                    <p className="text-gray-900 font-bold text-sm">{new Date(selectedUser.date_joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    <p className="mt-1">{selectedUser.is_verified_member ? <span className="text-green-600 text-[10px] font-bold flex items-center gap-1 justify-end"><span className="material-icons text-sm">verified</span>Verified</span> : <span className="text-red-400 text-[10px] font-bold">Belum Verified</span>}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Informasi Dasar</h3>
                                    <DI icon="alternate_email" label="Email" value={selectedUser.email} />
                                    <DI icon="phone" label="No. Telepon" value={selectedUser.phone} />
                                    <DI icon="wc" label="Jenis Kelamin" value={selectedUser.profile?.gender === 'l' ? 'Laki-laki' : selectedUser.profile?.gender === 'p' ? 'Perempuan' : '-'} />
                                    <DI icon="cake" label="TTL" value={`${selectedUser.profile?.birth_place || '-'}, ${selectedUser.profile?.birth_date || '-'}`} />
                                    <DI icon="favorite" label="Status" value={selectedUser.profile?.marital_status || '-'} />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Domisili & Pekerjaan</h3>
                                    <DI icon="location_on" label="Alamat" value={selectedUser.profile?.address || '-'} />
                                    <DI icon="map" label="Provinsi" value={selectedUser.profile?.address_province || '-'} />
                                    <DI icon="work" label="Pekerjaan" value={selectedUser.profile?.job || '-'} />
                                    <DI icon="business" label="Instansi" value={selectedUser.profile?.work_institution || '-'} />
                                    <DI icon="school" label="Pendidikan" value={selectedUser.profile?.study_level || '-'} />
                                </div>
                            </div>
                        </div>
                        <div className="px-8 py-4 bg-gray-50 rounded-b-3xl border-t flex justify-end">
                            <button onClick={() => setShowDetailModal(false)} className="bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 transition">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ EDIT MODAL ============ */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl my-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Edit User & Profile</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Account */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-blue-700 uppercase tracking-widest border-b border-blue-100 pb-2">Data Akun</h3>
                                        <FI label="Username" value={editFormData.username} onChange={v => setEditFormData({...editFormData, username: v})} />
                                        <FI label="Email" value={editFormData.email} onChange={v => setEditFormData({...editFormData, email: v})} />
                                        <FI label="No. Telepon" value={editFormData.phone} onChange={v => setEditFormData({...editFormData, phone: v})} />
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</label>
                                            <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={editFormData.role} onChange={e => setEditFormData({...editFormData, role: e.target.value})}>
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                                <option value="seller">Seller</option>
                                                <option value="staff">Staff</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Roles</label>
                                            <div className="flex flex-wrap gap-2">
                                                {allRoles.map(r => (
                                                    <label key={r.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
                                                        (editFormData.custom_role_ids||[]).includes(r.id) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-100 text-gray-500'
                                                    }`}>
                                                        <input type="checkbox" checked={(editFormData.custom_role_ids||[]).includes(r.id)}
                                                            onChange={() => {
                                                                const ids = editFormData.custom_role_ids || [];
                                                                setEditFormData({...editFormData, custom_role_ids: ids.includes(r.id) ? ids.filter(x=>x!==r.id) : [...ids, r.id]});
                                                            }} className="w-3 h-3 text-green-600 rounded" />
                                                        {r.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Labels</label>
                                            <div className="flex flex-wrap gap-2">
                                                {allLabels.map(l => (
                                                    <label key={l.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border cursor-pointer text-xs ${
                                                        (editFormData.label_ids||[]).includes(l.id) ? `bg-${l.color}-50 border-${l.color}-200 text-${l.color}-800` : 'bg-white border-gray-100 text-gray-500'
                                                    }`}>
                                                        <input type="checkbox" checked={(editFormData.label_ids||[]).includes(l.id)}
                                                            onChange={() => {
                                                                const ids = editFormData.label_ids || [];
                                                                setEditFormData({...editFormData, label_ids: ids.includes(l.id) ? ids.filter(x=>x!==l.id) : [...ids, l.id]});
                                                            }} className="w-3 h-3 rounded" />
                                                        {l.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <input type="checkbox" id="is_verified" checked={editFormData.is_verified_member}
                                                onChange={e => setEditFormData({...editFormData, is_verified_member: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                                            <label htmlFor="is_verified" className="text-sm font-medium text-gray-700">Verified Member</label>
                                        </div>
                                    </div>

                                    {/* Profile */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2">Data Diri</h3>
                                        <FI label="Nama Lengkap" value={editFormData.profile?.name_full} onChange={v => setEditFormData({...editFormData, profile: {...editFormData.profile, name_full: v}})} />
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jenis Kelamin</label>
                                            <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={editFormData.profile?.gender||''} onChange={e => setEditFormData({...editFormData, profile: {...editFormData.profile, gender: e.target.value}})}>
                                                <option value="">Pilih</option><option value="l">Laki-laki</option><option value="p">Perempuan</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <FI label="Tempat Lahir" value={editFormData.profile?.birth_place} onChange={v => setEditFormData({...editFormData, profile: {...editFormData.profile, birth_place: v}})} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tgl Lahir</label>
                                                <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" value={editFormData.profile?.birth_date||''} onChange={e => setEditFormData({...editFormData, profile: {...editFormData.profile, birth_date: e.target.value}})} />
                                            </div>
                                        </div>
                                        <FI label="Alamat" value={editFormData.profile?.address} onChange={v => setEditFormData({...editFormData, profile: {...editFormData.profile, address: v}})} />
                                        <FI label="Pekerjaan" value={editFormData.profile?.job} onChange={v => setEditFormData({...editFormData, profile: {...editFormData.profile, job: v}})} />
                                        <FI label="Instansi" value={editFormData.profile?.work_institution} onChange={v => setEditFormData({...editFormData, profile: {...editFormData.profile, work_institution: v}})} />
                                        <FI label="Pendidikan" value={editFormData.profile?.study_level} onChange={v => setEditFormData({...editFormData, profile: {...editFormData.profile, study_level: v}})} />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                                <button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ WA BLAST MODAL ============ */}
            {showBlastModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">
                                <span className="material-icons text-green-600 align-middle mr-2">chat</span>
                                Blast WhatsApp
                            </h2>
                            <button onClick={() => setShowBlastModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">Kirim pesan ke <b>{selectedUserIds.length}</b> user terpilih</p>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                                <b>Placeholder tersedia:</b> {'{name}'}, {'{username}'}, {'{email}'}, {'{phone}'}
                            </div>
                            <textarea rows="5" value={blastMessage} onChange={e => setBlastMessage(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Assalamualaikum {name}, ..." />
                            {blastResult && (
                                <div className={`p-4 rounded-xl text-sm ${blastResult.failed > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'}`}>
                                    <p className="font-bold">Hasil: {blastResult.success} berhasil, {blastResult.failed} gagal dari {blastResult.total} total</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                            <button onClick={() => setShowBlastModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                            <button onClick={handleBlast} disabled={blasting || !blastMessage.trim()}
                                className="bg-green-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition disabled:opacity-50">
                                {blasting ? 'Mengirim...' : 'Kirim Blast'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

// Helper components
const DI = ({ icon, label, value }) => (
    <div className="flex gap-3">
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
            <span className="material-icons text-gray-400 text-base">{icon}</span>
        </div>
        <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
            <p className="text-sm text-gray-800 font-medium">{value || '-'}</p>
        </div>
    </div>
);

const FI = ({ label, value, onChange, type = "text" }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <input type={type} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
);

const SortHeader = ({ label, field, sortField, sortDir, onSort, getSortIcon }) => (
    <th className="px-4 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-green-700 transition select-none" onClick={() => onSort(field)}>
        <div className="flex items-center gap-1">
            {label}
            <span className="material-icons text-[14px]">{getSortIcon(field)}</span>
        </div>
    </th>
);

export default DashboardUserPage;
