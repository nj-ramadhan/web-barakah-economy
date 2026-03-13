import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { uploadArticleImages } from "../services/articleApi";

const ArticleUploadImagesPage = () => {
  const { id } = useParams();
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");

  const handleUpload = async () => {
    await uploadArticleImages(id, files, title);
    alert("Upload berhasil!");
  };

  return (
    <div className="p-4">
      <h1 className="font-bold text-lg">Upload Gambar</h1>

      <input
        type="text"
        placeholder="Judul gambar (optional)"
        className="border p-2 w-full mt-2"
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        type="file"
        multiple
        className="mt-3"
        onChange={(e) => {
          const selectedFiles = [...e.target.files];
          const oversized = selectedFiles.some(f => f.size > 5 * 1024 * 1024);
          if (oversized) {
            alert("Salah satu atau beberapa file melebihi batas 5MB.");
            e.target.value = "";
            setFiles([]);
            return;
          }
          setFiles(selectedFiles);
        }}
      />
      <p className="text-[10px] text-gray-400 mt-1">Maksimal 5MB per file</p>

      <button
        onClick={handleUpload}
        className="w-full p-3 bg-blue-600 text-white rounded mt-4"
      >
        Upload
      </button>
    </div>
  );
};

export default ArticleUploadImagesPage;
