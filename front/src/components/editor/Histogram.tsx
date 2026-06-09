import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';

export function Histogram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentImage, ui } = useEditorStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Set canvas size
    canvas.width = 280;
    canvas.height = 80;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw placeholder histogram
    if (!currentImage?.histogram) {
      // Generate a basic histogram curve for visual purposes
      ctx.beginPath();
      ctx.moveTo(0, 60);

      // Simple bell curve shape
      for (let x = 0; x < canvas.width; x++) {
        const normalizedX = x / canvas.width;
        const y = 60 - 50 * Math.exp(-Math.pow(normalizedX - 0.5, 2) * 8);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(canvas.width, 60);
      ctx.closePath();

      // Fill with gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(0.25, 'rgba(0,0,0,0.5)');
      gradient.addColorStop(0.5, 'rgba(128,128,128,0.7)');
      gradient.addColorStop(0.75, 'rgba(255,255,255,0.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0.3)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw RGB channels
      // Red channel
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 60);
      for (let x = 0; x < canvas.width; x++) {
        const normalizedX = x / canvas.width;
        const y = 60 - 40 * Math.exp(-Math.pow(normalizedX - 0.45, 2) * 6);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Green channel
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, 60);
      for (let x = 0; x < canvas.width; x++) {
        const normalizedX = x / canvas.width;
        const y = 60 - 45 * Math.exp(-Math.pow(normalizedX - 0.5, 2) * 7);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Blue channel
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, 60);
      for (let x = 0; x < canvas.width; x++) {
        const normalizedX = x / canvas.width;
        const y = 60 - 35 * Math.exp(-Math.pow(normalizedX - 0.55, 2) * 8);
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.fillText('0', 5, 75);
      ctx.fillText('255', canvas.width - 25, 75);
    } else {
      // Draw actual histogram data
      const { r, g, b, luminance } = currentImage.histogram;

      const drawChannel = (data: number[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const maxVal = Math.max(...data);
        const scale = 50 / maxVal;
        for (let i = 0; i < 256; i++) {
          const x = (i / 255) * canvas.width;
          const y = 60 - data[i] * scale;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawChannel(r, 'rgba(255, 0, 0, 0.5)');
      drawChannel(g, 'rgba(0, 255, 0, 0.5)');
      drawChannel(b, 'rgba(0, 0, 255, 0.5)');
      drawChannel(luminance, 'rgba(255, 255, 255, 0.3)');
    }
  }, [currentImage, ui.showBeforeAfter]);

  if (!ui.showHistogram) return null;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
      />
    </div>
  );
}

export default Histogram;