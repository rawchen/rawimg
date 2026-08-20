import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal, Image, Pagination, Empty } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  CloseOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { userApi, ImageTaskRecord, imageClothesApi, modelPriceApi, balanceApi, BalanceStats } from '@/api';
import demoImage from '@/assets/image-clothes/1.jpg';
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
        : 'AI 智能换装';
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
  { value: '1920x1080', label: '16:9', desc: '横屏', displayWidth: 20, displayHeight: 11 },
  { value: '1080x1920', label: '9:16', desc: '竖屏', displayWidth: 11, displayHeight: 20 },
];

// 分辨率选项
const resolutionOptions = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

// 判断比例是否支持高清分辨率切换
const isHdSupported = (size: string) => {
  return size === '1920x1080' || size === '1080x1920';
};

// 根据比例和分辨率计算实际size
const getActualSize = (baseSize: string, resolution: string) => {
  if (!isHdSupported(baseSize)) return baseSize;

  const isLandscape = baseSize === '1920x1080';

  switch (resolution) {
    case '1K':
      return baseSize;
    case '2K':
      return isLandscape ? '2560x1440' : '1440x2560';
    case '4K':
      return isLandscape ? '3840x2160' : '2160x3840';
    default:
      return baseSize;
  }
};

// 根据分辨率计算实际的模型代码
const getEffectiveModelCode = (model: string, resolution: string): string => {
  if (resolution === '1K') return model;
  // 2K 和 4K 使用带后缀的模型代码
  return `${model}-${resolution.toLowerCase()}`;
};

