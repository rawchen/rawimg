import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { useWebGLRenderer } from '@/hooks/useWebGLRenderer';

interface EditorCanvasProps {
  className?: string;
}

export function EditorCanvas({ className }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentImage, params, ui, setZoom, setPan } = useEditorStore();
  const { setCanvas, isReady, loadImage, render } = useWebGLRenderer();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fit image to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !currentImage) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const imageAspect = currentImage.width / currentImage.height;
    const containerAspect = containerWidth / containerHeight;

    let fitZoom: number;
    if (imageAspect > containerAspect) {
      fitZoom = containerWidth / currentImage.width;
    } else {
      fitZoom = containerHeight / currentImage.height;
    }

    setZoom(fitZoom * 0.9);
    setPan(0, 0);
  }, [currentImage, setZoom, setPan]);

  // Fit to screen on image change
  useEffect(() => {
    if (currentImage) {
      setImageLoaded(false);
      fitToScreen();
    }
  }, [currentImage?.id]);

  // Load image when currentImage changes
  useEffect(() => {
    if (!currentImage || !isReady) return;

    // If we have decoded data (from WASM), use it directly
    if (currentImage.decodedData) {
      const success = loadImage({
        data: currentImage.decodedData,
        width: currentImage.width,
        height: currentImage.height,
      });
      if (success) {
        setImageLoaded(true);
      }
    } else {
      // Otherwise load from thumbnail (data URL for JPEG/PNG)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadImage(img);
        setImageLoaded(true);
      };
      img.onerror = () => {
        console.error('Failed to load image for WebGL');
        setImageLoaded(false);
      };
      img.src = currentImage.thumbnail;
    }
  }, [currentImage?.id, currentImage?.decodedData, currentImage?.thumbnail, isReady, loadImage]);

  // Render when params change
  useEffect(() => {
    if (!isReady || !imageLoaded || !currentImage) return;
    render(params, currentImage.width, currentImage.height);
  }, [isReady, imageLoaded, params, currentImage, render]);

  // Pan handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - ui.panX, y: e.clientY - ui.panY });
    }
  }, [ui.panX, ui.panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan(e.clientX - dragStart.x, e.clientY - dragStart.y);
  }, [isDragging, dragStart, setPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(ui.zoom * delta);
  }, [ui.zoom, setZoom]);

  if (!currentImage) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-gray-900', className)}>
        <div className="text-gray-500">没有打开的照片</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-gray-900 overflow-hidden cursor-grab active:cursor-grabbing',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Centered canvas container */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${ui.panX}px, ${ui.panY}px) scale(${ui.zoom})`,
        }}
      >
        <canvas
          ref={setCanvas}
          width={currentImage.width}
          height={currentImage.height}
          style={{
            display: 'block',
            width: currentImage.width,
            height: currentImage.height,
          }}
        />
      </div>

      {/* Loading indicator */}
      {!isReady || !imageLoaded ? (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-white text-sm">加载中...</div>
        </div>
      ) : null}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded select-none">
        {Math.round(ui.zoom * 100)}% | {currentImage.width}×{currentImage.height}
        {currentImage.isRaw && <span className="ml-2 text-green-400">RAW</span>}
      </div>

      {/* WebGL error indicator */}
      {!isReady && (
        <div className="absolute top-4 left-4 bg-red-600/80 text-white text-xs px-2 py-1 rounded">
          WebGL 不可用
        </div>
      )}
    </div>
  );
}

export default EditorCanvas;
