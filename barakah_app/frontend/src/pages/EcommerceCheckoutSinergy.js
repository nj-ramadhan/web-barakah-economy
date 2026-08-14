import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import ShippingAddressSelector from '../components/common/ShippingAddressSelector';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '../utils/mediaUtils';

const EcommerceCheckoutSinergy = () => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addresses, setAddresses] = useState(null);
    const [checkoutConfigs, setCheckoutConfigs] = useState({});
    const [qrisData, setQrisData] = useState(null); // { payload: '', amount: 0 }
    const [showQrisModal, setShowQrisModal] = useState(false);
    const [courierOptions, setCourierOptions] = useState({}); // { sellerId: [ { service, cost, description, etd } ] }
    const [loadingCosts, setLoadingCosts] = useState({});
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [userWallet, setUserWallet] = useState({ balance: 0 });

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                navigate('/login');
                return;
            }
            try {
                // Fetch profile
                const profileRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/me/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                const p = profileRes.data;
                setAddresses(p || {});

                // Fetch User Wallet (Saldo BAE)
                try {
                    const walletRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/transactions/wallet/`, {
                        headers: { Authorization: `Bearer ${user.access}` }
                    });
                    setUserWallet(walletRes.data || { balance: 0 });
                } catch (e) {
                    console.error('Wallet fetch error:', e);
                }

                // Fetch Carts
                const cartRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/cart/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                
                const items = cartRes.data || [];
                setCartItems(items);
                
                const initialConfigs = {};
                items.forEach(item => {
                    const s_id = item.product?.seller_id || "0";
                    if (!initialConfigs[s_id]) {
                        initialConfigs[s_id] = { shipping_cost: 0, shipping_courier: '', shipping_service: '', voucher_code: '', voucher_nominal: 0, payment_method: 'manual', buyer_note: '' };
                    }
                });
                setCheckoutConfigs(initialConfigs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const handleConfigChange = (sellerId, field, value) => {
        setCheckoutConfigs(prev => ({
            ...prev,
            [sellerId]: {
                ...prev[sellerId],
                [field]: value
            }
        }));
    };

    const fetchShippingOptions = async (sellerId, courier) => {
        if (!courier) return;
        setLoadingCosts(prev => ({ ...prev, [sellerId]: true }));
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const itemsFromThisSeller = cartItems.filter(item => (item.product?.seller_id || "0") === sellerId);
            const firstItem = itemsFromThisSeller[0];
            
            // Logic: Use Seller's City ID from Serializer (which we fixed in backend to be 10-digit village ID)
            const origin_code = String(firstItem?.product?.seller_city_id || "3216061005"); 
            const destination_code = String(selectedAddress?.address_village_id || addresses?.address_village_id || "");
            
            // Validation for 10-digit codes required by API.co.id
            if (origin_code.length !== 10) {
                alert('Alamat Toko Penjual (Origin) tidak valid untuk kurir ini. Hubungi admin Barakah.');
                return;
            }

            if (destination_code.length !== 10) {
                alert(`Alamat Kelurahan pengiriman belum dipilih atau tidak valid (${destination_code.length} digit). Mohon pilih/lengkapi alamat pengiriman.`);
                return;
            }

            // Total weight of items for this seller
            const weight = itemsFromThisSeller
                .reduce((acc, item) => acc + (item.product.weight || 1000) * item.quantity, 0);

            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/shippings/costs/`, {
                origin: origin_code,
                destination: destination_code,
                weight: weight,
                courier: courier
            }, {
                headers: { Authorization: `Bearer ${user.access}` }
            });

            if (res.data && res.data.error) {
                alert(`Error Ongkir: ${res.data.error}`);
                return;
            }

            // API.co.id format (mapped by backend): [ { service, cost, etd, description } ]
            if (res.data && Array.isArray(res.data)) {
                setCourierOptions(prev => ({ ...prev, [sellerId]: res.data }));
            }

        } catch (err) {
            console.error("Shipping fetch error", err);
        } finally {
            setLoadingCosts(prev => ({ ...prev, [sellerId]: false }));
        }
    };


    const isProfileIncomplete = !addresses?.name_full || !addresses?.phone || !addresses?.address;

    const [submittingOrder, setSubmittingOrder] = useState(false);

    const handleProcessSplitCheckout = async () => {
        if (submittingOrder) return;
        if (isProfileIncomplete) {
            alert('Mohon lengkapi data profil (Nama Lengkap, No. HP/WA, dan Alamat) Anda terlebih dahulu sebelum membuat pesanan.');
            navigate('/profile/edit');
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        
        // Transform checkoutConfigs to list format expected by API
        const checkoutsList = Object.keys(checkoutConfigs).map(s_id => ({
            seller_id: s_id,
            ...checkoutConfigs[s_id]
        }));

        const selectedPaymentMethod = checkoutsList[0]?.payment_method || 'manual';

        try {
            setSubmittingOrder(true);
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
                checkouts: checkoutsList,
                payment_method: selectedPaymentMethod,
                shipping_address: selectedAddress?.alamat || '',
                shipping_village: selectedAddress?.kelurahan || '',
                shipping_district: selectedAddress?.kecamatan || '',
                shipping_city: selectedAddress?.kota || '',
                shipping_province: selectedAddress?.provinsi || '',
                shipping_postal_code: selectedAddress?.kode_pos || '',
                shipping_address_detail: selectedAddress?.detail_alamat || '',
                shipping_coordinates: selectedAddress?.titik_koordinat || '',
                recipient_name: selectedAddress?.nama_penerima || '',
                recipient_phone: selectedAddress?.phone || ''
            }, {
                headers: { Authorization: `Bearer ${user.access}` }
            });

            const orders = res.data;
            const firstOrder = Array.isArray(orders) ? orders[0] : orders;
            
            if (selectedPaymentMethod === 'cod') {
                alert('Pesanan COD berhasil dibuat!');
                navigate('/riwayat-belanja');
            } else if (selectedPaymentMethod === 'saldo_bae') {
                alert('Pembayaran berhasil! 100% Saldo BAE telah dipotong.');
                navigate('/riwayat-belanja');
            } else {
                // Non-COD (QRIS / Transfer Bank or Hybrid): Navigate to Halaman Pembayaran
                const totalAmount = Object.keys(sellerGroups).reduce((sum, s_id) => {
                    const group = sellerGroups[s_id];
                    const config = checkoutConfigs[s_id];
                    return sum + group.total_price + (config?.shipping_cost || 0) - (config?.voucher_nominal || 0);
                }, 0);

                const remainingToPay = selectedPaymentMethod === 'hybrid' 
                    ? Math.max(0, totalAmount - (Number(userWallet.balance) || 0))
                    : (firstOrder?.grand_total || firstOrder?.total_price || totalAmount);

                if (remainingToPay <= 0) {
                    alert('Pembayaran berhasil lunas!');
                    navigate('/riwayat-belanja');
                    return;
                }

                navigate('/konfirmasi-pembayaran-belanja', {
                    state: {
                        orderId: firstOrder?.id,
                        orderNumber: firstOrder?.order_number,
                        amount: remainingToPay,
                        bank: 'qris',
                        customerName: addresses.name_full,
                        customerPhone: addresses.phone,
                        cartItems: cartItems
                    }
                });
            }

        } catch (err) {
            console.error("Checkout Error Details:", err.response?.data || err.message);
            const errMsg = err.response?.data?.message || err.response?.data?.error || 'Gagal memproses Checkout. Silakan coba lagi.';
            alert(`Gagal Checkout: ${errMsg}`);
        } finally {
            setSubmittingOrder(false);
        }
    };


    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
    }

    const getItemPrice = (item) => {
        if (!item) return 0;
        const prodP = Number(item.product?.price) || 0;
        let varP = 0;
        if (item.variation) {
            if (item.variation.additional_price !== undefined && item.variation.additional_price !== null) {
                varP = Number(item.variation.additional_price) || 0;
            } else if (item.variation.price !== undefined && item.variation.price !== null) {
                varP = Number(item.variation.price) || 0;
            }
        }
        if (varP >= prodP && prodP > 0) return varP;
        return prodP + varP;
    };

    // Group items by seller for UI
    const sellerGroups = {};
    cartItems.forEach(item => {
        const s_id = item.product?.seller_id || "0";
        if (!sellerGroups[s_id]) sellerGroups[s_id] = { items: [], total_price: 0 };
        sellerGroups[s_id].items.push(item);
        
        const unitPrice = getItemPrice(item);
        sellerGroups[s_id].total_price += (unitPrice * item.quantity);
    });

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Checkout - Barakah Economy</title></Helmet>
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout Produk Fisik</h1>

                {/* Profile Completeness Warning Banner */}
                {isProfileIncomplete && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                                <span className="material-icons text-xl">warning</span>
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-amber-900">Data Pemesan Belum Lengkap!</h4>
                                <p className="text-xs text-amber-800 mt-0.5">
                                    Nama lengkap, No. HP/WA, atau Alamat pengiriman Anda belum diisi. Lengkapi profil Anda agar pesanan dapat diproses.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/profile/edit')}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shrink-0 transition shadow-sm"
                        >
                            Lengkapi Profil
                        </button>
                    </div>
                )}

                {/* Address Card & Selector */}
                {addresses && (
                    <ShippingAddressSelector 
                        profile={addresses} 
                        selectedAddress={selectedAddress} 
                        onAddressSelect={setSelectedAddress} 
                    />
                )}

                {/* Seller Groups Loop */}
                {Object.keys(sellerGroups).map(s_id => {
                    const group = sellerGroups[s_id];
                    const config = checkoutConfigs[s_id];
                    const grandTotal = group.total_price + (config?.shipping_cost || 0) - (config?.voucher_nominal || 0);

                    return (
                        <div key={s_id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
                            <h3 className="font-bold text-gray-800 text-sm mb-4 pb-2 border-b border-gray-100">Pesanan dari Seller/Toko #{s_id === "0" ? "Barakah" : s_id}</h3>
                            <div className="space-y-4 mb-4">
                                {group.items.map(item => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                            <img 
                                                src={getMediaUrl(item.product?.thumbnail || item.product?.thumbnail_url) || '/placeholder-image.jpg'} 
                                                alt={item.product?.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholder-image.jpg';
                                                }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-gray-800">{item.product.title}</h4>
                                            {item.variation && <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit mt-1">{item.variation.name}</p>}
                                            <p className="text-xs text-gray-500 mt-1">
                                                Rp {new Intl.NumberFormat('id-ID').format(getItemPrice(item))} x {item.quantity} = <span className="font-bold text-green-700">Rp {new Intl.NumberFormat('id-ID').format(getItemPrice(item) * item.quantity)}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Simplified Shipping Notice */}
                            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 mb-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                                    <span className="material-icons text-lg">local_shipping</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Pengiriman & Logistik</span>
                                    <p className="text-xs font-medium text-emerald-900">Bebas Ongkir / Ambil Sendiri (Kesepakatan dengan Penjual)</p>
                                </div>
                            </div>

                            {/* Voucher & Notes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <span className="material-icons text-sm text-emerald-600">confirmation_number</span>
                                        Voucher Toko
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Masukkan kode voucher (opsional)" 
                                        className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none uppercase" 
                                    />
                                </div>

                                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <span className="material-icons text-sm text-emerald-600">note_alt</span>
                                        Catatan untuk Penjual (Opsional)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Pesan khusus atau instruksi pengiriman..." 
                                        className="w-full text-xs bg-white border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={config?.buyer_note || ''}
                                        onChange={(e) => handleConfigChange(s_id, 'buyer_note', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Payment Method Interactive Cards Selection */}
                            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 mb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 mb-3 border-b border-gray-200/70">
                                    <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-icons text-base text-emerald-600">credit_card</span>
                                        Pilih Metode Pembayaran
                                    </label>
                                    <div className="flex items-center gap-1 text-xs">
                                        <span className="text-gray-500 font-medium">Saldo BAE Anda:</span>
                                        <span className="font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                                            Rp {new Intl.NumberFormat('id-ID').format(userWallet.balance || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* 1. QRIS / Transfer Bank */}
                                    <div 
                                        onClick={() => handleConfigChange(s_id, 'payment_method', 'manual')}
                                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 relative ${
                                            (config?.payment_method || 'manual') === 'manual'
                                                ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-emerald-300'
                                        }`}
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                            (config?.payment_method || 'manual') === 'manual' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            <span className="material-icons text-lg">qr_code_2</span>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-5">
                                            <p className="text-xs font-black text-gray-800 leading-tight">QRIS / Transfer Bank</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                                                Bayar lunas 100% via QRIS atau Transfer Bank manual.
                                            </p>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 absolute top-3.5 right-3.5 flex items-center justify-center ${
                                            (config?.payment_method || 'manual') === 'manual' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                                        }`}>
                                            {(config?.payment_method || 'manual') === 'manual' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                        </div>
                                    </div>

                                    {/* 2. Bayar di Tempat (COD) */}
                                    {(() => {
                                        const isCodAvailable = group.items.every(item => item.product?.is_cod_available);
                                        return (
                                            <div 
                                                onClick={() => {
                                                    if (isCodAvailable) {
                                                        handleConfigChange(s_id, 'payment_method', 'cod');
                                                    }
                                                }}
                                                className={`p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 relative ${
                                                    !isCodAvailable 
                                                        ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed'
                                                        : config?.payment_method === 'cod'
                                                            ? 'bg-emerald-50/80 border-emerald-500 shadow-sm cursor-pointer'
                                                            : 'bg-white border-gray-200 hover:border-emerald-300 cursor-pointer'
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                    config?.payment_method === 'cod' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    <span className="material-icons text-lg">local_shipping</span>
                                                </div>
                                                <div className="flex-1 min-w-0 pr-5">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-black text-gray-800 leading-tight">Bayar di Tempat (COD)</p>
                                                        {!isCodAvailable && (
                                                            <span className="text-[8px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.2 rounded">Non-COD</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                                                        {isCodAvailable 
                                                            ? 'Bayar tunai saat barang pesanan tiba di tujuan.'
                                                            : 'Produk tidak mendukung fitur pembayaran COD.'}
                                                    </p>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 absolute top-3.5 right-3.5 flex items-center justify-center ${
                                                    config?.payment_method === 'cod' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                                                }`}>
                                                    {config?.payment_method === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 3. 100% Saldo BAE */}
                                    {(() => {
                                        const isSaldoEnough = Number(userWallet.balance) >= grandTotal && grandTotal > 0;
                                        return (
                                            <div 
                                                onClick={() => {
                                                    if (isSaldoEnough) {
                                                        handleConfigChange(s_id, 'payment_method', 'saldo_bae');
                                                    }
                                                }}
                                                className={`p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 relative ${
                                                    !isSaldoEnough 
                                                        ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed'
                                                        : config?.payment_method === 'saldo_bae'
                                                            ? 'bg-emerald-50/80 border-emerald-500 shadow-sm cursor-pointer'
                                                            : 'bg-white border-gray-200 hover:border-emerald-300 cursor-pointer'
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                    config?.payment_method === 'saldo_bae' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    <span className="material-icons text-lg">account_balance_wallet</span>
                                                </div>
                                                <div className="flex-1 min-w-0 pr-5">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-black text-gray-800 leading-tight">100% Saldo BAE</p>
                                                        {isSaldoEnough && (
                                                            <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Cukup</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                                                        {isSaldoEnough
                                                            ? `Lunas instan dipotong Rp ${new Intl.NumberFormat('id-ID').format(grandTotal)} dari Saldo BAE.`
                                                            : `Saldo BAE (Rp ${new Intl.NumberFormat('id-ID').format(userWallet.balance || 0)}) kurang dari tagihan.`}
                                                    </p>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 absolute top-3.5 right-3.5 flex items-center justify-center ${
                                                    config?.payment_method === 'saldo_bae' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                                                }`}>
                                                    {config?.payment_method === 'saldo_bae' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* 4. Saldo BAE + QRIS (Hybrid) */}
                                    {(() => {
                                        const isHybridPossible = Number(userWallet.balance) > 0 && Number(userWallet.balance) < grandTotal;
                                        return (
                                            <div 
                                                onClick={() => {
                                                    if (isHybridPossible) {
                                                        handleConfigChange(s_id, 'payment_method', 'hybrid');
                                                    }
                                                }}
                                                className={`p-3.5 rounded-2xl border-2 transition-all flex items-start gap-3 relative ${
                                                    !isHybridPossible 
                                                        ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed'
                                                        : config?.payment_method === 'hybrid'
                                                            ? 'bg-emerald-50/80 border-emerald-500 shadow-sm cursor-pointer'
                                                            : 'bg-white border-gray-200 hover:border-emerald-300 cursor-pointer'
                                                }`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                    config?.payment_method === 'hybrid' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    <span className="material-icons text-lg">call_split</span>
                                                </div>
                                                <div className="flex-1 min-w-0 pr-5">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-black text-gray-800 leading-tight">Saldo BAE + QRIS</p>
                                                        {isHybridPossible && (
                                                            <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">Kombinasi</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                                                        {isHybridPossible
                                                            ? `Saldo BAE: Rp ${new Intl.NumberFormat('id-ID').format(userWallet.balance || 0)} + Sisa QRIS: Rp ${new Intl.NumberFormat('id-ID').format(Math.max(0, grandTotal - userWallet.balance))}.`
                                                            : Number(userWallet.balance) === 0
                                                                ? 'Saldo BAE Anda Rp 0 (tidak ada saldo untuk dipotong).'
                                                                : 'Saldo BAE Anda mencukupi 100%, gunakan opsi 100% Saldo BAE.'}
                                                    </p>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 absolute top-3.5 right-3.5 flex items-center justify-center ${
                                                    config?.payment_method === 'hybrid' ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                                                }`}>
                                                    {config?.payment_method === 'hybrid' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <p className="text-sm text-gray-500">Subtotal Pesanan ini:</p>
                                <p className="text-lg font-black text-emerald-700">Rp {grandTotal}</p>
                            </div>
                        </div>
                    );
                })}

                <div className="sticky bottom-20 sm:static mt-8 bg-white p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center rounded-t-3xl sm:rounded-2xl shadow-[0_-4px_10px_rgb(0,0,0,0.05)] sm:shadow-lg border sm:border-gray-100">
                    <div className="flex flex-col text-center sm:text-left mb-4 sm:mb-0 w-full sm:w-auto">
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Pembayaran Keseluruhan</span>
                        <span className="text-2xl font-black text-gray-800">Rp {Object.keys(sellerGroups).reduce((acc, sid) => acc + sellerGroups[sid].total_price + (checkoutConfigs[sid]?.shipping_cost || 0)  - (checkoutConfigs[sid]?.voucher_nominal || 0), 0)}</span>
                    </div>
                    <button 
                        onClick={handleProcessSplitCheckout} 
                        disabled={submittingOrder || isProfileIncomplete}
                        className={`w-full sm:w-auto px-8 py-4 font-bold rounded-2xl shadow-lg transition-all ${submittingOrder || isProfileIncomplete ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-emerald-200 hover:scale-[1.02]'}`}
                    >
                        {submittingOrder ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                <span>Memproses Pesanan...</span>
                            </span>
                        ) : (
                            <span>Buat Pesanan & Bayar</span>
                        )}
                    </button>
                </div>

                {/* QRIS Modal */}
                {showQrisModal && qrisData && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="bg-emerald-600 p-6 text-center text-white">
                                <h3 className="text-lg font-bold">QRIS Otomatis Dinamis</h3>
                                <p className="text-xs opacity-80 mt-1">Scan kode di bawah untuk membayar</p>
                            </div>
                            <div className="p-8 flex flex-col items-center">
                                <div className="bg-white p-4 border-2 border-gray-100 rounded-2xl mb-6 shadow-Inner">
                                    {/* Placeholder for Static QRIS Image */}
                                    <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-xl overflow-hidden">
                                        <img 
                                            src="/media/payment_methods/qris_static.png" 
                                            alt="QRIS Statis" 
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "https://via.placeholder.com/300?text=Scan+QRIS";
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="text-center mb-6">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Total Bayar</p>
                                    <p className="text-3xl font-black text-emerald-700">Rp {Number(qrisData.amount).toLocaleString('id-ID')}</p>
                                    <p className="text-xs text-gray-400 mt-2">No. Pesanan: {qrisData.orderNumber}</p>
                                </div>
                                <button 
                                    onClick={() => navigate('/riwayat-belanja')}
                                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-colors"
                                >
                                    Selesai, Cek Status Pesanan
                                </button>
                                <p className="text-[10px] text-gray-400 mt-4 text-center">Silakan scan kode QR di atas. Pastikan nominal transfer sesuai. <b>Simpan bukti transfer</b> untuk diunggah di halaman Riwayat Belanja.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <NavigationButton />
        </div>
    );
};


export default EcommerceCheckoutSinergy;
