import React, { useEffect, useCallback } from 'react';
import { Camera } from 'lucide-react';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onCapture: () => void;
  activeStream: MediaStream | null;
  photosCount: number;
  maxPhotos: number;
  side: 'front' | 'back';
}

export function CameraPreview({ 
  videoRef, 
  onCapture, 
  activeStream,
  photosCount,
  maxPhotos,
  side
}: CameraPreviewProps) {
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

  useEffect(() => {
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
    <div className="relative w-full max-w-md mx-auto">
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
      
      {activeStream && photosCount < maxPhotos && (
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <button
            onClick={onCapture}
            className="bg-blue-500 hover:bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
            aria-label={`Capturar ${side === 'front' ? 'frente' : 'reverso'} de la identificación`}
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
  );
}