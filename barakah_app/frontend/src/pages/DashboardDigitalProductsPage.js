// pages/DashboardDigitalProductsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import '../styles/Body.css';

const formatIDR = (amount) => {
    if (amount === 0 || amount === '0') return 'Gratis';
    return 'Rp ' + formatCurrency(amount);
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    return `${baseUrl}${url}`;
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
        setThumbnailPreview(product.thumbnail);
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
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/digital-products/${product.slug}/buyers/`, {
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
        if (!title || !description || !price || !digitalLink) {
            alert('Mohon lengkapi semua field yang wajib');
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
                                    <img src={thumbnailPreview} alt="Preview" className="max-h-32 mx-auto rounded" />
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
                                type="url"
                                value={digitalLink}
                                onChange={(e) => setDigitalLink(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="https://lynk.id/your-product"
                                required
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
                                        src={getMediaUrl(product.thumbnail) || '/placeholder-image.jpg'}
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
                                                        <a href={`https://wa.me/${b.buyer_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="text-green-600 font-bold hover:underline">
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
