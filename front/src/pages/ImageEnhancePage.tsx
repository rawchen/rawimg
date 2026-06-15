import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { UserStar, ToolCase, Mountain, PawPrint, TypeOutline, ChevronRight } from 'lucide-react';
import { imageEnhanceApi } from '@/api';
import demoBefore from '@/assets/image-enhance/1.jpg';
import demoAfter from '@/assets/image-enhance/2.jpg';

// 图片类别配置
const categories = [
  { key: 'portrait', label: '人像', icon: <UserStar /> },
  { key: 'object', label: '物体', icon: <ToolCase /> },
  { key: 'scenery', label: '风景', icon: <Mountain /> },
  { key: 'pets', label: '宠物', icon: <PawPrint /> },
  { key: 'text', label: '文字', icon: <TypeOutline /> },
];

// 示例对比图片
const demoImages = [
  {
    before: demoBefore,
    after: demoAfter,
  },
];

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

export function ImageEnhancePage() {
  const [selectedCategory, setSelectedCategory] = useState('scenery');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [enhancedDimensions, setEnhancedDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

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
      setEnhancedImage(null);
      setSliderPosition(50);
      setEnhancedDimensions(null);

      // 获取原始图片尺寸
      try {
        const dims = await getImageDimensions(dataUrl);
        setOriginalDimensions(dims);
      } catch {
        setOriginalDimensions(null);
      }

      // 调用API增强图片
      setLoading(true);
      try {
        const result = await imageEnhanceApi.enhanceImage(file, selectedCategory);
        setEnhancedImage(result.enhancedUrl);

        // 获取增强后图片尺寸
        try {
          const enhancedDims = await getImageDimensions(result.enhancedUrl);
          setEnhancedDimensions(enhancedDims);
        } catch {
          setEnhancedDimensions(null);
        }

        message.success('图像增强成功');
      } catch (error: any) {
        message.error(error.message || '图像增强失败');
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
    setEnhancedImage(null);
    setSliderPosition(50);
    setOriginalDimensions(null);
    setEnhancedDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 下载增强后的图片
  const handleDownload = async () => {
    if (!enhancedImage) return;

    try {
      const response = await fetch(enhancedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enhanced-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // 如果是base64，直接下载
      const a = document.createElement('a');
      a.href = enhancedImage;
      a.download = 'enhanced-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 当前显示的图片（对比图或示例图）
  const displayBeforeImage = originalImage || demoImages[0].before;
  const displayAfterImage = enhancedImage || (originalImage ? originalImage : demoImages[0].after);

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* 标题区域 */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            在线 AI 图像增强器 & 图像放大器
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            使用 AI 图像增强器在线增强和放大图像。只需单击一下，即可提高清晰度、色彩和分辨率。
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧对比图区域 */}
          <div className="lg:w-[56%] order-2 lg:order-1">

            {/* 对比图 */}
            <div
              ref={sliderRef}
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none"
              style={{ aspectRatio: '16/10' }}
            >
              {/* 前图（增强后） */}
              <img
                src={displayAfterImage}
                alt="增强后"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />

              {/* 后图（原图）- 使用clip-path裁剪 */}
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
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 md:w-6 md:h-6 rotate-90 text-gray-800">
                      <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 0 1-1.06-1.06l3.75-3.75Zm-3.75 9.75a.75.75 0 0 1 1.06 0L12 17.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
                原图
              </div>
              <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                增强
              </div>

              {/* 像素对比显示 */}
              {originalDimensions && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1.5 rounded-full flex items-center gap-2 whitespace-nowrap">
                  <span>{originalDimensions.width} × {originalDimensions.height}</span>
                  <span className="text-gray-200"><ChevronRight className={'w-4 h-4'}/></span>
                  <span className="text-orange-400 font-medium">
                    {enhancedDimensions ? `${enhancedDimensions.width} × ${enhancedDimensions.height}` : `${Math.round(originalDimensions.width * 4)} × ${Math.round(originalDimensions.height * 4)}`}
                  </span>
                </div>
              )}

              {/* Loading提示 */}
              {loading && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-2 rounded-full flex items-center gap-2 z-10">
                  <Spin size="small" />
                  <span>正在增强...</span>
                </div>
              )}
            </div>

            {/* 图片类别选择 */}
            <div className="flex justify-center gap-2 md:gap-3 mt-5 flex-wrap">
              {categories.map((cat) => (
                  <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
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
                {enhancedImage && (
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
              <h3 className="font-semibold text-gray-900 mb-3">AI 图像增强功能</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  提升清晰度
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  优化色彩
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  图像放大
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  细节增强
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
                <li>• 选择正确的图片类别可获得更好效果</li>
                <li>• 处理时间约 30-60 秒，请耐心等待</li>
                <li>• 增强后可拖动滑块对比效果</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
