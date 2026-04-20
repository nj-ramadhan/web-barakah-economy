import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';

const DashboardSinergySellersPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'

    const fetchProducts = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            // Assuming the endpoint returns own products + approved products. We should filter our own if needed.
            // But since this is dashboard, it's easier to view own products if API filters correctly.
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

    const renderList = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Produk Saya</h2>
                <button onClick={() => setActiveTab('add')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all shadow-emerald-200">
                    <span className="material-icons text-sm">add</span> Tambah Produk
                </button>
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
                                <button className="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition">Detail & Variasi</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderAddForm = () => (
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 animate-slide-up">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <button onClick={() => setActiveTab('list')} className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition"><span className="material-icons">arrow_back</span></button>
                <h2 className="text-xl font-bold text-gray-800">Tambah Produk Sinergy Baru</h2>
            </div>
            
            <form className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Produk</label>
                    <input type="text" placeholder="Contoh: Madu Hutan Asli 500ml" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Beli Dasar (Rp)</label>
                        <input type="number" placeholder="0" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Harga Jual (Rp)</label>
                        <input type="number" placeholder="0" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Stok Gudang</label>
                        <input type="number" placeholder="0" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                    </div>
                    <div>
                         <label className="block text-sm font-semibold text-gray-700 mb-1">Berat (gram)</label>
                        <input type="number" placeholder="1000" className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Kategori</label>
                        <select className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition">
                            <option>Sembako</option>
                            <option>Herbal</option>
                            <option>Pakaian</option>
                        </select>
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
                        <button type="button" className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold hover:bg-emerald-200">+ Varian</button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">SKU Otomatis akan di buat setiap kali ada penambahan variasi.</p>
                </div>

                <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-gray-800 text-sm">Voucher Khusus Produk/Toko</h4>
                        <button type="button" className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold hover:bg-orange-200">+ Buat Voucher</button>
                    </div>
                    <p className="text-xs text-gray-500">Buat kode diskon unik untuk mendongkrak penjualan produk.</p>
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
                {activeTab === 'list' ? renderList() : renderAddForm()}
            </div>
            <NavigationButton />
        </div>
    );
};

export default DashboardSinergySellersPage;
