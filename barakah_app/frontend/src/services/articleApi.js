import api from "./api";

export const getArticles = (page = 1) =>
  api.get(`/articles/?page=${page}`);

export const getArticle = (id) =>
  api.get(`/articles/${id}/`);

export const createArticle = (data) =>
  api.post(`/articles/`, data);

export const uploadArticleImages = (id, files, title) => {
  const formData = new FormData();

  files.forEach((file) => formData.append("images", file));

  if (title) formData.append("title", title);

  return api.post(`/articles/${id}/upload-images/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const toggleLikeArticle = (slug) =>
  api.post(`/articles/${slug}/like/`);
