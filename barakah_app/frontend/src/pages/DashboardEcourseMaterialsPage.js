// pages/DashboardEcourseMaterialsPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getCourseMaterials, createMaterial, updateMaterial, deleteMaterial, getCourseDetail } from '../services/ecourseApi';
import '../styles/Body.css';

const DashboardEcourseMaterialsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [materialType, setMaterialType] = useState('video');
    const [description, setDescription] = useState('');
    const [youtubeLink, setYoutubeLink] = useState('');
    const [contentText, setContentText] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [order, setOrder] = useState('0');
    
    // Quiz state
    const [quizQuestions, setQuizQuestions] = useState([]);
    const [quizSettings, setQuizSettings] = useState({
        allow_reset: true,
        show_correct_answers: true,
        passing_score: 70
    });

    const contentRef = useRef(null);

    const fetchData = useCallback(async () => {
        try {
            const [courseRes, materialsRes] = await Promise.all([
                getCourseDetail(id),
                getCourseMaterials(id)
            ]);
            setCourse(courseRes.data);
            setMaterials(materialsRes.data);
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data materi');
            navigate('/dashboard/ecourses');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const resetForm = () => {
        setTitle('');
        setMaterialType('video');
        setDescription('');
        setYoutubeLink('');
        setContentText('');
        setPdfFile(null);
        setOrder(materials.length.toString());
        setQuizQuestions([]);
        setEditingMaterial(null);
        setShowForm(false);
    };

    const handleEdit = (mat) => {
        setEditingMaterial(mat);
        setTitle(mat.title);
        setMaterialType(mat.material_type || 'video');
        setDescription(mat.description || '');
        setYoutubeLink(mat.youtube_link || '');
        setContentText(mat.content_text || '');
        setOrder(mat.order.toString());
        
        if (mat.quiz_data) {
            let qData = mat.quiz_data;
            if (typeof qData === 'string') {
                try { qData = JSON.parse(qData); } catch(e) { qData = {}; }
            }
            setQuizQuestions(qData.questions || []);
            setQuizSettings(qData.settings || {
                allow_reset: true,
                show_correct_answers: true,
                passing_score: 70
            });
        }
        
        setShowForm(true);
    };

    const handleDelete = async (matId) => {
        if (!window.confirm('Yakin ingin menghapus materi ini?')) return;
        try {
            await deleteMaterial(matId);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus materi');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (materialType === 'quiz' && quizQuestions.length === 0) {
            alert('Harap tambahkan minimal satu pertanyaan untuk kuis.');
            return;
        }

        setSubmitting(true);

        const formData = new FormData();
        formData.append('course', id);
        formData.append('title', title);
        formData.append('material_type', materialType);
        formData.append('description', description);
        formData.append('order', order);
        
        if (materialType === 'video') {
            formData.append('youtube_link', youtubeLink);
        } else if (materialType === 'text') {
            formData.append('content_text', contentText);
        } else if (materialType === 'quiz') {
            formData.append('quiz_data', JSON.stringify({
                questions: quizQuestions,
                settings: quizSettings
            }));
        }

        if (pdfFile) {
            formData.append('pdf_file', pdfFile);
        }

        try {
            if (editingMaterial) {
                await updateMaterial(editingMaterial.id, formData);
                alert('Materi diperbarui');
            } else {
                await createMaterial(formData);
                alert('Materi ditambahkan');
            }
            resetForm();
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan materi. Periksa kembali input Anda.');
        } finally {
            setSubmitting(false);
        }
    };

    // Quiz functions
    const addQuestion = () => {
        setQuizQuestions([...quizQuestions, {
            id: Date.now(),
            question: '',
            options: ['', '', '', ''],
            correct_index: 0
        }]);
    };

    const removeQuestion = (qId) => {
        setQuizQuestions(quizQuestions.filter(q => q.id !== qId));
    };

    const updateQuestion = (qId, field, value) => {
        setQuizQuestions(quizQuestions.map(q => q.id === qId ? { ...q, [field]: value } : q));
    };

    const updateOption = (qId, optIndex, value) => {
        setQuizQuestions(quizQuestions.map(q => {
            if (q.id === qId) {
                const newOptions = [...q.options];
                newOptions[optIndex] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    // Rich Text simple editor logic
    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        if (contentRef.current) {
            setContentText(contentRef.current.innerHTML);
        }
    };

    const getYTID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    if (loading) {
        return (
            <div className="body flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Kelola Materi - {course?.title}</title>
            </Helmet>

            <Header />

            <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
                <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <button onClick={() => navigate('/dashboard/ecourses')} className="hover:text-green-700 transition">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h1 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Manajemen Materi</h1>
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-6">{course?.title}</h2>

                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-700">Daftar Materi ({materials.length})</h3>
                    {!showForm && (
                        <button
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="bg-green-700 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition transform hover:scale-105"
                        >
                            <span className="material-icons text-sm mr-2">add</span>
                            Tambah Materi
                        </button>
                    )}
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-10 space-y-6 animate-slide-up">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-lg font-black text-green-800">{editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}</h4>
                            <button type="button" onClick={resetForm} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-400">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Tipe Materi *</label>
                                <select 
                                    value={materialType}
                                    onChange={(e) => setMaterialType(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 transition outline-none"
                                >
                                    <option value="video">Video (YouTube)</option>
                                    <option value="text">Penjabaran Materi (Teks/Gambar)</option>
                                    <option value="quiz">Kuis (Pilihan Ganda)</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Urutan</label>
                                <input
                                    type="number"
                                    value={order}
                                    onChange={(e) => setOrder(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 transition outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Judul Materi *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 transition outline-none"
                                placeholder="Contoh: Pengenalan Dasar Tools"
                                required
                            />
                        </div>

                        {/* Video Fields */}
                        {materialType === 'video' && (
                            <div className="animate-fade-in">
                                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Link YouTube *</label>
                                <input
                                    type="url"
                                    value={youtubeLink}
                                    onChange={(e) => setYoutubeLink(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 transition outline-none"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    required={materialType === 'video'}
                                />
                                {getYTID(youtubeLink) && (
                                    <div className="mt-3 aspect-video rounded-2xl overflow-hidden bg-black relative border-4 border-white shadow-lg">
                                        <img src={`https://img.youtube.com/vi/${getYTID(youtubeLink)}/maxresdefault.jpg`} alt="Preview" className="w-full h-full object-cover opacity-60" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="material-icons text-white text-6xl">play_circle_filled</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Text Fields */}
                        {materialType === 'text' && (
                            <div className="animate-fade-in space-y-3">
                                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Isi Materi (Rich Text)</label>
                                <div className="border-2 border-gray-100 rounded-3xl overflow-hidden shadow-inner bg-gray-50">
                                    <div className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-gray-100">
                                        <button type="button" onClick={() => execCmd('bold')} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600"><span className="material-icons text-base">format_bold</span></button>
                                        <button type="button" onClick={() => execCmd('italic')} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600"><span className="material-icons text-base">format_italic</span></button>
                                        <button type="button" onClick={() => execCmd('underline')} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600"><span className="material-icons text-base">format_underlined</span></button>
                                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                        <button type="button" onClick={() => execCmd('insertUnorderedList')} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600"><span className="material-icons text-base">format_list_bulleted</span></button>
                                        <button type="button" onClick={() => execCmd('insertOrderedList')} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600"><span className="material-icons text-base">format_list_numbered</span></button>
                                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                        <button type="button" onClick={() => {
                                            const url = prompt('Masukkan URL gambar:');
                                            if (url) execCmd('insertImage', url);
                                        }} className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-600"><span className="material-icons text-base">image</span></button>
                                    </div>
                                    <div
                                        ref={contentRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => setContentText(e.target.innerHTML)}
                                        dangerouslySetInnerHTML={{ __html: contentText }}
                                        className="min-h-[300px] p-6 outline-none bg-transparent prose max-w-none text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Quiz Builder */}
                        {materialType === 'quiz' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Daftar Pertanyaan Kuis</label>
                                    <button 
                                        type="button" 
                                        onClick={addQuestion}
                                        className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl hover:bg-green-100 transition flex items-center gap-1"
                                    >
                                        <span className="material-icons text-sm">add_circle</span> Tambah Soal
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {quizQuestions.map((q, qIndex) => (
                                        <div key={q.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-100 relative">
                                            <button 
                                                type="button" 
                                                onClick={() => removeQuestion(q.id)}
                                                className="absolute top-4 right-4 text-gray-300 hover:text-red-500"
                                            >
                                                <span className="material-icons text-sm">delete</span>
                                            </button>
                                            <div className="mb-4 pr-8">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Soal {qIndex + 1}</span>
                                                <input 
                                                    type="text" 
                                                    value={q.question}
                                                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                                                    className="w-full bg-transparent border-b-2 border-gray-200 py-2 outline-none focus:border-green-500 font-bold text-sm"
                                                    placeholder="Tuliskan pertanyaan di sini..."
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex} className="flex items-center gap-2">
                                                        <input 
                                                            type="radio" 
                                                            name={`correct_${q.id}`} 
                                                            checked={q.correct_index === optIndex}
                                                            onChange={() => updateQuestion(q.id, 'correct_index', optIndex)}
                                                            className="accent-green-600"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={opt}
                                                            onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                                                            className={`flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-green-500 ${q.correct_index === optIndex ? 'border-green-500 bg-green-50/30' : ''}`}
                                                            placeholder={`Pilihan ${String.fromCharCode(65 + optIndex)}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {quizQuestions.length === 0 && (
                                        <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                            <p className="text-xs text-gray-400 font-bold italic">Belum ada soal kuis.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-green-50/50 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border border-green-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-green-800">Izinkan Reset Kuis</span>
                                        <input 
                                            type="checkbox" 
                                            checked={quizSettings.allow_reset}
                                            onChange={(e) => setQuizSettings({...quizSettings, allow_reset: e.target.checked})}
                                            className="w-5 h-5 accent-green-600"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-green-800">Tampilkan Jawaban Benar</span>
                                        <input 
                                            type="checkbox" 
                                            checked={quizSettings.show_correct_answers}
                                            onChange={(e) => setQuizSettings({...quizSettings, show_correct_answers: e.target.checked})}
                                            className="w-5 h-5 accent-green-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-gray-50 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">File Lampiran (PDF)</label>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-green-300 transition-all group">
                                    <span className="material-icons text-gray-300 group-hover:text-green-500 transition">upload_file</span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file && file.size > 10 * 1024 * 1024) {
                                                alert('File terlalu besar. Maksimal 10MB.');
                                                e.target.value = null;
                                            } else {
                                                setPdfFile(file);
                                            }
                                        }}
                                        className="flex-1 text-xs text-gray-500 file:hidden"
                                    />
                                    {pdfFile && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg">TERPILIH</span>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">Instruksi Singkat (Opsional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows="2"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:border-green-500 transition outline-none"
                                    placeholder="Rangkuman singkat materi..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-green-700 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-green-100 hover:bg-green-800 transition transform active:scale-95 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        MENYIMPAN...
                                    </span>
                                ) : (editingMaterial ? 'SIMPAN PERUBAHAN' : 'TAMBAHKAN MATERI SEKARANG')}
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {[...materials].sort((a, b) => a.order - b.order).map((mat, index) => (
                        <div key={mat.id} className="group bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-100 transition-all flex items-start gap-4">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-green-700 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-black text-gray-900 text-sm leading-tight truncate">{mat.title}</h4>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter
                                        ${mat.material_type === 'quiz' ? 'bg-purple-100 text-purple-700' : 
                                          mat.material_type === 'text' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {mat.material_type || 'video'}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    {mat.pdf_file && (
                                        <span className="text-[9px] text-red-500 flex items-center gap-0.5 font-bold">
                                            <span className="material-icons text-xs">picture_as_pdf</span> PDF
                                        </span>
                                    )}
                                    <span className="text-[9px] text-gray-400 flex items-center gap-0.5 font-medium">
                                        <span className="material-icons text-xs">reorder</span> Urutan: {mat.order}
                                    </span>
                                </div>
                                {mat.description && <p className="text-[10px] text-gray-400 mt-2 line-clamp-1 italic font-medium">"{mat.description}"</p>}
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(mat)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    title="Edit Materi"
                                >
                                    <span className="material-icons text-base">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(mat.id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    title="Hapus Materi"
                                >
                                    <span className="material-icons text-base">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {materials.length === 0 && !showForm && (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-gray-50">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons text-5xl text-gray-200">auto_stories</span>
                            </div>
                            <h3 className="text-lg font-black text-gray-800">Kurikulum Kosong</h3>
                            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">Klik tombol "Tambah Materi" untuk mulai menyusun kurikulum pembelajaran Anda.</p>
                        </div>
                    )}
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardEcourseMaterialsPage;

