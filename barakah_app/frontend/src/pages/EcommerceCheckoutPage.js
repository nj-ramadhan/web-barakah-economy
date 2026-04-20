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
  const [selectedBank, setSelectedBank] = useState('qris');
  const [profile, setProfile] = useState(null);
  
  // Checkout States
  const [courier, setCourier] = useState('');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(0);
  const [isFetchingShipping, setIsFetchingShipping] = useState(false);
  
  // Voucher States
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherStatus, setVoucherStatus] = useState(null);

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
      script.onload = () => {};
      document.body.appendChild(script);
      return () => { document.body.removeChild(script); };
    }
  }, []);

  useEffect(() => {
    const checkProfile = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) { navigate('/login'); return; }
        
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/me/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            const p = res.data;
            if (!p.address_city_id || !p.address) {
                alert('Tolong lengkapi alamat dan kota Anda terlebih dahulu untuk pengiriman barang (Sinergy).');
                navigate('/profile/edit?complete=address');
                return;
            }
            setProfile(p);
            setFormData(prev => ({ ...prev, fullName: p.name_full || user.username, phone: p.phone_number || '' }));
        } catch (error) {
            console.error(error);
        }
    };
    checkProfile();
  }, [navigate]);

  const banks = [
    { id: 'qris', name: 'QRIS BAE Community', logo: '/images/qris-bae2.png' }
  ];

  const checkOngkir = async (selectedCourier) => {
      setCourier(selectedCourier);
      if (!selectedCourier) {
          setShippingOptions([]);
          setSelectedShipping(0);
          return;
      }
      
      setIsFetchingShipping(true);
      try {
          // Determine origin based on first item seller
          const originCity = cartItems[0]?.product?.seller_city_id || '153';
          const destCity = profile.address_city_id;
          const totalWeight = cartItems.reduce((acc, item) => acc + ((item.product.weight || 1000) * item.quantity), 0);
          
          const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/shippings/costs/`, {
              origin: originCity,
              destination: destCity,
              weight: totalWeight,
              courier: selectedCourier
          });

          // Extract costs from RajaOngkir response array
          const costs = res.data?.rajaongkir?.results?.[0]?.costs || [];
          if(costs.length > 0) {
              setShippingOptions(costs);
              // Auto-select first option
              setSelectedShipping(costs[0].cost[0].value);
          } else {
              setShippingOptions([]);
              setSelectedShipping(0);
              alert('Layanan kurir tidak tersedia untuk rute Anda.');
          }
      } catch (e) {
          console.error(e);
          alert('Gagal mengecek ongkir.');
      } finally {
          setIsFetchingShipping(false);
      }
  };

  const handleApplyVoucher = async () => {
      if(!voucherCode) return;
      try {
          const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/products/vouchers/validate/`, { code: voucherCode });
          const nominal = parseFloat(res.data.nominal);
          setVoucherDiscount(nominal);
          setVoucherStatus('Voucher berhasil diaplikasikan (Diskon Rp ' + nominal + ')');
      } catch (err) {
          setVoucherDiscount(0);
          setVoucherStatus(err.response?.data?.error || 'Voucher tidak valid');
      }
  };

  const totalItemsPrice = cartItems.reduce((total, item) => {
      let base = item.product.price;
      if(item.variation?.additional_price) base += parseFloat(item.variation.additional_price);
      return total + (base * item.quantity);
  }, 0);
  
  const grandTotal = Math.max(0, totalItemsPrice + selectedShipping - voucherDiscount);

  const handlePayment = async (token) => {
    if (typeof window.snap !== 'undefined') {
      window.snap.pay(token, {
        onSuccess: async (result) => {
          try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/payments/update-payment-status/`,
              { transactionId: result.transaction_id, status: 'verified', amount: result.gross_amount, paymentMethod: result.payment_type },
              { headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() } }
            );
            await clearCart();
            navigate('/success', { state: { transactionId: result.transaction_id, amount: result.gross_amount, paymentMethod: result.payment_type } });
          } catch (e) { alert('Berhasil dibayar, hubungi support bila status gagal diperbarui.'); }
        },
        onPending: async (result) => { alert('Pembayaran tertunda.'); },
        onError: () => { alert('Pembayaran Gagal'); },
        onClose: () => { alert('Popup ditutup, tidak ada pembayaran'); }
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBank) { alert('pilih metode pembayaran'); return; }
    if (!courier || selectedShipping === 0) { alert('Pilih kurir dan ongkir terlebih dahulu'); return; }

    const paymentData = {
      amount: grandTotal,
      customerName: formData.fullName,
      customerPhone: formData.phone,
      cartItems: cartItems.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      shipping_cost: selectedShipping,
      courier_service: courier,
      voucher_discount: voucherDiscount
    };

    if (selectedBank === 'midtrans') {
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/payments/generate-order-midtrans-token/`, paymentData, {
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }
        });
        if (response.data.token) handlePayment(response.data.token);
      } catch (e) { alert('Terjadi kesalahan memproses Token Midtrans.'); }
    } else {
      navigate('/konfirmasi-pembayaran-belanja', {
        state: { 
            amount: grandTotal, 
            bank: selectedBank, 
            customerName: formData.fullName, 
            customerPhone: formData.phone, 
            email: formData.email, 
            message: formData.message, 
            cartItems: cartItems,
            shippingCost: selectedShipping,
            courier: courier,
            voucherCode: voucherCode,
            voucherDiscount: voucherDiscount
        }
      });
    }
  };

  const clearCart = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if(!user) return;
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/cart/clear/`, { headers: { Authorization: `Bearer ${user.access}` } });
    } catch (error) {}
  };

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl pb-24">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Checkout Sinergy</h2>

        {/* Alamat Penerima */}
        {profile && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2"><span className="material-icons text-emerald-600 text-[18px]">location_on</span> Alamat Pengiriman (Tujuan)</h2>
                    <button type="button" onClick={() => navigate('/profile/edit')} className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full">Ubah</button>
                </div>
                <div>
                    <p className="font-bold text-sm text-gray-800">{profile.name_full || formData.fullName}</p>
                    <p className="text-xs text-gray-500 mt-1">{profile.address}</p>
                    <p className="text-xs text-gray-500">{profile.address_city_name}, {profile.address_province}</p>
                </div>
            </div>
        )}

        {/* Daftar Barang */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 mb-6">
          <h3 className="text-sm font-bold mb-4 text-gray-800 border-b pb-2">Produk dalam Keranjang</h3>
          <ul className="space-y-4">
            {cartItems.map((item) => (
              <li key={item.id} className="flex items-start gap-4">
                <img src={item.product.thumbnail || '/images/produk.jpg'} alt={item.product.title} className="w-16 h-16 object-cover rounded-xl border border-gray-100" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{item.product.title}</h3>
                  {item.variation && <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit mt-1">{item.variation.name}</p>}
                  <p className="text-xs text-gray-500 mt-1">{formatIDR(item.product.price + (item.variation?.additional_price ? parseFloat(item.variation.additional_price) : 0))} x {item.quantity}</p>
                </div>
                <div className="font-bold text-sm text-emerald-700">
                    {formatIDR((item.product.price + (item.variation?.additional_price ? parseFloat(item.variation.additional_price) : 0)) * item.quantity)}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Pengiriman & Voucher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <label className="block text-xs font-bold text-orange-800 mb-2">Pilih Kurir (RajaOngkir)</label>
                <select value={courier} onChange={(e) => checkOngkir(e.target.value)} disabled={!profile} className="w-full text-sm bg-white border-none rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="">- Pilih Jasa Ekspedisi -</option>
                    <option value="jne">JNE</option>
                    <option value="pos">POS Indonesia</option>
                    <option value="tiki">TIKI</option>
                </select>
                {isFetchingShipping && <p className="text-xs text-orange-600 mt-2 animate-pulse">Menghitung Biaya...</p>}
                
                {shippingOptions.length > 0 && (
                    <div className="mt-3">
                        <label className="block text-xs font-bold text-orange-800 mb-2">Layanan yang Tersedia:</label>
                        <select value={selectedShipping} onChange={(e) => setSelectedShipping(parseFloat(e.target.value))} className="w-full text-sm bg-white border-none rounded-xl p-3 outline-none">
                            {shippingOptions.map((opt, i) => (
                                <option key={i} value={opt.cost[0].value}>{opt.service} - {opt.description} ({formatIDR(opt.cost[0].value)})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <label className="block text-xs font-bold text-blue-800 mb-2">Kode Voucher Toko</label>
                <div className="flex gap-2">
                    <input type="text" value={voucherCode} onChange={e => setVoucherCode(e.target.value)} placeholder="Mis: PROMO2025" className="flex-1 text-sm bg-white border-none rounded-xl p-3 outline-none uppercase" />
                    <button type="button" onClick={handleApplyVoucher} className="bg-blue-600 text-white font-bold text-xs px-4 rounded-xl hover:bg-blue-700">TERAPKAN</button>
                </div>
                {voucherStatus && <p className={`text-[10px] mt-2 font-bold ${voucherDiscount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{voucherStatus}</p>}
            </div>
        </div>

        {/* Ringkasan Belanja */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 mb-6 space-y-2">
            <div className="flex justify-between text-sm text-gray-600"><p>Subtotal Produk</p><p>{formatIDR(totalItemsPrice)}</p></div>
            <div className="flex justify-between text-sm text-gray-600"><p>Ongkos Kirim {courier && `(${courier.toUpperCase()})`}</p><p>+{formatIDR(selectedShipping)}</p></div>
            {voucherDiscount > 0 && <div className="flex justify-between text-sm text-emerald-600 font-bold"><p>Diskon Voucher</p><p>-{formatIDR(voucherDiscount)}</p></div>}
            <div className="pt-3 mt-3 border-t flex justify-between text-lg font-black text-gray-800">
                <p>TOTAL PEMBAYARAN</p>
                <p className="text-emerald-700">{formatIDR(grandTotal)}</p>
            </div>
        </div>

        {/* Metode Pembayaran */}
        <h3 className="font-bold text-gray-800 mb-3">Metode Bayar</h3>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 mb-6 space-y-3">
          {banks.map((bank) => (
            <label key={bank.id} className={`flex items-center p-4 rounded-xl cursor-pointer transition-all border-2 ${selectedBank === bank.id ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
              <input type="radio" name="bank" value={bank.id} checked={selectedBank === bank.id} onChange={(e) => setSelectedBank(e.target.value)} className="mr-3 accent-green-600" />
              <img src={bank.logo} alt={bank.name} className="h-6 mr-3 mix-blend-multiply" />
              <span className="font-semibold text-sm text-gray-700">{bank.name}</span>
            </label>
          ))}
        </div>

        {/* Form Pembeli & Tombol Checkout */}
        <h3 className="font-bold text-gray-800 mb-3">Konfirmasi Kontak</h3>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
          <input type="text" name="fullName" placeholder="Nama Lengkap (wajib)" className="w-full p-3 rounded-xl bg-gray-50 text-sm outline-none" value={formData.fullName} onChange={handleInputChange} required />
          <input type="tel" name="phone" placeholder="No Whatsapp (wajib)" className="w-full p-3 rounded-xl bg-gray-50 text-sm outline-none" value={formData.phone} onChange={handleInputChange} required />
          <input type="email" name="email" placeholder="Email Anda (opsional)" className="w-full p-3 rounded-xl bg-gray-50 text-sm outline-none" value={formData.email} onChange={handleInputChange} />
          <textarea name="message" placeholder="Catatan ke penjual (opsional)" className="w-full p-3 rounded-xl bg-gray-50 text-sm outline-none h-20" value={formData.message} onChange={handleInputChange} />
          
          <button type="submit" disabled={!selectedBank || selectedShipping === 0} className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-emerald-200 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            BAYAR {formatIDR(grandTotal)}
          </button>
        </form>
      </div>
      <NavigationButton />
    </div>
  );
};

export default EcommerceCheckoutPage;