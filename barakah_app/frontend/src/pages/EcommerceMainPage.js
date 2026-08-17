// pages/EcommerceMainPage.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const CATEGORY_LIMIT = 8; // Number of category chips shown initially

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
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.category_display && p.category_display.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'Semua') {
      result = result.filter(p => (p.category || 'lainnya') === selectedCategory);
    }

    return result;
  }, [products, searchQuery, selectedCategory]);

  // Group filtered products by Category for block view
  const categoryBlocks = useMemo(() => {
    const groups = {};

    filteredProducts.forEach(p => {
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
  }, [filteredProducts]);

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

  const addToWishlist = async (productId) => {
    const csrfToken = getCsrfToken();
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        navigate('/login');
        return;
      }

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/wishlists/wishlist/`, {
        product_id: productId
      }, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          'X-CSRFToken': csrfToken,
        }
      });

      alert('Berhasil menambahkan ke Incaran!');
    } catch (error) {
      console.error('Error adding product to wishlist:', error);
      alert('Gagal menambahkan ke Incaran: ' + (error.response?.data?.message || 'Terjadi kesalahan'));
    }
  };

  const renderProductCard = (product) => {
    return (
      <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group">
        <div className="relative">
          {product.active_promotion && (
            <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
              <span className="material-icons text-[12px]">local_fire_department</span>
              {product.promo_discount_percentage ? `-${product.promo_discount_percentage}%` : 'PROMO'}
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
                stok: {(product.total_stock !== undefined ? product.total_stock : product.stock) > 0 ? `${product.total_stock !== undefined ? product.total_stock : product.stock} ${product.unit || 'pcs'}` : 'habis'}
              </p>
            </div>
          
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center text-gray-400 text-[10px] gap-1">
                <span className="material-icons text-[12px]">visibility</span>
                {product.views_count || 0}
              </div>
              <div className="flex items-center text-gray-400 text-[10px] gap-1">
                <span className="material-icons text-[12px]">favorite</span>
                {product.likes_count || 0}
              </div>
              <div 
                className="flex items-center gap-1 ml-auto cursor-pointer hover:bg-emerald-50 px-1.5 py-0.5 rounded-lg transition-all"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedUserId(product.seller);
                  setIsProfileModalOpen(true);
                }}
              >
                <img 
                  src={getMediaUrl(product.seller_avatar) || `https://ui-avatars.com/api/?name=${product.seller_name}&background=random`} 
                  alt={product.seller_name} 
                  className="w-4 h-4 rounded-full object-cover border border-emerald-100" 
                />
                <span className="text-[10px] font-bold text-emerald-700">@{product.seller_name}</span>
              </div>
            </div>
          </div>

          {product.stock <= 0 ? (
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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all transform active:scale-95 text-[11px]"
                >
                  <span className="material-icons text-sm">shopping_cart</span>
                  Keranjang
                </button>
                <button
                  onClick={() => addToWishlist(product.id)}
                  className="px-2.5 py-2 border border-emerald-600 text-emerald-700 font-bold rounded-xl flex items-center justify-center hover:bg-emerald-50 transition-all active:scale-95"
                  title="Tambah ke Incaran"
                >
                  <span className="material-icons text-sm">favorite_border</span>
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
        <title>Sinergy E-Commerce - Barakah Economy</title>
        <meta name="description" content="Beli Produk yang Halal Toyyib Barakah dari UMKM Terpercaya" />
        <meta property="og:title" content="BARAKAH E-COMMERCE" />
        <meta property="og:description" content="Beli Produk yang Halal Toyyib Barakah dari UMKM Terpercaya" />
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
              Sinergy E-Commerce UMKM
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">
              Produk halal, berkualitas, dan berdaya saing persembahan UMKM Barakah Economy
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
              placeholder="Cari produk, kategori, toko..."
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
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 transition-all duration-500 mb-3">
              {(isCategoryExpanded ? categoriesList : categoriesList.slice(0, CATEGORY_LIMIT)).map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border flex items-center gap-1.5 ${
                    selectedCategory === cat.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100 scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                  } uppercase tracking-wider`}
                >
                  <span className="material-icons text-sm">{getCategoryIcon(cat.key)}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedCategory === cat.key ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cat.count}
                  </span>
                </button>
              ))}
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

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-3"></div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat produk sinergy...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
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
        ) : (
          /* Category-Grouped Blocks (seperti halaman Event) */
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

                  {selectedCategory === 'Semua' && (
                    <button
                      onClick={() => setSelectedCategory(block.key)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      <span>Filter Kategori Ini</span>
                      <span className="material-icons text-xs">chevron_right</span>
                    </button>
                  )}
                </div>

                {/* Grid of Product Cards in this Category */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                  {block.items.map(renderProductCard)}
                </div>
              </div>
            ))}
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