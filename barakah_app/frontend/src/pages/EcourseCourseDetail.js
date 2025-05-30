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
  const [showFullMaterials, setShowFullMaterials] = useState(false);  
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
        // Check if user is enrolled in this course and payment_status is 'verified'
        const enrolled = res.data.some(
          enroll => (enroll.course === course.id || enroll.course === course.slug) && enroll.payment_status === 'verified'
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
      <div className="px-4 py-4">
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
              <div
                className="block text-center bg-gray-400 text-white py-2 rounded-md text-sm hover:bg-gray-600"
              >
                KAMU SUDAH IKUT KELAS INI
              </div>
            )}
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
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'students' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('students')}
          >
            Peserta ({course.students ? course.students.length : 0})
          </button>
          <button
            className={`py-2 px-4 text-sm font-medium ${activeTab === 'materials' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('materials')}
          >
            Materi ({course.materials ? course.materials.length : 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'description' && (
            <div className="bg-white p-4 rounded-lg shadow">
              {course.description ? (
                <>
                  <div
                    onClick={toggleDescription}
                    dangerouslySetInnerHTML={{
                      __html: showFullDescription
                        ? convertRelativeUrlsToAbsolute(course.description, baseUrl)
                        : convertRelativeUrlsToAbsolute(course.description, baseUrl).substring(0, 200) + '...',
                    }}
                  />
                  {course.description.length > 200 && (
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

          {activeTab === 'students' && (
            <div className="bg-white p-4 rounded-lg shadow">
              <ul>
                {course.students && course.students.length > 0 ? (
                  course.students.map((student, idx) => (
                    <li key={idx} className="border-b py-2 px-4 flex items-center">
                      <span className="text-green-700 font-semibold">{student.full_name || student.username}</span>
                    </li>
                  ))
                ) : (
                  <li className="py-2 px-4 text-gray-500">Belum ada peserta terdaftar.</li>
                )}
              </ul>
            </div>
          )}

          {activeTab === 'materials' && isEnrolled && (
            <div className="bg-white p-4 rounded-lg shadow">
              <ul>
                {course.materials && course.materials.length > 0 ? (
                  course.materials.map((material, idx) => (
                    <li key={idx} className="border-b py-2 px-4">
                      <div 
                        onClick={() => toggleMaterial(material.id)}
                        className="flex justify-between items-center">
                        <span className="font-semibold">{material.title}</span>
                        <span className="text-xs text-gray-500">{material.material_type}</span>
                      </div>
                      {material.content ? (
                        <>
                          <div
                            onClick={() => toggleMaterial(material.id)}
                            dangerouslySetInnerHTML={{
                              __html: showFullMaterials[material.id]
                                ? convertRelativeUrlsToAbsolute(material.content, baseUrl)
                                : convertRelativeUrlsToAbsolute(material.content, baseUrl).substring(0, 0) + '',
                            }}
                          />
                          {material.content.length > 0 && (
                            <button
                              onClick={() => toggleMaterial(material.id)}
                              className="text-green-600 mt-2 text-sm"
                            >
                              {showFullMaterials[material.id] ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Selengkapnya'}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500">Tidak ada konten.</p>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="py-2 px-4 text-gray-500">Belum ada materi.</li>
                )}
              </ul>
            </div>
          )}

          {activeTab === 'materials' && !isEnrolled && (
            <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800 text-center shadow">
              Anda harus mendaftar dan membayar untuk mengakses materi kelas ini.
            </div>
          )}
        </div>
      </div>

      <NavigationButton />
    </div>
  );
};

export default EcourseCourseDetail;