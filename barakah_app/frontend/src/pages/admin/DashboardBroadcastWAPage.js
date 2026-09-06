import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import api from '../../services/api';

const PRESET_TEMPLATES = [
    {
        id: 'announcement',
        title: '📢 Pengumuman Komunitas',
        text: `*Assalamu'alaikum Warahmatullahi Wabarakatuh*\n\nKepada Yth. Saudara/i *{name}*,\n\nKami menginformasikan adanya agenda penting dalam ekosistem Barakah Economy:\n\n📌 *Agenda:* [Nama Kegiatan / Pengumuman]\n🗓️ *Tanggal:* [Hari, Tanggal]\n⏰ *Waktu:* [Waktu WIB]\n📍 *Tempat / Tautan:* [Lokasi / Link Online]\n\nMohon partisipasi dan kehadirannya. Jazakumullahu Khairan Katsiran.\n\n*Wassalamu'alaikum Warahmatullahi Wabarakatuh*\n_Admin Barakah Economy_`
    },
    {
        id: 'store_promo',
        title: '🛍️ Promo Barakah Store',
        text: `*Assalamu'alaikum Warahmatullahi Wabarakatuh* ✨\n\nHalo *{name}*,\n\nKabar gembira! Nikmati penawaran spesial dan produk UMKM berkah pilihan di *Barakah Store* pekan ini:\n\n🏷️ *Produk Unggulan:* [Nama Produk / Paket]\n💰 *Harga Spesial:* [Rp ...]\n🚚 *Pemesanan Cepat:* https://barakaheconomy.id/store\n\nDukung UMKM umat dan dapatkan berkah dalam setiap transaksi belanja Anda! 🤲`
    },
    {
        id: 'charity',
        title: '🕌 Info Program Charity & Donasi',
        text: `*Assalamu'alaikum Warahmatullahi Wabarakatuh* 🤲\n\nKepada Bapak/Ibu *{name}* yang dirahmati Allah,\n\nMari bersama alirkan kebaikan dan ulurkan tangan bagi saudara-saudara kita yang membutuhkan melalui program donasi terpadu:\n\n🌟 *Program:* [Nama Program Kemanusiaan]\n🎯 *Target Manfaat:* [Penerima Manfaat]\n💳 *Salurkan Donasi Melalui:* https://barakaheconomy.id/charity\n\nSemoga menjadi amal jariyah yang berlipat ganda. Aamiin ya Rabbal 'Alamin.`
    },
    {
        id: 'meeting',
        title: '🤝 Undangan Rapat / Pertemuan',
        text: `*Assalamu'alaikum Warahmatullahi Wabarakatuh*\n\nUndangan Pertemuan Anggota & Pengurus Barakah Economy:\n\n👤 *Penerima:* *{name}*\n🗓️ *Jadwal:* [Hari, Tanggal]\n🕒 *Pukul:* [Waktu WIB]\n📋 *Pembahasan:* [Topik Rapat]\n\nHarap melakukan konfirmasi dan presensi digital melalui aplikasi saat pertemuan dimulai.\n\nTerima kasih.`
    }
];

const EMOJI_LIST = ['📢', '✨', '🕌', '🛍️', '🏷️', '📌', '🤲', '🤝', '⚠️', '✅', '📞', '🗓️', '⏰', '💡', '🌟', '🎉'];

// Helper normalizer for Indonesian & international phone numbers
export function normalizePhoneNumber(rawInput) {
    if (!rawInput) return null;
    const str = String(rawInput).trim();
    const digits = str.replace(/\D/g, '');
    if (!digits || digits.length < 7) return null;

    let core = digits;
    if (core.startsWith('620')) {
        core = core.substring(3);
    } else if (core.startsWith('62')) {
        core = core.substring(2);
    } else if (core.startsWith('0')) {
        core = core.substring(1);
    }

    if (core.startsWith('8') && core.length >= 8) {
        return `+62${core}`;
    }
    if (digits.startsWith('62')) {
        return `+${digits}`;
    }
    return `+62${core}`;
}

