import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getEventDetail, registerForEvent, getEventParticipants } from '../services/eventApi';
import authService from '../services/auth';
import Footer from '../components/layout/Footer';
import '../styles/Body.css';

const EventDetailPage = () => {
    const { slug } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [responses, setResponses] = useState({});
    const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });
    const [files, setFiles] = useState({});
    const [activeTab, setActiveTab] = useState('about'); // 'about' or 'participants'
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);

    const API = process.env.REACT_APP_API_BASE_URL;

    const fetchDetail = useCallback(async () => {
        try {
            const res = await getEventDetail(slug);
            setEvent(res.data);
        } catch (err) {
            console.error(err);
            setError('Event tidak ditemukan.');
        } finally {
            setLoading(false);
        }
    }, [slug]);

    const fetchParticipants = useCallback(async () => {
        setLoadingParticipants(true);
        try {
            const res = await getEventParticipants(slug);
            setParticipants(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingParticipants(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    useEffect(() => {
        if (activeTab === 'participants') {
            fetchParticipants();
        }
    }, [activeTab, fetchParticipants]);

    const [hasAutoFilled, setHasAutoFilled] = useState(false);

    useEffect(() => {
        if (!showRegisterModal) {
            setHasAutoFilled(false);
            return;
        }

        const autoFillForm = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (showRegisterModal && user && event?.form_fields && !hasAutoFilled) {
                try {
                    const profile = await authService.getProfile(user.id);
                    setResponses(prev => {
                        const newResponses = { ...prev };
                        event.form_fields.forEach(field => {
                            const label = field.label.toLowerCase();
                            if ((label.includes('nama') || label.includes('lengkap')) && !newResponses[field.id]) {
                                newResponses[field.id] = profile.name_full || user.username;
                            } else if (label.includes('email') && !newResponses[field.id]) {
                                newResponses[field.id] = profile.email || user.email;
                            } else if ((label.includes('wa') || label.includes('phone') || label.includes('hp') || label.includes('telp') || label.includes('kontak')) && !newResponses[field.id]) {
                                newResponses[field.id] = profile.phone || '';
                            } else if ((label.includes('alamat') || label.includes('domisili')) && !newResponses[field.id]) {
                                newResponses[field.id] = profile.address || '';
                            }
                        });
                        return newResponses;
                    });
                    setHasAutoFilled(true);
                } catch (err) {
                    console.error("Failed to auto-fill profile:", err);
                }
            }
        };
        autoFillForm();
    }, [showRegisterModal, event, hasAutoFilled]);

    const handleResponseChange = (fieldId, value) => {
        setResponses(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleFileChange = (fieldId, file) => {
        setFiles(prev => ({ ...prev, [fieldId]: file }));
    };

    const handleCheckboxChange = (fieldId, option, checked) => {
        const currentOptions = responses[fieldId] || [];
        if (checked) {
            handleResponseChange(fieldId, [...currentOptions, option]);
        } else {
            handleResponseChange(fieldId, currentOptions.filter(o => o !== option));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const data = new FormData();
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user) {
            data.append('guest_name', guestInfo.name);
            data.append('guest_email', guestInfo.email);
        }
        
        data.append('responses', JSON.stringify(responses));
        Object.keys(files).forEach(fieldId => {
            if (files[fieldId]) data.append(fieldId, files[fieldId]);
        });

        try {
            await registerForEvent(slug, data);
            setSuccess(true);
            setShowRegisterModal(false);
            window.scrollTo(0, 0);
            if (activeTab === 'participants') fetchParticipants();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.errors 
                ? Object.values(err.response.data.errors).join(', ') 
                : 'Gagal mengirim pendaftaran. Mohon cek kembali data Anda.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="body flex items-center justify-center min-h-screen text-green-700">Loading detail event...</div>;

    if (error && !event) return (
        <div className="body min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-md mx-auto pt-20 text-center px-4">
                <span className="material-icons text-6xl text-gray-300 mb-4">event_busy</span>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Event Tidak Ditemukan</h1>
                <p className="text-gray-500 mb-6">{error}</p>
                <Link to="/event" className="bg-green-700 text-white px-6 py-3 rounded-2xl font-bold inline-block">Kembali ke Daftar Event</Link>
            </div>
            <NavigationButton />
        </div>
    );

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>{event.title} - Barakah Economy</title>
            </Helmet>
            <Header />

            {/* Header / Hero Section */}
            <div className="relative h-72 sm:h-[450px] w-full overflow-hidden">
                <img 
                    src={event.header_image || '/images/event-header-default.jpg'} 
                    alt={event.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/event-header-default.jpg'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 text-white">
                    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div className="max-w-3xl">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block shadow-lg shadow-green-900/40">Event</span>
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest inline-block">{event.status}</span>
                            </div>
                            <h1 className="text-2xl sm:text-5xl font-extrabold leading-tight drop-shadow-lg">{event.title}</h1>
                        </div>
                        <div className="shrink-0 pb-2">
                            <button 
                                onClick={() => setShowRegisterModal(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-green-900/30 transition active:scale-[0.97] flex items-center gap-3 w-full sm:w-auto justify-center"
                            >
                                <span className="material-icons text-xl">person_add</span>
                                Ikuti Event Ini
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-10 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Tabs Navigation */}
                        <div className="bg-white p-2 rounded-[2.5rem] shadow-xl border border-gray-100 flex gap-2">
                            <button 
                                onClick={() => setActiveTab('about')}
                                className={`flex-1 py-4 px-6 rounded-[2rem] text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'about' ? 'bg-gray-900 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-icons text-lg">description</span>
                                Tentang Event
                            </button>
                            <button 
                                onClick={() => setActiveTab('participants')}
                                className={`flex-1 py-4 px-6 rounded-[2rem] text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'participants' ? 'bg-gray-900 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-icons text-lg">group</span>
                                Daftar Peserta
                                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'participants' ? 'bg-white/20' : 'bg-gray-100'}`}>
                                    {event.registration_count || 0}
                                </span>
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'about' ? (
                            <div className="space-y-8 animate-fade-in">
                                {/* Info Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-3">
                                        <span className="material-icons text-green-600 bg-green-50 p-2 rounded-xl">calendar_today</span>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Tanggal</p>
                                            <p className="text-sm font-extrabold text-gray-800">{new Date(event.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-3">
                                        <span className="material-icons text-blue-600 bg-blue-50 p-2 rounded-xl">schedule</span>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Waktu</p>
                                            <p className="text-sm font-extrabold text-gray-800">{new Date(event.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-3">
                                        <span className="material-icons text-orange-600 bg-orange-50 p-2 rounded-xl">location_on</span>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Lokasi</p>
                                            <a href={event.location_url} target="_blank" rel="noreferrer" className="text-sm font-extrabold text-green-700 hover:underline line-clamp-1">{event.location}</a>
                                        </div>
                                    </div>
                                </div>

                                {/* Description Card */}
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[400px]">
                                    <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
                                        <span className="w-2 h-8 bg-green-600 rounded-full"></span>
                                        Deskripsi Event
                                    </h2>
                                    <div 
                                        className="prose prose-lg max-w-none text-gray-600 leading-relaxed" 
                                        dangerouslySetInnerHTML={{ __html: event.description || '' }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[500px]">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                                            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                                            Daftar Peserta
                                        </h2>
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider bg-gray-50 px-4 py-2 rounded-xl">{participants.length} Disetujui</p>
                                    </div>

                                    {loadingParticipants ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-gray-500 font-bold text-sm">Memuat daftar peserta...</p>
                                        </div>
                                    ) : participants.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <span className="material-icons text-8xl text-gray-100 mb-4">group_off</span>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Peserta</h3>
                                            <p className="text-gray-500 max-w-xs text-sm">Jadilah yang pertama mengikuti event seru ini!</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {participants.map((p) => (
                                                <div key={p.id} className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex items-center gap-4 hover:bg-white hover:shadow-lg transition group cursor-default">
                                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-gray-200">
                                                        {p.avatar ? (
                                                            <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-icons text-gray-300 text-3xl group-hover:text-blue-500 transition">person</span>
                                                        )}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-extrabold text-gray-900 truncate">{p.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                            {p.username ? `@${p.username}` : (p.email_masked || 'Guest Registrant')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (4 cols) - Sidebar Content */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Organizer Card */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Penyelenggara</h3>
                            <div className="flex items-center gap-5 border-b border-gray-100 pb-6 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-3xl flex items-center justify-center font-bold text-2xl text-white uppercase italic shadow-lg shadow-green-100">
                                    {event.organizer_name?.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-extrabold text-xl text-gray-900 leading-tight truncate">{event.organizer_name}</p>
                                    <p className="text-green-600 font-bold text-xs mt-1 decoration-dotted underline underline-offset-4">{event.organizer_contact}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-500">
                                    <span className="material-icons text-sm">verified</span>
                                    <span className="text-xs font-bold">Verified Organizer</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-500">
                                    <span className="material-icons text-sm">schedule</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">Posted {new Date(event.created_at).toLocaleDateString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats / FAQ / CTA Mini */}
                        <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-green-500/20 transition-all duration-700"></div>
                            <h3 className="text-lg font-bold mb-4 relative z-10">Ingin Mengikuti?</h3>
                            <p className="text-gray-400 text-xs leading-relaxed mb-6 relative z-10">Segera daftarkan diri Anda sebelum kuota penuh atau waktu pendaftaran berakhir.</p>
                            <button 
                                onClick={() => setShowRegisterModal(true)}
                                className="w-full bg-white text-gray-900 py-4 rounded-2xl text-xs font-extrabold uppercase tracking-widest hover:bg-green-50 transition shadow-xl relative z-10"
                            >
                                Daftar Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration Success Overlay */}
            {success && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/90 backdrop-blur-md animate-fade-in">
                    <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] shadow-2xl text-center border border-gray-100 animate-scale-up">
                        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <span className="material-icons text-5xl">check_circle</span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-gray-900 mb-4">Pendaftaran Berhasil!</h3>
                        <p className="text-gray-500 mb-10 leading-relaxed font-medium">Terima kasih telah mendaftar. Pendaftaran Anda sedang ditinjau oleh admin. Cek dashboard Anda secara berkala.</p>
                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={() => setSuccess(false)}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold shadow-xl hover:bg-gray-800 transition"
                            >
                                Tutup Pesan
                            </button>
                            <Link to="/event" className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-green-700 transition">Kembali ke Daftar Event</Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl relative my-auto animate-scale-up border border-gray-100">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-50 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">Formulir Pendaftaran</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">LENGKAPI DATA UNTUK {event.title}</p>
                            </div>
                            <button 
                                onClick={() => setShowRegisterModal(false)}
                                className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center hover:bg-gray-200 hover:text-gray-600 transition shadow-inner"
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
                            {error && (
                                <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                                    <span className="material-icons text-lg">error_outline</span>
                                    {error}
                                </div>
                            )}

                            {event.form_fields?.length > 0 ? (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Personal Info if Guest */}
                                    {!JSON.parse(localStorage.getItem('user')) && (
                                        <div className="p-6 bg-orange-50/50 rounded-3xl border border-orange-100 space-y-4 mb-8">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="material-icons text-orange-500 text-lg">info</span>
                                                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Informasi Dasar (Guest)</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-600 uppercase">Nama Lengkap *</label>
                                                <input 
                                                    required
                                                    type="text" 
                                                    value={guestInfo.name}
                                                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                                                    placeholder="Nama Anda"
                                                    className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition shadow-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-600 uppercase">Email *</label>
                                                <input 
                                                    required
                                                    type="email" 
                                                    value={guestInfo.email}
                                                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                                                    placeholder="email@example.com"
                                                    className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Dynamic Fields */}
                                    {event.form_fields.map((field) => (
                                        <div key={field.id} className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                <span className="text-[9px] font-bold text-gray-300 uppercase">{field.field_type}</span>
                                            </div>
                                            
                                            {field.field_type === 'text' && (
                                                <input 
                                                    required={field.required}
                                                    type="text" 
                                                    value={responses[field.id] || ''}
                                                    placeholder={field.placeholder}
                                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition shadow-inner"
                                                />
                                            )}

                                            {field.field_type === 'textarea' && (
                                                <textarea 
                                                    required={field.required}
                                                    value={responses[field.id] || ''}
                                                    placeholder={field.placeholder}
                                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                    rows="4"
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition shadow-inner resize-none"
                                                ></textarea>
                                            )}

                                            {field.field_type === 'number' && (
                                                <input 
                                                    required={field.required}
                                                    type="number" 
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition shadow-inner"
                                                />
                                            )}

                                            {field.field_type === 'email' && (
                                                <input 
                                                    required={field.required}
                                                    type="email" 
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition shadow-inner"
                                                />
                                            )}

                                            {field.field_type === 'phone' && (
                                                <input 
                                                    required={field.required}
                                                    type="tel" 
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition shadow-inner"
                                                />
                                            )}

                                            {field.field_type === 'date' && (
                                                <input 
                                                    required={field.required}
                                                    type="date" 
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                    className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition shadow-inner"
                                                />
                                            )}

                                            {(field.field_type === 'select' || field.field_type === 'radio') && (
                                                <div className="relative">
                                                    <select 
                                                        required={field.required}
                                                        value={responses[field.id] || ''}
                                                        onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition shadow-inner appearance-none pr-10"
                                                    >
                                                        <option value="">Pilih Opsi</option>
                                                        {(() => {
                                                            let opts = field.options || [];
                                                            if (typeof opts === 'string') {
                                                                try { opts = JSON.parse(opts); } catch (e) { opts = []; }
                                                            }
                                                            return Array.isArray(opts) ? opts.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            )) : null;
                                                        })()}
                                                    </select>
                                                    <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                                                </div>
                                            )}

                                            {field.field_type === 'checkbox' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                    {(field.options || []).map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition ${(responses[field.id] || []).includes(opt) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}>
                                                            <input 
                                                                type="checkbox" 
                                                                onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                                                                className="w-4 h-4 text-green-600 rounded"
                                                            />
                                                            <span className="text-xs font-bold truncate">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {field.field_type === 'file' && (
                                                <div className="flex items-center justify-center w-full">
                                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-100 border-dashed rounded-3xl cursor-pointer bg-gray-50 hover:bg-white hover:border-green-300 transition-all">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <span className="material-icons text-gray-400 mb-2">cloud_upload</span>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Click to upload file</p>
                                                            {files[field.id] && <p className="mt-1 text-xs text-green-600 font-bold max-w-[200px] truncate">{files[field.id].name}</p>}
                                                        </div>
                                                        <input 
                                                            required={field.required}
                                                            type="file" 
                                                            onChange={(e) => handleFileChange(field.id, e.target.files[0])}
                                                            className="hidden" 
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="pt-4">
                                        <button 
                                            type="submit"
                                            disabled={submitting}
                                            className={`w-full py-5 bg-green-600 text-white rounded-[2rem] text-sm font-extrabold uppercase tracking-widest shadow-2xl shadow-green-100 transition active:scale-[0.98] ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                        >
                                            {submitting ? 'SEDANG MENGIRIM...' : 'KIRIM PENDAFTARAN'}
                                        </button>
                                        <p className="text-center text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-[0.2em]">Pendaftaran akan ditinjau oleh tim BAE</p>
                                    </div>
                                </form>
                            ) : (
                                <div className="text-center py-10">
                                    <span className="material-icons text-6xl text-gray-200 mb-4">settings_suggest</span>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Formulir Belum Siap</h3>
                                    <p className="text-sm text-gray-500">Penyelenggara belum menyiapkan formulir pendaftaran digital. Silakan hubungi kontak penyelenggara.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default EventDetailPage;
