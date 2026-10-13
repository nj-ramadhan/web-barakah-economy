// pages/ServicesMainPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShareButton from '../components/campaigns/ShareButton';
import { getServices, toggleLikeService } from '../services/serviceApi';
import { formatCurrency } from '../utils/formatters';

const formatIDR = (val) => {
  if (!val || Number(val) === 0) return 'Gratis';
  return 'Rp ' + formatCurrency(val);
};

const SERVICE_CATEGORIES = [
  { key: 'all', label: 'Semua Jasa', icon: 'handyman' },
  { key: 'elektronik_it', label: 'Elektronik & IT', icon: 'devices' },
  { key: 'desain_kreatif', label: 'Desain & Kreatif', icon: 'palette' },
  { key: 'rumah_tukang', label: 'Pertukangan & Rumah', icon: 'home_repair_service' },
  { key: 'pendidikan_kursus', label: 'Pendidikan & Les', icon: 'school' },
  { key: 'kesehatan_terapi', label: 'Kesehatan & Terapi', icon: 'medical_services' },
  { key: 'bisnis_legal', label: 'Bisnis & Legal', icon: 'gavel' },
  { key: 'transportasi_logistik', label: 'Transport & Angkut', icon: 'local_shipping' },
  { key: 'acara_fotografi', label: 'Acara & Foto', icon: 'camera_alt' },
  { key: 'kebersihan_laundry', label: 'Kebersihan & Cuci', icon: 'cleaning_services' },
  { key: 'otomotif', label: 'Servis Otomotif', icon: 'directions_car' },
  { key: 'kuliner_katering', label: 'Katering & Masak', icon: 'restaurant' },
  { key: 'lainnya', label: 'Layanan Lainnya', icon: 'category' },
];

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatWaUrl = (phone, title, sellerName) => {
  if (!phone) return '#';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const msg = encodeURIComponent(
    `Halo kak ${sellerName || ''}, saya melihat jasa *${title}* di Barakah Economy dan tertarik untuk menggunakan / konsultasi jasanya. Boleh minta info lebih lanjut? Terima kasih!`
  );
  return `https://wa.me/${waPhone}?text=${msg}`;
};

const ServicesMainPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'terbaru');
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') === 'blocks' ? 'blocks' : 'grid');

  const fetchServicesData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (sortBy) params.sort = sortBy;

      const res = await getServices(params);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setServices(data);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Gagal memuat daftar produk jasa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchServicesData();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, selectedCategory, sortBy]);

  const handleCategorySelect = (catKey) => {
    setSelectedCategory(catKey);
    const p = new URLSearchParams(searchParams);
    if (catKey === 'all') p.delete('category');
    else p.set('category', catKey);
    setSearchParams(p, { replace: true });
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortBy(val);
    const p = new URLSearchParams(searchParams);
    p.set('sort', val);
    setSearchParams(p, { replace: true });
  };

  const handleToggleView = (mode) => {
    setViewMode(mode);
    const p = new URLSearchParams(searchParams);
    p.set('view', mode);
    setSearchParams(p, { replace: true });
  };

  const handleLike = async (slug, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await toggleLikeService(slug);
      setServices(prev => prev.map(s => {
        if (s.slug === slug) {
          return {
            ...s,
            is_liked: res.data.liked,
            likes_count: res.data.likes_count
          };
        }
        return s;
      }));
    } catch (err) {
      console.error('Error liking service:', err);
    }
  };

  return (
    <div className="body min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      <Helmet>
        <title>Produk Jasa & Keahlian - Barakah Economy</title>
        <meta name="description" content="Temukan berbagai layanan dan produk jasa profesional terpercaya dari komunitas Barakah Economy. Hubungi langsung penyedia jasa via WhatsApp." />
        <meta property="og:title" content="Layanan & Produk Jasa - Barakah Economy" />
        <meta property="og:description" content="Katalog layanan jasa profesional dari para mitra dan anggota Barakah Economy." />
        <meta property="og:image" content="/images/web-thumbnail.jpg" />
      </Helmet>

      <Header />

      {/* HERO BANNER SECTION */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 text-white relative overflow-hidden py-7 sm:py-9 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_50%)] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3">
              <span className="material-icons text-sm text-indigo-400">handyman</span>
              <span>Barakah Services Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Katalog <span className="text-indigo-400">Produk Jasa</span> & Keahlian Profesional
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Solusi berbagai kebutuhan Anda dari para praktisi dan mitra terpercaya. Tarif jelas, konsultasi mudah & transaksi langsung tanpa perantara.
            </p>
          </div>

          {/* CTA POST JASA UNTUK USER */}
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col items-center md:items-start gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black shadow-md">
                <span className="material-icons text-2xl">work</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Tawarkan Jasa Anda</h4>
                <p className="text-[11px] text-indigo-200">Promosikan keahlian Anda ke ribuan pengguna</p>
              </div>
            </div>
            <Link
              to="/dashboard/services"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md text-center transition transform active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span className="material-icons text-sm">add_circle</span>
              <span>Kelola Jasa Saya</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 mt-6">

        {/* SEARCH & CONTROLS BAR (Persis Struktur Store) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xs mb-5">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 text-lg">search</span>
              <input
                type="text"
                placeholder="Cari jasa (misal: servis AC, desain logo, guru les, catering, dll)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              )}
            </div>

            {/* Sort & View Mode */}
            <div className="flex items-center gap-2.5 justify-between sm:justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="terbaru">Jasa Terbaru</option>
                  <option value="populer">Paling Banyak Dilihat</option>
                  <option value="termurah">Tarif Terendah</option>
                  <option value="termahal">Tarif Tertinggi</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleToggleView('grid')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tampilan Grid"
                >
                  <span className="material-icons text-base">grid_view</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleView('blocks')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'blocks' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tampilan List / Blocks"
                >
                  <span className="material-icons text-base">view_agenda</span>
                </button>
              </div>
            </div>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 mt-3 border-t border-slate-100 scrollbar-none">
            {SERVICE_CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategorySelect(cat.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  <span className={`material-icons text-sm ${isActive ? 'text-indigo-200' : 'text-indigo-600'}`}>
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-5 bg-gradient-to-b from-indigo-500 to-emerald-600 rounded-full"></span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Daftar Produk Jasa ({services.length})
            </h2>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
            <p className="text-xs font-bold text-slate-500 animate-pulse">Memuat produk jasa...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-xs my-6">
            <p>{error}</p>
            <button
              onClick={fetchServicesData}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
            >
              Coba Lagi
            </button>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-6 shadow-xs max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-icons text-3xl">handyman</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Belum Ada Produk Jasa</h3>
            <p className="text-xs text-slate-500 mb-5">
              Belum ada jasa yang cocok dengan kriteria pencarian ini. Anda memiliki keahlian? Ajukan sekarang!
            </p>
            <Link
              to="/dashboard/services"
              className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow hover:bg-indigo-700 transition"
            >
              Tambah Jasa Pertama Anda
            </Link>
          </div>
        ) : (
          /* SERVICES LISTING (GRID OR BLOCKS) */
          <div className={
            viewMode === 'blocks'
              ? 'space-y-4'
              : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5'
          }>
            {services.map((item) => {
              const waUrl = formatWaUrl(item.effective_whatsapp, item.title, item.seller_full_name || item.seller_name);
              const storeUrl = item.seller_shop_name
                ? `/store/${item.seller_shop_name}`
                : `/store/${item.seller_name}`;

              if (viewMode === 'blocks') {
                /* BLOCKS VIEW (HORIZONTAL) */
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row group"
                  >
                    <div className="relative sm:w-56 md:w-64 h-40 sm:h-auto shrink-0 bg-slate-100 overflow-hidden">
                      <Link to={`/jasa/${item.slug || item.id}`} className="block h-full">
                        <img
                          src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                        />
                      </Link>
                      <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow uppercase">
                        {item.category_display || 'Jasa'}
                      </div>
                      <div className="absolute top-2 right-2">
                        <ShareButton
                          slug={`jasa/${item.slug || item.id}`}
                          title={item.title}
                          type="service"
                          description={item.description}
                          variant="card-icon"
                        />
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Lokasi & Seller */}
                        <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-1.5">
                          <span className="material-icons text-xs text-indigo-600">location_on</span>
                          <span className="truncate max-w-[130px] font-medium">{item.seller_city || 'Indonesia'}</span>
                          <span className="text-slate-300">•</span>
                          <Link to={storeUrl} className="font-bold text-indigo-700 hover:underline truncate max-w-[130px]">
                            @{item.seller_shop_name || item.seller_name}
                          </Link>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-indigo-700 transition line-clamp-2 mb-2">
                          <Link to={`/jasa/${item.slug || item.id}`}>
                            {item.title}
                          </Link>
                        </h3>

                        {/* Price Rate */}
                        <div className="flex items-baseline gap-1.5 mb-2">
                          <span className="text-base font-extrabold text-emerald-700">
                            {Number(item.price) > 0 ? formatIDR(item.price) : 'Tarif Fleksibel'}
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            {item.price_rate || '/sesi'}
                          </span>
                        </div>

                        {/* Description Preview */}
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                          {item.description || 'Penyedia jasa terpercaya di Barakah Economy.'}
                        </p>
                      </div>

                      {/* Action direct to WA */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1"><span className="material-icons text-xs">visibility</span> {item.views_count || 0}</span>
                          <button
                            type="button"
                            onClick={(e) => handleLike(item.slug || item.id, e)}
                            className={`flex items-center gap-1 transition ${item.is_liked ? 'text-rose-500' : 'hover:text-rose-500'}`}
                          >
                            <span className="material-icons text-xs">{item.is_liked ? 'favorite' : 'favorite_border'}</span>
                            <span>{item.likes_count || 0}</span>
                          </button>
                        </div>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 transition active:scale-95 flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                          </svg>
                          <span>Pesan via WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              }

              /* GRID VIEW (PERSIS PRODUK STORE) */
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="relative overflow-hidden bg-slate-100">
                    <div className="absolute top-2 left-2 z-10 bg-indigo-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow uppercase tracking-wider">
                      {item.category_display || 'Jasa'}
                    </div>
                    <Link to={`/jasa/${item.slug || item.id}`}>
                      <img
                        src={getMediaUrl(item.thumbnail) || '/placeholder-image.jpg'}
                        alt={item.title}
                        className="w-full h-32 sm:h-38 md:h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                      />
                    </Link>
                    <div className="absolute top-2 right-2 z-10">
                      <ShareButton
                        slug={`jasa/${item.slug || item.id}`}
                        title={item.title}
                        type="service"
                        description={item.description}
                        variant="card-icon"
                      />
                    </div>
                  </div>

                  <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between">
                    <div>
                      {/* Lokasi Kota */}
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] font-medium mb-1">
                        <span className="material-icons text-[12px] text-indigo-600 shrink-0">location_on</span>
                        <span className="truncate max-w-[130px]">{item.seller_city || 'Indonesia'}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-semibold mb-1.5 line-clamp-2 min-h-[34px] sm:min-h-[40px] text-slate-800 group-hover:text-indigo-700 transition-colors">
                        <Link to={`/jasa/${item.slug || item.id}`}>
                          {item.title}
                        </Link>
                      </h3>

                      {/* Rate Harga */}
                      <div className="mb-2">
                        <p className="text-emerald-700 font-extrabold text-xs sm:text-sm">
                          {Number(item.price) > 0 ? formatIDR(item.price) : 'Tarif Fleksibel'}
                          <span className="text-[10px] font-normal text-slate-400 block sm:inline sm:ml-1">
                            {item.price_rate || '/sesi'}
                          </span>
                        </p>
                      </div>

                      {/* Profil Penyedia Jasa */}
                      <div className="flex items-center gap-2 mb-3 pt-1 border-t border-slate-50">
                        <div className="flex items-center text-slate-400 text-[10px] gap-1" title="Dilihat">
                          <span className="material-icons text-[12px] text-indigo-500">visibility</span>
                          <span className="font-semibold text-slate-600">{item.views_count || 0}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleLike(item.slug || item.id, e)}
                          className={`flex items-center text-[10px] gap-1 ml-1 transition ${item.is_liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                          title="Sukai Jasa"
                        >
                          <span className="material-icons text-[12px]">{item.is_liked ? 'favorite' : 'favorite_border'}</span>
                          <span>{item.likes_count || 0}</span>
                        </button>
                        <Link
                          to={storeUrl}
                          className="flex items-center gap-1 ml-auto hover:bg-indigo-50 px-1 py-0.5 rounded transition truncate max-w-[90px] sm:max-w-[110px]"
                          title={`Kunjungi Toko ${item.seller_shop_name || item.seller_name}`}
                        >
                          <img
                            src={getMediaUrl(item.seller_avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.seller_shop_name || item.seller_name || 'User')}&background=6366f1&color=fff`}
                            alt={item.seller_name}
                            className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                          />
                          <span className="text-[9px] font-bold text-indigo-700 truncate">@{item.seller_shop_name || item.seller_name}</span>
                        </Link>
                      </div>
                    </div>

                    {/* Direct to WhatsApp Button (Skip payment & cart!) */}
                    <div className="pt-2 border-t border-slate-100">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 text-[11px]"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        <span>Hubungi via WA</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <NavigationButton />
    </div>
  );
};

export default ServicesMainPage;
