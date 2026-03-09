// pages/DigitalProductPaymentPage.js
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import { uploadPaymentProof, getDigitalOrderStatus } from '../services/digitalProductApi';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import '../styles/Body.css';

const DigitalProductPaymentPage = () => {
    const { orderNumber } = useParams();
    const navigate = useNavigate();
    const [proofFile, setProofFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [order, setOrder] = useState(null);
    const [success, setSuccess] = useState(false);
    const [ocrError, setOcrError] = useState('');
    const [ocrLoading, setOcrLoading] = useState(false);

    React.useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await getDigitalOrderStatus(orderNumber);
                setOrder(res.data);
            } catch (err) {
                console.error('Error fetching order:', err);
            }
        };
        fetchOrder();
    }, [orderNumber]);

    const formatWAString = (template, order) => {
        if (!template) return '';
        return template
            .replace('[nama]', order.buyer_name)
            .replace('[order_number]', order.order_number);
    };

    const sendWhatsAppMessage = async (phone, message) => {
        try {
            // Usually this would call a backend endpoint that sends WA
            // For now we'll just log it or call a hypothetical service
            console.log(`Sending WA to ${phone}: ${message}`);
            // await axios.post('/api/wa/send', { phone, message });
        } catch (err) {
            console.error('Failed to send WA:', err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Ukuran file terlalu besar. Maksimal 5MB.');
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                alert('Format file tidak didukung. Hanya JPG, PNG, dan JPEG yang diperbolehkan.');
                return;
            }
            setProofFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!proofFile) {
            alert('Mohon pilih bukti pembayaran');
            return;
        }

        if (!order) {
            alert('Data pesanan belum dimuat');
            return;
        }

        setUploading(true);
        setOcrError('');
        setOcrLoading(true);

        try {
            // -- OCR VALIDATION BLOCK --
            console.log("Mulai proses OCR...");
            const { data: { text } } = await Tesseract.recognize(proofFile, 'ind');
            const lowerText = text.toLowerCase();
            console.log("Hasil OCR:", text);

            const isBaeCommunityPresent = lowerText.includes('bae community');
            const isDenySetiawanPresent = lowerText.includes('deny setiawan');

            const numericTotal = Math.floor(Number(order.amount));
            const totalStr = String(numericTotal);
            const totalFormatted = numericTotal.toLocaleString('id-ID');

            const scrubbedText = lowerText.replace(/rp/g, '').replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, '');

            const isAmountPresent =
                text.includes(totalStr) ||
                text.includes(totalFormatted) ||
                scrubbedText.includes(totalStr) ||
                scrubbedText.includes(totalStr + '00');

            if (!isBaeCommunityPresent && !isDenySetiawanPresent) {
                setOcrError('Validasi Gagal: Struk tidak mencantumkan nama "BAE Community" atau "DENY SETIAWAN".');
                setUploading(false);
                setOcrLoading(false);
                return;
            }

            if (!isAmountPresent) {
                setOcrError(`Validasi Gagal: Nominal struk tidak sesuai dengan total tagihan (Rp ${totalFormatted}).`);
                setUploading(false);
                setOcrLoading(false);
                return;
            }
            // -- END OCR VALIDATION --

            const formData = new FormData();
            formData.append('payment_proof', proofFile);
            await uploadPaymentProof(orderNumber, formData);

            // Send WA Notification
            try {
                const waMsg = `Halo kak ${order.buyer_name},\n\nTerima kasih telah melakukan pembayaran untuk pesanan digital (Order: *${order.order_number}*).\n\nPesanan kakak telah terverifikasi dan link produk akan segera dikirim ke email ${order.buyer_email}.`;
                await sendWhatsAppMessage(order.buyer_phone, waMsg);
            } catch (waErr) {
                console.error("Gagal mengirim WA:", waErr);
            }

            setSuccess(true);
        } catch (err) {
            console.error(err);
            setOcrError('Gagal mengupload bukti pembayaran. Silakan coba lagi.');
        } finally {
            setUploading(false);
            setOcrLoading(false);
        }
    };

    if (success) {
        return (
            <div className="body">
                <Header />
                <div className="px-4 py-12 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons text-green-600 text-4xl">check_circle</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        Bukti pembayaran telah diverifikasi. Link produk digital telah dikirim ke email Anda.
                    </p>
                    <p className="text-xs text-gray-400 mb-6">Order: {orderNumber}</p>
                    <button
                        onClick={() => navigate('/digital-products')}
                        className="px-8 py-3 bg-green-700 text-white rounded-xl font-bold hover:bg-green-800 transition"
                    >
                        Kembali ke Produk Digital
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="body">
            <Helmet>
                <title>Pembayaran - {orderNumber}</title>
            </Helmet>

            <Header />

            <div className="px-4 py-4 pb-32">
                <h1 className="text-lg font-bold mb-2">Upload Bukti Pembayaran</h1>
                <p className="text-sm text-gray-500 mb-6">Order: <strong>{orderNumber}</strong></p>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <h2 className="font-semibold text-sm mb-3">Pilihan Pembayaran</h2>

                    {order && (
                        <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-green-600 uppercase font-bold tracking-wider">Total Tagihan</p>
                                <p className="text-lg font-bold text-green-900">
                                    Rp {Number(order.amount).toLocaleString('id-ID')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Status</p>
                                <p className="text-xs font-bold text-orange-500 uppercase">{order.payment_status}</p>
                            </div>
                        </div>
                    )}

                    {/* QRIS */}
                    <div className="bg-white rounded-lg p-4 text-center border border-gray-200 mb-4">
                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">QRIS BAE COMMUNITY</p>
                        <img
                            id="qris-image"
                            src="/images/qris-bae2.png"
                            alt="QRIS Code"
                            className="w-48 h-48 mx-auto object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="hidden w-48 h-48 mx-auto bg-gray-100 rounded-lg items-center justify-center text-gray-400 text-sm">
                            QRIS Code
                        </div>

                        <button
                            onClick={() => {
                                const link = document.createElement('a');
                                link.href = '/images/qris-bae2.png';
                                link.download = `QRIS-BAE-${orderNumber}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="mt-4 flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition border border-gray-200"
                        >
                            <span className="material-icons text-sm">download</span>
                            UNDUH QR
                        </button>
                    </div>

                    <div className="border-t border-gray-200 my-4"></div>

                    {/* BSI */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">TRANSFER BANK BSI</p>
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                            <div>
                                <p className="text-xs text-blue-600">No. Rekening BSI</p>
                                <p className="font-bold text-blue-900">1040497408</p>
                                <p className="text-xs text-blue-700">an. DENY SETIAWAN</p>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText('1040497408');
                                    alert('No. Rekening berhasil disalin!');
                                }}
                                className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-bold"
                            >
                                SALIN
                            </button>
                        </div>
                    </div>
                </div>

                {ocrError && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl mb-4 border border-red-100">
                        <p className="font-bold">Error Validasi:</p>
                        <p>{ocrError}</p>
                    </div>
                )}

                {/* Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Bukti Transfer</label>
                    <div
                        onClick={() => document.getElementById('proof-input').click()}
                        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition"
                    >
                        {preview ? (
                            <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                        ) : (
                            <>
                                <span className="material-icons text-gray-400 text-4xl mb-2">cloud_upload</span>
                                <p className="text-sm text-gray-500">Klik untuk memilih gambar</p>
                                <p className="text-xs text-gray-400 mt-1">JPG, PNG maksimal 5MB</p>
                            </>
                        )}
                    </div>
                    <input
                        id="proof-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                <button
                    onClick={handleUpload}
                    disabled={uploading || ocrLoading || !proofFile}
                    className="w-full bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {(uploading || ocrLoading) ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {ocrLoading ? 'Validasi OCR...' : 'Memproses...'}
                        </>
                    ) : (
                        'Kirim Bukti Pembayaran'
                    )}
                </button>
            </div>
        </div>
    );
};

export default DigitalProductPaymentPage;
