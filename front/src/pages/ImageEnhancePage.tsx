import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal, Image, Pagination, Empty } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { UserStar, ToolCase, Mountain, PawPrint, TypeOutline, ChevronRight } from 'lucide-react';
import { imageEnhanceApi, userApi, ImageTaskRecord, modelPriceApi, balanceApi, BalanceStats } from '@/api';
import demoBefore from '@/assets/image-enhance/before.jpg';
import demoAfter from '@/assets/image-enhance/after.jpg';
import rmbCircle from '@/assets/media/rmb-circle.svg';
import { addOssThumbnailStyle } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

// 页面标题闪烁 hook
function useTitleFlash() {
  const flashRef = useRef<number | null>(null);
  const originalTitle = useRef<string>(document.title);
  const isFlashing = useRef(false);

  const startFlash = useCallback((status: 'done' | 'error' = 'done') => {
    if (document.hasFocus()) return;
    if (isFlashing.current) return;
    isFlashing.current = true;
    originalTitle.current = document.title;

    const successText = '✅';
    const errorText = '❌';
    let showIcon = false;
    const flash = () => {
      if (!isFlashing.current) return;
      document.title = showIcon
        ? (status === 'done' ? successText : errorText)
        : 'AI 图像增强';
      showIcon = !showIcon;
      flashRef.current = window.setTimeout(flash, 600);
    };
    flash();
  }, []);

  const stopFlash = useCallback(() => {
    if (!isFlashing.current) return;
    isFlashing.current = false;
    if (flashRef.current) {
      clearTimeout(flashRef.current);
      flashRef.current = null;
    }
    document.title = originalTitle.current;
  }, []);

  useEffect(() => {
    const handleFocus = () => stopFlash();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        stopFlash();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopFlash();
    };
  }, [stopFlash]);

  return { startFlash };
}

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
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = reject;
    img.src = src;
  });
};

