import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getEventRegistrations, getEventDetail, exportRegistrationsCsv, blastEventWhatsapp, bulkDeleteRegistrations, importParticipantsCsv, bulkResendNotifications, markEventSessionFinished, updateEventRegistration } from '../../services/eventApi';
import EventManualRegistrationModal from '../../components/admin/EventManualRegistrationModal';
import EventRegistrationEditModal from '../../components/admin/EventRegistrationEditModal';
import CertificateEditor from '../../components/events/CertificateEditor';
import BibEditor from '../../components/events/BibEditor';
import SpecialQREditor from '../../components/events/SpecialQREditor';
import EventCommitteeModal from '../../components/admin/EventCommitteeModal';
import { formatCurrency } from '../../utils/formatters';
import '../../styles/Body.css';

const EventRegistrationSubmissionPage = () => {
    const { slug } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || 'participants';

    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [isBlasting, setIsBlasting] = useState(false);
    const [blastResult, setBlastResult] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    const WA_TEMPLATES = [
        { id: 'custom', label: 'Custom', message: '' },
        { id: 'reminder', label: 'Reminder Event', message: 'Halo {name}, mengingatkan untuk event {event} yang akan dilaksanakan pada {time}. Sampai jumpa di lokasi: {location_link} !' },
        { id: 'info', label: 'Info Khusus', message: 'Halo {name}, ada informasi khusus terkait event {event}. Silakan cek detailnya di: {event_link}' },
        { id: 'sertifikat', label: 'Info Sertifikat', message: 'Halo {name}, terima kasih telah mengikuti event {event}. Sertifikat Anda sudah tersedia dan dapat diunduh di: {event_link}' },
        { id: 'dokumentasi', label: 'Info Dokumentasi', message: 'Halo {name}, dokumentasi event {event} telah ditambahkan. Anda bisa lihat dan unduh di halaman: {event_link}' },
    ];
    const [blastMessage, setBlastMessage] = useState('Halo {name}, mau mengingatkan untuk event {event} besok ya. Sampai jumpa!');
    const [selectedPaymentProof, setSelectedPaymentProof] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showManualModal, setShowManualModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRegistration, setEditingRegistration] = useState(null);
    const [activeTab, setActiveTab] = useState(initialTab); // 'participants', 'certificate', 'bib', or 'special_qr'
    const [isImporting, setIsImporting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    
    // Sorting and Filtering State
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [filters, setFilters] = useState({ label: '', gender: '', attendance: 'all' });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [slug]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get event detail to know the fields
            const eventRes = await getEventDetail(slug);
            setEvent(eventRes.data);

            // Get registrations for this event
            const regRes = await getEventRegistrations({ event: eventRes.data.id });
            setRegistrations(regRes.data);
        } catch (err) {
            console.error(err);
            setError('Gagal memuat data pendaftaran.');
        } finally {
            setLoading(false);
        }
    };

    const getHybridInfo = (reg, eventFields) => {
        let name = "";
        let email = "";
        let phone = "";
        let isProfileComplete = false;

        // Start with User Details (Profile)
        if (reg.user_details) {
            name = reg.user_details.profile?.name_full || reg.user_details.username || "";
            if (reg.user_details.profile?.name_full) isProfileComplete = true;

            email = reg.user_details.email || "";
            phone = reg.user_details.phone || "";
            if (phone) isProfileComplete = true;
        }

        // Fallback to Guest Info
        if (!name) name = reg.guest_name || "Peserta";
        if (!email) email = reg.guest_email || "-";
        if (!phone) phone = "-";

        // Hybrid enrichment from form responses
        if (eventFields && reg.responses) {
            eventFields.forEach(field => {
                const label = (field.label || '').toLowerCase();
                const value = reg.responses[field.id];
                if (!value) return;

                // Priority: Form contact info for specific event context
                if (label.includes('email')) {
                    email = value;
                }
                if (label.includes('wa') || label.includes('hp') || label.includes('telepon') || label.includes('phone') || label.includes('handphone')) {
                    phone = value;
                }

                // Name: Only override profile if profile is incomplete or form field is specifically 'Nama Lengkap'
                if (label.includes('nama lengkap') || (label.includes('nama pendaftar'))) {
                    if (!isProfileComplete || label.includes('lengkap')) {
                        name = value;
                    }
                } else if (!name && label.includes('nama')) {
                    name = value;
                }
            });
        }

        return { name, email, phone };
    };

    const getImageUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://api.barakah.cloud';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanBaseUrl}${cleanPath}`;
    };

    // --- Sorting and Filtering Logic ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleVerifyPayment = async (registrationId) => {
        if (!window.confirm('Verifikasi pembayaran OTS untuk peserta ini?')) return;
        
        try {
            await updateEventRegistration(registrationId, { payment_status: 'verified' });
            setRegistrations(prev => prev.map(r => r.id === registrationId ? { ...r, payment_status: 'verified' } : r));
            alert('Pembayaran diverifikasi.');
        } catch (err) {
            console.error(err);
            alert('Gagal verifikasi pembayaran.');
        }
    };

    const uniqueLabels = useMemo(() => {
        const labels = new Set();
        registrations.forEach(reg => {
            reg.user_details?.labels?.forEach(l => labels.add(l.name));
        });
        return Array.from(labels).sort();
    }, [registrations]);

    const filteredRegistrations = useMemo(() => {
        return registrations.filter(reg => {
            const hybrid = getHybridInfo(reg, event?.form_fields);
            
            // Search Filter
            const searchStr = `${hybrid.name} ${hybrid.email} ${reg.unique_code}`.toLowerCase();
            if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

            // Label Filter
            if (filters.label && !reg.user_details?.labels?.some(l => l.name === filters.label)) return false;

            // Gender Filter
            if (filters.gender) {
                const genderField = event?.form_fields?.find(f => (f.label || '').toLowerCase().includes('jenis kelamin'));
                const genderValue = reg.responses?.[genderField?.id]?.toLowerCase();
                if (genderValue !== filters.gender.toLowerCase()) return false;
            }

            // Attendance Filter
            if (filters.attendance !== 'all') {
                const isAttended = reg.is_attended || (reg.attendances_list && reg.attendances_list.length > 0);
                if (filters.attendance === 'attended' && !isAttended) return false;
                if (filters.attendance === 'not_attended' && isAttended) return false;
            }

            return true;
        });
    }, [registrations, event, searchTerm, filters]);

    const sortedRegistrations = useMemo(() => {
        return [...filteredRegistrations].sort((a, b) => {
            const { key, direction } = sortConfig;
            let valA, valB;

            if (key === 'created_at') {
                valA = new Date(a.created_at);
                valB = new Date(b.created_at);
            } else if (key === 'unique_code') {
                valA = a.unique_code || '';
                valB = b.unique_code || '';
            } else if (key === 'name') {
                valA = getHybridInfo(a, event?.form_fields).name.toLowerCase();
                valB = getHybridInfo(b, event?.form_fields).name.toLowerCase();
            } else if (key === 'status') {
                valA = a.status || '';
                valB = b.status || '';
            } else {
                valA = a[key];
                valB = b[key];
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredRegistrations, sortConfig, event]);

    const handleMarkSessionFinished = async (sessionId) => {
        if (!window.confirm('Tandai sesi ini selesai dan kirim reminder untuk sesi berikutnya (jika ada)?')) return;
        try {
            const res = await markEventSessionFinished(slug, sessionId);
            // Refresh data to update session status
            fetchData();
            alert(res.data.message);
        } catch (err) {
            console.error(err);
            alert('Gagal menandai sesi selesai.');
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(sortedRegistrations.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };


    const handleExportCsv = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const res = await exportRegistrationsCsv(slug);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `peserta_${slug}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            alert('Gagal mengekspor data.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportCsv = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const res = await importParticipantsCsv(slug, file);
            alert(res.data.message);
            if (res.data.errors && res.data.errors.length > 0) {
                console.warn("Import Errors:", res.data.errors);
            }
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Gagal mengimpor data: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset input
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
        if (!blastMessage.trim() || isBlasting) return;

        if (!window.confirm('Kirim pesan WhatsApp ke semua peserta yang terdaftar?')) return;

        setIsBlasting(true);
        try {
            // Only sent selected IDs if specifically selected, otherwise backend defaults to all approved
            const res = await blastEventWhatsapp(slug, blastMessage, selectedIds.length > 0 ? selectedIds : null, blastImage);
            alert(`Berhasil! ${res.data.message}`);
            setShowBlastModal(false);
            setBlastImage(null);
        } catch (err) {
            console.error(err);
            alert('Gagal mengirim blast: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsBlasting(false);
        }
    };
    
    const handleResendNotifications = async () => {
        if (selectedIds.length === 0 || isResending) return;
        
        if (!window.confirm(`Kirim ulang notifikasi QR/BIB ke ${selectedIds.length} peserta terpilih?`)) return;
        
        setIsResending(true);
        try {
            const res = await bulkResendNotifications(slug, selectedIds);
            alert(res.data.message);
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            alert('Gagal mengirim ulang notifikasi: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsResending(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0 || isDeleting) {
            return;
        }

        if (!window.confirm(`Hapus ${selectedIds.length} peserta yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            await bulkDeleteRegistrations(selectedIds);
            alert('Berhasil menghapus peserta.');
            // Update UI
            setRegistrations(prev => prev.filter(r => !selectedIds.includes(r.id)));
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus peserta: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditClick = (reg) => {
        setEditingRegistration(reg);
        setShowEditModal(true);
    };

    if (loading) return <div className="body flex items-center justify-center min-h-screen text-green-700">Memuat data pendaftaran...</div>;

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Data Pendaftar - {event?.title}</title>
            </Helmet>
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <Link to="/dashboard/my-events" className="text-xs font-bold text-green-700 flex items-center gap-1 mb-2 hover:underline">
                            <span className="material-icons text-sm">arrow_back</span> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Daftar Pendaftar</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{event?.title}</p>
                    </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        {/* Tab Switcher */}
                        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                            <button 
                                onClick={() => setActiveTab('participants')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'participants' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Pendaftar
                            </button>
                            <button 
                                onClick={() => setActiveTab('certificate')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'certificate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Sertifikat
                            </button>
                            {event?.has_bib && (
                                <button 
                                    onClick={() => setActiveTab('bib')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'bib' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    BIB
                                </button>
                            )}
                            {event?.has_special_qr && (
                                <button 
                                    onClick={() => setActiveTab('special_qr')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'special_qr' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Manajemen QR
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-100 animate-in fade-in slide-in-from-left-4">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{selectedIds.length} Terpilih</span>
                            </div>
                        )}
                        <button
                            onClick={handleBulkDelete}
                            disabled={selectedIds.length === 0 || isDeleting}
                            className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-100 transition shadow-sm border border-red-100 disabled:opacity-20"
                            title="Hapus Data Terpilih"
                        >
                            <span className={`material-icons text-sm ${isDeleting ? 'animate-spin' : ''}`}>
                                {isDeleting ? 'sync' : 'delete_sweep'}
                            </span>
                            {isDeleting ? 'Menghapus...' : 'Hapus'}
                        </button>
                        <button
                            onClick={handleExportCsv}
                            disabled={isExporting}
                            className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition shadow-sm border border-gray-200 disabled:opacity-50"
                        >
                            <span className={`material-icons text-sm ${isExporting ? 'animate-spin' : ''}`}>
                                {isExporting ? 'sync' : 'cloud_download'}
                            </span>
                            Export
                        </button>
                        <div className="relative">
                            <input 
                                type="file" 
                                accept=".csv" 
                                id="import-csv-input" 
                                className="hidden" 
                                onChange={handleImportCsv}
                                disabled={isImporting}
                            />
                            <label
                                htmlFor="import-csv-input"
                                className={`bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition shadow-sm border border-gray-200 cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <span className={`material-icons text-sm ${isImporting ? 'animate-spin' : ''}`}>
                                    {isImporting ? 'sync' : 'cloud_upload'}
                                </span>
                                Import
                            </label>
                        </div>
                        <button
                            onClick={() => setShowManualModal(true)}
                            className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100"
                        >
                            <span className="material-icons text-sm">person_add</span>
                            Tambah
                        </button>
                        <Link
                            to={`/dashboard/event/scan/${slug}`}
                            className="bg-purple-50 text-purple-600 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-100 transition shadow-sm border border-purple-100"
                        >
                            <span className="material-icons text-sm">qr_code_scanner</span>
                            Scan Hadir
                        </Link>
                        <button
                            onClick={() => setShowBlastModal(true)}
                            className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-700 transition shadow-lg shadow-purple-100"
                        >
                            <span className="material-icons text-sm">send</span>
                            Blast WA
                        </button>
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleResendNotifications}
                                disabled={isResending}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100 animate-in zoom-in duration-200"
                            >
                                <span className={`material-icons text-sm ${isResending ? 'animate-spin' : ''}`}>
                                    {isResending ? 'sync' : 'qr_code_2'}
                                </span>
                                Kirim Ulang QR/BIB
                            </button>
                        )}
                        <button
                            onClick={() => setShowCommitteeModal(true)}
                            className="bg-purple-100 text-purple-600 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-200 transition shadow-sm border border-purple-200"
                        >
                            <span className="material-icons text-sm">groups</span>
                            Panitia
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input 
                                type="text"
                                placeholder="Cari Nama / Kode..."
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-green-500 outline-none transition"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-green-500 outline-none transition"
                            value={filters.label}
                            onChange={(e) => setFilters(prev => ({ ...prev, label: e.target.value }))}
                        >
                            <option value="">Semua Label</option>
                            {uniqueLabels.map(label => (
                                <option key={label} value={label}>{label}</option>
                            ))}
                        </select>
                        <select 
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-green-500 outline-none transition"
                            value={filters.gender}
                            onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                        >
                            <option value="">Semua Gender</option>
                            <option value="laki-laki">Laki-laki</option>
                            <option value="perempuan">Perempuan</option>
                        </select>
                        <select 
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-green-500 outline-none transition"
                            value={filters.attendance}
                            onChange={(e) => setFilters(prev => ({ ...prev, attendance: e.target.value }))}
                        >
                            <option value="all">Semua Kehadiran</option>
                            <option value="attended">Sudah Hadir</option>
                            <option value="not_attended">Belum Hadir</option>
                        </select>
                    </div>
                </div>

                {activeTab === 'participants' ? (
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-5 w-10">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-green-700 focus:ring-green-500"
                                            onChange={handleSelectAll}
                                            checked={sortedRegistrations.length > 0 && selectedIds.length === sortedRegistrations.length}
                                        />
                                    </th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-green-700 transition" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center gap-1">
                                            Waktu
                                            {sortConfig.key === 'created_at' && (
                                                <span className="material-icons text-xs">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-green-700 transition" onClick={() => handleSort('unique_code')}>
                                        <div className="flex items-center gap-1">
                                            Kode Tiket
                                            {sortConfig.key === 'unique_code' && (
                                                <span className="material-icons text-xs">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-green-700 transition" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">
                                            Identitas
                                            {sortConfig.key === 'name' && (
                                                <span className="material-icons text-xs">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Label</th>
                                    {event?.sessions && event.sessions.length > 0 ? (
                                        event.sessions.map(ses => (
                                            <th key={ses.id} className="p-5 text-[10px] font-black text-purple-600 uppercase tracking-widest min-w-[120px] text-center bg-purple-50/30 border-x border-purple-100">
                                                <div className="mb-2">{ses.title}</div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMarkSessionFinished(ses.id);
                                                    }}
                                                    disabled={ses.is_finished}
                                                    className={`px-3 py-1 rounded-full text-[8px] font-black transition shadow-sm ${ses.is_finished ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                                >
                                                    {ses.is_finished ? 'SELESAI' : 'SELESAIKAN'}
                                                </button>
                                            </th>
                                        ))
                                    ) : (
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-green-700 transition" onClick={() => handleSort('is_attended')}>
                                            <div className="flex items-center justify-center gap-1">
                                                Kehadiran
                                                {sortConfig.key === 'is_attended' && (
                                                    <span className="material-icons text-xs">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                                )}
                                            </div>
                                        </th>
                                    )}
                                    {event?.form_fields?.filter(field => {
                                        const label = (field.label || '').toLowerCase();
                                        return !(label === 'nama' || label === 'nama lengkap' || label === 'email' || label.includes('whatsapp') || label === 'no hp' || label === 'nomor wa');
                                    }).map(field => (
                                        <th key={field.id} className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[150px]">{field.label}</th>
                                    ))}
                                    {event?.price_variations?.length > 0 && (
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-green-700 transition" onClick={() => handleSort('price_variation')}>
                                            Variasi
                                        </th>
                                    )}
                                    {event?.price_type !== 'free' && (
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-green-700 transition" onClick={() => handleSort('payment_amount')}>
                                            <div className="flex items-center gap-1">
                                                Pembayaran
                                                {sortConfig.key === 'payment_amount' && (
                                                    <span className="material-icons text-xs">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                                )}
                                            </div>
                                        </th>
                                    )}
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-green-700 transition" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-end gap-1">
                                            Status
                                            {sortConfig.key === 'status' && (
                                                <span className="material-icons text-xs">{sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedRegistrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={10 + (event?.form_fields?.length || 0) + (event?.sessions?.length || 0)} className="p-12 text-center text-gray-400 italic text-sm">
                                            {searchTerm || filters.label || filters.gender || filters.attendance !== 'all' ? 'Tidak ada data pendaftar yang sesuai filter.' : 'Belum ada data pendaftar.'}
                                        </td>
                                    </tr>
                                ) : (
                                    sortedRegistrations.map((reg) => {
                                        const hybrid = getHybridInfo(reg, event?.form_fields);
                                        return (
                                            <tr key={reg.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.includes(reg.id) ? 'bg-green-50/30' : ''}`}>
                                                <td className="p-5">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-green-700 focus:ring-green-500"
                                                        checked={selectedIds.includes(reg.id)}
                                                        onChange={() => handleSelectOne(reg.id)}
                                                    />
                                                </td>
                                                <td className="p-5 text-xs text-gray-500">
                                                    {new Date(reg.created_at).toLocaleDateString('id-ID')}
                                                    <br />
                                                    {new Date(reg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-5">
                                                    <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-black inline-block font-mono">
                                                        {reg.unique_code || '-'}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                                                        {hybrid.name}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-medium">
                                                        {hybrid.email}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                        {reg.user_details?.labels?.length > 0 ? (
                                                            reg.user_details.labels.map((l, idx) => (
                                                                <span key={idx} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border border-blue-100">
                                                                    {l.name}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-300 italic text-[10px]">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                                {/* Dynamic Session Attendance Columns */}
                                                {event?.sessions && event.sessions.length > 0 ? (
                                                    event.sessions.map(ses => {
                                                        const attendance = reg.attendances_list?.find(att => {
                                                            const attSessionId = (att.session && typeof att.session === 'object') ? att.session.id : att.session;
                                                            return Number(attSessionId) === Number(ses.id);
                                                        });
                                                        return (
                                                            <td key={ses.id} className="p-5 text-center">
                                                                {attendance ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="material-icons text-purple-600 text-xl">check_circle</span>
                                                                        <span className="text-[8px] font-bold text-gray-400 uppercase">
                                                                            {new Date(attendance.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="material-icons text-gray-200 text-sm">radio_button_unchecked</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })
                                                ) : (
                                                    <td className="p-5 text-center">
                                                        {reg.is_attended ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="material-icons text-purple-600 text-xl">check_circle</span>
                                                                <span className="text-[8px] font-bold text-gray-400 uppercase">
                                                                    {reg.attended_at ? new Date(reg.attended_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Hadir'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="material-icons text-gray-200 text-sm">radio_button_unchecked</span>
                                                        )}
                                                    </td>
                                                )}
                                                {event?.form_fields?.filter(field => {
                                                    const label = (field.label || '').toLowerCase();
                                                    return !(label === 'nama' || label === 'nama lengkap' || label === 'email' || label.includes('whatsapp') || label === 'no hp' || label === 'nomor wa');
                                                }).map(field => {
                                                    let value = reg.responses?.[field.id];

                                                    // Robust Fallback 1: Use labels from backend serializer
                                                    if (!value && reg.responses_with_labels) {
                                                        value = reg.responses_with_labels[field.label];
                                                    }

                                                    // Robust Fallback 2: Legacy ID mapping for event #15 specific orphan keys
                                                    if (!value && reg.responses && event.id === 15) {
                                                        const legacyMap = {
                                                            'Nama': '81',
                                                            'Email': '82',
                                                            'No HP': '83',
                                                            'WhatsApp': '83',
                                                            'Asal Instansi': '84',
                                                            'Jenis Kelamin': '85'
                                                        };
                                                        const oldId = legacyMap[field.label];
                                                        if (oldId) value = reg.responses[oldId];
                                                    }

                                                    // Robust Fallback 3: Try to find by label key directly in responses (just in case)
                                                    if (!value && reg.responses) {
                                                        const labelKey = Object.keys(reg.responses).find(k => k.toLowerCase() === field.label?.toLowerCase());
                                                        if (labelKey) value = reg.responses[labelKey];
                                                    }

                                                    const file = reg.uploaded_files?.find(f => f.field === field.id);
                                                    
                                                    return (
                                                        <td key={field.id} className="p-5 text-sm text-gray-600">
                                                            {field.field_type === 'file' && file ? (
                                                                <a href={getImageUrl(file.file)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-700 font-bold hover:underline">
                                                                    <span className="material-icons text-sm">download</span> Lihat File
                                                                </a>
                                                            ) : Array.isArray(value) ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {value.map(v => <span key={v} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium">{v}</span>)}
                                                                </div>
                                                            ) : (
                                                                <span className="line-clamp-2 italic">{value || '-'}</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                {event?.price_variations?.length > 0 && (
                                                    <td className="p-5 text-xs text-gray-600">
                                                        <div className="font-bold text-gray-900">
                                                            {reg.price_variation_details?.title || '-'}
                                                        </div>
                                                        {reg.price_variation_details?.price > 0 && (
                                                            <div className="text-[9px] text-gray-400 font-bold uppercase">
                                                                Rp {formatCurrency(reg.price_variation_details.price)}
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                                {event?.price_type !== 'free' && (
                                                    <td className="p-5 text-xs whitespace-nowrap">
                                                        <div className="font-black text-gray-900">Rp {Number(reg.payment_amount || 0).toLocaleString('id-ID')}</div>
                                                        <div className="flex flex-col gap-1.5 mt-1.5">
                                                            {reg.payment_method === 'ots' ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-1 text-orange-600 font-bold py-1">
                                                                        <span className="material-icons text-xs">payments</span>
                                                                        OTS
                                                                    </div>
                                                                    {reg.payment_status !== 'verified' && (
                                                                        <label className="flex items-center gap-2 cursor-pointer group bg-orange-50 border border-orange-100 px-2 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="w-3.5 h-3.5 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                                                                onChange={() => handleVerifyPayment(reg.id)}
                                                                            />
                                                                            <span className="text-[9px] font-black text-orange-700 uppercase tracking-tighter">Sudah Bayar</span>
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            ) : reg.payment_proof ? (
                                                                <button
                                                                    onClick={() => setSelectedPaymentProof(reg.payment_proof)}
                                                                    className="flex items-center gap-1 text-blue-600 font-bold hover:underline py-1"
                                                                >
                                                                    <span className="material-icons text-xs">receipt_long</span>
                                                                    Bukti Transfer
                                                                </button>
                                                            ) : (reg.payment_amount === 0 || (() => {
                                                                // Label detection for free registration
                                                                if (!reg.user_details?.labels || !event?.free_for_labels) return false;
                                                                const userLabelIds = reg.user_details.labels.map(l => l.id);
                                                                const freeLabelIds = event.free_for_labels.map(l => l.id);
                                                                return userLabelIds.some(id => freeLabelIds.includes(id));
                                                            })()) ? (
                                                                <div className="flex items-center gap-1 text-green-600 font-bold py-1">
                                                                    <span className="material-icons text-xs">verified</span>
                                                                    Gratis (Label)
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 italic text-[8px]">No Proof</span>
                                                            )}
                                                            <span className={`w-fit px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${reg.payment_status === 'verified' ? 'bg-green-50 text-green-700' :
                                                                reg.payment_status === 'rejected' ? 'bg-red-50 text-red-700' :
                                                                    'bg-orange-50 text-orange-700'
                                                                }`}>
                                                                {reg.payment_status === 'verified' ? 'TERVERIFIKASI' : 
                                                                 reg.payment_status === 'rejected' ? 'DITOLAK' : 
                                                                 'MENUNGGU'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="p-5 text-right">
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <span className={`w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            reg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            {reg.status === 'approved' ? 'DISETUJUI' : 
                                                             reg.status === 'rejected' ? 'DITOLAK' : 
                                                             'MENUNGGU'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    <button
                                                        onClick={() => handleEditClick(reg)}
                                                        className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-900 hover:text-white transition group"
                                                        title="Edit Data Peserta"
                                                    >
                                                        <span className="material-icons text-sm group-hover:scale-110 transition">edit</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                ) : activeTab === 'certificate' ? (
                    <CertificateEditor slug={slug} />
                ) : activeTab === 'bib' ? (
                    <BibEditor slug={slug} />
                ) : (
                    <SpecialQREditor slug={slug} />
                )}
            </div>

            {/* PRINT COMPONENT (Hidden in Browser) */}
            <div className="print-only hidden">
                <style>{`
                    @media print {
                        .no-print, header, footer, .navigation-button, .sidebar, .mobile-nav { display: none !important; }
                        .print-only { display: block !important; padding: 0; margin: 0; }
                        body { background: white !important; font-family: 'Inter', sans-serif; color: black !important; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 2px solid black !important; padding: 8px !important; color: black !important; }
                        th { background-color: white !important; font-weight: 900 !important; }
                        
                        .print-header { text-align: center; margin-bottom: 20px; border-bottom: 3px solid black; padding-bottom: 10px; }
                        .print-title { font-size: 20pt; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
                        .print-subtitle { font-size: 14pt; font-weight: 700; margin-bottom: 2px; }
                        .print-info { font-size: 10pt; font-weight: 500; }
                        
                        .sign-area { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px; }
                        .sign-box { text-align: center; width: 200px; }
                        .sign-line { border-bottom: 2px solid black; margin-top: 60px; }
                        
                        @page { margin: 1cm; size: A4; }
                    }
                `}</style>

                <div className="print-header">
                    <div className="print-title">DAFTAR HADIR EVENT</div>
                    <div className="print-subtitle">{event?.title}</div>
                    <div className="print-info">
                        {new Date(event?.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | {event?.location}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>NO</th>
                            <th>NAMA LENGKAP</th>
                            <th>IDENTITAS / INSTANSI</th>
                            <th style={{ width: '180px' }}>PARAF / TANDA TANGAN</th>
                            <th style={{ width: '150px' }}>KETERANGAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.map((reg, idx) => {
                            const instansi = Object.keys(reg.responses || {}).map(key => {
                                const field = event?.form_fields?.find(f => f.id.toString() === key);
                                if (field && (field.label.toLowerCase().includes('instansi') || field.label.toLowerCase().includes('asal'))) {
                                    return reg.responses[key];
                                }
                                return null;
                            }).filter(v => v).join(', ');

                            return (
                                <tr key={reg.id} style={{ height: '50px' }}>
                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                    <td style={{ fontWeight: 'bold' }}>
                                        {reg.guest_name || reg.user_details?.profile?.name_full || reg.user_details?.username}
                                    </td>
                                    <td>
                                        <div>{reg.guest_email || reg.user_details?.email}</div>
                                        {instansi && <div style={{ fontSize: '9px', fontStyle: 'italic' }}>{instansi}</div>}
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="sign-area">
                    <div className="sign-box">
                        <p style={{ fontSize: '10pt' }}>Panitia Pelaksana,</p>
                        <div className="sign-line"></div>
                    </div>
                    <div className="sign-box">
                        <p style={{ fontSize: '10pt' }}>Ketua Penyelenggara,</p>
                        <div className="sign-line"></div>
                    </div>
                </div>

                <div style={{ marginTop: '40px', fontSize: '8pt', textAlign: 'center', fontStyle: 'italic', color: '#666' }}>
                    Dicetak secara otomatis melalui Barakah Economy System pada {new Date().toLocaleString('id-ID')}
                </div>
            </div>


            {/* Blast Modal */}
            {showBlastModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-300 border border-white">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gradient-to-br from-white to-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                    <span className="material-icons text-2xl">campaign</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Blast WhatsApp</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Broadcast Message</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBlastModal(false)}
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                                <span className="material-icons text-indigo-500 text-lg">info</span>
                                <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">
                                    {selectedIds.length > 0 ? (
                                        <>Mengirim pesan ke <span className="font-black text-indigo-700">{selectedIds.length}</span> peserta yang Anda pilih di tabel.</>
                                    ) : (
                                        <>Pesan akan dikirim ke <span className="font-black text-indigo-700">SELURUH</span> peserta dengan status Approved.</>
                                    )}
                                </p>
                            </div>

                            <div className="mb-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Pilih Template</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-2 focus:ring-emerald-500 transition outline-none"
                                    value={selectedTemplate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedTemplate(val);
                                        const template = WA_TEMPLATES.find(t => t.id === val);
                                        if (template && val !== 'custom') {
                                            setBlastMessage(template.message);
                                        }
                                    }}
                                >
                                    {WA_TEMPLATES.map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Isi Pesan</label>
                                    <div className="flex flex-wrap gap-1.5 justify-end">
                                        <button onClick={() => setBlastMessage(prev => prev + ' {name}')} className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition">+{'{name}'}</button>
                                        <button onClick={() => setBlastMessage(prev => prev + ' {event}')} className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition">+{'{event}'}</button>
                                        <button onClick={() => setBlastMessage(prev => prev + ' {event_link}')} className="text-[9px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg hover:bg-purple-100 transition">+{'{event_link}'}</button>
                                        <button onClick={() => setBlastMessage(prev => prev + ' {location_link}')} className="text-[9px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-lg hover:bg-orange-100 transition">+{'{location_link}'}</button>
                                        <button onClick={() => setBlastMessage(prev => prev + ' {time}')} className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition">+{'{time}'}</button>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 outline-none transition-all resize-none shadow-inner"
                                    value={blastMessage}
                                    onChange={(e) => setBlastMessage(e.target.value)}
                                    placeholder="Tulis pesan pengingat..."
                                />
                            </div>

                            <div className="mb-8">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Lampiran Gambar (Opsional)</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            id="blast-image-file" 
                                            className="hidden" 
                                            onChange={handleImageChange}
                                        />
                                        <label 
                                            htmlFor="blast-image-file" 
                                            className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-emerald-300 transition group"
                                        >
                                            <span className="material-icons text-gray-400 group-hover:text-emerald-500 text-lg transition">image</span>
                                            <span className="text-[11px] font-bold text-gray-500 group-hover:text-emerald-700 transition">
                                                {blastImage ? 'Ganti' : 'Lampirkan Gambar'}
                                            </span>
                                        </label>
                                    </div>
                                    {blastImage && (
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-100 shadow-sm shrink-0">
                                            <img src={blastImage} className="w-full h-full object-cover" alt="prev" />
                                            <button 
                                                onClick={() => setBlastImage(null)}
                                                className="absolute top-0 right-0 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition"
                                            >
                                                <span className="material-icons text-[10px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleBlast}
                                disabled={isBlasting || !blastMessage.trim()}
                                className="group relative w-full bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-emerald-900/20 hover:shadow-emerald-900/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center justify-center gap-3 relative z-10">
                                    {isBlasting ? (
                                        <>
                                            <span className="material-icons animate-spin text-sm">sync</span>
                                            <span className="tracking-widest text-[11px] uppercase">Sedang Mengirim...</span>
                                        </>
                                    ) : (
                                        <span className="tracking-widest text-[11px] uppercase">Kirim Blast Sekarang</span>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Committee Modal */}
            {showCommitteeModal && (
                <EventCommitteeModal 
                    slug={slug} 
                    onClose={() => setShowCommitteeModal(false)}
                    committees={event?.committees_details || []}
                    onRefresh={fetchData}
                />
            )}

            {/* Payment Proof Modal */}
            {selectedPaymentProof && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center">
                                    <span className="material-icons">receipt_long</span>
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Bukti Transfer</h3>
                                    <p className="text-[10px] text-gray-500 font-bold italic uppercase tracking-wider">Preview Transaksi</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedPaymentProof(null)}
                                className="w-10 h-10 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition"
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="p-8 bg-gray-50 flex-1 overflow-auto flex items-center justify-center min-h-0">
                            <img
                                src={getImageUrl(selectedPaymentProof)}
                                alt="Bukti Transfer"
                                className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-gray-200"
                            />
                        </div>
                        <div className="p-6 bg-white border-t border-gray-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedPaymentProof(null)}
                                className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black shadow-xl hover:bg-gray-800 transition active:scale-95"
                            >
                                TUTUP PREVIEW
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Registration Modal */}
            <EventManualRegistrationModal
                isOpen={showManualModal}
                onClose={() => setShowManualModal(false)}
                event={event}
                registrations={registrations}
                onSuccess={() => fetchData()}
            />

            <EventRegistrationEditModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingRegistration(null);
                }}
                event={event}
                registration={editingRegistration}
                onSuccess={() => fetchData()}
            />

            <NavigationButton />
        </div>
    );
};

export default EventRegistrationSubmissionPage;
