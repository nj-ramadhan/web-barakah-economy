import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const EcourseViewerPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [currentMaterial, setCurrentMaterial] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [certRequest, setCertRequest] = useState(null);
    const [certName, setCertName] = useState('');
    const [certEmail, setCertEmail] = useState('');
    const [certWhatsapp, setCertWhatsapp] = useState('');
    const [submittingCert, setSubmittingCert] = useState(false);

    const baseUrl = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        const fetchData = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                navigate('/login');
                return;
            }

            try {
                // Fetch course details
                const courseRes = await axios.get(`${baseUrl}/api/courses/${slug}/`);
                setCourse(courseRes.data);

                // Fetch materials
                const materialsRes = await axios.get(`${baseUrl}/api/courses/materials/?course_id=${courseRes.data.id}`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                const sortedMaterials = (materialsRes.data || []).sort((a, b) => a.order - b.order);
                setMaterials(sortedMaterials);
                if (sortedMaterials.length > 0) {
                    setCurrentMaterial(sortedMaterials[0]);
                }

                // Fetch progress
                try {
                    const progressRes = await axios.get(`${baseUrl}/api/courses/progress/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    });
                    const courseProgress = (progressRes.data || [])
                        .filter(p => p.course === courseRes.data.id || p.course_id === courseRes.data.id)
                        .map(p => p.material);
                    setProgress(courseProgress);

                    // Fetch certificate request if course has one
                    if (courseRes.data.has_certificate) {
                        try {
                            const certRes = await axios.get(`${baseUrl}/api/courses/certificate-requests/by-course/${courseRes.data.id}/`, {
                                headers: { Authorization: `Bearer ${user.access}` }
                            });
                            setCertRequest(certRes.data);
                        } catch (cErr) {
                            // 404 is fine, means not yet requested
                        }
                    }
                } catch (pErr) {
                    console.error('Error fetching progress:', pErr);
                }
            } catch (err) {
                console.error('Error fetching ecourse data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug, navigate, baseUrl]);

    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const isLocked = (index) => {
        if (index === 0) return false;
        const prevMaterial = materials[index - 1];
        return !progress.includes(prevMaterial.id);
    };

    const handleMaterialClick = (material, index) => {
        if (isLocked(index)) {
            alert('Selesaikan materi sebelumnya untuk membuka materi ini.');
            return;
        }
        setCurrentMaterial(material);
        window.scrollTo(0, 0);
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    const markAsCompleted = async (materialId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        try {
            await axios.post(`${baseUrl}/api/courses/progress/`, {
                material: materialId
            }, {
                headers: { Authorization: `Bearer ${user.access}` }
            });

            if (!progress.includes(materialId)) {
                setProgress([...progress, materialId]);
            }
        } catch (err) {
            console.error('Error marking as completed:', err);
        }
    };

    const handleNext = () => {
        if (!currentMaterial) return;
        const currentIndex = materials.findIndex(m => m.id === currentMaterial.id);
        if (currentIndex < materials.length - 1) {
            handleMaterialClick(materials[currentIndex + 1], currentIndex + 1);
        } else {
            setCurrentMaterial(null); // Show completion screen
        }
    };

    const handleCertSubmit = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        setSubmittingCert(true);
        try {
            const res = await axios.post(`${baseUrl}/api/courses/certificate-requests/`, {
                course: course.id,
                full_name: certName,
                email: certEmail,
                whatsapp: certWhatsapp
            }, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setCertRequest(res.data);
            alert('Permintaan sertifikat berhasil dikirim!');
        } catch (err) {
            console.error('Error submitting cert request:', err);
            alert('Gagal mengirim permintaan sertifikat. Pastikan semua field terisi.');
        } finally {
            setSubmittingCert(false);
        }
    };

    if (loading) return (
        <div className="body min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
    );
    if (!course) return <div className="text-center py-20">Data tidak ditemukan</div>;

    return (
        <div className="body min-h-screen bg-gray-50 flex flex-col">
            <Helmet>
                <title>{course.title} - Belajar | Barakah Academy</title>
            </Helmet>

            <Header />

            <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full relative">
                {/* Sidebar Overlay (Mobile) */}
                {sidebarOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/50 z-10"
                        onClick={() => setSidebarOpen(false)}
                    ></div>
                )}

                {/* Sidebar */}
                <div className={`${sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'} lg:w-80 lg:translate-x-0 bg-white border-r transition-all duration-300 flex flex-col z-20 absolute lg:relative h-full shadow-xl lg:shadow-none`}>
                    <div className="p-4 border-b flex justify-between items-center bg-green-900 text-white">
                        <h2 className="font-bold text-xs uppercase tracking-widest truncate">{course.title}</h2>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {materials.map((m, index) => {
                            const locked = isLocked(index);
                            const active = currentMaterial?.id === m.id;
                            const done = progress.includes(m.id);

                            return (
                                <button
                                    key={m.id}
                                    disabled={locked}
                                    onClick={() => handleMaterialClick(m, index)}
                                    className={`w-full text-left p-4 border-b transition-all flex items-start gap-3 
                                        ${active ? 'bg-green-50 border-l-4 border-l-green-600' : 'hover:bg-gray-50'} 
                                        ${locked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold 
                                        ${done ? 'bg-green-600 text-white' : active ? 'bg-green-800 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        {done ? <span className="material-icons text-xs">check</span> : locked ? <span className="material-icons text-[10px]">lock</span> : index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold leading-snug ${active ? 'text-green-800' : 'text-gray-700'}`}>{m.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-gray-400 flex items-center gap-0.5 font-bold uppercase tracking-tight">
                                                <span className="material-icons text-[10px]">play_circle</span>
                                                VIDEO
                                            </span>
                                            {m.pdf_file && (
                                                <span className="text-[9px] text-blue-500 flex items-center gap-0.5 font-bold uppercase tracking-tight">
                                                    <span className="material-icons text-[10px]">description</span>
                                                    DOC
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {/* Top Bar (Mobile) */}
                    <div className="lg:hidden p-3 bg-white border-b flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="p-1">
                            <span className="material-icons">menu</span>
                        </button>
                        <span className="text-sm font-bold truncate">{course.title}</span>
                    </div>

                    {currentMaterial ? (
                        <div className="p-4 lg:p-10 max-w-4xl mx-auto pb-32">
                            {/* Video Player */}
                            {currentMaterial.youtube_link ? (
                                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-8 group relative border-4 border-white">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${getYoutubeId(currentMaterial.youtube_link)}?rel=0&modestbranding=1`}
                                        title={currentMaterial.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                    ></iframe>
                                </div>
                            ) : (
                                <div className="w-full aspect-video bg-gray-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 mb-8">
                                    <span className="material-icons text-gray-300 text-6xl">videocam_off</span>
                                    <p className="text-gray-400 text-sm mt-2">Video tidak tersedia</p>
                                </div>
                            )}

                            {/* Info */}
                            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                Materi {materials.findIndex(m => m.id === currentMaterial.id) + 1}
                                            </span>
                                        </div>
                                        <h1 className="text-2xl font-black text-gray-900 leading-tight">{currentMaterial.title}</h1>
                                    </div>
                                    <button
                                        onClick={() => markAsCompleted(currentMaterial.id)}
                                        className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2
                                            ${progress.includes(currentMaterial.id)
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : 'bg-green-600 text-white hover:bg-green-700'}`}
                                    >
                                        {progress.includes(currentMaterial.id) ? (
                                            <>
                                                <span className="material-icons text-sm">check_circle</span>
                                                SELESAI PELAJARI
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-icons text-sm">task_alt</span>
                                                TANDAI SELESAI
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div
                                    className="prose max-w-none text-gray-600 text-sm leading-relaxed mb-10"
                                    dangerouslySetInnerHTML={{ __html: currentMaterial.description || 'Tidak ada deskripsi untuk materi ini.' }}
                                />

                                {currentMaterial.pdf_file && (
                                    <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <span className="material-icons text-red-500 text-2xl">picture_as_pdf</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-800">Modul Pendukung</p>
                                                <p className="text-[10px] text-gray-400 font-medium">Klik tombol download untuk menyimpan</p>
                                            </div>
                                        </div>
                                        <a
                                            href={currentMaterial.pdf_file.startsWith('http') ? currentMaterial.pdf_file : `${baseUrl}${currentMaterial.pdf_file}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-black shadow-sm hover:bg-gray-50 transition"
                                        >
                                            DOWNLOAD PDF
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Next Action */}
                            <div className="mt-12 flex flex-col items-center">
                                {progress.includes(currentMaterial.id) && materials.findIndex(m => m.id === currentMaterial.id) < materials.length - 1 ? (
                                    <button
                                        onClick={handleNext}
                                        className="group bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-2xl hover:bg-black transition-all flex items-center gap-3 animate-pulse"
                                    >
                                        LANJUT MATERI BERIKUTNYA
                                        <span className="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </button>
                                ) : progress.length === materials.length ? (
                                    <div className="text-center w-full max-w-lg">
                                        <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-3 shadow-xl">
                                            <span className="material-icons text-white text-4xl">emoji_events</span>
                                        </div>
                                        <p className="font-black text-gray-900 text-xl mb-2">Selamat! Anda telah menyelesaikan kelas ini.</p>

                                        {course.has_certificate ? (
                                            <div className="mt-8 bg-white border border-gray-100 rounded-3xl p-6 lg:p-8 shadow-xl text-left">
                                                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-4">
                                                    <span className="material-icons text-green-600">verified</span>
                                                    Klaim Sertifikat Anda
                                                </h3>

                                                {certRequest ? (
                                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
                                                        <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                                                            <span className="material-icons">history</span>
                                                        </div>
                                                        <p className="font-black text-green-800">Permintaan Sertifikat: {certRequest.status === 'pending' ? 'Menunggu Antrian' : certRequest.status === 'processed' ? 'Sedang Diproses' : 'Sudah Dikirim'}</p>
                                                        <p className="text-xs text-green-600 mt-2 leading-relaxed">
                                                            {course.certificate_info || "Sertifikat Anda akan dikirimkan secara manual oleh pengajar melalui email atau WhatsApp segera sedalam 1x24 jam."}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <form onSubmit={handleCertSubmit} className="space-y-4">
                                                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                                            {course.certificate_info || "Sertifikat akan dikirimkan manual. Silakan isi detail di bawah dengan benar agar tidak ada kesalahan penulisan nama."}
                                                        </p>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nama Lengkap (Sertifikat)</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={certName}
                                                                onChange={(e) => setCertName(e.target.value)}
                                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500"
                                                                placeholder="Masukkan nama lengkap Anda..."
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                                                                <input
                                                                    type="email"
                                                                    required
                                                                    value={certEmail}
                                                                    onChange={(e) => setCertEmail(e.target.value)}
                                                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500"
                                                                    placeholder="email@anda.com"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">WhatsApp</label>
                                                                <input
                                                                    type="text"
                                                                    required
                                                                    value={certWhatsapp}
                                                                    onChange={(e) => setCertWhatsapp(e.target.value)}
                                                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-green-500"
                                                                    placeholder="0812xxxx"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            disabled={submittingCert}
                                                            className="w-full bg-green-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-green-700 transition transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                                        >
                                                            {submittingCert ? 'Sedang Mengirim...' : 'KIRIM PERMINTAAN SERTIFIKAT'}
                                                        </button>
                                                    </form>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mt-8 bg-gray-50 rounded-3xl p-8 border border-dashed border-gray-200">
                                                <p className="text-gray-400 font-bold text-sm">Kelas Selesai!</p>
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Kursus ini tidak menyediakan sertifikat.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                            <span className="material-icons text-7xl mb-6 opacity-20">auto_stories</span>
                            <p className="font-bold text-gray-500">Silakan pilih materi di samping</p>
                            <p className="text-xs mt-1">Belajar bertahap untuk hasil yang maksimal</p>
                        </div>
                    )}
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default EcourseViewerPage;
