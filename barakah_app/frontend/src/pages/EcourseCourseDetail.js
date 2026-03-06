import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const formatIDR = (amount) => {
  if (amount <= 0) return 'GRATIS';
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const EcourseCourseDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullMaterials, setShowFullMaterials] = useState({});
  const [isEnrolled, setIsEnrolled] = useState(false);

  const baseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const courseResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/${slug}/`);
        setCourse(courseResponse.data);
      } catch (err) {
        setError('Failed to load course details');
      } finally {
        setLoading(false);
      }
    };
    fetchCourseDetails();
  }, [slug]);

  useEffect(() => {
    const checkEnrollment = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) {
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/courses/enrollments/`,
          { headers: { Authorization: `Bearer ${user.access}` } }
        );
        // Check if user is enrolled in this course and payment_status is 'verified' or 'paid'
        const enrolled = res.data.some(
          enroll => (enroll.course === course.id || enroll.course === course.slug) && ['paid', 'verified'].includes(enroll.payment_status)
        );
        setIsEnrolled(enrolled);
      } catch {
        setIsEnrolled(false);
      }
    };
    if (course) checkEnrollment();
  }, [course, navigate]); // <-- add navigate here

  const handleEnroll = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.access) {
      navigate('/login');
      return;
    }
    try {
      // Create enrollment
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/courses/enrollments/`,
        { course: course.id },
        { headers: { Authorization: `Bearer ${user.access}` } }
      );
      setIsEnrolled(true);
      if (Number(course.price) > 0) {
        navigate(`/konfirmasi-pembayaran-kelas/${course.slug || course.id}`);
      } else {
        // Free course: show success or redirect to course page
        alert('Anda berhasil mendaftar kelas gratis!');
        navigate(`/kelas/${course.slug || course.id}`);
      }
    } catch (err) {
      alert('Gagal mendaftar kelas. Silakan coba lagi.');
    }
  };

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  const toggleMaterial = (materialId) => {
    setShowFullMaterials((prev) => ({
      ...prev,
      [materialId]: !prev[materialId],
    }));
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;
  if (!course) return <div className="text-center py-8 text-red-500">Kelas tidak ditemukan.</div>;

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

  return (
    <div className="body">
      <Helmet>
        <title>{course.title} | BARAKAH ECONOMY</title>
        <meta name="description" content={course.description?.replace(/<[^>]+>/g, '').slice(0, 100)} />
        <meta property="og:title" content={course.title} />
        <meta property="og:description" content={course.description?.replace(/<[^>]+>/g, '').slice(0, 100)} />
        <meta property="og:image" content={course.thumbnail} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <Header />
      {/* Course Details */}
      <div className="px-4 py-4 max-w-6xl mx-auto">
        <div className="bg-white rounded-lg overflow-hidden shadow">
          <img
            src={course.thumbnail || '/placeholder-image.jpg'}
            alt={course.title}
            className="w-full h-56 object-cover"
            onError={(e) => {
              e.target.src = '/placeholder-image.jpg';
            }}
          />
          <div className="p-4">
            <h1 className="text-xl font-bold mb-2">{course.title}</h1>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 mb-2">
                {course.price ? formatIDR(course.price) : 'Rp. 0'}
              </span>
            </div>
            {!isEnrolled && (
              <button
                onClick={handleEnroll}
                className="block w-full text-center bg-green-800 text-white py-2 rounded-md text-sm hover:bg-green-900"
              >
                IKUTI KELAS
              </button>
            )}
            {isEnrolled && (
              <button
                onClick={() => navigate(`/kelas/buka/${course.slug}`)}
                className="block w-full text-center bg-green-600 text-white py-2 rounded-md text-sm font-bold hover:bg-green-700 shadow-md transition"
              >
                MULAI BELAJAR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation & Content Container */}
      <div className="max-w-6xl mx-auto mb-20 px-4">
        {/* Tab Navigation */}
        <div className="mt-4">
          <div className="flex justify-around bg-white border-b rounded-t-lg">
            <button
              className={`py-3 px-4 text-sm font-bold ${activeTab === 'description' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('description')}
            >
              Keterangan
            </button>
            <button
              className={`py-3 px-4 text-sm font-bold ${activeTab === 'students' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('students')}
            >
              Peserta ({course.student_count || 0})
            </button>
            <button
              className={`py-3 px-4 text-sm font-bold ${activeTab === 'materials' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('materials')}
            >
              Materi ({course.material_count || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'description' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[200px]">
                {course.description ? (
                  <>
                    <div
                      className="prose max-w-none text-gray-700 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: showFullDescription
                          ? convertRelativeUrlsToAbsolute(course.description, baseUrl)
                          : convertRelativeUrlsToAbsolute(course.description, baseUrl).substring(0, 500) + '...',
                      }}
                    />
                    {course.description.length > 500 && (
                      <button
                        onClick={toggleDescription}
                        className="text-green-600 mt-4 text-xs font-bold uppercase tracking-wider bg-green-50 px-4 py-2 rounded-full hover:bg-green-100 transition"
                      >
                        {showFullDescription ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Selengkapnya'}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 italic">Tidak ada deskripsi.</p>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {course.students && course.students.length > 0 ? (
                    course.students.map((student, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-xl flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs">
                          {student.full_name ? student.full_name.charAt(0).toUpperCase() : (student.username ? student.username.charAt(0).toUpperCase() : 'U')}
                        </div>
                        <span className="text-gray-700 font-bold text-xs truncate">{student.full_name || student.username}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center">
                      <span className="material-symbols-outlined text-gray-200 text-4xl block mb-2">person_off</span>
                      <p className="text-gray-400 text-xs italic">Belum ada peserta terdaftar.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-50 text-sm">
                  {course.materials && course.materials.length > 0 ? (
                    course.materials.map((material, idx) => (
                      <div key={idx} className="p-4 hover:bg-gray-50/50 transition">
                        <div
                          className="flex justify-between items-center group cursor-pointer"
                          onClick={() => toggleMaterial(material.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 flex-shrink-0 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-gray-800 group-hover:text-green-700">{material.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`material-icons text-gray-400 transition-transform ${showFullMaterials[material.id] ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </div>
                        </div>
                        {showFullMaterials[material.id] && (
                          <div className="mt-3 pl-9">
                            {material.description ? (
                              <div
                                className="text-gray-500 text-xs leading-relaxed"
                                dangerouslySetInnerHTML={{
                                  __html: convertRelativeUrlsToAbsolute(material.description, baseUrl),
                                }}
                              />
                            ) : (
                              <p className="text-gray-400 text-[10px] italic">Tidak ada rincian materi.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-10 text-center">
                      <p className="text-gray-400 text-xs italic">Belum ada materi.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      <NavigationButton />
    </div>
  );
};

export default EcourseCourseDetail;