import React, { useState, useRef, useCallback } from 'react';
import { CameraPreview } from './CameraPreview';
import { PhotoGallery } from './PhotoGallery';
import { IdGuide } from './IdGuide';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Photo {
  id: number;
  dataUrl: string;
  side: 'front' | 'back';
}

export default function PhotoCapture() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string>('');
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const MAX_PHOTOS = 2;

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setActiveStream(stream);
      setError('');
    } catch (err) {
      setError('No se pudo acceder a la cámara. Por favor, permite el acceso y asegúrate de usar un dispositivo con cámara.');
      console.error('Camera error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setActiveStream(null);
    }
  }, []);

  const dataURLtoBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const uploadPhotos = async () => {
    if (!photos.length) return;
    
    try {
      setIsUploading(true);
      const frontPhoto = photos.find(p => p.side === 'front');
      const backPhoto = photos.find(p => p.side === 'back');

      if (!frontPhoto || !backPhoto) {
        throw new Error('Se requieren ambas fotos');
      }

      const timestamp = Date.now();
      const userId = crypto.randomUUID(); // Generate a unique ID for anonymous users

      // Upload front photo
      const frontBlob = dataURLtoBlob(frontPhoto.dataUrl);
      const frontPath = `${userId}/${timestamp}_front.jpg`;
      const { error: frontError } = await supabase.storage
        .from('id-photos')
        .upload(frontPath, frontBlob);

      if (frontError) throw frontError;

      // Upload back photo
      const backBlob = dataURLtoBlob(backPhoto.dataUrl);
      const backPath = `${userId}/${timestamp}_back.jpg`;
      const { error: backError } = await supabase.storage
        .from('id-photos')
        .upload(backPath, backBlob);

      if (backError) throw backError;

      // Get public URLs
      const frontUrl = supabase.storage.from('id-photos').getPublicUrl(frontPath).data.publicUrl;
      const backUrl = supabase.storage.from('id-photos').getPublicUrl(backPath).data.publicUrl;

      // Create verification record
      const { error: dbError } = await supabase
        .from('identity_verifications')
        .insert([
          {
            front_photo_url: frontUrl,
            back_photo_url: backUrl,
            status: 'pending'
          }
        ]);

      if (dbError) throw dbError;

      toast.success('¡Fotos subidas exitosamente!');
      setPhotos([]);
      setCurrentSide('front');
      startCamera();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir las fotos. Por favor, intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || photos.length >= MAX_PHOTOS) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPhotos(prev => [...prev, { id: Date.now(), dataUrl, side: currentSide }]);
      
      if (currentSide === 'front') {
        setCurrentSide('back');
      } else if (photos.length === MAX_PHOTOS - 1) {
        stopCamera();
      }
    }
  }, [photos.length, currentSide, stopCamera]);

  const resetPhotos = useCallback(() => {
    setPhotos([]);
    setCurrentSide('front');
    startCamera();
  }, [startCamera]);

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="min-h-screen bg-[#1a1f2e] p-4 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-6 pt-4">
          <IdGuide side={currentSide} />

          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg text-center max-w-md mx-auto">
              {error}
            </div>
          )}

          <div className="mt-4">
            <CameraPreview
              videoRef={videoRef}
              onCapture={capturePhoto}
              activeStream={activeStream}
              photosCount={photos.length}
              maxPhotos={MAX_PHOTOS}
              side={currentSide}
            />
          </div>
        </div>

        <PhotoGallery 
          photos={photos} 
          onReset={resetPhotos} 
          onUpload={uploadPhotos}
          isUploading={isUploading}
        />
      </div>
    </div>
  );
}