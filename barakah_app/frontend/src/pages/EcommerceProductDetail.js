// pages/EcommerceProductDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
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
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
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

  const baseUrl = process.env.REACT_APP_API_BASE_URL;

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
      alert('Gagal menambahkan produk ke keranjang');
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
    setQuantity(prevQuantity => Math.min(prevQuantity + 1, product.stock));
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
      </Helmet>

      <Header />

      {/* Product Details */}
      <div className="px-4 py-8 max-w-6xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-500 hover:text-green-700 transition mb-4">
            <span className="material-icons text-sm mr-1">arrow_back</span> Kembali
        </button>
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 flex flex-col md:flex-row">
          <div className="md:w-1/2">
            <img
              src={product.thumbnail || '/placeholder-image.jpg'}
              alt={product.title}
              className="w-full h-64 md:h-full object-cover"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
              }}
            />
          </div>
          <div className="p-6 md:p-10 md:w-1/2 flex flex-col justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">{product.title}</h1>
              <div className="flex justify-between items-center mb-6">
                <p className="text-2xl font-bold text-green-700">{formatIDR(selectedVariation ? product.price + selectedVariation.additional_price : product.price)}</p>
                <p className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Stok: {product.stock}</p>
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
                        {variant.name} {variant.additional_price > 0 && `(+${formatIDR(variant.additional_price)})`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-8">
                <span className="text-sm font-medium text-gray-700">Jumlah:</span>
                <div className="flex items-center border border-gray-200 rounded-xl px-2 py-1">
                  <button
                    onClick={handleDecrement}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
                    disabled={quantity === 1}
                  >
                    <span className="material-icons text-lg">remove</span>
                  </button>
                  <span className="w-12 text-center font-bold text-gray-800">{quantity}</span>
                  <button
                    onClick={handleIncrement}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
                    disabled={quantity >= product.stock}
                  >
                    <span className="material-icons text-lg">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all transform hover:-translate-y-1"
                onClick={addToCart}
              >
                <span className="material-icons text-xl">shopping_cart</span>
                Keranjang
              </button>
              <button 
                className="px-6 py-3 border-2 border-green-600 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-all whitespace-nowrap"
                onClick={() => addToWishlist(product.id)}
              >
                <span className="material-icons text-xl">favorite_border</span>
              </button>

              {/* BELI LANGSUNG */}
              <button 
                className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-1 mt-4 md:mt-0"
                onClick={() => {
                    addToCart();
                    setTimeout(() => {
                        const bubble = document.getElementById('cart-floating-bubble');
                        if(bubble) bubble.click();
                    }, 500);
                }}
              >
                <span className="material-icons text-xl">shopping_bag</span>
                Beli Langsung
              </button>
            </div>
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
    </div>
  );
};

export default EcommerceProductDetail;