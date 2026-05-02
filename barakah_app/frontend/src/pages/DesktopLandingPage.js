import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import DesktopHeader from '../components/layout/DesktopHeader';

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

const getEventStatus = (startStr, endStr) => {
    const now = new Date();
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 4 * 60 * 60 * 1000);

    const isFinished = now > end;
    
    if (now < start) {
        return { label: 'Akan Datang', color: 'bg-blue-600', isFinished };
    } else if (now >= start && now <= end) {
        return { label: 'Berlangsung', color: 'bg-green-600', isFinished };
    } else {
        return { label: 'Selesai', color: 'bg-gray-500', isFinished };
    }
};

const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = process.env.REACT_APP_API_BASE_URL || '';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    return `${cleanBase}${cleanUrl}`;
};

const SellerAvatar = ({ seller, getMediaUrl }) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl = !imgError ? (seller.shop_thumbnail || seller.picture) : null;
    const initial = (seller.name || seller.username || '?').charAt(0).toUpperCase();

    return (
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-md group-hover:border-green-500 transition-all duration-300 p-1 mb-4 flex items-center justify-center bg-gray-50">
            {imageUrl ? (
                <img
                    src={getMediaUrl(imageUrl)}
                    alt={seller.name}
                    className="w-full h-full object-cover rounded-full"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-green-100 text-green-700 font-bold text-2xl rounded-full">
                    {initial}
                </div>
            )}
        </div>
    );
};

