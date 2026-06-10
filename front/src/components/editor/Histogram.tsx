import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useWebGLRenderer } from '@/hooks/useWebGLRenderer';
import type { HistogramData } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Calculate histogram data from RGBA pixel data
 */
export function calculateHistogram(data: Uint8ClampedArray): HistogramData {
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const luminance = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const rv = data[i];
    const gv = data[i + 1];
    const bv = data[i + 2];

    r[rv]++;
    g[gv]++;
    b[bv]++;

    // Calculate luminance using Rec. 709 formula
    const l = Math.round(0.2126 * rv + 0.7152 * gv + 0.0722 * bv);
    luminance[l]++;
  }

  return { r, g, b, luminance };
}

interface ChannelVisibility {
  r: boolean;
  g: boolean;
  b: boolean;
  luminance: boolean;
}

export function Histogram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const histCanvasRef = useRef<HTMLCanvasElement>(null);
  const { currentImage, params, ui } = useEditorStore();
  const { setCanvas, isReady, loadImage, render, getRenderedPixels } = useWebGLRenderer();

  const [histogram, setHistogram] = useState<HistogramData | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [channelVisible, setChannelVisible] = useState<ChannelVisibility>({
    r: true,
    g: true,
    b: true,
    luminance: false,
  });

  // Calculate histogram from rendered image
  const updateHistogram = useCallback(() => {
    if (!isReady || !currentImage || !getRenderedPixels) return;

    // Use multiple RAF to ensure WebGL has finished rendering
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const pixels = getRenderedPixels();
        if (pixels && pixels.length > 0) {
          const hist = calculateHistogram(pixels);
          setHistogram(hist);
          console.log('Histogram calculated, pixels length:', pixels.length);
        }
      });
    });
  }, [isReady, currentImage, getRenderedPixels]);

  // Set up hidden WebGL canvas for histogram calculation
  useEffect(() => {
    if (histCanvasRef.current) {
      setCanvas(histCanvasRef.current);
    }
  }, [setCanvas]);

  // Resize hidden canvas based on image dimensions
  useEffect(() => {
    if (!histCanvasRef.current || !currentImage) return;

    const maxDim = 128;
    const scale = Math.min(1, maxDim / Math.max(currentImage.width, currentImage.height));
    histCanvasRef.current.width = Math.floor(currentImage.width * scale);
    histCanvasRef.current.height = Math.floor(currentImage.height * scale);
  }, [currentImage?.width, currentImage?.height]);

  // Load image to histogram canvas
  useEffect(() => {
    if (!currentImage || !isReady) return;

    if (currentImage.decodedData) {
      loadImage({
        data: currentImage.decodedData,
        width: currentImage.width,
        height: currentImage.height,
      });
    } else if (currentImage.thumbnail) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadImage(img);
      };
      img.src = currentImage.thumbnail;
    }
  }, [currentImage?.id, currentImage?.decodedData, currentImage?.thumbnail, isReady, loadImage]);

  // Render and calculate histogram when params change
  useEffect(() => {
    if (!isReady || !currentImage || !histCanvasRef.current) return;

    const maxDim = 128;
    const scale = Math.min(1, maxDim / Math.max(currentImage.width, currentImage.height));
    const width = Math.floor(currentImage.width * scale);
    const height = Math.floor(currentImage.height * scale);

    render(params, width, height, 1);

    // Wait for render to complete
    updateHistogram();
  }, [currentImage, params, isReady, render, updateHistogram]);

  // Draw histogram with flame effect - responsive to container size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !container) return;

    // Match canvas size to container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, width, height);

    if (!histogram) {
      // Draw placeholder
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('加载中...', width / 2, height / 2);
      return;
    }

    // Find max value for scaling - use 98th percentile to avoid spike outliers
    const getPercentile = (data: number[], percentile: number) => {
      const sorted = [...data].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * percentile / 100)];
    };

    let maxVal = 1;
    if (channelVisible.r) maxVal = Math.max(maxVal, getPercentile(histogram.r, 99));
    if (channelVisible.g) maxVal = Math.max(maxVal, getPercentile(histogram.g, 99));
    if (channelVisible.b) maxVal = Math.max(maxVal, getPercentile(histogram.b, 99));
    if (channelVisible.luminance) maxVal = Math.max(maxVal, getPercentile(histogram.luminance, 99));

    const scaleY = (height - 4) / maxVal;
    const scaleX = width / 256;

    // Use additive blending so RGB overlap shows white
    ctx.globalCompositeOperation = 'lighter';

    // Draw channels as filled areas (flame effect)
    const drawChannel = (data: number[], baseColor: { r: number; g: number; b: number }) => {
      ctx.beginPath();
      ctx.moveTo(0, height - 2);

      for (let i = 0; i < 256; i++) {
        const x = i * scaleX;
        const y = height - 2 - Math.min(data[i] * scaleY, height - 4);
        ctx.lineTo(x, Math.max(2, y));
      }

      ctx.lineTo(width, height - 2);
      ctx.closePath();

      // Create gradient for flame effect - keep color at bottom so overlap shows white
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `rgba(${baseColor.r},${baseColor.g},${baseColor.b},1)`);
      gradient.addColorStop(0.5, `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.7)`);
      gradient.addColorStop(1, `rgba(${baseColor.r},${baseColor.g},${baseColor.b},0.4)`);

      ctx.fillStyle = gradient;
      ctx.fill();
    };

    // Draw luminance first (white, at back)
    if (channelVisible.luminance) {
      drawChannel(histogram.luminance, { r: 255, g: 255, b: 255 });
    }

    // Draw RGB channels - lighter mode makes overlap white
    if (channelVisible.r) {
      drawChannel(histogram.r, { r: 255, g: 0, b: 0 });
    }
    if (channelVisible.g) {
      drawChannel(histogram.g, { r: 0, g: 255, b: 0 });
    }
    if (channelVisible.b) {
      drawChannel(histogram.b, { r: 0, g: 0, b: 255 });
    }

    // Reset blend mode
    ctx.globalCompositeOperation = 'source-over';
  }, [histogram, channelVisible]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle channel visibility
  const toggleChannel = (channel: keyof ChannelVisibility) => {
    setChannelVisible(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  if (!ui.showHistogram) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Histogram canvas - fills container */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />

      {/* Channel toggles - only visible on hover */}
      <div
        className={cn(
          'absolute top-1 right-1 flex gap-1 transition-opacity duration-200',
          isHovering ? 'opacity-100' : 'opacity-0'
        )}
      >
        <button
          onClick={() => toggleChannel('r')}
          className={cn(
            'px-1.5 py-0.5 text-xs font-medium rounded transition-colors',
            channelVisible.r
              ? 'bg-red-500 text-white'
              : 'bg-gray-600/80 text-gray-300 hover:bg-gray-500'
          )}
        >
          R
        </button>
        <button
          onClick={() => toggleChannel('g')}
          className={cn(
            'px-1.5 py-0.5 text-xs font-medium rounded transition-colors',
            channelVisible.g
              ? 'bg-green-500 text-white'
              : 'bg-gray-600/80 text-gray-300 hover:bg-gray-500'
          )}
        >
          G
        </button>
        <button
          onClick={() => toggleChannel('b')}
          className={cn(
            'px-1.5 py-0.5 text-xs font-medium rounded transition-colors',
            channelVisible.b
              ? 'bg-blue-500 text-white'
              : 'bg-gray-600/80 text-gray-300 hover:bg-gray-500'
          )}
        >
          B
        </button>
        <button
          onClick={() => toggleChannel('luminance')}
          className={cn(
            'px-1.5 py-0.5 text-xs font-medium rounded transition-colors',
            channelVisible.luminance
              ? 'bg-gray-300 text-gray-800'
              : 'bg-gray-600/80 text-gray-300 hover:bg-gray-500'
          )}
        >
          L
        </button>
      </div>

      {/* Hidden canvas for WebGL histogram calculation */}
      <canvas
        ref={histCanvasRef}
        width={128}
        height={128}
        className="hidden"
      />
    </div>
  );
}

export default Histogram;