// pages/SellerProfilePage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getPublicDigitalProfile } from '../services/digitalProductApi';
import ShareButton from '../components/campaigns/ShareButton';
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

const SellerProfilePage = () => {
    const { username } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getPublicDigitalProfile(username);
                setProfileData(res.data);
            } catch (err) {
                console.error('Error fetching seller profile:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    if (loading) {
        return (
            <div className="body">
                <Header />
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                </div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="body">
                <Header />
                <div className="text-center py-20 text-gray-500">Profil tidak ditemukan</div>
                <NavigationButton />
            </div>
        );
    }

    const profile = profileData?.profile || {};
    const products = profileData?.products || [];

    return (
        <div className="body">
            <Helmet>
                <title>{username} - Produk Digital - Barakah Economy</title>
                <meta name="description" content={profile?.shop_description || `Koleksi produk digital dari ${username}`} />
                <meta property="og:title" content={`${username} - Produk Digital`} />
                <meta property="og:description" content={profile?.shop_description || `Koleksi produk digital dari ${username}`} />
                <meta property="og:image" content={getMediaUrl(profile?.shop_thumbnail || profile?.picture)} />
            </Helmet>

            <Header />
            <div className="max-w-6xl mx-auto pb-24">
                {/* Profile Header */}
                <div className="relative h-48 bg-green-800">
                    {profile.shop_thumbnail && (
                        <img
                            src={getMediaUrl(profile.shop_thumbnail)}
                            alt="Shop Header"
                            className="w-full h-full object-cover opacity-50"
                        />
                    )}
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
                            <img
                                src={getMediaUrl(profile.picture) || '/placeholder-profile.png'}
                                alt={username}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center px-4">
                    <div className="flex items-center justify-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900">@{username}</h1>
                        <ShareButton slug={username} title={`Profil @${username}`} type="seller" />
                    </div>
                    {profile && (
                        <>
                            <p className="text-sm text-gray-500 mt-1">{profile.name_full}</p>
                            {profile.shop_description && (
                                <div className="mt-4 max-w-md mx-auto">
                                    <p className="text-sm text-gray-600 italic">"{profile.shop_description}"</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Product List */}
                <div className="mt-10 px-4">
                    <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="material-icons text-green-600 text-lg">inventory_2</span>
                        Produk Digital
                    </h2>

                    {products.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            <p className="text-sm">Belum ada produk digital yang dipublish</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((product) => (
                                <Link
                                    key={product.id}
                                    to={`/digital-produk/${username}/${product.slug}`}
                                    className="block bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition"
                                >
                                    <img
                                        src={getMediaUrl(product.thumbnail) || '/placeholder-image.jpg'}
                                        alt={product.title}
                                        className="w-full h-32 object-cover"
                                    />
                                    <div className="p-3">
                                        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 min-h-[40px]">{product.title}</h3>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{product.category}</span>
                                        </div>
                                        <p className="text-green-700 font-bold text-sm mt-2">{formatIDR(product.price)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <NavigationButton />
        </div>
    );
};

export default SellerProfilePage;
