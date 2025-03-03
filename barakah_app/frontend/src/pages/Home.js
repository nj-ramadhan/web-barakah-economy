// pages/Home.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import HeaderHome from '../components/layout/HeaderHome'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
import 'swiper/swiper-bundle.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar } from 'swiper/modules';

const formatIDR = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatIDRTarget = (amount) => {
  if (amount <= 0) return '\u221E';
  return new Intl.NumberFormat('id-ID', {
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
     
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      console.log("Fetching featured products..."); // Log fetching action

      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/products`);
        console.log(response.data); // Log the API response
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
        console.log(response.data); // Log the API response
        const featuredCampaigns = response.data.filter(campaign => campaign.is_featured === true);
        setFeaturedCampaigns(featuredCampaigns.slice(0, 4));
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      }
    };  
    fetchFeaturedCampaigns();
    
    const fetchFeaturedCourses = async () => {
      console.log("Fetching featured courses..."); // Log fetching action

      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses`);
        console.log(response.data); // Log the API response
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
      <HeaderHome onSearch={handleSearch} />

      {/* Product Slider */}
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        <h2 className="text-2xl font-bold mb-2">Penuhi kebutuhan harianmu</h2>
        <h3 className="text-xl font-semibold mb-4">Beli produk Halal, Toyyib dan Barakah disini</h3>        
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
                        <Link
                          to={`/beli/${product.slug || product.id}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                        >
                          BELI SEKARANG
                        </Link>
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
                      <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 mt-1">
                            {product.price
                              ? formatIDR(product.price)
                              : 'Rp 0'} / {product.unit}
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            stok{' '} {product.stock > 0 ? product.stock : 'habis'}
                          </span>
                        </div>
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
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-gray-500 mt-1">
                        {product.price
                          ? formatIDR(product.price)
                          : 'Rp 0'} / {product.unit}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        stok{' '} {product.stock > 0 ? product.stock : 'habis'}
                      </span>
                    </div>
                    {product.stock <= 0 ? (
                        <button
                          className="w-full bg-gray-400 text-white py-2 rounded-md text-sm cursor-not-allowed"
                          disabled
                        >
                          BELI SEKARANG
                        </button>
                      ) : (
                        <Link
                          to={`/beli/${product.slug || product.id}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                        >
                          BELI SEKARANG
                        </Link>
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

      {/* Featured Campaign Slider */}     
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        <h2 className="text-2xl font-bold mb-2">Bantu saudaramu, Allah bantu kamu</h2>
        <h3 className="text-xl font-semibold mb-4">Sisihkan sebagian harta untuk program sosial dan untuk saudara kita yang membutuhkan</h3>           
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
                          to={`/berdonasi/${campaign.slug || campaign.id}`}
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
                          to={`/berdonasi/${campaign.slug || campaign.id}`}
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

      {/* Course Slider */}
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        <h2 className="text-2xl font-bold mb-2">Ilmu adalah cahaya</h2>
        <h3 className="text-xl font-semibold mb-4">Menuntut ilmu itu wajib bagi setiap muslim, tambah ilmu perluas wawasan disini</h3>        
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
                          to={`/ikutkelas/${course.slug || course.id}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                        >
                          IKUTI KELAS
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
                    <Link to={`/ikutkelas/${course.slug || course.id}`}>
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
                        <Link
                          to={`/ikutkelas/${course.slug || course.id}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                        >
                          IKUTI KELAS
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
