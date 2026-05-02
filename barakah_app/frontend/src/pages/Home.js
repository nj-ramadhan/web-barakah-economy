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
import FloatingCartModal from '../components/layout/FloatingCartModal';

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

const getEventStatus = (startStr, endStr) => {
  const now = new Date();
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
  return { isFinished: now > end };
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
        navigate('/login');
        return;
      }

      const product = featuredProducts.find(p => p.id === productId) || products.find(p => p.id === productId);
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

      window.dispatchEvent(new Event('cartUpdated'));
      // Removed alert
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
      alert('Gagal menambahkan ke Incaran, ' + error['response']['data']['message']);
    }
  };

  const sortedCampaigns = campaigns;
  const sortedProducts = [...products].sort((a, b) => (b.price || 0) - (a.price || 0));
  const sortedCourses = [...courses].sort((a, b) => (b.price || 0) - (a.price || 0));
  const onlyPartners = partners.filter(p => !p.type || p.type === 'partner');
  const onlyMitra = partners.filter(p => p.type === 'mitra');

  // Hierarchy Tree Logic
  const buildTree = (records) => {
    if (!records) return [];
    const map = {};
    const roots = [];
    const sorted = [...records].sort((a, b) => 
      (a.hierarchy_code || "").localeCompare(b.hierarchy_code || "", undefined, { numeric: true, sensitivity: 'base' })
    );

    sorted.forEach(val => {
      map[val.hierarchy_code] = { ...val, children: [] };
      const parts = val.hierarchy_code.split('.');
      if (parts.length === 1) {
        roots.push(map[val.hierarchy_code]);
      } else {
        const parentKey = parts.slice(0, -1).join('.');
        if (map[parentKey]) {
          map[parentKey].children.push(map[val.hierarchy_code]);
        } else {
          roots.push(map[val.hierarchy_code]);
        }
      }
    });
    return roots;
  };

  const personnelTree = buildTree(aboutUs?.personnel);

  const SocialIcon = ({ type }) => {
    switch(type) {
      case 'instagram': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
      case 'facebook': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>;
      case 'linkedin': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>;
      case 'twitter': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
      case 'whatsapp': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>;
      default: return <span className="material-icons text-[20px]">language</span>;
    }
  };

  const PersonnelCard = ({ person }) => (
    <div className="flex flex-col items-center group w-full">
      <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 w-full min-w-[220px] max-w-[280px] text-center relative hover:shadow-2xl transition duration-500 transform hover:-translate-y-2 z-10">
        <div className="w-20 h-20 md:w-28 md:h-28 rounded-[2rem] aspect-square overflow-hidden mx-auto mb-4 shadow-xl border-4 border-white ring-4 ring-gray-50/50 group-hover:ring-green-50 transition-all">
          <img 
            src={getMediaUrl(person.image)} 
            alt={person.name} 
            className="w-full h-full object-cover" 
            onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(person.name) + '&background=0D8ABC&color=fff'; }}
          />
        </div>
        <h4 className="text-base md:text-lg font-black text-gray-900 mb-1 leading-tight">{person.name}</h4>
        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-4">{person.job_title}</p>
        
        {person.social_media?.length > 0 && (
          <div className="flex justify-center gap-4 mt-2 pt-4 border-t border-gray-50">
            {person.social_media.map((sm, i) => (
              <a key={i} href={sm.link} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-600 transition transform hover:scale-125 flex items-center justify-center">
                <SocialIcon type={sm.icon} />
              </a>
            ))}
          </div>
        )}
      </div>
      
      {person.children?.length > 0 && (
        <div className="relative pt-10 w-full flex flex-col items-center">
          <div className="absolute top-0 left-1/2 w-0.5 h-10 bg-green-200 -ml-[1px]"></div>
          
          <div className="flex justify-center flex-wrap sm:flex-nowrap relative w-full">
             {person.children.map((child, i) => (
               <div key={child.id} className="relative pt-8 px-4 sm:px-6 flex flex-col items-center flex-1 min-w-[240px] max-w-[320px]">
                  {person.children.length > 1 && (
                    <>
                      {i === 0 && <div className="absolute top-0 left-1/2 right-0 h-0.5 bg-green-200"></div>}
                      {i === person.children.length - 1 && <div className="absolute top-0 left-0 right-1/2 h-0.5 bg-green-200"></div>}
                      {i > 0 && i < person.children.length - 1 && <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-200"></div>}
                    </>
                  )}
                  <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-green-200 -ml-[1px]"></div>
                  
                  <PersonnelCard person={child} />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );

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
            slidesPerView={2.5}
            navigation
            modules={[Navigation, Autoplay]}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
          >
            {events.filter(e => e.visibility === 'public').slice(0, 5).map((event) => {
              const { isFinished } = getEventStatus(event.start_date, event.end_date);
              return (
                <SwiperSlide key={event.id}>
                  <Link to={`/event/${event.slug || event.id}`} className="block group">
                    <div className="event-poster-container aspect-[4/5] rounded-2xl shadow-lg">
                      <img
                        src={getMediaUrl(event.thumbnail || event.header_image) || '/placeholder-image.jpg'}
                        alt={event.title}
                        className="event-poster-image"
                        onError={(e) => { e.target.src = 'https://placehold.co/600x400?text=Barakah+Event'; }}
                      />
                      
                      {/* Finished Overlay */}
                      {isFinished && (
                        <div className="event-finished-overlay">
                          <div className="event-finished-text">Selesai</div>
                        </div>
                      )}

                      {/* Poster Info Overlay (Gradient) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                         <h3 className="text-white font-bold text-xs line-clamp-2">{event.title}</h3>
                      </div>

                      <div className="absolute top-2 left-2 bg-indigo-600/90 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase">
                        EVENT
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      )}

      {/* BAE RUN Promotion Banner */}
      {/* BAE RUN SECTION - HIDE FOR NOW AS NOT FINISHED 
      <div className="px-4 py-8">
        <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
          <div className="p-6 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 border border-green-500/20 rounded-full mb-3">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Barakah Activity</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tighter italic uppercase leading-none mb-2">
                BAE <span className="text-green-500">RUN</span>
              </h2>
              <p className="text-xs text-slate-400 leading-tight mb-4 max-w-[200px]">
                Mulai hidup sehat & berkah. Lacak lari Anda dan kumpulkan poin keberkahan.
              </p>
              <Link 
                to="/bae-run" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition shadow-lg shadow-green-900/20"
              >
                Cek Aplikasi 
                <span className="material-icons text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="relative w-28 h-40 transform rotate-6 translate-y-4">
              <div className="absolute inset-0 bg-slate-950 rounded-2xl border-4 border-slate-700 shadow-xl overflow-hidden">
                <img 
                  src="/media/bae_run_app_mockup_1777304049543.png" 
                  alt="BAE RUN Mockup" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      */}

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
                        <div className="flex flex-col gap-2 w-full mt-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => addToCart(product.id)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all transform hover:-translate-y-1 text-xs"
                              >
                                <span className="material-icons text-sm">shopping_cart</span>
                                Keranjang
                              </button>
                              <button 
                                onClick={() => addToWishlist(product.id)}
                                className="px-3 py-2 border-2 border-green-600 text-green-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-all shadow-sm"
                                title="Tambah ke Incaran"
                              >
                                <span className="material-icons text-sm">favorite_border</span>
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                addToCart(product.id);
                                setTimeout(() => {
                                  const bubble = document.getElementById('cart-floating-bubble');
                                  if (bubble) bubble.click();
                                }, 500);
                              }}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all transform hover:-translate-y-1 text-xs"
                            >
                              <span className="material-icons text-sm">shopping_bag</span>
                              Beli Langsung
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
                          <div className="flex flex-col gap-2">
                            <button
                              className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-xs font-bold"
                              disabled
                            >
                              <span className="material-icons text-sm">remove_shopping_cart</span>
                              Habis
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => addToCart(product.id)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all transform hover:-translate-y-1 text-[10px]"
                              >
                                <span className="material-icons text-sm">shopping_cart</span>
                                Keranjang
                              </button>
                              <button
                                onClick={() => addToWishlist(product.id)}
                                className="px-2.5 py-2.5 border-2 border-green-600 text-green-700 font-bold rounded-xl flex items-center justify-center hover:bg-green-50 transition-all"
                                title="Tambah ke Incaran"
                              >
                                <span className="material-icons text-sm">favorite_border</span>
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                addToCart(product.id);
                                setTimeout(() => {
                                  const bubble = document.getElementById('cart-floating-bubble');
                                  if (bubble) bubble.click();
                                }, 500);
                              }}
                              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all transform hover:-translate-y-1 text-[10px]"
                            >
                              <span className="material-icons text-sm">shopping_bag</span>
                              Beli Langsung
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
                      <div className="flex flex-col gap-2">
                        <button
                          className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-xs font-bold"
                          disabled
                        >
                          <span className="material-icons text-sm">remove_shopping_cart</span>
                          Habis
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => addToCart(product.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all transform hover:-translate-y-1 text-[10px]"
                          >
                            <span className="material-icons text-sm">shopping_cart</span>
                            Keranjang
                          </button>
                          <button
                            onClick={() => addToWishlist(product.id)}
                            className="px-2.5 py-2.5 border-2 border-green-600 text-green-700 font-bold rounded-xl flex items-center justify-center hover:bg-green-50 transition-all"
                            title="Tambah ke Incaran"
                          >
                            <span className="material-icons text-sm">favorite_border</span>
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            addToCart(product.id);
                            setTimeout(() => {
                              const bubble = document.getElementById('cart-floating-bubble');
                              if (bubble) bubble.click();
                            }, 500);
                          }}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all transform hover:-translate-y-1 text-[10px]"
                        >
                          <span className="material-icons text-sm">shopping_bag</span>
                          Beli Langsung
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

      {/* Struktur Team Section */}
      {personnelTree.length > 0 && (
        <section className="py-20 px-4 md:px-8 bg-[#fcfdfe] overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 uppercase tracking-tight">Struktur Team</h2>
              <div className="w-24 h-1.5 bg-green-600 mx-auto rounded-full"></div>
            </div>
            
            <div className="flex flex-col items-center">
              {personnelTree.map(root => (
                <PersonnelCard key={root.id} person={root} />
              ))}
            </div>
          </div>
        </section>
      )}

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

        </div>
      </section>

      {/* Bottom Navigation */}
      <NavigationButton />
      <FloatingCartModal />
    </div>
  );
};

export default Home;
