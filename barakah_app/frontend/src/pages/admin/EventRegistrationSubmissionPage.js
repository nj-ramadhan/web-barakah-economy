import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getEventRegistrations, getEventDetail, exportRegistrationsCsv, blastEventWhatsapp } from '../../services/eventApi';
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
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Peserta</th>
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
                                                    <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-black inline-block">
                                                        {reg.user_details?.id || '-'}
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
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        reg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-4 no-print">
                    <button
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        className="flex items-center justify-center gap-2 bg-white text-green-700 border-2 border-green-700 px-6 py-3 rounded-2xl text-xs font-bold shadow-sm hover:bg-green-50 transition disabled:opacity-50"
                    >
                        <span className="material-icons text-sm">{isExporting ? 'hourglass_top' : 'download'}</span>
                        {isExporting ? 'MENGEKSPOR...' : 'EKSPOR DATA (CSV)'}
                    </button>

                    <button
                        onClick={() => setShowBlastModal(true)}
                        className="flex items-center justify-center gap-2 bg-green-700 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-xl hover:bg-green-800 transition"
                    >
                        <span className="material-icons text-sm">campaign</span>
                        BLAST PENGINGAT (WA)
                    </button>

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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-green-700">campaign</span>
                                <h3 className="font-black text-gray-900 uppercase tracking-tight">Blast WhatsApp</h3>
                            </div>
                            <button onClick={() => setShowBlastModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-xs text-gray-500 font-medium mb-4 italic">
                                {selectedIds.length > 0 ? (
                                    <>Akan mengirim pesan ke <span className="text-green-700 font-black">{selectedIds.length}</span> peserta terpilih.</>
                                ) : (
                                    <>Pesan akan dikirim ke <span className="text-green-600 font-bold text-xs">SELURUH</span> peserta yang terdaftar.</>
                                )}
                            </p>

                            <div className="mb-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Isi Pesan</label>
                                <textarea
                                    className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition"
                                    value={blastMessage}
                                    onChange={(e) => setBlastMessage(e.target.value)}
                                    placeholder="Tulis pesan pengingat..."
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="text-[9px] text-gray-400">Gunakan tag: </span>
                                    <code className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-bold">{'{name}'}</code>
                                    <code className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded font-bold">{'{event}'}</code>
                                </div>
                            </div>

                            <button
                                onClick={handleBlast}
                                disabled={isBlasting || !blastMessage.trim()}
                                className="w-full bg-green-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-700/20 hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isBlasting ? (
                                    <>
                                        <span className="material-icons animate-spin">sync</span>
                                        SEDANG MENGIRIM...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons">send</span>
                                        KIRIM SEKARANG
                                    </>
                                )}
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
