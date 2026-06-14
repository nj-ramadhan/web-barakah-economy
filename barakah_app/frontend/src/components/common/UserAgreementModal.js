import React, { useState, useRef } from 'react';
import authService from '../../services/auth';

const UserAgreementModal = ({ onAccept }) => {
    const [hasRead, setHasRead] = useState(false);
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollContainerRef = useRef(null);

    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Check if scrolled to the bottom (with 5px buffer to handle pixel rounding)
        const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 5;
        if (isBottom) {
            setHasRead(true);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hasRead || !checked || loading) return;

        setLoading(true);
        try {
            await authService.acceptAgreement();
            onAccept(); // callback to update parent state
        } catch (err) {
            alert('Gagal menyetujui kesepakatan. Silakan coba kembali.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-gray-950/65 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white text-center shrink-0">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <span className="material-icons text-2xl">shield</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider">Lembar Kesepakatan & Ketentuan Data</h2>
                    <p className="text-white/80 text-xs mt-1">Komitmen Keamanan & Privasi Barakah Economy Community</p>
                </div>

                <div className="p-6 flex flex-col overflow-hidden">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Pernyataan Privasi</p>

                    {/* Scrollable Terms Container */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 mb-5 text-[11px] sm:text-xs text-gray-600 leading-relaxed font-sans space-y-4"
                        style={{ maxHeight: '300px' }}
                    >
                        <p className="font-bold text-gray-900">
                            Selamat datang di Barakah Economy Community (BAE). Sebelum Anda melanjutkan untuk menggunakan platform kami, mohon untuk membaca dan memahami Ketentuan Penggunaan dan Kebijakan Perlindungan Data pribadi Anda di bawah ini secara saksama.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <p className="font-extrabold text-gray-900">1. Keamanan dan Perlindungan Data</p>
                                <p>Kami menggunakan enkripsi standar industri dan protokol perlindungan data tingkat tinggi untuk menjaga semua informasi yang masuk ke dalam sistem web ini. Data Anda disimpan di server yang aman dan dilindungi dari upaya akses tanpa izin.</p>
                            </div>

                            <div>
                                <p className="font-extrabold text-gray-900">2. Kerahasiaan Informasi Anggota</p>
                                <p>Informasi pribadi Anda (termasuk Nama Lengkap, Alamat Email, Nomor WhatsApp/HP, Domisili, dan data pendukung lainnya) bersifat rahasia. Kami tidak akan pernah menjual, menyewakan, atau menyebarluaskan data Anda kepada pihak ketiga untuk tujuan komersial atau periklanan eksternal.</p>
                            </div>

                            <div>
                                <p className="font-extrabold text-gray-900">3. Tujuan Penggunaan Data</p>
                                <p>Data pribadi Anda akan digunakan secara terbatas untuk:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Verifikasi keanggotaan dan profil akun Anda di platform Barakah Economy.</li>
                                    <li>Pengiriman tiket masuk, nomor BIB peserta, kuitansi pembayaran infaq/pendaftaran, dan sertifikat event.</li>
                                    <li>Komunikasi resmi dan notifikasi penting via Email atau WhatsApp Blast terkait kegiatan komunitas.</li>
                                </ul>
                            </div>

                            <div>
                                <p className="font-extrabold text-gray-900">4. Hak Pengguna Atas Data Pribadi</p>
                                <p>Setiap anggota memiliki hak penuh untuk mengakses, memperbarui, membatasi penggunaan, atau mengajukan permohonan penghapusan permanen atas data pribadi yang tersimpan di database kami dengan menghubungi Layanan Admin Barakah Economy.</p>
                            </div>

                            <div>
                                <p className="font-extrabold text-gray-900">5. Kepatuhan Regulasi (Hukum)</p>
                                <p>Pengolahan data pribadi ini tunduk pada Undang-Undang Perlindungan Data Pribadi (UU PDP) yang berlaku di Republik Indonesia serta aturan tata kelola internal Barakah Economy Community yang transparan dan akuntabel.</p>
                            </div>
                        </div>

                        <p className="font-bold text-gray-800 pt-2 border-t border-gray-200">
                            Dengan mencentang kotak persetujuan dan mengklik tombol setuju di bawah ini, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan privasi data di atas tanpa paksaan dari pihak mana pun.
                        </p>
                    </div>

                    {/* Checkbox and Submit Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 shrink-0">
                        {!hasRead && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                                <p className="text-[10px] sm:text-xs text-amber-700 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                                    <span className="material-icons text-sm">arrow_downward</span>
                                    Silakan gulir (scroll) teks di atas sampai habis untuk menyetujui.
                                </p>
                            </div>
                        )}

                        <label className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all select-none cursor-pointer ${!hasRead ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' :
                                checked ? 'bg-green-50/50 border-green-500 text-green-900' : 'bg-white border-gray-200 hover:border-green-300'
                            }`}>
                            <input
                                type="checkbox"
                                disabled={!hasRead}
                                checked={checked}
                                onChange={(e) => setChecked(e.target.checked)}
                                className="mt-0.5 rounded text-green-600 focus:ring-green-500 h-4 w-4 shrink-0"
                            />
                            <div className="text-[10px] sm:text-xs font-semibold leading-tight text-gray-700">
                                Saya telah membaca secara lengkap dan menyetujui syarat & ketentuan perlindungan data pribadi di atas.
                            </div>
                        </label>

                        <button
                            type="submit"
                            disabled={!hasRead || !checked || loading}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="flex items-center gap-1">
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Menyimpan...
                                </span>
                            ) : (
                                <>
                                    <span className="material-icons text-sm">verified_user</span>
                                    SAYA SETUJU & LANJUTKAN
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserAgreementModal;
