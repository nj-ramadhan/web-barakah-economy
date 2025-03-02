// pages/AboutUs.js
import React from 'react';
import Header from '../components/layout/Header';
import Navigation from '../components/layout/Navigation';
import '../styles/Body.css';

const AboutUs = () => {
  return (
    <div className="body">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Tentang Kami</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">BAE Community</h2>
          <p className="text-gray-600 mb-4">
            BAE Community berdiri pada tanggal 29 Februari 2024 di Jalan Tubagus Ismail Dalam No.19C dan bertempat di Dago, Kota Bandung, Jawa Barat
            Tujuan BAE Community adalah meningkatkan kestabilan finansial masyarakat melalui pengembangan ekosistem ekonomi yang berlandaskan syariah islam 
            dengan memberdayakan pemuda dan mahasiswa sebagai pionir perubahan.
            BAE Community memiliki tugas pokok menyelenggarakan kegiatan yang bersifat pemberdayaan, pendidikan, kolaborasi, pengembangan serta sosial 
            baik ke dalam yaitu internal komunitas maupun keluar yaitu lingkungan masyarakat.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Visi & Misi</h2>
          <div className="mb-4">
            <h3 className="font-medium mb-1">Visi</h3>
            <p className="text-gray-600">
              Menjadi komunitas yang unggul dalam mengembangkan perekonomian berbasis syariah yang berkeadilan dan berkelanjutan, 
              serta berkontribusi secara aktif dalam kesejahteraan umat
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Misi</h3>
            <ul className="text-gray-600 list-disc pl-4">
              <li>Mendorong Pemberdayaan Ekonomi</li>
              <li>Pendidikan dan Literasi Keuangan Syariah</li>
              <li>Kolaborasi dan Sinergi Antar Komunitas</li>
              <li>Pengembangan Usaha Berbasis Syariah</li>
              <li>Kepedulian Sosial dan Amal</li>
            </ul>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default AboutUs;