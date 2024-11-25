import React, { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCcw, Upload, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function IDVerification() {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [activeStream, setActiveStream] = useState(null);
  const [currentSide, setCurrentSide] = useState('front');
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const MAX_PHOTOS = 3;

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: { 
          facingMode: currentSide === 'selfie' ? 'user' : 'environment',
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
  }, [currentSide]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setActiveStream(null);
    }
  }, []);

  const dataURLtoBlob = (dataUrl) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
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
      const selfiePhoto = photos.find(p => p.side === 'selfie');

      if (!frontPhoto || !backPhoto || !selfiePhoto) {
        throw new Error('Se requieren las tres fotos');
      }

      const timestamp = Date.now();
      const userId = crypto.randomUUID();

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

      // Upload selfie photo
      const selfieBlob = dataURLtoBlob(selfiePhoto.dataUrl);
      const selfiePath = `${userId}/${timestamp}_selfie.jpg`;
      const { error: selfieError } = await supabase.storage
        .from('id-photos')
        .upload(selfiePath, selfieBlob);

      if (selfieError) throw selfieError;

      // Get public URLs
      const frontUrl = supabase.storage.from('id-photos').getPublicUrl(frontPath).data.publicUrl;
      const backUrl = supabase.storage.from('id-photos').getPublicUrl(backPath).data.publicUrl;
      const selfieUrl = supabase.storage.from('id-photos').getPublicUrl(selfiePath).data.publicUrl;

      // Create verification record
      const { error: dbError } = await supabase
        .from('identity_verifications')
        .insert([{
          front_photo_url: frontUrl,
          back_photo_url: backUrl,
          selfie_url: selfieUrl,
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
      // Flip the canvas horizontally for selfie mode
      if (currentSide === 'selfie') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPhotos(prev => [...prev, { id: Date.now(), dataUrl, side: currentSide }]);
      
      if (currentSide === 'front') {
        setCurrentSide('back');
      } else if (currentSide === 'back') {
        setCurrentSide('selfie');
      }
      
      if (photos.length === MAX_PHOTOS - 1) {
        stopCamera();
      } else {
        // Restart camera with new facing mode
        stopCamera();
        setTimeout(startCamera, 500);
      }
    }
  }, [photos.length, currentSide, stopCamera, startCamera]);

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
        const tracks = videoElement.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
      }
    };
  }, [setupVideoStream]);

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-6 pt-4">
          {/* ID Guide */}
          <div className="text-center space-y-2 max-w-md mx-auto">
            <h2 className="text-lg font-medium text-gray-900">
              {photos.length === MAX_PHOTOS
                ? '¡Fotos completadas!'
                : currentSide === 'front' 
                ? 'Captura el frente de tu identificación'
                : currentSide === 'back'
                ? 'Ahora captura el reverso'
                : 'Toma una selfie mirando directamente a la cámara'
              }
            </h2>
            <p className="text-sm text-gray-600">
              {photos.length === MAX_PHOTOS
                ? 'Revisa las fotos y súbelas cuando estés listo'
                : currentSide === 'selfie' 
                ? 'Asegúrate de que tu rostro esté bien iluminado y centrado'
                : 'Coloca tu identificación dentro del marco y asegúrate de que todo el texto sea legible'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center max-w-md mx-auto">
              {error}
            </div>
          )}

          {/* Camera Preview or Success Check */}
          <div className="relative w-full max-w-md mx-auto mb-24">
            {photos.length === MAX_PHOTOS ? (
              <div className="relative aspect-[3/4] bg-gray-100 rounded-3xl overflow-hidden shadow-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-6 mx-auto mb-4 w-fit">
                    <Check className="w-12 h-12 text-green-600" />
                  </div>
                  <p className="text-gray-900 font-medium">Todas las fotos capturadas</p>
                </div>
              </div>
            ) : (
              <div className={`relative aspect-[3/4] bg-gray-100 overflow-hidden shadow-lg ${
                currentSide === 'selfie' ? 'rounded-full' : 'rounded-3xl'
              }`}>
                {/* ID card guide overlay */}
                {currentSide !== 'selfie' ? (
                  <div className="absolute inset-0 z-10">
                    <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 aspect-[1.586/1] pointer-events-none">
                      <div className="absolute inset-0">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path
                            d="M 0,0 L 100,0 L 100,100 L 0,100 Z"
                            fill="none"
                            stroke="rgba(0,0,0,0.3)"
                            strokeWidth="1"
                            strokeDasharray="5,5"
                          />
                        </svg>
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black rounded-tl"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-black rounded-tr"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-black rounded-bl"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black rounded-br"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 z-10">
                    <div className="absolute inset-[10%] border-2 border-dashed border-black/30 rounded-full"></div>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    activeStream ? 'opacity-100' : 'opacity-0'
                  } ${currentSide === 'selfie' ? 'mirror-mode' : ''}`}
                />
              </div>
            )}
            
            {/* Capture Button */}
            {activeStream && photos.length < MAX_PHOTOS && (
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                <button
                  onClick={capturePhoto}
                  className="bg-black hover:bg-gray-800 text-white w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
                  aria-label="Capturar foto"
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
            <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-lg flex items-center gap-4">
              <span className="text-gray-900 font-medium">
                {photos.length}/3 fotos
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={resetPhotos}
                  className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={isUploading}
                  title="Volver a tomar"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
                
                {photos.length === 3 && (
                  <button
                    onClick={uploadPhotos}
                    disabled={isUploading}
                    className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-colors disabled:opacity-50"
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