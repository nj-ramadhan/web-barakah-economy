import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';

const DashboardSinergySellersPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add' | 'edit'
    const [editingProduct, setEditingProduct] = useState(null);
    const [variants, setVariants] = useState([{name: '', additional_price: 0, stock: 0}]);

    const fetchProducts = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setProducts(res.data);
        } catch (error) {
            console.error("Failed fetching Sinergy products", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleEdit = (product) => {
        setEditingProduct(product);
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

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) return;

        try {
            const formData = new FormData();
            formData.append('title', e.target.title.value);
            formData.append('purchase_price', e.target.purchase_price.value);
            formData.append('price', e.target.price.value);
            formData.append('stock', e.target.stock.value);
            formData.append('weight', e.target.weight.value);
            formData.append('category', e.target.category.value);
            formData.append('variations', JSON.stringify(variants));

            if (editingProduct) {
                await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/products/${editingProduct.id}/`, formData, {
                    headers: { 'Authorization': `Bearer ${user.access}` }
                });
                alert('Produk berhasil diubah');
            } else {
                await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/products/`, formData, {
                    headers: { 'Authorization': `Bearer ${user.access}` }
                });
                alert('Produk berhasil ditambahkan');
            }
            fetchProducts();
            setActiveTab('list');
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan produk');
        }
    };

    const renderList = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Produk Saya</h2>
                <div className="flex gap-2">
                    <button className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        <span className="material-icons text-sm">local_activity</span> Buat Voucher
                    </button>
                    <button onClick={() => { setActiveTab('add'); setEditingProduct(null); setVariants([{name: '', additional_price: 0, stock: 0}]); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all shadow-emerald-200">
                        <span className="material-icons text-sm">add</span> Tambah Produk
                    </button>
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                    <span className="material-icons text-4xl text-gray-300">inventory_2</span>
                    <p className="mt-2 text-sm text-gray-500">Anda belum memiliki produk fisik Sinergy.</p>
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
                                <p className="text-xs text-gray-500">Harga: <span className="font-semibold text-emerald-700">Rp {p.price}</span></p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{p.description}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => {
                                    setEditingProduct(p);
                                    if (p.variations && p.variations.length > 0) {
                                        setVariants(p.variations);
                                    } else {
                                        setVariants([{name: '', additional_price: 0, stock: 0}]);
                                    }
                                    setActiveTab('edit');
                                }} className="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition">Edit & Variasi</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderForm = () => (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 animate-slide-up">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <button type="button" onClick={() => setActiveTab('list')} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition"><span className="material-icons">arrow_back</span></button>
                <h2 className="text-xl font-bold text-gray-800">{activeTab === 'edit' ? 'Edit Produk Sinergy' : 'Tambah Produk Sinergy Baru'}</h2>
            </div>
            
            <form className="space-y-6" onSubmit={handleSaveProduct}>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
                    <input type="text" name="title" defaultValue={editingProduct?.title || ''} placeholder="Contoh: Madu Hutan Asli 500ml" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli Dasar (Rp)</label>
                        <input type="number" name="purchase_price" defaultValue={editingProduct?.purchase_price || ''} placeholder="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Jual (Rp)</label>
                        <input type="number" name="price" defaultValue={editingProduct?.price || ''} required placeholder="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Stok Gudang</label>
                        <input type="number" name="stock" defaultValue={editingProduct?.stock || ''} required placeholder="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Foto Multi / Carousel</label>
                    <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer transition">
                        <span className="material-icons text-gray-400 text-3xl">add_photo_alternate</span>
                        <p className="text-sm font-medium text-gray-500 mt-2">Pilih beberapa foto (Max 5)</p>
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
                                <input type="text" placeholder="Nama Varian (mis: Hitam XL)" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} className="flex-[2] px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                                <input type="number" placeholder="Tambahan Harga (Rp)" value={v.additional_price || ''} onChange={(e) => updateVariant(i, 'additional_price', e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                                <input type="number" placeholder="Stok" value={v.stock || ''} onChange={(e) => updateVariant(i, 'stock', e.target.value)} className="w-20 px-2 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                                {variants.length > 1 && (
                                    <button type="button" onClick={() => removeVariant(i)} className="w-10 flex items-center justify-center text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><span className="material-icons text-sm">close</span></button>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-3 pt-2 border-t border-emerald-200/50">SKU Otomatis akan di buat setiap kali ada penambahan variasi.</p>
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
            <Helmet><title>Pembuatan Sinergy - Barakah Economy</title></Helmet>
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
                {activeTab === 'list' ? renderList() : renderForm()}
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardSinergySellersPage;
