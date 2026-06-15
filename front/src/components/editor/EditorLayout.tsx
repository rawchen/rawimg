import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editorStore';
import { EditorCanvas } from './EditorCanvas';
import { AdjustmentPanel } from './AdjustmentPanel';
import { Histogram } from './Histogram';
import { EditorToolbar } from './EditorToolbar';
import { Filmstrip } from './Filmstrip';
import { useRawDecoder } from '@/hooks/useRawDecoder';
import type { RawImage, EditParams, ExifData } from '@/types';
import EXIF from 'exif-js';

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

  const { decodeRaw, getMetadata, isDecoding, error: decodeError } = useRawDecoder();

  // Panel collapse handlers
  const toggleLeftPanel = useCallback(() => {
    setIsLeftPanelCollapsed(prev => !prev);
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Load regular image file (JPEG, PNG, etc.) with EXIF parsing
  const loadRegularImage = useCallback((file: File): Promise<RawImage> => {
    return new Promise((resolve, reject) => {
      // Start fake progress for regular images (faster)
      let progress = 0;
      const progressInterval = setInterval(() => {
        const remaining = 90 - progress;
        const increment = Math.max(1, remaining * 0.15);
        progress = Math.min(90, progress + increment);
        setDecodeProgress(Math.round(progress));
      }, 50);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Save dimensions before EXIF modifies the img
          const imgWidth = img.naturalWidth;
          const imgHeight = img.naturalHeight;

          // Parse EXIF data
          const exifData: ExifData = {
            width: imgWidth,
            height: imgHeight,
          };

          try {
            EXIF.getData(img as any, function(this: any) {
              const allData = EXIF.getAllTags(this);
              console.log('EXIF data:', allData);

              exifData.make = EXIF.getTag(this, 'Make') || undefined;
              exifData.model = EXIF.getTag(this, 'Model') || undefined;
              exifData.lens = EXIF.getTag(this, 'LensModel') || EXIF.getTag(this, 'LensInfo') || undefined;
              exifData.focalLength = EXIF.getTag(this, 'FocalLength') || undefined;

              const aperture = EXIF.getTag(this, 'FNumber');
              exifData.aperture = aperture ? aperture.numerator / aperture.denominator : undefined;

              const shutter = EXIF.getTag(this, 'ExposureTime');
              if (shutter) {
                if (shutter.numerator >= shutter.denominator) {
                  exifData.shutterSpeed = `${shutter.numerator / shutter.denominator}s`;
                } else {
                  exifData.shutterSpeed = `${shutter.numerator}/${shutter.denominator}s`;
                }
              }

              exifData.iso = EXIF.getTag(this, 'ISOSpeedRatings') || EXIF.getTag(this, 'ISO') || undefined;
              exifData.datetime = EXIF.getTag(this, 'DateTime') || undefined;
              exifData.orientation = EXIF.getTag(this, 'Orientation') || undefined;
              exifData.whiteBalance = EXIF.getTag(this, 'WhiteBalance') || undefined;
              exifData.flash = EXIF.getTag(this, 'Flash') || undefined;

              // Parse exposure program/mode
              const exposureProgram = EXIF.getTag(this, 'ExposureProgram');
              if (exposureProgram !== undefined) {
                const exposureProgramMap: Record<number, string> = {
                  0: '未定义',
                  1: '手动',
                  2: '程序自动',
                  3: '光圈优先',
                  4: '快门优先',
                  5: '创意程序',
                  6: '动作程序',
                  7: '肖像模式',
                  8: '风景模式',
                };
                exifData.exposureMode = exposureProgramMap[exposureProgram] || `模式 ${exposureProgram}`;
              }

              const gpsLat = EXIF.getTag(this, 'GPSLatitude');
              const gpsLatRef = EXIF.getTag(this, 'GPSLatitudeRef');
              const gpsLon = EXIF.getTag(this, 'GPSLongitude');
              const gpsLonRef = EXIF.getTag(this, 'GPSLongitudeRef');
              const gpsAlt = EXIF.getTag(this, 'GPSAltitude');

              if (gpsLat && gpsLon) {
                const toDecimal = (coords: number[], ref: string) => {
                  const decimal = coords[0] + coords[1] / 60 + coords[2] / 3600;
                  return ref === 'S' || ref === 'W' ? -decimal : decimal;
                };
                exifData.gps = {
                  latitude: toDecimal(gpsLat, gpsLatRef || 'N'),
                  longitude: toDecimal(gpsLon, gpsLonRef || 'E'),
                  altitude: gpsAlt ? gpsAlt.numerator / gpsAlt.denominator : undefined,
                };
              }
            });
          } catch (exifErr) {
            console.warn('EXIF parsing failed, continuing without EXIF:', exifErr);
          }

          clearInterval(progressInterval);
          setDecodeProgress(100);

          const rawImage: RawImage = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            filename: file.name,
            width: imgWidth,
            height: imgHeight,
            thumbnail: dataUrl,
            exif: exifData,
            editParams: { ...defaultEditParams },
            isRaw: false,
            loadedAt: Date.now(),
          };
          resolve(rawImage);
        };
        img.onerror = () => {
          clearInterval(progressInterval);
          reject(new Error('无法加载图片'));
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        clearInterval(progressInterval);
        reject(new Error('无法读取文件'));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Load RAW file with WASM decoder with fake progress
  const loadRawImage = useCallback(async (file: File): Promise<RawImage> => {
    setDecodeProgress(0);

    // Estimate decode time based on file size
    // Large RAW files (~30MB) take about 8-12 seconds
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedTime = Math.max(3000, Math.min(15000, fileSizeMB * 400)); // 3-15 seconds

    // Initial progress - file reading
    setDecodeProgress(3);

    // Progress animation based on estimated time
    let currentProgress = 3;
    let targetProgress = 75; // 解码阶段目标
    const progressInterval = setInterval(() => {
      if (currentProgress < targetProgress) {
        // Smooth increment
        const increment = Math.max(0.3, (targetProgress - currentProgress) * 0.05);
        currentProgress = Math.min(targetProgress, currentProgress + increment);
        setDecodeProgress(Math.round(currentProgress));
      }
    }, 50);

    let result;
    try {
      // Decode RAW file using WASM
      result = await decodeRaw(file);
    } catch (err) {
      clearInterval(progressInterval);
      setDecodeProgress(0);
      throw err;
    }

    if (!result) {
      clearInterval(progressInterval);
      setDecodeProgress(0);
      throw new Error('RAW 解码失败');
    }

    console.log('Decoded RAW:', result.width, result.height, result.data.length);

    // Validate dimensions
    if (result.width <= 0 || result.height <= 0) {
      clearInterval(progressInterval);
      setDecodeProgress(0);
      throw new Error('无效的图片尺寸');
    }

    // 阶段2: 处理图像数据 (75% -> 88%)
    targetProgress = 88;
    await new Promise<void>((resolve) => {
      const processingInterval = setInterval(() => {
        if (currentProgress < targetProgress) {
          currentProgress = Math.min(targetProgress, currentProgress + 1);
          setDecodeProgress(Math.round(currentProgress));
        } else {
          clearInterval(processingInterval);
          resolve();
        }
      }, 30);
    });

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
    const thumbnail = canvas.toDataURL('image/jpeg', 1);

    // 阶段3: 生成缩略图 (88% -> 95%)
    targetProgress = 95;
    await new Promise<void>((resolve) => {
      const thumbInterval = setInterval(() => {
        if (currentProgress < targetProgress) {
          currentProgress = Math.min(targetProgress, currentProgress + 0.8);
          setDecodeProgress(Math.round(currentProgress));
        } else {
          clearInterval(thumbInterval);
          resolve();
        }
      }, 30);
    });

    // Get RAW metadata
    const metadata = await getMetadata(file);
    console.log('RAW metadata:', metadata);

    // 阶段4: 读取元数据 (95% -> 100%)
    targetProgress = 100;
    await new Promise<void>((resolve) => {
      const metaInterval = setInterval(() => {
        if (currentProgress < targetProgress) {
          currentProgress = Math.min(targetProgress, currentProgress + 0.5);
          setDecodeProgress(Math.round(currentProgress));
        } else {
          clearInterval(metaInterval);
          resolve();
        }
      }, 30);
    });

    const exifData: ExifData = {
      width: result.width,
      height: result.height,
    };

    if (metadata) {
      exifData.make = metadata.make || undefined;
      exifData.model = metadata.model || undefined;
      exifData.iso = metadata.iso || undefined;
      exifData.aperture = metadata.aperture || undefined;
      exifData.exposureMode = metadata.exposureMode || undefined;

      // Format shutter speed: convert decimal to fraction (e.g., 0.000625 -> 1/1600s)
      if (metadata.shutter !== undefined && metadata.shutter !== null) {
        const shutter = metadata.shutter;
        if (shutter >= 1) {
          exifData.shutterSpeed = `${shutter}s`;
        } else if (shutter > 0) {
          // Find the closest standard denominator
          const denominator = Math.round(1 / shutter);
          // Check if it's a standard fraction (within 5% tolerance)
          const actualValue = 1 / denominator;
          if (Math.abs(shutter - actualValue) / shutter < 0.05) {
            exifData.shutterSpeed = `1/${denominator}s`;
          } else {
            // Not a standard fraction, show decimal
            exifData.shutterSpeed = `${shutter.toFixed(4)}s`;
          }
        }
      }

      exifData.focalLength = metadata.focalLength ? parseFloat(metadata.focalLength) : undefined;
      // Convert timestamp to string if it's a Date object
      if (metadata.timestamp) {
        const ts = metadata.timestamp;
        exifData.datetime = typeof ts === 'object' && 'toLocaleString' in ts
          ? ts.toLocaleString()
          : String(ts);
      }
    }

    setDecodeProgress(100);
    return {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      filename: file.name,
      width: result.width,
      height: result.height,
      decodedData: result.data,
      thumbnail,
      exif: exifData,
      editParams: { ...defaultEditParams },
      isRaw: true,
      loadedAt: Date.now(),
    };
  }, [decodeRaw, getMetadata]);

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
        className={cn('flex flex-col h-full bg-[#F5F7FA]', className)}
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
          isDragging && 'bg-orange-100/50 ring-2 ring-orange-500 ring-inset'
        )}>
          <div className="text-center text-gray-600">
            <div className="mb-4 text-6xl">📷</div>
            <p className="text-lg mb-2 text-gray-900 font-medium">没有打开的照片</p>
            <p className="text-sm text-gray-500">拖放图片文件到此处或点击导入</p>
            <p className="text-xs text-gray-400 mt-2">支持 JPEG, PNG, RAW (CR2, NEF, ARW, DNG 等)</p>
            <button
              onClick={handleImportClick}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer"
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
      className={cn('flex flex-col h-full bg-[#F5F7FA] overflow-hidden', className)}
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

            {/* Loading Overlay - centered on canvas */}
            {isLoading && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-50">
                <div className="text-center text-gray-900 w-64 bg-white rounded-xl p-6 shadow-xl">
                  {/* Step description */}
                  <p className="mb-4 text-sm text-gray-600">
                    {decodeProgress < 5
                      ? '读取文件...'
                      : decodeProgress < 70
                        ? '解码 RAW 文件...'
                        : decodeProgress < 88
                          ? '处理图像数据...'
                          : decodeProgress < 95
                            ? '生成缩略图...'
                            : '读取 EXIF 元数据...'}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-100"
                      style={{ width: `${decodeProgress}%` }}
                    />
                  </div>

                  {/* Percentage */}
                  <p className="text-lg font-medium text-gray-900">{decodeProgress}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Filmstrip */}
          <Filmstrip />
        </div>

        {/* Right Side - Adjustment Panel */}
        <div
          className={cn(
            'flex flex-col bg-white border-l border-gray-200 transition-all duration-200 overflow-hidden',
            ui.isPanelCollapsed ? 'w-12' : 'w-[320px] min-w-[280px] max-w-[400px]'
          )}
        >
          {/* Histogram at top */}
          {!ui.isPanelCollapsed && (
            <div className="h-24 shrink-0 border-b border-gray-200 bg-gray-50">
              <Histogram />
            </div>
          )}

          {/* Panel Toggle */}
          <button
            onClick={() => useEditorStore.getState().togglePanelCollapse()}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 bg-white rounded-l flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-gray-50 z-10 border border-gray-200 border-l-0 cursor-pointer"
          >
            {ui.isPanelCollapsed ? '◀' : '▶'}
          </button>

          {/* Adjustment Panel */}
          {!ui.isPanelCollapsed && <AdjustmentPanel />}
        </div>
      </div>
    </div>
  );
}

export default EditorLayout;
