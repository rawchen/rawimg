import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal, Image, Pagination, Empty } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { userApi, ImageTaskRecord } from '@/api';
import demoBefore from '@/assets/image-beauty/1.jpg';
import demoAfter from '@/assets/image-beauty/2.jpg';
import { addOssThumbnailStyle } from '@/lib/utils';
import { Panda, Sparkles, Smile, Palette, Wind, CircleDot, Eye, Droplet, User, Scan, Heart } from 'lucide-react';

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
        : 'AI 智能美颜';
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

// 美颜功能按钮配置
interface BeautyOption {
  key: string;
  label: string;
  prompt: string;
  icon: typeof Panda;
}

const beautyOptions: BeautyOption[] = [
  { key: 'slim-face', label: '瘦脸', prompt: '轻微瘦脸，保持自然', icon: CircleDot },
  { key: 'whiten', label: '美白', prompt: '皮肤美白提亮，保持自然肤色', icon: Palette },
  { key: 'remove-spots', label: '去斑', prompt: '去除面部斑点痘印，使皮肤光滑', icon: Sparkles },
  { key: 'add-hair', label: '增发', prompt: '增加发量，使头发更浓密自然', icon: Wind },
  { key: 'smile', label: '笑容', prompt: '添加自然微笑，表情更生动', icon: Smile },
  { key: 'big-eyes', label: '大眼', prompt: '让眼睛更大更有神，保持自然', icon: Eye },
  { key: 'smooth-skin', label: '磨皮', prompt: '磨皮处理，使皮肤光滑细腻', icon: Droplet },
  { key: 'nose-job', label: '隆鼻', prompt: '让鼻子更挺拔立体，保持自然', icon: User },
  { key: 'slim-waist', label: '瘦腰', prompt: '腰部更纤细，身材比例更协调', icon: Scan },
  { key: 'breast-enhance', label: '丰胸', prompt: '让身材更丰满挺拔', icon: Heart },
];

// API 接口
const imageBeautyApi = {
  // 异步美颜
  beautyImageAsync: async (originalImageUrl: string, prompt: string, model: string) => {
    const params = new URLSearchParams();
    params.append('originalImageUrl', originalImageUrl);
    params.append('prompt', prompt);
    params.append('model', model);
    const response = await fetch('/api/image-beauty/beauty_async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: params,
    });
    const data = await response.json();
    if (data.code === 0) return data.data;
    throw new Error(data.msg || '请求失败');
  },

  // 查询任务结果
  getTaskResult: async (taskId: string) => {
    const response = await fetch(`/api/image-beauty/result?id=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const data = await response.json();
    if (data.code === 0) return data.data;
    throw new Error(data.msg || '请求失败');
  },

  // 获取历史记录
  getHistory: async (page: number, size: number) => {
    const response = await fetch(`/api/image-beauty/history?page=${page}&size=${size}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const data = await response.json();
    if (data.code === 0) return data.data;
    throw new Error(data.msg || '请求失败');
  },
};

