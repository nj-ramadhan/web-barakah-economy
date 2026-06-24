import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_BASE_URL;

const DesktopFooter = () => {
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
                console.error('Error fetching about us in DesktopFooter:', err);
            }
        };
        fetchAboutUs();
    }, []);

    const whatsappLink = aboutUs?.whatsapp_number
        ? `https://wa.me/${aboutUs.whatsapp_number.replace(/\D/g, '')}`
        : 'https://wa.me/6285643848251';

    return (
        <footer className="bg-green-900 text-green-100 py-12 px-8 lg:px-24">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1 md:col-span-1">
                    <span className="text-2xl font-bold text-white block mb-4">
                        {aboutUs?.title || 'Barakah Economy'}
                    </span>
                    <p className="text-green-200 text-sm leading-relaxed line-clamp-4">
                        {aboutUs?.description || 'Platform ekosistem ekonomi Islam terintegrasi untuk mewujudkan kesejahteraan umat melalui optimalisasi ZISWAF dan pemberdayaan UMKM.'}
                    </p>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Tautan</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link to="/about" className="hover:text-white transition">Tentang Kami</Link></li>
                        <li><Link to="/charity" className="hover:text-white transition">Charity</Link></li>
                        <li><Link to="/sinergy" className="hover:text-white transition">E-commerce</Link></li>
                        <li><Link to="/academy" className="hover:text-white transition">Academy</Link></li>
                        <li><Link to="/articles" className="hover:text-white transition">Artikel</Link></li>
                        <li><Link to="/digital-products" className="hover:text-white transition">Produk Digital</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Hubungi Kami</h4>
                    <ul className="space-y-2.5 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="material-icons text-sm mt-1">location_on</span>
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
            </div>
            <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-green-800 text-center text-green-300 text-sm">
                &copy; {new Date().getFullYear()} {aboutUs?.title || 'Barakah Economy'}. All rights reserved.
            </div>
        </footer>
    );
};

export default DesktopFooter;
