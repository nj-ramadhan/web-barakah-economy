// pages/PaymentPendingPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const PaymentPendingPage = () => {
  const location = useLocation();
  const { transactionId, amount, paymentMethod } = location.state || {};
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const intervalRef = useRef(null); // Gunakan useRef untuk menyimpan interval ID

  // Fungsi untuk memeriksa status pembayaran
  const checkPaymentStatus = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/check-payment-status?order_id=${transactionId}`);
      const data = await response.json();
      setPaymentStatus(data.status);

      // Jika status selesai atau gagal, hentikan polling
      if (data.status === 'success' || data.status === 'failed') {
        clearInterval(intervalRef.current); // Hentikan interval
        // Redirect ke halaman yang sesuai
        if (data.status === 'success') {
          window.location.href = `/pembayaran-berhasil?order_id=${transactionId}&transaction_status=success`;
        } else {
          window.location.href = `/pembayaran-gagal?order_id=${transactionId}&transaction_status=failed`;
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Mulai polling saat komponen dimount
  useEffect(() => {
    intervalRef.current = setInterval(checkPaymentStatus, 5000); // Simpan interval ID di ref

    // Hentikan polling saat komponen di-unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current); // Hentikan interval saat komponen di-unmount
      }
    };
  }, [transactionId]);

  return (
    <div className="body">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h1 className="text-2xl font-bold mb-4">Pembayaran Belum Selesai</h1>
          <p>Pembayaran Anda sedang diproses. Silakan tunggu...</p>
          <div className="mt-4">
            <p><strong>ID Transaksi:</strong> {transactionId}</p>
            <p><strong>Nominal Donasi:</strong> Rp {amount}</p>
            <p><strong>Metode Pembayaran:</strong> {paymentMethod}</p>
            <p><strong>Status:</strong> {paymentStatus}</p>
          </div>
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default PaymentPendingPage;