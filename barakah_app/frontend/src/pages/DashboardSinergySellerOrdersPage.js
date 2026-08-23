import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../utils/mediaUtils';

const DashboardSinergySellerOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [localShippingType, setLocalShippingType] = useState({});
    const [localResi, setLocalResi] = useState({});
    const [localDriverName, setLocalDriverName] = useState({});
    const [localDriverPhone, setLocalDriverPhone] = useState({});
    const [localEst, setLocalEst] = useState({});
    const [localDeliveryDate, setLocalDeliveryDate] = useState({});
    const [localDeliveryTimeSlot, setLocalDeliveryTimeSlot] = useState({});
    const [localScheduleType, setLocalScheduleType] = useState({});
    const [localCodAmount, setLocalCodAmount] = useState({});
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProof, setSelectedProof] = useState(null); // { url: string, orderNumber: string, amount: number, date: string }

    const TIME_SLOTS = [
        { label: '08:00 - 12:00 (Pagi)', value: '08:00 - 12:00' },
        { label: '12:00 - 15:00 (Siang)', value: '12:00 - 15:00' },
        { label: '15:00 - 18:00 (Sore)', value: '15:00 - 18:00' },
        { label: '18:00 - 21:00 (Malam)', value: '18:00 - 21:00' }
    ];

    const statusOptions = ['Pending', 'Proses', 'Dikirim', 'Komplain', 'Selesai', 'Batal'];

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.is_superuser || false;

    const fetchOrders = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/?mode=seller`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setOrders(res.data || []);
        } catch (error) {
            console.error("Failed fetching seller orders", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleExportCSV = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/export-csv/`, {
                headers: { Authorization: `Bearer ${user.access}` },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'rekap_pesanan_ecommerce.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Gagal mengekspor CSV');
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus pesanan ini?')) return;
        if (!user) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/`, {
                headers: { Authorization: `Bearer ${user.access}` }
            });
            setOrders(orders.filter(o => o.id !== orderId));
            alert('Pesanan berhasil dihapus');
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal menghapus pesanan');
        }
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        if (!user) return;
        
        const order = orders.find(o => o.id === orderId);
        const shippingTypeToSave = localShippingType[orderId] !== undefined ? localShippingType[orderId] : (order?.shipping_type || 'ekspedisi');
        const resiToSave = localResi[orderId] !== undefined ? localResi[orderId] : (order?.resi_number || '');
        const driverNameToSave = localDriverName[orderId] !== undefined ? localDriverName[orderId] : (order?.driver_name || '');
        const driverPhoneToSave = localDriverPhone[orderId] !== undefined ? localDriverPhone[orderId] : (order?.driver_phone || '');
        const estToSave = localEst[orderId] !== undefined ? localEst[orderId] : (order?.estimated_delivery_days !== undefined && order?.estimated_delivery_days !== null ? order.estimated_delivery_days : (shippingTypeToSave === 'kurir_toko' ? 0 : 3));
        const deliveryDateToSave = localDeliveryDate[orderId] !== undefined ? localDeliveryDate[orderId] : (order?.delivery_date || null);
        const deliveryTimeSlotToSave = localDeliveryTimeSlot[orderId] !== undefined ? localDeliveryTimeSlot[orderId] : (order?.delivery_time_slot || '');
        const scheduleTypeToSave = localScheduleType[orderId] !== undefined ? localScheduleType[orderId] : (order?.shipping_schedule_type || 'days');
        const isOrderCod = (order?.payment_method || '').toLowerCase() === 'cod';
        const codAmountToSave = localCodAmount[orderId] !== undefined ? localCodAmount[orderId] : (order?.cod_amount_to_pay !== undefined && order?.cod_amount_to_pay !== null ? order.cod_amount_to_pay : (isOrderCod ? order?.grand_total : null));
        
        setUpdatingId(orderId);
        try {
            await axios.patch(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/`, 
                { 
                    status: newStatus,
                    shipping_type: shippingTypeToSave,
                    resi_number: resiToSave,
                    driver_name: driverNameToSave,
                    driver_phone: driverPhoneToSave,
                    estimated_delivery_days: estToSave,
                    delivery_date: deliveryDateToSave || null,
                    delivery_time_slot: deliveryTimeSlotToSave || '',
                    shipping_schedule_type: scheduleTypeToSave,
                    cod_amount_to_pay: codAmountToSave || null
                },
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            setOrders(orders.map(o => o.id === orderId ? { 
                ...o, 
                status: newStatus, 
                shipping_type: shippingTypeToSave,
                resi_number: resiToSave, 
                driver_name: driverNameToSave,
                driver_phone: driverPhoneToSave,
                estimated_delivery_days: estToSave,
                delivery_date: deliveryDateToSave,
                delivery_time_slot: deliveryTimeSlotToSave,
                shipping_schedule_type: scheduleTypeToSave,
                cod_amount_to_pay: codAmountToSave
            } : o));
            alert('Status pesanan berhasil diperbarui!');
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal mengubah status pesanan');
        } finally {
            setUpdatingId(null);
        }
    };

    const renderShippingForm = (order) => {
        const activeType = localShippingType[order.id] !== undefined ? localShippingType[order.id] : (order.shipping_type || 'ekspedisi');
        const isKurirToko = activeType === 'kurir_toko';
        const isOrderCod = (order.payment_method || '').toLowerCase() === 'cod';
        const scheduleMode = localScheduleType[order.id] !== undefined ? localScheduleType[order.id] : (order.shipping_schedule_type || (order.delivery_date ? 'slot' : 'days'));

        return (
            <div className="space-y-2.5">
                {/* Toggle Pengiriman: Ekspedisi vs Kurir Toko */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100/90 rounded-xl border border-gray-200">
                    <button
                        type="button"
                        onClick={() => setLocalShippingType({ ...localShippingType, [order.id]: 'ekspedisi' })}
                        disabled={updatingId === order.id}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            !isKurirToko
                                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="material-icons text-sm">local_shipping</span>
                        Ekspedisi
                    </button>
                    <button
                        type="button"
                        onClick={() => setLocalShippingType({ ...localShippingType, [order.id]: 'kurir_toko' })}
                        disabled={updatingId === order.id}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isKurirToko 
                                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="material-icons text-sm">delivery_dining</span>
                        Kirim Sendiri
                    </button>
                </div>

                {/* Dynamic Form Content */}
                {!isKurirToko ? (
                    <div className="space-y-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                        <div className="flex items-center justify-between text-[10px]">
                            <label className="font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                                <span className="material-icons text-xs text-indigo-600">local_shipping</span>
                                No. Resi Kurir
                            </label>
                            <span className="text-gray-500 font-medium">Kurir: <strong className="text-gray-800">{order.shipping_courier || 'Ekspedisi'}</strong></span>
                        </div>
                        <input 
                            type="text"
                            placeholder="Masukkan No. Resi Kurir..."
                            value={localResi[order.id] !== undefined ? localResi[order.id] : (order.resi_number || '')}
                            onChange={(e) => setLocalResi({ ...localResi, [order.id]: e.target.value })}
                            disabled={updatingId === order.id}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                        <div className="flex items-center justify-between pt-0.5">
                            <span className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                                <span className="material-icons text-xs text-indigo-500">schedule</span>
                                Estimasi Tiba:
                            </span>
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 shrink-0 focus-within:ring-2 focus-within:ring-indigo-500">
                                <input 
                                    type="number"
                                    min="1"
                                    max="60"
                                    placeholder="3"
                                    title="Estimasi pengiriman (hari)"
                                    value={localEst[order.id] !== undefined ? localEst[order.id] : (order.estimated_delivery_days !== undefined && order.estimated_delivery_days !== null ? order.estimated_delivery_days : 3)}
                                    onChange={(e) => setLocalEst({ ...localEst, [order.id]: e.target.value })}
                                    disabled={updatingId === order.id}
                                    className="w-7 text-xs font-black text-gray-800 outline-none text-center bg-transparent p-0"
                                />
                                <span className="text-[10px] text-indigo-600 font-bold select-none whitespace-nowrap">Hari</span>
                            </div>
                        </div>

                        {/* Tagihan COD / Ongkir Bayar di Tempat (Ekspedisi) */}
                        <div className="pt-2 border-t border-indigo-100/90 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                                <label className="font-bold text-indigo-950 flex items-center gap-1">
                                    <span className="material-icons text-xs text-amber-600">payments</span>
                                    Tagihan Tunai COD Pelanggan:
                                </label>
                                <span className="text-[9px] text-indigo-700 font-semibold">
                                    {isOrderCod ? 'Barang COD' : 'Ongkir / Non-COD'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
                                <span className="text-[11px] text-gray-500 font-bold">Rp</span>
                                <input 
                                    type="number"
                                    placeholder={isOrderCod ? String(order.grand_total) : "0 (Kosongkan jika gratis/lunas)"}
                                    value={localCodAmount[order.id] !== undefined ? localCodAmount[order.id] : (order.cod_amount_to_pay !== undefined && order.cod_amount_to_pay !== null ? order.cod_amount_to_pay : (isOrderCod ? order.grand_total : ''))}
                                    onChange={(e) => setLocalCodAmount({ ...localCodAmount, [order.id]: e.target.value })}
                                    disabled={updatingId === order.id}
                                    className="w-full text-xs font-black text-gray-800 outline-none bg-transparent"
                                />
                            </div>
                            <p className="text-[9px] text-gray-500 leading-tight">
                                * Masukkan nominal uang tunai yang harus disiapkan pembeli saat paket ekspedisi diserahkan (COD Produk + Ongkir COD).
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2.5 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                        <div className="flex items-center justify-between text-[10px]">
                            <label className="font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                <span className="material-icons text-xs text-emerald-600">delivery_dining</span>
                                Data Driver / Kurir Toko
                            </label>
                            <span className="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">🛵 Kurir Pribadi</span>
                        </div>
                        <input 
                            type="text"
                            placeholder="Nama Pengirim / Driver (cth: Budi Toko)..."
                            value={localDriverName[order.id] !== undefined ? localDriverName[order.id] : (order.driver_name || '')}
                            onChange={(e) => setLocalDriverName({ ...localDriverName, [order.id]: e.target.value })}
                            disabled={updatingId === order.id}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                        <input 
                            type="text"
                            placeholder="No. Telp / WA Pengirim (cth: 08123456789)..."
                            value={localDriverPhone[order.id] !== undefined ? localDriverPhone[order.id] : (order.driver_phone || '')}
                            onChange={(e) => setLocalDriverPhone({ ...localDriverPhone, [order.id]: e.target.value })}
                            disabled={updatingId === order.id}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />

                        {/* Mode Jadwal Pengantaran: Slot Jam vs Estimasi Hari */}
                        <div className="pt-2 border-t border-emerald-100 space-y-2">
                            <div className="flex items-center justify-between text-[10px]">
                                <label className="font-bold text-emerald-950 flex items-center gap-1">
                                    <span className="material-icons text-xs text-emerald-600">event_available</span>
                                    Waktu Pengantaran:
                                </label>
                                <div className="flex items-center gap-1 bg-emerald-100/80 p-0.5 rounded-lg text-[9px] font-bold text-emerald-900">
                                    <button
                                        type="button"
                                        onClick={() => setLocalScheduleType({ ...localScheduleType, [order.id]: 'slot' })}
                                        className={`px-1.5 py-0.5 rounded ${scheduleMode === 'slot' ? 'bg-white text-emerald-800 shadow-xs' : 'text-emerald-700'}`}
                                    >
                                        📅 Jadwal Jam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLocalScheduleType({ ...localScheduleType, [order.id]: 'days' })}
                                        className={`px-1.5 py-0.5 rounded ${scheduleMode === 'days' ? 'bg-white text-emerald-800 shadow-xs' : 'text-emerald-700'}`}
                                    >
                                        ⏱️ Estimasi Hari
                                    </button>
                                </div>
                            </div>

                            {scheduleMode === 'slot' ? (
                                <div className="space-y-2 bg-white/90 p-2.5 rounded-xl border border-emerald-200/70">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Tanggal Pengantaran:</label>
                                        <input 
                                            type="date"
                                            value={localDeliveryDate[order.id] !== undefined ? localDeliveryDate[order.id] : (order.delivery_date || '')}
                                            onChange={(e) => setLocalDeliveryDate({ ...localDeliveryDate, [order.id]: e.target.value })}
                                            disabled={updatingId === order.id}
                                            className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-700 block mb-1">Kisaran Jam (Pilih Slot):</label>
                                        <div className="grid grid-cols-2 gap-1">
                                            {TIME_SLOTS.map((slot) => {
                                                const currentSlot = localDeliveryTimeSlot[order.id] !== undefined ? localDeliveryTimeSlot[order.id] : (order.delivery_time_slot || '');
                                                const isSelected = currentSlot === slot.value;
                                                return (
                                                    <button
                                                        key={slot.value}
                                                        type="button"
                                                        onClick={() => setLocalDeliveryTimeSlot({ ...localDeliveryTimeSlot, [order.id]: isSelected ? '' : slot.value })}
                                                        disabled={updatingId === order.id}
                                                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition border text-left flex items-center justify-between ${
                                                            isSelected 
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50'
                                                        }`}
                                                    >
                                                        <span>{slot.label}</span>
                                                        {isSelected && <span className="material-icons text-xs">check</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between pt-0.5">
                                    <span className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                                        <span className="material-icons text-xs text-emerald-500">schedule</span>
                                        Estimasi Tiba <span className="text-gray-400 text-[10px]">(Opsional):</span>
                                    </span>
                                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 shrink-0 focus-within:ring-2 focus-within:ring-emerald-500" title="Kosongkan jika pengantaran langsung hari ini">
                                        <input 
                                            type="number"
                                            min="1"
                                            max="60"
                                            placeholder="—"
                                            title="Opsional: Estimasi hari (kosongkan jika sampai hari ini)"
                                            value={localEst[order.id] !== undefined ? localEst[order.id] : (order.estimated_delivery_days || '')}
                                            onChange={(e) => setLocalEst({ ...localEst, [order.id]: e.target.value })}
                                            disabled={updatingId === order.id}
                                            className="w-7 text-xs font-black text-gray-800 outline-none text-center bg-transparent p-0"
                                        />
                                        <span className="text-[10px] text-emerald-600 font-bold select-none whitespace-nowrap">Hari</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tagihan COD Kurir Toko */}
                        <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                                <label className="font-bold text-emerald-950 flex items-center gap-1">
                                    <span className="material-icons text-xs text-amber-600">payments</span>
                                    Tagihan Tunai COD Pelanggan:
                                </label>
                                <span className="text-[9px] text-emerald-800 font-bold">
                                    {isOrderCod ? 'Wajib COD' : 'Opsional'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
                                <span className="text-[11px] text-gray-500 font-bold">Rp</span>
                                <input 
                                    type="number"
                                    placeholder={String(order.grand_total)}
                                    value={localCodAmount[order.id] !== undefined ? localCodAmount[order.id] : (order.cod_amount_to_pay !== undefined && order.cod_amount_to_pay !== null ? order.cod_amount_to_pay : (isOrderCod ? order.grand_total : ''))}
                                    onChange={(e) => setLocalCodAmount({ ...localCodAmount, [order.id]: e.target.value })}
                                    disabled={updatingId === order.id}
                                    className="w-full text-xs font-black text-gray-800 outline-none bg-transparent"
                                />
                            </div>
                            <p className="text-[9px] text-gray-500 leading-tight">
                                * Uang tunai yang akan diterima driver saat barang diantar ke alamat pembeli.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const [sendingWaId, setSendingWaId] = useState(null);

    const handleSendWa = async (orderId) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        setSendingWaId(orderId);
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/orders/seller-orders/${orderId}/send-wa-update/`, 
                {},
                { headers: { Authorization: `Bearer ${user.access}` } }
            );
            alert(res.data.message || 'Pemberitahuan WA berhasil dikirim!');
        } catch (error) {
            alert(error.response?.data?.error || 'Gagal mengirim WA. Pastikan nomor HP pembeli valid.');
        } finally {
            setSendingWaId(null);
        }
    };

    const formatIDR = (amount) => {
        return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount || 0);
    };

    const getStatusColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'paid': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'proses': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'dikirim': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'komplain': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'selesai': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'batal': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const filterTabs = [
        { id: 'ALL', label: 'Semua Pesanan' },
        { id: 'PENDING', label: 'Menunggu Bayar' },
        { id: 'PAID', label: 'Perlu Diproses' },
        { id: 'PROSES', label: 'Sedang Diproses' },
        { id: 'DIKIRIM', label: 'Dikirim' },
        { id: 'SELESAI', label: 'Selesai' },
        { id: 'BATAL_KOMPLAIN', label: 'Batal / Komplain' },
    ];

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const status = (order.status || '').toUpperCase();
            
            let matchesStatus = true;
            if (activeFilter === 'PENDING') {
                matchesStatus = ['PENDING', 'WAITING_PAYMENT', 'UNPAID'].includes(status);
            } else if (activeFilter === 'PAID') {
                matchesStatus = ['PAID', 'LUNAS', 'VERIFIED'].includes(status);
            } else if (activeFilter === 'PROSES') {
                matchesStatus = ['PROSES', 'PROCESSING'].includes(status);
            } else if (activeFilter === 'DIKIRIM') {
                matchesStatus = ['DIKIRIM', 'SHIPPED'].includes(status);
            } else if (activeFilter === 'SELESAI') {
                matchesStatus = ['SELESAI', 'COMPLETED'].includes(status);
            } else if (activeFilter === 'BATAL_KOMPLAIN') {
                matchesStatus = ['BATAL', 'CANCELLED', 'KOMPLAIN', 'DISPUTE'].includes(status);
            }

            if (!matchesStatus) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const orderNum = (order.order_number || '').toLowerCase();
            const buyerName = (order.buyer_details?.name_full || order.buyer_details?.username || order.recipient_name || '').toLowerCase();
            const itemMatch = (order.items || []).some(it => (it.product_name || '').toLowerCase().includes(q));

            return orderNum.includes(q) || buyerName.includes(q) || itemMatch;
        });
    }, [orders, activeFilter, searchQuery]);

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet><title>Kelola Pesanan Toko - Barakah Economy</title></Helmet>
            <Header />
            
            <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
                {/* Header Title */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard/sinergy/seller" className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-500 hover:text-emerald-600 transition">
                            <span className="material-icons">arrow_back</span>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Manajemen Pesanan Toko Anda</h1>
                            <p className="text-xs text-gray-500 mt-0.5">Khusus pesanan produk fisik yang terdaftar pada toko Anda</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchOrders}
                            className="flex items-center gap-1.5 bg-white border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                        >
                            <span className="material-icons text-sm">refresh</span>
                            Segarkan
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
                        >
                            <span className="material-icons text-sm">file_download</span>
                            Ekspor CSV
                        </button>
                    </div>
                </div>

                {/* Filter Tabs & Search */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 space-y-3">
                    <div className="flex flex-wrap gap-2 pb-1 overflow-x-auto">
                        {filterTabs.map(tab => {
                            const count = orders.filter(o => {
                                const st = (o.status || '').toUpperCase();
                                if (tab.id === 'ALL') return true;
                                if (tab.id === 'PENDING') return ['PENDING', 'WAITING_PAYMENT', 'UNPAID'].includes(st);
                                if (tab.id === 'PAID') return ['PAID', 'LUNAS', 'VERIFIED'].includes(st);
                                if (tab.id === 'PROSES') return ['PROSES', 'PROCESSING'].includes(st);
                                if (tab.id === 'DIKIRIM') return ['DIKIRIM', 'SHIPPED'].includes(st);
                                if (tab.id === 'SELESAI') return ['SELESAI', 'COMPLETED'].includes(st);
                                if (tab.id === 'BATAL_KOMPLAIN') return ['BATAL', 'CANCELLED', 'KOMPLAIN', 'DISPUTE'].includes(st);
                                return false;
                            }).length;

                            const isActive = activeFilter === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveFilter(tab.id)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                                        isActive 
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-emerald-800 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative">
                        <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input 
                            type="text"
                            placeholder="Cari berdasarkan No. Pesanan, Nama Pembeli, atau Nama Produk..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Memuat data pesanan toko...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-4xl text-gray-300">shopping_basket</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-700">Tidak Ada Pesanan Ditemukan</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                            {searchQuery ? 'Tidak ada pesanan yang sesuai dengan kata kunci pencarian.' : 'Belum ada pesanan pada kategori filter ini.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {filteredOrders.map(order => {
                            const statusUpper = (order.status || '').toUpperCase();
                            const isPending = ['PENDING', 'WAITING_PAYMENT', 'UNPAID'].includes(statusUpper);
                            const isPaid = ['PAID', 'LUNAS', 'VERIFIED'].includes(statusUpper);
                            const isProses = ['PROSES', 'PROCESSING'].includes(statusUpper);
                            const isDikirim = ['DIKIRIM', 'SHIPPED'].includes(statusUpper);
                            const isSelesai = ['SELESAI', 'COMPLETED'].includes(statusUpper);
                            const isBatal = ['BATAL', 'CANCELLED'].includes(statusUpper);
                            const isKomplain = ['KOMPLAIN', 'DISPUTE'].includes(statusUpper);

                            const isDynaQris = order.payment_method === 'dynaqris';
                            const isManualTf = ['manual', 'qris', 'bank', 'transfer'].includes((order.payment_method || '').toLowerCase());
                            const hasProof = Boolean(order.payment_proof);
                            const isCod = (order.payment_method || '').toUpperCase() === 'COD';
                            const isSaldoBae = (order.payment_method || '').toLowerCase() === 'saldo_bae';

                            return (
                                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                                    {/* Order Header */}
                                    <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4 bg-gray-50/40">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-600 text-white p-2 rounded-lg">
                                                <span className="material-icons text-sm">receipt</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Nomor Pesanan</p>
                                                <p className="text-sm font-bold text-gray-800">#{order.order_number}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                            <p className="text-[11px] text-gray-400 font-medium">
                                                {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition shadow-sm border border-red-100"
                                                    title="Hapus Pesanan (Admin Only)"
                                                >
                                                    <span className="material-icons text-sm">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Method Banner / Status */}
                                    <div className="px-6 py-2.5 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-500">Metode Bayar:</span>
                                            {isDynaQris ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-[11px]">
                                                    <span className="material-icons text-sm">verified</span>
                                                    DynaQRIS (Verifikasi Otomatis)
                                                </span>
                                            ) : isCod ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">
                                                    <span className="material-icons text-sm">local_shipping</span>
                                                    COD (Bayar di Tempat)
                                                </span>
                                            ) : isSaldoBae ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full text-[11px]">
                                                    <span className="material-icons text-sm">account_balance_wallet</span>
                                                    100% Saldo BAE (Lunas Instan)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 font-bold text-gray-700 bg-gray-200 px-2.5 py-0.5 rounded-full text-[11px]">
                                                    <span className="material-icons text-sm">account_balance</span>
                                                    Transfer Bank / QRIS Manual
                                                </span>
                                            )}
                                        </div>

                                        {/* Proof Button or Auto indicator */}
                                        <div>
                                            {hasProof ? (
                                                <button
                                                    onClick={() => setSelectedProof({
                                                        url: getMediaUrl(order.payment_proof),
                                                        orderNumber: order.order_number,
                                                        amount: order.grand_total,
                                                        date: order.created_at
                                                    })}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                                                >
                                                    <span className="material-icons text-sm">image</span>
                                                    Lihat Bukti Transfer
                                                </button>
                                            ) : isDynaQris ? (
                                                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                                    <span className="material-icons text-sm">check_circle</span>
                                                    Lunas Otomatis (Tanpa Upload Struk)
                                                </span>
                                            ) : isCod ? (
                                                <span className="text-[11px] text-amber-700 font-semibold">
                                                    Tagih Tunai Saat Pengantaran
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-gray-400 font-medium italic">
                                                    Belum mengunggah bukti transfer
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {/* Buyer Info */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                                <span className="material-icons text-sm">person</span> Informasi Pembeli
                                            </h4>
                                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <p className="text-sm font-bold text-gray-800">{order.recipient_name || order.buyer_details?.name_full || order.buyer_details?.username}</p>
                                                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                    <span className="material-icons text-[14px]">phone</span> {order.recipient_phone || order.buyer_details?.phone || '-'}
                                                </p>
                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Alamat Pengiriman</p>
                                                    <p className="text-xs text-gray-600 leading-relaxed">
                                                        {order.shipping_address || order.buyer_details?.address}<br />
                                                        {order.shipping_village ? `Kel. ${order.shipping_village}, ` : ''}{order.shipping_district ? `Kec. ${order.shipping_district}` : ''}<br />
                                                        {order.shipping_city || order.buyer_details?.address_city_name}, {order.shipping_province || order.buyer_details?.address_province}<br />
                                                        {order.shipping_postal_code || order.buyer_details?.address_postal_code}
                                                    </p>
                                                </div>
                                                {order.buyer_note && (
                                                    <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                                        <p className="text-[10px] font-bold text-orange-800 uppercase mb-1">Catatan Pembeli</p>
                                                        <p className="text-xs text-orange-900 italic">"{order.buyer_note}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="md:col-span-1 space-y-4">
                                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                                <span className="material-icons text-sm">inventory_2</span> Produk Toko Anda
                                            </h4>
                                            <div className="space-y-3">
                                                {order.items?.map(item => (
                                                    <div key={item.id} className="flex gap-3">
                                                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                                                            {item.product_image || item.product_thumbnail || item.thumbnail ? (
                                                                <img 
                                                                    src={getMediaUrl(item.product_image || item.product_thumbnail || item.thumbnail)} 
                                                                    alt={item.product_name} 
                                                                    className="w-full h-full object-cover" 
                                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder-image.jpg'; }}
                                                                />
                                                            ) : (
                                                                <span className="material-icons text-gray-400">image</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.product_name}</p>
                                                            {item.variation_name && <p className="text-[10px] text-emerald-600 font-medium">Varian: {item.variation_name}</p>}
                                                            <p className="text-[10px] text-gray-500">{item.quantity} x {formatIDR(item.price)}</p>
                                                            {item.purchase_instructions && (
                                                                <p className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 border border-blue-100">
                                                                    <span className="font-bold">Info:</span> {item.purchase_instructions}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="pt-3 border-t border-gray-100 space-y-1">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500">Subtotal Produk</span>
                                                        <span className="font-bold text-gray-800">{formatIDR(order.total_price)}</span>
                                                    </div>
                                                    {Number(order.shipping_cost) > 0 && (
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500">Ongkir ({order.shipping_courier || 'Kurir'})</span>
                                                            <span className="font-bold text-gray-800">+{formatIDR(order.shipping_cost)}</span>
                                                        </div>
                                                    )}
                                                    {Number(order.voucher_nominal) > 0 && (
                                                        <div className="flex justify-between items-center text-xs text-amber-700 font-bold">
                                                            <span>Voucher {order.voucher_code ? `(${order.voucher_code})` : ''}</span>
                                                            <span>-{formatIDR(order.voucher_nominal)}</span>
                                                        </div>
                                                    )}
                                                    {Number(order.admin_fee) > 0 && (
                                                        <div className="flex justify-between items-center text-xs text-blue-700 font-bold">
                                                            <span>Biaya Layanan &amp; Admin</span>
                                                            <span>+{formatIDR(order.admin_fee)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center text-sm font-black text-emerald-700 mt-2 p-2 bg-emerald-50 rounded-lg">
                                                        <span>Total Tagihan</span>
                                                        <span>{formatIDR(order.grand_total)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Step-by-Step Action Controls */}
                                        <div className="space-y-4">
                                            {/* Stepper Progress Visualizer */}
                                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Tahapan Pesanan</p>
                                                <div className="flex items-center justify-between text-[10px] font-bold">
                                                    <div className={`flex flex-col items-center gap-1 ${isPending || isPaid || isProses || isDikirim || isSelesai ? 'text-emerald-700' : 'text-gray-400'}`}>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isPending ? 'bg-amber-500 text-white font-black animate-pulse' : (isPaid || isProses || isDikirim || isSelesai ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500')}`}>1</div>
                                                        <span className="text-[9px]">Bayar</span>
                                                    </div>
                                                    <div className={`h-0.5 flex-1 mx-1 ${isPaid || isProses || isDikirim || isSelesai ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                                                    <div className={`flex flex-col items-center gap-1 ${isPaid || isProses || isDikirim || isSelesai ? 'text-emerald-700' : 'text-gray-400'}`}>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isPaid ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-300 animate-pulse' : (isProses || isDikirim || isSelesai ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500')}`}>2</div>
                                                        <span className="text-[9px]">Perlu Diproses</span>
                                                    </div>
                                                    <div className={`h-0.5 flex-1 mx-1 ${isProses || isDikirim || isSelesai ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                                                    <div className={`flex flex-col items-center gap-1 ${isProses || isDikirim || isSelesai ? 'text-blue-700' : 'text-gray-400'}`}>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isProses ? 'bg-blue-600 text-white font-black ring-2 ring-blue-300 animate-pulse' : (isDikirim || isSelesai ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500')}`}>3</div>
                                                        <span className="text-[9px]">Diproses</span>
                                                    </div>
                                                    <div className={`h-0.5 flex-1 mx-1 ${isDikirim || isSelesai ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                                                    <div className={`flex flex-col items-center gap-1 ${isDikirim || isSelesai ? 'text-indigo-700' : 'text-gray-400'}`}>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isDikirim ? 'bg-indigo-600 text-white font-black ring-2 ring-indigo-300 animate-pulse' : (isSelesai ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500')}`}>4</div>
                                                        <span className="text-[9px]">Dikirim</span>
                                                    </div>
                                                    <div className={`h-0.5 flex-1 mx-1 ${isSelesai ? 'bg-emerald-500' : 'bg-gray-200'}`}></div>
                                                    <div className={`flex flex-col items-center gap-1 ${isSelesai ? 'text-emerald-700' : 'text-gray-400'}`}>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isSelesai ? 'bg-emerald-600 text-white font-black' : 'bg-gray-200 text-gray-500'}`}>5</div>
                                                        <span className="text-[9px]">Selesai</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Specific Actions */}
                                            {isSelesai ? (
                                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
                                                    <div className="flex items-center justify-center gap-1 text-emerald-800 font-black text-xs uppercase tracking-wider">
                                                        <span className="material-icons text-sm text-emerald-600">check_circle</span>
                                                        Pesanan Selesai
                                                    </div>
                                                    <p className="text-[10px] text-emerald-700">Pesanan telah dikonfirmasi diterima oleh pembeli / otomatis selesai.</p>
                                                </div>
                                            ) : isBatal ? (
                                                <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-center space-y-1">
                                                    <div className="flex items-center justify-center gap-1 text-red-800 font-black text-xs uppercase tracking-wider">
                                                        <span className="material-icons text-sm text-red-600">cancel</span>
                                                        Pesanan Dibatalkan
                                                    </div>
                                                    <p className="text-[10px] text-red-600">Pesanan ini telah dibatalkan dan stok produk telah dikembalikan.</p>
                                                </div>
                                            ) : isKomplain ? (
                                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-1">
                                                    <div className="flex items-center justify-center gap-1 text-amber-800 font-black text-xs uppercase tracking-wider">
                                                        <span className="material-icons text-sm text-amber-600">report_problem</span>
                                                        Pesanan Dikomplain / Diskusi
                                                    </div>
                                                    <p className="text-[10px] text-amber-700">Pembeli mengajukan komplain atau pembatalan pesanan.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {/* Step 1: Pending Payment */}
                                                    {isPending && (
                                                        <div className="space-y-2">
                                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                                                                ⏳ Menunggu pembeli menyelesaikan pembayaran.
                                                            </div>
                                                            {hasProof && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm('Verifikasi bukti transfer dan tandai pesanan ini sebagai Lunas (Paid)?')) {
                                                                            handleUpdateStatus(order.id, 'Paid');
                                                                        }
                                                                    }}
                                                                    disabled={updatingId === order.id}
                                                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    <span className="material-icons text-sm">verified</span>
                                                                    Verifikasi Lunas (Paid)
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('Batalkan pesanan yang belum dibayar ini?')) {
                                                                        handleUpdateStatus(order.id, 'Batal');
                                                                    }
                                                                }}
                                                                disabled={updatingId === order.id}
                                                                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
                                                            >
                                                                <span className="material-icons text-sm">cancel</span>
                                                                Batalkan Pesanan
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Step 2: Paid (Perlu Diproses) */}
                                                    {isPaid && (
                                                        <div className="space-y-3">
                                                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium">
                                                                ✅ Pembayaran telah terverifikasi/lunas. Tentukan pengiriman di bawah untuk langsung kirim atau klik <span className="font-bold">Mulai Kemas</span>.
                                                            </div>

                                                            {/* Dynamic Shipping Form */}
                                                            {renderShippingForm(order)}

                                                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                                                <button
                                                                    onClick={() => {
                                                                        const currentType = (localShippingType[order.id] || order.shipping_type || 'ekspedisi');
                                                                        if (currentType === 'kurir_toko') {
                                                                            const dName = localDriverName[order.id] !== undefined ? localDriverName[order.id] : order.driver_name;
                                                                            const dPhone = localDriverPhone[order.id] !== undefined ? localDriverPhone[order.id] : order.driver_phone;
                                                                            if (!dName || !dPhone) {
                                                                                if (!window.confirm('Nama atau No. Telp pengirim belum diisi lengkap. Tetap lanjutkan kirim pesanan?')) return;
                                                                            }
                                                                        }
                                                                        if (window.confirm('Kirim pesanan ini ke pembeli sekarang? Status akan langsung menjadi "Dikirim".')) {
                                                                            handleUpdateStatus(order.id, 'Dikirim');
                                                                        }
                                                                    }}
                                                                    disabled={updatingId === order.id}
                                                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                                                >
                                                                    {updatingId === order.id ? (
                                                                        <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                                                                    ) : (
                                                                        <span className="material-icons text-sm">
                                                                            {(localShippingType[order.id] || order.shipping_type || 'ekspedisi') === 'kurir_toko' ? 'delivery_dining' : 'local_shipping'}
                                                                        </span>
                                                                    )}
                                                                    {(localShippingType[order.id] || order.shipping_type || 'ekspedisi') === 'kurir_toko' ? '🛵 KIRIM SENDIRI' : '🚚 KIRIM SEKARANG'}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm('Ubah status ke "Proses" untuk mulai mengemas pesanan?')) {
                                                                            handleUpdateStatus(order.id, 'Proses');
                                                                        }
                                                                    }}
                                                                    disabled={updatingId === order.id}
                                                                    className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                                                                    title="Mulai kemas pesanan terlebih dahulu"
                                                                >
                                                                    <span className="material-icons text-sm">inventory</span>
                                                                    Mulai Kemas
                                                                </button>
                                                            </div>

                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
                                                                        handleUpdateStatus(order.id, 'Batal');
                                                                    }
                                                                }}
                                                                disabled={updatingId === order.id}
                                                                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
                                                            >
                                                                <span className="material-icons text-sm">cancel</span>
                                                                Batalkan Pesanan
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Step 3: Proses -> Kirim */}
                                                    {isProses && (
                                                        <div className="space-y-3">
                                                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 font-medium">
                                                                📦 Pesanan sedang dikemas. Pilih metode pengiriman di bawah lalu klik <span className="font-bold">Kirim Pesanan</span>.
                                                            </div>

                                                            {/* Dynamic Shipping Form */}
                                                            {renderShippingForm(order)}

                                                            <button
                                                                onClick={() => {
                                                                    const currentType = (localShippingType[order.id] || order.shipping_type || 'ekspedisi');
                                                                    if (currentType === 'kurir_toko') {
                                                                        const dName = localDriverName[order.id] !== undefined ? localDriverName[order.id] : order.driver_name;
                                                                        const dPhone = localDriverPhone[order.id] !== undefined ? localDriverPhone[order.id] : order.driver_phone;
                                                                        if (!dName || !dPhone) {
                                                                            if (!window.confirm('Nama atau No. Telp pengirim belum diisi lengkap. Tetap lanjutkan kirim pesanan?')) return;
                                                                        }
                                                                    }
                                                                    if (window.confirm('Pastikan pesanan siap/sudah diserahkan untuk dikirim. Tandai pesanan sebagai "Dikirim"?')) {
                                                                        handleUpdateStatus(order.id, 'Dikirim');
                                                                    }
                                                                }}
                                                                disabled={updatingId === order.id}
                                                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                                            >
                                                                {updatingId === order.id ? (
                                                                    <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                                                                ) : (
                                                                    <span className="material-icons text-sm">
                                                                        {(localShippingType[order.id] || order.shipping_type || 'ekspedisi') === 'kurir_toko' ? 'delivery_dining' : 'local_shipping'}
                                                                    </span>
                                                                )}
                                                                {(localShippingType[order.id] || order.shipping_type || 'ekspedisi') === 'kurir_toko' ? '🛵 KIRIM SENDIRI' : '🚚 KIRIM PESANAN'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
                                                                        handleUpdateStatus(order.id, 'Batal');
                                                                    }
                                                                }}
                                                                disabled={updatingId === order.id}
                                                                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
                                                            >
                                                                <span className="material-icons text-sm">cancel</span>
                                                                Batalkan Pesanan
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Step 4: Dikirim -> In Transit */}
                                                    {isDikirim && (
                                                        <div className="space-y-2.5">
                                                            {order.shipping_type === 'kurir_toko' || order.driver_name ? (
                                                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1.5">
                                                                    <div className="flex items-center justify-between font-bold">
                                                                        <span className="flex items-center gap-1 text-emerald-700">
                                                                            <span className="material-icons text-sm">delivery_dining</span>
                                                                            Dikirim Sendiri oleh Toko
                                                                        </span>
                                                                        <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Kurir Pribadi</span>
                                                                    </div>
                                                                    <div className="text-[11px] text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-100 space-y-1">
                                                                        <div>Pengirim: <strong className="text-gray-800">{order.driver_name || 'Driver Toko'}</strong></div>
                                                                        <div className="flex items-center justify-between">
                                                                            <span>No. Telp/WA: <strong className="font-mono text-gray-800">{order.driver_phone || '-'}</strong></span>
                                                                            {order.driver_phone && (
                                                                                <a
                                                                                    href={`https://wa.me/${order.driver_phone.replace(/[^0-9]/g, '')}`}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md hover:bg-emerald-700 transition flex items-center gap-1"
                                                                                >
                                                                                    <span className="material-icons text-[11px]">chat</span> Hubungi WA
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                        {order.delivery_date && (
                                                                            <div className="text-[10px] text-emerald-800 font-medium pt-1 border-t border-emerald-100 flex items-center gap-1">
                                                                                <span className="material-icons text-xs text-emerald-600">event</span>
                                                                                Jadwal Pengantaran: <strong>{order.delivery_date} {order.delivery_time_slot ? `(Pukul ${order.delivery_time_slot} WIB)` : ''}</strong>
                                                                            </div>
                                                                        )}
                                                                        {(Number(order.cod_amount_to_pay) > 0 || (order.payment_method || '').toLowerCase() === 'cod') && (
                                                                            <div className="text-[10px] text-amber-900 font-medium pt-1 border-t border-emerald-100 flex items-center justify-between">
                                                                                <span className="flex items-center gap-1"><span className="material-icons text-xs text-amber-600">payments</span> Tagihan COD Tunai:</span>
                                                                                <strong className="text-amber-800">Rp {Number(order.cod_amount_to_pay || order.grand_total).toLocaleString('id-ID')}</strong>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[9px] text-emerald-700/90 italic pt-0.5">
                                                                        * Status "Selesai" dikonfirmasi pembeli saat barang tiba{order.estimated_delivery_days ? `, atau otomatis dalam ${order.estimated_delivery_days} hari` : ''}.
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-[11px] text-indigo-900 space-y-1">
                                                                    <div className="flex items-center justify-between font-bold">
                                                                        <span className="flex items-center gap-1">
                                                                            <span className="material-icons text-sm text-indigo-600">local_shipping</span>
                                                                            Dalam Pengiriman Ekspedisi
                                                                        </span>
                                                                        <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">{order.shipping_courier || 'Ekspedisi'}</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-indigo-700 leading-relaxed">
                                                                        No. Resi: <span className="font-mono font-bold text-indigo-900">{order.resi_number || 'Belum diisi'}</span>
                                                                    </p>
                                                                    {(Number(order.cod_amount_to_pay) > 0 || (order.payment_method || '').toLowerCase() === 'cod') && (
                                                                        <div className="text-[10px] text-amber-900 font-medium pt-1 border-t border-indigo-100 flex items-center justify-between">
                                                                            <span className="flex items-center gap-1"><span className="material-icons text-xs text-amber-600">payments</span> Tagihan COD Tunai:</span>
                                                                            <strong className="text-amber-800">Rp {Number(order.cod_amount_to_pay || order.grand_total).toLocaleString('id-ID')}</strong>
                                                                        </div>
                                                                    )}
                                                                    <p className="text-[9px] text-indigo-600/90 italic pt-1 border-t border-indigo-100">
                                                                        * Status "Selesai" dikonfirmasi pembeli saat barang tiba, atau otomatis dalam {order.estimated_delivery_days || 3} hari pengiriman.
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Edit Delivery Info Form */}
                                                            <details className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs">
                                                                <summary className="font-bold text-gray-600 cursor-pointer select-none text-[11px] flex items-center justify-between">
                                                                    <span>✏️ Ubah Data Pengiriman / Resi / Tagihan COD</span>
                                                                    <span className="material-icons text-sm text-gray-400">expand_more</span>
                                                                </summary>
                                                                <div className="pt-2.5 space-y-2.5">
                                                                    {renderShippingForm(order)}

                                                                    <button 
                                                                        onClick={() => handleUpdateStatus(order.id, order.status)}
                                                                        disabled={updatingId === order.id}
                                                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-1"
                                                                        title="Simpan perubahan pengiriman"
                                                                    >
                                                                        <span className="material-icons text-xs">save</span>
                                                                        Simpan Perubahan Pengiriman
                                                                    </button>
                                                                </div>
                                                            </details>

                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('Batalkan pengiriman pesanan ini?')) {
                                                                        handleUpdateStatus(order.id, 'Batal');
                                                                    }
                                                                }}
                                                                disabled={updatingId === order.id}
                                                                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 disabled:opacity-50"
                                                            >
                                                                <span className="material-icons text-sm">cancel</span>
                                                                Batalkan Pesanan
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Notification to Buyer */}
                                                    <button 
                                                        onClick={() => handleSendWa(order.id)}
                                                        disabled={sendingWaId === order.id}
                                                        className="w-full bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition group disabled:opacity-50 shadow-sm"
                                                    >
                                                        {sendingWaId === order.id ? (
                                                            <div className="animate-spin h-3 w-3 border-b-2 border-emerald-600 rounded-full"></div>
                                                        ) : (
                                                            <span className="material-icons text-sm">mark_email_read</span>
                                                        )}
                                                        KIRIM NOTIFIKASI WA &amp; EMAIL KE PEMBELI
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Preview Bukti Transfer */}
            {selectedProof && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm">Bukti Transfer Pembayaran</h3>
                                <p className="text-[11px] text-emerald-100">Pesanan #{selectedProof.orderNumber} • {formatIDR(selectedProof.amount)}</p>
                            </div>
                            <button
                                onClick={() => setSelectedProof(null)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                            >
                                <span className="material-icons text-lg">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex flex-col items-center bg-gray-50 flex-1">
                            <div className="bg-white p-2 rounded-2xl shadow-md border border-gray-200 max-w-full">
                                <img 
                                    src={selectedProof.url} 
                                    alt="Bukti Transfer"
                                    className="max-h-[60vh] object-contain rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
                            <a
                                href={selectedProof.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl text-center transition flex items-center justify-center gap-1.5"
                            >
                                <span className="material-icons text-sm">open_in_new</span>
                                Buka Ukuran Penuh
                            </a>
                            <button
                                onClick={() => setSelectedProof(null)}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl text-center transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NavigationButton />
        </div>
    );
};

export default DashboardSinergySellerOrdersPage;

