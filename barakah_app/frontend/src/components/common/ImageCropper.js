import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from './canvasUtils';

const ImageCropperModal = ({ image, aspect = 16 / 9, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => setCrop(crop);
  const onZoomChange = (zoom) => setZoom(zoom);

  const onCropCompleteInternal = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl h-[60vh] bg-gray-900 rounded-t-2xl overflow-hidden">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={onZoomChange}
        />
      </div>
      <div className="w-full max-w-2xl bg-white p-6 rounded-b-2xl shadow-xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="material-icons text-gray-400">zoom_in</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              onClick={handleDone}
              className="bg-green-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition"
            >
              Potong & Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
