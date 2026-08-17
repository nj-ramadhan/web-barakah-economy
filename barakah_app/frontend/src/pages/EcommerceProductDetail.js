// pages/EcommerceProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { formatCurrency } from '../utils/formatters';
import UserProfileModal from '../components/modals/UserProfileModal';
import { getMediaUrl } from '../utils/mediaUtils';
import { toggleLikeProduct } from '../services/productApi';
import ShareButton from '../components/campaigns/ShareButton';
import '../styles/Body.css';

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

const getTimeElapsed = (createdAt) => {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const timeDifference = now - createdDate;

  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} hari lalu`;
  } else if (hours > 0) {
    return `${hours} jam lalu`;
  } else if (minutes > 0) {
    return `${minutes} menit lalu`;
  } else {
    return `${seconds} detik lalu`;
  }
};

const formatIDR = (amount) => {
  return 'Rp ' + formatCurrency(amount);
};

const EcommerceProductDetail = () => {
  const { slug } = useParams(); // Get the slug from the URL
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description'); // State to manage active tab
  const [quantity, setQuantity] = useState(1); // State to manage product quantity
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullTestimonies, setShowFullTestimonies] = useState({});
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isCartAnimating, setIsCartAnimating] = useState(false);
  const [liking, setLiking] = useState(false);

  const baseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (!product) return;
    const currentStock = selectedVariation ? selectedVariation.stock : (product.total_stock || product.stock);
    if (quantity > currentStock) {
      setQuantity(currentStock > 0 ? 1 : 0);
    }
  }, [selectedVariation, product]);

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        // Fetch product details
        const productResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products/${slug}/`);
        setProduct(productResponse.data);
        setIsLiked(productResponse.data.is_liked);
        setLikesCount(productResponse.data.likes_count);

      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [slug]);

  const [isAddingCart, setIsAddingCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const addToCart = async () => {
    if (isAddingCart) return;
    const currentStock = selectedVariation ? selectedVariation.stock : (product?.total_stock || product?.stock || 0);
    if (currentStock <= 0) {
      alert('Maaf, stok produk ini sedang habis.');
      return;
    }
    if (product.variations && product.variations.length > 0 && !selectedVariation) {
        alert('Silakan pilih variasi terlebih dahulu (misal: Warna/Ukuran)');
        return;
    }

    const csrfToken = getCsrfToken();
    try {
      setIsAddingCart(true);
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        navigate('/login');
        return;
      }

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
        product_id: product.id,
        variation_id: selectedVariation?.id || null,
        quantity: quantity
      }, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          'X-CSRFToken': csrfToken,
        }
      });

      // Trigger Cart Pop & Flying Micro-animation
      setIsCartAnimating(true);
      setTimeout(() => setIsCartAnimating(false), 1000);

      window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: { showToast: true, openDrawer: true, title: product?.title || 'Produk' }
      }));
    } catch (error) {
      console.error('Error adding product to cart:', error);
      const msg = error.response?.data?.error || 'Gagal menambahkan produk ke keranjang';
      alert(msg);
    } finally {
      setIsAddingCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (isBuyingNow) return;
    const currentStock = selectedVariation ? selectedVariation.stock : (product?.total_stock || product?.stock || 0);
    if (currentStock <= 0) {
      alert('Maaf, stok produk ini sedang habis.');
      return;
    }
    if (product?.variations && product.variations.length > 0 && !selectedVariation) {
        alert('Silakan pilih variasi terlebih dahulu (misal: Warna/Ukuran)');
        return;
    }

    const csrfToken = getCsrfToken();
    try {
      setIsBuyingNow(true);
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        navigate('/login');
        return;
      }

      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
        product_id: product.id,
        variation_id: selectedVariation?.id || null,
        quantity: quantity
      }, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          'X-CSRFToken': csrfToken,
        }
      });

      window.dispatchEvent(new CustomEvent('cartUpdated', {
        detail: { showToast: true, title: product?.title || 'Produk' }
      }));

      // Directly navigate to checkout
      navigate('/ecommerce/checkout-sinergy');
    } catch (error) {
      console.error('Error in buy now:', error);
      const msg = error.response?.data?.error || 'Gagal memproses Beli Langsung';
      alert(msg);
    } finally {
      setIsBuyingNow(false);
    }
  };

  const addToWishlist = async (productId) => {
    const csrfToken = getCsrfToken();
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        console.error('User not logged in');
        navigate('/login'); // Redirect to login page if not logged in
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

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error adding product to wishlist:', error);
      alert('Gagal menambahkan ke Incaran, ' + error['response']['data']['message']);
    }
  };

  const handleToggleLike = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      alert('Anda harus login terlebih dahulu untuk memberikan like.');
      return;
    }

    setLiking(true);
    // Optimistic UI
    const prevIsLiked = isLiked;
    const prevLikesCount = likesCount;
    setIsLiked(!prevIsLiked);
    setLikesCount(prevLikesCount + (prevIsLiked ? -1 : 1));

    try {
      const res = await toggleLikeProduct(product.id);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Rollback
      setIsLiked(prevIsLiked);
      setLikesCount(prevLikesCount);
    } finally {
      setLiking(false);
    }
  };

  const handleIncrement = () => {
    const currentStock = selectedVariation ? selectedVariation.stock : (product.total_stock || product.stock);
    setQuantity(prevQuantity => Math.min(prevQuantity + 1, currentStock));
  };

  const handleDecrement = () => {
    setQuantity(prevQuantity => Math.max(prevQuantity - 1, 1));
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!product) {
    return <div className="text-center py-8">Product not found.</div>;
  }

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  const toggleTestimoni = (testimoniId) => {
    setShowFullTestimonies((prev) => ({
      ...prev,
      [testimoniId]: !prev[testimoniId],
    }));
  };

  const convertRelativeUrlsToAbsolute = (htmlContent, baseUrl) => {
    // Ensure baseUrl does not have a trailing slash
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    // Convert relative image URLs to absolute URLs
    return htmlContent.replace(/<img[^>]+src="(\/[^"]+)"[^>]*>/g, (match, src) => {
      return match.replace(src, `${baseUrl}${src}`);
    });
  };

  const renderStars = (count) => {
    const maxStars = 5;
    return (
      <span>
        {[...Array(maxStars)].map((_, i) =>
          i < count ? (
            <span key={i} className="text-xl font-bold text-yellow-400">★</span>
          ) : (
            <span key={i} className="text-xl font-bold text-gray-300">☆</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="body">
      <Helmet>
        <title>{product.title} | BARAKAH ECONOMY</title>
        <meta name="description" content={product.description?.replace(/<[^>]+>/g, '').slice(0, 100)} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description?.replace(/<[^>]+>/g, '').slice(0, 100)} />
        <meta property="og:image" content={product.thumbnail} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": product.title,
            "image": [product.thumbnail],
            "description": product.description?.replace(/<[^>]+>/g, '').slice(0, 200),
            "sku": `PROD-${product.id}`,
            "brand": {
              "@type": "Brand",
              "name": "Barakah Economy"
            },
            "offers": {
              "@type": "Offer",
              "url": window.location.href,
              "priceCurrency": "IDR",
              "price": product.price,
              "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            },
            "aggregateRating": product.testimonies?.length > 0 ? {
              "@type": "AggregateRating",
              "ratingValue": (product.testimonies.reduce((acc, curr) => acc + curr.stars, 0) / product.testimonies.length).toFixed(1),
              "reviewCount": product.testimonies.length
            } : undefined
          })}
        </script>
      </Helmet>

      <Header />

      {/* Product Details */}
      <div className="px-4 py-8 max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-500 hover:text-green-700 transition mb-4">
            <span className="material-icons text-sm mr-1">arrow_back</span> Kembali
        </button>
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col md:flex-row">
          <div className="md:w-1/2">
            <div className="relative group">
              <img
                src={getMediaUrl(selectedImage) || getMediaUrl(product.thumbnail) || '/placeholder-image.jpg'}
                alt={product.title}
                className="w-full h-80 md:h-[500px] object-cover transition-all duration-300"
                onError={(e) => {
                  e.target.src = '/placeholder-image.jpg';
                }}
              />
              {product.images && product.images.length > 0 && (
                <div className="flex gap-2 p-4 overflow-x-auto bg-white/80 backdrop-blur-sm absolute bottom-0 left-0 right-0">
                   <div 
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer flex-shrink-0 transition ${(!selectedImage || selectedImage === product.thumbnail) ? 'border-green-600' : 'border-transparent'}`}
                    onClick={() => setSelectedImage(product.thumbnail)}
                  >
                    <img src={getMediaUrl(product.thumbnail)} className="w-full h-full object-cover" alt="thumb" />
                  </div>
                  {product.images.map((imgObj, idx) => (
                    <div 
                      key={idx} 
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer flex-shrink-0 transition ${selectedImage === imgObj.image ? 'border-green-600' : 'border-transparent'}`}
                      onClick={() => setSelectedImage(imgObj.image)}
                    >
                      <img src={getMediaUrl(imgObj.image)} className="w-full h-full object-cover" alt={`gallery-${idx}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-6 md:p-10 md:w-1/2 flex flex-col justify-between">
            <div>
              {(() => {
                const basePrice = Number(selectedVariation
                  ? (selectedVariation.additional_price > 0 ? selectedVariation.additional_price : product.price)
                  : product.price);

                let finalPrice = basePrice;
                let hasPromo = false;
                let promoDiscountPct = 0;

                if (product.active_promotion) {
                  const promo = product.active_promotion;
                  if (promo.discount_type === 'percentage') {
                    finalPrice = basePrice - (basePrice * (Number(promo.discount_value) / 100));
                    promoDiscountPct = Number(promo.discount_value);
                    hasPromo = true;
                  } else if (promo.discount_type === 'nominal') {
                    finalPrice = Math.max(0, basePrice - Number(promo.discount_value));
                    promoDiscountPct = basePrice > 0 ? Math.round((Number(promo.discount_value) / basePrice) * 100) : 0;
                    hasPromo = true;
                  } else if (promo.discount_type === 'min_qty_discount' && quantity >= Number(promo.min_quantity || 1)) {
                    if (promo.is_min_qty_percentage) {
                      finalPrice = basePrice - (basePrice * (Number(promo.discount_value) / 100));
                      promoDiscountPct = Number(promo.discount_value);
                    } else {
                      finalPrice = Math.max(0, basePrice - Number(promo.discount_value));
                      promoDiscountPct = basePrice > 0 ? Math.round((Number(promo.discount_value) / basePrice) * 100) : 0;
                    }
                    hasPromo = true;
                  }
                }

                return (
                  <>
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{product.title}</h1>
                      <ShareButton 
                        slug={product.slug || product.id} 
                        title={product.title} 
                        type="sinergy"
                        price={hasPromo ? finalPrice : basePrice}
                        originalPrice={hasPromo ? basePrice : null}
                        promoDiscount={hasPromo ? promoDiscountPct : null}
                        description={product.description}
                      />
                    </div>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex flex-col gap-1">
                        {hasPromo ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                <span className="material-icons text-[12px]">local_fire_department</span>
                                {promoDiscountPct > 0 ? `HEMAT ${promoDiscountPct}%` : 'PROMO'}
                              </span>
                              <span className="text-xs font-bold text-rose-600">{product.active_promotion?.title}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl md:text-3xl font-black text-emerald-700">
                                Rp {formatCurrency(finalPrice)}
                              </p>
                              <span className="text-sm font-semibold text-gray-400 line-through">
                                Rp {formatCurrency(basePrice)}
                              </span>
                              <span className="text-sm font-semibold text-gray-500">/ {product.unit || 'pcs'}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-2xl md:text-3xl font-black text-emerald-700 flex items-baseline gap-1">
                            <span>
                              {selectedVariation 
                                ? formatIDR(selectedVariation.additional_price > 0 ? selectedVariation.additional_price : product.price)
                                : (product.min_price && product.max_price && product.min_price !== product.max_price)
                                  ? `${formatIDR(product.min_price)} ~ ${formatIDR(product.max_price)}`
                                  : formatIDR(product.price)
                              }
                            </span>
                            <span className="text-sm font-semibold text-gray-500">/ {product.unit || 'pcs'}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleToggleLike}
                        className={`p-2 rounded-full border ${isLiked ? 'border-red-500 bg-red-50 text-red-500' : 'border-gray-200 text-gray-400 hover:text-red-500'} transition`}
                        title="Sukai produk"
                      >
                        <span className="material-icons text-xl">{isLiked ? 'favorite' : 'favorite_border'}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
                    <div className="flex items-center text-gray-400 text-xs gap-4 mb-4">
                        <div className="flex items-center gap-1">
                          <span className="material-icons text-sm">visibility</span>
                          {product.views_count || 0} kali dilihat
                        </div>
                        <div className="flex items-center gap-1">
                          <div 
                            className="flex items-center gap-2 font-bold text-green-700 hover:bg-green-50 p-1.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-green-100"
                            onClick={() => {
                              setSelectedUserId(product.seller);
                              setIsProfileModalOpen(true);
                            }}
                          >
                            <img 
                              src={getMediaUrl(product.seller_avatar) || `https://ui-avatars.com/api/?name=${product.seller_name}&background=random`} 
                              alt={product.seller_name} 
                              className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-sm" 
                            />
                            <span>@{product.seller_name}</span>
                          </div>
                        </div>
                    </div>
                <p className="text-sm font-medium text-gray-600 bg-gray-100 px-3.5 py-1.5 rounded-full border border-gray-200 mb-6 inline-block">
                  Stok: <span className="font-bold text-gray-900">{selectedVariation ? selectedVariation.stock : (product.total_stock || product.stock)}</span> {product.unit || 'pcs'}
                </p>

                {product?.variations && product.variations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Pilih Variasi {selectedVariation ? `: ${selectedVariation.name}` : ''}</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.variations.map(variant => (
                        <button 
                          key={variant.id} 
                          onClick={() => setSelectedVariation(variant)}
                          className={`px-4 py-2 border rounded-xl font-medium text-sm transition ${selectedVariation?.id === variant.id ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 hover:border-green-500 hover:text-green-700'}`}
                        >
                          {variant.name} {variant.additional_price > 0 && `(${formatIDR(variant.additional_price)})`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            {(() => {
              const currentStock = selectedVariation ? selectedVariation.stock : (product.total_stock || product.stock);
              const isOutOfStock = currentStock <= 0;

              return (
                <div className="mt-auto">
                  <div className="flex items-center gap-4 mb-8">
                    <span className="text-sm font-medium text-gray-700">Jumlah:</span>
                    <div className="flex items-center border border-gray-200 rounded-xl px-2 py-1">
                      <button
                        onClick={handleDecrement}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
                        disabled={quantity <= 1 || isOutOfStock}
                      >
                        <span className="material-icons text-lg">remove</span>
                      </button>
                      <span className="w-12 text-center font-bold text-gray-800">{isOutOfStock ? 0 : quantity}</span>
                      <button
                        onClick={handleIncrement}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
                        disabled={quantity >= currentStock || isOutOfStock}
                      >
                        <span className="material-icons text-lg">add</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <button 
                      className={`flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all transform ${isOutOfStock || isAddingCart ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 hover:-translate-y-1'} ${isCartAnimating ? 'animate-bounce ring-4 ring-green-300 scale-105' : ''}`}
                      onClick={addToCart}
                      disabled={isOutOfStock || isAddingCart}
                    >
                      {isAddingCart ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          <span>Menambahkan...</span>
                        </span>
                      ) : (
                        <>
                          <span className="material-icons text-xl">{isOutOfStock ? 'remove_shopping_cart' : 'shopping_cart'}</span>
                          {isOutOfStock ? 'Stok Habis' : 'Keranjang'}
                        </>
                      )}
                    </button>
                    <button 
                      className={`px-4 py-3 border-2 transition-all rounded-xl flex items-center justify-center gap-1.5 active:scale-90 shadow-sm ${isLiked ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'}`}
                      onClick={handleToggleLike}
                      disabled={liking}
                    >
                      <span className="material-icons text-xl">{isLiked ? 'favorite' : 'favorite_border'}</span>
                      <span className="text-xs font-bold">{likesCount}</span>
                    </button>
                    <button 
                      className="px-6 py-3 border-2 border-green-600 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-all whitespace-nowrap"
                      onClick={() => addToWishlist(product.id)}
                      title="Simpan ke Incaran"
                    >
                      <span className="material-icons text-xl">bookmark_border</span>
                    </button>

                    <button 
                      className={`flex-[2] py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all transform mt-4 md:mt-0 ${isOutOfStock || isBuyingNow ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 hover:-translate-y-1'}`}
                      onClick={handleBuyNow}
                      disabled={isOutOfStock || isBuyingNow}
                    >
                      {isBuyingNow ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          <span>Memproses...</span>
                        </span>
                      ) : (
                        <>
                          <span className="material-icons text-xl">{isOutOfStock ? 'block' : 'shopping_bag'}</span>
                          {isOutOfStock ? 'Habis' : 'Beli Langsung'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-4 px-4 max-w-6xl mx-auto pb-20">
        <div className="flex justify-start gap-8 bg-white border-b px-6">
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'description' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('description')}
          >
            Keterangan
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'testimonies' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('testimonies')}
          >
            Testimoni ({product.testimonies ? product.testimonies.length : 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'description' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              {product.description ? (
                <div>
                  <div 
                    className={`rich-text-content relative transition-all duration-300 ${!showFullDescription && product.description.length > 400 ? 'max-h-72 overflow-hidden' : ''}`}
                    dangerouslySetInnerHTML={{
                      __html: convertRelativeUrlsToAbsolute(product.description, baseUrl)
                    }}
                  />
                  {!showFullDescription && product.description.length > 400 && (
                    <div className="absolute -mt-16 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                  {product.description.length > 400 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={toggleDescription}
                        className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-sm hover:text-emerald-800 transition"
                      >
                        <span>{showFullDescription ? 'Tampilkan Lebih Ringkas' : 'Baca Selengkapnya'}</span>
                        <span className="material-icons text-sm">{showFullDescription ? 'expand_less' : 'expand_more'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">Belum ada deskripsi untuk produk ini.</p>
              )}
            </div>
          )}


          {activeTab === 'testimonies' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              {product.testimonies && product.testimonies.length > 0 ? (
                <div className="space-y-4 divide-y divide-gray-100">
                  {product.testimonies.map((testimoni) => (
                    <div key={testimoni.id} className="pt-4 first:pt-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                            {testimoni.customer ? testimoni.customer.slice(0, 2) : 'PL'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-xs">{testimoni.customer}</span>
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">
                                {testimoni.is_admin_entry ? 'Pembeli Terverifikasi' : 'Verified Buyer'}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(testimoni.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex text-amber-400 text-sm">
                          {renderStars(testimoni.stars || 5)}
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 leading-relaxed pl-10 whitespace-pre-line">
                        {testimoni.description}
                      </p>

                      {testimoni.image && (
                        <div className="pl-10 mt-3">
                          <img
                            src={getMediaUrl(testimoni.image)}
                            alt="Foto Ulasan"
                            className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(getMediaUrl(testimoni.image), '_blank')}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <span className="material-icons text-4xl text-gray-300">rate_review</span>
                  <p className="text-gray-500 text-xs mt-2">Belum ada testimoni untuk produk ini.</p>
                </div>
              )}
            </div>
          )}
        </div>
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

export default EcommerceProductDetail;