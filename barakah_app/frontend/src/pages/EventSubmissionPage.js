import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ImageCropperModal from '../components/common/ImageCropper';
import { createEvent, getEventDetail, updateEvent } from '../services/eventApi';
import CKEditorComponent from '../components/common/CKEditor';

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
    });
    const [formFields, setFormFields] = useState([]);
    const [files, setFiles] = useState({
        header_image: null,
        thumbnail: null,
        documentation_images: [], // New images to upload
    });
    const [existingDocImages, setExistingDocImages] = useState([]); // Images already on server
    const [cropper, setCropper] = useState({ active: false, image: null, type: null });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            navigate(`/login?redirect=${isEdit ? `/event/edit/${slug}` : '/event/ajukan'}`);
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
                    });
                    
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
                } catch (err) {
                    setError('Gagal memuat detail event untuk diedit.');
                }
            };
            fetchDetail();
        } else {
            // New event initialization
            if (formFields.length === 0) {
                setFormFields([{
                    label: 'Nama Lengkap',
                    field_type: 'text',
                    required: true,
                    options: [],
                    order: 0
                }]);
            }
        }
    }, [navigate, slug, isEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (file) {
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

    const handleDocImageUpload = (e) => {
        const uploadedFiles = Array.from(e.target.files);
        setFiles(prev => ({ 
            ...prev, 
            documentation_images: [...prev.documentation_images, ...uploadedFiles] 
        }));
    };

    const removeDocImage = (index, isExisting = false, imageId = null) => {
        if (isExisting) {
            // If it's an existing image, we might want to delete it from server immediately 
            // or mark it for deletion. For simplicity, let's just use the API if we have imageId.
            if (window.confirm('Hapus foto dokumentasi ini?')) {
                const { deleteDocumentationImage } = require('../services/eventApi');
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
            if (formData[key]) data.append(key, formData[key]);
        });
        if (files.header_image) data.append('header_image', files.header_image);
        if (files.thumbnail) data.append('thumbnail', files.thumbnail);
        
        // Append form fields as JSON string (backend will handle)
        if (formFields.length > 0) {
            data.append('form_fields', JSON.stringify(formFields));
        }

        // Append documentation images if any
        if (files.documentation_images.length > 0) {
            files.documentation_images.forEach(img => {
                data.append('documentation_images_upload', img);
            });
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
            setError(err.response?.data?.message || `Gagal ${isEdit ? 'memperbarui' : 'mengajukan'} event. Mohon cek kembali data Anda.`);
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
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-3 border border-red-100">
                                <span className="material-icons text-lg">error</span>
                                {error}
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

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">3</span>
                                Media & Penyelenggara
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Gambar Header (16:9)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            {files.header_image ? (
                                                <img 
                                                    src={files.header_image instanceof File ? URL.createObjectURL(files.header_image) : files.header_image} 
                                                    className="w-full h-full object-cover" 
                                                    alt="Header Preview"
                                                />
                                            ) : <span className="material-icons text-gray-300 flex items-center justify-center h-full">image</span>}
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden"
                                            id="header-upload"
                                            onChange={(e) => handleFileSelect(e, 'header_image')}
                                        />
                                        <label htmlFor="header-upload" className="flex-1 text-center py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold cursor-pointer">Pilih & Potong</label>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Thumbnail (1:1)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            {files.thumbnail ? (
                                                <img 
                                                    src={files.thumbnail instanceof File ? URL.createObjectURL(files.thumbnail) : files.thumbnail} 
                                                    className="w-full h-full object-cover" 
                                                    alt="Thumbnail Preview"
                                                />
                                            ) : <span className="material-icons text-gray-300 flex items-center justify-center h-full">image</span>}
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden"
                                            id="thumb-upload"
                                            onChange={(e) => handleFileSelect(e, 'thumbnail')}
                                        />
                                        <label htmlFor="thumb-upload" className="flex-1 text-center py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold cursor-pointer">Pilih & Potong</label>
                                    </div>
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
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">4</span>
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
                                
                                {['fixed', 'hybrid_1', 'hybrid_2'].includes(formData.price_type) && (
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nominal Fix / Minimal (IDR) *</label>
                                        <input 
                                            type="number" 
                                            name="price_fixed"
                                            value={formData.price_fixed}
                                            onChange={handleChange}
                                            placeholder="Contoh: 20000"
                                            className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition font-bold"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PHASE 5: DOKUMENTASI (POST-EVENT) */}
                        {isEdit && (
                            <div className="space-y-4 pt-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <span className="w-6 h-6 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-xs">5</span>
                                    Dokumentasi (Pasca-Event)
                                </h3>
                                
                                <div className="space-y-4">
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
                                    
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Foto Dokumentasi (Max 3x3 Grid)</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {/* Existing Images */}
                                            {existingDocImages.map((img) => (
                                                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm group">
                                                    <img src={img.image} className="w-full h-full object-cover" alt="Doc" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeDocImage(null, true, img.id)}
                                                        className="absolute inset-0 bg-red-600/60 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                                    >
                                                        <span className="material-icons">delete</span>
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            {/* New Uploads */}
                                            {files.documentation_images.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-green-100 shadow-sm group">
                                                    <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="New Doc" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeDocImage(idx, false)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg"
                                                    >
                                                        <span className="material-icons text-xs">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all">
                                                <span className="material-icons text-2xl">add_a_photo</span>
                                                <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Tambah</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleDocImageUpload} multiple />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PHASE 6: FORM PENDAFTARAN */}
                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-6 h-6 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs">{isEdit ? '6' : '5'}</span>
                                Form Pendaftaran (Wajib Diisi)
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
                                                    <option value="phone">No. HP</option>
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
                    aspect={cropper.type === 'header_image' ? 16 / 9 : 1}
                    maxWidth={1280}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropper({ active: false, image: null, type: null })}
                />
            )}
            <NavigationButton />
        </div>
    );
};

export default EventSubmissionPage;
