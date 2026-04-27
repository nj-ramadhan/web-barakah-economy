import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getEventDetail, registerForEvent, getEventParticipants, downloadCertificate } from '../services/eventApi';
import authService from '../services/auth';
import Footer from '../components/layout/Footer';
import CurrencyInput from '../components/common/CurrencyInput';
import { formatCurrency } from '../utils/formatters';
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
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentProof, setPaymentProof] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [activeTab, setActiveTab] = useState('about');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [registeredCode, setRegisteredCode] = useState(null); // kode unik QR setelah daftar

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
                            } else if ((label.includes('instansi') || label.includes('organisasi') || label.includes('kampus') || label.includes('sekolah') || label.includes('kantor')) && !newResponses[field.id]) {
                                newResponses[field.id] = profile.work_institution || profile.study_campus || '';
                            } else if ((label.includes('kelamin') || label.includes('gender') || label.includes('sex')) && !newResponses[field.id]) {
                                if (profile.gender === 'l') newResponses[field.id] = 'Laki-laki';
                                else if (profile.gender === 'p') newResponses[field.id] = 'Perempuan';
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

        if (paymentProof) {
            const fixed = Number(event?.price_fixed) || 0;
            const extra = Number(paymentAmount) || 0;
            let totalToSave = 0;

            if (event?.price_type === 'fixed') totalToSave = fixed;
            else if (event?.price_type === 'hybrid_1') totalToSave = fixed + extra;
            else totalToSave = extra;

            data.append('payment_proof', paymentProof);
            data.append('payment_amount', totalToSave);
        }

        try {
            const res = await registerForEvent(slug, data);
            // Simpan kode unik dari response
            if (res.data?.unique_code) {
                setRegisteredCode(res.data.unique_code);
            }
            setSuccess(true);
            setShowRegisterModal(false);
            window.scrollTo(0, 0);
            fetchDetail(); // Refresh data kecil
            if (activeTab === 'participants') fetchParticipants();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.errors
                ? Object.values(err.response.data.errors).join(', ')
                : (err.response?.data?.error || 'Gagal mengirim pendaftaran. Mohon cek kembali data Anda.');
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const getAbsoluteUrl = (url) => {
        if (!url) return window.location.origin + '/logo192.png';
        if (url.startsWith('http')) return url;
        // Handle relative paths from backend
        return window.location.origin + (url.startsWith('/') ? url : '/' + url);
    };

    const handleShare = async () => {
        const shareTitle = event?.title || 'Event Barakah Economy';
        const rawDescription = event?.description || '';
        const shareText = rawDescription.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
        const shareUrl = window.location.href;

        if (navigator.share) {
            try {
                setIsSharing(true);
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl,
                });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err);
                }
            } finally {
                setIsSharing(false);
            }
        } else {
            // Fallback: WhatsApp share link
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle}\n\n${shareText}\n\nCek selengkapnya di: ${shareUrl}`)}`;
            window.open(waUrl, '_blank');
        }
    };

    const handleDownloadCertificate = async () => {
        try {
            const res = await downloadCertificate(slug);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Sertifikat_${event.title}.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            // Handle error response blob
            if (err.response?.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = () => {
                    const errorMsg = JSON.parse(reader.result).error;
                    alert(errorMsg || 'Gagal mengunduh sertifikat.');
                };
                reader.readAsText(err.response.data);
            } else {
                alert(err.response?.data?.error || 'Gagal mengunduh sertifikat. Pastikan Anda telah terdaftar dan hadir di event ini.');
            }
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
    const isCompleted = event?.end_date ? new Date() > new Date(event.end_date) : false;

    return (
        <div className="body bg-gray-50 min-h-screen overflow-x-hidden">
            <Helmet>
                <title>{event.title} - Barakah Economy</title>
                <meta name="description" content={event.description?.replace(/<[^>]*>/g, '').substring(0, 160)} />

                {/* Open Graph / Facebook / WhatsApp */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={window.location.href} />
                <meta property="og:title" content={event.title} />
                <meta property="og:description" content={event.description?.replace(/<[^>]*>/g, '').substring(0, 160)} />
                <meta property="og:image" content={getAbsoluteUrl(event.thumbnail || event.header_image)} />
                <meta property="og:image:alt" content={event.title} />
                <meta property="og:site_name" content="Barakah Economy" />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={window.location.href} />
                <meta property="twitter:title" content={event.title} />
                <meta property="twitter:description" content={event.description?.replace(/<[^>]*>/g, '').substring(0, 160)} />
                <meta property="twitter:image" content={getAbsoluteUrl(event.thumbnail || event.header_image)} />

                {/* JSON-LD Structured Data for Rich Snippets */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Event",
                        "name": event.title,
                        "description": event.description?.replace(/<[^>]*>/g, '').substring(0, 400),
                        "image": [
                            getAbsoluteUrl(event.thumbnail || event.header_image)
                        ],
                        "startDate": event.date,
                        "endDate": event.end_date || event.date,
                        "eventStatus": "https://schema.org/EventScheduled",
                        "eventAttendanceMode": event.location_type === 'online' ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
                        "location": event.location_type === 'online' ? {
                            "@type": "VirtualLocation",
                            "url": window.location.href
                        } : {
                            "@type": "Place",
                            "name": event.location,
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": event.location,
                                "addressLocality": "Indonesia",
                                "addressCountry": "ID"
                            }
                        },
                        "offers": {
                            "@type": "Offer",
                            "url": window.location.href,
                            "price": event.price || "0",
                            "priceCurrency": "IDR",
                            "availability": "https://schema.org/InStock"
                        },
                        "organizer": {
                            "@type": "Organization",
                            "name": "Barakah Economy",
                            "url": window.location.origin
                        }
                    })}
                </script>
            </Helmet>
            <Header />

            {/* Back Navigation Bar */}
            <div className="max-w-6xl mx-auto px-4 pt-6 flex items-center justify-between relative z-20">
                <Link to="/event" className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition font-bold text-xs uppercase tracking-widest group bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <span className="material-icons text-xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Kembali
                </Link>
            </div>
            <div className="relative w-full max-w-6xl mx-auto sm:px-4">
                {/* Image Container */}
                <div className="relative h-auto sm:h-[500px] w-full overflow-hidden bg-gray-100 flex items-center justify-center sm:rounded-[3rem] shadow-2xl border border-gray-100">
                    <img
                        src={event.header_image || event.thumbnail || '/images/event-header-default.jpg'}
                        alt={event.title}
                        className="w-full h-auto sm:h-full sm:object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/event-header-default.jpg'; }}
                    />
                    {/* Desktop Overlay Gradient */}
                    <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                    {/* Desktop Info Overlay */}
                    <div className="hidden sm:block absolute bottom-0 left-0 w-full p-12 text-white">
                        <div className="flex sm:items-end justify-between gap-6">
                            <div className="max-w-3xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="px-3 py-1 bg-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block shadow-lg shadow-green-900/40">
                                        {event.category || 'Event'}
                                    </span>
                                    {event.has_certificate && (
                                        <span className="px-3 py-1 bg-amber-500 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block shadow-lg shadow-amber-900/40 flex items-center gap-1">
                                            <span className="material-icons text-[12px]">verified</span>
                                            Sertifikat
                                        </span>
                                    )}
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest inline-block">{event.status}</span>
                                    <span className="flex items-center gap-1 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest inline-block ml-2">
                                        <span className="material-icons text-[12px]">visibility</span>
                                        {event.view_count || 0} Kali Dilihat
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-5xl font-extrabold leading-tight drop-shadow-lg">{event.title}</h1>
                                {event.capacity > 0 && !event.user_registration && !isCompleted && (event.capacity - (event.registration_count || 0) > 0) && (
                                    <p className="text-green-400 font-bold mt-2 text-sm sm:text-base animate-pulse">
                                        🚀 Tersisa {event.capacity - (event.registration_count || 0)} Slot Lagi
                                    </p>
                                )}
                            </div>
                            <div className="shrink-0 pb-2 flex items-center gap-3">
                                {event.user_registration ? (
                                    <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider flex items-center gap-3 justify-center cursor-default shadow-lg">
                                        <span className="material-icons text-xl text-green-400">check_circle</span>
                                        Sudah Daftar
                                    </div>
                                ) : isCompleted ? (
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 text-gray-300 px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider flex items-center gap-3 justify-center cursor-not-allowed shadow-lg">
                                        <span className="material-icons text-xl">event_busy</span>
                                        Event Selesai
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowRegisterModal(true)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-green-900/30 transition active:scale-[0.97] flex items-center gap-3 justify-center"
                                    >
                                        <span className="material-icons text-xl">person_add</span>
                                        Ikuti Event Ini
                                    </button>
                                )}

                                <button
                                    onClick={handleShare}
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider transition active:scale-[0.97] flex items-center gap-3 justify-center group"
                                    title="Bagikan Event"
                                >
                                    <span className={`material-icons text-xl transition-transform group-hover:rotate-12 ${isSharing ? 'animate-pulse' : ''}`}>share</span>
                                    {isSharing ? 'Berbagi...' : 'Bagikan'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* View Full Image Button - Visible on Desktop */}
                    <button
                        onClick={() => window.open(event.header_image_full || event.header_image || event.thumbnail_full || event.thumbnail || '/images/event-header-default.jpg', '_blank')}
                        className="hidden sm:flex absolute top-10 right-10 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-2xl border border-white/20 items-center gap-3 text-xs font-bold transition-all shadow-2xl group"
                    >
                        <span className="material-icons text-lg group-hover:scale-110 transition-transform">zoom_out_map</span>
                        Lihat Gambar Full
                    </button>
                </div>

                {/* Mobile Info & Actions */}
                <div className="sm:hidden p-6 bg-white border-b border-gray-100 shadow-sm relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-green-600 rounded-full text-[8px] font-bold uppercase tracking-widest text-white">
                            {event.category || 'Event'}
                        </span>
                        {event.has_certificate && (
                            <span className="px-3 py-1 bg-amber-500 rounded-full text-[8px] font-bold uppercase tracking-widest text-white flex items-center gap-1">
                                <span className="material-icons text-[10px]">verified</span>
                                Sertifikat
                            </span>
                        )}
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-[8px] font-bold uppercase tracking-widest text-gray-500">{event.status}</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mb-6">{event.title}</h1>

                    <div className="flex flex-col gap-3">
                        {event.user_registration ? (
                            <div className="w-full bg-green-50 text-green-700 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 justify-center border border-green-100">
                                <span className="material-icons text-lg">check_circle</span>
                                Sudah Terdaftar
                            </div>
                        ) : isCompleted ? (
                            <div className="w-full bg-gray-50 text-gray-400 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 justify-center border border-gray-100">
                                <span className="material-icons text-lg">event_busy</span>
                                Event Telah Selesai
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowRegisterModal(true)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-green-900/30 transition active:scale-[0.97] flex flex-col items-center justify-center gap-1"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-icons text-xl">person_add</span>
                                    Ikuti Event Ini
                                </div>
                                {event.capacity > 0 && (
                                    <span className="text-[10px] opacity-80 normal-case font-bold tracking-normal italic">
                                        Tersisa {event.capacity - (event.registration_count || 0)} Slot Lagi
                                    </span>
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleShare}
                            className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest border border-gray-200 flex items-center gap-3 justify-center active:scale-[0.98] transition"
                        >
                            <span className="material-icons text-lg">share</span>
                            Bagikan Event
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-10 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column (8 cols) */}
                    <div className="lg:col-span-8 space-y-8 min-w-0">
                        {/* Tabs Navigation */}
                        <div className="bg-white p-1 sm:p-2 rounded-2xl sm:rounded-[2.5rem] shadow-xl border border-gray-100 flex gap-1 sm:gap-2">
                            <button
                                onClick={() => setActiveTab('about')}
                                className={`flex-1 py-3 sm:py-4 px-1 sm:px-6 rounded-xl sm:rounded-[2rem] text-[10px] sm:text-sm font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeTab === 'about' ? 'bg-gray-900 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-icons text-sm sm:text-lg">description</span>
                                <span className="text-center">Tentang</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('participants')}
                                className={`flex-1 py-3 sm:py-4 px-1 sm:px-6 rounded-xl sm:rounded-[2rem] text-[10px] sm:text-sm font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeTab === 'participants' ? 'bg-gray-900 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-icons text-sm sm:text-lg">group</span>
                                <span className="text-center">Peserta</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] ${activeTab === 'participants' ? 'bg-white/20' : 'bg-gray-100'}`}>
                                    {event.registration_count || 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('documentation')}
                                className={`flex-1 py-3 sm:py-4 px-1 sm:px-6 rounded-xl sm:rounded-[2rem] text-[10px] sm:text-sm font-bold transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${activeTab === 'documentation' ? 'bg-gray-900 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-icons text-sm sm:text-lg">collections</span>
                                <span className="text-center">Dokumen</span>
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
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Lokasi *klik untuk buka link</p>
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

                                {/* Attachment Section */}
                                {(event.attachment_file || event.attachment_link) && (
                                    <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 flex flex-col gap-6">
                                        <div>
                                            <h3 className="text-xl font-extrabold text-blue-900 flex items-center gap-2">
                                                <span className="material-icons text-blue-600">attachment</span>
                                                Berkas & Informasi Pendukung
                                            </h3>
                                            <p className="text-blue-700/60 text-xs font-bold mt-1 uppercase tracking-wider ml-8">Unduh berkas di bawah ini untuk informasi lebih lanjut</p>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-4">
                                            {event.attachment_file && (
                                                <a 
                                                    href={event.attachment_file} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-3 px-6 py-4 bg-white text-blue-700 rounded-3xl border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 transition group"
                                                >
                                                    <span className="material-icons text-blue-600 bg-blue-50 p-2 rounded-xl group-hover:bg-blue-100 transition">download</span>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Unduh Berkas</p>
                                                        <p className="font-extrabold text-xs uppercase">{event.attachment_file_title || 'LIHAT/AMBIL LAMPIRAN'}</p>
                                                    </div>
                                                </a>
                                            )}
                                            {event.attachment_link && (
                                                <a 
                                                    href={event.attachment_link} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-3 px-6 py-4 bg-white text-blue-700 rounded-3xl border border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300 transition group"
                                                >
                                                    <span className="material-icons text-blue-600 bg-blue-50 p-2 rounded-xl group-hover:bg-blue-100 transition">open_in_new</span>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Tautan Eksternal</p>
                                                        <p className="font-extrabold text-xs uppercase">{event.attachment_link_title || 'BUKA LINK PENDUKUNG'}</p>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Speakers Section */}
                                {event.speakers && event.speakers.length > 0 && (
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                        <h2 className="text-2xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
                                            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                                            Narasumber
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {event.speakers.map(spk => (
                                                <div key={spk.id} className="flex items-center gap-4 bg-gray-50 border border-gray-100 p-4 rounded-3xl group hover:border-blue-200 transition">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-lg shrink-0 aspect-square overflow-hidden">{spk.name.charAt(0)}</div>
                                                    <div>
                                                        <p className="font-extrabold text-gray-900 text-base">{spk.name}</p>
                                                        {spk.role && <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-1">{spk.role}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sessions Section */}
                                {event.sessions && event.sessions.length > 0 && (
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                        <h2 className="text-2xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
                                            <span className="w-2 h-8 bg-purple-600 rounded-full"></span>
                                            Rangkaian Acara
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {event.sessions.map((ses, idx) => (
                                                <div key={idx} className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group hover:border-purple-200 transition">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center shrink-0 shadow-inner">{idx+1}</div>
                                                        <p className="font-bold text-base text-gray-800 break-words">{ses.title}</p>
                                                    </div>
                                                    <div className="text-xs font-bold text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-100 shrink-0 text-center sm:text-right">
                                                        <span className="material-icons text-xs align-middle mr-1 text-purple-500">schedule</span>
                                                        {ses.start_time ? new Date(ses.start_time).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''} 
                                                        {ses.end_time ? ` - ${new Date(ses.end_time).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB` : ' WIB'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Terms Section */}
                                {(event.terms_do || event.terms_dont) && (
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                        <h2 className="text-2xl font-extrabold text-gray-900 mb-8 flex items-center gap-3">
                                            <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
                                            Syarat & Ketentuan
                                        </h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {event.terms_do && (
                                                <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 h-full">
                                                    <h3 className="font-extrabold text-green-800 text-sm flex items-center gap-2 mb-4 uppercase tracking-wider"><span className="material-icons text-green-600 bg-green-100 rounded-full p-1">check</span>Yang Boleh/Wajib</h3>
                                                    <ul className="space-y-3">
                                                        {event.terms_do.split('\n').filter(t => t.trim()).map((t, idx) => (
                                                            <li key={idx} className="text-sm text-green-900 flex items-start gap-3 bg-white p-3 rounded-2xl border border-green-50 shadow-sm leading-relaxed">
                                                                <span className="w-2 h-2 bg-green-500 rounded-full mt-1.5 shrink-0"></span>
                                                                {t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {event.terms_dont && (
                                                <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 h-full">
                                                    <h3 className="font-extrabold text-red-800 text-sm flex items-center gap-2 mb-4 uppercase tracking-wider"><span className="material-icons text-red-600 bg-red-100 rounded-full p-1">close</span>Yang Dilarang</h3>
                                                    <ul className="space-y-3">
                                                        {event.terms_dont.split('\n').filter(t => t.trim()).map((t, idx) => (
                                                            <li key={idx} className="text-sm text-red-900 flex items-start gap-3 bg-white p-3 rounded-2xl border border-red-50 shadow-sm leading-relaxed">
                                                                <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0"></span>
                                                                {t}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'participants' ? (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[500px]">
                                    <div className="flex items-center justify-between mb-8">
                                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                                            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                                            Daftar Peserta
                                        </h2>
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider bg-gray-50 px-4 py-2 rounded-xl">{participants.length} Peserta Terdaftar</p>
                                    </div>

                                    {loadingParticipants ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-gray-500 font-bold text-sm">Memuat daftar peserta...</p>
                                        </div>
                                    ) : (!participants || (Array.isArray(participants) && participants.length === 0)) ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <span className="material-icons text-8xl text-gray-100 mb-4">group_off</span>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Peserta</h3>
                                            <p className="text-gray-500 max-w-xs text-sm">Jadilah yang pertama mengikuti event seru ini!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-12">
                                            {(() => {
                                                const getTeamColor = (teamName) => {
                                                    if (!teamName) return { bg: 'bg-white', border: 'border-gray-100', text: 'text-gray-700', bullet: 'bg-blue-500', headerBg: 'bg-gray-100', headerText: 'text-gray-600' };
                                                    
                                                    const colors = [
                                                        { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', bullet: 'bg-blue-600', headerBg: 'bg-blue-600', headerText: 'text-white' },
                                                        { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', bullet: 'bg-emerald-600', headerBg: 'bg-emerald-600', headerText: 'text-white' },
                                                        { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', bullet: 'bg-purple-600', headerBg: 'bg-purple-600', headerText: 'text-white' },
                                                        { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', bullet: 'bg-amber-600', headerBg: 'bg-amber-600', headerText: 'text-white' },
                                                        { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', bullet: 'bg-rose-600', headerBg: 'bg-rose-600', headerText: 'text-white' },
                                                        { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', bullet: 'bg-indigo-600', headerBg: 'bg-indigo-600', headerText: 'text-white' },
                                                        { bg: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-700', bullet: 'bg-cyan-600', headerBg: 'bg-cyan-600', headerText: 'text-white' },
                                                        { bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-700', bullet: 'bg-teal-600', headerBg: 'bg-teal-600', headerText: 'text-white' },
                                                    ];
                                                    
                                                    let hash = 0;
                                                    for (let i = 0; i < teamName.length; i++) {
                                                        hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
                                                    }
                                                    const index = Math.abs(hash) % colors.length;
                                                    return colors[index];
                                                };

                                                // Group participants by team
                                                const grouped = (participants || []).reduce((acc, p) => {
                                                    const teamName = p.team || 'Individu';
                                                    if (!acc[teamName]) acc[teamName] = [];
                                                    acc[teamName].push(p);
                                                    return acc;
                                                }, {});

                                                // Sort teams (Individu first, then alphabetically)
                                                const teamNames = Object.keys(grouped).sort((a, b) => {
                                                    if (a === 'Individu') return -1;
                                                    if (b === 'Individu') return 1;
                                                    return a.localeCompare(b);
                                                });

                                                return teamNames.map(teamName => {
                                                    const color = getTeamColor(teamName === 'Individu' ? null : teamName);
                                                    const members = grouped[teamName];
                                                    
                                                    return (
                                                        <div key={teamName} className="animate-fade-in">
                                                            {/* Team Header */}
                                                            <div className="flex items-center gap-4 mb-6">
                                                                <div className={`px-4 py-1.5 rounded-full ${color.headerBg} ${color.headerText} text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-sm flex items-center gap-2`}>
                                                                    <span className="material-icons text-sm sm:text-base">
                                                                        {teamName === 'Individu' ? 'person' : 'groups'}
                                                                    </span>
                                                                    {teamName === 'Individu' ? 'Peserta Individu' : `TIM: ${teamName}`}
                                                                    <span className="opacity-50 ml-1">({members.length})</span>
                                                                </div>
                                                                <div className="flex-1 h-[1px] bg-gray-100"></div>
                                                            </div>

                                                            {/* Members Grid */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {members.map((p) => (
                                                                    <div key={p.id} className={`${color.bg} px-5 py-4 rounded-2xl border ${color.border} flex items-center gap-4 hover:shadow-lg transition-all duration-300 group relative overflow-hidden`}>
                                                                        {/* Subtle Accent Line */}
                                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${color.bullet} opacity-20`}></div>
                                                                        
                                                                        <div className={`w-8 h-8 rounded-xl ${color.bullet} text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0`}>
                                                                            {p.name?.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className={`font-extrabold ${color.text} truncate text-sm sm:text-base`}>
                                                                                {p.name || 'Peserta'}
                                                                            </p>
                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                                                                                Terdaftar
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[500px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                                            <span className="w-2 h-8 bg-purple-600 rounded-full"></span>
                                            Dokumentasi Event
                                        </h2>

                                        {/* Link Download - Private */}
                                        <div className="flex flex-wrap gap-3 shrink-0">
                                            {event.certificate && event.certificate.is_active && (
                                                <>
                                                    {event.user_registration && event.user_registration.status === 'approved' ? (
                                                        <button
                                                            onClick={handleDownloadCertificate}
                                                            className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100"
                                                        >
                                                            <span className="material-icons text-sm">workspace_premium</span>
                                                            Download Sertifikat
                                                        </button>
                                                    ) : (
                                                        <div className="bg-gray-50 text-gray-400 px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 italic border border-gray-100">
                                                            <span className="material-icons text-sm">lock</span>
                                                            Sertifikat tersedia bagi peserta
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {event.documentation_link && (
                                                <>
                                                    {event.user_registration && event.user_registration.status === 'approved' ? (
                                                        <a
                                                            href={event.documentation_link}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="bg-purple-100 text-purple-700 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-200 transition"
                                                        >
                                                            <span className="material-icons text-sm">download</span>
                                                            Download Materi
                                                        </a>
                                                    ) : (
                                                        <div className="bg-gray-50 text-gray-400 px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center gap-2 italic">
                                                            <span className="material-icons text-sm">lock</span>
                                                            Materi tersedia bagi peserta
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Photo Grid 3x3 */}
                                    {!event.documentation_images || event.documentation_images.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <span className="material-icons text-8xl text-gray-100 mb-4">photo_library</span>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Dokumentasi Belum Tersedia</h3>
                                            <p className="text-gray-500 max-w-xs text-sm">Foto kegiatan akan segera diunggah oleh panitia setelah event selesai.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {event.documentation_images.map((img) => (
                                                <div
                                                    key={img.id}
                                                    onClick={() => setSelectedImage(img.image)}
                                                    className="aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition relative group"
                                                >
                                                    <img
                                                        src={img.image}
                                                        alt="Documentation"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <span className="material-icons text-white">zoom_in</span>
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
                            <div className="flex items-start gap-5 border-b border-gray-100 pb-6 mb-6">
                                <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-green-600 to-green-800 rounded-3xl flex items-center justify-center font-bold text-2xl text-white uppercase italic shadow-lg shadow-green-100">
                                    {event.organizer_name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-extrabold text-xl text-gray-900 leading-tight break-words">{event.organizer_name}</p>
                                    <p className="text-green-600 font-bold text-xs mt-1 decoration-dotted underline underline-offset-4 break-words">{event.organizer_contact}</p>
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

                        {/* Capacity Card */}
                        {event.capacity > 0 && (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Kapasitas Maksimal</h3>
                                    <p className="text-2xl font-extrabold text-gray-900">{event.capacity} <span className="text-sm font-bold text-gray-500">Kuota</span></p>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <span className="material-icons text-2xl">event_seat</span>
                                </div>
                            </div>
                        )}

                        {/* Quick Stats / FAQ / CTA Mini */}
                        <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-green-500/20 transition-all duration-700"></div>
                            <h3 className="text-lg font-bold mb-4 relative z-10">Ingin Mengikuti?</h3>
                            <p className="text-gray-400 text-xs leading-relaxed mb-6 relative z-10">Segera daftarkan diri Anda sebelum kuota penuh atau waktu pendaftaran berakhir.</p>
                            {event.user_registration ? (
                                <div className="w-full bg-white/10 text-white py-4 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em] relative z-10 border border-white/20 text-center">
                                    SUDAH DAFTAR
                                </div>
                            ) : isCompleted ? (
                                <div className="w-full bg-white/5 text-gray-500 py-4 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em] relative z-10 border border-white/10 text-center">
                                    EVENT SELESAI
                                </div>
                            ) : (event.capacity > 0 && (event.registration_count || 0) >= event.capacity) ? (
                                <div className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em] relative z-10 border border-red-500/20 text-center">
                                    KUOTA PENUH
                                </div>
                            ) : (
                            <button
                                onClick={() => setShowRegisterModal(true)}
                                className="w-full bg-white text-gray-900 py-4 rounded-2xl text-xs font-extrabold uppercase tracking-widest hover:bg-green-50 transition shadow-xl relative z-10 flex flex-col items-center justify-center gap-1"
                            >
                                <span>Daftar Sekarang</span>
                                {event.capacity > 0 && (
                                    <span className="text-[9px] text-green-600 opacity-80 normal-case font-bold tracking-normal italic">
                                        Tersisa {event.capacity - (event.registration_count || 0)} Slot Lagi
                                    </span>
                                )}
                            </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration Success Overlay */}
            {success && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/95 backdrop-blur-md animate-fade-in overflow-y-auto">
                    <div className="max-w-sm w-full bg-white p-8 rounded-[3rem] shadow-2xl text-center border border-gray-100 animate-scale-up my-4">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <span className="material-icons text-4xl">check_circle</span>
                        </div>
                        <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Pendaftaran Berhasil!</h3>
                        <p className="text-gray-500 mb-6 text-sm leading-relaxed">Kode tiket dan QR Code telah dikirimkan ke <b>Email</b> dan <b>WhatsApp</b> Anda.</p>

                        {registeredCode && (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-6 mb-6">
                                <p className="text-[10px] text-green-700 font-bold uppercase tracking-widest mb-4">QR Code Tiket Anda</p>
                                <div className="flex justify-center mb-4 bg-white p-3 rounded-2xl shadow-inner">
                                    <QRCodeSVG
                                        value={registeredCode}
                                        size={160}
                                        level="H"
                                        includeMargin={false}
                                        fgColor="#065f46"
                                    />
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl border border-green-100">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Kode Tiket</p>
                                    <p className="text-2xl font-black text-green-700 tracking-[0.3em] font-mono">{registeredCode}</p>
                                </div>
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-3 text-left">
                                    <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                                        🎫 Silakan cek email masuk (atau folder spam) dan pesan WhatsApp Anda untuk tiket resmi. Simpan tiket tersebut untuk ditunjukkan saat acara.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setSuccess(false)}
                                className="w-full py-3.5 bg-green-600 text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-green-700 transition"
                            >
                                Selesai
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
                            {!JSON.parse(localStorage.getItem('user')) ? (
                                <div className="text-center py-10 space-y-6">
                                    <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <span className="material-icons text-4xl">lock</span>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-extrabold text-gray-900">Login Diperlukan</h3>
                                        <p className="text-gray-500 text-sm">Anda harus masuk ke akun Barakah Economy terlebih dahulu untuk mendaftar event ini.</p>
                                    </div>
                                    <Link
                                        to={`/login?redirect=/event/${slug}`}
                                        className="w-full block py-4 bg-gray-900 text-white rounded-2xl text-sm font-bold shadow-xl hover:bg-gray-800 transition"
                                    >
                                        LOGIN SEKARANG
                                    </Link>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Belum punya akun? <Link to="/register" className="text-green-600 underline">Daftar</Link></p>
                                </div>
                            ) : (
                                <>
                                    {error && (
                                        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
                                            <span className="material-icons text-lg">error_outline</span>
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        {/* HTM / Payment Section */}
                                        {event.price_type !== 'free' && (
                                            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                        <span className="material-icons text-green-600">payments</span>
                                                        Informasi Pembayaran
                                                    </h3>
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">{event.price_type}</span>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-4 rounded-2xl border border-gray-100">
                                                    <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                                                        <img src="/images/qris-bae2.png" alt="QRIS BAE" className="w-full h-full object-contain" />
                                                    </div>
                                                    <div className="text-center sm:text-left">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pindai QRIS BAE</p>
                                                        <p className="text-lg font-black text-gray-900 mt-1">Barakah App Economy</p>
                                                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">Silakan bayar melalui QRIS di atas dan unggah bukti transfernya di bawah ini.</p>
                                                        <a
                                                            href="/images/qris-bae2.png"
                                                            download="QRIS-BAE.png"
                                                            className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold text-green-700 hover:text-green-800 transition bg-green-50 px-3 py-1.5 rounded-lg border border-green-100"
                                                        >
                                                            <span className="material-icons text-sm">download</span>
                                                            UNDUH QRIS
                                                        </a>
                                                    </div>
                                                </div>

                                                {/* Price Inputs based on price_type */}
                                                <div className="space-y-4">
                                                    {(event.price_type === 'fixed' || event.price_type === 'hybrid_1') && (
                                                        <div className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl border border-gray-100">
                                                            <span className="text-xs font-bold text-gray-500 uppercase">HTM {event.price_type === 'hybrid_1' ? 'Minimal' : ''}</span>
                                                            <span className="text-lg font-black text-green-700">Rp {formatCurrency(event.price_fixed)}</span>
                                                        </div>
                                                    )}

                                                    {(event.price_type === 'voluntary' || event.price_type === 'hybrid_1' || event.price_type === 'hybrid_2') && (
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-gray-600 uppercase ml-1">
                                                                {event.price_type === 'hybrid_1' ? 'Tambah Infaq (Opsional)' :
                                                                    event.price_type === 'hybrid_2' ? 'Pilih Nominal Bayar (Min. Rp 0)' :
                                                                        'Nominal Sukarela *'}
                                                            </label>
                                                            <CurrencyInput
                                                                value={paymentAmount}
                                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                                required={event.price_type === 'voluntary'}
                                                                placeholder="Masukkan nominal..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Total Display */}
                                                <div className="flex flex-col gap-1 p-5 bg-green-50 rounded-2xl border-2 border-green-200 shadow-inner">
                                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] text-center">Total yang Harus Ditransfer</p>
                                                    <p className="text-2xl font-black text-green-800 text-center">
                                                        Rp {(() => {
                                                            const fixed = Number(event?.price_fixed) || 0;
                                                            const extra = Number(paymentAmount) || 0;
                                                            let total = 0;

                                                            if (event?.price_type === 'fixed') total = fixed;
                                                            else if (event?.price_type === 'hybrid_1') total = fixed + extra;
                                                            else total = extra; // voluntary or hybrid_2

                                                            return formatCurrency(total);
                                                        })()}
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-gray-600 uppercase ml-1">Upload Bukti Transfer *</label>
                                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-3xl cursor-pointer bg-white hover:bg-gray-50 transition-all">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <span className="material-icons text-gray-400 mb-2">add_a_photo</span>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pilih Foto Bukti</p>
                                                            {paymentProof && <p className="mt-1 text-xs text-green-600 font-bold">{paymentProof.name}</p>}
                                                        </div>
                                                        <input
                                                            type="file"
                                                            required
                                                            accept="image/*"
                                                            onChange={(e) => setPaymentProof(e.target.files[0])}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {event.form_fields?.length > 0 && (
                                            <div className="space-y-6">
                                                <h3 className="text-sm font-bold text-gray-900 border-l-4 border-green-600 pl-4 py-1">Data Pendaftaran</h3>
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
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className={`w-full py-5 bg-green-600 text-white rounded-[2rem] text-sm font-extrabold uppercase tracking-widest shadow-2xl shadow-green-100 transition active:scale-[0.98] ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'}`}
                                            >
                                                {submitting ? 'SEDANG MENGIRIM...' : 'KIRIM PENDAFTARAN'}
                                            </button>
                                            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] px-8">Pendaftaran akan ditinjau oleh tim BAE. Mohon persiapkan bukti transfer jika event berbayar.</p>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Full-size Popup */}
            {selectedImage && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition"
                    >
                        <span className="material-icons">close</span>
                    </button>
                    <div className="max-w-5xl w-full flex flex-col items-center gap-6">
                        <div className="relative group w-full flex justify-center">
                            <img src={selectedImage} alt="Documentation Full" className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain animate-scale-up" />
                        </div>
                        <div className="flex gap-4">
                            <a
                                href={selectedImage}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="bg-white text-gray-900 px-8 py-3 rounded-full text-sm font-black uppercase flex items-center gap-2 hover:bg-gray-100 transition shadow-xl"
                            >
                                <span className="material-icons">download</span>
                                Simpan Gambar
                            </a>
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="bg-white/10 text-white border border-white/20 px-8 py-3 rounded-full text-sm font-bold uppercase hover:bg-white/20 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default EventDetailPage;
