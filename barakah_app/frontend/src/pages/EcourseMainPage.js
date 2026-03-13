// pages/EcourseMainPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome'; // Import the Header component
import NavigationButton from '../components/layout/Navigation'; // Import the Navigation component

const formatIDR = (amount) => {
  if (amount <= 0) return 'GRATIS';
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const EcourseMainPage = () => {
  const [courses, setCourses] = useState([]);
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);

  // Fetch featured courses (only once when the component mounts)
  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/courses/`,
          { params: { is_featured: true } } // Fetch only featured courses
        );
        setFeaturedCourses(response.data.slice(0, 3)); // Take the first 3 featured courses
      } catch (err) {
        console.error('Error fetching featured courses:', err);
        setError('Failed to load featured courses');
      }
    };

    fetchFeaturedCourses();
  }, []); // Empty dependency array ensures this runs only once

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
      fetchCourses(query);
    }, 500);

    setSearchTimeout(newTimeout);
  };

  useEffect(() => {
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
    if (featuredCourses.length > 1) {
      sliderInterval.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % featuredCourses.length);
      }, 5000);
    }

    return () => {
      if (sliderInterval.current) {
        clearInterval(sliderInterval.current);
      }
    };
  }, [featuredCourses]);

  const goToSlide = (index) => {
    setActiveSlide(index);
    // Reset timer
    if (sliderInterval.current) {
      clearInterval(sliderInterval.current);
    }
    sliderInterval.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % featuredCourses.length);
    }, 5000);
  };

  return (
    <div className="body">
      <Helmet>
        <meta name="description" content="Belajar tentang Islam, Ekonomi & Teknologi. Hidup Barakah dan Lejitkan Potensi" />
        <meta property="og:title" content="BARAKAH ACADEMY" />
        <meta property="og:description" content="Belajar tentang Islam, Ekonomi & Teknologi. Hidup Barakah dan Lejitkan Potensi" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <HeaderHome onSearch={handleSearch} />

      {/* Featured Campaign Slider */}
      <div className="px-4 pt-4 max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 10 }}>
        {featuredCourses.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden h-56 lg:h-96 shadow-lg">
            {/* Slides */}
            <div className="h-full">
              {featuredCourses.map((course, index) => {
                return (
                  <div
                    key={course.id}
                    className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                  >
                    <img
                      src={course.thumbnail || '/images/peduli-dhuafa-banner.jpg'}
                      alt={course.title}
                      className="w-full h-56 lg:h-96 object-cover"
                      onError={(e) => {
                        e.target.src = '/images/peduli-dhuafa-banner.jpg';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 lg:p-10">
                      <h2 className="text-white font-bold text-lg lg:text-3xl mb-2">{course.title}</h2>
                      <Link
                        to={`/kelas/${course.slug || course.id}`}
                        className="block text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900 w-1/3"
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
                    className={`w-2 h-2 rounded-full ${index === activeSlide ? 'bg-white' : 'bg-white/50'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign Grid */}
      <div className="px-4 py-8 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-green-600 rounded-full"></span>
          Semua Kelas Academy
        </h2>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {courses.map(course => {
              return (
                <div key={course.id} className="bg-white rounded-lg overflow-hidden shadow">
                  <Link to={`/kelas/${course.slug}`}>
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
                    <h3 className="text-sm font-medium mb-1 line-clamp-2 min-h-[40px] leading-tight">{course.title}</h3>
                    <div className="flex items-center gap-1 mb-2 opacity-60">
                      <span className="material-icons text-[10px]">person</span>
                      <span className="text-[10px] font-bold">@{course.instructor_name}</span>
                    </div>
                    <p className="text-xs font-black text-green-700 line-clamp-1 mb-2">{formatIDR(course.price)}</p>
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
              );
            })}
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

export default EcourseMainPage;