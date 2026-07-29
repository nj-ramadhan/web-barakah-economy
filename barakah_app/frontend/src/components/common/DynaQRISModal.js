import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { checkDynaQRISStatus, verifyDynaQRISPayment } from '../../services/paymentApi';

const DynaQRISModal = ({
    isOpen,
    onClose,
    qrisData,
    transactionType,
    referenceId,
    amount,
    onPaymentSuccess
}) => {
    const [timeLeft, setTimeLeft] = useState(qrisData?.timeoutSeconds || 300);
    const [isExpired, setIsExpired] = useState(false);
    const [copied, setCopied] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [statusText, setStatusText] = useState('Menunggu Pembayaran...');
    const timerRef = useRef(null);
    const pollRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !qrisData) return;

        const initialSeconds = qrisData.timeoutSeconds || 300;
        setTimeLeft(initialSeconds);
        setIsExpired(false);
        setStatusText('Menunggu Pembayaran...');

        // Start Countdown Timer
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setIsExpired(true);
                    setStatusText('Waktu Pembayaran Telah Habis');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Start Auto Polling Payment Status
        pollRef.current = setInterval(async () => {
            if (referenceId && transactionType) {
                try {
                    const res = await checkDynaQRISStatus(transactionType, referenceId);
                    if (res && res.verified) {
                        clearInterval(timerRef.current);
                        clearInterval(pollRef.current);
                        setStatusText('Pembayaran Berhasil Diverifikasi!');
                        if (onPaymentSuccess) {
                            setTimeout(() => {
                                onPaymentSuccess(res);
                            }, 1200);
                        }
                    }
                } catch (err) {
                    console.error('Polling payment status error:', err);
                }
            }
        }, 4000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [isOpen, qrisData, transactionType, referenceId]);

    if (!isOpen || !qrisData) return null;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCopyCode = () => {
        if (qrisData.qrisCode) {
            navigator.clipboard.writeText(qrisData.qrisCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleManualCheck = async () => {
        setCheckingStatus(true);
        try {
            const res = await checkDynaQRISStatus(transactionType, referenceId);
            if (res && res.verified) {
                setStatusText('Pembayaran Berhasil Diverifikasi!');
                if (onPaymentSuccess) {
                    setTimeout(() => onPaymentSuccess(res), 1000);
                }
            } else {
                setVerifying(true);
                const verifyRes = await verifyDynaQRISPayment(transactionType, referenceId);
                if (verifyRes && verifyRes.success) {
                    setStatusText('Pembayaran Berhasil Diverifikasi!');
                    if (onPaymentSuccess) {
                        setTimeout(() => onPaymentSuccess(verifyRes), 1000);
                    }
                } else {
                    setStatusText('Pembayaran belum terdeteksi oleh sistem. Mohon pastikan Anda sudah melakukan pembayaran via QRIS di atas.');
                }
            }
        } catch (err) {
            console.error('Status check error:', err);
            setStatusText('Gagal mengecek status pembayaran. Silakan coba beberapa saat lagi.');
        } finally {
            setCheckingStatus(false);
            setVerifying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative border border-emerald-100 transform transition-all my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
                {/* Sticky Top Close Header */}
                <div className="sticky top-0 z-20 flex justify-end bg-white/95 backdrop-blur-xs pt-1 pb-2 -mt-2 -mr-2 mb-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition shadow-sm border border-gray-200 active:scale-95"
                        title="Tutup"
                    >
                        <span className="material-icons text-base">close</span>
                    </button>
                </div>

                {/* Header Badge */}
                <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                        <span className="material-icons text-sm">qr_code_scanner</span>
                        <span>Pembayaran QRIS Dinamis</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-800">Scan untuk Membayar</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Buka BCA Mobile, GoPay, OVO, Dana, ShopeePay, atau m-Banking Anda
                    </p>
                </div>

                {/* Amount Display */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl p-4 text-center mb-5 shadow-lg">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-100">Total Nominal Pembayaran</p>
                    <h2 className="text-3xl font-black mt-1">
                        Rp {formatCurrency(qrisData.amount || amount || 0)}
                    </h2>
                    <p className="text-[11px] text-emerald-100/90 mt-1 font-medium">Nominal otomatis terdeteksi saat di-scan</p>
                </div>

                {/* QR Code Container */}
                <div className="relative flex flex-col items-center justify-center mb-5">
                    {isExpired ? (
                        <div className="w-64 h-64 bg-gray-100 rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-red-300">
                            <span className="material-icons text-4xl text-red-500 mb-2">timer_off</span>
                            <p className="font-bold text-red-600 text-sm">Waktu Pembayaran Habis</p>
                            <p className="text-xs text-gray-500 mt-1">Silakan lakukan pendaftaran/pemesanan ulang untuk mendapatkan QRIS baru.</p>
                        </div>
                    ) : (
                        <div className="p-3 bg-white border-2 border-emerald-500/20 rounded-2xl shadow-md flex items-center justify-center relative">
                            {qrisData.qrisImage ? (
                                <img
                                    src={qrisData.qrisImage}
                                    alt="QRIS Code"
                                    className="w-60 h-60 object-contain rounded-xl"
                                />
                            ) : (
                                <div className="w-60 h-60 flex items-center justify-center bg-gray-50 text-gray-400">
                                    QR Code Tidak Tersedia
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Countdown Timer Bar */}
                {!isExpired && (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-5">
                        <div className="flex items-center gap-2">
                            <span className="material-icons text-amber-600 text-lg animate-pulse">alarm</span>
                            <span className="text-xs font-semibold text-amber-800">Sisa Waktu Pembayaran:</span>
                        </div>
                        <span className={`font-mono text-base font-black ${timeLeft < 120 ? 'text-red-600 animate-bounce' : 'text-amber-700'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                    {!isExpired && (
                        <button
                            onClick={handleManualCheck}
                            disabled={checkingStatus || verifying}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {checkingStatus || verifying ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Memeriksa Pembayaran...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons text-lg">check_circle</span>
                                    <span>Saya Sudah Bayar / Cek Status</span>
                                </>
                            )}
                        </button>
                    )}

                    {qrisData.qrisCode && (
                        <button
                            onClick={handleCopyCode}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
                        >
                            <span className="material-icons text-sm">content_copy</span>
                            <span>{copied ? 'Kode QRIS Tersalin!' : 'Salin Text Kode QRIS'}</span>
                        </button>
                    )}
                </div>

                {/* Footer Note */}
                <div className="mt-4 text-center">
                    <p className="text-[11px] text-gray-400">
                        {statusText}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DynaQRISModal;
