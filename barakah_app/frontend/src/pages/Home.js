// pages/Home.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import HeaderHome from '../components/layout/HeaderHome'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
import 'swiper/swiper-bundle.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar } from 'swiper/modules';

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

const formatIDRTarget = (amount) => {
  if (amount <= 0) return '\u221E';
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatIDRCourse = (amount) => {
  if (amount <= 0) return 'GRATIS';
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const isCampaignExpired = (deadline) => {
  if (!deadline) return false; // Campaigns with no deadline never expire
  return new Date(deadline) < new Date(); // Check if the deadline has passed
};

const formatDeadline = (deadline) => {
  if (!deadline) return 'tidak ada'; // Campaigns with no deadline
  const date = new Date(deadline);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const Home = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [featuredProducts, setfeaturedProducts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [featuredCourses, setFeaturedCourses] = useState([]);    
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);
  const navigate = useNavigate();
     
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products`);
        const featuredProducts = response.data.filter(product => product.is_featured === true);
        setfeaturedProducts(featuredProducts.slice(0, 4));
      } catch (err) {
        console.error('Error fetching featured products:', err);
        setError('Failed to load featured products');
      }
    };
    fetchFeaturedProducts();

    const fetchFeaturedCampaigns = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/campaigns`);
        const featuredCampaigns = response.data.filter(campaign => campaign.is_featured === true);
        setFeaturedCampaigns(featuredCampaigns.slice(0, 4));
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };  
    fetchFeaturedCampaigns();
    
    const fetchFeaturedCourses = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses`);
        const featuredCourses = response.data.filter(course => course.is_featured === true);
        setFeaturedCourses(featuredCourses.slice(0, 4));
      } catch (err) {
        console.error('Error fetching featured courses:', err);
        setError('Failed to load featured courses');
      }
    };
    fetchFeaturedCourses();
  }, []);

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

  // Fetch regular campaigns (based on search query)
  const fetchCampaigns = async (search = '') => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/campaigns/`, 
        { params: { search } }
      );
      setCampaigns(response.data); // Set regular campaigns (search results)
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };
 
  // Fetch regular courses (based on search query)
  const fetchCourses = async (search = '') => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/courses/`, 
        { params: { search } }
      );
      setCourses(response.data); // Set regular courses (search results)
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
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
      fetchCampaigns(query);
      fetchProducts(query);
      fetchCourses(query);
    }, 500);

    setSearchTimeout(newTimeout);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchProducts();
    fetchCourses();
    
    // Clean up function
    return () => {
      if (sliderInterval.current) {
        clearInterval(sliderInterval.current);
      }
    };
  }, []);

  // Set up automatic slider
  useEffect(() => {
    if (featuredCampaigns.length > 0) {
      sliderInterval.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % featuredCampaigns.length);
      }, 5000);
    }
    
    return () => {
      if (sliderInterval.current) {
        clearInterval(sliderInterval.current);
      }
    };
  }, [featuredCampaigns]);

  const goToSlide = (index) => {
    setActiveSlide(index);
    // Reset timer
    if (sliderInterval.current) {
      clearInterval(sliderInterval.current);
    }
    sliderInterval.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % featuredCampaigns.length);
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

  // Sort campaigns based on the most donated
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    return (b.current_amount || 0) - (a.current_amount || 0);
  });

  const sortedProducts = [...products].sort((a, b) => {
    return (b.price || 0) - (a.price || 0);
  });

  const sortedCourses = [...courses].sort((a, b) => {
    return (b.price || 0) - (a.price || 0);
  });

  return (
    <div className="body">
      <Helmet>
        <meta name="description" content="Penguatan Sistem Ekonomi Islam yang BARAKAH" />
        <meta property="og:title" content="BARAKAH APP" />
        <meta property="og:description" content="Penguatan Sistem Ekonomi Islam yang BARAKAH" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <HeaderHome onSearch={handleSearch} />

      {/* Campaign Slider */}     
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="text-lg font-medium mb-2 line-clamp-2">Bantu saudaramu, Allah bantu kamu</h1>
        <h2 className="text-sm font-medium mb-2 line-clamp-2">Sisihkan sebagian harta untuk program sosial dan untuk saudara kita yang membutuhkan</h2>           
        {featuredCampaigns.length > 0 && (
          <div className="relative rounded-lg overflow-hidden h-56">
            {/* Slides */}
            <div className="h-full">
              {featuredCampaigns.map((campaign, index) => {
                const isExpired = isCampaignExpired(campaign.deadline);
                
                return (
                  <div 
                    key={campaign.id}
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
                      index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    <img 
                      src={campaign.thumbnail || '/images/peduli-dhuafa-banner.jpg'} 
                      alt={campaign.title}
                      className="w-full h-56 object-cover"
                      onError={(e) => {
                        e.target.src = '/images/peduli-dhuafa-banner.jpg';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <h2 className="text-white font-bold text-lg">{campaign.title}</h2>

                      {/* Donate Button */}
                      {isExpired ? (
                        <button
                          className="w-full bg-gray-400 text-white py-2 rounded-md text-sm cursor-not-allowed"
                          disabled
                        >
                          DONASI SEKARANG
                        </button>
                      ) : (
                        <Link
                          to={`/bayar-donasi/${campaign.slug || campaign.id}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                        >
                          DONASI SEKARANG
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Indicators */}
            {featuredCampaigns.length > 0 && (
              <div className="absolute bottom-2 right-2 flex space-x-2 z-20">
                {featuredCampaigns.map((_, index) => (
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
  
      {/* Campaign Swiper */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="swiper-container">
          <Swiper
            spaceBetween={16}
            slidesPerView={2}
            navigation
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}
            modules={[Navigation, Pagination, Scrollbar]}
          >
            {sortedCampaigns.map((campaign) => {
              const isExpired = isCampaignExpired(campaign.deadline);
              const deadlineText = formatDeadline(campaign.deadline);
    
              return (
                <SwiperSlide key={campaign.id}>
                  <div className="bg-white rounded-lg overflow-hidden shadow">
                    <Link to={`/kampanye/${campaign.slug || campaign.id}`}>
                      <img
                        src={campaign.thumbnail || '/placeholder-image.jpg'}
                        alt={campaign.title}
                        className="w-full h-28 object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    </Link>
                    <div className="p-2">
                      <h3 className="text-sm font-medium mb-2 line-clamp-2">
                        {campaign.title}
                      </h3>
    
                      {isExpired ? (
                        <p className="text-xs text-red-500">Waktu habis</p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Batas waktu: {deadlineText}
                        </p>
                      )}
    
                      {/* Progress bar */}
                      <div className="mt-1 mb-1">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-green-600 h-2.5 rounded-full"
                            style={{
                              width: `${
                                campaign.current_amount && campaign.target_amount
                                  ? Math.min(
                                      (campaign.current_amount / campaign.target_amount) * 100,
                                      100
                                    )
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 mt-1">
                            {campaign.current_amount
                              ? formatIDR(campaign.current_amount)
                              : 'Rp 0'}
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            dari{' '}
                            {campaign.target_amount
                              ? formatIDRTarget(campaign.target_amount)
                              : 'Rp 0'}
                          </span>
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-1">
                          {campaign.target_amount > 0
                            ? Math.round(
                                (campaign.current_amount / campaign.target_amount) * 100
                              )
                            : 0}{' '}
                          % tercapai
                        </div>
                      </div>
    
                      {/* Donate Button */}
                      {isExpired ? (
                        <button
                          className="w-full bg-gray-400 text-white py-2 rounded-md text-sm cursor-not-allowed"
                          disabled
                        >
                          DONASI SEKARANG
                        </button>
                      ) : (
                        <Link
                          to={`/bayar-donasi/${campaign.slug || campaign.id}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                        >
                          DONASI SEKARANG
                        </Link>
                      )}
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
        )}
  
        {error && (
          <div className="text-center py-4 text-red-500">
            {error}
            <button 
              onClick={() => fetchCampaigns(searchQuery)} 
              className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* Product Slider */}
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="text-lg font-medium mb-2 line-clamp-2">Penuhi kebutuhan harianmu</h1>
        <h2 className="text-sm font-medium mb-2 line-clamp-2">Beli produk Halal, Toyyib dan Barakah disini</h2>
        <div className="mb-3 mt-4 bg-yellow-50 p-3 rounded-lg text-sm border border-yellow-200">
          <p className="text-yellow-800">
              <strong>Catatan:</strong> Fitur ini hanya untuk kalangan terbatas, anggota Barakah Economy
          </p>        
        </div>        
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
            {featuredProducts.length > 0 && (
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
  
      {/* Product Swiper */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="swiper-container">
          <Swiper
            spaceBetween={16}
            slidesPerView={2}
            navigation
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}
            modules={[Navigation, Pagination, Scrollbar]}
          >
            {sortedProducts.map((product) => {    
              return (
                <SwiperSlide key={product.id}>
                  <div className="bg-white rounded-lg overflow-hidden shadow">
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
                    <div className="p-2 mb-6">
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
                </SwiperSlide>
              );
            })}
          </Swiper>
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

      {/* Product Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.slice(4,10).map(product => {
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

      {/* Course Slider */}
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="text-lg font-medium mb-2 line-clamp-2">Menuntut ilmu wajib bagi setiap muslim</h1>
        <h2 className="text-sm font-medium mb-2 line-clamp-2">Tingkatkan wawasan, tambah ilmu dan keterampilan disini</h2>
        <div className="mb-3 mt-4 bg-yellow-50 p-3 rounded-lg text-sm border border-yellow-200">
          <p className="text-yellow-800">
              <strong>Catatan:</strong> Fitur ini hanya untuk kalangan terbatas, anggota Barakah Economy
          </p>        
        </div>
        {featuredCourses.length > 0 && (
          <div className="relative rounded-lg overflow-hidden h-56">
            {/* Slides */}
            <div className="h-full">
              {featuredCourses.map((course, index) => {
                return (
                  <div 
                    key={course.id}
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
                      index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  >
                    <img 
                      src={course.thumbnail || '/images/peduli-dhuafa-banner.jpg'} 
                      alt={course.title}
                      className="w-full h-56 object-cover"
                      onError={(e) => {
                        e.target.src = '/images/peduli-dhuafa-banner.jpg';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <h2 className="text-white font-bold text-lg">{course.title}</h2>
                        <Link
                          to={`/kelas/${course.slug || course.id}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                        >
                          LIHAT KELAS
                        </Link>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Indicators */}
            {featuredCourses.length > 1 && (
              <div className="absolute bottom-2 right-2 flex space-x-2 z-20">
                {featuredCourses.map((_, index) => (
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
  
      {/* Course Swiper */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="swiper-container">
          <Swiper
            spaceBetween={16}
            slidesPerView={2}
            navigation
            pagination={{ clickable: true }}
            scrollbar={{ draggable: true }}
            modules={[Navigation, Pagination, Scrollbar]}
          >
            {sortedCourses.map((course) => {    
              return (
                <SwiperSlide key={course.id}>
                  <div className="bg-white rounded-lg overflow-hidden shadow">
                    <Link to={`/kelas/${course.slug || course.id}`}>
                      <img
                        src={course.thumbnail || '/placeholder-image.jpg'}
                        alt={course.title}
                        className="w-full h-28 object-cover"
                        onError={(e) => {
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                    </Link>
                    <div className="p-2">
                      <h3 className="text-sm font-medium mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 text-xs mb-2">{formatIDRCourse(course.price)}</p>
                      <Link
                        to={`/kelas/${course.slug || course.id}`}
                        className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                      >
                        LIHAT KELAS
                      </Link>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
        )}
  
        {error && (
          <div className="text-center py-4 text-red-500">
            {error}
            <button 
              onClick={() => fetchCourses(searchQuery)} 
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

export default Home;
