import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Helmet } from 'react-helmet';
import Header from '../../components/layout/Header';
import NavigationButton from '../../components/layout/Navigation';

const AdminPhotoFramerPage = () => {
    const [photos, setPhotos] = useState([]);
    const [frame, setFrame] = useState(null);
    const [framePreview, setFramePreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [zipUrl, setZipUrl] = useState(null);

    const photoInputRef = useRef(null);
    const frameInputRef = useRef(null);

    const handlePhotoSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setPhotos(files);
            setZipUrl(null);
        }
    };

    const handleFrameSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'image/png') {
                alert('Silakan pilih file PNG transparan untuk bingkai.');
                return;
            }
            setFrame(file);
            const reader = new FileReader();
            reader.onload = (ev) => setFramePreview(ev.target.result);
            reader.readAsDataURL(file);
            setZipUrl(null);
        }
    };

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = url;
        });

    const processImages = async () => {
        if (photos.length === 0 || !frame) {
            setError('Pilih minimal satu foto dan satu bingkai.');
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setError(null);
        setZipUrl(null);

        const zip = new JSZip();
        const frameUrl = URL.createObjectURL(frame);
        const frameImg = await createImage(frameUrl);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Output size is based on the frame size to ensure no resolution loss of the frame
        canvas.width = frameImg.width;
        canvas.height = frameImg.height;

        try {
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                const photoUrl = URL.createObjectURL(photo);
                const photoImg = await createImage(photoUrl);

                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Draw Photo (Aspect Fill / Center Crop to fit frame)
                const frameRatio = canvas.width / canvas.height;
                const photoRatio = photoImg.width / photoImg.height;

                let drawW, drawH, drawX, drawY;

                if (photoRatio > frameRatio) {
                    // Photo is wider than frame
                    drawH = canvas.height;
                    drawW = photoImg.width * (canvas.height / photoImg.height);
                    drawX = (canvas.width - drawW) / 2;
                    drawY = 0;
                } else {
                    // Photo is taller than frame
                    drawW = canvas.width;
                    drawH = photoImg.height * (canvas.width / photoImg.width);
                    drawX = 0;
                    drawY = (canvas.height - drawH) / 2;
                }

                ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);

                // Draw Frame
                ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

                // Export as Blob
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
                zip.file(`framed_${photo.name.split('.')[0]}.jpg`, blob);

                // Cleanup photo URL
                URL.revokeObjectURL(photoUrl);
                
                setProgress(Math.round(((i + 1) / photos.length) * 100));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            setZipUrl(url);
            
            // Auto download
            const link = document.createElement('a');
            link.href = url;
            link.download = `batch_framed_${new Date().getTime()}.zip`;
            link.click();

        } catch (err) {
            console.error(err);
            setError('Terjadi kesalahan saat memproses gambar.');
        } finally {
            URL.revokeObjectURL(frameUrl);
            setIsProcessing(false);
        }
    };

    return (
        <div className="body bg-gray-50 min-h-screen">
            <Helmet>
                <title>Bingkai Foto Otomatis - Admin Barakah</title>
            </Helmet>
            <Header />

            <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">Bingkai Foto Otomatis</h1>
                    <p className="text-sm text-gray-500">Pasang bingkai ke banyak foto sekaligus tanpa mengurangi kualitas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Side: Frame Selection */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="w-full mb-4">
                            <h3 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">1. Pilih Bingkai (PNG)</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">Pilih bingkai transparan. Ukuran output akan mengikuti ukuran bingkai ini.</p>
                        </div>

                        <div 
                            className="w-full aspect-[4/5] bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-all"
                            onClick={() => frameInputRef.current.click()}
                        >
                            {framePreview ? (
                                <img src={framePreview} alt="Frame Preview" className="w-full h-full object-contain p-4" />
                            ) : (
                                <>
                                    <span className="material-icons text-4xl text-gray-300 mb-2 group-hover:scale-110 transition-transform">filter_frames</span>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Klik untuk Pilih Bingkai</p>
                                </>
                            )}
                            <input 
                                type="file" 
                                ref={frameInputRef} 
                                className="hidden" 
                                accept="image/png" 
                                onChange={handleFrameSelect} 
                            />
                        </div>
                        {frame && (
                            <div className="mt-3 flex items-center gap-2 bg-pink-100 px-3 py-1 rounded-full border border-pink-200">
                                <span className="material-icons text-[12px] text-pink-700">check_circle</span>
                                <p className="text-[10px] font-bold text-pink-800 truncate max-w-[150px]">{frame.name}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Photos Selection */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="w-full mb-4">
                            <h3 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">2. Pilih Foto (Batch)</h3>
                            <p className="text-[10px] text-gray-400 leading-relaxed">Pilih satu atau banyak foto yang ingin dipasangkan bingkai.</p>
                        </div>

                        <div 
                            className="w-full aspect-[4/5] bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                            onClick={() => photoInputRef.current.click()}
                        >
                            {photos.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 p-4 w-full h-full content-start overflow-y-auto">
                                    {photos.slice(0, 9).map((f, i) => (
                                        <div key={i} className="aspect-square bg-gray-200 rounded-lg overflow-hidden border border-white shadow-sm relative">
                                            <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="prev" />
                                            {i === 8 && photos.length > 9 && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black">
                                                    +{photos.length - 9}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <span className="material-icons text-4xl text-gray-300 mb-2 group-hover:scale-110 transition-transform">add_a_photo</span>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Klik untuk Pilih Foto</p>
                                </>
                            )}
                            <input 
                                type="file" 
                                ref={photoInputRef} 
                                className="hidden" 
                                accept="image/*" 
                                multiple 
                                onChange={handlePhotoSelect} 
                            />
                        </div>
                        {photos.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                                <span className="material-icons text-[12px] text-blue-700">collections</span>
                                <p className="text-[10px] font-bold text-blue-800">{photos.length} Foto Terpilih</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Actions */}
                <div className="mt-10 flex flex-col items-center gap-4">
                    {isProcessing ? (
                        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center animate-pulse">
                            <div className="w-16 h-16 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons text-3xl animate-bounce">auto_fix_high</span>
                            </div>
                            <h4 className="font-black text-gray-800 mb-2">Memproses Gambar...</h4>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                                <div 
                                    className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{progress}% SELESAI</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="w-full max-w-md bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold text-center border border-red-100 mb-4 flex items-center justify-center gap-2">
                                    <span className="material-icons text-sm">error</span>
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={processImages}
                                disabled={photos.length === 0 || !frame}
                                className={`group relative w-full max-w-md py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 shadow-2xl ${
                                    photos.length > 0 && frame 
                                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:shadow-pink-200 hover:-translate-y-1' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                }`}
                            >
                                <span className="flex items-center justify-center gap-3">
                                    <span className="material-icons text-lg group-hover:rotate-12 transition-transform">auto_fix_high</span>
                                    MULAI PASANG BINGKAI
                                </span>
                            </button>

                            {zipUrl && (
                                <a
                                    href={zipUrl}
                                    download={`framed_photos_${new Date().getTime()}.zip`}
                                    className="flex items-center gap-2 text-pink-600 font-bold text-xs hover:underline mt-2"
                                >
                                    <span className="material-icons text-sm">download</span>
                                    Unduh Ulang ZIP
                                </a>
                            )}
                        </>
                    )}
                </div>

                <div className="mt-16 p-8 bg-amber-50/50 rounded-[3rem] border border-amber-100/50 max-w-2xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shadow-sm">
                            <span className="material-icons">lightbulb</span>
                        </div>
                        <h4 className="font-black text-amber-900 text-sm tracking-tight">Tips Hasil Sempurna</h4>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex gap-3 items-start">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0"></span>
                            <p className="text-xs text-amber-800/80 leading-relaxed">Gunakan bingkai dengan format <span className="font-black">PNG Transparan</span> agar foto di bawahnya terlihat.</p>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0"></span>
                            <p className="text-xs text-amber-800/80 leading-relaxed">Untuk hasil terbaik, gunakan bingkai dengan resolusi tinggi (misal: 1080x1080 atau 1080x1350).</p>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0"></span>
                            <p className="text-xs text-amber-800/80 leading-relaxed">Foto akan dipotong otomatis di bagian tengah (<span className="font-black">Center Crop</span>) untuk menyesuaikan rasio bingkai.</p>
                        </li>
                        <li className="flex gap-3 items-start">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0"></span>
                            <p className="text-xs text-amber-800/80 leading-relaxed">Proses dilakukan sepenuhnya di browser Anda, <span className="font-black">Data Aman</span> dan tidak dikirim ke server.</p>
                        </li>
                    </ul>
                </div>
            </div>
            <NavigationButton />
        </div>
    );
};

export default AdminPhotoFramerPage;
