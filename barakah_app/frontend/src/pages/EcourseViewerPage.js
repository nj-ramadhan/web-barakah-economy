// pages/EcourseViewerPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getCourseDetail, getCourseMaterials, downloadCourseCertificate } from '../services/ecourseApi';
import { getMediaUrl } from '../utils/mediaUtils';
import api from '../services/api';
import '../styles/Body.css';

// Quiz Component
const QuizViewer = ({ quizData, onComplete, onReset, isCompleted }) => {
    const [currentStep, setCurrentStep] = useState('start'); // start, quiz, result
    const [userAnswers, setUserAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [showAnswers, setShowAnswers] = useState(false);

    let questions = quizData?.questions || [];
    if (typeof quizData === 'string' && quizData) {
        try { 
            const parsed = JSON.parse(quizData);
            questions = parsed.questions || [];
        } catch(e) { questions = []; }
    }
    const settings = (typeof quizData === 'string' ? {} : quizData?.settings) || {};

    const startQuiz = () => {
        if (questions.length === 0) {
            alert('Kuis ini belum memiliki pertanyaan.');
            return;
        }
        setCurrentStep('quiz');
        setUserAnswers({});
        setShowAnswers(false);
    };

    const handleAnswer = (qId, index) => {
        if (showAnswers) return;
        setUserAnswers({ ...userAnswers, [qId]: index });
    };

    const submitQuiz = () => {
        if (questions.length === 0) return;
        if (Object.keys(userAnswers).length < questions.length) {
            alert('Mohon jawab semua pertanyaan.');
            return;
        }

        let correctCount = 0;
        questions.forEach(q => {
            if (userAnswers[q.id] === q.correct_index) {
                correctCount++;
            }
        });

        const finalScore = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
        setScore(finalScore);
        setCurrentStep('result');

        if (finalScore >= (settings.passing_score || 70)) {
            onComplete(userAnswers, finalScore);
        }
    };

    if (currentStep === 'start') {
        return (
            <div className="text-center py-10 animate-fade-in">
                <div className="w-20 h-20 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-purple-600 shadow-lg">
                    <span className="material-icons text-4xl">quiz</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Siap untuk Kuis?</h3>
                <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">Selesaikan kuis ini untuk menguji pemahaman Anda. Minimal skor kelulusan adalah {settings.passing_score || 70}%.</p>
                <button 
                    onClick={startQuiz}
                    className="bg-purple-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-purple-100 hover:bg-purple-700 transition transform hover:scale-105"
                >
                    MULAI KUIS SEKARANG
                </button>
            </div>
        );
    }

    if (currentStep === 'quiz') {
        return (
            <div className="space-y-8 animate-fade-in">
                {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 lg:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-8 h-8 bg-purple-50 text-purple-700 rounded-xl flex items-center justify-center text-xs font-black">{idx + 1}</span>
                            <p className="font-bold text-gray-800">{q.question}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {q.options.map((opt, optIdx) => (
                                <button
                                    key={optIdx}
                                    onClick={() => handleAnswer(q.id, optIdx)}
                                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3
                                        ${userAnswers[q.id] === optIdx 
                                            ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold' 
                                            : 'border-gray-50 bg-gray-50/50 hover:border-gray-200 text-gray-600'}`}
                                >
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black
                                        ${userAnswers[q.id] === optIdx ? 'bg-purple-600 text-white' : 'bg-white border text-gray-400'}`}>
                                        {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="text-sm">{opt}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="flex justify-center pt-4">
                    <button 
                        onClick={submitQuiz}
                        className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-2xl hover:bg-black transition-all transform hover:scale-105"
                    >
                        SUBMIT JAWABAN
                    </button>
                </div>
            </div>
        );
    }

    const passed = score >= (settings.passing_score || 70);

    return (
        <div className="text-center py-10 animate-fade-in">
            <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl transform rotate-3
                ${passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                <span className="material-icons text-5xl">{passed ? 'stars' : 'sentiment_very_dissatisfied'}</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">{passed ? 'Selamat! Anda Lulus' : 'Yah, Belum Lulus'}</h3>
            <p className={`text-5xl font-black mb-6 ${passed ? 'text-green-600' : 'text-red-600'}`}>{score}%</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                {settings.allow_reset && (
                    <button 
                        onClick={startQuiz}
                        className="w-full sm:w-auto bg-gray-100 text-gray-700 px-6 py-3 rounded-2xl font-black text-xs hover:bg-gray-200 transition"
                    >
                        ULANGI KUIS
                    </button>
                )}
                {settings.show_correct_answers && !showAnswers && (
                    <button 
                        onClick={() => setShowAnswers(true)}
                        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 transition"
                    >
                        LIHAT JAWABAN BENAR
                    </button>
                )}
            </div>

            {showAnswers && (
                <div className="mt-10 space-y-4 text-left">
                    <h4 className="font-black text-gray-800 mb-4 uppercase tracking-widest text-center text-xs">Kunci Jawaban</h4>
                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-start gap-4">
                            <span className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0">{idx + 1}</span>
                            <div>
                                <p className="text-sm font-bold text-gray-800">{q.question}</p>
                                <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                                    <span className="material-icons text-xs">check_circle</span>
                                    {q.options[q.correct_index]}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

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
                const courseRes = await getCourseDetail(slug);
                setCourse(courseRes.data);

                // Fetch materials
                const materialsRes = await getCourseMaterials(courseRes.data.id);
                const sortedMaterials = (materialsRes.data || []).sort((a, b) => a.order - b.order);
                setMaterials(sortedMaterials);
                if (sortedMaterials.length > 0) {
                    setCurrentMaterial(sortedMaterials[0]);
                }

                // Fetch progress
                try {
                    const progressRes = await api.get('/courses/progress/');
                    const courseProgress = (progressRes.data || [])
                        .filter(p => p.course === courseRes.data.id || p.course_id === courseRes.data.id)
                        .map(p => p.material);
                    setProgress(courseProgress);
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

    const markAsCompleted = async (materialId, quizAnswers = null, quizScore = null) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;

        try {
            await api.post('/courses/progress/', {
                material: materialId,
                quiz_answers: quizAnswers,
                quiz_score: quizScore
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

    const handleDownloadCert = async () => {
        try {
            const response = await downloadCourseCertificate(course.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Sertifikat_${course.slug}.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Error downloading cert:', err);
            alert('Gagal mendownload sertifikat. Pastikan Anda telah menyelesaikan semua materi.');
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
                {/* Sidebar */}
                <div className={`${sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'} lg:w-80 lg:translate-x-0 bg-white border-r transition-all duration-300 flex flex-col z-20 absolute lg:relative h-full shadow-xl lg:shadow-none`}>
                    <div className="p-5 border-b flex justify-between items-center bg-gray-900 text-white">
                        <div className="min-w-0">
                            <h2 className="font-black text-[10px] uppercase tracking-widest text-green-500 mb-1">Kurikulum Kursus</h2>
                            <h3 className="font-bold text-xs truncate">{course.title}</h3>
                        </div>
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
                                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black 
                                        ${done ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 
                                          active ? 'bg-green-900 text-white shadow-lg shadow-green-100' : 
                                          'bg-gray-100 text-gray-400'}`}>
                                        {done ? <span className="material-icons text-base">check</span> : locked ? <span className="material-icons text-sm">lock</span> : index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold leading-tight ${active ? 'text-green-800' : 'text-gray-700'}`}>{m.title}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest
                                                ${m.material_type === 'quiz' ? 'bg-purple-100 text-purple-700' : 
                                                  m.material_type === 'text' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {m.material_type || 'video'}
                                            </span>
                                            {(m.pdf_file || m.pdf_link) && (
                                                <span className="text-[8px] text-red-500 flex items-center gap-0.5 font-black">
                                                    <span className="material-icons text-[10px]">picture_as_pdf</span> PDF
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
                    <div className="lg:hidden p-4 bg-white border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                        <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-gray-600">
                            <span className="material-icons">menu</span>
                        </button>
                        <span className="text-sm font-black truncate">{course.title}</span>
                    </div>

                    {currentMaterial ? (
                        <div className="p-4 lg:p-10 max-w-4xl mx-auto pb-32 animate-fade-in">
                            {/* Render based on type */}
                            {currentMaterial.material_type === 'video' || !currentMaterial.material_type ? (
                                <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl mb-10 group relative border-4 border-white">
                                    {currentMaterial.youtube_link ? (
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
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                            <span className="material-icons text-6xl opacity-20">videocam_off</span>
                                            <p className="mt-2 text-sm font-bold">Video tidak tersedia</p>
                                        </div>
                                    )}
                                </div>
                            ) : currentMaterial.material_type === 'text' ? (
                                <div className="bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-sm border border-gray-100 mb-10 min-h-[400px]">
                                    <div className="prose max-w-none prose-sm lg:prose-base text-gray-800 leading-relaxed"
                                         dangerouslySetInnerHTML={{ __html: currentMaterial.content_text }} />
                                </div>
                            ) : currentMaterial.material_type === 'quiz' ? (
                                <div className="bg-white rounded-[2.5rem] p-8 lg:p-12 shadow-sm border border-gray-100 mb-10 min-h-[400px]">
                                    <QuizViewer 
                                        quizData={currentMaterial.quiz_data} 
                                        onComplete={(answers, score) => markAsCompleted(currentMaterial.id, answers, score)}
                                        isCompleted={progress.includes(currentMaterial.id)}
                                    />
                                </div>
                            ) : null}

                            {/* Common Bottom Section (Title, PDF, Next) */}
                            <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-100">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                                                Langkah {currentMaterial ? materials.findIndex(m => m.id === currentMaterial.id) + 1 : 1}
                                            </span>
                                            {currentMaterial.material_type === 'quiz' && (
                                                <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">KUIS</span>
                                            )}
                                        </div>
                                        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 leading-tight">{currentMaterial.title}</h1>
                                    </div>
                                    
                                    {currentMaterial.material_type !== 'quiz' && (
                                        <button
                                            onClick={() => markAsCompleted(currentMaterial.id)}
                                            className={`px-8 py-4 rounded-2xl text-xs font-black transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2
                                                ${progress.includes(currentMaterial.id)
                                                    ? 'bg-green-100 text-green-700 border-2 border-green-200'
                                                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-100'}`}
                                        >
                                            {progress.includes(currentMaterial.id) ? (
                                                <><span className="material-icons text-base">check_circle</span> SELESAI</>
                                            ) : (
                                                <><span className="material-icons text-base">task_alt</span> TANDAI SELESAI</>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {currentMaterial.description && (
                                    <p className="text-gray-500 text-sm italic border-l-4 border-gray-100 pl-4 py-1 mb-8">{currentMaterial.description}</p>
                                )}

                                { (currentMaterial.pdf_file || currentMaterial.pdf_link) && (
                                    <div className="p-6 bg-blue-50/50 rounded-[2rem] border-2 border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                <span className="material-icons text-red-500 text-3xl">picture_as_pdf</span>
                                            </div>
                                            <div className="text-center sm:text-left">
                                                <p className="text-sm font-black text-gray-800 uppercase tracking-tight">Dokumen Pendukung</p>
                                                <p className="text-[10px] text-gray-400 font-bold">Silakan download untuk materi cetak</p>
                                            </div>
                                        </div>
                                        <a
                                            href={currentMaterial.pdf_file ? getMediaUrl(currentMaterial.pdf_file) : currentMaterial.pdf_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-700 px-8 py-3 rounded-2xl text-xs font-black shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2"
                                        >
                                            <span className="material-icons text-sm">{currentMaterial.pdf_file ? 'download' : 'open_in_new'}</span> {currentMaterial.pdf_file ? 'DOWNLOAD PDF' : 'BUKA LINK PDF'}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Navigation */}
                            <div className="mt-12 flex flex-col items-center">
                                {currentMaterial && progress.includes(currentMaterial.id) && materials.findIndex(m => m.id === currentMaterial.id) < materials.length - 1 ? (
                                    <button
                                        onClick={handleNext}
                                        className="group bg-gray-900 text-white px-10 py-5 rounded-[2rem] font-black text-sm shadow-2xl hover:bg-black transition-all flex items-center gap-4 animate-bounce-horizontal"
                                    >
                                        LANJUT MATERI BERIKUTNYA
                                        <span className="material-icons group-hover:translate-x-2 transition-transform">arrow_forward</span>
                                    </button>
                                ) : progress.length === materials.length ? (
                                    <div className="text-center w-full max-w-xl animate-slide-up">
                                        <div className="w-24 h-24 bg-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 rotate-6 shadow-2xl border-4 border-white">
                                            <span className="material-icons text-white text-5xl">emoji_events</span>
                                        </div>
                                        <h3 className="font-black text-gray-900 text-2xl mb-2">Luar Biasa! Kelas Selesai</h3>
                                        <p className="text-gray-500 text-sm mb-10 font-bold">Anda telah menyelesaikan semua kurikulum dalam kursus ini.</p>

                                        {course.has_certificate ? (
                                            <div className="bg-white border-2 border-gray-100 rounded-[3rem] p-8 lg:p-12 shadow-2xl text-left relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                                                <h3 className="text-xl font-black text-gray-800 flex items-center gap-3 mb-6 relative">
                                                    <span className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center shadow-lg"><span className="material-icons">verified</span></span>
                                                    Klaim Sertifikat
                                                </h3>

                                                <div className="space-y-8 relative">
                                                    <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6 flex items-start gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm text-amber-500">
                                                            <span className="material-icons">info</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-amber-900 mb-1 uppercase tracking-tight">Validasi Nama Profil</p>
                                                            <p className="text-xs text-amber-800 leading-relaxed font-bold opacity-80">
                                                                Sertifikat akan diterbitkan atas nama profil Anda. Mohon pastikan data sudah sesuai.
                                                            </p>
                                                            <button 
                                                                onClick={() => navigate('/profile/edit')}
                                                                className="mt-3 text-[10px] font-black text-amber-900 underline uppercase tracking-widest hover:text-amber-700"
                                                            >
                                                                EDIT NAMA PROFIL
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={handleDownloadCert}
                                                        className="w-full bg-green-600 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-green-100 hover:bg-green-700 transition transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4"
                                                    >
                                                        <span className="material-icons text-2xl">workspace_premium</span>
                                                        <span className="text-sm uppercase tracking-widest">DOWNLOAD SERTIFIKAT SEKARANG</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-100 rounded-[3rem] p-10 border-4 border-dashed border-gray-200">
                                                <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Course Completed</p>
                                                <p className="text-[10px] text-gray-400 mt-2 font-bold italic opacity-70">Kursus ini tidak menyertakan sertifikat digital.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-gray-300">
                            <span className="material-icons text-8xl mb-8 opacity-10">auto_stories</span>
                            <p className="font-black text-gray-400 text-xl">Mulai Petualangan Belajar</p>
                            <p className="text-xs mt-2 font-bold uppercase tracking-widest opacity-50">Pilih materi dari kurikulum di samping</p>
                        </div>
                    )}
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default EcourseViewerPage;

