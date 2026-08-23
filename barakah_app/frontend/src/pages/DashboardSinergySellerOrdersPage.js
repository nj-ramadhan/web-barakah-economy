import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../utils/mediaUtils';

const formatIDR = (val) => new Intl.NumberFormat('id-ID').format(Math.round(Number(val) || 0));

// SVG Barcode Generator Component (Deterministic Clean Bars)
const SvgBarcode = ({ value }) => {
    if (!value) return null;
    const textVal = String(value).trim().toUpperCase();
    let binary = "11010010000"; // Start code
    for (let i = 0; i < textVal.length; i++) {
        const charCode = textVal.charCodeAt(i);
        const bitPattern = ((charCode * 19 + 29) % 2048).toString(2).padStart(11, '0');
        binary += bitPattern;
    }
    binary += "1100011101011"; // Stop code

    return (
        <div className="flex flex-col items-center justify-center my-1 select-none">
            <svg width="220" height="40" viewBox={`0 0 ${binary.length} 40`} className="max-w-full h-9">
                {binary.split('').map((bit, idx) => (
                    bit === '1' ? (
                        <rect key={idx} x={idx} y="0" width="1" height="40" fill="#111827" />
                    ) : null
                ))}
            </svg>
            <span className="font-mono font-black text-[11px] tracking-[0.2em] text-gray-900 mt-0.5">
                {textVal}
            </span>
        </div>
    );
};

