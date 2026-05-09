import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMediaUrl } from '../utils/mediaUtils';
import { 
    getMeetingDetail, 
    getMeetingParticipants, 
    addMeetingParticipants, 
    updateMeetingAttendance, 
    blastMeetingWhatsapp, 
    exportMeetingCsv 
} from '../services/meetingApi';
import axios from 'axios'; // For user search
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Helmet } from 'react-helmet';
import { formatCurrency } from '../utils/formatters';

const MeetingManagementPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [meeting, setMeeting] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);

    // Add Participant Modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // Blast Modal
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [blastMessage, setBlastMessage] = useState('');
    const [blasting, setBlasting] = useState(false);

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
                setError('Gagal memuat data manajemen rapat.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug]);

    // User Search
    useEffect(() => {
        if (showAddModal) {
            const delayDebounceFn = setTimeout(async () => {
                setSearching(true);
                try {
                    const user = JSON.parse(localStorage.getItem('user'));
                    const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/auth/users/`, {
                        params: { search: searchQuery },
                        headers: { Authorization: `Bearer ${user.access}` }
                    });
                    // Filter out already added participants
                    const existingUserIds = participants.map(p => p.user);
                    setUsers(res.data.results ? res.data.results.filter(u => !existingUserIds.includes(u.id)) : []);
                } catch (err) {
                    console.error(err);
                } finally {
                    setSearching(false);
                }
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, showAddModal, participants]);

    const handleAddParticipants = async () => {
        if (selectedUserIds.length === 0) return;
        setLoading(true);
        try {
            await addMeetingParticipants(slug, selectedUserIds);
            const partRes = await getMeetingParticipants(slug);
            setParticipants(partRes.data);
            setShowAddModal(false);
            setSelectedUserIds([]);
        } catch (err) {
            alert('Gagal menambahkan peserta.');
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceChange = async (participantId, status, remarks = '') => {
        try {
            await updateMeetingAttendance(slug, { participant_id: participantId, status, remarks });
            setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, status, remarks } : p));
        } catch (err) {
            alert('Gagal memperbarui absensi.');
        }
    };

    const handleBlast = async () => {
        if (!blastMessage) return;
        setBlasting(true);
        try {
            // If selectedIds is empty, blast to all participants
            const idsToBlast = selectedIds.length > 0 ? selectedIds : null;
            await blastMeetingWhatsapp(slug, blastMessage, idsToBlast);
            alert('Blast WhatsApp berhasil dikirim!');
            setShowBlastModal(false);
            setBlastMessage('');
        } catch (err) {
            alert('Gagal mengirim blast.');
        } finally {
            setBlasting(false);
        }
    };

    const handleExport = async () => {
        try {
            const res = await exportMeetingCsv(slug);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `peserta_rapat_${slug}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Gagal mengekspor CSV.');
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === participants.length) setSelectedIds([]);
        else setSelectedIds(participants.map(p => p.id));
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    if (loading && !meeting) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-20">
            <Helmet>
                <title>Kelola Rapat: {meeting?.title} | BARAKAH APP</title>
            </Helmet>
            <Header />

            <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link to="/dashboard/meetings" className="text-blue-600 hover:underline text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <span className="material-icons text-sm">arrow_back</span>
                                Kembali
                            </Link>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 leading-tight">{meeting?.title}</h1>
                        <p className="text-sm text-gray-500 font-medium">Manajemen Peserta & Absensi Kehadiran</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleExport}
                            className="flex-1 md:flex-none bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                        >
                            <span className="material-icons text-sm text-green-600">download</span>
                            EXPORT CSV
                        </button>
                        <button 
                            onClick={() => {
                                setBlastMessage(`Yth. Bapak/Ibu/Sdr/i,\n\nKami mengundang Anda untuk menghadiri rapat *${meeting?.title}* yang akan dilaksanakan pada:\n\nHari/Tgl: ${new Date(meeting?.start_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\nJam: ${new Date(meeting?.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}\nLokasi: ${meeting?.location}\n\nMohon kehadirannya tepat waktu. Terima kasih.\n\n_Pesan otomatis dari Barakah App_`);
                                setShowBlastModal(true);
                            }}
                            className="flex-1 md:flex-none bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-100"
                        >
                            <span className="material-icons text-sm">campaign</span>
                            BLAST WA ({selectedIds.length > 0 ? selectedIds.length : 'SEMUA'})
                        </button>
                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                        >
                            <span className="material-icons text-sm">person_add</span>
                            TAMBAH PESERTA
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-5 w-12 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.length === participants.length && participants.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Peserta</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Info Kontak</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status Kehadiran</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {participants.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                                        <td className="p-5 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(p.id)}
                                                onChange={() => toggleSelect(p.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black text-xs shrink-0 overflow-hidden">
                                                    {p.user_details?.profile?.profile_image ? (
                                                        <img src={getMediaUrl(p.user_details.profile.profile_image)} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        p.user_details?.username?.substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900">{p.user_details?.profile?.name_full || p.user_details?.username}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ID: {p.user}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <p className="text-xs font-bold text-gray-600">{p.user_details?.email}</p>
                                            <p className="text-[10px] text-gray-400">{p.user_details?.profile?.phone || '-'}</p>
                                        </td>
                                        <td className="p-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleAttendanceChange(p.id, 'present', p.remarks)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${p.status === 'present' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'}`}
                                                >
                                                    Hadir
                                                </button>
                                                <button
                                                    onClick={() => handleAttendanceChange(p.id, 'absent', p.remarks)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${p.status === 'absent' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`}
                                                >
                                                    Absen
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <input 
                                                type="text" 
                                                value={p.remarks || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setParticipants(prev => prev.map(x => x.id === p.id ? { ...x, remarks: val } : x));
                                                }}
                                                onBlur={(e) => handleAttendanceChange(p.id, p.status, e.target.value)}
                                                placeholder="Catatan..."
                                                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-[11px] font-medium focus:ring-1 focus:ring-blue-500"
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {participants.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center">
                                            <span className="material-icons text-gray-200 text-4xl mb-2">person_off</span>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Belum ada peserta terdaftar</p>
                                            <button onClick={() => setShowAddModal(true)} className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Tambah Peserta Sekarang</button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* MODAL: TAMBAH PESERTA */}
            {showAddModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-bounce-in flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900">Tambah Peserta Rapat</h3>
                            <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><span className="material-icons text-sm">close</span></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="relative mb-6">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-gray-400">search</span>
                                <input 
                                    type="text" 
                                    placeholder="Cari user berdasarkan nama atau email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-2">
                                {searching ? (
                                    <div className="text-center py-8"><span className="material-icons animate-spin text-blue-600">sync</span></div>
                                ) : users.map(u => (
                                    <div 
                                        key={u.id} 
                                        onClick={() => setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])}
                                        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition ${selectedUserIds.includes(u.id) ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}
                                    >
                                        <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center bg-white">
                                            {selectedUserIds.includes(u.id) && <span className="material-icons text-blue-600 text-xs">check</span>}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-sm font-black ${selectedUserIds.includes(u.id) ? 'text-white' : 'text-gray-900'}`}>{u.profile?.name_full || u.username}</p>
                                            <p className={`text-[10px] ${selectedUserIds.includes(u.id) ? 'text-blue-100' : 'text-gray-400'}`}>{u.email}</p>
                                        </div>
                                    </div>
                                ))}
                                {searchQuery && !searching && users.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-xs font-bold uppercase tracking-widest">Tidak ada user ditemukan</div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100">
                            <button 
                                onClick={handleAddParticipants}
                                disabled={selectedUserIds.length === 0}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all ${selectedUserIds.length > 0 ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                TAMBAHKAN ({selectedUserIds.length}) PESERTA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: BLAST WHATSAPP */}
            {showBlastModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBlastModal(false)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-bounce-in">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900">Blast WhatsApp</h3>
                            <button onClick={() => setShowBlastModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><span className="material-icons text-sm">close</span></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                                <span className="material-icons text-amber-600 text-sm">info</span>
                                <p className="text-[11px] text-amber-700 leading-relaxed font-medium">Pesan ini akan dikirimkan ke <b>{selectedIds.length > 0 ? selectedIds.length : 'Semua'} peserta</b> yang memiliki nomor WhatsApp terdaftar. Gunakan bahasa yang sopan.</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Isi Pesan Blast</label>
                                <textarea
                                    rows="10"
                                    value={blastMessage}
                                    onChange={(e) => setBlastMessage(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition leading-relaxed"
                                    placeholder="Tulis pesan Anda..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="p-8 bg-gray-50 border-t border-gray-100">
                            <button 
                                onClick={handleBlast}
                                disabled={blasting || !blastMessage}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${!blasting && blastMessage ? 'bg-green-600 text-white shadow-green-100' : 'bg-gray-200 text-gray-400'}`}
                            >
                                {blasting ? <><span className="material-icons animate-spin">sync</span> MENGIRIM...</> : <><span className="material-icons text-sm">send</span> KIRIM SEKARANG</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default MeetingManagementPage;
