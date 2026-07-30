import React, { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal, Image, Pagination, Empty } from 'antd';
import {
  DownloadOutlined,
  PlusOutlined,
  CloseOutlined,
  BulbOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { imageCreateApi, ossApi, ImageTaskRecord, modelPriceApi, balanceApi, BalanceStats } from '@/api';
import previewImage from '@/assets/image-create/preview_image.jpg';
import rmbCircle from '@/assets/media/rmb-circle.svg';
import { addOssThumbnailStyle } from '@/lib/utils';

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
        : '生图';
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

  // 页面获得焦点或变为可见时停止闪烁
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

// 判断比例是否显示分辨率切换组件（所有比例都显示）
const shouldShowResolutionToggle = () => true;

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

// 根据模型和分辨率获取实际使用的模型代码
const getEffectiveModelCode = (model: string, resolution: string): string => {
  // gpt-image-2 根据分辨率返回不同价格模型（实际模型名不变，仅用于价格查询）
  if (model === 'gpt-image-2') {
    switch (resolution) {
      case '2K':
        return 'gpt-image-2-2k';
      case '4K':
        return 'gpt-image-2-4k';
      default:
        return 'gpt-image-2';
    }
  }

  // nano 模型根据分辨率调整
  if (model === 'gemini-2.5-flash-image') {
    switch (resolution) {
      case '2K':
        return 'gemini-3.1-flash-image-preview-2k';
      case '4K':
        return 'gemini-3.1-flash-image-preview-4k';
      default:
        return 'gemini-2.5-flash-image';
    }
  }

  return model;
};

interface InspirationTemplate {
  id: number;
  title: string;
  prompt: string;
  category: string;
  imageUrl: string | null;
  sortOrder: number;
  attachExampleImage?: number;
  requireUserPhoto?: number;
}

export function ImageCreatePage() {
  const { startFlash } = useTitleFlash();
  const [prompt, setPrompt] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]); // 本地预览图
  const [uploadedOssUrls, setUploadedOssUrls] = useState<string[]>([]); // OSS URL
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null); // 正在上传的图片索引
  const [selectedSize, setSelectedSize] = useState('1920x1080');
  const [selectedResolution, setSelectedResolution] = useState('1K'); // 分辨率选择
  const [selectedModel, setSelectedModel] = useState('gpt-image-2'); // 模型选择
  const [createdImage, setCreatedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [taskSubmitTime, setTaskSubmitTime] = useState<number | null>(null); // 任务提交时间戳
  const [currentElapsed, setCurrentElapsed] = useState<number>(0); // 当前耗时（秒）
  const [templates, setTemplates] = useState<InspirationTemplate[]>([]);
  const [templateTotal, setTemplateTotal] = useState(0);
  const [templatePage, setTemplatePage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [randomTemplates, setRandomTemplates] = useState<InspirationTemplate[]>([]);
  const [selectedInspiration, setSelectedInspiration] = useState<InspirationTemplate | null>(null);
  const [currentInspiration, setCurrentInspiration] = useState<InspirationTemplate | null>(null);
  const [inspirationModalVisible, setInspirationModalVisible] = useState(false);
  const [hoveredTemplate, setHoveredTemplate] = useState<InspirationTemplate | null>(null);
  const [hoverPreviewVisible, setHoverPreviewVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // 生成历史相关状态
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ImageTaskRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<ImageTaskRecord | null>(null);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);
  // 实时更新pending任务耗时
  const [, setHistoryUpdateTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef(0);

  // 价格和余额相关状态
  const [modelPrice, setModelPrice] = useState<number>(0);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);

  // 加载模型价格和余额
  useEffect(() => {
    const loadData = async () => {
      try {
        // 根据当前模型和分辨率计算实际使用的模型
        const effectiveModel = getEffectiveModelCode(selectedModel, selectedResolution);

        const [priceRes, balanceRes] = await Promise.all([
          modelPriceApi.getPrice(effectiveModel),
          balanceApi.getStats()
        ]);
        setModelPrice(priceRes.price);
        setBalanceStats(balanceRes);
      } catch (error) {
        console.error('Failed to load price or balance:', error);
      }
    };
    loadData();
  }, [selectedModel, selectedResolution]);
  useEffect(() => {
    const loadData = async () => {
      try {
        const [priceRes, balanceRes] = await Promise.all([
          modelPriceApi.getPrice(selectedModel),
          balanceApi.getStats()
        ]);
        setModelPrice(priceRes.price);
        setBalanceStats(balanceRes);
      } catch (error) {
        console.error('Failed to load price or balance:', error);
      }
    };
    loadData();
  }, [selectedModel]);

  // 加载随机模板（灵感示例滚动）
  useEffect(() => {
    const loadRandomTemplates = async () => {
      try {
        const data = await imageCreateApi.getRandomTemplates(10);
        setRandomTemplates(data);
      } catch (error) {
        console.error('Failed to load random templates:', error);
      }
    };
    loadRandomTemplates();
  }, []);

  // 滚动动画
  useEffect(() => {
    if (isPaused || randomTemplates.length === 0) return;

    const scroll = () => {
      if (scrollRef.current) {
        positionRef.current += 0.2;
        // 当滚动完一组后重置
        const maxScroll = scrollRef.current.scrollWidth / 2;
        if (positionRef.current >= maxScroll) {
          positionRef.current = 0;
        }
        scrollRef.current.scrollLeft = positionRef.current;
      }
      animationRef.current = requestAnimationFrame(scroll);
    };

    animationRef.current = requestAnimationFrame(scroll);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, randomTemplates.length]);

  // 实时更新任务耗时（每秒更新）
  useEffect(() => {
    if (!loading || !taskSubmitTime) return;

    const interval = setInterval(() => {
      setCurrentElapsed(Math.floor((Date.now() - taskSubmitTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, taskSubmitTime]);

  // 实时更新历史记录中pending任务的耗时显示
  useEffect(() => {
    const hasPending = historyRecords.some(r => r.status === 'pending');
    if (!hasPending) return;

    const interval = setInterval(() => {
      setHistoryUpdateTick(t => t + 1); // 触发重新渲染
    }, 1000);

    return () => clearInterval(interval);
  }, [historyRecords]);

  // 加载模板
  const loadTemplates = useCallback(async (page = 1) => {
    setLoadingTemplates(true);
    try {
      const [templatesData, categoriesData] = await Promise.all([
        imageCreateApi.getTemplates(selectedCategory === '全部' ? undefined : selectedCategory, page, 12),
        imageCreateApi.getCategories(),
      ]);
      setTemplates(templatesData?.records || []);
      setTemplateTotal(templatesData?.total || 0);
      setTemplatePage(templatesData?.current || 1);
      setCategories(['全部', ...(categoriesData || [])]);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedCategory]);

  // 分类切换时重新加载第一页模板
  useEffect(() => {
    if (templateModalVisible) {
      loadTemplates(1);
    }
  }, [selectedCategory, templateModalVisible, loadTemplates]);

  // 打开模板弹窗
  const handleOpenTemplates = () => {
    setTemplateModalVisible(true);
    loadTemplates();
  };

  // 处理文件上传 - 通过STS直接上传到OSS
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    if (uploadedImages.length + fileArray.length > 5) {
      message.warning('最多上传5张图片');
      return;
    }

    // 获取STS Token
    let stsToken;
    try {
      stsToken = await ossApi.getStsToken();
    } catch (error) {
      message.error('获取上传凭证失败');
      return;
    }

    // 动态加载 ali-oss
    const OSS = (await import('ali-oss')).default;

    const ossClient = new OSS({
      region: stsToken.region,
      accessKeyId: stsToken.accessKeyId,
      accessKeySecret: stsToken.accessKeySecret,
      stsToken: stsToken.securityToken,
      bucket: stsToken.bucketName,
    });

    // 逐个上传文件
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const currentIndex = uploadedImages.length + i;

      if (!file.type.startsWith('image/')) {
        message.error(`${file.name} 不是图片文件`);
        continue;
      }

      setUploadingIndex(currentIndex);

      // 本地预览
      const reader = new FileReader();
      reader.onload = async (e) => {
        const localUrl = e.target?.result as string;
        setUploadedImages(prev => [...prev, localUrl]);

        // 上传到OSS
        try {
          const ext = file.name.split('.').pop() || 'jpg';
          const fileName = `reference/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const result = await ossClient.put(fileName, file);
          const ossUrl = `${stsToken.customDomain}/${result.name}`;

          setUploadedOssUrls(prev => [...prev, ossUrl]);
        } catch (error) {
          message.error(`${file.name} 上传失败`);
          // 移除失败的预览图
          setUploadedImages(prev => prev.slice(0, -1));
        } finally {
          setUploadingIndex(null);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [uploadedImages.length]);

  // 移除图片
  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setUploadedOssUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 提交创作
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      message.warning('请输入描述内容');
      return;
    }

    // 检测是否存在未替换的模板变量 {{xxx}}
    const templateVarRegex = /\{\{[^}]+\}\}/g;
    const match = templateVarRegex.exec(prompt);
    if (match) {
      const varText = match[0]; // 如 {{xxx}}
      const varIndex = match.index; // 变量在文本中的位置

      // 显示提示，提取变量名（去掉{{和}}）
      const varName = varText.slice(2, -2);
      message.warning(`请替换模板变量：{{${varName}}}`);

      const textarea = promptTextareaRef.current;
      if (textarea) {
        // 滚动页面到textarea
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        textarea.focus();

        // 设置选中
        textarea.selectionStart = varIndex;
        textarea.selectionEnd = varIndex + varText.length;

        // 使用 scrollHeight 比例计算
        requestAnimationFrame(() => {
          // 计算变量之前文本的比例
          const ratio = varIndex / prompt.length;
          // 滚动到对应比例位置，减去一些偏移让变量显示在可见区域
          const targetScroll = Math.max(0, ratio * textarea.scrollHeight - textarea.clientHeight * 0.3);
          textarea.scrollTop = targetScroll;
        });
      }
      return;
    }

    setLoading(true);
    setTaskSubmitTime(Date.now()); // 记录任务提交时间
    setCurrentElapsed(0); // 重置耗时计数
    try {
      // 构建参考图URL JSON数组
      const referenceUrls = uploadedOssUrls.length > 0 ? JSON.stringify(uploadedOssUrls) : undefined;

      // 使用异步接口（只传递URL，不传递文件）
      const actualSize = getActualSize(selectedSize, selectedResolution);
      const effectiveModel = selectedModel === 'gpt-image-2' ? undefined : selectedModel;
      const { taskId } = await imageCreateApi.createImageAsyncWithUrls(referenceUrls, prompt, actualSize, effectiveModel);
      message.info('任务已提交，可稍后在生成历史查看');

      // 轮询任务结果
      const pollInterval = 5000; // 5秒轮询一次
      const maxPolls = 120; // 最多轮询120次（10分钟）
      let pollCount = 0;

      const poll = async () => {
        try {
          const result = await imageCreateApi.getTaskResult(taskId);

          if (result.status === 'done') {
            setCreatedImage(result.imageUrl || null);
            message.success('图像创作成功');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('done'); // 开始标题闪烁（成功）
            return;
          } else if (result.status === 'error') {
            message.error(result.msg || '图像创作失败');
            setLoading(false);
            setTaskSubmitTime(null);
            startFlash('error'); // 开始标题闪烁（失败）
            return;
          } else if (result.status === 'not_found') {
            message.error('任务不存在或已过期');
            setLoading(false);
            setTaskSubmitTime(null);
            return;
          }

          // status === 'pending'，继续轮询
          pollCount++;
          if (pollCount < maxPolls) {
            setTimeout(poll, pollInterval);
          } else {
            message.error('任务处理超时，请稍后重试');
            setLoading(false);
            setTaskSubmitTime(null);
          }
        } catch (error: any) {
          message.error(error.message || '查询任务状态失败');
          setLoading(false);
          setTaskSubmitTime(null);
        }
      };

      // 开始轮询
      setTimeout(poll, 2000); // 2秒后开始第一次轮询
    } catch (error: any) {
      message.error(error.message || '图像创作失败');
      setLoading(false);
      setTaskSubmitTime(null);
    }
  };

  // 下载图片
  const handleDownload = async () => {
    if (!createdImage) return;

    const now = new Date();
    const fileName = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}_${String(Math.floor(Math.random() * 100)).padStart(2, '0')}.jpg`;

    try {
      const response = await fetch(createdImage);
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
      a.href = createdImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 重置
  const handleReset = () => {
    setPrompt('');
    setUploadedImages([]);
    setUploadedOssUrls([]);
    setCreatedImage(null);
    setCurrentInspiration(null);
    setUploadingIndex(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 选择模板
  const handleSelectTemplate = (template: InspirationTemplate) => {
    setPrompt(template.prompt);
    setTemplateModalVisible(false);
  };

  // 点击灵感示例项
  const handleInspirationClick = (template: InspirationTemplate) => {
    setSelectedInspiration(template);
    setInspirationModalVisible(true);
  };

  // 使用此灵感
  const handleUseInspiration = (template: InspirationTemplate) => {
    setPrompt(template.prompt);
    setCurrentInspiration(template);
    // 只有当 attachExampleImage 为 1 且有图片时才添加示例图片URL
    if (template.attachExampleImage === 1 && template.imageUrl) {
      // 清空现有图片，添加示例图片URL
      setUploadedImages([template.imageUrl]);
      setUploadedOssUrls([template.imageUrl]); // 直接使用imageUrl作为OSS URL
    }
    setInspirationModalVisible(false);
  };

  // 确保URL有https前缀
  const ensureHttpsUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https://' + url;
  };

  // 格式化耗时显示（毫秒）
  const formatDuration = (durationMs: number | null | undefined): string | null => {
    if (!durationMs) return null;
    return formatDurationFromSeconds(durationMs / 1000);
  };

  // 格式化耗时显示（秒）
  const formatDurationFromSeconds = (seconds: number): string => {
    if (seconds < 60) {
      // 60秒内：xs（整数）
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      // 1分钟到60分钟：xmxs
      const minutes = Math.floor(seconds / 60);
      const remainSeconds = Math.floor(seconds % 60);
      return `${minutes}m${remainSeconds}s`;
    } else {
      // 60分钟以外：xhxm
      const hours = Math.floor(seconds / 3600);
      const remainMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h${remainMinutes}m`;
    }
  };

  // 计算pending任务的实时耗时
  const getPendingElapsed = (createTime: string): string => {
    const elapsedMs = Date.now() - new Date(createTime).getTime();
    return formatDurationFromSeconds(elapsedMs / 1000);
  };

  // 格式化日期显示
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const dateYear = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (dateYear === currentYear) {
      // 当前年份：MM-dd
      return `${month}/${day}`;
    } else {
      // 其他年份：yyyy-MM-dd
      return `${dateYear}/${month}/${day}`;
    }
  };

  // 加载生成历史
  const loadHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const result = await imageCreateApi.getHistory(page, 12, 'create');
      setHistoryRecords(result.records);
      setHistoryTotal(result.total);
      setHistoryPage(result.current);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // 打开历史弹窗
  const handleOpenHistory = () => {
    setHistoryModalVisible(true);
    loadHistory(1);
  };

  // 点击历史记录项
  const handleHistoryClick = (record: ImageTaskRecord) => {
    setSelectedHistory(record);
    setHistoryDetailModalVisible(true);
  };

  // 使用历史记录的提示词
  const handleUseHistoryPrompt = (record: ImageTaskRecord) => {
    setPrompt(record.prompt);
    setCreatedImage(ensureHttpsUrl(record.resultImageUrl) || null);
    setHistoryDetailModalVisible(false);
    setHistoryModalVisible(false);
  };

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* 标题区域 */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            AI 图像创作
          </h1>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            输入描述文字或上传参考图，AI 为你创作独一无二的图像
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* 左侧结果展示区域 */}
          <div className="lg:w-[56%] order-2 lg:order-1">
            {/* 生成的图片展示 */}
            <div
              className="relative w-full rounded-2xl overflow-hidden bg-gray-200 shadow-lg"
              style={{ aspectRatio: '16/9' }}
            >
              <Image
                src={createdImage || previewImage}
                alt="创作结果"
                className="w-full h-full object-contain"
                rootClassName="w-full h-full"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                preview={{
                  mask: <div className="text-white">点击预览</div>,
                }}
              />

              {/* 示例标签 */}
              {!createdImage && (
                <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                  示例
                </div>
              )}

              {/* Loading提示 */}
              {loading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                  <div className="bg-white rounded-xl px-6 py-4 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Spin size="default" />
                      <span className="text-gray-700">任务已提交，可稍后在生成历史查看 {formatDurationFromSeconds(currentElapsed)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/*/!* 操作按钮 *!/*/}
            {/*{createdImage && (*/}
            {/*  <div className="flex justify-center gap-3 mt-5">*/}
            {/*    <button*/}
            {/*      onClick={handleReset}*/}
            {/*      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"*/}
            {/*    >*/}
            {/*      <span>重新创作</span>*/}
            {/*    </button>*/}
            {/*    <button*/}
            {/*      onClick={handleDownload}*/}
            {/*      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all"*/}
            {/*    >*/}
            {/*      <DownloadOutlined />*/}
            {/*      <span>下载图片</span>*/}
            {/*    </button>*/}
            {/*  </div>*/}
            {/*)}*/}

            {/* 尺寸选择 */}
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                {sizeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedSize(option.value);
                      // 如果切换到不支持高清的尺寸，重置分辨率为1K
                      if (!isHdSupported(option.value)) {
                        setSelectedResolution('1K');
                      }
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 transition-all ${
                      selectedSize === option.value
                        ? 'bg-orange-100 border-orange-500 text-orange-600'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <span
                      className={`rounded-sm ${
                        selectedSize === option.value
                          ? 'bg-orange-500'
                          : 'bg-gray-300'
                      }`}
                      style={{
                        width: option.displayWidth,
                        height: option.displayHeight,
                      }}
                    />
                    <span className="text-sm">{option.label}</span>
                    <span className="text-xs text-gray-800">{option.desc}</span>
                  </button>
                ))}

                {/* 分辨率切换 */}
                {shouldShowResolutionToggle() && (
                  <div className={`relative flex items-center rounded-lg p-1 ml-1 ${
                    isHdSupported(selectedSize) ? 'bg-white' : 'bg-white'
                  }`}>
                    {/* 滑动指示器 */}
                    <div
                      className={`absolute top-1 bottom-1 rounded transition-all duration-200 ${
                        isHdSupported(selectedSize) ? 'bg-orange-500' : 'bg-gray-300'
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
                )}
              </div>
            </div>

            {/* 灵感示例滚动 */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <BulbOutlined className="text-orange-500" />
                <h3 className="text-sm font-medium text-gray-700">灵感示例</h3>
                <span className="text-xs text-gray-400">点开看看示例prompt，适合直接套用或改写</span>
              </div>
              <div className="relative">
                {/* 左侧阴影 */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#F5F7FA] to-transparent z-10 pointer-events-none" />
                {/* 右侧阴影 */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#F5F7FA] to-transparent z-10 pointer-events-none" />
                <div
                  ref={scrollRef}
                  className="flex gap-3 overflow-hidden"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                {/* 复制两份实现无缝滚动 */}
                {[...randomTemplates, ...randomTemplates].map((template, index) => (
                  <div
                    key={`${template.id}-${index}`}
                    onClick={() => handleInspirationClick(template)}
                    onMouseEnter={() => {
                      if (template.imageUrl) {
                        setHoveredTemplate(template);
                        setHoverPreviewVisible(true);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoverPreviewVisible(false);
                      setHoveredTemplate(null);
                    }}
                    className="flex-shrink-0 w-20 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all"
                  >
                    <div className="w-20 h-20 relative">
                      {template.imageUrl ? (
                        <img
                          src={template.imageUrl}
                          alt={template.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                          <span className="text-2xl">✨</span>
                        </div>
                      )}
                    </div>
                    <div className="h-6 bg-white flex items-center justify-center">
                      <span className="text-xs text-gray-600 truncate px-1" title={template.title}>
                        {template.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>

          {/* 右侧输入区域 */}
          <div className="lg:w-[41%] order-1 lg:order-2 flex flex-col gap-4">
            {/* 描述输入 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">描述画面</h3>
                <div className="flex items-center gap-3">
                  {/* 操作按钮 */}
                  {createdImage && (
                    <button
                      onClick={handleReset}
                      className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1"
                    >
                      <ClearOutlined />
                      清除
                    </button>
                  )}
                  {createdImage && (
                    <button
                      onClick={handleDownload}
                      className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                    >
                      <DownloadOutlined/>
                      下载图片
                    </button>
                  )}

                  <button
                    onClick={handleOpenHistory}
                    className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1"
                  >
                    <HistoryOutlined/>
                    生成历史
                  </button>
                  <button
                    onClick={handleOpenTemplates}
                    className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                  >
                    <BulbOutlined/>
                    灵感示例
                  </button>
                  {/* 模型切换开关 */}
                  <div className="ml-auto flex items-center gap-2">
                    {/*<span className="text-xs text-gray-500">模型:</span>*/}
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
                      }`}/>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">先说主体、场景、时间氛围，再补充想要的细节和风格</p>
              <textarea
                ref={promptTextareaRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="例如：一位穿着白色连衣裙的少女站在樱花树下，阳光透过花瓣洒下斑驳的光影，梦幻般的氛围..."
                className="w-full h-32 p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-400/50 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50"
              />
            </div>

            {/* 参考图上传 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">参考图（可选）</h3>
                {currentInspiration?.requireUserPhoto === 1 && (
                  <span className="text-xs text-orange-500 font-medium animate-pulse">
                    该模板需上传真实照片
                  </span>
                )}
                <span className="text-xs text-gray-400 ml-auto">最多上传5张</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">帮助模型理解你想要的风格和构图</p>

              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
                  >
                    <img src={img} alt={`参考图${index + 1}`} className="w-full h-full object-cover" />
                    {/* 上传中提示 */}
                    {uploadingIndex === index && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <LoadingOutlined className="text-white text-lg" />
                      </div>
                    )}
                    {/* 删除按钮（上传完成后显示） */}
                    {uploadingIndex !== index && (
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                      >
                        <CloseOutlined className="text-xs" />
                      </button>
                    )}
                  </div>
                ))}

                {uploadedImages.length < 5 && uploadingIndex === null && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleFileSelect(e.target.files)}
                    />
                    <PlusOutlined className="text-2xl text-gray-400" />
                  </label>
                )}
              </div>
            </div>

            {/* 创作按钮 */}
            <button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
              className={`w-full py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
                loading || !prompt.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
              }`}
            >
              {loading ? '处理中...' : (
                <>
                  <span>开始创作</span>
                  <span className="flex items-center gap-1">
                    {modelPrice.toFixed(2)}
                    <img src={rmbCircle} alt="费用" className="w-4 h-4" />
                  </span>
                </>
              )}
            </button>

            {/* 提示信息 */}
            <div className="bg-orange-100 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <span className="text-orange-500">💡</span>
                使用提示
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 描述越详细，生成效果越好，可上传参考图帮助AI理解风格</li>
                <li>• 任务提交后等待处理时间约30秒-2分钟，页面可刷新</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 灵感示例弹窗 */}
      <Modal
        title="灵感示例"
        open={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <div className="relative">
          {/* 分类选择 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 加载指示器 - 覆盖在内容上方 */}
          {loadingTemplates && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <Spin />
            </div>
          )}

          {/* 模板列表 */}
          {(!templates || templates.length === 0) && !loadingTemplates ? (
            <div className="text-center py-8 text-gray-400">
              暂无模板数据
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {templates && templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedInspiration(template);
                      setInspirationModalVisible(true);
                    }}
                    className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-orange-50 hover:ring-2 hover:ring-orange-400 transition-all"
                  >
                    {/* 图片 */}
                    <div className="relative w-full h-32">
                      {template.imageUrl ? (
                        <img
                          src={template.imageUrl}
                          alt={template.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                          <span className="text-2xl">✨</span>
                        </div>
                      )}
                      {/* 分类标签 */}
                      <div className="absolute top-2 right-2">
                        <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded shadow-sm">
                          {template.category}
                        </span>
                      </div>
                    </div>
                    {/* 内容 */}
                    <div className="p-3">
                      <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">{template.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{template.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {templateTotal > 12 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    current={templatePage}
                    total={templateTotal}
                    pageSize={12}
                    onChange={(page) => loadTemplates(page)}
                    showSizeChanger={false}
                    simple
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* 灵感详情弹窗 */}
      <Modal
        title={selectedInspiration?.title}
        open={inspirationModalVisible}
        onCancel={() => setInspirationModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedInspiration && (
          <div>
            {/* 图片示例 */}
            {selectedInspiration.imageUrl && (
              <div className="flex justify-center mb-4">
                <Image
                  src={selectedInspiration.imageUrl}
                  alt={selectedInspiration.title}
                  className="rounded-lg"
                  style={{ maxHeight: 256, objectFit: 'contain' }}
                  preview={{
                    mask: <div className="text-white">点击预览大图</div>,
                  }}
                />
              </div>
            )}

            {/* 提示词 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">提示词</h4>
              <div className="max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-600">{selectedInspiration.prompt}</p>
              </div>
            </div>

            {/* 分类标签 */}
            <div className="mb-4">
              <span className="inline-block bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm">
                {selectedInspiration.category}
              </span>
            </div>

            {/* 使用按钮 */}
            <button
              onClick={() => handleUseInspiration(selectedInspiration)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              使用此灵感
            </button>
          </div>
        )}
      </Modal>

      {/* 悬停预览浮层 */}
      {hoverPreviewVisible && hoveredTemplate?.imageUrl && (
        <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 max-w-xs">
            <img
              src={hoveredTemplate.imageUrl}
              alt={hoveredTemplate.title}
              className="w-full max-h-64 object-contain"
            />
            <div className="p-2 bg-white">
              <p className="text-sm font-medium text-gray-900 truncate">{hoveredTemplate.title}</p>
              <p className="text-xs text-gray-500">{hoveredTemplate.category}</p>
            </div>
          </div>
        </div>
      )}

      {/* 生成历史弹窗 */}
      <Modal
        title="生成历史"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={800}
      >
        <div className="relative">
          {/* 加载指示器 - 覆盖在内容上方 */}
          {historyLoading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <Spin />
            </div>
          )}

          {historyRecords.length === 0 && !historyLoading ? (
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
                      {/* 参考图缩略图 */}
                      {record.referenceImageUrls && (
                        <div className="absolute bottom-2 right-2 w-12 h-12 rounded border border-white shadow-sm overflow-hidden">
                          <img
                            src={addOssThumbnailStyle(ensureHttpsUrl(JSON.parse(record.referenceImageUrls)[0])) || ''}
                            alt="参考图"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    {/* 提示词 */}
                    <div className="p-2">
                      <p className="text-xs text-gray-600 line-clamp-1">{record.prompt}</p>
                      {/* 日期和状态 */}
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                          <ClockCircleOutlined className="text-xs" />
                          <span>{formatDate(record.createTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 耗时 */}
                          {record.status === 'pending' ? (
                            <span className="text-gray-500">{getPendingElapsed(record.createTime)}</span>
                          ) : (
                            formatDuration(record.duration) && (
                              <span className="text-gray-500">{formatDuration(record.duration)}</span>
                            )
                          )}
                          {/* 状态标签 */}
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
                    simple
                  />
                </div>
              )}
            </div>
          )}
        </div>
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
                {/* 参考图 */}
                {selectedHistory.referenceImageUrls && (
                  <div className="absolute bottom-4 right-4 w-24 h-24 rounded-lg border-2 border-white shadow-lg overflow-hidden">
                    <Image
                      src={ensureHttpsUrl(JSON.parse(selectedHistory.referenceImageUrls)[0]) || ''}
                      alt="参考图"
                      className="w-full h-full object-cover"
                      preview={{
                        mask: <div className="text-white text-xs">预览</div>,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 提示词 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">提示词</h4>
              <div className="max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-600">{selectedHistory.prompt}</p>
              </div>
            </div>

            {/* 其他信息 */}
            <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
              <span>尺寸: {selectedHistory.size}</span>
              <span>类型: {selectedHistory.taskType === 'create' ? '创作' : '增强'}</span>
              {formatDuration(selectedHistory.duration) && (
                <span>耗时: {formatDuration(selectedHistory.duration)}</span>
              )}
              <span>时间: {formatDate(selectedHistory.createTime)}</span>
            </div>

            {/* 使用按钮 */}
            <button
              onClick={() => handleUseHistoryPrompt(selectedHistory)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              使用此提示词
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
