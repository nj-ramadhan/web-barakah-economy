import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE_URL;

const Footer = () => {
    const [aboutUs, setAboutUs] = useState(null);

    useEffect(() => {
        const fetchAboutUs = async () => {
            try {
                const res = await axios.get(`${API}/api/site-content/about-us/`);
                const items = Array.isArray(res.data) ? res.data : (res.data.results ? res.data.results : []);
                if (items.length > 0 && items[0]) {
                    setAboutUs(items[0]);
                }
            } catch (err) {
                console.error('Error fetching about us in mobile Footer:', err);
            }
        };
        fetchAboutUs();
    }, []);

    const formatSocialLink = (url, platform) => {
        if (!url) return '';
        const trimmed = String(url).trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
        const cleanHandle = trimmed.replace(/^@/, '');
        switch (platform) {
            case 'instagram':
                return `https://instagram.com/${cleanHandle}`;
            case 'youtube':
                return `https://youtube.com/${trimmed.startsWith('@') ? trimmed : '@' + trimmed}`;
            case 'tiktok':
                return `https://tiktok.com/@${cleanHandle}`;
            case 'linkedin':
                return `https://linkedin.com/${trimmed.startsWith('in/') || trimmed.startsWith('company/') ? trimmed : 'company/' + trimmed}`;
            case 'facebook':
                return `https://facebook.com/${cleanHandle}`;
            default:
                return `https://${trimmed}`;
        }
    };

    const whatsappLink = aboutUs?.whatsapp_number
        ? `https://wa.me/${aboutUs.whatsapp_number.replace(/\D/g, '')}`
        : 'https://wa.me/6285643848251';

    const instagramLink = formatSocialLink(aboutUs?.instagram_url, 'instagram') || 'https://instagram.com/bae.community_';
    const youtubeLink = formatSocialLink(aboutUs?.youtube_url, 'youtube') || 'https://youtube.com/@barakaheconomy';
    const tiktokLink = formatSocialLink(aboutUs?.tiktok_url, 'tiktok') || 'https://tiktok.com/@barakaheconomy';
    const linkedinLink = formatSocialLink(aboutUs?.linkedin_url, 'linkedin') || 'https://linkedin.com/company/barakah-economy';
    const facebookLink = formatSocialLink(aboutUs?.facebook_url, 'facebook');

    return (
        <footer className="bg-green-900 text-green-100 p-8 pb-32 border-t border-green-800">
            <div className="flex flex-col gap-6">
                <div>
                    <Link to="/" className="flex items-center gap-2 mb-2.5">
                        <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain bg-white rounded-full p-1 shadow-sm" onError={(e) => { e.target.src = '/icon-512x512.png'; }} />
                        <span className="text-base font-black text-white tracking-tight uppercase">Barakah Economy</span>
                    </Link>
                    <p className="text-green-200 text-xs leading-relaxed mb-2.5">
                        {aboutUs?.footer_tagline || 'Wadah kolaborasi pemuda dan mahasiswa membangun ekosistem ekonomi Islam yang adil, mandiri, dan berkeberkahan.'}
                    </p>
                    <Link to="/about" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition">
                        <span>Tentang Komunitas Kami</span>
                        <span className="material-icons text-xs">arrow_forward</span>
                    </Link>

                    {/* Media Sosial */}
                    <div className="mt-4 pt-3.5 border-t border-green-800/60">
                        <span className="text-[11px] font-bold text-green-300 uppercase tracking-wider block mb-2.5">
                            Ikuti Media Sosial Kami
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <a
                                href={instagramLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-xl bg-green-800/80 hover:bg-emerald-600 text-green-200 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                                title="Instagram @bae.community_"
                                aria-label="Instagram"
                            >
                                <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                </svg>
                            </a>
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-xl bg-green-800/80 hover:bg-emerald-600 text-green-200 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                                title="WhatsApp BAE Community"
                                aria-label="WhatsApp"
                            >
                                <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                </svg>
                            </a>
                            <a
                                href={youtubeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-xl bg-green-800/80 hover:bg-emerald-600 text-green-200 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                                title="YouTube Barakah Economy"
                                aria-label="YouTube"
                            >
                                <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            </a>
                            <a
                                href={tiktokLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-xl bg-green-800/80 hover:bg-emerald-600 text-green-200 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                                title="TikTok Barakah Economy"
                                aria-label="TikTok"
                            >
                                <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.77 1.25-.04 2.4-1.04 2.6-2.28.12-.66.07-1.35.07-2.02V.02z"/>
                                </svg>
                            </a>
                            <a
                                href={linkedinLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-9 h-9 rounded-xl bg-green-800/80 hover:bg-emerald-600 text-green-200 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                                title="LinkedIn Barakah Economy"
                                aria-label="LinkedIn"
                            >
                                <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                                </svg>
                            </a>
                            {facebookLink && (
                                <a
                                    href={facebookLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 rounded-xl bg-green-800/80 hover:bg-emerald-600 text-green-200 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 group"
                                    title="Facebook Barakah Economy"
                                    aria-label="Facebook"
                                >
                                    <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-green-800/60 pt-4">
                    <h4 className="text-sm font-bold text-white mb-2.5">Hubungi Kami</h4>
                    <ul className="space-y-2 text-xs text-green-200">
                        <li className="flex items-start gap-2">
                            <span className="material-icons text-sm mt-0.5">location_on</span>
                            <span>{aboutUs?.office_address || 'Jl. Tubagus Ismail Dalam No.19C, Bandung'}</span>
                        </li>
                        {aboutUs?.contact_email && (
                            <li className="flex items-center gap-2">
                                <span className="material-icons text-sm">email</span>
                                <a href={`mailto:${aboutUs.contact_email}`} className="hover:text-white transition">{aboutUs.contact_email}</a>
                            </li>
                        )}
                        {aboutUs?.contact_phone && (
                            <li className="flex items-center gap-2">
                                <span className="material-icons text-sm">phone</span>
                                <a href={`tel:${aboutUs.contact_phone}`} className="hover:text-white transition">{aboutUs.contact_phone}</a>
                            </li>
                        )}
                        <li className="flex items-center gap-2">
                            <span className="material-icons text-sm">chat</span>
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                                WhatsApp: {aboutUs?.whatsapp_number || '+62 856-4384-8251'}
                            </a>
                        </li>
                    </ul>
                </div>

                <div className="border-t border-green-800/60 pt-4 text-center text-[10px] text-green-300">
                    &copy; 2025 Barakah Economy Community. All Right Reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;