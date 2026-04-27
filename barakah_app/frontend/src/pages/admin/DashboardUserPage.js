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

const GENDER_CHOICES = [['l','Laki-laki'],['p','Perempuan']];
const MARITAL_CHOICES = [['bn','Belum Nikah'],['n','Nikah'],['d','Duda'],['j','Janda']];
const SEGMENT_CHOICES = [['mahasiswa','Mahasiswa'],['pelajar','Pelajar'],['santri','Santri'],['karyawan','Karyawan'],['umum','Umum']];
const STUDY_LEVEL_CHOICES = [['sd','SD/Setara'],['smp','SMP/Setara'],['sma','SMA/SMK/Setara'],['s1','Sarjana'],['s2','Magister'],['s3','Doktor']];
const JOB_CHOICES = [['mahasiswa','Mahasiswa'],['asn','ASN'],['karyawan_swasta','Karyawan Swasta'],['guru','Guru'],['dosen','Dosen'],['dokter','Dokter'],['perawat','Perawat'],['apoteker','Apoteker'],['programmer','Programmer'],['data_scientist','Data Scientist'],['desainer_grafis','Desainer Grafis'],['marketing','Marketing'],['hrd','HRD'],['akuntan','Akuntan'],['konsultan','Konsultan'],['arsitek','Arsitek'],['insinyur','Insinyur'],['peneliti','Peneliti'],['jurnalis','Jurnalis'],['penulis','Penulis'],['penerjemah','Penerjemah'],['pilot','Pilot'],['pramugari','Pramugari'],['chef','Chef'],['pengusaha','Pengusaha'],['petani','Petani'],['nelayan','Nelayan'],['pengrajin','Pengrajin'],['teknisi','Teknisi'],['seniman','Seniman'],['musisi','Musisi'],['atlet','Atlet'],['polisi','Polisi'],['tentara','Tentara'],['pengacara','Pengacara'],['notaris','Notaris'],['psikolog','Psikolog'],['sopir','Sopir'],['kurir','Kurir'],['barista','Barista'],['freelancer','Freelancer']];
const WORK_FIELD_CHOICES = [['pendidikan','Pendidikan'],['kesehatan','Kesehatan'],['ekobis','Ekonomi Bisnis'],['agrotek','Agrotek'],['herbal','Herbal-Farmasi'],['it','IT'],['manufaktur','Manufaktur'],['energi','Energi-Mineral'],['sains','Sains'],['teknologi','Teknologi'],['polhuk','Politik-Hukum'],['humaniora','Humaniora'],['media','Media-Literasi'],['sejarah','Sejarah']];
const PROVINCE_CHOICES = [['aceh','Aceh'],['sumatera_utara','Sumatera Utara'],['sumatera_barat','Sumatera Barat'],['riau','Riau'],['jambi','Jambi'],['sumatera_selatan','Sumatera Selatan'],['bengkulu','Bengkulu'],['lampung','Lampung'],['kepulauan_bangka_belitung','Kep. Bangka Belitung'],['kepulauan_riau','Kepulauan Riau'],['dki_jakarta','DKI Jakarta'],['jawa_barat','Jawa Barat'],['jawa_tengah','Jawa Tengah'],['di_yogyakarta','DI Yogyakarta'],['jawa_timur','Jawa Timur'],['banten','Banten'],['bali','Bali'],['nusa_tenggara_barat','NTB'],['nusa_tenggara_timur','NTT'],['kalimantan_barat','Kalimantan Barat'],['kalimantan_tengah','Kalimantan Tengah'],['kalimantan_selatan','Kalimantan Selatan'],['kalimantan_timur','Kalimantan Timur'],['kalimantan_utara','Kalimantan Utara'],['sulawesi_utara','Sulawesi Utara'],['sulawesi_tengah','Sulawesi Tengah'],['sulawesi_selatan','Sulawesi Selatan'],['sulawesi_tenggara','Sulawesi Tenggara'],['gorontalo','Gorontalo'],['sulawesi_barat','Sulawesi Barat'],['maluku','Maluku'],['maluku_utara','Maluku Utara'],['papua','Papua'],['papua_barat','Papua Barat']];

const DashboardUserPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterCustomRole, setFilterCustomRole] = useState('');
    const [filterLabel, setFilterLabel] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortField, setSortField] = useState('');
    const [sortDir, setSortDir] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [blastMessage, setBlastMessage] = useState('');
    const [blasting, setBlasting] = useState(false);
    const [blastResult, setBlastResult] = useState(null);
    const [allRoles, setAllRoles] = useState([]);
    const [allLabels, setAllLabels] = useState([]);
    // Reset password state
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordResult, setResetPasswordResult] = useState(null);
    const [resettingPassword, setResettingPassword] = useState(false);
    // Batch edit state
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchField, setBatchField] = useState('');
    const [batchValue, setBatchValue] = useState('');
    const [batching, setBatching] = useState(false);

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
        setLoading(true);
        try {
            const params = { page };
            if (searchQuery) params.search = searchQuery;
            if (filterRole) params.role = filterRole;
            if (filterCustomRole) params.custom_role = filterCustomRole;
            if (filterLabel) params.label = filterLabel;
            if (filterDateFrom) params.date_from = filterDateFrom;
            if (filterDateTo) params.date_to = filterDateTo;
            if (sortField && sortDir) params.ordering = sortDir === 'desc' ? `-${sortField}` : sortField;
            const response = await axios.get(`${API}/api/auth/users/`, { params, ...getAuth() });
            if (response.data.results) {
                setUsers(response.data.results);
                setTotalCount(response.data.count);
                setTotalPages(Math.ceil(response.data.count / 10));
            } else {
                setUsers(response.data);
                setTotalCount(response.data.length);
                setTotalPages(1);
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [searchQuery, filterRole, filterLabel, filterDateFrom, filterDateTo, sortField, sortDir]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }
        fetchMeta();
    }, [navigate, fetchMeta]);

    useEffect(() => { fetchUsers(currentPage); }, [currentPage, fetchUsers]);

    const handleSort = (field) => {
        if (sortField === field) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortField(''); setSortDir(''); }
            else setSortDir('asc');
        } else { setSortField(field); setSortDir('asc'); }
        setCurrentPage(1);
    };
    const getSortIcon = (field) => { if (sortField !== field) return 'unfold_more'; return sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'; };
    const toggleSelectUser = (id) => setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => { if (selectedUserIds.length === users.length) setSelectedUserIds([]); else setSelectedUserIds(users.map(u => u.id)); };

    const handleExportCsv = async () => {
        try {
            const response = await axios.get(`${API}/api/auth/users/export_csv/`, { ...getAuth(), responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a'); link.href = url;
            link.setAttribute('download', 'users_full_data.csv');
            document.body.appendChild(link); link.click(); link.remove();
        } catch (err) { alert('Gagal export'); }
    };

    const openAddModal = () => {
        setEditingUser(null);
        setEditFormData({
            username: '', email: '', phone: '', password: '',
            role: 'user', is_verified_member: false,
            name_full: '', custom_role_ids: [], label_ids: [], profile: {}
        });
        setShowEditModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        const p = user.profile || {};
        setEditFormData({
            username: user.username, email: user.email, phone: user.phone || '',
            role: user.role, is_verified_member: user.is_verified_member,
            custom_role_ids: (user.custom_roles || []).map(r => r.id),
            label_ids: (user.labels || []).map(l => l.id),
            profile: {
                name_full: p.name_full || '', nik: p.nik || '', gender: p.gender || '', birth_place: p.birth_place || '',
                birth_date: p.birth_date || '', registration_date: p.registration_date || '',
                marital_status: p.marital_status || '', segment: p.segment || '',
                study_level: p.study_level || '', study_campus: p.study_campus || '',
                study_faculty: p.study_faculty || '', study_department: p.study_department || '',
                study_program: p.study_program || '', study_semester: p.study_semester || '',
                study_start_year: p.study_start_year || '', study_finish_year: p.study_finish_year || '',
                address: p.address || '', address_province: p.address_province || '',
                job: p.job || '', work_field: p.work_field || '', work_institution: p.work_institution || '',
                work_position: p.work_position || '', work_salary: p.work_salary || '',
            }
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            // Mode buat user baru
            if (!editingUser) {
                if (!editFormData.password) { alert('Password wajib diisi untuk user baru.'); return; }
                const payload = {
                    username: editFormData.username, email: editFormData.email,
                    phone: editFormData.phone, password: editFormData.password,
                    role: editFormData.role, is_verified_member: editFormData.is_verified_member,
                    name_full: editFormData.name_full || '',
                };
                await axios.post(`${API}/api/auth/users/`, payload, getAuth());
                alert('User baru berhasil dibuat!');
                setShowEditModal(false);
                fetchUsers(currentPage);
                return;
            }
            // Clean profile data: remove empty strings to avoid validation issues
            const cleanProfile = {};
            Object.entries(editFormData.profile || {}).forEach(([k, v]) => {
                if (v !== '' && v !== null && v !== undefined) cleanProfile[k] = v;
            });
            const payload = {
                username: editFormData.username,
                email: editFormData.email,
                phone: editFormData.phone,
                role: editFormData.role,
                is_verified_member: editFormData.is_verified_member,
                custom_role_ids: editFormData.custom_role_ids || [],
                label_ids: editFormData.label_ids || [],
                profile: cleanProfile,
            };
            await axios.put(`${API}/api/auth/users/${editingUser.id}/`, payload, getAuth());
            alert('Data user berhasil diperbarui');
            setShowEditModal(false);
            fetchUsers(currentPage);
        } catch (err) {
            console.error(err.response?.data);
            alert('Gagal: ' + JSON.stringify(err.response?.data || err.message));
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
        try {
            await axios.delete(`${API}/api/auth/users/${userId}/`, getAuth());
            alert('User berhasil dihapus'); fetchUsers(currentPage);
        } catch (err) { alert('Gagal menghapus user'); }
    };

    const handleResetPassword = async (user) => {
        if (!window.confirm(`Reset password untuk @${user.username}? Password lama akan tidak berlaku.`)) return;
        setResettingPassword(true);
        try {
            const res = await axios.post(`${API}/api/auth/users/${user.id}/reset_password/`, {}, getAuth());
            setResetPasswordResult(res.data);
            setShowResetPasswordModal(true);
        } catch (err) {
            alert('Gagal reset password: ' + (err.response?.data?.error || err.message));
        } finally {
            setResettingPassword(false);
        }
    };

    const [blastImage, setBlastImage] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBlastImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBlast = async () => {
        if (!blastMessage.trim()) { alert('Tulis pesan terlebih dahulu'); return; }
        setBlasting(true);
        try {
            const payload = { 
                user_ids: selectedUserIds, 
                message: blastMessage,
                image_base64: blastImage // Send image if attached
            };
            const res = await axios.post(`${API}/api/auth/users/blast_whatsapp/`, payload, getAuth());
            setBlastResult(res.data.details);
            alert(`Blast berhasil dikirim ke ${res.data.details.success} nomor unik.`);
        } catch (err) { alert('Gagal mengirim blast'); }
        setBlasting(false);
    };
    const handleBatchUpdate = async () => {
        if (!batchField || batchValue === '') { alert('Pilih kolom dan nilai yang ingin diubah.'); return; }
        if (!window.confirm(`Anda yakin ingin mengubah ${batchField} untuk ${selectedUserIds.length} user terpilih?`)) return;
        setBatching(true);
        try {
            const payload = { user_ids: selectedUserIds, field: batchField, value: batchValue };
            await axios.post(`${API}/api/auth/users/batch_update/`, payload, getAuth());
            alert('Batch update berhasil!');
            setShowBatchModal(false);
            setBatchField('');
            setBatchValue('');
            fetchUsers(currentPage);
            setSelectedUserIds([]);
        } catch (err) { alert('Gagal update: ' + JSON.stringify(err.response?.data || err.message)); }
        setBatching(false);
    };

    const setP = (key, val) => setEditFormData(f => ({ ...f, profile: { ...f.profile, [key]: val } }));

    const UserSkeleton = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-3 py-4 w-10"><div className="w-4 h-4 bg-gray-200 rounded"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-8"></div></th>
                            <th className="px-3 py-4 text-center"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[...Array(5)].map((_, i) => (
                            <tr key={i}>
                                <td className="px-3 py-4"><div className="w-4 h-4 bg-gray-100 rounded"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-24 mb-1"></div><div className="h-2 bg-gray-100 rounded w-16"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-12 rounded-full"></div></td>
                                <td className="px-3 py-4 gap-1 flex"><div className="w-12 h-4 bg-green-50 rounded-full mt-3"></div></td>
                                <td className="px-3 py-4"><div className="w-10 h-4 bg-purple-50 rounded-full"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-28 mb-1"></div><div className="h-2 bg-gray-100 rounded w-6"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4 text-center"><div className="w-4 h-4 bg-gray-200 rounded-full mx-auto"></div></td>
                                <td className="px-3 py-4"><div className="flex justify-center gap-1"><div className="w-7 h-7 bg-gray-100 rounded-lg"></div><div className="w-7 h-7 bg-gray-100 rounded-lg"></div><div className="w-7 h-7 bg-gray-100 rounded-lg"></div></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Manajemen User - Admin</title></Helmet>
            <Header />
            <div className="max-w-7xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
                            <p className="text-sm text-gray-500">{totalCount} pengguna terdaftar</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={openAddModal}
                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-gray-800 transition">
                            <span className="material-icons text-sm">person_add</span> Tambah User
                        </button>
                        {selectedUserIds.length > 0 && (
                            <>
                                <button onClick={() => { setBatchField(''); setBatchValue(''); setShowBatchModal(true); }}
                                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition">
                                    <span className="material-icons text-sm">edit</span> Edit ({selectedUserIds.length})
                                </button>
                                <button onClick={() => { setBlastResult(null); setShowBlastModal(true); }}
                                    className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-green-700 transition">
                                    <span className="material-icons text-sm">chat</span> Blast WA ({selectedUserIds.length})
                                </button>
                            </>
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
                            <option value="user">User</option><option value="admin">Admin</option>
                            <option value="seller">Seller</option><option value="staff">Staff</option>
                        </select>
                        <select value={filterCustomRole} onChange={e => { setFilterCustomRole(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                            <option value="">Semua Custom Role</option>
                            {allRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <select value={filterLabel} onChange={e => { setFilterLabel(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none">
                            <option value="">Semua Label</option>
                            {allLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                        <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
                    </div>
                </div>

                {/* Table */}
                {loading && users.length === 0 ? (
                    <UserSkeleton />
                ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-3 py-4"><input type="checkbox" checked={selectedUserIds.length === users.length && users.length > 0} onChange={toggleSelectAll} className="w-4 h-4 text-green-600 rounded" /></th>
                                    <SH label="User" field="username" {...{sortField,sortDir,handleSort,getSortIcon}} />
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">Email/Phone</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[80px]">Role</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[100px]">Label</th>
                                    <SH label="Nama" field="profile__name_full" {...{sortField,sortDir,handleSort,getSortIcon}} />
                                    <SH label="Join" field="date_joined" {...{sortField,sortDir,handleSort,getSortIcon}} />
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[150px]">Charity</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[150px]">Event</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[150px]">Sinergy</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[150px]">E-Course</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[150px]">Digital</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] text-center">V</th>
                                    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-green-50/30 transition">
                                        <td className="px-3 py-3"><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelectUser(u.id)} className="w-4 h-4 text-green-600 rounded" /></td>
                                        <td className="px-3 py-3">
                                            <div className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black text-[9px] inline-block mb-1">ID: {u.id}</div>
                                            <div className="font-bold text-gray-900 text-[11px] leading-tight">{u.username}</div>
                                            <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{u.email}</div>
                                        </td>
                                        <td className="px-3 py-3 text-gray-600 text-[11px] whitespace-nowrap">
                                            {u.phone || <span className="text-gray-300 italic">None</span>}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${u.role === 'admin' ? 'bg-red-50 text-red-600' : u.role === 'seller' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{u.role}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="max-w-[150px] flex flex-wrap gap-0.5">
                                                {(u.custom_roles||[]).length > 0
                                                    ? (u.custom_roles||[]).map(r => <span key={r.id} className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[9px] font-bold">{r.name}</span>)
                                                    : <span className="text-gray-300 text-[10px]">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="max-w-[150px] flex flex-wrap gap-0.5">
                                                {(u.labels||[]).length > 0
                                                    ? (u.labels||[]).map(l => <span key={l.id} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-bold">{l.name}</span>)
                                                    : <span className="text-gray-300 text-[10px]">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="text-gray-900 font-bold text-[11px] line-clamp-1">{u.profile?.name_full || '-'}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                {PROVINCE_CHOICES.find(p => p[0] === u.profile?.address_province)?.[1] || '-'}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-gray-500 text-[10px] whitespace-nowrap">
                                            {new Date(u.date_joined).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}
                                        </td>
                                        <td className="px-3 py-3"><ActivityList items={u.activities?.charity} /></td>
                                        <td className="px-3 py-3"><ActivityList items={u.activities?.events} /></td>
                                        <td className="px-3 py-3"><ActivityList items={u.activities?.sinergy} /></td>
                                        <td className="px-3 py-3"><ActivityList items={u.activities?.courses} /></td>
                                        <td className="px-3 py-3"><ActivityList items={u.activities?.digital_products} /></td>
                                        <td className="px-3 py-3 text-center">
                                            {u.is_verified_member ? <span className="material-icons text-green-600 text-sm">verified</span> : <span className="material-icons text-gray-200 text-sm">cancel</span>}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => { setSelectedUser(u); setShowDetailModal(true); }} className="w-6 h-6 bg-white border border-gray-100 rounded text-gray-400 hover:text-green-700 hover:bg-green-50 transition flex items-center justify-center" title="Detail">
                                                    <span className="material-icons text-[14px]">visibility</span>
                                                </button>
                                                <button onClick={() => openEditModal(u)} className="w-6 h-6 bg-white border border-gray-100 rounded text-gray-400 hover:text-blue-700 hover:bg-blue-50 transition flex items-center justify-center" title="Edit">
                                                    <span className="material-icons text-[14px]">edit</span>
                                                </button>
                                                <button onClick={() => handleResetPassword(u)} disabled={resettingPassword} className="w-6 h-6 bg-white border border-gray-100 rounded text-gray-400 hover:text-orange-700 hover:bg-orange-50 transition flex items-center justify-center" title="Reset Password">
                                                    <span className="material-icons text-[14px]">lock_reset</span>
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} className="w-6 h-6 bg-white border border-gray-100 rounded text-gray-400 hover:text-red-700 hover:bg-red-50 transition flex items-center justify-center" title="Hapus">
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
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl my-auto">
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
                                        {(selectedUser.labels||[]).map(l => <span key={l.id} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold">{l.name}</span>)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Terdaftar</p>
                                    <p className="text-gray-900 font-bold text-sm">{new Date(selectedUser.date_joined).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
                                    <p className="mt-1">{selectedUser.is_verified_member ? <span className="text-green-600 text-[10px] font-bold flex items-center gap-1 justify-end"><span className="material-icons text-sm">verified</span>Verified</span> : <span className="text-red-400 text-[10px] font-bold">Belum Verified</span>}</p>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2 flex items-center gap-2">
                                        <span className="material-icons text-sm">person_outline</span> Info Dasar
                                    </h3>
                                    <DI icon="alternate_email" label="Email" value={selectedUser.email} />
                                    <DI icon="phone" label="No. Telepon" value={selectedUser.phone} />
                                    <DI icon="wc" label="Jenis Kelamin" value={selectedUser.profile?.gender === 'l' ? 'Laki-laki' : selectedUser.profile?.gender === 'p' ? 'Perempuan' : '-'} />
                                    <DI icon="cake" label="TTL" value={`${selectedUser.profile?.birth_place || '-'}, ${selectedUser.profile?.birth_date || '-'}`} />
                                    <DI icon="favorite" label="Status" value={selectedUser.profile?.marital_status || '-'} />
                                    <DI icon="category" label="Segmen" value={selectedUser.profile?.segment || '-'} />
                                    <DI icon="badge" label="Jabatan BAE" value={selectedUser.position || '-'} />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest border-b border-blue-100 pb-2 flex items-center gap-2">
                                        <span className="material-icons text-sm">school</span> Pendidikan
                                    </h3>
                                    <DI icon="history_edu" label="Level" value={selectedUser.profile?.study_level || '-'} />
                                    <DI icon="account_balance" label="Kampus" value={selectedUser.profile?.study_campus || '-'} />
                                    <DI icon="domain" label="Fakultas" value={selectedUser.profile?.study_faculty || '-'} />
                                    <DI icon="class" label="Prodi" value={selectedUser.profile?.study_program || '-'} />
                                    <DI icon="event_available" label="Tahun" value={`${selectedUser.profile?.study_start_year || '-'} s/d ${selectedUser.profile?.study_finish_year || '-'}`} />
                                    <DI icon="tag" label="Semester" value={selectedUser.profile?.study_semester || '-'} />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-orange-700 uppercase tracking-widest border-b border-orange-100 pb-2 flex items-center gap-2">
                                        <span className="material-icons text-sm">work_outline</span> Pekerjaan & Alamat
                                    </h3>
                                    <DI icon="work" label="Pekerjaan" value={selectedUser.profile?.job || '-'} />
                                    <DI icon="business" label="Instansi" value={selectedUser.profile?.work_institution || '-'} />
                                    <DI icon="payments" label="Gaji" value={selectedUser.profile?.work_salary || '-'} />
                                    <DI icon="location_on" label="Alamat" value={selectedUser.profile?.address || '-'} />
                                    <DI icon="map" label="Provinsi" value={selectedUser.profile?.address_province || '-'} />
                                </div>
                            </div>

                            {/* Activities in Detail */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-icons text-sm">history</span> Riwayat Aktivitas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-green-700 uppercase mb-2">Charity</p>
                                        <ActivityList items={selectedUser.activities?.charity} />
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-blue-700 uppercase mb-2">Events</p>
                                        <ActivityList items={selectedUser.activities?.events} />
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-orange-700 uppercase mb-2">Sinergy</p>
                                        <ActivityList items={selectedUser.activities?.sinergy} />
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-indigo-700 uppercase mb-2">E-Course</p>
                                        <ActivityList items={selectedUser.activities?.courses} />
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-purple-700 uppercase mb-2">Digital Product</p>
                                        <ActivityList items={selectedUser.activities?.digital_products} />
                                    </div>
                                </div>
                            </div>
                            {selectedUser.profile?.ktp_image && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-4">Dokumen KTP</h3>
                                    <div className="bg-gray-50 p-2 rounded-2xl border border-gray-200 inline-block">
                                        <img src={selectedUser.profile.ktp_image.startsWith('http') ? selectedUser.profile.ktp_image : `${API}${selectedUser.profile.ktp_image}`} alt="Foto KTP" className="max-w-md w-full rounded-xl shadow-sm" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-8 py-4 bg-gray-50 rounded-b-3xl border-t flex justify-end">
                            <button onClick={() => setShowDetailModal(false)} className="bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 transition">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ EDIT / ADD MODAL ============ */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl my-4">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">{editingUser ? `Edit User: ${editingUser.username}` : 'Tambah User Baru'}</h2>
                            <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="p-6 max-h-[75vh] overflow-y-auto">
                                {/* Jika tambah user baru, hanya tampilkan field dasar */}
                                {!editingUser ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FI label="Nama Lengkap" value={editFormData.name_full} onChange={v => setEditFormData(f=>({...f, name_full:v}))} />
                                        <FI label="Username" value={editFormData.username} onChange={v => setEditFormData(f=>({...f, username:v}))} />
                                        <FI label="Email" value={editFormData.email} onChange={v => setEditFormData(f=>({...f, email:v}))} />
                                        <FI label="No. Telepon" value={editFormData.phone} onChange={v => setEditFormData(f=>({...f, phone:v}))} />
                                        <FI label="Password (wajib)*" value={editFormData.password} onChange={v => setEditFormData(f=>({...f, password:v}))} type="password" />
                                        <FS label="Role" value={editFormData.role} onChange={v => setEditFormData(f=>({...f, role:v}))} options={[['user','User'],['admin','Admin'],['seller','Seller'],['staff','Staff']]} />
                                        <div className="flex items-center gap-2 col-span-2">
                                            <input type="checkbox" id="is_v_new" checked={editFormData.is_verified_member} onChange={e => setEditFormData(f=>({...f, is_verified_member:e.target.checked}))} className="w-4 h-4 text-blue-600 rounded" />
                                            <label htmlFor="is_v_new" className="text-sm font-medium text-gray-700">Verified Member</label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Col 1: Account */}
                                        <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest border-b border-blue-100 pb-2 mb-2">Data Akun</h3>
                                        <FI label="Username" value={editFormData.username} onChange={v => setEditFormData(f=>({...f, username:v}))} />
                                        <FI label="Email" value={editFormData.email} onChange={v => setEditFormData(f=>({...f, email:v}))} />
                                        <FI label="No. Telepon" value={editFormData.phone} onChange={v => setEditFormData(f=>({...f, phone:v}))} />
                                        <FI label="Jabatan BAE" value={editFormData.position} onChange={v => setEditFormData(f=>({...f, position:v}))} />
                                        <FS label="Role" value={editFormData.role} onChange={v => setEditFormData(f=>({...f, role:v}))} options={[['user','User'],['admin','Admin'],['seller','Seller'],['staff','Staff']]} />
                                        <div className="flex items-center gap-2 mt-2">
                                            <input type="checkbox" id="is_v" checked={editFormData.is_verified_member} onChange={e => setEditFormData(f=>({...f, is_verified_member:e.target.checked}))} className="w-4 h-4 text-blue-600 rounded" />
                                            <label htmlFor="is_v" className="text-sm font-medium text-gray-700">Verified Member</label>
                                        </div>
                                        <div className="space-y-1 mt-3">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Roles</label>
                                            <div className="flex flex-wrap gap-1">
                                                {allRoles.map(r => (
                                                    <label key={r.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(editFormData.custom_role_ids||[]).includes(r.id) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                        <input type="checkbox" checked={(editFormData.custom_role_ids||[]).includes(r.id)}
                                                            onChange={() => { const ids = editFormData.custom_role_ids||[]; setEditFormData(f=>({...f, custom_role_ids: ids.includes(r.id)?ids.filter(x=>x!==r.id):[...ids,r.id]})); }} className="w-3 h-3 text-green-600 rounded" />
                                                        {r.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-1 mt-3">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Labels</label>
                                            <div className="flex flex-wrap gap-1">
                                                {allLabels.map(l => (
                                                    <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(editFormData.label_ids||[]).includes(l.id) ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                        <input type="checkbox" checked={(editFormData.label_ids||[]).includes(l.id)}
                                                            onChange={() => { const ids = editFormData.label_ids||[]; setEditFormData(f=>({...f, label_ids: ids.includes(l.id)?ids.filter(x=>x!==l.id):[...ids,l.id]})); }} className="w-3 h-3 rounded" />
                                                        {l.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Col 2: Personal Info */}
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2 mb-2">Data Diri</h3>
                                        <FI label="Nama Lengkap" value={editFormData.profile?.name_full} onChange={v => setP('name_full',v)} />
                                        <FI label="NIK (No. KTP)" value={editFormData.profile?.nik} onChange={v => setP('nik',v)} />
                                        <FS label="Jenis Kelamin" value={editFormData.profile?.gender} onChange={v => setP('gender',v)} options={GENDER_CHOICES} />
                                        <FI label="Tempat Lahir" value={editFormData.profile?.birth_place} onChange={v => setP('birth_place',v)} />
                                        <FI label="Tanggal Lahir" value={editFormData.profile?.birth_date} onChange={v => setP('birth_date',v)} type="date" />
                                        <FI label="Tgl Registrasi" value={editFormData.profile?.registration_date} onChange={v => setP('registration_date',v)} type="date" />
                                        <FS label="Status Pernikahan" value={editFormData.profile?.marital_status} onChange={v => setP('marital_status',v)} options={MARITAL_CHOICES} />
                                        <FS label="Segmen" value={editFormData.profile?.segment} onChange={v => setP('segment',v)} options={SEGMENT_CHOICES} />
                                        <FI label="Alamat" value={editFormData.profile?.address} onChange={v => setP('address',v)} />
                                        <FS label="Provinsi" value={editFormData.profile?.address_province} onChange={v => setP('address_province',v)} options={PROVINCE_CHOICES} />
                                    </div>

                                    {/* Col 3: Education & Work */}
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-bold text-orange-700 uppercase tracking-widest border-b border-orange-100 pb-2 mb-2">Pendidikan & Pekerjaan</h3>
                                        <FS label="Pendidikan Terakhir" value={editFormData.profile?.study_level} onChange={v => setP('study_level',v)} options={STUDY_LEVEL_CHOICES} />
                                        <FI label="Kampus / Sekolah" value={editFormData.profile?.study_campus} onChange={v => setP('study_campus',v)} />
                                        <FI label="Fakultas" value={editFormData.profile?.study_faculty} onChange={v => setP('study_faculty',v)} />
                                        <FI label="Jurusan" value={editFormData.profile?.study_department} onChange={v => setP('study_department',v)} />
                                        <FI label="Program Studi" value={editFormData.profile?.study_program} onChange={v => setP('study_program',v)} />
                                        <div className="grid grid-cols-3 gap-2">
                                            <FI label="Semester" value={editFormData.profile?.study_semester} onChange={v => setP('study_semester',v)} type="number" />
                                            <FI label="Thn Masuk" value={editFormData.profile?.study_start_year} onChange={v => setP('study_start_year',v)} type="number" />
                                            <FI label="Thn Lulus" value={editFormData.profile?.study_finish_year} onChange={v => setP('study_finish_year',v)} type="number" />
                                        </div>
                                        <FS label="Pekerjaan" value={editFormData.profile?.job} onChange={v => setP('job',v)} options={JOB_CHOICES} />
                                        <FS label="Bidang Kerja" value={editFormData.profile?.work_field} onChange={v => setP('work_field',v)} options={WORK_FIELD_CHOICES} />
                                        <FI label="Instansi" value={editFormData.profile?.work_institution} onChange={v => setP('work_institution',v)} />
                                        <FI label="Jabatan" value={editFormData.profile?.work_position} onChange={v => setP('work_position',v)} />
                                        <FI label="Gaji (Rp)" value={editFormData.profile?.work_salary} onChange={v => setP('work_salary',v)} type="number" />
                                    </div>
                                </div>
                                )} {/* end if editingUser else */}
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
                            <h2 className="text-xl font-bold text-gray-900"><span className="material-icons text-green-600 align-middle mr-2">chat</span>Blast WhatsApp</h2>
                            <button onClick={() => setShowBlastModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">Kirim pesan ke <b>{selectedUserIds.length}</b> user terpilih</p>
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700"><b>Placeholder:</b> {'{name}'}, {'{username}'}, {'{email}'}, {'{phone}'}</div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Pesan</label>
                                <textarea rows="5" value={blastMessage} onChange={e => setBlastMessage(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-500" placeholder="Assalamualaikum {name}, ..." />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Lampiran Gambar (Opsional)</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" id="user-blast-image" className="hidden" onChange={handleImageChange} />
                                        <label htmlFor="user-blast-image" className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-green-300 transition group">
                                            <span className="material-icons text-gray-400 group-hover:text-green-500 transition">image</span>
                                            <span className="text-xs font-bold text-gray-500 group-hover:text-green-700 transition">
                                                {blastImage ? 'Ganti Gambar' : 'Pilih Gambar...'}
                                            </span>
                                        </label>
                                    </div>
                                    {blastImage && (
                                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-100">
                                            <img src={blastImage} className="w-full h-full object-cover" alt="prev" />
                                            <button onClick={() => setBlastImage(null)} className="absolute top-0 right-0 w-5 h-5 bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition">
                                                <span className="material-icons text-[12px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

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

            {/* ============ RESET PASSWORD MODAL ============ */}
            {showResetPasswordModal && resetPasswordResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
                        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white text-center">
                            <span className="material-icons text-4xl mb-2">lock_reset</span>
                            <h2 className="text-lg font-black">Password Direset!</h2>
                        </div>
                        <div className="p-6 text-center">
                            <p className="text-sm text-gray-600 mb-4">
                                Password sementara untuk <span className="font-bold text-gray-800">@{resetPasswordResult.username}</span>:
                            </p>
                            <div className="bg-gray-50 border-2 border-dashed border-orange-300 rounded-2xl p-4 mb-4">
                                <p className="text-2xl font-black text-orange-700 tracking-widest font-mono">
                                    {resetPasswordResult.temp_password}
                                </p>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-left">
                                <p className="text-xs text-yellow-800 font-medium">
                                    ⚠️ <strong>Penting:</strong> Catat dan berikan password ini kepada user. User harus mengganti password setelah login.
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowResetPasswordModal(false); setResetPasswordResult(null); }}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ============ BATCH EDIT MODAL ============ */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900"><span className="material-icons text-blue-600 align-middle mr-2">edit_note</span>Batch Edit User</h2>
                            <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">Mengedit <b>{selectedUserIds.length}</b> user sekaligus.</p>
                            
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Pilih Kolom</label>
                                <select value={batchField} onChange={e => { setBatchField(e.target.value); setBatchValue(''); }}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">-- Pilih Kolom --</option>
                                    <optgroup label="Akun">
                                        <option value="role">Role</option>
                                        <option value="is_verified_member">Status Verified</option>
                                        <option value="custom_role_ids">Custom Role</option>
                                        <option value="label_ids">Label</option>
                                    </optgroup>
                                    <optgroup label="Profil Dasar">
                                        <option value="gender">Jenis Kelamin</option>
                                        <option value="marital_status">Status Pernikahan</option>
                                        <option value="segment">Segmen</option>
                                        <option value="address_province">Provinsi</option>
                                    </optgroup>
                                    <optgroup label="Pendidikan & Kerja">
                                        <option value="study_level">Pendidikan Terakhir</option>
                                        <option value="job">Pekerjaan</option>
                                        <option value="work_field">Bidang Kerja</option>
                                    </optgroup>
                                </select>
                            </div>

                            {batchField && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Nilai Baru</label>
                                    {batchField === 'is_verified_member' ? (
                                        <select value={batchValue} onChange={e => setBatchValue(e.target.value === 'true')}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- Pilih --</option>
                                            <option value="true">Verified</option>
                                            <option value="false">Not Verified</option>
                                        </select>
                                    ) : batchField === 'role' ? (
                                        <select value={batchValue} onChange={e => setBatchValue(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- Pilih --</option>
                                            <option value="user">User</option><option value="admin">Admin</option>
                                            <option value="seller">Seller</option><option value="staff">Staff</option>
                                        </select>
                                    ) : batchField === 'custom_role_ids' ? (
                                        <div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            {allRoles.map(r => (
                                                <label key={r.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(batchValue || []).includes(r.id) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                    <input type="checkbox" checked={(batchValue || []).includes(r.id)}
                                                        onChange={() => { const ids = Array.isArray(batchValue) ? batchValue : []; setBatchValue(ids.includes(r.id)?ids.filter(x=>x!==r.id):[...ids,r.id]); }} className="w-3 h-3 text-green-600 rounded" />
                                                    {r.name}
                                                </label>
                                            ))}
                                        </div>
                                    ) : batchField === 'label_ids' ? (
                                        <div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            {allLabels.map(l => (
                                                <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(batchValue || []).includes(l.id) ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                    <input type="checkbox" checked={(batchValue || []).includes(l.id)}
                                                        onChange={() => { const ids = Array.isArray(batchValue) ? batchValue : []; setBatchValue(ids.includes(l.id)?ids.filter(x=>x!==l.id):[...ids,l.id]); }} className="w-3 h-3 text-purple-600 rounded" />
                                                    {l.name}
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <select value={batchValue} onChange={e => setBatchValue(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- Pilih --</option>
                                            {(batchField === 'gender' ? GENDER_CHOICES :
                                              batchField === 'marital_status' ? MARITAL_CHOICES :
                                              batchField === 'segment' ? SEGMENT_CHOICES :
                                              batchField === 'address_province' ? PROVINCE_CHOICES :
                                              batchField === 'study_level' ? STUDY_LEVEL_CHOICES :
                                              batchField === 'job' ? JOB_CHOICES :
                                              batchField === 'work_field' ? WORK_FIELD_CHOICES : []
                                            ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                        </select>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                            <button onClick={() => setShowBatchModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                            <button onClick={handleBatchUpdate} disabled={batching || !batchField || (Array.isArray(batchValue) ? batchValue.length === 0 : batchValue === '')}
                                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition disabled:opacity-50">
                                {batching ? 'Memproses...' : 'Simpan Perubahan'}
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
        <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
            <span className="material-icons text-gray-400 text-sm">{icon}</span>
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
        <input type={type} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
);
const FS = ({ label, value, onChange, options }) => (
    <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">Pilih</option>
            {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
    </div>
);
const SH = ({ label, field, sortField, sortDir, handleSort, getSortIcon }) => (
    <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-green-700 transition select-none" onClick={() => handleSort(field)}>
        <div className="flex items-center gap-1">{label}<span className="material-icons text-[14px]">{getSortIcon(field)}</span></div>
    </th>
);
const ActivityList = ({ items }) => {
    if (!items || items.length === 0) return <span className="text-gray-300 text-[10px]">-</span>;
    return (
        <div className="flex flex-col gap-0.5">
            {items.map((item, i) => (
                <div key={i} className="text-[9px] leading-tight text-gray-600 bg-gray-50 px-1 py-0.5 rounded border border-gray-100 line-clamp-2">
                    {item}
                </div>
            ))}
        </div>
    );
};

export default DashboardUserPage;
