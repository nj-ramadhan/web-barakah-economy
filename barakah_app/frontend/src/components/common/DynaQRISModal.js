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
    onPaymentSuccess,
    onCancel,
    onRefreshQRIS
}) => {
    const [timeLeft, setTimeLeft] = useState(qrisData?.timeoutSeconds || 300);
    const [isExpired, setIsExpired] = useState(false);
    const [copied, setCopied] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [statusText, setStatusText] = useState('Menunggu Pembayaran...');
    const timerRef = useRef(null);
    const pollRef = useRef(null);
    const isVerifiedRef = useRef(false);

    const handleCloseModal = () => {
        onClose();
    };

    useEffect(() => {
        if (!isOpen || !qrisData) return;

        isVerifiedRef.current = false;
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
                    setStatusText('Waktu pembayaran QRIS telah habis. Klik "Buat Ulang QRIS" untuk timer baru atau cek status jika sudah transfer.');
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
                        isVerifiedRef.current = true;
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
                setStatusText('Pembayaran belum terdeteksi oleh sistem. Mohon pastikan Anda sudah mentransfer sesuai nominal QRIS dan tunggu notifikasi masuk.');
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
        <div className="fixed inset-0 z-[999999] flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 pt-16 sm:pt-6 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative border border-emerald-100 transform transition-all my-auto max-h-[85vh] overflow-y-auto custom-scrollbar">
                {/* Sticky Top Close Header */}
                <div className="sticky top-0 z-50 flex items-center justify-between bg-white/95 backdrop-blur-xs pt-1 pb-3 -mt-1 -mr-1 mb-3 border-b border-gray-100">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-icons text-base text-emerald-600">qr_code_2</span>
                        Pembayaran QRIS
                    </span>
                    <button
                        type="button"
                        onClick={handleCloseModal}
                        className="text-gray-600 hover:text-gray-900 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition shadow-sm border border-gray-200 active:scale-95 shrink-0"
                        title="Tutup Modal"
                    >
                        <span className="material-icons text-base">close</span>
                    </button>
                </div>

                {/* Header Subtitle */}
                <div className="text-center mb-4">
                    <h3 className="text-xl font-black text-gray-800">Scan untuk Membayar</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Buka BCA Mobile, GoPay, OVO, Dana, ShopeePay, atau m-Banking Anda
                    </p>
                </div>

                {/* Amount Display with Transparent Halal System Fee Breakdown */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-2xl p-4 text-center mb-4 shadow-lg">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-100">Total Nominal Pembayaran</p>
                    <h2 className="text-3xl font-black mt-1 font-mono">
                        Rp {formatCurrency(qrisData.amount || amount || 0)}
                    </h2>
                    <p className="text-[11px] text-emerald-100/90 mt-1 font-medium">Nominal pas otomatis terdeteksi saat di-scan</p>

                    {/* Breakdown Biaya Layanan jika ada kode unik */}
                    {Number(qrisData?.uniqueCode) > 0 && (
                        <div className="mt-3 pt-3 border-t border-emerald-500/40 text-[11px] space-y-1 text-left bg-emerald-800/30 p-2.5 rounded-xl">
                            <div className="flex justify-between text-emerald-100">
                                <span>Tagihan Pokok:</span>
                                <span className="font-bold">Rp {formatCurrency(qrisData.baseAmount || (amount - qrisData.uniqueCode))}</span>
                            </div>
                            <div className="flex justify-between text-emerald-200">
                                <span>Biaya Layanan & Admin Sistem:</span>
                                <span className="font-bold">+Rp {formatCurrency(qrisData.uniqueCode)}</span>
                            </div>
                            <p className="text-[9px] text-emerald-200/80 italic mt-1 leading-tight">
                                * Akad Ijarah (Ujrah): Biaya pemeliharaan infrastruktur & transaksi.
                            </p>
                        </div>
                    )}
                </div>

                {/* QR Code Container */}
                <div className="relative flex flex-col items-center justify-center mb-5">
                    {isExpired ? (
                        <div className="w-64 h-64 bg-red-50/70 rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-red-300 space-y-2">
                            <span className="material-icons text-4xl text-red-500">timer_off</span>
                            <p className="font-bold text-red-700 text-sm">Sesi QRIS Telah Berakhir</p>
                            <p className="text-xs text-gray-600">Pesanan tetap tersimpan. Klik tombol di bawah untuk mendapatkan kode QRIS baru.</p>
                            {onRefreshQRIS && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsExpired(false);
                                        onRefreshQRIS();
                                    }}
                                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition"
                                >
                                    <span className="material-icons text-sm">refresh</span>
                                    Buat Ulang QRIS
                                </button>
                            )}
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

                    {qrisData.qrisCode && !isExpired && (
                        <button
                            onClick={handleCopyCode}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2"
                        >
                            <span className="material-icons text-sm">content_copy</span>
                            <span>{copied ? 'Kode QRIS Tersalin!' : 'Salin Text Kode QRIS'}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCloseModal}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md mt-2"
                    >
                        <span className="material-icons text-sm">close</span>
                        <span>TUTUP</span>
                    </button>
                </div>

                {/* Footer Status */}
                <div className="mt-4 text-center">
                    <p className="text-[11px] text-gray-500 font-medium">
                        {statusText}
                    </p>
                </div>

                {/* Informative Helper note */}
                <div className="mt-3 p-2.5 bg-gray-50 border border-gray-200/80 rounded-xl text-left flex items-start gap-2 text-[10px] text-gray-600">
                    <span className="material-icons text-sm text-emerald-600 shrink-0 mt-0.5">info</span>
                    <p>
                        Jika belum sempat menyelesaikan pembayaran, transaksi Anda tetap tersimpan di menu <span className="font-bold text-gray-800">Profil / Riwayat</span> untuk dibayar nanti dengan nominal yang sama atau dibatalkan.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DynaQRISModal;
