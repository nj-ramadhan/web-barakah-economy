// pages/PaymentPendingPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const PaymentPendingPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const intervalRef = useRef(null);

  // Fungsi untuk memeriksa status pembayaran
  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`https://your-backend-url/api/check-payment-status?order_id=${orderId}`);
      const data = await response.json();
      setPaymentStatus(data.status);

      // Jika status selesai atau gagal, hentikan polling
      if (data.status === 'success' || data.status === 'failed') {
        clearInterval(intervalRef.current);
        if (data.status === 'success') {
          window.location.href = `/payment-success?order_id=${orderId}&transaction_status=success`;
        } else {
          window.location.href = `/payment-failed?order_id=${orderId}&transaction_status=failed`;
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Mulai polling saat komponen dimount
  useEffect(() => {
    intervalRef.current = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(intervalRef.current);
  }, [orderId]);

  return (
    <div className="body">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-yellow-500 text-6xl mb-4 material-icons">timer</div>
          <h1 className="text-2xl font-bold mb-4">Pembayaran Tertunda</h1>
          <p className="text-gray-700 mb-6">Pembayaran Anda sedang diproses. Silakan tunggu...</p>
          <div className="text-left bg-gray-50 p-4 rounded-lg">
            <p><strong>ID Transaksi:</strong> {orderId}</p>
            <p><strong>Status:</strong> {paymentStatus}</p>
          </div>
          <div className="mt-6">
            <a
              href="/"
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default PaymentPendingPage;