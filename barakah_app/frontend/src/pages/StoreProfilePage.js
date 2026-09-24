// pages/StoreProfilePage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { getPublicDigitalProfile } from '../services/digitalProductApi';
import { createStoreChat } from '../services/chatApi';
import api from '../services/api';
import { safeStorage } from '../utils/storageUtils';
import { getMediaUrl } from '../utils/mediaUtils';
import { formatCurrency } from '../utils/formatters';
import '../styles/Body.css';

const formatIDR = (amount) => {
  return 'Rp ' + formatCurrency(amount || 0);
};

const StoreProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'digital' | 'about'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['Semua']);
  const [sortBy, setSortBy] = useState('populer'); // 'populer' | 'terlaris' | 'price_asc' | 'price_desc' | 'newest'
  const [shareToast, setShareToast] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Follow & Like System
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [isShopLiked, setIsShopLiked] = useState(false);
  const [shopLikesCount, setShopLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const currentUser = safeStorage.getUser();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getPublicDigitalProfile(username);
        setProfileData(res.data);
        const p = res.data?.profile || {};
        setIsFollowing(Boolean(p.is_following));
        setFollowersCount(p.followers_count || 0);
        setFollowingCount(p.following_count || 0);
        setIsShopLiked(Boolean(p.is_shop_liked));
        setShopLikesCount(p.shop_likes_count || 0);
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

  // Primary store slug and official URL
  const storeSlug = profile.shop_name || username;
  const storeDisplayName = profile.shop_name || profile.name_full || username;
  const officialStoreUrl = `https://barakah.cloud/store/${storeSlug}`;

  const isOwnStore = Boolean(
    profile.is_owner || 
    (currentUser && (
      (profile.user_id && String(currentUser.id) === String(profile.user_id)) ||
      (profile.username && String(currentUser.username).toLowerCase() === String(profile.username).toLowerCase()) ||
      (profile.shop_name && String(currentUser.username).toLowerCase() === String(profile.shop_name).toLowerCase())
    ))
  );

  // Shop Customizations
  const shopFont = profile.shop_font || 'sans';
  const shopLayout = profile.shop_layout || 'grid';
  const shopThemeColor = profile.shop_theme_color || 'green';
  const shopTemplate = profile.shop_template || 'none';
  const shopDecoration = profile.shop_decoration || 'none';

  const fontClass = 
    shopFont === 'serif' ? 'font-serif' :
    shopFont === 'mono' ? 'font-mono' :
    shopFont === 'poppins' ? 'font-[Poppins]' : 'font-sans';

  const getThemePalette = () => {
    switch (shopThemeColor) {
      case 'blue':
        return {
          banner: 'from-blue-900 via-sky-800 to-blue-950',
          btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
          btnLight: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200',
          textAccent: 'text-blue-700',
          borderActive: 'border-blue-600 text-blue-700 bg-blue-50/50',
          chipActive: 'bg-blue-600 text-white shadow-xs',
          verifiedBadge: 'bg-blue-600 text-white',
        };
      case 'teal':
        return {
          banner: 'from-teal-900 via-cyan-800 to-emerald-950',
          btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white',
          btnLight: 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200',
          textAccent: 'text-teal-700',
          borderActive: 'border-teal-600 text-teal-700 bg-teal-50/50',
          chipActive: 'bg-teal-600 text-white shadow-xs',
          verifiedBadge: 'bg-teal-600 text-white',
        };
      case 'amber':
        return {
          banner: 'from-amber-900 via-yellow-800 to-stone-900',
          btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white',
          btnLight: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200',
          textAccent: 'text-amber-700',
          borderActive: 'border-amber-600 text-amber-700 bg-amber-50/50',
          chipActive: 'bg-amber-600 text-white shadow-xs',
          verifiedBadge: 'bg-amber-600 text-white',
        };
      case 'purple':
        return {
          banner: 'from-purple-900 via-indigo-800 to-purple-950',
          btnPrimary: 'bg-purple-600 hover:bg-purple-700 text-white',
          btnLight: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200',
          textAccent: 'text-purple-700',
          borderActive: 'border-purple-600 text-purple-700 bg-purple-50/50',
          chipActive: 'bg-purple-600 text-white shadow-xs',
          verifiedBadge: 'bg-purple-600 text-white',
        };
      case 'rose':
        return {
          banner: 'from-rose-900 via-pink-800 to-red-950',
          btnPrimary: 'bg-rose-600 hover:bg-rose-700 text-white',
          btnLight: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200',
          textAccent: 'text-rose-700',
          borderActive: 'border-rose-600 text-rose-700 bg-rose-50/50',
          chipActive: 'bg-rose-600 text-white shadow-xs',
          verifiedBadge: 'bg-rose-600 text-white',
        };
      case 'dark':
        return {
          banner: 'from-slate-950 via-gray-900 to-slate-900',
          btnPrimary: 'bg-slate-900 hover:bg-black text-white',
          btnLight: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300',
          textAccent: 'text-slate-900',
          borderActive: 'border-slate-900 text-slate-900 bg-slate-100',
          chipActive: 'bg-slate-900 text-white shadow-xs',
          verifiedBadge: 'bg-slate-900 text-white',
        };
      case 'green':
      case 'emerald':
      default:
        return {
          banner: 'from-emerald-800 via-teal-800 to-green-900',
          btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          btnLight: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200',
          textAccent: 'text-emerald-700',
          borderActive: 'border-emerald-600 text-emerald-700 bg-emerald-50/50',
          chipActive: 'bg-emerald-600 text-white shadow-xs',
          verifiedBadge: 'bg-emerald-600 text-white',
        };
    }
  };
  const theme = getThemePalette();

  const bannerHeightClass = 
    shopTemplate === 'grand_hero' ? 'h-52 sm:h-64 md:h-72' :
    shopTemplate === 'compact_clean' ? 'h-28 sm:h-36 md:h-44' :
    shopTemplate === 'islamic_heritage' ? 'h-44 sm:h-56 md:h-64' :
    'h-40 sm:h-52 md:h-60';

  const decorationClass = 
    shopDecoration === 'warm_gradient' ? 'bg-gradient-to-b from-amber-50/30 via-slate-50 to-white' :
    shopDecoration === 'islamic_geometric' ? 'bg-slate-50 bg-[radial-gradient(#10b981_0.8px,transparent_0.8px)] [background-size:18px_18px]' :
    shopDecoration === 'soft_dots' ? 'bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:14px_14px]' :
    'bg-slate-50';

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
    return [{ key: 'Semua', label: t('store.category_all', 'Semua'), count: physicalProducts.length }, ...list];
  }, [physicalProducts, t]);

  // Handle Multi-Select Category
  const handleCategoryClick = (catKey) => {
    if (catKey === 'Semua') {
      setSelectedCategories(['Semua']);
      return;
    }

    let updated = selectedCategories.filter(c => c !== 'Semua');
    if (updated.includes(catKey)) {
      updated = updated.filter(c => c !== catKey);
      if (updated.length === 0) {
        updated = ['Semua'];
      }
    } else {
      updated.push(catKey);
    }
    setSelectedCategories(updated);
  };

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

    if (!selectedCategories.includes('Semua') && selectedCategories.length > 0) {
      const targets = selectedCategories.map(c => c.toLowerCase().trim());
      list = list.filter(p => {
        const catKey = (p.category || 'lainnya').toLowerCase().trim();
        const catDisplay = (p.category_display || p.category_name || '').toLowerCase().trim();
        const catKeyNorm = catKey.replace(/[-_]/g, ' ');
        return targets.some(target => catKey === target || catDisplay === target || catKeyNorm === target);
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
  }, [physicalProducts, searchQuery, selectedCategories, sortBy]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(officialStoreUrl).then(() => {
        setShareToast(t('store.link_copied', 'Tautan toko berhasil disalin!'));
        setTimeout(() => setShareToast(''), 3000);
      });
    } else {
      setShareToast(officialStoreUrl);
      setTimeout(() => setShareToast(''), 3000);
    }
  };

  const handleShareStore = () => {
    const shareTitle = `${t('store.store', 'Toko')} ${storeDisplayName} - Barakah Economy`;
    const shareText = `Yuk cek berbagai produk terbaik dari ${t('store.store', 'Toko')} ${storeDisplayName} di Barakah Economy: ${officialStoreUrl}`;

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: officialStoreUrl
      }).catch(err => {
        console.log('Share dismissed', err);
      });
    } else {
      setShowShareModal(true);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      alert(i18n.language === 'en' ? 'Please log in first to follow this store.' : 'Silakan login terlebih dahulu untuk mengikuti toko.');
      return;
    }
    setFollowLoading(true);
    try {
      const targetId = profile.user_id || username;
      const res = await api.post(`/profiles/${targetId}/toggle-follow/`);
      setIsFollowing(res.data.is_following);
      setFollowersCount(res.data.followers_count);
      setShareToast(res.data.is_following 
        ? (i18n.language === 'en' ? 'Now following this store!' : 'Berhasil mengikuti toko!') 
        : (i18n.language === 'en' ? 'Unfollowed store.' : 'Berhenti mengikuti toko.')
      );
      setTimeout(() => setShareToast(''), 2500);
    } catch (err) {
      const msg = err.response?.data?.error || (i18n.language === 'en' ? 'Failed to update follow status.' : 'Gagal mengubah status mengikuti.');
      alert(msg);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentUser) {
      alert(i18n.language === 'en' ? 'Please log in first to like this store.' : 'Silakan login terlebih dahulu untuk menyukai toko.');
      return;
    }
    setLikeLoading(true);
    try {
      const targetId = profile.user_id || username;
      const res = await api.post(`/profiles/${targetId}/toggle-like-shop/`);
      setIsShopLiked(res.data.is_shop_liked);
      setShopLikesCount(res.data.shop_likes_count);
      setShareToast(res.data.is_shop_liked 
        ? (i18n.language === 'en' ? 'You liked this store!' : 'Anda menyukai toko ini!') 
        : (i18n.language === 'en' ? 'Unliked store.' : 'Batal menyukai toko.')
      );
      setTimeout(() => setShareToast(''), 2500);
    } catch (err) {
      const msg = err.response?.data?.error || (i18n.language === 'en' ? 'Failed to like store.' : 'Gagal menyukai toko.');
      alert(msg);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleChatSeller = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/login');
      return;
    }

    if (profile?.user_id && String(profile.user_id) === String(user.id)) {
      alert(i18n.language === 'en' ? 'This is your own store.' : 'Ini adalah toko Anda sendiri.');
      return;
    }

    setIsStartingChat(true);
    try {
      const sellerTarget = profile?.user_id || profile?.username || username || (physicalProducts[0]?.seller);
      if (!sellerTarget) {
        alert(i18n.language === 'en' ? 'Seller is currently unavailable for chat.' : 'Penjual tidak dapat dihubungi saat ini.');
        return;
      }
      const res = await createStoreChat({
        seller: sellerTarget,
        product: null
      });
      if (res.data && res.data.id) {
        navigate(`/chat/${res.data.id}`);
      } else {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Error starting store chat:', err);
      const errMsg = err?.response?.data?.error || (i18n.language === 'en' ? 'Unable to connect to store chat.' : 'Gagal membuka obrolan dengan toko.');
      alert(errMsg);
      navigate('/chat');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = profile.phone || physicalProducts[0]?.seller_phone;
    if (!phone) {
      alert(i18n.language === 'en' ? 'Seller WhatsApp number is unavailable.' : 'Nomor WhatsApp penjual tidak tersedia.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const msg = encodeURIComponent(
      i18n.language === 'en'
        ? `Hello Store @${username}, I found your store on Barakah Economy.`
        : `Halo Toko @${username}, saya melihat toko Anda di Barakah Economy.`
    );
    window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <div className="body min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-emerald-600 border-t-transparent shadow-md"></div>
          <p className="mt-4 text-sm font-semibold text-slate-500 animate-pulse">
            {t('common.loading', 'Memuat etalase toko...')}
          </p>
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
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            {t('store.not_found_title', 'Toko Tidak Ditemukan')}
          </h2>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            {t('store.not_found_desc', 'Toko dengan URL ini belum terdaftar atau produk belum tersedia.')}
          </p>
          <button
            onClick={() => navigate('/store')}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-200 transition"
          >
            {t('store.explore_store', 'Jelajahi Barakah Store')}
          </button>
        </div>
        <NavigationButton />
      </div>
    );
  }

  return (
    <div className={`body min-h-screen ${decorationClass} text-slate-900 pb-24 ${fontClass}`}>
      <Helmet>
        <title>{`${t('store.store', 'Toko')} ${storeDisplayName} | Barakah Economy`}</title>
        <meta name="description" content={profile.shop_description || `Koleksi produk fisik, digital, dan e-course terlengkap dari Toko ${storeDisplayName} di Barakah Economy.`} />
        <meta property="og:title" content={`${t('store.store', 'Toko')} ${storeDisplayName} - Barakah Economy`} />
        <meta property="og:description" content={profile.shop_description || `Koleksi produk fisik, digital, dan e-course terlengkap dari Toko ${storeDisplayName}`} />
        <meta property="og:url" content={officialStoreUrl} />
        {(profile.picture || profile.shop_thumbnail) && (
          <meta property="og:image" content={getMediaUrl(profile.picture || profile.shop_thumbnail)} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${t('store.store', 'Toko')} ${storeDisplayName} - Barakah Economy`} />
        <meta name="twitter:description" content={profile.shop_description || `Koleksi produk dari Toko ${storeDisplayName}`} />
        {(profile.picture || profile.shop_thumbnail) && (
          <meta name="twitter:image" content={getMediaUrl(profile.picture || profile.shop_thumbnail)} />
        )}
      </Helmet>

      <Header />

      {/* Floating Toast Notification */}
      {shareToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="material-icons text-emerald-400 text-base">check_circle</span>
          <span>{shareToast}</span>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 overflow-x-auto whitespace-nowrap py-1">
          <Link to="/" className="hover:text-emerald-700 font-medium transition flex items-center gap-1">
            <span className="material-icons text-sm">home</span>
            <span>{t('header.home', 'Beranda')}</span>
          </Link>
          <span className="material-icons text-[12px] text-slate-400">chevron_right</span>
          <Link to="/store" className="hover:text-emerald-700 font-medium transition flex items-center gap-1">
            <span className="material-icons text-sm">storefront</span>
            <span>Store</span>
          </Link>
          <span className="material-icons text-[12px] text-slate-400">chevron_right</span>
          <span className="text-slate-800 font-bold">{storeDisplayName}</span>
        </div>

        {/* Owner Store Notice & Quick Actions (Only shown to store owner) */}
        {isOwnStore && (
          <div className="mb-5 p-4 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in border border-emerald-600/40">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-md shadow-inner">
                <span className="material-icons text-2xl text-white">storefront</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold text-white">
                    {t('store.owner_banner_title', 'Tampilan Toko Anda Sendiri')}
                  </p>
                  <span className="text-[10px] bg-emerald-500/80 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs">
                    {t('store.owner_banner_badge', 'Pemilik Toko')}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5 leading-relaxed">
                  {t('store.owner_banner_desc', 'Anda sedang melihat etalase toko Anda. Pelanggan melihat toko Anda persis seperti tampilan di bawah ini.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
              <Link
                to="/dashboard/shop-settings"
                className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition active:scale-95"
              >
                <span className="material-icons text-sm text-emerald-700">settings</span>
                <span>{t('store.owner_edit_settings', 'Edit Pengaturan Toko')}</span>
              </Link>
              <Link
                to="/dashboard/sinergy/seller"
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-sm flex items-center gap-1.5 transition active:scale-95"
              >
                <span className="material-icons text-sm">inventory_2</span>
                <span className="hidden sm:inline">{t('store.owner_manage_products', 'Kelola Produk')}</span>
              </Link>
            </div>
          </div>
        )}

        {/* MARKETPLACE STORE HEADER CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mb-6 relative">
          
          {/* Banner / Cover */}
          <div className={`${bannerHeightClass} w-full relative overflow-hidden bg-gradient-to-r ${theme.banner} transition-all`}>
            {profile.shop_thumbnail ? (
              <img
                src={getMediaUrl(profile.shop_thumbnail)}
                alt="Banner Toko"
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r opacity-95">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
              </div>
            )}

            {shopTemplate === 'islamic_heritage' && (
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-3 py-1 bg-emerald-950/85 backdrop-blur-md rounded-full text-xs font-bold text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5 shadow-md">
                <span className="material-icons text-sm text-amber-400">verified</span>
                <span>{t('store.islamic_syariah_badge', 'Toko Syariah Terverifikasi Barakah')}</span>
              </div>
            )}
            
            {/* Quick Actions on Banner (Top Right) */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex items-center gap-2">
              {isOwnStore && (
                <Link
                  to="/dashboard/shop-settings"
                  className="px-3.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white backdrop-blur-md rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 border border-emerald-400/40"
                  title={t('store.owner_edit_settings', 'Edit Pengaturan Toko')}
                >
                  <span className="material-icons text-sm">edit</span>
                  <span>{t('common.edit', 'Edit')}</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleShareStore}
                className="px-3.5 py-1.5 bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
                title={t('store.share_store', 'Bagikan Toko')}
              >
                <span className="material-icons text-sm text-emerald-700">share</span>
                <span className="hidden sm:inline">{t('store.share_store', 'Bagikan Toko')}</span>
              </button>
            </div>
          </div>

          {/* Profile Identity Details (Overlapping Banner) */}
          <div className="px-4 sm:px-8 pb-6 pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-14 sm:-mt-16 relative z-10">
              
              {/* Avatar + Main Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-5 text-center sm:text-left">
                {/* Store Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl flex items-center justify-center">
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
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-md border-2 border-white" title={t('store.verified_seller', 'Penjual Terverifikasi')}>
                    <span className="material-icons text-xs block">verified</span>
                  </div>
                </div>

                {/* Name & Badges in White Stabilo/Container */}
                <div className="min-w-0">
                  <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-md border border-slate-200/90 inline-block text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {storeDisplayName}
                      </h1>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                        <span className="material-icons text-[13px]">storefront</span>
                        {t('store.official_seller', 'Official Seller')}
                      </span>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                      <p className="text-xs sm:text-sm font-semibold text-slate-500">
                        @{profile.username || username}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-2.5 text-xs text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <strong className="text-slate-800 font-bold">{followersCount}</strong> {t('store.followers', 'Pengikut')}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <strong className="text-slate-800 font-bold">{followingCount}</strong> {t('store.following', 'Mengikuti')}
                    </span>
                    {profile.city_name && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                          <span className="material-icons text-sm text-rose-500">location_on</span>
                          {profile.city_name}
                        </span>
                      </>
                    )}
                    {profile.joined_date && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <span className="material-icons text-sm text-slate-400">calendar_month</span>
                          {t('store.joined', 'Bergabung')} {new Date(profile.joined_date).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'id-ID', { month: 'short', year: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Store Operational & PO Badges */}
                  {(profile.is_operational_hours_active || profile.is_preorder || profile.is_delivery_schedule_active) && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                      {profile.is_operational_hours_active && profile.operational_hours && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-2xs">
                          <span className="material-icons text-sm text-emerald-600">schedule</span>
                          <span>{t('store.opening_hours', 'Jam Buka')}: <strong className="font-bold">{profile.operational_hours}</strong></span>
                        </span>
                      )}
                      {profile.is_preorder && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold shadow-2xs">
                          <span className="material-icons text-sm text-blue-600">hourglass_top</span>
                          <span>{t('store.store_po', 'PO Toko')}: <strong className="font-bold">{profile.preorder_duration || (profile.preorder_days ? `Hari ${profile.preorder_days}` : 'Aktif')}</strong></span>
                        </span>
                      )}
                      {profile.is_delivery_schedule_active && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold shadow-2xs">
                          <span className="material-icons text-sm text-amber-600">local_shipping</span>
                          <span>{t('store.delivery', 'Pengantaran')}: <strong className="font-bold">{profile.delivery_days ? `Hari ${profile.delivery_days}` : (profile.delivery_range_min ? `${profile.delivery_range_min}-${profile.delivery_range_max} Hari` : (profile.delivery_note || 'Jadwal Rutin'))}</strong></span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Customer actions vs Owner actions */}
              <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap pt-2 sm:pt-0">
                {isOwnStore ? (
                  <>
                    <Link
                      to="/dashboard/shop-settings"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200 flex items-center gap-1.5 transition active:scale-95"
                    >
                      <span className="material-icons text-base">edit</span>
                      <span>{t('store.owner_edit_settings', 'Edit Toko')}</span>
                    </Link>
                    <Link
                      to="/dashboard/sinergy/seller"
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <span className="material-icons text-base">inventory_2</span>
                      <span className="hidden sm:inline">{t('store.owner_manage_products', 'Kelola Produk')}</span>
                    </Link>
                  </>
                ) : (
                  <>
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
                          <span>{t('store.chat', 'Chat')}</span>
                        </>
                      )}
                    </button>

                    {(profile.phone || physicalProducts[0]?.seller_phone) && (
                      <button
                        type="button"
                        onClick={handleWhatsApp}
                        className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
                        title={t('store.whatsapp', 'Hubungi via WhatsApp')}
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    )}

                    {currentUser && (
                      <button
                        type="button"
                        onClick={handleToggleFollow}
                        disabled={followLoading}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
                          isFollowing
                            ? 'bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 border border-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                        }`}
                      >
                        <span className="material-icons text-base">{isFollowing ? 'check' : 'person_add'}</span>
                        <span>{isFollowing ? t('store.following_status', 'Mengikuti') : t('store.follow', 'Ikuti')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleToggleLike}
                      disabled={likeLoading}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition active:scale-95 ${
                        isShopLiked
                          ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-xs'
                          : 'bg-slate-50 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-slate-200'
                      }`}
                      title={t('store.like_store', 'Sukai Toko Ini')}
                    >
                      <span className={`material-icons text-base ${isShopLiked ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isShopLiked ? 'favorite' : 'favorite_border'}
                      </span>
                      <span>{shopLikesCount}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleShareStore}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
                  title={t('store.share_store', 'Bagikan Toko')}
                >
                  <span className="material-icons text-base">share</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
                  title={t('store.copy_link', 'Salin Link Toko')}
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
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:bg-emerald-50/40 transition">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">{t('store.physical_products', 'Produk Fisik')}</span>
                <span className="text-base sm:text-lg font-black text-slate-900">{physicalProducts.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:bg-emerald-50/40 transition">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">{t('store.total_sold', 'Total Terjual')}</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">{totalSold}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:bg-emerald-50/40 transition">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">{t('store.digital_and_courses', 'Digital & Kelas')}</span>
                <span className="text-base sm:text-lg font-black text-blue-700">{digitalProducts.length + courses.length}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:bg-emerald-50/40 transition">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">{t('store.followers', 'Pengikut')}</span>
                <span className="text-base sm:text-lg font-black text-slate-900">{followersCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:bg-emerald-50/40 transition">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase block">{t('store.store_likes', 'Suka Toko')}</span>
                <span className="text-base sm:text-lg font-black text-rose-600">{shopLikesCount}</span>
              </div>
            </div>

          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">storefront</span>
            <span>{t('store.tab_all_products', 'Semua Produk Toko')} ({physicalProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('digital')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'digital'
                ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">devices</span>
            <span>{t('store.tab_digital_courses', 'Produk Digital & E-Course')} ({digitalProducts.length + courses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'about'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-2xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-icons text-base">info</span>
            <span>{t('store.tab_about', 'Info & Jadwal Toko')}</span>
          </button>
        </div>

        {/* TAB 1: ALL PHYSICAL PRODUCTS CATALOG */}
        {activeTab === 'products' && (
          <div>
            {/* Search & Sort Controls Inside Store */}
            <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs mb-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              
              {/* Search Inside Store */}
              <div className="relative flex-1">
                <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder={t('store.search_placeholder', 'Cari produk di toko ini...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
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
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">{t('store.sort_by', 'Urutkan:')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="populer">{t('store.sort_popular', 'Paling Populer')}</option>
                  <option value="terlaris">{t('store.sort_bestseller', 'Paling Terlaris')}</option>
                  <option value="newest">{t('store.sort_newest', 'Produk Terbaru')}</option>
                  <option value="price_asc">{t('store.sort_price_low', 'Harga Terendah')}</option>
                  <option value="price_desc">{t('store.sort_price_high', 'Harga Tertinggi')}</option>
                </select>
              </div>
            </div>

            {/* Category Filter Chips (Multi-Select) */}
            {storeCategories.length > 2 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
                {storeCategories.map(cat => {
                  const isSelected = selectedCategories.includes(cat.key);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleCategoryClick(cat.key)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      {isSelected && cat.key !== 'Semua' && (
                        <span className="material-icons text-[13px]">check</span>
                      )}
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons text-3xl">search_off</span>
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">{t('store.no_products_found', 'Produk Tidak Ditemukan')}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  {searchQuery 
                    ? `${t('store.no_products_match', 'Tidak ada produk yang cocok dengan kata kunci')} "${searchQuery}".` 
                    : t('store.no_products_match', 'Belum ada produk yang tersedia pada kategori ini.')}
                </p>
                {(searchQuery || !selectedCategories.includes('Semua')) && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSelectedCategories(['Semua']); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    {t('store.reset_filters', 'Reset Filter Pencarian')}
                  </button>
                )}
              </div>
            ) : (
              <div className={
                shopLayout === 'list' 
                  ? "flex flex-col gap-3" 
                  : shopLayout === 'compact'
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3"
                  : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
              }>
                {filteredProducts.map(product => {
                  const stock = Number(product.total_stock ?? product.stock ?? 0);
                  const isOutOfStock = stock <= 0;
                  const price = Number(product.price || 0);

                  // Variation & price range calculation
                  const activeVariations = Array.isArray(product.variations)
                    ? product.variations.filter(v => v && (v.is_active === undefined || v.is_active === true) && (v.name || Number(v.additional_price) > 0))
                    : [];

                  let minPrice = product.min_price !== undefined && product.min_price !== null ? Number(product.min_price) : null;
                  let maxPrice = product.max_price !== undefined && product.max_price !== null ? Number(product.max_price) : null;

                  if (activeVariations.length > 0) {
                    const varPrices = activeVariations
                      .map(v => Number(v.additional_price) > 0 ? Number(v.additional_price) : price)
                      .filter(p => !isNaN(p) && p > 0);
                    if (varPrices.length > 0) {
                      const calculatedMin = Math.min(...varPrices);
                      const calculatedMax = Math.max(...varPrices);
                      minPrice = minPrice !== null ? Math.min(minPrice, calculatedMin) : calculatedMin;
                      maxPrice = maxPrice !== null ? Math.max(maxPrice, calculatedMax) : calculatedMax;
                    }
                  }

                  if (minPrice === null) minPrice = price;
                  if (maxPrice === null) maxPrice = price;

                  const hasPriceRange = minPrice < maxPrice;

                  // Discount calculation
                  const hasDiscount = Boolean(product.discounted_price && Number(product.discounted_price) < price);
                  const finalPrice = hasDiscount ? Number(product.discounted_price) : price;

                  let finalMinPrice = minPrice;
                  let finalMaxPrice = maxPrice;

                  if (hasDiscount) {
                    if (!hasPriceRange) {
                      finalMinPrice = finalPrice;
                      finalMaxPrice = finalPrice;
                    } else {
                      const promo = product.active_promotion;
                      if (promo?.discount_type === 'percentage') {
                        const pct = Number(promo.discount_value) / 100;
                        finalMinPrice = Math.round(minPrice * (1 - pct));
                        finalMaxPrice = Math.round(maxPrice * (1 - pct));
                      } else if (promo?.discount_type === 'nominal') {
                        const nom = Number(promo.discount_value);
                        finalMinPrice = Math.max(0, minPrice - nom);
                        finalMaxPrice = Math.max(0, maxPrice - nom);
                      } else {
                        const ratio = price > 0 ? (finalPrice / price) : 1;
                        finalMinPrice = Math.round(minPrice * ratio);
                        finalMaxPrice = Math.round(maxPrice * ratio);
                      }
                    }
                  }

                  if (shopLayout === 'list') {
                    return (
                      <div
                        key={product.id}
                        onClick={() => navigate(`/produk/${product.slug || product.id}`)}
                        className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-emerald-300 transition-all duration-300 overflow-hidden flex flex-col sm:flex-row cursor-pointer group p-3.5 sm:p-4 gap-4 items-stretch"
                      >
                        <div className="w-full sm:w-44 h-44 sm:h-auto aspect-square relative rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={getMediaUrl(product.images?.[0]?.image || product.thumbnail) || '/placeholder-product.png'}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          {product.is_preorder && (
                            <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm uppercase">
                              {t('store.preorder_badge', 'PO')}
                            </span>
                          )}
                          {hasDiscount && (
                            <span className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                              {t('store.save_discount', 'HEMAT')} {product.promo_discount_percentage}%
                            </span>
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                {t('store.out_of_stock', 'Stok Habis')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {product.category_display || product.category || 'Produk'}
                              </span>
                              {product.is_delivery_schedule_active && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <span className="material-icons text-[11px]">local_shipping</span>
                                  Jadwal Kirim
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-emerald-700 transition line-clamp-2">
                              {product.title}
                            </h3>
                            {product.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1 hidden sm:block">
                                {product.description.replace(/<[^>]*>?/gm, '')}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                            <div>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                {hasPriceRange ? (
                                  <span className="text-sm sm:text-base font-black text-emerald-700">
                                    {formatIDR(finalMinPrice)} - {formatIDR(finalMaxPrice)}
                                  </span>
                                ) : (
                                  <span className="text-sm sm:text-base font-black text-emerald-700">
                                    {formatIDR(finalMinPrice)}
                                  </span>
                                )}
                                {hasDiscount && (
                                  <span className="text-xs text-slate-400 line-through">
                                    {hasPriceRange ? `${formatIDR(minPrice)} - ${formatIDR(maxPrice)}` : formatIDR(price)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                                <span className="text-amber-500 font-bold flex items-center gap-0.5">
                                  <span className="material-icons text-xs">star</span>
                                  {product.rating_average ? Number(product.rating_average).toFixed(1) : '5.0'}
                                </span>
                                <span>•</span>
                                <span>{t('store.sold', 'Terjual')} {Number(product.sold_count || 0)}</span>
                                <span>•</span>
                                <span className={stock > 5 ? 'text-slate-500' : 'text-amber-600 font-bold'}>
                                  {t('store.stock', 'Stok')}: {stock}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 justify-center ${theme.btnPrimary}`}
                            >
                              <span className="material-icons text-sm">visibility</span>
                              <span>{t('store.view_detail', 'Lihat Produk')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/produk/${product.slug || product.id}`)}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-emerald-300 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group"
                    >
                      {/* Product Thumbnail */}
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img
                          src={getMediaUrl(product.images?.[0]?.image || product.thumbnail) || '/placeholder-product.png'}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                          loading="lazy"
                        />

                        {/* Badges Over Image */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                          {product.is_preorder && (
                            <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm uppercase tracking-wide">
                              {t('store.preorder_badge', 'PO')}
                            </span>
                          )}
                          {hasDiscount && (
                            <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm">
                              {t('store.save_discount', 'HEMAT')} {product.promo_discount_percentage}%
                            </span>
                          )}
                        </div>

                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              {t('store.out_of_stock', 'Stok Habis')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Body */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 min-h-[34px] group-hover:text-emerald-700 transition">
                            {product.title}
                          </h3>

                          {/* Price */}
                          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                            {hasPriceRange ? (
                              <span className="text-xs sm:text-sm font-black text-emerald-700 leading-snug">
                                {formatIDR(finalMinPrice)} - {formatIDR(finalMaxPrice)}
                              </span>
                            ) : (
                              <span className="text-sm sm:text-base font-black text-emerald-700">
                                {formatIDR(finalMinPrice)}
                              </span>
                            )}
                            {hasDiscount && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {hasPriceRange ? `${formatIDR(minPrice)} - ${formatIDR(maxPrice)}` : formatIDR(price)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sold & Stock Footer */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {product.sold_count > 0 ? `${product.sold_count} ${t('store.sold', 'terjual')}` : t('store.not_sold_yet', 'Belum terjual')}
                          </span>
                          <span className={stock > 5 ? 'text-slate-400' : 'text-amber-600 font-bold'}>
                            {t('store.stock', 'Stok')}: {stock}
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

        {/* TAB 2: DIGITAL PRODUCTS & E-COURSES */}
        {activeTab === 'digital' && (
          <div className="space-y-6">

            {/* Courses / E-Courses */}
            {courses.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <span className="material-icons text-blue-600 text-base">school</span>
                  {t('store.courses_title', 'Kelas & E-Course')} ({courses.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {courses.map(course => (
                    <Link
                      key={course.id}
                      to={`/kelas/${course.slug}`}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition group flex flex-col"
                    >
                      <div className="aspect-video relative overflow-hidden bg-slate-100">
                        <img
                          src={getMediaUrl(course.thumbnail) || '/placeholder-course.png'}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                          E-Course
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 min-h-[36px] group-hover:text-blue-700">
                          {course.title}
                        </h4>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-black text-blue-700">
                            {Number(course.price) > 0 ? formatIDR(course.price) : (i18n.language === 'en' ? 'Free' : 'Gratis')}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 group-hover:text-blue-600 transition">
                            {t('store.view_course', 'Lihat Kelas')} <span className="material-icons text-xs">arrow_forward</span>
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
                {t('store.digital_products_title', 'Produk Digital')} ({digitalProducts.length})
              </h3>
              {digitalProducts.length === 0 ? (
                <div className="p-8 bg-white rounded-3xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  {t('store.no_digital_products', 'Belum ada produk digital yang dipublikasikan oleh seller ini.')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {digitalProducts.map(prod => (
                    <Link
                      key={prod.id}
                      to={`/digital-produk/${username}/${prod.slug}`}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition group flex flex-col"
                    >
                      <div className="aspect-square relative overflow-hidden bg-slate-100">
                        <img
                          src={getMediaUrl(prod.thumbnail_url || prod.thumbnail) || '/placeholder-product.png'}
                          alt={prod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold shadow-xs">
                          Digital
                        </span>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 min-h-[34px] group-hover:text-indigo-700">
                          {prod.title}
                        </h4>
                        <div className="mt-2.5">
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

        {/* TAB 3: ABOUT STORE & SCHEDULE */}
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Profile Info */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-icons text-emerald-600 text-base">store</span>
                {t('store.about_title', 'Tentang Toko')}
              </h3>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">{t('store.shop_name', 'Nama Toko')}</span>
                  <span className="text-slate-800 font-bold text-sm">{profile.name_full || username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">{t('store.username', 'Username')}</span>
                  <span className="text-slate-800 font-semibold">@{username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Official URL</span>
                  <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block mt-0.5">
                    {officialStoreUrl}
                  </span>
                </div>
                {profile.shop_description && (
                  <div>
                    <span className="text-slate-400 block font-medium">{t('store.description', 'Deskripsi')}</span>
                    <p className="text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      {profile.shop_description}
                    </p>
                  </div>
                )}
                {profile.city_name && (
                  <div>
                    <span className="text-slate-400 block font-medium">{t('store.shipping_origin', 'Asal Lokasi Pengiriman')}</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="material-icons text-sm text-rose-500">location_on</span>
                      {profile.city_name} {profile.province_name ? `, ${profile.province_name}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Terms & Safety */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="material-icons text-purple-600 text-base">local_shipping</span>
                {t('store.shipping_terms_title', 'Ketentuan Ongkir & Pengiriman')}
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1">
                  <span className="font-bold text-purple-900 flex items-center gap-1">
                    <span className="material-icons text-sm text-purple-600">tune</span>
                    {t('store.flexible_shipping_title', 'Sistem Ongkos Kirim Fleksibel')}
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {t('store.flexible_shipping_desc', 'Toko ini mendukung pilihan Ongkir Flat Toko ataupun Ongkir Sesuai Jarak yang akan dikonfirmasi langsung oleh pihak Admin/Seller/Kurir setelah pesanan masuk.')}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <span className="material-icons text-sm text-emerald-600">verified</span>
                    {t('store.safe_transaction_title', 'Garansi Transaksi Aman')}
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {t('store.safe_transaction_desc', 'Seluruh pembayaran dan pengiriman diproses dengan aman melalui ekosistem syariah Barakah Economy.')}
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
                {t('store.share_modal_title', 'Bagikan Toko')}
              </h3>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <span className="material-icons text-sm">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              {t('store.share_modal_desc', 'Bagikan link etalase toko kepada calon pembeli dan relasi Anda:')}
            </p>

            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 mb-5">
              <input
                type="text"
                readOnly
                value={officialStoreUrl}
                className="text-xs text-slate-700 bg-transparent flex-1 outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition"
              >
                {t('common.copy', 'Salin')}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Yuk belanja di Toko ${storeDisplayName} Barakah Economy: ${officialStoreUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-center text-xs font-bold flex flex-col items-center gap-1 transition"
              >
                <span className="material-icons text-emerald-600">chat</span>
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(officialStoreUrl)}&text=${encodeURIComponent(`Toko ${storeDisplayName} di Barakah Economy`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-center text-xs font-bold flex flex-col items-center gap-1 transition"
              >
                <span className="material-icons text-blue-600">send</span>
                <span>Telegram</span>
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-center text-xs font-bold flex flex-col items-center gap-1 transition"
              >
                <span className="material-icons text-slate-600">content_copy</span>
                <span>{t('store.copy_link', 'Salin Link')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreProfilePage;