export function ImageClothesPage() {
  const { startFlash } = useTitleFlash();
  const { isAuthenticated } = useAuth();

  // 人物图片状态
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personImageUrl, setPersonImageUrl] = useState<string | null>(null);

  // 衣服图片状态（多张）
  const [clothesImages, setClothesImages] = useState<string[]>([]); // 本地预览
  const [clothesImageUrls, setClothesImageUrls] = useState<string[]>([]); // OSS URL
  const [uploadingClothesIndex, setUploadingClothesIndex] = useState<number | null>(null);

  // 结果图片
  const [resultImage, setResultImage] = useState<string | null>(null);

  // 尺寸和模型
  const [selectedSize, setSelectedSize] = useState('1920x1080');
  const [selectedResolution, setSelectedResolution] = useState('1K');
  const [selectedModel, setSelectedModel] = useState('gpt-image-2');

  // 价格和余额相关状态
  const [modelPrice, setModelPrice] = useState<number>(0);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);

  // 登录弹窗状态
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 任务状态
  const [loading, setLoading] = useState(false);
  const [taskSubmitTime, setTaskSubmitTime] = useState<number | null>(null);
  const [currentElapsed, setCurrentElapsed] = useState(0);

  // 加载模型价格和余额
  useEffect(() => {
    const loadData = async () => {
      try {
        // 根据分辨率计算实际的模型代码
        const effectiveModel = getEffectiveModelCode(selectedModel, selectedResolution);

        // 获取价格（无需登录）
        const priceRes = await modelPriceApi.getPrice(effectiveModel);
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
  }, [selectedModel, selectedResolution, isAuthenticated]);

  // 历史记录
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ImageTaskRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<ImageTaskRecord | null>(null);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);
  const [, setHistoryUpdateTick] = useState(0);

  const personInputRef = useRef<HTMLInputElement>(null);
  const clothesInputRef = useRef<HTMLInputElement>(null);

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

  // 上传人物图片
  const handlePersonUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('请上传图片文件');
      return;
    }

    try {
      message.info('正在上传人物图片...');
      const ossUrl = await userApi.uploadImageToOss(file, 'clothes-original/');
      setPersonImageUrl(ossUrl);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPersonImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      message.success('人物图片上传成功');
    } catch (error: any) {
      message.error('上传失败: ' + error.message);
    }
  }, []);

  // 上传衣服图片
  const handleClothesUpload = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    if (clothesImages.length + fileArray.length > 5) {
      message.warning('最多上传5张衣服图片');
      return;
    }

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith('image/')) {
        message.error(`${file.name} 不是图片文件`);
        continue;
      }

      const currentIndex = clothesImages.length + i;
      setUploadingClothesIndex(currentIndex);

      try {
        message.info(`正在上传衣服图片 ${i + 1}/${fileArray.length}...`);
        const ossUrl = await userApi.uploadImageToOss(file, 'clothes-original/');

        // 本地预览
        const reader = new FileReader();
        reader.onload = (e) => {
          const localUrl = e.target?.result as string;
          setClothesImages(prev => [...prev, localUrl]);
        };
        reader.readAsDataURL(file);

        setClothesImageUrls(prev => [...prev, ossUrl]);
        message.success(`衣服图片 ${i + 1} 上传成功`);
      } catch (error: any) {
        message.error(`上传失败: ${error.message}`);
      } finally {
        setUploadingClothesIndex(null);
      }
    }
  }, [clothesImages.length]);

  // 移除衣服图片
  const handleRemoveClothes = (index: number) => {
    setClothesImages(prev => prev.filter((_, i) => i !== index));
    setClothesImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 提交换装任务
  const handleSubmit = async () => {
    if (!personImageUrl) {
      message.warning('请先上传人物图片');
      return;
    }

    if (clothesImageUrls.length === 0) {
      message.warning('请至少上传一张衣服图片');
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
      const actualSize = getActualSize(selectedSize, selectedResolution);
      const prompt = '为人物换上提供的服装，保持人物原有姿势和背景，使服装自然贴合人物身形。';

      message.info('正在提交任务...');
      const { taskId } = await imageClothesApi.clothesImageAsync(
        personImageUrl,
        clothesImageUrls,
        prompt,
        actualSize,
        selectedModel
      );
      message.info('任务已提交，可稍后在生成历史查看');

      // 轮询任务结果
      const pollInterval = 5000;
      const maxPolls = 120;
      let pollCount = 0;

      const poll = async () => {
        try {
          const result = await imageClothesApi.getTaskResult(taskId);

          if (result.status === 'done' && result.imageUrl) {
            setResultImage(result.imageUrl);
            message.success('换装成功');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('done');
          } else if (result.status === 'error') {
            message.error(result.msg || '换装失败');
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
    if (!resultImage) return;

    const now = new Date();
    const fileName = `clothes_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.jpg`;

    try {
      const response = await fetch(resultImage);
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
      a.href = resultImage;
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
      const result = await imageClothesApi.getHistory(page, 12);
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

  // 显示的图片
  const displayAfterImage = resultImage || (personImage ? personImage : demoImage);

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-[85rem] mx-auto px-4 py-6 md:py-8">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            AI 智能换装
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            一键换装，秒变时尚达人
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧展示区域 */}
          <div className="lg:w-[70%]">
            {/* 结果图展示 */}
            <div
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg select-none"
              style={{ aspectRatio: '16/9' }}
            >
              {resultImage ? (
                // 显示结果图
                <>
                  <img
                    src={resultImage}
                    alt="换装结果"
                    className="w-full h-full object-contain bg-white"
                    draggable={false}
                  />
                  <div className="absolute top-3 right-3 bg-purple-500 text-white text-xs px-2 py-1 rounded z-10">
                    换装结果
                  </div>
                </>
              ) : personImage ? (
                // 显示上传的人物图 + Loading
                <div className="relative w-full h-full">
                  <img
                    src={personImage}
                    alt="人物图"
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
                    alt="示例"
                    className="absolute inset-0 w-full h-full object-contain bg-white"
                    draggable={false}
                  />
                  <div className="absolute top-3 right-3 bg-purple-500 text-white text-xs px-2 py-1 rounded z-10">
                    示例
                  </div>
                </>
              )}
            </div>

            {/* 尺寸选择 */}
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                {sizeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedSize(option.value);
                      if (!isHdSupported(option.value)) {
                        setSelectedResolution('1K');
                      }
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 transition-all ${
                      selectedSize === option.value
                        ? 'bg-purple-100 border-purple-500 text-purple-600'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <span
                      className={`rounded-sm ${
                        selectedSize === option.value
                          ? 'bg-purple-500'
                          : 'bg-gray-300'
                      }`}
                      style={{
                        width: option.displayWidth,
                        height: option.displayHeight,
                      }}
                    />
                    <span className="text-sm">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.desc}</span>
                  </button>
                ))}

                {/* 分辨率切换 */}
                <div className="relative flex items-center rounded-lg p-1 ml-1 bg-white border-2 border-gray-200">
                  <div
                    className={`absolute top-1 bottom-1 rounded transition-all duration-200 ${
                      isHdSupported(selectedSize) ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                    style={{
                      width: 'calc(33.333% - 4px)',
                      left: selectedResolution === '1K' ? '4px' : selectedResolution === '2K' ? 'calc(33.333% + 2px)' : 'calc(66.666% + 0px)',
                    }}
                  />
                  {['1K', '2K', '4K'].map(res => (
                    <button
                      key={res}
                      onClick={() => {
                        if (isHdSupported(selectedSize)) {
                          setSelectedResolution(res);
                        }
                      }}
                      disabled={!isHdSupported(selectedSize)}
                      className={`relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                        isHdSupported(selectedSize)
                          ? selectedResolution === res
                            ? 'text-white'
                            : 'text-gray-600 hover:text-gray-900'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            {resultImage && (
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => {
                    setPersonImage(null);
                    setPersonImageUrl(null);
                    setClothesImages([]);
                    setClothesImageUrls([]);
                    setResultImage(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <CloudUploadOutlined />
                  <span>重新上传</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <DownloadOutlined />
                  <span>下载图片</span>
                </button>
              </div>
            )}
          </div>

          {/* 右侧控制区域 */}
          <div className="lg:w-[30%] flex flex-col gap-4">
            {/* 上传组件 - 人物图片 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">人物图片</h3>
              <div
                className="relative h-[120px] rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer overflow-hidden"
                onClick={() => personInputRef.current?.click()}
              >
                <input
                  ref={personInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePersonUpload(file);
                    e.target.value = '';
                  }}
                />
                {personImage ? (
                  <img
                    src={personImage}
                    alt="人物图"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <CloudUploadOutlined className="text-3xl text-purple-400 mb-2" />
                    <span className="text-gray-500 text-sm">上传真人照片</span>
                  </div>
                )}
              </div>
            </div>

            {/* 上传组件 - 衣服图片（多张叠加） */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">服装图片</h3>
                <span className="text-xs text-gray-400">最多5张</span>
              </div>
              <div
                className="relative h-[120px] rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors cursor-pointer overflow-hidden"
                onClick={() => clothesImageUrls.length < 5 && clothesInputRef.current?.click()}
              >
                <input
                  ref={clothesInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  multiple
                  className="hidden"
                  onChange={(e) => handleClothesUpload(e.target.files)}
                />
                {clothesImages.length > 0 ? (
                  <div className="relative w-full h-full flex items-center justify-center p-2">
                    {/* 叠加显示 */}
                    {clothesImages.map((img, index) => (
                      <div
                        key={index}
                        className="absolute w-20 h-20 rounded-lg overflow-hidden border-2 border-white shadow-md transition-transform hover:scale-110 hover:z-20"
                        style={{
                          left: `${20 + index * 15}%`,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: clothesImages.length - index,
                        }}
                      >
                        <img src={img} alt={`服装${index + 1}`} className="w-full h-full object-cover" />
                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveClothes(index);
                          }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                        >
                          <CloseOutlined className="text-xs" style={{ fontSize: '8px' }} />
                        </button>
                      </div>
                    ))}
                    {/* 上传中提示 */}
                    {uploadingClothesIndex !== null && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30">
                        <LoadingOutlined className="text-white text-2xl" />
                      </div>
                    )}
                    {/* 继续上传按钮 */}
                    {clothesImages.length < 5 && uploadingClothesIndex === null && (
                      <div
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          clothesInputRef.current?.click();
                        }}
                      >
                        <PlusOutlined className="text-sm" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <CloudUploadOutlined className="text-3xl text-purple-400 mb-2" />
                    <span className="text-gray-500 text-sm">上传服装样图</span>
                  </div>
                )}
              </div>
            </div>

            {/* 一键换装按钮 */}
            <button
              onClick={handleSubmit}
              disabled={loading || !personImageUrl || clothesImageUrls.length === 0}
              className={`w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
                loading || !personImageUrl || clothesImageUrls.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/30'
              }`}
            >
              {loading ? '处理中...' : !personImageUrl ? '请上传人物图片' : clothesImageUrls.length === 0 ? '请上传服装图片' : (
                <>
                  <span>一键换装</span>
                  <span className="flex items-center gap-1">
                    {modelPrice.toFixed(2)}
                    <img
                      src={rmbCircle}
                      alt="费用"
                      className={`w-4 h-4 ${loading || !personImageUrl || clothesImageUrls.length === 0 ? 'grayscale opacity-50' : ''}`}
                    />
                  </span>
                </>
              )}
            </button>

            {/* 功能介绍 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">AI 智能换装功能</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleOpenHistory}
                    className="text-sm text-gray-500 hover:text-purple-600 flex items-center gap-1"
                  >
                    <HistoryOutlined />
                    生成历史
                  </button>
                  {/* 模型切换 */}
                  <div
                    onClick={() => !loading && setSelectedModel(selectedModel === 'gpt-image-2' ? 'gemini-2.5-flash-image' : 'gpt-image-2')}
                    className={`relative flex items-center w-[68px] h-7 rounded-full transition-colors ${
                      loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selectedModel === 'gpt-image-2' ? 'bg-purple-500' : 'bg-indigo-500'}`}
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
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  智能服装匹配
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  多件服装组合
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  自然贴合身形
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  保持原有姿态
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
                  className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-purple-50 hover:ring-2 hover:ring-purple-400 transition-all"
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
                    <p className="text-xs text-gray-600 truncate">{record.prompt || '智能换装'}</p>
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
              <span>提示词: {selectedHistory.prompt || '智能换装'}</span>
              {formatDuration(selectedHistory.duration) && (
                <span>耗时: {formatDuration(selectedHistory.duration)}</span>
              )}
              <span>时间: {formatDate(selectedHistory.createTime)}</span>
            </div>
            <button
              onClick={() => {
                if (selectedHistory.originalImageUrl) {
                  setPersonImage(ensureHttpsUrl(selectedHistory.originalImageUrl));
                  setPersonImageUrl(ensureHttpsUrl(selectedHistory.originalImageUrl));
                  setResultImage(ensureHttpsUrl(selectedHistory.resultImageUrl));
                }
                setHistoryDetailModalVisible(false);
                setHistoryModalVisible(false);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
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
