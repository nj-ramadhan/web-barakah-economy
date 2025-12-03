import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import HeaderHome from "../components/layout/HeaderHome";
import NavigationButton from "../components/layout/Navigation";
// 1. Import FloatingBubble
import FloatingBubble from '../components/common/FloatingBubble';

const ArticleDetailPage = () => {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading...</div>;
  if (!article) return <div>Article not found</div>;

  return (
    <div className="body">
      <HeaderHome />

      <div className="px-4 py-4 max-w-3xl mx-auto mb-20"> {/* Tambah mb-20 agar konten terbawah tidak tertutup nav */}
        <h1 className="text-2xl font-bold mb-2 text-center">{article.title}</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">{article.date}</p>

        {/* GAMBAR UTAMA */}
        {article.images && article.images.length > 0 && (
          <div className="flex justify-center mb-8">
            <img
              src={article.images[0].full_path}
              alt={article.title}
              className="w-full h-auto rounded-lg shadow-md object-cover max-h-[400px]"
            />
          </div>
        )}

        {/* KONTEN ARTIKEL */}
        <div
          className="prose prose-lg max-w-none text-justify custom-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* CSS Khusus Konten */}
        <style>{`
            .custom-content img {
                margin: 20px auto;
                border-radius: 8px;
                max-width: 100%;
                height: auto;
                display: block;
            }
            .custom-content p {
                margin-bottom: 1rem;
                line-height: 1.6;
            }
        `}</style>
      </div>

      {/* 2. Pasang FloatingBubble disini (Show = true agar selalu tampil) */}
      <FloatingBubble show={true} />

      <NavigationButton />
    </div>
  );
};

export default ArticleDetailPage;