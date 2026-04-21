import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getEventRegistrations, getEventDetail, exportRegistrationsCsv, blastEventWhatsapp, bulkDeleteRegistrations } from '../../services/eventApi';
import '../../styles/Body.css';

const EventRegistrationSubmissionPage = () => {
    const { slug } = useParams();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [blastMessage, setBlastMessage] = useState('Halo {name}, mau mengingatkan untuk event {event} besok ya. Sampai jumpa!');
    const [isBlasting, setIsBlasting] = useState(false);
    const [selectedPaymentProof, setSelectedPaymentProof] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
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
        fetchData();
    }, [slug]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(registrations.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
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
        const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${cleanBaseUrl}${cleanPath}`;
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

    const handleBlast = async () => {
        if (!blastMessage.trim() || isBlasting) return;

        if (!window.confirm('Kirim pesan WhatsApp ke semua peserta yang terdaftar?')) return;

        setIsBlasting(true);
        try {
            // Only sent selected IDs if specifically selected, otherwise backend defaults to all approved
            const res = await blastEventWhatsapp(slug, blastMessage, selectedIds.length > 0 ? selectedIds : null);
            alert(`Berhasil! ${res.data.message}`);
            setShowBlastModal(false);
        } catch (err) {
            console.error(err);
            alert('Gagal mengirim blast: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsBlasting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) {
            alert('Pilih peserta yang akan dihapus terlebih dahulu.');
            return;
        }

        if (!window.confirm(`Hapus ${selectedIds.length} peserta yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) {
            return;
        }

        try {
            await bulkDeleteRegistrations(selectedIds);
            alert('Berhasil menghapus peserta.');
            // Update UI
            setRegistrations(prev => prev.filter(r => !selectedIds.includes(r.id)));
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus peserta: ' + (err.response?.data?.error || err.message));
        }
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
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Data Pendaftar Event</h1>
                        <p className="text-sm text-gray-500 font-medium italic">{event?.title}</p>
                    </div>
                </div>

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
                                            checked={registrations.length > 0 && selectedIds.length === registrations.length}
                                        />
                                    </th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode Tiket</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identitas</th>
                                    {event?.form_fields?.map(field => (
                                        <th key={field.id} className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[150px]">{field.label}</th>
                                    ))}
                                    {event?.price_type !== 'free' && (
                                        <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pembayaran</th>
                                    )}
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {registrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + (event?.form_fields?.length || 0)} className="p-12 text-center text-gray-400 italic text-sm">
                                            Belum ada data pendaftar.
                                        </td>
                                    </tr>
                                ) : (
                                    registrations.map((reg) => {
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
                                            {event?.form_fields?.map(field => {
                                                let value = reg.responses[field.id];
                                                
                                                // Robust fallback: if ID mismatch (e.g. fields were deleted/recreated), 
                                                // try to find by label match in responses
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
                                            {event?.price_type !== 'free' && (
                                                <td className="p-5 text-xs whitespace-nowrap">
                                                    <div className="font-black text-gray-900">Rp {Number(reg.payment_amount || 0).toLocaleString('id-ID')}</div>
                                                    <div className="flex flex-col gap-1.5 mt-1.5">
                                                        {reg.payment_proof ? (
                                                            <button 
                                                                onClick={() => setSelectedPaymentProof(reg.payment_proof)}
                                                                className="flex items-center gap-1 text-blue-600 font-bold hover:underline py-1"
                                                            >
                                                                <span className="material-icons text-xs">receipt_long</span>
                                                                Bukti Transfer
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 italic">No Proof</span>
                                                        )}
                                                        <span className={`w-fit px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                                            reg.payment_status === 'verified' ? 'bg-green-50 text-green-700' :
                                                            reg.payment_status === 'rejected' ? 'bg-red-50 text-red-700' :
                                                            'bg-orange-50 text-orange-700'
                                                        }`}>
                                                            {reg.payment_status || 'Pending'}
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
                                                        {reg.status}
                                                    </span>
                                                    {reg.is_attended && (
                                                        <span className="w-fit bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1" title={reg.attended_at ? new Date(reg.attended_at).toLocaleString('id-ID') : 'Hadir'}>
                                                            <span className="material-icons text-[10px]">how_to_reg</span> Hadir
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modern Action Toolbar */}
                <div className="mt-12 flex justify-center no-print px-4">
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-green-900/10 transition-all duration-500 hover:shadow-green-900/20 max-w-full overflow-hidden">
                        {/* Status Label (If Selected) */}
                        {selectedIds.length > 0 && (
                            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-100 mr-2 animate-in fade-in slide-in-from-left-4">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">{selectedIds.length} Terpilih</span>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 sm:gap-2">
                            {/* Delete Button */}
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className="group flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold transition-all disabled:opacity-20 active:scale-95 border border-red-100"
                                title="Hapus Data Terpilih"
                            >
                                <span className="material-icons text-xl group-hover:rotate-12 transition-transform">delete_sweep</span>
                                <span className="text-[10px] uppercase tracking-widest hidden sm:inline">Hapus</span>
                            </button>

                            {/* Export Button */}
                            <button
                                onClick={handleExportCsv}
                                disabled={isExporting}
                                className="group flex items-center gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl font-bold transition-all disabled:opacity-50 active:scale-95 border border-gray-200"
                            >
                                <span className={`material-icons text-xl ${isExporting ? 'animate-spin' : 'group-hover:-translate-y-0.5 transition-transform'}`}>
                                    {isExporting ? 'sync' : 'cloud_download'}
                                </span>
                                <span className="text-[10px] uppercase tracking-widest hidden sm:inline">
                                    {isExporting ? 'Export CSV' : 'Export CSV'}
                                </span>
                            </button>

                            <div className="w-px h-8 bg-gray-200 mx-1 sm:mx-2"></div>

                            {/* Blast Button */}
                            <button 
                                onClick={() => setShowBlastModal(true)}
                                className="group relative flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-[1.25rem] shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.02] active:scale-95 transition-all font-black overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                <span className="material-icons text-xl group-hover:rotate-12 transition-transform">whatsapp</span>
                                <span className="text-[11px] uppercase tracking-[0.15em] hidden xs:inline">Blast WA</span>
                                <span className="text-[11px] uppercase tracking-[0.15em] xs:hidden">Blast</span>
                            </button>
                        </div>
                    </div>
                </div>
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
                            const instansi = Object.keys(reg.responses).map(key => {
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

                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Isi Pesan</label>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => setBlastMessage(prev => prev + ' {name}')} className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition">+{'{name}'}</button>
                                        <button onClick={() => setBlastMessage(prev => prev + ' {event}')} className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition">+{'{event}'}</button>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full h-40 p-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 outline-none transition-all resize-none shadow-inner"
                                    value={blastMessage}
                                    onChange={(e) => setBlastMessage(e.target.value)}
                                    placeholder="Tulis pesan pengingat..."
                                />
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
                                            <span className="material-icons animate-spin">sync</span>
                                            <span className="tracking-widest text-xs">SEDANG MENGIRIM...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">send</span>
                                            <span className="tracking-widest text-xs">KIRIM BROADCAST</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
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

            <NavigationButton />
        </div>
    );
};

export default EventRegistrationSubmissionPage;
