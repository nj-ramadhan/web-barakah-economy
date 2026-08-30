import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const PWAInstallGuideModal = ({ isOpen, onClose }) => {
    const [platform, setPlatform] = useState('android'); // 'android' | 'ios' | 'desktop'
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Detect Device Platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);

        if (isIos) {
            setPlatform('ios');
        } else if (isAndroid) {
            setPlatform('android');
        } else {
            setPlatform('desktop');
        }

        // Check if already in standalone mode (installed PWA)
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsInstalled(true);
        }

        // Capture native Android install prompt if available
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleNativeInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
                if (onClose) onClose();
            }
            setDeferredPrompt(null);
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto animate-scale-up flex flex-col relative z-10">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between">

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shrink-0">
                            <span className="material-icons text-2xl">install_mobile</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Pasang Aplikasi Barakah</h3>
                            <p className="text-[11px] text-emerald-100">Cepat, Ringan & Tanpa Play Store / App Store</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Platform Selector Tabs */}
                <div className="flex bg-gray-100 p-1 m-4 mb-2 rounded-2xl">
                    <button
                        onClick={() => setPlatform('android')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            platform === 'android' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="material-icons text-sm">android</span>
                        <span>Android</span>
                    </button>
                    <button
                        onClick={() => setPlatform('ios')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            platform === 'ios' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="material-icons text-sm">apple</span>
                        <span>iOS (iPhone / iPad)</span>
                    </button>
                    <button
                        onClick={() => setPlatform('desktop')}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            platform === 'desktop' ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <span className="material-icons text-sm">laptop</span>
                        <span>Desktop</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 pt-2 flex-1 overflow-y-auto custom-scrollbar text-xs">
                    {/* NATIVE 1-CLICK INSTALL BUTTON (IF SUPPORTED ON ANDROID/CHROME) */}
                    {deferredPrompt && (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="material-icons text-emerald-600">touch_app</span>
                                <div>
                                    <h4 className="font-bold text-xs text-emerald-950">Tombol Cepat Tersedia</h4>
                                    <p className="text-[10px] text-emerald-700">Langsung pasang dalam 1x klik</p>
                                </div>
                            </div>
                            <button
                                onClick={handleNativeInstall}
                                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shrink-0 shadow-sm"
                            >
                                Pasang Sekarang
                            </button>
                        </div>
                    )}

                    {/* ANDROID STEP-BY-STEP */}
                    {platform === 'android' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-700 font-bold mb-1">
                                <span className="material-icons text-emerald-600 text-sm">verified</span>
                                <span>Langkah Pasang di Android (Google Chrome):</span>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Buka Browser Google Chrome</p>
                                        <p className="text-[11px] text-gray-500">Pastikan Anda membuka website <code className="text-emerald-700 font-bold">barakah.cloud</code> di Google Chrome.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Ketuk Menu Titik Tiga (⋮)</p>
                                        <p className="text-[11px] text-gray-500">Ketuk ikon menu titik tiga <span className="font-black text-gray-800">⋮</span> di pojok kanan atas browser.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-bold text-emerald-950">Pilih "Install Aplikasi" / "Tambahkan ke Layar Utama"</p>
                                        <p className="text-[11px] text-emerald-800">Ketuk menu <b>"Install aplikasi"</b> atau <b>"Tambahkan ke Layar Utama" (Add to Home screen)</b>.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        4
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Konfirmasi "Install"</p>
                                        <p className="text-[11px] text-gray-500">Ikon aplikasi Barakah Economy akan langsung muncul di menu & layar HP Anda layaknya aplikasi native tanpa memakan memori besar!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* IOS / IPHONE STEP-BY-STEP */}
                    {platform === 'ios' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-700 font-bold mb-1">
                                <span className="material-icons text-blue-600 text-sm">verified</span>
                                <span>Langkah Pasang di iPhone / iPad (Safari):</span>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Buka Browser Safari</p>
                                        <p className="text-[11px] text-gray-500">Buka website <code className="text-blue-700 font-bold">barakah.cloud</code> wajib menggunakan browser bawaan <b>Safari</b>.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Ketuk Tombol Share (Bagikan)</p>
                                        <p className="text-[11px] text-gray-500">Ketuk ikon <b>Share</b> (kotak dengan panah ke atas <span className="font-bold">↑</span>) di bilah bawah browser Safari.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200">
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-bold text-blue-950">Pilih "Add to Home Screen" (+)</p>
                                        <p className="text-[11px] text-blue-800">Gulir ke bawah dan ketuk opsi <b>"Add to Home Screen" (Tambah ke Layar Utama)</b>.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        4
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Ketuk "Add" (Tambah) di Kanan Atas</p>
                                        <p className="text-[11px] text-gray-500">Aplikasi Barakah Economy siap dibuka kapan saja langsung dari homescreen iOS Anda dengan tampilan layar penuh mandiri (*fullscreen app*)!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DESKTOP (CHROME / EDGE) STEP-BY-STEP */}
                    {platform === 'desktop' && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-700 font-bold mb-1">
                                <span className="material-icons text-teal-600 text-sm">verified</span>
                                <span>Langkah Pasang di Laptop / Komputer (Chrome / Edge):</span>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Perhatikan Address Bar (Bilah Alamat Browser)</p>
                                        <p className="text-[11px] text-gray-500">Pada browser Chrome atau Edge di komputer, perhatikan sisi kanan bilah alamat URL.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-teal-50/70 border border-teal-200">
                                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-bold text-teal-950">Klik Ikon "Install Aplikasi" (🖥️ atau ⊕)</p>
                                        <p className="text-[11px] text-teal-800">Klik ikon instalasi di samping bintang bookmark atau dari Menu (⋮) &gt; <b>"Install Barakah App"</b>.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs shrink-0">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Selesai & Buka Seperti Aplikasi Desktop</p>
                                        <p className="text-[11px] text-gray-500">Aplikasi akan memiliki jendela mandiri di taskbar & start menu tanpa bilah navigasi browser.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advantages Box */}
                    <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                        <h5 className="font-bold text-emerald-950 text-[11px] mb-1 flex items-center gap-1">
                            <span className="material-icons text-xs text-emerald-700">bolt</span>
                            <span>Keunggulan Aplikasi PWA:</span>
                        </h5>
                        <ul className="text-[10px] text-emerald-900/80 space-y-0.5 list-disc pl-3.5">
                            <li>Ukuran sangat ringan (&lt; 2 MB), tidak membebani memori HP.</li>
                            <li>Pembaruan otomatis tanpa perlu unduh update manual di store.</li>
                            <li>Tampilan *fullscreen standalone* seperti aplikasi Play Store / App Store.</li>
                        </ul>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm"
                    >
                        Mengerti
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PWAInstallGuideModal;

