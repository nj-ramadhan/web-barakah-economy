// pages/AboutUs.js
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../components/layout/Header';
import NavigationButton from '../components/layout/Navigation';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getMediaUrl } from '../utils/mediaUtils';
import '../styles/Body.css';

const AboutUs = () => {
  const [aboutUs, setAboutUs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');

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

  // Hierarchy Tree Logic
  const buildTree = (records) => {
    if (!records) return [];
    const map = {};
    const roots = [];
    const sorted = [...records].sort((a, b) => 
      a.hierarchy_code.localeCompare(b.hierarchy_code, undefined, { numeric: true, sensitivity: 'base' })
    );

    sorted.forEach(val => {
      map[val.hierarchy_code] = { ...val, children: [] };
      const parts = val.hierarchy_code.split('.');
      if (parts.length === 1) {
        roots.push(map[val.hierarchy_code]);
      } else {
        const parentKey = parts.slice(0, -1).join('.');
        if (map[parentKey]) {
          map[parentKey].children.push(map[val.hierarchy_code]);
        } else {
          roots.push(map[val.hierarchy_code]);
        }
      }
    });
    return roots;
  };

  const treeData = buildTree(aboutUs?.personnel);

  const SocialIcon = ({ type }) => {
    switch(type) {
      case 'instagram': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
      case 'facebook': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>;
      case 'linkedin': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>;
      case 'twitter': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
      case 'whatsapp': return <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.888-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>;
      default: return <span className="material-icons text-[20px]">language</span>;
    }
  };

  const PersonnelCard = ({ person }) => (
    <div className="flex flex-col items-center group w-full">
      {/* Card Body */}
      <div className="bg-white p-2.5 md:p-5 rounded-2xl md:rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 w-full min-w-[140px] md:min-w-[180px] max-w-[240px] text-center relative hover:shadow-2xl transition duration-500 transform hover:-translate-y-2 z-10 mx-auto">
        <div className="w-14 h-14 md:w-24 md:h-24 rounded-xl md:rounded-[2rem] aspect-square overflow-hidden mx-auto mb-3 md:mb-5 shadow-xl border-2 md:border-4 border-white ring-2 md:ring-4 ring-gray-50/50 group-hover:ring-green-50 transition-all">
          <img src={getMediaUrl(person.image)} alt={person.name} className="w-full h-full object-cover" />
        </div>
        <h4 className="text-[11px] md:text-lg font-black text-gray-900 mb-0.5 md:mb-1 leading-tight">{person.name}</h4>
        <p className="text-[8px] md:text-xs font-black text-green-600 uppercase tracking-widest mb-2 md:mb-4">{person.job_title}</p>
        
        {person.social_media?.length > 0 && (
          <div className="flex justify-center gap-2 md:gap-4 mt-1 md:mt-2 pt-2 md:pt-4 border-t border-gray-50">
            {person.social_media.map((sm, i) => (
              <a key={i} href={sm.link} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-600 transition transform hover:scale-125 flex items-center justify-center">
                <SocialIcon type={sm.icon} />
              </a>
            ))}
          </div>
        )}
      </div>
      
      {/* Connector and Children */}
      {person.children?.length > 0 && (
        <div className="relative pt-6 md:pt-10 w-full flex flex-col items-center">
          {/* Vertical line from parent */}
          <div className="absolute top-0 left-1/2 w-0.5 h-6 md:h-10 bg-green-200 -ml-[1px]"></div>
          
          <div className="flex justify-center flex-nowrap relative w-full px-2">
             {person.children.map((child, i) => (
               <div key={child.id} className="relative pt-6 md:pt-8 px-2 md:px-6 flex flex-col items-center flex-1 min-w-[150px] md:min-w-[240px]">
                  {/* Horizontal line for siblings */}
                  {person.children.length > 1 && (
                    <>
                      {i === 0 && <div className="absolute top-0 left-1/2 right-0 h-0.5 bg-green-200"></div>}
                      {i === person.children.length - 1 && <div className="absolute top-0 left-0 right-1/2 h-0.5 bg-green-200"></div>}
                      {i > 0 && i < person.children.length - 1 && <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-200"></div>}
                    </>
                  )}
                  {/* Vertical line to child */}
                  <div className="absolute top-0 left-1/2 w-0.5 h-6 md:h-8 bg-green-200 -ml-[1px]"></div>
                  
                  <PersonnelCard person={child} />
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) return (
    <div className="body flex items-center justify-center min-h-screen bg-green-50">
      <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="body bg-[#fcfdfe] min-h-screen">
      <Helmet>
        <title>{aboutUs?.title || 'Tentang Kami'} - Barakah Economy</title>
        <meta name="description" content={aboutUs?.description?.substring(0, 160)} />
      </Helmet>

      <Header />

      {/* Hero Section */}
      <div className="relative h-[35vh] md:h-[50vh] overflow-hidden">
        {aboutUs?.hero_image ? (
          <img 
            src={getMediaUrl(aboutUs.hero_image)} 
            alt="Hero" 
            className="w-full h-full object-cover transform scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-900 to-green-700"></div>
        )}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 drop-shadow-2xl">
            {aboutUs?.title || 'Tentang Kami'}
          </h1>
          <div className="w-24 h-1.5 md:w-32 md:h-2 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-10 pb-40">
        <Link to="/" className="absolute -top-16 left-4 md:left-0 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white hover:bg-white/40 transition border border-white/30">
          <span className="material-icons">arrow_back</span>
        </Link>

        {/* Improved Tabs UI */}
        <div className="bg-white/90 backdrop-blur-2xl p-1.5 md:p-2 rounded-3xl md:rounded-[2.5rem] shadow-2xl shadow-gray-300/40 flex flex-wrap gap-2 mb-12 border border-white sticky top-20 md:top-24 z-30">
          {[
            { id: 'about', label: 'Profil Kami', icon: 'auto_awesome' },
            { id: 'team', label: 'Struktur Team', icon: 'account_tree' },
            { id: 'vision', label: 'Visi & Misi', icon: 'explore' },
            { id: 'legal', label: 'Legalitas', icon: 'verified' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-3 md:py-4 md:px-6 rounded-2xl md:rounded-[2rem] text-xs md:text-sm font-black transition flex items-center justify-center gap-2 md:gap-3 min-w-[120px] ${
                activeTab === tab.id 
                ? 'bg-green-700 text-white shadow-xl shadow-green-100' 
                : 'text-gray-500 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <span className="material-icons text-lg md:text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-20">
          {activeTab === 'about' && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-white rounded-[3rem] px-8 py-10 md:p-14 shadow-2xl shadow-gray-200/30 border border-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-green-50 rounded-full -mr-32 md:-mr-48 -mt-32 md:-mt-48 opacity-50 blur-3xl"></div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                  <span className="w-3 md:w-4 h-8 md:h-12 bg-green-600 rounded-full"></span>
                  Eksistensi Barakah Economy
                </h2>
                <div className="text-base md:text-lg text-gray-600 leading-relaxed space-y-6 max-w-4xl">
                  {aboutUs?.description ? (
                    <div className="whitespace-pre-line">{aboutUs.description}</div>
                  ) : (
                    <p className="animate-pulse">Menghubungkan data...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-16">
              <div className="text-center space-y-3">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">Struktur Organisasi</h2>
                <p className="text-gray-500 font-bold max-w-2xl mx-auto uppercase tracking-widest text-[10px] md:text-xs">Sinergi Pemuda untuk Ekonomi Barakah</p>
              </div>

              {/* Personnel Tree Rendering */}
              <div className="overflow-x-auto pb-20 -mx-4 px-4 scrollbar-hide">
                <div className="min-w-fit flex flex-col items-center">
                   {treeData.map(root => (
                     <PersonnelCard key={root.id} person={root} />
                   ))}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'vision' && (
            <div className="grid md:grid-cols-2 gap-10 animate-in zoom-in-95 duration-500">
                <div className="bg-gradient-to-br from-green-800 to-green-950 rounded-[3rem] px-8 py-10 md:p-14 text-white shadow-2xl shadow-green-100 flex flex-col justify-center relative overflow-hidden">
                  <span className="material-icons absolute -bottom-10 -left-10 text-[200px] opacity-10">center_focus_strong</span>
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
                    Visi
                    <div className="flex-1 h-0.5 bg-white/20"></div>
                  </h3>
                  <p className="text-2xl leading-[1.4] font-black italic">
                    "{aboutUs?.vision || 'Membumikan Ekonomi Syariah.'}"
                  </p>
                </div>

                <div className="bg-white rounded-[3rem] px-8 py-10 md:p-14 shadow-2xl shadow-gray-200/30 border border-gray-100">
                  <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-4">
                    <span className="material-icons text-green-600 text-3xl">rocket_launch</span>
                    Misi Kami
                  </h3>
                  <div className="text-gray-600 text-base md:text-lg leading-relaxed whitespace-pre-line font-medium">
                    {aboutUs?.mission}
                  </div>
                </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="animate-in fade-in slide-in-from-right-10 duration-700">
              <div className="bg-white rounded-[3rem] px-8 py-10 md:p-14 shadow-2xl shadow-gray-200/30 border border-gray-50">
                <div className="text-center mb-10 md:mb-14">
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 md:mb-6">Legalitas Organisasi</h2>
                  <p className="text-gray-500 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
                    {aboutUs?.legal_description || "Memastikan transparansi dan kepatuhan hukum dalam setiap langkah perjuangan kita."}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {aboutUs?.legal_documents?.map((doc) => (
                    <div key={doc.id} className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden border-4 border-gray-50 hover:shadow-2xl transition duration-700 cursor-zoom-in" onClick={() => window.open(getMediaUrl(doc.image), '_blank')}>
                      <img src={getMediaUrl(doc.image)} alt={doc.title} className="w-full h-full object-cover transition-all group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-green-950/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-8">
                        <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1 italic">Click to view</p>
                        <p className="text-sm font-black text-white uppercase">{doc.title}</p>
                      </div>
                    </div>
                  ))}
                  {(!aboutUs?.legal_documents || aboutUs.legal_documents.length === 0) && (
                    <div className="col-span-full py-32 bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center opacity-50">
                      <span className="material-icons text-7xl mb-4">folder_off</span>
                      <p className="font-black uppercase tracking-widest text-sm">Dokumen Belum Tersedia</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Final CTA */}
        <div className="mt-32 bg-gray-950 rounded-[5rem] p-16 md:p-24 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[120px] -mr-64 -mt-64 group-hover:bg-green-500/30 transition duration-1000"></div>
          
          <div className="relative z-10 space-y-12">
            <h3 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Jadi Bagian dari <br/> <span className="text-green-500">Ekosistem Keberkahan</span>
            </h3>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">Saatnya pemuda mengambil peran dalam transformasi ekonomi syariah yang transparan dan profesional.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/register" className="px-12 py-6 bg-white text-gray-900 rounded-[2.5rem] font-black text-lg hover:bg-green-500 hover:text-white transition transform hover:-translate-y-2 shadow-2xl">
                Bergabung Sekarang
              </Link>
              <Link to="/hubungi-kami" className="px-12 py-6 bg-white/10 text-white border border-white/20 rounded-[2.5rem] font-black text-lg backdrop-blur hover:bg-white/20 transition">
                Konsultasi Dulu
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <NavigationButton />
    </div>
  );
};

export default AboutUs;