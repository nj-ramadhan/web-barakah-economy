import React from 'react';
import { Link } from 'react-router-dom';

const DesktopFooter = () => {
    return (
        <footer className="bg-green-900 text-green-100 py-12 px-8 lg:px-24">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-1 md:col-span-1">
                    <span className="text-2xl font-bold text-white block mb-4">Barakah Economy</span>
                    <p className="text-green-200 text-sm leading-relaxed">Platform ekosistem ekonomi Islam terintegrasi untuk mewujudkan kesejahteraan umat melalui optimalisasi ZISWAF dan pemberdayaan UMKM.</p>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Tautan</h4>
                    <ul className="space-y-2 text-sm">
                        <li><Link to="/#about" className="hover:text-white transition">Tentang Kami</Link></li>
                        <li><Link to="/charity" className="hover:text-white transition">Charity</Link></li>
                        <li><Link to="/sinergy" className="hover:text-white transition">Sinergy</Link></li>
                        <li><Link to="/academy" className="hover:text-white transition">Academy</Link></li>
                        <li><Link to="/articles" className="hover:text-white transition">Artikel</Link></li>
                        <li><Link to="/digital-products" className="hover:text-white transition">Produk Digital</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Hubungi Kami</h4>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2"><span className="material-icons text-sm">location_on</span> Jl. Tubagus Ismail Dalam No.19C, Bandung</li>
                        <li><Link to="/hubungi-kami" className="hover:text-white transition flex items-center gap-2"><span className="material-icons text-sm">email</span> Kontak Kami</Link></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-green-800 text-center text-green-300 text-sm">
                &copy; {new Date().getFullYear()} Barakah Economy. All rights reserved.
            </div>
        </footer>
    );
};

export default DesktopFooter;
