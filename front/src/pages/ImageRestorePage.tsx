import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal, Image, Pagination, Empty } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { imageRestoreApi, userApi, ImageTaskRecord } from '@/api';
import { addOssThumbnailStyle } from '@/lib/utils';

// 导入对比示例图
import demoBefore from '@/assets/image-restore/before.jpg';
import demoAfter from '@/assets/image-restore/after.jpg';

// 页面标题闪烁 hook
function useTitleFlash() {
  const flashRef = useRef<number | null>(null);
  const originalTitle = useRef<string>(document.title);
  const isFlashing = useRef(false);

  const startFlash = useCallback((status: 'done' | 'error' = 'done') => {
    // 如果页面有焦点，不需要闪烁
    if (document.hasFocus()) {
      return;
    }
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
        : '老照片修复';
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

// 示例图尺寸比例 (1180:808)
const DEMO_WIDTH = 1180;
const DEMO_HEIGHT = 808;

export function ImageRestorePage() {
  const { startFlash } = useTitleFlash();

  // 选择状态
  const [isColor, setIsColor] = useState(true); // 黑白/彩色，默认彩色
  const [isReal, setIsReal] = useState(true); // 干净/真实，默认真实（保留胶片颗粒）
  const [isClear, setIsClear] = useState(true); // 一般/清晰，默认清晰
  const [selectedModel, setSelectedModel] = useState('gpt-image-2');

  // 图片状态
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);

  // 处理状态
  const [loading, setLoading] = useState(false);
  const [taskSubmitTime, setTaskSubmitTime] = useState<number | null>(null);
  const [currentElapsed, setCurrentElapsed] = useState<number>(0);

  // 示例滑块状态
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  // 容器尺寸状态
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

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

    setRestoredImage(null);
    setContainerSize(null);

    // 先上传到OSS，获取URL后展示
    try {
      message.info('正在上传原图...');
      const ossUrl = await userApi.uploadImageToOss(file, 'restore-original/');
      setOriginalImage(ossUrl);
      setOriginalImageUrl(ossUrl);
      message.success('原图上传成功');

      // 获取图片尺寸并设置容器大小
      try {
        const dims = await getImageDimensions(ossUrl);
        // 限制容器最大尺寸与示例图比例一致
        const maxWidth = 650;
        const maxHeight = Math.round(DEMO_HEIGHT * (maxWidth / DEMO_WIDTH));
        const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height, 1);
        setContainerSize({
          width: Math.round(dims.width * scale),
          height: Math.round(dims.height * scale)
        });
      } catch {
        setContainerSize(null);
      }
    } catch (error: any) {
      message.error('原图上传失败: ' + error.message);
      setOriginalImage(null);
      setOriginalImageUrl(null);
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      e.target.value = '';
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

  // 滑块拖动
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSliderDragging(true);
  };

  const handleSliderTouchStart = () => {
    setIsSliderDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isSliderDragging && sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, [isSliderDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isSliderDragging && sliderRef.current) {
      const touch = e.touches[0];
      const rect = sliderRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, [isSliderDragging]);

  const handleMouseUp = useCallback(() => {
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

  // 提交修复任务
  const handleSubmit = async () => {
    if (!originalImage || !originalImageUrl) {
      message.warning('请先上传图片');
      return;
    }

    setLoading(true);
    setTaskSubmitTime(Date.now());
    setCurrentElapsed(0);

    try {
      message.info('正在提交修复任务...');
      const { taskId } = await imageRestoreApi.restoreImageAsync(
        originalImageUrl,
        isColor ? 'color' : 'bw',
        isReal ? 'real' : 'clean',
        isClear ? 'high' : 'medium',
        selectedModel
      );
      message.info('任务已提交，可稍后在生成历史查看');

      // 轮询任务结果
      const pollInterval = 5000;
      const maxPolls = 120;
      let pollCount = 0;

      const poll = async () => {
        try {
          const result = await imageRestoreApi.getTaskResult(taskId);

          if (result.status === 'done') {
            setRestoredImage(result.imageUrl || null);
            message.success('修复成功');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('done');
          } else if (result.status === 'error') {
            message.error(result.msg || '修复失败');
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
      message.error(error.message || '修复失败');
      setLoading(false);
      setTaskSubmitTime(null);
    }
  };

  // 下载
  const handleDownload = async () => {
    if (!restoredImage) return;

    const now = new Date();
    const fileName = `restored_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.jpg`;

    try {
      const response = await fetch(restoredImage);
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
      a.href = restoredImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 重置
  const handleReset = () => {
    setOriginalImage(null);
    setOriginalImageUrl(null);
    setRestoredImage(null);
    setContainerSize(null);
    setSliderPosition(50);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      const result = await imageRestoreApi.getHistory(page, 12);
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
      setRestoredImage(ensureHttpsUrl(record.resultImageUrl));
      setSliderPosition(50);
    }
    setHistoryDetailModalVisible(false);
    setHistoryModalVisible(false);
  };

  // 显示的图片
  const displayAfterImage = restoredImage || (originalImage ? originalImage : demoAfter);
  const displayBeforeImage = originalImage || demoBefore;

  // 容器样式 - 使用示例图比例 1180:808
  const getContainerStyle = (): React.CSSProperties => {
    if (containerSize) {
      return {
        width: containerSize.width,
        height: containerSize.height,
      };
    }
    // 默认使用示例图比例 1180:808
    const maxWidth = 650;
    const scale = maxWidth / DEMO_WIDTH;
    return {
      width: maxWidth,
      height: Math.round(DEMO_HEIGHT * scale),
    };
  };

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* 标题 */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            老照片修复
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            使用 AI 老照片修复工具在线修复老照片。去除划痕、折痕、污点，增强褪色色彩，恢复丢失的细节，将老照片变成清晰鲜活的新照片。
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧对比图和选择区域 */}
          <div className="lg:w-[54%] order-2 lg:order-1 flex flex-col items-center">
            {/* 对比图容器 */}
            <div
              ref={sliderRef}
              className="relative rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none"
              style={getContainerStyle()}
            >
              {/* 后图（修复后） */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-white"
              >
                <img
                  src={restoredImage || displayAfterImage}
                  alt="修复后"
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              </div>

              {/* 前图（原图）- 使用clip-path裁剪 */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-white"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              >
                <img
                  src={displayBeforeImage}
                  alt="原图"
                  className="max-w-full max-h-full object-contain"
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
                <div className="absolute top-3 right-3 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
                  示例
                </div>
              )}

              {/* Loading提示 */}
              {loading && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-2 rounded-full flex items-center gap-2 z-10">
                  <Spin size="small" />
                  <span>正在处理... {formatDurationFromSeconds(currentElapsed)}</span>
                </div>
              )}
            </div>

            {/* 选项按钮组 - 单行布局 */}
            <div className="mt-5 w-full">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                {/* 黑白/彩色 Switch */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm transition-colors ${!isColor ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>黑白</span>
                  <div
                    onClick={() => !loading && setIsColor(!isColor)}
                    className={`relative flex items-center w-12 h-6 rounded-full transition-colors duration-200 ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${isColor ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      isColor ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className={`text-sm transition-colors ${isColor ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>彩色</span>
                </div>

                {/* 分隔线 */}
                <div className="w-px h-6 bg-gray-300" />

                {/* 干净/真实 Switch */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm transition-colors ${!isReal ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>干净</span>
                  <div
                    onClick={() => !loading && setIsReal(!isReal)}
                    className={`relative flex items-center w-12 h-6 rounded-full transition-colors duration-200 ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${isReal ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      isReal ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className={`text-sm transition-colors ${isReal ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>真实</span>
                </div>

                {/* 分隔线 */}
                <div className="w-px h-6 bg-gray-300" />

                {/* 一般/清晰 Switch */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm transition-colors ${!isClear ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>一般</span>
                  <div
                    onClick={() => !loading && setIsClear(!isClear)}
                    className={`relative flex items-center w-12 h-6 rounded-full transition-colors duration-200 ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${isClear ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      isClear ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className={`text-sm transition-colors ${isClear ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>清晰</span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            {originalImage && (
              <div className="flex justify-center gap-3 mt-4 w-full">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  重新上传
                </button>
                {restoredImage && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    <DownloadOutlined />
                    <span>下载图片</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 右侧上传和配置区域 */}
          <div className="lg:w-[46%] order-1 lg:order-2 flex flex-col gap-4">
            {/* 上传框 */}
            <div
              className="relative flex flex-col justify-center items-center h-[200px] md:h-[180px] rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <CloudUploadOutlined className="text-4xl md:text-5xl text-blue-400 mb-4" />
              <span className="text-gray-600 font-medium mb-2">拖拽或选择图片</span>
              <button
                type="button"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-blue-500/30"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadClick();
                }}
              >
                上传图片
              </button>
            </div>

            {/* 修复按钮 */}
            {originalImage && (
              <button
                onClick={handleSubmit}
                disabled={loading || !originalImageUrl}
                className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
                  loading || !originalImageUrl
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30'
                }`}
              >
                {loading ? '处理中...' : !originalImageUrl ? '正在上传原图...' : '一键修复'}
              </button>
            )}

            {/* 功能介绍和模型选择 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">老照片修复功能</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleOpenHistory}
                    className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <HistoryOutlined />
                    生成历史
                  </button>
                  {/* 模型切换开关 */}
                  <div
                    onClick={() => !loading && setSelectedModel(selectedModel === 'gpt-image-2' ? 'gemini-2.5-flash-image' : 'gpt-image-2')}
                    className={`relative flex items-center w-20 h-7 rounded-full transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selectedModel === 'gpt-image-2' ? 'bg-blue-500' : 'bg-purple-500'}`}
                  >
                    <span className={`absolute text-xs font-medium transition-all ${
                      selectedModel === 'gpt-image-2'
                        ? 'left-2 text-white'
                        : 'left-10 text-white'
                    }`}>
                      {selectedModel === 'gpt-image-2' ? 'GPT' : 'Nano'}
                    </span>
                    <div className={`absolute w-5 h-5 bg-white rounded-full shadow transition-all ${
                      selectedModel === 'gpt-image-2'
                        ? 'right-1'
                        : 'left-1'
                    }`} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  修复划痕
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  修复折痕
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  修复污点
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  增强色彩
                </div>
              </div>
            </div>

            {/* 使用提示 */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-blue-500">💡</span>
                使用提示
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 支持 JPG、PNG、WebP 格式图片</li>
                <li>• 彩色模式可增强褪色照片的色彩</li>
                <li>• 真实模式保留胶片颗粒质感，干净模式去除噪点</li>
                <li>• 高清晰度可获得更清晰的细节</li>
                <li>• 处理时间约30-60秒，请耐心等待</li>
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
                  className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-blue-50 hover:ring-2 hover:ring-blue-400 transition-all"
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
                    <p className="text-xs text-gray-600 truncate">{record.prompt || '老照片修复'}</p>
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
                          record.status === 'done' ? 'bg-blue-500 text-white' :
                          record.status === 'pending' ? 'bg-yellow-500 text-white' :
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
              <span>提示词: {selectedHistory.prompt || '老照片修复'}</span>
              {formatDuration(selectedHistory.duration) && (
                <span>耗时: {formatDuration(selectedHistory.duration)}</span>
              )}
              <span>时间: {formatDate(selectedHistory.createTime)}</span>
            </div>

            {/* 使用按钮 */}
            <button
              onClick={() => handleUseHistory(selectedHistory)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              查看此记录
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}