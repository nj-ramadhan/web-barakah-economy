import React, { useEffect, useState } from "react";
import axios from "axios";
import HeaderHome from "../components/layout/HeaderHome";
import NavigationButton from "../components/layout/Navigation";
import { Link } from "react-router-dom";

const ArticleListPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/articles/`
      );
      console.log("API RESULT:", res.data);
      setArticles(res.data); // pastikan backend mengirim array of article objects
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <div className="body">
      <HeaderHome />

      <div className="px-4 py-4">
        <h1 className="text-xl font-bold mb-4">Articles</h1>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/academy/articles/${a.id}`}
                className="bg-white shadow rounded p-3 flex"
              >
                {a.images && a.images.length > 0 && (
                <img
                    src={a.images[0].full_path}
                    alt={a.title}
                    className="w-24 h-24 object-cover rounded"
                />
                )}

                <div className="ml-3">
                  <h3 className="font-semibold line-clamp-2">{a.title}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2">
                    {a.content ? a.content.substring(0, 80) : ""}...
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <NavigationButton />
    </div>
  );
};

export default ArticleListPage;
