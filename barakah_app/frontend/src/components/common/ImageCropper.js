import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from './canvasUtils';

const ImageCropperModal = ({ 
  show = true, 
  image, 
  aspect = 16 / 9, 
  aspectRatio, // Alternative name used in some pages
  onCropComplete, 
  onCancel, 
  onClose, 
  title = "Potong Gambar",
  maxWidth = 1920,
  maxHeight = 1080 
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [selectedAspect, setSelectedAspect] = useState(aspectRatio || aspect);

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  const onCropChange = (crop) => setCrop(crop);
  const onZoomChange = (zoom) => setZoom(zoom);

  const onCropCompleteInternal = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = async () => {
    try {
      // Pass resizing and quality options to getCroppedImg
      const croppedImage = await getCroppedImg(
        image, 
        croppedAreaPixels, 
        0, 
        { horizontal: false, vertical: false }, 
        maxWidth, 
        maxHeight,
        0.8 // Quality 80%
      );
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  if (!show || !image) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button type="button" onClick={handleCancel} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition hover:bg-gray-100 rounded-full">
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="relative w-full h-[50vh] bg-gray-900 overflow-hidden">
          {image ? (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={selectedAspect}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteInternal}
              onZoomChange={onZoomChange}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
              <span className="material-icons text-4xl">image_not_supported</span>
              <p className="text-xs">Tidak ada gambar untuk dipotong</p>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
              <span>Zoom</span>
              <span>{(zoom * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="material-icons text-gray-400 text-lg">zoom_out</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <span className="material-icons text-gray-400 text-lg">zoom_in</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
              <span>Rasio Aspek</span>
              <span>Proporsi</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Square (1:1)', value: 1, icon: 'crop_square' },
                { label: 'Portrait (3:4)', value: 3/4, icon: 'stay_current_portrait' },
                { label: 'Landscape (16:9)', value: 16/9, icon: 'crop_16_9' },
                { label: 'Standard (4:3)', value: 4/3, icon: 'crop_3_2' },
              ].map((ratio) => (
                <button
                  key={ratio.label}
                  type="button"
                  onClick={() => setSelectedAspect(ratio.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl border-2 transition-all duration-300 ${
                    Math.abs(selectedAspect - ratio.value) < 0.01 
                      ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-icons text-xl">{ratio.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-tight">{ratio.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              onClick={handleCancel}
              type="button"
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition"
            >
              Batal
            </button>
            <button
              onClick={handleDone}
              type="button"
              disabled={!image}
              className="bg-green-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-green-100 hover:bg-green-800 transition transform active:scale-95 disabled:opacity-50"
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
