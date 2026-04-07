import React from 'react';

const CKEditorComponent = ({ content, onChange, placeholder }) => {
    return (
        <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Tulis deskripsi lengkap di sini..."}
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-green-500 transition min-h-[300px] resize-y"
        />
    );
};

export default CKEditorComponent;
