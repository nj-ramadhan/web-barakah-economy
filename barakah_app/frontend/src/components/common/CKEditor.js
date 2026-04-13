import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const CKEditorComponent = ({ content, onChange, placeholder }) => {
    return (
        <div className="ck-editor-wrapper">
            <CKEditor
                editor={ ClassicEditor }
                data={ content }
                config={{
                    placeholder: placeholder || "Tulis deskripsi lengkap di sini...",
                    toolbar: [
                        'heading', '|',
                        'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                        'outdent', 'indent', '|',
                        'blockQuote', 'insertTable', 'mediaEmbed', 'undo', 'redo'
                    ]
                }}
                onChange={ ( event, editor ) => {
                    const data = editor.getData();
                    onChange(data);
                }}
            />
        </div>
    );
};

export default CKEditorComponent;
