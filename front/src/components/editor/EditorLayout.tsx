import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editorStore';
import { EditorCanvas } from './EditorCanvas';
import { AdjustmentPanel } from './AdjustmentPanel';
import { Histogram } from './Histogram';
import { EditorToolbar } from './EditorToolbar';
import { Filmstrip } from './Filmstrip';
import { useRawDecoder } from '@/hooks/useRawDecoder';
import type { RawImage, EditParams } from '@/types';

// Default edit params for new images
const defaultEditParams: EditParams = {
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
};

// Accept common image formats + RAW extensions
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.bmp,.tiff,.tif,.cr2,.nef,.arw,.dng,.orf,.rw2,.raf,.pef,.srw,.x3f,.raw';

// RAW extensions that need WASM decoding
const RAW_EXTENSIONS = ['cr2', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'pef', 'srw', 'x3f', 'raw'];

function isRawFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return RAW_EXTENSIONS.includes(ext);
}

interface EditorLayoutProps {
  className?: string;
}

export function EditorLayout({ className }: EditorLayoutProps) {
  const { currentImage, ui, isLoading, setCurrentImage, setLoading } = useEditorStore();
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [decodeProgress, setDecodeProgress] = useState(0);

  const { decodeRaw, isDecoding, error: decodeError } = useRawDecoder();

  // Panel collapse handlers
  const toggleLeftPanel = useCallback(() => {
    setIsLeftPanelCollapsed(prev => !prev);
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Load regular image file (JPEG, PNG, etc.)
  const loadRegularImage = useCallback((file: File): Promise<RawImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const rawImage: RawImage = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            filename: file.name,
            width: img.naturalWidth,
            height: img.naturalHeight,
            thumbnail: dataUrl,
            exif: {
              width: img.naturalWidth,
              height: img.naturalHeight,
            },
            editParams: { ...defaultEditParams },
            isRaw: false,
            loadedAt: Date.now(),
          };
          resolve(rawImage);
        };
        img.onerror = () => reject(new Error('无法加载图片'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('无法读取文件'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Load RAW file with WASM decoder
  const loadRawImage = useCallback(async (file: File): Promise<RawImage> => {
    setDecodeProgress(0);

    // Decode RAW file using WASM
    const result = await decodeRaw(file);

    if (!result) {
      throw new Error('RAW 解码失败');
    }

    console.log('Decoded RAW:', result.width, result.height, result.data.length);

    // Validate dimensions
    if (result.width <= 0 || result.height <= 0) {
      throw new Error('无效的图片尺寸');
    }

    // Calculate expected length and adjust if needed
    const expectedLength = result.width * result.height * 4;
    if (result.data.length !== expectedLength) {
      console.warn('Data length mismatch:', result.data.length, 'expected:', expectedLength);

      // Try to infer correct dimensions from data length
      const pixelCount = result.data.length / 4;
      if (pixelCount > 0) {
        // Use metadata width if available, otherwise calculate
        let adjustedWidth = result.width;
        let adjustedHeight = Math.round(pixelCount / adjustedWidth);

        // Verify the adjustment makes sense
        if (adjustedWidth * adjustedHeight * 4 === result.data.length) {
          console.log('Adjusted dimensions:', adjustedWidth, 'x', adjustedHeight);
          result.width = adjustedWidth;
          result.height = adjustedHeight;
        } else {
          // Try different dimension combinations
          for (let w = Math.floor(Math.sqrt(pixelCount)); w <= result.width + 100; w++) {
            const h = Math.round(pixelCount / w);
            if (w * h === pixelCount && Math.abs(w - result.width) < 100) {
              console.log('Found matching dimensions:', w, 'x', h);
              result.width = w;
              result.height = h;
              break;
            }
          }
        }
      }
    }

    // Create thumbnail from decoded data
    const canvas = document.createElement('canvas');
    const thumbSize = 256;
    const aspectRatio = result.width / result.height;
    let thumbWidth = thumbSize;
    let thumbHeight = thumbSize;
    if (aspectRatio > 1) {
      thumbHeight = thumbSize / aspectRatio;
    } else {
      thumbWidth = thumbSize * aspectRatio;
    }
    canvas.width = Math.round(thumbWidth);
    canvas.height = Math.round(thumbHeight);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create ImageData from decoded RGBA data
      const imgData = new ImageData(result.data, result.width, result.height);

      // Create temporary canvas for full image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = result.width;
      tempCanvas.height = result.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      }
    }
    const thumbnail = canvas.toDataURL('image/jpeg', 0.8);

    setDecodeProgress(100);

    return {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      filename: file.name,
      width: result.width,
      height: result.height,
      decodedData: result.data,
      thumbnail,
      exif: {
        width: result.width,
        height: result.height,
      },
      editParams: { ...defaultEditParams },
      isRaw: true,
      loadedAt: Date.now(),
    };
  }, [decodeRaw]);

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setLoading(true);
    setDecodeProgress(0);

    try {
      let rawImage: RawImage;

      if (isRawFile(file.name)) {
        // Use WASM decoder for RAW files
        rawImage = await loadRawImage(file);
      } else {
        // Use regular loader for JPEG/PNG
        rawImage = await loadRegularImage(file);
      }

      setCurrentImage(rawImage);
    } catch (err) {
      console.error('Failed to load image:', err);
    } finally {
      setLoading(false);
      setDecodeProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [setCurrentImage, setLoading, loadRawImage, loadRegularImage]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/') && !isRawFile(file.name)) {
      return;
    }

    setLoading(true);
    setDecodeProgress(0);

    try {
      let rawImage: RawImage;

      if (isRawFile(file.name)) {
        rawImage = await loadRawImage(file);
      } else {
        rawImage = await loadRegularImage(file);
      }

      setCurrentImage(rawImage);
    } catch (err) {
      console.error('Failed to load dropped image:', err);
    } finally {
      setLoading(false);
      setDecodeProgress(0);
    }
  }, [setCurrentImage, setLoading, loadRawImage, loadRegularImage]);

  // If no image is loaded, show empty state
  if (!currentImage && !isLoading) {
    return (
      <div
        className={cn('flex flex-col h-full bg-gray-900', className)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <EditorToolbar />
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileChange}
        />
        <div className={cn(
          'flex-1 flex items-center justify-center transition-colors',
          isDragging && 'bg-blue-900/30 ring-2 ring-blue-500 ring-inset'
        )}>
          <div className="text-center text-gray-400">
            <div className="mb-4 text-6xl">📷</div>
            <p className="text-lg mb-2">没有打开的照片</p>
            <p className="text-sm text-gray-500">拖放图片文件到此处或点击导入</p>
            <p className="text-xs text-gray-600 mt-2">支持 JPEG, PNG, RAW (CR2, NEF, ARW, DNG 等)</p>
            <button
              onClick={handleImportClick}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              导入照片
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col h-full bg-gray-900 overflow-hidden', className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Toolbar */}
      <EditorToolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Canvas Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Main Canvas */}
          <div className="flex-1 relative overflow-hidden">
            {currentImage && <EditorCanvas />}
          </div>

          {/* Bottom Filmstrip */}
          <Filmstrip />
        </div>

        {/* Right Side - Adjustment Panel */}
        <div
          className={cn(
            'flex flex-col bg-gray-800 border-l border-gray-700 transition-all duration-200 overflow-hidden',
            ui.isPanelCollapsed ? 'w-12' : 'w-[320px] min-w-[280px] max-w-[400px]'
          )}
        >
          {/* Histogram at top */}
          {!ui.isPanelCollapsed && (
            <div className="h-24 shrink-0 border-b border-gray-700 p-2">
              <Histogram />
            </div>
          )}

          {/* Panel Toggle */}
          <button
            onClick={() => useEditorStore.getState().togglePanelCollapse()}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-gray-700 rounded-l flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 z-10"
          >
            {ui.isPanelCollapsed ? '◀' : '▶'}
          </button>

          {/* Adjustment Panel */}
          {!ui.isPanelCollapsed && <AdjustmentPanel />}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p>{isDecoding ? `正在解码 RAW 文件... ${decodeProgress}%` : '正在加载...'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorLayout;
