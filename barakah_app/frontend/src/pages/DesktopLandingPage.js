import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import DesktopHeader from '../components/layout/DesktopHeader';
import DesktopFooter from '../components/layout/DesktopFooter';

const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const formatIDRTarget = (amount) => {
    if (amount <= 0) return '\u221E';
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
};

const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const DesktopLandingPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [courses, setCourses] = useState([]);
    const [articles, setArticles] = useState([]);
    const [digitalProducts, setDigitalProducts] = useState([]);
    const [user, setUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [popularSellers, setPopularSellers] = useState([]);
    const [testimonials, setTestimonials] = useState([]);
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        // Check login status
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.access) {
            setUser(userData);
        }

        const fetchData = async () => {
            try {
                const [campRes, prodRes, courseRes, articleRes, digiRes, sellerRes, testRes, actRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/`),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/`),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/`),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/articles/`),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/digital-products/`).catch(() => ({ data: [] })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/digital-products/popular-sellers/`).catch(() => ({ data: [] })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/`).catch(() => ({ data: [] })),
                    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/`).catch(() => ({ data: [] }))
                ]);
                setCampaigns(campRes.data.slice(0, 8));
                setProducts(prodRes.data.results ? prodRes.data.results.slice(0, 8) : prodRes.data.slice(0, 8));
                setCourses(courseRes.data.slice(0, 8));
                setArticles(articleRes.data.results ? articleRes.data.results.slice(0, 8) : articleRes.data.slice(0, 8));
                setDigitalProducts(Array.isArray(digiRes.data) ? digiRes.data.slice(0, 8) : []);
                setPopularSellers(Array.isArray(sellerRes.data) ? sellerRes.data : []);
                setTestimonials(Array.isArray(testRes.data) ? testRes.data.filter(t => t.is_approved) : []);
                setActivities(Array.isArray(actRes.data) ? actRes.data.slice(0, 3) : []); // Only show latest 3
            } catch (err) {
                console.error('Error fetching landing page data:', err);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans">
            <DesktopHeader />

            <main className="flex-1 pt-20">
                {/* ============ HERO ============ */}
                <section className="w-full bg-gradient-to-br from-green-50 via-white to-green-100 py-24 px-8 lg:px-24 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 space-y-6">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                            Bersama Membangun <br />
                            <span className="text-green-700">Ekonomi Umat yang Barakah</span>
                        </h1>
                        <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                            Aplikasi super untuk kebutuhan ibadah harta Anda. Zakat, Infaq, Sedekah, Wakaf hingga belanja produk halal dan thoyyib dalam satu genggaman.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <Link to="/charity" className="px-8 py-3 bg-green-700 text-white font-bold rounded-xl shadow-lg hover:bg-green-800 hover:-translate-y-1 transition transform duration-200">
                                Mulai Donasi
                            </Link>
                            <Link to="/sinergy" className="px-8 py-3 bg-white text-green-700 font-bold rounded-xl shadow border border-green-200 hover:bg-gray-50 transition">
                                Belanja Halal
                            </Link>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                            <div className="relative z-10 grid grid-cols-2 gap-4 max-w-sm">
                                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                                    <span className="material-icons text-4xl text-green-600 mb-2">volunteer_activism</span>
                                    <p className="font-bold text-gray-800">Charity</p>
                                    <p className="text-xs text-gray-500 mt-1">ZISWAF Online</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                                    <span className="material-icons text-4xl text-blue-600 mb-2">shopping_bag</span>
                                    <p className="font-bold text-gray-800">Sinergy</p>
                                    <p className="text-xs text-gray-500 mt-1">Halal Mart</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                                    <span className="material-icons text-4xl text-purple-600 mb-2">school</span>
                                    <p className="font-bold text-gray-800">Academy</p>
                                    <p className="text-xs text-gray-500 mt-1">E-Course & Artikel</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-lg text-center">
                                    <span className="material-icons text-4xl text-orange-500 mb-2">groups</span>
                                    <p className="font-bold text-gray-800">Community</p>
                                    <p className="text-xs text-gray-500 mt-1">BAE Community</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============ LAYANAN UNGGULAN ============ */}
                <section className="py-20 px-8 lg:px-24 bg-gray-50">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Layanan Unggulan Kami</h2>
                        <div className="w-24 h-1 bg-green-600 mx-auto rounded-full"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-green-300 hover:shadow-xl transition group">
                            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition">
                                <span className="material-icons text-3xl text-green-700 group-hover:text-white">volunteer_activism</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Charity & ZISWAF</h3>
                            <p className="text-gray-600 mb-4">Salurkan zakat, infaq, dan sedekah Anda ke berbagai program sosial yang amanah dan transparan.</p>
                            <Link to="/charity" className="text-green-700 font-semibold hover:underline text-sm">Lihat Program &rarr;</Link>
                        </div>
                        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-blue-300 hover:shadow-xl transition group">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition">
                                <span className="material-icons text-3xl text-blue-700 group-hover:text-white">shopping_bag</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Sinergy Halal Mart</h3>
                            <p className="text-gray-600 mb-4">Penuhi kebutuhan harian dengan produk halal, bermutu, dan mendukung ekonomi umat.</p>
                            <Link to="/sinergy" className="text-blue-700 font-semibold hover:underline text-sm">Lihat Produk &rarr;</Link>
                        </div>
                        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-purple-300 hover:shadow-xl transition group">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition">
                                <span className="material-icons text-3xl text-purple-700 group-hover:text-white">school</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Barakah Academy</h3>
                            <p className="text-gray-600 mb-4">Tingkatkan ilmu dan keterampilan melalui e-course dan artikel islami bersertifikat.</p>
                            <Link to="/academy" className="text-purple-700 font-semibold hover:underline text-sm">Lihat Kelas &rarr;</Link>
                        </div>
                    </div>
                </section>

                {/* ============ CHARITY CAROUSEL ============ */}
                {campaigns.length > 0 && (
                    <section id="charity" className="py-20 px-8 lg:px-24 bg-white">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">Program Charity</h2>
                                    <p className="text-gray-500 mt-2">Bantu saudaramu, Allah bantu kamu</p>
                                </div>
                                <Link to="/charity" className="px-6 py-2 border border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition">
                                    Lihat Semua
                                </Link>
                            </div>
                            <Swiper
                                spaceBetween={24}
                                slidesPerView={3}
                                navigation
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 4000, disableOnInteraction: false }}
                                modules={[Navigation, Pagination, Autoplay]}
                                breakpoints={{
                                    320: { slidesPerView: 1 },
                                    640: { slidesPerView: 2 },
                                    1024: { slidesPerView: 3 },
                                }}
                            >
                                {campaigns.map((campaign) => (
                                    <SwiperSlide key={campaign.id}>
                                        <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition group">
                                            <Link to={`/kampanye/${campaign.slug || campaign.id}`}>
                                                <img
                                                    src={getMediaUrl(campaign.thumbnail) || '/images/peduli-dhuafa-banner.jpg'}
                                                    alt={campaign.title}
                                                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { e.target.src = '/images/peduli-dhuafa-banner.jpg'; }}
                                                />
                                            </Link>
                                            <div className="p-5">
                                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{campaign.title}</h3>
                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                    <div
                                                        className="bg-green-600 h-2 rounded-full"
                                                        style={{ width: `${campaign.target_amount > 0 ? Math.min((campaign.current_amount / campaign.target_amount) * 100, 100) : 0}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mb-4">
                                                    <span>{campaign.current_amount ? formatIDR(campaign.current_amount) : 'Rp 0'}</span>
                                                    <span>dari {campaign.target_amount ? formatIDRTarget(campaign.target_amount) : 'Rp 0'}</span>
                                                </div>
                                                <Link
                                                    to={`/bayar-donasi/${campaign.slug || campaign.id}`}
                                                    className="block text-center bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-800 transition"
                                                >
                                                    Donasi Sekarang
                                                </Link>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </section>
                )}

                {/* ============ SINERGY / PRODUCT CAROUSEL ============ */}
                {products.length > 0 && (
                    <section id="sinergy" className="py-20 px-8 lg:px-24 bg-gray-50">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">Produk Sinergy</h2>
                                    <p className="text-gray-500 mt-2">Penuhi kebutuhan harianmu dengan produk halal</p>
                                </div>
                                <Link to="/sinergy" className="px-6 py-2 border border-blue-600 text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition">
                                    Lihat Semua
                                </Link>
                            </div>
                            <Swiper
                                spaceBetween={24}
                                slidesPerView={4}
                                navigation
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 5000, disableOnInteraction: false }}
                                modules={[Navigation, Pagination, Autoplay]}
                                breakpoints={{
                                    320: { slidesPerView: 1 },
                                    640: { slidesPerView: 2 },
                                    1024: { slidesPerView: 4 },
                                }}
                            >
                                {products.map((product) => (
                                    <SwiperSlide key={product.id}>
                                        <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition group">
                                            <Link to={`/produk/${product.slug || product.id}`}>
                                                <img
                                                    src={getMediaUrl(product.thumbnail) || '/placeholder-image.jpg'}
                                                    alt={product.title}
                                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                                />
                                            </Link>
                                            <div className="p-4">
                                                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{product.title}</h3>
                                                <p className="text-green-700 font-bold text-sm">{formatIDR(product.price)}</p>
                                                <p className="text-xs text-gray-400 mt-1">Stok: {product.stock > 0 ? product.stock : 'Habis'}</p>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </section>
                )}

                {/* ============ E-COURSE CAROUSEL ============ */}
                {courses.length > 0 && (
                    <section id="academy" className="py-20 px-8 lg:px-24 bg-white">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">E-Course</h2>
                                    <p className="text-gray-500 mt-2">Menuntut ilmu wajib bagi setiap muslim</p>
                                </div>
                                <Link to="/academy/ecourse" className="px-6 py-2 border border-purple-600 text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition">
                                    Lihat Semua
                                </Link>
                            </div>
                            <Swiper
                                spaceBetween={24}
                                slidesPerView={3}
                                navigation
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 4500, disableOnInteraction: false }}
                                modules={[Navigation, Pagination, Autoplay]}
                                breakpoints={{
                                    320: { slidesPerView: 1 },
                                    640: { slidesPerView: 2 },
                                    1024: { slidesPerView: 3 },
                                }}
                            >
                                {courses.map((course) => (
                                    <SwiperSlide key={course.id}>
                                        <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition group">
                                            <Link to={`/kelas/${course.slug || course.id}`}>
                                                <img
                                                    src={getMediaUrl(course.thumbnail) || '/images/peduli-dhuafa-banner.jpg'}
                                                    alt={course.title}
                                                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { e.target.src = '/images/peduli-dhuafa-banner.jpg'; }}
                                                />
                                            </Link>
                                            <div className="p-5">
                                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{course.title}</h3>
                                                <p className="text-purple-700 font-bold text-sm">{course.price <= 0 ? 'GRATIS' : formatIDR(course.price)}</p>
                                                <Link
                                                    to={`/kelas/${course.slug || course.id}`}
                                                    className="block text-center mt-4 bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-purple-800 transition"
                                                >
                                                    Lihat Kelas
                                                </Link>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </section>
                )}

                {/* ============ ARTICLES CAROUSEL ============ */}
                {articles.length > 0 && (
                    <section className="py-20 px-8 lg:px-24 bg-gray-50">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">Artikel Terbaru</h2>
                                    <p className="text-gray-500 mt-2">Tambah wawasan dengan artikel Islami</p>
                                </div>
                                <Link to="/articles" className="px-6 py-2 border border-orange-500 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition">
                                    Lihat Semua
                                </Link>
                            </div>
                            <Swiper
                                spaceBetween={24}
                                slidesPerView={3}
                                navigation
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 5000, disableOnInteraction: false }}
                                modules={[Navigation, Pagination, Autoplay]}
                                breakpoints={{
                                    320: { slidesPerView: 1 },
                                    640: { slidesPerView: 2 },
                                    1024: { slidesPerView: 3 },
                                }}
                            >
                                {articles.map((article) => (
                                    <SwiperSlide key={article.id}>
                                        <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition group">
                                            <Link to={`/articles/${article.id}`}>
                                                <img
                                                    src={getMediaUrl(article.images?.[0]?.path) || '/placeholder-image.jpg'}
                                                    alt={article.title}
                                                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                                />
                                            </Link>
                                            <div className="p-5">
                                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{article.title}</h3>
                                                <p className="text-gray-500 text-xs line-clamp-3">
                                                    {stripHtml(article.content?.substring(0, 160))}
                                                </p>
                                                <Link
                                                    to={`/articles/${article.id}`}
                                                    className="inline-block mt-3 text-orange-600 font-semibold text-sm hover:underline"
                                                >
                                                    Baca Selengkapnya &rarr;
                                                </Link>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </section>
                )}

                {/* ============ DIGITAL PRODUCTS CAROUSEL ============ */}
                {digitalProducts.length > 0 && (
                    <section className="py-20 px-8 lg:px-24 bg-white">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">Produk Digital</h2>
                                    <p className="text-gray-500 mt-2">E-book, template, dan produk digital lainnya</p>
                                </div>
                                <Link to="/digital-products" className="px-6 py-2 border border-emerald-600 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition">
                                    Lihat Semua
                                </Link>
                            </div>
                            <Swiper
                                spaceBetween={24}
                                slidesPerView={4}
                                navigation
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 5000, disableOnInteraction: false }}
                                modules={[Navigation, Pagination, Autoplay]}
                                breakpoints={{
                                    320: { slidesPerView: 1 },
                                    640: { slidesPerView: 2 },
                                    1024: { slidesPerView: 4 },
                                }}
                            >
                                {digitalProducts.map((dp) => (
                                    <SwiperSlide key={dp.id}>
                                        <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition group">
                                            <Link to={`/digital-products/${dp.slug}`}>
                                                <img
                                                    src={getMediaUrl(dp.thumbnail) || '/placeholder-image.jpg'}
                                                    alt={dp.title}
                                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                                />
                                            </Link>
                                            <div className="p-4">
                                                <span className="inline-block text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-1">{dp.category}</span>
                                                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{dp.title}</h3>
                                                <p className="text-green-700 font-bold text-sm">{formatIDR(dp.price)}</p>
                                                <p className="text-gray-400 text-xs mt-1">oleh {dp.seller_name}</p>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    </section>
                )}

                {/* ============ POPULAR SELLERS ============ */}
                {popularSellers.length > 0 && (
                    <section className="py-20 px-8 lg:px-24 bg-gray-50 border-t border-b border-gray-100">
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-bold text-gray-900">Penjual Populer</h2>
                                <p className="text-gray-500 mt-2">Dukung para creator dan UMKM barakah kami</p>
                            </div>
                            <div className="flex overflow-x-auto space-x-8 pb-8 scrollbar-hide justify-center">
                                {popularSellers.map((seller) => (
                                    <Link
                                        key={seller.username}
                                        to={`/digital-produk/${seller.username}`}
                                        className="flex-shrink-0 w-32 text-center group"
                                    >
                                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-md group-hover:border-green-500 transition-all duration-300 p-1 mb-4">
                                            <img
                                                src={getMediaUrl(seller.shop_thumbnail) || '/images/pas_foto_standard.png'}
                                                alt={seller.name}
                                                className="w-full h-full object-cover rounded-full"
                                                onError={(e) => { e.target.src = '/images/pas_foto_standard.png'; }}
                                            />
                                        </div>
                                        <p className="font-bold text-gray-900 text-sm group-hover:text-green-700 transition-colors">@{seller.username}</p>
                                        <p className="text-[10px] text-gray-500 py-1">{seller.name}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ============ KEGIATAN & BERITA ============ */}
                {activities.length > 0 && (
                    <section className="py-20 px-8 lg:px-24 bg-white">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Kegiatan Komunitas</h2>
                                    <div className="w-20 h-1 bg-green-600 rounded-full"></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {activities.map((act) => (
                                    <div key={act.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                        <div className="relative h-48 overflow-hidden">
                                            <img
                                                src={getMediaUrl(act.header_image)}
                                                alt={act.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                                                <p className="text-[10px] font-bold text-green-700">
                                                    {new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 group-hover:text-green-700 transition">
                                                {act.title}
                                            </h3>
                                            <div className="text-gray-600 text-sm line-clamp-3 mb-4 last:mb-0" dangerouslySetInnerHTML={{ __html: act.content }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ============ TESTIMONI ============ */}
                <section className="py-20 px-8 lg:px-24 bg-gray-50 overflow-hidden">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Apa Kata Mereka?</h2>
                            <div className="w-24 h-1 bg-green-600 mx-auto rounded-full"></div>
                            <p className="text-gray-500 mt-4 text-sm">Cerita inspiratif dari para pengguna platform Barakah Economy</p>
                        </div>

                        <div className="relative px-4 sm:px-12">
                            <Swiper
                                modules={[Navigation, Pagination, Autoplay]}
                                spaceBetween={30}
                                slidesPerView={1}
                                breakpoints={{
                                    768: { slidesPerView: 2 },
                                    1024: { slidesPerView: 3 }
                                }}
                                pagination={{ clickable: true }}
                                autoplay={{ delay: 4000, disableOnInteraction: false }}
                                className="pb-16"
                            >
                                {testimonials.length > 0 ? (
                                    testimonials.map((t) => (
                                        <SwiperSlide key={t.id}>
                                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col hover:shadow-md transition">
                                                <div className="flex text-yellow-400 mb-4">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} className="material-icons text-lg">
                                                            {i < t.rating ? 'star' : 'star_outline'}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-gray-600 text-sm leading-relaxed italic mb-6 flex-1">
                                                    "{t.content}"
                                                </p>
                                                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm uppercase">
                                                        {(t.username || t.name || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{t.username || t.name || 'User'}</p>
                                                        <p className="text-[10px] text-gray-400">Pengguna Terverifikasi</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    ))
                                ) : (
                                    /* Fallback static content if no live testimonials */
                                    [1, 2, 3].map((i) => (
                                        <SwiperSlide key={i}>
                                            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col">
                                                <div className="flex text-yellow-400 mb-4">
                                                    {[...Array(5)].map((_, j) => <span key={j} className="material-icons text-lg">star</span>)}
                                                </div>
                                                <p className="text-gray-600 text-sm leading-relaxed italic mb-6 flex-1">
                                                    {i === 1 ? '"Alhamdulillah, sangat amanah!"' : i === 2 ? '"Produk berkualitas dan terjangkau."' : '"Materi mudah dipahami."'}
                                                </p>
                                                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold text-sm">U</div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">User {i}</p>
                                                        <p className="text-[10px] text-gray-400">Pengguna</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    ))
                                )}
                            </Swiper>
                        </div>
                    </div>
                </section>

                {/* ============ ABOUT US (paling bawah) ============ */}
                <section id="about" className="py-20 px-8 lg:px-24 bg-white">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start gap-12">
                        <div className="flex-1 space-y-6">
                            <h2 className="text-3xl font-bold text-gray-900">Tentang Kami</h2>
                            <div className="w-20 h-1 bg-green-600 rounded-full"></div>
                            <p className="text-gray-600 leading-relaxed">
                                BAE Community berdiri pada tanggal 29 Februari 2024 di Jalan Tubagus Ismail Dalam No.19C dan bertempat di Dago, Kota Bandung, Jawa Barat.
                                Tujuan BAE Community adalah meningkatkan kestabilan finansial masyarakat melalui pengembangan ekosistem ekonomi yang berlandaskan syariah Islam
                                dengan memberdayakan pemuda dan mahasiswa sebagai pionir perubahan.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                BAE Community memiliki tugas pokok menyelenggarakan kegiatan yang bersifat pemberdayaan, pendidikan, kolaborasi, pengembangan serta sosial
                                baik ke dalam yaitu internal komunitas maupun keluar yaitu lingkungan masyarakat.
                            </p>
                        </div>
                        <div className="flex-1 space-y-6">
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                <h3 className="text-lg font-bold text-green-800 mb-3">🎯 Visi</h3>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                    Menjadi komunitas yang unggul dalam mengembangkan perekonomian berbasis syariah yang berkeadilan dan berkelanjutan,
                                    serta berkontribusi secara aktif dalam kesejahteraan umat.
                                </p>
                            </div>
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                <h3 className="text-lg font-bold text-green-800 mb-3">🚀 Misi</h3>
                                <ul className="space-y-1.5 text-sm text-gray-700">
                                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Mendorong Pemberdayaan Ekonomi</li>
                                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Pendidikan dan Literasi Keuangan Syariah</li>
                                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Kolaborasi dan Sinergi Antar Komunitas</li>
                                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Pengembangan Usaha Berbasis Syariah</li>
                                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Kepedulian Sosial dan Amal</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ============ FOOTER ============ */}
            <footer className="bg-green-900 text-green-100 py-12 px-8 lg:px-24">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="col-span-1 md:col-span-1">
                        <span className="text-2xl font-bold text-white block mb-4">Barakah Economy</span>
                        <p className="text-green-200 text-sm leading-relaxed">Platform ekosistem ekonomi Islam terintegrasi untuk mewujudkan kesejahteraan umat melalui optimalisasi ZISWAF dan pemberdayaan UMKM.</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Tautan</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#about" className="hover:text-white transition">Tentang Kami</a></li>
                            <li><Link to="/charity" className="hover:text-white transition">Charity</Link></li>
                            <li><Link to="/sinergy" className="hover:text-white transition">Sinergy</Link></li>
                            <li><Link to="/academy" className="hover:text-white transition">Academy</Link></li>
                            <li><Link to="/articles" className="hover:text-white transition">Artikel</Link></li>
                            <li><Link to="/digital-products" className="hover:text-white transition">Produk Digital</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-4">Hubungi Kami</h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2"><span className="material-icons text-sm">location_on</span> Jl. Tubagus Ismail Dalam No.19C, Bandung</li>
                            <li><Link to="/hubungi-kami" className="hover:text-white transition flex items-center gap-2"><span className="material-icons text-sm">email</span> Kontak Kami</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-green-800 text-center text-green-300 text-sm">
                    &copy; {new Date().getFullYear()} Barakah Economy. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default DesktopLandingPage;
