import React from 'react';
import { RefreshCcw, Upload } from 'lucide-react';

interface Photo {
  id: number;
  dataUrl: string;
  side: 'front' | 'back';
}

interface PhotoGalleryProps {
  photos: Photo[];
  onReset: () => void;
  onUpload: () => Promise<void>;
  isUploading: boolean;
}

export function PhotoGallery({ photos, onReset, onUpload, isUploading }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-4">
      <div className="bg-[#1a1f2e]/95 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-4">
        <span className="text-white/90 font-medium">
          {photos.length}/2 fotos
        </span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
            disabled={isUploading}
            title="Volver a tomar"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          
          {photos.length === 2 && (
            <button
              onClick={onUpload}
              disabled={isUploading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Subiendo...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Subir fotos</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}