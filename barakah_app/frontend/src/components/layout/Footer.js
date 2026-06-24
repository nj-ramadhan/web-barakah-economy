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

    const whatsappLink = aboutUs?.whatsapp_number
        ? `https://wa.me/${aboutUs.whatsapp_number.replace(/\D/g, '')}`
        : 'https://wa.me/6285643848251';

    return (
        <footer className="bg-green-900 text-green-100 p-8 pb-32 border-t border-green-800">
            <div className="flex flex-col gap-6">
                <div>
                    <Link to="/" className="flex items-center gap-2 mb-3">
                        <img src="/logo.png" alt="Barakah Economy" className="h-8 w-8 object-contain bg-white rounded-full p-1" onError={(e) => { e.target.src = '/icon-512x512.png'; }} />
                        <span className="text-base font-black text-white tracking-tighter uppercase">{aboutUs?.title || 'BARAKAH ECONOMY'}</span>
                    </Link>
                    <p className="text-green-200 text-xs leading-relaxed">
                        {aboutUs?.description || 'Platform ekosistem ekonomi Islam terintegrasi untuk mewujudkan kesejahteraan umat melalui optimalisasi ZISWAF dan pemberdayaan UMKM.'}
                    </p>
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
                    &copy; {new Date().getFullYear()} {aboutUs?.title || 'Barakah Economy'}. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;