const DashboardBroadcastWAPage = () => {
    // Input States
    const [inputMode, setInputMode] = useState('comma'); // 'comma' | 'list' | 'members'
    const [rawTextComma, setRawTextComma] = useState('');
    const [rawTextList, setRawTextList] = useState('');
    const [deduplicate, setDeduplicate] = useState(true);

    // Selected Users from Database
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');

    // Message Composer States
    const [message, setMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const textareaRef = useRef(null);

    // Queue & Anti-Ban Settings
    const [minDelay, setMinDelay] = useState(1.0);
    const [maxDelay, setMaxDelay] = useState(4.0);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [deviceStatusLoading, setDeviceStatusLoading] = useState(false);

    // Submission & Monitoring States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);
    const [activeTasks, setActiveTasks] = useState([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Fetch Connected WA Devices & Check Admin
    const fetchDevices = useCallback(async () => {
        try {
            setDeviceStatusLoading(true);
            const res = await api.get('/users/wa_devices/');
            if (res.data && Array.isArray(res.data.devices)) {
                setDevices(res.data.devices);
                if (res.data.devices.length > 0 && !selectedDevice) {
                    setSelectedDevice(res.data.devices[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch WA devices:', err);
        } finally {
            setDeviceStatusLoading(false);
        }
    }, [selectedDevice]);

    // Fetch Queue Tasks
    const fetchQueueStatus = useCallback(async () => {
        try {
            const res = await api.get('/users/blast_queue_status/');
            if (res.data && Array.isArray(res.data.tasks)) {
                setActiveTasks(res.data.tasks.filter(t => t.task_type === 'whatsapp'));
            }
        } catch (err) {
            console.error('Failed to fetch blast queue status:', err);
        }
    }, []);

    // Fetch Users list for Member Importer
    const fetchUsersList = async () => {
        try {
            setLoadingUsers(true);
            const res = await api.get('/users/?page_size=1000');
            const list = res.data?.results || (Array.isArray(res.data) ? res.data : []);
            // Only keep users that have phone number
            const usersWithPhone = list.filter(u => u.phone || u.profile?.phone_number);
            setAvailableUsers(usersWithPhone);
        } catch (err) {
            console.error('Failed to fetch users list:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchDevices();
        fetchQueueStatus();
        fetchUsersList();
    }, [fetchDevices, fetchQueueStatus]);

    // Auto-poll queue status every 3.5 seconds if there are active tasks
    useEffect(() => {
        const interval = setInterval(() => {
            fetchQueueStatus();
        }, 3500);
        return () => clearInterval(interval);
    }, [fetchQueueStatus]);

    // Parse phone numbers from Comma / Descriptive Input
    const parsedFromComma = useMemo(() => {
        if (!rawTextComma.trim()) return { valid: [], invalid: [], duplicatesCount: 0 };
        const rawTokens = rawTextComma.split(/[\r\n,;]+/).map(t => t.trim()).filter(Boolean);
        const seen = new Set();
        const valid = [];
        const invalid = [];
        let duplicatesCount = 0;

        rawTokens.forEach(token => {
            const normalized = normalizePhoneNumber(token);
            if (normalized) {
                if (seen.has(normalized)) {
                    duplicatesCount++;
                    if (!deduplicate) {
                        valid.push({ raw: token, formatted: normalized });
                    }
                } else {
                    seen.add(normalized);
                    valid.push({ raw: token, formatted: normalized });
                }
            } else {
                invalid.push(token);
            }
        });

        return { valid, invalid, duplicatesCount };
    }, [rawTextComma, deduplicate]);

    // Parse phone numbers from List / Multi-line Input
    const parsedFromList = useMemo(() => {
        if (!rawTextList.trim()) return { valid: [], invalid: [], duplicatesCount: 0 };
        const lines = rawTextList.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const seen = new Set();
        const valid = [];
        const invalid = [];
        let duplicatesCount = 0;

        lines.forEach(line => {
            const normalized = normalizePhoneNumber(line);
            if (normalized) {
                if (seen.has(normalized)) {
                    duplicatesCount++;
                    if (!deduplicate) {
                        valid.push({ raw: line, formatted: normalized });
                    }
                } else {
                    seen.add(normalized);
                    valid.push({ raw: line, formatted: normalized });
                }
            } else {
                invalid.push(line);
            }
        });

        return { valid, invalid, duplicatesCount };
    }, [rawTextList, deduplicate]);

    // Final Consolidated Recipients List based on active input mode
    const finalRecipients = useMemo(() => {
        if (inputMode === 'comma') {
            return parsedFromComma.valid.map(v => ({ phone: v.formatted, name: '' }));
        } else if (inputMode === 'list') {
            return parsedFromList.valid.map(v => ({ phone: v.formatted, name: '' }));
        } else {
            return selectedMembers.map(u => ({
                phone: normalizePhoneNumber(u.phone || u.profile?.phone_number || ''),
                name: u.profile?.name_full || u.username || '',
                username: u.username
            })).filter(r => Boolean(r.phone));
        }
    }, [inputMode, parsedFromComma, parsedFromList, selectedMembers]);

    // Filtered users in Member Importer modal
    const filteredUsers = useMemo(() => {
        return availableUsers.filter(u => {
            if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
            if (!userSearchQuery) return true;
            const q = userSearchQuery.toLowerCase();
            const name = (u.profile?.name_full || '').toLowerCase();
            const username = (u.username || '').toLowerCase();
            const phone = (u.phone || '').toLowerCase();
            return name.includes(q) || username.includes(q) || phone.includes(q);
        });
    }, [availableUsers, userRoleFilter, userSearchQuery]);

    // Image Upload Handler
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Harap pilih file gambar (JPG, PNG, atau WEBP).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran gambar maksimal 5 MB.');
            return;
        }

        setImageFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            setImagePreview(reader.result);
            setImageBase64(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageBase64(null);
    };

    // Insert Tag or Format into message textarea
    const insertIntoMessage = (textToInsert) => {
        if (!textareaRef.current) {
            setMessage(prev => prev + textToInsert);
            return;
        }
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const before = message.substring(0, start);
        const after = message.substring(end);
        setMessage(before + textToInsert + after);
        setTimeout(() => {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }, 50);
    };

    const wrapSelectedText = (wrapChar) => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const selected = message.substring(start, end);
        const before = message.substring(0, start);
        const after = message.substring(end);
        const replacement = `${wrapChar}${selected || 'teks'}${wrapChar}`;
        setMessage(before + replacement + after);
        setTimeout(() => {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + wrapChar.length, start + wrapChar.length + (selected ? selected.length : 4));
        }, 50);
    };

    // Quick Member Select / Toggle
    const handleToggleMember = (user) => {
        const exists = selectedMembers.some(m => m.id === user.id);
        if (exists) {
            setSelectedMembers(prev => prev.filter(m => m.id !== user.id));
        } else {
            setSelectedMembers(prev => [...prev, user]);
        }
    };

    const handleSelectAllFilteredMembers = () => {
        const currentIds = new Set(selectedMembers.map(m => m.id));
        const newToAdd = filteredUsers.filter(u => !currentIds.has(u.id));
        setSelectedMembers(prev => [...prev, ...newToAdd]);
    };

    const handleDeselectAllFilteredMembers = () => {
        const filteredIds = new Set(filteredUsers.map(u => u.id));
        setSelectedMembers(prev => prev.filter(m => !filteredIds.has(m.id)));
    };

    // Send Broadcast Form Submit
    const handleSendBroadcast = async (e) => {
        e?.preventDefault();

        if (finalRecipients.length === 0) {
            alert('Daftar nomor penerima masih kosong atau belum ada nomor yang valid.');
            return;
        }

        if (!message.trim()) {
            alert('Pesan broadcast tidak boleh kosong.');
            return;
        }

        const confirmMsg = `Konfirmasi Kirim Broadcast:\n` +
            `• Jumlah Penerima: ${finalRecipients.length} nomor\n` +
            `• Antrean Anti-Ban: Jeda acak ${minDelay} s.d ${maxDelay} detik/pesan\n` +
            `• Lampiran Gambar: ${imageFile ? 'Ya (' + imageFile.name + ')' : 'Tidak'}\n\n` +
            `Yakin ingin memulai antrean pengiriman broadcast sekarang?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setIsSubmitting(true);
            setSubmitResult(null);

            const payload = {
                numbers: finalRecipients,
                message: message.trim(),
                image_base64: imageBase64,
                filename: imageFile ? imageFile.name : 'broadcast.jpg',
                min_delay: parseFloat(minDelay) || 1.0,
                max_delay: parseFloat(maxDelay) || 4.0,
                device_id: selectedDevice || null
            };

            const res = await api.post('/users/custom_blast_whatsapp/', payload);

            setSubmitResult({
                type: 'success',
                message: res.data.message || 'Broadcast berhasil dimasukkan ke antrean pengiriman!',
                details: res.data
            });

            // Refresh queue immediately
            fetchQueueStatus();

            // Clear input
            if (inputMode === 'comma') setRawTextComma('');
            if (inputMode === 'list') setRawTextList('');
            if (inputMode === 'members') setSelectedMembers([]);

            // Scroll to queue monitor
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

        } catch (err) {
            console.error('Failed to submit broadcast:', err);
            const errMsg = err.response?.data?.error || err.response?.data?.message || 'Gagal mengirim broadcast WhatsApp.';
            setSubmitResult({
                type: 'error',
                message: errMsg
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cancel Active Blast Task
    const handleCancelTask = async (taskId) => {
        if (!window.confirm('Batalkan pengiriman antrean ini? Pesan yang belum terkirim tidak akan diproses.')) return;
        try {
            await api.post('/users/cancel_blast_task/', { task_id: taskId });
            fetchQueueStatus();
        } catch (err) {
            console.error('Failed to cancel blast task:', err);
            alert('Gagal membatalkan antrean.');
        }
    };

    // Format WhatsApp preview with simple markup (bold, italic, newlines)
    const renderFormattedPreview = (text = '') => {
        let sample = text
            .replace(/{name}/g, 'Ahmad Fulan')
            .replace(/{phone}/g, '+6281234567890')
            .replace(/{number}/g, '+6281234567890');

        // Escape HTML
        sample = sample.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Bold *text*
        sample = sample.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
        // Italic _text_
        sample = sample.replace(/_([^_]+)_/g, '<em>$1</em>');
        // Strike ~text~
        sample = sample.replace(/~([^~]+)~/g, '<del>$1</del>');
        // Monospace ```text```
        sample = sample.replace(/```([^`]+)```/g, '<code class="bg-emerald-950/20 px-1 rounded text-xs">$1</code>');
        // Newline
        sample = sample.replace(/\n/g, '<br/>');

        return { __html: sample };
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
            <Header />

            <div className="max-w-7xl mx-auto w-full px-4 py-6">
                {/* Breadcrumb & Navigation */}
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-4">
                    <Link to="/dashboard" className="hover:text-emerald-700">Dashboard</Link>
                    <span className="material-icons text-xs text-gray-400">chevron_right</span>
                    <span className="text-gray-700">Admin</span>
                    <span className="material-icons text-xs text-gray-400">chevron_right</span>
                    <span className="text-emerald-700 font-extrabold">Broadcast WhatsApp</span>
                </div>

                {/* Hero Header Banner */}
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 sm:p-8 mb-8 shadow-xl">
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-black uppercase tracking-wider">
                                <span className="material-icons text-xs text-amber-300">campaign</span>
                                <span>WhatsApp Blast Engine</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/10">
                                <span className="material-icons text-xs text-emerald-400">security</span>
                                <span>Anti-Ban Protection (Jeda Acak 1 - 4s)</span>
                            </span>
                            {devices.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/30">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>{devices.length} Perangkat Terhubung</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-bold border border-amber-400/20">
                                    <span className="material-icons text-xs">info</span>
                                    <span>Server Default GoWA</span>
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                            Kirim Pesan Broadcast WhatsApp
                        </h1>
                        <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                            Kirim pesan massal ke banyak nomor sekaligus dengan format nomor fleksibel (+62, 08, 8xxx), 
                            dukungan pemisah koma atau list, serta sistem antrean otomatis dengan jeda acak 1–4 detik agar aman dari pemblokiran.
                        </p>
                    </div>

                    <div className="absolute right-4 bottom-0 opacity-15 pointer-events-none transform translate-y-4">
                        <span className="material-icons text-[140px]">send_to_mobile</span>
                    </div>
                </div>

                {/* Main Grid Layout: Left (Input & Composer) | Right (Preview & Queue) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Form Section (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* SECTION 1: Nomor Penerima & Format Selector */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                                        1
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-gray-900">Daftar Nomor Penerima</h2>
                                        <p className="text-xs text-gray-500">Pilih metode input nomor yang Anda inginkan</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-1.5 text-xs text-gray-600 font-bold cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={deduplicate}
                                            onChange={(e) => setDeduplicate(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        <span>Hapus Duplikat Otomatis</span>
                                    </label>
                                </div>
                            </div>

                            {/* Mode Selection Tabs */}
                            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-2xl mb-4">
                                <button
                                    type="button"
                                    onClick={() => setInputMode('comma')}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                                        inputMode === 'comma'
                                            ? 'bg-white text-emerald-800 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="material-icons text-sm">edit_note</span>
                                    <span>Pemisah Koma (,)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode('list')}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                                        inputMode === 'list'
                                            ? 'bg-white text-emerald-800 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="material-icons text-sm">format_list_numbered</span>
                                    <span>Format List / Baris</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMode('members')}
                                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                                        inputMode === 'members'
                                            ? 'bg-white text-emerald-800 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    <span className="material-icons text-sm">group_add</span>
                                    <span>Pilih Anggota ({selectedMembers.length})</span>
                                </button>
                            </div>

                            {/* Mode 1: Comma / Descriptive Raw Text */}
                            {inputMode === 'comma' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <textarea
                                            rows={5}
                                            value={rawTextComma}
                                            onChange={(e) => setRawTextComma(e.target.value)}
                                            placeholder="Contoh paste banyak nomor: 08123456789, +62 857 1111 2222, 628999888777, 813-4444-5555, 0821.3333.4444"
                                            className="w-full p-4 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-mono leading-relaxed"
                                        ></textarea>
                                        {rawTextComma && (
                                            <button
                                                type="button"
                                                onClick={() => setRawTextComma('')}
                                                className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-600 bg-white/80 px-2 py-1 rounded-lg border border-gray-200"
                                            >
                                                Bersihkan
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-normal">
                                        💡 <strong>Format Otomatis:</strong> Anda dapat menempelkan teks langsung dengan pemisah koma, titik koma, spasi, atau baris baru. Format <code>08...</code>, <code>+62 8...</code>, <code>62 8...</code>, dan <code>8...</code> akan distandarisasi otomatis.
                                    </p>
                                </div>
                            )}

                            {/* Mode 2: Line by line List */}
                            {inputMode === 'list' && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <textarea
                                            rows={6}
                                            value={rawTextList}
                                            onChange={(e) => setRawTextList(e.target.value)}
                                            placeholder="Satu nomor per baris, contoh:&#10;08123456789&#10;+62 857 1111 2222&#10;628999888777&#10;81344445555"
                                            className="w-full p-4 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs font-mono leading-relaxed"
                                        ></textarea>
                                        {rawTextList && (
                                            <button
                                                type="button"
                                                onClick={() => setRawTextList('')}
                                                className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-600 bg-white/80 px-2 py-1 rounded-lg border border-gray-200"
                                            >
                                                Bersihkan
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500 leading-normal">
                                        📋 <strong>Tips List:</strong> Sangat cocok saat Anda menyalin (Copy-Paste) kolom nomor telepon dari Excel, Google Spreadsheet, atau berkas CSV.
                                    </p>
                                </div>
                            )}

                            {/* Mode 3: Member Selector */}
                            {inputMode === 'members' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={userSearchQuery}
                                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                                    placeholder="Cari nama, username, atau no HP..."
                                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-emerald-500 focus:border-emerald-500"
                                                />
                                                <span className="material-icons text-sm text-gray-400 absolute left-3 top-2.5">search</span>
                                            </div>
                                            <select
                                                value={userRoleFilter}
                                                onChange={(e) => setUserRoleFilter(e.target.value)}
                                                className="py-2 px-3 rounded-xl border border-gray-300 text-xs bg-white font-bold"
                                            >
                                                <option value="all">Semua Role</option>
                                                <option value="member">Member</option>
                                                <option value="seller">Seller / UMKM</option>
                                                <option value="partner">Mitra</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSelectAllFilteredMembers}
                                                className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition"
                                            >
                                                Pilih Semua ({filteredUsers.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDeselectAllFilteredMembers}
                                                className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold transition"
                                            >
                                                Batal Pilih
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scrollable Members List */}
                                    <div className="max-h-60 overflow-y-auto rounded-2xl border border-gray-200 p-2 space-y-1 bg-gray-50/50 custom-scrollbar">
                                        {loadingUsers ? (
                                            <div className="text-center py-6 text-xs text-gray-400 font-bold">
                                                Memuat data anggota...
                                            </div>
                                        ) : filteredUsers.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-gray-400">
                                                Tidak ada pengguna dengan nomor HP yang cocok.
                                            </div>
                                        ) : (
                                            filteredUsers.map((u) => {
                                                const isSelected = selectedMembers.some(m => m.id === u.id);
                                                const phoneDisplay = u.phone || u.profile?.phone_number || '-';
                                                return (
                                                    <label
                                                        key={u.id}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                                                            isSelected ? 'bg-emerald-100/70 border border-emerald-300' : 'bg-white hover:bg-gray-100 border border-transparent'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleToggleMember(u)}
                                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                                            />
                                                            <div>
                                                                <p className="font-bold text-gray-900">
                                                                    {u.profile?.name_full || u.username}
                                                                    {u.role && (
                                                                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 uppercase font-black">
                                                                            {u.role}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                                <p className="text-[11px] text-gray-500 font-mono">{phoneDisplay}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-[11px] font-bold text-emerald-700">
                                                            {normalizePhoneNumber(phoneDisplay) || ''}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Live Number Summary Pill Stats */}
                            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="p-3 bg-slate-50 rounded-2xl border border-gray-200/70 text-center">
                                    <p className="text-[10px] uppercase font-black text-gray-400">Total Valid</p>
                                    <p className="text-lg font-black text-emerald-700">{finalRecipients.length}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-gray-200/70 text-center">
                                    <p className="text-[10px] uppercase font-black text-gray-400">Duplikat Terfilter</p>
                                    <p className="text-lg font-black text-amber-600">
                                        {inputMode === 'comma' ? parsedFromComma.duplicatesCount : inputMode === 'list' ? parsedFromList.duplicatesCount : 0}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-gray-200/70 text-center">
                                    <p className="text-[10px] uppercase font-black text-gray-400">Format Rusak</p>
                                    <p className="text-lg font-black text-rose-600">
                                        {inputMode === 'comma' ? parsedFromComma.invalid.length : inputMode === 'list' ? parsedFromList.invalid.length : 0}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl border border-gray-200/70 text-center flex flex-col justify-center">
                                    <button
                                        type="button"
                                        disabled={finalRecipients.length === 0}
                                        onClick={() => setShowPreviewModal(true)}
                                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-40 flex items-center justify-center gap-1"
                                    >
                                        <span className="material-icons text-sm">visibility</span>
                                        <span>Lihat Nomor ({finalRecipients.length})</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Komposer Pesan */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                                        2
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-gray-900">Konten Pesan WhatsApp</h2>
                                        <p className="text-xs text-gray-500">Tulis pesan atau gunakan template cepat</p>
                                    </div>
                                </div>

                                {/* Preset Templates Dropdown */}
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-gray-500">Template:</span>
                                    <select
                                        onChange={(e) => {
                                            const tpl = PRESET_TEMPLATES.find(t => t.id === e.target.value);
                                            if (tpl) setMessage(tpl.text);
                                            e.target.value = '';
                                        }}
                                        defaultValue=""
                                        className="py-1.5 px-3 rounded-xl border border-gray-300 text-xs bg-white font-bold text-gray-700"
                                    >
                                        <option value="" disabled>Pilih Template...</option>
                                        {PRESET_TEMPLATES.map(tpl => (
                                            <option key={tpl.id} value={tpl.id}>{tpl.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Formatting & Variable Insertion Toolbar */}
                            <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-100/80 rounded-2xl border border-slate-200">
                                <span className="text-[10px] font-black uppercase text-gray-400 px-1">Variabel:</span>
                                <button
                                    type="button"
                                    onClick={() => insertIntoMessage('{name}')}
                                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-mono font-bold border border-emerald-200 shadow-xs transition"
                                >
                                    {'{name}'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertIntoMessage('{phone}')}
                                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-mono font-bold border border-emerald-200 shadow-xs transition"
                                >
                                    {'{phone}'}
                                </button>

                                <span className="text-gray-300 mx-1">|</span>

                                <span className="text-[10px] font-black uppercase text-gray-400 px-1">Format:</span>
                                <button
                                    type="button"
                                    onClick={() => wrapSelectedText('*')}
                                    className="px-2 py-1 rounded-lg bg-white text-gray-700 hover:bg-gray-50 text-xs font-black border border-gray-200 shadow-xs"
                                    title="Bold (*teks*)"
                                >
                                    <strong>B</strong>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => wrapSelectedText('_')}
                                    className="px-2 py-1 rounded-lg bg-white text-gray-700 hover:bg-gray-50 text-xs font-serif italic border border-gray-200 shadow-xs"
                                    title="Italic (_teks_)"
                                >
                                    <em>I</em>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => wrapSelectedText('~')}
                                    className="px-2 py-1 rounded-lg bg-white text-gray-700 hover:bg-gray-50 text-xs line-through border border-gray-200 shadow-xs"
                                    title="Strikethrough (~teks~)"
                                >
                                    S
                                </button>

                                <span className="text-gray-300 mx-1">|</span>

                                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                                    {EMOJI_LIST.map((emoji, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => insertIntoMessage(emoji)}
                                            className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg text-sm transition"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Message Textarea */}
                            <div className="relative">
                                <textarea
                                    ref={textareaRef}
                                    rows={8}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Tulis pesan WhatsApp di sini... Gunakan {name} untuk menyapa nama penerima secara otomatis."
                                    className="w-full p-4 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm leading-relaxed"
                                ></textarea>
                                <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1 px-1">
                                    <span>{message.length} karakter • {message.split('\n').length} baris</span>
                                    {message && (
                                        <button
                                            type="button"
                                            onClick={() => setMessage('')}
                                            className="text-xs text-rose-600 hover:underline font-bold"
                                        >
                                            Hapus Teks
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Image Attachment (Optional) */}
                            <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-300">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                            <span className="material-icons text-xl">image</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">Lampiran Gambar / Flyer (Opsional)</p>
                                            <p className="text-[11px] text-gray-500">Mendukung format JPG, PNG, atau WEBP (Maksimal 5 MB)</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="cursor-pointer px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-xs inline-flex items-center gap-1.5 transition">
                                            <span className="material-icons text-sm">upload_file</span>
                                            <span>Pilih Gambar</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {imagePreview && (
                                    <div className="mt-3 flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-200">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{imageFile?.name}</p>
                                            <p className="text-[10px] text-gray-400">
                                                {imageFile?.size ? (imageFile.size / 1024).toFixed(1) + ' KB' : ''}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                                            title="Hapus gambar"
                                        >
                                            <span className="material-icons text-sm">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECTION 3: Pengaturan Antrean & Anti-Banned */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                                    3
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900">Kecepatan & Proteksi Anti-Ban</h2>
                                    <p className="text-xs text-gray-500">Pencegahan pembatasan otomatis oleh sistem WhatsApp</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {/* Jeda Acak Slider/Input */}
                                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                                            <span className="material-icons text-sm text-emerald-700">timer</span>
                                            <span>Jeda Acak Antrean</span>
                                        </span>
                                        <span className="text-xs font-black text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300">
                                            {minDelay}s ~ {maxDelay}s
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">Min (detik):</label>
                                            <input
                                                type="number"
                                                min="0.5"
                                                max="10"
                                                step="0.5"
                                                value={minDelay}
                                                onChange={(e) => setMinDelay(Math.max(0.5, parseFloat(e.target.value) || 1))}
                                                className="w-full p-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">Max (detik):</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
                                                step="0.5"
                                                value={maxDelay}
                                                onChange={(e) => setMaxDelay(Math.max(1, parseFloat(e.target.value) || 4))}
                                                className="w-full p-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-emerald-800/80 mt-2">
                                        🛡️ Pesan akan dikirim dengan jeda acak per nomor untuk meniru interaksi manusia alami.
                                    </p>
                                </div>

                                {/* Multi-device Selector */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                            <span className="material-icons text-sm text-gray-600">devices</span>
                                            <span>Perangkat Pengirim</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={fetchDevices}
                                            className="text-[11px] text-emerald-700 hover:underline font-bold flex items-center gap-0.5"
                                        >
                                            <span className={`material-icons text-xs ${deviceStatusLoading ? 'animate-spin' : ''}`}>sync</span>
                                            <span>Refresh</span>
                                        </button>
                                    </div>
                                    <select
                                        value={selectedDevice}
                                        onChange={(e) => setSelectedDevice(e.target.value)}
                                        className="w-full p-2.5 text-xs rounded-xl border border-gray-300 bg-white font-bold text-gray-800"
                                    >
                                        <option value="">Otomatis (Perangkat Default Terbaru)</option>
                                        {devices.map((devId, idx) => (
                                            <option key={idx} value={devId}>Perangkat ID: {devId}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        Multi-device GoWA engine aktif untuk failover otomatis jika satu perangkat sibuk.
                                    </p>
                                </div>
                            </div>

                            {/* Submit Button & Estimasi */}
                            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-700">
                                        Total Penerima: <span className="text-emerald-700 font-black">{finalRecipients.length} nomor</span>
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        Estimasi durasi antrean: ~{Math.max(1, Math.round((finalRecipients.length * ((minDelay + maxDelay) / 2)) / 60 * 10) / 10)} menit
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSendBroadcast}
                                    disabled={isSubmitting || finalRecipients.length === 0 || !message.trim()}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-700/25 flex items-center justify-center gap-2 transition"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Memasukkan Antrean...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons text-base">send</span>
                                            <span>Mulai Kirim Broadcast ({finalRecipients.length})</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {submitResult && (
                                <div className={`p-4 rounded-2xl text-xs font-bold ${
                                    submitResult.type === 'success'
                                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                                        : 'bg-rose-50 border border-rose-300 text-rose-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <span className="material-icons text-base">
                                            {submitResult.type === 'success' ? 'check_circle' : 'error'}
                                        </span>
                                        <span>{submitResult.message}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Live Chat Smartphone Preview & Queue Monitor (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Interactive Smartphone Chat Preview */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm sticky top-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons text-emerald-700 text-lg">phone_iphone</span>
                                    <h3 className="text-sm font-black text-gray-900">Pratinjau Layar WhatsApp</h3>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    Simulasi HP
                                </span>
                            </div>

                            {/* Mock Phone Frame */}
                            <div className="max-w-[320px] mx-auto rounded-3xl bg-slate-900 p-3 shadow-2xl border-4 border-slate-800">
                                {/* Phone Screen */}
                                <div className="rounded-2xl overflow-hidden bg-[#0b141a] text-slate-100 flex flex-col h-[460px]">
                                    {/* WA Header */}
                                    <div className="bg-[#1f2c34] p-3 flex items-center gap-2.5 border-b border-[#2a3942]">
                                        <span className="material-icons text-sm text-gray-400">arrow_back</span>
                                        <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center font-bold text-xs text-white">
                                            BAE
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">Barakah Economy Info</p>
                                            <p className="text-[10px] text-emerald-400">Official Channel</p>
                                        </div>
                                        <span className="material-icons text-base text-gray-400">more_vert</span>
                                    </div>

                                    {/* WA Wallpaper Chat Area */}
                                    <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-2 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                                        <div className="text-center my-1">
                                            <span className="text-[9px] bg-[#182229] text-gray-400 px-2.5 py-1 rounded-lg">
                                                HARI INI
                                            </span>
                                        </div>

                                        {/* Message Bubble (Outgoing style) */}
                                        <div className="max-w-[90%] ml-auto bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-3 shadow-md space-y-2">
                                            {/* Preview Image in Bubble */}
                                            {imagePreview && (
                                                <div className="rounded-xl overflow-hidden mb-2 max-h-40 bg-black/40">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Attachment Preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}

                                            {/* Formatted Text */}
                                            <div
                                                className="text-[11px] leading-relaxed break-words whitespace-pre-wrap font-sans text-slate-100"
                                                dangerouslySetInnerHTML={renderFormattedPreview(message || 'Pesan Anda akan tampil di sini...')}
                                            />

                                            <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70 pt-1">
                                                <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="material-icons text-[11px] text-emerald-300">done_all</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mock Input Bar */}
                                    <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-[#2a3942]">
                                        <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[10px] text-gray-400">
                                            Ketik pesan...
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                                            <span className="material-icons text-xs">mic</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: Live Blast Queue Monitor */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons text-emerald-700 text-lg">stacked_line_chart</span>
                                    <h3 className="text-sm font-black text-gray-900">Monitor Antrean Aktif</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchQueueStatus}
                                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                                >
                                    <span className="material-icons text-xs">refresh</span>
                                    <span>Segarkan</span>
                                </button>
                            </div>

                            {activeTasks.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-gray-200 text-gray-400 space-y-1">
                                    <span className="material-icons text-3xl text-gray-300">done_all</span>
                                    <p className="text-xs font-bold">Tidak ada antrean blast yang sedang berjalan</p>
                                    <p className="text-[11px]">Seluruh pesan telah selesai diproses.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activeTasks.map((task) => {
                                        const progress = task.total > 0 ? Math.round((task.processed_count / task.total) * 100) : 0;
                                        const isRunning = task.status === 'processing' || task.status === 'queued';

                                        return (
                                            <div
                                                key={task.task_id}
                                                className="p-4 rounded-2xl border border-gray-200 bg-slate-50 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                                            task.status === 'processing' ? 'bg-emerald-500 animate-pulse' :
                                                            task.status === 'queued' ? 'bg-amber-500' :
                                                            task.status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
                                                        }`}></span>
                                                        <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                                            {task.status === 'processing' ? 'Sedang Mengirim...' :
                                                             task.status === 'queued' ? 'Dalam Antrean' :
                                                             task.status === 'completed' ? 'Selesai' : task.status}
                                                        </span>
                                                    </div>

                                                    {isRunning && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelTask(task.task_id)}
                                                            className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5"
                                                        >
                                                            <span className="material-icons text-xs">cancel</span>
                                                            <span>Batalkan</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Progress Bar */}
                                                <div>
                                                    <div className="flex justify-between text-xs font-bold mb-1">
                                                        <span className="text-gray-600">{task.processed_count} dari {task.total} pesan</span>
                                                        <span className="text-emerald-700">{progress}%</span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-300"
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Stats counts */}
                                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pt-1">
                                                    <span className="text-emerald-700">✓ Sukses: {task.success_count}</span>
                                                    <span className="text-rose-600">✗ Gagal: {task.failed_count}</span>
                                                    {task.current_item && (
                                                        <span className="text-gray-600 font-mono text-[10px] truncate max-w-[120px]">
                                                            Target: {task.current_item}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* PREVIEW NUMBERS MODAL */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-gray-900">Daftar Nomor Terverifikasi</h3>
                                <p className="text-xs text-gray-500">Total {finalRecipients.length} nomor WhatsApp siap dikirimkan</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-1.5">
                            {finalRecipients.map((rec, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <p className="font-bold text-gray-800 font-mono">{rec.phone}</p>
                                            {rec.name && <p className="text-[10px] text-gray-400">{rec.name}</p>}
                                        </div>
                                    </div>
                                    <span className="material-icons text-emerald-600 text-sm">check_circle</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowPreviewModal(false)}
                                className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardBroadcastWAPage;
