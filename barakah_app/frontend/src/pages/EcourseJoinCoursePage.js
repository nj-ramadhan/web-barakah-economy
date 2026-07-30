// pages/EcourseJoinCoursePage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import api from '../services/api';
import authService from '../services/auth';
import { getCourseBySlug } from '../services/ecourseApi';
import { getPublicPaymentConfig, generateDynaQRIS } from '../services/paymentApi';
import DynaQRISModal from '../components/common/DynaQRISModal';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

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

  // Payment Method Selection State
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('dynaqris');

  // DynaQRIS Modal State
  const [showDynaModal, setShowDynaModal] = useState(false);
  const [qrisData, setQrisData] = useState(null);
  const [currentEnrollmentId, setCurrentEnrollmentId] = useState(null);
  const [generatingQris, setGeneratingQris] = useState(false);

  const formatIDR = (amount) => {
    return 'Rp. ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);
  };

  useEffect(() => {
    // Fetch course details & payment config
    const fetchData = async () => {
      try {
        setLoading(true);
        const [courseRes, configRes] = await Promise.all([
          getCourseBySlug(slug),
          getPublicPaymentConfig().catch(() => null)
        ]);
        setCourse(courseRes.data);
        setPaymentConfig(configRes);
        if (configRes?.active_mode === 'dynaqris') {
          setSelectedPaymentMethod('dynaqris');
        } else {
          setSelectedPaymentMethod('transfer');
        }
      } catch (err) {
        console.error('Error fetching course or config:', err);
      } finally {
        setLoading(false);
      }
    };

    // Auto-fill user profile if logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setBuyerName(user.username || '');
      setBuyerEmail(user.email || '');
      setBuyerPhone(user.phone || '');
      if (user.id) {
        authService.getProfile(user.id).then(prof => {
          if (prof) {
            if (prof.name_full) setBuyerName(prof.name_full);
            if (prof.email) setBuyerEmail(prof.email);
            if (prof.phone_number || prof.phone) setBuyerPhone(prof.phone_number || prof.phone);
          }
        }).catch(err => console.error("Error loading user profile:", err));
      }
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

    fetchData();
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
      alert('Mohon lengkapi semua data kontak (Nama, Email, dan No HP)');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create or update enrollment
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
      setCurrentEnrollmentId(enrollment.id);

      if (Number(course.price) === 0 || enrollment.payment_status === 'paid') {
        alert('Berhasil bergabung ke kelas gratis!');
        navigate(`/kelas/${course.slug}`);
        return;
      }

      // 2. Paid course: check selected payment method
      if (selectedPaymentMethod === 'dynaqris') {
        setGeneratingQris(true);
        const qrisRes = await generateDynaQRIS({
          amount: course.price,
          reference_id: enrollment.id,
          type: 'ecourse'
        });
        setGeneratingQris(false);

        if (qrisRes.error) {
          alert(qrisRes.error);
        } else {
          setQrisData(qrisRes);
          setShowDynaModal(true);
        }
      } else {
        // Transfer / Manual Payment: Navigate to Payment Confirmation page
        navigate(`/konfirmasi-pembayaran-kelas/${course.slug}`);
      }
    } catch (error) {
      console.error(error);
      alert('Gagal memproses pendaftaran: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDynaSuccess = (res) => {
    setShowDynaModal(false);
    alert('Pembayaran berhasil diverifikasi! Selamat belajar di kelas ini.');
    navigate(`/kelas/${course.slug}`);
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

  const isFree = Number(course.price) === 0;

  return (
    <div className="body">
      <Helmet>
        <title>Checkout Kelas - {course.title}</title>
      </Helmet>

      <Header />

      <div className="px-4 py-4 pb-8 max-w-lg mx-auto">
        <h1 className="text-lg font-bold mb-4">Checkout Kelas</h1>

        {/* Course Summary */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl mb-6 border border-gray-100 shadow-sm">
          <img
            src={getMediaUrl(course.thumbnail) || '/placeholder-image.jpg'}
            alt={course.title}
            className="w-16 h-16 rounded-xl object-cover"
            onError={(e) => { e.target.src = '/placeholder-image.jpg'; }}
          />
          <div className="flex-1">
            <h2 className="font-semibold text-sm line-clamp-2">{course.title}</h2>
            <p className="text-green-700 font-bold text-sm mt-1">
              {isFree ? 'GRATIS' : formatIDR(course.price)}
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
              MULAI BELAJAR
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinCourse} className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Data Peserta</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition"
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition"
                  placeholder="email@contoh.com"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Info dan akses kelas akan dihubungkan ke email ini</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor HP (WhatsApp)</label>
                <input
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-green-500 focus:bg-white outline-none transition"
                  placeholder="08xxxxxxxxxx"
                  required
                />
              </div>
            </div>

            {/* Payment Method Selector (Only if paid) */}
            {!isFree && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Metode Pembayaran</h3>

                {paymentConfig?.active_mode === 'dynaqris' && (
                  <label
                    onClick={() => setSelectedPaymentMethod('dynaqris')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                      selectedPaymentMethod === 'dynaqris'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === 'dynaqris' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                      }`}>
                        {selectedPaymentMethod === 'dynaqris' && (
                          <span className="w-2 h-2 rounded-full bg-white"></span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                          <span className="material-icons text-emerald-600 text-sm">qr_code_2</span>
                          DynaQRIS (QRIS Otomatis)
                        </p>
                        <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Verifikasi Instan Otomatis</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Rekomendasi</span>
                  </label>
                )}

                <label
                  onClick={() => setSelectedPaymentMethod('transfer')}
                  className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition ${
                    selectedPaymentMethod === 'transfer'
                      ? 'border-emerald-600 bg-emerald-50/50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'transfer' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'transfer' && (
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="material-icons text-blue-600 text-sm">account_balance</span>
                        Transfer Bank BSI / QRIS Manual
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">Upload Bukti Konfirmasi Transfer</p>
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-emerald-100">Total Pembayaran</span>
                <span className="text-xl font-black">
                  {isFree ? 'Rp 0' : formatIDR(course.price)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || generatingQris}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 rounded-2xl font-bold text-sm shadow-xl active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting || generatingQris ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{isFree ? 'Daftar Sekarang (Gratis)' : 'Lanjut ke Pembayaran'}</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* DynaQRIS Modal */}
      <DynaQRISModal
        isOpen={showDynaModal}
        onClose={() => setShowDynaModal(false)}
        qrisData={qrisData}
        transactionType="ecourse"
        referenceId={currentEnrollmentId}
        amount={course?.price}
        onPaymentSuccess={handleDynaSuccess}
      />

      <NavigationButton />
    </div>
  );
};

export default EcourseJoinCoursePage;