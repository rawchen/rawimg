import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { Modal, Slider, Select, InputNumber, message } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DownloadOutlined,
  SettingOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Download, Fullscreen } from 'lucide-react';
import type { RawImage, EditParams, ExifData } from '@/types';

// Vertex shader source - simple fullscreen quad
const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

// Fragment shader source - simplified version for export
const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;
uniform float u_temperature;
uniform float u_tint;
uniform float u_vibrance;
uniform float u_saturation;
uniform float u_clarity;
uniform float u_dehaze;
uniform float u_texture;
uniform vec2 u_resolution;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 applyExposure(vec3 color, float exposure) {
  if (exposure == 0.0) return color;
  float mult = 1.0 + exposure * 0.15;
  vec3 result = color * mult;
  if (exposure > 0.0) {
    float blendFactor = smoothstep(0.0, 1.0, exposure);
    vec3 x = max(vec3(0.0), result);
    float a = 0.6, b = 0.5, c = 0.1, d = 0.533;
    vec3 compressed = clamp((x * (a * x + b)) / (x * (a * x + c * b) + d), 0.0, 1.0);
    result = mix(result, compressed, blendFactor);
  }
  if (exposure < 0.0) {
    float blendFactor = smoothstep(0.0, -1.0, exposure);
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float shadowFloor = 0.02 * lum;
    vec3 protected = max(result, vec3(shadowFloor));
    result = mix(result, protected, blendFactor);
  }
  return result;
}

vec3 applyContrast(vec3 color, float contrast) {
  contrast = contrast / 100.0;
  return (color - 0.5) * (1.0 + contrast) + 0.5;
}

vec3 applyHighlightsShadows(vec3 color, float highlights, float shadows) {
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  float highlightMask = smoothstep(0.5, 0.95, lum);
  if (abs(highlights) > 0.001) {
    float strength = highlights / 100.0;
    if (highlights < 0.0) {
      float compression = 1.0 + strength * highlightMask * 0.3;
      float newLum = lum * compression;
      color = color * (newLum / max(0.001, lum));
    } else {
      color *= 1.0 + strength * highlightMask * 0.5;
    }
  }
  float shadowMask = smoothstep(0.5, 0.05, lum);
  if (abs(shadows) > 0.001) {
    float strength = shadows / 100.0;
    if (shadows < 0.0) {
      float compression = 1.0 + strength * shadowMask * 0.3;
      float newLum = lum * compression;
      color = color * (newLum / max(0.001, lum));
    } else {
      color *= 1.0 + strength * shadowMask * 0.5;
    }
  }
  return clamp(color, 0.0, 1.0);
}

vec3 applyWhitesBlacks(vec3 color, float whites, float blacks) {
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  float whiteMask = smoothstep(0.7, 1.0, lum);
  color += (whites / 200.0) * whiteMask;
  float blackMask = smoothstep(0.3, 0.0, lum);
  color -= (blacks / 200.0) * blackMask;
  return clamp(color, 0.0, 1.0);
}

vec3 applyWhiteBalance(vec3 color, float temperature, float tint) {
  float temp = (temperature - 6500.0) / 100.0;
  color.r += temp * 0.01;
  color.b -= temp * 0.01;
  color.g += tint * 0.002;
  return clamp(color, 0.0, 1.0);
}

vec3 applyVibrance(vec3 color, float vibrance) {
  float maxVal = max(color.r, max(color.g, color.b));
  float minVal = min(color.r, min(color.g, color.b));
  float sat = maxVal - minVal;
  float avg = (color.r + color.g + color.b) / 3.0;
  float amt = (1.0 - sat) * vibrance / 100.0;
  color.r += (color.r - avg) * amt;
  color.g += (color.g - avg) * amt;
  color.b += (color.b - avg) * amt;
  return clamp(color, 0.0, 1.0);
}

vec3 applySaturation(vec3 color, float saturation) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, 1.0 + saturation / 100.0);
}

