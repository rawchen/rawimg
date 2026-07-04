import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Move } from 'lucide-react';
import { imageExpandApi, userApi } from '@/api';
import demoBefore from '@/assets/image-expand/before.jpg';
import demoAfter from '@/assets/image-expand/after.jpg';

// 图片尺寸选项
const sizeOptions = [
  { value: '1024x1024', label: '1:1', desc: '正方形', displayWidth: 16, displayHeight: 16 },
  { value: '1536x1024', label: '3:2', desc: '横屏', displayWidth: 18, displayHeight: 12 },
  { value: '1024x1536', label: '2:3', desc: '竖屏', displayWidth: 12, displayHeight: 18 },
  { value: '1920x1080', label: '16:9', desc: '横屏', displayWidth: 20, displayHeight: 11.25 },
  { value: '1080x1920', label: '9:16', desc: '竖屏', displayWidth: 11.25, displayHeight: 20 },
];

export function ImageExpandPage() {
  const [selectedSize, setSelectedSize] = useState('1536x1024');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Canvas编辑相关状态 - 使用像素坐标
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 }); // 像素偏移
  const [imageScale, setImageScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 }); // 图片原始尺寸
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // 示例对比滑块状态
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  // Canvas容器尺寸（实际渲染尺寸，通过ResizeObserver获取）
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 450 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 解析尺寸并计算容器样式
  const parseSize = (sizeStr: string): { width: number; height: number } => {
    const [width, height] = sizeStr.split('x').map(Number);
    return { width, height };
  };

  // 使用 ResizeObserver 监听容器实际尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 当容器尺寸变化时，自动调整图片位置和缩放
  useEffect(() => {
    if (!originalImage || !imageSize.width || !imageSize.height) return;

    // 计算最大允许缩放比例（图片不能超过容器）
    const maxScaleX = canvasDimensions.width / imageSize.width;
    const maxScaleY = canvasDimensions.height / imageSize.height;
    const maxScale = Math.min(maxScaleX, maxScaleY);

    // 如果当前缩放超过最大值，则调整
    const effectiveScale = Math.min(imageScale, maxScale);
    if (imageScale > maxScale) {
      setImageScale(maxScale);
    }

    // 计算当前显示尺寸
    const displayWidth = imageSize.width * effectiveScale;
    const displayHeight = imageSize.height * effectiveScale;

    // 调整位置到有效范围内
    const minX = (displayWidth - canvasDimensions.width) / 2;
    const maxX = (canvasDimensions.width - displayWidth) / 2;
    const minY = (displayHeight - canvasDimensions.height) / 2;
    const maxY = (canvasDimensions.height - displayHeight) / 2;

    // 使用 clamp 处理 min > max 的情况
    const clampOffset = (value: number, min: number, max: number) => {
      if (min <= max) return Math.max(min, Math.min(max, value));
      else return Math.max(max, Math.min(min, value));
    };

    setImageOffset(prevOffset => ({
      x: clampOffset(prevOffset.x, minX, maxX),
      y: clampOffset(prevOffset.y, minY, maxY),
    }));
  }, [canvasDimensions, originalImage, imageSize, imageScale]);

  // 处理文件上传
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }

    setOriginalImageFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setOriginalImage(dataUrl);
      setExpandedImage(null);
      setImageOffset({ x: 0, y: 0 });

      // 计算图片合适的缩放比例，使其不超过容器的90%
      const img = new Image();
      img.onload = () => {
        const imgWidth = img.width;
        const imgHeight = img.height;

        // 保存图片原始尺寸
        setImageSize({ width: imgWidth, height: imgHeight });

        // 计算容器能容纳的最大尺寸（90%）
        const maxContainerWidth = canvasDimensions.width * 0.9;
        const maxContainerHeight = canvasDimensions.height * 0.9;

        // 计算缩放比例，使图片完全显示在容器内
        const scaleByWidth = maxContainerWidth / imgWidth;
        const scaleByHeight = maxContainerHeight / imgHeight;
        const appropriateScale = Math.min(scaleByWidth, scaleByHeight, 1); // 最大不超过1

        setImageScale(appropriateScale);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [canvasDimensions]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Canvas拖动 - 像素级移动
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!originalImage || loading) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: imageOffset.x,
      offsetY: imageOffset.y,
    });
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (!originalImage || loading) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      offsetX: imageOffset.x,
      offsetY: imageOffset.y,
    });
  };

  // 滚轮缩放 - 限制不超过容器并调整位置
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!originalImage || loading) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.01 : 0.01;

    setImageScale(prev => {
      // 计算最大缩放比例（图片不能超过容器）
      const maxScaleX = canvasDimensions.width / imageSize.width;
      const maxScaleY = canvasDimensions.height / imageSize.height;
      const maxScale = Math.min(maxScaleX, maxScaleY);

      const newScale = Math.max(0.05, Math.min(maxScale, prev + delta));

      if (imageSize.width && imageSize.height) {
        const displayWidth = imageSize.width * newScale;
        const displayHeight = imageSize.height * newScale;

        const minX = (displayWidth - canvasDimensions.width) / 2;
        const maxX = (canvasDimensions.width - displayWidth) / 2;
        const minY = (displayHeight - canvasDimensions.height) / 2;
        const maxY = (canvasDimensions.height - displayHeight) / 2;

        // 使用 clamp 处理 min > max 的情况
        const clampOffset = (value: number, min: number, max: number) => {
          if (min <= max) return Math.max(min, Math.min(max, value));
          else return Math.max(max, Math.min(min, value));
        };

        setImageOffset(prevOffset => ({
          x: clampOffset(prevOffset.x, minX, maxX),
          y: clampOffset(prevOffset.y, minY, maxY),
        }));
      }

      return newScale;
    });
  }, [originalImage, imageSize, canvasDimensions, loading]);

  // 绑定滚轮事件
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && originalImage && !loading) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel, originalImage, loading]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && originalImage) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // 直接计算边界，不依赖 useCallback
      const displayWidth = imageSize.width * imageScale;
      const displayHeight = imageSize.height * imageScale;
      const minX = (displayWidth - canvasDimensions.width) / 2;
      const maxX = (canvasDimensions.width - displayWidth) / 2;
      const minY = (displayHeight - canvasDimensions.height) / 2;
      const maxY = (canvasDimensions.height - displayHeight) / 2;

      // clamp 处理 min > max 的情况
      const clampX = (v: number) => minX <= maxX ? Math.max(minX, Math.min(maxX, v)) : Math.max(maxX, Math.min(minX, v));
      const clampY = (v: number) => minY <= maxY ? Math.max(minY, Math.min(maxY, v)) : Math.max(maxY, Math.min(minY, v));

      const newOffsetX = clampX(dragStart.offsetX + deltaX);
      const newOffsetY = clampY(dragStart.offsetY + deltaY);

      setImageOffset({ x: newOffsetX, y: newOffsetY });
    }

    if (isSliderDragging && sliderRef.current && !originalImage) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, [isDragging, isSliderDragging, dragStart, originalImage, imageSize, imageScale, canvasDimensions]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && originalImage) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;

      // 直接计算边界
      const displayWidth = imageSize.width * imageScale;
      const displayHeight = imageSize.height * imageScale;
      const minX = (displayWidth - canvasDimensions.width) / 2;
      const maxX = (canvasDimensions.width - displayWidth) / 2;
      const minY = (displayHeight - canvasDimensions.height) / 2;
      const maxY = (canvasDimensions.height - displayHeight) / 2;

      const clampX = (v: number) => minX <= maxX ? Math.max(minX, Math.min(maxX, v)) : Math.max(maxX, Math.min(minX, v));
      const clampY = (v: number) => minY <= maxY ? Math.max(minY, Math.min(maxY, v)) : Math.max(maxY, Math.min(minY, v));

      const newOffsetX = clampX(dragStart.offsetX + deltaX);
      const newOffsetY = clampY(dragStart.offsetY + deltaY);

      setImageOffset({ x: newOffsetX, y: newOffsetY });
    }

    if (isSliderDragging && sliderRef.current && !originalImage) {
      const touch = e.touches[0];
      const rect = sliderRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, [isDragging, isSliderDragging, dragStart, originalImage, imageSize, imageScale, canvasDimensions]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsSliderDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleTouchMove, handleMouseUp]);

  // 示例滑块拖动
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSliderDragging(true);
  };

  const handleSliderTouchStart = () => {
    setIsSliderDragging(true);
  };

  // 生成扩展数据 - 使用像素偏移
  const generateExpandData = async (): Promise<{ expandedFile: File; maskFile: File }> => {
    return new Promise((resolve, reject) => {
      if (!originalImage || !originalImageFile) {
        reject(new Error('请先上传图片'));
        return;
      }

      const { width: targetWidth, height: targetHeight } = parseSize(selectedSize);

      // 计算从显示尺寸到目标尺寸的缩放比例
      const scaleX = targetWidth / canvasDimensions.width;
      const scaleY = targetHeight / canvasDimensions.height;

      const expandedCanvas = document.createElement('canvas');
      expandedCanvas.width = targetWidth;
      expandedCanvas.height = targetHeight;
      const expandedCtx = expandedCanvas.getContext('2d')!;
      expandedCtx.fillStyle = '#FFFFFF';
      expandedCtx.fillRect(0, 0, targetWidth, targetHeight);

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = targetWidth;
      maskCanvas.height = targetHeight;
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.fillStyle = '#FFFFFF';
      maskCtx.fillRect(0, 0, targetWidth, targetHeight);

      const img = new Image();
      img.onload = () => {
        // 计算缩放后的图片尺寸
        const scaledWidth = img.width * imageScale;
        const scaledHeight = img.height * imageScale;

        // 计算图片中心点在显示canvas中的位置
        const displayCenterX = canvasDimensions.width / 2 + imageOffset.x;
        const displayCenterY = canvasDimensions.height / 2 + imageOffset.y;

        // 转换到目标canvas的坐标
        const targetCenterX = displayCenterX * scaleX;
        const targetCenterY = displayCenterY * scaleY;

        // 计算图片在目标canvas中的位置（中心点对齐）
        const targetScaledWidth = scaledWidth * scaleX;
        const targetScaledHeight = scaledHeight * scaleY;
        const posX = targetCenterX - targetScaledWidth / 2;
        const posY = targetCenterY - targetScaledHeight / 2;

        expandedCtx.drawImage(img, posX, posY, targetScaledWidth, targetScaledHeight);
        maskCtx.fillStyle = '#000000';
        maskCtx.fillRect(posX, posY, targetScaledWidth, targetScaledHeight);

        expandedCanvas.toBlob((expandedBlob) => {
          if (!expandedBlob) {
            reject(new Error('生成扩展图片失败'));
            return;
          }
          maskCanvas.toBlob((maskBlob) => {
            if (!maskBlob) {
              reject(new Error('生成遮罩图片失败'));
              return;
            }
            const expandedFile = new File([expandedBlob], 'expanded.png', { type: 'image/png' });
            const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
            resolve({ expandedFile, maskFile });
          }, 'image/png');
        }, 'image/png');
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = originalImage;
    });
  };

  // 提交扩展
  const handleSubmit = async () => {
    if (!originalImage || !originalImageFile) {
      message.warning('请先上传图片');
      return;
    }

    setLoading(true);
    try {
      // 生成合成图和mask
      const { expandedFile, maskFile } = await generateExpandData();

      // 上传到OSS获取URL
      message.info('正在上传图片...');
      const [imageUrl, maskUrl] = await Promise.all([
        userApi.uploadImageToOss(expandedFile, 'expand-image/'),
        userApi.uploadImageToOss(maskFile, 'expand-mask/'),
      ]);

      // 调用扩展API
      message.info('正在扩展图像...');
      const result = await imageExpandApi.expandImage(imageUrl, maskUrl, selectedSize);
      setExpandedImage(result.expandedUrl);
      message.success('图像扩展成功');
    } catch (error: any) {
      message.error(error.message || '图像扩展失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载
  const handleDownload = async () => {
    if (!expandedImage) return;

    const now = new Date();
    const fileName = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}_${String(Math.floor(Math.random() * 100)).padStart(2, '0')}.jpg`;

    try {
      const response = await fetch(expandedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = expandedImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 计算图片样式 - 使用像素偏移
  const getImageStyle = (): React.CSSProperties => {
    if (!originalImage) return {};
    return {
      position: 'absolute',
      maxWidth: 'none',
      transform: `translate(-50%, -50%) scale(${imageScale})`,
      left: `calc(50% + ${imageOffset.x}px)`,
      top: `calc(50% + ${imageOffset.y}px)`,
      cursor: loading ? 'default' : (isDragging ? 'grabbing' : 'grab'),
    };
  };

  // 显示的图片
  const displayAfterImage = expandedImage || (originalImage ? originalImage : demoAfter);
  const displayBeforeImage = originalImage || demoBefore;

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* 标题 */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            AI 图像扩展器
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            使用 AI 图像扩展器在线扩展图片边界。智能填充扩展区域，保持图像风格和内容的连贯性。
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧展示区域 */}
          <div className="lg:w-[54%] order-2 lg:order-1">
            {/* 对比图/编辑区 - 根据比例动态调整 */}
            <div
              ref={(el) => { sliderRef.current = el; containerRef.current = el; }}
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none mx-auto"
              style={{
                aspectRatio: parseSize(selectedSize).width / parseSize(selectedSize).height,
                maxHeight: '450px',
                maxWidth: `${450 * parseSize(selectedSize).width / parseSize(selectedSize).height}px`,
              }}
            >
              {originalImage ? (
                // 编辑模式 - Canvas
                <div
                  ref={canvasRef}
                  className="w-full h-full bg-white relative overflow-hidden flex items-center justify-center"
                  onMouseDown={handleCanvasMouseDown}
                  onTouchStart={handleCanvasTouchStart}
                  style={{ cursor: loading ? 'default' : 'grab' }}
                >
                  {/* 网格背景 */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                    }}
                  />

                  {/* 原图 */}
                  <img
                    src={originalImage}
                    alt="原图"
                    style={getImageStyle()}
                    draggable={false}
                  />

                  {/* 缩放比例显示 */}
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {Math.round(imageScale * 100)}%
                  </div>

                  {/* 提示 */}
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    拖动调整位置，滚轮缩放
                  </div>

                  {/* Loading */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <div className="bg-white rounded-xl px-6 py-4 flex items-center gap-2">
                        <Spin />
                        <span className="text-gray-700">正在扩展图像...</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // 示例模式 - 滑块对比
                <>
                  {/* 后图（扩展后） */}
                  <img
                    src={displayAfterImage}
                    alt="扩展后"
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                    draggable={false}
                  />

                  {/* 前图（原图） */}
                  <div
                    className="absolute inset-0"
                    style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                  >
                    <img
                      src={displayBeforeImage}
                      alt="原图"
                      className="w-full h-full object-contain bg-white"
                      draggable={false}
                    />
                  </div>

                  {/* 分割线 */}
                  <div
                    className="absolute top-0 bottom-0 w-8 -ml-4 cursor-ew-resize"
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={handleSliderMouseDown}
                    onTouchStart={handleSliderTouchStart}
                  >
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white shadow-lg -translate-x-1/2">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 rotate-90 text-gray-800">
                          <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 0 1-1.06-1.06l3.75-3.75Zm-3.75 9.75a.75.75 0 0 1 1.06 0L12 17.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* 示例标签 */}
                  <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded z-10">
                    示例
                  </div>
                </>
              )}

              {/* 扩展后显示结果 */}
              {expandedImage && !loading && (
                <img
                  src={expandedImage}
                  alt="扩展结果"
                  className="absolute inset-0 w-full h-full object-contain bg-white"
                />
              )}
            </div>

            {/* 下载按钮 */}
            {expandedImage && (
              <div className="flex justify-center mt-5">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg"
                >
                  <DownloadOutlined />
                  <span>下载图片</span>
                </button>
              </div>
            )}

            {/* 尺寸选择 */}
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedSize(option.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      selectedSize === option.value
                        ? 'bg-orange-100 border-orange-500 text-orange-600'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <span
                      className={`rounded-sm ${selectedSize === option.value ? 'bg-orange-500' : 'bg-gray-300'}`}
                      style={{ width: option.displayWidth, height: option.displayHeight }}
                    />
                    <span className="text-sm">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧上传区域 */}
          <div className="lg:w-[44%] order-1 lg:order-2 flex flex-col gap-4">
            {/* 上传框 */}
            <div
              className="relative flex flex-col justify-center items-center h-[280px] md:h-[245px] rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50/30 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <CloudUploadOutlined className="text-4xl md:text-5xl text-orange-400 mb-4" />
              <span className="text-gray-600 font-medium mb-2">拖拽或选择图片</span>
              <button
                type="button"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-orange-500/30"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadClick();
                }}
              >
                上传图片
              </button>
            </div>

            {/* 扩展按钮 */}
            {originalImage && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
                  loading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
                }`}
              >
                {loading ? '处理中...' : '开始扩展'}
              </button>
            )}

            {/* 功能介绍 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">AI 图像扩展功能</h3>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  智能填充背景
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  保持风格一致
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  多种尺寸选择
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  自由调整位置
                </div>
              </div>
            </div>

            {/* 提示 */}
            <div className="bg-orange-100 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-orange-500">💡</span>
                使用提示
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 上传图片后，选择幅宽拖动缩放调整原图位置，透明区域将由AI智能填充</li>
                <li>• 处理时间约30-60秒，请耐心等待</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}