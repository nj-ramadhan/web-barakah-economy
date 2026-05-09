import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createMeeting, updateMeeting, getMeetingDetail } from '../services/meetingApi';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Helmet } from 'react-helmet';
import { getMediaUrl } from '../utils/mediaUtils';
import CurrencyInput from '../components/common/CurrencyInput';

const MeetingSubmissionPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isEdit = !!slug;

    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        location_url: '',
    });

    const [sessions, setSessions] = useState([]);
    const [thumbnail, setThumbnail] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (isEdit) {
            const fetchDetail = async () => {
                try {
                    const res = await getMeetingDetail(slug);
                    const d = res.data;
                    setFormData({
                        title: d.title || '',
                        subtitle: d.subtitle || '',
                        description: d.description || '',
                        start_date: d.start_date ? d.start_date.slice(0, 16) : '',
                        end_date: d.end_date ? d.end_date.slice(0, 16) : '',
                        location: d.location || '',
                        location_url: d.location_url || '',
                    });
                    setSessions(d.sessions || []);
                    if (d.thumbnail) setPreview(getMediaUrl(d.thumbnail));
                } catch (err) {
                    console.error(err);
                    setError('Gagal memuat data rapat.');
                } finally {
                    setLoading(false);
                }
            };
            fetchDetail();
        }
    }, [slug, isEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setThumbnail(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const addSession = () => setSessions([...sessions, { title: '', start_time: '', end_time: '', order: sessions.length }]);
    const removeSession = (index) => setSessions(sessions.filter((_, i) => i !== index));
    const updateSession = (index, updates) => {
        const newArr = [...sessions];
        newArr[index] = { ...newArr[index], ...updates };
        setSessions(newArr);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        data.append('sessions', JSON.stringify(sessions));
        if (thumbnail) data.append('thumbnail', thumbnail);

        try {
            if (isEdit) {
                await updateMeeting(slug, data);
            } else {
                await createMeeting(data);
            }
            navigate('/dashboard/meetings');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Gagal menyimpan data rapat.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16 pb-20">
            <Helmet>
                <title>{isEdit ? 'Edit Rapat' : 'Buat Rapat Baru'} | BARAKAH APP</title>
            </Helmet>
            <Header />

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-900 leading-tight">
                        {isEdit ? 'Edit Rapat Internal' : 'Buat Rapat Baru'}
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Informasi rapat ini hanya dapat dilihat oleh peserta yang didaftarkan.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-sm font-bold">
                            {error}
                        </div>
                    )}

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Thumbnail Rapat (Opsional)</label>
                            <div className="flex flex-col sm:flex-row gap-6 items-center">
                                <div className="w-40 h-40 bg-gray-100 rounded-[2rem] overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center relative group">
                                    {preview ? (
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-icons text-gray-300 text-4xl">add_photo_alternate</span>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleThumbnailChange} 
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 leading-relaxed">Gunakan gambar yang relevan dengan topik rapat. Format yang didukung: JPG, PNG, WEBP. Maks 2MB.</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Judul Rapat *</label>
                                <input
                                    required
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Contoh: Rapat Koordinasi Program Ramadhan"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Sub Judul / Tema Singkat</label>
                                <input
                                    type="text"
                                    name="subtitle"
                                    value={formData.subtitle}
                                    onChange={handleChange}
                                    placeholder="Contoh: Pembahasan teknis dan pembagian jobdesc"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Deskripsi / Agenda</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Tuliskan detail agenda rapat atau poin-poin yang akan dibahas..."
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                ></textarea>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Waktu Mulai *</label>
                                <input
                                    required
                                    type="datetime-local"
                                    name="start_date"
                                    value={formData.start_date}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Waktu Selesai (Opsional)</label>
                                <input
                                    type="datetime-local"
                                    name="end_date"
                                    value={formData.end_date}
                                    onChange={handleChange}
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Lokasi / Venue *</label>
                                <input
                                    required
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Contoh: Ruang Rapat Lt. 2 atau Google Meet"
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Link Lokasi (Maps/Zoom/GMeet)</label>
                                <input
                                    type="url"
                                    name="location_url"
                                    value={formData.location_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SESSIONS SECTION */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Sesi Rapat (Opsional)</label>
                            <button
                                type="button"
                                onClick={addSession}
                                className="text-[10px] font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition flex items-center gap-1"
                            >
                                <span className="material-icons text-xs">add</span>
                                TAMBAH SESI
                            </button>
                        </div>

                        <div className="space-y-4">
                            {sessions.map((session, idx) => (
                                <div key={idx} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 relative animate-fade-in space-y-4">
                                    <button
                                        type="button"
                                        onClick={() => removeSession(idx)}
                                        className="absolute top-4 right-4 w-8 h-8 bg-white text-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition"
                                    >
                                        <span className="material-icons text-sm">close</span>
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Sesi</label>
                                            <input
                                                type="text"
                                                value={session.title}
                                                onChange={(e) => updateSession(idx, { title: e.target.value })}
                                                placeholder="Misal: Sesi I: Review Progress"
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Mulai</label>
                                            <input
                                                type="datetime-local"
                                                value={session.start_time ? session.start_time.slice(0, 16) : ''}
                                                onChange={(e) => updateSession(idx, { start_time: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Selesai</label>
                                            <input
                                                type="datetime-local"
                                                value={session.end_time ? session.end_time.slice(0, 16) : ''}
                                                onChange={(e) => updateSession(idx, { end_time: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Belum ada sesi tambahan</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-5 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${
                            submitting ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <span className="material-icons animate-spin">sync</span>
                                MENYIMPAN...
                            </>
                        ) : (
                            <>
                                <span className="material-icons">save</span>
                                {isEdit ? 'SIMPAN PERUBAHAN' : 'BUAT RAPAT SEKARANG'}
                            </>
                        )}
                    </button>
                </form>
            </main>

            <NavigationButton />
        </div>
    );
};

export default MeetingSubmissionPage;
