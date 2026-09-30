import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import api from '../../services/api';

const PRESET_EMAIL_TEMPLATES = [
    {
        id: 'promo_penawaran',
        title: '🛍️ Penawaran Spesial UMKM',
        badge: 'PROMO SPESIAL',
        subject: "{Kabar Gembira|Penawaran Spesial|Promo Terbatas}: Diskon Istimewa Produk Berkah Pekan Ini!",
        headerTitle: 'Penawaran Spesial Barakah Store',
        headerSubtitle: 'Dukungan Nyata untuk Kebangkitan UMKM Keumatan',
        ctaText: 'Klaim Promo & Belanja Sekarang',
        ctaUrl: 'https://barakaheconomy.id/store',
        themeColor: '#059669',
        body: `Assalamu'alaikum Warahmatullahi Wabarakatuh ✨

Halo Yth. {name},

Kabar gembira bagi Anda dan keluarga! Dalam rangka memperkuat ekosistem ekonomi keumatan, Barakah Economy mempersembahkan *Penawaran Spesial Pekan Berkah* dengan berbagai keuntungan menarik:

🏷️ *Potongan Harga Hingga 30%* untuk ragam produk kebutuhan harian halal pilihan
📦 *Bebas Biaya Pengiriman* untuk area tertentu dengan kurir mitra
🤝 *Setiap Pembelian* turut berkontribusi langsung pada pemberdayaan UMKM lokal dan dana sosial kemanusiaan.

Jangan lewatkan kesempatan berharga ini. Dapatkan produk berkualitas dengan keberkahan berlipat ganda!

Wassalamu'alaikum Warahmatullahi Wabarakatuh,
*Tim Barakah Store*`
    },
    {
        id: 'event_invitation',
        title: '🗓️ Undangan Kegiatan & Webinar',
        badge: 'AGENDA PENTING',
        subject: "{Undangan Eksklusif|Agenda Penting|Pemberitahuan}: Pertemuan & Workshop Ekonomi Berkah",
        headerTitle: 'Undangan Workshop Kewirausahaan Berkah',
        headerSubtitle: 'Membangun Kemandirian Finansial Umat Secara Terpadu',
        ctaText: 'Daftar & Konfirmasi Kehadiran',
        ctaUrl: 'https://barakaheconomy.id/events',
        themeColor: '#2563eb',
        body: `Assalamu'alaikum Warahmatullahi Wabarakatuh 🤝

Kepada Yth. Saudara/i {name},

Kami mengundang Anda untuk bergabung dalam forum strategis penguatan ekonomi umat:

📌 *Tema Kegiatan:* Akselerasi Bisnis Syariah & Sinergi Komunitas 2026
🗓️ *Hari/Tanggal:* Sabtu, 10 Oktober 2026
⏰ *Waktu:* 09:00 - 12:00 WIB
📍 *Media:* Daring via Barakah Live Streaming & Zoom

Acara ini menghadirkan para praktisi bisnis berpengalaman, pemangku kebijakan, serta kurator kemitraan Barakah Economy. Tempat terbatas untuk menjaga efektivitas diskusi.

Mohon kesediaan Saudara/i untuk melakukan konfirmasi kehadiran melalui tautan berikut.

Jazakumullahu Khairan Katsiran.`
    },
    {
        id: 'charity_call',
        title: '🕌 Ajakan Donasi & Kemanusiaan',
        badge: 'SEDEKAH JARIYAH',
        subject: "{Panggilan Kebaikan|Alirkan Berkah|Sedekah Jariyah}: Uluran Tangan untuk Saudara Kita",
        headerTitle: 'Program Tanggap Berkah Kemanusiaan',
        headerSubtitle: 'Mari Menjadi Bagian dari Senyum Mereka yang Membutuhkan',
        ctaText: 'Salurkan Donasi Sekarang',
        ctaUrl: 'https://barakaheconomy.id/charity',
        themeColor: '#d97706',
        body: `Assalamu'alaikum Warahmatullahi Wabarakatuh 🤲

Bapak/Ibu {name} yang dirahmati Allah,

Sedekah laksana naungan yang menyejukkan hati. Hari ini, saudara-saudara kita di berbagai pelosok membutuhkan uluran tangan untuk pemenuhan kebutuhan pangan, sarana ibadah, dan beasiswa pendidikan santri pra-sejahtera.

Mari bersama-sama mengalirkan rezeki terbaik yang Allah titipkan. Berapapun donasi yang disalurkan, insyaAllah akan menjadi amal jariyah yang terus mengalir pahalanya.

Semoga Allah memberkahi harta, kesehatan, dan keluarga Anda sekeluarga. Aamiin ya Rabbal 'Alamin.`
    },
    {
        id: 'announcement_clean',
        title: '📢 Pengumuman Resmi Sistem',
        badge: 'PEMBERITAHUAN',
        subject: "{Pengumuman Penting|Update Sistem|Informasi Resmi}: Pembaruan Layanan Platform Barakah",
        headerTitle: 'Pembaruan Layanan & Kebijakan Platform',
        headerSubtitle: 'Komitmen Kami Menghadirkan Ekosistem Digital yang Aman & Nyaman',
        ctaText: 'Kunjungi Portal Akun',
        ctaUrl: 'https://barakaheconomy.id/dashboard',
        themeColor: '#4f46e5',
        body: `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Halo {name},

Kami ingin menginformasikan bahwa sistem Barakah Economy telah berhasil diperbarui dengan peningkatan performa, kecepatan transaksi, dan fitur keamanan akun yang lebih tangguh.

Pastikan data profil dan nomor kontak Anda selalu mutakhir untuk kenyamanan akses seluruh layanan platform.

Terima kasih atas kepercayaan dan kebersamaan Anda dalam ekosistem Barakah Economy.`
    }
];

