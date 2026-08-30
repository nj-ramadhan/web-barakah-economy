import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import ImageCropperModal from '../../components/common/ImageCropper';
import siteContentService from '../../services/siteContent';

const TAG_OPTIONS = [
    { value: 'fitur_baru', label: 'Fitur Baru', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: 'auto_awesome' },
    { value: 'peningkatan', label: 'Peningkatan & Optimasi', bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: 'trending_up' },
    { value: 'perbaikan', label: 'Perbaikan Bug', bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: 'build' },
    { value: 'pengumuman', label: 'Pengumuman Penting', bg: 'bg-purple-100 text-purple-800 border-purple-300', icon: 'campaign' },
    { value: 'promo', label: 'Event & Promo', bg: 'bg-rose-100 text-rose-800 border-rose-300', icon: 'local_offer' },
];

const SUGGESTION_CATEGORIES = [
    { value: 'fitur_baru', label: 'Fitur Baru' },
    { value: 'peningkatan', label: 'Peningkatan UI/UX' },
    { value: 'keamanan', label: 'Keamanan & Autentikasi' },
    { value: 'perbaikan', label: 'Perbaikan Bug' },
    { value: 'sistem', label: 'Infrastruktur & Sistem' },
];

const DashboardWhatsNewPage = () => {
    const navigate = useNavigate();
    const [activeMainTab, setActiveMainTab] = useState('whats_new'); // 'whats_new' | 'suggestions'
    const [items, setItems] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState('all');
    const [suggestionFilter, setSuggestionFilter] = useState('all'); // 'all' | 'unused' | 'used'
    
    const [showModal, setShowModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showNewSuggestionModal, setShowNewSuggestionModal] = useState(false);
    const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

    const initialForm = {
        id: null,
        title: '',
        version: '',
        tag: 'fitur_baru',
        badge_label: '',
        cover_image: null,
        cover_image_preview: null,
        summary: '',
        content_type: 'bullet_list', // default to bullet_list for easy suggestions
        content_html: '',
        bullet_items: [''],
        action_button_text: '',
        action_button_url: '',
        is_published: true,
        is_popup_on_login: true,
        release_date: new Date().toISOString().split('T')[0],
        selected_suggestion_ids: [],
    };

    const [formData, setFormData] = useState(initialForm);
    const [newSuggestionForm, setNewSuggestionForm] = useState({
        title: '',
        description: '',
        category: 'fitur_baru'
    });
    const [previewItem, setPreviewItem] = useState(null);
    const [cropper, setCropper] = useState({ active: false, image: null });

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [wnRes, sugRes] = await Promise.all([
                siteContentService.getWhatsNew(),
                siteContentService.getWhatsNewSuggestions()
            ]);
            const rawWn = wnRes.data?.results || (Array.isArray(wnRes.data) ? wnRes.data : []);
            const rawSug = sugRes.data?.results || (Array.isArray(sugRes.data) ? sugRes.data : []);
            setItems(rawWn);
            setSuggestions(rawSug);
        } catch (err) {
            console.error('Failed to load Whats New data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestionsOnly = async () => {
        setLoadingSuggestions(true);
        try {
            const sugRes = await siteContentService.getWhatsNewSuggestions();
            const rawSug = sugRes.data?.results || (Array.isArray(sugRes.data) ? sugRes.data : []);
            setSuggestions(rawSug);
        } catch (err) {
            console.error('Failed to load suggestions:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleOpenCreate = () => {
        setFormData(initialForm);
        setShowModal(true);
    };

    const handleOpenEdit = (item) => {
        setFormData({
            id: item.id,
            title: item.title || '',
            version: item.version || '',
            tag: item.tag || 'fitur_baru',
            badge_label: item.badge_label || '',
            cover_image: null,
            cover_image_preview: item.cover_image || null,
            summary: item.summary || '',
            content_type: item.content_type || 'bullet_list',
            content_html: item.content_html || '',
            bullet_items: Array.isArray(item.bullet_items) && item.bullet_items.length > 0 ? item.bullet_items : [''],
            action_button_text: item.action_button_text || '',
            action_button_url: item.action_button_url || '',
            is_published: !!item.is_published,
            is_popup_on_login: !!item.is_popup_on_login,
            release_date: item.release_date || new Date().toISOString().split('T')[0],
            selected_suggestion_ids: [],
        });
        setShowModal(true);
    };

    const handleOpenPreview = (item = null) => {
        const itemToPreview = item || formData;
        setPreviewItem(itemToPreview);
        setShowPreviewModal(true);
    };

    // Suggestion integration into form
    const handleToggleSelectSuggestion = (sug) => {
        const isSelected = formData.selected_suggestion_ids.includes(sug.id);
        const itemText = sug.description ? `${sug.title} — ${sug.description}` : sug.title;

        if (isSelected) {
            // Remove from selection
            setFormData(prev => ({
                ...prev,
                selected_suggestion_ids: prev.selected_suggestion_ids.filter(id => id !== sug.id),
                bullet_items: prev.bullet_items.filter(b => b !== itemText && b !== sug.title)
            }));
        } else {
            // Add to selection
            setFormData(prev => {
                const currentBullets = prev.bullet_items.filter(b => b && b.trim());
                return {
                    ...prev,
                    selected_suggestion_ids: [...prev.selected_suggestion_ids, sug.id],
                    bullet_items: [...currentBullets, itemText],
                    // Also append to rich text if in rich_text mode
                    content_html: prev.content_type === 'rich_text' 
                        ? `${prev.content_html ? prev.content_html + '\n\n' : ''}• **${sug.title}**: ${sug.description}`
                        : prev.content_html
                };
            });
        }
    };

    // Bullet Items management
    const handleAddBulletItem = () => {
        setFormData(prev => ({
            ...prev,
            bullet_items: [...prev.bullet_items, '']
        }));
    };

    const handleBulletChange = (index, value) => {
        setFormData(prev => {
            const updated = [...prev.bullet_items];
            updated[index] = value;
            return { ...prev, bullet_items: updated };
        });
    };

    const handleRemoveBullet = (index) => {
        setFormData(prev => ({
            ...prev,
            bullet_items: prev.bullet_items.filter((_, i) => i !== index)
        }));
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setCropper({ active: true, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCroppedImage = (croppedBlob) => {
        const file = new File([croppedBlob], `whats_new_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFormData(prev => ({
            ...prev,
            cover_image: file,
            cover_image_preview: URL.createObjectURL(croppedBlob)
        }));
        setCropper({ active: false, image: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert('Judul What\'s New harus diisi.');
            return;
        }

        setSaving(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('version', formData.version || '');
        data.append('tag', formData.tag);
        data.append('badge_label', formData.badge_label || '');
        data.append('summary', formData.summary || '');
        data.append('content_type', formData.content_type);
        data.append('content_html', formData.content_html || '');
        data.append('release_date', formData.release_date);
        data.append('action_button_text', formData.action_button_text || '');
        data.append('action_button_url', formData.action_button_url || '');
        data.append('is_published', formData.is_published ? 'true' : 'false');
        data.append('is_popup_on_login', formData.is_popup_on_login ? 'true' : 'false');

        // Filter empty bullets
        const cleanBullets = formData.bullet_items.filter(b => b && b.trim());
        data.append('bullet_items', JSON.stringify(cleanBullets));

        if (formData.cover_image instanceof File) {
            data.append('cover_image', formData.cover_image);
        }

        try {
            if (formData.id) {
                await siteContentService.updateWhatsNew(formData.id, data);
            } else {
                await siteContentService.createWhatsNew(data);
            }

            // Mark selected suggestions as used
            if (formData.selected_suggestion_ids.length > 0) {
                await siteContentService.bulkMarkSuggestionsUsed({
                    ids: formData.selected_suggestion_ids,
                    is_used: true,
                    version: formData.version || formData.title
                });
            }

            setShowModal(false);
            fetchAllData();
            alert(`Berhasil ${formData.id ? 'memperbarui' : 'menambahkan'} What's New!`);
        } catch (err) {
            console.error('Failed to save Whats New:', err);
            alert('Gagal menyimpan What\'s New. Periksa isian form.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Yakin ingin menghapus update "${title}"?`)) return;
        try {
            await siteContentService.deleteWhatsNew(id);
            fetchAllData();
        } catch (err) {
            alert('Gagal menghapus item.');
        }
    };

    const handleTogglePublished = async (item) => {
        try {
            const data = new FormData();
            data.append('is_published', (!item.is_published).toString());
            await siteContentService.updateWhatsNew(item.id, data);
            fetchAllData();
        } catch (err) {
            alert('Gagal mengubah status publikasi.');
        }
    };

    // Toggle suggestion used status
    const handleToggleSuggestionUsed = async (sug) => {
        try {
            await siteContentService.toggleSuggestionUsed(sug.id, {
                version: sug.is_used ? null : 'Rilis Manual'
            });
            fetchSuggestionsOnly();
        } catch (err) {
            alert('Gagal mengubah status saran.');
        }
    };

    const handleCreateNewSuggestion = async (e) => {
        e.preventDefault();
        if (!newSuggestionForm.title.trim()) return;

        try {
            await siteContentService.createWhatsNewSuggestion(newSuggestionForm);
            setNewSuggestionForm({ title: '', description: '', category: 'fitur_baru' });
            setShowNewSuggestionModal(false);
            fetchSuggestionsOnly();
            alert('Saran fitur berhasil dicatat ke dalam log pool!');
        } catch (err) {
            alert('Gagal menambahkan saran fitur.');
        }
    };

    const handleDeleteSuggestion = async (id, title) => {
        if (!window.confirm(`Hapus catatan fitur "${title}"?`)) return;
        try {
            await siteContentService.deleteWhatsNewSuggestion(id);
            fetchSuggestionsOnly();
        } catch (err) {
            alert('Gagal menghapus catatan fitur.');
        }
    };

    const filteredItems = items.filter(item => {
        if (selectedTagFilter !== 'all' && item.tag !== selectedTagFilter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (item.title || '').toLowerCase().includes(q) ||
            (item.version || '').toLowerCase().includes(q) ||
            (item.summary || '').toLowerCase().includes(q)
        );
    });

    const filteredSuggestions = suggestions.filter(sug => {
        if (suggestionFilter === 'unused' && sug.is_used) return false;
        if (suggestionFilter === 'used' && !sug.is_used) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (sug.title || '').toLowerCase().includes(q) ||
            (sug.description || '').toLowerCase().includes(q) ||
            (sug.used_in_version || '').toLowerCase().includes(q)
        );
    });

    const getTagInfo = (tagVal) => {
        return TAG_OPTIONS.find(t => t.value === tagVal) || TAG_OPTIONS[0];
    };

    const unusedSuggestionsCount = suggestions.filter(s => !s.is_used).length;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
            <Header onSearch={setSearchQuery} />

            <div className="max-w-6xl mx-auto w-full px-4 py-6">
                {/* Breadcrumbs & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <span className="cursor-pointer hover:underline" onClick={() => navigate('/dashboard/admin')}>Dashboard</span>
                            <span>/</span>
                            <span className="font-bold text-gray-700">What's New & Changelog</span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <span className="material-icons text-emerald-600">auto_awesome</span>
                            Kelola What's New & Log Fitur Sistem
                        </h1>
                        <p className="text-xs text-gray-500">
                            Publikasikan rilis fitur baru, changelog sistem, dan kelola saran pembaruan otomatis
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/whats-new')}
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                        >
                            <span className="material-icons text-sm">visibility</span>
                            <span>Lihat Laman Publik</span>
                        </button>
                        <button
                            onClick={handleOpenCreate}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-700/20"
                        >
                            <span className="material-icons text-sm">add_circle</span>
                            <span>Buat What's New</span>
                        </button>
                    </div>
                </div>

                {/* Main Navigation Tabs */}
                <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs mb-6 gap-1">
                    <button
                        onClick={() => setActiveMainTab('whats_new')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                            activeMainTab === 'whats_new'
                                ? 'bg-emerald-700 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <span className="material-icons text-sm">newspaper</span>
                        <span>Daftar Rilis What's New ({items.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveMainTab('suggestions')}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 relative ${
                            activeMainTab === 'suggestions'
                                ? 'bg-emerald-700 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <span className="material-icons text-sm">lightbulb</span>
                        <span>Log & Saran Fitur Sistem</span>
                        {unusedSuggestionsCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-xs animate-pulse">
                                {unusedSuggestionsCount} Belum Dirilis
                            </span>
                        )}
                    </button>
                </div>

                {/* TAB 1: WHAT'S NEW RELEASES */}
                {activeMainTab === 'whats_new' && (
                    <>
                        {/* Filters & Search */}
                        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                                <button
                                    onClick={() => setSelectedTagFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                        selectedTagFilter === 'all' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Semua ({items.length})
                                </button>
                                {TAG_OPTIONS.map(opt => {
                                    const count = items.filter(i => i.tag === opt.value).length;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setSelectedTagFilter(opt.value)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
                                                selectedTagFilter === opt.value ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            <span className="material-icons text-xs">{opt.icon}</span>
                                            <span>{opt.label} ({count})</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="relative w-full sm:w-64">
                                <span className="material-icons absolute left-3 top-2.5 text-xs text-gray-400">search</span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari judul / versi..."
                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs border border-gray-200 focus:outline-none focus:border-emerald-600 transition"
                                />
                            </div>
                        </div>

                        {/* Items Grid */}
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                                <span className="material-icons text-5xl text-gray-300 mb-2">auto_awesome</span>
                                <h3 className="text-base font-bold text-gray-700">Belum Ada Update What's New</h3>
                                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                                    Mulai umumkan fitur terbaru, peningkatan layanan, atau perbaikan sistem kepada para pengguna.
                                </p>
                                <button
                                    onClick={handleOpenCreate}
                                    className="bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-800 transition"
                                >
                                    + Tambah Update Baru
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredItems.map(item => {
                                    const tagInfo = getTagInfo(item.tag);
                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition duration-200 group"
                                        >
                                            {/* Cover Image */}
                                            <div className="relative h-44 bg-gradient-to-br from-emerald-800 to-teal-900 overflow-hidden">
                                                {item.cover_image ? (
                                                    <img
                                                        src={item.cover_image}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/40 p-4 text-center">
                                                        <span className="material-icons text-4xl mb-1">auto_awesome</span>
                                                        <span className="text-[11px] font-semibold">Barakah What's New</span>
                                                    </div>
                                                )}

                                                {/* Badges on top of image */}
                                                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                                    {item.version && (
                                                        <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-white/20">
                                                            {item.version}
                                                        </span>
                                                    )}
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${tagInfo.bg}`}>
                                                        {item.badge_label || tagInfo.label}
                                                    </span>
                                                </div>

                                                {/* Status indicator badge */}
                                                <div className="absolute top-3 right-3 flex items-center gap-1">
                                                    {item.is_popup_on_login && (
                                                        <span className="bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs" title="Muncul sebagai popup pada halaman utama">
                                                            Popup
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleTogglePublished(item)}
                                                        className={`text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs transition ${
                                                            item.is_published ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-white'
                                                        }`}
                                                    >
                                                        {item.is_published ? 'Publik' : 'Draft'}
                                                    </button>
                                                </div>

                                                <div className="absolute bottom-2 right-3 text-[10px] text-white/90 font-bold drop-shadow-md">
                                                    {item.release_date}
                                                </div>
                                            </div>

                                            {/* Content Body */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1 group-hover:text-emerald-700 transition">
                                                    {item.title}
                                                </h3>

                                                {item.summary && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                                        {item.summary}
                                                    </p>
                                                )}

                                                {/* Content type preview pill */}
                                                <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                                                    <span className="flex items-center gap-1 font-semibold">
                                                        <span className="material-icons text-xs">
                                                            {item.content_type === 'bullet_list' ? 'format_list_bulleted' : 'article'}
                                                        </span>
                                                        <span>{item.content_type === 'bullet_list' ? `${item.bullet_items?.length || 0} Poin Update` : 'Deskriptif Rich Text'}</span>
                                                    </span>

                                                    {item.action_button_text && (
                                                        <span className="text-emerald-700 font-bold truncate max-w-[120px]">
                                                            CTA: {item.action_button_text}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-1.5">
                                                    <button
                                                        onClick={() => handleOpenPreview(item)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1 transition"
                                                    >
                                                        <span className="material-icons text-xs">visibility</span>
                                                        <span>Preview</span>
                                                    </button>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleOpenEdit(item)}
                                                            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition"
                                                            title="Edit"
                                                        >
                                                            <span className="material-icons text-xs">edit</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id, item.title)}
                                                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition"
                                                            title="Hapus"
                                                        >
                                                            <span className="material-icons text-xs">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* TAB 2: SYSTEM FEATURE SUGGESTIONS POOL */}
                {activeMainTab === 'suggestions' && (
                    <div className="space-y-4">
                        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                    <span className="material-icons">lightbulb</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-emerald-950">Log Riwayat & Saran Pembaruan Fitur</h3>
                                    <p className="text-xs text-emerald-700">
                                        Poin fitur baru otomatis tercatat di sini. Anda dapat mencentangnya saat membuat rilis What's New tanpa perlu mengetik ulang.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowNewSuggestionModal(true)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm"
                            >
                                <span className="material-icons text-xs">add</span>
                                <span>Tambah Log Fitur</span>
                            </button>
                        </div>

                        {/* Filter Tabs for Suggestions */}
                        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200">
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setSuggestionFilter('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                        suggestionFilter === 'all' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Semua ({suggestions.length})
                                </button>
                                <button
                                    onClick={() => setSuggestionFilter('unused')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                        suggestionFilter === 'unused' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    <span>Belum Dipakai</span>
                                    <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                                        {unusedSuggestionsCount}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setSuggestionFilter('used')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                        suggestionFilter === 'used' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    Sudah Pernah Dirilis ({suggestions.filter(s => s.is_used).length})
                                </button>
                            </div>

                            <button
                                onClick={handleOpenCreate}
                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                            >
                                <span className="material-icons text-xs">auto_awesome</span>
                                <span>Buat What's New dari Saran</span>
                            </button>
                        </div>

                        {/* Suggestion Cards List */}
                        {loadingSuggestions ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                        ) : filteredSuggestions.length === 0 ? (
                            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 text-gray-400 text-xs">
                                Tidak ada catatan fitur dalam kategori ini.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {filteredSuggestions.map((sug) => (
                                    <div
                                        key={sug.id}
                                        className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                                            sug.is_used
                                                ? 'bg-gray-50/90 border-gray-200 text-gray-600'
                                                : 'bg-white border-emerald-200/80 shadow-xs hover:border-emerald-400'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                                                    {sug.category_display || sug.category}
                                                </span>

                                                {/* Used vs Unused Status Badge */}
                                                <button
                                                    onClick={() => handleToggleSuggestionUsed(sug)}
                                                    title="Klik untuk ubah status penggunaan"
                                                    className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                                                        sug.is_used 
                                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                                    }`}
                                                >
                                                    <span className="material-icons text-[10px]">
                                                        {sug.is_used ? 'check_circle' : 'pending'}
                                                    </span>
                                                    <span>{sug.is_used ? (sug.used_in_version ? `Dirilis pada: ${sug.used_in_version}` : 'Sudah Dirilis') : 'Belum Pernah Dirilis'}</span>
                                                </button>
                                            </div>

                                            <h4 className="font-bold text-xs text-gray-900 mb-1">
                                                {sug.title}
                                            </h4>

                                            {sug.description && (
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    {sug.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                                            <span>Ditambahkan: {new Date(sug.created_at).toLocaleDateString('id-ID')}</span>
                                            <button
                                                onClick={() => handleDeleteSuggestion(sug.id, sug.title)}
                                                className="text-red-500 hover:text-red-700 font-bold"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Form Create/Edit What's New (with Suggestion Picker) */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1000] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-6 max-h-[92vh] flex flex-col animate-scale-up">
                        {/* Modal Header */}
                        <div className="bg-emerald-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-xl">auto_awesome</span>
                                <div>
                                    <h3 className="font-bold text-sm">
                                        {formData.id ? 'Edit What\'s New' : 'Buat What\'s New Baru'}
                                    </h3>
                                    <p className="text-[10px] text-emerald-100">Lengkapi informasi pembaruan fitur atau pilih dari log saran sistem</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenPreview()}
                                    className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                                >
                                    <span className="material-icons text-xs">visibility</span>
                                    <span>Preview</span>
                                </button>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Form Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
                            {/* Feature Suggestions Quick Picker Accordion */}
                            <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/80">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-icons text-amber-600 text-base">lightbulb</span>
                                        <h4 className="font-bold text-amber-900 text-xs">
                                            Saran Pembaruan Fitur Sistem (Centang untuk Masukkan Otomatis):
                                        </h4>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                                        {formData.selected_suggestion_ids.length} dipilih
                                    </span>
                                </div>

                                <p className="text-[10px] text-amber-800/80 mb-2.5">
                                    Centang item di bawah ini untuk langsung menambahkan poin pembaruan ke dalam What's New tanpa harus mengetik ulang:
                                </p>

                                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {suggestions.map((sug) => {
                                        const isChecked = formData.selected_suggestion_ids.includes(sug.id);
                                        return (
                                            <label
                                                key={sug.id}
                                                className={`flex items-start gap-2 p-2 rounded-xl border transition cursor-pointer select-none ${
                                                    isChecked 
                                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold' 
                                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-amber-50/50'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleSelectSuggestion(sug)}
                                                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs truncate">{sug.title}</span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                                                            sug.is_used ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {sug.is_used ? (sug.used_in_version ? `Pernah di ${sug.used_in_version}` : 'Sudah Dirilis') : 'Belum Pernah'}
                                                        </span>
                                                    </div>
                                                    {sug.description && (
                                                        <p className="text-[10px] text-gray-500 font-normal truncate mt-0.5">{sug.description}</p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Row 1: Title & Version */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Judul Pembaruan <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Contoh: Fitur Chat Toko & Konsultasi Pakar"
                                        className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Versi Rilis (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.version}
                                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                        placeholder="Contoh: v2.5.0"
                                        className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Tag & Release Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Kategori / Tag
                                    </label>
                                    <select
                                        value={formData.tag}
                                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                    >
                                        {TAG_OPTIONS.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Custom Badge (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.badge_label}
                                        onChange={(e) => setFormData({ ...formData, badge_label: e.target.value })}
                                        placeholder="Misal: HOT, BARU, STABIL"
                                        className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Tanggal Rilis
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.release_date}
                                        onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                    />
                                </div>
                            </div>

                            {/* Row 3: Cover Image */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Cover Banner / Gambar Ilustrasi
                                </label>
                                <div className="flex items-center gap-3">
                                    {formData.cover_image_preview && (
                                        <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                                            <img
                                                src={formData.cover_image_preview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, cover_image: null, cover_image_preview: null })}
                                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                    <label className="flex-1 border-2 border-dashed border-gray-300 hover:border-emerald-600 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 transition">
                                        <span className="material-icons text-gray-400 text-xl mb-0.5">add_photo_alternate</span>
                                        <span className="text-[11px] font-semibold text-gray-600">Pilih atau Ganti Banner</span>
                                        <span className="text-[9px] text-gray-400">Rekomendasi rasio 16:9 (JPG/PNG)</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Summary */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Ringkasan Singkat (Summary)
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    placeholder="Tulis ringkasan 1-2 kalimat untuk preview..."
                                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                />
                            </div>

                            {/* Content Type Selector */}
                            <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                                <label className="block font-bold text-emerald-900 mb-2">
                                    Format Konten Update:
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, content_type: 'bullet_list' })}
                                        className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                                            formData.content_type === 'bullet_list'
                                                ? 'bg-emerald-700 text-white shadow-sm'
                                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="material-icons text-sm">format_list_bulleted</span>
                                        <span>Daftar Poin (Bullet List)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, content_type: 'rich_text' })}
                                        className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                                            formData.content_type === 'rich_text'
                                                ? 'bg-emerald-700 text-white shadow-sm'
                                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="material-icons text-sm">article</span>
                                        <span>Deskriptif (Rich Text / Artikel)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Content Type Body */}
                            {formData.content_type === 'bullet_list' ? (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="font-bold text-gray-700">
                                            Daftar Poin Perubahan (Bullet Points):
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleAddBulletItem}
                                            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 text-xs"
                                        >
                                            <span className="material-icons text-sm">add_circle</span>
                                            <span>Tambah Baris Manual</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {formData.bullet_items.map((bullet, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={bullet}
                                                    onChange={(e) => handleBulletChange(idx, e.target.value)}
                                                    placeholder={`Poin perubahan #${idx + 1}...`}
                                                    className="flex-1 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                                />
                                                {formData.bullet_items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBullet(idx)}
                                                        className="w-6 h-6 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0 font-bold"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Isi Konten Deskriptif (Mendukung paragraf & teks kaya)
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={formData.content_html}
                                        onChange={(e) => setFormData({ ...formData, content_html: e.target.value })}
                                        placeholder="Tulis penjelasan lengkap mengenai pembaruan fitur ini..."
                                        className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs leading-relaxed"
                                    />
                                </div>
                            )}

                            {/* Row 4: Action Button (CTA) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Teks Tombol Aksi (CTA - Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.action_button_text}
                                        onChange={(e) => setFormData({ ...formData, action_button_text: e.target.value })}
                                        placeholder="Misal: Coba Fitur Chat, Kunjungi Toko"
                                        className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Link URL Tombol Aksi (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.action_button_url}
                                        onChange={(e) => setFormData({ ...formData, action_button_url: e.target.value })}
                                        placeholder="Misal: /chat atau /store"
                                        className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                    />
                                </div>
                            </div>

                            {/* Row 5: Switches / Options */}
                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_published}
                                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="font-bold text-gray-800 text-xs">
                                        Publikasikan Langsung (Tampil di laman publik)
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_popup_on_login}
                                        onChange={(e) => setFormData({ ...formData, is_popup_on_login: e.target.checked })}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <div>
                                        <span className="font-bold text-purple-900 text-xs">
                                            Tampilkan Sebagai Popup Otomatis ke Seluruh Pengunjung & User
                                        </span>
                                        <p className="text-[10px] text-gray-500">
                                            Pengunjung/user yang membuka web atau beranda akan melihat popup pengumuman ini. (Dapat dicentang 'Jangan ingatkan lagi' oleh user).
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="material-icons text-sm">save</span>
                                    )}
                                    <span>{formData.id ? 'Simpan Perubahan' : 'Publikasikan Update'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Add New Suggestion to Pool */}
            {showNewSuggestionModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[1100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-up p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-emerald-600">lightbulb</span>
                                <h3 className="font-bold text-sm text-gray-900">Tambah Catatan / Log Fitur Baru</h3>
                            </div>
                            <button
                                onClick={() => setShowNewSuggestionModal(false)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateNewSuggestion} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Nama / Judul Fitur <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newSuggestionForm.title}
                                    onChange={(e) => setNewSuggestionForm({ ...newSuggestionForm, title: e.target.value })}
                                    placeholder="Contoh: Bilah Chat Terapung Desktop"
                                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Kategori
                                </label>
                                <select
                                    value={newSuggestionForm.category}
                                    onChange={(e) => setNewSuggestionForm({ ...newSuggestionForm, category: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                >
                                    {SUGGESTION_CATEGORIES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Deskripsi Singkat Fitur
                                </label>
                                <textarea
                                    rows={3}
                                    value={newSuggestionForm.description}
                                    onChange={(e) => setNewSuggestionForm({ ...newSuggestionForm, description: e.target.value })}
                                    placeholder="Jelaskan apa yang baru atau ditingkatkan..."
                                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600 focus:bg-white transition text-xs"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewSuggestionModal(false)}
                                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                                >
                                    Simpan Log Fitur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Live Preview Modal */}
            {showPreviewModal && previewItem && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[1100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 text-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden my-6 max-h-[92vh] flex flex-col animate-scale-up">
                        {/* Preview Top Header */}
                        <div className="bg-slate-800 px-5 py-3 flex items-center justify-between border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <span className="material-icons text-emerald-400">preview</span>
                                <div>
                                    <h4 className="font-bold text-xs">Live Preview What's New</h4>
                                    <p className="text-[10px] text-slate-400">Simulasi tampilan nyata untuk pengguna</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Device Switcher */}
                                <div className="bg-slate-950 p-1 rounded-xl flex items-center gap-1 border border-slate-700 text-xs">
                                    <button
                                        onClick={() => setPreviewDevice('desktop')}
                                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                                            previewDevice === 'desktop' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <span className="material-icons text-xs">desktop_windows</span>
                                        <span>Desktop</span>
                                    </button>
                                    <button
                                        onClick={() => setPreviewDevice('mobile')}
                                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                                            previewDevice === 'mobile' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <span className="material-icons text-xs">smartphone</span>
                                        <span>Mobile</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Preview Viewport Container */}
                        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex items-center justify-center custom-scrollbar">
                            <div className={`bg-white text-gray-900 rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 ${
                                previewDevice === 'mobile' ? 'w-full max-w-sm' : 'w-full max-w-2xl'
                            }`}>
                                {/* Cover Image */}
                                <div className="relative h-56 bg-gradient-to-br from-emerald-800 to-teal-900 overflow-hidden">
                                    {(previewItem.cover_image_preview || previewItem.cover_image) ? (
                                        <img
                                            src={previewItem.cover_image_preview || previewItem.cover_image}
                                            alt={previewItem.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-white/40 p-4 text-center">
                                            <span className="material-icons text-5xl mb-1">auto_awesome</span>
                                            <span className="text-xs font-semibold">Barakah Economy Update</span>
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                                        {previewItem.version && (
                                            <span className="bg-black/70 backdrop-blur-md text-white text-xs font-black px-2.5 py-0.5 rounded-lg border border-white/20">
                                                {previewItem.version}
                                            </span>
                                        )}
                                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border ${getTagInfo(previewItem.tag).bg}`}>
                                            {previewItem.badge_label || getTagInfo(previewItem.tag).label}
                                        </span>
                                    </div>

                                    <div className="absolute bottom-3 right-4 text-xs text-white font-bold drop-shadow-md">
                                        {previewItem.release_date}
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="p-6">
                                    <h2 className="text-xl font-black text-gray-900 mb-2 leading-snug">
                                        {previewItem.title || 'Judul What\'s New'}
                                    </h2>

                                    {previewItem.summary && (
                                        <p className="text-sm text-gray-600 mb-4 font-medium leading-relaxed bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
                                            {previewItem.summary}
                                        </p>
                                    )}

                                    {/* Content (Rich Text vs Bullet Points) */}
                                    {previewItem.content_type === 'bullet_list' ? (
                                        <div className="space-y-2.5 my-4">
                                            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                                                Daftar Pembaruan:
                                            </h4>
                                            <div className="space-y-2">
                                                {(previewItem.bullet_items || []).filter(b => b && b.trim()).map((bullet, bIdx) => (
                                                    <div key={bIdx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                                        <span className="material-icons text-emerald-600 text-sm mt-0.5 shrink-0">check_circle</span>
                                                        <span className="text-xs text-gray-800 leading-relaxed">{bullet}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="my-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed space-y-2">
                                            {previewItem.content_html || 'Belum ada konten deskriptif.'}
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    {previewItem.action_button_text && (
                                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                            <button className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-black text-xs shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition">
                                                <span>{previewItem.action_button_text}</span>
                                                <span className="material-icons text-sm">arrow_forward</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Cropper Modal */}
            {cropper.active && (
                <ImageCropperModal
                    imageSrc={cropper.image}
                    aspectRatio={16 / 9}
                    onCropComplete={handleCroppedImage}
                    onClose={() => setCropper({ active: false, image: null })}
                />
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardWhatsNewPage;
