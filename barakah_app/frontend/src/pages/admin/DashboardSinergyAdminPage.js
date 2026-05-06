import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const DashboardSinergyAdminPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'

    const fetchProducts = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') return;
        try {
            // Note: with our ModelViewSet, Admin receives ALL products if ?manage=true is set.
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/?manage=true`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setProducts(res.data);
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
                { status }, 
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            fetchProducts();
        } catch (err) {
            alert('Gagal mengubah status produk');
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
                        <p className="text-sm text-gray-500">Persetujuan produk fisik dari seluruh seller</p>
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
                                <img src={p.thumbnail || p.thumbnail_url} alt={p.title} className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-xl bg-gray-50 border border-gray-100" />
                                <div className="flex-1 text-center sm:text-left">
                                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">{p.title}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Oleh: <span className="font-bold text-emerald-700">{p.seller_name || 'Admin'}</span> • 
                                        Stok: {p.stock} • Berat: {p.weight}g
                                    </p>
                                    <div className="flex justify-center sm:justify-start gap-3 mt-2">
                                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">Beli: Rp {p.purchase_price}</span>
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Jual: Rp {p.price}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {p.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleUpdateStatus(p.id, 'rejected')} className="w-10 h-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition">
                                                <span className="material-icons text-sm">close</span>
                                            </button>
                                            <button onClick={() => handleUpdateStatus(p.id, 'approved')} className="w-10 h-10 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition">
                                                <span className="material-icons text-sm">check</span>
                                            </button>
                                        </>
                                    )}
                                    {p.status === 'approved' && (
                                        <button onClick={() => handleUpdateStatus(p.id, 'rejected')} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition">Batalkan</button>
                                    )}
                                    {p.status === 'rejected' && (
                                        <button onClick={() => handleUpdateStatus(p.id, 'approved')} className="px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition">Setujui</button>
                                    )}
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

export default DashboardSinergyAdminPage;
