import React, { useState, useEffect } from 'react';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';
import { getAdminAllProducts, deleteAdminProduct } from '../../services/digitalProductApi';
import { formatCurrency } from '../../utils/formatters';

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    return `${baseUrl}${url}`;
};

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
        (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.seller_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Produk</th>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Penjual</th>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Harga</th>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Tipe</th>
                                        <th className="p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-emerald-50/30 transition">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                                        {product.thumbnail ? (
                                                            <img src={getMediaUrl(product.thumbnail)} alt={product.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <span className="material-icons text-sm">image</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-xs line-clamp-1">{product.title}</p>
                                                        <p className="text-[10px] text-gray-400">ID: {product.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs font-medium text-gray-700">
                                                {product.seller_name}
                                            </td>
                                            <td className="p-4 text-xs font-black text-emerald-600">
                                                Rp {formatCurrency(product.price)}
                                            </td>
                                            <td className="p-4 text-[10px] font-bold text-gray-400 uppercase">
                                                {product.category_name || 'DIGITAL'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => window.open(`/digital-products/${product.slug}`, '_blank')}
                                                        className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-200 transition"
                                                        title="Lihat"
                                                    >
                                                        <span className="material-icons text-[14px]">visibility</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition"
                                                        title="Hapus"
                                                    >
                                                        <span className="material-icons text-[14px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};

export default AdminAllProductsPage;
