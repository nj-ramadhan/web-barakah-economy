// pages/DigitalProductListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getDigitalProducts } from '../services/digitalProductApi';
import '../styles/Body.css';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const DigitalProductListPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await getDigitalProducts();
                setProducts(res.data);
            } catch (err) {
                console.error('Error fetching digital products:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    return (
        <div className="body">
            <Helmet>
                <title>Produk Digital - Barakah Economy</title>
                <meta name="description" content="Produk digital berkualitas di Barakah Economy" />
            </Helmet>

            <Header />

            <div className="px-4 py-4 pb-20">
                <h1 className="text-xl font-bold mb-4">Produk Digital</h1>

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <span className="material-icons text-5xl mb-2">inventory_2</span>
                        <p>Belum ada produk digital</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {products.map((product) => (
                            <Link key={product.id} to={`/digital-products/${product.slug}`} className="block">
                                <div className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition">
                                    <img
                                        src={product.thumbnail || '/placeholder-image.jpg'}
                                        alt={product.title}
                                        className="w-full h-28 object-cover"
                                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                    />
                                    <div className="p-3">
                                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{product.title}</h3>
                                        <span className="inline-block text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mb-1">{product.category}</span>
                                        <p className="text-green-700 font-bold text-sm">{formatIDR(product.price)}</p>
                                        <p className="text-gray-400 text-xs mt-1">oleh {product.seller_name}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <NavigationButton />
        </div>
    );
};

export default DigitalProductListPage;
