import React, { useEffect, useState } from "react";
import axios from "axios";
import HeaderHome from "../components/layout/HeaderHome";
import NavigationButton from "../components/layout/Navigation";
import { Link } from "react-router-dom";
import FloatingBubble from '../components/common/FloatingBubble';
import ShareButton from '../components/campaigns/ShareButton';

const ArticleListPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/articles/`
      );
      setArticles(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, '');
  };

  return (
    <div className="body">
      <HeaderHome />

      <div className="px-4 py-4 mb-20">
        <h1 className="text-xl font-bold mb-4">Articles</h1>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {articles.map((a) => (
              <div key={a.id} className="bg-white shadow rounded p-3 flex items-stretch gap-2">
                <Link
                  to={`/academy/articles/${a.slug ? a.slug : a.id}`}
                  className="flex flex-1 min-w-0"
                >
                  {a.images && a.images.length > 0 ? (
                    <img
                      src={a.images[0].full_path}
                      alt={a.title}
                      className="w-24 h-24 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                  <div className="ml-3 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-semibold line-clamp-2 leading-tight mb-1">{a.title}</h3>
                      <p className="text-gray-500 text-xs line-clamp-3">
                        {stripHtml(a.content).substring(0, 100)}...
                      </p>
                    </div>
                    <span className="text-gray-400 text-[10px] mt-2">{a.date}</span>
                  </div>
                </Link>
                <div className="flex items-center flex-shrink-0">
                  <ShareButton slug={a.slug || a.id} title={a.title} type="article" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FloatingBubble show={true} />
      <NavigationButton />
    </div>
  );
};

export default ArticleListPage;