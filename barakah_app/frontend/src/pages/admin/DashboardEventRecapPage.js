import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getGlobalRegistrations, getEvents, globalBlastWhatsapp } from '../../services/eventApi';
import { Helmet } from 'react-helmet';

const LABEL_MAPPINGS = {
    'Instansi/Organisasi': ['instansi', 'organisasi', 'perusahaan', 'asal', 'lembaga', 'komunitas', 'office', 'company', 'unit kerja', 'tempat kerja', 'bisnis'],
    'Jabatan/Profesi': ['jabatan', 'profesi', 'pekerjaan', 'posisi', 'occupation', 'job', 'position', 'status', 'aktivitas', 'kegiatan'],
    'Alamat/Domisili': ['alamat', 'kota', 'domisili', 'tempat tinggal', 'kecamatan', 'kabupaten', 'provinsi', 'address', 'city', 'residence', 'daerah', 'area', 'tinggal'],
    'Jenis Kelamin': ['jenis kelamin', 'gender', 'sex', 'pria/wanita', 'laki-laki/perempuan', 'gender'],
    'Pendidikan': ['pendidikan', 'sekolah', 'universitas', 'kampus', 'jurusan', 'major', 'education', 'school', 'university', 'angkatan', 'nim', 'studi', 'semester', 'kelas'],
    'Sumber Info': ['tahu dari mana', 'sumber informasi', 'informasi event', 'info event', 'source', 'how did you know', 'referral', 'mendapat info'],
    'Alasan Daftar': ['alasan', 'motivasi', 'tujuan', 'reason', 'motivation', 'goal', 'ekspektasi', 'harapan', 'minat', 'tertarik'],
    'Umur/Usia': ['umur', 'usia', 'tanggal lahir', 'age', 'birth'],
    'Sosial Media': ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'social media', 'sosmed', 'ig', 'fb']
};

const normalizeLabel = (label) => {
    const lowLabel = label.toLowerCase().trim();
    for (const [canonical, keywords] of Object.entries(LABEL_MAPPINGS)) {
        if (keywords.some(k => lowLabel.includes(k))) {
            return canonical;
        }
    }
    return label; // Keep original if no match
};

