// pages/Home.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import HeaderHome from '../components/layout/HeaderHome'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component
import 'swiper/swiper-bundle.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Scrollbar, Autoplay } from 'swiper/modules';
import ShareButton from '../components/campaigns/ShareButton';
import { getDigitalProducts, getPopularSellers } from '../services/digitalProductApi';

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

const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${process.env.REACT_APP_API_BASE_URL}${url}`;
};

const getButtonLabel = (title = '') => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('infak')) return 'INFAK SEKARANG';
  if (lowerTitle.includes('sedekah')) return 'SEDEKAH SEKARANG';
  if (lowerTitle.includes('zakat')) return 'ZAKAT SEKARANG';
  return 'DONASI SEKARANG';
};

const Home = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [featuredProducts, setfeaturedProducts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [digitalProducts, setDigitalProducts] = useState([]);
  const [featuredDigitalProducts, setFeaturedDigitalProducts] = useState([]);
  const [popularSellers, setPopularSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [activeSlideCampaign, setActiveSlideCampaign] = useState(0);
  const [activeSlideProduct, setActiveSlideProduct] = useState(0);
  const [activeSlideCourse, setActiveSlideCourse] = useState(0);
  const [activeSlideDigital, setActiveSlideDigital] = useState(0);
  const sliderIntervalCampaign = useRef(null);
  const sliderIntervalProduct = useRef(null);
  const sliderIntervalCourse = useRef(null);
  const sliderIntervalDigital = useRef(null);
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState([]);
  const [partners, setPartners] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({ content: '', rating: 5 });
  const [myTestimonial, setMyTestimonial] = useState(null);
  const [aboutUs, setAboutUs] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [events, setEvents] = useState([]);

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

    const fetchFeaturedDigitalProducts = async () => {
      try {
        const response = await getDigitalProducts();
        // Featured digital ones? Logic per requirement or just top 4
        setFeaturedDigitalProducts(response.data.slice(0, 4));
      } catch (err) {
        console.error('Error fetching digital products:', err);
      }
    };
    fetchFeaturedDigitalProducts();

    const fetchPopularSellers = async () => {
      try {
        const response = await getPopularSellers();
        setPopularSellers(response.data);
      } catch (err) {
        console.error('Error fetching popular sellers:', err);
      }
    };
    fetchPopularSellers();

    const fetchSiteContent = async () => {
      try {
        const [testimonialsRes, partnersRes, activitiesRes, aboutUsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/`),
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/partners/`),
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/activities/`),
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/about-us/`)
        ]);
        setTestimonials((testimonialsRes.data.results || testimonialsRes.data).filter(t => t.is_approved));
        setPartners(partnersRes.data.results || partnersRes.data);
        setActivities((activitiesRes.data.results || activitiesRes.data).slice(0, 3));
        const aboutData = aboutUsRes.data.results || aboutUsRes.data;
        if (Array.isArray(aboutData) && aboutData.length > 0) {
          setAboutUs(aboutData[0]);
        } else if (aboutData && !Array.isArray(aboutData)) {
          setAboutUs(aboutData);
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.access) {
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/my_testimonial/`, {
            headers: { Authorization: `Bearer ${user.access}` }
          }).then(res => {
            if (res.data.id) {
              setMyTestimonial(res.data);
              setTestimonialForm({ content: res.data.content, rating: res.data.rating });
            }
          }).catch(err => console.error("Error fetching my testimonial:", err));
        }
      } catch (err) {
        console.error("Error fetching site content:", err);
      }
    };
    fetchSiteContent();

    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/events/`);
        setEvents(response.data.results || response.data);
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    };
    fetchEvents();
  }, []);

  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.access;
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/testimonials/my_testimonial/`, testimonialForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyTestimonial(res.data);
      alert(myTestimonial ? "Testimoni berhasil diperbarui!" : "Terima kasih! Testimoni Anda sedang menunggu persetujuan admin.");
      setShowTestimonialModal(false);
    } catch (err) {
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || "Gagal mengirim testimoni");
    }
  };

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
      const sortedData = response.data.sort((a, b) => {
        const isAExpired = isCampaignExpired(a.deadline);
        const isBExpired = isCampaignExpired(b.deadline);

        if (isAExpired && !isBExpired) return 1;
        if (!isAExpired && isBExpired) return -1;

        if (!a.deadline && b.deadline) return 1;
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && !b.deadline) return 0;

        return new Date(a.deadline) - new Date(b.deadline);
      });
      setCampaigns(sortedData); // Set regular campaigns (search results)
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

  const fetchDigitalProducts = async (search = '') => {
    try {
      setLoading(true);
      const response = await getDigitalProducts();
      // Filter if needed
      setDigitalProducts(response.data);
    } catch (err) {
      console.error('Error fetching digital products:', err);
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
      fetchDigitalProducts(query);
    }, 500);

    setSearchTimeout(newTimeout);
  };

  useEffect(() => {
    fetchCampaigns();
    fetchProducts();
    fetchCourses();
    fetchDigitalProducts();

    // Clean up function
    return () => {
      if (sliderIntervalCampaign.current) clearInterval(sliderIntervalCampaign.current);
      if (sliderIntervalProduct.current) clearInterval(sliderIntervalProduct.current);
      if (sliderIntervalCourse.current) clearInterval(sliderIntervalCourse.current);
      if (sliderIntervalDigital.current) clearInterval(sliderIntervalDigital.current);
    };
  }, []);

  // Set up automatic sliders
  useEffect(() => {
    if (featuredCampaigns.length > 0) {
      sliderIntervalCampaign.current = setInterval(() => {
        setActiveSlideCampaign(prev => (prev + 1) % featuredCampaigns.length);
      }, 5000);
    }
    return () => { if (sliderIntervalCampaign.current) clearInterval(sliderIntervalCampaign.current); };
  }, [featuredCampaigns]);

  useEffect(() => {
    if (featuredProducts.length > 0) {
      sliderIntervalProduct.current = setInterval(() => {
        setActiveSlideProduct(prev => (prev + 1) % featuredProducts.length);
      }, 5000);
    }
    return () => { if (sliderIntervalProduct.current) clearInterval(sliderIntervalProduct.current); };
  }, [featuredProducts]);

  useEffect(() => {
    if (featuredCourses.length > 0) {
      sliderIntervalCourse.current = setInterval(() => {
        setActiveSlideCourse(prev => (prev + 1) % featuredCourses.length);
      }, 5000);
    }
    return () => { if (sliderIntervalCourse.current) clearInterval(sliderIntervalCourse.current); };
  }, [featuredCourses]);

  useEffect(() => {
    if (featuredDigitalProducts.length > 0) {
      sliderIntervalDigital.current = setInterval(() => {
        setActiveSlideDigital(prev => (prev + 1) % featuredDigitalProducts.length);
      }, 5000);
    }
    return () => { if (sliderIntervalDigital.current) clearInterval(sliderIntervalDigital.current); };
  }, [featuredDigitalProducts]);

  const goToSlideCampaign = (index) => {
    setActiveSlideCampaign(index);
    if (sliderIntervalCampaign.current) clearInterval(sliderIntervalCampaign.current);
    sliderIntervalCampaign.current = setInterval(() => {
      setActiveSlideCampaign(prev => (prev + 1) % featuredCampaigns.length);
    }, 5000);
  };

  const goToSlideProduct = (index) => {
    setActiveSlideProduct(index);
    if (sliderIntervalProduct.current) clearInterval(sliderIntervalProduct.current);
    sliderIntervalProduct.current = setInterval(() => {
      setActiveSlideProduct(prev => (prev + 1) % featuredProducts.length);
    }, 5000);
  };

  const goToSlideCourse = (index) => {
    setActiveSlideCourse(index);
    if (sliderIntervalCourse.current) clearInterval(sliderIntervalCourse.current);
    sliderIntervalCourse.current = setInterval(() => {
      setActiveSlideCourse(prev => (prev + 1) % featuredCourses.length);
    }, 5000);
  };

  const goToSlideDigital = (index) => {
    setActiveSlideDigital(index);
    if (sliderIntervalDigital.current) clearInterval(sliderIntervalDigital.current);
    sliderIntervalDigital.current = setInterval(() => {
      setActiveSlideDigital(prev => (prev + 1) % featuredDigitalProducts.length);
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
  const sortedCampaigns = campaigns;

  const sortedProducts = [...products].sort((a, b) => {
    return (b.price || 0) - (a.price || 0);
  });

  const sortedCourses = [...courses].sort((a, b) => {
    return (b.price || 0) - (a.price || 0);
  });

  const onlyPartners = partners.filter(p => !p.type || p.type === 'partner');
  const onlyMitra = partners.filter(p => p.type === 'mitra');

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
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${index === activeSlideCampaign ? 'opacity-100 z-10' : 'opacity-0 z-0'
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
                      <div className="flex gap-2 items-center w-full">
                        <div className="flex-1">
                          {isExpired ? (
                            <button
                              className="w-full bg-gray-400 text-white py-2 rounded-md text-sm cursor-not-allowed"
                              disabled
                            >
                              {getButtonLabel(campaign.title)}
                            </button>
                          ) : (
                            <Link
                              to={`/bayar-donasi/${campaign.slug || campaign.id}`}
                              className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                            >
                              {getButtonLabel(campaign.title)}
                            </Link>
                          )}
                        </div>
                        <ShareButton slug={campaign.slug || campaign.id} title={campaign.title} />
                      </div>
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
                    onClick={() => goToSlideCampaign(index)}
                    className={`w-2 h-2 rounded-full ${index === activeSlideCampaign ? 'bg-white' : 'bg-white/50'
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
                                width: `${campaign.current_amount && campaign.target_amount
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
                        <div className="flex gap-2 items-center w-full mt-2">
                          <div className="flex-1">
                            {isExpired ? (
                              <button
                                className="w-full bg-gray-400 text-white py-2 rounded-md text-sm cursor-not-allowed"
                                disabled
                              >
                                {getButtonLabel(campaign.title)}
                              </button>
                            ) : (
                              <Link
                                to={`/bayar-donasi/${campaign.slug || campaign.id}`}
                                className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                              >
                                {getButtonLabel(campaign.title)}
                              </Link>
                            )}
                          </div>
                          <ShareButton slug={campaign.slug || campaign.id} title={campaign.title} />
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
              onClick={() => fetchCampaigns(searchQuery)}
              className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* Barakah Events Carousel */}
      {events.length > 0 && (
        <div className="px-4 pt-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-lg font-medium line-clamp-2">Barakah Event</h1>
              <h2 className="text-sm font-medium text-gray-500">Ikuti berbagai kegiatan seru dari BAE</h2>
            </div>
            <Link to="/event" className="text-green-700 text-xs font-semibold hover:underline whitespace-nowrap">
              Lihat Semua →
            </Link>
          </div>
          <Swiper
            spaceBetween={12}
            slidesPerView={1.2}
            navigation
            modules={[Navigation, Autoplay]}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
          >
            {events.slice(0, 5).map((event) => (
              <SwiperSlide key={event.id}>
                <Link to={`/event/${event.slug || event.id}`} className="block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="relative h-40">
                    <img
                      src={getMediaUrl(event.thumbnail || event.header_image) || '/placeholder-image.jpg'}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Barakah+Event'; }}
                    />
                    <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                      EVENT
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1">{event.title}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                      <span className="material-icons text-[12px]">calendar_today</span>
                      {new Date(event.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <span className="mx-1">•</span>
                          <span className="material-icons text-[12px]">location_on</span>
                          <span className="line-clamp-1">{event.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* Activities Carousel */}
      {activities.length > 0 && (
        <div className="px-4 pt-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-lg font-medium line-clamp-2">Kegiatan Kami</h1>
              <h2 className="text-sm font-medium text-gray-500">Program dan aktivitas komunitas BAE</h2>
            </div>
            <Link to="/kegiatan" className="text-green-700 text-xs font-semibold hover:underline whitespace-nowrap">
              Lihat Semua →
            </Link>
          </div>
          <Swiper
            spaceBetween={12}
            slidesPerView={1.5}
            navigation
            modules={[Navigation, Autoplay]}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
          >
            {activities.map((act) => (
              <SwiperSlide key={act.id}>
                <Link to={`/kegiatan/${act.id}`} className="block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                  <div className="relative h-32">
                    <img
                      src={getMediaUrl(act.header_image)}
                      alt={act.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
                      <p className="text-[10px] font-bold text-green-700">
                        {new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{act.title}</h3>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

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
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${index === activeSlideProduct ? 'opacity-100 z-10' : 'opacity-0 z-0'
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
                    onClick={() => goToSlideProduct(index)}
                    className={`w-2 h-2 rounded-full ${index === activeSlideProduct ? 'bg-white' : 'bg-white/50'
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
            {products.slice(4, 10).map(product => {
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
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${index === activeSlideCourse ? 'opacity-100 z-10' : 'opacity-0 z-0'
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
            {featuredCourses.length > 0 && (
              <div className="absolute bottom-2 right-2 flex space-x-2 z-20">
                {featuredCourses.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlideCourse(index)}
                    className={`w-2 h-2 rounded-full ${index === activeSlideCourse ? 'bg-white' : 'bg-white/50'
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
                        <div className="flex gap-2 items-center w-full mt-2">
                          <div className="flex-1">
                            <Link
                              to={`/kelas/${course.slug || course.id}`}
                              className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
                            >
                              LIHAT KELAS
                            </Link>
                          </div>
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
              onClick={() => fetchCourses(searchQuery)}
              className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>

      {/* Digital Product Slider */}
      <div className="px-4 pt-4" style={{ position: 'relative', zIndex: 10 }}>
        <h1 className="text-lg font-medium mb-2 line-clamp-2">Produk Digital BAE</h1>
        <h2 className="text-sm font-medium mb-2 line-clamp-2">Akses ilmu dan kemudahan dengan produk digital berkualitas</h2>

        {featuredDigitalProducts.length > 0 && (
          <div className="relative rounded-lg overflow-hidden h-56">
            {/* Slides */}
            <div className="h-full">
              {featuredDigitalProducts.map((product, index) => {
                return (
                  <div
                    key={product.id}
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${index === activeSlideDigital ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                  >
                    <img
                      src={product.thumbnail || '/placeholder-image.jpg'}
                      alt={product.title}
                      className="w-full h-56 object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <h2 className="text-white font-bold text-lg">{product.title}</h2>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-white font-bold">{formatIDR(product.price)}</span>
                        <Link
                          to={`/digital-products/${product.slug}`}
                          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          BELI SEKARANG
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Indicators */}
            {featuredDigitalProducts.length > 0 && (
              <div className="absolute bottom-2 right-2 flex space-x-2 z-20">
                {featuredDigitalProducts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlideDigital(index)}
                    className={`w-2 h-2 rounded-full ${index === activeSlideDigital ? 'bg-white' : 'bg-white/50'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
              {digitalProducts.map((product) => {
                return (
                  <SwiperSlide key={product.id}>
                    <div className="bg-white rounded-lg overflow-hidden shadow">
                      <Link to={`/digital-products/${product.slug}`}>
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
                        <h3 className="text-sm font-medium mb-1 line-clamp-1">{product.title}</h3>
                        <p className="text-green-700 font-bold text-xs mb-2">{formatIDR(product.price)}</p>
                        <Link
                          to={`/digital-products/${product.slug}`}
                          className="block text-center bg-green-800 text-white py-2 rounded-md text-xs hover:bg-green-900"
                        >
                          DETAIL PRODUK
                        </Link>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}
      </div>

      {/* Popular Sellers Section */}
      <div className="px-4 py-4 mb-4">
        <h1 className="text-lg font-medium mb-4">Penjual Populer</h1>
        <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
          {popularSellers.map((seller) => (
            <Link
              key={seller.username}
              to={`/digital-produk/${seller.username}`}
              className="flex-shrink-0 w-28 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-green-500 p-0.5 mb-2">
                <img
                  src={getMediaUrl(seller.picture || seller.shop_thumbnail) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(seller.name) + '&background=0D8ABC&color=fff'}
                  alt={seller.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(seller.name) + '&background=0D8ABC&color=fff'; }}
                />
              </div>
              <p className="text-xs font-bold text-gray-800 line-clamp-1">@{seller.username}</p>
              <p className="text-[10px] text-gray-500 line-clamp-1">{seller.name}</p>
            </Link>
          ))}
          {popularSellers.length === 0 && !loading && (
            <p className="text-sm text-gray-500 italic">Belum ada penjual aktif</p>
          )}
        </div>
      </div>

      {/* Partner Section */}
      {onlyPartners.length > 0 && (
        <div className="mb-16 px-4 py-12 bg-white rounded-[3rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
          <h2 className="text-2xl font-extrabold mb-8 text-center text-gray-900 flex items-center justify-center gap-3">
            <span className="w-8 h-1 bg-green-600 rounded-full"></span>
            Partner Kami
            <span className="w-8 h-1 bg-green-600 rounded-full"></span>
          </h2>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={2}
            autoplay={{ delay: 3000 }}
            breakpoints={{
              640: { slidesPerView: 3 },
              1024: { slidesPerView: 5 },
            }}
          >
            {onlyPartners.map(partner => (
              <SwiperSlide key={partner.id}>
                <div 
                  onClick={() => {
                    if (partner.link) {
                      window.open(partner.link, '_blank');
                    } else {
                      setSelectedPartner(partner);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-4 grayscale hover:grayscale-0 transition duration-300 cursor-pointer group"
                >
                  <div className="h-16 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <img src={getMediaUrl(partner.logo)} alt={partner.name} className="h-full object-contain" title={partner.link ? 'Klik untuk buka link' : 'Klik untuk lihat detail'} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-green-600 transition-colors uppercase tracking-widest">{partner.name}</span>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* Mitra Section */}
      {onlyMitra.length > 0 && (
        <div className="mb-16 px-4 py-12 bg-gray-50 rounded-[3rem] border border-gray-100 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-green-50 rounded-full blur-3xl opacity-30 -ml-32 -mt-32"></div>
          <h2 className="text-2xl font-extrabold mb-8 text-center text-gray-900 flex items-center justify-center gap-3">
            <span className="w-8 h-1 bg-green-600 rounded-full"></span>
            Mitra Kami
            <span className="w-8 h-1 bg-green-600 rounded-full"></span>
          </h2>
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={2}
            autoplay={{ delay: 3500 }}
            breakpoints={{
              640: { slidesPerView: 3 },
              1024: { slidesPerView: 5 },
            }}
          >
            {onlyMitra.map(mitra => (
              <SwiperSlide key={mitra.id}>
                <div 
                  onClick={() => {
                    if (mitra.link) {
                      window.open(mitra.link, '_blank');
                    } else {
                      setSelectedPartner(mitra);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-4 grayscale hover:grayscale-0 transition duration-300 cursor-pointer group"
                >
                  <div className="h-16 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <img src={getMediaUrl(mitra.logo)} alt={mitra.name} className="h-full object-contain" title={mitra.link ? 'Klik untuk buka link' : 'Klik untuk lihat detail'} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-green-600 transition-colors uppercase tracking-widest">{mitra.name}</span>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* Testimonial Section */}
      <div className="mb-12 bg-green-50 rounded-3xl p-8 border border-green-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-gray-800">Review & Testimoni</h2>
            <button
              onClick={() => setShowTestimonialModal(true)}
              className="text-xs font-bold text-green-700 bg-white px-4 py-2 rounded-full border border-green-200 shadow-sm hover:bg-green-600 hover:text-white transition"
            >
              {myTestimonial ? 'Ubah Testimoni' : 'Tulis Testimoni'}
            </button>
          </div>

          {testimonials.length === 0 ? (
            <p className="text-center text-gray-500 py-4 italic">Belum ada testimoni.</p>
          ) : (
            <Swiper
              modules={[Pagination]}
              spaceBetween={30}
              slidesPerView={1}
              pagination={{ clickable: true }}
              breakpoints={{
                768: { slidesPerView: 2 },
              }}
              className="pb-10"
            >
              {testimonials.map(t => (
                <SwiperSlide key={t.id}>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-50 h-full">
                    <div className="flex items-center gap-1 mb-3 text-orange-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="material-icons text-sm">{i < t.rating ? 'star' : 'star_border'}</span>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 italic mb-4">"{t.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                        {t.user_full_name?.[0] || 'U'}
                      </div>
                      <span className="text-xs font-bold text-gray-800">{t.user_full_name || 'Hamba Allah'}</span>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </div>

      {/* Testimonial Modal */}
      {showTestimonialModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{myTestimonial ? 'Ubah Testimoni Anda' : 'Tulis Testimoni Anda'}</h3>
              <button onClick={() => setShowTestimonialModal(false)} className="material-icons text-gray-400">close</button>
            </div>
            <form onSubmit={handleTestimonialSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTestimonialForm({ ...testimonialForm, rating: star })}
                      className={`material-icons ${star <= testimonialForm.rating ? 'text-orange-400' : 'text-gray-300'}`}
                    >
                      star
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pesan Anda</label>
                <textarea
                  required
                  rows="4"
                  value={testimonialForm.content}
                  onChange={(e) => setTestimonialForm({ ...testimonialForm, content: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm"
                  placeholder="Ceritakan pengalaman Anda menggunakan Barakah App..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-100"
              >
                {myTestimonial ? 'Simpan Perubahan' : 'Kirim Testimoni'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Partner/Mitra Detail Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="relative h-48 bg-gray-50 flex items-center justify-center">
              <button 
                onClick={() => setSelectedPartner(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-gray-600 hover:bg-white transition z-10"
              >
                <span className="material-icons">close</span>
              </button>
              <img 
                src={getMediaUrl(selectedPartner.logo)} 
                alt={selectedPartner.name} 
                className="max-h-32 max-w-[80%] object-contain"
              />
            </div>
            <div className="p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedPartner.type === 'mitra' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedPartner.type || 'Partner'}
                </span>
                <h3 className="text-2xl font-bold text-gray-900">{selectedPartner.name}</h3>
              </div>
              <div className="text-gray-600 leading-relaxed text-sm whitespace-pre-line mb-6">
                {selectedPartner.description || 'Belum ada deskripsi untuk partner ini.'}
              </div>
              {selectedPartner.link && (
                <a 
                  href={selectedPartner.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-4 bg-green-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition mb-3"
                >
                  <span className="material-icons text-lg">public</span>
                  Kunjungi Website
                </a>
              )}
              <button
                onClick={() => setSelectedPartner(null)}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl text-sm font-bold hover:bg-gray-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kegiatan Komunitas */}
      {activities.length > 0 && (
        <div className="hidden md:block bg-gray-50 py-10 px-4">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Kegiatan Terbaru</h2>
              <span className="text-green-700 text-xs font-bold">Lihat Semua</span>
            </div>
            <div className="space-y-4">
              {activities.map(act => (
                <div key={act.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex h-28">
                  <div className="w-1/3 h-full">
                    <img src={getMediaUrl(act.header_image)} alt={act.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="w-2/3 p-3 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 line-clamp-2">{act.title}</h3>
                      <div className="text-[10px] text-gray-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: act.content }}></div>
                    </div>
                    <p className="text-[10px] text-green-700 font-bold">{new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forum Tanya Jawab */}
      <div className="px-4 py-8 mb-4 border-t border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Forum Tanya Jawab</h1>
            <h2 className="text-sm text-gray-500 mt-1">Diskusikan topik bersama para pakar</h2>
          </div>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-indigo-100">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
            <span className="material-icons text-indigo-600 text-3xl">forum</span>
          </div>
          <p className="text-sm text-gray-700 mb-6">
            Dapatkan jawaban atas pertanyaan seputar bisnis, fiqih, dan masalah keseharian dari para ahlinya.
          </p>
          <Link to="/forum" className="w-full max-w-[200px] py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition">
            Buka Forum
          </Link>
        </div>
      </div>

      {/* Tentang Kami Section */}
      <section id="about" className="py-20 px-8 lg:px-24 bg-white">
        <div className="max-w-6xl mx-auto">
          {aboutUs?.hero_image && (
            <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden mb-12 shadow-lg">
              <img src={getMediaUrl(aboutUs.hero_image)} alt="Barakah Economy" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col md:flex-row items-start gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">{aboutUs?.title || 'Tentang Kami'}</h2>
              <div className="w-20 h-1 bg-green-600 rounded-full"></div>
              {aboutUs?.description ? (
                <div className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">
                  {aboutUs.description}
                </div>
              ) : (
                <>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    BAE Community berdiri pada tanggal 29 Februari 2024 di Jalan Tubagus Ismail Dalam No.19C dan bertempat di Dago, Kota Bandung, Jawa Barat. Tujuan BAE Community adalah meningkatkan kestabilan finansial masyarakat melalui pengembangan ekosistem ekonomi yang berlandaskan syariah Islam dengan memberdayakan pemuda dan mahasiswa sebagai pionir perubahan.
                  </p>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    BAE Community memiliki tugas pokok menyelenggarakan kegiatan yang bersifat pemberdayaan, pendidikan, kolaborasi, pengembangan serta sosial baik ke dalam yaitu internal komunitas maupun keluar yaitu lingkungan masyarakat.
                  </p>
                </>
              )}
            </div>
            <div className="flex-1 space-y-6">
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                <h3 className="text-lg font-bold text-green-800 mb-3">🎯 Visi</h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {aboutUs?.vision || 'Menjadi komunitas yang unggul dalam mengembangkan perekonomian berbasis syariah yang berkeadilan dan berkelanjutan, serta berkontribusi secara aktif dalam kesejahteraan umat.'}
                </p>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                <h3 className="text-lg font-bold text-green-800 mb-3">🚀 Misi</h3>
                {aboutUs?.mission ? (
                   <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                    {aboutUs.mission}
                   </p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Mendorong Pemberdayaan Ekonomi</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Pendidikan dan Literasi Keuangan Syariah</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Kolaborasi dan Sinergi Antar Komunitas</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Pengembangan Usaha Berbasis Syariah</li>
                    <li className="flex items-start gap-2"><span className="text-green-600 mt-1">•</span> Kepedulian Sosial dan Amal</li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Organization Structure Image */}
          {aboutUs?.organization_structure_image && (
            <div className="mt-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Struktur Organisasi</h2>
              <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-white">
                <img 
                  src={getMediaUrl(aboutUs.organization_structure_image)} 
                  alt="Struktur Organisasi Barakah Economy" 
                  className="w-full h-auto cursor-zoom-in"
                  onClick={() => window.open(getMediaUrl(aboutUs.organization_structure_image), '_blank')}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Navigation */}
      <NavigationButton />
    </div>
  );
};

export default Home;
