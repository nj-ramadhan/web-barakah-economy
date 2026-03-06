// pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getMyDigitalProducts } from '../services/digitalProductApi';
import { getMyCourses } from '../services/ecourseApi';

const DashboardPage = () => {
    const navigate = useNavigate();
    const [productCount, setProductCount] = useState(0);
    const [courseCount, setCourseCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.access) {
            navigate('/login');
            return;
        }

        const fetchStats = async () => {
            try {
                const [productRes, courseRes] = await Promise.all([
                    getMyDigitalProducts(),
                    getMyCourses()
                ]);
                setProductCount(productRes.data.length);
                setCourseCount(courseRes.data.length);
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
                    <Link to="/dashboard/digital-products" className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 text-white">
                        <span className="material-icons text-2xl mb-1">inventory_2</span>
                        <p className="font-bold text-2xl">{loading ? '...' : productCount}</p>
                        <p className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">Produk Digital</p>
                    </Link>
                    <Link to="/dashboard/ecourses" className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white">
                        <span className="material-icons text-2xl mb-1">school</span>
                        <p className="font-bold text-2xl">{loading ? '...' : courseCount}</p>
                        <p className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">E-Course Saya</p>
                    </Link>
                </div>

                {/* Menu */}
                <h2 className="font-semibold text-gray-700 mb-3 px-1">Manajemen Bisnis</h2>
                <div className="space-y-3">
                    <Link
                        to="/dashboard/digital-products"
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-green-700">storefront</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">Produk Digital Saya</h3>
                            <p className="text-[11px] text-gray-500">Kelola produk digital yang Anda jual</p>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                    </Link>

                    <Link
                        to="/dashboard/ecourses"
                        className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 hover:shadow-md transition"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons text-blue-700">video_library</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-sm">E-Course Saya</h3>
                            <p className="text-[11px] text-gray-500">Buat dan kelola video pembelajaran</p>
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
