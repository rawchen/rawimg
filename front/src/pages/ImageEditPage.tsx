import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal, Image, Pagination, Empty } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  UndoOutlined,
  RedoOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { Paintbrush, Square, CircleDot, LucideIcon } from 'lucide-react';
import { userApi, ImageTaskRecord, imageEditApi } from '@/api';
import demoBefore from '@/assets/image-remove/obr-people-before.jpg';
import demoAfter from '@/assets/image-remove/obr-people-after.jpg';

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
        : 'AI 局部改图';
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

// 选区工具类型
type ToolType = 'brush' | 'rect' | 'lasso';

interface ToolConfig {
  key: ToolType;
  name: string;
  icon: LucideIcon;
}

const tools: ToolConfig[] = [
  { key: 'brush', name: '涂抹', icon: Paintbrush },
  { key: 'rect', name: '框选', icon: Square },
  { key: 'lasso', name: '圈选', icon: CircleDot },
];

// 预置提示词
const presetPrompts = [
  { key: 'remove', label: '去除', prompt: '去除选区内的内容，保持背景自然连贯' },
  { key: 'sky', label: '换天空', prompt: '把天空替换成晴朗的蓝天白云' },
  { key: 'pedestrian', label: '去路人', prompt: '把远处背景中多余的路人移除' },
  { key: 'hairstyle', label: '变发型', prompt: '把人物的短发变成柔顺的金色长卷发' },
  { key: 'outfit', label: '换穿搭', prompt: '给图中的人物穿上古典大气的国风服装' },
];

// 选区路径历史记录
interface MaskPath {
  type: ToolType;
  points: { x: number; y: number }[];
  brushSize?: number;
}

// 橘色遮罩颜色
const MASK_COLOR = 'rgba(255, 140, 0, 0.5)';
const MASK_COLOR_SOLID = 'rgba(255, 140, 0, 1)';

