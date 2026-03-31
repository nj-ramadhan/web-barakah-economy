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

// All available menu keys that can be assigned to roles
const MENU_OPTIONS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'digital_products', label: 'Produk Digital' },
    { key: 'ecourses', label: 'E-Course' },
    { key: 'shop_settings', label: 'Pengaturan Toko' },
    { key: 'charity', label: 'Manajemen Charity' },
    { key: 'partners', label: 'Manajemen Partner' },
    { key: 'testimonials', label: 'Manajemen Testimoni' },
    { key: 'activities', label: 'Manajemen Kegiatan' },
    { key: 'users', label: 'Manajemen User' },
    { key: 'roles', label: 'Manajemen Role' },
    { key: 'all_products', label: 'Semua Produk (Admin)' },
    { key: 'all_courses', label: 'Semua Course (Admin)' },
    { key: 'consultants', label: 'Pengaturan Konsultasi' },
    { key: 'transactions', label: 'Riwayat Transaksi' },
    { key: 'forum', label: 'Manajemen Forum' },
    { key: 'withdrawals', label: 'Manajemen Penarikan' },
    { key: 'campaign_submit', label: 'Ajukan Kampanye' },
    { key: 'campaign_approval', label: 'Persetujuan Kampanye' },
    { key: 'articles', label: 'Tulis Article' },
];

// All profile fields that can be set as required
const PROFILE_FIELDS = [
    { key: 'nik', label: 'NIK KTP' },
    { key: 'ktp_image', label: 'Upload Foto KTP' },
    { key: 'name_full', label: 'Nama Lengkap' },
    { key: 'gender', label: 'Jenis Kelamin' },
    { key: 'birth_place', label: 'Tempat Lahir' },
    { key: 'birth_date', label: 'Tanggal Lahir' },
    { key: 'address', label: 'Alamat' },
    { key: 'address_province', label: 'Provinsi' },
    { key: 'marital_status', label: 'Status Pernikahan' },
    { key: 'segment', label: 'Segmen' },
    { key: 'study_level', label: 'Pendidikan Terakhir' },
    { key: 'job', label: 'Pekerjaan' },
    { key: 'work_field', label: 'Bidang Kerja' },
    { key: 'work_institution', label: 'Instansi' },
];

const DashboardRoleManagementPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('roles');

    // === ROLES STATE ===
    const [roles, setRoles] = useState([]);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState({
        name: '', code: '', description: '',
        accessible_menus: [], required_profile_fields: [],
        is_active: true
    });

    // === LABELS STATE ===
    const [labels, setLabels] = useState([]);
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [editingLabel, setEditingLabel] = useState(null);
    const [labelForm, setLabelForm] = useState({ name: '', code: '', color: 'gray' });

    const fetchRoles = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/auth/roles/`, getAuth());
            setRoles(res.data.results || res.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchLabels = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/auth/labels/`, getAuth());
            setLabels(res.data.results || res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }
        fetchRoles();
        fetchLabels();
    }, [navigate, fetchRoles, fetchLabels]);

    // === ROLE HANDLERS ===
    const openRoleModal = (role = null) => {
        if (role) {
            setEditingRole(role);
            setRoleForm({
                name: role.name, code: role.code, description: role.description || '',
                accessible_menus: role.accessible_menus || [],
                required_profile_fields: role.required_profile_fields || [],
                is_active: role.is_active
            });
        } else {
            setEditingRole(null);
            setRoleForm({ name: '', code: '', description: '', accessible_menus: [], required_profile_fields: [], is_active: true });
        }
        setShowRoleModal(true);
    };

    const handleRoleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await axios.put(`${API}/api/auth/roles/${editingRole.id}/`, roleForm, getAuth());
            } else {
                await axios.post(`${API}/api/auth/roles/`, roleForm, getAuth());
            }
            setShowRoleModal(false);
            fetchRoles();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || 'Gagal menyimpan role');
        }
    };

    const handleRoleDelete = async (id) => {
        if (!window.confirm('Hapus role ini?')) return;
        try {
            await axios.delete(`${API}/api/auth/roles/${id}/`, getAuth());
            fetchRoles();
        } catch (err) { alert('Gagal menghapus'); }
    };

    const toggleMenuAccess = (key) => {
        setRoleForm(f => ({
            ...f,
            accessible_menus: f.accessible_menus.includes(key)
                ? f.accessible_menus.filter(k => k !== key)
                : [...f.accessible_menus, key]
        }));
    };

    const toggleProfileField = (key) => {
        setRoleForm(f => ({
            ...f,
            required_profile_fields: f.required_profile_fields.includes(key)
                ? f.required_profile_fields.filter(k => k !== key)
                : [...f.required_profile_fields, key]
        }));
    };

    // === LABEL HANDLERS ===
    const openLabelModal = (label = null) => {
        if (label) {
            setEditingLabel(label);
            setLabelForm({ name: label.name, code: label.code, color: label.color || 'gray' });
        } else {
            setEditingLabel(null);
            setLabelForm({ name: '', code: '', color: 'gray' });
        }
        setShowLabelModal(true);
    };

    const handleLabelSave = async (e) => {
        e.preventDefault();
        try {
            if (editingLabel) {
                await axios.put(`${API}/api/auth/labels/${editingLabel.id}/`, labelForm, getAuth());
            } else {
                await axios.post(`${API}/api/auth/labels/`, labelForm, getAuth());
            }
            setShowLabelModal(false);
            fetchLabels();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || 'Gagal menyimpan label');
        }
    };

    const handleLabelDelete = async (id) => {
        if (!window.confirm('Hapus label ini?')) return;
        try {
            await axios.delete(`${API}/api/auth/labels/${id}/`, getAuth());
            fetchLabels();
        } catch (err) { alert('Gagal menghapus'); }
    };

    const LABEL_COLORS = ['gray','red','orange','yellow','green','blue','indigo','purple','pink'];

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Manajemen Role & Label - Admin</title></Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-6 pb-20">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Role & Label</h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'roles', label: 'Roles', icon: 'admin_panel_settings' },
                        { key: 'labels', label: 'Label Pengguna', icon: 'label' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                                activeTab === tab.key 
                                    ? 'bg-green-700 text-white shadow-lg shadow-green-100' 
                                    : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                            <span className="material-icons text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ============ ROLES TAB ============ */}
                {activeTab === 'roles' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-gray-500 text-sm">{roles.length} role tersedia</p>
                            <button onClick={() => openRoleModal()} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                                <span className="material-icons text-sm">add</span> Tambah Role
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {roles.map(role => (
                                <div key={role.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-gray-900">{role.name}</h3>
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-bold">{role.code}</span>
                                                {!role.is_active && <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-bold">Non-Aktif</span>}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{role.description || '-'}</p>
                                            <div className="flex flex-wrap gap-1 mt-3">
                                                {(role.accessible_menus || []).map(m => (
                                                    <span key={m} className="text-[9px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{
                                                        MENU_OPTIONS.find(opt => opt.key === m)?.label || m
                                                    }</span>
                                                ))}
                                            </div>
                                            {(role.required_profile_fields || []).length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    <span className="text-[9px] text-orange-600 font-bold mr-1">Wajib:</span>
                                                    {role.required_profile_fields.map(f => (
                                                        <span key={f} className="text-[9px] px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full">{
                                                            PROFILE_FIELDS.find(opt => opt.key === f)?.label || f
                                                        }</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openRoleModal(role)} className="w-8 h-8 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-700 hover:border-blue-200 flex items-center justify-center transition">
                                                <span className="material-icons text-sm">edit</span>
                                            </button>
                                            <button onClick={() => handleRoleDelete(role.id)} className="w-8 h-8 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-700 hover:border-red-200 flex items-center justify-center transition">
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ============ LABELS TAB ============ */}
                {activeTab === 'labels' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-gray-500 text-sm">{labels.length} label tersedia</p>
                            <button onClick={() => openLabelModal()} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                                <span className="material-icons text-sm">add</span> Tambah Label
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-gray-600 font-bold text-[11px] uppercase">Nama</th>
                                        <th className="px-6 py-4 text-gray-600 font-bold text-[11px] uppercase">Kode</th>
                                        <th className="px-6 py-4 text-gray-600 font-bold text-[11px] uppercase">Warna</th>
                                        <th className="px-6 py-4 text-gray-600 font-bold text-[11px] uppercase text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {labels.map(l => (
                                        <tr key={l.id} className="hover:bg-green-50/30 transition">
                                            <td className="px-6 py-4 font-bold text-gray-900">{l.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{l.code}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block w-6 h-6 rounded-full bg-${l.color}-400 border-2 border-white shadow`}></span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => openLabelModal(l)} className="w-8 h-8 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-700 hover:border-blue-200 flex items-center justify-center transition">
                                                        <span className="material-icons text-sm">edit</span>
                                                    </button>
                                                    <button onClick={() => handleLabelDelete(l.id)} className="w-8 h-8 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-700 hover:border-red-200 flex items-center justify-center transition">
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

            {/* ============ ROLE MODAL ============ */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl my-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">{editingRole ? 'Edit Role' : 'Tambah Role Baru'}</h2>
                            <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleRoleSave}>
                            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Role</label>
                                        <input type="text" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} placeholder="Contoh: Campaign Creator" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kode</label>
                                        <input type="text" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono" value={roleForm.code} onChange={e => setRoleForm({...roleForm, code: e.target.value})} placeholder="campaign_creator" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi</label>
                                    <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" rows="2" value={roleForm.description} onChange={e => setRoleForm({...roleForm, description: e.target.value})} />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3 block">Menu yang Dapat Diakses</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {MENU_OPTIONS.map(opt => (
                                            <label key={opt.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${
                                                roleForm.accessible_menus.includes(opt.key) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                                            }`}>
                                                <input type="checkbox" checked={roleForm.accessible_menus.includes(opt.key)} onChange={() => toggleMenuAccess(opt.key)} className="w-4 h-4 text-green-600 rounded" />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-3 block">Persyaratan Data Profile Wajib</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {PROFILE_FIELDS.map(opt => (
                                            <label key={opt.key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${
                                                roleForm.required_profile_fields.includes(opt.key) ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                                            }`}>
                                                <input type="checkbox" checked={roleForm.required_profile_fields.includes(opt.key)} onChange={() => toggleProfileField(opt.key)} className="w-4 h-4 text-orange-600 rounded" />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="role_active" checked={roleForm.is_active} onChange={e => setRoleForm({...roleForm, is_active: e.target.checked})} className="w-4 h-4 text-green-600 rounded" />
                                    <label htmlFor="role_active" className="text-sm font-medium text-gray-700">Role Aktif</label>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
                                <button type="button" onClick={() => setShowRoleModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                                <button type="submit" className="bg-green-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============ LABEL MODAL ============ */}
            {showLabelModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">{editingLabel ? 'Edit Label' : 'Tambah Label Baru'}</h2>
                            <button onClick={() => setShowLabelModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleLabelSave}>
                            <div className="p-8 space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Label</label>
                                    <input type="text" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={labelForm.name} onChange={e => setLabelForm({...labelForm, name: e.target.value})} placeholder="Contoh: Donatur Aktif" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kode (disamarkan untuk non-admin)</label>
                                    <input type="text" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none font-mono" value={labelForm.code} onChange={e => setLabelForm({...labelForm, code: e.target.value})} placeholder="DA001" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Warna</label>
                                    <div className="flex flex-wrap gap-2">
                                        {LABEL_COLORS.map(c => (
                                            <button key={c} type="button" onClick={() => setLabelForm({...labelForm, color: c})}
                                                className={`w-8 h-8 rounded-full bg-${c}-400 border-2 transition ${labelForm.color === c ? 'border-gray-900 scale-110 shadow-lg' : 'border-white shadow'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-3xl">
                                <button type="button" onClick={() => setShowLabelModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                                <button type="submit" className="bg-green-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardRoleManagementPage;
