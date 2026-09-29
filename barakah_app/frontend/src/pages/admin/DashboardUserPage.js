import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getMediaUrl } from '../../utils/mediaUtils';

const API = process.env.REACT_APP_API_BASE_URL;
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

const GENDER_CHOICES = [['l', 'Laki-laki'], ['p', 'Perempuan']];
const MARITAL_CHOICES = [['bn', 'Belum Nikah'], ['n', 'Nikah'], ['d', 'Duda'], ['j', 'Janda']];
const SEGMENT_CHOICES = [['mahasiswa', 'Mahasiswa'], ['pelajar', 'Pelajar'], ['santri', 'Santri'], ['karyawan', 'Karyawan'], ['umum', 'Umum']];
const STUDY_LEVEL_CHOICES = [['sd', 'SD/Setara'], ['smp', 'SMP/Setara'], ['sma', 'SMA/SMK/Setara'], ['s1', 'Sarjana'], ['s2', 'Magister'], ['s3', 'Doktor']];
const JOB_CHOICES = [['mahasiswa', 'Mahasiswa'], ['asn', 'ASN'], ['karyawan_swasta', 'Karyawan Swasta'], ['guru', 'Guru'], ['dosen', 'Dosen'], ['dokter', 'Dokter'], ['perawat', 'Perawat'], ['apoteker', 'Apoteker'], ['programmer', 'Programmer'], ['data_scientist', 'Data Scientist'], ['desainer_grafis', 'Desainer Grafis'], ['marketing', 'Marketing'], ['hrd', 'HRD'], ['akuntan', 'Akuntan'], ['konsultan', 'Konsultan'], ['arsitek', 'Arsitek'], ['insinyur', 'Insinyur'], ['peneliti', 'Peneliti'], ['jurnalis', 'Jurnalis'], ['penulis', 'Penulis'], ['penerjemah', 'Penerjemah'], ['pilot', 'Pilot'], ['pramugari', 'Pramugari'], ['chef', 'Chef'], ['pengusaha', 'Pengusaha'], ['petani', 'Petani'], ['nelayan', 'Nelayan'], ['pengrajin', 'Pengrajin'], ['teknisi', 'Teknisi'], ['seniman', 'Seniman'], ['musisi', 'Musisi'], ['atlet', 'Atlet'], ['polisi', 'Polisi'], ['tentara', 'Tentara'], ['pengacara', 'Pengacara'], ['notaris', 'Notaris'], ['psikolog', 'Psikolog'], ['sopir', 'Sopir'], ['kurir', 'Kurir'], ['barista', 'Barista'], ['freelancer', 'Freelancer']];
const WORK_FIELD_CHOICES = [['pendidikan', 'Pendidikan'], ['kesehatan', 'Kesehatan'], ['ekobis', 'Ekonomi Bisnis'], ['agrotek', 'Agrotek'], ['herbal', 'Herbal-Farmasi'], ['it', 'IT'], ['manufaktur', 'Manufaktur'], ['energi', 'Energi-Mineral'], ['sains', 'Sains'], ['teknologi', 'Teknologi'], ['polhuk', 'Politik-Hukum'], ['humaniora', 'Humaniora'], ['media', 'Media-Literasi'], ['sejarah', 'Sejarah']];
const PROVINCE_CHOICES = [['aceh', 'Aceh'], ['sumatera_utara', 'Sumatera Utara'], ['sumatera_barat', 'Sumatera Barat'], ['riau', 'Riau'], ['jambi', 'Jambi'], ['sumatera_selatan', 'Sumatera Selatan'], ['bengkulu', 'Bengkulu'], ['lampung', 'Lampung'], ['kepulauan_bangka_belitung', 'Kep. Bangka Belitung'], ['kepulauan_riau', 'Kepulauan Riau'], ['dki_jakarta', 'DKI Jakarta'], ['jawa_barat', 'Jawa Barat'], ['jawa_tengah', 'Jawa Tengah'], ['di_yogyakarta', 'DI Yogyakarta'], ['jawa_timur', 'Jawa Timur'], ['banten', 'Banten'], ['bali', 'Bali'], ['nusa_tenggara_barat', 'NTB'], ['nusa_tenggara_timur', 'NTT'], ['kalimantan_barat', 'Kalimantan Barat'], ['kalimantan_tengah', 'Kalimantan Tengah'], ['kalimantan_selatan', 'Kalimantan Selatan'], ['kalimantan_timur', 'Kalimantan Timur'], ['kalimantan_utara', 'Kalimantan Utara'], ['sulawesi_utara', 'Sulawesi Utara'], ['sulawesi_tengah', 'Sulawesi Tengah'], ['sulawesi_selatan', 'Sulawesi Selatan'], ['sulawesi_tenggara', 'Sulawesi Tenggara'], ['gorontalo', 'Gorontalo'], ['sulawesi_barat', 'Sulawesi Barat'], ['maluku', 'Maluku'], ['maluku_utara', 'Maluku Utara'], ['papua', 'Papua'], ['papua_barat', 'Papua Barat']];

const AGAMA_MAP = {
    'islam': 'Islam',
    'kristen': 'Kristen',
    'katolik': 'Katolik',
    'hindu': 'Hindu',
    'buddha': 'Buddha',
    'konghucu': 'Konghucu',
    'kepercayaan': 'Kepercayaan'
};
const AGAMA_CHOICES = [['islam', 'Islam'], ['kristen', 'Kristen'], ['katolik', 'Katolik'], ['hindu', 'Hindu'], ['buddha', 'Buddha'], ['konghucu', 'Konghucu'], ['kepercayaan', 'Kepercayaan']];

