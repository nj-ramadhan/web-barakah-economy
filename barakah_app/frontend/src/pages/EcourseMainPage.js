// pages/EcourseMainPage.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import HeaderHome from '../components/layout/HeaderHome';
import NavigationButton from '../components/layout/Navigation';
import { formatCurrency } from '../utils/formatters';
import { getMediaUrl } from '../utils/mediaUtils';
import ShareButton from '../components/campaigns/ShareButton';
import UserProfileModal from '../components/modals/UserProfileModal';
import '../styles/Body.css';

const formatIDR = (amount) => {
  if (!amount || Number(amount) <= 0) return 'GRATIS';
  return 'Rp ' + formatCurrency(amount);
};

const getCategoryIcon = (categoryKey = '') => {
  const cat = String(categoryKey).toLowerCase();
  if (cat.includes('syariah') || cat.includes('fiqih') || cat.includes('agama') || cat.includes('islam') || cat.includes('muamalah') || cat.includes('quran')) {
    return 'menu_book';
  }
  if (cat.includes('bisnis') || cat.includes('wirausaha') || cat.includes('usaha') || cat.includes('marketing') || cat.includes('manajemen') || cat.includes('jual')) {
    return 'trending_up';
  }
  if (cat.includes('teknologi') || cat.includes('coding') || cat.includes('web') || cat.includes('it') || cat.includes('data') || cat.includes('ai') || cat.includes('software')) {
    return 'code';
  }
  if (cat.includes('finansial') || cat.includes('keuangan') || cat.includes('investasi') || cat.includes('pajak')) {
    return 'account_balance_wallet';
  }
  if (cat.includes('desain') || cat.includes('kreatif') || cat.includes('multimedia') || cat.includes('video') || cat.includes('animasi')) {
    return 'palette';
  }
  if (cat.includes('bahasa') || cat.includes('arab') || cat.includes('inggris') || cat.includes('komunikasi')) {
    return 'translate';
  }
  if (cat.includes('pendidikan') || cat.includes('edukasi') || cat.includes('akademik') || cat.includes('sekolah') || cat.includes('kuliah')) {
    return 'school';
  }
  return 'school';
};

const CATEGORY_LIMIT = 8;

