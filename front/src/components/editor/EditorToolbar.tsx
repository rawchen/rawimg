import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import {
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DownloadOutlined,
  EyeOutlined,
  FullscreenOutlined,
  SettingOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import type { RawImage, EditParams } from '@/types';

// Accept common image formats + RAW extensions
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.bmp,.tiff,.tif,.cr2,.nef,.arw,.dng,.orf,.rw2,.raf,.pef,.srw,.x3f,.raw';

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

export function EditorToolbar() {
  const {
    currentImage,
    canUndo,
    canRedo,
    undo,
    redo,
    ui,
    zoomIn,
    zoomOut,
    zoomTo,
    fitToScreen,
    zoomTo100,
    toggleBeforeAfter,
    setCurrentImage,
    setLoading,
  } = useEditorStore();

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png' | 'tiff'>('jpeg');

  const handleExport = useCallback(() => {
    // TODO: Implement export
    console.log('Exporting as', exportFormat);
  }, [exportFormat]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => reject(new Error('无法读取文件'));
        reader.readAsDataURL(file);
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('无法加载图片'));
        img.src = dataUrl;
      });

      const ext = file.name.toLowerCase().split('.').pop() || '';
      const rawExtensions = ['cr2', 'nef', 'arw', 'dng', 'orf', 'rw2', 'raf', 'pef', 'srw', 'x3f', 'raw', 'tiff', 'tif'];
      const isRaw = rawExtensions.includes(ext);

      const rawImage: RawImage = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        filename: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        thumbnail: dataUrl,
        exif: { width: img.naturalWidth, height: img.naturalHeight },
        editParams: { ...defaultEditParams },
        isRaw,
        loadedAt: Date.now(),
      };
      setCurrentImage(rawImage);
    } catch (err) {
      console.error('Failed to load image:', err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [setCurrentImage, setLoading]);

  return (
    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
      {/* Left side - Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded text-sm hover:bg-gray-600 flex items-center gap-2"
          title="返回图库"
        >
          <FolderOpenOutlined />
          <span className="hidden sm:inline">库</span>
        </button>
        <button
          onClick={handleImportClick}
          className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded text-sm hover:bg-gray-600 flex items-center gap-2"
          title="导入照片"
        >
          <span className="hidden sm:inline">导入</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Center - Edit controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={cn(
            'p-2 rounded hover:bg-gray-700',
            canUndo() ? 'text-gray-200' : 'text-gray-600 cursor-not-allowed'
          )}
          title="撤销 (Ctrl+Z)"
        >
          <UndoOutlined />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={cn(
            'p-2 rounded hover:bg-gray-700',
            canRedo() ? 'text-gray-200' : 'text-gray-600 cursor-not-allowed'
          )}
          title="重做 (Ctrl+Shift+Z)"
        >
          <RedoOutlined />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={zoomOut}
          className="p-2 rounded hover:bg-gray-700 text-gray-200"
          title="缩小"
        >
          <ZoomOutOutlined />
        </button>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={Math.round(ui.zoom * 100)}
            onChange={(e) => zoomTo(parseInt(e.target.value) / 100)}
            className="w-14 h-7 bg-gray-700 text-gray-200 text-sm text-center rounded border border-gray-600"
          />
          <span className="text-gray-400 text-sm">%</span>
        </div>
        <button
          onClick={zoomIn}
          className="p-2 rounded hover:bg-gray-700 text-gray-200"
          title="放大"
        >
          <ZoomInOutlined />
        </button>
        <button
          onClick={fitToScreen}
          className="px-2 py-1 rounded hover:bg-gray-700 text-gray-200 text-xs"
          title="适合屏幕"
        >
          适合
        </button>
        <button
          onClick={zoomTo100}
          className="px-2 py-1 rounded hover:bg-gray-700 text-gray-200 text-xs"
          title="100%"
        >
          100%
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - View and Export */}
      <div className="flex items-center gap-2">
        {/* Before/After toggle */}
        <button
          onClick={toggleBeforeAfter}
          className={cn(
            'p-2 rounded flex items-center gap-1',
            ui.showBeforeAfter ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-200'
          )}
          title="显示原图"
        >
          <EyeOutlined />
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-2 rounded hover:bg-gray-700 text-gray-200"
          title="全屏"
        >
          <FullscreenOutlined />
        </button>

        {/* Export */}
        <div className="flex items-center gap-2 ml-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
            className="bg-gray-700 text-gray-200 text-sm rounded px-2 py-1 border border-gray-600"
          >
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="tiff">TIFF</option>
          </select>
          <button
            onClick={handleExport}
            disabled={!currentImage}
            className={cn(
              'px-4 py-1.5 rounded text-sm flex items-center gap-2',
              currentImage
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            )}
          >
            <DownloadOutlined />
            导出
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditorToolbar;