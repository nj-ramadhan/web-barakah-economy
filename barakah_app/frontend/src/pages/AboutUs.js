// pages/AboutUs.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/Body.css';

const AboutUs = () => {
  const location = useLocation();
  const [aboutUs, setAboutUs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/site-content/about-us/`);
        const data = response.data.results || response.data;
        if (Array.isArray(data) && data.length > 0) {
          setAboutUs(data[0]);
        } else if (data && !Array.isArray(data)) {
          setAboutUs(data);
        }
      } catch (err) {
        console.error('Error fetching about us:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAboutUs();
  }, []);

  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.REACT_APP_API_BASE_URL}${url}`;
  };

  return (
    <div className="body">
      <Helmet>
        <meta name="description" content="Tentang BAE Community" />
        <meta property="og:title" content="Tentang BAE Community" />
        <meta property="og:description" content="Tentang BAE Community" />
        <meta property="og:image" content="%PUBLIC_URL%/images/web-thumbnail.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      <Header />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4">Tentang Kami</h1>

        {aboutUs?.hero_image && (
          <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6 shadow-md">
            <img src={getMediaUrl(aboutUs.hero_image)} alt="Barakah Economy" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">{aboutUs?.title || 'BAE Community'}</h2>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {aboutUs?.description || `BAE Community berdiri pada tanggal 29 Februari 2024 di Jalan Tubagus Ismail Dalam No.19C dan bertempat di Dago, Kota Bandung, Jawa Barat. Tujuan BAE Community adalah meningkatkan kestabilan finansial masyarakat melalui pengembangan ekosistem ekonomi yang berlandaskan syariah islam dengan memberdayakan pemuda dan mahasiswa sebagai pionir perubahan. BAE Community memiliki tugas pokok menyelenggarakan kegiatan yang bersifat pemberdayaan, pendidikan, kolaborasi, pengembangan serta sosial baik ke dalam yaitu internal komunitas maupun keluar yaitu lingkungan masyarakat.`}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">Visi & Misi</h2>
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Visi</h3>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              {aboutUs?.vision || `Menjadi komunitas yang unggul dalam mengembangkan perekonomian berbasis syariah yang berkeadilan dan berkelanjutan, serta berkontribusi secara aktif dalam kesejahteraan umat`}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">Misi</h3>
            {aboutUs?.mission ? (
              <div className="text-sm text-gray-600 whitespace-pre-line">
                {aboutUs.mission}
              </div>
            ) : (
              <ul className="text-sm text-gray-600 list-disc pl-4">
                <li>Mendorong Pemberdayaan Ekonomi</li>
                <li>Pendidikan dan Literasi Keuangan Syariah</li>
                <li>Kolaborasi dan Sinergi Antar Komunitas</li>
                <li>Pengembangan Usaha Berbasis Syariah</li>
                <li>Kepedulian Sosial dan Amal</li>
              </ul>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Hubungi Kami</h2>
          <Link
            to="/hubungi-kami"
            className={`flex flex-col items-center ${
              location.pathname === '/hubungi-kami' ? 'text-green-600' : 'text-gray-600'
            }`}
          >
            <span className="material-icons">phone</span>
            <span className="text-xs">Kontak</span>
          </Link>
        </div>
      </div>
      <NavigationButton />
    </div>
  );
};

export default AboutUs;