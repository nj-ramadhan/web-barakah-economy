import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';
import CurrencyInput from '../components/common/CurrencyInput';
import { formatCurrency, parseCurrency } from '../utils/formatters';

const DashboardSinergySellersPage = () => {
    const [products, setProducts] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add' | 'edit' | 'voucher'
    const [editingProduct, setEditingProduct] = useState(null);
    const [variants, setVariants] = useState([{name: '', additional_price: 0, stock: 0}]);
    const [selectedCouriers, setSelectedCouriers] = useState(['jne', 'pos', 'tiki', 'jnt']);
    const [isCodAvailable, setIsCodAvailable] = useState(false);
    const [manualStock, setManualStock] = useState(0);
    const [manualPrice, setManualPrice] = useState(0);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [galleryPreviews, setGalleryPreviews] = useState([]);


    const fetchDashboardData = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        try {
            const productRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/?manage=true`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setProducts(productRes.data);


            const voucherRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/vouchers/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setVouchers(voucherRes.data);
        } catch (error) {
            console.error("Failed fetching E-commerce dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const user = JSON.parse(localStorage.getItem('user'));
        // If not admin and no products found after loading, redirect
        if (!loading && products.length === 0 && user?.role !== 'admin' && !user?.is_staff) {
            // Optional: redirect to dashboard
            // navigate('/dashboard'); 
        }
    }, [loading, products.length]);

    const handleEdit = (product) => {
        setEditingProduct(product);
        setVariants(product.variations && product.variations.length > 0 ? product.variations : [{name: '', additional_price: 0, stock: 0}]);
        setSelectedCouriers(product.supported_couriers ? product.supported_couriers.split(',') : ['jne', 'pos', 'tiki', 'jnt']);
        setIsCodAvailable(product.is_cod_available || false);
        setManualStock(product.stock || 0);
        setManualPrice(product.price || 0);
        setActiveTab('edit');
    };


    const addVariant = () => {
        setVariants([...variants, {name: '', additional_price: 0, stock: 0}]);
    };

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const handleThumbnailChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 5) {
            alert('Maksimal 5 foto galeri');
            return;
        }
        setGalleryFiles(files);
        setGalleryPreviews(files.map(file => URL.createObjectURL(file)));
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) return;

        try {
            const formData = new FormData();
            formData.append('title', e.target.title.value);
            formData.append('purchase_price', parseCurrency(e.target.purchase_price.value));
            formData.append('price', parseCurrency(e.target.price.value));
            formData.append('stock', e.target.stock.value);
            formData.append('weight', e.target.weight.value);
            formData.append('category', e.target.category.value);
            formData.append('supported_couriers', selectedCouriers.join(','));
            formData.append('is_cod_available', isCodAvailable);
            formData.append('purchase_instructions', e.target.purchase_instructions.value);
            
            if (thumbnailFile) {
                formData.append('thumbnail', thumbnailFile);
            }

            galleryFiles.forEach(file => {
                formData.append('gallery_images', file);
            });
            
            const sanitizedVariants = variants.map(v => ({
                ...v,
                additional_price: parseCurrency(v.additional_price)
            }));
            formData.append('variations', JSON.stringify(sanitizedVariants));


            if (editingProduct) {
                await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/products/${editingProduct.id}/?manage=true`, formData, {
                    headers: { 'Authorization': `Bearer ${user.access}` }
                });
                alert('Produk berhasil diubah');
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/products/`, formData, {
                    headers: { 'Authorization': `Bearer ${user.access}` }
                });
                alert('Produk berhasil ditambahkan');
            }
            fetchDashboardData();
            setActiveTab('list');
            setThumbnailFile(null);
            setThumbnailPreview(null);
            setGalleryFiles([]);
            setGalleryPreviews([]);
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan produk');
        }
    };

    const handleSaveVoucher = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/products/vouchers/`, {
                code: e.target.code.value,
                nominal: parseCurrency(e.target.nominal.value),
                quantity: e.target.quantity.value,
                is_active: true
            }, { headers: { Authorization: `Bearer ${user.access}` } });
            alert('Voucher berhasil ditambahkan');
            e.target.reset();
            fetchDashboardData();
        } catch(error) {
            alert('Gagal membuat voucher. Pastikan kode unik.');
        }
    };

    const handleDeleteVoucher = async (id) => {
        const user = JSON.parse(localStorage.getItem('user'));
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/products/vouchers/${id}/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            fetchDashboardData();
        } catch(error) {
            alert('Gagal menghapus voucher');
        }
    };

    const renderList = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Produk Saya</h2>
                <div className="flex gap-2">
                    <Link to="/dashboard/sinergy/seller/orders" className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        <span className="material-icons text-sm">shopping_basket</span> Pesanan Masuk
                    </Link>
                    <button onClick={() => setActiveTab('voucher')} className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        <span className="material-icons text-sm">local_activity</span> Buat Voucher
                    </button>
                    <button onClick={() => { 
                        setActiveTab('add'); 
                        setEditingProduct(null); 
                        setVariants([{name: '', additional_price: 0, stock: 0}]); 
                        setThumbnailFile(null);
                        setThumbnailPreview(null);
                        setGalleryFiles([]);
                        setGalleryPreviews([]);
                    }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all shadow-emerald-200">
                        <span className="material-icons text-sm">add</span> Tambah Produk
                    </button>
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                    <span className="material-icons text-4xl text-gray-300">inventory_2</span>
                    <p className="mt-2 text-sm text-gray-500">Anda belum memiliki produk fisik E-commerce.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(p => (
                        <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden group">
                            {p.status === 'pending' && <span className="absolute top-2 right-2 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full border border-orange-200">Menunggu Persetujuan</span>}
                            {p.status === 'approved' && <span className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200">Disetujui</span>}
                            {p.status === 'rejected' && <span className="absolute top-2 right-2 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">Ditolak</span>}
                            
                            <img src={p.thumbnail || p.thumbnail_url} alt={p.title} className="w-full h-32 object-cover rounded-xl bg-gray-50" />
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 line-clamp-1">{p.title}</h3>
                                <p className="text-xs text-gray-500">
                                    Harga: <span className="font-semibold text-emerald-700">
                                        {p.min_price && p.max_price && p.min_price !== p.max_price 
                                            ? `Rp ${formatCurrency(p.min_price)} ~ Rp ${formatCurrency(p.max_price)}`
                                            : `Rp ${formatCurrency(p.price)}`
                                        }
                                    </span>
                                </p>
                                <p className="text-xs text-gray-400">Total Stok: <span className="font-bold">{p.total_stock || p.stock}</span></p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                    {(p.description || '').replace(/<[^>]*>/g, '')}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    setEditingProduct(p);
                                    if (p.variations && p.variations.length > 0) {
                                        setVariants(p.variations);
                                    } else {
                                        setVariants([{name: '', additional_price: 0, stock: 0}]);
                                    }
                                    setSelectedCouriers(p.supported_couriers ? p.supported_couriers.split(',') : ['jne', 'pos', 'tiki', 'jnt']);
                                    setIsCodAvailable(p.is_cod_available || false);
                                    setManualStock(p.stock || 0);
                                    setManualPrice(p.price || 0);
                                    setThumbnailFile(null);
                                    setThumbnailPreview(p.thumbnail || p.thumbnail_url);
                                    setGalleryFiles([]);
                                    setGalleryPreviews(p.images ? p.images.map(img => img.image) : []);
                                    setActiveTab('edit');
                                }} className="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition">Edit & Variasi</button>

                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderVouchers = () => (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 animate-slide-up">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <button type="button" onClick={() => setActiveTab('list')} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition"><span className="material-icons">arrow_back</span></button>
                <h2 className="text-xl font-bold text-gray-800">Manajemen Kupon / Voucher</h2>
            </div>

            <form className="bg-orange-50 p-4 rounded-2xl mb-8 border border-orange-100 space-y-4" onSubmit={handleSaveVoucher}>
                <h3 className="font-bold text-orange-800 text-sm">Buat Voucher Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">KODE (Huruf/Angka)</label>
                        <input type="text" name="code" required placeholder="Cth: BAE2025" className="w-full px-3 py-2 text-sm border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Nominal Diskon (Rp)</label>
                        <CurrencyInput name="nominal" required placeholder="10000" className="!px-3 !py-2 !rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Batas Kuota Pemakaian</label>
                        <input type="number" name="quantity" required placeholder="50" className="w-full px-3 py-2 text-sm border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                </div>
                <button type="submit" className="bg-orange-600 text-white font-bold text-xs px-6 py-2 rounded-full hover:bg-orange-700 transition">Buat Voucher</button>
            </form>

            <div>
                <h3 className="font-bold text-gray-800 text-sm mb-4">Voucher Aktif Anda</h3>
                {vouchers.length === 0 ? (
                    <p className="text-xs text-gray-400">Belum ada voucher yang dibuat.</p>
                ) : (
                    <div className="space-y-3">
                        {vouchers.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <h4 className="font-bold text-emerald-700 text-lg uppercase">{v.code}</h4>
                                    <p className="text-xs text-gray-500">Potongan Rp {formatCurrency(v.nominal)} • Sisa Kuota: {v.quantity}</p>
                                </div>
                                <button onClick={() => handleDeleteVoucher(v.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100">
                                    <span className="material-icons text-[18px]">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 animate-slide-up">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <button type="button" onClick={() => setActiveTab('list')} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition"><span className="material-icons">arrow_back</span></button>
                <h2 className="text-xl font-bold text-gray-800">{activeTab === 'edit' ? 'Edit Produk E-commerce' : 'Tambah Produk E-commerce Baru'}</h2>
            </div>
            
            <form className="space-y-6" onSubmit={handleSaveProduct}>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
                    <input type="text" name="title" defaultValue={editingProduct?.title || ''} placeholder="Contoh: Madu Hutan Asli 500ml" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli Dasar (Rp)</label>
                        <CurrencyInput name="purchase_price" defaultValue={editingProduct?.purchase_price || ''} placeholder="0" className="!px-4 !py-3 !bg-gray-50 !border-gray-200 !rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Jual (Rp) {variants.length > 0 && variants[0].name && <span className="text-[10px] text-emerald-600">(Auto dari Variasi)</span>}</label>
                        <CurrencyInput 
                            name="price" 
                            value={variants.length > 0 && variants[0].name ? Math.min(...variants.map(v => v.additional_price || 0)) : manualPrice} 
                            onChange={(e) => setManualPrice(e.target.value)}
                            required 
                            placeholder="0" 
                            className={`!px-4 !py-3 !bg-gray-50 !border-gray-200 !rounded-xl ${variants.length > 0 && variants[0].name ? 'opacity-70' : ''}`}
                            readOnly={variants.length > 0 && variants[0].name}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Stok Gudang {variants.length > 0 && variants[0].name && <span className="text-[10px] text-emerald-600">(Auto)</span>}</label>
                        <input 
                            type="number" 
                            name="stock" 
                            value={variants.length > 0 && variants[0].name ? variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0) : manualStock} 
                            onChange={(e) => setManualStock(e.target.value)}
                            required 
                            placeholder="0" 
                            className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition ${variants.length > 0 && variants[0].name ? 'opacity-70' : ''}`} 
                            readOnly={variants.length > 0 && variants[0].name}
                        />
                    </div>
                    <div>
                         <label className="block text-sm font-semibold text-gray-700 mb-1">Berat (gram)</label>
                        <input type="number" name="weight" defaultValue={editingProduct?.weight || ''} required placeholder="1000" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori</label>
                        <input type="text" name="category" list="categories" required placeholder="Pilih atau Ketik Kategori Baru" defaultValue={editingProduct?.category || ''} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                        <datalist id="categories">
                            <option value="Sembako" />
                            <option value="Herbal" />
                            <option value="Pakaian" />
                            <option value="Elektronik" />
                            <option value="Buku Islami" />
                            <option value="Aksesoris" />
                        </datalist>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Informasi Pengambilan / Teknis (Opsional)</label>
                    <textarea 
                        name="purchase_instructions" 
                        defaultValue={editingProduct?.purchase_instructions || ''} 
                        placeholder="Contoh: Pengambilan dilakukan di lokasi kandang, atau teknis pengiriman hewan qurban..." 
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition h-24"
                    ></textarea>
                </div>

                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="block text-sm font-bold text-emerald-800">Layanan Ekspedisi & COD</label>
                            <p className="text-[10px] text-emerald-600">Pilih kurir dan aktifkan fitur Bayar di Tempat (COD)</p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-emerald-200">
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">Aktifkan COD</span>
                            <button
                                type="button"
                                onClick={() => setIsCodAvailable(!isCodAvailable)}
                                className={`w-12 h-6 rounded-full transition-all relative ${isCodAvailable ? 'bg-emerald-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isCodAvailable ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { id: 'jne', name: 'JNE' },
                            { id: 'pos', name: 'POS' },
                            { id: 'tiki', name: 'TIKI' },
                            { id: 'jnt', name: 'J&T' },
                            { id: 'sicepat', name: 'SiCepat' },
                            { id: 'anteraja', name: 'AnterAja' },
                            { id: 'wahana', name: 'Wahana' },
                            { id: 'ninja', name: 'Ninja' },
                        ].map(courier => (
                            <label key={courier.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-emerald-50 transition-colors">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                    checked={selectedCouriers.includes(courier.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedCouriers([...selectedCouriers, courier.id]);
                                        } else {
                                            setSelectedCouriers(selectedCouriers.filter(c => c !== courier.id));
                                        }
                                    }}
                                />
                                <span className="text-xs font-bold text-gray-700">{courier.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Foto Utama (Thumbnail)</label>
                        <div 
                            onClick={() => document.getElementById('thumbnail-input').click()}
                            className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer transition-all relative overflow-hidden h-40 flex flex-col items-center justify-center bg-gray-50/50"
                        >
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <>
                                    <span className="material-icons text-gray-400 text-3xl mb-2">add_a_photo</span>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Foto Utama</p>
                                </>
                            )}
                            <input id="thumbnail-input" type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Galeri Foto (Carousel)</label>
                        <div 
                            onClick={() => document.getElementById('gallery-input').click()}
                            className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer transition-all h-40 flex flex-col items-center justify-center bg-gray-50/50"
                        >
                            <span className="material-icons text-gray-400 text-3xl mb-2">collections</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilih Hingga 5 Foto</p>
                            <input id="gallery-input" type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryChange} />
                        </div>
                        {galleryPreviews.length > 0 && (
                            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                                {galleryPreviews.map((src, idx) => (
                                    <img key={idx} src={src} alt={`Preview ${idx}`} className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-gray-800 text-sm">Varian Produk</h4>
                        <button type="button" onClick={addVariant} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold hover:bg-emerald-200">+ Varian</button>
                    </div>
                    
                    <div className="space-y-3">
                        {variants.map((v, i) => (
                            <div key={i} className="flex gap-2">
                                <input type="text" placeholder="Nama Varian (Cth: XL / Merah)" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} className="flex-[2] px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                                <div className="flex-1 relative">
                                    <CurrencyInput 
                                        value={v.additional_price || ''} 
                                        onChange={(e) => updateVariant(i, 'additional_price', e.target.value)} 
                                        placeholder="Harga" 
                                        className="!px-2 !py-2 !rounded-lg !border-gray-200 !text-emerald-700" 
                                        title="Harga Total untuk varian ini" 
                                    />
                                </div>
                                <div className="w-20 relative">
                                    <input type="number" placeholder="Stok" value={v.stock || ''} onChange={(e) => updateVariant(i, 'stock', e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                {variants.length > 1 && (
                                    <button type="button" onClick={() => removeVariant(i)} className="w-10 flex items-center justify-center text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"><span className="material-icons text-sm">delete</span></button>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-3 pt-2 border-t border-emerald-200/50">Harga varian adalah <b>Harga Total</b> yang akan dibayar pembeli (menggantikan harga produk utama).</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-3">
                    <button type="button" onClick={() => setActiveTab('list')} className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
                    <button type="submit" className="flex-[2] py-4 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.01] rounded-xl transition-all">Simpan & Ajukan Persetujuan</button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="body bg-gray-100 min-h-screen">
            <Helmet><title>Pembuatan E-commerce - Barakah Economy</title></Helmet>
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
                {activeTab === 'list' ? renderList() : activeTab === 'voucher' ? renderVouchers() : renderForm()}
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardSinergySellersPage;
