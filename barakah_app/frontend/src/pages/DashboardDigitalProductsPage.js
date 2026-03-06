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
    getDigitalBalance,
    getWithdrawalHistory,
    createWithdrawalRequest,
} from '../services/digitalProductApi';
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
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

    // Balance & Withdrawal state
    const [balanceData, setBalanceData] = useState({ available_balance: 0, total_sales: 0 });
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [donationAmount, setDonationAmount] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [productsRes, balanceRes, historyRes] = await Promise.all([
                getMyDigitalProducts(),
                getDigitalBalance(),
                getWithdrawalHistory(),
            ]);
            setProducts(productsRes.data);
            setBalanceData(balanceRes.data);
            setWithdrawalHistory(historyRes.data);
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
            formData.append('is_active', !product.is_active);
            await updateMyDigitalProduct(product.id, formData);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert('Gagal mengubah status produk');
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
        formData.append('is_active', isActive);
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
            resetForm();
            fetchDashboardData();
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
            if (file.size > 2 * 1024 * 1024) {
                alert('Ukuran gambar terlalu besar. Maksimal 2MB.');
                return;
            }
            setThumbnail(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        if (!withdrawAmount || !bankName || !accountName || !accountNumber) {
            alert('Mohon lengkapi data penarikan');
            return;
        }
        setWithdrawing(true);
        try {
            await createWithdrawalRequest({
                amount: withdrawAmount,
                donation_amount: donationAmount || 0,
                bank_name: bankName,
                account_name: accountName,
                account_number: accountNumber
            });
            alert('Permintaan penarikan berhasil diajukan');
            setShowWithdrawModal(false);
            fetchDashboardData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Gagal mengajukan penarikan');
        } finally {
            setWithdrawing(false);
        }
    };

    const adminFee = (bankName && !['BSI', 'GOPAY'].includes(bankName.toUpperCase())) ? 6500 : 0;
    const totalDeduction = (parseFloat(withdrawAmount) || 0) + (parseFloat(donationAmount) || 0) + adminFee;

    return (
        <div className="body">
            <Helmet>
                <title>Produk Digital Saya - Dashboard</title>
            </Helmet>

            <Header />

            <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
                {/* Balance Card */}
                <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-2xl p-5 mb-6 text-white shadow-lg">
                    <p className="text-xs opacity-80 mb-1">Saldo Tersedia</p>
                    <h2 className="text-2xl font-bold mb-4">{formatIDR(balanceData.available_balance)}</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowWithdrawModal(true)}
                            className="bg-white text-green-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
                        >
                            Tarik Saldo
                        </button>
                        <div className="text-[10px] opacity-70 flex flex-col justify-center">
                            <span>Total Penjualan: {formatIDR(balanceData.total_sales)}</span>
                            <div className="flex gap-2">
                                <span>Digital: {formatIDR(balanceData.digital_sales_total || 0)}</span>
                                <span>Course: {formatIDR(balanceData.course_sales_total || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

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
                                        <p className="text-[10px] text-gray-400 italic">Maks. 2MB</p>
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

                {/* Withdrawal History */}
                {withdrawalHistory.length > 0 && (
                    <div className="mt-8">
                        <h2 className="font-bold mb-3 text-gray-700">Riwayat Penarikan</h2>
                        <div className="space-y-2">
                            {withdrawalHistory.map((w) => (
                                <div key={w.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-bold">{formatIDR(w.amount)}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${w.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {w.status.toUpperCase()}
                                        </span>
                                        <p className="text-[9px] text-gray-400 mt-0.5">{w.bank_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Tarik Saldo</h3>
                            <button onClick={() => setShowWithdrawModal(false)} className="material-icons text-gray-400">close</button>
                        </div>

                        <form onSubmit={handleWithdraw} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Nominal Tarik (Rp)</label>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="Min. 10.000"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Berbagi / Sadaqoh ke BAE (Opsional)</label>
                                <input
                                    type="number"
                                    value={donationAmount}
                                    onChange={(e) => setDonationAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="Masukkan nominal"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Nama Bank</label>
                                    <input
                                        type="text"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                        placeholder="BSI / BCA / DLL"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">No. Rekening</label>
                                    <input
                                        type="text"
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Atas Nama Rekening</label>
                                <input
                                    type="text"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-green-500"
                                    placeholder="Nama Sesuai Buku Tabungan"
                                    required
                                />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Biaya Admin</span>
                                    <span className={adminFee > 0 ? 'text-red-500' : 'text-green-600'}>
                                        {adminFee > 0 ? formatIDR(adminFee) : 'Gratis'}
                                    </span>
                                </div>
                                <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-200">
                                    <span>Total Potongan Saldo</span>
                                    <span className="text-red-600">{formatIDR(totalDeduction)}</span>
                                </div>
                                {adminFee > 0 && <p className="text-[10px] text-gray-400 italic">* Biaya admin Rp 6.500 berlaku untuk bank selain BSI / GOPAY</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={withdrawing}
                                className="w-full bg-green-700 text-white py-4 rounded-xl font-bold text-sm shadow-lg hover:bg-green-800 transition disabled:opacity-50"
                            >
                                {withdrawing ? 'Memproses...' : 'Ajukan Penarikan'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardDigitalProductsPage;
