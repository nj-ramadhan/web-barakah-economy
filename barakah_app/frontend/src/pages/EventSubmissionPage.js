import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ImageCropperModal from '../components/common/ImageCropper';
import { compressImage } from '../components/common/canvasUtils';
import { createEvent, getEventDetail, updateEvent, getUserLabels, deleteDocumentationImage, deleteGalleryImage } from '../services/eventApi';
import CKEditorComponent from '../components/common/CKEditor';
import CurrencyInput from '../components/common/CurrencyInput';

const EventSubmissionPage = () => {
    const navigate = useNavigate();
    const { slug } = useParams();
    const isEdit = !!slug;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        short_description: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        location_url: '',
        organizer_name: '',
        organizer_contact: '',
        price_type: 'free',
        price_fixed: 0,
        documentation_link: '',
        capacity: '',
        terms_do: '',
        terms_dont: '',
        attachment_link: '',
        attachment_file_title: '',
        attachment_link_title: '',
        visibility: 'public',
        visible_at: '',
        registration_start_at: '',
        category: '',
        has_certificate: false,
        has_bib: false,
        allow_ots_payment: false,
        free_for_label_ids: [],
        has_special_qr: false,
        price_variations: [],
        // Added for consistency
        header_image: null,
        header_image_full: null,
        thumbnail: null,
        thumbnail_full: null,
        documentation_frame_1_1: null,
        attachment_file: null,
        bib_template_image: null,
        _bib_preview: null,
        price_variations: [],
        free_for_label_ids: []
    });
    const [availableLabels, setAvailableLabels] = useState([]);
    const [speakers, setSpeakers] = useState([]);
    const [sessions, setSessions] = useState([]);

    const [formFields, setFormFields] = useState([]);
    const [files, setFiles] = useState({
        thumbnail: null,
        thumbnail_full: null,
        documentation_frame_1_1: null,
        attachment_file: null,
        documentation_images: [], // New images to upload
        gallery_images: [], // Supporting photos for carousel
    });
    const [existingDocImages, setExistingDocImages] = useState([]); // Images already on server
    const [existingGalleryImages, setExistingGalleryImages] = useState([]); // Existing gallery photos
    const [cropper, setCropper] = useState({ active: false, image: null, type: null });

    useEffect(() => {
        getUserLabels().then(res => setAvailableLabels(res.data)).catch(err => console.error("Error fetching labels:", err));
    }, []);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            const redirectPath = isEdit ? `/event/edit/${slug}` : '/event/ajukan';
            navigate(`/login?redirect=${redirectPath}`);
            return;
        }

        if (isEdit) {
            const fetchDetail = async () => {
                try {
                    const res = await getEventDetail(slug);
                    const d = res.data;

                    // Populate basic info
                    setFormData({
                        title: d.title,
                        short_description: d.short_description || '',
                        description: d.description || '',
                        start_date: d.start_date ? d.start_date.substring(0, 16) : '',
                        end_date: d.end_date ? d.end_date.substring(0, 16) : '',
                        location: d.location || '',
                        location_url: d.location_url || '',
                        organizer_name: d.organizer_name || '',
                        organizer_contact: d.organizer_contact || '',
                        price_type: d.price_type || 'free',
                        price_fixed: d.price_fixed || 0,
                        documentation_link: d.documentation_link || '',
                        capacity: d.capacity || '',
                        terms_do: d.terms_do || '',
                        terms_dont: d.terms_dont || '',
                        header_image: d.header_image,
                        header_image_full: d.header_image_full,
                        thumbnail: d.thumbnail,
                        thumbnail_full: d.thumbnail_full,
                        documentation_frame_1_1: d.documentation_frame_1_1,
                        attachment_link: d.attachment_link || '',
                        attachment_file_title: d.attachment_file_title || '',
                        attachment_link_title: d.attachment_link_title || '',
                        visibility: d.visibility || 'public',
                        visible_at: d.visible_at ? d.visible_at.substring(0, 16) : '',
                        registration_start_at: d.registration_start_at ? d.registration_start_at.substring(0, 16) : '',
                        attachment_file: d.attachment_file,
                        category: d.category || '',
                        has_certificate: d.has_certificate || false,
                        has_bib: d.has_bib || false,
                        allow_ots_payment: d.allow_ots_payment || false,
                        free_for_label_ids: d.free_for_labels ? d.free_for_labels.map(l => l.id) : [],
                        has_special_qr: d.has_special_qr || false,
                        price_variations: d.price_variations || [],
                    });

                    if (d.speakers && d.speakers.length > 0) setSpeakers(d.speakers);
                    if (d.sessions && d.sessions.length > 0) setSessions(d.sessions);

                    // Populate form fields
                    if (d.form_fields && d.form_fields.length > 0) {
                        setFormFields(d.form_fields);
                    } else {
                        // Default if empty
                        setFormFields([{
                            label: 'Nama Lengkap',
                            field_type: 'text',
                            required: true,
                            options: [],
                            order: 0
                        }]);
                    }

                    // Populate existing documentation images
                    if (d.documentation_images) {
                        setExistingDocImages(d.documentation_images);
                    }

                    // Populate existing gallery images
                    if (d.gallery_images) {
                        setExistingGalleryImages(d.gallery_images);
                    }
                } catch (err) {
                    setError('Gagal memuat detail event untuk diedit.');
                }
            };
            fetchDetail();
        } else {
            // New event initialization
            if (formFields.length === 0) {
                setFormFields([
                    { label: 'Nama', field_type: 'text', required: true, options: [], order: 0 },
                    { label: 'Email', field_type: 'email', required: true, options: [], order: 1 },
                    { label: 'No HP', field_type: 'phone', required: true, options: [], order: 2 },
                    { label: 'Asal Instansi', field_type: 'text', required: true, options: [], order: 3 },
                    { label: 'Jenis Kelamin', field_type: 'radio', required: true, options: ['Laki-laki', 'Perempuan'], order: 4 },
                ]);
            }
        }
    }, [navigate, slug, isEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const [previewImage, setPreviewImage] = useState(null);

    const openPreview = (fileOrUrl, type) => {
        if (!fileOrUrl) return;

        if (type && files[`${type}_full`]) {
            const fullUrl = URL.createObjectURL(files[`${type}_full`]);
            setPreviewImage(fullUrl);
            return;
        }

        const url = fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
        setPreviewImage(url);
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            // Store original file immediately
            setFiles(prev => ({ ...prev, [`${type}_full`]: file }));

            const reader = new FileReader();
            reader.onload = () => {
                setCropper({ active: true, image: reader.result, type });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = useCallback(async (croppedImageBlob) => {
        // croppedImageBlob is already a Blob from canvasUtils.js
        if (!croppedImageBlob) return;

        const file = new File([croppedImageBlob], `${cropper.type}.jpg`, { type: 'image/jpeg' });

        setFiles(prev => ({ ...prev, [cropper.type]: file }));
        setCropper({ active: false, image: null, type: null });
    }, [cropper.type]);

    const handleDescriptionChange = (content) => {
        setFormData(prev => ({ ...prev, description: content }));
    };

    const addFormField = () => {
        setFormFields([...formFields, {
            label: '',
            field_type: 'text',
            required: true,
            options: [],
            order: formFields.length
        }]);
    };

    const removeFormField = (index) => {
        const newFields = formFields.filter((_, i) => i !== index);
        setFormFields(newFields.map((f, i) => ({ ...f, order: i })));
    };

    const updateFormField = (index, updates) => {
        const newFields = [...formFields];
        newFields[index] = { ...newFields[index], ...updates };
        setFormFields(newFields);
    };

    const addSpeaker = () => setSpeakers([...speakers, { name: '', role: '', order: speakers.length }]);
    const removeSpeaker = (index) => setSpeakers(speakers.filter((_, i) => i !== index));
    const updateSpeaker = (index, updates) => {
        const newArr = [...speakers];
        newArr[index] = { ...newArr[index], ...updates };
        setSpeakers(newArr);
    };

    const addSession = () => setSessions([...sessions, { title: '', start_time: '', end_time: '', order: sessions.length }]);
    const removeSession = (index) => setSessions(sessions.filter((_, i) => i !== index));
    const updateSession = (index, updates) => {
        const newArr = [...sessions];
        newArr[index] = { ...newArr[index], ...updates };
        setSessions(newArr);
    };

    const addPriceVariation = () => setFormData(prev => ({ 
        ...prev, 
        price_variations: [...prev.price_variations, { title: '', price: 0, benefits: '', order: prev.price_variations.length }] 
    }));
    const removePriceVariation = (index) => setFormData(prev => ({ 
        ...prev, 
        price_variations: prev.price_variations.filter((_, i) => i !== index) 
    }));
    const updatePriceVariation = (index, updates) => {
        const newArr = [...formData.price_variations];
        newArr[index] = { ...newArr[index], ...updates };
        setFormData(prev => ({ ...prev, price_variations: newArr }));
    };

    const handleDocImageUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files);
        setLoading(true);
        try {
            const compressedFiles = await Promise.all(
                uploadedFiles.map(file => compressImage(file))
            );
            setFiles(prev => ({
                ...prev,
                documentation_images: [...prev.documentation_images, ...compressedFiles]
            }));
        } catch (err) {
            console.error("Compression failed:", err);
            setError("Gagal memproses beberapa gambar. Pastikan formatnya benar.");
        } finally {
            setLoading(false);
        }
    };

    const removeDocImage = (index, isExisting = false, imageId = null) => {
        if (isExisting) {
            if (window.confirm('Hapus foto dokumentasi ini?')) {
                deleteDocumentationImage(slug, imageId).then(() => {
                    setExistingDocImages(prev => prev.filter(img => img.id !== imageId));
                });
            }
        } else {
            setFiles(prev => ({
                ...prev,
                documentation_images: prev.documentation_images.filter((_, i) => i !== index)
            }));
        }
    };

    const handleGalleryImageUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files);
        setLoading(true);
        try {
            const compressedFiles = await Promise.all(
                uploadedFiles.map(file => compressImage(file))
            );
            setFiles(prev => ({
                ...prev,
                gallery_images: [...prev.gallery_images, ...compressedFiles]
            }));
        } catch (err) {
            console.error("Gallery compression failed:", err);
            setError("Gagal memproses beberapa foto pendukung.");
        } finally {
            setLoading(false);
        }
    };

    const removeGalleryImage = (index, isExisting = false, imageId = null) => {
        if (isExisting) {
            if (window.confirm('Hapus foto pendukung ini?')) {
                deleteGalleryImage(slug, imageId).then(() => {
                    setExistingGalleryImages(prev => prev.filter(img => img.id !== imageId));
                });
            }
        } else {
            setFiles(prev => ({
                ...prev,
                gallery_images: prev.gallery_images.filter((_, i) => i !== index)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Final validation for form fields
        if (formFields.length === 0) {
            setError('Minimal harus ada 1 field pendaftaran (misal: Nama, No HP, dll).');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(true);
        setError(null);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            // Only append non-file fields that are not null/empty
            // Skip thumbnail and header_image if they are just strings (URLs)
            if (key !== 'thumbnail' && key !== 'header_image' && key !== 'thumbnail_full' && key !== 'header_image_full' && key !== 'documentation_frame_1_1' && key !== 'attachment_file' && key !== 'bib_template_image' && !key.startsWith('_')) {
                const val = formData[key];
                if (val !== null && val !== undefined && val !== '') {
                    data.append(key, val);
                } else if ((key === 'capacity' || key === 'price_fixed') && val === '') {
                    // Prevent empty string for integer/decimal fields causing 400 errors
                    data.append(key, 0);
                }
            }
        });

        // Only append files if they are actual File objects (newly selected/cropped)
        if (files.thumbnail instanceof File) {
            data.append('thumbnail', files.thumbnail);
        }

        // Append free_for_label_ids correctly as multiple fields
        if (formData.free_for_label_ids && formData.free_for_label_ids.length > 0) {
            formData.free_for_label_ids.forEach(id => {
                data.append('free_for_label_ids', id);
            });
        }

        // Append price variations as JSON
        if (formData.price_variations && formData.price_variations.length > 0) {
            data.append('price_variations', JSON.stringify(formData.price_variations));
        }

        // Append form fields as JSON string (backend will handle)
        if (formFields.length > 0) {
            data.append('form_fields', JSON.stringify(formFields));
        }

        // Clean up speakers and sessions data
        const cleanedSpeakers = speakers.map(s => {
            const cleaned = { ...s };
            // Convert empty strings to null for optional fields
            if (cleaned.role === '') cleaned.role = null;
            if (cleaned.link === '') cleaned.link = null;
            return cleaned;
        });

        if (cleanedSpeakers.length > 0) {
            data.append('speakers', JSON.stringify(cleanedSpeakers));
        }

        const cleanedSessions = sessions.map(s => {
            const cleaned = { ...s };
            // Convert empty strings to null for datetime fields
            if (cleaned.start_time === '') cleaned.start_time = null;
            if (cleaned.end_time === '') cleaned.end_time = null;
            return cleaned;
        });

        if (cleanedSessions.length > 0) {
            data.append('sessions', JSON.stringify(cleanedSessions));
        }

        if (files.thumbnail_full instanceof File) data.append('thumbnail_full', files.thumbnail_full);
        if (files.documentation_frame_1_1 instanceof File) data.append('documentation_frame_1_1', files.documentation_frame_1_1);
        if (files.attachment_file instanceof File) data.append('attachment_file', files.attachment_file);

        // Append documentation images if any
        if (files.documentation_images.length > 0) {
            files.documentation_images.forEach(img => {
                data.append('documentation_images_upload', img);
            });
        }

        // Append gallery images if any
        if (files.gallery_images.length > 0) {
            files.gallery_images.forEach(img => {
                data.append('gallery_images_upload', img);
            });
        }

        if (formData.bib_template_image instanceof File) {
            data.append('bib_template_image', formData.bib_template_image);
        }

        try {
            if (isEdit) {
                await updateEvent(slug, data);
            } else {
                await createEvent(data);
            }
            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard/my-events');
            }, 2000);
        } catch (err) {
            console.error(err);
            const errorData = err.response?.data;
            const errorMsg = errorData ? JSON.stringify(errorData) : `Gagal ${isEdit ? 'memperbarui' : 'mengajukan'} event.`;
            setError(errorMsg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="body flex items-center justify-center min-h-screen bg-green-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm mx-4 animate-scale-up">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-icons text-4xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Pengajuan Berhasil!</h2>
                    <p className="text-gray-500 text-sm mb-6">Event Anda akan ditinjau oleh admin. Anda akan menerima notifikasi email setelah disetujui.</p>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-green-600 h-full animate-progress-fast"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Ajukan Event - Barakah Economy</title>
            </Helmet>
            <Header />

            <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-green-700 p-8 text-white relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <h1 className="text-2xl font-bold relative z-10">{isEdit ? 'Edit Event' : 'Form Pengajuan Event'}</h1>
                        <p className="text-green-100 text-sm mt-1 relative z-10">{isEdit ? 'Perbarui informasi event Anda' : 'Bagikan kegiatan Anda kepada komunitas BAE'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xl animate-bounce-in">
                                <div className="bg-red-600 text-white p-5 rounded-[2rem] shadow-2xl shadow-red-900/40 flex items-start gap-4 border border-red-500/50 backdrop-blur-md">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                                        <span className="material-icons text-xl">error_outline</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-sm uppercase tracking-widest mb-1">Terjadi Kesalahan</h4>
                                        <p className="text-xs font-medium text-red-50 leading-relaxed">
                                            {error.split(' | ').map((err, i) => (
                                                <span key={i} className="block">• {err}</span>
                                            ))}
                                        </p>
                                    </div>
                                    <button onClick={() => setError(null)} className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center transition">
                                        <span className="material-icons text-sm">close</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">1</span>
                                Informasi Umum
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Judul Event *</label>
                                    <input
                                        required
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Contoh: Webinar Bisnis Syariah 2024"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Ringkasan Singkat *</label>
                                    <textarea
                                        required
                                        name="short_description"
                                        value={formData.short_description}
                                        onChange={handleChange}
                                        rows="2"
                                        placeholder="Teks singkat yang muncul di halaman daftar event..."
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    ></textarea>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Deskripsi Lengkap *</label>
                                    <div className="rounded-2xl overflow-hidden border border-gray-100">
                                        <CKEditorComponent
                                            content={formData.description}
                                            onChange={handleDescriptionChange}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Kategori Event</label>
                                        <input
                                            type="text"
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            placeholder="Contoh: Pelatihan, Seminar, Webinar..."
                                            className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex flex-col justify-center">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2">Tersedia Sertifikat?</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, has_certificate: !prev.has_certificate }))}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.has_certificate ? 'bg-green-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.has_certificate ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                            <span className="text-xs font-bold text-gray-600">{formData.has_certificate ? 'Ya' : 'Tidak'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 flex flex-col justify-center">
                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                                                    <span className="material-icons">badge</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-900">Fitur No peserta (BIB)</h4>
                                                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Otomatis tambah kolom Foto di pendaftaran</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newValue = !formData.has_bib;
                                                    setFormData({ ...formData, has_bib: newValue });

                                                    // Automatically add "Pas Foto" field if enabled
                                                    if (newValue) {
                                                        const hasPhotoField = formFields.some(f => f.label.toLowerCase().includes('pas foto'));
                                                        if (!hasPhotoField) {
                                                            const newField = {
                                                                id: Date.now(),
                                                                label: 'Foto Peserta',
                                                                field_type: 'file',
                                                                required: true,
                                                                placeholder: 'Upload foto format JPG/PNG'
                                                            };
                                                            setFormFields([...formFields, newField]);
                                                        }
                                                    }
                                                }}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.has_bib ? 'bg-blue-600' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.has_bib ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        {formData.has_bib && (
                                            <div className="p-6 bg-white border border-blue-100 rounded-3xl space-y-4 shadow-sm animate-fade-in">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Upload Desain BIB (Opsional)</label>
                                                <p className="text-[10px] text-gray-500 italic">Anda juga bisa mengatur ini nanti di menu Kelola Event {'>'} BIB</p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            setFormData({ ...formData, bib_template_image: file });
                                                            // Create a temp preview URL for this session
                                                            const url = URL.createObjectURL(file);
                                                            setFormData(prev => ({ ...prev, _bib_preview: url }));
                                                        }
                                                    }}
                                                    className="w-full text-xs font-bold text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                                />
                                                {formData._bib_preview && (
                                                    <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 max-h-40 flex items-center justify-center bg-gray-50">
                                                        <img src={formData._bib_preview} alt="BIB Preview" className="max-w-full max-h-40 object-contain" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">2</span>
                                Waktu & Lokasi
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Waktu Mulai *</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Waktu Selesai</label>
                                    <input
                                        type="datetime-local"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleChange}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Lokasi / Venue *</label>
                                    <input
                                        required
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="Contoh: Gedung Sate, Bandung atau Online via Zoom"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">URL Lokasi (Maps/Link Zoom)</label>
                                    <input
                                        type="url"
                                        name="location_url"
                                        value={formData.location_url}
                                        onChange={handleChange}
                                        placeholder="https://maps.google.com/..."
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* PHASE: BERKAS & VISIBILITAS */}
                        <div className="space-y-6 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs">3</span>
                                Berkas & Visibilitas
                            </h3>
                            <div className="p-6 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Visibilitas Event *</label>
                                        <select
                                            name="visibility"
                                            value={formData.visibility}
                                            onChange={handleChange}
                                            className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                                        >
                                            <option value="public">Umum (Tampil di Beranda & Daftar)</option>
                                            <option value="private">Privat (Hanya lewat link langsung)</option>
                                        </select>
                                        <p className="text-[10px] text-blue-800/60 ml-1 italic font-medium">Link event tetap bisa diakses meskipun diset Privat.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Kapan Event Tampil di Publik? (Visibility Countdown)</label>
                                        <input
                                            type="datetime-local"
                                            name="visible_at"
                                            value={formData.visible_at}
                                            onChange={handleChange}
                                            className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                                        />
                                        <p className="text-[10px] text-blue-800/60 ml-1 italic font-medium">Kosongkan jika ingin langsung tampil.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Kapan Pendaftaran Dibuka? (Registration Countdown)</label>
                                        <input
                                            type="datetime-local"
                                            name="registration_start_at"
                                            value={formData.registration_start_at}
                                            onChange={handleChange}
                                            className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                                        />
                                        <p className="text-[10px] text-blue-800/60 ml-1 italic font-medium">Kosongkan jika ingin langsung dibuka.</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Lampiran Berkas (PDF/Gambar/Dokumen)</label>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <label className="flex-1 text-center py-3.5 bg-white text-blue-700 rounded-2xl text-xs font-bold cursor-pointer hover:bg-blue-50 transition shadow-sm border border-blue-100">
                                                    {files.attachment_file ? (files.attachment_file.name || 'Berkas Terpilih') : 'UNGGAH BERKAS (OPSIONAL)'}
                                                    <input type="file" name="attachment_file" onChange={(e) => setFiles(prev => ({ ...prev, attachment_file: e.target.files[0] }))} className="hidden" />
                                                </label>
                                                {isEdit && formData.attachment_file && (
                                                    <a href={formData.attachment_file} target="_blank" rel="noreferrer" className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm hover:bg-blue-50 transition">
                                                        <span className="material-icons">visibility</span>
                                                    </a>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                name="attachment_file_title"
                                                value={formData.attachment_file_title}
                                                onChange={handleChange}
                                                placeholder="Judul Berkas (misal: Daftar Menu)"
                                                className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tautan Eksternal Pendukung (Link)</label>
                                        <div className="flex flex-col gap-2">
                                            <input
                                                type="url"
                                                name="attachment_link"
                                                value={formData.attachment_link}
                                                onChange={handleChange}
                                                placeholder="https://..."
                                                className="w-full px-5 py-3.5 bg-white border border-blue-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                                            />
                                            <input
                                                type="text"
                                                name="attachment_link_title"
                                                value={formData.attachment_link_title}
                                                onChange={handleChange}
                                                placeholder="Judul Link (misal: Lokasi Gmaps)"
                                                className="w-full px-4 py-2.5 bg-white border border-blue-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">4</span>
                                Media & Penyelenggara
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Gambar Poster / Thumbnail (16:9) *</label>
                                    <div className="flex flex-col gap-3">
                                        <div
                                            className={`w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 ${files.thumbnail ? 'cursor-pointer' : ''}`}
                                            onClick={() => (files.thumbnail || formData.thumbnail) && openPreview(files.thumbnail || formData.thumbnail, 'thumbnail')}
                                            title={files.thumbnail ? 'Klik untuk lihat detail' : ''}
                                        >
                                            {files.thumbnail || formData.thumbnail ? (
                                                <img
                                                    src={files.thumbnail instanceof File ? URL.createObjectURL(files.thumbnail) : formData.thumbnail}
                                                    className="w-full h-full object-cover"
                                                    alt="Thumbnail Preview"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                                    <span className="material-icons text-4xl">image</span>
                                                    <p className="text-[10px] font-bold">BELUM ADA GAMBAR</p>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="thumb-upload"
                                            onChange={(e) => handleFileSelect(e, 'thumbnail')}
                                        />
                                        <label htmlFor="thumb-upload" className="w-full text-center py-4 bg-green-50 text-green-700 rounded-2xl text-xs font-black cursor-pointer hover:bg-green-100 transition shadow-sm border border-green-100 uppercase tracking-widest">PILIH & POTONG FOTO POSTER</label>
                                    </div>
                                </div>

                                <div className="space-y-1.5 md:col-span-2 mt-4">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Foto Galeri Pendukung (Akan jadi Carousel di Detail)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {/* Existing Gallery Images */}
                                        {existingGalleryImages.map((img) => (
                                            <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm group">
                                                <img
                                                    src={img.image}
                                                    className="w-full h-full object-cover cursor-pointer"
                                                    alt="Gallery"
                                                    onClick={() => openPreview(img.image)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeGalleryImage(null, true, img.id); }}
                                                    className="absolute top-1 right-1 w-6 h-6 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-lg"
                                                >
                                                    <span className="material-icons text-xs">delete</span>
                                                </button>
                                            </div>
                                        ))}

                                        {/* New Gallery Uploads */}
                                        {files.gallery_images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-green-100 shadow-sm group">
                                                <img
                                                    src={URL.createObjectURL(img)}
                                                    className="w-full h-full object-cover cursor-pointer"
                                                    alt="New Gallery"
                                                    onClick={() => openPreview(img)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeGalleryImage(idx, false); }}
                                                    className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                                >
                                                    <span className="material-icons text-xs">close</span>
                                                </button>
                                            </div>
                                        ))}

                                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all">
                                            <span className="material-icons text-2xl">add_photo_alternate</span>
                                            <span className="text-[9px] font-black mt-1 uppercase tracking-widest">TAMBAH FOTO</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleGalleryImageUpload} multiple />
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-gray-400 ml-1 italic mt-2">Gambar-gambar ini akan muncul sebagai slide (carousel) di bagian atas halaman detail event.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nama Penyelenggara *</label>
                                    <input
                                        required
                                        type="text"
                                        name="organizer_name"
                                        value={formData.organizer_name}
                                        onChange={handleChange}
                                        placeholder="Contoh: BAE Regional Bandung"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Kontak (WhatsApp/Email) *</label>
                                    <input
                                        required
                                        type="text"
                                        name="organizer_contact"
                                        value={formData.organizer_contact}
                                        onChange={handleChange}
                                        placeholder="08123xxx / email@test.com"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">5</span>
                                Pengaturan Biaya (HTM)
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Jenis Biaya *</label>
                                    <select
                                        name="price_type"
                                        value={formData.price_type}
                                        onChange={handleChange}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    >
                                        <option value="free">Gratis</option>
                                        <option value="fixed">Berbayar (Fix)</option>
                                        <option value="voluntary">Sukarela (Seikhlasnya)</option>
                                        <option value="hybrid_1">Hybrid 1 (Min Fix + Topup)</option>
                                        <option value="hybrid_2">Hybrid 2 (Pilihan Fix/Sukarela)</option>
                                    </select>
                                </div>

                                {['fixed', 'hybrid_1', 'hybrid_2'].includes(formData.price_type) && formData.price_variations.length === 0 && (
                                    <div className="space-y-1.5 md:col-span-2 animate-fade-in">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nominal Fix / Minimal (IDR) *</label>
                                        <CurrencyInput
                                            name="price_fixed"
                                            value={formData.price_fixed}
                                            onChange={handleChange}
                                            placeholder="Contoh: 20,000"
                                            className="font-bold bg-white border border-green-100 rounded-2xl py-4"
                                        />
                                        <p className="text-[10px] text-gray-400 ml-1 italic">Nominal ini akan digunakan jika Anda tidak menggunakan fitur Variasi Harga di bawah.</p>
                                    </div>
                                )}

                                {formData.price_type !== 'free' && (
                                    <>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2">Pengecualian Biaya (Gratis untuk Label Tertentu)</label>
                                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                                <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                                                    <span className="material-icons text-xs">info</span>
                                                    Pilih label user yang tidak perlu membayar (auto-lolos pembayaran)
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {availableLabels.map(label => {
                                                        const isSelected = formData.free_for_label_ids.includes(label.id);
                                                        return (
                                                            <button
                                                                key={label.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newSelected = isSelected
                                                                        ? formData.free_for_label_ids.filter(id => id !== label.id)
                                                                        : [...formData.free_for_label_ids, label.id];
                                                                    setFormData(prev => ({ ...prev, free_for_label_ids: newSelected }));
                                                                }}
                                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                                                                    isSelected 
                                                                        ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                                                }`}
                                                            >
                                                                {label.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {formData.free_for_label_ids.length === 0 && (
                                                    <p className="text-[10px] text-gray-400 mt-3 italic text-center">Belum ada label yang dipilih</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Price Variations Section */}
                                        <div className="space-y-4 md:col-span-2 p-6 bg-green-50/50 rounded-[2rem] border border-green-100 mt-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black text-green-900">Variasi Harga & Benefit</p>
                                                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Tambahkan beberapa pilihan paket biaya (Opsional)</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={addPriceVariation}
                                                    className="text-[10px] font-black text-white bg-green-600 px-4 py-2 rounded-xl hover:bg-green-700 transition flex items-center gap-1 shadow-lg shadow-green-100"
                                                >
                                                    <span className="material-icons text-sm">add</span>
                                                    TAMBAH PAKET
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {formData.price_variations.map((varItem, idx) => (
                                                    <div key={idx} className="bg-white p-5 rounded-2xl border border-green-100 relative animate-fade-in space-y-4 shadow-sm">
                                                        <button
                                                            type="button"
                                                            onClick={() => removePriceVariation(idx)}
                                                            className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
                                                        >
                                                            <span className="material-icons text-xs">close</span>
                                                        </button>
                                                        
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Paket *</label>
                                                                <input
                                                                    type="text"
                                                                    value={varItem.title}
                                                                    onChange={(e) => updatePriceVariation(idx, { title: e.target.value })}
                                                                    placeholder="Misal: Paket Early Bird"
                                                                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-green-500 transition"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Harga (Rp) *</label>
                                                                <CurrencyInput
                                                                    value={varItem.price}
                                                                    onChange={(e) => updatePriceVariation(idx, { price: e.target.value })}
                                                                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-green-500 transition"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5 sm:col-span-2">
                                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Benefit (Gunakan baris baru untuk memisahkan)</label>
                                                                <textarea
                                                                    value={varItem.benefits}
                                                                    onChange={(e) => updatePriceVariation(idx, { benefits: e.target.value })}
                                                                    rows="2"
                                                                    placeholder="E-Sertifikat&#10;Makan Siang&#10;Gantungan Kunci..."
                                                                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-green-500 transition"
                                                                ></textarea>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {formData.price_variations.length === 0 && (
                                                    <p className="text-[10px] text-green-700/50 italic text-center py-2">Gunakan fitur ini jika ingin memberikan pilihan harga yang berbeda-beda bagi peserta.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 mb-2">Izinkan Pembayaran OTS (On The Spot)?</label>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, allow_ots_payment: !prev.allow_ots_payment }))}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${formData.allow_ots_payment ? 'bg-green-500' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.allow_ots_payment ? 'left-7' : 'left-1'}`}></div>
                                                </button>
                                                <span className="text-xs font-bold text-gray-600">{formData.allow_ots_payment ? 'Ya, Aktifkan OTS' : 'Hanya Transfer/QRIS'}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 ml-1 italic">Jika aktif, pendaftar bisa memilih bayar di lokasi dan melewati upload bukti transfer di awal.</p>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-1.5 md:col-span-2 p-6 bg-purple-50 rounded-[2rem] border border-purple-100 mt-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white text-purple-600 rounded-xl flex items-center justify-center shadow-sm border border-purple-100">
                                                <span className="material-icons">qr_code_2</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-purple-900">Gunakan Desain QR Khusus?</p>
                                                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Kirim tiket dengan desain kustom ke WhatsApp</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newValue = !formData.has_special_qr;
                                                setFormData(prev => ({ ...prev, has_special_qr: newValue }));
                                                
                                                // Automatically add "Pas Foto" field if enabled
                                                if (newValue) {
                                                    const hasPhotoField = formFields.some(f => f.label.toLowerCase().includes('foto peserta') || f.label.toLowerCase().includes('pas foto'));
                                                    if (!hasPhotoField) {
                                                        const newField = {
                                                            id: Date.now(),
                                                            label: 'Foto Peserta',
                                                            field_type: 'file',
                                                            required: true,
                                                            placeholder: 'Upload foto format JPG/PNG',
                                                            order: formFields.length
                                                        };
                                                        setFormFields([...formFields, newField]);
                                                    }
                                                }
                                            }}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${formData.has_special_qr ? 'bg-purple-600' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.has_special_qr ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    {formData.has_special_qr && (
                                        <div className="bg-white/50 p-4 rounded-2xl border border-purple-100 flex items-center gap-3">
                                            <span className="material-icons text-purple-600 text-sm">info</span>
                                            <p className="text-[10px] text-purple-700 italic leading-relaxed">Setelah menyimpan event, Anda bisa mengatur tata letak QR dan data peserta pada menu **Manajemen QR** di daftar pendaftar.</p>
                                        </div>
                                    )}
                                </div>


                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Kapasitas Peserta</label>
                                    <input
                                        type="number"
                                        name="capacity"
                                        value={formData.capacity}
                                        onChange={handleChange}
                                        placeholder="Kosongkan atau isi 0 jika tak terbatas"
                                        className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                    />
                                    <p className="text-[10px] text-gray-400 ml-1 italic">Kosong/0 = Tanpa batas kuota.</p>
                                </div>
                            </div>
                        </div>

                        {/* PHASE: SYARAT, NARASUMBER, SESI */}
                        <div className="space-y-6 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">6</span>
                                Kapasitas & Detail Acara
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-100 p-4 rounded-3xl bg-gray-50/50">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Syarat & Ketentuan (DO)</label>
                                    <textarea name="terms_do" value={formData.terms_do} onChange={handleChange} rows="4" placeholder="Yang boleh dilakukan/dibawa (tiap baris jadi 1 point)" className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"></textarea>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Syarat & Ketentuan (DON'T)</label>
                                    <textarea name="terms_dont" value={formData.terms_dont} onChange={handleChange} rows="4" placeholder="Yang dilarang (tiap baris jadi 1 point)" className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"></textarea>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Daftar Narasumber</label>
                                    <button type="button" onClick={addSpeaker} className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1.5 rounded-full hover:bg-green-200 uppercase flex items-center gap-1">Tambah Narasumber</button>
                                </div>
                                {speakers.map((spk, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input type="text" placeholder="Nama Narasumber" value={spk.name} onChange={e => updateSpeaker(idx, { name: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition" />
                                            <input type="text" placeholder="Gelar/Role (Opsional)" value={spk.role} onChange={e => updateSpeaker(idx, { role: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition" />
                                        </div>
                                        <input type="url" placeholder="Link Profil/Website (Opsional - https://...)" value={spk.link || ''} onChange={e => updateSpeaker(idx, { link: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition" />
                                        <button type="button" onClick={() => removeSpeaker(idx)} className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition shrink-0"><span className="material-icons text-[10px]">close</span></button>
                                    </div>
                                ))}
                                {speakers.length === 0 && <p className="text-xs text-gray-400 italic px-2">Opsional (bisa dikosongkan)</p>}
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Sesi Acara (Multiple Sessions)</label>
                                    <button type="button" onClick={addSession} className="text-[10px] font-black text-green-700 bg-green-100 px-3 py-1.5 rounded-full hover:bg-green-200 uppercase flex items-center gap-1">Tambah Sesi</button>
                                </div>
                                {sessions.map((ses, idx) => (
                                    <div key={idx} className="grid grid-cols-3 gap-2 items-center bg-gray-50 p-2 rounded-2xl border border-gray-100 relative">
                                        <input type="text" placeholder="Judul Sesi (Misal: Sesi 1 / Pagi)" value={ses.title} onChange={e => updateSession(idx, { title: e.target.value })} className="col-span-3 px-4 py-2 border border-gray-100 rounded-xl text-sm" />
                                        <div className="col-span-3 flex gap-2">
                                            <input type="datetime-local" value={ses.start_time ? ses.start_time.substring(0, 16) : ''} onChange={e => updateSession(idx, { start_time: e.target.value })} className="flex-1 px-4 py-2 border border-gray-100 rounded-xl text-xs" />
                                            <input type="datetime-local" value={ses.end_time ? ses.end_time.substring(0, 16) : ''} onChange={e => updateSession(idx, { end_time: e.target.value })} className="flex-1 px-4 py-2 border border-gray-100 rounded-xl text-xs" />
                                        </div>
                                        <button type="button" onClick={() => removeSession(idx)} className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition shrink-0"><span className="material-icons text-[10px]">close</span></button>
                                    </div>
                                ))}
                                {sessions.length === 0 && <p className="text-[10px] text-gray-400 italic px-2">Jika tidak ada sesi khusus, kehadiran dihitung 1x (Umum).</p>}
                            </div>
                        </div>



                        {/* PHASE 7: DOKUMENTASI (POST-EVENT) */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-xs">7</span>
                                Dokumentasi (Pasca-Event)
                            </h3>

                            <div className="space-y-4">
                                {isEdit && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Link Download Dokumentasi</label>
                                        <input
                                            type="url"
                                            name="documentation_link"
                                            value={formData.documentation_link}
                                            onChange={handleChange}
                                            placeholder="https://drive.google.com/..."
                                            className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition"
                                        />
                                        <p className="text-[10px] text-gray-400 ml-1 italic">Link ini hanya akan tampil bagi peserta yang sudah login dan terdaftar.</p>
                                    </div>
                                )}

                                <div className="space-y-2 mb-6">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Bingkai Dokumentasi Ukuran 4:5 Transparan (PNG) Opsional</label>
                                    <div className="flex gap-4 items-end">
                                        <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center shrink-0">
                                            {files.documentation_frame_1_1 || formData.documentation_frame_1_1 ? (
                                                <img src={files.documentation_frame_1_1 instanceof File ? URL.createObjectURL(files.documentation_frame_1_1) : formData.documentation_frame_1_1} className="w-full h-full object-contain p-2" alt="frame preview" />
                                            ) : <span className="material-icons text-gray-300 text-3xl">filter_frames</span>}
                                        </div>
                                        <div className="flex-1">
                                            <input type="file" accept="image/png" id="frame-upload" className="hidden" onChange={e => setFiles(p => ({ ...p, documentation_frame_1_1: e.target.files[0] }))} />
                                            <label htmlFor="frame-upload" className="text-xs bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold cursor-pointer inline-block border border-purple-100">Pilih File Bingkai</label>
                                            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Pilih PNG transparan rasio 4:5. Bingkai ini akan otomatis ditempel ketika admin upload foto dokumentasi.</p>
                                        </div>
                                    </div>
                                </div>

                                {isEdit && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Foto Dokumentasi (Max 3x3 Grid)</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Existing Images */}
                                            {existingDocImages.map((img) => (
                                                <div key={img.id} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-gray-100 shadow-sm group">
                                                    <img
                                                        src={img.image}
                                                        className="w-full h-full object-cover cursor-pointer"
                                                        alt="Doc"
                                                        onClick={() => openPreview(img.image)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeDocImage(null, true, img.id); }}
                                                        className="absolute top-1 right-1 w-6 h-6 bg-red-600/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center shadow-lg"
                                                    >
                                                        <span className="material-icons text-xs">delete</span>
                                                    </button>
                                                </div>
                                            ))}

                                            {/* New Uploads */}
                                            {files.documentation_images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-[4/5] rounded-xl overflow-hidden border border-green-100 shadow-sm group">
                                                    <img
                                                        src={URL.createObjectURL(img)}
                                                        className="w-full h-full object-cover cursor-pointer"
                                                        alt="New Doc"
                                                        onClick={() => openPreview(img)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeDocImage(idx, false); }}
                                                        className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                                    >
                                                        <span className="material-icons text-xs">close</span>
                                                    </button>
                                                </div>
                                            ))}

                                            <label className="aspect-[4/5] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all">
                                                <span className="material-icons text-2xl">add_a_photo</span>
                                                <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Tambah</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleDocImageUpload} multiple />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Supporting Gallery Images (Formerly Doc) */}
                            </div>
                        </div>
                        {/* PHASE 7: FORM PENDAFTARAN */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">8</span>
                                Formulir Pendaftaran Khusus
                            </h3>
                            <p className="text-xs text-gray-500 bg-green-50 p-3 rounded-xl border border-green-100 italic">
                                Tentukan data apa saja yang wajib diisi oleh calon pendaftar event Anda (Minimal: Nama Lengkap).
                            </p>

                            <div className="space-y-4">
                                {formFields.map((field, index) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                                        {formFields.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeFormField(index)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <span className="material-icons text-xs">close</span>
                                            </button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Pertanyaan / Label *</label>
                                                <input
                                                    type="text"
                                                    placeholder="Contoh: Ukuran Kaos"
                                                    value={field.label}
                                                    onChange={(e) => updateFormField(index, { label: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">Tipe Jawaban</label>
                                                <select
                                                    value={field.field_type}
                                                    onChange={(e) => updateFormField(index, { field_type: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-sm"
                                                >
                                                    <option value="text">Teks Pendek</option>
                                                    <option value="textarea">Teks Panjang</option>
                                                    <option value="number">Angka</option>
                                                    <option value="email">Email</option>
                                                    <option value="phone">HP</option>
                                                    <option value="date">Tanggal</option>
                                                    <option value="select">Pilihan (Dropdown)</option>
                                                    <option value="radio">Pilihan Tunggal</option>
                                                    <option value="checkbox">Pilihan Banyak</option>
                                                    <option value="file">Upload File/Gambar</option>
                                                </select>
                                            </div>

                                            {['select', 'radio', 'checkbox'].includes(field.field_type) && (
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Opsi (Pisahkan dengan koma) *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="S, M, L, XL"
                                                        value={field.options?.join(', ') || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            updateFormField(index, { options: val ? val.split(',').map(s => s.trim()) : [] });
                                                        }}
                                                        className="w-full px-4 py-2.5 bg-white border-none rounded-xl text-sm"
                                                    />
                                                </div>
                                            )}

                                            <div className="md:col-span-2 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`req-${index}`}
                                                    checked={field.required}
                                                    onChange={(e) => updateFormField(index, { required: e.target.checked })}
                                                    className="w-4 h-4 text-green-600 rounded"
                                                />
                                                <label htmlFor={`req-${index}`} className="text-xs text-gray-600 font-medium cursor-pointer">Wajib diisi</label>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={addFormField}
                                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-green-600 hover:border-green-200 transition flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <span className="material-icons text-sm">add_circle_outline</span>
                                    TAMBAH PERTANYAAN FORM
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-5 bg-green-700 text-white rounded-3xl text-sm font-bold shadow-xl shadow-green-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-800'}`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    MENGIRIM PENGAJUAN...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons text-sm">send</span>
                                    {isEdit ? 'SIMPAN PERUBAHAN' : 'AJUKAN EVENT SEKARANG'}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
            {cropper.active && (
                <ImageCropperModal
                    image={cropper.image}
                    aspect={16 / 9}
                    maxWidth={1024}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropper({ active: false, image: null, type: null })}
                />
            )}
            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-10 right-0 md:-right-10 w-10 h-10 bg-white/10 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm z-[111]"
                        >
                            <span className="material-icons">close</span>
                        </button>
                        <img
                            src={previewImage}
                            alt="Full Preview"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        />
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default EventSubmissionPage;
