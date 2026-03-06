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
                const materialsRes = await axios.get(`${baseUrl}/api/courses/materials/?course=${courseRes.data.id}`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                const sortedMaterials = (materialsRes.data || []).sort((a, b) => a.order - b.order);
                setMaterials(sortedMaterials);
                if (sortedMaterials.length > 0) {
                    setCurrentMaterial(sortedMaterials[0]);
                }

                // Fetch progress
                const progressRes = await axios.get(`${baseUrl}/api/courses/progress/?course=${courseRes.data.id}`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                setProgress(progressRes.data.map(p => p.material));
            } catch (err) {
                console.error('Error fetching ecourse data:', err);
                // Redirect if not enrolled?
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug, navigate, baseUrl]);

    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleMaterialClick = (material) => {
        setCurrentMaterial(material);
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

    if (loading) return <div className="text-center py-20">Loading...</div>;
    if (!course) return <div className="text-center py-20">Data tidak ditemukan</div>;

    return (
        <div className="body min-h-screen bg-gray-50 flex flex-col">
            <Helmet>
                <title>{course.title} - Viewer | Barakah Academy</title>
            </Helmet>

            <Header />

            <div className="flex-1 flex overflow-hidden max-w-6xl mx-auto w-full">
                {/* Sidebar */}
                <div className={`${sidebarOpen ? 'w-80' : 'w-0'} lg:w-80 bg-white border-r transition-all duration-300 flex flex-col z-20 absolute lg:relative h-full`}>
                    <div className="p-4 border-b flex justify-between items-center bg-green-800 text-white">
                        <h2 className="font-bold text-sm truncate">{course.title}</h2>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {materials.map((m, index) => (
                            <button
                                key={m.id}
                                onClick={() => handleMaterialClick(m)}
                                className={`w-full text-left p-4 border-b hover:bg-green-50 transition flex items-start gap-3 ${currentMaterial?.id === m.id ? 'bg-green-50 border-l-4 border-l-green-600' : ''}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${progress.includes(m.id) ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {progress.includes(m.id) ? <span className="material-icons text-xs">check</span> : index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${currentMaterial?.id === m.id ? 'text-green-700' : 'text-gray-700'}`}>{m.title}</p>
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                        <span className="material-icons text-[10px]">play_circle</span>
                                        Video
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {/* Top Bar (Mobile) */}
                    <div className="lg:hidden p-2 bg-white border-b flex items-center gap-2">
                        <button onClick={() => setSidebarOpen(true)} className="p-2">
                            <span className="material-icons">menu</span>
                        </button>
                        <span className="text-sm font-bold truncate">{course.title}</span>
                    </div>

                    {currentMaterial ? (
                        <div className="p-4 lg:p-8 max-w-5xl mx-auto">
                            {/* Video Player */}
                            {currentMaterial.youtube_link && (
                                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg mb-6">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${getYoutubeId(currentMaterial.youtube_link)}`}
                                        title={currentMaterial.title}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            )}

                            {/* Info */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <h1 className="text-xl font-bold text-gray-900">{currentMaterial.title}</h1>
                                    <button
                                        onClick={() => markAsCompleted(currentMaterial.id)}
                                        className={`px-4 py-2 rounded-full text-xs font-bold transition ${progress.includes(currentMaterial.id) ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white shadow-md hover:bg-green-700'}`}
                                    >
                                        {progress.includes(currentMaterial.id) ? 'Selesai' : 'Tandai Selesai'}
                                    </button>
                                </div>

                                <div className="prose max-w-none text-gray-600 text-sm mb-8">
                                    {currentMaterial.description || 'Tidak ada deskripsi untuk materi ini.'}
                                </div>

                                {currentMaterial.pdf_file && (
                                    <div className="mt-8 p-4 bg-gray-50 rounded-xl border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                <span className="material-icons text-red-600">description</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">Materi PDF</p>
                                                <p className="text-[10px] text-gray-400">Download untuk belajar offline</p>
                                            </div>
                                        </div>
                                        <a
                                            href={`${baseUrl}${currentMaterial.pdf_file}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white border select-none border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition"
                                        >
                                            Download
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Completion Status */}
                            <div className="mt-8 text-center pb-20">
                                <p className="text-xs text-gray-400">Progres Belajar: {Math.round((progress.length / materials.length) * 100)}%</p>
                                <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 truncate max-w-xs mx-auto overflow-hidden">
                                    <div
                                        className="bg-green-600 h-full transition-all duration-500"
                                        style={{ width: `${(progress.length / materials.length) * 100}%` }}
                                    ></div>
                                </div>
                                {progress.length === materials.length && (
                                    <div className="mt-4 animate-bounce">
                                        <button className="bg-yellow-500 text-white px-6 py-2 rounded-full font-bold shadow-lg text-sm flex items-center gap-2 mx-auto">
                                            <span className="material-icons">military_tech</span>
                                            Klaim Sertifikat
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <span className="material-icons text-6xl mb-4">play_lesson</span>
                            <p>Pilih materi untuk mulai belajar</p>
                        </div>
                    )}
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default EcourseViewerPage;
