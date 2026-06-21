// pages/DashboardEcourseFormPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { createCourse, updateCourse, getCourseDetail } from '../services/ecourseApi';
import ImageCropperModal from '../components/common/ImageCropper';
import CurrencyInput from '../components/common/CurrencyInput';
import '../styles/Body.css';

import { getMediaUrl } from '../utils/mediaUtils';

const CATEGORY_CHOICES = [
    { value: 'islam', label: 'Agama Islam' },
    { value: 'it', label: 'Programming & Development' },
    { value: 'teknik', label: 'Engineering' },
    { value: 'bisnis', label: 'Business & Entrepreneurship' },
    { value: 'kreatif', label: 'Design & Creativity' },
    { value: 'personal', label: 'Personal Development' },
    { value: 'kesehatan', label: 'Health & Lifestyle' },
    { value: 'akademik', label: 'Academics & Test Prep' },
];

const DashboardEcourseFormPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('it');
    const [price, setPrice] = useState('');
    const [discount, setDiscount] = useState('0');
    const [isActive, setIsActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [hasCertificate, setHasCertificate] = useState(false);
    const [certificateInfo, setCertificateInfo] = useState('');
    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);

    // Custom bank account state
    const [ownBankStatus, setOwnBankStatus] = useState('none');
    const [ownBankName, setOwnBankName] = useState('');
    const [ownBankAccount, setOwnBankAccount] = useState('');
    const [ownBankHolder, setOwnBankHolder] = useState('');
    const [ownQrisImage, setOwnQrisImage] = useState(null);
    const [ownQrisImagePreview, setOwnQrisImagePreview] = useState(null);
    const [useOwnBank, setUseOwnBank] = useState(false);
    const [origDetails, setOrigDetails] = useState({});

    // Cropper state
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState(null);

    useEffect(() => {
        if (isEdit) {
            const fetchDetail = async () => {
                try {
                    const res = await getCourseDetail(id); // Backend supports detail by ID too now
                    const data = res.data;
                    setTitle(data.title);
                    setDescription(data.description);
                    setCategory(data.category);
                    setPrice(data.price.toString());
                    setDiscount(data.discount.toString());
                    setIsActive(data.is_active);
                    setIsFeatured(data.is_featured);
                    setHasCertificate(data.has_certificate || false);
                    setCertificateInfo(data.certificate_info || '');
                    setThumbnailPreview(getMediaUrl(data.thumbnail));

                    const detailsObj = {
                        own_bank_status: data.own_bank_status || 'none',
                        own_bank_name: data.own_bank_name || '',
                        own_bank_account: data.own_bank_account || '',
                        own_bank_holder: data.own_bank_holder || '',
                        own_qris_image: data.own_qris_image || null
                    };
                    setOrigDetails(detailsObj);
                    setOwnBankStatus(detailsObj.own_bank_status);
                    setOwnBankName(detailsObj.own_bank_name);
                    setOwnBankAccount(detailsObj.own_bank_account);
                    setOwnBankHolder(detailsObj.own_bank_holder);
                    setOwnQrisImagePreview(getMediaUrl(detailsObj.own_qris_image));
                    setUseOwnBank(detailsObj.own_bank_status !== 'none');
                } catch (err) {
                    console.error(err);
                    alert('Gagal mengambil data kursus');
                    navigate('/dashboard/ecourses');
                } finally {
                    setLoading(false);
                }
            };
            fetchDetail();
        }
    }, [id, isEdit, navigate]);

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setTempImage(reader.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedImageBlob) => {
        setThumbnail(croppedImageBlob);
        setThumbnailPreview(URL.createObjectURL(croppedImageBlob));
        setShowCropper(false);
        setTempImage(null);
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setTempImage(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        
        // Ensure price and discount are at least '0' to avoid validation errors
        const cleanPrice = (price === undefined || price === null || price.toString().trim() === '') ? '0' : price.toString();
        const cleanDiscount = (discount === undefined || discount === null || discount.toString().trim() === '') ? '0' : discount.toString();
        
        formData.append('price', cleanPrice);
        formData.append('discount', cleanDiscount);
        formData.append('is_active', isActive ? 'true' : 'false');
        formData.append('is_featured', isFeatured ? 'true' : 'false');
        formData.append('has_certificate', hasCertificate ? 'true' : 'false');
        formData.append('certificate_info', certificateInfo || '');

        let targetStatus = ownBankStatus;
        if (!useOwnBank) {
            targetStatus = 'none';
        } else if (ownBankStatus === 'none' || ownBankStatus === 'rejected') {
            targetStatus = 'pending';
        } else {
            if (
                ownBankName !== (origDetails.own_bank_name || '') ||
                ownBankAccount !== (origDetails.own_bank_account || '') ||
                ownBankHolder !== (origDetails.own_bank_holder || '') ||
                ownQrisImage !== null
            ) {
                targetStatus = 'pending';
            }
        }
        formData.append('own_bank_status', targetStatus);
        if (useOwnBank) {
            formData.append('own_bank_name', ownBankName);
            formData.append('own_bank_account', ownBankAccount);
            formData.append('own_bank_holder', ownBankHolder);
            if (ownQrisImage) {
                formData.append('own_qris_image', ownQrisImage);
            }
        } else {
            formData.append('own_bank_name', '');
            formData.append('own_bank_account', '');
            formData.append('own_bank_holder', '');
        }

        if (thumbnail) {
            formData.append('thumbnail', thumbnail, 'thumbnail.jpg');
        }

        try {
            if (isEdit) {
                await updateCourse(id, formData);
                alert('Kursus berhasil diperbarui');
            } else {
                const res = await createCourse(formData);
                alert('Kursus berhasil dibuat. Silakan tambahkan materi.');
                navigate(`/dashboard/ecourses/${res.data.id}/materials`);
                return;
            }
            navigate('/dashboard/ecourses');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Gagal menyimpan kursus. Periksa kembali input Anda.';
            setError(msg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="body flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>{isEdit ? 'Edit Kursus' : 'Buat Kursus Baru'} - Dashboard</title>
            </Helmet>

            <Header />

            {/* Sticky Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-gray-100 px-4 py-3 mb-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard/ecourses')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-gray-800 uppercase tracking-widest leading-none mb-1">E-Course</h1>
                            <p className="text-lg font-extrabold text-green-800 leading-none">{isEdit ? 'Edit Info Kursus' : 'Tambah E-Course Baru'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pb-24">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl animate-shake">
                        <div className="flex items-center gap-3 text-red-700">
                            <span className="material-icons">error_outline</span>
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                    {/* Thumbnail Upload */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Thumbnail Kursus</label>
                        <div
                            onClick={() => document.getElementById('course-thumb').click()}
                            className="aspect-video border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition overflow-hidden"
                        >
                            {thumbnailPreview ? (
                                <img src={getMediaUrl(thumbnailPreview)} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <span className="material-icons text-gray-300 text-4xl mb-2">add_photo_alternate</span>
                                    <p className="text-xs text-gray-400">Upload Banner / Cover Kursus</p>
                                    <p className="text-[10px] text-gray-400 mt-1 italic">Rekomendasi 1280x720px (Maks 5MB)</p>
                                </>
                            )}
                        </div>
                        <input
                            id="course-thumb"
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            className="hidden"
                        />
                        <p className="mt-2 text-[10px] font-semibold text-red-500 flex items-center gap-1 leading-none">
                            <span className="material-icons text-[12px]">info</span>
                            Jika gambar terlalu besar ({">"}5MB), upload akan gagal. Harap kecilkan ukuran gambar sebelum upload.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Judul Kursus *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                            placeholder="Contoh: Mastering Digital Marketing 2024"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Deskripsi Singkat *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="4"
                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                            placeholder="Jelaskan apa saja yang akan dipelajari di kursus ini..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                            >
                                {CATEGORY_CHOICES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Harga (Rp) *</label>
                            <CurrencyInput
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="Harga Jual"
                                required
                                className="!bg-gray-50 !border-none !rounded-xl !py-3 font-semibold"
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Isi 0 jika kursus ini Gratis</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-pointer" onClick={() => setIsActive(!isActive)}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => setIsActive(!isActive)}
                                className="w-5 h-5 rounded text-green-700 focus:ring-green-500"
                            />
                            <div>
                                <p className="text-sm font-bold text-gray-800">Aktif</p>
                                <p className="text-[10px] text-gray-500">Tampilkan ke publik</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl cursor-pointer" onClick={() => setIsFeatured(!isFeatured)}>
                            <input
                                type="checkbox"
                                checked={isFeatured}
                                onChange={() => setIsFeatured(!isFeatured)}
                                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <div>
                                <p className="text-sm font-bold text-gray-800">Unggulan</p>
                                <p className="text-[10px] text-gray-500">Muncul di halaman utama</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 bg-gray-50 border border-transparent p-4 rounded-xl cursor-pointer hover:border-blue-100 transition" onClick={() => setHasCertificate(!hasCertificate)}>
                            <input
                                type="checkbox"
                                checked={hasCertificate}
                                onChange={() => setHasCertificate(!hasCertificate)}
                                className="w-5 h-5 mt-0.5 rounded text-blue-700 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-800">Sertifikat Tersedia</p>
                                <p className="text-[10px] text-gray-500">Beri tahu siswa bahwa mereka akan mendapatkan sertifikat setelah selesai.</p>
                            </div>
                        </div>

                        {hasCertificate && (
                            <div className="animate-slide-up">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Informasi Pengiriman Sertifikat</label>
                                <textarea
                                    value={certificateInfo}
                                    onChange={(e) => setCertificateInfo(e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    placeholder="Contoh: Sertifikat akan dikirim via Email dalam 1x24 jam setelah pengisian form detail."
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic">Catatan ini akan muncul saat siswa selesai menonton semua materi.</p>
                            </div>
                        )}
                    </div>

                    {/* Rekening Sendiri Section */}
                    {/* 
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setUseOwnBank(!useOwnBank)}>
                            <div className="flex items-center gap-3">
                                <span className="material-icons text-green-700">account_balance</span>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Gunakan Rekening Sendiri</p>
                                    <p className="text-[10px] text-gray-500">Salurkan pembayaran customer langsung ke rekening Anda</p>
                                </div>
                            </div>
                            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                    type="button"
                                    onClick={() => setUseOwnBank(!useOwnBank)}
                                    className={`w-12 h-6 rounded-full transition-all relative ${useOwnBank ? 'bg-green-600' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${useOwnBank ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        {useOwnBank && (
                            <div className="p-4 space-y-4 animate-slide-up">
                                {ownBankStatus !== 'none' && (
                                    <div className={`p-3 rounded-xl flex items-center gap-3 text-xs font-semibold ${
                                        ownBankStatus === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                        ownBankStatus === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                        'bg-red-50 text-red-700 border border-red-100'
                                    }`}>
                                        <span className="material-icons text-lg">
                                            {ownBankStatus === 'approved' ? 'check_circle' :
                                             ownBankStatus === 'pending' ? 'pending' : 'cancel'}
                                        </span>
                                        <div>
                                            <span className="font-extrabold uppercase">Status Pengajuan: </span>
                                            {ownBankStatus === 'approved' && 'Disetujui. Customer akan membayar langsung ke rekening Anda.'}
                                            {ownBankStatus === 'pending' && 'Menunggu Persetujuan Admin. Sementara menunggu, pembayaran tetap menggunakan QRIS BAE.'}
                                            {ownBankStatus === 'rejected' && 'Ditolak. Pembayaran kembali menggunakan QRIS BAE.'}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Bank / QRIS *</label>
                                        <input
                                            type="text"
                                            value={ownBankName}
                                            onChange={(e) => setOwnBankName(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                            placeholder="Contoh: BSI, BCA, Mandiri"
                                            required={useOwnBank}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nomor Rekening *</label>
                                        <input
                                            type="text"
                                            value={ownBankAccount}
                                            onChange={(e) => setOwnBankAccount(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                            placeholder="Masukkan nomor rekening"
                                            required={useOwnBank}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Pemilik Rekening *</label>
                                    <input
                                        type="text"
                                        value={ownBankHolder}
                                        onChange={(e) => setOwnBankHolder(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                        placeholder="Nama lengkap sesuai buku tabungan"
                                        required={useOwnBank}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">QRIS Code Penjual (Opsional)</label>
                                    <div className="flex items-center gap-4">
                                        {ownQrisImagePreview && (
                                            <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                                                <img src={ownQrisImagePreview} alt="QRIS Preview" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <label className="flex-1 border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/10 transition">
                                            <span className="material-icons text-gray-400 text-2xl mb-1">qr_code_scanner</span>
                                            <span className="text-xs font-bold text-gray-500">Upload QRIS Penjual</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setOwnQrisImage(file);
                                                        setOwnQrisImagePreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="mt-1 text-[10px] text-gray-400 italic">Membantu mempercepat proses pembayaran via e-wallet.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    */}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-green-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition disabled:opacity-50"
                        >
                            {submitting ? 'Sedang Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Kursus & Lanjut ke Materi')}
                        </button>
                    </div>
                </form>
            </div>

            <ImageCropperModal
                show={showCropper}
                image={tempImage}
                onCropComplete={handleCropComplete}
                onCancel={handleCropCancel}
                aspect={16 / 9}
                maxWidth={1280}
                maxHeight={720}
                title="Potong Thumbnail Kursus"
            />

            <NavigationButton />
        </div>
    );
};

export default DashboardEcourseFormPage;
