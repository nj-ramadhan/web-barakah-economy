// pages/SellerProfilePage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getPublicDigitalProfile } from '../services/digitalProductApi';
import ShareButton from '../components/campaigns/ShareButton';
import ShopDecoration from '../components/profile/ShopDecoration';
import StoreTemplates from '../components/profile/StoreTemplates';
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
        const staticRoutes = ['login', 'register', 'lupa-password', 'reset-password', 'profile', 'charity', 'sinergy', 'incaran', 'keranjang', 'riwayat-belanja', 'bayar-belanja', 'konfirmasi-pembayaran-belanja', 'articles', 'academy', 'kelas', 'ikut-kelas', 'konfirmasi-pembayaran-kelas', 'pembayaran-berhasil', 'pembayaran-gagal', 'pembayaran-tertunda', 'about', 'hubungi-kami', 'digital-products', 'digital-produk', 'dashboard'];
        if (staticRoutes.includes(username)) {
            return null;
        }

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
    const courses = profileData?.courses || [];

    const themeColor = profile.shop_theme_color || 'green';
    const layoutStyle = profile.shop_layout || 'default';
    const fontStyle = profile.shop_font || 'sans';
    const decoration = profile.shop_decoration || 'none';

    const isHex = themeColor?.startsWith('#') || themeColor?.startsWith('rgb');
    const getThemeClasses = (color) => {
        if (isHex) return { bg: '', text: '', hover: '', badge: '', icon: '' };
        switch (color) {
            case 'blue': return { bg: 'bg-blue-800', text: 'text-blue-600', hover: 'hover:text-blue-700', badge: 'bg-blue-600', icon: 'text-blue-600' };
            case 'purple': return { bg: 'bg-purple-800', text: 'text-purple-600', hover: 'hover:text-purple-700', badge: 'bg-purple-600', icon: 'text-purple-600' };
            case 'dark': return { bg: 'bg-gray-900', text: 'text-gray-800', hover: 'hover:text-black', badge: 'bg-gray-800', icon: 'text-gray-800' };
            case 'rose': return { bg: 'bg-rose-800', text: 'text-rose-600', hover: 'hover:text-rose-700', badge: 'bg-rose-600', icon: 'text-rose-600' };
            case 'green':
            default: return { bg: 'bg-green-800', text: 'text-green-600', hover: 'hover:text-green-700', badge: 'bg-green-600', icon: 'text-green-600' };
        }
    };
    const theme = getThemeClasses(themeColor);

    const getFontClass = (font) => {
        switch (font) {
            case 'serif': return 'font-serif';
            case 'mono': return 'font-mono';
            case 'poppins': return 'font-[Poppins]';
            default: return 'font-sans';
        }
    };
    const fontClass = getFontClass(fontStyle);

    if (profile.shop_template && profile.shop_template !== 'none') {
        return (
            <div className={`body ${fontClass}`}>
                <Helmet>
                    <title>{username} - Produk Digital & E-Course - Barakah Economy</title>
                    <meta name="description" content={profile?.shop_description || `Koleksi produk digital dan e-course dari ${username}`} />
                </Helmet>
                <Header className="relative z-[100]" />
                <StoreTemplates
                    templateName={profile.shop_template}
                    profile={profile}
                    username={username}
                    products={products}
                    courses={courses}
                    isPreview={false}
                    themeColor={themeColor}
                    font={fontStyle}
                    decoration={decoration}
                    layout={layoutStyle}
                />
                <NavigationButton />
            </div>
        );
    }

    return (
        <div className={`body ${fontClass} ${themeColor === 'dark' ? 'bg-gray-900' : ''}`}>
            <ShopDecoration decoration={decoration} themeColor={themeColor} isPreview={false} />

            <Helmet>
                <title>{username} - Produk Digital & E-Course - Barakah Economy</title>
                <meta name="description" content={profile?.shop_description || `Koleksi produk digital dan e-course dari ${username}`} />
                <meta property="og:title" content={`${username} - Profil Penjual`} />
                <meta property="og:description" content={profile?.shop_description || `Koleksi produk digital dan e-course dari ${username}`} />
                <meta property="og:image" content={getMediaUrl(profile?.shop_thumbnail || profile?.picture)} />
            </Helmet>

            <Header className="relative z-10" />

            <div className={`relative z-10 max-w-6xl mx-auto pb-24 ${layoutStyle === 'biolink' ? 'flex flex-col items-center' : ''}`}>
                {/* Header / Shop Thumbnail */}
                <div
                    className={`h-48 w-full relative z-10 overflow-hidden ${layoutStyle === 'biolink' ? 'max-w-md rounded-b-3xl mt-0 shadow-lg' : ''} ${!profile.shop_thumbnail && (themeColor === 'dark' ? 'bg-gray-800' : themeColor === 'blue' ? 'bg-blue-700' : themeColor === 'purple' ? 'bg-purple-700' : themeColor === 'rose' ? 'bg-rose-700' : 'bg-green-700')}`}
                    style={{
                        backgroundColor: (!profile.shop_thumbnail && isHex) ? themeColor : undefined,
                    }}
                >
                    {profile.shop_thumbnail && (
                        <img
                            src={getMediaUrl(profile.shop_thumbnail)}
                            alt="Shop Thumbnail"
                            className="w-full h-full object-cover opacity-100"
                        />
                    )}

                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                        <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
                            <img
                                src={getMediaUrl(profile.picture) || '/placeholder-profile.png'}
                                alt={username}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </div>

                <div className={`mt-16 text-center px-4 ${layoutStyle === 'biolink' ? 'w-full max-w-md' : ''}`}>
                    <div className="flex items-center justify-center gap-2">
                        <h1 className={`text-xl font-bold ${themeColor === 'dark' ? 'text-white' : 'text-gray-900'}`}>@{username}</h1>
                        <ShareButton slug={username} title={`Profil Toko @${username}`} type="seller" />
                    </div>
                    {profile && (
                        <>
                            <p className={`text-sm mt-1 ${themeColor === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{profile.name_full}</p>
                            {profile.shop_description && (
                                <div className="mt-4 max-w-md mx-auto">
                                    <p className={`text-sm italic ${themeColor === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>"{profile.shop_description}"</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Course List Section */}
                {courses.length > 0 && (
                    <div className={`mt-10 px-4 ${layoutStyle === 'biolink' ? 'w-full max-w-md text-center' : ''}`}>
                        <h2 className={`text-sm font-bold mb-4 flex items-center ${layoutStyle === 'biolink' ? 'justify-center' : ''} gap-2 ${themeColor === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                            <span className={`material-icons text-lg ${theme.icon}`} style={isHex ? { color: themeColor } : {}}>school</span>
                            Kelas E-Course
                        </h2>
                        <div className={`grid ${layoutStyle === 'biolink' ? 'grid-cols-1 gap-3' : layoutStyle === 'grid' ? 'grid-cols-2 lg:grid-cols-3 gap-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                            {courses.map((course) => (
                                <Link
                                    key={course.id}
                                    to={`/kelas/${course.slug}`}
                                    className={`block rounded-2xl overflow-hidden shadow-sm border transition backdrop-blur-sm ${themeColor === 'dark' ? 'bg-gray-800/90 border-gray-700 hover:border-gray-600' : 'bg-white/90 border-gray-100 hover:shadow-md'
                                        } ${layoutStyle === 'biolink' ? 'flex items-center text-left' : ''}`}
                                >
                                    <div className={`relative ${layoutStyle === 'biolink' ? 'w-24 h-24 flex-shrink-0' : 'aspect-video'}`}>
                                        <img
                                            src={getMediaUrl(course.thumbnail) || '/placeholder-image.jpg'}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                        {layoutStyle !== 'biolink' && (
                                            <div className={`absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-1 rounded-lg ${theme.badge}`} style={isHex ? { backgroundColor: themeColor } : {}}>
                                                E-Course
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-4 ${layoutStyle === 'biolink' ? 'flex-1' : ''}`}>
                                        <h3 className={`text-sm font-bold line-clamp-2 mb-2 ${themeColor === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${layoutStyle === 'biolink' ? 'min-h-0' : 'min-h-[40px]'}`}>{course.title}</h3>
                                        <div className="flex items-center justify-between mt-auto">
                                            {layoutStyle !== 'biolink' && (
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                    <span className="material-icons text-[12px]">groups</span>
                                                    {course.student_count || 0}
                                                </div>
                                            )}
                                            <p className={`font-extrabold text-sm ${theme.text}`} style={isHex ? { color: themeColor } : {}}>
                                                {course.price > 0 ? formatIDR(course.price) : 'GRATIS'}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Product List Section */}
                <div className={`mt-10 px-4 ${layoutStyle === 'biolink' ? 'w-full max-w-md text-center flex flex-col items-center' : ''}`}>
                    <h2 className={`text-sm font-bold mb-4 flex items-center gap-2 ${layoutStyle === 'biolink' ? 'justify-center' : ''} ${themeColor === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        <span className={`material-icons text-lg ${theme.icon}`} style={isHex ? { color: themeColor } : {}}>inventory_2</span>
                        Produk Digital
                    </h2>

                    {products.length === 0 ? (
                        <div className={`text-center py-10 rounded-2xl border border-dashed text-sm backdrop-blur-sm ${themeColor === 'dark' ? 'text-gray-400 bg-gray-800/90 border-gray-700' : 'text-gray-400 bg-white/90 border-gray-200'}`}>
                            <p>Belum ada produk digital yang dipublish</p>
                        </div>
                    ) : (
                        <div className={`grid w-full ${layoutStyle === 'biolink' ? 'grid-cols-1 gap-3' : layoutStyle === 'grid' ? 'grid-cols-3 lg:grid-cols-4 gap-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                            {products.map((product) => (
                                <Link
                                    key={product.id}
                                    to={`/digital-produk/${username}/${product.slug}`}
                                    className={`block rounded-2xl overflow-hidden shadow-sm border transition backdrop-blur-sm ${themeColor === 'dark' ? 'bg-gray-800/90 border-gray-700 hover:border-gray-600' : 'bg-white/90 border-gray-100 hover:shadow-md'
                                        } ${layoutStyle === 'biolink' ? 'flex items-center text-left' : ''}`}
                                >
                                    <div className={`${layoutStyle === 'biolink' ? 'w-24 h-24 flex-shrink-0' : 'w-full'}`}>
                                        <img
                                            src={getMediaUrl(product.thumbnail) || '/placeholder-image.jpg'}
                                            alt={product.title}
                                            className={`w-full object-cover ${layoutStyle === 'biolink' ? 'h-full' : 'h-32'}`}
                                        />
                                    </div>
                                    <div className={`p-3 ${layoutStyle === 'biolink' ? 'flex-1' : ''}`}>
                                        <h3 className={`text-sm font-bold line-clamp-2 ${themeColor === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${layoutStyle === 'biolink' ? 'min-h-0' : 'min-h-[40px]'}`}>{product.title}</h3>
                                        {layoutStyle !== 'biolink' && (
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${themeColor === 'dark' ? 'text-gray-300 bg-gray-700/80' : 'text-gray-400 bg-gray-50/80'}`}>{product.category}</span>
                                            </div>
                                        )}
                                        <p className={`font-bold text-sm mt-2 ${theme.text}`} style={isHex ? { color: themeColor } : {}}>{formatIDR(product.price)}</p>
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
