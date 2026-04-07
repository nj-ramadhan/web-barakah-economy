import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ImageCropperModal from '../components/common/ImageCropper';

const API = process.env.REACT_APP_API_BASE_URL;
const getAuth = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return { headers: { Authorization: `Bearer ${user?.access}` } };
};

const DashboardArticleEditorPage = () => {
    const navigate = useNavigate();
    const { slug } = useParams();
    const [loading, setLoading] = useState(!!slug);
    const [saving, setSaving] = useState(false);
    const [articles, setArticles] = useState([]);
    const [showEditor, setShowEditor] = useState(!!slug);
    const contentRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        status: 2, // 2 = Draft (Not Active), 1 = Published (Active)
        date: new Date().toISOString().split('T')[0],
        floating_url: '',
        floating_label: '',
        floating_icon: null,
    });
    const [cropper, setCropper] = useState({ show: false, image: null });

    const fetchArticles = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/articles/my_articles/`, getAuth());
            setArticles(res.data.results || res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) { navigate('/login'); return; }
        fetchArticles();

        if (slug) {
            (async () => {
                try {
                    const res = await axios.get(`${API}/api/articles/${slug}/`, getAuth());
                    setFormData({
                        title: res.data.title || '',
                        content: res.data.content || '',
                        status: res.data.status || 2,
                        date: res.data.date || new Date().toISOString().split('T')[0],
                        floating_url: res.data.floating_url || '',
                        floating_label: res.data.floating_label || '',
                        floating_icon: null,
                    });
                    setShowEditor(true);
                } catch (err) { console.error(err); }
                setLoading(false);
            })();
        }
    }, [navigate, slug, fetchArticles]);

    const handleContentImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await axios.post(`${API}/api/articles/upload_content_image/`, fd, {
                headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = res.data.url;
            const imgTag = `<img src="${imageUrl}" alt="${file.name}" style="max-width:100%;border-radius:8px;margin:1em 0;" />`;
            setFormData(prev => ({ ...prev, content: prev.content + imgTag }));
        } catch (err) {
            alert('Gagal upload gambar');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', formData.title);
            fd.append('content', formData.content);
            fd.append('status', formData.status);
            fd.append('date', formData.date);
            if (formData.floating_url) fd.append('floating_url', formData.floating_url);
            if (formData.floating_label) fd.append('floating_label', formData.floating_label);
            if (formData.floating_icon && formData.floating_icon instanceof File) {
                fd.append('floating_icon', formData.floating_icon);
            }

            if (slug) {
                await axios.put(`${API}/api/articles/${slug}/`, fd, {
                    headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' }
                });
                alert('Artikel berhasil diperbarui');
            } else {
                await axios.post(`${API}/api/articles/`, fd, {
                    headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' }
                });
                alert('Artikel berhasil dibuat');
            }
            setShowEditor(false);
            setFormData({ title: '', content: '', status: 2, date: new Date().toISOString().split('T')[0], floating_url: '', floating_label: '', floating_icon: null });
            fetchArticles();
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan artikel');
        }
        setSaving(false);
    };

    // Simple exec commands for rich text
    const execCmd = (command, value = null) => {
        document.execCommand(command, false, value);
        contentRef.current?.focus();
        // Sync contentEditable back to state
        if (contentRef.current) {
            setFormData(prev => ({ ...prev, content: contentRef.current.innerHTML }));
        }
    };

    const handleContentBlur = () => {
        if (contentRef.current) {
            setFormData(prev => ({ ...prev, content: contentRef.current.innerHTML }));
        }
    };

    const ArticleSkeleton = () => (
        <div className="grid gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                        </div>
                        <div className="h-3 bg-gray-100 rounded w-24 mb-3"></div>
                        <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
                        <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Artikel - BAE</title></Helmet>
            <Header />

            <div className="max-w-5xl mx-auto px-4 py-6 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => showEditor ? setShowEditor(false) : navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-green-700 transition">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">{showEditor ? (slug ? 'Edit Artikel' : 'Tulis Artikel Baru') : 'Artikel Saya'}</h1>
                    </div>
                    {!showEditor && (
                        <button onClick={() => setShowEditor(true)} className="bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-100 hover:bg-green-800 transition">
                            <span className="material-icons text-sm">edit</span> Tulis Artikel
                        </button>
                    )}
                </div>

                {/* ============ ARTICLE LIST ============ */}
                {!showEditor && (
                    <div>
                        {loading ? (
                            <ArticleSkeleton />
                        ) : articles.length === 0 ? (
                            <div className="text-center py-20">
                                <span className="material-icons text-6xl text-gray-300">article</span>
                                <p className="text-gray-500 mt-4 font-medium">Belum ada artikel</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {articles.map(a => (
                                    <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/dashboard/articles/${a.slug}`)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start sm:items-center justify-between gap-2 overflow-hidden">
                                                <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate flex-1 min-w-0" title={a.title}>{a.title}</h3>
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${a.status === 1 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                                    {a.status === 1 ? 'Published' : 'Draft'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{a.date}</p>
                                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.content?.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ============ EDITOR ============ */}
                {showEditor && (
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Title */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <input type="text" required placeholder="Judul Artikel..." value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full text-2xl font-bold outline-none border-none placeholder-gray-300 text-gray-900" />
                            <div className="flex gap-3 mt-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">Tanggal</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: parseInt(e.target.value)})}
                                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none">
                                        <option value="2">Draft</option>
                                        <option value="1">Published</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Toolbar + Content */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50">
                                {[
                                    { cmd: 'bold', icon: 'format_bold' },
                                    { cmd: 'italic', icon: 'format_italic' },
                                    { cmd: 'underline', icon: 'format_underlined' },
                                    { cmd: 'strikeThrough', icon: 'strikethrough_s' },
                                ].map(b => (
                                    <button key={b.cmd} type="button" onClick={() => execCmd(b.cmd)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 transition">
                                        <span className="material-icons text-lg">{b.icon}</span>
                                    </button>
                                ))}
                                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                <button type="button" onClick={() => execCmd('formatBlock', '<h2>')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 text-xs font-bold transition" title="Heading">H2</button>
                                <button type="button" onClick={() => execCmd('formatBlock', '<h3>')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 text-xs font-bold transition" title="Subheading">H3</button>
                                <button type="button" onClick={() => execCmd('formatBlock', '<p>')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 text-xs font-bold transition" title="Paragraph">P</button>
                                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                <button type="button" onClick={() => execCmd('insertUnorderedList')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 transition" title="Bulleted list">
                                    <span className="material-icons text-lg">format_list_bulleted</span>
                                </button>
                                <button type="button" onClick={() => execCmd('insertOrderedList')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 transition" title="Numbered list">
                                    <span className="material-icons text-lg">format_list_numbered</span>
                                </button>
                                <button type="button" onClick={() => {
                                    const url = prompt('Masukkan URL link:');
                                    if (url) execCmd('createLink', url);
                                }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 transition" title="Insert link">
                                    <span className="material-icons text-lg">link</span>
                                </button>
                                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                <label className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 transition cursor-pointer" title="Upload gambar">
                                    <span className="material-icons text-lg">image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleContentImageUpload} />
                                </label>
                                <button type="button" onClick={() => execCmd('justifyLeft')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 transition">
                                    <span className="material-icons text-lg">format_align_left</span>
                                </button>
                                <button type="button" onClick={() => execCmd('justifyCenter')} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 transition">
                                    <span className="material-icons text-lg">format_align_center</span>
                                </button>
                            </div>

                            {/* Editable area */}
                            <div
                                ref={contentRef}
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={handleContentBlur}
                                dangerouslySetInnerHTML={{ __html: formData.content }}
                                className="min-h-[400px] px-8 py-6 text-gray-800 outline-none text-base leading-relaxed prose max-w-none focus:bg-white"
                                style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                            />
                        </div>

                        {/* Floating Bubble Settings */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="material-icons text-sm text-green-600">bubble_chart</span>
                                Floating Bubble (Opsional)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">URL</label>
                                    <input type="text" value={formData.floating_url} onChange={e => setFormData({...formData, floating_url: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="https://..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">Label</label>
                                    <input type="text" value={formData.floating_label} onChange={e => setFormData({...formData, floating_label: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Baca Selengkapnya" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase">Icon</label>
                                    <div className="relative">
                                        <input type="file" accept="image/*" id="floating_icon" className="hidden" 
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => setCropper({ show: true, image: reader.result });
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                        <label htmlFor="floating_icon" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition truncate">
                                            <span className="material-icons text-green-700 text-sm">image</span>
                                            {formData.floating_icon ? (formData.floating_icon.name || 'Ganti Icon') : 'Unggah Icon...'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setShowEditor(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition">Batal</button>
                            <button type="submit" disabled={saving} className="bg-green-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition disabled:opacity-50">
                                {saving ? 'Menyimpan...' : 'Simpan Artikel'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
            <ImageCropperModal
                show={cropper.show}
                image={cropper.image}
                onClose={() => setCropper({ show: false, image: null })}
                onCropComplete={(croppedFile) => {
                    setFormData({ ...formData, floating_icon: croppedFile });
                    setCropper({ show: false, image: null });
                }}
                aspectRatio={1}
                title="Crop Icon Floating"
            />
            <NavigationButton />
        </div>
    );
};

export default DashboardArticleEditorPage;
