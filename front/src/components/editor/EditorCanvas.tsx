import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { useWebGLRenderer } from '@/hooks/useWebGLRenderer';
import { CropOverlay } from './CropOverlay';
import type { EditParams } from '@/types';

// Default edit params for showing original image
const defaultParams: EditParams = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 6500,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  curves: {
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    b: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  },
  hsl: { hue: [], saturation: [], luminance: [] },
  clarity: 0,
  dehaze: 0,
  texture: 0,
  sharpening: { amount: 0, radius: 1.0, detail: 25, masking: 0 },
  noiseReduction: { luminance: 0, luminanceDetail: 50, luminanceContrast: 50, color: 0, colorDetail: 50, colorSmoothness: 50 },
  removeChromaticAberration: false,
  enableLensCorrection: false,
  distortion: 0,
  vignette: 0,
  postCropVignette: { amount: 0, midpoint: 50, roundness: 50, feather: 50, highlights: 0 },
  grain: { amount: 0, size: 25, roughness: 50 },
  crop: { x: 0, y: 0, width: 1, height: 1, aspectRatio: null },
};

interface EditorCanvasProps {
  className?: string;
}

export function EditorCanvas({ className }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentImage, params, ui, setZoom, setPan, completeCrop, setCropping } = useEditorStore();
  const { setCanvas, isReady, loadImage, render, getRenderedPixels } = useWebGLRenderer();

  // Determine which params to use based on showingOriginal state
  const activeParams = ui.showingOriginal ? defaultParams : params;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // RAF-based render throttling
  const rafRef = useRef<number | null>(null);
  const pendingRenderRef = useRef<{ params: typeof params; width: number; height: number } | null>(null);

  // Calculate preview dimensions (limit max resolution for performance)
  const getPreviewDimensions = useCallback((imgWidth: number, imgHeight: number) => {
    // Higher limit for better quality while maintaining performance
    // 4MP gives ~2x quality improvement over 2MP, still ~6x faster than full 26MP
    const maxPixels = 4000000; // 4MP limit
    const pixelCount = imgWidth * imgHeight;

    if (pixelCount <= maxPixels) {
      return { width: imgWidth, height: imgHeight, scale: 1 };
    }

    const scale = Math.sqrt(maxPixels / pixelCount);
    return {
      width: Math.floor(imgWidth * scale),
      height: Math.floor(imgHeight * scale),
      scale,
    };
  }, []);

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

    setZoom(fitZoom * 1);
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

  // Render when params change - use RAF for throttling
  useEffect(() => {
    if (!isReady || !imageLoaded || !currentImage) return;

    const preview = getPreviewDimensions(currentImage.width, currentImage.height);

    // Store pending render request
    pendingRenderRef.current = {
      params: activeParams,
      width: preview.width,
      height: preview.height,
    };

    // Schedule render if not already scheduled
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        const pending = pendingRenderRef.current;
        if (pending) {
          render(pending.params, pending.width, pending.height, 1);
        }
        rafRef.current = null;
      });
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isReady, imageLoaded, activeParams, currentImage, render, getPreviewDimensions]);

  // Handle crop operation when cropPending is true
  useEffect(() => {
    if (!ui.cropPending || !currentImage || !isReady || !imageLoaded) return;

    const crop = params.crop;
    const preview = getPreviewDimensions(currentImage.width, currentImage.height);

    // 先渲染当前编辑效果
    render(activeParams, preview.width, preview.height, preview.scale);

    // 获取渲染后的像素数据
    const renderedPixels = getRenderedPixels();
    if (!renderedPixels) {
      console.error('Failed to get rendered pixels for crop');
      return;
    }

    // 计算裁剪区域
    const startX = Math.round(currentImage.width * crop.x * preview.scale);
    const startY = Math.round(currentImage.height * crop.y * preview.scale);
    const cropWidth = Math.round(currentImage.width * crop.width * preview.scale);
    const cropHeight = Math.round(currentImage.height * crop.height * preview.scale);

    // 从渲染数据中提取裁剪区域
    const croppedData = new Uint8ClampedArray(cropWidth * cropHeight * 4);

    for (let y = 0; y < cropHeight; y++) {
      for (let x = 0; x < cropWidth; x++) {
        const srcX = startX + x;
        const srcY = startY + y;
        const srcIndex = (srcY * preview.width + srcX) * 4;
        const dstIndex = (y * cropWidth + x) * 4;

        croppedData[dstIndex] = renderedPixels[srcIndex];
        croppedData[dstIndex + 1] = renderedPixels[srcIndex + 1];
        croppedData[dstIndex + 2] = renderedPixels[srcIndex + 2];
        croppedData[dstIndex + 3] = renderedPixels[srcIndex + 3];
      }
    }

    // 计算最终尺寸
    const finalWidth = Math.round(currentImage.width * crop.width);
    const finalHeight = Math.round(currentImage.height * crop.height);

    // 如果预览尺寸小于最终尺寸，需要放大裁剪数据
    if (preview.scale < 1) {
      // 创建一个临时 canvas 来放大
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      const imageData = new ImageData(croppedData, cropWidth, cropHeight);
      tempCtx.putImageData(imageData, 0, 0);

      // 创建目标尺寸的 canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = finalWidth;
      finalCanvas.height = finalHeight;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) return;

      finalCtx.drawImage(tempCanvas, 0, 0, finalWidth, finalHeight);
      const finalImageData = finalCtx.getImageData(0, 0, finalWidth, finalHeight);

      completeCrop(finalImageData.data, finalWidth, finalHeight);
    } else {
      completeCrop(croppedData, finalWidth, finalHeight);
    }

    // 退出裁剪模式
    setCropping(false);
  }, [ui.cropPending, currentImage, isReady, imageLoaded, params.crop, activeParams, render, getRenderedPixels, getPreviewDimensions, completeCrop, setCropping]);

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

  // Zoom handler - use native event listener for non-passive wheel event
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(ui.zoom * delta);
    };

    // Add wheel listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [ui.zoom, setZoom]);

  if (!currentImage) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-[#F5F7FA]', className)}>
        <div className="text-gray-500">没有打开的照片</div>
      </div>
    );
  }

  const preview = getPreviewDimensions(currentImage.width, currentImage.height);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-[#F5F7FA] overflow-hidden cursor-grab active:cursor-grabbing',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={fitToScreen}
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
          width={preview.width}
          height={preview.height}
          style={{
            display: 'block',
            // CSS size matches original image dimensions for proper zoom/pan
            width: currentImage.width,
            height: currentImage.height,
          }}
        />

        {/* Crop overlay when in cropping mode */}
        {ui.isCropping && (
          <CropOverlay
            canvasWidth={currentImage.width}
            canvasHeight={currentImage.height}
            imageWidth={currentImage.width}
            imageHeight={currentImage.height}
            zoom={ui.zoom}
          />
        )}
      </div>

      {/* Loading indicator */}
      {!isReady || !imageLoaded ? (
        <div className="absolute inset-0 bg-gray-200/80 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-gray-700 text-sm">加载中...</div>
        </div>
      ) : null}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-lg shadow-sm select-none">
        {Math.round(ui.zoom * 100)}% | {currentImage.width}×{currentImage.height}
        {currentImage.isRaw && <span className="ml-2 text-orange-500 font-medium">RAW</span>}
      </div>

      {/* WebGL error indicator */}
      {!isReady && (
        <div className="absolute top-4 left-4 bg-red-500/90 text-white text-xs px-2 py-1 rounded-lg">
          WebGL 不可用
        </div>
      )}
    </div>
  );
}

export default EditorCanvas;
