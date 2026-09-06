// pages/EcommerceMainPage.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';
import { formatCurrency } from '../utils/formatters';
import UserProfileModal from '../components/modals/UserProfileModal';
import { getMediaUrl } from '../utils/mediaUtils';
import ShareButton from '../components/campaigns/ShareButton';

function getCsrfToken() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null;
}

const formatIDR = (amount) => {
  return 'Rp ' + formatCurrency(amount);
};

const getCategoryIcon = (categoryKey = '') => {
  const cat = String(categoryKey).toLowerCase();
  if (cat.includes('makan') || cat.includes('sembako') || cat.includes('buah') || cat.includes('sayur') || cat.includes('bumbu') || cat.includes('protein')) {
    return 'restaurant';
  }
  if (cat.includes('pakaian') || cat.includes('fashion') || cat.includes('asesoris')) {
    return 'checkroom';
  }
  if (cat.includes('obat') || cat.includes('herbal') || cat.includes('kesehatan')) {
    return 'medical_services';
  }
  if (cat.includes('elektronik') || cat.includes('gadget')) {
    return 'devices';
  }
  if (cat.includes('perabotan') || cat.includes('rumah')) {
    return 'home';
  }
  if (cat.includes('kendaraan')) {
    return 'directions_car';
  }
  if (cat.includes('cantik') || cat.includes('rawat') || cat.includes('bersih')) {
    return 'spa';
  }
  return 'category';
};

