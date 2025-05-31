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
        quantity: quantity
      }, {
        headers: {
          Authorization: `Bearer ${user.access}`,
          'X-CSRFToken': csrfToken,
        }
      });

      alert('Berhasil menambahkan produk ke keranjang!');
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

      alert('Berhasil menambahkan ke Incaran!');
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
      <div className="px-4 py-4">
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <img
            src={product.thumbnail || '/placeholder-image.jpg'}
            alt={product.title}
            className="w-full h-56 object-cover"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
          <div className="p-4">
            <h1 className="text-xl font-bold mb-2">{product.title}</h1>
            <div className="flex justify-between">
              <p className="text-gray-600 text-sm mb-2">{formatIDR(product.price)}</p>
              <p className="text-gray-600 text-sm mb-2">Stock: {product.stock} {product.unit}</p>
            </div>
            <div className="flex items-center mb-4">
              <button
                onClick={handleDecrement}
                className="bg-gray-300 material-icons text-sm text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400"
                disabled={quantity === 1}
              >
                remove
              </button>
              <span className="mx-2">{quantity}</span>
              <button
                onClick={handleIncrement}
                className="bg-gray-300 material-icons text-sm text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400"
                disabled={quantity >= product.stock}
              >
                add
              </button>
            </div>
            <div className="w-full flex justify-between space-x-2 mt-2">
              <button
                onClick={() => addToWishlist(product.id)}
                className=" w-full block text-center bg-red-600 text-white py-2 rounded-md text-sm hover:bg-red-700 flex items-center justify-center"
              >
                <span className="material-icons text-sm mr-2">favorite</span>+ INCARAN
              </button>                      
              <button
                onClick={() => addToCart(product.id)}
                className="w-full block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900 flex items-center justify-center"
              >
                <span className="material-icons text-sm mr-2">add_shopping_cart</span>+ KERANJANG
              </button>
            </div>
          </div>    
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-4 px-4">
        <div className="flex justify-around bg-white border-b">
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