const DashboardEventRecapPage = () => {
    const [registrations, setRegistrations] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterEvent, setFilterEvent] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Blast WA Modal State
    const [showBlastModal, setShowBlastModal] = useState(false);
    const [blastMessage, setBlastMessage] = useState('Halo {name}, terima kasih telah berpartisipasi dalam event kami.');
    const [blastImage, setBlastImage] = useState(null);
    const [isBlasting, setIsBlasting] = useState(false);
    const [blastResult, setBlastResult] = useState(null);

    const [dynamicLabels, setDynamicLabels] = useState([]);
    const [labelMapping, setLabelMapping] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [regRes, eventRes] = await Promise.all([
                getGlobalRegistrations(),
                getEvents()
            ]);
            setRegistrations(regRes.data);
            setEvents(eventRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (registrations.length > 0) {
            const normalizedMap = {}; // Canonical -> Set of original labels
            const commonFields = [
                'nama', 'name', 'email', 'alamat email', 
                'no hp', 'hp', 'whatsapp', 'wa', 'telepon', 'phone', 'no. hp', 'no. whatsapp', 'handphone', 'contact'
            ];
            
            registrations.forEach(reg => {
                if (reg.responses_with_labels) {
                    Object.keys(reg.responses_with_labels).forEach(label => {
                        const lowLabel = label.toLowerCase().trim();
                        // Check if it's NOT a common field
                        if (!commonFields.some(cf => lowLabel === cf || lowLabel.includes(cf))) {
                            const canonical = normalizeLabel(label);
                            if (!normalizedMap[canonical]) normalizedMap[canonical] = new Set();
                            normalizedMap[canonical].add(label);
                        }
                    });
                }
            });
            
            setLabelMapping(normalizedMap);
            setDynamicLabels(Object.keys(normalizedMap).sort());
        }
    }, [registrations]);

    const getNormalizedValue = (reg, canonical) => {
        const originalLabels = labelMapping[canonical];
        if (!originalLabels) return '';
        
        const values = [];
        originalLabels.forEach(label => {
            const val = reg.responses_with_labels?.[label];
            if (val) {
                values.push(Array.isArray(val) ? val.join(', ') : val);
            }
        });
        
        return values.length > 0 ? values.join(' | ') : '';
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(filteredRegistrations.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const exportToCSV = () => {
        const dataToExport = filteredRegistrations;
        const baseHeaders = ['ID', 'Event', 'Nama', 'Email', 'No HP'];
        const headers = [...baseHeaders, ...dynamicLabels, 'Status', 'Tanggal'];
        
        const rows = dataToExport.map(r => {
            const dynamicValues = dynamicLabels.map(label => {
                const val = getNormalizedValue(r, label);
                return `"${String(val).replace(/"/g, '""')}"`;
            });

            return [
                r.id,
                `"${r.event_title.replace(/"/g, '""')}"`,
                `"${r.name.replace(/"/g, '""')}"`,
                `"${(r.email || '').replace(/"/g, '""')}"`,
                `"${(r.phone || '').replace(/"/g, '""')}"`,
                ...dynamicValues,
                r.status,
                new Date(r.created_at).toLocaleDateString()
            ];
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `rekap_peserta_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBlastImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBlast = async () => {
        if (selectedIds.length === 0) return alert('Pilih peserta terlebih dahulu');
        if (!blastMessage.trim()) return alert('Pesan tidak boleh kosong');

        setIsBlasting(true);
        setBlastResult(null);
        try {
            const res = await globalBlastWhatsapp(blastMessage, selectedIds, blastImage);
            setBlastResult(res.data.details);
            alert(`Blast berhasil dikirim ke ${res.data.details.success} peserta.`);
            if (res.data.details.failed === 0) {
                setShowBlastModal(false);
            }
        } catch (err) {
            alert('Gagal mengirim blast: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsBlasting(false);
        }
    };

    const filteredRegistrations = registrations.filter(r => {
        const matchesEvent = filterEvent === '' || r.event_id === parseInt(filterEvent);
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (r.email && r.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (r.phone && r.phone.includes(searchTerm));
        return matchesEvent && matchesSearch;
    });

    return (
        <div className="body bg-gray-50 min-h-screen pb-24">
            <Helmet>
                <title>Rekap Peserta Global - Admin</title>
            </Helmet>
            <Header />
            
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">REKAP PESERTA GLOBAL</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Konsolidasi Data Seluruh Event</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={exportToCSV}
                            className="bg-white text-gray-700 px-5 py-2.5 rounded-xl text-xs font-black shadow-sm border border-gray-200 hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <span className="material-icons text-sm">download</span>
                            EXPORT CSV (;)
                        </button>
                        <button 
                            onClick={() => { setBlastResult(null); setShowBlastModal(true); }}
                            disabled={selectedIds.length === 0}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 ${
                                selectedIds.length > 0 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <span className="material-icons text-sm">chat</span>
                            BLAST WA ({selectedIds.length})
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Cari Peserta</label>
                        <div className="relative">
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input 
                                type="text" 
                                placeholder="Nama, Email, atau No HP..." 
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 transition"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-64">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Filter Event</label>
                        <select 
                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 transition"
                            value={filterEvent}
                            onChange={e => setFilterEvent(e.target.value)}
                        >
                            <option value="">Semua Event</option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            onChange={handleSelectAll}
                                            checked={selectedIds.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Peserta</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kontak</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Event</th>
                                    {dynamicLabels.map(label => (
                                        <th key={label} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[120px]">{label}</th>
                                    ))}
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Tgl Daftar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5 + dynamicLabels.length} className="px-6 py-10 text-center">
                                            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                            <p className="text-xs text-gray-400 font-bold">Memuat Data...</p>
                                        </td>
                                    </tr>
                                ) : filteredRegistrations.length === 0 ? (
                                    <tr>
                                        <td colSpan={5 + dynamicLabels.length} className="px-6 py-10 text-center text-gray-400 text-xs italic">Data tidak ditemukan</td>
                                    </tr>
                                ) : (
                                    filteredRegistrations.map(reg => (
                                        <tr key={reg.id} className="hover:bg-gray-50/50 transition group">
                                            <td className="px-6 py-4">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    checked={selectedIds.includes(reg.id)}
                                                    onChange={() => handleSelectRow(reg.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-black text-gray-800">{reg.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono tracking-tighter">ID: {reg.unique_code}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-[10px] font-bold text-gray-600">{reg.email || '-'}</p>
                                                <p className="text-[10px] font-black text-emerald-600 mt-0.5">{reg.phone || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black text-white bg-indigo-500 px-2 py-1 rounded-lg uppercase tracking-tighter line-clamp-1 max-w-[150px]">
                                                    {reg.event_title}
                                                </span>
                                            </td>
                                            {dynamicLabels.map(label => {
                                                const val = getNormalizedValue(reg, label);
                                                return (
                                                    <td key={label} className="px-6 py-4">
                                                        <p className="text-[10px] text-gray-600 font-medium line-clamp-2 italic">{val || '-'}</p>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-[10px] font-bold text-gray-400">{new Date(reg.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* WA BLAST MODAL */}
            {showBlastModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isBlasting && setShowBlastModal(false)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <span className="material-icons text-emerald-600">chat</span>
                                    BLAST WHATSAPP
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kirim Pesan ke {selectedIds.length} Peserta</p>
                            </div>
                            <button onClick={() => setShowBlastModal(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Isi Pesan</label>
                                <textarea 
                                    className="w-full p-5 bg-gray-50 border-none rounded-[1.5rem] text-sm focus:ring-2 focus:ring-emerald-500 transition resize-none"
                                    rows="5"
                                    value={blastMessage}
                                    onChange={e => setBlastMessage(e.target.value)}
                                    placeholder="Tulis pesan..."
                                ></textarea>
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setBlastMessage(p => p + ' {name}')} className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition">+{'{name}'}</button>
                                    <button onClick={() => setBlastMessage(p => p + ' {event}')} className="text-[9px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition">+{'{event}'}</button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Lampiran Gambar (Opsional)</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            id="blast-image" 
                                            className="hidden" 
                                            onChange={handleImageChange}
                                        />
                                        <label 
                                            htmlFor="blast-image" 
                                            className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-emerald-300 transition group"
                                        >
                                            <span className="material-icons text-gray-400 group-hover:text-emerald-500 transition">image</span>
                                            <span className="text-xs font-bold text-gray-500 group-hover:text-emerald-700 transition">
                                                {blastImage ? 'Ganti Gambar' : 'Pilih Gambar...'}
                                            </span>
                                        </label>
                                    </div>
                                    {blastImage && (
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                                            <img src={blastImage} className="w-full h-full object-cover" alt="prev" />
                                            <button 
                                                onClick={() => setBlastImage(null)}
                                                className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition"
                                            >
                                                <span className="material-icons text-[12px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {blastResult && (
                                <div className={`p-4 rounded-2xl border text-center ${blastResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <p className="text-xs font-black uppercase tracking-tight">
                                        Hasil: {blastResult.success} Sukses, {blastResult.failed} Gagal
                                    </p>
                                </div>
                            )}

                            <button 
                                onClick={handleBlast}
                                disabled={isBlasting || !blastMessage.trim()}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                    isBlasting ? 'bg-gray-200 text-gray-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                            >
                                <span className="material-icons">{isBlasting ? 'hourglass_top' : 'send'}</span>
                                {isBlasting ? 'MENGIRIM BLAST...' : 'KIRIM SEKARANG'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardEventRecapPage;