const THEME_PALETTES = [
    { id: 'emerald', name: 'Barakah Emerald', hex: '#059669', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-500' },
    { id: 'blue', name: 'Royal Blue', hex: '#2563eb', bgClass: 'bg-blue-600', borderClass: 'border-blue-500' },
    { id: 'purple', name: 'Noble Purple', hex: '#7c3aed', bgClass: 'bg-purple-600', borderClass: 'border-purple-500' },
    { id: 'amber', name: 'Golden Amber', hex: '#d97706', bgClass: 'bg-amber-600', borderClass: 'border-amber-500' },
    { id: 'dark', name: 'Midnight Slate', hex: '#0f172a', bgClass: 'bg-slate-900', borderClass: 'border-slate-800' }
];

const EMOJI_QUICK = ['✨', '📢', '🛍️', '🕌', '🏷️', '📌', '🤲', '🤝', '💡', '🎉', '🌟', '📦', '🎁', '🔥', '✅'];

export default function DashboardBroadcastEmailPage() {
    // Mode Recipient: 'manual' | 'members'
    const [recipientMode, setRecipientMode] = useState('manual');
    const [rawEmailText, setRawEmailText] = useState('');
    const [deduplicate, setDeduplicate] = useState(true);

    // Database members selection
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // Decoration Toggle & Customization
    const [isDecorated, setIsDecorated] = useState(true);
    const [themeColor, setThemeColor] = useState('#059669');
    const [headerTitle, setHeaderTitle] = useState('Barakah Economy');
    const [headerSubtitle, setHeaderSubtitle] = useState('Platform Ekonomi Keumatan Berkah & Terpercaya');
    const [badgeText, setBadgeText] = useState('PENAWARAN SPESIAL');
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [heroImageFile, setHeroImageFile] = useState(null);
    const [ctaText, setCtaText] = useState('Klaim Promo & Belanja Sekarang');
    const [ctaUrl, setCtaUrl] = useState('https://barakaheconomy.id/store');
    const [footerText, setFooterText] = useState('Barakah Economy • Platform Ekosistem Ekonomi Keumatan Mandiri\nEmail ini dikirim secara otomatis kepada mitra dan anggota terdaftar.');

    // Secondary Links
    const [secondaryLinks, setSecondaryLinks] = useState([
        { title: 'Tanya CS via WhatsApp', url: 'https://wa.me/628123456789' },
        { title: 'Kunjungi Portal Barakah Economy', url: 'https://barakaheconomy.id' }
    ]);

    // Message details
    const [subject, setSubject] = useState("{Kabar Gembira|Penawaran Spesial}: Diskon Istimewa Pekan Ini!");
    const [message, setMessage] = useState(PRESET_EMAIL_TEMPLATES[0].body);
    const [attachments, setAttachments] = useState([]);

    // Anti-ban & Throttle settings
    const [minDelay, setMinDelay] = useState(3.0);
    const [maxDelay, setMaxDelay] = useState(6.0);

    // UI state
    const [activeTab, setActiveTab] = useState('composer'); // 'composer' | 'preview' | 'monitor'
    const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Queue monitoring state
    const [activeTasks, setActiveTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    // Fetch members from database when members mode selected
    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const params = { page_size: 1000 };
            if (userSearchQuery) params.search = userSearchQuery;
            if (userRoleFilter !== 'all') params.role = userRoleFilter;
            const res = await api.get('/auth/users/', { params });
            const list = res.data.results || res.data || [];
            // Filter only users with valid email
            const valid = list.filter(u => u.email && u.email.includes('@'));
            setAvailableUsers(valid);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoadingUsers(false);
        }
    }, [userSearchQuery, userRoleFilter]);

    useEffect(() => {
        if (recipientMode === 'members') {
            fetchUsers();
        }
    }, [recipientMode, fetchUsers]);

    // Fetch active queue tasks periodically
    const fetchActiveTasks = useCallback(async () => {
        try {
            setLoadingTasks(true);
            const res = await api.get('/auth/users/blast_queue_status/');
            const tasks = res.data?.tasks || [];
            // Filter or display tasks
            setActiveTasks(tasks.filter(t => t.task_type === 'email' || t.status === 'processing' || t.status === 'queued'));
        } catch (err) {
            console.error('Error fetching tasks:', err);
        } finally {
            setLoadingTasks(false);
        }
    }, []);

    useEffect(() => {
        fetchActiveTasks();
        const interval = setInterval(fetchActiveTasks, 6000);
        return () => clearInterval(interval);
    }, [fetchActiveTasks]);

    // Parse recipient emails based on mode
    const parsedEmails = useMemo(() => {
        let list = [];
        if (recipientMode === 'manual') {
            const parts = rawEmailText.split(/[\r\n,; ]+/);
            const emailRegex = /^[\w\.-]+@([\w\.-]+)\.[a-zA-Z]{2,}$/;
            for (const p of parts) {
                const clean = p.trim().toLowerCase();
                if (clean && emailRegex.test(clean)) {
                    list.push({ email: clean, name: clean.split('@')[0] });
                }
            }
        } else {
            // from selected members
            list = availableUsers
                .filter(u => selectedUserIds.includes(u.id) && u.email)
                .map(u => ({
                    email: u.email.trim().toLowerCase(),
                    name: u.profile?.name_full || u.username || u.email.split('@')[0],
                    id: u.id
                }));
        }

        if (deduplicate) {
            const seen = new Set();
            list = list.filter(item => {
                if (seen.has(item.email)) return false;
                seen.add(item.email);
                return true;
            });
        }
        return list;
    }, [recipientMode, rawEmailText, availableUsers, selectedUserIds, deduplicate]);

    // Spintax quick resolver for preview simulation
    const resolvePreviewSpintax = (text) => {
        if (!text) return '';
        let result = text;
        const pattern = /\{([^{}]+)\}/g;
        result = result.replace(pattern, (match, choicesStr) => {
            if (choicesStr.includes('|')) {
                const choices = choicesStr.split('|');
                return choices[0].trim(); // pick first option for stable preview
            }
            return match;
        });
        return result.replace(/\{name\}/g, 'Ahmad Fulan').replace(/\{email\}/g, 'fulan@example.com').replace(/\{username\}/g, 'fulan26');
    };

    const handleApplyTemplate = (tpl) => {
        setSubject(tpl.subject);
        setHeaderTitle(tpl.headerTitle);
        setHeaderSubtitle(tpl.headerSubtitle);
        setBadgeText(tpl.badge);
        setCtaText(tpl.ctaText);
        setCtaUrl(tpl.ctaUrl);
        setThemeColor(tpl.themeColor);
        setMessage(tpl.body);
    };

    const handleAddAttachment = (e) => {
        const files = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...files]);
    };

    const handleRemoveAttachment = (idx) => {
        setAttachments(prev => prev.filter((_, i) => i !== idx));
    };

    const handleHeroImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setHeroImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setHeroImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddSecondaryLink = () => {
        setSecondaryLinks(prev => [...prev, { title: 'Tautan Baru', url: 'https://' }]);
    };

    const handleUpdateSecondaryLink = (index, key, value) => {
        setSecondaryLinks(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [key]: value };
            return copy;
        });
    };

    const handleRemoveSecondaryLink = (index) => {
        setSecondaryLinks(prev => prev.filter((_, i) => i !== index));
    };

    // Test send to admin self
    const handleSendTest = async () => {
        if (!subject.trim() || !message.trim()) {
            alert('Harap isi subjek dan pesan email terlebih dahulu.');
            return;
        }
        setIsTesting(true);
        setTestResult(null);
        try {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('message', message);
            formData.append('test_to_self', 'true');
            formData.append('is_decorated', isDecorated ? 'true' : 'false');
            formData.append('header_title', headerTitle);
            formData.append('header_subtitle', headerSubtitle);
            formData.append('hero_image_url', heroImageUrl);
            formData.append('badge_text', badgeText);
            formData.append('theme_color', themeColor);
            formData.append('cta_text', ctaText);
            formData.append('cta_url', ctaUrl);
            formData.append('footer_text', footerText);
            formData.append('secondary_links', JSON.stringify(secondaryLinks.filter(l => l.url && l.url !== 'https://')));

            attachments.forEach(file => {
                formData.append('attachments', file);
            });

            const res = await api.post('/auth/users/custom_blast_email/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setTestResult({ type: 'success', message: res.data.message || 'Email uji coba berhasil dikirim!' });
        } catch (err) {
            setTestResult({
                type: 'error',
                message: err.response?.data?.error || err.message || 'Gagal mengirim email uji coba.'
            });
        } finally {
            setIsTesting(false);
        }
    };

    // Submit broadcast blast
    const handleSubmitBlast = async (e) => {
        e.preventDefault();
        if (parsedEmails.length === 0) {
            alert('Tidak ada alamat email penerima yang valid.');
            return;
        }
        if (!subject.trim() || !message.trim()) {
            alert('Harap isi subjek dan pesan email.');
            return;
        }

        const confirmMsg = `Kirim broadcast email ke ${parsedEmails.length} penerima?\n\n` +
            `• Mode Dekorasi: ${isDecorated ? 'Aktif (Template Newsletter)' : 'Non-aktif (Standar)'}\n` +
            `• Estimasi Jeda: ${minDelay} - ${maxDelay} detik anti-ban\n` +
            `• Lampiran File: ${attachments.length} file`;

        if (!window.confirm(confirmMsg)) return;

        setIsSubmitting(true);
        setSubmitResult(null);
        try {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('message', message);
            formData.append('is_decorated', isDecorated ? 'true' : 'false');
            formData.append('header_title', headerTitle);
            formData.append('header_subtitle', headerSubtitle);
            formData.append('hero_image_url', heroImageUrl);
            formData.append('badge_text', badgeText);
            formData.append('theme_color', themeColor);
            formData.append('cta_text', ctaText);
            formData.append('cta_url', ctaUrl);
            formData.append('footer_text', footerText);
            formData.append('min_delay', minDelay);
            formData.append('max_delay', maxDelay);
            formData.append('secondary_links', JSON.stringify(secondaryLinks.filter(l => l.url && l.url !== 'https://')));

            // Send emails list
            const emailsPayload = parsedEmails.map(p => ({ email: p.email, name: p.name }));
            formData.append('emails', JSON.stringify(emailsPayload));

            attachments.forEach(file => {
                formData.append('attachments', file);
            });

            const res = await api.post('/auth/users/custom_blast_email/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSubmitResult({
                type: 'success',
                message: res.data.message || 'Blast email berhasil dimasukkan ke antrian server!',
                details: res.data.details
            });
            setActiveTab('monitor');
            fetchActiveTasks();
        } catch (err) {
            setSubmitResult({
                type: 'error',
                message: err.response?.data?.error || err.message || 'Gagal mengirim broadcast email.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cancel active task
    const handleCancelTask = async (taskId) => {
        if (!window.confirm('Batalkan pengiriman antrian email ini?')) return;
        try {
            await api.post('/auth/users/cancel_blast_task/', { task_id: taskId });
            alert('Antrian pengiriman berhasil dibatalkan.');
            fetchActiveTasks();
        } catch (err) {
            alert('Gagal membatalkan antrian: ' + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
            <Header title="Broadcast Email & Newsletter" />

            {/* Breadcrumb & Navigation */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                        <Link to="/dashboard" className="text-gray-500 hover:text-emerald-700 font-medium">Dashboard</Link>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-900 font-bold">Broadcast Email</span>
                    </div>

                    {/* Tabs Switcher */}
                    <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('composer')}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition ${
                                activeTab === 'composer' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="material-icons text-sm">edit_note</span>
                            <span>Composer</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('preview')}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition ${
                                activeTab === 'preview' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="material-icons text-sm">visibility</span>
                            <span>Live Preview</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setActiveTab('monitor'); fetchActiveTasks(); }}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition ${
                                activeTab === 'monitor' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="material-icons text-sm">hourglass_top</span>
                            <span>Antrian & Log</span>
                            {activeTasks.length > 0 && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* Status Message Alerts */}
                {submitResult && (
                    <div className={`mb-6 p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                        submitResult.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-2xl">
                                {submitResult.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            <div>
                                <p className="font-black text-sm">{submitResult.message}</p>
                                {submitResult.details && (
                                    <p className="text-xs opacity-80 mt-0.5">
                                        ID Antrian: {submitResult.details.task_id} • Total: {submitResult.details.total} penerima • Estimasi: ~{submitResult.details.estimated_minutes} menit
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setSubmitResult(null)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-icons text-base">close</span>
                        </button>
                    </div>
                )}

                {/* ================= TAB 1: COMPOSER ================= */}
                {activeTab === 'composer' && (
                    <form onSubmit={handleSubmitBlast} className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* LEFT COLUMN: Recipient Selector & Anti-Ban Controls (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">

                            {/* Recipient Selection Card */}
                            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                                            <span className="material-icons text-base">contact_mail</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900">Daftar Penerima Email</h3>
                                            <p className="text-[11px] text-gray-400">Pilih sumber kontak target broadcast</p>
                                        </div>
                                    </div>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700">
                                        {parsedEmails.length} Email Valid
                                    </span>
                                </div>

                                {/* Mode Recipient Switcher */}
                                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setRecipientMode('manual')}
                                        className={`py-2 text-xs font-bold rounded-xl transition ${
                                            recipientMode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        Input Manual / Paste
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRecipientMode('members')}
                                        className={`py-2 text-xs font-bold rounded-xl transition ${
                                            recipientMode === 'members' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        Database Anggota BAE
                                    </button>
                                </div>

                                {/* Mode 1: Manual Input */}
                                {recipientMode === 'manual' && (
                                    <div className="space-y-2">
                                        <textarea
                                            rows="5"
                                            value={rawEmailText}
                                            onChange={e => setRawEmailText(e.target.value)}
                                            placeholder="Masukkan alamat email (pisahkan dengan koma, spasi, atau baris baru)&#10;Contoh:&#10;budi@gmail.com, ahmad@yahoo.com&#10;siti@perusahaan.co.id"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={deduplicate}
                                                    onChange={e => setDeduplicate(e.target.checked)}
                                                    className="rounded text-blue-600 w-3.5 h-3.5"
                                                />
                                                <span>Deduplikasi otomatis (hapus email ganda)</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setRawEmailText('')}
                                                className="text-red-500 hover:underline"
                                            >
                                                Bersihkan
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Mode 2: Database Members */}
                                {recipientMode === 'members' && (
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={userSearchQuery}
                                                onChange={e => setUserSearchQuery(e.target.value)}
                                                placeholder="Cari nama / email anggota..."
                                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <select
                                                value={userRoleFilter}
                                                onChange={e => setUserRoleFilter(e.target.value)}
                                                className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                                            >
                                                <option value="all">Semua Role</option>
                                                <option value="user">User</option>
                                                <option value="seller">Seller</option>
                                                <option value="staff">Staff</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between text-xs px-1">
                                            <span className="text-gray-400">Ditemukan {availableUsers.length} user ber-email</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedUserIds.length === availableUsers.length) {
                                                        setSelectedUserIds([]);
                                                    } else {
                                                        setSelectedUserIds(availableUsers.map(u => u.id));
                                                    }
                                                }}
                                                className="text-blue-600 font-bold hover:underline"
                                            >
                                                {selectedUserIds.length === availableUsers.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                                            </button>
                                        </div>

                                        <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50 bg-gray-50/50">
                                            {loadingUsers ? (
                                                <div className="p-4 text-center text-xs text-gray-400">Memuat anggota...</div>
                                            ) : availableUsers.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-gray-400">Tidak ada user ber-email ditemukan.</div>
                                            ) : (
                                                availableUsers.map(u => (
                                                    <label key={u.id} className="flex items-center justify-between p-2.5 hover:bg-white cursor-pointer transition text-xs">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUserIds.includes(u.id)}
                                                                onChange={() => {
                                                                    setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id]);
                                                                }}
                                                                className="rounded text-blue-600 w-3.5 h-3.5"
                                                            />
                                                            <div className="truncate">
                                                                <p className="font-bold text-gray-800 truncate">{u.profile?.name_full || u.username}</p>
                                                                <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 capitalize">
                                                            {u.role}
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Preset Templates Selector */}
                            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                                        <span className="material-icons text-amber-500 text-sm">auto_awesome</span>
                                        Template Penawaran & Konten Cepat
                                    </h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {PRESET_EMAIL_TEMPLATES.map(tpl => (
                                        <button
                                            key={tpl.id}
                                            type="button"
                                            onClick={() => handleApplyTemplate(tpl)}
                                            className="p-3 text-left border border-gray-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 transition group"
                                        >
                                            <p className="text-xs font-black text-gray-800 group-hover:text-emerald-700">{tpl.title}</p>
                                            <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{tpl.headerTitle}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Anti-Ban & Safe Delivery Controls */}
                            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                            <span className="material-icons text-base">shield</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900">Perlindungan Anti-Ban & Rate Limit</h3>
                                            <p className="text-[11px] text-gray-400">Mencegah server SMTP terblokir / masuk spam</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                        Aman
                                    </span>
                                </div>

                                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2 text-xs text-emerald-900">
                                    <div className="flex items-start gap-2">
                                        <span className="material-icons text-emerald-700 text-base shrink-0">verified_user</span>
                                        <div className="leading-relaxed">
                                            <p className="font-bold">Mekanisme Anti-Ban Barakah Email:</p>
                                            <ul className="list-disc ml-4 space-y-1 mt-1 text-[11px] opacity-90">
                                                <li><b>Random Jitter:</b> Setiap email dikirim dengan jeda acak 3-6 detik agar tidak terdeteksi bot flood.</li>
                                                <li><b>Batch Cooldown Otomatis:</b> Setiap 20 email, antrian otomatis beristirahat 30-45 detik untuk mendinginkan koneksi SMTP.</li>
                                                <li><b>Spintax Variasi:</b> Variasi kata format <code className="bg-emerald-200/50 px-1 rounded">{`{Halo|Hai|Assalamu'alaikum}`}</code> untuk mengubah hash email per penerima.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Jeda Minimal (Detik)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="1.5"
                                            max="30"
                                            value={minDelay}
                                            onChange={e => setMinDelay(Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 block mb-1">Jeda Maksimal (Detik)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="3"
                                            max="60"
                                            value={maxDelay}
                                            onChange={e => setMaxDelay(Number(e.target.value))}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Test Send to Self */}
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Uji Coba Kirim ke Email Anda</p>
                                            <p className="text-[10px] text-gray-400">Pastikan tampilan email sesuai sebelum kirim massal</p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isTesting}
                                            onClick={handleSendTest}
                                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 transition"
                                        >
                                            {isTesting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                                    <span>Mengirim...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons text-xs">send</span>
                                                    <span>Kirim Tes</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {testResult && (
                                        <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                                            testResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                        }`}>
                                            <span className="material-icons text-sm">{testResult.type === 'success' ? 'check' : 'error'}</span>
                                            <span>{testResult.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: Composer & Decorative Options (7 cols) */}
                        <div className="lg:col-span-7 space-y-6">

                            {/* Main Email Composer Card */}
                            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                                    <div>
                                        <h3 className="text-base font-black text-gray-900">Konten Pesan Email</h3>
                                        <p className="text-xs text-gray-400">Atur subjek, dekorasi penawaran, serta isi broadcast</p>
                                    </div>

                                    {/* Decoration Toggle */}
                                    <div className="flex items-center gap-2.5 bg-gray-100 p-1.5 rounded-2xl">
                                        <span className="text-xs font-black text-gray-700 pl-2">
                                            Dekorasi Penawaran:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsDecorated(!isDecorated)}
                                            className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                                                isDecorated ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-300 text-gray-600'
                                            }`}
                                        >
                                            <span className="material-icons text-xs">{isDecorated ? 'palette' : 'text_snippet'}</span>
                                            <span>{isDecorated ? 'AKTIF (Promo Card)' : 'NON-AKTIF (Standar)'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Subject */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Subjek Email</label>
                                        <span className="text-[10px] text-gray-400">Mendukung Spintax format {`{A|B|C}`}</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder="Subjek email yang menarik perhatian..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                {/* Decoration Options Accordion (when isDecorated is true) */}
                                {isDecorated && (
                                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-3xl p-5 space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
                                            <div className="flex items-center gap-2">
                                                <span className="material-icons text-emerald-700 text-sm">tune</span>
                                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Kustomisasi Dekorasi Penawaran</h4>
                                            </div>
                                            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                                                Template Newsletter Responsive
                                            </span>
                                        </div>

                                        {/* Color Theme Selector */}
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-gray-500">Tema Warna Dekorasi</label>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {THEME_PALETTES.map(pal => (
                                                    <button
                                                        key={pal.id}
                                                        type="button"
                                                        onClick={() => setThemeColor(pal.hex)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                                                            themeColor === pal.hex ? `${pal.borderClass} ring-2 ring-emerald-500/20 bg-white` : 'border-gray-200 bg-white/70 hover:bg-white'
                                                        }`}
                                                    >
                                                        <span className={`w-3.5 h-3.5 rounded-full ${pal.bgClass}`}></span>
                                                        <span>{pal.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-500 block mb-1">Judul Header / Brand</label>
                                                <input
                                                    type="text"
                                                    value={headerTitle}
                                                    onChange={e => setHeaderTitle(e.target.value)}
                                                    placeholder="Contoh: Barakah Economy Promo"
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-500 block mb-1">Badge Promo (Label Atas)</label>
                                                <input
                                                    type="text"
                                                    value={badgeText}
                                                    onChange={e => setBadgeText(e.target.value)}
                                                    placeholder="Contoh: PENAWARAN TERBATAS"
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="text-[11px] font-bold text-gray-500 block mb-1">Sub-judul Header</label>
                                                <input
                                                    type="text"
                                                    value={headerSubtitle}
                                                    onChange={e => setHeaderSubtitle(e.target.value)}
                                                    placeholder="Keterangan singkat di bawah judul header..."
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Banner / Hero Image */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-gray-500 block">Banner / Gambar Hero Utama</label>
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                <input
                                                    type="text"
                                                    value={heroImageUrl}
                                                    onChange={e => setHeroImageUrl(e.target.value)}
                                                    placeholder="Masukkan URL gambar (https://...)..."
                                                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                                                />
                                                <span className="text-[11px] text-gray-400 font-bold">atau</span>
                                                <label className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-1.5 transition">
                                                    <span className="material-icons text-sm text-emerald-700">upload</span>
                                                    <span>Upload File</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleHeroImageChange} />
                                                </label>
                                                {heroImageUrl && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setHeroImageUrl('')}
                                                        className="text-xs text-red-500 hover:underline"
                                                    >
                                                        Hapus Gambar
                                                    </button>
                                                )}
                                            </div>
                                            {heroImageUrl && (
                                                <div className="mt-2 w-full max-h-36 rounded-2xl overflow-hidden border border-gray-200 bg-black/5 flex items-center justify-center">
                                                    <img src={heroImageUrl} alt="Hero Preview" className="max-h-36 w-full object-cover" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Call to Action Button */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200/80">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-500 block mb-1">Teks Tombol CTA</label>
                                                <input
                                                    type="text"
                                                    value={ctaText}
                                                    onChange={e => setCtaText(e.target.value)}
                                                    placeholder="Contoh: Belanja Sekarang"
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-500 block mb-1">Tautan / URL Tombol</label>
                                                <input
                                                    type="url"
                                                    value={ctaUrl}
                                                    onChange={e => setCtaUrl(e.target.value)}
                                                    placeholder="https://barakaheconomy.id/..."
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Secondary Links */}
                                        <div className="space-y-2 pt-2 border-t border-gray-200/80">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] font-bold text-gray-500">Tautan Tambahan (Link Ekstra)</label>
                                                <button
                                                    type="button"
                                                    onClick={handleAddSecondaryLink}
                                                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                                                >
                                                    <span className="material-icons text-xs">add</span>
                                                    <span>Tambah Link</span>
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {secondaryLinks.map((link, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={link.title}
                                                            onChange={e => handleUpdateSecondaryLink(idx, 'title', e.target.value)}
                                                            placeholder="Label tautan..."
                                                            className="w-1/3 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none"
                                                        />
                                                        <input
                                                            type="url"
                                                            value={link.url}
                                                            onChange={e => handleUpdateSecondaryLink(idx, 'url', e.target.value)}
                                                            placeholder="https://..."
                                                            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSecondaryLink(idx)}
                                                            className="text-gray-400 hover:text-red-500"
                                                        >
                                                            <span className="material-icons text-sm">close</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Main Body Message */}
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Isi Surat / Pesan Email</label>
                                        <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-[10px] text-gray-400 font-bold mr-1">Sisipkan Tag:</span>
                                            <button type="button" onClick={() => setMessage(p => p + ' {name}')} className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] hover:bg-emerald-100">+{'{name}'}</button>
                                            <button type="button" onClick={() => setMessage(p => p + ' {email}')} className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[10px] hover:bg-blue-100">+{'{email}'}</button>
                                            <button type="button" onClick={() => setMessage(p => p + ' {username}')} className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-[10px] hover:bg-purple-100">+{'{username}'}</button>
                                            <button type="button" onClick={() => setMessage(p => p + ' {Halo|Hai|Assalamu\'alaikum}')} className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold text-[10px] hover:bg-amber-100">+Spintax Sapaan</button>
                                        </div>
                                    </div>

                                    {/* Quick Emoji Bar */}
                                    <div className="flex flex-wrap gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
                                        {EMOJI_QUICK.map((em, i) => (
                                            <button key={i} type="button" onClick={() => setMessage(p => p + em)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-sm transition">
                                                {em}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        rows="10"
                                        required
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder="Tulis pesan penawaran lengkap di sini..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-sans leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                {/* Attachments Section (Supported for BOTH decorated & non-decorated) */}
                                <div className="space-y-3 pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="material-icons text-sm text-gray-500">attach_file</span>
                                            <span>Lampiran File & Gambar (PDF, Brosur, Dokumen)</span>
                                        </label>
                                        <span className="text-[10px] text-gray-400">Bisa kirim banyak file</span>
                                    </div>

                                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer transition">
                                        <span className="material-icons text-gray-400">upload_file</span>
                                        <span className="text-xs font-bold text-gray-600">Klik untuk memilih file lampiran...</span>
                                        <input type="file" multiple className="hidden" onChange={handleAddAttachment} />
                                    </label>

                                    {attachments.length > 0 && (
                                        <div className="space-y-1.5">
                                            {attachments.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="material-icons text-sm text-gray-500">description</span>
                                                        <span className="font-bold text-gray-800 truncate">{file.name}</span>
                                                        <span className="text-[10px] text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-gray-400 hover:text-red-500">
                                                        <span className="material-icons text-sm">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Text */}
                                <div className="space-y-1 pt-2 border-t border-gray-100">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Footer Email & Disclaimer</label>
                                    <textarea
                                        rows="2"
                                        value={footerText}
                                        onChange={e => setFooterText(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none"
                                    />
                                </div>

                                {/* Submit Button Bar */}
                                <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('preview')}
                                        className="px-5 py-2.5 rounded-2xl border border-gray-300 hover:bg-gray-100 font-bold text-xs text-gray-700 flex items-center gap-1.5 transition"
                                    >
                                        <span className="material-icons text-sm">visibility</span>
                                        <span>Lihat Preview Dulu</span>
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || parsedEmails.length === 0}
                                        className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-700/20 flex items-center gap-2 transition"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                <span>Memproses Antrian Blasting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-icons text-sm">send</span>
                                                <span>Kirim Broadcast ke {parsedEmails.length} Penerima</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                            </div>

                        </div>

                    </form>
                )}

                {/* ================= TAB 2: LIVE PREVIEW ================= */}
                {activeTab === 'preview' && (
                    <div className="space-y-6">
                        {/* Device & Mode Selector Bar */}
                        <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-emerald-700 text-lg">preview</span>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900">Simulasi Tampilan Email di Inbox</h3>
                                    <p className="text-[11px] text-gray-400">Tampilan akurat email penerima (Gmail, Yahoo, Apple Mail)</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('desktop')}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            previewDevice === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                        }`}
                                    >
                                        <span className="material-icons text-xs">desktop_windows</span>
                                        <span>Desktop</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewDevice('mobile')}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            previewDevice === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                        }`}
                                    >
                                        <span className="material-icons text-xs">smartphone</span>
                                        <span>Mobile</span>
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setActiveTab('composer')}
                                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black transition flex items-center gap-1.5"
                                >
                                    <span className="material-icons text-xs">edit</span>
                                    <span>Kembali Edit</span>
                                </button>
                            </div>
                        </div>

                        {/* Inbox Header Mockup */}
                        <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-200 shadow-sm p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-gray-100">
                                <span>Dari: <b>Barakah Economy &lt;pengirim@barakaheconomy.id&gt;</b></span>
                                <span>Kepada: <b>Ahmad Fulan &lt;fulan@example.com&gt;</b></span>
                            </div>
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-black text-gray-900">{resolvePreviewSpintax(subject)}</h2>
                                <span className="text-[11px] text-gray-400">Baru saja</span>
                            </div>
                        </div>

                        {/* Email Body Mockup */}
                        <div className="flex justify-center">
                            <div className={`transition-all duration-300 w-full ${previewDevice === 'mobile' ? 'max-w-md' : 'max-w-2xl'}`}>
                                {isDecorated ? (
                                    /* DECORATED TEMPLATE PREVIEW */
                                    <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200">
                                        {/* Color Accent Bar */}
                                        <div style={{ backgroundColor: themeColor }} className="h-2 w-full"></div>

                                        {/* Header */}
                                        <div className="p-8 text-center border-b border-gray-100">
                                            {badgeText && (
                                                <div className="mb-3">
                                                    <span
                                                        style={{ backgroundColor: themeColor }}
                                                        className="inline-block px-3.5 py-1 text-white text-[10px] font-black uppercase tracking-wider rounded-full"
                                                    >
                                                        {badgeText}
                                                    </span>
                                                </div>
                                            )}
                                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{headerTitle}</h1>
                                            {headerSubtitle && (
                                                <p className="text-xs text-gray-500 mt-1 font-medium">{headerSubtitle}</p>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-8 space-y-6">
                                            {heroImageUrl && (
                                                <div className="rounded-2xl overflow-hidden">
                                                    <img src={heroImageUrl} alt="Banner" className="w-full h-auto object-cover rounded-2xl" />
                                                </div>
                                            )}

                                            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
                                                {resolvePreviewSpintax(message)}
                                            </div>

                                            {/* CTA Button */}
                                            {ctaText && ctaUrl && (
                                                <div className="text-center pt-4">
                                                    <a
                                                        href={ctaUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ backgroundColor: themeColor }}
                                                        className="inline-block px-8 py-3.5 text-white font-bold text-xs rounded-2xl shadow-md hover:opacity-95 transition"
                                                    >
                                                        {ctaText} &rarr;
                                                    </a>
                                                    <p className="text-[10px] text-gray-400 mt-2 font-mono">
                                                        {ctaUrl}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Secondary Links */}
                                            {secondaryLinks.length > 0 && secondaryLinks.some(l => l.url && l.url !== 'https://') && (
                                                <div className="pt-4 border-t border-dashed border-gray-200">
                                                    <p className="text-xs font-bold text-gray-700 mb-2">Tautan Tambahan:</p>
                                                    <ul className="space-y-1 text-xs">
                                                        {secondaryLinks.map((l, idx) => l.url && (
                                                            <li key={idx} className="flex items-center gap-1.5 text-emerald-700 font-semibold underline">
                                                                <span className="material-icons text-xs">arrow_right</span>
                                                                <a href={l.url} target="_blank" rel="noreferrer">{l.title || l.url}</a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Attachments preview notice */}
                                            {attachments.length > 0 && (
                                                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 flex items-center gap-2">
                                                    <span className="material-icons text-base text-gray-400">attach_file</span>
                                                    <span>Terlampir <b>{attachments.length} file</b> ({attachments.map(a => a.name).join(', ')})</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="p-6 bg-slate-50 border-t border-gray-100 text-center text-[11px] text-gray-500 leading-relaxed">
                                            <p className="whitespace-pre-line">{footerText}</p>
                                            <p className="text-[10px] text-gray-400 mt-2">
                                                Terkirim ke: <strong>fulan@example.com</strong>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* NON-DECORATED STANDARD PREVIEW */
                                    <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-200 space-y-6">
                                        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line font-sans">
                                            {resolvePreviewSpintax(message)}
                                        </div>

                                        {ctaUrl && (
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                                                <span className="font-bold">Tautan Terkait: </span>
                                                <a href={ctaUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono">
                                                    {ctaUrl}
                                                </a>
                                            </div>
                                        )}

                                        {attachments.length > 0 && (
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center gap-2">
                                                <span className="material-icons text-sm">attach_file</span>
                                                <span>Lampiran: {attachments.map(a => a.name).join(', ')}</span>
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-400 leading-relaxed whitespace-pre-line">
                                            {footerText}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 3: MONITORING ANTRIAN & LOG ================= */}
                {activeTab === 'monitor' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-black text-gray-900">Monitor Antrian Background Blasting</h3>
                                    <p className="text-xs text-gray-400">Pengiriman berlangsung di latar belakang dengan interval aman anti-ban</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchActiveTasks}
                                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold flex items-center gap-1.5 transition"
                                >
                                    <span className={`material-icons text-xs ${loadingTasks ? 'animate-spin' : ''}`}>refresh</span>
                                    <span>Muat Ulang</span>
                                </button>
                            </div>

                            {activeTasks.length === 0 ? (
                                <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-3xl space-y-2">
                                    <span className="material-icons text-4xl text-gray-300">task_alt</span>
                                    <p className="text-sm font-bold text-gray-700">Tidak ada proses blasting aktif</p>
                                    <p className="text-xs text-gray-400">Semua email yang Anda kirimkan telah selesai diproses atau belum ada antrian baru.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeTasks.map((t, idx) => {
                                        const percent = t.total > 0 ? Math.round((t.processed_count / t.total) * 100) : 0;
                                        return (
                                            <div key={idx} className="p-5 rounded-3xl border border-gray-200 bg-gray-50/50 space-y-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        <p className="text-xs font-black text-gray-900">
                                                            Task #{t.task_id.substring(0, 10)} • {t.task_type.toUpperCase()}
                                                        </p>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                            t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                            t.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                            t.status === 'cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {t.status}
                                                        </span>
                                                    </div>

                                                    {['queued', 'processing'].includes(t.status) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelTask(t.task_id)}
                                                            className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 transition"
                                                        >
                                                            <span className="material-icons text-xs">stop_circle</span>
                                                            <span>Batalkan Antrian</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs font-bold text-gray-600">
                                                        <span>Progres: {t.processed_count} dari {t.total} email ({percent}%)</span>
                                                        <span className="text-emerald-700 font-extrabold">{t.success_count} Berhasil • {t.failed_count} Gagal</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-emerald-600 to-teal-500 h-2.5 rounded-full transition-all duration-500"
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {t.current_item && (
                                                    <p className="text-[11px] text-gray-500 truncate">
                                                        Sedang memproses: <strong className="text-gray-800">{t.current_item}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            <NavigationButton />
        </div>
    );
}
