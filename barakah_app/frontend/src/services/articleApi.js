import axios from "axios";

const API = process.env.REACT_APP_API_BASE_URL;

export const getArticles = (page = 1) =>
  axios.get(`${API}/api/articles/?page=${page}`);

export const getArticle = (id) =>
  axios.get(`${API}/api/articles/${id}/`);

export const createArticle = (data) =>
  axios.post(`${API}/api/articles/`, data);

export const uploadArticleImages = (id, files, title) => {
  const formData = new FormData();

  files.forEach((file) => formData.append("images", file));

  if (title) formData.append("title", title);

  return axios.post(`${API}/api/articles/${id}/upload-images/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
