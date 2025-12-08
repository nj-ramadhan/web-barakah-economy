import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import HeaderHome from "../components/layout/HeaderHome";
import NavigationButton from "../components/layout/Navigation";
import FloatingBubble from '../components/common/FloatingBubble';

const ArticleDetailPage = () => {
  const { id } = useParams(); // Bisa berupa ID angka atau Slug
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Ref untuk memanipulasi elemen HTML konten setelah di-render
  const contentRef = useRef(null);

  // 1. Fetch Data Artikel
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/articles/${id}`
        );
        setArticle(res.data);
      } catch (err) {
        console.error("Failed to fetch article:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  // 2. Logic Responsive Khusus Tabel
  // CKEditor sering menghasilkan tabel statis. Kita bungkus tabel dengan div scroll agar responsive di HP.
  useEffect(() => {
    if (article && contentRef.current) {
      const tables = contentRef.current.querySelectorAll('table');
      
      tables.forEach((table) => {
        // Cek apakah sudah dibungkus agar tidak double wrapper
        if (table.parentElement.className !== 'responsive-table-wrapper') {
          const wrapper = document.createElement('div');
          wrapper.className = 'responsive-table-wrapper';
          
          // Masukkan wrapper sebelum tabel
          table.parentNode.insertBefore(wrapper, table);
          
          // Pindahkan tabel ke dalam wrapper
          wrapper.appendChild(table);
        }
      });
    }
  }, [article]);

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!article) return <div className="p-4 text-center">Article not found</div>;

  return (
    <div className="body bg-gray-50 min-h-screen">
      <HeaderHome />

      <div className="px-4 py-6 max-w-3xl mx-auto mb-24 bg-white shadow-sm sm:rounded-lg sm:mt-4 sm:p-8">
        {/* Header Artikel */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-900 leading-tight">
            {article.title}
        </h1>
        <p className="text-gray-500 text-sm mb-6 pb-4 border-b border-gray-100">
            {article.date}
        </p>

        {/* Gambar Utama (Featured Image) */}
        {article.images && article.images.length > 0 && (
          <div className="mb-8 rounded-lg overflow-hidden shadow-sm border border-gray-100">
            <img
              src={article.images[0].full_path}
              alt={article.title}
              className="w-full h-auto object-cover max-h-[400px]"
            />
          </div>
        )}

        {/* KONTEN HTML (Rich Text) */}
        <div
          ref={contentRef}
          className="prose prose-lg max-w-none text-gray-800 custom-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>

      {/* CSS INJECTION: Khusus untuk menangani elemen dari CKEditor */}
      <style>{`
            /* 1. Reset Gambar agar Responsive */
            .custom-content img {
                max-width: 100% !important;
                height: auto !important;
                border-radius: 8px;
                margin: 1.5rem auto;
                display: block;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            /* 2. Responsive Youtube/Iframe Video */
            .custom-content iframe, 
            .custom-content video {
                max-width: 100% !important;
                border-radius: 8px;
                margin: 1.5rem 0;
            }

            /* 3. Wrapper Tabel (Dibuat oleh useEffect di atas) */
            .responsive-table-wrapper {
                width: 100%;
                overflow-x: auto; /* Scroll ke samping jika tabel lebar */
                margin-bottom: 1.5rem;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                -webkit-overflow-scrolling: touch; /* Smooth scroll di iOS */
            }

            /* 4. Style Tabel Default */
            .custom-content table {
                width: 100%;
                border-collapse: collapse;
                min-width: 500px; /* Memaksa scroll muncul jika layar < 500px */
            }
            .custom-content th, 
            .custom-content td {
                padding: 12px;
                border: 1px solid #e5e7eb;
                text-align: left;
                font-size: 0.95rem;
            }
            .custom-content th {
                background-color: #f9fafb;
                font-weight: 600;
            }

            /* 5. Typography Fixes */
            .custom-content p {
                line-height: 1.7;
                margin-bottom: 1.2rem;
                text-align: justify;
            }
            .custom-content h2 {
                margin-top: 2rem;
                margin-bottom: 1rem;
                font-weight: 700;
                color: #111827;
            }
            .custom-content ul, .custom-content ol {
                padding-left: 1.5rem;
                margin-bottom: 1.2rem;
            }
            .custom-content li {
                margin-bottom: 0.5rem;
            }
            .custom-content blockquote {
                border-left: 4px solid #10b981; /* Warna hijau senada */
                padding-left: 1rem;
                font-style: italic;
                color: #4b5563;
                background: #f0fdf4;
                padding: 1rem;
                border-radius: 0 8px 8px 0;
            }
            
            /* Hapus margin berlebih pada elemen terakhir */
            .custom-content > *:last-child {
                margin-bottom: 0;
            }
      `}</style>

      {/* Floating Bubble dengan Data Lengkap */}
      <FloatingBubble 
          show={true} 
          link={article.floating_url} 
          label={article.floating_label} 
          icon={article.floating_icon_url}
      />

      <NavigationButton />
    </div>
  );
};

export default ArticleDetailPage;