const EcourseMainPage = () => {
  const [courses, setCourses] = useState([]);
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get('search') ?? searchParams.get('q') ?? '';
  });
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const raw = searchParams.get('category') || searchParams.get('kategori') || searchParams.get('cat') || '';
    if (!raw || raw === 'Semua') return [];
    return raw.split(',').map(c => c.trim()).filter(Boolean);
  });
  const [sortBy, setSortBy] = useState(() => {
    return searchParams.get('sort') || searchParams.get('urutkan') || searchParams.get('order') || 'populer';
  });
  const [viewMode, setViewMode] = useState(() => {
    const v = searchParams.get('view');
    return v === 'blocks' ? 'blocks' : 'grid';
  });

  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderInterval = useRef(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Sync state when URL searchParams change
  useEffect(() => {
    const q = searchParams.get('search') ?? searchParams.get('q') ?? '';
    setSearchQuery(q);

    const rawCat = searchParams.get('category') || searchParams.get('kategori') || searchParams.get('cat') || '';
    if (!rawCat || rawCat === 'Semua') {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(rawCat.split(',').map(c => c.trim()).filter(Boolean));
    }

    const sort = searchParams.get('sort') || searchParams.get('urutkan') || searchParams.get('order') || 'populer';
    setSortBy(sort);

    const view = searchParams.get('view') || 'grid';
    if (view === 'grid' || view === 'blocks') {
      setViewMode(view);
    }
  }, [searchParams]);

  // Handlers that update state and URL query arguments synchronously
  const handleCategoryToggle = (newCat) => {
    let updated = [];
    if (!newCat || newCat === 'Semua') {
      updated = [];
    } else {
      const exists = selectedCategories.some(c => c.toLowerCase() === newCat.toLowerCase());
      if (exists) {
        updated = selectedCategories.filter(c => c.toLowerCase() !== newCat.toLowerCase());
      } else {
        updated = [...selectedCategories, newCat];
      }
    }
    setSelectedCategories(updated);
    const newParams = new URLSearchParams(searchParams);
    if (updated.length > 0) {
      newParams.set('category', updated.join(','));
      newParams.delete('kategori');
      newParams.delete('cat');
    } else {
      newParams.delete('category');
      newParams.delete('kategori');
      newParams.delete('cat');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    const newParams = new URLSearchParams(searchParams);
    if (query && query.trim()) {
      newParams.set('search', query.trim());
      newParams.delete('q');
    } else {
      newParams.delete('search');
      newParams.delete('q');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    const newParams = new URLSearchParams(searchParams);
    if (newSort && newSort !== 'populer') {
      newParams.set('sort', newSort);
      newParams.delete('urutkan');
      newParams.delete('order');
    } else {
      newParams.delete('sort');
      newParams.delete('urutkan');
      newParams.delete('order');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleViewModeChange = (newView) => {
    setViewMode(newView);
    const newParams = new URLSearchParams(searchParams);
    if (newView && newView !== 'grid') {
      newParams.set('view', newView);
    } else {
      newParams.delete('view');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSearchQuery('');
    setSortBy('populer');
    setViewMode('grid');
    setSearchParams({}, { replace: true });
  };

  const handleShareStoreFilter = async () => {
    const currentUrl = window.location.href;
    const catLabel = selectedCategories.length > 0 ? `Kategori (${selectedCategories.join(', ')})` : 'Katalog E-Course';
    const shareTitle = `Barakah Academy E-Course - ${catLabel}${searchQuery ? ` (Cari: ${searchQuery})` : ''}`;
    const shareText = `Yuk ikuti kelas online di Barakah Academy${selectedCategories.length > 0 ? ` untuk ${catLabel}` : ''}${searchQuery ? ` dengan kata kunci "${searchQuery}"` : ''}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 3000);
    } catch (e) {
      alert('Tautan halaman: ' + currentUrl);
    }
  };

  const isCategorySelected = (catKey, catLabel = '') => {
    if (selectedCategories.length === 0) {
      return catKey === 'Semua';
    }
    if (catKey === 'Semua') {
      return false;
    }
    const keyLower = catKey.toLowerCase().trim();
    const labelLower = catLabel.toLowerCase().trim();
    return selectedCategories.some(sel => {
      const s = sel.toLowerCase().trim();
      return (
        keyLower === s ||
        labelLower === s ||
        keyLower.replace(/[-_]/g, ' ') === s.replace(/[-_]/g, ' ') ||
        labelLower.replace(/[-_&]/g, ' ') === s.replace(/[-_&]/g, ' ')
      );
    });
  };

  // Fetch courses and featured courses
  useEffect(() => {
    const fetchAllCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const [featuredRes, allRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/`, { params: { is_featured: true } }),
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/`)
        ]);

        const allCoursesData = (allRes.data || []).map(c => ({
          ...c,
          category: c.category || 'Pendidikan'
        }));

        setCourses(allCoursesData);

        const feat = featuredRes.data && featuredRes.data.length > 0 
          ? featuredRes.data 
          : allCoursesData.slice(0, 3);
        setFeaturedCourses(feat.slice(0, 3));
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Gagal memuat daftar kelas. Silakan coba lagi.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllCourses();

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
    if (sliderInterval.current) {
      clearInterval(sliderInterval.current);
    }
    sliderInterval.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % featuredCourses.length);
    }, 5000);
  };

  // Extract unique categories from courses
  const categoriesList = useMemo(() => {
    const map = new Map();
    courses.forEach(c => {
      const catKey = c.category || 'Pendidikan';
      const catLabel = c.category ? c.category.replace(/-/g, ' ').toUpperCase() : 'Pendidikan';
      if (!map.has(catKey)) {
        map.set(catKey, { key: catKey, label: catLabel, count: 0 });
      }
      map.get(catKey).count += 1;
    });

    const list = Array.from(map.values()).sort((a, b) => b.count - a.count);
    return [{ key: 'Semua', label: 'Semua', count: courses.length }, ...list];
  }, [courses]);

  // Filter courses by search query and category
  const filteredCourses = useMemo(() => {
    let result = courses;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.instructor_name && c.instructor_name.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(c => {
        const catKey = (c.category || 'Pendidikan').toLowerCase().trim();
        return selectedCategories.some(sel => {
          const target = sel.toLowerCase().trim();
          return (
            catKey === target ||
            catKey.replace(/[-_]/g, ' ') === target.replace(/[-_]/g, ' ')
          );
        });
      });
    }

    return result;
  }, [courses, searchQuery, selectedCategories]);

  // Sort courses
  const sortedFilteredCourses = useMemo(() => {
    return [...filteredCourses].sort((a, b) => {
      if (sortBy === 'terlaris') {
        const studentsDiff = Number(b.student_count || 0) - Number(a.student_count || 0);
        if (studentsDiff !== 0) return studentsDiff;
        return Number(b.view_count || 0) - Number(a.view_count || 0);
      }
      if (sortBy === 'price_asc') {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortBy === 'price_desc') {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      // Default: populer
      const studentsDiff = Number(b.student_count || 0) - Number(a.student_count || 0);
      if (studentsDiff !== 0) return studentsDiff;
      const viewsDiff = Number(b.view_count || 0) - Number(a.view_count || 0);
      if (viewsDiff !== 0) return viewsDiff;
      const likesDiff = Number(b.likes_count || 0) - Number(a.likes_count || 0);
      if (likesDiff !== 0) return likesDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [filteredCourses, sortBy]);

  // Group filtered courses by Category for block view
  const categoryBlocks = useMemo(() => {
    const groups = {};

    sortedFilteredCourses.forEach(c => {
      const catKey = c.category || 'Pendidikan';
      const catLabel = c.category ? c.category.replace(/-/g, ' ').toUpperCase() : 'Pendidikan';

      if (!groups[catKey]) {
        groups[catKey] = {
          key: catKey,
          label: catLabel,
          items: []
        };
      }
      groups[catKey].items.push(c);
    });

    return Object.values(groups);
  }, [sortedFilteredCourses]);

  const renderCourseCard = (course) => {
    const courseSlug = course.slug || course.id;
    const detailLink = `/kelas/${courseSlug}`;
    const isFree = !course.price || Number(course.price) <= 0;

    return (
      <div key={course.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between group">
        <div className="relative">
          {course.category && (
            <div className="absolute top-2 left-2 z-10 bg-emerald-600/95 backdrop-blur-xs text-white text-[9px] font-black px-2.5 py-1 rounded-xl shadow uppercase tracking-wider flex items-center gap-1">
              <span className="material-icons text-[11px]">{getCategoryIcon(course.category)}</span>
              {course.category}
            </div>
          )}

          {isFree && (
            <div className="absolute top-2 right-12 z-10 bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow uppercase tracking-wider">
              GRATIS
            </div>
          )}

          <Link to={detailLink}>
            <img
              src={getMediaUrl(course.thumbnail) || '/placeholder-image.jpg'}
              alt={course.title}
              className="w-full h-36 md:h-44 object-cover group-hover:scale-105 transition-transform duration-300 bg-gray-50"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
              }}
            />
          </Link>

          <div className="absolute top-2 right-2 z-10">
            <ShareButton
              slug={course.slug || course.id}
              title={course.title}
              type="course"
              price={course.price}
              description={course.description}
              variant="card-icon"
            />
          </div>
        </div>

        <div className="p-3.5 flex flex-col flex-1 justify-between">
          <div>
            {/* Instructor Badge */}
            <div className="flex items-center gap-1 text-gray-500 text-[10px] font-medium mb-1">
              <span className="material-icons text-[12px] text-emerald-600 shrink-0">school</span>
              <span className="truncate max-w-[130px] md:max-w-[160px]" title={`Instruktur: @${course.instructor_name}`}>
                Instruktur: @{course.instructor_name}
              </span>
            </div>

            <h3 className="text-xs md:text-sm font-semibold mb-1.5 line-clamp-2 min-h-[36px] text-gray-800 hover:text-emerald-700 transition-colors">
              <Link to={detailLink}>
                {course.title}
              </Link>
            </h3>

            <div className="mb-2">
              <p className="text-emerald-700 font-bold text-sm">
                {formatIDR(course.price)}
              </p>
              <div className="flex items-center justify-between text-[10px] mt-0.5">
                <span className="text-gray-400">
                  {course.material_count ? `${course.material_count} materi` : 'Akses Penuh'}
                </span>
                {course.student_count !== undefined && course.student_count > 0 && (
                  <span className="font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="material-icons text-[11px]">people</span>
                    {course.student_count} peserta
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center text-gray-500 text-[10px] gap-1" title="Total Diklik / Dilihat">
                <span className="material-icons text-[12px] text-emerald-600">visibility</span>
                <span className="font-semibold text-gray-700">{course.view_count || 0}</span>
              </div>
              <div className="flex items-center text-gray-400 text-[10px] gap-1" title="Favorit">
                <span className="material-icons text-[12px] text-rose-500">favorite</span>
                <span>{course.likes_count || 0}</span>
              </div>
              <div
                className="flex items-center gap-1 ml-auto cursor-pointer hover:bg-emerald-50 px-1.5 py-0.5 rounded-lg transition-all max-w-[100px] md:max-w-[120px]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (course.instructor_name) {
                    navigate(`/store/${course.instructor_name}`);
                  } else if (course.instructor) {
                    setSelectedUserId(course.instructor);
                    setIsProfileModalOpen(true);
                  }
                }}
                title={`Kunjungi Profil @${course.instructor_name}`}
              >
                <img
                  src={getMediaUrl(course.instructor_avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(course.instructor_name || 'Instruktur')}&background=random`}
                  alt={course.instructor_name}
                  className="w-4 h-4 rounded-full object-cover border border-emerald-100 shrink-0"
                />
                <span className="text-[10px] font-bold text-emerald-700 truncate">@{course.instructor_name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Link
              to={detailLink}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all transform active:scale-95 text-[11px]"
            >
              <span className="material-icons text-sm">school</span>
              Lihat & Ikuti Kelas
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Helmet>
        <title>Barakah Academy - Kelas & E-Course Online</title>
        <meta name="description" content="Belajar Islam, Ekonomi Syariah, Bisnis, dan Teknologi bersama instruktur terpercaya di Barakah Academy" />
        <meta property="og:title" content="BARAKAH ACADEMY E-COURSE" />
        <meta property="og:description" content="Belajar Islam, Bisnis, dan Keahlian Digital Bersama Para Pakar" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <HeaderHome onSearch={handleSearchChange} />

      {/* Featured Banner Slider */}
      <div className="px-4 pt-4 max-w-6xl mx-auto" style={{ position: 'relative', zIndex: 10 }}>
        {featuredCourses.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden h-52 lg:h-96 shadow-md border border-gray-100">
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
                      src={getMediaUrl(course.thumbnail) || '/placeholder-image.jpg'}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-4 lg:p-8">
                      <div className="text-white max-w-xl">
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider mb-2 inline-block shadow">
                          Kelas Unggulan
                        </span>
                        <h2 className="text-lg lg:text-3xl font-bold line-clamp-1">{course.title}</h2>
                        <p className="text-xs lg:text-sm text-gray-200 line-clamp-2 mt-1 mb-3">
                          {course.description?.replace(/<[^>]*>?/gm, '')}
                        </p>
                        <Link
                          to={`/kelas/${course.slug || course.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                        >
                          <span>Lihat Detail Kelas</span>
                          <span className="material-icons text-sm">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {featuredCourses.length > 1 && (
              <div className="absolute bottom-3 right-3 flex space-x-1.5 z-20">
                {featuredCourses.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === activeSlide ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="px-4 py-8 max-w-6xl mx-auto">
        {/* Title and In-Page Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-7 bg-emerald-600 rounded-full"></span>
              Barakah Academy E-Course
            </h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">
              Tingkatkan wawasan syariah, bisnis, dan keahlian digital bersama instruktur terbaik
            </p>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full md:w-80">
            <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Cari kelas, materi, atau pemateri..."
              className="w-full pl-10 pr-10 py-2.5 bg-white rounded-2xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 shadow-sm transition"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons text-base">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        {categoriesList.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-icons text-sm text-emerald-600">category</span>
                <span>Kategori Kelas</span>
                {selectedCategories.length > 0 && (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {selectedCategories.length} Dipilih (Bisa multi-pilih)
                  </span>
                )}
              </span>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleCategoryToggle('Semua')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold transition flex items-center gap-1"
                >
                  <span className="material-icons text-sm">restart_alt</span>
                  <span>Reset Kategori</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 transition-all duration-500 mb-3">
              {(isCategoryExpanded ? categoriesList : categoriesList.slice(0, CATEGORY_LIMIT)).map((cat) => {
                const isSelected = isCategorySelected(cat.key, cat.label);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.key)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100 scale-105'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    } uppercase tracking-wider cursor-pointer`}
                  >
                    <span className="material-icons text-sm">{getCategoryIcon(cat.key)}</span>
                    <span>{cat.label}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.count}
                    </span>
                    {isSelected && cat.key !== 'Semua' && (
                      <span className="material-icons text-xs ml-0.5">check</span>
                    )}
                  </button>
                );
              })}
            </div>

            {categoriesList.length > CATEGORY_LIMIT && (
              <div className="flex justify-center md:justify-start">
                <button
                  onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all duration-300 flex items-center gap-2 ${
                    isCategoryExpanded
                      ? 'bg-gray-100 text-gray-800 border-gray-200'
                      : 'bg-white text-emerald-700 border-emerald-600 hover:bg-emerald-50'
                  } border uppercase tracking-widest shadow-sm`}
                >
                  {isCategoryExpanded ? (
                    <>
                      SEMBUNYIKAN KATEGORI <span className="material-icons text-sm">expand_less</span>
                    </>
                  ) : (
                    <>
                      {`LIHAT SEMUA KATEGORI (${categoriesList.length})`}{' '}
                      <span className="material-icons text-sm">expand_more</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Filter Indicators Bar */}
        {(selectedCategories.length > 0 || searchQuery.trim()) && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 mb-6 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1 text-[11px]">
                <span className="material-icons text-sm text-emerald-700">filter_alt</span>
                Filter Aktif:
              </span>
              {selectedCategories.map((catKey) => (
                <span
                  key={catKey}
                  className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  <span>Kategori: {catKey}</span>
                  <button
                    type="button"
                    onClick={() => handleCategoryToggle(catKey)}
                    className="text-gray-400 hover:text-red-500 flex items-center"
                    title={`Hapus filter kategori ${catKey}`}
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </span>
              ))}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                  <span>Cari: "{searchQuery}"</span>
                  <button
                    onClick={() => handleSearchChange('')}
                    className="text-gray-400 hover:text-red-500 flex items-center"
                    title="Hapus pencarian"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShareStoreFilter}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 bg-white hover:bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 rounded-xl transition shadow-sm"
                title="Salin atau bagikan tautan dengan filter ini"
              >
                <span className="material-icons text-sm">{copiedShare ? 'check_circle' : 'share'}</span>
                {copiedShare ? 'Tautan Tersalin!' : 'Bagikan Filter Ini'}
              </button>
              <button
                onClick={handleResetFilters}
                className="text-xs text-gray-500 hover:text-red-600 font-bold underline px-1"
              >
                Reset Semua
              </button>
            </div>
          </div>
        )}

        {/* Sort & Filter Controls Toolbar */}
        <div className="bg-white rounded-2xl p-3 md:p-4 border border-gray-200/80 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <span className="material-icons text-sm text-emerald-600">tune</span>
              Urutkan:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'populer', label: 'Paling Populer', icon: 'trending_up', title: 'Paling populer & banyak dilihat' },
                { key: 'terlaris', label: 'Peserta Terbanyak', icon: 'local_fire_department', title: 'Paling banyak diikuti peserta' },
                { key: 'price_asc', label: 'Harga Terendah', icon: 'south_east', title: 'Harga termurah atau gratis' },
                { key: 'price_desc', label: 'Harga Tertinggi', icon: 'north_east', title: 'Harga kelas tertinggi' },
                { key: 'newest', label: 'Terbaru', icon: 'schedule', title: 'Kelas yang baru dirilis' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSortChange(opt.key)}
                  title={opt.title}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    sortBy === opt.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100 scale-105'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className={`material-icons text-sm ${sortBy === opt.key ? 'text-white' : 'text-emerald-600'}`}>
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-2.5 text-xs text-gray-500 font-medium">
            <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-xl border border-emerald-100 shrink-0">
              {sortedFilteredCourses.length} Kelas E-Course
            </span>

            {/* View Mode Toggle when no specific category is selected */}
            {selectedCategories.length === 0 && (
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewMode === 'grid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Tampilkan semua kelas dalam grid langsung"
                >
                  <span className="material-icons text-xs">grid_view</span>
                  Semua
                </button>
                <button
                  onClick={() => handleViewModeChange('blocks')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    viewMode === 'blocks' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Tampilkan per blok kategori"
                >
                  <span className="material-icons text-xs">view_agenda</span>
                  Per Kategori
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-3"></div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Memuat kelas e-course...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-red-200 text-red-500 p-8 shadow-sm">
            <span className="material-icons text-5xl mb-2 text-red-400">error_outline</span>
            <p className="text-sm font-bold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              Coba Lagi
            </button>
          </div>
        ) : sortedFilteredCourses.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-gray-400 p-8 shadow-sm">
            <span className="material-icons text-6xl mb-3 text-gray-300">school</span>
            <p className="text-base font-bold text-gray-700">Tidak ada kelas yang ditemukan</p>
            <p className="text-xs mt-1 text-gray-400 max-w-sm mx-auto">
              Coba cari dengan kata kunci lain atau pilih kategori materi yang berbeda
            </p>
            {(searchQuery || selectedCategories.length > 0) && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
              >
                Reset Pencarian & Filter
              </button>
            )}
          </div>
        ) : selectedCategories.length === 0 && viewMode === 'blocks' ? (
          /* Category-Grouped Blocks View */
          <div className="space-y-12">
            {categoryBlocks.map((block) => (
              <div key={block.key} className="space-y-4">
                {/* Category Block Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                      <span className="material-icons text-lg">{getCategoryIcon(block.key)}</span>
                    </div>
                    <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight uppercase">
                      {block.label}
                    </h2>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {block.items.length} Kelas
                    </span>
                  </div>

                  <button
                    onClick={() => handleCategoryToggle(block.key)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    <span>Filter Kategori Ini</span>
                    <span className="material-icons text-xs">chevron_right</span>
                  </button>
                </div>

                {/* Grid of Course Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                  {block.items.map(renderCourseCard)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Standard Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {sortedFilteredCourses.map(renderCourseCard)}
          </div>
        )}
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

export default EcourseMainPage;