export function ImageBeautyPage() {
  const { startFlash } = useTitleFlash();

  // 图片状态
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);

  // 提示词和模型
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-image-2');

  // 选中的美颜选项
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

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

    setEditedImage(null);
    setSelectedOptions([]);
    setPrompt('');
    setSliderPosition(50);

    try {
      message.info('正在上传图片...');
      const ossUrl = await userApi.uploadImageToOss(file, 'beauty-original/');
      setOriginalImageUrl(ossUrl);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setOriginalImage(dataUrl);
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

  // 切换美颜选项
  const toggleOption = (optionKey: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionKey)) {
        return prev.filter(k => k !== optionKey);
      } else {
        return [...prev, optionKey];
      }
    });
  };

  // 根据选中选项生成提示词
  useEffect(() => {
    if (selectedOptions.length === 0) {
      setPrompt('');
      return;
    }
    const prompts = selectedOptions.map(key => {
      const option = beautyOptions.find(o => o.key === key);
      return option?.prompt || '';
    }).filter(Boolean);
    setPrompt(prompts.join('，'));
  }, [selectedOptions]);

  // 提交美颜任务
  const handleSubmit = async () => {
    if (!originalImageUrl) {
      message.warning('请先上传图片');
      return;
    }

    if (!prompt.trim()) {
      message.warning('请选择美颜效果');
      return;
    }

    setLoading(true);
    setTaskSubmitTime(Date.now());
    setCurrentElapsed(0);

    try {
      message.info('正在提交任务...');
      const { taskId } = await imageBeautyApi.beautyImageAsync(originalImageUrl, prompt, selectedModel);
      message.info('任务已提交，可稍后在生成历史查看');

      // 轮询任务结果
      const pollInterval = 5000;
      const maxPolls = 120;
      let pollCount = 0;

      const poll = async () => {
        try {
          const result = await imageBeautyApi.getTaskResult(taskId);

          if (result.status === 'done' && result.imageUrl) {
            setEditedImage(result.imageUrl);
            message.success('美颜处理成功');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('done');
          } else if (result.status === 'error') {
            message.error(result.msg || '美颜处理失败');
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
    const fileName = `beauty_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.jpg`;

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
      const result = await imageBeautyApi.getHistory(page, 12);
      setHistoryRecords(result.records || []);
      setHistoryTotal(result.total || 0);
      setHistoryPage(result.current || 1);
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
      <div className="max-w-[85rem] mx-auto px-4 pt-6 md:pt-10 pb-4">
        {/* 标题 */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            AI 智能美颜
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            一键实现自然美颜效果，保留真实质感，让你的照片更加出彩
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧展示区域 */}
          <div className="lg:w-[65%] order-2 lg:order-1">
            {/* 对比图 */}
            <div
              ref={sliderRef}
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none"
              style={{ aspectRatio: '3/2' }}
            >
              {editedImage ? (
                // 完成后显示对比滑块
                <>
                  <img
                    src={displayAfterImage}
                    alt="美颜后"
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
                    美颜后
                  </div>
                </>
              ) : originalImage ? (
                // 上传后显示原图 + Loading
                <div className="relative w-full h-full">
                  <img
                    src={originalImage}
                    alt="上传图片"
                    className="w-full h-full object-contain bg-white"
                    draggable={false}
                  />
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
                    alt="美颜后"
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
                  <div className="absolute top-3 right-3 bg-pink-500 text-white text-xs px-2 py-1 rounded z-10">
                    示例
                  </div>
                </>
              )}
            </div>

            {/* 操作按钮 */}
            {originalImage && (
              <div className="flex justify-center items-center gap-6 mt-5">
                {editedImage && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:shadow-lg"
                  >
                    <DownloadOutlined />
                    <span>下载图片</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setOriginalImage(null);
                    setOriginalImageUrl(null);
                    setEditedImage(null);
                    setSelectedOptions([]);
                    setPrompt('');
                    setSliderPosition(50);
                  }}
                  className="text-gray-500 hover:text-pink-600 text-sm flex items-center gap-1"
                >
                  <CloudUploadOutlined />
                  <span>重新上传</span>
                </button>
              </div>
            )}
          </div>

          {/* 右侧控制区域 */}
          <div className="lg:w-[35%] order-1 lg:order-2 flex flex-col gap-4">
            {/* 上传框 */}
            {!originalImage && (
              <div
                className="relative flex flex-col justify-center items-center h-[140px] rounded-2xl border-2 border-dashed border-gray-300 bg-white hover:border-pink-400 hover:bg-pink-50/30 transition-colors cursor-pointer"
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
                <CloudUploadOutlined className="text-4xl text-pink-400 mb-3" />
                <span className="text-gray-600 font-medium mb-1">拖拽或选择图片</span>
                <button
                  type="button"
                  className="px-5 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium rounded-full hover:shadow-lg hover:shadow-pink-500/30 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUploadClick();
                  }}
                >
                  上传图片
                </button>
              </div>
            )}

            {/* 美颜按钮组 */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {beautyOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => toggleOption(option.key)}
                  disabled={loading}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all ${
                    selectedOptions.includes(option.key)
                      ? 'bg-pink-100 border-pink-500 text-pink-600'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-pink-300'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option.icon className="w-4 h-4" />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>

            {/* 提示词输入 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">提示词</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="选择上方美颜效果或输入自定义提示词..."
                className="w-full h-20 p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* 生成按钮 */}
            {originalImage && (
              <button
                onClick={handleSubmit}
                disabled={loading || !prompt.trim()}
                className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
                  loading || !prompt.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:shadow-lg hover:shadow-pink-500/30'
                }`}
              >
                {loading ? '处理中...' : !prompt.trim() ? '请选择美颜效果' : '开始美颜'}
              </button>
            )}

            {/* 功能介绍 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">AI 智能美颜功能</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleOpenHistory}
                    className="text-sm text-gray-500 hover:text-pink-600 flex items-center gap-1"
                  >
                    <HistoryOutlined />
                    生成历史
                  </button>
                  {/* 模型切换 */}
                  <div
                    onClick={() => !loading && setSelectedModel(selectedModel === 'gpt-image-2' ? 'gemini-2.5-flash-image' : 'gpt-image-2')}
                    className={`relative flex items-center w-20 h-7 rounded-full transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selectedModel === 'gpt-image-2' ? 'bg-pink-500' : 'bg-purple-500'}`}
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
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  自然美颜效果
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  多种效果组合
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  保留真实质感
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  支持自定义提示
                </div>
              </div>
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
                  onClick={() => {
                    setSelectedHistory(record);
                    setHistoryDetailModalVisible(true);
                  }}
                  className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-pink-50 hover:ring-2 hover:ring-pink-400 transition-all"
                >
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
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate">{record.prompt || '智能美颜'}</p>
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
              <span>提示词: {selectedHistory.prompt || '智能美颜'}</span>
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
              className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              查看此记录
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}