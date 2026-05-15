import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet";
import HeaderHome from "../components/layout/HeaderHome";
import NavigationButton from "../components/layout/Navigation";
import FloatingBubble from '../components/common/FloatingBubble';
import ShareButton from '../components/campaigns/ShareButton';
import { toggleLikeArticle } from "../services/articleApi";

const ArticleDetailPage = () => {
  const { id } = useParams(); // Bisa berupa ID angka atau Slug
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [liking, setLiking] = useState(false);

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
        setIsLiked(res.data.is_liked || false);
        setLikesCount(res.data.likes_count || 0);
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

  const handleToggleLike = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      alert('Anda harus login terlebih dahulu untuk memberikan like.');
      return;
    }

    if (liking) return;

    setLiking(true);
    // Optimistic UI
    const prevIsLiked = isLiked;
    const prevLikesCount = likesCount;
    setIsLiked(!prevIsLiked);
    setLikesCount(prevLikesCount + (prevIsLiked ? -1 : 1));

    try {
      const res = await toggleLikeArticle(article.slug || article.id);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Rollback
      setIsLiked(prevIsLiked);
      setLikesCount(prevLikesCount);
    } finally {
      setLiking(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!article) return <div className="p-4 text-center">Article not found</div>;

  return (
    <div className="body bg-gray-50 min-h-screen">
      <Helmet>
        <title>{article.title} | BARAKAH ECONOMY</title>
        <meta name="description" content={article.content?.replace(/<[^>]+>/g, '').slice(0, 160)} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.content?.replace(/<[^>]+>/g, '').slice(0, 160)} />
        <meta property="og:image" content={article.images && article.images.length > 0 ? article.images[0].full_path : ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.title,
            "image": article.images && article.images.length > 0 ? [article.images[0].full_path] : [],
            "datePublished": article.date,
            "author": {
              "@type": "Person",
              "name": "Barakah Economy"
            }
          })}
        </script>
      </Helmet>
      <HeaderHome />

      <div className="px-4 py-8 md:py-12 max-w-4xl mx-auto mb-24 bg-white shadow-sm sm:rounded-2xl sm:mt-8 sm:p-10 border border-gray-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 leading-tight">
            {article.title}
          </h1>
          <div className="flex-shrink-0 mt-1">
            <ShareButton slug={article.slug || id} title={article.title} type="article" />
          </div>
        </div>
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-sm">
              {article.date}
            </p>
            <button
              onClick={handleToggleLike}
              disabled={liking}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 ${
                isLiked 
                  ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'
              }`}
            >
              <span className={`material-icons text-[18px] transition-transform duration-300 ${liking ? 'scale-125' : ''}`}>
                {isLiked ? 'favorite' : 'favorite_border'}
              </span>
              <span className="text-xs font-bold">{likesCount}</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="material-icons text-[18px]">visibility</span>
            <span className="text-sm font-medium">{article.view_count || 0} kali dilihat</span>
          </div>
        </div>

        {/* Gambar Utama (Featured Image) */}
        {article.images && article.images.length > 0 && (
          <div className="mb-10 rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <img
              src={article.images[0].full_path}
              alt={article.title}
              className="w-full h-auto object-cover max-h-[500px]"
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