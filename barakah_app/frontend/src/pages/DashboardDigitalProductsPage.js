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
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
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
    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await getMyDigitalProducts();
            setProducts(res.data);
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
        fetchProducts();
    }, [navigate, fetchProducts]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setCategory('lainnya');
        setPrice('');
        setDigitalLink('');
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
        setThumbnailPreview(product.thumbnail);
        setShowForm(true);
    };

    const handleDelete = async (productId) => {
        if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
        try {
            await deleteMyDigitalProduct(productId);
            fetchProducts();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus produk');
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
        if (thumbnail) {
            formData.append('thumbnail', thumbnail);
        }

        try {
            if (editingProduct) {
                await updateMyDigitalProduct(editingProduct.id, formData);
            } else {
                await createMyDigitalProduct(formData);
            }
            resetForm();
            fetchProducts();
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan produk. Silakan coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setThumbnail(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    return (
        <div className="body">
            <Helmet>
                <title>Produk Digital Saya - Dashboard</title>
            </Helmet>

            <Header />

            <div className="px-4 py-4 pb-20">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-lg font-bold">Produk Digital Saya</h1>
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
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="10000"
                                    required
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
                                        src={product.thumbnail || '/placeholder-image.jpg'}
                                        alt={product.title}
                                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm text-gray-800 line-clamp-1">{product.title}</h3>
                                        <span className="inline-block text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-0.5">{product.category}</span>
                                        <p className="text-green-700 font-bold text-sm mt-1">{formatIDR(product.price)}</p>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => handleEdit(product)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                        >
                                            <span className="material-icons text-lg">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
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

            <NavigationButton />
        </div>
    );
};

export default DashboardDigitalProductsPage;