const DesktopLandingPage = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [products, setProducts] = useState([]);
    const [courses, setCourses] = useState([]);
    const [articles, setArticles] = useState([]);
    const [digitalProducts, setDigitalProducts] = useState([]);
    const [popularSellers, setPopularSellers] = useState([]);
    const [testimonials, setTestimonials] = useState([]);
    const [activities, setActivities] = useState([]);
    const [partners, setPartners] = useState([]);
    const [events, setEvents] = useState([]);
    const [aboutUs, setAboutUs] = useState(null);
    const [selectedPartner, setSelectedPartner] = useState(null);

    useEffect(() => {
        // Fetch data

        const fetchData = async () => {
            const getSafe = (promise) => promise.catch(err => {
                console.error("API Call failed:", err);
                return { data: [] };
            });

            try {
                const results = await Promise.all([
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/articles/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/digital-products/products/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/digital-products/products/popular-sellers/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/partners/`)),
                    getSafe(axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/events/landing/`))
                ]);

                const [campRes, prodRes, courseRes, articleRes, digiRes, sellerRes, testRes, actRes, partnerRes, eventRes] = results;

                setCampaigns(campRes.data.results ? campRes.data.results.slice(0, 8) : campRes.data.slice(0, 8));
                setProducts(prodRes.data.results ? prodRes.data.results.slice(0, 8) : prodRes.data.slice(0, 8));
                setCourses(courseRes.data.results ? courseRes.data.results.slice(0, 8) : courseRes.data.slice(0, 8));
                setArticles(articleRes.data.results ? articleRes.data.results.slice(0, 8) : articleRes.data.slice(0, 8));
                setDigitalProducts(Array.isArray(digiRes.data) ? digiRes.data.slice(0, 8) : []);
                setPopularSellers(Array.isArray(sellerRes.data) ? sellerRes.data : []);
                setTestimonials(Array.isArray(testRes.data) ? testRes.data.filter(t => t.is_approved) : []);
                setActivities(Array.isArray(actRes.data) ? actRes.data.slice(0, 3) : []);
                setPartners(Array.isArray(partnerRes.data) ? partnerRes.data : []);
                setEvents(Array.isArray(eventRes.data) ? eventRes.data : []);
                
                // Fetch About Us explicitly
                const aboutDataRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/about-us/`).catch(() => ({ data: [] }));
                const items = Array.isArray(aboutDataRes.data) ? aboutDataRes.data : [aboutDataRes.data];
                if (items.length > 0 && items[0]) setAboutUs(items[0]);
            } catch (err) {
                console.error('Critical error fetching landing page data:', err);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans">
            <DesktopHeader />

            <main className="flex-1 pt-20">
                {/* ============ HERO ============ */}
                <section className="w-full bg-gradient-to-br from-green-50 via-white to-green-100 py-16 lg:py-24 px-8 lg:px-24">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
                        {/* LEFT: 7/12 (approx) */}
                        <div className="md:w-[58%] space-y-8 animate-fade-in">
                            <div className="space-y-4">
                                <span className="inline-block bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase">
                                    Solusi Ekonomi Syariah Terintegrasi
                                </span>
                                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                                    Bersama Membangun <br />
                                    <span className="text-green-700 relative inline-block">
                                        Ekonomi Umat
                                        <div className="absolute -bottom-2 left-0 w-full h-2 bg-green-200/50 -rotate-1"></div>
                                    </span> yang Barakah
                                </h1>
                                <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
                                    Aplikasi super untuk kebutuhan ibadah harta Anda. Zakat, Infaq, Sedekah, Wakaf hingga belanja produk halal dan thoyyib dalam satu genggaman.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4 pt-2">
                                <Link to="/charity" className="px-8 py-4 bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-200 hover:bg-green-800 hover:-translate-y-1 transition transform duration-300 flex items-center gap-2">
                                    Mulai Donasi <span className="material-icons text-sm">volunteer_activism</span>
                                </Link>
                                <Link to="/sinergy" className="px-8 py-4 bg-white text-green-700 font-bold rounded-2xl shadow-sm border border-green-200 hover:bg-green-50 hover:-translate-y-1 transition transform duration-300 flex items-center gap-2">
                                    Belanja Halal <span className="material-icons text-sm">shopping_bag</span>
                                </Link>
                            </div>
                        </div>

                        {/* RIGHT: 5/12 (approx) */}
                        <div className="md:w-[42%] w-full">
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-green-300 to-blue-300 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition duration-500"></div>
                                <div className="relative bg-white p-2 rounded-[2rem] shadow-2xl border border-white overflow-hidden">
                                    <Swiper
                                        modules={[Autoplay, Pagination]}
                                        pagination={{ clickable: true }}
                                        autoplay={{ delay: 3500, disableOnInteraction: false }}
                                        loop={[activities[0], articles[0], campaigns[0], courses[0], products[0], digitalProducts[0]].filter(Boolean).length > 2}
                                        className="rounded-[1.8rem] overflow-hidden"
                                    >
                                        {/* Dynamic Carousel Items Picker */}
                                        {[
                                            activities[0] && { type: 'Kegiatan', title: activities[0].title, img: activities[0].header_image, link: `/kegiatan/${activities[0].id}` },
                                            events.find(e => e.visibility === 'public') && { 
                                                type: 'Event', 
                                                title: events.find(e => e.visibility === 'public').title, 
                                                img: events.find(e => e.visibility === 'public').header_image || events.find(e => e.visibility === 'public').thumbnail, 
                                                link: `/event/${events.find(e => e.visibility === 'public').slug}` 
                                            },
                                            articles[0] && { type: 'Artikel', title: articles[0].title, img: articles[0].images?.[0]?.path, link: `/articles/${articles[0].id}` },
                                            campaigns[0] && { type: 'Charity', title: campaigns[0].title, img: campaigns[0].thumbnail, link: `/kampanye/${campaigns[0].slug || campaigns[0].id}` },
                                            courses[0] && { type: 'Academy', title: courses[0].title, img: courses[0].thumbnail, link: `/kelas/${courses[0].slug || courses[0].id}` },
                                            products[0] && { type: 'Sinergy', title: products[0].title, img: products[0].thumbnail, link: `/produk/${products[0].slug || products[0].id}` },
                                            digitalProducts[0] && { type: 'Digital', title: digitalProducts[0].title, img: digitalProducts[0].thumbnail, link: `/digital-products/${digitalProducts[0].slug}` }
                                        ].filter(Boolean).slice(0, 5).map((item, idx) => (
                                            <SwiperSlide key={idx}>
                                                <div className="relative h-[420px] group/slide cursor-pointer" onClick={() => navigate(item.link)}>
                                                    <img
                                                        src={getMediaUrl(item.img)}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover transition-transform duration-[3s] group-hover/slide:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                                                    <div className="absolute bottom-0 left-0 p-10 w-full text-white">
                                                        <span className="inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-4 border border-white/30 tracking-widest">
                                                            {item.type} Terbaru
                                                        </span>
                                                        <h3 className="text-2xl font-black leading-tight line-clamp-2 hover:text-green-300 transition-colors">
                                                            {item.title}
                                                        </h3>
                                                    </div>
                                                </div>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
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
                    <div className="max-w-7xl mx-auto services-swiper">
                        <Swiper
                            modules={[Navigation, Pagination, Autoplay]}
                            spaceBetween={24}
                            slidesPerView={3}
                            navigation
                            pagination={{ clickable: true }}
                            autoplay={{ delay: 5000, disableOnInteraction: false }}
                            breakpoints={{
                                320: { slidesPerView: 1 },
                                768: { slidesPerView: 2 },
                                1280: { slidesPerView: 3 },
                            }}
                            className="pb-16"
                        >
                            {/* Charity */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-green-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition">
                                        <span className="material-icons text-3xl text-green-700 group-hover:text-white">volunteer_activism</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Charity &amp; ZISWAF</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Salurkan zakat, infaq, dan sedekah Anda ke berbagai program sosial yang amanah dan transparan.</p>
                                    <Link className="text-green-700 font-semibold hover:underline text-sm" to="/charity">Lihat Program →</Link>
                                </div>
                            </SwiperSlide>
                            {/* Sinergy */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-blue-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition">
                                        <span className="material-icons text-3xl text-blue-700 group-hover:text-white">shopping_bag</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Sinergy Halal Mart</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Penuhi kebutuhan harian dengan produk halal, bermutu, dan mendukung ekonomi umat.</p>
                                    <Link className="text-blue-700 font-semibold hover:underline text-sm" to="/sinergy">Lihat Produk →</Link>
                                </div>
                            </SwiperSlide>
                            {/* Academy */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-purple-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition">
                                        <span className="material-icons text-3xl text-purple-700 group-hover:text-white">school</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Barakah Academy</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Tingkatkan ilmu dan keterampilan melalui e-course dan artikel islami bersertifikat.</p>
                                    <Link className="text-purple-700 font-semibold hover:underline text-sm" to="/academy">Lihat Kelas →</Link>
                                </div>
                            </SwiperSlide>
                            {/* Kegiatan / Community */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-orange-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition">
                                        <span className="material-icons text-3xl text-orange-700 group-hover:text-white">groups</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Kegiatan Komunitas</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Ikuti berbagai kegiatan pemberdayaan dan kolaborasi sosial bersama BAE Community.</p>
                                    <Link className="text-orange-700 font-semibold hover:underline text-sm" to="/kegiatan">Lihat Kegiatan →</Link>
                                </div>
                            </SwiperSlide>
                            {/* Barakah Mart (Digital Products) */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-cyan-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-cyan-600 transition">
                                        <span className="material-icons text-3xl text-cyan-700 group-hover:text-white">storefront</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Barakah Digital Mart</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Akses berbagai produk digital pilihan untuk mendukung produktivitas dan bisnis Anda.</p>
                                    <Link className="text-cyan-700 font-semibold hover:underline text-sm" to="/digital-products">Lihat Produk →</Link>
                                </div>
                            </SwiperSlide>
                            {/* Relawan BAE */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-red-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 transition">
                                        <span className="material-icons text-3xl text-red-700 group-hover:text-white">volunteer_activism</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Relawan BAE</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Jadilah bagian dari perubahan positif. Bergabunglah sebagai relawan Barakah Economy.</p>
                                    <Link className="text-red-700 font-semibold hover:underline text-sm" to="#">Daftar Relawan →</Link>
                                </div>
                            </SwiperSlide>
                            {/* Barakah Event */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-teal-600 transition">
                                        <span className="material-icons text-3xl text-teal-700 group-hover:text-white">event</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Barakah Event</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Ikuti berbagai event menarik, seminar, dan workshop yang diselenggarakan oleh Barakah Economy.</p>
                                    <Link className="text-teal-700 font-semibold hover:underline text-sm" to="/events">Lihat Event →</Link>
                                </div>
                            </SwiperSlide>
                            {/* Forum Tanya Jawab */}
                            <SwiperSlide>
                                <div className="p-8 h-full rounded-2xl bg-white border border-gray-100 hover:border-indigo-300 hover:shadow-xl transition group">
                                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition">
                                        <span className="material-icons text-3xl text-indigo-700 group-hover:text-white">forum</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">Forum Tanya Jawab</h3>
                                    <p className="text-gray-600 mb-4 text-sm">Diskusikan topik bisnis, fiqih, dan ummat bersama para pakar.</p>
                                    <Link className="text-indigo-700 font-semibold hover:underline text-sm" to="/forum">Buka Forum →</Link>
                                </div>
                            </SwiperSlide>
                        </Swiper>
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

                {/* ============ BARAKAH EVENTS CAROUSEL ============ */}
                {events.length > 0 && (
                    <section id="events" className="py-20 px-8 lg:px-24 bg-gray-50">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">Barakah Event</h2>
                                    <p className="text-gray-500 mt-2">Ikuti berbagai kegiatan seru dan bermanfaat</p>
                                </div>
                                <Link to="/events" className="px-6 py-2 border border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition">
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
                                {events.filter(e => e.visibility === 'public').slice(0, 10).map((event) => {
                                    const status = getEventStatus(event.start_date, event.end_date);
                                    return (
                                        <SwiperSlide key={event.id}>
                                            <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-xl transition group">
                                                <Link to={`/event/${event.slug || event.id}`}>
                                                    <div className="relative h-48 overflow-hidden">
                                                        <img
                                                            src={getMediaUrl(event.thumbnail || event.header_image) || '/placeholder-image.jpg'}
                                                            alt={event.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Barakah+Event'; }}
                                                        />
                                                        {status.isFinished && (
                                                            <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
                                                                <span className="text-white font-bold text-sm uppercase tracking-widest border-2 border-white/50 px-3 py-1 rounded rotate-[-10deg]">Selesai</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
                                                            <p className="text-[10px] font-bold text-green-700">
                                                                {new Date(event.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                            </p>
                                                        </div>
                                                        {!status.isFinished && (
                                                            <div className="absolute top-3 right-3">
                                                                <span className={`${status.color} text-white text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider`}>
                                                                    {status.label}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                                <div className="p-4">
                                                    <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 min-h-[40px]">{event.title}</h3>
                                                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                                                        <span className="material-icons text-[14px]">location_on</span>
                                                        <span className="line-clamp-1">{event.location || 'Online'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </SwiperSlide>
                                    );
                                })}
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
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 min-h-[40px]">{product.title}</h3>
                                                </div>
                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-green-700 font-bold text-sm">{formatIDR(product.price)}</p>
                                                    <div className="flex items-center text-gray-400 text-[10px] gap-1">
                                                        <span className="material-icons text-[12px]">visibility</span>
                                                        {product.views_count || 0}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2">Stok: {product.stock > 0 ? product.stock : 'Habis'}</p>
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

                {/* ============ KEGIATAN & BERITA ============ */}
                {activities.length > 0 && (
                    <section className="py-20 px-8 lg:px-24 bg-gray-50">
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Kegiatan Komunitas</h2>
                                    <div className="w-20 h-1 bg-green-600 rounded-full"></div>
                                </div>
                                <Link to="/kegiatan" className="px-6 py-2 border border-green-600 text-green-700 font-semibold rounded-lg hover:bg-green-50 transition">
                                    Lihat Semua
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {activities.map((act) => (
                                    <Link key={act.id} to={`/kegiatan/${act.id}`} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group">
                                        <div className="relative h-48 overflow-hidden">
                                            <img
                                                src={getMediaUrl(act.header_image)}
                                                alt={act.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
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
                                    </Link>
                                ))}
                            </div>
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
                                        <SellerAvatar seller={seller} getMediaUrl={getMediaUrl} />
                                        <p className="font-bold text-gray-900 text-sm group-hover:text-green-700 transition-colors">@{seller.username}</p>
                                        <p className="text-[10px] text-gray-500 py-1">{seller.name}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ============ ARTICLES CAROUSEL ============ */}
                {articles.length > 0 && (
                    <section className="py-20 px-8 lg:px-24 bg-white">
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
                                                        {(t.user_full_name || t.name || 'U').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm leading-tight">{t.user_full_name || t.name || 'User'}</p>
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
                                                        <p className="font-bold text-gray-900 text-sm leading-tight">User {i}</p>
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

                {/* ============ OUR PARTNERS & MITRA ============ */}
                {(partners.some(p => p.type === 'partner') || partners.some(p => p.type === 'mitra')) && (
                    <section className="py-16 px-8 lg:px-24 bg-white border-t border-gray-100">
                        <div className="max-w-6xl mx-auto space-y-16">
                            {/* Partners */}
                            {partners.some(p => p.type === 'partner') && (
                                <div>
                                    <div className="text-center mb-10">
                                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Partner Kami</h2>
                                        <div className="w-16 h-1 bg-green-600 mx-auto rounded-full mb-4"></div>
                                        <p className="text-gray-500 text-sm">Kolaborasi strategis untuk kemajuan ekonomi syariah</p>
                                    </div>
                                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                                        {partners.filter(p => p.type === 'partner').map((partner) => (
                                            <div 
                                                key={partner.id} 
                                                onClick={() => {
                                                    if (partner.link) {
                                                        window.open(partner.link, '_blank');
                                                    } else {
                                                        setSelectedPartner(partner);
                                                    }
                                                }}
                                                className="w-24 h-24 md:w-28 md:h-28 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex items-center justify-center hover:shadow-md hover:border-green-200 transition-all group cursor-pointer"
                                            >
                                                <img
                                                    src={getMediaUrl(partner.logo)}
                                                    alt={partner.name}
                                                    className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                                                    title={partner.name}
                                                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Mitra */}
                            {partners.some(p => p.type === 'mitra') && (
                                <div>
                                    <div className="text-center mb-10">
                                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Mitra Kami</h2>
                                        <div className="w-12 h-1 bg-blue-500 mx-auto rounded-full mb-4"></div>
                                        <p className="text-gray-500 text-sm">Bertumbuh bersama ekosistem Barakah Economy</p>
                                    </div>
                                    <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                                        {partners.filter(p => p.type === 'mitra').map((partner) => (
                                            <div 
                                                key={partner.id} 
                                                onClick={() => {
                                                    if (partner.link) {
                                                        window.open(partner.link, '_blank');
                                                    } else {
                                                        setSelectedPartner(partner);
                                                    }
                                                }}
                                                className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl shadow-sm border border-gray-100 p-2.5 flex items-center justify-center hover:shadow-md hover:border-blue-100 transition-all group cursor-pointer"
                                            >
                                                <img
                                                    src={getMediaUrl(partner.logo)}
                                                    alt={partner.name}
                                                    className="max-w-full max-h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
                                                    title={partner.name}
                                                    onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* ============ ABOUT US (paling bawah) ============ */}
                <section id="about" className="py-20 px-8 lg:px-24 bg-white border-t border-gray-100">
                    <div className="max-w-6xl mx-auto">
                        <div 
                            onClick={() => navigate('/about')}
                            className="bg-gray-50 rounded-[3rem] p-10 md:p-16 flex flex-col md:flex-row items-center gap-12 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition duration-500 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-100/50 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-green-200/50 transition duration-500"></div>
                            
                            <div className="md:w-1/2 space-y-8 relative z-10">
                                <div>
                                    <h2 className="text-4xl font-black text-gray-900 mb-6 flex items-center gap-4">
                                        <span className="w-2 h-10 bg-green-600 rounded-full"></span>
                                        Tentang Kami
                                    </h2>
                                    <p className="text-lg text-gray-600 leading-relaxed line-clamp-4">
                                        {aboutUs?.description || `BAE Community berdiri pada tanggal 29 Februari 2024 di Bandung. Tujuan BAE Community adalah meningkatkan kestabilan finansial masyarakat melalui pengembangan ekosistem ekonomi yang berlandaskan syariah Islam.`}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 group-hover:border-green-300 transition">
                                        <span className="material-icons text-green-600">visibility</span>
                                        <span className="font-bold text-gray-800 text-sm">Visi & Misi</span>
                                    </div>
                                    <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 group-hover:border-blue-300 transition">
                                        <span className="material-icons text-blue-600">gavel</span>
                                        <span className="font-bold text-gray-800 text-sm">Legalitas</span>
                                    </div>
                                </div>
                                <button className="inline-flex items-center gap-2 text-green-700 font-black text-lg group-hover:gap-4 transition-all">
                                    Selengkapnya 
                                    <span className="material-icons">arrow_forward</span>
                                </button>
                            </div>

                            <div className="md:w-1/2 w-full relative">
                                <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white group-hover:scale-[1.02] transition duration-700 relative z-20">
                                    <img 
                                        src={aboutUs?.hero_image ? getMediaUrl(aboutUs.hero_image) : '/icon-512x512.png'} 
                                        alt="Tentang Kami" 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-green-600/10 rounded-full blur-xl"></div>
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
                            <li><Link to="/about" className="hover:text-white transition">Tentang Kami</Link></li>
                            <li><Link to="/charity" className="hover:text-white transition">Charity</Link></li>
                            <li><Link to="/sinergy" className="hover:text-white transition">Sinergy</Link></li>
                            <li><Link to="/academy" className="hover:text-white transition">Academy</Link></li>
                            <li><Link to="/articles" className="hover:text-white transition">Artikel</Link></li>
                            <li><Link to="/digital-products" className="hover:text-white transition">Produk Digital</Link></li>
                            <li><Link to="/forum" className="hover:text-white transition">Forum Tanya Jawab</Link></li>
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

            {/* Partner Detail Modal */}
            {selectedPartner && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up border border-white">
                        <div className="relative h-48 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center p-8">
                            <button 
                                onClick={() => setSelectedPartner(null)}
                                className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-md transition"
                            >
                                <span className="material-icons">close</span>
                            </button>
                            <img 
                                src={getMediaUrl(selectedPartner.logo)} 
                                alt={selectedPartner.name} 
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                        <div className="p-10 space-y-6">
                            <div>
                                <span className="inline-block bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                                    {selectedPartner.type === 'partner' ? 'Strategic Partner' : 'Official Mitra'}
                                </span>
                                <h3 className="text-3xl font-extrabold text-gray-900">{selectedPartner.name}</h3>
                            </div>
                            <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
                                <p>{selectedPartner.description || 'Barakah Economy terus berkolaborasi bersama mitra strategis untuk memperkuat ekosistem ekonomi syariah di Indonesia.'}</p>
                            </div>
                            <div className="pt-4 flex flex-col gap-3">
                                {selectedPartner.link && (
                                    <a 
                                        href={selectedPartner.link} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-800 transition shadow-lg shadow-green-100"
                                    >
                                        <span className="material-icons text-sm">public</span>
                                        Kunjungi Website
                                    </a>
                                )}
                                <button 
                                    onClick={() => setSelectedPartner(null)}
                                    className="w-full py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DesktopLandingPage;
