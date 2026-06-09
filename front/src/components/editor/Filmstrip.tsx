import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

export function Filmstrip() {
  const { currentImage } = useEditorStore();

  // For now, just show the current image
  // TODO: Implement multi-image filmstrip
  return (
    <div className="h-20 bg-gray-800 border-t border-gray-700 flex items-center px-4">
      {/* Left scroll button */}
      <button className="p-2 text-gray-400 hover:text-white">
        <LeftOutlined />
      </button>

      {/* Filmstrip content */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-2 h-full py-2">
          {currentImage && (
            <div
              className={cn(
                'flex-shrink-0 h-full aspect-[3/2] rounded overflow-hidden border-2',
                'border-blue-500' // Active image
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
      <button className="p-2 text-gray-400 hover:text-white">
        <RightOutlined />
      </button>

      {/* Image info */}
      {currentImage && (
        <div className="ml-4 text-right text-xs text-gray-400">
          <div className="font-medium text-gray-200">{currentImage.filename}</div>
          <div>{currentImage.width} × {currentImage.height}</div>
          {currentImage.exif?.make && (
            <div>{currentImage.exif.make} {currentImage.exif.model}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Filmstrip;