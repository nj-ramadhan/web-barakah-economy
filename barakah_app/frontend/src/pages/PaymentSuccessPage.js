// pages/PaymentSuccessPage.js
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const statusCode = searchParams.get('status_code');
  const transactionStatus = searchParams.get('transaction_status');

  // Contoh data nominal dan metode pembayaran (bisa disesuaikan dengan data dari backend)
  const amount = 100000; // Nominal transaksi
  const paymentMethod = 'Bank Transfer'; // Metode pembayaran

  return (
    <div className="body">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-green-500 text-6xl mb-4 material-icons">check</div>
          <h1 className="text-2xl font-bold mb-4">Pembayaran Berhasil</h1>
          <p className="text-gray-700 mb-6">Terima kasih atas donasi yang diberikan!</p>
          <div className="text-left bg-gray-50 p-4 rounded-lg">
            <p><strong>ID Transaksi:</strong> {orderId}</p>
            <p><strong>Nominal Donasi:</strong> Rp {amount.toLocaleString()}</p>
            <p><strong>Metode Pembayaran:</strong> {paymentMethod}</p>
            <p><strong>Status Code:</strong> {statusCode}</p>
            <p><strong>Status Transaksi:</strong> {transactionStatus}</p>
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

export default PaymentSuccessPage;