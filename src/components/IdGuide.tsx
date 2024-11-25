import React from 'react';

interface IdGuideProps {
  side: 'front' | 'back';
}

export function IdGuide({ side }: IdGuideProps) {
  return (
    <div className="text-center space-y-2 max-w-md mx-auto">
      <h2 className="text-lg font-medium text-white/90">
        {side === 'front' 
          ? 'Tilt the front of your ID document from left to right'
          : 'Now capture the back of your ID'
        }
      </h2>
      <p className="text-sm text-blue-400/90">
        Position your ID within the frame and ensure all text is clearly visible
      </p>
    </div>
  );
}