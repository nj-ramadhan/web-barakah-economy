import React, { useState, useEffect, useRef } from 'react';

const ShareButton = ({ slug, title, type = 'campaign' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Construct the share URL using the backend endpoint to ensure preview generation
    const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

    // Determine share URL based on type
    const shareUrl = type === 'article'
        ? `${baseUrl}/api/articles/share/${slug}/`
        : `${baseUrl}/api/campaigns/share/${slug}/`;

    // Determine WhatsApp text based on type
    const getWhatsAppText = () => {
        if (type === 'article') {
            return `Bismillah, izin share artikel ini ya: ${title}\n\nKlik tautan ini untuk baca selengkapnya:\n${shareUrl}`;
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

