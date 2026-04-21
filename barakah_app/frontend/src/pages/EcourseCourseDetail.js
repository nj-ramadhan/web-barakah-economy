import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShareButton from '../components/campaigns/ShareButton';
import { getCourseBySlug, getMyEnrolledCourses, createEnrollment } from '../services/ecourseApi';
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
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', image: null });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/api/courses/share/${slug}`;
    const title = `${course?.title} - Barakah Economy`;

    if (navigator.share) {
      navigator.share({
        title: title,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setShareMessage('Link disalin!');
          setTimeout(() => setShareMessage(''), 3000);
        })
        .catch(err => {
          console.error('Gagal menyalin link:', err);
        });
    }
  };

  const baseUrl = process.env.REACT_APP_API_BASE_URL;

  const fetchReviews = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/reviews/products/0/reviews/?course_id=${course?.id}`);
      setReviews(res.data);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  }, [course?.id]);

  useEffect(() => {
    if (course) fetchReviews();
  }, [course, fetchReviews]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) return;

    if (reviewForm.image && reviewForm.image.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB");
      return;
    }

    setSubmittingReview(true);
    const formData = new FormData();
    formData.append('course_id', course.id);
    formData.append('rating', reviewForm.rating);
    formData.append('comment', reviewForm.comment);
    if (reviewForm.image) {
      formData.append('image', reviewForm.image);
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/reviews/products/0/reviews/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert("Review berhasil dikirim!");
      setReviewForm({ rating: 5, comment: '', image: null });
      fetchReviews();
    } catch (err) {
      alert("Gagal mengirim review. Pastikan Anda sudah memberikan review sebelumnya atau coba lagi.");
    } finally {
      setSubmittingReview(false);
    }
  };

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const res = await getCourseBySlug(slug);
        setCourse(res.data);
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
      if (!user) return;

      try {
        const res = await getMyEnrolledCourses();
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
  }, [course]);

  const handleEnroll = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      alert('Anda harus login terlebih dahulu untuk membeli E-Course.');
      navigate('/login');
      return;
    }
    try {
      // Create enrollment
      await createEnrollment({ course: course.id });
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

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            "name": course.title,
            "description": course.description?.replace(/<[^>]+>/g, '').slice(0, 200),
            "provider": {
              "@type": "Organization",
              "name": "Barakah Economy Academy",
              "sameAs": window.location.origin
            },
            "offers": {
              "@type": "Offer",
              "price": course.price,
              "priceCurrency": "IDR",
              "availability": "https://schema.org/InStock",
              "url": window.location.href
            }
          })}
        </script>
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
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-xl font-bold">{course.title}</h1>
              <div className="flex-shrink-0">
                <ShareButton slug={course.slug} title={course.title} type="course" />
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="material-icons text-green-700 text-[14px]">person</span>
                </div>
                <span className="text-xs font-bold text-gray-600">@{course.instructor_name}</span>
              </div>
              <div className="flex items-center gap-1.5 opacity-60">
                <span className="material-icons text-[16px]">visibility</span>
                <span className="text-xs font-medium">{course.view_count || 0} orang telah melihat</span>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-black text-green-700">
                {formatIDR(course.price)}
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
            <button
              className={`py-3 px-4 text-sm font-bold ${activeTab === 'reviews' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
              onClick={() => setActiveTab('reviews')}
            >
              Review
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
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[200px]">
                <h3 className="text-sm font-bold mb-4">Kurikulum Kelas</h3>
                <div className="space-y-3">
                  {course.materials && course.materials.length > 0 ? (
                    course.materials.map((mat, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-green-50">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-gray-800 truncate">{mat.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <span className="material-icons text-xs">videocam</span> Video
                            </span>
                            {mat.pdf_file && (
                              <span className="text-[10px] text-blue-500 flex items-center gap-0.5 font-bold">
                                <span className="material-icons text-xs">description</span> Modul PDF
                              </span>
                            )}
                          </div>
                        </div>
                        {!isEnrolled ? (
                          <span className="material-icons text-gray-300 text-sm">lock</span>
                        ) : (
                          <span className="material-icons text-green-600 text-sm">play_circle_filled</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-center py-10">Materi belum tersedia.</p>
                  )}
                </div>
                {!isEnrolled && (
                  <div className="mt-8 p-4 bg-orange-50 border border-orange-100 rounded-2xl text-center">
                    <p className="text-xs text-orange-700 font-medium">Beli kelas untuk membuka akses ke semua materi dan video pembelajaran.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Review Form (Only for enrolled users) */}
                {isEnrolled && (
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-green-100">
                    <h3 className="text-sm font-bold mb-4">Berikan Review Anda</h3>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                              className={`material-icons ${star <= reviewForm.rating ? 'text-orange-400' : 'text-gray-300'}`}
                            >
                              star
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Komentar</label>
                        <textarea
                          required
                          rows="3"
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs"
                          placeholder="Ceritakan pengalaman Anda mengikuti kelas ini..."
                        ></textarea>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Upload Gambar (Optional, Max 5MB)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setReviewForm({ ...reviewForm, image: e.target.files[0] })}
                          className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        className="w-full py-3 bg-green-700 text-white rounded-xl text-xs font-bold disabled:bg-gray-400"
                      >
                        {submittingReview ? 'Mengirim...' : 'Kirim Review'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Reviews List */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-sm font-bold mb-6">Review Peserta</h3>
                  {reviews.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs italic py-10">Belum ada review untuk kelas ini.</p>
                  ) : (
                    <div className="space-y-6">
                      {reviews.map(review => (
                        <div key={review.id} className="border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs text-gray-500">
                                {review.username?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-800">{review.username}</p>
                                <p className="text-[10px] text-gray-400">{new Date(review.created_at).toLocaleDateString('id-ID')}</p>
                              </div>
                            </div>
                            <div className="flex text-orange-400">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className="material-icons text-[14px]">{i < review.rating ? 'star' : 'star_border'}</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed mb-3">{review.comment}</p>
                          {review.image && (
                            <img
                              src={baseUrl + review.image}
                              alt="Review"
                              className="w-32 h-32 object-cover rounded-lg border border-gray-100 shadow-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      <NavigationButton />

      {/* Fixed share button for mobile */}
      <div className="md:hidden fixed bottom-24 right-4 z-50">
        <button
          onClick={handleShare}
          className="bg-white border border-gray-200 text-gray-600 w-12 h-12 rounded-full shadow-lg flex items-center justify-center relative active:scale-95 transition-transform"
        >
          <span className="material-icons">share</span>
          {shareMessage && (
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
              {shareMessage}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default EcourseCourseDetail;