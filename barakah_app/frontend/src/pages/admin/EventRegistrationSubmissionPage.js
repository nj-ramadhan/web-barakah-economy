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
            const res = await blastEventWhatsapp(slug, blastMessage);
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
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Peserta</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identitas</th>
                                    {event?.form_fields?.map(field => (
                                        <th key={field.id} className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[150px]">{field.label}</th>
                                    ))}
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
                                    registrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-5 text-xs text-gray-500">
                                                {new Date(reg.created_at).toLocaleDateString('id-ID')}
                                                <br/>
                                                {new Date(reg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-5">
                                                <div className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-black inline-block">
                                                    {reg.user_details?.id || '-'}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                                                    {reg.guest_name || reg.user_details?.profile?.name_full || reg.user_details?.username || "Peserta"}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-medium">
                                                    {reg.guest_email || reg.user_details?.email}
                                                </div>
                                            </td>
                                            {event?.form_fields?.map(field => {
                                                const value = reg.responses[field.id];
                                                const file = reg.uploaded_files?.find(f => f.field === field.id);
                                                
                                                return (
                                                    <td key={field.id} className="p-5 text-sm text-gray-600">
                                                        {field.field_type === 'file' && file ? (
                                                            <a href={`${process.env.REACT_APP_API_BASE_URL}${file.file}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-700 font-bold hover:underline">
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
                                            <td className="p-5 text-right">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    reg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="mt-8 flex flex-wrap justify-center gap-4">
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

                    <button 
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-xl hover:bg-gray-800 transition"
                    >
                        <span className="material-icons text-sm">print</span>
                        CETAK LAPORAN
                    </button>
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
                                Pesan akan dikirim ke semua peserta yang statusnya <span className="text-green-600 font-bold">approved</span>.
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

            <NavigationButton />
        </div>
    );
};

export default EventRegistrationSubmissionPage;
