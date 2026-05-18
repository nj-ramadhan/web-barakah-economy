import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMeetingDetail, getMeetingParticipants, rsvpMeeting } from '../services/meetingApi';
import Header from '../components/layout/Header';
import { Helmet } from 'react-helmet';
import { getMediaUrl } from '../utils/mediaUtils';

const MeetingViewPage = () => {
    const { slug } = useParams();
    const [meeting, setMeeting] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submittingRsvp, setSubmittingRsvp] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [meetRes, partRes] = await Promise.all([
                    getMeetingDetail(slug),
                    getMeetingParticipants(slug)
                ]);
                setMeeting(meetRes.data);
                setParticipants(partRes.data);
            } catch (err) {
                console.error(err);
                const errMsg = err.response?.data?.detail || err.response?.data?.error || (err.response?.status === 403 ? 'Anda tidak terdaftar sebagai peserta rapat ini dan tidak memiliki akses.' : 'Gagal memuat detail rapat.');
                setError(errMsg);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);

    const currentUser = JSON.parse(localStorage.getItem('user'));
    const myParticipant = participants.find(p => p.user === currentUser?.id);

    const handleRsvpClick = async (status) => {
        setSubmittingRsvp(true);
        try {
            const res = await rsvpMeeting(slug, status);
            // Update local participant state rsvp_status
            setParticipants(prev => prev.map(p => {
                if (p.user === currentUser?.id) {
                    return { ...p, rsvp_status: res.data.rsvp_status };
                }
                return p;
            }));
            alert(res.data.message);
        } catch (err) {
            alert(err.response?.data?.error || 'Gagal mengirim konfirmasi kehadiran.');
        } finally {
            setSubmittingRsvp(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
    if (error) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <span className="material-icons text-red-500 text-6xl mb-4">error_outline</span>
            <h1 className="text-xl font-black text-gray-900 mb-2">{error}</h1>
            <Link to="/dashboard" className="text-blue-600 font-bold hover:underline">Kembali ke Dashboard</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-20">
            <Helmet>
                <title>{meeting?.title} | Rapat Internal</title>
            </Helmet>
            <Header />

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                {/* Header Section */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
                    {meeting?.thumbnail && (
                        <div className="h-64 w-full overflow-hidden">
                            <img src={getMediaUrl(meeting.thumbnail)} alt={meeting.title} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="p-8 md:p-12">
                        <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                            Agenda Rapat Internal
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight">{meeting?.title}</h1>
                        {meeting?.subtitle && <p className="text-lg text-gray-500 font-medium mb-8 italic">"{meeting.subtitle}"</p>}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
                                    <span className="material-icons text-blue-600">calendar_today</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Waktu Pelaksanaan</p>
                                    <p className="text-sm font-black text-gray-800">
                                        {new Date(meeting?.start_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Pukul {new Date(meeting?.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                        {meeting?.end_date && ` - ${new Date(meeting.end_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
                                    <span className="material-icons text-blue-600">location_on</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lokasi Rapat</p>
                                    <p className="text-sm font-black text-gray-800">{meeting?.location}</p>
                                    {meeting?.location_url && (
                                        <a href={meeting.location_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 mt-1">
                                            Buka di Google Maps <span className="material-icons text-xs">open_in_new</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {meeting?.description && (
                            <div className="prose prose-sm max-w-none text-gray-600 font-medium mb-8 bg-gray-50 p-6 rounded-3xl">
                                <h3 className="text-gray-900 font-black text-xs uppercase tracking-widest mb-4">Deskripsi / Agenda</h3>
                                <div dangerouslySetInnerHTML={{ __html: meeting.description }}></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RSVP Box Section */}
                {myParticipant && (
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 transition hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                                myParticipant.rsvp_status === 'attending' 
                                    ? 'bg-emerald-50 text-emerald-600' 
                                    : myParticipant.rsvp_status === 'not_attending'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-amber-50 text-amber-600'
                            }`}>
                                <span className="material-icons text-3xl">
                                    {myParticipant.rsvp_status === 'attending' 
                                        ? 'check_circle' 
                                        : myParticipant.rsvp_status === 'not_attending'
                                        ? 'cancel'
                                        : 'help_outline'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Konfirmasi Kehadiran Rapat</p>
                                <h3 className="text-base font-black text-gray-800">
                                    {myParticipant.rsvp_status === 'attending' 
                                        ? 'Anda menyatakan AKAN HADIR' 
                                        : myParticipant.rsvp_status === 'not_attending'
                                        ? 'Anda menyatakan TIDAK HADIR'
                                        : 'Apakah Anda akan menghadiri rapat ini?'}
                                </h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Silakan lakukan konfirmasi kehadiran Anda menggunakan akun yang terdaftar.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                disabled={submittingRsvp}
                                onClick={() => handleRsvpClick('attending')}
                                className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 ${
                                    myParticipant.rsvp_status === 'attending'
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                                        : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                                }`}
                            >
                                <span className="material-icons text-sm">done</span>
                                Akan Hadir
                            </button>
                            <button
                                disabled={submittingRsvp}
                                onClick={() => handleRsvpClick('not_attending')}
                                className={`flex-1 md:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 ${
                                    myParticipant.rsvp_status === 'not_attending'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-100'
                                        : 'bg-gray-50 text-gray-700 hover:bg-red-50 hover:text-red-700'
                                }`}
                            >
                                <span className="material-icons text-sm">close</span>
                                Tidak Hadir
                            </button>
                        </div>
                    </div>
                )}

                {/* Sessions Section */}
                {meeting?.sessions && meeting.sessions.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                            <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center"><span className="material-icons text-sm">schedule</span></span>
                            Sesi Rapat
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {meeting.sessions.map((session, idx) => (
                                <div key={session.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between group hover:border-indigo-200 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="text-xs font-black text-gray-300 w-6">#{idx + 1}</div>
                                        <div>
                                            <h4 className="font-black text-gray-800 text-sm">{session.title}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                {session.start_time ? new Date(session.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                {session.end_time ? ` - ${new Date(session.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Participants Section */}
                <div>
                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><span className="material-icons text-sm">people</span></span>
                        Peserta Terundang
                    </h2>
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {participants.map(p => (
                                <div key={p.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-emerald-200 transition">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 font-black text-xs shrink-0 overflow-hidden shadow-sm">
                                        {p.user_details?.profile?.profile_image ? (
                                            <img src={getMediaUrl(p.user_details.profile.profile_image)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            p.user_details?.username?.substring(0, 2).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">{p.user_details?.profile?.name_full || p.user_details?.username}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.user_details?.profile?.position || 'Anggota'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MeetingViewPage;
