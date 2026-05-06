// pages/EcourseJoinCoursePage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import api from '../services/api';
import { getCourseBySlug } from '../services/ecourseApi';
import '../styles/Body.css';

const getMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanUrl}`;
};

const EcourseJoinCoursePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
  };

  useEffect(() => {
    // Fetch course details
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await getCourseBySlug(slug);
        setCourse(response.data);
      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };

    // Auto-fill if logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setBuyerName(user.username || '');
      setBuyerEmail(user.email || '');
      // If user has phone in profile or localstorage
      setBuyerPhone(user.phone || '');
    }

    // Check if user is already enrolled
    const checkEnrollment = async () => {
      if (!user || !user.access) return;
      try {
        const res = await api.get('/courses/enrollments/');
        const alreadyEnrolled = res.data.some(enroll =>
          (enroll.course_slug === slug || enroll.course === course?.id) &&
          ['paid', 'verified'].includes(enroll.payment_status)
        );
        if (alreadyEnrolled) {
          setEnrolled(true);
        }
      } catch (err) {
        // ignore
      }
    };

    fetchCourse();
    checkEnrollment();
  }, [slug, course?.id]);

  const handleJoinCourse = async (e) => {
    if (e) e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.access) {
      navigate('/login');
      return;
    }

    if (!buyerName || !buyerEmail || !buyerPhone) {
      alert('Mohon lengkapi semua data kontak');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(
        '/courses/enrollments/',
        {
          course: course.id,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone
        }
      );
      
      const enrollment = res.data;
      if (enrollment.payment_status === 'paid') {
        alert('Berhasil bergabung ke kelas gratis!');
        navigate(`/kelas/${course.slug}`);
      } else {
        // Redirect to payment confirmation for paid courses
        navigate(`/konfirmasi-pembayaran-kelas/${course.slug}`);
      }
    } catch (error) {
      alert('Gagal memproses pendaftaran: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="body">
        <Header />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="body">
        <Header />
        <div className="text-center py-20 text-gray-500">Kelas tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="body">
      <Helmet>
        <title>Checkout - {course.title}</title>
      </Helmet>

      <Header />

      <div className="px-4 py-4 pb-8 max-w-lg mx-auto">
        <h1 className="text-lg font-bold mb-4">Checkout Kelas</h1>

        {/* Course Summary */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl mb-6 border border-gray-100 shadow-sm">
          <img
            src={getMediaUrl(course.thumbnail) || '/placeholder-image.jpg'}
            alt={course.title}
            className="w-16 h-16 rounded-lg object-cover"
            onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
          />
          <div className="flex-1">
            <h2 className="font-semibold text-sm line-clamp-2">{course.title}</h2>
            <p className="text-green-700 font-bold text-sm mt-1">
              {Number(course.price) === 0 ? 'GRATIS' : formatIDR(course.price)}
            </p>
          </div>
        </div>

        {enrolled ? (
          <div className="bg-green-100 text-green-800 p-4 rounded-xl text-center mb-6 border border-green-200">
            <p className="font-medium mb-3">Anda sudah terdaftar di kelas ini.</p>
            <button
              className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition shadow-md"
              onClick={() => navigate(`/kelas/${course.slug}`)}
            >
              LIHAT KELAS
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinCourse} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="email@contoh.com"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Email akan digunakan untuk pengiriman info kelas</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP (WhatsApp)</label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="08xxxxxxxxxx"
                required
              />
            </div>

            {/* Total */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-inner">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">Total Harga</span>
                <span className="text-xl font-bold text-green-700">
                  {Number(course.price) === 0 ? 'Rp. 0' : formatIDR(course.price)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-xl hover:bg-green-800 transition disabled:opacity-50"
            >
              {submitting ? 'Memproses...' : (Number(course.price) === 0 ? 'Daftar Sekarang (Gratis)' : 'Lanjut ke Pembayaran')}
            </button>
          </form>
        )}
      </div>
      <NavigationButton />
    </div>
  );
};

export default EcourseJoinCoursePage;