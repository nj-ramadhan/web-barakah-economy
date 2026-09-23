// pages/StoreProfilePage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getPublicDigitalProfile } from '../services/digitalProductApi';
import { createStoreChat } from '../services/chatApi';
import { getMediaUrl } from '../utils/mediaUtils';
import { formatCurrency } from '../utils/formatters';
import '../styles/Body.css';

const formatIDR = (amount) => {
  return 'Rp ' + formatCurrency(amount || 0);
};

const StoreProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'digital' | 'about'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [sortBy, setSortBy] = useState('populer'); // 'populer' | 'terlaris' | 'price_asc' | 'price_desc' | 'newest'
  const [shareToast, setShareToast] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getPublicDigitalProfile(username);
        setProfileData(res.data);
      } catch (err) {
        console.error('Error fetching store profile:', err);
      } finally {
        setLoading(false);
      }
    };
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const profile = profileData?.profile || {};
  const physicalProducts = useMemo(() => profileData?.ecommerce_products || [], [profileData]);
  const digitalProducts = useMemo(() => profileData?.products || [], [profileData]);
  const courses = useMemo(() => profileData?.courses || [], [profileData]);

  // Total sales across all physical products
  const totalSold = useMemo(() => {
    return physicalProducts.reduce((sum, p) => sum + (Number(p.sold_count) || 0), 0);
  }, [physicalProducts]);

  // Unique categories for the physical products
  const storeCategories = useMemo(() => {
    const map = new Map();
    physicalProducts.forEach(p => {
      const catKey = p.category || 'lainnya';
      const catLabel = p.category_display || p.category_name || (p.category ? p.category.replace(/[-_]/g, ' ').toUpperCase() : 'Lainnya');
      if (!map.has(catKey)) {
        map.set(catKey, { key: catKey, label: catLabel, count: 0 });
      }
      map.get(catKey).count += 1;
    });
    const list = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return [{ key: 'Semua', label: 'Semua', count: physicalProducts.length }, ...list];
  }, [physicalProducts]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    let list = [...physicalProducts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.category_display && p.category_display.toLowerCase().includes(q))
      );
    }

    if (selectedCategory && selectedCategory !== 'Semua') {
      const target = selectedCategory.toLowerCase().trim();
      list = list.filter(p => {
        const catKey = (p.category || 'lainnya').toLowerCase().trim();
        const catDisplay = (p.category_display || p.category_name || '').toLowerCase().trim();
        return catKey === target || catDisplay === target || catKey.replace(/[-_]/g, ' ') === target.replace(/[-_]/g, ' ');
      });
    }

    // Sort
    return list.sort((a, b) => {
      const stockA = Number(a.total_stock ?? a.stock ?? 0);
      const stockB = Number(b.total_stock ?? b.stock ?? 0);
      const inStockA = stockA > 0 ? 1 : 0;
      const inStockB = stockB > 0 ? 1 : 0;
      if (inStockA !== inStockB) return inStockB - inStockA;

      if (sortBy === 'terlaris') {
        return (Number(b.sold_count) || 0) - (Number(a.sold_count) || 0);
      }
      if (sortBy === 'price_asc') {
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      }
      if (sortBy === 'price_desc') {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      // 'populer'
      const soldDiff = (Number(b.sold_count) || 0) - (Number(a.sold_count) || 0);
      if (soldDiff !== 0) return soldDiff;
      return (Number(b.views_count) || 0) - (Number(a.views_count) || 0);
    });
  }, [physicalProducts, searchQuery, selectedCategory, sortBy]);

  const handleCopyLink = () => {
    const storeUrl = `${window.location.origin}/toko/${username}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUrl).then(() => {
        setShareToast('Tautan toko berhasil disalin!');
        setTimeout(() => setShareToast(''), 3000);
      });
    } else {
      setShareToast('Tautan: ' + storeUrl);
      setTimeout(() => setShareToast(''), 3000);
    }
  };

  const handleShareStore = () => {
    const storeUrl = `${window.location.origin}/toko/${username}`;
    const shareTitle = `Toko ${profile.name_full || username} di Barakah Economy`;
    const shareText = `Yuk cek berbagai produk terbaik dari Toko @${username} di Barakah Economy!`;

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: storeUrl
      }).catch(err => {
        console.log('Share dismissed', err);
      });
    } else {
      setShowShareModal(true);
    }
  };

  const handleChatSeller = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/login');
      return;
    }

    if (profile?.user_id && String(profile.user_id) === String(user.id)) {
      alert('Ini adalah toko Anda sendiri.');
      return;
    }

    setIsStartingChat(true);
    try {
      const sellerId = profile?.user_id || (physicalProducts[0]?.seller);
      if (!sellerId) {
        alert('Penjual tidak dapat dihubungi saat ini.');
        return;
      }
      const res = await createStoreChat(sellerId, null);
      if (res.data && res.data.id) {
        navigate(`/chat/${res.data.id}`);
      } else {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Error starting store chat:', err);
      navigate('/chat');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = profile.phone || physicalProducts[0]?.seller_phone;
    if (!phone) {
      alert('Nomor WhatsApp penjual tidak tersedia.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const msg = encodeURIComponent(`Halo Toko @${username}, saya melihat toko Anda di Barakah Economy.`);
    window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="body min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-emerald-600 border-t-transparent"></div>
          <p className="mt-4 text-sm font-semibold text-slate-500 animate-pulse">Memuat etalase toko...</p>
        </div>
        <NavigationButton />
      </div>
    );
  }

  if (!profileData || (!profile.name_full && physicalProducts.length === 0 && digitalProducts.length === 0)) {
    return (
      <div className="body min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
            <span className="material-icons text-4xl">storefront</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Toko Tidak Ditemukan</h2>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            Toko dengan username <strong className="text-slate-700">@{username}</strong> belum terdaftar atau produk belum tersedia.
          </p>
          <button
            onClick={() => navigate('/store')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-200 transition"
          >
            Jelajahi Barakah Store
          </button>
        </div>
        <NavigationButton />
      </div>
    );
  }

  return (
    <div className="body min-h-screen bg-slate-50 text-slate-900 pb-24">
      <Helmet>
        <title>{`Toko ${profile.name_full || username} (@${username}) | Barakah Economy`}</title>
        <meta name="description" content={profile.shop_description || `Koleksi produk terlengkap dari Toko @${username} di Barakah Economy.`} />
        <meta property="og:title" content={`Toko ${profile.name_full || username} - Barakah Economy`} />
        <meta property="og:description" content={profile.shop_description || `Beli aneka produk berkualitas langsung dari Toko @${username}`} />
        {profile.picture && <meta property="og:image" content={getMediaUrl(profile.picture)} />}
      </Helmet>

      <Header />

      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="material-icons text-emerald-400 text-base">check_circle</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 overflow-x-auto whitespace-nowrap py-1">
          <Link to="/store" className="hover:text-emerald-700 font-medium transition flex items-center gap-1">
            <span className="material-icons text-sm">home</span>
            <span>Store</span>
          </Link>
          <span className="material-icons text-[12px] text-slate-400">chevron_right</span>
          <span className="text-slate-400">Toko</span>
          <span className="material-icons text-[12px] text-slate-400">chevron_right</span>
          <span className="text-slate-800 font-bold">@{username}</span>
        </div>

        {/* MARKETPLACE STORE HEADER CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mb-6 relative">
          
          {/* Banner / Cover */}
          <div className="h-36 sm:h-48 md:h-56 w-full relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800">
            {profile.shop_thumbnail ? (
              <img
                src={getMediaUrl(profile.shop_thumbnail)}
                alt="Banner Toko"
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 opacity-95">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
              </div>
            )}
            
            {/* Quick Share Pill on Banner (Top Right) */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareStore}
                className="px-3.5 py-1.5 bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
                title="Bagikan Toko Ini"
              >
                <span className="material-icons text-sm text-emerald-700">share</span>
                <span className="hidden sm:inline">Bagikan Toko</span>
              </button>
            </div>
          </div>

          {/* Profile Identity Details (Overlapping Banner) */}
          <div className="px-4 sm:px-8 pb-6 pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12 sm:-mt-16 relative z-10">
              
              {/* Avatar + Main Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3.5 sm:gap-5 text-center sm:text-left">
                {/* Store Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl border-4 border-white overflow-hidden bg-white shadow-lg flex items-center justify-center">
                    {profile.picture ? (
                      <img
                        src={getMediaUrl(profile.picture)}
                        alt={username}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-3xl select-none">
                        {(profile.name_full || username || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-md border-2 border-white" title="Penjual Terverifikasi">
                    <span className="material-icons text-xs block">verified</span>
                  </div>
                </div>

                {/* Name & Badges */}
                <div className="min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {profile.name_full || username}
                    </h1>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="material-icons text-[13px]">storefront</span>
                      Official Seller
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                    @{username}
                  </p>

                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                    {profile.city_name && (
                      <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                        <span className="material-icons text-sm text-rose-500">location_on</span>
                        {profile.city_name}
                      </span>
                    )}
                    {profile.joined_date && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <span className="material-icons text-sm text-slate-400">calendar_month</span>
                        Bergabung {new Date(profile.joined_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Chat, WhatsApp & Lihat Laman Digital */}
              <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={handleChatSeller}
                  disabled={isStartingChat}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                >
                  {isStartingChat ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-icons text-base">chat</span>
                      <span>Chat Penjual</span>
                    </>
                  )}
                </button>

                {(profile.phone || physicalProducts[0]?.seller_phone) && (
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                    title="Hubungi via WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                )}

                {/* Button untuk Melihat ke Laman Produk Digital */}
                <Link
                  to={`/digital-produk/${username}`}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-200 flex items-center gap-1.5 transition active:scale-95"
                  title="Lihat Halaman Produk Digital & E-Course Seller"
                >
                  <span className="material-icons text-base">devices</span>
                  <span>Produk Digital</span>
                </Link>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
                  title="Salin Link Toko"
                >
                  <span className="material-icons text-base">link</span>
                </button>
              </div>
            </div>

            {/* Store Description Quote */}
            {profile.shop_description && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs sm:text-sm text-slate-600 italic line-clamp-2">
                  "{profile.shop_description}"
                </p>
              </div>
            )}

            {/* Store Stats Counters */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">Produk Fisik</span>
                <span className="text-base sm:text-lg font-black text-slate-900">{physicalProducts.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">Total Terjual</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">{totalSold}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">Produk Digital</span>
                <span className="text-base sm:text-lg font-black text-blue-700">{digitalProducts.length + courses.length}</span>
              </div>
              <div className="hidden sm:block p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">Status Toko</span>
                <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Aktif Melayani
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">storefront</span>
            <span>Semua Produk Toko ({physicalProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('digital')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'digital'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">devices</span>
            <span>Produk Digital & E-Course ({digitalProducts.length + courses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'about'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">info</span>
            <span>Info & Jadwal Toko</span>
          </button>
        </div>

        {/* TAB 1: SEMUA PRODUK TOKO (MARKETPLACE CATALOG) */}
        {activeTab === 'products' && (
          <div>
            {/* Search & Sort Controls Inside Store */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs mb-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Search Inside Store */}
              <div className="relative flex-1">
                <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder={`Cari produk di toko @${username}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
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

              {/* Sort Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">Urutkan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="populer">Paling Populer</option>
                  <option value="terlaris">Paling Terlaris</option>
                  <option value="newest">Produk Terbaru</option>
                  <option value="price_asc">Harga Terendah</option>
                  <option value="price_desc">Harga Tertinggi</option>
                </select>
              </div>
            </div>

            {/* Category Filter Chips */}
            {storeCategories.length > 2 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {storeCategories.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat.key
                        ? 'bg-emerald-600 text-white shadow-xs scale-105'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedCategory === cat.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons text-3xl">search_off</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Produk Tidak Ditemukan</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {searchQuery ? `Tidak ada produk yang cocok dengan kata kunci "${searchQuery}".` : 'Belum ada produk yang tersedia pada kategori ini.'}
                </p>
                {(searchQuery || selectedCategory !== 'Semua') && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSelectedCategory('Semua'); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Reset Filter Pencarian
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filteredProducts.map(product => {
                  const stock = Number(product.total_stock ?? product.stock ?? 0);
                  const isOutOfStock = stock <= 0;
                  const price = Number(product.price || 0);
                  const finalPrice = product.discounted_price ? Number(product.discounted_price) : price;
                  const hasDiscount = product.discounted_price && finalPrice < price;

                  const isDistanceShipping = product.shipping_cost_type === 'distance' || product.out_of_po_shipping_type === 'distance';

                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/store/${product.slug || product.id}`)}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer group"
                    >
                      {/* Product Thumbnail */}
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img
                          src={getMediaUrl(product.images?.[0]?.image || product.thumbnail) || '/placeholder-product.png'}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />

                        {/* Badges Over Image */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                          {product.is_preorder && (
                            <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm uppercase tracking-wide">
                              PO
                            </span>
                          )}
                          {hasDiscount && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm">
                              HEMAT {product.promo_discount_percentage}%
                            </span>
                          )}
                        </div>

                        {/* Distance / Flat Shipping Indicator */}
                        <div className="absolute bottom-2 left-2 right-2">
                          {isDistanceShipping ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-600/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <span className="material-icons text-[10px]">near_me</span>
                              Ongkir Jarak
                            </span>
                          ) : product.is_shipping_cost_active ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-600/90 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
                              <span className="material-icons text-[10px]">local_shipping</span>
                              Ongkir Flat
                            </span>
                          ) : null}
                        </div>

                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              Stok Habis
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Body */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 min-h-[34px] group-hover:text-emerald-700 transition">
                            {product.title}
                          </h3>

                          {/* Price */}
                          <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm sm:text-base font-black text-emerald-700">
                              {formatIDR(finalPrice)}
                            </span>
                            {hasDiscount && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {formatIDR(price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sold & Stock Footer */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {product.sold_count > 0 ? `${product.sold_count} terjual` : 'Belum terjual'}
                          </span>
                          <span className={stock > 5 ? 'text-slate-400' : 'text-amber-600 font-bold'}>
                            Stok: {stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRODUK DIGITAL & E-COURSE */}
        {activeTab === 'digital' && (
          <div className="space-y-6">
            
            {/* Promo Card to Digital Storefront */}
            <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold mb-2 backdrop-blur-xs">
                  <span className="material-icons text-sm">devices</span>
                  Koleksi Digital Penjual
                </div>
                <h3 className="text-lg sm:text-xl font-black">Laman Produk Digital & E-Course</h3>
                <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
                  Dapatkan e-book, source code, desain template, dan materi video pembelajaran langsung dari @{username}.
                </p>
              </div>
              <Link
                to={`/digital-produk/${username}`}
                className="px-5 py-3 bg-white hover:bg-blue-50 text-blue-900 rounded-2xl text-xs sm:text-sm font-extrabold shadow-lg shrink-0 flex items-center gap-2 transition active:scale-95"
              >
                <span>Buka Laman Digital Lengkap</span>
                <span className="material-icons text-sm">open_in_new</span>
              </Link>
            </div>

            {/* Courses / E-Courses */}
            {courses.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <span className="material-icons text-blue-600 text-base">school</span>
                  Kelas & E-Course ({courses.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {courses.map(course => (
                    <Link
                      key={course.id}
                      to={`/kelas/${course.slug}`}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition group flex flex-col"
                    >
                      <div className="aspect-video relative overflow-hidden bg-slate-100">
                        <img
                          src={getMediaUrl(course.thumbnail) || '/placeholder-course.png'}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                          E-Course
                        </span>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 min-h-[36px] group-hover:text-blue-700">
                          {course.title}
                        </h4>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-black text-blue-700">
                            {Number(course.price) > 0 ? formatIDR(course.price) : 'Gratis'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            Lihat Kelas <span className="material-icons text-xs">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Digital Products (Files / Templates) */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <span className="material-icons text-indigo-600 text-base">receipt_long</span>
                Produk Digital ({digitalProducts.length})
              </h3>
              {digitalProducts.length === 0 ? (
                <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Belum ada produk digital yang dipublikasikan oleh seller ini.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {digitalProducts.map(prod => (
                    <Link
                      key={prod.id}
                      to={`/digital-produk/${username}/${prod.slug}`}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition group flex flex-col"
                    >
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img
                          src={getMediaUrl(prod.thumbnail_url || prod.thumbnail) || '/placeholder-product.png'}
                          alt={prod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[9px] font-bold shadow-xs">
                          Digital
                        </span>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 min-h-[34px] group-hover:text-indigo-700">
                          {prod.title}
                        </h4>
                        <div className="mt-2">
                          <span className="text-sm font-black text-indigo-700">
                            {formatIDR(prod.price)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: TENTANG TOKO & JADWAL */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Profile Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600 text-base">store</span>
                Tentang Toko
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Nama Toko</span>
                  <span className="text-slate-800 font-bold text-sm">{profile.name_full || username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Username</span>
                  <span className="text-slate-800 font-semibold">@{username}</span>
                </div>
                {profile.shop_description && (
                  <div>
                    <span className="text-slate-400 block font-medium">Deskripsi</span>
                    <p className="text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {profile.shop_description}
                    </p>
                  </div>
                )}
                {profile.city_name && (
                  <div>
                    <span className="text-slate-400 block font-medium">Asal Lokasi Pengiriman</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="material-icons text-sm text-rose-500">location_on</span>
                      {profile.city_name} {profile.province_name ? `, ${profile.province_name}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Ketentuan Ongkir & Operasional */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-icons text-purple-600 text-base">local_shipping</span>
                Ketentuan Ongkir & Pengiriman
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="font-bold text-purple-900 flex items-center gap-1">
                    <span className="material-icons text-sm text-purple-600">tune</span>
                    Sistem Ongkos Kirim Fleksibel
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Toko ini mendukung pilihan <strong>Ongkir Flat Toko</strong> (satu tarif tetap walau membeli banyak barang) ataupun <strong>Ongkir Sesuai Jarak</strong> yang akan dikonfirmasi langsung oleh pihak Admin/Seller/Kurir setelah pesanan masuk.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <span className="material-icons text-sm text-emerald-600">verified</span>
                    Garansi Transaksi Aman
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    Seluruh pembayaran dan pengiriman diproses dengan aman melalui platform Barakah Economy.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      <NavigationButton />

      {/* SHARE MODAL (Fallback when Web Share is not available) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600">share</span>
                Bagikan Toko
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <span className="material-icons text-sm">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Bagikan link etalase Toko @{username} kepada calon pembeli dan relasi Anda:
            </p>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 mb-5">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/toko/${username}`}
                className="text-xs text-slate-700 bg-transparent flex-1 outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
              >
                Salin
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Yuk belanja di Toko @${username} Barakah Economy: ${window.location.origin}/toko/${username}`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-center text-xs font-bold flex flex-col items-center gap-1 transition"
              >
                <span className="material-icons text-emerald-600">chat</span>
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/toko/${username}`)}&text=${encodeURIComponent(`Toko @${username} di Barakah Economy`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-center text-xs font-bold flex flex-col items-center gap-1 transition"
              >
                <span className="material-icons text-blue-600">send</span>
                <span>Telegram</span>
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-center text-xs font-bold flex flex-col items-center gap-1 transition"
              >
                <span className="material-icons text-slate-600">content_copy</span>
                <span>Salin Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreProfilePage;
