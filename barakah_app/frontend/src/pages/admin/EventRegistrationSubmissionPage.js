import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getEventRegistrations, approveRegistration, rejectRegistration, getEventDetail } from '../../services/eventApi';
import '../../styles/Body.css';

const EventRegistrationSubmissionPage = () => {
    const { slug } = useParams();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

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

    const handleAction = async (id, action) => {
        try {
            if (action === 'approve') await approveRegistration(id);
            else if (action === 'reject') await rejectRegistration(id);
            
            // Toggle local state
            setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
        } catch (err) {
            alert('Gagal memperbarui status pendaftaran.');
        }
    };

    const filteredRegistrations = registrations.filter(r => filterStatus === 'all' || r.status === filterStatus);

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
                        <Link to="/dashboard/event" className="text-xs font-bold text-green-700 flex items-center gap-1 mb-2 hover:underline">
                            <span className="material-icons text-sm">arrow_back</span> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Data Pendaftar Event</h1>
                        <p className="text-sm text-gray-500 font-medium italic">{event?.title}</p>
                    </div>
                    
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 h-fit">
                        {['all', 'pending', 'approved', 'rejected'].map(s => (
                            <button 
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition ${filterStatus === s ? 'bg-green-700 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identitas</th>
                                    {event?.form_fields?.map(field => (
                                        <th key={field.id} className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[150px]">{field.label}</th>
                                    ))}
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRegistrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + (event?.form_fields?.length || 0)} className="p-12 text-center text-gray-400 italic text-sm">
                                            Belum ada data pendaftar yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegistrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-5 text-xs text-gray-500">
                                                {new Date(reg.created_at).toLocaleDateString('id-ID')}
                                                <br/>
                                                {new Date(reg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-5">
                                                <div className="font-bold text-gray-900 text-sm whitespace-nowrap">
                                                    {reg.guest_name || reg.user_details?.username}
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
                                            <td className="p-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    reg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right whitespace-nowrap">
                                                {reg.status === 'pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleAction(reg.id, 'approve')}
                                                            title="Setujui"
                                                            className="w-8 h-8 rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition flex items-center justify-center shadow-sm"
                                                        >
                                                            <span className="material-icons text-sm">check</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(reg.id, 'reject')}
                                                            title="Tolak"
                                                            className="w-8 h-8 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition flex items-center justify-center shadow-sm"
                                                        >
                                                            <span className="material-icons text-sm">close</span>
                                                        </button>
                                                    </div>
                                                )}
                                                {reg.status !== 'pending' && (
                                                    <span className="text-[10px] font-bold text-gray-300 italic uppercase">Sudah Diproses</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="mt-8 flex justify-center">
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-xl hover:bg-gray-800 transition"
                    >
                        <span className="material-icons text-sm">print</span>
                        CETAK LAPORAN PENDAFTAR
                    </button>
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default EventRegistrationSubmissionPage;
