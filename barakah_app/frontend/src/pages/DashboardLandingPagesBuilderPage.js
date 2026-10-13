import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import {
    getLandingPageDetail,
    createLandingPage,
    updateLandingPage,
    getLandingPageQuota
} from '../services/landingPageApi';
import { getMediaUrl } from '../utils/mediaUtils';

const formatIDR = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(num);
};

// Preset Tema
const THEME_OPTIONS = [
    { key: 'emerald', label: 'Barakah Emerald', primary: '#059669', bg: '#f0fdf4', text: '#064e3b', preview: 'bg-emerald-600' },
    { key: 'modern_dark', label: 'Dark Luxury', primary: '#6366f1', bg: '#0f172a', text: '#f8fafc', preview: 'bg-slate-900' },
    { key: 'clean_white', label: 'Clean Minimalist', primary: '#0f172a', bg: '#ffffff', text: '#0f172a', preview: 'bg-white border' },
    { key: 'sunset_amber', label: 'Sunset Amber', primary: '#d97706', bg: '#fffbeb', text: '#78350f', preview: 'bg-amber-600' },
    { key: 'ocean_blue', label: 'Ocean Blue', primary: '#0284c7', bg: '#f0f9ff', text: '#0c4a6e', preview: 'bg-sky-600' },
    { key: 'luxury_gold', label: 'Royal Gold', primary: '#b45309', bg: '#fefce8', text: '#713f12', preview: 'bg-yellow-600' },
    { key: 'rose_elegance', label: 'Rose Elegance', primary: '#e11d48', bg: '#fff1f2', text: '#881337', preview: 'bg-rose-600' },
];

const FONT_OPTIONS = [
    { key: 'poppins', label: 'Poppins (Modern & Bersih)', class: 'font-sans' },
    { key: 'plus-jakarta', label: 'Plus Jakarta Sans (Elegan)', class: 'font-sans' },
    { key: 'inter', label: 'Inter (Teknis & Standar)', class: 'font-sans' },
    { key: 'outfit', label: 'Outfit (Futuristik & Trendy)', class: 'font-sans' },
    { key: 'serif', label: 'Serif (Klasik & Mewah)', class: 'font-serif' },
    { key: 'mono', label: 'Monospace (Unik & Modern)', class: 'font-mono' },
];

// Definisi Blok Standar Landing Page
const AVAILABLE_BLOCKS = [
    { id: 'hero', name: 'Hero Banner & Judul', icon: 'view_headline', desc: 'Banner utama, headline, subheadline & CTA pertama' },
    { id: 'pricing', name: 'Kotak Harga & Promo Coret', icon: 'sell', desc: 'Nominal harga promo, harga coret, badge hemat & countdown' },
    { id: 'cta_button', name: 'Tombol Pesan / WhatsApp', icon: 'touch_app', desc: 'Tombol order langsung ke WhatsApp atau Direct Link' },
    { id: 'features', name: 'Fitur & Keunggulan', icon: 'star', desc: 'Daftar kelebihan produk dalam bentuk grid/kartu' },
    { id: 'gallery', name: 'Galeri Foto / Slider', icon: 'collections', desc: 'Foto produk atau galeri carousel' },
    { id: 'paragraphs', name: 'Narasi Cerita & Paragraf', icon: 'article', desc: 'Copywriting penjelasan masalah & solusi produk' },
    { id: 'testimonials', name: 'Testimoni & Review Pembeli', icon: 'forum', desc: 'Ulasan pelanggan dengan bintang rating & foto' },
    { id: 'faq', name: 'Tanya Jawab (FAQ)', icon: 'quiz', desc: 'Daftar pertanyaan umum dengan accordion' },
    { id: 'trust_badges', name: 'Garansi & Jaminan Kepercayaan', icon: 'verified_user', desc: 'Lencana 100% Original, Garansi, COD, Pengiriman Aman' },
    { id: 'footer', name: 'Footer & Informasi Toko', icon: 'web', desc: 'Informasi penutup dan nama toko' },
];

const DEFAULT_SECTIONS_ORDER = [
    'hero',
    'pricing',
    'cta_button',
    'features',
    'gallery',
    'paragraphs',
    'testimonials',
    'faq',
    'trust_badges',
    'footer'
];

const DashboardLandingPagesBuilderPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    // Mode: editing vs new
    const isEditing = Boolean(slug);

    // Canvas Device View Mode: 'desktop' vs 'mobile' (OrderOnline simulator)
    const [previewMode, setPreviewMode] = useState('mobile');

    // Active Sidebar Tab: 'blocks' | 'design' | 'settings'
    const [sidebarTab, setSidebarTab] = useState('blocks');

    // Selected block to inspect/edit in sidebar
    const [activeBlockId, setActiveBlockId] = useState('hero');

    // Modal Add Block Drawer
    const [showAddBlockModal, setShowAddBlockModal] = useState(false);

    // Loading & Saving states
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    // Section Order for Drag & Drop
    const [sectionsOrder, setSectionsOrder] = useState(DEFAULT_SECTIONS_ORDER);

    // Drag and Drop state
    const [draggedIndex, setDraggedIndex] = useState(null);

    // Form data representing full Landing Page properties
    const [formData, setFormData] = useState({
        title: 'Toko Berkah Utama',
        slug: '',
        tagline: '100% Produk Berkualitas dan Bergaransi Resmi',
        description: 'Dapatkan produk terbaik dengan promo terbatas hari ini. Pelayanan cepat dan amanah.',
        
        // Hero
        hero_headline: 'Solusi Terbaik Kebutuhan Hidup Berkah Anda',
        hero_subheadline: 'Telah dipercaya oleh ribuan pelanggan di seluruh Indonesia dengan garansi kepuasan 100%.',
        badge_text: 'PROMO SPESIAL HARI INI',
        logo: null,
        hero_image: null,
        
        // Pricing & Discounts
        price: '149000',
        slash_price: '299000',
        
        // Call to action
        cta_text: 'Pesan Sekarang via WhatsApp',
        cta_subtext: 'Garansi 100% Uang Kembali Jika Barang Tidak Sesuai',
        cta_type: 'whatsapp',
        cta_link: '',
        whatsapp_number: '',
        whatsapp_message: 'Halo, saya tertarik memesan produk di landing page ini. Mohon info cara pemesanan selengkapnya.',
        secondary_cta_text: 'Konsultasi Gratis',
        secondary_cta_link: '',

        // Styling
        theme: 'emerald',
        layout: 'standard',
        font_family: 'plus-jakarta',
        primary_color: '#059669',
        secondary_color: '#047857',
        background_color: '#f8fafc',
        text_color: '#0f172a',
        button_color: '#059669',
        button_text_color: '#ffffff',

        // Dynamic modules
        carousel_images: [],
        features: [
            { title: 'Kualitas Premium', description: 'Bahan baku terstandar dan lolos uji mutu ketat.', icon: 'verified' },
            { title: 'Pengiriman Cepat', description: 'Dikirim di hari yang sama dengan garansi aman.', icon: 'local_shipping' },
            { title: 'Layanan 24/7', description: 'CS ramah siap membantu konsultasi kapan saja.', icon: 'support_agent' }
        ],
        paragraphs: [
            { headline: 'Mengapa Anda Membutuhkan Produk Ini?', content: 'Seringkali kita kesulitan mencari produk yang benar-benar terpercaya dan memberikan hasil nyata. Produk kami hadir sebagai solusi praktis, dirancang khusus dengan standar kualitas tinggi untuk menjawab kebutuhan Anda.' }
        ],
        testimonials: [
            { name: 'Ahmad Fauzi', review: 'Alhamdulillah barang sampai dengan cepat dan packing rapi. Kualitasnya sangat memuaskan!', rating: 5, avatar: '' },
            { name: 'Siti Rahma', review: 'Pelayanannya sangat ramah dan responsif. Sudah langganan 3 kali di sini selalu puas.', rating: 5, avatar: '' }
        ],
        faq_items: [
            { question: 'Bagaimana cara pemesanan?', answer: 'Klik tombol WhatsApp di halaman ini, kirim pesan otomatis, dan tim kami akan segera memproses order Anda.' },
            { question: 'Berapa lama estimasi pengiriman?', answer: 'Pengiriman untuk area pulau Jawa berkisar 1-3 hari kerja, dan luar Jawa 3-5 hari kerja.' },
            { question: 'Apakah ada garansi jika barang rusak?', answer: 'Tentu saja! Kami memberikan garansi ganti baru 100% jika terjadi cacat atau kerusakan selama pengiriman.' }
        ],

        // Trust badges
        trust_badges: [
            { title: '100% Asli', icon: 'verified' },
            { title: 'Garansi Uang Kembali', icon: 'security' },
            { title: 'Bisa COD', icon: 'payments' },
            { title: 'Pengiriman Cepat', icon: 'bolt' }
        ],

        // Status
        is_published: true
    });

    // Image previews
    const [previewLogo, setPreviewLogo] = useState(null);
    const [previewHero, setPreviewHero] = useState(null);

    // Active accordion in preview
    const [activeFaqIdx, setActiveFaqIdx] = useState(null);

    // Fetch existing data if editing
    useEffect(() => {
        if (!isEditing) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await getLandingPageDetail(slug);
                const data = res.data;
                
                setFormData({
                    title: data.title || '',
                    slug: data.slug || '',
                    tagline: data.tagline || '',
                    description: data.description || '',
                    hero_headline: data.hero_headline || '',
                    hero_subheadline: data.hero_subheadline || '',
                    badge_text: data.badge_text || '',
                    price: String(data.price || 0),
                    slash_price: String(data.slash_price || 0),
                    cta_text: data.cta_text || 'Beli Sekarang',
                    cta_subtext: data.cta_subtext || '',
                    cta_type: data.cta_type || 'whatsapp',
                    cta_link: data.cta_link || '',
                    whatsapp_number: data.whatsapp_number || '',
                    whatsapp_message: data.whatsapp_message || '',
                    secondary_cta_text: data.secondary_cta_text || '',
                    secondary_cta_link: data.secondary_cta_link || '',
                    theme: data.theme || 'emerald',
                    layout: data.layout || 'standard',
                    font_family: data.font_family || 'plus-jakarta',
                    primary_color: data.primary_color || '#059669',
                    secondary_color: data.secondary_color || '#047857',
                    background_color: data.background_color || '#f8fafc',
                    text_color: data.text_color || '#0f172a',
                    button_color: data.button_color || '#059669',
                    button_text_color: data.button_text_color || '#ffffff',
                    carousel_images: Array.isArray(data.carousel_images) ? data.carousel_images : [],
                    features: Array.isArray(data.features) && data.features.length > 0 ? data.features : [
                        { title: 'Kualitas Premium', description: 'Standar terbaik teruji klinis dan resmi.', icon: 'verified' }
                    ],
                    paragraphs: Array.isArray(data.paragraphs) && data.paragraphs.length > 0 ? data.paragraphs : [
                        { headline: 'Keunggulan Produk Kami', content: 'Solusi tepat dan amanah untuk keluarga Anda.' }
                    ],
                    testimonials: Array.isArray(data.testimonials) ? data.testimonials : [],
                    faq_items: Array.isArray(data.faq_items) ? data.faq_items : [],
                    trust_badges: [
                        { title: '100% Asli', icon: 'verified' },
                        { title: 'Garansi Uang Kembali', icon: 'security' },
                        { title: 'Bisa COD', icon: 'payments' },
                        { title: 'Pengiriman Cepat', icon: 'bolt' }
                    ],
                    is_published: data.is_published
                });

                if (Array.isArray(data.sections_order) && data.sections_order.length > 0) {
                    setSectionsOrder(data.sections_order);
                }

                if (data.logo) setPreviewLogo(getMediaUrl(data.logo));
                if (data.hero_image) setPreviewHero(getMediaUrl(data.hero_image));
            } catch (err) {
                console.error('Error fetching landing page detail:', err);
                showNotification('Gagal memuat data landing page', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, isEditing]);

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // DRAG AND DROP HANDLERS FOR SECTIONS
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) return;

        const newOrder = [...sectionsOrder];
        const [movedItem] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, movedItem);

        setSectionsOrder(newOrder);
        setDraggedIndex(null);
    };

    const handleMoveBlock = (index, direction) => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= sectionsOrder.length) return;

        const newOrder = [...sectionsOrder];
        const [item] = newOrder.splice(index, 1);
        newOrder.splice(newIndex, 0, item);
        setSectionsOrder(newOrder);
    };

    const handleRemoveBlock = (blockId) => {
        setSectionsOrder(prev => prev.filter(id => id !== blockId));
        if (activeBlockId === blockId) {
            setActiveBlockId(sectionsOrder.find(id => id !== blockId) || null);
        }
    };

    const handleAddBlock = (blockId) => {
        if (!sectionsOrder.includes(blockId)) {
            setSectionsOrder(prev => [...prev, blockId]);
        }
        setActiveBlockId(blockId);
        setSidebarTab('blocks');
        setShowAddBlockModal(false);
    };

    // File input handlers
    const handleLogoFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, logo: file }));
            setPreviewLogo(URL.createObjectURL(file));
        }
    };

    const handleHeroFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, hero_image: file }));
            setPreviewHero(URL.createObjectURL(file));
        }
    };

    // SAVE & PUBLISH HANDLER
    const handleSave = async (publishOverride) => {
        if (!formData.title.trim()) {
            showNotification('Nama Toko / Judul Landing Page wajib diisi!', 'error');
            setSidebarTab('settings');
            return;
        }

        setSaving(true);
        try {
            const willPublish = publishOverride !== undefined ? publishOverride : formData.is_published;
            
            const payload = new FormData();
            payload.append('title', formData.title);
            payload.append('tagline', formData.tagline || '');
            payload.append('description', formData.description || '');
            payload.append('hero_headline', formData.hero_headline || '');
            payload.append('hero_subheadline', formData.hero_subheadline || '');
            payload.append('badge_text', formData.badge_text || '');
            payload.append('price', formData.price || '0');
            payload.append('slash_price', formData.slash_price || '0');
            payload.append('cta_text', formData.cta_text || 'Beli Sekarang');
            payload.append('cta_subtext', formData.cta_subtext || '');
            payload.append('cta_type', formData.cta_type || 'whatsapp');
            payload.append('cta_link', formData.cta_link || '');
            payload.append('whatsapp_number', formData.whatsapp_number || '');
            payload.append('whatsapp_message', formData.whatsapp_message || '');
            payload.append('secondary_cta_text', formData.secondary_cta_text || '');
            payload.append('secondary_cta_link', formData.secondary_cta_link || '');
            payload.append('theme', formData.theme || 'emerald');
            payload.append('layout', formData.layout || 'standard');
            payload.append('font_family', formData.font_family || 'plus-jakarta');
            payload.append('primary_color', formData.primary_color || '#059669');
            payload.append('secondary_color', formData.secondary_color || '#047857');
            payload.append('background_color', formData.background_color || '#f8fafc');
            payload.append('text_color', formData.text_color || '#0f172a');
            payload.append('button_color', formData.button_color || '#059669');
            payload.append('button_text_color', formData.button_text_color || '#ffffff');
            payload.append('is_published', willPublish ? 'true' : 'false');

            // JSON arrays
            payload.append('sections_order', JSON.stringify(sectionsOrder));
            payload.append('carousel_images', JSON.stringify(formData.carousel_images || []));
            payload.append('features', JSON.stringify(formData.features || []));
            payload.append('paragraphs', JSON.stringify(formData.paragraphs || []));
            payload.append('testimonials', JSON.stringify(formData.testimonials || []));
            payload.append('faq_items', JSON.stringify(formData.faq_items || []));

            if (formData.logo instanceof File) {
                payload.append('logo', formData.logo);
            }
            if (formData.hero_image instanceof File) {
                payload.append('hero_image', formData.hero_image);
            }

            if (isEditing) {
                await updateLandingPage(slug, payload);
                showNotification('Perubahan Landing Page berhasil disimpan!');
            } else {
                const res = await createLandingPage(payload);
                showNotification('Landing Page baru berhasil dibuat & diterbitkan!');
                navigate(`/dashboard/landing-pages/builder/${res.data.slug}`);
            }
        } catch (err) {
            console.error('Save error:', err);
            const errData = err.response?.data;
            const msg = errData?.detail || errData?.message || 'Gagal menyimpan landing page. Periksa data kembali.';
            showNotification(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    // RENDER SECTION PREVIEW DI LIVE CANVAS
    const renderSectionPreview = (sectionId) => {
        const isCurrentActive = activeBlockId === sectionId;
        const currentTheme = THEME_OPTIONS.find(t => t.key === formData.theme) || THEME_OPTIONS[0];

        let content = null;

        switch (sectionId) {
            case 'hero':
                content = (
                    <div className="relative py-10 px-5 text-center text-white overflow-hidden rounded-2xl"
                         style={{ background: `linear-gradient(135deg, ${formData.secondary_color || '#064e3b'} 0%, ${formData.primary_color || '#059669'} 100%)` }}>
                        {formData.badge_text && (
                            <span className="inline-block px-3 py-1 bg-amber-400 text-amber-950 font-black text-[11px] rounded-full uppercase tracking-wider mb-4 shadow-sm">
                                {formData.badge_text}
                            </span>
                        )}
                        <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-3">
                            {formData.hero_headline || 'Judul Utama Penawaran Anda'}
                        </h1>
                        <p className="text-xs sm:text-sm opacity-90 max-w-lg mx-auto leading-relaxed mb-6 font-medium">
                            {formData.hero_subheadline || 'Subheadline penjelas manfaat produk yang memikat calon pelanggan.'}
                        </p>

                        {previewHero && (
                            <div className="my-5 rounded-2xl overflow-hidden shadow-xl border-2 border-white/30 max-w-md mx-auto">
                                <img src={previewHero} alt="Hero Banner" className="w-full h-auto object-cover max-h-56" />
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 mt-4">
                            <button
                                type="button"
                                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                                style={{ backgroundColor: formData.button_color || '#10b981', color: formData.button_text_color || '#ffffff' }}
                            >
                                <span>{formData.cta_text || 'Beli Sekarang'}</span>
                                <span className="material-icons text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                );
                break;

            case 'pricing':
                content = (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center my-4">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block mb-1">
                            Penawaran Spesial Terbatas
                        </span>
                        <div className="flex items-center justify-center gap-3 my-2">
                            {Number(formData.slash_price) > 0 && (
                                <span className="text-sm line-through text-slate-400 font-bold">
                                    {formatIDR(formData.slash_price)}
                                </span>
                            )}
                            <span className="text-2xl font-black text-emerald-700">
                                {Number(formData.price) > 0 ? formatIDR(formData.price) : 'Hubungi Kami'}
                            </span>
                        </div>
                        {formData.cta_subtext && (
                            <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1 mt-1">
                                <span className="material-icons text-xs text-emerald-600">verified</span>
                                {formData.cta_subtext}
                            </p>
                        )}
                    </div>
                );
                break;

            case 'cta_button':
                content = (
                    <div className="my-4 text-center">
                        <button
                            type="button"
                            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm shadow-md transition transform active:scale-95 flex items-center justify-center gap-2"
                            style={{ backgroundColor: formData.button_color || '#059669', color: formData.button_text_color || '#ffffff' }}
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                            </svg>
                            <span>{formData.cta_text || 'Beli Sekarang via WhatsApp'}</span>
                        </button>
                        {formData.secondary_cta_text && (
                            <p className="mt-2 text-xs font-bold text-slate-500 hover:underline cursor-pointer">
                                {formData.secondary_cta_text}
                            </p>
                        )}
                    </div>
                );
                break;

            case 'features':
                content = (
                    <div className="my-5">
                        <h3 className="text-sm font-black text-slate-800 text-center mb-3">Keunggulan & Manfaat</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {formData.features.map((f, i) => (
                                <div key={i} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs text-center">
                                    <span className="material-icons text-xl text-emerald-600 mb-1">{f.icon || 'verified'}</span>
                                    <h4 className="font-bold text-xs text-slate-800">{f.title || 'Fitur Unggulan'}</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{f.description || 'Deskripsi singkat manfaat.'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
                break;

            case 'gallery':
                content = (
                    <div className="my-5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                        <h3 className="text-sm font-black text-slate-800 text-center mb-2.5">Galeri Produk</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <span className="material-icons text-2xl">image</span>
                            </div>
                            <div className="h-28 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                <span className="material-icons text-2xl">photo_library</span>
                            </div>
                        </div>
                    </div>
                );
                break;

            case 'paragraphs':
                content = (
                    <div className="my-5 space-y-3">
                        {formData.paragraphs.map((p, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 mb-1.5">{p.headline}</h4>
                                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{p.content}</p>
                            </div>
                        ))}
                    </div>
                );
                break;

            case 'testimonials':
                content = (
                    <div className="my-5">
                        <h3 className="text-sm font-black text-slate-800 text-center mb-3">Apa Kata Mereka?</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {formData.testimonials.map((t, i) => (
                                <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                                    <div className="flex items-center gap-1 text-amber-400 mb-1.5">
                                        {[...Array(t.rating || 5)].map((_, idx) => (
                                            <span key={idx} className="material-icons text-xs">star</span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-600 italic leading-snug mb-2">"{t.review}"</p>
                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                                            {t.name?.charAt(0) || 'U'}
                                        </div>
                                        <span className="text-xs font-bold text-slate-800">{t.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
                break;

            case 'faq':
                content = (
                    <div className="my-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                        <h3 className="text-sm font-black text-slate-800 text-center mb-3">Pertanyaan Sering Diajukan</h3>
                        <div className="space-y-2">
                            {formData.faq_items.map((item, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setActiveFaqIdx(activeFaqIdx === idx ? null : idx); }}
                                        className="w-full p-2.5 text-left text-xs font-bold text-slate-800 flex justify-between items-center bg-slate-50/60 hover:bg-slate-50"
                                    >
                                        <span>{item.question}</span>
                                        <span className="material-icons text-sm text-slate-400">
                                            {activeFaqIdx === idx ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </button>
                                    {activeFaqIdx === idx && (
                                        <div className="p-2.5 text-xs text-slate-600 bg-white leading-relaxed border-t border-slate-100">
                                            {item.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
                break;

            case 'trust_badges':
                content = (
                    <div className="my-4 py-3 px-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {formData.trust_badges.map((b, i) => (
                                <div key={i} className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                                    <span className="material-icons text-sm text-emerald-600">{b.icon}</span>
                                    <span>{b.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
                break;

            case 'footer':
                content = (
                    <div className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 mt-6">
                        <p className="font-bold text-slate-600">{formData.title}</p>
                        <p className="text-[10px] mt-1">{formData.tagline}</p>
                        <p className="text-[9px] text-slate-400 mt-3">Powered by Barakah Economy Landing Page</p>
                    </div>
                );
                break;

            default:
                content = null;
        }

        const blockMeta = AVAILABLE_BLOCKS.find(b => b.id === sectionId);

        return (
            <div
                key={sectionId}
                onClick={() => { setActiveBlockId(sectionId); setSidebarTab('blocks'); }}
                className={`relative group transition-all duration-200 cursor-pointer rounded-2xl ${
                    isCurrentActive
                        ? 'ring-2 ring-emerald-500 shadow-md ring-offset-2'
                        : 'hover:ring-1 hover:ring-emerald-300'
                }`}
            >
                {/* Floating Block Header Badge on Hover/Active */}
                <div className={`absolute -top-3 left-3 z-30 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                    isCurrentActive ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-white opacity-0 group-hover:opacity-100 shadow-sm'
                }`}>
                    <span className="material-icons text-[11px]">{blockMeta?.icon || 'widgets'}</span>
                    <span>{blockMeta?.name || sectionId}</span>
                </div>

                {/* Floating Quick Action Toolbar */}
                <div className="absolute -top-3 right-3 z-30 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-md transition">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveBlockId(sectionId); setSidebarTab('blocks'); }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        title="Edit Blok"
                    >
                        <span className="material-icons text-xs">edit</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveBlock(sectionsOrder.indexOf(sectionId), 'up'); }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        title="Geser ke Atas"
                    >
                        <span className="material-icons text-xs">arrow_upward</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMoveBlock(sectionsOrder.indexOf(sectionId), 'down'); }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                        title="Geser ke Bawah"
                    >
                        <span className="material-icons text-xs">arrow_downward</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveBlock(sectionId); }}
                        className="p-1 hover:bg-rose-50 rounded text-rose-500"
                        title="Hapus Blok"
                    >
                        <span className="material-icons text-xs">delete</span>
                    </button>
                </div>

                {content}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
                <p className="text-xs font-bold text-slate-400 animate-pulse">Memuat Studio Landing Page Builder...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans select-none">
            <Helmet>
                <title>{isEditing ? `Edit: ${formData.title}` : 'Landing Page Builder Studio'} - Barakah Economy</title>
            </Helmet>

            {/* NOTIFICATION TOAST */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce ${
                    notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                    <span className="material-icons text-sm">{notification.type === 'error' ? 'error' : 'check_circle'}</span>
                    <span>{notification.msg}</span>
                </div>
            )}

            {/* TOP BAR / STUDIO APP BAR (OrderOnline Style) */}
            <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-40 sticky top-0 shadow-2xs">
                {/* Left: Back & Title */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/landing-pages')}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Kembali ke Dashboard"
                    >
                        <span className="material-icons text-lg">arrow_back</span>
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 truncate max-w-[150px] sm:max-w-xs">
                                {formData.title || 'Untitled Landing Page'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                formData.is_published ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {formData.is_published ? 'Publik' : 'Draf'}
                            </span>
                        </div>
                        {formData.slug && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                                /lp/{formData.slug}
                            </span>
                        )}
                    </div>
                </div>

                {/* Center: Device Switcher (Desktop 🖥️ vs Mobile 📱) */}
                <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setPreviewMode('mobile')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                            previewMode === 'mobile' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <span className="material-icons text-sm">smartphone</span>
                        <span>Mobile (390px)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewMode('desktop')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                            previewMode === 'desktop' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <span className="material-icons text-sm">laptop</span>
                        <span>Desktop</span>
                    </button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {formData.slug && (
                        <a
                            href={`/lp/${formData.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                        >
                            <span className="material-icons text-sm">open_in_new</span>
                            <span className="hidden sm:inline">Pratinjau Tab</span>
                        </a>
                    )}

                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition hidden sm:inline"
                    >
                        Simpan Draf
                    </button>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSave(true)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-200 transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <span className="material-icons text-sm">{saving ? 'sync' : 'publish'}</span>
                        <span>{saving ? 'Menyimpan...' : 'Publikasikan'}</span>
                    </button>
                </div>
            </header>

            {/* MAIN WORKSPACE: 2-COLUMN (SIDEBAR BUILDER + CANVAS LIVE PREVIEW) */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* LEFT COLUMN: BUILDER STUDIO & CONTROLS PANEL */}
                <aside className="w-full sm:w-[420px] bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-56px)] shrink-0 z-20">
                    
                    {/* Top 3 Navigation Tabs */}
                    <div className="flex border-b border-slate-200 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={() => { setSidebarTab('blocks'); }}
                            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                                sidebarTab === 'blocks'
                                    ? 'border-emerald-600 text-emerald-700 bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="material-icons text-sm">view_quilt</span>
                            <span>Blok ({sectionsOrder.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSidebarTab('design')}
                            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                                sidebarTab === 'design'
                                    ? 'border-emerald-600 text-emerald-700 bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="material-icons text-sm">palette</span>
                            <span>Tema & Warna</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSidebarTab('settings')}
                            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition ${
                                sidebarTab === 'settings'
                                    ? 'border-emerald-600 text-emerald-700 bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span className="material-icons text-sm">settings</span>
                            <span>Pengaturan</span>
                        </button>
                    </div>

                    {/* Scrollable Content inside Sidebar */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        
                        {/* TAB 1: BLOCKS & DRAG-AND-DROP REORDER */}
                        {sidebarTab === 'blocks' && (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-xs text-slate-800">Tata Letak Komponen (Drag & Drop)</h3>
                                        <p className="text-[11px] text-slate-400">Geser atau klik tombol panah untuk atur urutan</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddBlockModal(true)}
                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1"
                                    >
                                        <span className="material-icons text-sm">add</span>
                                        <span>Tambah Blok</span>
                                    </button>
                                </div>

                                {/* Drag and Drop List */}
                                <div className="space-y-2 mb-6">
                                    {sectionsOrder.map((sectionId, idx) => {
                                        const meta = AVAILABLE_BLOCKS.find(b => b.id === sectionId);
                                        const isSelected = activeBlockId === sectionId;

                                        return (
                                            <div
                                                key={sectionId}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, idx)}
                                                onDragOver={(e) => handleDragOver(e, idx)}
                                                onDrop={(e) => handleDrop(e, idx)}
                                                onClick={() => setActiveBlockId(sectionId)}
                                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                                                    isSelected
                                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs'
                                                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="material-icons text-slate-400 cursor-grab text-base" title="Tahan & geser untuk ubah urutan">
                                                        drag_indicator
                                                    </span>
                                                    <span className="material-icons text-sm text-emerald-600">{meta?.icon || 'widgets'}</span>
                                                    <span className="text-xs font-bold truncate max-w-[170px]">{meta?.name || sectionId}</span>
                                                </div>

                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => handleMoveBlock(idx, 'up')}
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                                        title="Geser Naik"
                                                    >
                                                        <span className="material-icons text-xs">arrow_upward</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === sectionsOrder.length - 1}
                                                        onClick={() => handleMoveBlock(idx, 'down')}
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                                        title="Geser Turun"
                                                    >
                                                        <span className="material-icons text-xs">arrow_downward</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBlock(sectionId)}
                                                        className="p-1 text-slate-400 hover:text-rose-600"
                                                        title="Hapus dari Halaman"
                                                    >
                                                        <span className="material-icons text-xs">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ACTIVE BLOCK INSPECTOR (FORM PROPERTIES) */}
                                {activeBlockId && (
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
                                            <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                                                <span className="material-icons text-sm text-emerald-600">tune</span>
                                                <span>Edit Properti: {AVAILABLE_BLOCKS.find(b => b.id === activeBlockId)?.name}</span>
                                            </h4>
                                        </div>

                                        {/* HERO SECTION INSPECTOR */}
                                        {activeBlockId === 'hero' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Badge Promo Utama</label>
                                                    <input
                                                        type="text"
                                                        value={formData.badge_text}
                                                        onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                                                        placeholder="Contoh: PROMO SPESIAL HARI INI"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Headline Utama Hero</label>
                                                    <input
                                                        type="text"
                                                        value={formData.hero_headline}
                                                        onChange={(e) => setFormData({ ...formData, hero_headline: e.target.value })}
                                                        placeholder="Contoh: Solusi Terbaik Kebutuhan Hidup Anda"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Subheadline Penjelas</label>
                                                    <textarea
                                                        rows={2}
                                                        value={formData.hero_subheadline}
                                                        onChange={(e) => setFormData({ ...formData, hero_subheadline: e.target.value })}
                                                        placeholder="Telah dipercaya oleh ribuan pelanggan..."
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Banner Gambar Hero</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleHeroFile}
                                                        className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* PRICING INSPECTOR */}
                                        {activeBlockId === 'pricing' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Harga Promo (Rp)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.price}
                                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Harga Coret / Normal (Rp)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.slash_price}
                                                        onChange={(e) => setFormData({ ...formData, slash_price: e.target.value })}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Subteks Garansi Penenang</label>
                                                    <input
                                                        type="text"
                                                        value={formData.cta_subtext}
                                                        onChange={(e) => setFormData({ ...formData, cta_subtext: e.target.value })}
                                                        placeholder="Contoh: Garansi 100% Uang Kembali"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* CTA BUTTON INSPECTOR */}
                                        {activeBlockId === 'cta_button' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Teks Tombol CTA</label>
                                                    <input
                                                        type="text"
                                                        value={formData.cta_text}
                                                        onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                                        placeholder="Contoh: Beli Sekarang"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipe Aksi Tombol</label>
                                                    <select
                                                        value={formData.cta_type}
                                                        onChange={(e) => setFormData({ ...formData, cta_type: e.target.value })}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                                    >
                                                        <option value="whatsapp">Chat WhatsApp Otomatis</option>
                                                        <option value="direct_link">Direct Link / URL Eksternal</option>
                                                    </select>
                                                </div>
                                                {formData.cta_type === 'whatsapp' ? (
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor WhatsApp Tujuan</label>
                                                        <input
                                                            type="text"
                                                            value={formData.whatsapp_number}
                                                            onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                                            placeholder="081234567890"
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">URL Tujuan (Direct Link)</label>
                                                        <input
                                                            type="url"
                                                            value={formData.cta_link}
                                                            onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                                                            placeholder="https://..."
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tombol Sekunder (Opsional)</label>
                                                    <input
                                                        type="text"
                                                        value={formData.secondary_cta_text}
                                                        onChange={(e) => setFormData({ ...formData, secondary_cta_text: e.target.value })}
                                                        placeholder="Contoh: Konsultasi Gratis"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* FEATURES INSPECTOR */}
                                        {activeBlockId === 'features' && (
                                            <div className="space-y-3">
                                                {formData.features.map((feat, i) => (
                                                    <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-400">Poin #{i + 1}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    features: formData.features.filter((_, idx) => idx !== i)
                                                                })}
                                                                className="text-rose-500 hover:text-rose-700 text-xs"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={feat.title}
                                                            onChange={(e) => {
                                                                const updated = [...formData.features];
                                                                updated[i].title = e.target.value;
                                                                setFormData({ ...formData, features: updated });
                                                            }}
                                                            placeholder="Judul Keunggulan"
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                        />
                                                        <textarea
                                                            rows={2}
                                                            value={feat.description}
                                                            onChange={(e) => {
                                                                const updated = [...formData.features];
                                                                updated[i].description = e.target.value;
                                                                setFormData({ ...formData, features: updated });
                                                            }}
                                                            placeholder="Deskripsi keunggulan..."
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-snug"
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        features: [...formData.features, { title: 'Fitur Baru', description: 'Deskripsi fitur keunggulan produk.', icon: 'verified' }]
                                                    })}
                                                    className="w-full py-2 bg-white border border-dashed border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50"
                                                >
                                                    + Tambah Poin Keunggulan
                                                </button>
                                            </div>
                                        )}

                                        {/* PARAGRAPHS INSPECTOR */}
                                        {activeBlockId === 'paragraphs' && (
                                            <div className="space-y-3">
                                                {formData.paragraphs.map((p, i) => (
                                                    <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-400">Paragraf #{i + 1}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    paragraphs: formData.paragraphs.filter((_, idx) => idx !== i)
                                                                })}
                                                                className="text-rose-500 hover:text-rose-700 text-xs"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={p.headline}
                                                            onChange={(e) => {
                                                                const updated = [...formData.paragraphs];
                                                                updated[i].headline = e.target.value;
                                                                setFormData({ ...formData, paragraphs: updated });
                                                            }}
                                                            placeholder="Headline Paragraf"
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                                        />
                                                        <textarea
                                                            rows={3}
                                                            value={p.content}
                                                            onChange={(e) => {
                                                                const updated = [...formData.paragraphs];
                                                                updated[i].content = e.target.value;
                                                                setFormData({ ...formData, paragraphs: updated });
                                                            }}
                                                            placeholder="Isi narasi copywriting..."
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        paragraphs: [...formData.paragraphs, { headline: 'Subjudul Narasi', content: 'Tuliskan alasan mengapa produk ini penting bagi calon pembeli Anda.' }]
                                                    })}
                                                    className="w-full py-2 bg-white border border-dashed border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50"
                                                >
                                                    + Tambah Paragraf Cerita
                                                </button>
                                            </div>
                                        )}

                                        {/* TESTIMONIALS INSPECTOR */}
                                        {activeBlockId === 'testimonials' && (
                                            <div className="space-y-3">
                                                {formData.testimonials.map((t, i) => (
                                                    <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <input
                                                                type="text"
                                                                value={t.name}
                                                                onChange={(e) => {
                                                                    const updated = [...formData.testimonials];
                                                                    updated[i].name = e.target.value;
                                                                    setFormData({ ...formData, testimonials: updated });
                                                                }}
                                                                placeholder="Nama Pembeli"
                                                                className="w-2/3 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    testimonials: formData.testimonials.filter((_, idx) => idx !== i)
                                                                })}
                                                                className="text-rose-500 hover:text-rose-700 text-xs"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            rows={2}
                                                            value={t.review}
                                                            onChange={(e) => {
                                                                const updated = [...formData.testimonials];
                                                                updated[i].review = e.target.value;
                                                                setFormData({ ...formData, testimonials: updated });
                                                            }}
                                                            placeholder="Isi ulasan / testimoni pembeli..."
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        testimonials: [...formData.testimonials, { name: 'Pelanggan Setia', review: 'Produk sangat bagus dan sesuai harapan!', rating: 5 }]
                                                    })}
                                                    className="w-full py-2 bg-white border border-dashed border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50"
                                                >
                                                    + Tambah Testimoni
                                                </button>
                                            </div>
                                        )}

                                        {/* FAQ INSPECTOR */}
                                        {activeBlockId === 'faq' && (
                                            <div className="space-y-3">
                                                {formData.faq_items.map((item, i) => (
                                                    <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-slate-400">FAQ #{i + 1}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    faq_items: formData.faq_items.filter((_, idx) => idx !== i)
                                                                })}
                                                                className="text-rose-500 hover:text-rose-700 text-xs"
                                                            >
                                                                Hapus
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={item.question}
                                                            onChange={(e) => {
                                                                const updated = [...formData.faq_items];
                                                                updated[i].question = e.target.value;
                                                                setFormData({ ...formData, faq_items: updated });
                                                            }}
                                                            placeholder="Pertanyaan umum?"
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                                                        />
                                                        <textarea
                                                            rows={2}
                                                            value={item.answer}
                                                            onChange={(e) => {
                                                                const updated = [...formData.faq_items];
                                                                updated[i].answer = e.target.value;
                                                                setFormData({ ...formData, faq_items: updated });
                                                            }}
                                                            placeholder="Jawaban penjelasan..."
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                                        />
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        faq_items: [...formData.faq_items, { question: 'Pertanyaan baru?', answer: 'Jawaban detail untuk membantu pelanggan.' }]
                                                    })}
                                                    className="w-full py-2 bg-white border border-dashed border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50"
                                                >
                                                    + Tambah FAQ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: DESIGN & THEME */}
                        {sidebarTab === 'design' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-2">Preset Tema Warna</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {THEME_OPTIONS.map(t => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    theme: t.key,
                                                    primary_color: t.primary,
                                                    button_color: t.primary
                                                })}
                                                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                                                    formData.theme === t.key
                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span className={`w-4 h-4 rounded-full ${t.preview} shrink-0`}></span>
                                                <span className="text-xs truncate">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Gaya Font / Tipografi</label>
                                    <select
                                        value={formData.font_family}
                                        onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                    >
                                        {FONT_OPTIONS.map(f => (
                                            <option key={f.key} value={f.key}>{f.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-800">Kustomisasi Warna Spesiﬁk</h4>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-600">Warna Tombol CTA</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={formData.button_color}
                                                onChange={(e) => setFormData({ ...formData, button_color: e.target.value })}
                                                className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                                            />
                                            <span className="text-[11px] font-mono text-slate-500">{formData.button_color}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-600">Warna Teks Tombol</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={formData.button_text_color}
                                                onChange={(e) => setFormData({ ...formData, button_text_color: e.target.value })}
                                                className="w-7 h-7 rounded border border-slate-300 cursor-pointer"
                                            />
                                            <span className="text-[11px] font-mono text-slate-500">{formData.button_text_color}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: SETTINGS & SEO */}
                        {sidebarTab === 'settings' && (
                            <div className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Nama Toko / Judul Landing Page *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Contoh: Madu Al-Barakah Official"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Tagline Singkat</label>
                                    <input
                                        type="text"
                                        value={formData.tagline}
                                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                        placeholder="Contoh: 100% Asli dari Hutan Tropis"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Deskripsi Singkat / Copywriting Utama</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Deskripsikan penawaran atau keunggulan toko Anda..."
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Logo Toko / Brand</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoFile}
                                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Nomor WhatsApp Checkout</label>
                                    <input
                                        type="text"
                                        value={formData.whatsapp_number}
                                        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                        placeholder="081234567890"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">Template Pembuka WhatsApp Otomatis</label>
                                    <textarea
                                        rows={3}
                                        value={formData.whatsapp_message}
                                        onChange={(e) => setFormData({ ...formData, whatsapp_message: e.target.value })}
                                        placeholder="Halo, saya ingin memesan produk..."
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* RIGHT COLUMN: LIVE UI PREVIEW CANVAS (ORDERONLINE STYLE) */}
                <main className="flex-1 bg-slate-200/70 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
                    
                    {/* Simulator Container */}
                    <div className={`transition-all duration-300 w-full ${
                        previewMode === 'mobile'
                            ? 'max-w-[390px] my-4 rounded-[40px] border-8 border-slate-900 shadow-2xl bg-white overflow-hidden ring-1 ring-black/10'
                            : 'max-w-3xl my-2 rounded-3xl shadow-xl bg-white overflow-hidden border border-slate-200'
                    }`}>

                        {/* Mobile Phone Mockup Top Bar (OrderOnline Simulator) */}
                        {previewMode === 'mobile' && (
                            <div className="bg-slate-900 text-white px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-bold">
                                <span>09:41</span>
                                <div className="w-20 h-4 bg-black rounded-full mx-auto"></div>
                                <div className="flex items-center gap-1">
                                    <span className="material-icons text-xs">signal_cellular_4_bar</span>
                                    <span className="material-icons text-xs">wifi</span>
                                    <span className="material-icons text-xs">battery_full</span>
                                </div>
                            </div>
                        )}

                        {/* Top Store Header */}
                        <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-white/90">
                            <div className="flex items-center gap-2">
                                {previewLogo ? (
                                    <img src={previewLogo} alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                                        {formData.title?.charAt(0) || 'B'}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[150px]">{formData.title}</p>
                                    <p className="text-[9px] text-slate-400 truncate max-w-[150px]">{formData.tagline}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="px-3 py-1 rounded-lg text-[10px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: formData.button_color || '#059669' }}
                            >
                                {formData.cta_text || 'Beli'}
                            </button>
                        </div>

                        {/* Canvas Sections Rendering (Following sectionsOrder) */}
                        <div className="p-3 sm:p-5 space-y-3 bg-slate-50 min-h-[600px]">
                            {sectionsOrder.map(sectionId => renderSectionPreview(sectionId))}
                        </div>

                        {/* Mobile Home Bar */}
                        {previewMode === 'mobile' && (
                            <div className="bg-white py-2 flex justify-center border-t border-slate-50">
                                <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* MODAL CATALOG: ADD NEW BLOCK DRAWER */}
            {showAddBlockModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="font-extrabold text-base text-slate-900">Katalog Blok & Komponen</h3>
                                <p className="text-xs text-slate-500">Pilih komponen untuk ditambahkan ke landing page Anda</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddBlockModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[65vh] overflow-y-auto pr-1">
                            {AVAILABLE_BLOCKS.map(block => {
                                const alreadyAdded = sectionsOrder.includes(block.id);

                                return (
                                    <div
                                        key={block.id}
                                        onClick={() => !alreadyAdded && handleAddBlock(block.id)}
                                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition ${
                                            alreadyAdded
                                                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                                : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs cursor-pointer'
                                        }`}
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                            <span className="material-icons text-lg">{block.icon}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-slate-800">{block.name}</h4>
                                                {alreadyAdded && (
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                        Sudah Ada
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{block.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLandingPagesBuilderPage;
