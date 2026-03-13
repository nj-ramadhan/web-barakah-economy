// pages/DigitalProductListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';
import { getDigitalProducts, getPopularSellers } from '../services/digitalProductApi';
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

const DigitalProductListPage = () => {
    const [products, setProducts] = useState([]);
    const [popularSellers, setPopularSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, sellersRes] = await Promise.all([
                    getDigitalProducts(),
                    getPopularSellers()
                ]);
                setProducts(productsRes.data);
                setFilteredProducts(productsRes.data);
                setPopularSellers(sellersRes.data);
            } catch (err) {
                console.error('Error fetching digital products or sellers:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query) {
            setFilteredProducts(products);
        } else {
            const filtered = products.filter(product => 
                product.title.toLowerCase().includes(query.toLowerCase()) ||
                product.category.toLowerCase().includes(query.toLowerCase()) ||
                product.seller_name.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredProducts(filtered);
        }
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
                                        src={getMediaUrl(product.thumbnail) || '/placeholder-image.jpg'}
                                        alt={product.title}
                                        className="w-full h-28 object-cover"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{product.title}</h3>
                                        <span className="inline-block text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-1">{product.category}</span>
                                        <p className="text-green-700 font-bold text-sm">{formatIDR(product.price)}</p>
                                        <p className="text-gray-400 text-[10px] mt-1 flex items-center gap-1">
                                            <span className="material-icons text-[10px]">person</span>
                                            @{product.seller_name}
                                        </p>
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
