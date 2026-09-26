import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    const [minDelay, setMinDelay] = useState(4);
    const [maxDelay, setMaxDelay] = useState(7);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [deviceStatusLoading, setDeviceStatusLoading] = useState(false);

    // Submission & Monitoring States
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);
    const [activeTasks, setActiveTasks] = useState([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Top-Level Navigation Tab
    const [activeMainTab, setActiveMainTab] = useState('composer'); // 'composer' | 'history'

    // CRM History States
    const [historySessions, setHistorySessions] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyScheduledCount, setHistoryScheduledCount] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
    const [historySearch, setHistorySearch] = useState('');

    // Scheduling States in Composer
    const [sendTimingMode, setSendTimingMode] = useState('immediate'); // 'immediate' | 'scheduled'
    const [scheduledDateTime, setScheduledDateTime] = useState('');

    // Reschedule Modal State
    const [rescheduleModalSession, setRescheduleModalSession] = useState(null);
    const [newScheduleDateTime, setNewScheduleDateTime] = useState('');
    const [rescheduleLoading, setRescheduleLoading] = useState(false);
    const [triggeringScheduledId, setTriggeringScheduledId] = useState(null);
    const [cancellingScheduledId, setCancellingScheduledId] = useState(null);

    // Session CRM Details Drawer/Modal
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionRecipients, setSessionRecipients] = useState([]);
    const [recipientStatusFilter, setRecipientStatusFilter] = useState('all');
    const [recipientSearch, setRecipientSearch] = useState('');
    const [sessionLoading, setSessionLoading] = useState(false);
    const [retryingSessionId, setRetryingSessionId] = useState(null);

    // Fetch Connected WA Devices & Check Admin
    const fetchDevices = useCallback(async () => {
        try {
            setDeviceStatusLoading(true);
            const res = await api.get('/auth/users/wa_devices/');
            if (res.data && Array.isArray(res.data.devices)) {
                setDevices(res.data.devices);
                if (res.data.devices.length > 0 && !selectedDevice) {
                    const first = res.data.devices[0];
                    setSelectedDevice(typeof first === 'object' ? first.id : first);
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
            const res = await api.get('/auth/users/blast_queue_status/');
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
            const res = await api.get('/auth/users/?page_size=1000');
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

    // Schedule Presets Helper
    const setSchedulePreset = (offsetMinutes, fixedHour = null) => {
        const now = new Date();
        const target = new Date(now);
        if (fixedHour !== null) {
            target.setDate(target.getDate() + 1);
            target.setHours(fixedHour, 0, 0, 0);
        } else {
            target.setTime(now.getTime() + offsetMinutes * 60 * 1000);
        }
        const year = target.getFullYear();
        const month = String(target.getMonth() + 1).padStart(2, '0');
        const day = String(target.getDate()).padStart(2, '0');
        const hours = String(target.getHours()).padStart(2, '0');
        const minutes = String(target.getMinutes()).padStart(2, '0');
        setScheduledDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    };

    const setReschedulePreset = (offsetMinutes, fixedHour = null) => {
        const now = new Date();
        const target = new Date(now);
        if (fixedHour !== null) {
            target.setDate(target.getDate() + 1);
            target.setHours(fixedHour, 0, 0, 0);
        } else {
            target.setTime(now.getTime() + offsetMinutes * 60 * 1000);
        }
        const year = target.getFullYear();
        const month = String(target.getMonth() + 1).padStart(2, '0');
        const day = String(target.getDate()).padStart(2, '0');
        const hours = String(target.getHours()).padStart(2, '0');
        const minutes = String(target.getMinutes()).padStart(2, '0');
        setNewScheduleDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
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

        const isScheduled = sendTimingMode === 'scheduled';
        if (isScheduled) {
            if (!scheduledDateTime) {
                alert('Silakan tentukan tanggal dan jam pengiriman broadcast.');
                return;
            }
            const chosenDate = new Date(scheduledDateTime);
            if (isNaN(chosenDate.getTime()) || chosenDate <= new Date()) {
                alert('Waktu jadwal pengiriman harus di masa depan (minimal beberapa menit ke depan).');
                return;
            }
        }

        const scheduledTimeStr = isScheduled ? formatIndonesianDateTime(new Date(scheduledDateTime).toISOString()) : '';

        const activeMinDelay = Math.max(4, parseFloat(minDelay) || 4);
        const activeMaxDelay = Math.max(activeMinDelay, parseFloat(maxDelay) || 7);

        const confirmMsg = isScheduled
            ? `Konfirmasi Jadwal Broadcast WA:\n` +
              `• Jumlah Penerima: ${finalRecipients.length} nomor\n` +
              `• Jadwal Kirim: ${scheduledTimeStr} WIB\n` +
              `• Antrean Anti-Ban: Jeda acak ${activeMinDelay} s.d ${activeMaxDelay} detik/pesan\n` +
              `• Lampiran Gambar: ${imageFile ? 'Ya (' + imageFile.name + ')' : 'Tidak'}\n\n` +
              `Simpan dan jadwalkan pengiriman broadcast ini?`
            : `Konfirmasi Kirim Broadcast:\n` +
              `• Jumlah Penerima: ${finalRecipients.length} nomor\n` +
              `• Antrean Anti-Ban: Jeda acak ${activeMinDelay} s.d ${activeMaxDelay} detik/pesan\n` +
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
                min_delay: activeMinDelay,
                max_delay: activeMaxDelay,
                device_id: selectedDevice || null,
                scheduled_at: isScheduled ? new Date(scheduledDateTime).toISOString() : null
            };

            const res = await api.post('/auth/users/custom_blast_whatsapp/', payload);

            setSubmitResult({
                type: 'success',
                message: res.data.message || (isScheduled ? 'Broadcast berhasil dijadwalkan!' : 'Broadcast berhasil dimasukkan ke antrean pengiriman!'),
                details: res.data
            });

            // Refresh queue & history
            fetchQueueStatus();
            fetchHistory(1);

            // Clear input
            if (inputMode === 'comma') setRawTextComma('');
            if (inputMode === 'list') setRawTextList('');
            if (inputMode === 'members') setSelectedMembers([]);
            if (isScheduled) setScheduledDateTime('');

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

    // Trigger scheduled blast immediately
    const handleTriggerScheduledNow = async (session) => {
        if (!window.confirm(`Kirim broadcast terjadwal "${session.title}" SEKARANG tanpa menunggu waktu jadwal?`)) {
            return;
        }
        try {
            setTriggeringScheduledId(session.id);
            const res = await api.post('/auth/users/trigger_scheduled_blast_now/', { session_id: session.id });
            alert(res.data.message || 'Broadcast berhasil segera dimasukkan ke antrean!');
            fetchHistory(historyPage);
            fetchQueueStatus();
        } catch (err) {
            console.error('Failed to trigger scheduled blast:', err);
            alert(err.response?.data?.error || 'Gagal memicu pengiriman broadcast.');
        } finally {
            setTriggeringScheduledId(null);
        }
    };

    // Cancel scheduled blast
    const handleCancelScheduled = async (session) => {
        if (!window.confirm(`Batalkan jadwal broadcast "${session.title}"? Status akan menjadi Dibatalkan.`)) {
            return;
        }
        try {
            setCancellingScheduledId(session.id);
            const res = await api.post('/auth/users/cancel_scheduled_blast/', { session_id: session.id });
            alert(res.data.message || 'Jadwal broadcast berhasil dibatalkan.');
            fetchHistory(historyPage);
        } catch (err) {
            console.error('Failed to cancel scheduled blast:', err);
            alert(err.response?.data?.error || 'Gagal membatalkan jadwal broadcast.');
        } finally {
            setCancellingScheduledId(null);
        }
    };

    // Open Reschedule Modal
    const handleOpenRescheduleModal = (session) => {
        setRescheduleModalSession(session);
        if (session.scheduled_at) {
            const dt = new Date(session.scheduled_at);
            const year = dt.getFullYear();
            const month = String(dt.getMonth() + 1).padStart(2, '0');
            const day = String(dt.getDate()).padStart(2, '0');
            const hours = String(dt.getHours()).padStart(2, '0');
            const minutes = String(dt.getMinutes()).padStart(2, '0');
            setNewScheduleDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
        } else {
            setNewScheduleDateTime('');
        }
    };

    // Save Reschedule
    const handleSaveReschedule = async () => {
        if (!rescheduleModalSession || !newScheduleDateTime) return;
        const chosen = new Date(newScheduleDateTime);
        if (isNaN(chosen.getTime()) || chosen <= new Date()) {
            alert('Waktu jadwal baru harus lebih besar dari waktu sekarang.');
            return;
        }
        try {
            setRescheduleLoading(true);
            const res = await api.post('/auth/users/reschedule_blast/', {
                session_id: rescheduleModalSession.id,
                scheduled_at: chosen.toISOString()
            });
            alert(res.data.message || 'Jadwal berhasil diperbarui!');
            setRescheduleModalSession(null);
            fetchHistory(historyPage);
        } catch (err) {
            console.error('Failed to reschedule blast:', err);
            alert(err.response?.data?.error || 'Gagal mengubah jadwal blast.');
        } finally {
            setRescheduleLoading(false);
        }
    };

    // Cancel Active Blast Task
    const handleCancelTask = async (taskId) => {
        if (!window.confirm('Batalkan pengiriman antrean ini? Pesan yang belum terkirim tidak akan diproses.')) return;
        try {
            await api.post('/auth/users/cancel_blast_task/', { task_id: taskId });
            fetchQueueStatus();
        } catch (err) {
            console.error('Failed to cancel blast task:', err);
            alert('Gagal membatalkan antrean.');
        }
    };

    // --- CRM HISTORY HANDLERS ---
    const fetchHistory = useCallback(async (page = 1) => {
        try {
            setHistoryLoading(true);
            const params = {
                page,
                page_size: 15,
                status: historyStatusFilter,
                search: historySearch
            };
            const res = await api.get('/auth/users/blast_history/', { params });
            if (res.data) {
                setHistorySessions(res.data.sessions || []);
                setHistoryTotal(res.data.total || 0);
                setHistoryScheduledCount(res.data.scheduled_count || 0);
                setHistoryPage(page);
            }
        } catch (err) {
            console.error('Failed to fetch blast history:', err);
        } finally {
            setHistoryLoading(false);
        }
    }, [historyStatusFilter, historySearch]);

    useEffect(() => {
        if (activeMainTab === 'history') {
            fetchHistory(historyPage);
        }
    }, [activeMainTab, historyPage, historyStatusFilter, historySearch, fetchHistory]);

    const fetchSessionDetail = useCallback(async (sessionId, statusFilter = recipientStatusFilter, search = recipientSearch) => {
        if (!sessionId) return;
        try {
            setSessionLoading(true);
            const params = {
                id: sessionId,
                status: statusFilter,
                search: search
            };
            const res = await api.get('/auth/users/blast_session_detail/', { params });
            if (res.data) {
                setSelectedSession(res.data.session);
                setSessionRecipients(res.data.recipients || []);
            }
        } catch (err) {
            console.error('Failed to fetch session detail:', err);
            alert('Gagal memuat detail sesi blasting.');
        } finally {
            setSessionLoading(false);
        }
    }, [recipientStatusFilter, recipientSearch]);

    const handleRetryFailed = async (session, customMode = 'failed') => {
        const failedCount = session.failed_count || 0;
        if (customMode === 'failed' && failedCount === 0) {
            alert('Tidak ada nomor yang gagal dalam sesi ini.');
            return;
        }

        const countText = customMode === 'failed' ? `${failedCount} nomor gagal` : `seluruh ${session.total_recipients} nomor`;
        if (!window.confirm(`Kirim ulang blast WhatsApp ke ${countText} dari sesi "${session.title}"?`)) {
            return;
        }

        try {
            setRetryingSessionId(session.id);
            const res = await api.post('/auth/users/retry_failed_blast/', {
                session_id: session.id,
                retry_mode: customMode
            });
            alert(res.data.message || 'Blast ulang berhasil dimasukkan ke antrean!');
            fetchHistory(historyPage);
            fetchQueueStatus();
            if (selectedSession && selectedSession.id === session.id) {
                fetchSessionDetail(session.id);
            }
        } catch (err) {
            console.error('Failed to retry blast:', err);
            alert(err.response?.data?.error || 'Gagal mengirim ulang blast.');
        } finally {
            setRetryingSessionId(null);
        }
    };

    const handleDeleteSession = async (session) => {
        if (!window.confirm(`Hapus riwayat sesi "${session.title}"? Data statistik dan log penerima akan dihapus permanen.`)) {
            return;
        }
        try {
            await api.delete('/auth/users/delete_blast_session/', { data: { session_id: session.id } });
            if (selectedSession && selectedSession.id === session.id) {
                setSelectedSession(null);
            }
            fetchHistory(historyPage);
        } catch (err) {
            console.error('Failed to delete session:', err);
            alert('Gagal menghapus riwayat sesi.');
        }
    };

    const handleLoadToComposer = (session) => {
        setMessage(session.message_template || '');
        setActiveMainTab('composer');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCopyFailedNumbers = (recipients) => {
        const failed = recipients.filter(r => r.status === 'failed').map(r => r.phone);
        if (failed.length === 0) {
            alert('Tidak ada nomor gagal untuk disalin.');
            return;
        }
        navigator.clipboard.writeText(failed.join(', '));
        alert(`Berhasil menyalin ${failed.length} nomor gagal ke clipboard!`);
    };

    const handleExportCsv = (session, recipients) => {
        if (!recipients || recipients.length === 0) {
            alert('Tidak ada data penerima untuk diekspor.');
            return;
        }
        const headers = ['Nomor HP', 'Nama', 'Status', 'Alasan Gagal', 'Waktu Pengiriman'];
        const rows = recipients.map(r => [
            `"${r.phone}"`,
            `"${r.name || ''}"`,
            `"${r.status === 'success' ? 'Berhasil Terkirim' : r.status === 'failed' ? 'Gagal' : 'Menunggu'}"`,
            `"${(r.error_message || '').replace(/"/g, '""')}"`,
            `"${r.sent_at || ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `CRM_Blast_${session.id}_${(session.title || 'session').replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatIndonesianDateTime = (isoString) => {
        if (!isoString) return '-';
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }) + ' WIB';
        } catch {
            return isoString;
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

                {/* Main Navigation Tabs: Composer vs CRM History */}
                <div className="flex items-center gap-2 p-1.5 bg-gray-200/80 rounded-2xl mb-6 max-w-md shadow-inner">
                    <button
                        type="button"
                        onClick={() => setActiveMainTab('composer')}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                            activeMainTab === 'composer'
                                ? 'bg-white text-emerald-800 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="material-icons text-base">send</span>
                        <span>Kirim Broadcast</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveMainTab('history');
                            fetchHistory(1);
                        }}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                            activeMainTab === 'history'
                                ? 'bg-white text-emerald-800 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="material-icons text-base">history_edu</span>
                        <span>Riwayat & CRM Blast</span>
                        {historyTotal > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                {historyTotal}
                            </span>
                        )}
                    </button>
                </div>

                {activeMainTab === 'composer' ? (
                /* Main Grid Layout: Left (Input & Composer) | Right (Preview & Queue) */
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
                                            {minDelay || 4}s ~ {maxDelay || 7}s
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">Min (detik):</label>
                                            <input
                                                type="number"
                                                min="4"
                                                max="60"
                                                step="1"
                                                value={minDelay}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    if (raw === '') {
                                                        setMinDelay('');
                                                        return;
                                                    }
                                                    const val = parseFloat(raw);
                                                    const safeMin = isNaN(val) ? 4 : Math.max(4, val);
                                                    setMinDelay(safeMin);
                                                    if (safeMin > (parseFloat(maxDelay) || safeMin)) {
                                                        setMaxDelay(safeMin);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    const val = parseFloat(minDelay);
                                                    const safeMin = isNaN(val) || val < 4 ? 4 : val;
                                                    setMinDelay(safeMin);
                                                    if (safeMin > (parseFloat(maxDelay) || safeMin)) {
                                                        setMaxDelay(safeMin);
                                                    }
                                                }}
                                                className="w-full p-2 text-xs rounded-xl border border-gray-300 bg-white font-bold focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">Max (detik):</label>
                                            <input
                                                type="number"
                                                min={minDelay || 4}
                                                max="120"
                                                step="1"
                                                value={maxDelay}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    if (raw === '') {
                                                        setMaxDelay('');
                                                        return;
                                                    }
                                                    const val = parseFloat(raw);
                                                    const currentMin = parseFloat(minDelay) || 4;
                                                    const safeMax = isNaN(val) ? currentMin : Math.max(currentMin, val);
                                                    setMaxDelay(safeMax);
                                                }}
                                                onBlur={() => {
                                                    const currentMin = parseFloat(minDelay) || 4;
                                                    const val = parseFloat(maxDelay);
                                                    const safeMax = isNaN(val) || val < currentMin ? Math.max(currentMin, 7) : val;
                                                    setMaxDelay(safeMax);
                                                }}
                                                className="w-full p-2 text-xs rounded-xl border border-gray-300 bg-white font-bold focus:ring-emerald-500 focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-emerald-800/80 mt-2">
                                        🛡️ Pesan akan dikirim dengan jeda acak per nomor untuk meniru interaksi manusia alami (minimal batas aman 4 detik).
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
                                        className="w-full p-2.5 text-xs rounded-xl border border-gray-300 bg-white font-bold text-gray-800 focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        {devices.map((dev, idx) => {
                                            const devId = typeof dev === 'object' ? dev.id : dev;
                                            const devLabel = typeof dev === 'object' 
                                                ? `📱 ${dev.name} (${dev.phone ? '+' + dev.phone : dev.id.slice(0, 8)})` 
                                                : `📱 Perangkat: ${dev.slice(0, 8)}`;
                                            return (
                                                <option key={idx} value={devId}>{devLabel}</option>
                                            );
                                        })}
                                        {devices.length === 0 && (
                                            <option value="">Tidak ada perangkat terhubung</option>
                                        )}
                                    </select>
                                    <p className="text-[10px] text-emerald-800 font-bold mt-2 flex items-center gap-1">
                                        <span className="material-icons text-xs text-emerald-600">verified</span>
                                        <span>Seluruh pesan broadcast akan dikirim eksklusif dari 1 nomor WhatsApp yang Anda pilih.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: Pengaturan Jadwal Broadcast (CRM Scheduling) */}
                        <div className="bg-white rounded-3xl p-6 border border-gray-200/90 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                                    4
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900">Jadwal & Waktu Pengiriman</h2>
                                    <p className="text-xs text-gray-500">Pilih apakah broadcast dikirim langsung saat ini atau dijadwalkan otomatis</p>
                                </div>
                            </div>

                            {/* Timing Mode Switcher */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setSendTimingMode('immediate')}
                                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition ${
                                        sendTimingMode === 'immediate'
                                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                                            : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-gray-600'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                        sendTimingMode === 'immediate' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        <span className="material-icons text-lg">bolt</span>
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black ${sendTimingMode === 'immediate' ? 'text-emerald-950' : 'text-gray-800'}`}>
                                            Kirim Langsung Sekarang
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Broadcast langsung dimasukkan ke antrean dan dikirimkan saat tombol ditekan.
                                        </p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSendTimingMode('scheduled');
                                        if (!scheduledDateTime) setSchedulePreset(60);
                                    }}
                                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition ${
                                        sendTimingMode === 'scheduled'
                                            ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                                            : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-gray-600'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                        sendTimingMode === 'scheduled' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        <span className="material-icons text-lg">schedule_send</span>
                                    </div>
                                    <div>
                                        <p className={`text-xs font-black ${sendTimingMode === 'scheduled' ? 'text-indigo-950' : 'text-gray-800'}`}>
                                            Jadwalkan Pengiriman Otomatis
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            Tentukan tanggal & jam spesifik. Server akan mengirimkannya otomatis di waktu tersebut.
                                        </p>
                                    </div>
                                </button>
                            </div>

                            {/* Scheduled Date Time Inputs & Quick Presets */}
                            {sendTimingMode === 'scheduled' && (
                                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-3 animate-fadeIn">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                                            <span className="material-icons text-sm text-indigo-700">event_available</span>
                                            <span>Tentukan Tanggal & Jam Pengiriman (WIB):</span>
                                        </label>
                                        {scheduledDateTime && (
                                            <span className="text-[11px] font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
                                                {formatIndonesianDateTime(new Date(scheduledDateTime).toISOString())}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input
                                            type="datetime-local"
                                            value={scheduledDateTime}
                                            min={new Date().toISOString().slice(0, 16)}
                                            onChange={(e) => setScheduledDateTime(e.target.value)}
                                            className="w-full p-3 text-xs sm:text-sm font-bold text-indigo-950 bg-white rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />

                                        {/* Quick Presets */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold text-indigo-900/60 uppercase block w-full">Shortcut Cepat:</span>
                                            <button
                                                type="button"
                                                onClick={() => setSchedulePreset(30)}
                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-800 transition"
                                            >
                                                +30 Menit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSchedulePreset(60)}
                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-800 transition"
                                            >
                                                +1 Jam
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSchedulePreset(180)}
                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-800 transition"
                                            >
                                                +3 Jam
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSchedulePreset(null, 9)}
                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-800 transition"
                                            >
                                                Besok 09:00 WIB
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSchedulePreset(null, 19)}
                                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-800 transition"
                                            >
                                                Besok 19:00 WIB
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-[11px] text-indigo-900/80 flex items-start gap-1 pt-1">
                                        <span className="material-icons text-sm text-indigo-600 shrink-0 mt-0.5">info</span>
                                        <span>
                                            Pesan akan otomatis dieksekusi oleh server saat jam tersebut tiba. Anda dapat membatalkan atau mengubah waktu sebelum jadwal tiba di tab <b>Riwayat & CRM Blast</b>.
                                        </span>
                                    </p>
                                </div>
                            )}

                            {/* Submit Button & Estimasi */}
                            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-700">
                                        Total Penerima: <span className="text-emerald-700 font-black">{finalRecipients.length} nomor</span>
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        {sendTimingMode === 'scheduled' ? (
                                            scheduledDateTime ? `Dijadwalkan untuk: ${formatIndonesianDateTime(new Date(scheduledDateTime).toISOString())}` : 'Belum memilih waktu jadwal'
                                        ) : (
                                            `Estimasi durasi antrean: ~${Math.max(1, Math.round((finalRecipients.length * (((parseFloat(minDelay) || 4) + (parseFloat(maxDelay) || 7)) / 2)) / 60 * 10) / 10)} menit`
                                        )}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSendBroadcast}
                                    disabled={isSubmitting || finalRecipients.length === 0 || !message.trim()}
                                    className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition ${
                                        sendTimingMode === 'scheduled'
                                            ? 'bg-gradient-to-r from-indigo-700 to-violet-700 hover:from-indigo-800 hover:to-violet-800 shadow-indigo-700/25'
                                            : 'bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 shadow-emerald-700/25'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>{sendTimingMode === 'scheduled' ? 'Menyimpan Jadwal...' : 'Memasukkan Antrean...'}</span>
                                        </>
                                    ) : sendTimingMode === 'scheduled' ? (
                                        <>
                                            <span className="material-icons text-base">event_note</span>
                                            <span>Jadwalkan Broadcast WA ({finalRecipients.length})</span>
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
                                            {(() => {
                                                const activeDev = devices.find(d => (typeof d === 'object' ? d.id : d) === selectedDevice);
                                                return activeDev?.name ? activeDev.name.slice(0, 2).toUpperCase() : 'BAE';
                                            })()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">
                                                {(() => {
                                                    const activeDev = devices.find(d => (typeof d === 'object' ? d.id : d) === selectedDevice);
                                                    return activeDev?.name || 'Barakah Economy Info';
                                                })()}
                                            </p>
                                            <p className="text-[10px] text-emerald-400">
                                                {(() => {
                                                    const activeDev = devices.find(d => (typeof d === 'object' ? d.id : d) === selectedDevice);
                                                    return activeDev?.phone ? '+' + activeDev.phone : 'Nomor Pengirim Terpilih';
                                                })()}
                                            </p>
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
                ) : (
                    /* CRM HISTORY & MONITOR VIEW */
                    <div className="space-y-6">
                        {/* Summary Metric Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200/90 shadow-sm flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                    <span className="material-icons text-xl sm:text-2xl">campaign</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">Total Sesi</p>
                                    <h4 className="text-lg sm:text-xl font-black text-gray-900">{historyTotal}</h4>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-indigo-200/90 shadow-sm flex items-center gap-3 bg-gradient-to-br from-white to-indigo-50/30">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                                    <span className="material-icons text-xl sm:text-2xl">schedule</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-bold text-indigo-800/80 uppercase tracking-wider truncate">Jadwal Menunggu</p>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-lg sm:text-xl font-black text-indigo-700">{historyScheduledCount}</h4>
                                        {historyScheduledCount > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200/90 shadow-sm flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                                    <span className="material-icons text-xl sm:text-2xl">check_circle</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">Terkirim Sukses</p>
                                    <h4 className="text-lg sm:text-xl font-black text-green-700 truncate">
                                        {historySessions.reduce((acc, s) => acc + (s.success_count || 0), 0)}
                                    </h4>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200/90 shadow-sm flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                    <span className="material-icons text-xl sm:text-2xl">error_outline</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">Gagal Terkirim</p>
                                    <h4 className="text-lg sm:text-xl font-black text-rose-600 truncate">
                                        {historySessions.reduce((acc, s) => acc + (s.failed_count || 0), 0)}
                                    </h4>
                                </div>
                            </div>

                            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200/90 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
                                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                                    <span className="material-icons text-xl sm:text-2xl">insights</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">Delivery Rate</p>
                                    <h4 className="text-lg sm:text-xl font-black text-teal-700">
                                        {(() => {
                                            const total = historySessions.reduce((acc, s) => acc + (s.total_recipients || 0), 0);
                                            const ok = historySessions.reduce((acc, s) => acc + (s.success_count || 0), 0);
                                            return total > 0 ? `${Math.round((ok / total) * 100)}%` : '100%';
                                        })()}
                                    </h4>
                                </div>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/90 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                            {/* Search */}
                            <div className="relative flex-1">
                                <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                <input
                                    type="text"
                                    placeholder="Cari sesi, nomor HP penerima, atau kata kunci pesan..."
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
                                />
                                {historySearch && (
                                    <button
                                        type="button"
                                        onClick={() => setHistorySearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <span className="material-icons text-sm">close</span>
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                                {[
                                    { id: 'all', label: 'Semua Sesi' },
                                    { id: 'scheduled', label: `📅 Terjadwal${historyScheduledCount > 0 ? ` (${historyScheduledCount})` : ''}` },
                                    { id: 'completed', label: 'Selesai' },
                                    { id: 'failed', label: 'Ada Gagal' },
                                    { id: 'processing', label: 'Sedang Berjalan' },
                                    { id: 'cancelled', label: 'Dibatalkan' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setHistoryStatusFilter(tab.id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                                            historyStatusFilter === tab.id
                                                ? 'bg-emerald-700 text-white shadow-sm'
                                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => fetchHistory(historyPage)}
                                    title="Segarkan Riwayat"
                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-600 shrink-0 transition"
                                >
                                    <span className={`material-icons text-base ${historyLoading ? 'animate-spin' : ''}`}>refresh</span>
                                </button>
                            </div>
                        </div>

                        {/* Sessions List */}
                        {historyLoading ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/90 shadow-sm space-y-3">
                                <span className="material-icons text-4xl text-emerald-600 animate-spin">sync</span>
                                <p className="text-sm font-bold text-gray-700">Memuat riwayat blasting WhatsApp...</p>
                            </div>
                        ) : historySessions.length === 0 ? (
                            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/90 shadow-sm space-y-3">
                                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                                    <span className="material-icons text-3xl">mark_chat_read</span>
                                </div>
                                <h3 className="text-base font-black text-gray-800">Belum Ada Riwayat Blasting</h3>
                                <p className="text-xs text-gray-500 max-w-md mx-auto">
                                    Sesi broadcast WhatsApp yang Anda kirimkan akan otomatis tercatat di sini secara lengkap dengan status per nomor dan waktu pengirimannya.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setActiveMainTab('composer')}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                                >
                                    <span className="material-icons text-sm">send</span>
                                    <span>Buat Broadcast Sekarang</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {historySessions.map((session) => {
                                    const total = session.total_recipients || 0;
                                    const success = session.success_count || 0;
                                    const failed = session.failed_count || 0;
                                    const successPercent = total > 0 ? Math.round((success / total) * 100) : 0;
                                    const failedPercent = total > 0 ? Math.round((failed / total) * 100) : 0;

                                    const isRunning = session.status === 'processing' || session.status === 'queued';
                                    const hasFailed = failed > 0;

                                    return (
                                        <div
                                            key={session.id}
                                            className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-sm hover:shadow-md transition-all space-y-4 ${
                                                session.status === 'scheduled'
                                                    ? 'border-indigo-300 ring-2 ring-indigo-500/10 bg-gradient-to-br from-white via-white to-indigo-50/25'
                                                    : 'border-gray-200/90'
                                            }`}
                                        >
                                            {/* Session Card Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <h3 className="text-base font-black text-gray-900">
                                                            {session.title || `Broadcast WA #${session.id}`}
                                                        </h3>
                                                        {/* Status Badge */}
                                                        {session.status === 'scheduled' && (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200 shadow-xs">
                                                                <span className="material-icons text-sm text-indigo-600">schedule</span>
                                                                <span>Terjadwal: {formatIndonesianDateTime(session.scheduled_at)}</span>
                                                            </span>
                                                        )}
                                                        {session.status === 'completed' && !hasFailed && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                                                                <span className="material-icons text-xs">check_circle</span>
                                                                <span>Selesai (100% Sukses)</span>
                                                            </span>
                                                        )}
                                                        {session.status === 'completed' && hasFailed && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                                                                <span className="material-icons text-xs">warning</span>
                                                                <span>Selesai ({failed} Gagal)</span>
                                                            </span>
                                                        )}
                                                        {isRunning && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200 animate-pulse">
                                                                <span className="material-icons text-xs animate-spin">sync</span>
                                                                <span>Sedang Mengirim...</span>
                                                            </span>
                                                        )}
                                                        {session.status === 'cancelled' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                                                                <span className="material-icons text-xs">cancel</span>
                                                                <span>Dibatalkan</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Date & Time */}
                                                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                                        <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                                                            <span className="material-icons text-sm text-emerald-600">event</span>
                                                            <span>Dibuat: {formatIndonesianDateTime(session.created_at)}</span>
                                                        </span>
                                                        {session.scheduled_at && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                                                                    <span className="material-icons text-xs text-indigo-600">alarm</span>
                                                                    <span>Jadwal Kirim: {formatIndonesianDateTime(session.scheduled_at)} WIB</span>
                                                                </span>
                                                            </>
                                                        )}
                                                        <span>•</span>
                                                        <span className="inline-flex items-center gap-1 text-gray-500">
                                                            <span className="material-icons text-sm text-gray-400">person</span>
                                                            <span>Oleh: {session.created_by_name}</span>
                                                        </span>
                                                        {session.device_id && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="inline-flex items-center gap-1 text-gray-500 font-mono text-[11px]">
                                                                    <span className="material-icons text-sm text-gray-400">devices</span>
                                                                    <span>{session.device_id}</span>
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Top Stats Breakdown */}
                                                <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-gray-100 self-start sm:self-auto">
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Target</p>
                                                        <p className="text-sm font-black text-gray-800">{total}</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-200"></div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Sukses</p>
                                                        <p className="text-sm font-black text-emerald-700">{success} ({successPercent}%)</p>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-200"></div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-bold text-rose-500 uppercase">Gagal</p>
                                                        <p className="text-sm font-black text-rose-600">{failed}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Scheduled Info Alert Banner (if scheduled) */}
                                            {session.status === 'scheduled' && (
                                                <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
                                                            <span className="material-icons text-xl">schedule_send</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5 flex-wrap">
                                                                <span>Dijadwalkan untuk dikirim pada:</span>
                                                                <span className="text-indigo-800 font-black bg-white px-2.5 py-0.5 rounded-lg border border-indigo-300">
                                                                    {formatIndonesianDateTime(session.scheduled_at)} WIB
                                                                </span>
                                                            </p>
                                                            <p className="text-[11px] text-indigo-800/80 mt-0.5">
                                                                Target <b>{total} nomor</b>. Server background scheduler akan otomatis memicu pengiriman di waktu tersebut.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={triggeringScheduledId === session.id}
                                                            onClick={() => handleTriggerScheduledNow(session)}
                                                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                                                        >
                                                            <span className={`material-icons text-sm ${triggeringScheduledId === session.id ? 'animate-spin' : ''}`}>
                                                                {triggeringScheduledId === session.id ? 'sync' : 'bolt'}
                                                            </span>
                                                            <span>Kirim Sekarang</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenRescheduleModal(session)}
                                                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                                                        >
                                                            <span className="material-icons text-sm">edit_calendar</span>
                                                            <span>Ubah Jadwal</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled={cancellingScheduledId === session.id}
                                                            onClick={() => handleCancelScheduled(session)}
                                                            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                                                        >
                                                            <span className={`material-icons text-sm ${cancellingScheduledId === session.id ? 'animate-spin' : ''}`}>
                                                                {cancellingScheduledId === session.id ? 'sync' : 'cancel'}
                                                            </span>
                                                            <span>Batalkan</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Progress Bar Segmented */}
                                            <div>
                                                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="bg-emerald-500 h-full transition-all duration-500"
                                                        style={{ width: `${successPercent}%` }}
                                                        title={`Sukses: ${success} nomor (${successPercent}%)`}
                                                    ></div>
                                                    <div
                                                        className="bg-rose-500 h-full transition-all duration-500"
                                                        style={{ width: `${failedPercent}%` }}
                                                        title={`Gagal: ${failed} nomor (${failedPercent}%)`}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Message Preview */}
                                            <div className="bg-slate-50 rounded-2xl p-3 border border-gray-100 flex items-start gap-3">
                                                <span className="material-icons text-gray-400 text-base mt-0.5 shrink-0">chat_bubble_outline</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed whitespace-pre-wrap font-sans">
                                                        {session.message_template}
                                                    </p>
                                                    {session.has_image && (
                                                        <div className="flex items-center gap-1 mt-1 text-[11px] text-teal-700 font-bold">
                                                            <span className="material-icons text-xs">image</span>
                                                            <span>Lampiran: {session.image_filename || 'Gambar'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons Bar */}
                                            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {/* Open Details Modal (CRM) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedSession(session);
                                                            fetchSessionDetail(session.id, 'all', '');
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                                                    >
                                                        <span className="material-icons text-sm">visibility</span>
                                                        <span>Detail Penerima CRM</span>
                                                    </button>

                                                    {/* Scheduled Specific Actions */}
                                                    {session.status === 'scheduled' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={triggeringScheduledId === session.id}
                                                                onClick={() => handleTriggerScheduledNow(session)}
                                                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                                                            >
                                                                <span className="material-icons text-sm">bolt</span>
                                                                <span>Kirim Sekarang</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenRescheduleModal(session)}
                                                                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition"
                                                            >
                                                                <span className="material-icons text-sm">edit_calendar</span>
                                                                <span>Ubah Jadwal</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Retry Failed Blast Button */}
                                                    {hasFailed && session.status !== 'scheduled' && (
                                                        <button
                                                            type="button"
                                                            disabled={retryingSessionId === session.id}
                                                            onClick={() => handleRetryFailed(session, 'failed')}
                                                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                                                        >
                                                            <span className={`material-icons text-sm ${retryingSessionId === session.id ? 'animate-spin' : ''}`}>
                                                                {retryingSessionId === session.id ? 'sync' : 'replay'}
                                                            </span>
                                                            <span>Blast Ulang yang Gagal ({failed} No)</span>
                                                        </button>
                                                    )}

                                                    {/* Load into Composer */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleLoadToComposer(session)}
                                                        className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition"
                                                    >
                                                        <span className="material-icons text-sm">edit_note</span>
                                                        <span>Muat ke Composer</span>
                                                    </button>
                                                </div>

                                                {/* Delete history */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteSession(session)}
                                                    className="text-gray-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition"
                                                    title="Hapus Riwayat Sesi Ini"
                                                >
                                                    <span className="material-icons text-base">delete_outline</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Pagination Controls */}
                                {historyTotal > 15 && (
                                    <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-200">
                                        <p className="text-xs text-gray-500">
                                            Menampilkan halaman <strong>{historyPage}</strong> dari <strong>{Math.ceil(historyTotal / 15)}</strong> ({historyTotal} sesi)
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={historyPage <= 1}
                                                onClick={() => fetchHistory(historyPage - 1)}
                                                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold disabled:opacity-40 hover:bg-gray-50"
                                            >
                                                Sebelumnya
                                            </button>
                                            <button
                                                type="button"
                                                disabled={historyPage >= Math.ceil(historyTotal / 15)}
                                                onClick={() => fetchHistory(historyPage + 1)}
                                                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold disabled:opacity-40 hover:bg-gray-50"
                                            >
                                                Selanjutnya
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
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

            {/* DETAIL SESI CRM RECIPIENTS MODAL */}
            {selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className="text-base sm:text-lg font-black text-gray-900 truncate">
                                        {selectedSession.title || `Detail Sesi #${selectedSession.id}`}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                        CRM Delivery Log
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                    <span className="material-icons text-xs text-gray-400">schedule</span>
                                    <span>Waktu Pengiriman: {formatIndonesianDateTime(selectedSession.created_at)}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedSession(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center shrink-0"
                            >
                                <span className="material-icons text-sm">close</span>
                            </button>
                        </div>

                        {/* Delivery Stats Header Bar */}
                        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100/70 border-b border-gray-200/80 text-center">
                            <div className="bg-white p-2 rounded-xl border border-gray-200/60 shadow-2xs">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Target</p>
                                <p className="text-sm sm:text-base font-black text-gray-800">{selectedSession.total_recipients}</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-gray-200/60 shadow-2xs">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Berhasil Terkirim</p>
                                <p className="text-sm sm:text-base font-black text-emerald-700">{selectedSession.success_count}</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-gray-200/60 shadow-2xs">
                                <p className="text-[10px] font-bold text-rose-500 uppercase">Gagal Terkirim</p>
                                <p className="text-sm sm:text-base font-black text-rose-600">{selectedSession.failed_count}</p>
                            </div>
                        </div>

                        {/* Filter & Search in Modal */}
                        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                {[
                                    { id: 'all', label: `Semua (${sessionRecipients.length})` },
                                    { id: 'success', label: `Sukses (${sessionRecipients.filter(r => r.status === 'success').length})` },
                                    { id: 'failed', label: `Gagal (${sessionRecipients.filter(r => r.status === 'failed').length})` }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setRecipientStatusFilter(tab.id);
                                            fetchSessionDetail(selectedSession.id, tab.id, recipientSearch);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            recipientStatusFilter === tab.id
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative flex-1 max-w-xs">
                                <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                <input
                                    type="text"
                                    placeholder="Cari nomor atau nama..."
                                    value={recipientSearch}
                                    onChange={(e) => {
                                        setRecipientSearch(e.target.value);
                                        fetchSessionDetail(selectedSession.id, recipientStatusFilter, e.target.value);
                                    }}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Recipients List Table */}
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-2">
                            {sessionLoading ? (
                                <div className="py-12 text-center text-gray-400">
                                    <span className="material-icons text-3xl animate-spin text-emerald-600">sync</span>
                                    <p className="text-xs font-bold mt-2">Memuat daftar penerima...</p>
                                </div>
                            ) : sessionRecipients.length === 0 ? (
                                <div className="py-12 text-center text-gray-400">
                                    <span className="material-icons text-3xl text-gray-300">search_off</span>
                                    <p className="text-xs font-bold mt-1">Tidak ada data penerima yang cocok dengan filter</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-200 bg-slate-50 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                                <th className="py-2.5 px-3">No</th>
                                                <th className="py-2.5 px-3">Nomor WhatsApp</th>
                                                <th className="py-2.5 px-3">Nama Penerima</th>
                                                <th className="py-2.5 px-3">Status</th>
                                                <th className="py-2.5 px-3">Waktu Terkirim</th>
                                                <th className="py-2.5 px-3">Keterangan / Error</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {sessionRecipients.map((rec, i) => (
                                                <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                                                    <td className="py-2.5 px-3 font-bold text-gray-400">{i + 1}</td>
                                                    <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{rec.phone}</td>
                                                    <td className="py-2.5 px-3 text-gray-700 font-medium">{rec.name || '-'}</td>
                                                    <td className="py-2.5 px-3">
                                                        {rec.status === 'success' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                                                                <span className="material-icons text-[11px]">check_circle</span>
                                                                <span>Berhasil Terkirim</span>
                                                            </span>
                                                        )}
                                                        {rec.status === 'failed' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black border border-rose-200">
                                                                <span className="material-icons text-[11px]">cancel</span>
                                                                <span>Gagal Terkirim</span>
                                                            </span>
                                                        )}
                                                        {rec.status === 'pending' && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
                                                                <span className="material-icons text-[11px]">hourglass_top</span>
                                                                <span>Menunggu</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                                                        {formatIndonesianDateTime(rec.sent_at)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-rose-600 text-[11px] max-w-xs truncate" title={rec.error_message || ''}>
                                                        {rec.error_message || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Bottom Footer Actions */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                {selectedSession.failed_count > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            disabled={retryingSessionId === selectedSession.id}
                                            onClick={() => handleRetryFailed(selectedSession, 'failed')}
                                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                                        >
                                            <span className={`material-icons text-sm ${retryingSessionId === selectedSession.id ? 'animate-spin' : ''}`}>
                                                {retryingSessionId === selectedSession.id ? 'sync' : 'replay'}
                                            </span>
                                            <span>Blast Ulang Nomor Gagal ({selectedSession.failed_count})</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleCopyFailedNumbers(sessionRecipients)}
                                            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center gap-1 transition"
                                        >
                                            <span className="material-icons text-sm">content_copy</span>
                                            <span>Salin Nomor Gagal</span>
                                        </button>
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handleExportCsv(selectedSession, sessionRecipients)}
                                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition"
                                >
                                    <span className="material-icons text-sm">download</span>
                                    <span>Ekspor CSV Log</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedSession(null)}
                                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ubah Jadwal Blast (Reschedule Modal) */}
            {rescheduleModalSession && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                                    <span className="material-icons text-xl">edit_calendar</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-gray-900">Ubah Jadwal Broadcast</h3>
                                    <p className="text-xs text-gray-500">Atur ulang waktu pengiriman otomatis</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRescheduleModalSession(null)}
                                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            >
                                <span className="material-icons text-xl">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                                <p className="font-bold text-gray-800">{rescheduleModalSession.title}</p>
                                <p className="text-gray-500">Target: {rescheduleModalSession.total_recipients} nomor penerima</p>
                                {rescheduleModalSession.scheduled_at && (
                                    <p className="text-indigo-700 font-semibold flex items-center gap-1 mt-1">
                                        <span className="material-icons text-xs">alarm</span>
                                        <span>Jadwal saat ini: {formatIndonesianDateTime(rescheduleModalSession.scheduled_at)} WIB</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">
                                    Pilih Waktu Pengiriman Baru (WIB):
                                </label>
                                <input
                                    type="datetime-local"
                                    value={newScheduleDateTime}
                                    min={new Date().toISOString().slice(0, 16)}
                                    onChange={(e) => setNewScheduleDateTime(e.target.value)}
                                    className="w-full p-3 text-sm font-bold text-gray-800 bg-white rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* Quick Presets */}
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase block">Shortcut Cepat:</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setReschedulePreset(30)}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 transition"
                                    >
                                        +30 Menit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReschedulePreset(60)}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 transition"
                                    >
                                        +1 Jam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReschedulePreset(180)}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 transition"
                                    >
                                        +3 Jam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReschedulePreset(null, 9)}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 transition"
                                    >
                                        Besok 09:00 WIB
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReschedulePreset(null, 19)}
                                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 transition"
                                    >
                                        Besok 19:00 WIB
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setRescheduleModalSession(null)}
                                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={rescheduleLoading || !newScheduleDateTime}
                                onClick={handleSaveReschedule}
                                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                            >
                                {rescheduleLoading && (
                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                                )}
                                <span>Simpan Jadwal Baru</span>
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
