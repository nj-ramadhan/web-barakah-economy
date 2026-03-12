import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAdminAllProducts, deleteAdminProduct } from '../../services/digitalProductApi';

const AdminAllProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await getAdminAllProducts();
            setProducts(res.data);
        } catch (err) {
            console.error('Failed to fetch all products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.')) {
            try {
                await deleteAdminProduct(id);
                setProducts(products.filter(p => p.id !== id));
                alert('Produk berhasil dihapus.');
            } catch (err) {
                alert('Gagal menghapus produk.');
            }
        }
    };

    const filteredProducts = products.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.seller_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20 pt-16">
            <Header />
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Semua Produk Digital</h1>
                        <p className="text-xs text-gray-500">Kelola semua produk yang diunggah oleh user.</p>
                    </div>
                    <div className="relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Cari produk atau penjual..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-emerald-500 w-full md:w-64 shadow-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                        <p className="text-gray-500">Tidak ada produk ditemukan.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <span className="material-icons">image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{product.name}</h3>
                                    <p className="text-[10px] text-emerald-600 font-bold mb-1">Rp {product.price.toLocaleString()}</p>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center">
                                            <span className="material-icons text-[10px] text-gray-400">person</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 truncate">Penjual: <span className="font-bold">{product.seller_name}</span></span>
                                    </div>
                                    <div className="mt-auto flex gap-2">
                                        <button
                                            onClick={() => window.open(`/digital-products/${product.slug}`, '_blank')}
                                            className="flex-1 bg-gray-50 text-gray-600 py-1.5 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition"
                                        >
                                            Lihat detail
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="px-3 bg-red-50 text-red-600 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-100 transition"
                                        >
                                            Hapus
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

export default AdminAllProductsPage;
