// pages/DashboardDigitalProductsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import {
    getMyDigitalProducts,
    createMyDigitalProduct,
    updateMyDigitalProduct,
    deleteMyDigitalProduct,
} from '../services/digitalProductApi';
import BackButton from '../components/global/BackButton';
import ImageCropperModal from '../components/common/ImageCropper';
import CurrencyInput from '../components/common/CurrencyInput';
import { formatCurrency } from '../utils/formatters';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

const formatIDR = (amount) => {
    if (amount === 0 || amount === '0') return 'Gratis';
    return 'Rp ' + formatCurrency(amount);
};

const CATEGORY_CHOICES = [
    { value: 'ebook', label: 'E-Book' },
    { value: 'template', label: 'Template' },
    { value: 'course', label: 'Online Course' },
    { value: 'software', label: 'Software' },
    { value: 'design', label: 'Design Asset' },
    { value: 'music', label: 'Musik' },
    { value: 'video', label: 'Video' },
    { value: 'document', label: 'Dokumen' },
    { value: 'lainnya', label: 'Lainnya' },
];

const DashboardDigitalProductsPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('lainnya');
    const [price, setPrice] = useState('');
    const [digitalLink, setDigitalLink] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [visibility, setVisibility] = useState('global');
    const [cropper, setCropper] = useState({ active: false, image: null });
    const [showBuyersModal, setShowBuyersModal] = useState(false);
    const [selectedProductBuyers, setSelectedProductBuyers] = useState([]);
    const [buyersLoading, setBuyersLoading] = useState(false);

    // Custom bank account state
    const [ownBankStatus, setOwnBankStatus] = useState('none');
    const [ownBankName, setOwnBankName] = useState('');
    const [ownBankAccount, setOwnBankAccount] = useState('');
    const [ownBankHolder, setOwnBankHolder] = useState('');
    const [ownQrisImage, setOwnQrisImage] = useState(null);
    const [ownQrisImagePreview, setOwnQrisImagePreview] = useState(null);
    const [useOwnBank, setUseOwnBank] = useState(false);
    const [origDetails, setOrigDetails] = useState({});

    const fetchDashboardData = useCallback(async () => {
        try {
            const productsRes = await getMyDigitalProducts();
            setProducts(productsRes.data);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) {
            navigate('/login');
            return;
        }
        fetchDashboardData();
    }, [navigate, fetchDashboardData]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setCategory('lainnya');
        setPrice('');
        setDigitalLink('');
        setIsActive(true);
        setVisibility('global');
        setThumbnail(null);
        setThumbnailPreview(null);
        setEditingProduct(null);
        setShowForm(false);
        setOwnBankStatus('none');
        setOwnBankName('');
        setOwnBankAccount('');
        setOwnBankHolder('');
        setOwnQrisImage(null);
        setOwnQrisImagePreview(null);
        setUseOwnBank(false);
        setOrigDetails({});
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setTitle(product.title);
        setDescription(product.description);
        setCategory(product.category);
        setPrice(product.price.toString());
        setDigitalLink(product.digital_link);
        setIsActive(product.is_active);
        setVisibility(product.visibility || 'global');
        setThumbnailPreview(getMediaUrl(product.thumbnail_url || product.thumbnail));

        const detailsObj = {
            own_bank_status: product.own_bank_status || 'none',
            own_bank_name: product.own_bank_name || '',
            own_bank_account: product.own_bank_account || '',
            own_bank_holder: product.own_bank_holder || '',
            own_qris_image: product.own_qris_image || null
        };
        setOrigDetails(detailsObj);
        setOwnBankStatus(detailsObj.own_bank_status);
        setOwnBankName(detailsObj.own_bank_name);
        setOwnBankAccount(detailsObj.own_bank_account);
        setOwnBankHolder(detailsObj.own_bank_holder);
        setOwnQrisImagePreview(getMediaUrl(detailsObj.own_qris_image));
        setUseOwnBank(detailsObj.own_bank_status !== 'none');
        setShowForm(true);
    };

    const handleDelete = async (productId) => {
        if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
        try {
            await deleteMyDigitalProduct(productId);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus produk');
        }
    };

    const handleToggleActive = async (product) => {
        try {
            const formData = new FormData();
            formData.append('is_active', !product.is_active ? 'true' : 'false');
            await updateMyDigitalProduct(product.id, formData);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert('Gagal mengubah status produk');
        }
    };

    const handleViewBuyers = async (product) => {
        setBuyersLoading(true);
        setShowBuyersModal(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const baseUrl = process.env.REACT_APP_API_BASE_URL || window.location.origin;
            const res = await axios.get(`${baseUrl}/api/digital-products/products/${product.slug}/buyers/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setSelectedProductBuyers(res.data);
        } catch (err) {
            console.error(err);
            alert('Gagal mengambil data pembeli');
            setShowBuyersModal(false);
        } finally {
            setBuyersLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            alert('Judul produk wajib diisi');
            return;
        }
        if (!description.trim()) {
            alert('Deskripsi wajib diisi');
            return;
        }
        if (price === undefined || price === null || price.toString().trim() === '') {
            alert('Harga wajib diisi (isi 0 jika gratis)');
            return;
        }
        if (!digitalLink.trim()) {
            alert('Link produk digital wajib diisi');
            return;
        }
        setSubmitting(true);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('digital_link', digitalLink);
        formData.append('is_active', isActive ? 'true' : 'false');
        formData.append('visibility', visibility);
        if (thumbnail) {
            formData.append('thumbnail', thumbnail);
        }

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

        try {
            if (editingProduct) {
                await updateMyDigitalProduct(editingProduct.id, formData);
            } else {
                await createMyDigitalProduct(formData);
            }
            alert('Produk berhasil disimpan!');
            resetForm();
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Silakan coba lagi.';
            alert(`Gagal menyimpan produk: ${errorMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran gambar terlalu besar. Maksimal 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                setCropper({ active: true, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedBlob) => {
        const file = new File([croppedBlob], 'product_thumb.jpg', { type: 'image/jpeg' });

        setThumbnail(file);
        setThumbnailPreview(URL.createObjectURL(croppedBlob));
        setCropper({ active: false, image: null });
    };

    return (
        <div className="body">
            <Helmet>
                <title>Produk Digital Saya - Dashboard</title>
            </Helmet>

            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
                <div className="flex items-center gap-2 mb-4">
                    <BackButton />
                    <h1 className="text-lg font-bold">Produk Digital Saya</h1>
                </div>

                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => { resetForm(); setShowForm(!showForm); }}
                        className="flex items-center gap-1 bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition"
                    >
                        <span className="material-icons text-lg">{showForm ? 'close' : 'add'}</span>
                        {showForm ? 'Batal' : 'Tambah'}
                    </button>
                </div>

                {/* Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-3">
                        <h2 className="font-semibold text-gray-800 mb-2">
                            {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Foto Produk</label>
                            <div
                                onClick={() => document.getElementById('thumb-input').click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-green-400 transition"
                            >
                                {thumbnailPreview ? (
                                    <img src={getMediaUrl(thumbnailPreview)} alt="Preview" className="max-h-32 mx-auto rounded" />
                                ) : (
                                    <>
                                        <span className="material-icons text-gray-400 text-3xl">add_photo_alternate</span>
                                        <p className="text-xs text-gray-400 mt-1">Klik untuk upload foto</p>
                                        <p className="text-[10px] text-gray-400 italic">Maks. 5MB</p>
                                    </>
                                )}
                            </div>
                            <input
                                id="thumb-input"
                                type="file"
                                accept="image/*"
                                onChange={handleThumbnailChange}
                                className="hidden"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Judul Produk *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Nama produk digital"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi *</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Jelaskan produk digital Anda"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    {CATEGORY_CHOICES.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Harga (Rp) *</label>
                                <CurrencyInput
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="10000"
                                    required
                                    className="!py-2 !rounded-lg border-gray-300"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Link Produk Digital *</label>
                            <input
                                type="text"
                                value={digitalLink}
                                onChange={(e) => setDigitalLink(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="https://drive.google.com/... atau https://lynk.id/..."
                            />
                            <p className="text-xs text-gray-400 mt-1">Link ini akan dikirim ke email pembeli setelah pembayaran</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="active-check"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                />
                                <label htmlFor="active-check" className="text-xs text-gray-700 font-medium">Aktif</label>
                            </div>
                            <div>
                                <select
                                    value={visibility}
                                    onChange={(e) => setVisibility(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="global">Visibility: Global</option>
                                    <option value="exclusive">Visibility: Eksklusif</option>
                                </select>
                            </div>
                        </div>

                        {/* Rekening Sendiri Section */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                            <div className="bg-gray-50 p-3 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => setUseOwnBank(!useOwnBank)}>
                                <div className="flex items-center gap-2">
                                    <span className="material-icons text-green-700 text-lg">account_balance</span>
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">Gunakan Rekening Sendiri</p>
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
                                <div className="p-3 space-y-3 animate-slide-up">
                                    {ownBankStatus !== 'none' && (
                                        <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
                                            ownBankStatus === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                            ownBankStatus === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                            'bg-red-50 text-red-700 border border-red-100'
                                        }`}>
                                            <span className="material-icons text-base">
                                                {ownBankStatus === 'approved' ? 'check_circle' :
                                                 ownBankStatus === 'pending' ? 'pending' : 'cancel'}
                                            </span>
                                            <div>
                                                <span className="font-extrabold uppercase text-[10px]">Status: </span>
                                                {ownBankStatus === 'approved' && 'Disetujui. Customer akan membayar ke rekening Anda.'}
                                                {ownBankStatus === 'pending' && 'Menunggu Persetujuan Admin (Sementara menunggu, menggunakan QRIS BAE).'}
                                                {ownBankStatus === 'rejected' && 'Ditolak (Menggunakan QRIS BAE).'}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Bank *</label>
                                            <input
                                                type="text"
                                                value={ownBankName}
                                                onChange={(e) => setOwnBankName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent font-semibold"
                                                placeholder="Contoh: BSI, BCA"
                                                required={useOwnBank}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">No Rekening *</label>
                                            <input
                                                type="text"
                                                value={ownBankAccount}
                                                onChange={(e) => setOwnBankAccount(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent font-semibold"
                                                placeholder="1234567"
                                                required={useOwnBank}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Pemilik Rekening *</label>
                                        <input
                                            type="text"
                                            value={ownBankHolder}
                                            onChange={(e) => setOwnBankHolder(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent font-semibold"
                                            placeholder="Nama di buku tabungan"
                                            required={useOwnBank}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">QRIS Code Penjual (Opsional)</label>
                                        <div className="flex items-center gap-3">
                                            {ownQrisImagePreview && (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                                    <img src={ownQrisImagePreview} alt="QRIS Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <label className="flex-1 border border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50/10 transition">
                                                <span className="material-icons text-gray-400 text-xl mb-0.5">qr_code_scanner</span>
                                                <span className="text-[10px] font-bold text-gray-500">Upload QRIS</span>
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
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-800 transition disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : (editingProduct ? 'Update Produk' : 'Simpan Produk')}
                        </button>
                    </form>
                )}

                {/* Product List */}
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <span className="material-icons text-5xl mb-2">inventory_2</span>
                        <p className="text-sm">Belum ada produk digital</p>
                        <p className="text-xs text-gray-400 mt-1">Klik "Tambah" untuk menambah produk baru</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {products.map((product) => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <div className="flex items-start gap-3 p-3">
                                    <img
                                        src={getMediaUrl(product.thumbnail_url || product.thumbnail) || '/placeholder-image.jpg'}
                                        alt={product.title}
                                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-sm text-gray-800 line-clamp-1">{product.title}</h3>
                                            {!product.is_active && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded italic">Draft</span>
                                            )}
                                        </div>
                                        <span className="inline-block text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-0.5">{product.category}</span>
                                        <p className="text-green-700 font-bold text-sm mt-1">{formatIDR(product.price)}</p>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => handleToggleActive(product)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${product.is_active
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-200'
                                                }`}
                                            title={product.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                        >
                                            <span className="material-icons text-lg">
                                                {product.is_active ? 'visibility' : 'visibility_off'}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleViewBuyers(product)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                                            title="Lihat Pembeli"
                                        >
                                            <span className="material-icons text-lg">group</span>
                                        </button>
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                            title="Edit"
                                        >
                                            <span className="material-icons text-lg">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                                            title="Hapus"
                                        >
                                            <span className="material-icons text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Buyers Modal */}
            {showBuyersModal && (
                <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Data Pembeli</h3>
                            <button onClick={() => setShowBuyersModal(false)} className="material-icons text-gray-400">close</button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {buyersLoading ? (
                                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
                            ) : selectedProductBuyers.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">Belum ada pembeli untuk produk ini.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Nama</th>
                                                <th className="px-4 py-3">Email</th>
                                                <th className="px-4 py-3">WhatsApp</th>
                                                <th className="px-4 py-3">Tanggal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedProductBuyers.map((b) => (
                                                <tr key={b.id}>
                                                    <td className="px-4 py-3 font-medium">{b.buyer_name}</td>
                                                    <td className="px-4 py-3 text-gray-500">{b.buyer_email}</td>
                                                    <td className="px-4 py-3">
                                                        <a href={`https://wa.me/${b.buyer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-600 font-bold hover:underline">
                                                            {b.buyer_phone}
                                                        </a>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">
                                                        {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowBuyersModal(false)} className="w-full mt-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Tutup</button>
                    </div>
                </div>
            )}

            {cropper.active && (
                <ImageCropperModal
                    image={cropper.image}
                    aspect={1}
                    maxWidth={1024}
                    maxHeight={1024}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropper({ active: false, image: null })}
                />
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardDigitalProductsPage;