// Multi-select dropdown popover for filtering users
const MultiSelectDropdown = ({ label, icon, options, selected, onChange }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const filteredOptions = options.filter(opt =>
        String(opt.label).toLowerCase().includes(search.toLowerCase())
    );

    const toggleOption = (val) => {
        const valStr = String(val);
        if (selected.includes(valStr)) {
            onChange(selected.filter(x => x !== valStr));
        } else {
            onChange([...selected, valStr]);
        }
    };

    const isAllSelected = options.length > 0 && selected.length === options.length;

    const handleToggleAll = () => {
        if (isAllSelected) {
            onChange([]);
        } else {
            onChange(options.map(opt => String(opt.value)));
        }
    };

    const count = selected.length;

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition ${
                    count > 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/10'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
            >
                {icon && <span className="material-icons text-sm opacity-70">{icon}</span>}
                <span>{label}</span>
                {count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black">
                        {count}
                    </span>
                )}
                <span className="material-icons text-xs text-gray-400">
                    {open ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {open && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2.5 z-[100] animate-in fade-in zoom-in-95 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 text-[11px]">
                        <span className="font-black text-gray-800">{label}</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleToggleAll}
                                className="text-emerald-700 hover:underline font-bold"
                            >
                                {isAllSelected ? 'Reset' : 'Semua'}
                            </button>
                            {count > 0 && !isAllSelected && (
                                <button
                                    type="button"
                                    onClick={() => onChange([])}
                                    className="text-red-500 hover:underline"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    </div>

                    {options.length > 5 && (
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                        </div>
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-0.5 divide-y divide-gray-50">
                        {filteredOptions.length === 0 ? (
                            <p className="text-[11px] text-gray-400 p-2 text-center">Tidak ditemukan</p>
                        ) : (
                            filteredOptions.map(opt => {
                                const optValStr = String(opt.value);
                                const isChecked = selected.includes(optValStr);
                                return (
                                    <label
                                        key={optValStr}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-emerald-50/50 rounded-lg cursor-pointer text-xs select-none transition"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleOption(opt.value)}
                                            className="rounded text-emerald-600 w-3.5 h-3.5"
                                        />
                                        <span className={`flex-1 truncate ${isChecked ? 'font-bold text-emerald-900' : 'text-gray-700'}`}>
                                            {opt.label}
                                        </span>
                                        {opt.badge && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                {opt.badge}
                                            </span>
                                        )}
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const DashboardUserPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    // Multi-select filters
    const [filterRoles, setFilterRoles] = useState([]);
    const [filterCustomRoles, setFilterCustomRoles] = useState([]);
    const [filterLabels, setFilterLabels] = useState([]);
    const [filterLingkup, setFilterLingkup] = useState([]);
    const [filterBidang, setFilterBidang] = useState([]);
    const [filterAgama, setFilterAgama] = useState([]);
    const [filterVerified, setFilterVerified] = useState([]);
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortField, setSortField] = useState('');
    const [sortDir, setSortDir] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [zoomedPhoto, setZoomedPhoto] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [editAgamaDropdown, setEditAgamaDropdown] = useState('');
    const [editCustomAgama, setEditCustomAgama] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [blastMessage, setBlastMessage] = useState('');
    const [blasting, setBlasting] = useState(false);
    const [blastResult, setBlastResult] = useState(null);
    const [waMinDelay, setWaMinDelay] = useState(15);
    const [waMaxDelay, setWaMaxDelay] = useState(30);

    const [showEmailBlastModal, setShowEmailBlastModal] = useState(false);
    const [emailBlastSubject, setEmailBlastSubject] = useState('');
    const [emailBlastMessage, setEmailBlastMessage] = useState('Halo {name},\n\n');
    const [emailBlastAttachments, setEmailBlastAttachments] = useState([]);
    const [blastingEmail, setBlastingEmail] = useState(false);
    const [emailBlastResult, setEmailBlastResult] = useState(null);
    const [isEmailDecorated, setIsEmailDecorated] = useState(true);
    const [emailThemeColor, setEmailThemeColor] = useState('#059669');
    const [emailHeaderTitle, setEmailHeaderTitle] = useState('Barakah Economy');
    const [emailHeaderSubtitle, setEmailHeaderSubtitle] = useState('');
    const [emailBadgeText, setEmailBadgeText] = useState('PENAWARAN SPESIAL');
    const [emailCtaText, setEmailCtaText] = useState('Lihat Penawaran');
    const [emailCtaUrl, setEmailCtaUrl] = useState('https://barakaheconomy.id');
    const [emailHeroImageUrl, setEmailHeroImageUrl] = useState('');
    const [emailMinDelay, setEmailMinDelay] = useState(3.0);
    const [emailMaxDelay, setEmailMaxDelay] = useState(6.0);
    const [emailModalTab, setEmailModalTab] = useState('edit'); // 'edit' | 'preview'
    const [allRoles, setAllRoles] = useState([]);
    const [allLabels, setAllLabels] = useState([]);
    const [allLingkup, setAllLingkup] = useState([]);
    const [allBidang, setAllBidang] = useState([]);
    // Reset password state
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordResult, setResetPasswordResult] = useState(null);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [batching, setBatching] = useState(false);
    const [deletingBulk, setDeletingBulk] = useState(false);
    // Batch edit state
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchField, setBatchField] = useState('');
    const [batchValue, setBatchValue] = useState('');
    // Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [hoveredPhoto, setHoveredPhoto] = useState(null);

    const fetchMeta = useCallback(async () => {
        try {
            const [rolesRes, labelsRes, lingkupRes, bidangRes] = await Promise.all([
                axios.get(`${API}/api/auth/roles/`, getAuth()),
                axios.get(`${API}/api/auth/labels/`, getAuth()),
                axios.get(`${API}/api/auth/lingkup-tugas/`, getAuth()),
                axios.get(`${API}/api/auth/bidang-tugas/`, getAuth()),
            ]);
            setAllRoles(rolesRes.data.results || rolesRes.data);
            setAllLabels(labelsRes.data.results || labelsRes.data);
            setAllLingkup(lingkupRes.data.results || lingkupRes.data);
            setAllBidang(bidangRes.data.results || bidangRes.data);
        } catch (err) { 
            console.error(err); 
            alert('Gagal mengambil metadata (roles/labels). Pastikan Anda memiliki akses Admin.');
        }
    }, []);

    const abortControllerRef = useRef(null);

    // Debounce search query (350ms for snappy response)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const fetchUsers = useCallback(async (page = 1) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        try {
            const params = { page };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterRoles.length) params.role = filterRoles.join(',');
            if (filterCustomRoles.length) params.custom_role = filterCustomRoles.join(',');
            if (filterLabels.length) params.label = filterLabels.join(',');
            if (filterLingkup.length) params.lingkup_tugas = filterLingkup.join(',');
            if (filterBidang.length) params.bidang_tugas = filterBidang.join(',');
            if (filterAgama.length) params.agama = filterAgama.join(',');
            if (filterVerified.length === 1) params.verified = filterVerified[0];
            if (filterDateFrom) params.date_from = filterDateFrom;
            if (filterDateTo) params.date_to = filterDateTo;
            if (sortField && sortDir) params.ordering = sortDir === 'desc' ? `-${sortField}` : sortField;
            if (pageSize && pageSize !== 'all') params.page_size = pageSize;
            if (pageSize === 'all') params.page_size = 10000;

            const response = await axios.get(`${API}/api/auth/users/`, {
                params,
                signal: controller.signal,
                ...getAuth()
            });

            if (response.data.results) {
                setUsers(response.data.results);
                setTotalCount(response.data.count);
                const ps = pageSize === 'all' ? response.data.count : parseInt(pageSize);
                setTotalPages(Math.ceil(response.data.count / (ps || 1)));
            } else {
                setUsers(response.data);
                setTotalCount(response.data.length);
                setTotalPages(1);
            }
        } catch (err) {
            if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                return; // Silently ignore cancelled requests
            }
            console.error(err); 
            alert('Gagal mengambil data user: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, pageSize, filterRoles, filterCustomRoles, filterLabels, filterLingkup, filterBidang, filterDateFrom, filterDateTo, sortField, sortDir, filterAgama, filterVerified]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') { navigate('/dashboard'); return; }
        fetchMeta();
    }, [navigate, fetchMeta]);

    useEffect(() => { 
        // Initial fetch or page change
        fetchUsers(currentPage); 
    }, [currentPage, fetchUsers, pageSize]);

    const handleResetAllFilters = () => {
        setFilterRoles([]);
        setFilterCustomRoles([]);
        setFilterLabels([]);
        setFilterLingkup([]);
        setFilterBidang([]);
        setFilterAgama([]);
        setFilterVerified([]);
        setFilterDateFrom('');
        setFilterDateTo('');
        setSearchQuery('');
        setCurrentPage(1);
    };

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
            const params = {};
            if (searchQuery) params.search = searchQuery;
            if (filterRoles.length) params.role = filterRoles.join(',');
            if (filterCustomRoles.length) params.custom_role = filterCustomRoles.join(',');
            if (filterLabels.length) params.label = filterLabels.join(',');
            if (filterLingkup.length) params.lingkup_tugas = filterLingkup.join(',');
            if (filterBidang.length) params.bidang_tugas = filterBidang.join(',');
            if (filterAgama.length) params.agama = filterAgama.join(',');
            if (filterVerified.length === 1) params.verified = filterVerified[0];
            if (filterDateFrom) params.date_from = filterDateFrom;
            if (filterDateTo) params.date_to = filterDateTo;
            if (selectedUserIds.length > 0) params.user_ids = selectedUserIds.join(',');

            const response = await axios.get(`${API}/api/auth/users/export_csv/`, {
                params,
                ...getAuth(),
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `users_full_data_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            let errorMsg = 'Gagal export data user.';
            if (err.response && err.response.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    errorMsg += ` Server: ${text}`;
                } catch (e) {}
            } else if (err.message) {
                errorMsg += ` ${err.message}`;
            }
            alert(errorMsg);
        }
    };

    const handleImportCsv = async (e) => {
        e.preventDefault();
        if (!importFile) return;
        setImporting(true);
        setImportResult(null);
        try {
            const formData = new FormData();
            formData.append('file', importFile);
            const res = await axios.post(`${API}/api/auth/users/import_csv/`, formData, {
                headers: {
                    ...getAuth().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setImportResult(res.data);
            alert(res.data.message);
            fetchUsers(currentPage);
        } catch (err) {
            alert('Gagal import: ' + (err.response?.data?.error || err.message));
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get(`${API}/api/auth/users/download_import_template/`, {
                ...getAuth(),
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'template_import_user.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Gagal download template');
        }
    };

    const handleInlineEdit = async (userId, field, value) => {
        try {
            await axios.post(`${API}/api/auth/users/batch_update/`, {
                user_ids: [userId],
                field,
                value
            }, getAuth());
            // Update local state without fetching all
            setUsers(users.map(u => {
                if (u.id === userId) {
                    if (['role', 'phone', 'username', 'email', 'is_verified_member'].includes(field)) {
                        return { ...u, [field]: value };
                    } else if (['name_full', 'id_m', 'address_province', 'nickname', 'agama', 'info_source', 'referred_by'].includes(field)) {
                        return { ...u, profile: { ...u.profile, [field]: value } };
                    } else if (field === 'custom_role_ids') {
                        return { ...u, custom_roles: allRoles.filter(r => value.includes(r.id)) };
                    } else if (field === 'label_ids') {
                        return { ...u, labels: allLabels.filter(r => value.includes(r.id)) };
                    } else if (field === 'lingkup_tugas_ids') {
                        return { ...u, lingkup_tugas: allLingkup.filter(r => value.includes(r.id)) };
                    } else if (field === 'bidang_tugas_ids') {
                        return { ...u, bidang_tugas: allBidang.filter(r => value.includes(r.id)) };
                    }
                }
                return u;
            }));
        } catch (err) {
            alert('Gagal update inline: ' + (err.response?.data?.error || err.message));
        }
    };

    const openAddModal = () => {
        setEditingUser(null);
        setEditAgamaDropdown('');
        setEditCustomAgama('');
        setEditFormData({
            username: '', email: '', phone: '', password: '',
            role: 'user', is_verified_member: false,
            name_full: '', nickname: '', id_m: '', custom_role_ids: [], label_ids: [], profile: {}
        });
        setShowEditModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        const p = user.profile || {};
        const agamaVal = p.agama || '';
        if (['', 'islam', 'kristen', 'katolik', 'hindu', 'buddha', 'konghucu'].includes(agamaVal)) {
            setEditAgamaDropdown(agamaVal);
            setEditCustomAgama('');
        } else {
            setEditAgamaDropdown('kepercayaan');
            setEditCustomAgama(agamaVal);
        }
        setEditFormData({
            username: user.username, email: user.email, phone: user.phone || '',
            role: user.role, is_verified_member: user.is_verified_member,
            custom_role_ids: (user.custom_roles || []).map(r => r.id),
            label_ids: (user.labels || []).map(l => l.id),
            lingkup_tugas_ids: (user.lingkup_tugas || []).map(l => l.id),
            bidang_tugas_ids: (user.bidang_tugas || []).map(b => b.id),
            profile: {
                name_full: p.name_full || '', nickname: p.nickname || '', nik: p.nik || '', gender: p.gender || '', agama: p.agama || '', birth_place: p.birth_place || '',
                birth_date: p.birth_date || '', registration_date: p.registration_date || '',
                marital_status: p.marital_status || '', segment: p.segment || '',
                study_level: p.study_level || '', study_campus: p.study_campus || '',
                study_faculty: p.study_faculty || '', study_department: p.study_department || '',
                study_program: p.study_program || '', study_semester: p.study_semester || '',
                study_start_year: p.study_start_year || '', study_finish_year: p.study_finish_year || '',
                address: p.address || '', address_province: p.address_province || '',
                job: p.job || '', work_field: p.work_field || '', work_institution: p.work_institution || '',
                work_position: p.work_position || '', work_salary: p.work_salary || '',
                id_m: p.id_m || '',
            }
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            // Mode buat user baru
            if (!editingUser) {
                if (!editFormData.name_full) { alert('Nama Lengkap wajib diisi.'); return; }
                if (!editFormData.email) { alert('Email wajib diisi.'); return; }
                if (!editFormData.phone) { alert('No. Telepon / WA wajib diisi.'); return; }
                if (!editFormData.password) { alert('Password wajib diisi.'); return; }
                const payload = {
                    username: editFormData.username, email: editFormData.email,
                    phone: editFormData.phone, password: editFormData.password,
                    role: editFormData.role, is_verified_member: editFormData.is_verified_member,
                    name_full: editFormData.name_full || '',
                    nickname: editFormData.nickname || '',
                    id_m: editFormData.id_m || '',
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
                // Only skip if truly null or undefined, allow empty string for some fields if needed
                // But for most, empty string means reset. IDM should be allowed to be empty or set.
                if (v !== null && v !== undefined) cleanProfile[k] = v;
            });
            const payload = {
                username: editFormData.username,
                email: editFormData.email,
                phone: editFormData.phone,
                role: editFormData.role,
                is_verified_member: editFormData.is_verified_member,
                custom_role_ids: editFormData.custom_role_ids || [],
                label_ids: editFormData.label_ids || [],
                lingkup_tugas_ids: editFormData.lingkup_tugas_ids || [],
                bidang_tugas_ids: editFormData.bidang_tugas_ids || [],
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

    const handleBulkDelete = async () => {
        if (selectedUserIds.length === 0) return;
        const count = selectedUserIds.length;
        if (!window.confirm(`⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS PERMANEN ${count} akun pengguna yang dipilih?\n\nSemua data terkait akun tersebut akan dihapus dan tindakan ini TIDAK dapat dibatalkan!`)) {
            return;
        }
        setDeletingBulk(true);
        try {
            const payload = { user_ids: selectedUserIds };
            const res = await axios.post(`${API}/api/auth/users/bulk_delete/`, payload, getAuth());
            alert(res.data?.message || `${count} akun berhasil dihapus.`);
            setSelectedUserIds([]);
            fetchUsers(currentPage);
        } catch (err) {
            alert('Gagal menghapus user: ' + (err.response?.data?.error || err.message));
        } finally {
            setDeletingBulk(false);
        }
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
                image_base64: blastImage,
                min_delay: Number(waMinDelay) || 15,
                max_delay: Number(waMaxDelay) || 30
            };
            const res = await axios.post(`${API}/api/auth/users/blast_whatsapp/`, payload, getAuth());
            setBlastResult(res.data.details || res.data);
            alert(res.data.message || `Antrean blast WhatsApp berhasil dibuat untuk ${selectedUserIds.length} user.`);
        } catch (err) { 
            alert('Gagal mengirim blast WA: ' + (err.response?.data?.error || err.message)); 
        }
        setBlasting(false);
    };

    const handleEmailAttachmentChange = (e) => {
        const files = Array.from(e.target.files);
        setEmailBlastAttachments(prev => [...prev, ...files]);
    };

    const handleRemoveEmailAttachment = (index) => {
        setEmailBlastAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleEmailBlast = async () => {
        if (!emailBlastSubject.trim() || !emailBlastMessage.trim()) { alert('Subjek dan pesan wajib diisi'); return; }
        setBlastingEmail(true);
        try {
            const formData = new FormData();
            formData.append('subject', emailBlastSubject);
            formData.append('message', emailBlastMessage);
            formData.append('user_ids', JSON.stringify(selectedUserIds));
            formData.append('is_decorated', isEmailDecorated ? 'true' : 'false');
            formData.append('theme_color', emailThemeColor);
            formData.append('header_title', emailHeaderTitle);
            formData.append('header_subtitle', emailHeaderSubtitle);
            formData.append('badge_text', emailBadgeText);
            formData.append('cta_text', emailCtaText);
            formData.append('cta_url', emailCtaUrl);
            formData.append('hero_image_url', emailHeroImageUrl);
            formData.append('min_delay', Number(emailMinDelay) || 3.0);
            formData.append('max_delay', Number(emailMaxDelay) || 6.0);

            emailBlastAttachments.forEach(file => {
                formData.append('attachments', file);
            });
            const res = await axios.post(`${API}/api/auth/users/blast_email/`, formData, {
                headers: {
                    ...getAuth().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setEmailBlastResult(res.data.details || res.data);
            alert(res.data.message || `Antrean blast email berhasil dijadwalkan untuk ${selectedUserIds.length} user.`);
            setShowEmailBlastModal(false);
            setEmailBlastSubject('');
            setEmailBlastMessage('Halo {name},\n\n');
            setEmailBlastAttachments([]);
        } catch (err) {
            alert('Gagal mengirim blast email: ' + (err.response?.data?.error || err.message));
        }
        setBlastingEmail(false);
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
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-10"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></th>
                            <th className="px-3 py-4"><div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div></th>
                            <th className="px-3 py-4 text-center"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[...Array(5)].map((_, i) => (
                            <tr key={i}>
                                <td className="px-3 py-4"><div className="w-4 h-4 bg-gray-100 rounded"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-10"></div></td>
                                <td className="px-3 py-4"><div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-14"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-12 rounded-full"></div></td>
                                <td className="px-3 py-4"><div className="w-12 h-4 bg-green-50 rounded-full"></div></td>
                                <td className="px-3 py-4"><div className="w-10 h-4 bg-purple-50 rounded-full"></div></td>
                                <td className="px-3 py-4"><div className="h-4 bg-gray-100 rounded w-28 mb-1"></div><div className="h-2 bg-gray-100 rounded w-6"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-20"></div></td>
                                <td className="px-3 py-4"><div className="h-3 bg-gray-100 rounded w-16"></div></td>
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
                {/* Floating Header */}
                <div className="sticky top-[64px] bg-gray-50/95 backdrop-blur-md z-[90] py-4 flex items-center justify-between mb-6 -mx-4 px-4 border-b border-gray-100 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Manajemen User & Performa</h1>
                            <p className="text-sm text-gray-500">{totalCount} pengguna terdaftar</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <button onClick={openAddModal}
                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-gray-800 transition">
                            <span className="material-icons text-sm">person_add</span> Tambah User
                        </button>
                        <button onClick={() => { setImportResult(null); setImportFile(null); setShowImportModal(true); }}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition">
                            <span className="material-icons text-sm">upload_file</span> Import CSV
                        </button>
                        <button onClick={handleDownloadTemplate}
                            className="bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm border border-blue-100 hover:bg-blue-100 transition">
                            <span className="material-icons text-sm">download</span> Template Import
                        </button>
                        <button onClick={handleExportCsv}
                            className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                            <span className="material-icons text-sm">download</span> Export CSV
                        </button>
                        {selectedUserIds.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => { setBatchField(''); setBatchValue(''); setShowBatchModal(true); }}
                                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition active:scale-95">
                                    <span className="material-icons text-sm">edit</span> Edit ({selectedUserIds.length})
                                </button>
                                <button onClick={() => { setBlastResult(null); setShowBlastModal(true); }}
                                    className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-700 transition active:scale-95">
                                    <span className="material-icons text-sm">chat</span> Blast WA ({selectedUserIds.length})
                                </button>
                                <button onClick={() => { setEmailBlastResult(null); setShowEmailBlastModal(true); }}
                                    className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm border border-amber-200 hover:bg-amber-100 hover:text-amber-800 transition active:scale-95">
                                    <span className="material-icons text-sm text-amber-600">mail</span> Blast Email ({selectedUserIds.length})
                                </button>
                                <button onClick={handleBulkDelete} disabled={deletingBulk}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-100 transition active:scale-95 disabled:opacity-50">
                                    <span className="material-icons text-sm">{deletingBulk ? 'sync' : 'delete_forever'}</span>
                                    {deletingBulk ? 'Menghapus...' : `Hapus Akun (${selectedUserIds.length})`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search & Multi-Select Filters */}
                <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100 space-y-3">
                    <div className="flex flex-wrap gap-2.5 items-center">
                        <div className="flex-1 min-w-[220px]">
                            <div className="relative">
                                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Cari nama, username, email, phone, IDM..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500" 
                                />
                                {searchQuery && (
                                    <button 
                                        type="button" 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <span className="material-icons text-sm">close</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Page Size */}
                        <select 
                            value={pageSize} 
                            onChange={e => { setPageSize(e.target.value); setCurrentPage(1); }}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs outline-none font-bold text-emerald-800"
                        >
                            <option value="10">10 / hal</option>
                            <option value="25">25 / hal</option>
                            <option value="50">50 / hal</option>
                            <option value="100">100 / hal</option>
                            <option value="all">Semua Data</option>
                        </select>

                        {/* Multi-Select: Roles */}
                        <MultiSelectDropdown
                            label="Role"
                            icon="badge"
                            options={[
                                { value: 'user', label: 'User' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'seller', label: 'Seller' },
                                { value: 'staff', label: 'Staff' }
                            ]}
                            selected={filterRoles}
                            onChange={(val) => { setFilterRoles(val); setCurrentPage(1); }}
                        />

                        {/* Multi-Select: Status Verified */}
                        <MultiSelectDropdown
                            label="Status Verifikasi"
                            icon="verified"
                            options={[
                                { value: 'true', label: 'Terverifikasi (Member)' },
                                { value: 'false', label: 'Belum Terverifikasi' }
                            ]}
                            selected={filterVerified}
                            onChange={(val) => { setFilterVerified(val); setCurrentPage(1); }}
                        />

                        {/* Multi-Select: Agama */}
                        <MultiSelectDropdown
                            label="Agama"
                            icon="favorite_border"
                            options={AGAMA_CHOICES.map(([v, l]) => ({ value: v, label: l }))}
                            selected={filterAgama}
                            onChange={(val) => { setFilterAgama(val); setCurrentPage(1); }}
                        />

                        {/* Multi-Select: Custom Roles */}
                        <MultiSelectDropdown
                            label="Custom Role"
                            icon="military_tech"
                            options={allRoles.map(r => ({ value: String(r.id), label: r.name }))}
                            selected={filterCustomRoles}
                            onChange={(val) => { setFilterCustomRoles(val); setCurrentPage(1); }}
                        />

                        {/* Multi-Select: Label */}
                        <MultiSelectDropdown
                            label="Label"
                            icon="label"
                            options={allLabels.map(l => ({ value: String(l.id), label: l.name }))}
                            selected={filterLabels}
                            onChange={(val) => { setFilterLabels(val); setCurrentPage(1); }}
                        />

                        {/* Multi-Select: Lingkup Tugas */}
                        <MultiSelectDropdown
                            label="Lingkup Tugas"
                            icon="work"
                            options={allLingkup.map(l => ({ value: String(l.id), label: l.name }))}
                            selected={filterLingkup}
                            onChange={(val) => { setFilterLingkup(val); setCurrentPage(1); }}
                        />

                        {/* Multi-Select: Bidang Tugas */}
                        <MultiSelectDropdown
                            label="Bidang Tugas"
                            icon="assignment"
                            options={allBidang.map(b => ({ value: String(b.id), label: b.name }))}
                            selected={filterBidang}
                            onChange={(val) => { setFilterBidang(val); setCurrentPage(1); }}
                        />

                        {/* Date Range */}
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1">
                            <span className="material-icons text-gray-400 text-xs">calendar_today</span>
                            <input 
                                type="date" 
                                value={filterDateFrom} 
                                onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                                className="bg-transparent text-xs outline-none text-gray-600" 
                                title="Dari Tanggal"
                            />
                            <span className="text-gray-300">-</span>
                            <input 
                                type="date" 
                                value={filterDateTo} 
                                onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                                className="bg-transparent text-xs outline-none text-gray-600" 
                                title="Sampai Tanggal"
                            />
                        </div>

                        {/* Reset All Filters Button */}
                        {(filterRoles.length > 0 || filterCustomRoles.length > 0 || filterLabels.length > 0 || 
                          filterLingkup.length > 0 || filterBidang.length > 0 || filterAgama.length > 0 || 
                          filterVerified.length > 0 || filterDateFrom || filterDateTo || searchQuery) && (
                            <button
                                type="button"
                                onClick={handleResetAllFilters}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                            >
                                <span className="material-icons text-xs">filter_alt_off</span>
                                <span>Reset Filter</span>
                            </button>
                        )}
                    </div>

                    {/* Active Filter Tags Row */}
                    {(filterRoles.length > 0 || filterCustomRoles.length > 0 || filterLabels.length > 0 || 
                      filterLingkup.length > 0 || filterBidang.length > 0 || filterAgama.length > 0 || filterVerified.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-[11px]">
                            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Filter Aktif:</span>

                            {filterRoles.map(r => (
                                <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                                    Role: {r}
                                    <button type="button" onClick={() => setFilterRoles(filterRoles.filter(x => x !== r))} className="hover:text-red-600">×</button>
                                </span>
                            ))}

                            {filterVerified.map(v => (
                                <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                                    {v === 'true' ? 'Terverifikasi' : 'Belum Verifikasi'}
                                    <button type="button" onClick={() => setFilterVerified(filterVerified.filter(x => x !== v))} className="hover:text-red-600">×</button>
                                </span>
                            ))}

                            {filterAgama.map(a => (
                                <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                                    Agama: {AGAMA_MAP[a] || a}
                                    <button type="button" onClick={() => setFilterAgama(filterAgama.filter(x => x !== a))} className="hover:text-red-600">×</button>
                                </span>
                            ))}

                            {filterCustomRoles.map(id => {
                                const roleObj = allRoles.find(x => String(x.id) === id);
                                return (
                                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200">
                                        Role: {roleObj?.name || id}
                                        <button type="button" onClick={() => setFilterCustomRoles(filterCustomRoles.filter(x => x !== id))} className="hover:text-red-600">×</button>
                                    </span>
                                );
                            })}

                            {filterLabels.map(id => {
                                const labelObj = allLabels.find(x => String(x.id) === id);
                                return (
                                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-800 font-bold border border-pink-200">
                                        Label: {labelObj?.name || id}
                                        <button type="button" onClick={() => setFilterLabels(filterLabels.filter(x => x !== id))} className="hover:text-red-600">×</button>
                                    </span>
                                );
                            })}

                            {filterLingkup.map(id => {
                                const obj = allLingkup.find(x => String(x.id) === id);
                                return (
                                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 font-bold border border-cyan-200">
                                        Lingkup: {obj?.name || id}
                                        <button type="button" onClick={() => setFilterLingkup(filterLingkup.filter(x => x !== id))} className="hover:text-red-600">×</button>
                                    </span>
                                );
                            })}

                            {filterBidang.map(id => {
                                const obj = allBidang.find(x => String(x.id) === id);
                                return (
                                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
                                        Bidang: {obj?.name || id}
                                        <button type="button" onClick={() => setFilterBidang(filterBidang.filter(x => x !== id))} className="hover:text-red-600">×</button>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Table Section */}
                <div className={`relative transition-all duration-500 ${loading ? 'opacity-70' : 'opacity-100'}`}>
                    {/* Loading Overlay for pagination/search changes */}
                    {loading && users.length > 0 && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-[1px] rounded-2xl">
                            <div className="bg-white/80 p-4 rounded-3xl shadow-xl flex items-center gap-3 border border-white">
                                <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full"></div>
                                <span className="text-xs font-black text-green-700 uppercase tracking-widest">Memperbarui...</span>
                            </div>
                        </div>
                    )}

                    {loading && users.length === 0 ? (
                        <UserSkeleton />
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-3 py-4"><input type="checkbox" checked={selectedUserIds.length === users.length && users.length > 0} onChange={toggleSelectAll} className="w-4 h-4 text-green-600 rounded" /></th>
                                        <SH label="ID" field="id" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[60px]">Foto</th>
                                        <SH label="IDM" field="profile__id_m" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <SH label="User" field="username" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <SH label="Nama" field="profile__name_full" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <SH label="Panggilan" field="profile__nickname" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <SH label="Agama" field="profile__agama" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">Info dari</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">Subject</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">Kontak</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[80px]">Role</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[100px]">Custom Role</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[100px]">Label</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[100px]">Lingkup Tugas</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[100px]">Bidang Tugas</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">Charity</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">Events</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">E-commerce</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">E-course</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] min-w-[120px]">Digital</th>

                                        <SH label="Join" field="date_joined" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <SH label="Last Login" field="last_login" {...{ sortField, sortDir, handleSort, getSortIcon }} />
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] text-center">V</th>
                                        <th className="px-3 py-4 text-gray-600 font-bold uppercase tracking-wider text-[11px] text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {users.map((u, idx) => (
                                        <tr 
                                            key={u.id} 
                                            style={{ animationDelay: `${(idx % 10) * 40}ms` }}
                                            className="hover:bg-green-50/30 transition animate-in fade-in slide-in-from-bottom-1 duration-300"
                                        >
                                            <td className="px-3 py-3"><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelectUser(u.id)} className="w-4 h-4 text-green-600 rounded" /></td>
                                            <td className="px-3 py-3 text-xs font-black text-gray-400">#{u.id}</td>
                                            <td className="px-3 py-3">
                                                {(() => {
                                                    const avatarUrl = u.profile?.picture ? getMediaUrl(u.profile.picture) : u.profile?.google_picture_url;
                                                    const displayName = u.profile?.name_full || u.username;
                                                    const initial = displayName.charAt(0).toUpperCase();
                                                    return avatarUrl ? (
                                                        <div 
                                                            className="relative group/avatar cursor-zoom-in w-10 h-10 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
                                                            onMouseEnter={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                const spaceRight = window.innerWidth - rect.right;
                                                                const x = spaceRight > 220 ? rect.right + 12 : rect.left - 212;
                                                                setHoveredPhoto({
                                                                    url: avatarUrl,
                                                                    name: displayName,
                                                                    x: x,
                                                                    y: Math.max(10, rect.top - 60)
                                                                });
                                                            }}
                                                            onMouseLeave={() => setHoveredPhoto(null)}
                                                            onClick={() => { setSelectedUser(u); setShowDetailModal(true); }}
                                                        >
                                                            <img
                                                                src={avatarUrl}
                                                                alt={u.username}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-700 font-bold text-xs select-none"
                                                            title={displayName}
                                                        >
                                                            {initial}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-3">
                                                <input type="text" defaultValue={u.profile?.id_m || ''} onBlur={(e) => { if (e.target.value !== (u.profile?.id_m || '')) handleInlineEdit(u.id, 'id_m', e.target.value); }} className="w-20 font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 text-center outline-none focus:ring-2 focus:ring-blue-400" placeholder="-" />
                                            </td>
                                            <td className="px-3 py-3">
                                                <input type="text" defaultValue={u.username || ''} onBlur={(e) => { if (e.target.value !== (u.username || '')) handleInlineEdit(u.id, 'username', e.target.value); }} className="w-full min-w-[100px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-gray-900 font-bold text-[11px] leading-tight outline-none" placeholder="Username" />
                                                <input type="email" defaultValue={u.email || ''} onBlur={(e) => { if (e.target.value !== (u.email || '')) handleInlineEdit(u.id, 'email', e.target.value); }} className="w-full min-w-[100px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-[10px] text-gray-400 mt-0.5 outline-none" placeholder="Email" />
                                            </td>
                                            <td className="px-3 py-3">
                                                <textarea defaultValue={u.profile?.name_full || ''} onBlur={(e) => { if (e.target.value !== (u.profile?.name_full || '')) handleInlineEdit(u.id, 'name_full', e.target.value); }} className="w-full min-w-[120px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-gray-900 font-bold text-[11px] leading-tight outline-none resize-none" rows={2} placeholder="-" />
                                                <select defaultValue={u.profile?.address_province || ''} onChange={(e) => { if (e.target.value !== (u.profile?.address_province || '')) handleInlineEdit(u.id, 'address_province', e.target.value); }} className="w-full max-w-[120px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-[10px] text-gray-500 outline-none mt-0.5 cursor-pointer">
                                                    <option value="">- Pilih Provinsi -</option>
                                                    {PROVINCE_CHOICES.map(p => <option key={p[0]} value={p[0]}>{p[1]}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-3">
                                                <input type="text" defaultValue={u.profile?.nickname || ''} onBlur={(e) => { if (e.target.value !== (u.profile?.nickname || '')) handleInlineEdit(u.id, 'nickname', e.target.value); }} className="w-full min-w-[80px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-gray-900 font-bold text-[11px] leading-tight outline-none" placeholder="-" />
                                            </td>
                                            <td className="px-3 py-3">
                                                <select 
                                                    value={u.profile?.agama || ''} 
                                                    onChange={(e) => { if (e.target.value !== (u.profile?.agama || '')) handleInlineEdit(u.id, 'agama', e.target.value); }} 
                                                    className="w-full min-w-[100px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-[10px] text-gray-700 outline-none cursor-pointer font-bold uppercase"
                                                >
                                                    <option value="">- Pilih -</option>
                                                    {AGAMA_CHOICES.map(([v, l]) => <option key={v} value={v}>{l.toUpperCase()}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-3">
                                                <select 
                                                    defaultValue={u.profile?.info_source || ''} 
                                                    onChange={(e) => { if (e.target.value !== (u.profile?.info_source || '')) handleInlineEdit(u.id, 'info_source', e.target.value); }} 
                                                    className="w-full min-w-[100px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-[10px] text-gray-700 outline-none cursor-pointer font-bold uppercase"
                                                >
                                                    <option value="">- Pilih -</option>
                                                    <option value="sosmed">SOSMED</option>
                                                    <option value="wa">WHATSAPP</option>
                                                    <option value="teman">TEMAN/KELUARGA</option>
                                                    <option value="iklan">IKLAN</option>
                                                    <option value="website">WEBSITE</option>
                                                    <option value="event">EVENT</option>
                                                    <option value="lainnya">LAINNYA</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-3">
                                                <input type="text" defaultValue={u.profile?.referred_by || ''} onBlur={(e) => { if (e.target.value !== (u.profile?.referred_by || '')) handleInlineEdit(u.id, 'referred_by', e.target.value); }} className="w-full min-w-[100px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-gray-900 font-bold text-[11px] leading-tight outline-none" placeholder="-" />
                                            </td>
                                            <td className="px-3 py-3 text-gray-600 text-[11px] whitespace-nowrap">
                                                <input type="text" defaultValue={u.phone || ''} onBlur={(e) => { if (e.target.value !== (u.phone || '')) handleInlineEdit(u.id, 'phone', e.target.value); }} className="w-full min-w-[100px] bg-transparent border border-transparent hover:border-gray-200 focus:border-green-500 focus:bg-white rounded px-1 py-0.5 text-[11px] leading-tight outline-none" placeholder="-" />
                                            </td>
                                            <td className="px-3 py-3">
                                                <select defaultValue={u.role} onChange={(e) => { if (e.target.value !== u.role) handleInlineEdit(u.id, 'role', e.target.value); }} className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase outline-none cursor-pointer ${u.role === 'admin' ? 'bg-red-50 text-red-600' : u.role === 'seller' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    <option value="user">USER</option>
                                                    <option value="admin">ADMIN</option>
                                                    <option value="seller">SELLER</option>
                                                    <option value="staff">STAFF</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-3">
                                                <MultiSelectCell 
                                                    selectedItems={u.custom_roles} 
                                                    allOptions={allRoles} 
                                                    onSave={(ids) => handleInlineEdit(u.id, 'custom_role_ids', ids)}
                                                    color="blue"
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <MultiSelectCell 
                                                    selectedItems={u.labels} 
                                                    allOptions={allLabels} 
                                                    onSave={(ids) => handleInlineEdit(u.id, 'label_ids', ids)}
                                                    color="purple"
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <MultiSelectCell 
                                                    selectedItems={u.lingkup_tugas} 
                                                    allOptions={allLingkup} 
                                                    onSave={(ids) => handleInlineEdit(u.id, 'lingkup_tugas_ids', ids)}
                                                    color="indigo"
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <MultiSelectCell 
                                                    selectedItems={u.bidang_tugas} 
                                                    allOptions={allBidang} 
                                                    onSave={(ids) => handleInlineEdit(u.id, 'bidang_tugas_ids', ids)}
                                                    color="emerald"
                                                />
                                            </td>

                                            <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap content-start gap-1 max-w-[200px] h-[80px] overflow-y-auto pr-1">
                                                    {(u.activities?.charity || []).map((item, idx) => <span key={idx} className="px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-medium leading-tight">{item}</span>)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap content-start gap-1 max-w-[200px] h-[80px] overflow-y-auto pr-1">
                                                    {(u.activities?.events || []).map((item, idx) => <span key={idx} className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-medium leading-tight">{item}</span>)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap content-start gap-1 max-w-[200px] h-[80px] overflow-y-auto pr-1">
                                                    {(u.activities?.sinergy || []).map((item, idx) => <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-medium leading-tight">{item}</span>)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap content-start gap-1 max-w-[200px] h-[80px] overflow-y-auto pr-1">
                                                    {(u.activities?.courses || []).map((item, idx) => <span key={idx} className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-medium leading-tight">{item}</span>)}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 align-top">
                                                <div className="flex flex-wrap content-start gap-1 max-w-[200px] h-[80px] overflow-y-auto pr-1">
                                                    {(u.activities?.digital_products || []).map((item, idx) => <span key={idx} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[9px] font-medium leading-tight">{item}</span>)}
                                                </div>
                                            </td>

                                            <td className="px-3 py-3 text-gray-500 text-[10px] whitespace-nowrap font-medium">
                                                <div className="flex flex-col leading-tight">
                                                    <span className="font-bold text-gray-700">{new Date(u.date_joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    <span className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(u.date_joined).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')} WIB</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-gray-500 text-[10px] whitespace-nowrap font-medium">
                                                {u.last_login ? (
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="font-bold text-gray-700">{new Date(u.last_login).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                        <span className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(u.last_login).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')} WIB</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-[9px] font-normal italic">Belum Pernah</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <input type="checkbox" defaultChecked={u.is_verified_member} onChange={(e) => handleInlineEdit(u.id, 'is_verified_member', e.target.checked)} className="w-4 h-4 text-green-600 rounded cursor-pointer" />
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

                {/* Floating Bulk Actions Bar */}
                {selectedUserIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] bg-gray-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 border border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-[95vw] overflow-x-auto">
                        <div className="flex items-center gap-2 pr-2 border-r border-gray-700 whitespace-nowrap">
                            <span className="w-6 h-6 rounded-full bg-green-500 text-gray-900 flex items-center justify-center font-black text-xs">
                                {selectedUserIds.length}
                            </span>
                            <span className="text-xs font-bold text-gray-300">user dipilih</span>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <button onClick={() => { setBatchField(''); setBatchValue(''); setShowBatchModal(true); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95">
                                <span className="material-icons text-xs">edit</span> Edit
                            </button>
                            <button onClick={() => { setBlastResult(null); setShowBlastModal(true); }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95">
                                <span className="material-icons text-xs">chat</span> Blast WA
                            </button>
                            <button onClick={() => { setEmailBlastResult(null); setShowEmailBlastModal(true); }}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95">
                                <span className="material-icons text-xs">mail</span> Blast Email
                            </button>
                            <button onClick={handleBulkDelete} disabled={deletingBulk}
                                className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-900/40 transition active:scale-95 disabled:opacity-50">
                                <span className="material-icons text-xs">{deletingBulk ? 'sync' : 'delete_forever'}</span>
                                {deletingBulk ? 'Menghapus...' : 'Hapus Akun'}
                            </button>
                            <button onClick={() => setSelectedUserIds([])}
                                className="text-gray-400 hover:text-white px-2 py-1.5 text-xs transition flex items-center justify-center" title="Batal Pilih">
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>
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
                            <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-3xl p-1 shadow-lg border-4 border-white overflow-hidden">
                                {(() => {
                                    const avatarUrl = selectedUser.profile?.picture ? getMediaUrl(selectedUser.profile.picture) : selectedUser.profile?.google_picture_url;
                                    const displayName = selectedUser.profile?.name_full || selectedUser.username;
                                    const initial = displayName.charAt(0).toUpperCase();
                                    return avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={selectedUser.username}
                                            className="w-full h-full object-cover rounded-2xl animate-in fade-in duration-300 cursor-pointer hover:scale-105 active:scale-95 transition-all"
                                            onClick={() => setZoomedPhoto(avatarUrl)}
                                            title="Klik untuk perbesar"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-green-100 rounded-2xl flex items-center justify-center text-green-800 font-bold text-3xl select-none">
                                            {initial}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="px-8 pt-16 pb-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.profile?.name_full || selectedUser.username} {selectedUser.profile?.nickname && <span className="text-green-600 font-medium">({selectedUser.profile.nickname})</span>}</h2>
                                    <p className="text-gray-500 font-medium">@{selectedUser.username} • {selectedUser.role.toUpperCase()}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {(selectedUser.custom_roles || []).map(r => <span key={r.id} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">{r.name}</span>)}
                                        {(selectedUser.labels || []).map(l => <span key={l.id} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold">{l.name}</span>)}
                                        {(selectedUser.lingkup_tugas || []).map(l => <span key={l.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">{l.name}</span>)}
                                        {(selectedUser.bidang_tugas || []).map(l => <span key={l.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">{l.name}</span>)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Terdaftar</p>
                                    <p className="text-gray-900 font-bold text-sm">{new Date(selectedUser.date_joined).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
                                    <DI icon="self_improvement" label="Agama" value={AGAMA_MAP[selectedUser.profile?.agama] || selectedUser.profile?.agama || '-'} />
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
                                        <p className="text-[10px] font-bold text-orange-700 uppercase mb-2">E-commerce</p>
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
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-bold text-teal-700 uppercase mb-2">Agenda Internal (Kehadiran)</p>
                                        <div className="space-y-2 mt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] text-gray-500 font-medium">Total Hadir</span>
                                                <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">{selectedUser.meeting_attendance_summary?.total_present || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] text-gray-500 font-medium">Total Absen</span>
                                                <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">{selectedUser.meeting_attendance_summary?.total_absent || 0}</span>
                                            </div>
                                            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Persentase Kehadiran</span>
                                                <span className={`text-[12px] font-black ${selectedUser.meeting_attendance_summary?.attendance_rate >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {selectedUser.meeting_attendance_summary?.attendance_rate || 0}%
                                                </span>
                                            </div>
                                        </div>
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

            {/* ============ PHOTO ZOOM LIGHTBOX MODAL ============ */}
            {zoomedPhoto && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
                    onClick={() => setZoomedPhoto(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl bg-white p-2 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <img 
                            src={zoomedPhoto} 
                            alt="Full Profile Photo" 
                            className="max-w-full max-h-[75vh] object-contain rounded-2xl"
                        />
                        <div className="absolute top-4 right-4 flex gap-2">
                            <a 
                                href={zoomedPhoto} 
                                download 
                                target="_blank" 
                                rel="noreferrer" 
                                className="w-10 h-10 bg-black/50 hover:bg-black/75 rounded-full flex items-center justify-center text-white transition flex items-center justify-center"
                                title="Download Foto"
                            >
                                <span className="material-icons text-sm">download</span>
                            </a>
                            <button 
                                onClick={() => setZoomedPhoto(null)} 
                                className="w-10 h-10 bg-black/50 hover:bg-black/75 rounded-full flex items-center justify-center text-white transition flex items-center justify-center"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
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
                                        <FI label="Nama Lengkap *" value={editFormData.name_full} onChange={v => setEditFormData(f => ({ ...f, name_full: v }))} />
                                        <FI label="Nama Panggilan (Opsional)" value={editFormData.nickname} onChange={v => setEditFormData(f => ({ ...f, nickname: v }))} />
                                        <FI label="IDM (ID Member) (Opsional)" value={editFormData.id_m} onChange={v => setEditFormData(f => ({ ...f, id_m: v }))} />
                                        <FI label="Username (Opsional, otomatis dibuat jika kosong)" value={editFormData.username} onChange={v => setEditFormData(f => ({ ...f, username: v }))} />
                                        <FI label="Email *" value={editFormData.email} onChange={v => setEditFormData(f => ({ ...f, email: v }))} />
                                        <FI label="No. Telepon / WA *" value={editFormData.phone} onChange={v => setEditFormData(f => ({ ...f, phone: v }))} />
                                        <FI label="Password *" value={editFormData.password} onChange={v => setEditFormData(f => ({ ...f, password: v }))} type="password" />
                                        <FS label="Role" value={editFormData.role} onChange={v => setEditFormData(f => ({ ...f, role: v }))} options={[['user', 'User'], ['admin', 'Admin'], ['seller', 'Seller'], ['staff', 'Staff']]} />
                                        <div className="flex items-center gap-2 col-span-2">
                                            <input type="checkbox" id="is_v_new" checked={editFormData.is_verified_member} onChange={e => setEditFormData(f => ({ ...f, is_verified_member: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                                            <label htmlFor="is_v_new" className="text-sm font-medium text-gray-700">Verified Member</label>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Col 1: Account */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest border-b border-blue-100 pb-2 mb-2">Data Akun</h3>
                                            <FI label="Username" value={editFormData.username} onChange={v => setEditFormData(f => ({ ...f, username: v }))} />
                                            <FI label="IDM (ID Member)" value={editFormData.profile?.id_m} onChange={v => setP('id_m', v)} />
                                            <FI label="Email" value={editFormData.email} onChange={v => setEditFormData(f => ({ ...f, email: v }))} />
                                            <FI label="No. Telepon" value={editFormData.phone} onChange={v => setEditFormData(f => ({ ...f, phone: v }))} />
                                            <FI label="Jabatan BAE" value={editFormData.position} onChange={v => setEditFormData(f => ({ ...f, position: v }))} />
                                            <FS label="Role" value={editFormData.role} onChange={v => setEditFormData(f => ({ ...f, role: v }))} options={[['user', 'User'], ['admin', 'Admin'], ['seller', 'Seller'], ['staff', 'Staff']]} />
                                            <div className="flex items-center gap-2 mt-2">
                                                <input type="checkbox" id="is_v" checked={editFormData.is_verified_member} onChange={e => setEditFormData(f => ({ ...f, is_verified_member: e.target.checked }))} className="w-4 h-4 text-blue-600 rounded" />
                                                <label htmlFor="is_v" className="text-sm font-medium text-gray-700">Verified Member</label>
                                            </div>
                                            <div className="space-y-1 mt-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Custom Roles</label>
                                                <div className="flex flex-wrap gap-1">
                                                    {allRoles.map(r => (
                                                        <label key={r.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(editFormData.custom_role_ids || []).includes(r.id) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                            <input type="checkbox" checked={(editFormData.custom_role_ids || []).includes(r.id)}
                                                                onChange={() => { const ids = editFormData.custom_role_ids || []; setEditFormData(f => ({ ...f, custom_role_ids: ids.includes(r.id) ? ids.filter(x => x !== r.id) : [...ids, r.id] })); }} className="w-3 h-3 text-green-600 rounded" />
                                                            {r.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1 mt-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Labels</label>
                                                <div className="flex flex-wrap gap-1">
                                                    {allLabels.map(l => (
                                                        <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(editFormData.label_ids || []).includes(l.id) ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                            <input type="checkbox" checked={(editFormData.label_ids || []).includes(l.id)}
                                                                onChange={() => { const ids = editFormData.label_ids || []; setEditFormData(f => ({ ...f, label_ids: ids.includes(l.id) ? ids.filter(x => x !== l.id) : [...ids, l.id] })); }} className="w-3 h-3 rounded" />
                                                            {l.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1 mt-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lingkup Tugas</label>
                                                <div className="flex flex-wrap gap-1">
                                                    {allLingkup.map(l => (
                                                        <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(editFormData.lingkup_tugas_ids || []).includes(l.id) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                            <input type="checkbox" checked={(editFormData.lingkup_tugas_ids || []).includes(l.id)}
                                                                onChange={() => { const ids = editFormData.lingkup_tugas_ids || []; setEditFormData(f => ({ ...f, lingkup_tugas_ids: ids.includes(l.id) ? ids.filter(x => x !== l.id) : [...ids, l.id] })); }} className="w-3 h-3 rounded" />
                                                            {l.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1 mt-3">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bidang Tugas</label>
                                                <div className="flex flex-wrap gap-1">
                                                    {allBidang.map(l => (
                                                        <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(editFormData.bidang_tugas_ids || []).includes(l.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                            <input type="checkbox" checked={(editFormData.bidang_tugas_ids || []).includes(l.id)}
                                                                onChange={() => { const ids = editFormData.bidang_tugas_ids || []; setEditFormData(f => ({ ...f, bidang_tugas_ids: ids.includes(l.id) ? ids.filter(x => x !== l.id) : [...ids, l.id] })); }} className="w-3 h-3 rounded" />
                                                            {l.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Col 2: Personal Info */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-bold text-green-700 uppercase tracking-widest border-b border-green-100 pb-2 mb-2">Data Diri</h3>
                                            <FI label="Nama Lengkap" value={editFormData.profile?.name_full} onChange={v => setP('name_full', v)} />
                                            <FI label="Nama Panggilan" value={editFormData.profile?.nickname} onChange={v => setP('nickname', v)} />
                                            <FI label="NIK (No. KTP)" value={editFormData.profile?.nik} onChange={v => setP('nik', v)} />
                                            <FS label="Jenis Kelamin" value={editFormData.profile?.gender} onChange={v => setP('gender', v)} options={GENDER_CHOICES} />
                                            <FS 
                                                 label="Agama" 
                                                 value={editAgamaDropdown} 
                                                 onChange={v => {
                                                     setEditAgamaDropdown(v);
                                                     if (v !== 'kepercayaan') {
                                                         setP('agama', v);
                                                         setEditCustomAgama('');
                                                     } else {
                                                         setP('agama', editCustomAgama);
                                                     }
                                                 }} 
                                                 options={AGAMA_CHOICES} 
                                             />
                                             {editAgamaDropdown === 'kepercayaan' && (
                                                 <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                                     <FI 
                                                         label="Aliran Kepercayaan / Lainnya" 
                                                         value={editCustomAgama} 
                                                         onChange={v => {
                                                             setEditCustomAgama(v);
                                                             setP('agama', v);
                                                         }} 
                                                     />
                                                 </div>
                                             )}
                                            <FI label="Tempat Lahir" value={editFormData.profile?.birth_place} onChange={v => setP('birth_place', v)} />
                                            <FI label="Tanggal Lahir" value={editFormData.profile?.birth_date} onChange={v => setP('birth_date', v)} type="date" />
                                            <FI label="Tgl Registrasi" value={editFormData.profile?.registration_date} onChange={v => setP('registration_date', v)} type="date" />
                                            <FS label="Status Pernikahan" value={editFormData.profile?.marital_status} onChange={v => setP('marital_status', v)} options={MARITAL_CHOICES} />
                                            <FS label="Segmen" value={editFormData.profile?.segment} onChange={v => setP('segment', v)} options={SEGMENT_CHOICES} />
                                            <FI label="Alamat" value={editFormData.profile?.address} onChange={v => setP('address', v)} />
                                            <FS label="Provinsi" value={editFormData.profile?.address_province} onChange={v => setP('address_province', v)} options={PROVINCE_CHOICES} />
                                        </div>

                                        {/* Col 3: Education & Work */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-bold text-orange-700 uppercase tracking-widest border-b border-orange-100 pb-2 mb-2">Pendidikan & Pekerjaan</h3>
                                            <FS label="Pendidikan Terakhir" value={editFormData.profile?.study_level} onChange={v => setP('study_level', v)} options={STUDY_LEVEL_CHOICES} />
                                            <FI label="Kampus / Sekolah" value={editFormData.profile?.study_campus} onChange={v => setP('study_campus', v)} />
                                            <FI label="Fakultas" value={editFormData.profile?.study_faculty} onChange={v => setP('study_faculty', v)} />
                                            <FI label="Jurusan" value={editFormData.profile?.study_department} onChange={v => setP('study_department', v)} />
                                            <FI label="Program Studi" value={editFormData.profile?.study_program} onChange={v => setP('study_program', v)} />
                                            <div className="grid grid-cols-3 gap-2">
                                                <FI label="Semester" value={editFormData.profile?.study_semester} onChange={v => setP('study_semester', v)} type="number" />
                                                <FI label="Thn Masuk" value={editFormData.profile?.study_start_year} onChange={v => setP('study_start_year', v)} type="number" />
                                                <FI label="Thn Lulus" value={editFormData.profile?.study_finish_year} onChange={v => setP('study_finish_year', v)} type="number" />
                                            </div>
                                            <FS label="Pekerjaan" value={editFormData.profile?.job} onChange={v => setP('job', v)} options={JOB_CHOICES} />
                                            <FS label="Bidang Kerja" value={editFormData.profile?.work_field} onChange={v => setP('work_field', v)} options={WORK_FIELD_CHOICES} />
                                            <FI label="Instansi" value={editFormData.profile?.work_institution} onChange={v => setP('work_institution', v)} />
                                            <FI label="Jabatan" value={editFormData.profile?.work_position} onChange={v => setP('work_position', v)} />
                                            <FI label="Gaji (Rp)" value={editFormData.profile?.work_salary} onChange={v => setP('work_salary', v)} type="number" />
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
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-icons text-green-600">chat</span>
                                <span>Blast WhatsApp Aman (Anti-Ban)</span>
                            </h2>
                            <button onClick={() => setShowBlastModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-gray-600">Kirim pesan WhatsApp ke <b>{selectedUserIds.length}</b> pengguna terpilih.</p>

                            {/* Anti-ban Delay Safeguards */}
                            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons text-amber-700 text-sm">shield</span>
                                    <span className="text-xs font-black text-amber-900">Proteksi Anti-Banned Nomor WhatsApp</span>
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                    Jeda acak antar pesan meminimalkan risiko terdeteksi robot oleh server WhatsApp.
                                </p>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                        <label className="text-[10px] font-bold text-amber-900 block mb-0.5">Jeda Minimum (detik)</label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="120"
                                            value={waMinDelay}
                                            onChange={e => setWaMinDelay(e.target.value)}
                                            className="w-full bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-amber-900 block mb-0.5">Jeda Maksimum (detik)</label>
                                        <input
                                            type="number"
                                            min="10"
                                            max="300"
                                            value={waMaxDelay}
                                            onChange={e => setWaMaxDelay(e.target.value)}
                                            className="w-full bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tags & Spintax Helpers */}
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tag Personalisasi & Variasi:</span>
                                    <div className="flex flex-wrap gap-1">
                                        <button type="button" onClick={() => setBlastMessage(p => p + ' {name}')} className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-bold hover:bg-green-100">+{'{name}'}</button>
                                        <button type="button" onClick={() => setBlastMessage(p => p + ' {username}')} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100">+{'{username}'}</button>
                                        <button type="button" onClick={() => setBlastMessage(p => p + ' {phone}')} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold hover:bg-purple-100">+{'{phone}'}</button>
                                        <button type="button" onClick={() => setBlastMessage(p => p + ' {Halo|Hai|Assalamu\'alaikum}')} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold hover:bg-amber-100">+Spintax Sapaan</button>
                                    </div>
                                </div>
                                <textarea 
                                    rows="5" 
                                    value={blastMessage} 
                                    onChange={e => setBlastMessage(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-green-500 font-sans" 
                                    placeholder="Assalamu'alaikum {name}, kami dari Barakah Economy ingin menginformasikan..." 
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block ml-1">Lampiran Gambar (Opsional)</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <input type="file" accept="image/*" id="user-blast-image" className="hidden" onChange={handleImageChange} />
                                        <label htmlFor="user-blast-image" className="flex items-center justify-center gap-2 w-full p-2.5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-green-300 transition group">
                                            <span className="material-icons text-gray-400 group-hover:text-green-500 text-sm">image</span>
                                            <span className="text-xs font-bold text-gray-500 group-hover:text-green-700">
                                                {blastImage ? 'Ganti Gambar' : 'Pilih Gambar...'}
                                            </span>
                                        </label>
                                    </div>
                                    {blastImage && (
                                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                            <img src={blastImage} className="w-full h-full object-cover" alt="prev" />
                                            <button onClick={() => setBlastImage(null)} className="absolute top-0 right-0 w-4 h-4 bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition">
                                                <span className="material-icons text-[10px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {blastResult && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
                                    {blastResult.message || `Antrean blast berhasil dibuat (Task ID: ${blastResult.task_id || '-'}).`}
                                </div>
                            )}
                        </div>
                        <div className="p-5 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                            <button onClick={() => setShowBlastModal(false)} className="px-5 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                            <button onClick={handleBlast} disabled={blasting || !blastMessage.trim()}
                                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2">
                                <span className="material-icons text-sm">{blasting ? 'hourglass_top' : 'send'}</span>
                                <span>{blasting ? 'Memproses Antrean...' : `Kirim Blast (${selectedUserIds.length})`}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ EMAIL BLAST MODAL ============ */}
            {showEmailBlastModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header with Tab switcher */}
                        <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <span className="material-icons text-amber-500">mark_email_read</span>
                                    <span>Blast Email Penawaran & Pengumuman</span>
                                </h2>
                                <p className="text-[11px] text-gray-400">Target: {selectedUserIds.length} pengguna terpilih</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setEmailModalTab('edit')}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                            emailModalTab === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        <span className="material-icons text-xs">edit_note</span>
                                        <span>Composer</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEmailModalTab('preview')}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                            emailModalTab === 'preview' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        <span className="material-icons text-xs">visibility</span>
                                        <span>Live Preview</span>
                                    </button>
                                </div>
                                <button onClick={() => setShowEmailBlastModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                    <span className="material-icons text-lg">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-gray-50/50">
                            {emailModalTab === 'edit' ? (
                                <>
                                    {/* Anti-Ban Safeguards Notice */}
                                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200/80 flex items-center justify-between gap-3 text-xs text-blue-900">
                                        <div className="flex items-center gap-2">
                                            <span className="material-icons text-blue-600 text-sm">security</span>
                                            <span>
                                                <b>Safeguard Anti-Spam:</b> Jeda {emailMinDelay}-{emailMaxDelay}s per email + jeda batch otomatis per 20 pengiriman.
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <input 
                                                type="number" 
                                                step="0.5" 
                                                min="1" 
                                                max="30" 
                                                value={emailMinDelay} 
                                                onChange={e => setEmailMinDelay(e.target.value)} 
                                                className="w-12 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-[11px] text-center font-bold" 
                                                title="Min Jeda (detik)"
                                            />
                                            <span>-</span>
                                            <input 
                                                type="number" 
                                                step="0.5" 
                                                min="2" 
                                                max="60" 
                                                value={emailMaxDelay} 
                                                onChange={e => setEmailMaxDelay(e.target.value)} 
                                                className="w-12 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-[11px] text-center font-bold" 
                                                title="Max Jeda (detik)"
                                            />
                                            <span className="text-[10px]">detik</span>
                                        </div>
                                    </div>

                                    {/* Subject Email */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Subjek Email</label>
                                            <div className="flex gap-1 text-[10px]">
                                                <button type="button" onClick={() => setEmailBlastSubject(p => p + ' {name}')} className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">+{'{name}'}</button>
                                                <button type="button" onClick={() => setEmailBlastSubject(p => p + ' {Halo|Hai|Kabar Baik}')} className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">+Spintax</button>
                                            </div>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500 font-bold text-gray-800"
                                            placeholder="Contoh: Penawaran Eksklusif untuk {name} dari Barakah Economy"
                                            value={emailBlastSubject}
                                            onChange={e => setEmailBlastSubject(e.target.value)}
                                        />
                                    </div>

                                    {/* Promotional Decoration Switcher */}
                                    <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="material-icons text-amber-500 text-lg">auto_awesome</span>
                                                <div>
                                                    <h4 className="text-xs font-black text-gray-900">Dekorasi Promosi & Penawaran</h4>
                                                    <p className="text-[11px] text-gray-400">Header visual, lencana promo, warna tema, dan tombol aksi (CTA)</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isEmailDecorated} 
                                                    onChange={e => setIsEmailDecorated(e.target.checked)} 
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                                            </label>
                                        </div>

                                        {isEmailDecorated ? (
                                            <div className="pt-3 border-t border-gray-100 space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Warna Tema / Aksen</label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <input 
                                                                type="color" 
                                                                value={emailThemeColor} 
                                                                onChange={e => setEmailThemeColor(e.target.value)} 
                                                                className="w-7 h-7 rounded-lg border-0 cursor-pointer" 
                                                            />
                                                            <input 
                                                                type="text" 
                                                                value={emailThemeColor} 
                                                                onChange={e => setEmailThemeColor(e.target.value)} 
                                                                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono" 
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Badge Promo</label>
                                                        <input 
                                                            type="text" 
                                                            value={emailBadgeText} 
                                                            onChange={e => setEmailBadgeText(e.target.value)} 
                                                            placeholder="PENAWARAN SPESIAL" 
                                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Judul Header</label>
                                                        <input 
                                                            type="text" 
                                                            value={emailHeaderTitle} 
                                                            onChange={e => setEmailHeaderTitle(e.target.value)} 
                                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Subjudul Header (Opsional)</label>
                                                        <input 
                                                            type="text" 
                                                            value={emailHeaderSubtitle} 
                                                            onChange={e => setEmailHeaderSubtitle(e.target.value)} 
                                                            placeholder="Contoh: Solusi Berkah Keluarga" 
                                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none" 
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">URL Gambar Banner / Hero (Opsional)</label>
                                                    <input 
                                                        type="url" 
                                                        value={emailHeroImageUrl} 
                                                        onChange={e => setEmailHeroImageUrl(e.target.value)} 
                                                        placeholder="https://domain.com/banner-promo.jpg" 
                                                        className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none font-mono" 
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Label Tombol CTA</label>
                                                        <input 
                                                            type="text" 
                                                            value={emailCtaText} 
                                                            onChange={e => setEmailCtaText(e.target.value)} 
                                                            placeholder="Lihat Penawaran" 
                                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase">URL Tautan CTA</label>
                                                        <input 
                                                            type="url" 
                                                            value={emailCtaUrl} 
                                                            onChange={e => setEmailCtaUrl(e.target.value)} 
                                                            placeholder="https://barakaheconomy.id/..." 
                                                            className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none font-mono" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-2.5 bg-gray-50 rounded-xl text-[11px] text-gray-500 border border-gray-100 flex items-center gap-2">
                                                <span className="material-icons text-sm text-gray-400">info</span>
                                                <span>Mode Standar Aktif: Email dikirim dalam format bersih. Lampiran berkas, gambar, dan URL teks tetap terkirim secara normal.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Message Body */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Isi Surat / Pesan</label>
                                            <div className="flex gap-1 text-[10px]">
                                                <button type="button" onClick={() => setEmailBlastMessage(prev => prev + ' {name}')} className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">+{'{name}'}</button>
                                                <button type="button" onClick={() => setEmailBlastMessage(prev => prev + ' {username}')} className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">+{'{username}'}</button>
                                                <button type="button" onClick={() => setEmailBlastMessage(prev => prev + ' {email}')} className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">+{'{email}'}</button>
                                            </div>
                                        </div>
                                        <textarea 
                                            rows="5" 
                                            value={emailBlastMessage} 
                                            onChange={e => setEmailBlastMessage(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500" 
                                            placeholder="Tulis pesan lengkap email..." 
                                        />
                                    </div>

                                    {/* Attachments Section (Supported for BOTH decorated & standard) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lampiran Berkas / Brosur / Dokumen</label>
                                            <span className="text-[10px] text-gray-400">Tersedia untuk semua mode</span>
                                        </div>
                                        <div className="space-y-2">
                                            <input 
                                                type="file" 
                                                multiple 
                                                id="user-email-blast-attachments" 
                                                className="hidden" 
                                                onChange={handleEmailAttachmentChange} 
                                            />
                                            <label 
                                                htmlFor="user-email-blast-attachments" 
                                                className="flex items-center justify-center gap-2 w-full p-2.5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-amber-300 transition group"
                                            >
                                                <span className="material-icons text-gray-400 group-hover:text-amber-500 text-sm">attach_file</span>
                                                <span className="text-xs font-bold text-gray-500 group-hover:text-amber-700">
                                                    Pilih Berkas Lampiran...
                                                </span>
                                            </label>

                                            {emailBlastAttachments.length > 0 && (
                                                <div className="bg-white p-2 rounded-xl border border-gray-200 space-y-1 max-h-28 overflow-y-auto">
                                                    {emailBlastAttachments.map((file, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs text-gray-700 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                                            <span className="truncate max-w-[280px] font-medium">{file.name}</span>
                                                            <button type="button" onClick={() => handleRemoveEmailAttachment(idx)} className="text-gray-400 hover:text-red-500">
                                                                <span className="material-icons text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Live Preview Simulator */
                                <div className="space-y-4">
                                    <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/50 flex items-center justify-between text-xs">
                                        <span className="font-bold text-amber-900">Simulasi Tampilan Email di Inbox Penerima</span>
                                        <span className="text-[10px] text-amber-700 font-bold px-2 py-0.5 rounded-full bg-amber-100">
                                            {isEmailDecorated ? 'Mode Dekorasi Promosi' : 'Mode Standar'}
                                        </span>
                                    </div>

                                    {/* Email Container Mockup */}
                                    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden max-w-lg mx-auto">
                                        {/* Mock Email Client Header */}
                                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 text-[11px] text-gray-600 flex justify-between items-center">
                                            <div>
                                                <p><b>Dari:</b> Barakah Economy &lt;broadcast@barakaheconomy.id&gt;</p>
                                                <p><b>Subjek:</b> {emailBlastSubject || '(Tanpa Subjek)'}</p>
                                            </div>
                                            <span className="material-icons text-gray-400 text-sm">mail</span>
                                        </div>

                                        {isEmailDecorated ? (
                                            /* Decorated View */
                                            <div className="text-gray-800">
                                                {/* Header Banner */}
                                                <div 
                                                    className="p-5 text-white text-center" 
                                                    style={{ backgroundColor: emailThemeColor }}
                                                >
                                                    <h3 className="text-lg font-black tracking-wide">{emailHeaderTitle}</h3>
                                                    {emailHeaderSubtitle && (
                                                        <p className="text-xs opacity-90 mt-0.5">{emailHeaderSubtitle}</p>
                                                    )}
                                                </div>

                                                <div className="p-5 space-y-4">
                                                    {emailBadgeText && (
                                                        <div className="text-center">
                                                            <span 
                                                                className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider text-white" 
                                                                style={{ backgroundColor: emailThemeColor }}
                                                            >
                                                                {emailBadgeText}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {emailHeroImageUrl && (
                                                        <div className="rounded-xl overflow-hidden border border-gray-100">
                                                            <img src={emailHeroImageUrl} alt="Hero" className="w-full h-40 object-cover" />
                                                        </div>
                                                    )}

                                                    <div className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                        {emailBlastMessage.replace('{name}', 'Ahmad Fulan').replace('{username}', 'ahmad_fulan').replace('{email}', 'ahmad@example.com')}
                                                    </div>

                                                    {emailCtaText && (
                                                        <div className="text-center pt-2">
                                                            <a 
                                                                href={emailCtaUrl || '#'} 
                                                                target="_blank" 
                                                                rel="noreferrer" 
                                                                className="inline-block px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition" 
                                                                style={{ backgroundColor: emailThemeColor }}
                                                            >
                                                                {emailCtaText}
                                                            </a>
                                                        </div>
                                                    )}

                                                    {emailBlastAttachments.length > 0 && (
                                                        <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                                                            <p className="font-bold mb-1">Lampiran ({emailBlastAttachments.length} file):</p>
                                                            <ul className="list-disc list-inside space-y-0.5">
                                                                {emailBlastAttachments.map((f, i) => (
                                                                    <li key={i}>{f.name}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 text-center text-[10px] text-gray-400">
                                                    © {new Date().getFullYear()} Barakah Economy. Pesan ini dikirim secara resmi kepada mitra terdaftar.
                                                </div>
                                            </div>
                                        ) : (
                                            /* Standard Clean View */
                                            <div className="p-5 text-gray-800 space-y-3">
                                                <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-gray-800">
                                                    {emailBlastMessage.replace('{name}', 'Ahmad Fulan').replace('{username}', 'ahmad_fulan').replace('{email}', 'ahmad@example.com')}
                                                </div>

                                                {emailBlastAttachments.length > 0 && (
                                                    <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-600">
                                                        <p className="font-bold mb-1">Lampiran Berkas:</p>
                                                        <ul className="list-disc list-inside space-y-0.5">
                                                            {emailBlastAttachments.map((f, i) => (
                                                                <li key={i}>{f.name}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div className="pt-4 border-t border-gray-100 text-[10px] text-gray-400">
                                                    Dikirim dari Barakah Economy Management System
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {emailBlastResult && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold">
                                    {emailBlastResult.message || `Antrean blast email berhasil dibuat (Task ID: ${emailBlastResult.task_id || '-'}).`}
                                </div>
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2.5 rounded-b-3xl shrink-0">
                            <button onClick={() => setShowEmailBlastModal(false)} className="px-5 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 transition">Batal</button>
                            <button 
                                onClick={handleEmailBlast} 
                                disabled={blastingEmail || !emailBlastSubject.trim() || !emailBlastMessage.trim()}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-7 py-2 rounded-xl text-xs font-black shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                            >
                                <span className="material-icons text-sm">{blastingEmail ? 'hourglass_top' : 'send'}</span>
                                <span>{blastingEmail ? 'Menjadwalkan...' : `Kirim Email Blast (${selectedUserIds.length})`}</span>
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
                                        <option value="lingkup_tugas_ids">Lingkup Tugas</option>
                                        <option value="bidang_tugas_ids">Bidang Tugas</option>
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
                                                        onChange={() => { const ids = Array.isArray(batchValue) ? batchValue : []; setBatchValue(ids.includes(r.id) ? ids.filter(x => x !== r.id) : [...ids, r.id]); }} className="w-3 h-3 text-green-600 rounded" />
                                                    {r.name}
                                                </label>
                                            ))}
                                        </div>
                                    ) : batchField === 'label_ids' ? (
                                        <div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            {allLabels.map(l => (
                                                <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(batchValue || []).includes(l.id) ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                    <input type="checkbox" checked={(batchValue || []).includes(l.id)}
                                                        onChange={() => { const ids = Array.isArray(batchValue) ? batchValue : []; setBatchValue(ids.includes(l.id) ? ids.filter(x => x !== l.id) : [...ids, l.id]); }} className="w-3 h-3 text-purple-600 rounded" />
                                                    {l.name}
                                                </label>
                                            ))}
                                        </div>
                                    ) : batchField === 'lingkup_tugas_ids' ? (
                                        <div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            {allLingkup.map(l => (
                                                <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(batchValue || []).includes(l.id) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                    <input type="checkbox" checked={(batchValue || []).includes(l.id)}
                                                        onChange={() => { const ids = Array.isArray(batchValue) ? batchValue : []; setBatchValue(ids.includes(l.id) ? ids.filter(x => x !== l.id) : [...ids, l.id]); }} className="w-3 h-3 text-blue-600 rounded" />
                                                    {l.name}
                                                </label>
                                            ))}
                                        </div>
                                    ) : batchField === 'bidang_tugas_ids' ? (
                                        <div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                            {allBidang.map(l => (
                                                <label key={l.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs transition ${(batchValue || []).includes(l.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                    <input type="checkbox" checked={(batchValue || []).includes(l.id)}
                                                        onChange={() => { const ids = Array.isArray(batchValue) ? batchValue : []; setBatchValue(ids.includes(l.id) ? ids.filter(x => x !== l.id) : [...ids, l.id]); }} className="w-3 h-3 text-emerald-600 rounded" />
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

            {/* ============ IMPORT CSV MODAL ============ */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900"><span className="material-icons text-blue-600 align-middle mr-2">upload_file</span>Import User CSV</h2>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons">close</span></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800 leading-relaxed">
                                <p className="font-bold mb-1">Panduan Import:</p>
                                <ul className="list-disc ml-4 space-y-0.5">
                                    <li>Gunakan file CSV hasil Export agar format kolom sesuai.</li>
                                    <li>Gunakan delimiter <b>titik koma (;)</b>.</li>
                                    <li>Jika <b>ID</b> ditemukan, data user akan di-update (PUT).</li>
                                    <li>Jika <b>ID</b> kosong, user baru akan dibuat (POST).</li>
                                    <li>Username baru akan di-generate otomatis jika kosong.</li>
                                </ul>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block ml-1">Pilih File CSV</label>
                                <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files[0])}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            {importResult && (
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    <div className="bg-green-50 border border-green-100 p-3 rounded-xl text-xs text-green-800">
                                        {importResult.message}
                                    </div>
                                    {importResult.errors?.length > 0 && (
                                        <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-[10px] text-red-800">
                                            <p className="font-bold mb-1">Errors:</p>
                                            {importResult.errors.map((err, i) => <p key={i}>• {err}</p>)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 rounded-b-3xl">
                            <button onClick={() => setShowImportModal(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-200 transition">Tutup</button>
                            <button onClick={handleImportCsv} disabled={importing || !importFile}
                                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition disabled:opacity-50">
                                {importing ? 'Mengimport...' : 'Mulai Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />

            {/* Floating Photo Preview Card */}
            {hoveredPhoto && (
                <div 
                    className="fixed z-[9999] pointer-events-none bg-white/90 p-2 rounded-2xl shadow-2xl border border-gray-100/50 backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-95"
                    style={{ 
                        left: `${hoveredPhoto.x}px`, 
                        top: `${hoveredPhoto.y}px`,
                        transform: 'translateY(-10%)'
                    }}
                >
                    <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-gray-50 border border-gray-100/50">
                        <img 
                            src={hoveredPhoto.url} 
                            alt="Preview" 
                            className="w-full h-full object-cover animate-in fade-in duration-300"
                        />
                    </div>
                    {hoveredPhoto.name && (
                        <div className="mt-2 text-center">
                            <p className="text-[11px] font-bold text-gray-900 truncate max-w-[192px]">{hoveredPhoto.name}</p>
                        </div>
                    )}
                </div>
            )}
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
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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

const MultiSelectCell = ({ selectedItems, allOptions, onSave, color = "blue" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (containerRef.current && dropdownRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const dropdownWidth = 220;
            const dropdownHeight = 210; // estimate max height (192px max-h-48 + padding)
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Align / clamp left to stay fully on screen
            let left = rect.left;
            if (rect.left + dropdownWidth > viewportWidth) {
                left = Math.max(10, viewportWidth - dropdownWidth - 10);
            }
            
            // Position above if going off bottom viewport
            let top = rect.bottom + 5;
            if (rect.bottom + dropdownHeight > viewportHeight && rect.top > dropdownHeight) {
                top = rect.top - dropdownHeight - 5;
            }
            
            dropdownRef.current.style.top = `${top}px`;
            dropdownRef.current.style.left = `${left}px`;
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            // Initial position update
            updatePosition();
            
            // Capture all scroll events (including nested table horizontal scroll) in real-time
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen, updatePosition]);

    const selectedIds = (selectedItems || []).map(i => i.id);
    const handleToggle = (id) => {
        const newIds = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
        onSave(newIds);
    };

    const colorClasses = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', hover: 'hover:bg-blue-100', accent: 'text-blue-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', hover: 'hover:bg-purple-100', accent: 'text-purple-600' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', hover: 'hover:bg-indigo-100', accent: 'text-indigo-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', hover: 'hover:bg-emerald-100', accent: 'text-emerald-600' }
    }[color] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', hover: 'hover:bg-gray-100', accent: 'text-gray-600' };

    return (
        <div className="relative" ref={containerRef}>
            <div onClick={() => setIsOpen(!isOpen)}
                className="w-full min-w-[100px] min-h-[32px] p-1.5 border border-transparent hover:border-gray-200 hover:bg-gray-50/50 rounded-xl cursor-pointer transition-all flex flex-wrap gap-1 items-start group">
                {(selectedItems || []).length === 0 ? (
                    <span className="text-gray-300 italic text-[10px] ml-1">Pilih...</span>
                ) : (
                    selectedItems.map(item => (
                        <span key={item.id} className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-lg ${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} max-w-full break-words leading-tight`}>
                            {item.name}
                        </span>
                    ))
                )}
                <span className="material-icons text-gray-300 text-[12px] ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity">expand_more</span>
            </div>

            {isOpen && ReactDOM.createPortal(
                <div 
                    ref={dropdownRef} 
                    className="fixed z-[9999] bg-white border border-gray-100 shadow-2xl rounded-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden" 
                    style={{
                        width: '220px'
                    }}
                >
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                        {allOptions.map(opt => (
                            <label key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition ${selectedIds.includes(opt.id) ? colorClasses.bg : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={selectedIds.includes(opt.id)} onChange={() => handleToggle(opt.id)}
                                    className={`w-3.5 h-3.5 ${colorClasses.accent} rounded border-gray-300 focus:ring-0`} />
                                <span className={`text-[10px] font-bold ${selectedIds.includes(opt.id) ? colorClasses.text : 'text-gray-600'}`}>{opt.name}</span>
                            </label>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DashboardUserPage;
