import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EcoursePaymentPage = () => {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourse = async () => {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/?slug=${slug}`);
      setCourse(res.data[0]);
    };
    fetchCourse();
  }, [slug]);

  const handleConfirmPayment = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      navigate('/login');
      return;
    }
    // Call confirm_payment endpoint
    const enrollRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/courses/enrollments/?course=${course.id}`, {
      headers: { Authorization: `Bearer ${user.access}` }
    });
    const enrollmentId = enrollRes.data[0].id;
    await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/api/courses/enrollments/${enrollmentId}/confirm_payment/`,
      {},
      { headers: { Authorization: `Bearer ${user.access}` } }
    );
    navigate(`/kelas/${course.slug || course.id}`);
  };

  if (!course) return <div>Loading...</div>;

  return (
    <div>
      <h1>Pembayaran untuk {course.title}</h1>
      <p>Silakan transfer ke rekening berikut: ...</p>
      <button onClick={handleConfirmPayment} className="btn btn-success">
        Saya Sudah Bayar
      </button>
    </div>
  );
};

export default EcoursePaymentPage;