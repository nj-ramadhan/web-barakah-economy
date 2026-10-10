// pages/DigitalProductListPage.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';
import { formatCurrency } from '../utils/formatters';
import { getDigitalProducts, getPopularSellers } from '../services/digitalProductApi';
import { getMediaUrl } from '../utils/mediaUtils';
import ShareButton from '../components/campaigns/ShareButton';
import UserProfileModal from '../components/modals/UserProfileModal';
import MobileCategoryFilterDropdown from '../components/common/MobileCategoryFilterDropdown';
import MobileSortDropdown from '../components/common/MobileSortDropdown';
import '../styles/Body.css';

const formatIDR = (amount) => {
  if (!amount || Number(amount) <= 0) return 'GRATIS';
  return 'Rp ' + formatCurrency(amount);
};

const getCategoryIcon = (categoryKey = '') => {
  const cat = String(categoryKey).toLowerCase();
  if (cat.includes('buku') || cat.includes('ebook') || cat.includes('e-book') || cat.includes('kitab') || cat.includes('pdf') || cat.includes('literasi')) {
    return 'menu_book';
  }
  if (cat.includes('desain') || cat.includes('template') || cat.includes('grafis') || cat.includes('canva') || cat.includes('ui') || cat.includes('vektor')) {
    return 'design_services';
  }
  if (cat.includes('video') || cat.includes('audio') || cat.includes('podcast') || cat.includes('musik') || cat.includes('rekaman')) {
    return 'smart_display';
  }
  if (cat.includes('software') || cat.includes('script') || cat.includes('source') || cat.includes('code') || cat.includes('aplikasi') || cat.includes('coding') || cat.includes('tool')) {
    return 'code';
  }
  if (cat.includes('kursus') || cat.includes('edukasi') || cat.includes('modul') || cat.includes('materi') || cat.includes('belajar') || cat.includes('panduan')) {
    return 'school';
  }
  if (cat.includes('bisnis') || cat.includes('marketing') || cat.includes('iklan') || cat.includes('keuangan') || cat.includes('finansial')) {
    return 'trending_up';
  }
  if (cat.includes('foto') || cat.includes('gambar') || cat.includes('wallpaper') || cat.includes('font')) {
    return 'image';
  }
  return 'category';
};

const CATEGORY_LIMIT = 8;

const DigitalProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [popularSellers, setPopularSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get('search') ?? searchParams.get('seller') ?? searchParams.get('q') ?? '';
  });
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const raw = searchParams.get('category') || searchParams.get('kategori') || searchParams.get('cat') || '';
    if (!raw || raw === 'Semua') return [];
    return raw.split(',').map(c => c.trim()).filter(Boolean);
  });
  const [sortBy, setSortBy] = useState(() => {
    return searchParams.get('sort') || searchParams.get('urutkan') || searchParams.get('order') || 'populer';
  });
  const [viewMode, setViewMode] = useState(() => {
    const v = searchParams.get('view');
    return v === 'blocks' ? 'blocks' : 'grid';
  });

  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Sync state when URL searchParams change
  useEffect(() => {
    const q = searchParams.get('search') ?? searchParams.get('seller') ?? searchParams.get('q') ?? '';
    setSearchQuery(q);

    const rawCat = searchParams.get('category') || searchParams.get('kategori') || searchParams.get('cat') || '';
    if (!rawCat || rawCat === 'Semua') {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(rawCat.split(',').map(c => c.trim()).filter(Boolean));
    }

    const sort = searchParams.get('sort') || searchParams.get('urutkan') || searchParams.get('order') || 'populer';
    setSortBy(sort);

    const view = searchParams.get('view') || 'grid';
    if (view === 'grid' || view === 'blocks') {
      setViewMode(view);
    }
  }, [searchParams]);

  // Handlers that update state and URL query arguments
  const handleCategoryToggle = (newCat) => {
    let updated = [];
    if (!newCat || newCat === 'Semua') {
      updated = [];
    } else {
      const exists = selectedCategories.some(c => c.toLowerCase() === newCat.toLowerCase());
      if (exists) {
        updated = selectedCategories.filter(c => c.toLowerCase() !== newCat.toLowerCase());
      } else {
        updated = [...selectedCategories, newCat];
      }
    }
    setSelectedCategories(updated);
    const newParams = new URLSearchParams(searchParams);
    if (updated.length > 0) {
      newParams.set('category', updated.join(','));
      newParams.delete('kategori');
      newParams.delete('cat');
    } else {
      newParams.delete('category');
      newParams.delete('kategori');
      newParams.delete('cat');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    const newParams = new URLSearchParams(searchParams);
    if (query && query.trim()) {
      newParams.set('search', query.trim());
      newParams.delete('q');
      newParams.delete('seller');
    } else {
      newParams.delete('search');
      newParams.delete('q');
      newParams.delete('seller');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    const newParams = new URLSearchParams(searchParams);
    if (newSort && newSort !== 'populer') {
      newParams.set('sort', newSort);
      newParams.delete('urutkan');
      newParams.delete('order');
    } else {
      newParams.delete('sort');
      newParams.delete('urutkan');
      newParams.delete('order');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleViewModeChange = (newView) => {
    setViewMode(newView);
    const newParams = new URLSearchParams(searchParams);
    if (newView && newView !== 'grid') {
      newParams.set('view', newView);
    } else {
      newParams.delete('view');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSearchQuery('');
    setSortBy('populer');
    setViewMode('grid');
    setSearchParams({}, { replace: true });
  };

  const handleShareStoreFilter = async () => {
    const currentUrl = window.location.href;
    const catLabel = selectedCategories.length > 0 ? `Kategori (${selectedCategories.join(', ')})` : 'Katalog Produk Digital';
    const shareTitle = `Barakah Produk Digital - ${catLabel}${searchQuery ? ` (Cari: ${searchQuery})` : ''}`;
    const shareText = `Yuk cek produk digital di Barakah Economy${selectedCategories.length > 0 ? ` untuk ${catLabel}` : ''}${searchQuery ? ` dengan kata kunci "${searchQuery}"` : ''}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch (e) {
      alert('Tautan halaman: ' + currentUrl);
    }
  };

  const isCategorySelected = (catKey, catLabel = '') => {
    if (selectedCategories.length === 0) {
      return catKey === 'Semua';
    }
    if (catKey === 'Semua') {
      return false;
    }
    const keyLower = catKey.toLowerCase().trim();
    const labelLower = catLabel.toLowerCase().trim();
    return selectedCategories.some(sel => {
      const s = sel.toLowerCase().trim();
      return (
        keyLower === s ||
        labelLower === s ||
        keyLower.replace(/[-_]/g, ' ') === s.replace(/[-_]/g, ' ') ||
        labelLower.replace(/[-_&]/g, ' ') === s.replace(/[-_&]/g, ' ')
      );
    });
  };

  // Fetch digital products and sellers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [productsRes, sellersRes] = await Promise.all([
          getDigitalProducts(),
          getPopularSellers()
        ]);
        const data = productsRes.data || [];
        setProducts(data);
        setPopularSellers(sellersRes.data || []);
      } catch (err) {
        console.error('Error fetching digital products or sellers:', err);
        setError('Gagal memuat produk digital. Silakan coba lagi.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Featured items for banner
  const featuredProducts = useMemo(() => {
    if (!products.length) return [];
    // Prioritize products with views/likes, or take first 3
    const sorted = [...products].sort((a, b) => ((b.view_count || 0) + (b.likes_count || 0)) - ((a.view_count || 0) + (a.likes_count || 0)));
    return sorted.slice(0, 3);
  }, [products]);

  // Set up automatic slider
  useEffect(() => {
    if (featuredProducts.length > 1) {
      sliderInterval.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % featuredProducts.length);
      }, 5000);
    }

    return () => {
      if (sliderInterval.current) {
        clearInterval(sliderInterval.current);
      }
    };
  }, [featuredProducts]);

  const goToSlide = (index) => {
    setActiveSlide(index);
    if (sliderInterval.current) {
      clearInterval(sliderInterval.current);
    }
    sliderInterval.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % featuredProducts.length);
    }, 5000);
  };

  // Extract unique categories from products
  const categoriesList = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const catKey = p.category || 'lainnya';
      const catLabel = p.category ? p.category.replace(/-/g, ' ').toUpperCase() : 'Lainnya';
      if (!map.has(catKey)) {
        map.set(catKey, { key: catKey, label: catLabel, count: 0 });
      }
      map.get(catKey).count += 1;
    });

    const list = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return [{ key: 'Semua', label: 'Semua', count: products.length }, ...list];
  }, [products]);

  // Filter products by search query and category
  const filteredProducts = useMemo(() => {
    let result = products;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.seller_name && p.seller_name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(p => {
        const catKey = (p.category || 'lainnya').toLowerCase().trim();
        return selectedCategories.some(sel => {
          const target = sel.toLowerCase().trim();
          return (
            catKey === target ||
            catKey.replace(/[-_]/g, ' ') === target.replace(/[-_]/g, ' ')
          );
        });
      });
    }

    return result;
  }, [products, searchQuery, selectedCategories]);

  // Sort products
  const sortedFilteredProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'terlaris') {
        const soldDiff = Number(b.sold_count || 0) - Number(a.sold_count || 0);
        if (soldDiff !== 0) return soldDiff;
        return Number(b.view_count || 0) - Number(a.view_count || 0);
      }
      if (sortBy === 'price_asc') {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortBy === 'price_desc') {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      // Default: populer
      const soldDiff = Number(b.sold_count || 0) - Number(a.sold_count || 0);
      if (soldDiff !== 0) return soldDiff;
      const viewsDiff = Number(b.view_count || 0) - Number(a.view_count || 0);
      if (viewsDiff !== 0) return viewsDiff;
      const likesDiff = Number(b.likes_count || 0) - Number(a.likes_count || 0);
      if (likesDiff !== 0) return likesDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [filteredProducts, sortBy]);

  // Group filtered products by Category for block view
  const categoryBlocks = useMemo(() => {
    const groups = {};

    sortedFilteredProducts.forEach(p => {
      const catKey = p.category || 'lainnya';
      const catLabel = p.category ? p.category.replace(/-/g, ' ').toUpperCase() : 'Lainnya';

      if (!groups[catKey]) {
        groups[catKey] = {
          key: catKey,
          label: catLabel,
          items: []
        };
      }
      groups[catKey].items.push(p);
    });

    return Object.values(groups);
  }, [sortedFilteredProducts]);

  const renderProductCard = (product) => {
    const productSlug = product.slug || product.id;
    const detailLink = `/digital-products/${productSlug}`;

    return (
      <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group">
        <div className="relative">
          {product.category && (
            <div className="absolute top-2 left-2 z-10 bg-emerald-600/95 backdrop-blur-xs text-white text-[9px] font-black px-2.5 py-1 rounded-xl shadow uppercase tracking-wider flex items-center gap-1">
              <span className="material-icons text-[11px]">{getCategoryIcon(product.category)}</span>
              {product.category}
            </div>
          )}

          <Link to={detailLink}>
            <img
              src={getMediaUrl(product.thumbnail_url || product.thumbnail) || '/placeholder-image.jpg'}
              alt={product.title}
              className="w-full h-36 md:h-44 object-cover group-hover:scale-105 transition-transform duration-300 bg-gray-50"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
              }}
            />
          </Link>

          <div className="absolute top-2 right-2 z-10">
            <ShareButton
              slug={product.slug || product.id}
              title={product.title}
              type="digital_product"
              username={product.seller_name}
              price={product.price}
              description={product.description}
              variant="card-icon"
            />
          </div>
        </div>

        <div className="p-3.5 flex flex-col flex-1 justify-between">
          <div>
            {/* Creator / Seller Badge */}
            <div className="flex items-center gap-1 text-gray-500 text-[10px] font-medium mb-1">
              <span className="material-icons text-[12px] text-emerald-600 shrink-0">verified</span>
              <span className="truncate max-w-[130px] md:max-w-[160px]" title={`Kreator: @${product.seller_name}`}>
                Kreator: @{product.seller_name}
              </span>
            </div>

            <h3 className="text-xs md:text-sm font-semibold mb-1.5 line-clamp-2 min-h-[36px] text-gray-800 hover:text-emerald-700 transition-colors">
              <Link to={detailLink}>
                {product.title}
              </Link>
            </h3>

            <div className="mb-2">
              <p className="text-emerald-700 font-bold text-sm">
                {formatIDR(product.price)}
              </p>
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className="text-gray-400">
                  format: digital download
                </span>
                {product.sold_count !== undefined && product.sold_count > 0 && (
                  <span className="font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="material-icons text-[11px]">shopping_bag</span>
                    {product.sold_count} terjual
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center text-gray-500 text-[10px] gap-1" title="Total Diklik / Dilihat">
                <span className="material-icons text-[12px] text-emerald-600">visibility</span>
                <span className="font-semibold text-gray-700">{product.view_count || 0}</span>
              </div>
              <div className="flex items-center text-gray-400 text-[10px] gap-1" title="Favorit">
                <span className="material-icons text-[12px] text-rose-500">favorite</span>
                <span>{product.likes_count || 0}</span>
              </div>
              <div
                className="flex items-center gap-1 ml-auto cursor-pointer hover:bg-emerald-50 px-1.5 py-0.5 rounded-lg transition-all max-w-[100px] md:max-w-[120px]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (product.seller_name) {
                    navigate(`/digital-produk/${product.seller_name}`);
                  } else if (product.user) {
                    setSelectedUserId(product.user);
                    setIsProfileModalOpen(true);
                  }
                }}
                title={`Kunjungi Kreator @${product.seller_name}`}
              >
                <img
                  src={getMediaUrl(product.seller_avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller_name || 'Kreator')}&background=random`}
                  alt={product.seller_name}
                  className="w-4 h-4 rounded-full object-cover border border-emerald-100 shrink-0"
                />
                <span className="text-[10px] font-bold text-emerald-700 truncate">@{product.seller_name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Link
              to={`/digital-products/${product.slug || product.id}/checkout`}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all transform active:scale-95 text-[11px]"
            >
              <span className="material-icons text-sm">shopping_bag</span>
              Beli Sekarang
            </Link>
            <Link
              to={detailLink}
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1 transition-all text-[11px] border border-emerald-200"
            >
              <span className="material-icons text-xs">visibility</span>
              Lihat Detail
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Helmet>
        <title>Produk Digital - Barakah Economy</title>
        <meta name="description" content="Koleksi produk, e-book, template, dan aset digital karya kreator muslim terpercaya di Barakah Economy" />
        <meta property="og:title" content="BARAKAH DIGITAL PRODUCTS" />
        <meta property="og:description" content="Koleksi produk, e-book, template, dan aset digital berkualitas" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <HeaderHome onSearch={handleSearchChange} />

      {/* Featured Banner Slider */}
      <div className="px-4 pt-4 max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 10 }}>
        {featuredProducts.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden h-52 lg:h-96 shadow-md border border-gray-100">
            <div className="h-full">
              {featuredProducts.map((product, index) => {
                return (
                  <div
                    key={product.id}
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
                      index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    <img
                      src={getMediaUrl(product.thumbnail_url || product.thumbnail) || '/placeholder-image.jpg'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-4 lg:p-8">
                      <div className="text-white max-w-xl">
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider mb-2 inline-block shadow">
                          Produk Digital Unggulan
                        </span>
                        <h2 className="text-lg lg:text-3xl font-bold line-clamp-1">{product.title}</h2>
                        <p className="text-xs lg:text-sm text-gray-200 line-clamp-2 mt-1 mb-3">
                          {product.description?.replace(/<[^>]*>?/gm, '')}
                        </p>
                        <Link
                          to={`/digital-products/${product.slug || product.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                          <span>Lihat Detail</span>
                          <span className="material-icons text-sm">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {featuredProducts.length > 1 && (
              <div className="absolute bottom-3 right-3 flex space-x-1.5 z-20">
                {featuredProducts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === activeSlide ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="px-4 py-8 max-w-6xl mx-auto">
        {/* Title and In-Page Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-7 bg-emerald-600 rounded-full"></span>
              Barakah Digital Store
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">
              Produk, template, e-book, dan aset digital karya kreator muslim terpercaya
            </p>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full md:w-80">
            <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari produk digital, kreator..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-2xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-sm transition"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons text-base">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filters: Mobile Dropdown vs Desktop Chips */}
        {categoriesList.length > 1 && (
          <div className="mb-6">
            {/* 1. Tampilan Khusus Mobile: Dropdown Multi-Select dengan Fitur Search Kategori */}
            <MobileCategoryFilterDropdown
              categories={categoriesList}
              selectedCategories={selectedCategories}
              onToggleCategory={handleCategoryToggle}
              onReset={() => handleCategoryToggle('Semua')}
              isCategorySelected={isCategorySelected}
              getCategoryIcon={getCategoryIcon}
              title="Kategori Produk Digital"
            />

            {/* 2. Tampilan Khusus Desktop: Baris Chips Elegan */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-icons text-sm text-emerald-600">category</span>
                  <span>Kategori Produk Digital</span>
                  {selectedCategories.length > 0 && (
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black">
                      {selectedCategories.length} Dipilih (Bisa multi-pilih)
                    </span>
                  )}
                </span>
                {selectedCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCategoryToggle('Semua')}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold transition flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">restart_alt</span>
                    <span>Reset Kategori</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 transition-all duration-500 mb-3">
                {(isCategoryExpanded ? categoriesList : categoriesList.slice(0, CATEGORY_LIMIT)).map((cat) => {
                  const isSelected = isCategorySelected(cat.key, cat.label);
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleCategoryToggle(cat.key)}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100 scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      } uppercase tracking-wider cursor-pointer`}
                    >
                      <span className="material-icons text-sm">{getCategoryIcon(cat.key)}</span>
                      <span>{cat.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cat.count}
                      </span>
                      {isSelected && cat.key !== 'Semua' && (
                        <span className="material-icons text-xs ml-0.5">check</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {categoriesList.length > CATEGORY_LIMIT && (
                <div className="flex justify-center md:justify-start">
                  <button
                    onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all duration-300 flex items-center gap-2 ${
                      isCategoryExpanded
                        ? 'bg-gray-100 text-gray-800 border-gray-200'
                        : 'bg-white text-emerald-700 border-emerald-600 hover:bg-emerald-50'
                    } border uppercase tracking-widest shadow-sm`}
                  >
                    {isCategoryExpanded ? (
                      <>
                        SEMBUNYIKAN KATEGORI <span className="material-icons text-sm">expand_less</span>
                      </>
                    ) : (
                      <>
                        {`LIHAT SEMUA KATEGORI (${categoriesList.length})`}{' '}
                        <span className="material-icons text-sm">expand_more</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Indicators Bar */}
        {(selectedCategories.length > 0 || searchQuery.trim()) && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 mb-6 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1 text-[11px]">
                <span className="material-icons text-sm text-emerald-700">filter_alt</span>
                Filter Aktif:
              </span>
              {selectedCategories.map((catKey) => (
                <span
                  key={catKey}
                  className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  <span>Kategori: {catKey}</span>
                  <button
                    type="button"
                    onClick={() => handleCategoryToggle(catKey)}
                    className="text-gray-400 hover:text-red-500 flex items-center"
                    title={`Hapus filter kategori ${catKey}`}
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </span>
              ))}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                  <span>Cari: "{searchQuery}"</span>
                  <button
                    onClick={() => handleSearchChange('')}
                    className="text-gray-400 hover:text-red-500 flex items-center"
                    title="Hapus pencarian"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareStoreFilter}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-white hover:bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 rounded-xl transition shadow-sm"
                title="Salin atau bagikan tautan dengan filter ini"
              >
                <span className="material-icons text-sm">{copiedShare ? 'check_circle' : 'share'}</span>
                {copiedShare ? 'Tautan Tersalin!' : 'Bagikan Filter Ini'}
              </button>
              <button
                onClick={handleResetFilters}
                className="text-xs text-gray-500 hover:text-red-600 font-bold underline px-1"
              >
                Reset Semua
              </button>
            </div>
          </div>
        )}

        {/* Sort & Filter Controls Toolbar */}
        <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200/80 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Mobile Sort Dropdown */}
          <MobileSortDropdown
            options={[
              { key: 'populer', label: 'Paling Populer', icon: 'trending_up' },
              { key: 'terlaris', label: 'Terlaris', icon: 'local_fire_department' },
              { key: 'price_asc', label: 'Harga Terendah', icon: 'south_east' },
              { key: 'price_desc', label: 'Harga Tertinggi', icon: 'north_east' },
              { key: 'newest', label: 'Terbaru', icon: 'schedule' },
            ]}
            currentSort={sortBy}
            onSortChange={handleSortChange}
            label="Urutkan"
          />

          {/* Desktop Sort Buttons */}
          <div className="hidden md:flex items-center gap-2 flex-wrap w-full md:w-auto">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <span className="material-icons text-sm text-emerald-600">tune</span>
              Urutkan:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'populer', label: 'Paling Populer', icon: 'trending_up', title: 'Paling populer & banyak dilihat' },
                { key: 'terlaris', label: 'Terlaris', icon: 'local_fire_department', title: 'Paling banyak terjual' },
                { key: 'price_asc', label: 'Harga Terendah', icon: 'south_east', title: 'Harga termurah ke termahal' },
                { key: 'price_desc', label: 'Harga Tertinggi', icon: 'north_east', title: 'Harga termahal ke termurah' },
                { key: 'newest', label: 'Terbaru', icon: 'schedule', title: 'Produk yang baru dirilis' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSortChange(opt.key)}
                  title={opt.title}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    sortBy === opt.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100 scale-105'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className={`material-icons text-sm ${sortBy === opt.key ? 'text-white' : 'text-emerald-600'}`}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-2.5 text-xs text-gray-500 font-medium">
            <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-xl border border-emerald-100 shrink-0">
              {sortedFilteredProducts.length} Produk Digital
            </span>

            {/* View Mode Toggle when no specific category is selected */}
            {selectedCategories.length === 0 && (
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Tampilkan semua produk dalam grid langsung"
                >
                  <span className="material-icons text-xs">grid_view</span>
                  Semua
                </button>
                <button
                  onClick={() => handleViewModeChange('blocks')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewMode === 'blocks' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Tampilkan per blok kategori"
                >
                  <span className="material-icons text-xs">view_agenda</span>
                  Per Kategori
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-3"></div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat produk digital...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-red-200 text-red-500 p-8 shadow-sm">
            <span className="material-icons text-5xl mb-2 text-red-400">error_outline</span>
            <p className="text-sm font-bold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              Coba Lagi
            </button>
          </div>
        ) : sortedFilteredProducts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 p-8 shadow-sm">
            <span className="material-icons text-6xl mb-3 text-gray-300">inventory_2</span>
            <p className="text-base font-bold text-gray-700">Tidak ada produk digital yang ditemukan</p>
            <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto">
              Coba cari dengan kata kunci lain atau pilih kategori yang berbeda
            </p>
            {(searchQuery || selectedCategories.length > 0) && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
              >
                Reset Pencarian & Filter
              </button>
            )}
          </div>
        ) : selectedCategories.length === 0 && viewMode === 'blocks' ? (
          /* Category-Grouped Blocks View */
          <div className="space-y-12">
            {categoryBlocks.map((block) => (
              <div key={block.key} className="space-y-4">
                {/* Category Block Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                      <span className="material-icons text-lg">{getCategoryIcon(block.key)}</span>
                    </div>
                    <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight uppercase">
                      {block.label}
                    </h2>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {block.items.length} Produk Digital
                    </span>
                  </div>

                  <button
                    onClick={() => handleCategoryToggle(block.key)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    <span>Filter Kategori Ini</span>
                    <span className="material-icons text-xs">chevron_right</span>
                  </button>
                </div>

                {/* Grid of Product Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                  {block.items.map(renderProductCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Standard Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {sortedFilteredProducts.map(renderProductCard)}
          </div>
        )}

        {/* Popular Sellers Section */}
        {!loading && popularSellers.length > 0 && (
          <div className="mt-14 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 bg-emerald-600 rounded-full"></span>
                <h2 className="text-base md:text-lg font-bold text-gray-800">Kreator & Penjual Populer</h2>
              </div>
              <span className="text-xs text-gray-400 font-medium">Kreator Terverifikasi</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {popularSellers.map((seller) => (
                <Link
                  key={seller.username}
                  to={`/digital-produk/${seller.username}`}
                  className="flex flex-col items-center gap-2 min-w-[84px] group"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-100 p-0.5 group-hover:border-emerald-500 transition-colors">
                    <div className="w-full h-full rounded-full bg-gray-50 overflow-hidden flex items-center justify-center">
                      {seller.picture || seller.shop_thumbnail ? (
                        <img
                          src={getMediaUrl(seller.picture || seller.shop_thumbnail)}
                          alt={seller.username}
                          className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.target.src = '/images/pas_foto_standard.png';
                          }}
                        />
                      ) : (
                        <span className="text-emerald-700 font-bold text-lg">
                          {seller.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 text-center truncate w-full group-hover:text-emerald-700 transition-colors">
                    @{seller.username}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <NavigationButton />
      <UserProfileModal
        userId={selectedUserId}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default DigitalProductListPage;
