// pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMyDigitalProducts } from '../services/digitalProductApi';
import '../styles/Body.css';

const DashboardPage = () => {
    const navigate = useNavigate();
    const [productCount, setProductCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) {
            navigate('/login');
            return;
        }

        const fetchStats = async () => {
            try {
                const res = await getMyDigitalProducts();
                setProductCount(res.data.length);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [navigate]);

    return (
        <div className="body">
            <Helmet>
                <title>Dashboard - Barakah Economy</title>
            </Helmet>

            <Header />

            <div className="px-4 py-4 pb-20">
                <h1 className="text-xl font-bold mb-6">Dashboard</h1>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 text-white">
                        <span className="material-icons text-2xl mb-1">inventory_2</span>
                        <p className="text-2xl font-bold">{loading ? '...' : productCount}</p>
                        <p className="text-xs opacity-80">Produk Digital</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white">
                        <span className="material-icons text-2xl mb-1">shopping_cart</span>
                        <p className="text-2xl font-bold">-</p>
                        <p className="text-xs opacity-80">Total Pesanan</p>
                    </div>
                </div>

                {/* Menu */}
                <h2 className="font-semibold text-gray-700 mb-3">Menu</h2>
                <div className="space-y-3">
                    <Link
                        to="/dashboard/digital-products"
                        className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-green-700">storefront</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Produk Digital Saya</h3>
                            <p className="text-xs text-gray-500">Kelola produk digital yang Anda jual</p>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                    </Link>

                    <Link
                        to="/profile"
                        className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-blue-700">person</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">Profil Saya</h3>
                            <p className="text-xs text-gray-500">Lihat dan edit profil</p>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                    </Link>
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default DashboardPage;
