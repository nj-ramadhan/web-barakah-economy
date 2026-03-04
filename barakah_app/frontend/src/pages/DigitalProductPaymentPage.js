// pages/DigitalProductPaymentPage.js
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import { uploadPaymentProof } from '../services/digitalProductApi';
import '../styles/Body.css';

const DigitalProductPaymentPage = () => {
    const { orderNumber } = useParams();
    const navigate = useNavigate();
    const [proofFile, setProofFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProofFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!proofFile) {
            alert('Mohon pilih bukti pembayaran');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('payment_proof', proofFile);
            await uploadPaymentProof(orderNumber, formData);
            setSuccess(true);
        } catch (err) {
            console.error(err);
            alert('Gagal mengupload bukti pembayaran. Silakan coba lagi.');
        } finally {
            setUploading(false);
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

            <div className="px-4 py-4 pb-8">
                <h1 className="text-lg font-bold mb-2">Upload Bukti Pembayaran</h1>
                <p className="text-sm text-gray-500 mb-6">Order: <strong>{orderNumber}</strong></p>

                {/* QRIS Info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h2 className="font-semibold text-sm mb-3">Pembayaran via QRIS</h2>
                    <div className="bg-white rounded-lg p-4 text-center border border-gray-200 mb-3">
                        <img
                            src="/images/qris.png"
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
                    </div>
                    <p className="text-xs text-gray-500 text-center">Scan QRIS di atas untuk melakukan pembayaran</p>
                </div>

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
                                <p className="text-xs text-gray-400 mt-1">JPG, PNG maksimal 10MB</p>
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
                    disabled={uploading || !proofFile}
                    className="w-full bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-green-800 transition disabled:opacity-50"
                >
                    {uploading ? 'Memproses...' : 'Kirim Bukti Pembayaran'}
                </button>
            </div>
        </div>
    );
};

export default DigitalProductPaymentPage;
