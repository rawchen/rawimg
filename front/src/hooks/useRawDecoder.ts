import { useCallback, useState } from 'react';

// Dynamic import for libraw-wasm to avoid SSR issues
let LibRawClass: any = null;

const loadLibRaw = async () => {
  if (!LibRawClass) {
    const module = await import('libraw-wasm');
    LibRawClass = module.default;
    console.log('LibRaw loaded:', LibRawClass);
  }
  return LibRawClass;
};

interface RawDecodeResult {
  width: number;
  height: number;
  data: Uint8ClampedArray;  // RGBA pixel data
}

interface RawMetadata {
  width: number;
  height: number;
  iso?: number;
  shutter?: string;
  aperture?: number;
  focalLength?: string;
  make?: string;
  model?: string;
  timestamp?: string;
}

interface UseRawDecoderResult {
  isDecoding: boolean;
  error: string | null;
  progress: number;
  decodeRaw: (file: File) => Promise<RawDecodeResult | null>;
  getMetadata: (file: File) => Promise<RawMetadata | null>;
}

/**
 * Convert RGB data to RGBA
 */
function rgbToRgba(rgb: Uint8Array): Uint8ClampedArray {
  const pixelCount = rgb.length / 3;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const rgbIndex = i * 3;
    const rgbaIndex = i * 4;

    rgba[rgbaIndex] = rgb[rgbIndex];         // R
    rgba[rgbaIndex + 1] = rgb[rgbIndex + 1]; // G
    rgba[rgbaIndex + 2] = rgb[rgbIndex + 2]; // B
    rgba[rgbaIndex + 3] = 255;                // A
  }

  return rgba;
}

/**
 * Process raw image data and convert to RGBA
 */
function processImageData(rawData: Uint8Array, width: number, height: number): RawDecodeResult | null {
  if (!rawData || rawData.length === 0) {
    console.error('No data to process');
    return null;
  }

  console.log('Processing image data:', rawData.length, 'bytes for', width, 'x', height);

  const expectedRgb = width * height * 3;
  const expectedRgba = width * height * 4;

  let rgbaData: Uint8ClampedArray;
  let finalWidth = width;
  let finalHeight = height;

  if (rawData.length === expectedRgb) {
    console.log('Converting RGB to RGBA...');
    rgbaData = rgbToRgba(rawData);
  } else if (rawData.length === expectedRgba) {
    console.log('Data is already RGBA');
    rgbaData = rawData instanceof Uint8ClampedArray
      ? rawData
      : new Uint8ClampedArray(rawData.buffer || rawData);
  } else {
    // Try to determine format
    const pixelCount = width * height;
    const bytesPerPixel = rawData.length / pixelCount;
    console.log('Bytes per pixel:', bytesPerPixel);

    if (rawData.length % 3 === 0) {
      // Likely RGB
      console.log('Assuming RGB format based on length');
      rgbaData = rgbToRgba(rawData);
      // Recalculate dimensions
      const newPixelCount = rgbaData.length / 4;
      const aspectRatio = width / height;
      finalHeight = Math.round(Math.sqrt(newPixelCount / aspectRatio));
      finalWidth = Math.round(newPixelCount / finalHeight);
      console.log('Calculated dimensions:', finalWidth, 'x', finalHeight);
    } else if (rawData.length % 4 === 0) {
      console.log('Assuming RGBA format based on length');
      rgbaData = rawData instanceof Uint8ClampedArray
        ? rawData
        : new Uint8ClampedArray(rawData.buffer || rawData);
      // Recalculate dimensions
      const newPixelCount = rgbaData.length / 4;
      const aspectRatio = width / height;
      finalHeight = Math.round(Math.sqrt(newPixelCount / aspectRatio));
      finalWidth = Math.round(newPixelCount / finalHeight);
    } else {
      console.error('Unknown data format, length:', rawData.length);
      return null;
    }
  }

  console.log('Final dimensions:', finalWidth, 'x', finalHeight, 'RGBA bytes:', rgbaData.length);

  return {
    width: finalWidth,
    height: finalHeight,
    data: rgbaData,
  };
}

