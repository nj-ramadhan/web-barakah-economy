// pages/DashboardEcourseProgressPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import BackButton from '../components/global/BackButton';
import NavigationButton from '../components/layout/Navigation';
import { getCourseProgressRecap, exportCourseProgressCsv } from '../services/ecourseApi';
import '../styles/Body.css';

const DashboardEcourseProgressPage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStudentQuiz, setSelectedStudentQuiz] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await getCourseProgressRecap(courseId);
            setData(res.data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [courseId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExport = async () => {
        try {
            const response = await exportCourseProgressCsv(courseId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `progress_course_${courseId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            alert('Gagal mengekspor data');
        }
    };

    if (loading) return (
        <div className="body min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
    );

    if (!data) return <div className="text-center py-20">Data tidak ditemukan</div>;

    const { course_title, materials, students } = data;

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Progres Siswa - {course_title}</title>
            </Helmet>

            <Header />

            <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <div>
                            <h1 className="text-2xl font-black text-gray-900">Monitoring Progres Siswa</h1>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{course_title}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-700 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-green-800 transition shadow-lg shadow-green-100"
                    >
                        <span className="material-icons">download</span>
                        EKSPOR CSV (;)
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50">Siswa</th>
                                    {materials.map(m => (
                                        <th key={m.id} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest min-w-[150px]">
                                            <div className="flex items-center gap-2">
                                                <span className={`material-icons text-base ${m.material_type === 'quiz' ? 'text-purple-500' : 'text-blue-500'}`}>
                                                    {m.material_type === 'quiz' ? 'quiz' : m.material_type === 'video' ? 'play_circle' : 'article'}
                                                </span>
                                                {m.title}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.length === 0 ? (
                                    <tr>
                                        <td colSpan={materials.length + 1} className="px-6 py-20 text-center text-gray-400 font-bold">
                                            Belum ada siswa terdaftar di kelas ini.
                                        </td>
                                    </tr>
                                ) : (
                                    students.map(s => (
                                        <tr key={s.user_id} className="hover:bg-gray-50/30 transition">
                                            <td className="px-6 py-5 sticky left-0 bg-white shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-black text-xs">
                                                        {s.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{s.full_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold">{s.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {s.progress.map((p, idx) => (
                                                <td key={idx} className="px-6 py-5">
                                                    {p.is_completed ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase">
                                                                <span className="material-icons text-xs">check_circle</span>
                                                                Selesai
                                                            </span>
                                                            {p.type === 'quiz' && (
                                                                <button 
                                                                    onClick={() => setSelectedStudentQuiz({ student: s, material: materials[idx], progress: p })}
                                                                    className="text-left bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-[10px] font-black hover:bg-purple-100 transition"
                                                                >
                                                                    SKOR: {p.quiz_score}%
                                                                </button>
                                                            )}
                                                            <p className="text-[8px] text-gray-400 font-bold mt-0.5">
                                                                {new Date(p.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                <span className="mx-1 opacity-30">|</span>
                                                                {new Date(p.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-1">
                                                            <span className="material-icons text-xs">pending</span>
                                                            Belum
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Quiz Detail Modal */}
            {selectedStudentQuiz && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">DETAIL KUIS</span>
                                <h2 className="text-xl font-black text-gray-900">{selectedStudentQuiz.material.title}</h2>
                                <p className="text-sm text-gray-500 font-bold">Siswa: {selectedStudentQuiz.student.full_name}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedStudentQuiz(null)}
                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="bg-purple-50 rounded-3xl p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-purple-900 uppercase tracking-widest opacity-60">Skor Akhir</p>
                                    <p className="text-4xl font-black text-purple-700">{selectedStudentQuiz.progress.quiz_score}%</p>
                                </div>
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${selectedStudentQuiz.progress.quiz_score >= 70 ? 'bg-green-500' : 'bg-red-500'}`}>
                                    <span className="material-icons text-3xl">
                                        {selectedStudentQuiz.progress.quiz_score >= 70 ? 'verified' : 'error'}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pt-4">Tinjauan Jawaban</h3>
                            <div className="space-y-4">
                                {selectedStudentQuiz.material.quiz_data?.questions?.map((q, idx) => {
                                    const studentAnswerIdx = selectedStudentQuiz.progress.quiz_answers?.[q.id];
                                    const isCorrect = studentAnswerIdx === q.correct_index;
                                    
                                    return (
                                        <div key={q.id} className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100">
                                            <div className="flex gap-4 items-start mb-4">
                                                <span className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0">{idx + 1}</span>
                                                <p className="text-sm font-bold text-gray-800">{q.question}</p>
                                            </div>
                                            <div className="space-y-2 ml-10">
                                                <div className={`p-3 rounded-2xl text-xs flex items-center justify-between ${isCorrect ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                    <div>
                                                        <p className="font-black opacity-60 uppercase text-[8px] mb-1">Jawaban Siswa:</p>
                                                        <p className="font-bold">{q.options[studentAnswerIdx] || 'Tidak dijawab'}</p>
                                                    </div>
                                                    <span className="material-icons text-base">
                                                        {isCorrect ? 'check_circle' : 'cancel'}
                                                    </span>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="p-3 rounded-2xl text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                                        <p className="font-black opacity-60 uppercase text-[8px] mb-1">Kunci Jawaban:</p>
                                                        <p className="font-bold">{q.options[q.correct_index]}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div className="p-8 border-t border-gray-100">
                            <button 
                                onClick={() => setSelectedStudentQuiz(null)}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-black transition"
                            >
                                TUTUP
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardEcourseProgressPage;
