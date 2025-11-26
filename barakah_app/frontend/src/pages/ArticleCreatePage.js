import React, { useState } from "react";
import { createArticle } from "../services/articleApi";

const ArticleCreatePage = () => {
  const [form, setForm] = useState({
    title: "",
    content: "",
    status: 1,
    date: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createArticle(form);
    alert("Artikel berhasil dibuat!");
  };

  return (
    <div className="p-4">
      <h1 className="font-bold text-lg">Buat Artikel</h1>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="text"
          placeholder="Judul"
          className="border p-2 w-full"
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <textarea
          placeholder="Konten"
          className="border p-2 w-full"
          onChange={(e) => setForm({ ...form, content: e.target.value })}
        />

        <input
          type="number"
          placeholder="Status"
          className="border p-2 w-full"
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        />

        <input
          type="date"
          className="border p-2 w-full"
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />

        <button className="w-full p-3 bg-green-600 text-white rounded">
          Simpan
        </button>
      </form>
    </div>
  );
};

export default ArticleCreatePage;
