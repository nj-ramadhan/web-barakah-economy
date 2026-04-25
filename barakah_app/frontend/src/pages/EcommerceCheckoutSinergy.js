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
    const [courierOptions, setCourierOptions] = useState({}); // { sellerId: [ { service, cost, description, etd } ] }
    const [loadingCosts, setLoadingCosts] = useState({});
    // sellerConfigs is removed because we focus on product level




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
                if (!p.address_village_id || !p.address) {
                    alert('Mohon lengkapi Alamat, Kota, Kecamatan, dan Kelurahan di profil Anda untuk kalkulasi ongkos kirim Sinergy.');
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
            const destination_code = String(addresses.address_village_id || "");
            
            // Validation for 10-digit codes required by API.co.id
            if (origin_code.length !== 10) {
                alert('Alamat Toko Penjual (Origin) tidak valid untuk kurir ini. Hubungi admin Barakah.');
                return;
            }

            if (destination_code.length !== 10) {
                alert(`Alamat Kelurahan Anda (${destination_code.length} digit) tidak valid. Mohon lengkapi profil Anda dengan Kelurahan yang benar agar ongkir bisa dihitung.`);
                navigate('/profile/edit?complete=address');
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
            const qrisOrder = orders.find(o => o.payment_method === 'qris');
            
            if (qrisOrder) {
                setQrisData({ amount: qrisOrder.grand_total, orderNumber: qrisOrder.order_number });
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
        sellerGroups[s_id].items.push(item);
        
        let p = item.product.price;
        if(item.variation && item.variation.additional_price) p += item.variation.additional_price;
        sellerGroups[s_id].total_price += (p * item.quantity);
    });

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Checkout - Barakah Economy</title></Helmet>
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
                                <label className="block text-[11px] font-bold text-orange-800 mb-2 uppercase tracking-wider">Cek Ongkos Kirim Otomatis</label>

                                <div className="space-y-2">
                                    <select 
                                        className="w-full text-sm bg-white border border-orange-200 rounded-lg p-2 focus:ring-1 focus:ring-orange-500"
                                        value={config?.shipping_courier || ''}
                                        onChange={(e) => {
                                            handleConfigChange(s_id, 'shipping_courier', e.target.value);
                                            fetchShippingOptions(s_id, e.target.value);
                                        }}
                                    >
                                        <option value="">Pilih Kurir</option>
                                        {[
                                            { id: 'jne', name: 'JNE (Jalur Nugraha Ekakurir)' },
                                            { id: 'pos', name: 'POS Indonesia' },
                                            { id: 'tiki', name: 'TIKI (Titipan Kilat)' },
                                            { id: 'jnt', name: 'J&T Express' },
                                            { id: 'sicepat', name: 'SiCepat' },
                                            { id: 'anteraja', name: 'AnterAja' },
                                            { id: 'wahana', name: 'Wahana' },
                                            { id: 'ninja', name: 'Ninja' },
                                        ].filter(c => {
                                            // Intersection: courier must be supported by ALL products in this seller's group
                                            const itemsFromThisSeller = cartItems.filter(item => (item.product?.seller_id || "0") === s_id);
                                            if (itemsFromThisSeller.length === 0) return false;
                                            
                                            return itemsFromThisSeller.every(item => {
                                                const supportedStr = item.product?.supported_couriers;
                                                // If field is empty or missing, assume it supports all standard couriers
                                                if (!supportedStr) return true; 
                                                const supportedList = supportedStr.split(',').map(s => s.trim().toLowerCase());
                                                return supportedList.includes(c.id);
                                            });
                                        }).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>

                                    {/* Warning if no common courier found */}
                                    {(() => {
                                        const itemsFromThisSeller = cartItems.filter(item => (item.product?.seller_id || "0") === s_id);
                                        const availableCouriers = [
                                            { id: 'jne' }, { id: 'pos' }, { id: 'tiki' }, { id: 'jnt' }, 
                                            { id: 'sicepat' }, { id: 'anteraja' }, { id: 'wahana' }, { id: 'ninja' }
                                        ].filter(c => itemsFromThisSeller.every(item => {
                                            const supportedStr = item.product?.supported_couriers;
                                            if (!supportedStr) return true;
                                            return supportedStr.split(',').map(s => s.trim().toLowerCase()).includes(c.id);
                                        }));
                                        
                                        if (availableCouriers.length === 0 && itemsFromThisSeller.length > 0) {
                                            return (
                                                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-100 rounded-lg mt-2">
                                                    <span className="material-icons text-red-500 text-sm">warning</span>
                                                    <p className="text-[10px] text-red-600 font-semibold leading-tight">
                                                        Produk dalam pesanan ini memiliki pilihan kurir yang berbeda-beda. 
                                                        Mohon pisahkan pesanan agar bisa dikirim.
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}



                                    {config?.shipping_courier && (
                                        <select 
                                            className="w-full text-sm bg-white border border-orange-200 rounded-lg p-2 focus:ring-1 focus:ring-orange-500"
                                            value={config?.shipping_service || ''}
                                            onChange={(e) => {
                                                const opt = courierOptions[s_id]?.find(o => o.service === e.target.value);
                                                if (opt) {
                                                    handleConfigChange(s_id, 'shipping_service', opt.service);
                                                    handleConfigChange(s_id, 'shipping_cost', opt.cost);
                                                }
                                            }}
                                            disabled={loadingCosts[s_id]}
                                        >
                                            <option value="">{loadingCosts[s_id] ? 'Memuat Layanan...' : 'Pilih Layanan'}</option>
                                            {courierOptions[s_id]?.map(opt => (
                                                <option key={opt.service} value={opt.service}>
                                                    {opt.service} - Rp {opt.cost.toLocaleString('id-ID')} ({opt.etd})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 italic">*Terkoneksi langsung dengan API.co.id (Kelurahan Accurate)</p>
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
                                        className="w-full text-sm bg-gray-50 border-none rounded-lg p-2 font-bold"
                                        value={config?.payment_method || 'manual'}
                                        onChange={(e) => handleConfigChange(s_id, 'payment_method', e.target.value)}
                                    >
                                        <option value="manual">Transfer Bank Manual (OCR)</option>
                                        <option value="qris">QRIS Otomatis Dinamis</option>
                                        {group.items.every(item => item.product?.is_cod_available) && (
                                            <option value="cod">Bayar di Tempat (COD)</option>
                                        )}
                                    </select>
                                    {group.items.some(item => !item.product?.is_cod_available) && (
                                        <p className="text-[9px] text-gray-400 mt-1 italic leading-tight">Metode COD tidak tersedia karena salah satu produk tidak mendukung COD.</p>
                                    )}
                                </div>
                            </div>

                            {/* Buyer Note Input */}
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-gray-700 mb-2">Catatan untuk Penjual (Opsional)</label>
                                <textarea 
                                    placeholder="Tulis pesan atau instruksi khusus untuk penjual..." 
                                    className="w-full text-sm bg-gray-50 border border-gray-100 rounded-xl p-3 focus:ring-1 focus:ring-emerald-500 outline-none h-20"
                                    value={config?.buyer_note || ''}
                                    onChange={(e) => handleConfigChange(s_id, 'buyer_note', e.target.value)}
                                ></textarea>
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
