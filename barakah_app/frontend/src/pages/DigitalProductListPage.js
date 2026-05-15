// pages/DigitalProductListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';
import { formatCurrency } from '../utils/formatters';
import { getDigitalProducts, getPopularSellers } from '../services/digitalProductApi';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp ' + formatCurrency(amount);
};

const DigitalProductListPage = () => {
    const [products, setProducts] = useState([]);
    const [popularSellers, setPopularSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categories, setCategories] = useState(['Semua']);
    const [selectedCategory, setSelectedCategory] = useState('Semua');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, sellersRes] = await Promise.all([
                    getDigitalProducts(),
                    getPopularSellers()
                ]);
                const data = productsRes.data || [];
                setProducts(data);
                setFilteredProducts(data);
                setPopularSellers(sellersRes.data || []);
                
                // Extract unique categories
                const cats = ['Semua', ...new Set(data.map(p => p.category).filter(Boolean))];
                setCategories(cats);
            } catch (err) {
                console.error('Error fetching digital products or sellers:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        let result = products;
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(product => 
                product.title.toLowerCase().includes(query) ||
                (product.category && product.category.toLowerCase().includes(query)) ||
                (product.seller_name && product.seller_name.toLowerCase().includes(query))
            );
        }
        
        if (selectedCategory !== 'Semua') {
            result = result.filter(product => product.category === selectedCategory);
        }
        
        setFilteredProducts(result);
    }, [searchQuery, selectedCategory, products]);

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    return (
        <div className="body">
            <Helmet>
                <title>Produk Digital - Barakah Economy</title>
                <meta name="description" content="Produk digital berkualitas di Barakah Economy" />
            </Helmet>

            <HeaderHome onSearch={handleSearch} />

            <div className="px-4 py-8 pb-20 max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
                    Produk Digital
                </h1>
                
                {/* Category Filter Chips */}
                {categories.length > 1 && (
                    <div className="mb-8 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-2 pb-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`whitespace-nowrap px-5 py-2 rounded-xl text-[10px] font-black transition-all duration-300 border ${
                                        selectedCategory === cat
                                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-100 scale-105'
                                            : 'bg-white text-gray-600 border-gray-100 hover:border-green-200 hover:bg-green-50/50'
                                    } uppercase tracking-widest`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <span className="material-icons text-5xl mb-2">search_off</span>
                        <p>{searchQuery ? `Tidak ada hasil untuk "${searchQuery}"` : 'Belum ada produk digital'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {filteredProducts.map((product) => (
                            <Link key={product.id} to={`/digital_produk/${product.seller_name}/${product.slug}`} className="block">
                                <div className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition">
                                    <img
                                        src={getMediaUrl(product.thumbnail_url || product.thumbnail) || '/placeholder-image.jpg'}
                                        alt={product.title}
                                        className="w-full h-28 object-cover"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{product.title}</h3>
                                        <span className="inline-block text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-1">{product.category}</span>
                                        <p className="text-green-700 font-bold text-sm">{formatIDR(product.price)}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-gray-400 text-[10px] flex items-center gap-1">
                                                <span className="material-icons text-[10px]">person</span>
                                                @{product.seller_name}
                                            </p>
                                            <p className="text-gray-400 text-[10px] flex items-center gap-1">
                                                <span className="material-icons text-[10px]">visibility</span>
                                                {product.view_count || 0}
                                            </p>
                                            <p className="text-gray-400 text-[10px] flex items-center gap-1">
                                                <span className="material-icons text-[10px] text-red-400">favorite</span>
                                                {product.likes_count || 0}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Seller Profiles Section */}
                {!loading && popularSellers.length > 0 && (
                    <div className="mt-12 bg-white rounded-3xl p-6 shadow-sm border border-gray-50">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-800">Penjual Populer</h2>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {popularSellers.map(seller => (
                                <Link
                                    key={seller.username}
                                    to={`/digital-produk/${seller.username}`}
                                    className="flex flex-col items-center gap-2 min-w-[80px]"
                                >
                                    <div className="w-16 h-16 rounded-full border-2 border-green-100 p-0.5">
                                        <div className="w-full h-full rounded-full bg-gray-50 overflow-hidden flex items-center justify-center">
                                            {seller.picture || seller.shop_thumbnail ? (
                                                <img
                                                    src={getMediaUrl(seller.picture || seller.shop_thumbnail)}
                                                    alt={seller.username}
                                                    className="w-full h-full object-cover rounded-full"
                                                    onError={(e) => { e.target.src = '/images/pas_foto_standard.png'; }}
                                                />
                                            ) : (
                                                <span className="text-green-600 font-bold">
                                                    {seller.username.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-700 text-center truncate w-full">@{seller.username}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default DigitalProductListPage;
