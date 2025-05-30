// pages/EcommerceCheckoutPage.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import '../styles/Body.css';

const getCsrfToken = () => {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue;
};

const formatIDR = (amount) => {
  return 'Rp. ' + new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
  }).format(amount);
};

const EcommerceCheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems } = location.state || { cartItems: [] };
  const [selectedBank, setSelectedBank] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    message: ''
  });

  useEffect(() => {
    // Check if Snap.js is already loaded
    if (typeof window.snap === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
      script.dataset.clientKey = 'SB-Mid-client-wm4shJTARC2PTcY6';
      script.onload = () => {
        console.log('Snap.js loaded successfully.');
      };
      script.onerror = () => {
        console.error('Failed to load Snap.js.');
      };
      document.body.appendChild(script);

      // Cleanup on unmount
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const banks = [
    {
      id: 'bsi',
      name: 'Bank BSI',
      logo: '/images/bsi-logo.png'
    },
    {
      id: 'midtrans',
      name: 'Midtrans (Gopay, OVO, etc)',
      logo: '/images/gopay-logo.png',
    },
  ];

  const handlePayment = async (token) => {
    if (typeof window.snap !== 'undefined') {
      window.snap.pay(token, {
        onSuccess: async (result) => {
          console.log('Payment success:', result);
  
          // Notify the backend about the successful payment
          try {
            const response = await axios.post(
              `${process.env.REACT_APP_API_BASE_URL}/api/payments/update-payment-status/`,
              {
                transactionId: result.transaction_id, // Midtrans transaction ID
                // status: 'success', // Payment status
                status: 'verified', // Payment status
                amount: result.gross_amount, // Payment amount
                paymentMethod: result.payment_type, // Payment method (e.g., gopay, bank transfer)
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(), // Include CSRF token if needed
                },
              }
            );
  
            if (response.status === 200) {
              console.log('Payment status updated successfully.');
              await clearCart(); // Clear the cart after successful payment
              navigate('/success', {
                state: {
                  transactionId: result.transaction_id,
                  amount: result.gross_amount,
                  paymentMethod: result.payment_type,
                },
              });
            } else {
              console.error('Failed to update payment status:', response.data);
              alert('Payment successful, but failed to update status. Please contact support.');
            }
          } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Payment successful, but failed to update status. Please contact support.');
          }
        },
        onPending: async (result) => {
          console.log('Payment pending:', result);
  
          // Notify the backend about the pending payment
          try {
            const response = await axios.post(
              `${process.env.REACT_APP_API_BASE_URL}/api/payments/update-payment-status/`,
              {
                transactionId: result.transaction_id, // Midtrans transaction ID
                status: 'pending', // Payment status
                amount: result.gross_amount, // Payment amount
                paymentMethod: result.payment_type, // Payment method (e.g., gopay, bank transfer)
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(), // Include CSRF token if needed
                },
              }
            );
  
            if (response.status === 200) {
              console.log('Payment status updated successfully.');
              alert('Payment is pending. Please complete the payment.');
            } else {
              console.error('Failed to update payment status:', response.data);
              alert('Payment pending, but failed to update status. Please contact support.');
            }
          } catch (error) {
            console.error('Error updating payment status:', error);
            alert('Payment pending, but failed to update status. Please contact support.');
          }
        },
        onError: (error) => {
          console.error('Payment error:', error);
          alert('Payment failed. Please try again.');
        },
        onClose: () => {
          console.log('Payment popup closed');
          alert('Payment canceled. Please complete the payment to proceed.');
        },
      });
    } else {
      console.error('Snap.js is not loaded.');
      alert('Payment gateway is not available. Please try again later.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const csrfToken = getCsrfToken();
    // const authToken = localStorage.getItem('authToken');

    if (!selectedBank) {
      alert('Silakan pilih metode pembayaran');
      return;
    }

    const totalAmount = cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    const customerName = formData.fullName;    
    const customerPhone = formData.phone;

    const paymentData = {
      amount: totalAmount,
      customerName: customerName,
      customerPhone: customerPhone,
      cartItems: cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })), // Include cart items if required by the backend
    };
    
    // If Midtrans is selected, handle payment via Midtrans
    if (selectedBank === 'midtrans') {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/api/payments/generate-order-midtrans-token/`,
          paymentData,
          {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,
            },
          }
        );

        const { token } = response.data;

        if (token) {
          handlePayment(token); // Trigger the payment popup
        } else {
          throw new Error('Failed to retrieve payment token.');
        }
      } catch (error) {
        console.error('Error generating Midtrans token:', error);
        alert('Terjadi kesalahan saat memproses pembayaran.');
      }
    } else {
      // Navigate to payment confirmation with data
      navigate('/konfirmasi-pembayaran-belanja', {
        state: {
          amount: totalAmount,
          bank: selectedBank,
          customerName: customerName,
          customerPhone: customerPhone,
          email: formData.email,
          message: formData.message,
          cartItems: cartItems,
        }
      });
    }
  };

  const clearCart = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user')); // Retrieve the user object from localStorage
      if (!user || !user.access) {
        console.error('User is not logged in or access token is missing.');
        return;
      }
  
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/cart/clear/`, {
        headers: {
          Authorization: `Bearer ${user.access}`, // Use the access token from the user object
          'X-CSRFToken': getCsrfToken(), // Include CSRF token if needed
        },
      });
      console.log('Cart cleared successfully.');
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };
  
  return (
    <div className="body">
      <Header />

      <div className="container mx-auto px-4 py-6 max-w-md">
        <h2 className="text-lg font-semibold mb-6 text-center">Pembayaran</h2>

        {/* List of Products */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Produk dalam Keranjang</h3>
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
                      <h3 className="text-sm font-semibold">{item.product.title}</h3>
                      <p className="text-xs text-gray-600">Jumlah Barang: {item.quantity}</p>
                      <p className="text-xs text-gray-600">Harga satuan: {formatIDR(item.product.price)}</p>
                      <p className="text-xs text-gray-600">Total: {formatIDR(item.product.price * item.quantity)}</p>
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
          <p className="text-lg font-semibold">{formatIDR(cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0))}</p>
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
              className="w-full p-3 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              value={formData.fullName}
              onChange={handleInputChange}
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

export default EcommerceCheckoutPage;