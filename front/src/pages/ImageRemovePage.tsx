import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Users, TypeOutline, Droplets, Origami, Sun, ChevronRight } from 'lucide-react';
import { imageRemoveApi } from '@/api';

// 导入对比图
import peopleBefore from '@/assets/image-remove/obr-people-before.jpg';
import peopleAfter from '@/assets/image-remove/obr-people-after.jpg';
import textBefore from '@/assets/image-remove/obr-text-before.jpg';
import textAfter from '@/assets/image-remove/obr-text-after.jpg';
import watermarkBefore from '@/assets/image-remove/obr-watermark-before.jpg';
import watermarkAfter from '@/assets/image-remove/obr-watermark-after.jpg';
import wrinklesBefore from '@/assets/image-remove/obr-wrinkles-before.jpg';
import wrinklesAfter from '@/assets/image-remove/obr-wrinkles-after.jpg';
import glareBefore from '@/assets/image-remove/obr-glare-before.jpg';
import glareAfter from '@/assets/image-remove/obr-glare-after.jpg';

// 图片类别配置
const categories = [
  { key: 'people', label: '人物', icon: <Users /> },
  { key: 'text', label: '文字', icon: <TypeOutline /> },
  { key: 'watermark', label: '水印', icon: <Droplets /> },
  { key: 'wrinkles', label: '褶皱', icon: <Origami /> },
  { key: 'glare', label: '眩光', icon: <Sun /> },
];

// 示例对比图片映射
const demoImagesMap: Record<string, { before: string; after: string }> = {
  people: { before: peopleBefore, after: peopleAfter },
  text: { before: textBefore, after: textAfter },
  watermark: { before: watermarkBefore, after: watermarkAfter },
  wrinkles: { before: wrinklesBefore, after: wrinklesAfter },
  glare: { before: glareBefore, after: glareAfter },
};

// 获取图片尺寸
const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = src;
  });
};