vec3 applyClarity(vec3 color, float clarity, vec2 uv, sampler2D img, vec2 resolution) {
  if (clarity == 0.0) return color;
  vec2 texelSize = 1.0 / resolution;
  vec3 blur = vec3(0.0);
  float kernel[9];
  kernel[0] = 1.0; kernel[1] = 2.0; kernel[2] = 1.0;
  kernel[3] = 2.0; kernel[4] = 4.0; kernel[5] = 2.0;
  kernel[6] = 1.0; kernel[7] = 2.0; kernel[8] = 1.0;
  float kernelWeight = 16.0;
  int index = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y)) * texelSize;
      blur += texture(img, uv + offset).rgb * kernel[index];
      index++;
    }
  }
  blur /= kernelWeight;
  float strength = clarity / 100.0;
  return color + (color - blur) * strength;
}

vec3 applyDehaze(vec3 color, float dehaze) {
  if (dehaze == 0.0) return color;
  float strength = dehaze / 100.0;
  float lum = dot(color, vec3(0.299, 0.587, 0.114));
  float haze = max(0.0, lum - 0.5) * 2.0;
  color = (color - haze * 0.5) / (1.0 - haze * strength * 0.5);
  return clamp(color, 0.0, 1.0);
}

void main() {
  vec4 texColor = texture(u_image, v_texCoord);
  vec3 color = texColor.rgb;
  color = applyWhiteBalance(color, u_temperature, u_tint);
  color = applyExposure(color, u_exposure);
  color = applyHighlightsShadows(color, u_highlights, u_shadows);
  color = applyWhitesBlacks(color, u_whites, u_blacks);
  color = applyContrast(color, u_contrast);
  if (abs(u_clarity) > 0.001) {
    color = applyClarity(color, u_clarity, v_texCoord, u_image, u_resolution);
  }
  color = applyDehaze(color, u_dehaze);
  color = applyVibrance(color, u_vibrance);
  color = applySaturation(color, u_saturation);
  fragColor = vec4(clamp(color, 0.0, 1.0), texColor.a);
}
`;

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
    params,
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
    setCurrentImage,
    setLoading,
  } = useEditorStore();

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png' | 'tiff'>('jpeg');
  const [exportQuality, setExportQuality] = useState(80);
  const [exportWidth, setExportWidth] = useState<number | null>(null);
  const [exportHeight, setExportHeight] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize export dimensions when modal opens
  const openExportModal = useCallback(() => {
    if (currentImage) {
      setExportWidth(currentImage.width);
      setExportHeight(currentImage.height);
    }
    setExportModalVisible(true);
  }, [currentImage]);

  // Handle width change with aspect ratio lock
  const handleWidthChange = useCallback((value: number | null) => {
    setExportWidth(value);
    if (value && currentImage && exportHeight) {
      const aspectRatio = currentImage.width / currentImage.height;
      setExportHeight(Math.round(value / aspectRatio));
    }
  }, [currentImage, exportHeight]);

  // Handle height change with aspect ratio lock
  const handleHeightChange = useCallback((value: number | null) => {
    setExportHeight(value);
    if (value && currentImage && exportWidth) {
      const aspectRatio = currentImage.width / currentImage.height;
      setExportWidth(Math.round(value * aspectRatio));
    }
  }, [currentImage, exportWidth]);

  // Reset to original dimensions
  const resetDimensions = useCallback(() => {
    if (currentImage) {
      setExportWidth(currentImage.width);
      setExportHeight(currentImage.height);
    }
  }, [currentImage]);

  // Initialize WebGL for export
  const initExportWebGL = useCallback((canvas: HTMLCanvasElement, image: HTMLImageElement | ImageData): WebGL2RenderingContext | null => {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return null;

    // Compile shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) return null;
    gl.shaderSource(vertexShader, VERTEX_SHADER_SOURCE);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) return null;
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER_SOURCE);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    gl.useProgram(program);

    // Setup geometry
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if ('data' in image) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    // Set uniforms
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_exposure'), params.exposure);
    gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), params.contrast);
    gl.uniform1f(gl.getUniformLocation(program, 'u_highlights'), params.highlights);
    gl.uniform1f(gl.getUniformLocation(program, 'u_shadows'), params.shadows);
    gl.uniform1f(gl.getUniformLocation(program, 'u_whites'), params.whites);
    gl.uniform1f(gl.getUniformLocation(program, 'u_blacks'), params.blacks);
    gl.uniform1f(gl.getUniformLocation(program, 'u_temperature'), params.temperature);
    gl.uniform1f(gl.getUniformLocation(program, 'u_tint'), params.tint);
    gl.uniform1f(gl.getUniformLocation(program, 'u_vibrance'), params.vibrance);
    gl.uniform1f(gl.getUniformLocation(program, 'u_saturation'), params.saturation);
    gl.uniform1f(gl.getUniformLocation(program, 'u_clarity'), params.clarity);
    gl.uniform1f(gl.getUniformLocation(program, 'u_dehaze'), params.dehaze);
    gl.uniform1f(gl.getUniformLocation(program, 'u_texture'), params.texture);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), currentImage?.width || 1, currentImage?.height || 1);

    return gl;
  }, [params, currentImage]);

  // Perform the actual export
  const performExport = useCallback(async () => {
    if (!currentImage || !exportWidth || !exportHeight) return;

    setIsExporting(true);

    // Force React to render the loading state before continuing
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Create export canvas
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      exportCanvasRef.current = canvas;

      // Load source image
      let sourceImage: HTMLImageElement | ImageData;

      if (currentImage.decodedData) {
        // Use decoded RAW data
        sourceImage = {
          data: currentImage.decodedData,
          width: currentImage.width,
          height: currentImage.height,
        } as ImageData;
      } else {
        // Load from thumbnail/data URL
        sourceImage = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = currentImage.thumbnail;
        });
      }

      // Initialize WebGL and render
      const gl = initExportWebGL(canvas, sourceImage);
      if (!gl) {
        throw new Error('WebGL initialization failed');
      }

      gl.viewport(0, 0, exportWidth, exportHeight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Get image data and download
      const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : exportFormat === 'png' ? 'image/png' : 'image/png';
      const quality = exportFormat === 'jpeg' ? exportQuality / 100 : 1;

      const dataUrl = canvas.toDataURL(mimeType, quality);

      // Create download link
      const link = document.createElement('a');
      const ext = exportFormat === 'tiff' ? 'png' : exportFormat; // Browser doesn't support TIFF, use PNG
      const baseName = currentImage.filename.replace(/\.[^.]+$/, '');
      link.download = `${baseName}_edited.${ext}`;
      link.href = dataUrl;
      link.click();

      message.success('导出成功');
      setExportModalVisible(false);
    } catch (error) {
      console.error('Export failed:', error);
      message.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [currentImage, exportWidth, exportHeight, exportFormat, exportQuality, initExportWebGL]);

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
    <div className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shadow-sm">
      {/* Left side - Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 hover:text-orange-600 flex items-center gap-2 transition-colors cursor-pointer"
          title="返回图库"
        >
          <FolderOpenOutlined />
          <span className="hidden sm:inline">库</span>
        </button>
        <button
          onClick={handleImportClick}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 hover:text-orange-600 flex items-center gap-2 transition-colors cursor-pointer"
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
      <div className="w-px h-6 bg-gray-200" />

      {/* Center - Edit controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={cn(
            'p-2 rounded-lg transition-colors cursor-pointer',
            canUndo() ? 'text-gray-600 hover:bg-gray-100 hover:text-orange-600' : 'text-gray-300 cursor-not-allowed'
          )}
          title="撤销 (Ctrl+Z)"
        >
          <UndoOutlined />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={cn(
            'p-2 rounded-lg transition-colors cursor-pointer',
            canRedo() ? 'text-gray-600 hover:bg-gray-100 hover:text-orange-600' : 'text-gray-300 cursor-not-allowed'
          )}
          title="重做 (Ctrl+Shift+Z)"
        >
          <RedoOutlined />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-200" />

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={zoomOut}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
          title="缩小"
        >
          <ZoomOutOutlined />
        </button>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={Math.round(ui.zoom * 100)}
            onChange={(e) => zoomTo(parseInt(e.target.value) / 100)}
            className="w-14 h-7 bg-gray-100 text-gray-700 text-sm text-center rounded-lg border border-gray-200 focus:border-orange-500 focus:outline-none"
          />
          <span className="text-gray-500 text-sm">%</span>
        </div>
        <button
          onClick={zoomIn}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
          title="放大"
        >
          <ZoomInOutlined />
        </button>
        <button
          onClick={fitToScreen}
          className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-orange-600 text-xs transition-colors cursor-pointer"
          title="适合屏幕"
        >
          适合
        </button>
        <button
          onClick={zoomTo100}
          className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-orange-600 text-xs transition-colors cursor-pointer"
          title="100%"
        >
          100%
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side - Image info, View and Export */}
      <div className="flex items-center gap-3">
        {/* Image filename and EXIF info */}
        {currentImage && (
          <div className="flex items-center gap-2 text-gray-700 text-sm">
            <span className="font-medium truncate max-w-[150px]">{currentImage.filename}</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {currentImage.exif?.aperture && <span>f/{currentImage.exif.aperture}</span>}
              {currentImage.exif?.shutterSpeed && <span>{currentImage.exif.shutterSpeed}</span>}
              {currentImage.exif?.iso && <span>ISO {currentImage.exif.iso}</span>}
            </div>
            <button
              onClick={() => setInfoModalVisible(true)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-orange-600 transition-colors cursor-pointer"
              title="查看详细信息"
            >
              <InfoCircleOutlined />
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200" />

        {/* Fullscreen */}
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
          title="全屏"
        >
          <Fullscreen size={16} />
        </button>

        {/* Export */}
        <button
          onClick={openExportModal}
          disabled={!currentImage}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 ml-2 transition-all cursor-pointer',
            currentImage
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/30'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          <Download />
          导出
        </button>
      </div>

      {/* Export Modal */}
      <Modal
        title="导出设置"
        open={exportModalVisible}
        onCancel={() => !isExporting && setExportModalVisible(false)}
        maskClosable={false}
        closable={!isExporting}
        onOk={performExport}
        okText={isExporting ? '导出中...' : '导出'}
        confirmLoading={isExporting}
        okButtonProps={{ disabled: isExporting || !exportWidth || !exportHeight }}
        width={400}
      >
        <div className="space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-gray-600 mb-2">格式</label>
            <Select
              value={exportFormat}
              onChange={(value) => setExportFormat(value)}
              className="w-full"
              options={[
                { value: 'jpeg', label: 'JPEG' },
                { value: 'png', label: 'PNG' },
                { value: 'tiff', label: 'TIFF (保存为PNG)' },
              ]}
            />
          </div>

          {/* Quality (only for JPEG) */}
          {exportFormat === 'jpeg' && (
            <div>
              <label className="block text-gray-600 mb-2">质量: {exportQuality}%</label>
              <Slider
                value={exportQuality}
                onChange={setExportQuality}
                min={1}
                max={100}
                marks={{ 1: '1%', 50: '50%', 100: '100%' }}
              />
            </div>
          )}

          {/* Resolution */}
          <div>
            <label className="block text-gray-600 mb-2">分辨率</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">宽:</span>
                <InputNumber
                  value={exportWidth}
                  onChange={handleWidthChange}
                  min={1}
                  max={10000}
                  className="w-24"
                />
              </div>
              <span className="text-gray-500">×</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">高:</span>
                <InputNumber
                  value={exportHeight}
                  onChange={handleHeightChange}
                  min={1}
                  max={10000}
                  className="w-24"
                />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              原始尺寸: {currentImage?.width} × {currentImage?.height}
              <button
                onClick={resetDimensions}
                className="ml-2 text-blue-500 hover:text-blue-600"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* EXIF Info Modal */}
      <Modal
        title="照片信息"
        open={infoModalVisible}
        onCancel={() => setInfoModalVisible(false)}
        footer={null}
        width={400}
      >
        {currentImage && (
          <div className="text-sm">
            <div className="mb-4">
              <h4 className="text-gray-500 mb-2">基本信息</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-600">文件名</div>
                <div className="text-gray-900">{currentImage.filename}</div>
                <div className="text-gray-600">尺寸</div>
                <div className="text-gray-900">{currentImage.width} × {currentImage.height}</div>
                <div className="text-gray-600">类型</div>
                <div className="text-gray-900">{currentImage.isRaw ? 'RAW' : '普通图片'}</div>
              </div>
            </div>
            {currentImage.exif && (
              <div className="mb-4">
                <h4 className="text-gray-500 mb-2">拍摄信息</h4>
                <div className="grid grid-cols-2 gap-2">
                  {currentImage.exif.make && (
                    <>
                      <div className="text-gray-600">相机品牌</div>
                      <div className="text-gray-900">{currentImage.exif.make}</div>
                    </>
                  )}
                  {currentImage.exif.model && (
                    <>
                      <div className="text-gray-600">相机型号</div>
                      <div className="text-gray-900">{currentImage.exif.model}</div>
                    </>
                  )}
                  {currentImage.exif.lens && (
                    <>
                      <div className="text-gray-600">镜头</div>
                      <div className="text-gray-900">{currentImage.exif.lens}</div>
                    </>
                  )}
                  {currentImage.exif.aperture && (
                    <>
                      <div className="text-gray-600">光圈</div>
                      <div className="text-gray-900">f/{currentImage.exif.aperture}</div>
                    </>
                  )}
                  {currentImage.exif.shutterSpeed && (
                    <>
                      <div className="text-gray-600">快门</div>
                      <div className="text-gray-900">{currentImage.exif.shutterSpeed}</div>
                    </>
                  )}
                  {currentImage.exif.iso && (
                    <>
                      <div className="text-gray-600">ISO</div>
                      <div className="text-gray-900">{currentImage.exif.iso}</div>
                    </>
                  )}
                  {currentImage.exif.exposureMode && (
                    <>
                      <div className="text-gray-600">拍摄模式</div>
                      <div className="text-gray-900">{currentImage.exif.exposureMode}</div>
                    </>
                  )}
                  {currentImage.exif.focalLength && (
                    <>
                      <div className="text-gray-600">焦距</div>
                      <div className="text-gray-900">{currentImage.exif.focalLength}mm</div>
                    </>
                  )}
                  {currentImage.exif.datetime && (
                    <>
                      <div className="text-gray-600">拍摄时间</div>
                      <div className="text-gray-900">{currentImage.exif.datetime}</div>
                    </>
                  )}
                  {currentImage.exif.flash !== undefined && (
                    <>
                      <div className="text-gray-600">闪光灯</div>
                      <div className="text-gray-900">{currentImage.exif.flash === 0 ? '未闪光' : '已闪光'}</div>
                    </>
                  )}
                  {currentImage.exif.whiteBalance !== undefined && (
                    <>
                      <div className="text-gray-600">白平衡</div>
                      <div className="text-gray-900">{currentImage.exif.whiteBalance}</div>
                    </>
                  )}
                </div>
              </div>
            )}
            {currentImage.exif?.gps && (currentImage.exif.gps.latitude || currentImage.exif.gps.longitude) && (
              <div>
                <h4 className="text-gray-500 mb-2">GPS信息</h4>
                <div className="grid grid-cols-2 gap-2">
                  {currentImage.exif.gps.latitude && (
                    <>
                      <div className="text-gray-600">纬度</div>
                      <div className="text-gray-900">{currentImage.exif.gps.latitude}</div>
                    </>
                  )}
                  {currentImage.exif.gps.longitude && (
                    <>
                      <div className="text-gray-600">经度</div>
                      <div className="text-gray-900">{currentImage.exif.gps.longitude}</div>
                    </>
                  )}
                  {currentImage.exif.gps.altitude && (
                    <>
                      <div className="text-gray-600">海拔</div>
                      <div className="text-gray-900">{currentImage.exif.gps.altitude}m</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default EditorToolbar;