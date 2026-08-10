import React, { useState, useEffect, useRef } from 'react';

const ShareButton = ({ slug, title, type = 'campaign', username }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Use current origin so share URLs are clean frontend URLs without /api/
    const baseUrl = window.location.origin;

    // Determine share URL based on type (clean frontend URLs)
    let shareUrl = '';
    if (type === 'product') {
        shareUrl = `${baseUrl}/produk/${slug}`;
    } else if (type === 'article') {
        shareUrl = `${baseUrl}/articles/${slug}`;
    } else if (type === 'event') {
        shareUrl = `${baseUrl}/event/${slug}`;
    } else if (type === 'course') {
        shareUrl = `${baseUrl}/kelas/${slug}`;
    } else if (type === 'digital_product') {
        if (username) {
            shareUrl = `${baseUrl}/digital-produk/${username}/${slug}`;
        } else {
            shareUrl = `${baseUrl}/digital-products/${slug}`;
        }
    } else if (type === 'forum') {
        shareUrl = `${baseUrl}/forum/${slug}`;
    } else if (type === 'activity') {
        shareUrl = `${baseUrl}/kegiatan/${slug}`;
    } else if (type === 'seller') {
        shareUrl = `${baseUrl}/${slug}`;
    } else if (type === 'charity_page') {
        shareUrl = `${baseUrl}/charity`;
    } else {
        // default campaign
        shareUrl = `${baseUrl}/kampanye/${slug}`;
    }

    // Determine WhatsApp text based on type
    const getWhatsAppText = () => {
        if (type === 'product') {
            return `Bismillah, izin share produk ini ya: ${title}\n\nKlik tautan ini untuk lihat detail & beli:\n${shareUrl}`;
        }
        if (type === 'article') {
            return `Bismillah, izin share artikel ini ya: ${title}\n\nKlik tautan ini untuk baca selengkapnya:\n${shareUrl}`;
        }
        if (type === 'event') {
            return `Bismillah, cek event menarik ini ya: ${title}\n\nLihat info selengkapnya & daftar di sini:\n${shareUrl}`;
        }
        if (type === 'course') {
            return `Bismillah, cek e-course bermanfaat ini ya: ${title}\n\nLihat info selengkapnya & daftar di sini:\n${shareUrl}`;
        }
        if (type === 'digital_product') {
            return `Bismillah, cek produk digital ini ya: ${title}\n\nLihat info selengkapnya di sini:\n${shareUrl}`;
        }
        if (type === 'forum') {
            return `Bismillah, simak diskusi ini ya: ${title}\n\nBaca & gabung diskusi di sini:\n${shareUrl}`;
        }
        if (type === 'activity') {
            return `Bismillah, cek kegiatan kebaikan ini ya: ${title}\n\nLihat info selengkapnya di sini:\n${shareUrl}`;
        }
        if (type === 'seller') {
            return `Bismillah, cek profil penjual ini ya: @${slug}\n\nLihat toko & produknya di sini:\n${shareUrl}`;
        }
        if (type === 'charity_page') {
            return `Bismillah, mari bantu sesama melalui program-program kebaikan di Barakah Economy:\n\nLihat semua program di sini:\n${shareUrl}`;
        }
        return `Bismillah, izin share informasi kebaikan ini ya: ${title}\n\nKlik tautan ini untuk lihat detail & donasi:\n${shareUrl}`;
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

    const handleWhatsAppShare = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(getWhatsAppText())}`;
        window.open(whatsappUrl, '_blank');
        setIsOpen(false);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Link tersalin!');
            setIsOpen(false);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
                className="bg-white text-green-800 border border-green-800 p-2 rounded-md hover:bg-green-50 focus:outline-none flex items-center justify-center h-full"
                aria-label="Share"
                title="Bagikan"
            >
                <span className="material-icons">share</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <button
                            onClick={handleWhatsAppShare}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            role="menuitem"
                        >
                            <span className="material-icons text-green-500 mr-2 text-sm">chat</span>
                            WhatsApp
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                            role="menuitem"
                        >
                            <span className="material-icons text-gray-500 mr-2 text-sm">content_copy</span>
                            Salin Link
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShareButton;