export function ImageRemovePage() {
  const [selectedCategory, setSelectedCategory] = useState('people');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [removedImage, setRemovedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [removedDimensions, setRemovedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isAutoCycling, setIsAutoCycling] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // 自动循环切换类别
  useEffect(() => {
    if (!isAutoCycling) return;

    const interval = setInterval(() => {
      const currentIndex = categories.findIndex((cat) => cat.key === selectedCategory);
      const nextIndex = (currentIndex + 1) % categories.length;
      setSelectedCategory(categories[nextIndex].key);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoCycling, selectedCategory]);

  // 处理文件上传
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }

    // 显示原始图片
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setOriginalImage(dataUrl);
      setRemovedImage(null);
      setSliderPosition(50);
      setRemovedDimensions(null);

      // 获取原始图片尺寸
      try {
        const dims = await getImageDimensions(dataUrl);
        setOriginalDimensions(dims);
      } catch {
        setOriginalDimensions(null);
      }

      // 调用API移除物体
      setLoading(true);
      try {
        const result = await imageRemoveApi.removeObjects(file, selectedCategory);
        setRemovedImage(result.removedUrl);

        // 获取处理后图片尺寸
        try {
          const removedDims = await getImageDimensions(result.removedUrl);
          setRemovedDimensions(removedDims);
        } catch {
          setRemovedDimensions(null);
        }

        message.success('物体移除成功');
      } catch (error: any) {
        message.error(error.message || '物体移除失败');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [selectedCategory]);

  // 点击上传按钮
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 文件选择变化
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 拖拽上传
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

  // 滑块拖动
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleSliderTouchStart = () => {
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const touch = e.touches[0];
    const rect = sliderRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 监听鼠标事件
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

  // 重置
  const handleReset = () => {
    setOriginalImage(null);
    setRemovedImage(null);
    setSliderPosition(50);
    setOriginalDimensions(null);
    setRemovedDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 生成下载文件名：yyyyMMddHHmmss_随机2位.jpg
  const generateDownloadFileName = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}_${random}.jpg`;
  };

  // 下载处理后的图片
  const handleDownload = async () => {
    if (!removedImage) return;

    const fileName = generateDownloadFileName();
    try {
      const response = await fetch(removedImage);
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
      // 如果是base64，直接下载
      const a = document.createElement('a');
      a.href = removedImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 用户点击类别按钮时停止自动循环
  const handleCategoryClick = (categoryKey: string) => {
    setIsAutoCycling(false);
    setSelectedCategory(categoryKey);
  };

  // 当前显示的图片（对比图或示例图）
  const currentDemo = demoImagesMap[selectedCategory];
  const displayBeforeImage = originalImage || currentDemo.before;
  const displayAfterImage = removedImage || (originalImage ? originalImage : currentDemo.after);

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* 标题区域 */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            AI 物体移除器
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            移除照片中不需要的物体，轻松擦除干扰元素，一键创建专业、干净的图像。
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧对比图区域 */}
          <div className="lg:w-[54%] order-2 lg:order-1">

            {/* 对比图 */}
            <div
              ref={sliderRef}
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none"
              style={{ aspectRatio: '16/10' }}
            >
              {/* 后图（处理后） */}
              <img
                src={displayAfterImage}
                alt="处理后"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />

              {/* 前图（原图）- 使用clip-path裁剪 */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              >
                <img
                  src={displayBeforeImage}
                  alt="原图"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* 分割线 - 整个区域可拖动 */}
              <div
                className="absolute top-0 bottom-0 w-8 -ml-4 cursor-ew-resize group"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleSliderMouseDown}
                onTouchStart={handleSliderTouchStart}
              >
                {/* 视觉分割线 */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white shadow-lg -translate-x-1/2">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-6 md:h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 md:w-5 md:h-5 rotate-90 text-gray-800">
                      <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 0 1-1.06-1.06l3.75-3.75Zm-3.75 9.75a.75.75 0 0 1 1.06 0L12 17.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              {!originalImage && (
                <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                  示例
                </div>
              )}

              {/* 像素对比显示 */}
              {originalDimensions && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1.5 rounded-full flex items-center gap-2 whitespace-nowrap">
                  <span>{originalDimensions.width} × {originalDimensions.height}</span>
                  <span className="text-gray-200"><ChevronRight className={'w-4 h-4'}/></span>
                  <span className="text-orange-400 font-medium">
                    {removedDimensions ? `${removedDimensions.width} × ${removedDimensions.height}` : `${originalDimensions.width} × ${originalDimensions.height}`}
                  </span>
                </div>
              )}

              {/* Loading提示 */}
              {loading && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-2 rounded-full flex items-center gap-2 z-10">
                  <Spin size="small" />
                  <span>正在处理...</span>
                </div>
              )}
            </div>

            {/* 图片类别选择 */}
            <div className="flex justify-center gap-2 md:gap-3 mt-5 flex-wrap">
              {categories.map((cat) => (
                  <button
                      key={cat.key}
                      onClick={() => handleCategoryClick(cat.key)}
                      className={`flex flex-col items-center justify-center w-[72px] md:w-[96px] aspect-square rounded-xl transition-all ${
                          selectedCategory === cat.key
                              ? 'bg-orange-100 border-2 border-orange-500 text-orange-600'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-2xl md:text-3xl mb-1">{cat.icon}</span>
                    <span className="text-xs md:text-sm font-medium">{cat.label}</span>
                  </button>
              ))}
            </div>

            {/* 操作按钮 */}
            {originalImage && (
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ReloadOutlined />
                  <span>重新上传</span>
                </button>
                {removedImage && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    <DownloadOutlined />
                    <span>下载图片</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 右侧上传区域 */}
          <div className="lg:w-[38%] order-1 lg:order-2 flex flex-col gap-4">
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
              <span className="text-gray-600 font-medium mb-2">拖拽图片到此处</span>
              <span className="text-gray-400 text-sm mb-4">或点击选择文件</span>
              <button
                type="button"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadClick();
                }}
              >
                上传图片
              </button>
            </div>

            {/* 功能介绍 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">AI 物体移除功能</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  移除人物
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  移除文字
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  移除水印
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  修复褶皱
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  去除眩光
                </div>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="bg-orange-100 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-orange-500">💡</span>
                使用提示
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 支持 JPG、PNG 格式图片</li>
                <li>• 选择正确的移除类型可获得更好效果</li>
                <li>• 处理时间约 30-60 秒，请耐心等待</li>
                <li>• 处理后可拖动滑块对比效果</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}