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
        onChange={(e) => setFiles([...e.target.files])}
      />

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