// Printable Standard Shipping Label Component (A6 / Thermal Ready)
const ShippingLabelCard = ({ order, user }) => {
    const isCod = (order.payment_method || '').toUpperCase() === 'COD';
    const statusUpper = (order.status || '').toUpperCase();
    const isUnpaidNonCod = !isCod && ['PENDING', 'UNPAID', 'WAITING_PAYMENT', 'MENUNGGU PEMBAYARAN', 'MENUNGGU VERIFIKASI'].includes(statusUpper);
    const recipientName = order.recipient_name || order.buyer_details?.name_full || order.buyer_details?.username || 'Pembeli';
    const recipientPhone = order.recipient_phone || order.buyer_details?.phone || '-';
    const streetAddress = order.shipping_address || order.buyer_details?.address || '-';
    const rtRw = order.shipping_rt_rw || order.buyer_details?.address_rt_rw || '';
    const village = order.shipping_village || order.buyer_details?.address_village_name || '';
    const district = order.shipping_district || order.buyer_details?.address_subdistrict_name || '';
    const city = order.shipping_city || order.buyer_details?.address_city_name || '';
    const province = order.shipping_province || order.buyer_details?.address_province || '';
    const postalCode = order.shipping_postal_code || order.buyer_details?.address_postal_code || '';
    const buyerNote = order.buyer_note || order.shipping_address_detail || '';

    const senderName = order.seller_name || user?.username || 'Toko Mitra BAE';
    const senderPhone = order.seller_phone || user?.phone || '-';
    const isKurirToko = order.shipping_type === 'kurir_toko';
    const courierLabel = isKurirToko 
        ? '🛵 KURIR TOKO (KIRIM SENDIRI)' 
        : `${order.shipping_courier ? order.shipping_courier.toUpperCase() : 'EKSPEDISI'} - ${order.shipping_service || 'STANDARD'}`;
    
    // Barcode value: if resi_number exists, use it. Otherwise use order_number.
    const barcodeValue = order.resi_number ? order.resi_number : order.order_number;

    return (
        <div className="shipping-label-sheet w-full max-w-[420px] mx-auto bg-white text-gray-900 border-2 border-black rounded-lg p-3.5 text-xs font-sans shadow-sm print:shadow-none print:border-black print:p-3 print:m-0 print:max-w-none print:w-full print:break-inside-avoid print:page-break-after-always">
            {/* Header: Brand & Order No */}
            <div className="border-b-2 border-black pb-2 flex justify-between items-center gap-2">
                <div className="flex items-center gap-1.5">
                    <span className="bg-black text-white font-black text-[11px] px-1.5 py-0.5 rounded">BAE</span>
                    <span className="font-black text-sm tracking-tight">BARAKAH EXPRESS</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block">No. Pesanan</span>
                    <span className="font-mono font-black text-xs">#{order.order_number}</span>
                </div>
            </div>

            {/* Courier & Service Banner */}
            <div className="py-2 border-b-2 border-black flex justify-between items-center bg-gray-50 -mx-3.5 px-3.5 print:bg-gray-100">
                <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase block">Layanan Logistik</span>
                    <span className="font-black text-xs text-gray-900">{courierLabel}</span>
                </div>
                {isKurirToko && order.delivery_time_slot && (
                    <span className="text-[10px] font-bold bg-white px-2 py-0.5 border border-black rounded">
                        Slot: {order.delivery_time_slot}
                    </span>
                )}
            </div>

            {/* Payment COD / Non-COD Badge Box */}
            <div className={`my-2 p-2 border-2 border-black text-center rounded font-black ${isCod ? 'bg-black text-white' : (isUnpaidNonCod ? 'bg-amber-100 text-amber-950 border-dashed' : 'bg-white text-black')}`}>
                {isCod ? (
                    <div>
                        <div className="text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                            <span>💵 COD (BAYAR DI TEMPAT)</span>
                        </div>
                        <div className="text-base font-black tracking-tight mt-0.5">
                            TAGIHAN: Rp {formatIDR(order.cod_amount_to_pay || order.grand_total || 0)}
                        </div>
                    </div>
                ) : isUnpaidNonCod ? (
                    <div>
                        <div className="text-[11px] uppercase tracking-wider text-amber-900 font-bold">
                            ⚠️ BELUM LUNAS (MENUNGGU PEMBAYARAN)
                        </div>
                        <div className="text-xs font-black mt-0.5">
                            Nominal: Rp {formatIDR(order.grand_total || 0)}
                        </div>
                    </div>
                ) : (
                    <div className="text-xs uppercase tracking-widest py-0.5">
                        ✓ NON-COD (LUNAS - SUDAH DIBAYAR)
                    </div>
                )}
            </div>

            {/* Barcode Section: ONLY if official courier tracking/resi number exists AND not kurir toko */}
            {order.resi_number && !isKurirToko ? (
                <div className="border-b-2 border-black pb-2 text-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase block">
                        Nomor Resi Pengiriman Ekspedisi
                    </span>
                    <SvgBarcode value={order.resi_number} />
                </div>
            ) : (
                <div className="border-b-2 border-black py-1 px-2 bg-gray-50 text-center">
                    <span className="text-[9px] font-bold text-gray-500 uppercase">
                        {isKurirToko ? 'Pengantaran Kurir Toko / Mandiri' : 'Resi Belum Diinput (Proses Kemas)'}
                    </span>
                </div>
            )}

            {/* Sender & Recipient Section */}
            <div className="grid grid-cols-2 gap-2 py-2 border-b-2 border-black">
                {/* Penerima */}
                <div className="border-r border-black pr-2">
                    <span className="text-[9px] font-black uppercase text-gray-500 block mb-0.5">PENERIMA:</span>
                    <p className="font-black text-xs leading-tight">{recipientName}</p>
                    <p className="font-mono text-[11px] font-bold text-gray-700">{recipientPhone}</p>
                    <div className="mt-1 text-[10px] leading-snug text-gray-800">
                        <p>{streetAddress}</p>
                        {rtRw && <p className="font-bold">RT/RW: {rtRw}</p>}
                        {(village || district) && (
                            <p>{village ? `Kel. ${village}` : ''}{district ? `, Kec. ${district}` : ''}</p>
                        )}
                        {(city || province) && (
                            <p>{city}{province ? `, ${province}` : ''}</p>
                        )}
                        {postalCode && <p className="font-bold">Kode Pos: {postalCode}</p>}
                    </div>
                    {buyerNote && (
                        <div className="mt-1 p-1 bg-gray-100 rounded text-[9px] border border-gray-300">
                            <span className="font-bold">Ket: </span>{buyerNote}
                        </div>
                    )}
                </div>

                {/* Pengirim */}
                <div className="pl-1">
                    <span className="text-[9px] font-black uppercase text-gray-500 block mb-0.5">PENGIRIM:</span>
                    <p className="font-black text-xs leading-tight">{senderName}</p>
                    <p className="font-mono text-[11px] font-bold text-gray-700">{senderPhone}</p>
                    <p className="mt-1 text-[10px] text-gray-600">Mitra Toko Sinergy BAE</p>
                </div>
            </div>

            {/* Item Packing List Table */}
            <div className="pt-2">
                <span className="text-[9px] font-black uppercase text-gray-500 block mb-1">DAFTAR BARANG ({order.items?.length || 0} Item):</span>
                <div className="border border-black rounded overflow-hidden">
                    <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black">
                                <th className="p-1 font-bold">Produk</th>
                                <th className="p-1 font-bold text-center w-10">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(order.items || []).map((it, idx) => (
                                <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                                    <td className="p-1 leading-tight">
                                        <p className="font-bold text-gray-900">{it.product_name || 'Produk'}</p>
                                        {it.variation_name && (
                                            <p className="text-[9px] text-gray-500 font-medium">Var: {it.variation_name}</p>
                                        )}
                                    </td>
                                    <td className="p-1 text-center font-bold text-gray-900">{it.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-2 pt-1.5 border-t border-dashed border-gray-400 flex justify-between items-center text-[8px] text-gray-500">
                <span>Tgl Order: {new Date(order.created_at).toLocaleDateString('id-ID')}</span>
                <span>Barakah Economy Platform</span>
            </div>
        </div>
    );
};

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
    const [selectedProof, setSelectedProof] = useState(null);
    const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
    const [printModalOrders, setPrintModalOrders] = useState(null);

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

    const handleToggleSelectOrder = (orderId) => {
        setSelectedOrderIds(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const handleSelectAll = (orderList) => {
        if (selectedOrderIds.size === orderList.length && orderList.length > 0) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(orderList.map(o => o.id)));
        }
    };

    const handlePrintSelected = (orderList) => {
        const selected = orderList.filter(o => selectedOrderIds.has(o.id));
        if (selected.length === 0) {
            alert('Pilih minimal 1 pesanan untuk dicetak labelnya.');
            return;
        }
        const printable = selected.filter(o => {
            const isCod = (o.payment_method || '').toUpperCase() === 'COD';
            const st = (o.status || '').toUpperCase();
            return isCod || !['PENDING', 'UNPAID', 'WAITING_PAYMENT', 'MENUNGGU PEMBAYARAN', 'MENUNGGU VERIFIKASI'].includes(st);
        });
        if (printable.length === 0) {
            alert('Pesanan yang Anda pilih belum dibayar (Lunas). Cetak resi hanya berlaku untuk pesanan yang sudah dibayar atau pesanan COD.');
            return;
        }
        if (printable.length < selected.length) {
            alert(`${selected.length - printable.length} pesanan yang belum dibayar dilewati. Menyiapkan cetak untuk ${printable.length} pesanan yang sudah lunas/COD.`);
        }
        setPrintModalOrders(printable);
    };

    const handlePrintSingle = (order) => {
        const isCod = (order.payment_method || '').toUpperCase() === 'COD';
        const st = (order.status || '').toUpperCase();
        const isUnpaid = !isCod && ['PENDING', 'UNPAID', 'WAITING_PAYMENT', 'MENUNGGU PEMBAYARAN', 'MENUNGGU VERIFIKASI'].includes(st);
        if (isUnpaid) {
            alert('Pesanan ini belum dibayar oleh pembeli. Resi pengiriman hanya dapat dicetak setelah pesanan lunas atau berstatus siap diproses / COD.');
            return;
        }
        setPrintModalOrders([order]);
    };

    const handleOpenInNewTab = (ordersToPrint, autoPrint = false) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Pop-up browser diblokir. Harap izinkan pop-up untuk membuka cetak di tab baru.');
            return;
        }

        const labelsHtml = ordersToPrint.map(order => {
            const isCod = (order.payment_method || '').toUpperCase() === 'COD';
            const statusUpper = (order.status || '').toUpperCase();
            const isUnpaidNonCod = !isCod && ['PENDING', 'UNPAID', 'WAITING_PAYMENT', 'MENUNGGU PEMBAYARAN', 'MENUNGGU VERIFIKASI'].includes(statusUpper);
            const recipientName = order.recipient_name || order.buyer_details?.name_full || order.buyer_details?.username || 'Pembeli';
            const recipientPhone = order.recipient_phone || order.buyer_details?.phone || '-';
            const streetAddress = order.shipping_address || order.buyer_details?.address || '-';
            const rtRw = order.shipping_rt_rw || order.buyer_details?.address_rt_rw || '';
            const village = order.shipping_village || order.buyer_details?.address_village_name || '';
            const district = order.shipping_district || order.buyer_details?.address_subdistrict_name || '';
            const city = order.shipping_city || order.buyer_details?.address_city_name || '';
            const province = order.shipping_province || order.buyer_details?.address_province || '';
            const postalCode = order.shipping_postal_code || order.buyer_details?.address_postal_code || '';
            const buyerNote = order.buyer_note || order.shipping_address_detail || '';
            const senderName = order.seller_name || user?.username || 'Toko Mitra BAE';
            const senderPhone = order.seller_phone || user?.phone || '-';
            const isKurirToko = order.shipping_type === 'kurir_toko';
            const courierLabel = isKurirToko 
                ? '🛵 KURIR TOKO (KIRIM SENDIRI)' 
                : `${order.shipping_courier ? order.shipping_courier.toUpperCase() : 'EKSPEDISI'} - ${order.shipping_service || 'STANDARD'}`;
            const hasCourierResi = Boolean(order.resi_number && !isKurirToko);

            // Generate barcode svg ONLY if official courier tracking/resi number exists
            let barcodeHtml = '';
            if (hasCourierResi) {
                const barcodeVal = String(order.resi_number).trim().toUpperCase();
                let binary = "11010010000";
                for (let i = 0; i < barcodeVal.length; i++) {
                    const charCode = barcodeVal.charCodeAt(i);
                    const bitPattern = ((charCode * 19 + 29) % 2048).toString(2).padStart(11, '0');
                    binary += bitPattern;
                }
                binary += "1100011101011";

                const rects = binary.split('').map((bit, idx) => bit === '1' ? `<rect x="${idx}" y="0" width="1" height="40" fill="#000" />` : '').join('');
                barcodeHtml = `
                    <div class="barcode-box">
                        <div style="font-size: 9px; color: #666; text-transform: uppercase;">Nomor Resi Pengiriman Ekspedisi</div>
                        <svg width="220" height="40" viewBox="0 0 ${binary.length} 40" style="margin: 4px auto 2px; display: block;">
                            ${rects}
                        </svg>
                        <div style="font-family: monospace; font-weight: bold; font-size: 11px; letter-spacing: 2px;">${barcodeVal}</div>
                    </div>
                `;
            } else {
                barcodeHtml = `
                    <div style="border-bottom: 2px solid #000; padding: 6px; background: #f9fafb; text-align: center;">
                        <span style="font-size: 9px; color: #666; text-transform: uppercase; font-weight: bold;">
                            ${isKurirToko ? 'Pengantaran Kurir Toko / Mandiri' : 'Resi Belum Diinput (Proses Kemas)'}
                        </span>
                    </div>
                `;
            }

            const itemsRows = (order.items || []).map(it => `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 4px;"><strong>${it.product_name || 'Produk'}</strong> ${it.variation_name ? `<br/><span style="font-size: 9px; color: #666;">Var: ${it.variation_name}</span>` : ''}</td>
                    <td style="padding: 4px; text-align: center; font-weight: bold;">${it.quantity}</td>
                </tr>
            `).join('');

            return `
            <div class="label-card">
                <div class="label-header">
                    <div>
                        <span class="badge">BAE</span>
                        <strong>BARAKAH EXPRESS</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 9px; color: #666; text-transform: uppercase;">No. Pesanan</span><br/>
                        <strong>#${order.order_number}</strong>
                    </div>
                </div>

                <div class="courier-banner">
                    <div>
                        <span style="font-size: 9px; color: #666; text-transform: uppercase;">Layanan Logistik</span><br/>
                        <strong>${courierLabel}</strong>
                    </div>
                    ${isKurirToko && order.delivery_time_slot ? `<span class="slot-badge">Slot: ${order.delivery_time_slot}</span>` : ''}
                </div>

                <div class="payment-box ${isCod ? 'cod' : (isUnpaidNonCod ? 'unpaid' : 'non-cod')}">
                    ${isCod ? `
                        <div style="font-size: 11px; text-transform: uppercase;">💵 COD (BAYAR DI TEMPAT)</div>
                        <div style="font-size: 14px; font-weight: bold; margin-top: 2px;">TAGIHAN: Rp ${formatIDR(order.cod_amount_to_pay || order.grand_total || 0)}</div>
                    ` : isUnpaidNonCod ? `
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #92400e;">⚠️ BELUM LUNAS (MENUNGGU PEMBAYARAN)</div>
                        <div style="font-size: 13px; font-weight: bold; margin-top: 2px; color: #78350f;">Nominal: Rp ${formatIDR(order.grand_total || 0)}</div>
                    ` : `
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: bold;">✓ NON-COD (LUNAS - SUDAH DIBAYAR)</div>
                    `}
                </div>

                ${barcodeHtml}

                <div class="address-grid">
                    <div class="address-col" style="border-right: 1px solid #000; padding-right: 8px;">
                        <span class="section-title">PENERIMA:</span>
                        <div class="person-name">${recipientName}</div>
                        <div class="person-phone">${recipientPhone}</div>
                        <div class="address-text">
                            ${streetAddress}<br/>
                            ${rtRw ? `<strong>RT/RW: ${rtRw}</strong><br/>` : ''}
                            ${village ? `Kel. ${village}, ` : ''}${district ? `Kec. ${district}<br/>` : ''}
                            ${city ? `${city}, ` : ''}${province ? `${province}<br/>` : ''}
                            ${postalCode ? `<strong>Kode Pos: ${postalCode}</strong><br/>` : ''}
                        </div>
                        ${buyerNote ? `<div class="note-box"><strong>Ket:</strong> ${buyerNote}</div>` : ''}
                    </div>
                    <div class="address-col" style="padding-left: 8px;">
                        <span class="section-title">PENGIRIM:</span>
                        <div class="person-name">${senderName}</div>
                        <div class="person-phone">${senderPhone}</div>
                        <div style="font-size: 10px; color: #666; margin-top: 4px;">Mitra Toko Sinergy BAE</div>
                    </div>
                </div>

                <div style="margin-top: 8px;">
                    <span class="section-title">DAFTAR BARANG (${order.items?.length || 0} Item):</span>
                    <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; font-size: 10px; margin-top: 4px;">
                        <thead>
                            <tr style="background: #eee; border-bottom: 1px solid #000;">
                                <th style="padding: 4px; text-align: left;">Produk</th>
                                <th style="padding: 4px; text-align: center; width: 40px;">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>

                <div class="label-footer">
                    <span>Tgl Order: ${new Date(order.created_at).toLocaleDateString('id-ID')}</span>
                    <span>Barakah Economy Platform</span>
                </div>
            </div>
            `;
        }).join('');

        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Cetak Resi Pengiriman - Barakah Economy</title>
                <style>
                    * { box-sizing: border-box; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background: #f4f5f7;
                        margin: 0;
                        padding: 20px;
                        color: #111;
                    }
                    .toolbar {
                        max-width: 440px;
                        margin: 0 auto 16px auto;
                        display: flex;
                        gap: 10px;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .btn {
                        padding: 10px 18px;
                        font-size: 13px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        border: none;
                        transition: 0.2s;
                    }
                    .btn-primary {
                        background: #059669;
                        color: #fff;
                        flex: 1;
                    }
                    .btn-primary:hover {
                        background: #047857;
                    }
                    .btn-secondary {
                        background: #e5e7eb;
                        color: #374151;
                    }
                    .btn-secondary:hover {
                        background: #d1d5db;
                    }
                    .label-card {
                        max-width: 440px;
                        margin: 0 auto 24px auto;
                        background: #fff;
                        border: 2px solid #000;
                        border-radius: 8px;
                        padding: 14px;
                        font-size: 11px;
                        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                        page-break-after: always;
                        break-after: page;
                    }
                    .label-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 6px;
                    }
                    .badge {
                        background: #000;
                        color: #fff;
                        font-weight: 900;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 4px;
                        margin-right: 4px;
                    }
                    .courier-banner {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #f9fafb;
                        margin: 0 -14px;
                        padding: 8px 14px;
                        border-bottom: 2px solid #000;
                    }
                    .slot-badge {
                        background: #fff;
                        border: 1px solid #000;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-weight: bold;
                        font-size: 10px;
                    }
                    .payment-box {
                        margin: 8px 0;
                        padding: 8px;
                        border: 2px solid #000;
                        text-align: center;
                        border-radius: 6px;
                    }
                    .payment-box.cod {
                        background: #000;
                        color: #fff;
                    }
                    .payment-box.non-cod {
                        background: #fff;
                        color: #000;
                    }
                    .barcode-box {
                        border-bottom: 2px solid #000;
                        padding-bottom: 6px;
                        text-align: center;
                    }
                    .address-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px;
                        border-bottom: 2px solid #000;
                        padding: 8px 0;
                    }
                    .section-title {
                        font-size: 9px;
                        font-weight: 900;
                        color: #666;
                        display: block;
                        margin-bottom: 2px;
                    }
                    .person-name {
                        font-weight: bold;
                        font-size: 12px;
                    }
                    .person-phone {
                        font-family: monospace;
                        font-size: 11px;
                        font-weight: bold;
                        color: #444;
                    }
                    .address-text {
                        font-size: 10px;
                        line-height: 1.35;
                        color: #222;
                        margin-top: 4px;
                    }
                    .note-box {
                        background: #fef3c7;
                        border: 1px solid #fde68a;
                        padding: 4px;
                        border-radius: 4px;
                        font-size: 9px;
                        margin-top: 4px;
                    }
                    .label-footer {
                        margin-top: 8px;
                        padding-top: 6px;
                        border-top: 1px dashed #aaa;
                        display: flex;
                        justify-content: space-between;
                        font-size: 8px;
                        color: #666;
                    }
                    @media print {
                        @page {
                            margin: 5mm;
                            size: auto;
                        }
                        html, body {
                            background: transparent !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            height: auto !important;
                        }
                        .toolbar {
                            display: none !important;
                        }
                        .label-card {
                            box-shadow: none !important;
                            margin: 0 0 15px 0 !important;
                            border: 2px solid #000 !important;
                            max-width: 100% !important;
                            width: 100% !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                        .label-card:not(:last-child) {
                            page-break-after: always !important;
                            break-after: page !important;
                        }
                        .label-card:last-child {
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                        }
                    }
                </style>
                ${autoPrint ? `
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    };
                </script>
                ` : ''}
            </head>
            <body>
                <div class="toolbar">
                    <button class="btn btn-primary" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
                    <button class="btn btn-secondary" onclick="window.close()">Tutup Tab</button>
                </div>
                ${labelsHtml}
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
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

                {/* Bulk Actions & Selection Toolbar */}
                {filteredOrders.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={selectedOrderIds.size > 0 && selectedOrderIds.size === filteredOrders.length}
                                    onChange={() => handleSelectAll(filteredOrders)}
                                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer border-gray-300 focus:ring-emerald-500"
                                />
                                <span>Pilih Semua ({filteredOrders.length} Pesanan)</span>
                            </label>
                            {selectedOrderIds.size > 0 && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                                    {selectedOrderIds.size} dipilih
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedOrderIds.size > 0 && (
                                <button
                                    onClick={() => setSelectedOrderIds(new Set())}
                                    className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                                >
                                    Batal Pilih
                                </button>
                            )}
                            <button
                                onClick={() => handlePrintSelected(filteredOrders)}
                                disabled={selectedOrderIds.size === 0}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                                    selectedOrderIds.size > 0
                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white cursor-pointer'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <span className="material-icons text-sm">print</span>
                                Cetak Resi Massal ({selectedOrderIds.size})
                            </button>
                        </div>
                    </div>
                )}

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
                                            <input
                                                type="checkbox"
                                                checked={selectedOrderIds.has(order.id)}
                                                onChange={() => handleToggleSelectOrder(order.id)}
                                                className="w-4 h-4 text-emerald-600 rounded cursor-pointer border-gray-300 focus:ring-emerald-500 shrink-0"
                                            />
                                            <div className="bg-emerald-600 text-white p-2 rounded-lg">
                                                <span className="material-icons text-sm">receipt</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Nomor Pesanan</p>
                                                <p className="text-sm font-bold text-gray-800">#{order.order_number}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            {(() => {
                                                const isOrderCancelled = ['BATAL', 'CANCELLED'].includes(statusUpper);
                                                const isOrderUnpaid = !isCod && ['PENDING', 'UNPAID', 'WAITING_PAYMENT', 'MENUNGGU PEMBAYARAN', 'MENUNGGU VERIFIKASI'].includes(statusUpper);
                                                const isBlocked = isOrderCancelled || isOrderUnpaid;
                                                
                                                return (
                                                    <button
                                                        onClick={() => handlePrintSingle(order)}
                                                        disabled={isBlocked}
                                                        className={`flex items-center gap-1 border px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                                                            isBlocked 
                                                                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70' 
                                                                : 'bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-800 cursor-pointer'
                                                        }`}
                                                        title={
                                                            isOrderCancelled 
                                                                ? "Pesanan telah dibatalkan." 
                                                                : isOrderUnpaid 
                                                                    ? "Pesanan belum dibayar oleh pembeli. Resi hanya dapat dicetak setelah lunas / siap diproses." 
                                                                    : "Cetak Label Resi Pengiriman"
                                                        }
                                                    >
                                                        <span className={`material-icons text-sm ${isBlocked ? 'text-gray-400' : 'text-emerald-600'}`}>print</span>
                                                        {isOrderCancelled ? 'Batal' : isOrderUnpaid ? 'Belum Bayar' : 'Cetak Resi'}
                                                    </button>
                                                );
                                            })()}
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
                                            {isBatal ? (
                                                <span className="text-[11px] text-red-600 font-bold flex items-center gap-1">
                                                    <span className="material-icons text-sm">cancel</span>
                                                    Pesanan Dibatalkan
                                                </span>
                                            ) : hasProof ? (
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
                                                isPending ? (
                                                    <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                                        <span className="material-icons text-sm">hourglass_top</span>
                                                        Menunggu Pembayaran DynaQRIS
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                                        <span className="material-icons text-sm">check_circle</span>
                                                        Lunas Otomatis (DynaQRIS)
                                                    </span>
                                                )
                                            ) : isSaldoBae ? (
                                                <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                                                    <span className="material-icons text-sm">check_circle</span>
                                                    Lunas Instan (Saldo BAE)
                                                </span>
                                            ) : isCod ? (
                                                <span className="text-[11px] text-amber-700 font-semibold">
                                                    Tagih Tunai Saat Pengantaran (COD)
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

            {/* Modal Preview & Cetak Label Pengiriman */}
            {printModalOrders && printModalOrders.length > 0 && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl flex flex-col max-h-[92vh]">
                        {/* Modal Header */}
                        <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-base flex items-center gap-2">
                                    <span className="material-icons text-emerald-200">print</span>
                                    Cetak Label Pengiriman ({printModalOrders.length} Pesanan)
                                </h3>
                                <p className="text-[11px] text-emerald-100 mt-0.5">
                                    Format standar resi ekspedisi &amp; kurir toko (A6 / Thermal Ready)
                                </p>
                            </div>
                            <button
                                onClick={() => setPrintModalOrders(null)}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                            >
                                <span className="material-icons text-lg">close</span>
                            </button>
                        </div>

                        {/* Modal Body: Scrollable Preview of Labels */}
                        <div className="p-6 overflow-y-auto bg-gray-100 flex-1 space-y-6">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                                <span className="material-icons text-emerald-600 text-base">info</span>
                                <span>Preview label di bawah ini adalah tampilan yang akan dicetak pada printer / kertas thermal Anda.</span>
                            </div>

                            {printModalOrders.map((ord) => (
                                <ShippingLabelCard key={ord.id} order={ord} user={user} />
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-white border-t border-gray-100 flex flex-wrap justify-between gap-3 items-center">
                            <button
                                onClick={() => setPrintModalOrders(null)}
                                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                            >
                                Tutup
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenInNewTab(printModalOrders, false)}
                                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                    <span className="material-icons text-sm text-gray-500">open_in_new</span>
                                    Buka di Tab Baru
                                </button>
                                <button
                                    onClick={() => handleOpenInNewTab(printModalOrders, true)}
                                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                                >
                                    <span className="material-icons text-sm">print</span>
                                    Cetak Sekarang / Simpan PDF ({printModalOrders.length} Label)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Printable Container for Direct Browser window.print() */}
            {printModalOrders && printModalOrders.length > 0 && (
                <div id="printable-labels-container" className="hidden print:block">
                    {printModalOrders.map((ord) => (
                        <ShippingLabelCard key={ord.id} order={ord} user={user} />
                    ))}
                </div>
            )}

            {/* Print CSS */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #printable-labels-container, #printable-labels-container * {
                        visibility: visible !important;
                    }
                    #printable-labels-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10px !important;
                        background: transparent !important;
                    }
                    .shipping-label-sheet {
                        page-break-after: always !important;
                        break-after: page !important;
                        margin-bottom: 24px !important;
                    }
                }
            `}</style>

            <NavigationButton />
        </div>
    );
};

export default DashboardSinergySellerOrdersPage;

