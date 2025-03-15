// pages/CheckoutPage.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

// Define category-based additional amounts
const categoryAdditionalAmounts = {
  dhuafa: {value: 100},
  yatim: {value: 150},
  quran: {value: 200},
  qurban: {value: 250},
  palestine: {value: 300},
  education: {value: 350},  
  iftar: {value: 400},
  jumat: {value: 450},
  default: {value: 500},
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems } = location.state || { cartItems: [] };
  const [selectedBank, setSelectedBank] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    hideIdentity: false,
    phone: '',
    email: '',
    message: ''
  });

  const banks = [
    {
      id: 'bsi',
      name: 'Bank BSI',
      logo: '/images/bsi-logo.png'
    },
    // Add more banks if needed
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedBank) {
      alert('Silakan pilih metode pembayaran');
      return;
    }

    const totalAmount = cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);

    // Set the display name based on hideIdentity checkbox
    const customerName = formData.hideIdentity ? "Hamba Allah" : formData.fullName;
    const customerPhone = formData.phone;

    // Navigate to payment confirmation with data
    navigate('/konfirmasi-pembayaran', {
      state: {
        amount: totalAmount,
        bank: selectedBank,
        customerName: customerName,
        fullName: formData.fullName,
        hideIdentity: formData.hideIdentity,
        customerPhone: customerPhone,
        email: formData.email,
        message: formData.message,
        cartItems: cartItems
      }
    });
  };

  return (
    <div className="body">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-md">
        <h2 className="text-xl font-semibold mb-6 text-center">Pembayaran</h2>

        {/* List of Products */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Produk dalam Keranjang</h3>
          <ul className="space-y-4">
            {cartItems.map((item) => (
              <li key={item.id} className="bg-white border border-transparent hover:bg-green-50/50 p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="flex justify-left items-center">
                    <img
                      src={item.product.thumbnail || '/images/produk.jpg'}
                      alt={item.product.title}
                      className="w-16 h-16 object-cover mr-4"
                      onError={(e) => {
                        e.target.src = '/images/produk.jpg';
                      }}
                    />
                    <div className="justify-left">
                      <h3 className="text-lg font-semibold">{item.product.title}</h3>
                      <p className="text-gray-600">Jumlah Barang: {item.quantity}</p>
                      <p className="text-gray-600">Harga satuan: Rp. {item.product.price}</p>
                      <p className="text-gray-600">Total: Rp. {item.product.price * item.quantity}</p>
                    </div>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Total Price */}
        <h3 className="font-semibold">Total Biaya yang harus dibayar</h3>
        <div className="bg-white border border-transparent hover:bg-green-50/50 p-4 rounded-lg shadow-sm mb-6">
          <p className="text-lg font-semibold">Rp. {cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0)}</p>
        </div>

        {/* Payment Method */}
        <h3 className="font-semibold mb-3">Metode Bayar</h3>
        <div className="space-y-3 mb-6">
          {banks.map((bank) => (
            <label
              key={bank.id}
              className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                selectedBank === bank.id
                  ? 'bg-green-50 border border-green-500'
                  : 'bg-white border border-transparent hover:bg-green-50/50'
              }`}
            >
              <input
                type="radio"
                name="bank"
                value={bank.id}
                checked={selectedBank === bank.id}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="mr-3 accent-green-600"
              />
              <img src={bank.logo} alt={bank.name} className="h-6 mr-2" />
              <span>{bank.name}</span>
            </label>
          ))}
        </div>

        {/* Personal Data Form */}
        <h3 className="font-semibold mb-3">Data Anda</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              name="fullName"
              placeholder="Nama Lengkap Anda (wajib diisi)"
              className={`w-full p-3 rounded-lg border ${formData.hideIdentity ? 'bg-gray-100 border-gray-300' : 'border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500'} outline-none`}
              value={formData.fullName}
              onChange={handleInputChange}
              disabled={formData.hideIdentity}
              required
            />
          </div>

          <div>
            <input
              type="tel"
              name="phone"
              placeholder="No Whatsapp atau Handphone (wajib diisi)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email Anda (opsional)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <textarea
              name="message"
              placeholder="Catatan atau Pesanan khusus (opsional)"
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              rows="3"
              value={formData.message}
              onChange={handleInputChange}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Lanjutkan Pembayaran
          </button>
        </form>
      </div>
      <NavigationButton />
    </div>
  );
};

export default CheckoutPage;