export function useRawDecoder(): UseRawDecoderResult {
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const decodeRaw = useCallback(async (file: File): Promise<RawDecodeResult | null> => {
    setIsDecoding(true);
    setError(null);
    setProgress(0);

    let libraw: any = null;

    try {
      // Load LibRaw
      setProgress(5);
      console.log('Loading LibRaw WASM...');
      const LibRaw = await loadLibRaw();
      libraw = new LibRaw();
      console.log('LibRaw instance created');

      // Log available methods
      const proto = Object.getPrototypeOf(libraw);
      const methods = Object.getOwnPropertyNames(proto).filter(name => typeof proto[name] === 'function');
      console.log('LibRaw methods:', methods);
      console.log('LibRaw own properties:', Object.keys(libraw));

      // Read file as ArrayBuffer
      setProgress(10);
      console.log('Reading file:', file.name, file.size, 'bytes');
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log('File read, size:', uint8Array.length);

      // Open the RAW file with processing settings
      setProgress(20);
      console.log('Opening RAW file...');
      await libraw.open(uint8Array, {
        halfSize: false,       // Full resolution
        useCameraWb: true,     // Use camera white balance
        useAutoWb: false,      // Don't use auto WB
        outputColor: 1,        // sRGB output
        outputBps: 8,          // 8-bit output
        userQual: 3,           // High quality interpolation
        highlight: 0,          // Default highlight handling
        noAutoBright: false,   // Allow auto brightness
      });
      console.log('RAW file opened');

      // Get metadata
      setProgress(40);
      const metadata = await libraw.metadata();
      console.log('RAW metadata:', metadata);

      const width = metadata?.width;
      const height = metadata?.height;

      if (!width || !height) {
        throw new Error('无法获取图片尺寸');
      }

      // Get image data
      setProgress(60);
      console.log('Calling imageData()...');
      const imageData = await libraw.imageData();
      console.log('imageData() result type:', typeof imageData, 'length:', imageData?.length);

      if (!imageData || imageData.length === 0) {
        // Try alternative methods if available
        console.log('imageData returned null/empty, checking for alternatives...');

        // Try dcrawMakeMemImage if available
        if (typeof libraw.dcrawMakeMemImage === 'function') {
          console.log('Trying dcrawMakeMemImage...');
          try {
            const memImage = libraw.dcrawMakeMemImage();
            console.log('dcrawMakeMemImage result:', memImage);
            if (memImage && memImage.data) {
              const result = processImageData(memImage.data, memImage.width || width, memImage.height || height);
              if (result) {
                setProgress(100);
                setIsDecoding(false);
                return result;
              }
            }
          } catch (e) {
            console.log('dcrawMakeMemImage error:', e);
          }
        }

        throw new Error('imageData() 返回空数据，且无替代方法可用');
      }

      setProgress(80);
      const result = processImageData(imageData, width, height);

      if (!result) {
        throw new Error('无法处理图像数据');
      }

      setProgress(100);
      setIsDecoding(false);
      return result;

    } catch (err) {
      console.error('RAW decode error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to decode RAW file';
      setError(errorMsg);
      setIsDecoding(false);
      setProgress(0);
      return null;
    }
  }, []);

  const getMetadata = useCallback(async (file: File): Promise<RawMetadata | null> => {
    let libraw: any = null;
    try {
      const LibRaw = await loadLibRaw();
      libraw = new LibRaw();

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      await libraw.open(uint8Array, { halfSize: true });
      const metadata = await libraw.metadata();

      return {
        width: metadata?.width,
        height: metadata?.height,
        iso: metadata?.iso_speed,
        shutter: metadata?.shutter,
        aperture: metadata?.aperture,
        focalLength: metadata?.focal_len,
        make: metadata?.camera_make || metadata?.make,
        model: metadata?.camera_model || metadata?.model,
        timestamp: metadata?.timestamp,
      };
    } catch (err) {
      console.error('Failed to get RAW metadata:', err);
      return null;
    }
  }, []);

  return {
    isDecoding,
    error,
    progress,
    decodeRaw,
    getMetadata,
  };
}
