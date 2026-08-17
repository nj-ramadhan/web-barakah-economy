import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../../utils/formatters';

const ShareButton = ({ 
    slug, 
    title, 
    type = 'campaign', 
    username, 
    price = null, 
    description = '', 
    variant = 'icon', 
    className = '' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef(null);

    // API domain for Open Graph HTML rendering & instant redirection to barakah.cloud
    const shareBaseUrl = 'https://api.barakah.cloud';

    // Determine share URL based on type
    let shareUrl = '';
    if (type === 'product' || type === 'sinergy') {
        shareUrl = `${shareBaseUrl}/sinergy/${slug}`;
    } else if (type === 'article') {
        shareUrl = `${shareBaseUrl}/articles/${slug}`;
    } else if (type === 'event') {
        shareUrl = `${shareBaseUrl}/event/${slug}`;
    } else if (type === 'course') {
        shareUrl = `${shareBaseUrl}/kelas/${slug}`;
    } else if (type === 'digital_product') {
        if (username) {
            shareUrl = `${shareBaseUrl}/digital-produk/${username}/${slug}`;
        } else {
            shareUrl = `${shareBaseUrl}/digital-products/${slug}`;
        }
    } else if (type === 'forum') {
        shareUrl = `${shareBaseUrl}/forum/${slug}`;
    } else if (type === 'activity') {
        shareUrl = `${shareBaseUrl}/kegiatan/${slug}`;
    } else if (type === 'seller') {
        shareUrl = `${shareBaseUrl}/${slug}`;
    } else if (type === 'charity_page') {
        shareUrl = `https://barakah.cloud/charity`;
    } else {
        // default campaign
        shareUrl = `${shareBaseUrl}/kampanye/${slug}`;
    }

    // Clean plain text description
    const getCleanDescription = () => {
        if (!description) return '';
        const plain = description.replace(/<[^>]*>?/gm, '').trim();
        return plain.length > 120 ? plain.substring(0, 117) + '...' : plain;
    };

    // Determine WhatsApp text based on type
    const getWhatsAppText = () => {
        const cleanDesc = getCleanDescription();
        const priceStr = price ? `💰 Harga: Rp ${formatCurrency(price)}\n` : '';
        const descStr = cleanDesc ? `📝 ${cleanDesc}\n` : '';

        if (type === 'product' || type === 'sinergy') {
            return `*Beli ${title} di Barakah Economy*\n${priceStr}${descStr}\nLihat detail & pesan sekarang:\n${shareUrl}`;
        }
        if (type === 'article') {
            return `*${title}*\n${descStr}\nBaca selengkapnya di Barakah Economy:\n${shareUrl}`;
        }
        if (type === 'event') {
            return `*Event: ${title}*\n${descStr}\nLihat info & daftar di sini:\n${shareUrl}`;
        }
        if (type === 'course') {
            return `*E-Course: ${title}*\n${priceStr}${descStr}\nLihat info & ikuti kelas di sini:\n${shareUrl}`;
        }
        if (type === 'digital_product') {
            return `*Produk Digital: ${title}*\n${priceStr}${descStr}\nLihat & unduh di sini:\n${shareUrl}`;
        }
        if (type === 'forum') {
            return `*Diskusi Forum: ${title}*\n${descStr}\nBaca & ikut berdiskusi di sini:\n${shareUrl}`;
        }
        if (type === 'activity') {
            return `*Kegiatan: ${title}*\n${descStr}\nLihat dokumentasi selengkapnya:\n${shareUrl}`;
        }
        if (type === 'seller') {
            return `*Kunjungi Toko @${slug} di Barakah Economy*\n\nLihat semua produk dan profil toko di sini:\n${shareUrl}`;
        }
        if (type === 'charity_page') {
            return `*Mari Berbagi Kebaikan Bersama Barakah Charity*\n\nSalurkan donasi terbaik Anda melalui program-program kebaikan:\n${shareUrl}`;
        }
        return `*Program Donasi: ${title}*\n${descStr}\nSalurkan kebaikan & donasi sekarang:\n${shareUrl}`;
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleWhatsAppShare = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(getWhatsAppText())}`;
        window.open(whatsappUrl, '_blank');
        setIsOpen(false);
    };

    const handleCopyLink = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setIsOpen(false);
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    const handleNativeShare = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: getWhatsAppText(),
                    url: shareUrl
                });
                return;
            } catch (err) {
                // User dismissed or aborted share, do nothing or fallback
                if (err.name !== 'AbortError') {
                    setIsOpen(!isOpen);
                }
                return;
            }
        }
        setIsOpen(!isOpen);
    };

    // Render trigger button depending on variant
    const renderTrigger = () => {
        if (variant === 'button') {
            return (
                <button
                    onClick={handleNativeShare}
                    className={`px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${className}`}
                    aria-label="Share"
                    title="Bagikan"
                >
                    <span className="material-icons text-base text-emerald-600">share</span>
                    <span>Bagikan</span>
                </button>
            );
        }

        if (variant === 'card-icon') {
            return (
                <button
                    onClick={handleNativeShare}
                    className={`w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 flex items-center justify-center transition-all active:scale-90 ${className}`}
                    aria-label="Share"
                    title="Bagikan produk ini"
                >
                    <span className="material-icons text-sm">share</span>
                </button>
            );
        }

        // Default 'icon' variant
        return (
            <button
                onClick={handleNativeShare}
                className={`w-10 h-10 bg-white text-emerald-800 border border-emerald-300 p-2 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 focus:outline-none flex items-center justify-center transition-all shadow-sm active:scale-90 ${className}`}
                aria-label="Share"
                title="Bagikan"
            >
                <span className="material-icons text-lg">share</span>
            </button>
        );
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            {renderTrigger()}

            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-52 rounded-2xl shadow-xl bg-white ring-1 ring-black/5 z-50 border border-gray-100 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Bagikan ke
                    </div>
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <button
                            onClick={handleWhatsAppShare}
                            className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition-colors"
                            role="menuitem"
                        >
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <span className="material-icons text-sm">chat</span>
                            </span>
                            <span>WhatsApp</span>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                            role="menuitem"
                        >
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                                <span className="material-icons text-sm">{copied ? 'check' : 'content_copy'}</span>
                            </span>
                            <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShareButton;

