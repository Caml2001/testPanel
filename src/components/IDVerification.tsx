import React, { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCcw, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Photo {
  id: number;
  dataUrl: string;
  side: 'front' | 'back';
}

export default function IDVerification() {
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
      const userId = crypto.randomUUID();

      const frontBlob = dataURLtoBlob(frontPhoto.dataUrl);
      const frontPath = `${userId}/${timestamp}_front.jpg`;
      const { error: frontError } = await supabase.storage
        .from('id-photos')
        .upload(frontPath, frontBlob);

      if (frontError) throw frontError;

      const backBlob = dataURLtoBlob(backPhoto.dataUrl);
      const backPath = `${userId}/${timestamp}_back.jpg`;
      const { error: backError } = await supabase.storage
        .from('id-photos')
        .upload(backPath, backBlob);

      if (backError) throw backError;

      const frontUrl = supabase.storage.from('id-photos').getPublicUrl(frontPath).data.publicUrl;
      const backUrl = supabase.storage.from('id-photos').getPublicUrl(backPath).data.publicUrl;

      const { error: dbError } = await supabase
        .from('identity_verifications')
        .insert([{
          front_photo_url: frontUrl,
          back_photo_url: backUrl,
          status: 'pending'
        }]);

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

  const setupVideoStream = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement || !activeStream) return;

    try {
      if (videoElement.srcObject !== activeStream) {
        videoElement.srcObject = activeStream;
        await videoElement.play().catch(error => {
          if (error.name !== 'AbortError') {
            console.error('Error playing video:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error setting up video stream:', error);
    }
  }, [activeStream]);

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  React.useEffect(() => {
    setupVideoStream();
    return () => {
      const videoElement = videoRef.current;
      if (videoElement && videoElement.srcObject) {
        const tracks = (videoElement.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
      }
    };
  }, [setupVideoStream]);

  return (
    <div className="min-h-screen bg-[#1a1f2e] p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-6 pt-4">
          {/* ID Guide */}
          <div className="text-center space-y-2 max-w-md mx-auto">
            <h2 className="text-lg font-medium text-white/90">
              {currentSide === 'front' 
                ? 'Tilt the front of your ID document from left to right'
                : 'Now capture the back of your ID'
              }
            </h2>
            <p className="text-sm text-blue-400/90">
              Position your ID within the frame and ensure all text is clearly visible
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg text-center max-w-md mx-auto">
              {error}
            </div>
          )}

          {/* Camera Preview */}
          <div className="relative w-full max-w-md mx-auto mb-24">
            <div className="relative aspect-[3/4] bg-black/90 rounded-3xl overflow-hidden">
              {/* ID card guide overlay */}
              <div className="absolute inset-0 z-10">
                <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 aspect-[1.586/1] pointer-events-none">
                  {/* Card outline */}
                  <div className="absolute inset-0">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path
                        d="M 0,0 L 100,0 L 100,100 L 0,100 Z"
                        fill="none"
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      />
                    </svg>
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 rounded-br"></div>
                  </div>
                </div>
              </div>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${
                  activeStream ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
            
            {/* Capture Button */}
            {activeStream && photos.length < MAX_PHOTOS && (
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                <button
                  onClick={capturePhoto}
                  className="bg-blue-500 hover:bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
                  aria-label={`Capturar ${currentSide === 'front' ? 'frente' : 'reverso'} de la identificación`}
                >
                  <Camera className="w-8 h-8" />
                </button>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    REC
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Photo Counter and Controls */}
        {photos.length > 0 && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center items-center gap-4">
            <div className="bg-[#1a1f2e]/95 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 flex items-center gap-4">
              <span className="text-white/90 font-medium">
                {photos.length}/2 fotos
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={resetPhotos}
                  className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
                  disabled={isUploading}
                  title="Volver a tomar"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                
                {photos.length === 2 && (
                  <button
                    onClick={uploadPhotos}
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
        )}
      </div>
    </div>
  );
}