export function ImageEnhancePage() {
  const { startFlash } = useTitleFlash();
  const { isAuthenticated } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('portrait');
  const [selectedModel, setSelectedModel] = useState('gpt-image-2');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskSubmitTime, setTaskSubmitTime] = useState<number | null>(null);
  const [currentElapsed, setCurrentElapsed] = useState<number>(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{ width: number; height: number } | null>(null);
  const [enhancedDimensions, setEnhancedDimensions] = useState<{ width: number; height: number } | null>(null);

  // 价格和余额相关状态
  const [modelPrice, setModelPrice] = useState<number>(0);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);

  // 登录弹窗状态
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 加载模型价格和余额
  useEffect(() => {
    const loadData = async () => {
      try {
        // 获取价格（无需登录）
        const priceRes = await modelPriceApi.getPrice(selectedModel);
        setModelPrice(priceRes.price);

        // 获取余额（需要登录，未登录时静默失败）
        if (isAuthenticated) {
          const balanceRes = await balanceApi.getStats();
          setBalanceStats(balanceRes);
        } else {
          setBalanceStats(null);
        }
      } catch (error) {
        console.error('Failed to load price or balance:', error);
      }
    };
    loadData();
  }, [selectedModel, isAuthenticated]);

  // 历史记录状态
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ImageTaskRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<ImageTaskRecord | null>(null);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);
  const [, setHistoryUpdateTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // 实时更新任务耗时
  useEffect(() => {
    if (!loading || !taskSubmitTime) return;
    const interval = setInterval(() => {
      setCurrentElapsed(Math.floor((Date.now() - taskSubmitTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, taskSubmitTime]);

  // 实时更新历史记录中pending任务的耗时
  useEffect(() => {
    const hasPending = historyRecords.some(r => r.status === 'pending');
    if (!hasPending) return;
    const interval = setInterval(() => {
      setHistoryUpdateTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [historyRecords]);

  // 处理文件上传
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }

    setEnhancedImage(null);
    setEnhancedDimensions(null);
    setSliderPosition(50);

    // 上传图片到OSS
    try {
      message.info('正在上传图片...');
      const ossUrl = await userApi.uploadImageToOss(file, 'enhance-temp/');
      setOriginalImage(ossUrl);
      setOriginalImageUrl(ossUrl);

      // 获取图片尺寸
      try {
        const dims = await getImageDimensions(ossUrl);
        setOriginalDimensions(dims);
      } catch {
        setOriginalDimensions(null);
      }

      message.success('图片上传成功');
    } catch (error: any) {
      message.error('图片上传失败: ' + error.message);
      setOriginalImage(null);
      setOriginalImageUrl(null);
    }
  }, []);

  // 点击上传按钮
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 文件选择变化
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      e.target.value = '';
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

  // 提交增强任务
  const handleSubmit = async () => {
    if (!originalImage || !originalImageUrl) {
      message.warning('请先上传图片');
      return;
    }

    // 检查登录状态
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setLoading(true);
    setTaskSubmitTime(Date.now());
    setCurrentElapsed(0);

    try {
      message.info('正在提交增强任务...');
      const { taskId } = await imageEnhanceApi.enhanceImageAsync(originalImageUrl, selectedCategory, undefined, selectedModel);
      message.info('任务已提交，可稍后在生成历史查看');

      // 轮询任务结果
      const pollInterval = 5000;
      const maxPolls = 120;
      let pollCount = 0;

      const poll = async () => {
        try {
          const result = await imageEnhanceApi.getTaskResult(taskId);

          if (result.status === 'done' && result.imageUrl) {
            setEnhancedImage(result.imageUrl);

            // 获取增强后图片尺寸
            try {
              const enhancedDims = await getImageDimensions(result.imageUrl);
              setEnhancedDimensions(enhancedDims);
            } catch {
              setEnhancedDimensions(null);
            }

            message.success('图像增强成功');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('done');
          } else if (result.status === 'error') {
            message.error(result.msg || '图像增强失败');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('error');
          } else if (result.status === 'not_found') {
            message.error('任务不存在或已过期');
            setLoading(false);
            setTaskSubmitTime(null);
          } else {
            pollCount++;
            if (pollCount < maxPolls) {
              setTimeout(poll, pollInterval);
            } else {
              message.error('任务处理超时，请稍后重试');
              setLoading(false);
              setTaskSubmitTime(null);
            }
          }
        } catch (error: any) {
          message.error(error.message || '查询任务状态失败');
          setLoading(false);
          setTaskSubmitTime(null);
        }
      };

      setTimeout(poll, 2000);
    } catch (error: any) {
      message.error(error.message || '图像增强失败');
      setLoading(false);
      setTaskSubmitTime(null);
    }
  };

  // 重置
  const handleReset = () => {
    setOriginalImage(null);
    setOriginalImageUrl(null);
    setEnhancedImage(null);
    setSliderPosition(50);
    setOriginalDimensions(null);
    setEnhancedDimensions(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 生成下载文件名
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

  // 下载增强后的图片
  const handleDownload = async () => {
    if (!enhancedImage) return;

    const fileName = generateDownloadFileName();
    try {
      const response = await fetch(enhancedImage);
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
      a.href = enhancedImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 历史记录相关
  const ensureHttpsUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const dateYear = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (dateYear === currentYear) return `${month}/${day}`;
    else return `${dateYear}/${month}/${day}`;
  };

  const formatDurationFromSeconds = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainSeconds = Math.floor(seconds % 60);
      return `${minutes}m${remainSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h${remainMinutes}m`;
    }
  };

  const formatDuration = (durationMs: number | null | undefined): string | null => {
    if (!durationMs) return null;
    return formatDurationFromSeconds(durationMs / 1000);
  };

  const getPendingElapsed = (createTime: string): string => {
    const elapsedMs = Date.now() - new Date(createTime).getTime();
    return formatDurationFromSeconds(elapsedMs / 1000);
  };

  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const result = await imageEnhanceApi.getHistory(page, 12);
      setHistoryRecords(result.records);
      setHistoryTotal(result.total);
      setHistoryPage(result.current);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleOpenHistory = () => {
    setHistoryModalVisible(true);
    loadHistory(1);
  };

  const handleHistoryClick = (record: ImageTaskRecord) => {
    setSelectedHistory(record);
    setHistoryDetailModalVisible(true);
  };

  const handleUseHistory = (record: ImageTaskRecord) => {
    if (record.originalImageUrl) {
      setOriginalImage(ensureHttpsUrl(record.originalImageUrl));
      setOriginalImageUrl(ensureHttpsUrl(record.originalImageUrl));
      setEnhancedImage(ensureHttpsUrl(record.resultImageUrl));
      setSliderPosition(50);
    }
    setHistoryDetailModalVisible(false);
    setHistoryModalVisible(false);
  };

  // 当前显示的图片
  const displayBeforeImage = originalImage || demoImages[0].before;
  const displayAfterImage = enhancedImage || (originalImage ? originalImage : demoImages[0].after);

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* 标题区域 */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            AI 图像增强器
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            使用 AI 图像增强器在线增强和放大图像。只需单击一下，即可提高清晰度、色彩和分辨率。
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

              {/* 分割线 */}
              <div
                className="absolute top-0 bottom-0 w-8 -ml-4 cursor-ew-resize group"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleSliderMouseDown}
                onTouchStart={handleSliderTouchStart}
              >
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white shadow-lg -translate-x-1/2">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 md:w-5 md:h-5 rotate-90 text-gray-800">
                      <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 0 1-1.06-1.06l3.75-3.75Zm-3.75 9.75a.75.75 0 0 1 1.06 0L12 17.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 示例标签 */}
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
                    {enhancedDimensions ? `${enhancedDimensions.width} × ${enhancedDimensions.height}` : `${Math.round(originalDimensions.width * 4)} × ${Math.round(originalDimensions.height * 4)}`}
                  </span>
                </div>
              )}

              {/* Loading提示 */}
              {loading && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-2 rounded-full flex items-center gap-2 z-10">
                  <Spin size="small" />
                  <span>正在增强... {formatDurationFromSeconds(currentElapsed)}</span>
                </div>
              )}
            </div>

            {/* 图片类别选择 */}
            <div className="flex justify-center gap-2 md:gap-3 mt-5 flex-wrap">
              {categories.map((cat) => (
                  <button
                      key={cat.key}
                      onClick={() => !loading && setSelectedCategory(cat.key)}
                      disabled={loading}
                      className={`flex flex-col items-center justify-center w-[72px] md:w-[96px] aspect-square rounded-xl transition-all ${
                          loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
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

            {/* 增强按钮 */}
            {originalImage && (
              <button
                onClick={handleSubmit}
                disabled={loading || !originalImageUrl}
                className={`w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
                  loading || !originalImageUrl
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
                }`}
              >
                {loading ? '处理中...' : !originalImageUrl ? '正在上传图片...' : (
                  <>
                    <span>开始增强</span>
                    <span className="flex items-center gap-1">
                      {modelPrice.toFixed(2)}
                      <img
                        src={rmbCircle}
                        alt="费用"
                        className={`w-4 h-4 ${loading || !originalImageUrl ? 'grayscale opacity-50' : ''}`}
                      />
                    </span>
                  </>
                )}
              </button>
            )}

            {/* 功能介绍 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">AI 图像增强功能</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleOpenHistory}
                    className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1"
                  >
                    <HistoryOutlined />
                    生成历史
                  </button>
                  {/* 模型切换开关 */}
                  <div
                    onClick={() => !loading && setSelectedModel(selectedModel === 'gpt-image-2' ? 'gemini-2.5-flash-image' : 'gpt-image-2')}
                    className={`relative flex items-center w-[68px] h-7 rounded-full transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selectedModel === 'gpt-image-2' ? 'bg-orange-500' : 'bg-purple-500'}`}
                  >
                    <span className={`absolute text-xs font-medium transition-all select-none ${
                      selectedModel === 'gpt-image-2'
                        ? 'left-2 text-white'
                        : 'left-8 text-white'
                    }`}>
                      {selectedModel === 'gpt-image-2' ? 'GPT' : 'Nano'}
                    </span>
                    <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ease-in-out ${
                      selectedModel === 'gpt-image-2'
                        ? 'translate-x-[2.75rem]'
                        : 'translate-x-1'
                    }`}/>
                  </div>
                </div>
              </div>
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
                <li>• 支持 JPG、PNG 格式，选择正确的图片类别可获得更好效果</li>
                <li>• 处理时间约 30-60 秒，请耐心等待</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 生成历史弹窗 */}
      <Modal
        title="生成历史"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : historyRecords.length === 0 ? (
          <Empty description="暂无生成历史" />
        ) : (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {historyRecords.map(record => (
                <div
                  key={record.taskId}
                  onClick={() => handleHistoryClick(record)}
                  className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-orange-50 hover:ring-2 hover:ring-orange-400 transition-all"
                >
                  {/* 结果图片 */}
                  <div className="relative w-full h-32">
                    {record.resultImageUrl ? (
                      <img
                        src={addOssThumbnailStyle(ensureHttpsUrl(record.resultImageUrl)) || ''}
                        alt="生成结果"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">无图片</span>
                      </div>
                    )}
                    {/* 原图缩略图 */}
                    {record.originalImageUrl && (
                      <div className="absolute bottom-2 right-2 w-12 h-12 rounded border border-white shadow-sm overflow-hidden">
                        <img
                          src={addOssThumbnailStyle(ensureHttpsUrl(record.originalImageUrl)) || ''}
                          alt="原图"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  {/* 信息 */}
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate">{record.prompt || '图像增强'}</p>
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <ClockCircleOutlined className="text-xs" />
                        <span>{formatDate(record.createTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.status === 'pending' ? (
                          <span className="text-gray-500">{getPendingElapsed(record.createTime)}</span>
                        ) : (
                          formatDuration(record.duration) && (
                            <span className="text-gray-500">{formatDuration(record.duration)}</span>
                          )
                        )}
                        <span className={`px-2 py-0.5 rounded ${
                          record.status === 'done' ? 'bg-green-500 text-white' :
                          record.status === 'pending' ? 'bg-blue-500 text-white' :
                          'bg-red-500 text-white'
                        }`}>
                          {record.status === 'done' ? '完成' : record.status === 'pending' ? '处理中' : '失败'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* 分页 */}
            {historyTotal > 12 && (
              <div className="flex justify-center mt-4">
                <Pagination
                  current={historyPage}
                  total={historyTotal}
                  pageSize={12}
                  onChange={(page) => loadHistory(page)}
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 历史详情弹窗 */}
      <Modal
        title="生成详情"
        open={historyDetailModalVisible}
        onCancel={() => setHistoryDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedHistory && (
          <div>
            {/* 结果图片 */}
            {selectedHistory.resultImageUrl && (
              <div className="relative mb-4 flex justify-center">
                <Image
                  src={ensureHttpsUrl(selectedHistory.resultImageUrl) || ''}
                  alt="生成结果"
                  className="rounded-lg"
                  style={{ maxHeight: 400, objectFit: 'contain' }}
                  preview={{
                    mask: <div className="text-white">点击预览大图</div>,
                  }}
                />
                {/* 原图 */}
                {selectedHistory.originalImageUrl && (
                  <div className="absolute bottom-4 right-4 w-24 h-24 rounded-lg border-2 border-white shadow-lg overflow-hidden">
                    <Image
                      src={ensureHttpsUrl(selectedHistory.originalImageUrl) || ''}
                      alt="原图"
                      className="w-full h-full object-cover"
                      preview={{
                        mask: <div className="text-white text-xs">预览</div>,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 其他信息 */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 flex-wrap">
              <span>提示词: {selectedHistory.prompt || '图像增强'}</span>
              {formatDuration(selectedHistory.duration) && (
                <span>耗时: {formatDuration(selectedHistory.duration)}</span>
              )}
              <span>时间: {formatDate(selectedHistory.createTime)}</span>
            </div>

            {/* 使用按钮 */}
            <button
              onClick={() => handleUseHistory(selectedHistory)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              查看此记录
            </button>
          </div>
        )}
      </Modal>

      {/* 登录弹窗 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}