import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import HeaderHome from "../components/layout/HeaderHome";
import NavigationButton from "../components/layout/Navigation";

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

      <div className="px-4 py-4 max-w-3xl mx-auto"> {/* Tambah max-w-3xl agar tulisan tidak terlalu lebar */}
        <h1 className="text-2xl font-bold mb-2 text-center">{article.title}</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">{article.date}</p>

        {/* GAMBAR UTAMA (Thumbnail/Cover) diambil dari ArticleImage */}
        {article.images && article.images.length > 0 && (
          <div className="flex justify-center mb-8">
            <img
              src={article.images[0].full_path} 
              alt={article.title}
              className="w-full h-auto rounded-lg shadow-md object-cover max-h-[400px]"
            />
          </div>
        )}

        {/* KONTEN FLEKSIBEL (Teks + Gambar Selipan) dari CKEditor */}
        <div 
            className="prose prose-lg max-w-none text-justify custom-content" 
            dangerouslySetInnerHTML={{ __html: article.content }} 
        />
        
        {/* Style tambahan khusus untuk gambar di dalam konten CKEditor */}
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

      <NavigationButton />
    </div>
  );
};

export default ArticleDetailPage;