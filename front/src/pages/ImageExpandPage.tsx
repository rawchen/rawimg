import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal, Image, Pagination, Empty } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Move } from 'lucide-react';
import { imageExpandApi, userApi, ImageTaskRecord } from '@/api';
import demoBefore from '@/assets/image-expand/before.jpg';
import demoAfter from '@/assets/image-expand/after.jpg';

// 页面标题闪烁 hook
function useTitleFlash() {
  const flashRef = useRef<number | null>(null);
  const originalTitle = useRef<string>(document.title);
  const isFlashing = useRef(false);

  const startFlash = useCallback((status: 'done' | 'error' = 'done') => {
    // 如果页面已经聚焦，不需要闪烁
    if (document.hasFocus() || document.visibilityState === 'visible') {
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
        : '扩图';
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

// 图片尺寸选项
const sizeOptions = [
  { value: '1024x1024', label: '1:1', desc: '正方形', displayWidth: 16, displayHeight: 16 },
  { value: '1536x1024', label: '3:2', desc: '横屏', displayWidth: 18, displayHeight: 12 },
  { value: '1024x1536', label: '2:3', desc: '竖屏', displayWidth: 12, displayHeight: 18 },
  { value: '1920x1080', label: '16:9', desc: '横屏', displayWidth: 20, displayHeight: 11.25 },
  { value: '1080x1920', label: '9:16', desc: '竖屏', displayWidth: 11.25, displayHeight: 20 },
];

export function ImageExpandPage() {
  const { startFlash } = useTitleFlash();
  const [selectedSize, setSelectedSize] = useState('1536x1024');
  const [selectedModel, setSelectedModel] = useState('gpt-image-2');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null); // 原图OSS URL
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [maskImageUrl, setMaskImageUrl] = useState<string | null>(null); // mask OSS URL
  const [loading, setLoading] = useState(false);
  const [isSizeDisabled, setIsSizeDisabled] = useState(false);
  const [canExpand, setCanExpand] = useState(false); // 是否可以开始扩展（只有上传新图片后才能扩展）
  const [taskSubmitTime, setTaskSubmitTime] = useState<number | null>(null);
  const [currentElapsed, setCurrentElapsed] = useState<number>(0);

  // Canvas编辑相关状态
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // 示例对比滑块状态
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  // Canvas容器尺寸
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 450 });

  // 生成历史相关状态
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ImageTaskRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<ImageTaskRecord | null>(null);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);
  const [, setHistoryUpdateTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 解析尺寸
  const parseSize = (sizeStr: string): { width: number; height: number } => {
    const [width, height] = sizeStr.split('x').map(Number);
    return { width, height };
  };

  // ResizeObserver 监听容器尺寸变化
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

  // 容器尺寸变化时调整图片位置和缩放
  useEffect(() => {
    if (!originalImage || !imageSize.width || !imageSize.height) return;

    const maxScaleX = canvasDimensions.width / imageSize.width;
    const maxScaleY = canvasDimensions.height / imageSize.height;
    const maxScale = Math.min(maxScaleX, maxScaleY);

    const effectiveScale = Math.min(imageScale, maxScale);
    if (imageScale > maxScale) {
      setImageScale(maxScale);
    }

    const displayWidth = imageSize.width * effectiveScale;
    const displayHeight = imageSize.height * effectiveScale;

    const minX = (displayWidth - canvasDimensions.width) / 2;
    const maxX = (canvasDimensions.width - displayWidth) / 2;
    const minY = (displayHeight - canvasDimensions.height) / 2;
    const maxY = (canvasDimensions.height - displayHeight) / 2;

    const clampOffset = (value: number, min: number, max: number) => {
      if (min <= max) return Math.max(min, Math.min(max, value));
      else return Math.max(max, Math.min(min, value));
    };

    setImageOffset(prevOffset => ({
      x: clampOffset(prevOffset.x, minX, maxX),
      y: clampOffset(prevOffset.y, minY, maxY),
    }));
  }, [canvasDimensions, originalImage, imageSize, imageScale]);

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

  // 处理文件上传 - 上传原图到OSS
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }

    // 重置扩展相关状态
    setExpandedImage(null);
    setMaskImageUrl(null);
    setOriginalImageUrl(null); // 重置原图OSS URL
    setIsSizeDisabled(false);
    setCanExpand(false); // 上传新图片时先禁用，等上传成功后再启用
    setOriginalImageFile(file);
    // 清空 file input，允许再次选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 本地预览
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setOriginalImage(dataUrl);
      setImageOffset({ x: 0, y: 0 });

      // 计算图片尺寸和缩放
      const img = new window.Image();
      img.onload = async () => {
        const imgWidth = img.width;
        const imgHeight = img.height;
        setImageSize({ width: imgWidth, height: imgHeight });

        const maxContainerWidth = canvasDimensions.width * 0.9;
        const maxContainerHeight = canvasDimensions.height * 0.9;
        const scaleByWidth = maxContainerWidth / imgWidth;
        const scaleByHeight = maxContainerHeight / imgHeight;
        const appropriateScale = Math.min(scaleByWidth, scaleByHeight, 1);
        setImageScale(appropriateScale);

        // 上传原图到OSS
        try {
          message.info('正在上传原图...');
          const ossUrl = await userApi.uploadImageToOss(file, 'expand-original/');
          setOriginalImageUrl(ossUrl);
          setCanExpand(true); // 上传成功后允许扩展
          message.success('原图上传成功');
        } catch (error: any) {
          message.error('原图上传失败: ' + error.message);
          setOriginalImage(null);
          setOriginalImageFile(null);
        }
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

  // Canvas拖动
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

  // 滚轮缩放
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!originalImage || loading) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.01 : 0.01;

    setImageScale(prev => {
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
    if (isDragging && originalImage && !expandedImage) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const displayWidth = imageSize.width * imageScale;
      const displayHeight = imageSize.height * imageScale;
      const minX = (displayWidth - canvasDimensions.width) / 2;
      const maxX = (canvasDimensions.width - displayWidth) / 2;
      const minY = (displayHeight - canvasDimensions.height) / 2;
      const maxY = (canvasDimensions.height - displayHeight) / 2;

      const clampX = (v: number) => minX <= maxX ? Math.max(minX, Math.min(maxX, v)) : Math.max(maxX, Math.min(minX, v));
      const clampY = (v: number) => minY <= maxY ? Math.max(minY, Math.min(maxY, v)) : Math.max(maxY, Math.min(minY, v));

      setImageOffset({ x: clampX(dragStart.offsetX + deltaX), y: clampY(dragStart.offsetY + deltaY) });
    }

    if (isSliderDragging && sliderRef.current && (!originalImage || expandedImage)) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, [isDragging, isSliderDragging, dragStart, originalImage, expandedImage, imageSize, imageScale, canvasDimensions]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && originalImage && !expandedImage) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;

      const displayWidth = imageSize.width * imageScale;
      const displayHeight = imageSize.height * imageScale;
      const minX = (displayWidth - canvasDimensions.width) / 2;
      const maxX = (canvasDimensions.width - displayWidth) / 2;
      const minY = (displayHeight - canvasDimensions.height) / 2;
      const maxY = (canvasDimensions.height - displayHeight) / 2;

      const clampX = (v: number) => minX <= maxX ? Math.max(minX, Math.min(maxX, v)) : Math.max(maxX, Math.min(minX, v));
      const clampY = (v: number) => minY <= maxY ? Math.max(minY, Math.min(maxY, v)) : Math.max(maxY, Math.min(minY, v));

      setImageOffset({ x: clampX(dragStart.offsetX + deltaX), y: clampY(dragStart.offsetY + deltaY) });
    }

    if (isSliderDragging && sliderRef.current && (!originalImage || expandedImage)) {
      const touch = e.touches[0];
      const rect = sliderRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    }
  }, [isDragging, isSliderDragging, dragStart, originalImage, expandedImage, imageSize, imageScale, canvasDimensions]);

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

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSliderDragging(true);
  };

  const handleSliderTouchStart = () => {
    setIsSliderDragging(true);
  };

  // 生成mask canvas - 原图内容 + 透明扩展区域
  const generateMaskCanvas = async (): Promise<File> => {
    return new Promise((resolve, reject) => {
      if (!originalImage || !originalImageFile) {
        reject(new Error('请先上传图片'));
        return;
      }

      const { width: targetWidth, height: targetHeight } = parseSize(selectedSize);
      const scaleX = targetWidth / canvasDimensions.width;
      const scaleY = targetHeight / canvasDimensions.height;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = targetWidth;
      maskCanvas.height = targetHeight;
      const maskCtx = maskCanvas.getContext('2d')!;
      // 不填充背景，保持透明

      const img = new window.Image();
      img.onload = () => {
        const scaledWidth = img.width * imageScale;
        const scaledHeight = img.height * imageScale;

        const displayCenterX = canvasDimensions.width / 2 + imageOffset.x;
        const displayCenterY = canvasDimensions.height / 2 + imageOffset.y;

        const targetCenterX = displayCenterX * scaleX;
        const targetCenterY = displayCenterY * scaleY;

        const targetScaledWidth = scaledWidth * scaleX;
        const targetScaledHeight = scaledHeight * scaleY;
        const posX = targetCenterX - targetScaledWidth / 2;
        const posY = targetCenterY - targetScaledHeight / 2;

        maskCtx.drawImage(img, posX, posY, targetScaledWidth, targetScaledHeight);

        maskCanvas.toBlob((maskBlob) => {
          if (!maskBlob) {
            reject(new Error('生成遮罩图片失败'));
            return;
          }
          const maskFile = new File([maskBlob], 'mask.png', { type: 'image/png' });
          resolve(maskFile);
        }, 'image/png');
      };

      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = originalImage;
    });
  };

  // 提交扩展 - 异步模式
  const handleSubmit = async () => {
    if (!originalImage || !originalImageUrl) {
      message.warning('请先上传图片');
      return;
    }

    setLoading(true);
    setTaskSubmitTime(Date.now());
    setCurrentElapsed(0);
    setIsSizeDisabled(true);

    try {
      // 生成mask canvas
      message.info('正在生成遮罩...');
      const maskFile = await generateMaskCanvas();

      // 上传mask到OSS
      message.info('正在上传遮罩...');
      const maskUrl = await userApi.uploadImageToOss(maskFile, 'expand-mask/');
      setMaskImageUrl(maskUrl);

      // 调用异步扩展API
      message.info('正在提交扩展任务...');
      const { taskId } = await imageExpandApi.expandImageAsync(originalImageUrl, maskUrl, selectedSize, selectedModel);
      message.info('任务已提交，可稍后在生成历史查看');

      // 轮询任务结果
      const pollInterval = 5000;
      const maxPolls = 120;
      let pollCount = 0;

      const poll = async () => {
        try {
          const result = await imageExpandApi.getTaskResult(taskId);

          if (result.status === 'done') {
            setExpandedImage(result.imageUrl || null);
            setCanExpand(false); // 扩展完成后禁用扩展按钮
            message.success('图像扩展成功');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('done');
          } else if (result.status === 'error') {
            message.error(result.msg || '图像扩展失败');
            setLoading(false);
            setTaskSubmitTime(null);
            setIsSizeDisabled(false);
            startFlash('error');
          } else if (result.status === 'not_found') {
            message.error('任务不存在或已过期');
            setLoading(false);
            setTaskSubmitTime(null);
            setIsSizeDisabled(false);
          } else {
            pollCount++;
            if (pollCount < maxPolls) {
              setTimeout(poll, pollInterval);
            } else {
              message.error('任务处理超时，请稍后重试');
              setLoading(false);
              setTaskSubmitTime(null);
              setIsSizeDisabled(false);
            }
          }
        } catch (error: any) {
          message.error(error.message || '查询任务状态失败');
          setLoading(false);
          setTaskSubmitTime(null);
          setIsSizeDisabled(false);
        }
      };

      setTimeout(poll, 2000);
    } catch (error: any) {
      message.error(error.message || '图像扩展失败');
      setLoading(false);
      setTaskSubmitTime(null);
      setIsSizeDisabled(false);
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

  // 计算图片样式
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

  // 确保URL有https前缀
  const ensureHttpsUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
  };

  // 格式化耗时
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

  // 格式化日期
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

  // 加载生成历史
  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const result = await imageExpandApi.getHistory(page, 12);
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
      // 从原图URL加载图片
      setOriginalImage(ensureHttpsUrl(record.originalImageUrl));
      setOriginalImageUrl(ensureHttpsUrl(record.originalImageUrl));
      setExpandedImage(ensureHttpsUrl(record.resultImageUrl));
      setMaskImageUrl(ensureHttpsUrl(record.maskImageUrl));
      setSliderPosition(50);
      setCanExpand(false); // 从历史查看时不允许再次扩展
    }
    setHistoryDetailModalVisible(false);
    setHistoryModalVisible(false);
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
            {/* 对比图/编辑区 */}
            <div
              ref={(el) => { sliderRef.current = el; containerRef.current = el; }}
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none mx-auto"
              style={{
                aspectRatio: parseSize(selectedSize).width / parseSize(selectedSize).height,
                maxHeight: '450px',
                maxWidth: `${450 * parseSize(selectedSize).width / parseSize(selectedSize).height}px`,
              }}
            >
              {expandedImage && originalImageUrl ? (
                // 扩展完成 - 对比滑块模式
                <>
                  {/* 扩展结果图 */}
                  <img
                    src={expandedImage}
                    alt="扩展后"
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                    draggable={false}
                  />

                  {/* 原图 */}
                  <div
                    className="absolute inset-0"
                    style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                  >
                    <img
                      src={originalImageUrl}
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

                  {/* 对比标签 */}
                  <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
                    原图
                  </div>
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded z-10">
                    扩展后
                  </div>
                </>
              ) : originalImage ? (
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
                      <div className="bg-white rounded-xl px-6 py-4 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Spin size="default" />
                          <span className="text-gray-700">任务已提交，可稍后在生成历史查看 {formatDurationFromSeconds(currentElapsed)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // 示例模式 - 滑块对比
                <>
                  <img
                    src={displayAfterImage}
                    alt="扩展后"
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                    draggable={false}
                  />
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
                  <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded z-10">
                    示例
                  </div>
                </>
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
                {sizeOptions.map(option => {
                  const isDisabled = isSizeDisabled && selectedSize !== option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => !isDisabled && setSelectedSize(option.value)}
                      disabled={isDisabled}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        isDisabled
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : selectedSize === option.value
                            ? 'bg-orange-100 border-orange-500 text-orange-600'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      <span
                        className={`rounded-sm ${isDisabled ? 'bg-gray-300' : selectedSize === option.value ? 'bg-orange-500' : 'bg-gray-300'}`}
                        style={{ width: option.displayWidth, height: option.displayHeight }}
                      />
                      <span className="text-sm">{option.label}</span>
                      <span className="text-xs text-gray-500">{option.desc}</span>
                    </button>
                  );
                })}
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
                disabled={loading || !originalImageUrl || !canExpand}
                className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
                  loading || !originalImageUrl || !canExpand
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
                }`}
              >
                {loading ? '处理中...' : !originalImageUrl ? '正在上传原图...' : !canExpand ? '已完成扩展' : '开始扩展'}
              </button>
            )}

            {/* 功能介绍 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">AI 图像扩展功能</h3>
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
                    onClick={() => !loading && setSelectedModel(selectedModel === 'gpt-image-2' ? 'nano-banana-2-convert' : 'gpt-image-2')}
                    className={`relative flex items-center w-20 h-7 rounded-full transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selectedModel === 'gpt-image-2' ? 'bg-orange-500' : 'bg-blue-500'}`}
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
                <li>• 处理时间约30-60秒，请耐心等待，可在生成历史查看进度</li>
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
                        src={ensureHttpsUrl(record.resultImageUrl) || ''}
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
                          src={ensureHttpsUrl(record.originalImageUrl) || ''}
                          alt="原图"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  {/* 信息 */}
                  <div className="p-2">
                    <p className="text-xs text-gray-600">{record.size}</p>
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
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <span>尺寸: {selectedHistory.size}</span>
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
    </div>
  );
}