// pages/CrowdfundingMainPage.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShareButton from '../components/campaigns/ShareButton';
import { formatCurrency } from '../utils/formatters';

const formatIDR = (amount) => {
  return 'Rp ' + formatCurrency(amount);
};

const formatIDRTarget = (amount) => {
  if (amount <= 0) return '∞';
  return 'Rp ' + formatCurrency(amount);
};

const isCampaignExpired = (deadline) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

const formatDeadline = (deadline) => {
  if (!deadline) return 'Aktif Terus';
  const date = new Date(deadline);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getDaysRemaining = (deadline) => {
  if (!deadline) return null;
  const target = new Date(deadline);
  const now = new Date();
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const getButtonLabel = (title = '', isWaqaf = false) => {
  if (isWaqaf) return 'WAKAF / DONASI';
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('infak')) return 'INFAK SEKARANG';
  if (lowerTitle.includes('sedekah')) return 'SEDEKAH SEKARANG';
  if (lowerTitle.includes('zakat')) return 'ZAKAT SEKARANG';
  return 'DONASI SEKARANG';
};

const CHARITY_CATEGORIES = [
  { key: 'all', label: 'Semua Program', icon: 'volunteer_activism' },
  { key: 'bencana', label: 'Bencana Alam', icon: 'crisis_alert' },
  { key: 'kemanusiaan', label: 'Kemanusiaan', icon: 'groups' },
  { key: 'kesehatan', label: 'Kesehatan', icon: 'medical_services' },
  { key: 'pembangunan', label: 'Pembangunan', icon: 'foundation' },
  { key: 'sosial', label: 'Sosial & Duafa', icon: 'handshake' },
  { key: 'waqaf', label: 'Waqaf Produk', icon: 'inventory_2' },
  { key: 'infak', label: 'Infak & Sedekah', icon: 'favorite' },
  { key: 'pendidikan', label: 'Pendidikan', icon: 'school' },
];

const CrowdfundingMainPage = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'mendesak');
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') === 'blocks' ? 'blocks' : 'grid');

  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);

  // Fetch featured campaigns
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/campaigns/`,
          { params: { is_featured: true } }
        );
        const list = Array.isArray(response.data) ? response.data : response.data.results || [];
        setFeaturedCampaigns(list.slice(0, 4));
      } catch (err) {
        console.error('Error fetching featured campaigns:', err);
      }
    };
    fetchFeatured();
  }, []);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/campaigns/`,
        { params }
      );
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setCampaigns(data);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Gagal memuat program charity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCampaigns();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Automatic slider interval
  useEffect(() => {
    if (featuredCampaigns.length > 1) {
      sliderInterval.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % featuredCampaigns.length);
      }, 5500);
    }
    return () => {
      if (sliderInterval.current) clearInterval(sliderInterval.current);
    };
  }, [featuredCampaigns]);

  // Handle query parameter sync
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

  // Filter & Sort campaigns
  const filteredCampaigns = useMemo(() => {
    let list = [...campaigns];

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'waqaf') {
        list = list.filter(c => c.is_collaboration || c.collaboration_type === 'waqaf');
      } else if (selectedCategory === 'infak') {
        list = list.filter(c => (c.category || '').toLowerCase().includes('infak') || (c.category || '').toLowerCase().includes('sedekah'));
      } else {
        list = list.filter(c => (c.category || '').toLowerCase().includes(selectedCategory));
      }
    }

    // Sort
    list.sort((a, b) => {
      const aExpired = isCampaignExpired(a.deadline);
      const bExpired = isCampaignExpired(b.deadline);
      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;

      if (sortBy === 'terbaru') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortBy === 'terkumpul') {
        return Number(b.current_amount || 0) - Number(a.current_amount || 0);
      }
      if (sortBy === 'populer') {
        return (Number(b.view_count || 0) + Number(b.likes_count || 0) * 2) -
               (Number(a.view_count || 0) + Number(a.likes_count || 0) * 2);
      }
      // default: mendesak (deadline terdekat)
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && !b.deadline) return 0;
      return new Date(a.deadline) - new Date(b.deadline);
    });

    return list;
  }, [campaigns, selectedCategory, sortBy]);

  return (
    <div className="body min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      <Helmet>
        <title>Barakah Charity - Salurkan Kebaikan & Wakaf Komunitas</title>
        <meta name="description" content="Salurkan donasi, infak, sedekah, dan wakaf Anda bersama program-program kebaikan komunitas di Barakah Charity." />
        <meta property="og:title" content="Barakah Charity - Berbagi Kebaikan Bersama" />
        <meta property="og:description" content="Dukung berbagai aksi sosial, bantuan bencana, dan wakaf produktif yang telah diverifikasi." />
        <meta property="og:image" content="/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />

      {/* HERO / TOP BANNER SECTION */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 text-white relative overflow-hidden py-6 sm:py-8 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_50%)] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[11px] font-bold tracking-wide uppercase mb-3">
              <span className="material-icons text-sm text-amber-400">volunteer_activism</span>
              <span>Barakah Social & Charity</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Bantu Sesama, Raih <span className="text-amber-400">Keberkahan</span> Abadi
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 leading-relaxed">
              Jembatan kebaikan antara para dermawan, komunitas, dan saudara kita yang membutuhkan. Amanah, transparan, dan terverifikasi.
            </p>
          </div>

          {/* AJUKAN CHARITY CTA BOX (Komunitas / Pengguna bisa posting) */}
          <div className="w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex flex-col items-center md:items-start gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
                <span className="material-icons text-2xl">campaign</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Punya Program Kebaikan?</h4>
                <p className="text-[11px] text-emerald-200">Komunitas & lembaga dapat mengajukan charity</p>
              </div>
            </div>
            <Link
              to="/dashboard/my-campaigns"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md text-center transition transform active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span className="material-icons text-sm">add_circle</span>
              <span>Ajukan Charity Baru</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FEATURED CAMPAIGNS CAROUSEL */}
      {featuredCampaigns.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 -mt-3 sm:-mt-4 relative z-20 mb-6">
          <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/60 bg-white">
            <div className="relative h-56 sm:h-72 md:h-84 overflow-hidden">
              {featuredCampaigns.map((c, idx) => {
                const isExpired = isCampaignExpired(c.deadline);
                const progress = c.target_amount > 0 ? Math.min(100, Math.round((c.current_amount / c.target_amount) * 100)) : 0;
                const daysLeft = getDaysRemaining(c.deadline);

                return (
                  <div
                    key={c.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                      idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={c.thumbnail || '/images/peduli-dhuafa-banner.jpg'}
                      alt={c.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/images/default-campaign.jpg'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/50 to-transparent flex flex-col justify-end p-4 sm:p-8">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <span className="material-icons text-xs">star</span> Pilihan Utama
                        </span>
                        {c.is_collaboration && (
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-500/90 backdrop-blur-xs text-white font-bold text-[10px] flex items-center gap-1">
                            <span className="material-icons text-xs">inventory_2</span> Waqaf Produk
                          </span>
                        )}
                        <span className="text-[11px] text-white/80 ml-auto flex items-center gap-1">
                          <span className="material-icons text-xs">visibility</span> {c.view_count || 0}
                        </span>
                      </div>

                      <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white line-clamp-2 max-w-2xl drop-shadow-sm">
                        {c.title}
                      </h2>

                      {/* Penyelenggara Chip */}
                      <div className="flex items-center gap-2 mt-2 mb-3">
                        <img
                          src={c.organizer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.organizer_name || 'Barakah')}&background=059669&color=fff`}
                          alt={c.organizer_name || 'Penyelenggara'}
                          className="w-5 h-5 rounded-full object-cover border border-amber-300"
                        />
                        <span className="text-xs font-semibold text-emerald-200">
                          {c.organizer_name || 'Barakah Charity Official'}
                        </span>
                        {c.organizer_verified && (
                          <span className="material-icons text-amber-400 text-xs" title="Terverifikasi">verified</span>
                        )}
                      </div>

                      {/* Progress Bar & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/20">
                        <div className="flex-1 max-w-md">
                          <div className="flex justify-between text-xs text-white font-bold mb-1">
                            <span className="text-amber-400">{formatIDR(c.current_amount || 0)}</span>
                            <span className="text-white/70">Target: {formatIDRTarget(c.target_amount || 0)}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-white/70 mt-1">
                            <span>{progress}% Tercapai</span>
                            <span>{daysLeft !== null ? `${daysLeft} hari lagi` : 'Tanpa batas waktu'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/bayar-donasi/${c.slug || c.id}`}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition active:scale-95 flex items-center gap-1.5 ${
                              isExpired
                                ? 'bg-gray-500 text-white cursor-not-allowed pointer-events-none'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-900/40'
                            }`}
                          >
                            <span className="material-icons text-sm">volunteer_activism</span>
                            <span>{getButtonLabel(c.title, c.is_collaboration)}</span>
                          </Link>
                          <ShareButton
                            slug={c.slug || c.id}
                            title={c.title}
                            type="campaign"
                            description={c.description}
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* Slider Dots */}
            {featuredCampaigns.length > 1 && (
              <div className="absolute bottom-3 right-4 z-20 flex gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full">
                {featuredCampaigns.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeSlide ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-6xl mx-auto px-4 mt-6">

        {/* SEARCH & FILTER CONTROLS BAR (Mirip Store) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xs mb-5">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700 text-lg">search</span>
              <input
                type="text"
                placeholder="Cari program charity, bencana, wakaf, atau nama komunitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
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

            {/* Controls (Sort & View Mode) */}
            <div className="flex items-center gap-2.5 justify-between sm:justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="mendesak">Paling Mendesak</option>
                  <option value="populer">Paling Populer</option>
                  <option value="terbaru">Program Terbaru</option>
                  <option value="terkumpul">Dana Terbanyak</option>
                </select>
              </div>

              {/* View Mode Toggle: Grid vs Blocks */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleToggleView('grid')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'grid' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tampilan Grid"
                >
                  <span className="material-icons text-base">grid_view</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleView('blocks')}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === 'blocks' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Tampilan List / Blocks"
                >
                  <span className="material-icons text-base">view_agenda</span>
                </button>
              </div>
            </div>
          </div>

          {/* Category Chips Scrollable */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 mt-3 border-t border-slate-100 scrollbar-none">
            {CHARITY_CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategorySelect(cat.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-sm shadow-emerald-200'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  <span className={`material-icons text-sm ${isActive ? 'text-amber-300' : 'text-emerald-700'}`}>
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION HEADER & TOTAL COUNT */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-5 bg-gradient-to-b from-amber-400 to-emerald-600 rounded-full"></span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Daftar Program Charity ({filteredCampaigns.length})
            </h2>
          </div>
          <ShareButton slug="charity" title="Barakah Charity - Berbagi Kebaikan" type="charity_page" />
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin mb-4"></div>
            <p className="text-xs font-bold text-slate-500 animate-pulse">Memuat program charity...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-xs my-6">
            <p>{error}</p>
            <button
              onClick={fetchCampaigns}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-6 shadow-xs max-w-md mx-auto">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-icons text-3xl">volunteer_activism</span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Tidak Ada Program Ditemukan</h3>
            <p className="text-xs text-slate-500 mb-5">
              Belum ada program charity yang sesuai dengan pencarian atau filter yang dipilih.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="px-5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl shadow hover:bg-emerald-800 transition"
            >
              Tampilkan Semua Program
            </button>
          </div>
        ) : (
          /* CAMPAIGNS LISTING (GRID OR BLOCKS VIEW) */
          <div className={
            viewMode === 'blocks'
              ? 'space-y-4'
              : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5'
          }>
            {filteredCampaigns.map((campaign) => {
              const isExpired = isCampaignExpired(campaign.deadline);
              const deadlineText = formatDeadline(campaign.deadline);
              const daysLeft = getDaysRemaining(campaign.deadline);
              const progress = campaign.target_amount > 0
                ? Math.min(100, Math.round((Number(campaign.current_amount || 0) / Number(campaign.target_amount)) * 100))
                : 0;

              if (viewMode === 'blocks') {
                /* BLOCKS VIEW (HORIZONTAL CARD) */
                return (
                  <div
                    key={campaign.id}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row group"
                  >
                    {/* Thumbnail */}
                    <div className="relative sm:w-56 md:w-64 h-40 sm:h-auto shrink-0 bg-slate-100 overflow-hidden">
                      <Link to={`/kampanye/${campaign.slug || campaign.id}`} className="block h-full">
                        <img
                          src={campaign.thumbnail || '/images/default-campaign.jpg'}
                          alt={campaign.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.target.src = '/images/default-campaign.jpg'; }}
                        />
                      </Link>
                      {campaign.is_collaboration && (
                        <div className="absolute top-2 left-2 bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow uppercase">
                          Waqaf Produk
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <ShareButton
                          slug={campaign.slug || campaign.id}
                          title={campaign.title}
                          type="campaign"
                          description={campaign.description}
                          variant="card-icon"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Organizer / Komunitas Penyelenggara */}
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1.5">
                          <img
                            src={campaign.organizer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign.organizer_name || 'Barakah')}&background=059669&color=fff`}
                            alt={campaign.organizer_name}
                            className="w-4 h-4 rounded-full object-cover border border-emerald-200 shrink-0"
                          />
                          <span className="font-bold text-emerald-800 truncate">
                            {campaign.organizer_name || 'Barakah Charity'}
                          </span>
                          {campaign.organizer_verified && (
                            <span className="material-icons text-amber-500 text-[13px]" title="Penyelenggara Terverifikasi">verified</span>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="capitalize text-[10px] text-slate-400">{campaign.category || 'Charity'}</span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 mb-2">
                          <Link to={`/kampanye/${campaign.slug || campaign.id}`}>
                            {campaign.title}
                          </Link>
                        </h3>

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex justify-between items-baseline text-xs mb-1">
                            <span className="font-bold text-emerald-700">{formatIDR(campaign.current_amount || 0)}</span>
                            <span className="text-slate-400 text-[11px]">Target: {formatIDRTarget(campaign.target_amount || 0)}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                            <span className="font-semibold text-emerald-700">{progress}% terkumpul</span>
                            <span>{daysLeft !== null ? `${daysLeft} hari lagi` : 'Tanpa batas waktu'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                          <span className="flex items-center gap-1"><span className="material-icons text-xs">visibility</span> {campaign.view_count || 0}</span>
                          <span className="flex items-center gap-1 text-rose-500"><span className="material-icons text-xs">favorite</span> {campaign.likes_count || 0}</span>
                        </div>
                        <Link
                          to={`/bayar-donasi/${campaign.slug || campaign.id}`}
                          className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                            isExpired
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95'
                          }`}
                        >
                          {getButtonLabel(campaign.title, campaign.is_collaboration)}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }

              /* GRID VIEW (2 COLS MOBILE / 4 COLS DESKTOP - PERSIS STORE DESIGN) */
              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  {/* Top Image Box */}
                  <div className="relative overflow-hidden bg-slate-100">
                    {campaign.is_collaboration && (
                      <div className="absolute top-2 left-2 z-10 bg-teal-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow uppercase tracking-wider flex items-center gap-0.5">
                        <span className="material-icons text-[10px]">inventory_2</span> Waqaf
                      </div>
                    )}
                    {campaign.is_featured && (
                      <div className="absolute top-2 left-2 z-10 bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-lg shadow uppercase tracking-wider flex items-center gap-0.5">
                        <span className="material-icons text-[10px]">star</span> Pilihan
                      </div>
                    )}
                    <Link to={`/kampanye/${campaign.slug || campaign.id}`}>
                      <img
                        src={campaign.thumbnail || '/images/default-campaign.jpg'}
                        alt={campaign.title}
                        className="w-full h-32 sm:h-38 md:h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { e.target.src = '/images/default-campaign.jpg'; }}
                      />
                    </Link>
                    <div className="absolute top-2 right-2 z-10">
                      <ShareButton
                        slug={campaign.slug || campaign.id}
                        title={campaign.title}
                        type="campaign"
                        description={campaign.description}
                        variant="card-icon"
                      />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between">
                    <div>
                      {/* Penyelenggara / Komunitas Badge */}
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-1.5" title={`Penyelenggara: ${campaign.organizer_name || 'Barakah Charity'}`}>
                        <img
                          src={campaign.organizer_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(campaign.organizer_name || 'Barakah')}&background=059669&color=fff`}
                          alt={campaign.organizer_name || 'Penyelenggara'}
                          className="w-3.5 h-3.5 rounded-full object-cover border border-emerald-100 shrink-0"
                        />
                        <span className="font-bold text-emerald-800 truncate max-w-[120px] sm:max-w-[140px]">
                          {campaign.organizer_name || 'Barakah Charity'}
                        </span>
                        {campaign.organizer_verified && (
                          <span className="material-icons text-amber-500 text-[11px]">verified</span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2 min-h-[34px] sm:min-h-[40px] mb-2 leading-snug">
                        <Link to={`/kampanye/${campaign.slug || campaign.id}`}>
                          {campaign.title}
                        </Link>
                      </h3>

                      {/* Collected Amount */}
                      <div className="mb-2">
                        <p className="text-[10px] text-slate-400 font-medium">Terkumpul</p>
                        <p className="text-xs sm:text-sm font-extrabold text-emerald-700">
                          {formatIDR(campaign.current_amount || 0)}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1.5">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-3">
                        <span className="font-semibold text-emerald-800">{progress}%</span>
                        <span className="truncate max-w-[100px] text-right">
                          {daysLeft !== null ? `${daysLeft} hari lagi` : '∞'}
                        </span>
                      </div>
                    </div>

                    {/* Button Action */}
                    <div className="pt-2 border-t border-slate-100">
                      <Link
                        to={`/bayar-donasi/${campaign.slug || campaign.id}`}
                        className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1 text-[11px] transition shadow-xs ${
                          isExpired
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95'
                        }`}
                      >
                        <span className="material-icons text-xs">volunteer_activism</span>
                        <span>{getButtonLabel(campaign.title, campaign.is_collaboration)}</span>
                      </Link>
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

export default CrowdfundingMainPage;