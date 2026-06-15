import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

// Custom ImageOff icon (image with slash through it)
const ImageOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// Image icon (normal image)
const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

export function Filmstrip() {
  const { currentImage, setShowingOriginal } = useEditorStore();
  const [isComparing, setIsComparing] = useState(false);

  const handleCompareMouseDown = () => {
    setIsComparing(true);
    setShowingOriginal(true);
  };

  const handleCompareMouseUp = () => {
    setIsComparing(false);
    setShowingOriginal(false);
  };

  // For now, just show the current image
  // TODO: Implement multi-image filmstrip
  return (
    <div className="h-20 bg-white border-t border-gray-200 flex items-center px-4 shadow-sm">
      {/* Left scroll button */}
      <button className="p-2 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer">
        <LeftOutlined />
      </button>

      {/* Filmstrip content */}
      <div className="flex-1 overflow-x-auto h-[90px]">
        <div className="flex gap-2 h-full py-2">
          {currentImage && (
            <div
              className={cn(
                'flex-shrink-0 h-full aspect-[3/2] rounded-lg overflow-hidden border-2 shadow-sm',
                'border-orange-500' // Active image with orange accent
              )}
            >
              <img
                src={currentImage.thumbnail}
                alt={currentImage.filename}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Placeholder for more images */}
          {!currentImage && (
            <div className="flex items-center justify-center w-full text-gray-500 text-sm">
              没有打开的照片
            </div>
          )}
        </div>
      </div>

      {/* Right scroll button */}
      <button className="p-2 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer">
        <RightOutlined />
      </button>

      {/* Real-time compare button */}
      {currentImage && (
        <button
          onMouseDown={handleCompareMouseDown}
          onMouseUp={handleCompareMouseUp}
          onMouseLeave={handleCompareMouseUp}
          className={cn(
            'ml-4 p-2 rounded-lg transition-colors cursor-pointer',
            isComparing ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-orange-600'
          )}
          title="按住查看原图，松开显示调整后的图"
        >
          {isComparing ? <ImageIcon /> : <ImageOffIcon />}
        </button>
      )}
    </div>
  );
}

export default Filmstrip;