const EcommerceMainPage = () => {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setfeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [sortBy, setSortBy] = useState('populer');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'blocks'
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Read query params from URL on initial load and when location.search changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('search') ?? params.get('seller') ?? params.get('q');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }

    const cat = params.get('category') || params.get('kategori') || params.get('cat');
    if (cat) {
      setSelectedCategory(cat);
    }

    const sort = params.get('sort') || params.get('urutkan') || params.get('order');
    if (sort) {
      setSortBy(sort);
    }

    const view = params.get('view');
    if (view === 'grid' || view === 'blocks') {
      setViewMode(view);
    }
  }, [location.search]);

  // Synchronize state changes to URL query parameters
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (selectedCategory && selectedCategory !== 'Semua') {
        params.set('category', selectedCategory);
      }
      if (sortBy && sortBy !== 'populer') {
        params.set('sort', sortBy);
      }
      if (viewMode && viewMode !== 'grid') {
        params.set('view', viewMode);
      }

      const newSearch = params.toString() ? `?${params.toString()}` : '';
      if (location.search !== newSearch) {
        navigate({
          pathname: location.pathname,
          search: newSearch
        }, { replace: true });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortBy, viewMode]);

  const handleShareStoreFilter = async () => {
    const currentUrl = window.location.href;
    const shareTitle = `Barakah Store - ${selectedCategory !== 'Semua' ? `Kategori ${selectedCategory}` : 'Katalog UMKM'}${searchQuery ? ` (Cari: ${searchQuery})` : ''}`;
    const shareText = `Yuk cek produk di Barakah Store${selectedCategory !== 'Semua' ? ` untuk kategori ${selectedCategory}` : ''}${searchQuery ? ` dengan kata kunci "${searchQuery}"` : ''}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if dismissed or unsupported
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
    if (!selectedCategory) return catKey === 'Semua';
    if (selectedCategory === 'Semua') return catKey === 'Semua';
    const sel = selectedCategory.toLowerCase().trim();
    return (
      catKey.toLowerCase() === sel ||
      catLabel.toLowerCase() === sel ||
      catKey.toLowerCase().replace(/[-_]/g, ' ') === sel.replace(/[-_]/g, ' ')
    );
  };

  const CATEGORY_LIMIT = 8; // Number of category chips shown initially

  // Helpers for price & stock
  const getEffectivePrice = (product) => {
    if (product.active_promotion && product.discounted_price) {
      return Number(product.discounted_price);
    }
    if (product.min_price && Number(product.min_price) > 0) {
      return Number(product.min_price);
    }
    return Number(product.price || 0);
  };

  const getEffectiveStock = (product) => {
    if (product.total_stock !== undefined && product.total_stock !== null) {
      return Number(product.total_stock);
    }
    return Number(product.stock || 0);
  };

  // Sort helper: Always prioritize in-stock items, then apply selected sort criteria
  const sortProductList = (items, sortMode) => {
    return [...items].sort((a, b) => {
      const stockA = getEffectiveStock(a);
      const stockB = getEffectiveStock(b);
      const inStockA = stockA > 0 ? 1 : 0;
      const inStockB = stockB > 0 ? 1 : 0;

      // In-stock products always take precedence over out-of-stock products
      if (inStockA !== inStockB) {
        return inStockB - inStockA;
      }

      if (sortMode === 'price_asc') {
        return getEffectivePrice(a) - getEffectivePrice(b);
      }
      if (sortMode === 'price_desc') {
        return getEffectivePrice(b) - getEffectivePrice(a);
      }
      if (sortMode === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortMode === 'stock') {
        return stockB - stockA;
      }
      // Default: 'populer' (Clicks/views highest first, then likes, then newest)
      const viewsA = Number(a.views_count || 0);
      const viewsB = Number(b.views_count || 0);
      if (viewsB !== viewsA) {
        return viewsB - viewsA;
      }
      const likesA = Number(a.likes_count || 0);
      const likesB = Number(b.likes_count || 0);
      if (likesB !== likesA) {
        return likesB - likesA;
      }
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  };

  // Fetch featured products
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/products/`,
          { params: { is_featured: true } }
        );
        setfeaturedProducts(response.data.slice(0, 3));
      } catch (err) {
        console.error('Error fetching featured products:', err);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/products/`
      );
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Gagal memuat produk. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    return () => {
      if (sliderInterval.current) {
        clearInterval(sliderInterval.current);
      }
    };
  }, []);

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

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Extract unique categories from products
  const categoriesList = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const catKey = p.category || 'lainnya';
      const catLabel = p.category_display || p.category_name || (p.category ? p.category.replace(/-/g, ' ').toUpperCase() : 'Lainnya');
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
        (p.seller_city_name && p.seller_city_name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.category_display && p.category_display.toLowerCase().includes(q))
      );
    }

    if (selectedCategory && selectedCategory !== 'Semua') {
      const target = selectedCategory.toLowerCase().trim();
      result = result.filter(p => {
        const catKey = (p.category || 'lainnya').toLowerCase().trim();
        const catDisplay = (p.category_display || p.category_name || '').toLowerCase().trim();
        return (
          catKey === target ||
          catDisplay === target ||
          catKey.replace(/[-_]/g, ' ') === target.replace(/[-_]/g, ' ') ||
          catDisplay.replace(/[-_&]/g, ' ') === target.replace(/[-_&]/g, ' ')
        );
      });
    }

    return result;
  }, [products, searchQuery, selectedCategory]);

  // Sorted and filtered product list
  const sortedFilteredProducts = useMemo(() => {
    return sortProductList(filteredProducts, sortBy);
  }, [filteredProducts, sortBy]);

  // Group filtered products by Category for block view
  const categoryBlocks = useMemo(() => {
    const groups = {};

    sortedFilteredProducts.forEach(p => {
      const catKey = p.category || 'lainnya';
      const catLabel = p.category_display || p.category_name || (p.category ? p.category.replace(/-/g, ' ').toUpperCase() : 'Lainnya');
      
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

  const addToCart = async (productId) => {
    const csrfToken = getCsrfToken();
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        navigate('/login');
        return;
      }

      const product = products.find(p => p.id === productId) || featuredProducts.find(p => p.id === productId);
      if (product && product.variations && product.variations.length > 0) {
        navigate(`/produk/${product.slug || product.id}`);
        return;
      }

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
        product_id: productId,
        quantity: 1
      }, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          'X-CSRFToken': csrfToken,
        }
      });

      window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: { showToast: true, openDrawer: true, title: product?.title || 'Produk' }
      }));
    } catch (error) {
      console.error('Error adding product to cart:', error);
      alert('Gagal menambahkan ke Keranjang Belanja');
    }
  };

  const handleBuyNow = async (productId) => {
    const csrfToken = getCsrfToken();
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        navigate('/login');
        return;
      }

      const product = products.find(p => p.id === productId) || featuredProducts.find(p => p.id === productId);
      if (product && product.variations && product.variations.length > 0) {
        navigate(`/produk/${product.slug || product.id}`);
        return;
      }

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
        product_id: productId,
        quantity: 1
      }, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          'X-CSRFToken': csrfToken,
        }
      });

      window.dispatchEvent(new CustomEvent('cartUpdated'));
      navigate('/ecommerce/checkout-sinergy');
    } catch (error) {
      console.error('Error in Beli Langsung:', error);
      alert('Gagal memproses pembelian langsung');
    }
  };

  const renderProductCard = (product) => {
    const effectiveStock = getEffectiveStock(product);
    const inStock = effectiveStock > 0;
    const sellerCity = product.seller_city_name || 'Indonesia';

    return (
      <div key={product.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group ${!inStock ? 'opacity-75' : ''}`}>
        <div className="relative">
          {product.active_promotion && (
            <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
              <span className="material-icons text-[12px]">local_fire_department</span>
              {product.promo_discount_percentage ? `-${product.promo_discount_percentage}%` : 'PROMO'}
            </div>
          )}
          {!inStock && (
            <div className="absolute top-2 right-12 z-10 bg-gray-900/80 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow uppercase tracking-wider">
              Habis
            </div>
          )}
          <Link to={`/produk/${product.slug || product.id}`}>
            <img
              src={getMediaUrl(product.thumbnail) || '/placeholder-image.jpg'}
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
              type="product"
              price={product.discounted_price || product.price}
              description={product.description}
              variant="card-icon"
            />
          </div>
        </div>

        <div className="p-3.5 flex flex-col flex-1 justify-between">
          <div>
            {/* Store / Seller City Location Badge */}
            <div className="flex items-center gap-1 text-gray-500 text-[10px] font-medium mb-1">
              <span className="material-icons text-[12px] text-emerald-600 shrink-0">location_on</span>
              <span className="truncate max-w-[130px] md:max-w-[160px]" title={`Lokasi Toko: ${sellerCity}`}>
                {sellerCity}
              </span>
            </div>

            <h3 className="text-xs md:text-sm font-semibold mb-1.5 line-clamp-2 min-h-[36px] text-gray-800 hover:text-emerald-700 transition-colors">
              <Link to={`/produk/${product.slug || product.id}`}>
                {product.title}
              </Link>
            </h3>

            <div className="mb-2">
              {product.active_promotion && product.discounted_price ? (
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-emerald-700 font-bold text-sm">
                      Rp {formatCurrency(product.discounted_price)}
                    </p>
                    <span className="text-gray-400 line-through text-[11px] font-semibold">
                      Rp {formatCurrency(product.price)}
                    </span>
                  </div>
                  <span className="text-[10px] font-normal text-gray-400 block">/ {product.unit || 'pcs'}</span>
                </div>
              ) : (
                <p className="text-emerald-700 font-bold text-sm">
                  {product.min_price && product.max_price && product.min_price !== product.max_price
                    ? `Rp ${formatCurrency(product.min_price)} ~ ${formatCurrency(product.max_price)}`
                    : formatIDR(product.price)
                  } <span className="text-[10px] font-normal text-gray-400">/ {product.unit || 'pcs'}</span>
                </p>
              )}
              <p className="text-gray-400 text-[10px]">
                stok: {inStock ? `${effectiveStock} ${product.unit || 'pcs'}` : 'habis'}
              </p>
            </div>
          
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center text-gray-500 text-[10px] gap-1" title="Total Diklik / Dilihat">
                <span className="material-icons text-[12px] text-emerald-600">visibility</span>
                <span className="font-semibold text-gray-700">{product.views_count || 0}</span>
              </div>
              <div className="flex items-center text-gray-400 text-[10px] gap-1" title="Favorit">
                <span className="material-icons text-[12px] text-rose-500">favorite</span>
                <span>{product.likes_count || 0}</span>
              </div>
              <div 
                className="flex items-center gap-1 ml-auto cursor-pointer hover:bg-emerald-50 px-1.5 py-0.5 rounded-lg transition-all max-w-[90px] md:max-w-[110px]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedUserId(product.seller);
                  setIsProfileModalOpen(true);
                }}
                title={`Toko @${product.seller_name}`}
              >
                <img 
                  src={getMediaUrl(product.seller_avatar) || `https://ui-avatars.com/api/?name=${product.seller_name}&background=random`} 
                  alt={product.seller_name} 
                  className="w-4 h-4 rounded-full object-cover border border-emerald-100 shrink-0" 
                />
                <span className="text-[10px] font-bold text-emerald-700 truncate">@{product.seller_name}</span>
              </div>
            </div>
          </div>

          {!inStock ? (
            <div className="flex flex-col gap-1.5">
              <button
                className="w-full bg-gray-100 text-gray-400 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed text-xs font-bold"
                disabled
              >
                <span className="material-icons text-sm">remove_shopping_cart</span>
                Stok Habis
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <button
                  onClick={() => addToCart(product.id)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all transform active:scale-95 text-[11px]"
                >
                  <span className="material-icons text-sm">shopping_cart</span>
                  + Keranjang
                </button>
              </div>
              <button
                onClick={() => handleBuyNow(product.id)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all transform active:scale-95 text-[11px]"
              >
                <span className="material-icons text-sm">shopping_bag</span>
                Beli Langsung
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Helmet>
        <title>Barakah Store - Belanja Produk Halal & Berkah</title>
        <meta name="description" content="Beli Produk yang Halal Toyyib Barakah dari UMKM Terpercaya di Barakah Store" />
        <meta property="og:title" content="BARAKAH STORE" />
        <meta property="og:description" content="Beli Produk yang Halal Toyyib Barakah dari UMKM Terpercaya di Barakah Store" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <HeaderHome onSearch={handleSearch} />

      {/* Featured Banner Slider */}
      <div className="px-4 pt-4 max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 10 }}>
        {featuredProducts.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden h-52 lg:h-96 shadow-md border border-gray-100">
            <div className="h-full">
              {featuredProducts.map((product, index) => {
                return (
                  <div
                    key={product.id}
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                  >
                    <img
                      src={product.thumbnail || '/images/peduli-dhuafa-banner.jpg'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4 lg:p-8">
                      <div className="text-white max-w-xl">
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider mb-2 inline-block">
                          Produk Unggulan
                        </span>
                        <h2 className="text-lg lg:text-3xl font-bold line-clamp-1">{product.title}</h2>
                        <p className="text-xs lg:text-sm text-gray-200 line-clamp-2 mt-1 mb-3">
                          {product.description?.replace(/<[^>]*>?/gm, '')}
                        </p>
                        <Link
                          to={`/produk/${product.slug || product.id}`}
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
                    className={`w-2.5 h-2.5 rounded-full transition-all ${index === activeSlide ? 'bg-white scale-125' : 'bg-white/50'
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
              Barakah Store UMKM
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">
              Produk halal, berkualitas, dan berdaya saing persembahan Barakah Store
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari produk, toko, atau kota..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-2xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-sm transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons text-base">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        {categoriesList.length > 1 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 transition-all duration-500 mb-3">
              {(isCategoryExpanded ? categoriesList : categoriesList.slice(0, CATEGORY_LIMIT)).map((cat) => {
                const isSelected = isCategorySelected(cat.key, cat.label);
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100 scale-105'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    } uppercase tracking-wider`}
                  >
                    <span className="material-icons text-sm">{getCategoryIcon(cat.key)}</span>
                    <span>{cat.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {cat.count}
                    </span>
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
                    <>SEMBUNYIKAN KATEGORI <span className="material-icons text-sm">expand_less</span></>
                  ) : (
                    <>{`LIHAT SEMUA KATEGORI (${categoriesList.length})`} <span className="material-icons text-sm">expand_more</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Filter Indicators Bar */}
        {(selectedCategory !== 'Semua' || searchQuery.trim()) && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 mb-6 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1 text-[11px]">
                <span className="material-icons text-sm text-emerald-700">filter_alt</span>
                Filter Aktif:
              </span>
              {selectedCategory !== 'Semua' && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                  <span>Kategori: {selectedCategory}</span>
                  <button
                    onClick={() => setSelectedCategory('Semua')}
                    className="text-gray-400 hover:text-red-500 flex items-center"
                    title="Hapus filter kategori"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </span>
              )}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                  <span>Cari: "{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery('')}
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
                onClick={() => {
                  setSelectedCategory('Semua');
                  setSearchQuery('');
                }}
                className="text-xs text-gray-500 hover:text-red-600 font-bold underline px-1"
              >
                Reset Semua
              </button>
            </div>
          </div>
        )}

        {/* Sort & Filter Controls Toolbar */}
        <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200/80 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <span className="material-icons text-sm text-emerald-600">tune</span>
              Urutkan:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'populer', label: 'Paling Populer', icon: 'trending_up', title: 'Urutan default: Stok ada & paling banyak diklik' },
                { key: 'price_asc', label: 'Harga Terendah', icon: 'south_east', title: 'Harga termurah ke termahal' },
                { key: 'price_desc', label: 'Harga Tertinggi', icon: 'north_east', title: 'Harga termahal ke termurah' },
                { key: 'newest', label: 'Terbaru', icon: 'schedule', title: 'Produk yang baru ditambahkan' },
                { key: 'stock', label: 'Stok Terbanyak', icon: 'inventory_2', title: 'Jumlah stok paling banyak' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
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
              {sortedFilteredProducts.length} Produk
            </span>

            {/* Quick Share Link Button */}
            <button
              onClick={handleShareStoreFilter}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 ${
                copiedShare
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500 shadow-sm'
              }`}
              title="Bagikan link dengan pencarian / filter aktif saat ini"
            >
              <span className="material-icons text-sm">{copiedShare ? 'check_circle' : 'share'}</span>
              <span>{copiedShare ? 'Tersalin!' : 'Bagikan Filter'}</span>
            </button>

            {/* View Mode Toggle when category is 'Semua' */}
            {selectedCategory === 'Semua' && (
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Tampilkan semua produk dalam grid langsung"
                >
                  <span className="material-icons text-xs">grid_view</span>
                  Semua
                </button>
                <button
                  onClick={() => setViewMode('blocks')}
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
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat produk sinergy...</p>
          </div>
        ) : sortedFilteredProducts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 p-8 shadow-sm">
            <span className="material-icons text-6xl mb-3 text-gray-300">inventory_2</span>
            <p className="text-base font-bold text-gray-700">Tidak ada produk yang ditemukan</p>
            <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto">
              Coba cari dengan kata kunci lain atau pilih kategori yang berbeda
            </p>
            {(searchQuery || selectedCategory !== 'Semua') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Semua');
                }}
                className="mt-4 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
              >
                Reset Pencarian & Filter
              </button>
            )}
          </div>
        ) : selectedCategory === 'Semua' && viewMode === 'blocks' ? (
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
                      {block.items.length} Produk
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedCategory(block.key)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    <span>Filter Kategori Ini</span>
                    <span className="material-icons text-xs">chevron_right</span>
                  </button>
                </div>

                {/* Grid of Product Cards in this Category */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                  {block.items.map(renderProductCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Direct Full Grid View (Sorted from Top-Left to Bottom-Right) */
          <div>
            {selectedCategory !== 'Semua' && (
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                    <span className="material-icons text-lg">{getCategoryIcon(selectedCategory)}</span>
                  </div>
                  <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight uppercase">
                    Kategori: {categoriesList.find(c => c.key === selectedCategory)?.label || selectedCategory}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCategory('Semua')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Tampilkan Semua Kategori
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {sortedFilteredProducts.map(renderProductCard)}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-6 bg-red-50 rounded-2xl border border-red-200 text-red-600 text-xs mt-6">
            {error}
            <button
              onClick={fetchProducts}
              className="ml-3 px-3 py-1 bg-red-600 text-white rounded-lg font-bold"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation & Profile Modal */}
      <NavigationButton />
      <UserProfileModal 
        userId={selectedUserId} 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
};

export default EcommerceMainPage;