export function ImageEditPage() {
  const { startFlash } = useTitleFlash();

  // 图片状态
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);

  // 选区工具状态
  const [selectedTool, setSelectedTool] = useState<ToolType>('brush');
  const [brushSize, setBrushSize] = useState(20);
  const [maskPaths, setMaskPaths] = useState<MaskPath[]>([]);
  const [pathIndex, setPathIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [rectEnd, setRectEnd] = useState<{ x: number; y: number } | null>(null);

  // Canvas相关
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  // 提示词和模型
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-image-2');

  // 任务状态
  const [loading, setLoading] = useState(false);
  const [taskSubmitTime, setTaskSubmitTime] = useState<number | null>(null);
  const [currentElapsed, setCurrentElapsed] = useState(0);

  // 对比滑块
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  // 历史记录
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ImageTaskRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<ImageTaskRecord | null>(null);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);
  const [, setHistoryUpdateTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // 绘制Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !originalImage) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 清空canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制原图
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 绘制遮罩路径
      ctx.fillStyle = MASK_COLOR;
      ctx.strokeStyle = MASK_COLOR;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 只绘制当前索引之前的路径（支持撤销）
      const pathsToDraw = maskPaths.slice(0, pathIndex + 1);

      for (const path of pathsToDraw) {
        if (path.type === 'brush' && path.points.length > 0) {
          ctx.lineWidth = path.brushSize || 20;
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        } else if (path.type === 'rect' && path.points.length === 2) {
          const start = path.points[0];
          const end = path.points[1];
          ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (path.type === 'lasso' && path.points.length > 2) {
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // 绘制当前正在绘制的路径
      if (isDrawing) {
        if (selectedTool === 'brush' && currentPoints.length > 0) {
          ctx.lineWidth = brushSize;
          ctx.beginPath();
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          for (let i = 1; i < currentPoints.length; i++) {
            ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
          }
          ctx.stroke();
        } else if (selectedTool === 'rect' && rectStart && rectEnd) {
          ctx.fillRect(rectStart.x, rectStart.y, rectEnd.x - rectStart.x, rectEnd.y - rectStart.y);
        } else if (selectedTool === 'lasso' && currentPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
          for (let i = 1; i < currentPoints.length; i++) {
            ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
          }
          ctx.stroke();
        }
      }
    };
    img.src = originalImage;
  }, [originalImage, maskPaths, pathIndex, isDrawing, currentPoints, selectedTool, brushSize, rectStart, rectEnd]);

  // 监听绘制更新
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 处理文件上传
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }

    setEditedImage(null);
    setMaskPaths([]);
    setPathIndex(-1);
    setSliderPosition(50);

    try {
      message.info('正在上传图片...');
      const ossUrl = await userApi.uploadImageToOss(file, 'edit-original/');
      setOriginalImageUrl(ossUrl);

      // 加载图片
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setOriginalImage(dataUrl);

        const img = new window.Image();
        img.onload = () => {
          setImageWidth(img.width);
          setImageHeight(img.height);

          // 设置canvas尺寸
          if (canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);

      message.success('图片上传成功');
    } catch (error: any) {
      message.error('图片上传失败: ' + error.message);
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

  // 获取canvas坐标
  const getCanvasCoords = (e: React.MouseEvent | MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Canvas鼠标事件
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!originalImage || loading) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (e.button === 0) { // 左键绘制
      setIsDrawing(true);
      setCurrentPoints([coords]);

      if (selectedTool === 'rect') {
        setRectStart(coords);
        setRectEnd(coords);
      }
    } else if (e.button === 1 || e.button === 2) { // 中键或右键拖动
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, offsetX: canvasOffset.x, offsetY: canvasOffset.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!originalImage) return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (isDrawing) {
      if (selectedTool === 'brush') {
        setCurrentPoints(prev => [...prev, coords]);
      } else if (selectedTool === 'rect' && rectStart) {
        setRectEnd(coords);
      } else if (selectedTool === 'lasso') {
        setCurrentPoints(prev => [...prev, coords]);
      }
    }

    if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCanvasOffset({ x: panStart.offsetX + deltaX, y: panStart.offsetY + deltaY });
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (isDrawing) {
      const coords = getCanvasCoords(e);

      if (selectedTool === 'brush' && currentPoints.length > 0) {
        const newPath: MaskPath = {
          type: 'brush',
          points: currentPoints,
          brushSize,
        };
        // 移除当前索引之后的所有路径，添加新路径
        const newPaths = [...maskPaths.slice(0, pathIndex + 1), newPath];
        setMaskPaths(newPaths);
        setPathIndex(newPaths.length - 1);
      } else if (selectedTool === 'rect' && rectStart && rectEnd) {
        const newPath: MaskPath = {
          type: 'rect',
          points: [rectStart, rectEnd],
        };
        const newPaths = [...maskPaths.slice(0, pathIndex + 1), newPath];
        setMaskPaths(newPaths);
        setPathIndex(newPaths.length - 1);
        setRectStart(null);
        setRectEnd(null);
      } else if (selectedTool === 'lasso' && currentPoints.length > 2 && coords) {
        // 圈选需要闭合
        const closedPoints = [...currentPoints, currentPoints[0]];
        const newPath: MaskPath = {
          type: 'lasso',
          points: closedPoints,
        };
        const newPaths = [...maskPaths.slice(0, pathIndex + 1), newPath];
        setMaskPaths(newPaths);
        setPathIndex(newPaths.length - 1);
      }

      setIsDrawing(false);
      setCurrentPoints([]);
    }

    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (!originalImage || loading) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setCanvasScale(prev => Math.max(0.1, Math.min(3, prev + delta)));
  };

  // 禁用右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // 撤销/重做
  const handleUndo = () => {
    if (pathIndex >= 0) {
      setPathIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (pathIndex < maskPaths.length - 1) {
      setPathIndex(prev => prev + 1);
    }
  };

  // 清除所有选区
  const handleClearMask = () => {
    setMaskPaths([]);
    setPathIndex(-1);
  };

  // 生成遮罩图片（纯橘色选区 + 透明背景）
  const generateMaskImage = async (): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('无法创建canvas'));
        return;
      }

      // 透明背景
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制遮罩路径
      ctx.fillStyle = MASK_COLOR_SOLID;
      ctx.strokeStyle = MASK_COLOR_SOLID;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const pathsToDraw = maskPaths.slice(0, pathIndex + 1);

      for (const path of pathsToDraw) {
        if (path.type === 'brush' && path.points.length > 0) {
          ctx.lineWidth = path.brushSize || 20;
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        } else if (path.type === 'rect' && path.points.length === 2) {
          const start = path.points[0];
          const end = path.points[1];
          ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
        } else if (path.type === 'lasso' && path.points.length > 2) {
          ctx.beginPath();
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('生成遮罩失败'));
          return;
        }
        const file = new File([blob], 'mask.png', { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    });
  };

  // 提交编辑任务
  const handleSubmit = async () => {
    if (!originalImageUrl) {
      message.warning('请先上传图片');
      return;
    }

    if (maskPaths.length === 0 || pathIndex < 0) {
      message.warning('请先绘制选区');
      return;
    }

    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }

    setLoading(true);
    setTaskSubmitTime(Date.now());
    setCurrentElapsed(0);

    try {
      // 生成遮罩图片
      message.info('正在生成遮罩...');
      const maskFile = await generateMaskImage();

      // 上传遮罩到OSS
      message.info('正在上传遮罩...');
      const maskUrl = await userApi.uploadImageToOss(maskFile, 'edit-mask/');

      // 调用API
      message.info('正在提交任务...');
      const { taskId } = await imageEditApi.editImageAsync(originalImageUrl, maskUrl, prompt, selectedModel);
      message.info('任务已提交，可稍后在生成历史查看');

      // 轮询任务结果
      const pollInterval = 5000;
      const maxPolls = 120;
      let pollCount = 0;

      const poll = async () => {
        try {
          const result = await imageEditApi.getTaskResult(taskId);

          if (result.status === 'done' && result.imageUrl) {
            setEditedImage(result.imageUrl);
            message.success('图像编辑成功');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('done');
          } else if (result.status === 'error') {
            message.error(result.msg || '图像编辑失败');
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
      message.error(error.message || '提交失败');
      setLoading(false);
      setTaskSubmitTime(null);
    }
  };

  // 下载结果
  const handleDownload = async () => {
    if (!editedImage) return;

    const now = new Date();
    const fileName = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}_${String(Math.floor(Math.random() * 100)).padStart(2, '0')}.jpg`;

    try {
      const response = await fetch(editedImage);
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
      a.href = editedImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 加载生成历史
  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const result = await imageEditApi.getHistory(page, 12);
      setHistoryRecords(result.records);
      setHistoryTotal(result.total);
      setHistoryPage(result.current);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleOpenHistory = useCallback(() => {
    setHistoryModalVisible(true);
    loadHistory(1);
  }, [loadHistory]);

  // 辅助函数
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

  const handleMouseUpCallback = useCallback(() => {
    setIsSliderDragging(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUpCallback);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleMouseUpCallback);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpCallback);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUpCallback);
    };
  }, [handleMouseMove, handleTouchMove, handleMouseUpCallback]);

  // 显示的图片
  const displayBeforeImage = originalImage || demoBefore;
  const displayAfterImage = editedImage || (originalImage ? originalImage : demoAfter);

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-[85rem] mx-auto px-4 py-6 md:py-10">
        {/* 标题 */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            AI 局部改图
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            使用 AI 智能修改局部画面保持原风格和内容的连贯性，保持选区外现有像素不变。
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧展示区域 */}
          <div className="lg:w-[75%] order-2 lg:order-1">
            {/* 编辑区/对比图 */}
            <div
              ref={sliderRef}
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none"
              style={{ aspectRatio: '16/9' }}
            >
              {editedImage ? (
                // 完成后显示对比滑块
                <>
                  <img
                    src={displayAfterImage}
                    alt="编辑后"
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
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 md:w-5 md:h-5 rotate-90 text-gray-800">
                          <path fillRule="evenodd" d="M11.47 4.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06L12 6.31 8.78 9.53a.75.75 0 0 1-1.06-1.06l3.75-3.75Zm-3.75 9.75a.75.75 0 0 1 1.06 0L12 17.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10">
                    原图
                  </div>
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2 py-1 rounded z-10">
                    编辑后
                  </div>
                </>
              ) : originalImage ? (
                // Canvas编辑模式
                <div
                  ref={containerRef}
                  className="w-full h-full bg-gray-100 relative overflow-hidden flex items-center justify-center"
                  style={{ cursor: isPanning ? 'grabbing' : 'crosshair' }}
                >
                  <canvas
                    ref={canvasRef}
                    className="bg-white shadow-lg"
                    style={{
                      transform: `scale(${canvasScale}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
                      maxWidth: 'none',
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onWheel={handleCanvasWheel}
                    onContextMenu={handleContextMenu}
                  />

                  {/* 工具提示 */}
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    {selectedTool === 'brush' ? '涂抹绘制选区' : selectedTool === 'rect' ? '框选矩形区域' : '圈选闭合区域'}
                  </div>

                  {/* 缩放显示 */}
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {Math.round(canvasScale * 100)}%
                  </div>

                  {/* Loading */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <div className="bg-white rounded-xl px-6 py-4 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Spin size="default" />
                          <span className="text-gray-700">处理中... {formatDurationFromSeconds(currentElapsed)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // 示例模式
                <>
                  <img
                    src={displayAfterImage}
                    alt="编辑后"
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
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 md:w-5 md:h-5 rotate-90 text-gray-800">
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

            {/* 选区工具栏 */}
            {originalImage && !editedImage && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* 工具选择 */}
                <div className="flex gap-2">
                  {tools.map((tool) => (
                    <button
                      key={tool.key}
                      onClick={() => setSelectedTool(tool.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedTool === tool.key
                          ? 'bg-orange-100 border-orange-500 text-orange-600'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      <tool.icon className="w-4 h-4" />
                      <span className="text-sm">{tool.name}</span>
                    </button>
                  ))}
                </div>

                {/* 画笔大小 */}
                {selectedTool === 'brush' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">大小:</span>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600 w-8">{brushSize}px</span>
                  </div>
                )}

                {/* 撤销/重做/清除 */}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={handleUndo}
                    disabled={pathIndex < 0}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                      pathIndex < 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <UndoOutlined />
                    <span className="text-sm">撤销</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={pathIndex >= maskPaths.length - 1}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                      pathIndex >= maskPaths.length - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <RedoOutlined />
                    <span className="text-sm">重做</span>
                  </button>
                  <button
                    onClick={handleClearMask}
                    disabled={maskPaths.length === 0}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                      maskPaths.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    }`}
                  >
                    <ClearOutlined />
                    <span className="text-sm">清除</span>
                  </button>
                </div>
              </div>
            )}

            {/* 下载按钮 */}
            {editedImage && (
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
          </div>

          {/* 右侧控制区域 */}
          <div className="lg:w-[44%] order-1 lg:order-2 flex flex-col gap-4">
            {/* 上传框 */}
            <div
              className="relative flex flex-col justify-center items-center h-[180px] rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-orange-400 hover:bg-orange-50/30 transition-colors cursor-pointer"
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
              <CloudUploadOutlined className="text-4xl text-orange-400 mb-3" />
              <span className="text-gray-600 font-medium mb-1">拖拽或选择图片</span>
              <button
                type="button"
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-orange-500/30 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUploadClick();
                }}
              >
                上传图片
              </button>
            </div>

            {/* 提示词输入 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">提示词</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述您想要如何修改选区内容..."
                className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {/* 预置提示词 */}
              <div className="flex flex-wrap gap-2 mt-3">
                {presetPrompts.map((preset) => (
                    <span
                      key={preset.key}
                      onClick={() => setPrompt(preset.prompt)}
                      className={`text-sm cursor-pointer transition-colors ${
                        prompt === preset.prompt
                          ? 'text-orange-600 font-medium'
                          : 'text-gray-500 hover:text-orange-500'
                      }`}
                    >
                      {preset.label}
                    </span>
                  ))}
              </div>
            </div>

            {/* 生成按钮 */}
            {originalImage && (
              <button
                onClick={handleSubmit}
                disabled={loading || !prompt.trim() || maskPaths.length === 0 || pathIndex < 0}
                className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
                  loading || !prompt.trim() || maskPaths.length === 0 || pathIndex < 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
                }`}
              >
                {loading ? '处理中...' : !prompt.trim() ? '请输入提示词' : maskPaths.length === 0 || pathIndex < 0 ? '请绘制选区' : '开始编辑'}
              </button>
            )}

            {/* 功能介绍 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">AI 局部改图功能</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleOpenHistory}
                    className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1"
                  >
                    <HistoryOutlined />
                    生成历史
                  </button>
                  {/* 模型切换 */}
                  <div
                    onClick={() => !loading && setSelectedModel(selectedModel === 'gpt-image-2' ? 'gemini-2.5-flash-image' : 'gpt-image-2')}
                    className={`relative flex items-center w-20 h-7 rounded-full transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selectedModel === 'gpt-image-2' ? 'bg-orange-500' : 'bg-purple-500'}`}
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
                  智能修改局部
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  保持风格连贯
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  多种选区工具
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  支持撤销重做
                </div>
              </div>
            </div>

            {/* 使用提示 */}
            {/*<div className="bg-orange-100 rounded-xl p-4">*/}
            {/*  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">*/}
            {/*    <span className="text-orange-500">💡</span>*/}
            {/*    使用提示*/}
            {/*  </h3>*/}
            {/*  <ul className="text-sm text-gray-600 space-y-1">*/}
            {/*    <li>• 上传图片后使用涂抹、框选或圈选工具绘制需要修改的区域</li>*/}
            {/*    <li>• 支持多次绘制，选区会自动合并；可使用撤销/重做调整</li>*/}
            {/*    <li>• 输入提示词描述修改内容，或选择预置模板快速开始</li>*/}
            {/*  </ul>*/}
            {/*</div>*/}
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
                  onClick={() => {
                    setSelectedHistory(record);
                    setHistoryDetailModalVisible(true);
                  }}
                  className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-orange-50 hover:ring-2 hover:ring-orange-400 transition-all"
                >
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
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate">{record.prompt || '局部改图'}</p>
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
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 flex-wrap">
              <span>提示词: {selectedHistory.prompt || '局部改图'}</span>
              {formatDuration(selectedHistory.duration) && (
                <span>耗时: {formatDuration(selectedHistory.duration)}</span>
              )}
              <span>时间: {formatDate(selectedHistory.createTime)}</span>
            </div>
            <button
              onClick={() => {
                if (selectedHistory.originalImageUrl) {
                  setOriginalImage(ensureHttpsUrl(selectedHistory.originalImageUrl));
                  setOriginalImageUrl(ensureHttpsUrl(selectedHistory.originalImageUrl));
                  setEditedImage(ensureHttpsUrl(selectedHistory.resultImageUrl));
                  setSliderPosition(50);
                }
                setHistoryDetailModalVisible(false);
                setHistoryModalVisible(false);
              }}
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