// pages/EcommerceMainPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component

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
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const EcommerceMainPage = () => {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setfeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);
  const navigate = useNavigate();
    
  // Fetch featured products (only once when the component mounts)
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/products/`, 
          { params: { is_featured: true } } // Fetch only featured products
        );
        setfeaturedProducts(response.data.slice(0, 3)); // Take the first 3 featured products
      } catch (err) {
        console.error('Error fetching featured products:', err);
        setError('Failed to load featured products');
      }
    };
  
    fetchFeaturedProducts();
  }, []); // Empty dependency array ensures this runs only once
  
  // Fetch regular products (based on search query)
  const fetchProducts = async (search = '') => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/products/`, 
        { params: { search } }
      );
      setProducts(response.data); // Set regular products (search results)
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const newTimeout = setTimeout(() => {
      fetchProducts(query);
    }, 500);

    setSearchTimeout(newTimeout);
  };

  useEffect(() => {
    fetchProducts();
    
    // Clean up function
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
    // Reset timer
    if (sliderInterval.current) {
      clearInterval(sliderInterval.current);
    }
    sliderInterval.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % featuredProducts.length);
    }, 5000);
  };

  const addToCart = async (productId) => {
    const csrfToken = getCsrfToken();
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        console.error('User not logged in');
        navigate('/login'); // Redirect to login page if not logged in
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

      alert('Berhasil menambahkan ke Keranjang Belanja!');
    } catch (error) {
      console.error('Error adding product to cart:', error);
      alert('Gagal menambahkan ke Keranjang Belanja');
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

  return (
    <div className="body">
      <Helmet>
        <meta name="description" content="Beli Produk yang Halal Toyyib Barakah dari UMKM Terpercaya" />
        <meta property="og:title" content="BARAKAH SINERGY" />
        <meta property="og:description" content="Beli Produk yang Halal Toyyib Barakah dari UMKM Terpercaya" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <HeaderHome onSearch={handleSearch} />
  
      {/* Featured Campaign Slider */}
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        {featuredProducts.length > 0 && (
          <div className="relative rounded-lg overflow-hidden h-56">
            {/* Slides */}
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
                      src={product.thumbnail || '/images/peduli-dhuafa-banner.jpg'} 
                      alt={product.title}
                      className="w-full h-56 object-cover"
                      onError={(e) => {
                        e.target.src = '/images/peduli-dhuafa-banner.jpg';
                      }}
                    />            
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <h2 className="text-white font-bold text-lg">{product.title}</h2>
                      <h2 className="text-white text-sm">stok{' '} {product.stock > 0 ? product.stock : 'habis'}</h2>
                      {product.stock <= 0 ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => addToWishlist(product.id)}
                          className="w-full block text-center bg-red-600 text-white py-2 rounded-md text-sm hover:bg-red-600 flex items-center justify-center"
                        >
                          <span className="material-icons text-sm">favorite</span>+ INCARAN
                        </button>
                        <button
                          onClick={() => addToCart(product.id)}
                          className="w-full block text-center bg-gray-400 text-white py-2 rounded-md text-sm hover:bg-gray-500 flex items-center justify-center"
                          disabled
                        >
                          <span className="material-icons text-sm">add_shopping_cart</span>+ KERANJANG
                        </button>
                      </div>
                      
                      ) : (
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Indicators */}
            {featuredProducts.length > 1 && (
              <div className="absolute bottom-2 right-2 flex space-x-2 z-20">
                {featuredProducts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full ${
                      index === activeSlide ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  
      {/* Product Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map(product => {
              return (
                <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow">
                  <Link to={`/produk/${product.slug || product.id}`}>
                    <img 
                      src={product.thumbnail || '/placeholder-image.jpg'} 
                      alt={product.title}
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                  </Link>
                  <div className="p-2">
                    <h3 className="text-sm font-medium mb-2 line-clamp-2">{product.title}</h3>   
                    <div className="flex justify-between">
                      <p className="text-gray-600 text-xs mb-2">{formatIDR(product.price)} / {product.unit}</p>
                      <p className="text-gray-600 text-xs mb-2">stok{' '} {product.stock > 0 ? product.stock : 'habis'}</p>
                    </div>
                    {product.stock <= 0 ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => addToWishlist(product.id)}
                          className="w-full block text-center bg-red-600 text-white py-2 rounded-md text-sm hover:bg-red-600 flex items-center justify-center"
                        >
                          <span className="material-icons text-sm">favorite</span>
                        </button>
                        <button
                          onClick={() => addToCart(product.id)}
                          className="w-full block text-center bg-gray-400 text-white py-2 rounded-md text-sm hover:bg-gray-500 flex items-center justify-center"
                          disabled
                        >
                          <span className="material-icons text-sm">add_shopping_cart</span>
                        </button>
                      </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => addToWishlist(product.id)}
                            className="w-full block text-center bg-red-600 text-white py-2 rounded-md text-sm hover:bg-red-600 flex items-center justify-center"
                          >
                            <span className="material-icons text-sm">favorite</span>
                          </button>
                          <button
                            onClick={() => addToCart(product.id)}
                            className="w-full block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900 flex items-center justify-center"
                          >
                            <span className="material-icons text-sm">add_shopping_cart</span>
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
  
        {error && (
          <div className="text-center py-4 text-red-500">
            {error}
            <button 
              onClick={() => fetchProducts(searchQuery)} 
              className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>
  
      {/* Bottom Navigation */}
      <NavigationButton />
    </div>
  );
};

export default EcommerceMainPage;