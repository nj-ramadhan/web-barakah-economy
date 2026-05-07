// pages/EcommerceProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { formatCurrency } from '../utils/formatters';
import FloatingCartModal from '../components/layout/FloatingCartModal';
import UserProfileModal from '../components/modals/UserProfileModal';
import { getMediaUrl } from '../utils/mediaUtils';
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

      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetail();
  }, [slug]);

  const addToCart = async () => {
    // Check if variations exist but top one wasn't selected
    if (product.variations && product.variations.length > 0 && !selectedVariation) {
        alert('Silakan pilih variasi terlebih dahulu (misal: Warna/Ukuran)');
        return;
    }

    const csrfToken = getCsrfToken();
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        console.error('User not logged in');
        navigate('/login'); // Redirect to login page if not logged in
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

      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Error adding product to cart:', error);
      const msg = error.response?.data?.error || 'Gagal menambahkan produk ke keranjang';
      alert(msg);
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
              <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">{product.title}</h1>
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col gap-1">
                   <p className="text-2xl font-bold text-green-700">
                    {selectedVariation 
                      ? formatIDR(selectedVariation.additional_price > 0 ? selectedVariation.additional_price : product.price)
                      : (product.min_price && product.max_price && product.min_price !== product.max_price)
                        ? `${formatIDR(product.min_price)} ~ ${formatIDR(product.max_price)}`
                        : formatIDR(product.price)
                    }
                   </p>
                    <div className="flex items-center text-gray-400 text-xs gap-4">
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
                </div>
                <p className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Stok: {selectedVariation ? selectedVariation.stock : (product.total_stock || product.stock)}
                </p>
              </div>

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
                      className={`flex-1 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all transform ${isOutOfStock ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 hover:-translate-y-1'}`}
                      onClick={addToCart}
                      disabled={isOutOfStock}
                    >
                      <span className="material-icons text-xl">{isOutOfStock ? 'remove_shopping_cart' : 'shopping_cart'}</span>
                      {isOutOfStock ? 'Stok Habis' : 'Keranjang'}
                    </button>
                    <button 
                      className="px-6 py-3 border-2 border-green-600 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-all whitespace-nowrap"
                      onClick={() => addToWishlist(product.id)}
                    >
                      <span className="material-icons text-xl">favorite_border</span>
                    </button>

                    <button 
                      className={`flex-[2] py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all transform mt-4 md:mt-0 ${isOutOfStock ? 'bg-gray-50 text-gray-300 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 hover:-translate-y-1'}`}
                      onClick={() => {
                          if (isOutOfStock) return;
                          addToCart();
                          setTimeout(() => {
                              const bubble = document.getElementById('cart-floating-bubble');
                              if(bubble) bubble.click();
                          }, 500);
                      }}
                      disabled={isOutOfStock}
                    >
                      <span className="material-icons text-xl">{isOutOfStock ? 'block' : 'shopping_bag'}</span>
                      {isOutOfStock ? 'Habis' : 'Beli Langsung'}
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
            <div className="bg-white p-4 rounded-lg shadow">
              {product.description ? (
                <>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: showFullDescription
                        ? convertRelativeUrlsToAbsolute(product.description, baseUrl)
                        : convertRelativeUrlsToAbsolute(product.description, baseUrl).substring(0, 200) + '...',
                    }}
                  />
                  {product.description.length > 200 && (
                    <button
                      onClick={toggleDescription}
                      className="text-green-600 mt-2 text-sm"
                    >
                      {showFullDescription ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Selengkapnya'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Tidak ada deskripsi.</p>
              )}
            </div>
          )}


          {activeTab === 'testimonies' && (
            <div className="bg-white p-4 rounded-lg shadow">
              <ul>
                {product.testimonies && product.testimonies.length > 0 ? (
                  product.testimonies.map((testimoni) => (
                    <li key={testimoni.id} className="border-b py-2 px-4">
                      <div className="flex justify-between items-center">
                        <p className="text-green-700 font-semibold">
                          <strong>{testimoni.customer}</strong>
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(testimoni.created_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })} - {getTimeElapsed(testimoni.created_at)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        {renderStars(testimoni.stars)}
                      </div>
                      {testimoni.description ? (
                        <>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: showFullTestimonies[testimoni.id]
                                ? convertRelativeUrlsToAbsolute(testimoni.description, baseUrl)
                                : convertRelativeUrlsToAbsolute(testimoni.description, baseUrl).substring(0, 0) + '',
                            }}
                          />
                          {testimoni.description.length > 0 && (
                            <button
                              onClick={() => toggleTestimoni(testimoni.id)}
                              className="text-green-600 mt-2 text-sm"
                            >
                              {showFullTestimonies[testimoni.id] ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Selengkapnya'}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500">Tidak ada konten.</p>
                      )}
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">Belum ada testimoni terbaru.</p>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <NavigationButton />
      <FloatingCartModal />
      <UserProfileModal 
        userId={selectedUserId} 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </div>
  );
};

export default EcommerceProductDetail;