import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getMediaUrl } from '../../utils/mediaUtils';
import CKEditorComponent from '../../components/common/CKEditor';
import AdminTestimonyModal from '../../components/modals/AdminTestimonyModal';
import ProductPromoModal from '../../components/modals/ProductPromoModal';

const formatCurrency = (val) => {
    if (!val && val !== 0) return '';
    return new Intl.NumberFormat('id-ID').format(val);
};

const parseCurrency = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    const cleanStr = str.toString().replace(/[^0-9]/g, '');
    return cleanStr ? parseInt(cleanStr, 10) : 0;
};

const DashboardSinergyAdminPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [unit, setUnit] = useState('pcs');
    const [category, setCategory] = useState('lainnya');
    const [purchasePrice, setPurchasePrice] = useState(0);
    const [sellingPrice, setSellingPrice] = useState(0);
    const [stock, setStock] = useState(0);
    const [weight, setWeight] = useState(1000);
    const [isCodAvailable, setIsCodAvailable] = useState(false);
    const [selectedCouriers, setSelectedCouriers] = useState(['jne', 'pos', 'tiki', 'jnt']);
    const [variants, setVariants] = useState([]);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [savingProduct, setSavingProduct] = useState(false);

    // Promo & Testimoni Modal States
    const [isTestiModalOpen, setIsTestiModalOpen] = useState(false);
    const [selectedTestiProduct, setSelectedTestiProduct] = useState(null);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [selectedPromoProduct, setSelectedPromoProduct] = useState(null);

    const fetchProducts = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/?manage=true`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setProducts(res.data || []);
        } catch (error) {
            console.error("Failed fetching products for admin", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleUpdateStatus = async (productId, status) => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/products/${productId}/?manage=true`, 
                { status, is_active: status === 'approved' ? true : undefined }, 
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            fetchProducts();
        } catch (err) {
            alert('Gagal mengubah status produk');
        }
    };

    const handleToggleActive = async (productId, currentActive) => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/products/${productId}/?manage=true`, 
                { is_active: !currentActive }, 
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            fetchProducts();
        } catch (err) {
            alert('Gagal mengubah status aktif produk');
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus produk ini secara permanen?')) return;
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/products/${productId}/?manage=true`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            alert('Produk berhasil dihapus');
            fetchProducts();
        } catch (err) {
            alert('Gagal menghapus produk');
        }
    };

    // Open Edit Modal
    const handleOpenEditModal = (product) => {
        setEditingProduct(product);
        setTitle(product.title || '');
        setDescription(product.description || '');
        setUnit(product.unit || 'pcs');
        setCategory(product.category || 'lainnya');
        setPurchasePrice(product.purchase_price || 0);
        setSellingPrice(product.price || 0);
        setStock(product.stock || 0);
        setWeight(product.weight || 1000);
        setIsCodAvailable(product.is_cod_available || false);
        setSelectedCouriers(product.supported_couriers ? product.supported_couriers.split(',') : ['jne', 'pos', 'tiki', 'jnt']);
        setVariants(product.variations && product.variations.length > 0 ? product.variations : [{ name: '', additional_price: 0, stock: 0 }]);
        setThumbnailPreview(getMediaUrl(product.thumbnail || product.thumbnail_url));
        setThumbnailFile(null);
        setIsEditModalOpen(true);
    };

    const addVariant = () => {
        setVariants([...variants, { name: '', additional_price: 0, stock: 0 }]);
    };

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const handleSaveEditedProduct = async (e) => {
        e.preventDefault();
        if (savingProduct) return;
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access || !editingProduct) return;

        try {
            setSavingProduct(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('unit', unit || 'pcs');
            formData.append('category', category);
            formData.append('purchase_price', parseCurrency(purchasePrice));
            formData.append('price', parseCurrency(sellingPrice));
            formData.append('stock', stock);
            formData.append('weight', weight);
            formData.append('is_cod_available', isCodAvailable);
            formData.append('supported_couriers', selectedCouriers.length > 0 ? selectedCouriers.join(',') : 'bebas');

            if (thumbnailFile) {
                formData.append('thumbnail', thumbnailFile);
            }

            const sanitizedVariants = variants.map(v => ({
                ...v,
                additional_price: parseCurrency(v.additional_price)
            }));
            formData.append('variations', JSON.stringify(sanitizedVariants));

            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/products/${editingProduct.id}/?manage=true`, formData, {
                headers: { 'Authorization': `Bearer ${user.access}` }
            });

            alert('Produk berhasil diperbarui!');
            setIsEditModalOpen(false);
            fetchProducts();
        } catch (error) {
            console.error('Error saving edited product by admin:', error);
            const errMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Gagal memperbarui produk';
            alert(`Gagal memperbarui produk: ${errMsg}`);
        } finally {
            setSavingProduct(false);
        }
    };

    const filteredProducts = products.filter(p => filterStatus === 'all' || p.status === filterStatus);

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Admin Manajemen E-commerce - Barakah Economy</title></Helmet>
            <Header />
            <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk E-commerce</h1>
                        <p className="text-sm text-gray-500">Kelola persetujuan, edit detail/variasi, aktivasi, dan penghapusan produk seller</p>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
                    {['pending', 'approved', 'rejected', 'all'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                filterStatus === s 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {s === 'all' ? 'Semua Status' : s === 'pending' ? 'Menunggu Persetujuan' : s === 'approved' ? 'Disetujui' : 'Ditolak'}
                            {s !== 'all' && (
                                <span className="ml-2 bg-black/10 px-2 py-0.5 rounded-full">
                                    {products.filter(p => p.status === s).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                        <span className="material-icons text-4xl text-gray-300">verified</span>
                        <p className="mt-2 text-sm text-gray-500">Tidak ada produk fisik dengan status ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredProducts.map(p => (
                            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                <img src={getMediaUrl(p.thumbnail || p.thumbnail_url) || '/placeholder-image.jpg'} alt={p.title} className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-xl bg-gray-50 border border-gray-100" />
                                <div className="flex-1 text-center sm:text-left">
                                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                                        <h3 className="font-bold text-gray-800 text-sm sm:text-base">{p.title}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                            {p.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Oleh: <span className="font-bold text-emerald-700">{p.seller_name || 'Admin'}</span> • 
                                        Stok: {p.stock} {p.unit || 'pcs'} • Berat: {p.weight}g
                                    </p>
                                    <div className="flex justify-center sm:justify-start gap-3 mt-2">
                                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">Beli: Rp {formatCurrency(p.purchase_price)}</span>
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Jual: Rp {formatCurrency(p.price)} / {p.unit || 'pcs'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap justify-center">
                                    {p.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleUpdateStatus(p.id, 'rejected')} className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition">Ditolak</button>
                                            <button onClick={() => handleUpdateStatus(p.id, 'approved')} className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition">Setujui</button>
                                        </>
                                    )}
                                    {p.status === 'approved' && (
                                        <button onClick={() => handleUpdateStatus(p.id, 'rejected')} className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition">Batalkan</button>
                                    )}
                                    {p.status === 'rejected' && (
                                        <button onClick={() => handleUpdateStatus(p.id, 'approved')} className="px-3 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition">Setujui</button>
                                    )}

                                    <button 
                                        onClick={() => { setSelectedTestiProduct(p); setIsTestiModalOpen(true); }} 
                                        className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition border border-amber-200 flex items-center gap-1"
                                        title="Input Testimoni / Ulasan Produk"
                                    >
                                        <span className="material-icons text-sm">rate_review</span>
                                        <span>+ Testimoni</span>
                                    </button>

                                    <button 
                                        onClick={() => { setSelectedPromoProduct(p); setIsPromoModalOpen(true); }} 
                                        className="px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition border border-purple-200 flex items-center gap-1"
                                        title="Atur Promo & Diskon Produk"
                                    >
                                        <span className="material-icons text-sm">campaign</span>
                                        <span>Atur Promo</span>
                                    </button>

                                    <button 
                                        onClick={() => handleToggleActive(p.id, p.is_active)} 
                                        className={`px-3 py-2 text-xs font-bold rounded-xl transition border ${p.is_active ? 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'}`}
                                        title={p.is_active ? 'Sembunyikan dari katalog' : 'Tampilkan di katalog'}
                                    >
                                        {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>

                                    <button 
                                        onClick={() => handleOpenEditModal(p)} 
                                        className="w-9 h-9 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-xl transition border border-blue-100"
                                        title="Edit Produk & Variasi"
                                    >
                                        <span className="material-icons text-sm">edit</span>
                                    </button>

                                    <button 
                                        onClick={() => handleDeleteProduct(p.id)} 
                                        className="w-9 h-9 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition border border-red-100"
                                        title="Hapus Produk Permanen"
                                    >
                                        <span className="material-icons text-sm">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Edit Product Modal for Admin */}
                {isEditModalOpen && editingProduct && (
                    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons text-emerald-600">edit</span>
                                    <h3 className="font-bold text-gray-800 text-lg">Edit Produk Admin</h3>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <span className="material-icons">close</span>
                                </button>
                            </div>

                            {/* Modal Content Form */}
                            <form onSubmit={handleSaveEditedProduct} className="p-6 overflow-y-auto space-y-5 flex-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Judul Produk *</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={(e) => setTitle(e.target.value)} 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none" 
                                        required 
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Harga Beli (Rp) *</label>
                                        <input 
                                            type="text" 
                                            value={formatCurrency(purchasePrice)} 
                                            onChange={(e) => setPurchasePrice(parseCurrency(e.target.value))} 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none" 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Harga Jual (Rp) *</label>
                                        <input 
                                            type="text" 
                                            value={formatCurrency(sellingPrice)} 
                                            onChange={(e) => setSellingPrice(parseCurrency(e.target.value))} 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Stok *</label>
                                        <input 
                                            type="number" 
                                            value={stock} 
                                            onChange={(e) => setStock(e.target.value)} 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none" 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Satuan (Unit)</label>
                                        <select 
                                            value={unit} 
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="pcs">pcs / buah (Default)</option>
                                            <option value="buku">buku / eksemplar</option>
                                            <option value="eksemplar">eksemplar</option>
                                            <option value="lembar">lembar</option>
                                            <option value="jilid">jilid</option>
                                            <option value="kg">kg (Kilogram)</option>
                                            <option value="gram">gram (g)</option>
                                            <option value="ons">ons</option>
                                            <option value="liter">liter (L)</option>
                                            <option value="ml">mililiter (ml)</option>
                                            <option value="pack">pack / bungkus</option>
                                            <option value="box">box / kotak</option>
                                            <option value="dus">dus / karton</option>
                                            <option value="botol">botol</option>
                                            <option value="sachet">sachet</option>
                                            <option value="kaleng">kaleng</option>
                                            <option value="pasang">pasang</option>
                                            <option value="set">set</option>
                                            <option value="unit">unit</option>
                                            <option value="porsi">porsi</option>
                                            <option value="lusin">lusin (12 pcs)</option>
                                            <option value="kodi">kodi (20 pcs)</option>
                                            <option value="meter">meter (m)</option>
                                            <option value="paket">paket</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Berat (Gram) *</label>
                                        <input 
                                            type="number" 
                                            value={weight} 
                                            onChange={(e) => setWeight(e.target.value)} 
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none" 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori *</label>
                                        <select 
                                            value={category} 
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="buku">Buku Islami</option>
                                            <option value="fashion">Fashion & Pakaian</option>
                                            <option value="makanan">Makanan & Minuman</option>
                                            <option value="herbal">Herbal</option>
                                            <option value="sembako">Sembako</option>
                                            <option value="elektronik">Elektronik</option>
                                            <option value="kesehatan">Kesehatan & Kecantikan</option>
                                            <option value="kerajinan">Kerajinan & Accessories</option>
                                            <option value="lainnya">Lainnya</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        <span>Deskripsi Produk</span>
                                        <span className="text-[10px] text-emerald-600 font-normal">Rich Text Editor</span>
                                    </label>
                                    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                        <CKEditorComponent 
                                            content={description}
                                            onChange={(data) => setDescription(data)}
                                            placeholder="Tuliskan deskripsi lengkap produk..."
                                        />
                                    </div>
                                </div>

                                {/* Variations Section */}
                                <div className="border-t border-gray-100 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Variasi Produk (Ukuran/Warna/Model)</label>
                                        <button type="button" onClick={addVariant} className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1">
                                            <span className="material-icons text-sm">add_circle</span> Tambah Varian
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {variants.map((v, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <input 
                                                    type="text" 
                                                    placeholder="Nama (misal: XL)" 
                                                    value={v.name} 
                                                    onChange={(e) => updateVariant(i, 'name', e.target.value)} 
                                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none" 
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Harga Varian (Rp)" 
                                                    value={formatCurrency(v.additional_price)} 
                                                    onChange={(e) => updateVariant(i, 'additional_price', e.target.value)} 
                                                    className="w-32 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none" 
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder="Stok" 
                                                    value={v.stock} 
                                                    onChange={(e) => updateVariant(i, 'stock', e.target.value)} 
                                                    className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none" 
                                                />
                                                <button type="button" onClick={() => removeVariant(i)} className="text-red-500 hover:text-red-700 p-1">
                                                    <span className="material-icons text-sm">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Thumbnail Upload */}
                                <div className="border-t border-gray-100 pt-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Foto / Thumbnail Produk</label>
                                    <div className="flex items-center gap-4">
                                        {thumbnailPreview && (
                                            <img src={thumbnailPreview} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-gray-200 shrink-0" />
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    setThumbnailFile(file);
                                                    setThumbnailPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Modal Footer Submit */}
                                <div className="pt-4 border-t border-gray-100 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditModalOpen(false)} 
                                        className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={savingProduct}
                                        className={`flex-[2] py-3 text-sm font-bold text-white rounded-xl transition-all ${savingProduct ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-lg shadow-emerald-200 hover:scale-[1.01]'}`}
                                    >
                                        {savingProduct ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                                <span>Memperbarui Produk...</span>
                                            </span>
                                        ) : (
                                            <span>Simpan Perubahan</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Admin Testimony Input Modal */}
                {isTestiModalOpen && selectedTestiProduct && (
                    <AdminTestimonyModal
                        isOpen={isTestiModalOpen}
                        onClose={() => { setIsTestiModalOpen(false); setSelectedTestiProduct(null); }}
                        product={selectedTestiProduct}
                        onSuccess={fetchProducts}
                    />
                )}

                {/* Product Promo & Discount Modal */}
                {isPromoModalOpen && selectedPromoProduct && (
                    <ProductPromoModal
                        isOpen={isPromoModalOpen}
                        onClose={() => { setIsPromoModalOpen(false); setSelectedPromoProduct(null); }}
                        product={selectedPromoProduct}
                        onSuccess={fetchProducts}
                    />
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardSinergyAdminPage;
