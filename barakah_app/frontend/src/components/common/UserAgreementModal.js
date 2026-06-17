import React, { useState, useRef, useEffect } from 'react';
import authService from '../../services/auth';

const UserAgreementModal = ({ onAccept }) => {
    const [hasRead, setHasRead] = useState(false);
    const [checked, setChecked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agreementData, setAgreementData] = useState({
        title: 'Lembar Kesepakatan & Ketentuan Data',
        subtitle: 'Komitmen Keamanan & Privasi Barakah Economy Community',
        content: '<p>Memuat ketentuan...</p>'
    });
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const API = process.env.REACT_APP_API_BASE_URL || 'https://api.barakah.cloud';
                const res = await fetch(`${API}/api/auth/user-agreement/`);
                const data = await res.json();
                if (data && data.content) {
                    setAgreementData(data);
                }
            } catch (err) {
                console.error('Failed to load user agreement:', err);
            }
        };
        fetchContent();
    }, []);

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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4 bg-gray-950/65 backdrop-blur-md animate-in fade-in duration-300">
            <style dangerouslySetInnerHTML={{ __html: `
                .user-agreement-content table {
                    width: 100% !important;
                    max-width: 100% !important;
                    border-collapse: collapse;
                    margin: 10px 0;
                    display: block;
                    overflow-x: auto;
                }
                .user-agreement-content th, .user-agreement-content td {
                    border: 1px solid #e2e8f0;
                    padding: 6px 10px;
                    font-size: 11px;
                }
                .user-agreement-content img {
                    max-width: 100% !important;
                    height: auto !important;
                }
                .user-agreement-content p, .user-agreement-content span, .user-agreement-content div {
                    max-width: 100%;
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    white-space: normal !important;
                }
            ` }} />
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 sm:p-6 text-white text-center shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-inner">
                        <span className="material-icons text-xl sm:text-2xl">shield</span>
                    </div>
                    <h2 className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider leading-snug">{agreementData.title}</h2>
                    <p className="text-white/80 text-[10px] sm:text-xs mt-0.5 sm:mt-1 px-2">{agreementData.subtitle}</p>
                </div>

                <div className="p-4 sm:p-6 flex-1 flex flex-col overflow-hidden min-h-0">
                    <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider mb-1.5 sm:mb-2">Pernyataan Privasi</p>

                    {/* Scrollable Terms Container */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="user-agreement-content flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 border border-gray-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-4 sm:mb-5 text-[11px] sm:text-xs text-gray-600 leading-relaxed font-sans space-y-4 min-h-[90px]"
                        style={{ maxHeight: '320px' }}
                        dangerouslySetInnerHTML={{ __html: agreementData.content }}
                    />

                    {/* Checkbox and Submit Form */}
                    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 shrink-0">
                        {!hasRead && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 sm:p-3 text-center">
                                <p className="text-[10px] sm:text-xs text-amber-700 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                                    <span className="material-icons text-sm">arrow_downward</span>
                                    Silakan gulir (scroll) teks di atas sampai habis untuk menyetujui.
                                </p>
                            </div>
                        )}

                        <label className={`flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border-2 transition-all select-none cursor-pointer ${!hasRead ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-100' :
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
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
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
