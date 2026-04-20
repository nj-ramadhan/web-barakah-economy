import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { useNavigate } from 'react-router-dom';

const EcommerceCheckoutSinergy = () => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addresses, setAddresses] = useState(null);
    const [checkoutConfigs, setCheckoutConfigs] = useState({});
    const [qrisData, setQrisData] = useState(null); // { payload: '', amount: 0 }
    const [showQrisModal, setShowQrisModal] = useState(false);

    // Example checkoutConfigs state:
    // { "seller_id_1": { "shipping_cost": 15000, "shipping_courier": "jne", "shipping_service": "REG", "voucher_code": "X", "voucher_nominal": 5000, "payment_method": "qris" } }

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                navigate('/login');
                return;
            }
            try {
                // Fetch profile first to ensure address is complete
                const profileRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/profiles/me/`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                
                const p = profileRes.data;
                // Basic Validation for Shipping
                if (!p.address_city_id || !p.address) {
                    alert('Mohon lengkapi Alamat dan Kota di profil Anda untuk kalkulasi ongkos kirim Sinergy.');
                    navigate('/profile/edit?complete=address');
                    return;
                }
                setAddresses(p);

                // Fetch Carts
                const cartRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/carts/?selected=true`, {
                    headers: { Authorization: `Bearer ${user.access}` }
                });
                
                // Temporary dummy data if endpoint not fully ready
                const items = cartRes.data || [];
                setCartItems(items);

                // Initialize checkout configs based on sellers in cart
                const initialConfigs = {};
                items.forEach(item => {
                    const s_id = item.product?.seller_id || "0";
                    if (!initialConfigs[s_id]) {
                        initialConfigs[s_id] = { shipping_cost: 0, shipping_courier: '', shipping_service: '', voucher_code: '', voucher_nominal: 0, payment_method: 'manual' };
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

    const handleProcessSplitCheckout = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Transform checkoutConfigs to list format expected by API
        const checkoutsList = Object.keys(checkoutConfigs).map(s_id => ({
            seller_id: s_id,
            ...checkoutConfigs[s_id]
        }));

        try {
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/orders/`, {
                checkouts: checkoutsList,
                payment_method: checkoutsList[0]?.payment_method || 'manual' // Assuming single method for now
            }, {
                headers: { Authorization: `Bearer ${user.access}` }
            });

            const orders = res.data;
            const qrisOrder = orders.find(o => o.qris_payload);
            
            if (qrisOrder) {
                setQrisData({ payload: qrisOrder.qris_payload, amount: qrisOrder.grand_total, orderNumber: qrisOrder.order_number });
                setShowQrisModal(true);
            } else {
                navigate('/riwayat-belanja');
            }
        } catch (err) {
            alert('Gagal memproses Checkout. Silakan coba lagi.');
        }
    };


    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
    }

    // Group items by seller for UI
    const sellerGroups = {};
    cartItems.forEach(item => {
        const s_id = item.product?.seller_id || "0";
        if (!sellerGroups[s_id]) sellerGroups[s_id] = { items: [], total_price: 0 };
        sellerGroups[s_id].items.append(item);
        
        let p = item.product.price;
        if(item.variation && item.variation.additional_price) p += item.variation.additional_price;
        sellerGroups[s_id].total_price += (p * item.quantity);
    });

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Checkout Sinergy - Barakah Economy</title></Helmet>
            <Header />
            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout Produk Fisik</h1>

                {/* Address Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="font-bold text-sm text-gray-800 flex items-center gap-2"><span className="material-icons text-emerald-600 text-[18px]">location_on</span> Alamat Pengiriman</h2>
                        <button onClick={() => navigate('/profile/edit')} className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full">Ubah</button>
                    </div>
                    {addresses && (
                        <div>
                            <p className="font-bold text-sm text-gray-800">{addresses.name_full}</p>
                            <p className="text-xs text-gray-500 mt-1">{addresses.address}</p>
                            <p className="text-xs text-gray-500">{addresses.address_city_name}, {addresses.address_province}</p>
                        </div>
                    )}
                </div>

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
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl"></div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-gray-800">{item.product.title}</h4>
                                            {item.variation && <p className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit mt-1">{item.variation.name}</p>}
                                            <p className="text-xs text-gray-500 mt-1">Rp {item.product.price} x {item.quantity} = <span className="font-bold text-green-700">Rp {(item.product.price + (item.variation?.additional_price || 0)) * item.quantity}</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Couriers Selection */}
                            <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 mb-4">
                                <label className="block text-[11px] font-bold text-orange-800 mb-2 uppercase tracking-wider">Cek Ongkir RajaOngkir</label>
                                <div className="flex gap-2">
                                    <select 
                                        className="flex-1 text-sm bg-white border-none rounded-lg p-2 focus:ring-1 focus:ring-orange-500"
                                        onChange={(e) => handleConfigChange(s_id, 'shipping_courier', e.target.value)}
                                    >
                                        <option value="">Pilih Kurir</option>
                                        <option value="jne">JNE - Reguler (Rp 15.000)</option>
                                        <option value="sicepat">SiCepat - Halu (Rp 12.000)</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 italic">*Terkoneksi lansung dengan RajaOngkir API</p>
                            </div>

                            {/* Vouchers and Payments Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Voucher Toko</label>
                                    <input type="text" placeholder="BERKAH2025" className="w-full text-sm bg-gray-50 border-none rounded-lg p-2" />
                                </div>
                                <div className="border border-gray-100 rounded-xl p-3">
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Metode Pembayaran</label>
                                    <select 
                                        className="w-full text-sm bg-gray-50 border-none rounded-lg p-2"
                                        value={config?.payment_method || 'manual'}
                                        onChange={(e) => handleConfigChange(s_id, 'payment_method', e.target.value)}
                                    >
                                        <option value="manual">Transfer Bank Manual (OCR)</option>
                                        <option value="qris">QRIS Otomatis Dinamis</option>
                                    </select>
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
                    <button onClick={handleProcessSplitCheckout} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 focus:outline-none hover:scale-[1.02] transition-transform">
                        Buat Pesanan & Bayar
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
                                    <img 
                                        src={`https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(qrisData.payload)}&choe=UTF-8`} 
                                        alt="QRIS Code" 
                                        className="w-48 h-48"
                                    />
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
                                <p className="text-[10px] text-gray-400 mt-4 text-center">Silakan simpan/screenshot QR ini. Pesanan Anda akan diproses otomatis setelah pembayaran terverifikasi.</p>
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
