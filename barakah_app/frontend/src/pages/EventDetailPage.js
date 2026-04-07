import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getEventDetail, registerForEvent } from '../services/eventApi';
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

    const API = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await getEventDetail(slug);
                setEvent(res.data);
            } catch (err) {
                console.error(err);
                setError('Event tidak ditemukan.');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [slug]);

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
            window.scrollTo(0, 0);
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

            {/* Header Image */}
            <div className="relative h-64 sm:h-96 w-full overflow-hidden">
                <img 
                    src={event.header_image || '/images/event-header-default.jpg'} 
                    alt={event.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/images/event-header-default.jpg'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 text-white">
                    <div className="max-w-4xl mx-auto">
                        <span className="px-3 py-1 bg-green-600 rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block">Event</span>
                        <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">{event.title}</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Event Info Card */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="flex items-start gap-3">
                                <span className="material-icons text-green-600 bg-green-50 p-2 rounded-xl">calendar_today</span>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Tanggal</p>
                                    <p className="text-sm font-bold text-gray-800">{new Date(event.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-icons text-green-600 bg-green-50 p-2 rounded-xl">schedule</span>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Waktu</p>
                                    <p className="text-sm font-bold text-gray-800">{new Date(event.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="material-icons text-green-600 bg-green-50 p-2 rounded-xl">location_on</span>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Lokasi</p>
                                    <a href={event.location_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-green-700 hover:underline">{event.location}</a>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
                                Tentang Event
                            </h2>
                            <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: event.description }}></div>
                        </div>

                        {/* Organizer */}
                        <div className="p-6 bg-green-700 rounded-3xl text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-lg"></div>
                            <h3 className="text-lg font-bold mb-4">Penyelenggara</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-bold text-xl uppercase italic">
                                    {event.organizer_name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold">{event.organizer_name}</p>
                                    <p className="text-green-100 text-xs">{event.organizer_contact}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Registration Section */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            {success ? (
                                <div className="bg-white p-8 rounded-3xl shadow-xl text-center border-2 border-green-500 animate-scale-up">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-icons text-3xl">check_circle</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Pendaftaran Berhasil</h3>
                                    <p className="text-xs text-gray-500 mb-6">Terima kasih telah mendaftar. Admin kami akan segera meninjau partisipasi Anda.</p>
                                    <Link to="/event" className="block w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold">Kembali ke Daftar</Link>
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                                    <div className="bg-gray-900 p-6 text-white">
                                        <h3 className="text-lg font-bold">Daftar Sekarang</h3>
                                        <p className="text-gray-400 text-[10px] mt-1 font-medium tracking-wider">LENGKAPI DATA PENDAFTARAN</p>
                                    </div>

                                    {event.form_fields?.length > 0 ? (
                                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                            {error && (
                                                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[11px] font-bold border border-red-100">
                                                    {error}
                                                </div>
                                            )}

                                            {!JSON.parse(localStorage.getItem('user')) && (
                                                <div className="space-y-4 pb-4 border-b border-gray-100">
                                                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Guest Info (Anda tidak login)</p>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400">NAMA LENGKAP *</label>
                                                        <input 
                                                            required
                                                            type="text" 
                                                            value={guestInfo.name}
                                                            onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                                                            placeholder="Nama Anda"
                                                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-400">EMAIL *</label>
                                                        <input 
                                                            required
                                                            type="email" 
                                                            value={guestInfo.email}
                                                            onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                                                            placeholder="email@example.com"
                                                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {event.form_fields.map((field) => (
                                                <div key={field.id} className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                                    </label>
                                                    
                                                    {field.field_type === 'text' && (
                                                        <input 
                                                            required={field.required}
                                                            type="text" 
                                                            placeholder={field.placeholder}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                                                        />
                                                    )}

                                                    {field.field_type === 'textarea' && (
                                                        <textarea 
                                                            required={field.required}
                                                            placeholder={field.placeholder}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            rows="3"
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                                                        ></textarea>
                                                    )}

                                                    {field.field_type === 'number' && (
                                                        <input 
                                                            required={field.required}
                                                            type="number" 
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                                                        />
                                                    )}

                                                    {field.field_type === 'email' && (
                                                        <input 
                                                            required={field.required}
                                                            type="email" 
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                                                        />
                                                    )}

                                                    {field.field_type === 'phone' && (
                                                        <input 
                                                            required={field.required}
                                                            type="tel" 
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                                                        />
                                                    )}

                                                    {field.field_type === 'date' && (
                                                        <input 
                                                            required={field.required}
                                                            type="date" 
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition"
                                                        />
                                                    )}

                                                    {(field.field_type === 'select' || field.field_type === 'radio') && (
                                                        <select 
                                                            required={field.required}
                                                            onChange={(e) => handleResponseChange(field.id, e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 transition appearance-none"
                                                        >
                                                            <option value="">Pilih Opsi</option>
                                                            {(field.options || []).map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    {field.field_type === 'checkbox' && (
                                                        <div className="space-y-2 mt-2">
                                                            {(field.options || []).map(opt => (
                                                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                                                                        className="w-4 h-4 text-green-600 rounded"
                                                                    />
                                                                    <span className="text-[11px] text-gray-600 font-medium">{opt}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {field.field_type === 'file' && (
                                                        <input 
                                                            required={field.required}
                                                            type="file" 
                                                            onChange={(e) => handleFileChange(field.id, e.target.files[0])}
                                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-[10px] file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-gray-200 file:text-gray-700"
                                                        />
                                                    )}
                                                </div>
                                            ))}

                                            <button 
                                                disabled={submitting}
                                                className={`w-full py-4 bg-green-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-green-100 transition active:scale-[0.98] ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                            >
                                                {submitting ? 'SEDANG MENGIRIM...' : 'KIRIM PENDAFTARAN'}
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="p-8 text-center bg-gray-50">
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                Event ini tidak memerlukan formulir pendaftaran melalui sistem BAE. 
                                                Silakan hubungi penyelenggara untuk info lebih lanjut.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
            <NavigationButton />
        </div>
    );
};

export default EventDetailPage;
