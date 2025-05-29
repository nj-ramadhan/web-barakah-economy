// pages/EcourseJoinCoursePage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const EcourseJoinCoursePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    // Fetch course details
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/${slug}/`);
        setCourse(response.data);
      } catch (err) {
        console.error('Error fetching course:', err);
        setCourse({
          title: 'Kelas Tidak Ditemukan',
          banner: `/images/${slug}.jpg`
        });
      } finally {
        setLoading(false);
      }
    };

    // Check if user is already enrolled
    const checkEnrollment = async () => {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.access) return;
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/course/enrollments/`,
          { headers: { Authorization: `Bearer ${user.access}` } }
        );
        if (res.data.some(enroll => enroll.course === slug || enroll.course === course?.id)) {
          setEnrolled(true);
        }
      } catch (err) {
        // ignore
      }
    };

    fetchCourse();
    checkEnrollment();
    // eslint-disable-next-line
  }, [slug]);

  const handleJoinCourse = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.access) {
      navigate('/login');
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/course/enrollments/`,
        { course: course.id },
        { headers: { Authorization: `Bearer ${user.access}` } }
      );
      alert('Berhasil bergabung ke kelas!');
      setEnrolled(true);
      // Optionally redirect to course detail or dashboard
      navigate(`/kelas/${course.slug || course.id}`);
    } catch (error) {
      alert('Gagal bergabung ke kelas: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="body">
      <Header />

      {/* Header with course image */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 relative">
        {loading ? (
          <div className="w-full h-58 bg-green-500 animate-pulse"></div>
        ) : (
          <>
            <img
              src={course?.thumbnail || course?.banner || `/images/${slug}.jpg`}
              alt={course?.title || "Kelas"}
              className="w-full h-58 object-cover"
              onError={(e) => {
                e.target.src = '/images/default-campaign.jpg';
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h1 className="text-white font-bold text-xl">
                {course?.title || 'Kelas'}
              </h1>
            </div>
          </>
        )}
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        <h2 className="text-xl font-semibold mb-6 text-center">Gabung Kelas</h2>
        {enrolled ? (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center mb-6">
            Anda sudah terdaftar di kelas ini.
            <button
              className="block w-full mt-4 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700"
              onClick={() => navigate(`/kelas/${course?.slug || course?.id}`)}
            >
              Lihat Kelas
            </button>
          </div>
        ) : (
          <button
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors mb-6"
            onClick={handleJoinCourse}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Gabung Sekarang'}
          </button>
        )}

        {/* Optional: Show course description */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Tentang Kelas</h3>
          <div
            className="text-gray-700 text-sm"
            dangerouslySetInnerHTML={{ __html: course?.description || 'Tidak ada deskripsi.' }}
          />
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default EcourseJoinCoursePage;