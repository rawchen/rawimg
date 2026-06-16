import { useState, useRef, useCallback, useEffect } from 'react';
import { message, Spin, Modal } from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  PlusOutlined,
  CloseOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { imageCreateApi } from '@/api';
import previewImage from '@/assets/image-create/preview_image.jpg';

// 图片尺寸选项
const sizeOptions = [
  { value: '1024x1024', label: '1:1', desc: '正方形', displayWidth: 16, displayHeight: 16 },
  { value: '1536x1024', label: '3:2', desc: '横屏', displayWidth: 18, displayHeight: 12 },
  { value: '1024x1536', label: '2:3', desc: '竖屏', displayWidth: 12, displayHeight: 18 },
  { value: '1920x1080', label: '16:9', desc: '横屏', displayWidth: 20, displayHeight: 11 },
  { value: '1080x1920', label: '9:16', desc: '竖屏', displayWidth: 11, displayHeight: 20 },
];

interface InspirationTemplate {
  id: number;
  title: string;
  prompt: string;
  category: string;
  imageUrl: string | null;
  sortOrder: number;
}

export function ImageCreatePage() {
  const [prompt, setPrompt] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedSize, setSelectedSize] = useState('1920x1080');
  const [createdImage, setCreatedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<InspirationTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [randomTemplates, setRandomTemplates] = useState<InspirationTemplate[]>([]);
  const [selectedInspiration, setSelectedInspiration] = useState<InspirationTemplate | null>(null);
  const [inspirationModalVisible, setInspirationModalVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef(0);

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

  // 加载模板
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const [templatesData, categoriesData] = await Promise.all([
        imageCreateApi.getTemplates(selectedCategory === '全部' ? undefined : selectedCategory),
        imageCreateApi.getCategories(),
      ]);
      setTemplates(templatesData);
      setCategories(['全部', ...categoriesData]);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedCategory]);

  // 打开模板弹窗
  const handleOpenTemplates = () => {
    setTemplateModalVisible(true);
    loadTemplates();
  };

  // 处理文件上传
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const newImages: string[] = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        message.error(`${file.name} 不是图片文件`);
        return;
      }

      if (uploadedFiles.length + newFiles.length >= 5) {
        message.warning('最多上传5张图片');
        return;
      }

      newFiles.push(file);
      const reader = new FileReader();
      reader.onload = e => {
        newImages.push(e.target?.result as string);
        if (newImages.length === newFiles.length) {
          setUploadedFiles(prev => [...prev, ...newFiles]);
          setUploadedImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [uploadedFiles.length]);

  // 移除图片
  const handleRemoveImage = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
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
    try {
      const result = await imageCreateApi.createImage(uploadedFiles, prompt, selectedSize);
      setCreatedImage(result.createdUrl);
      message.success('图像创作成功');
    } catch (error: any) {
      message.error(error.message || '图像创作失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载图片
  const handleDownload = async () => {
    if (!createdImage) return;

    try {
      const response = await fetch(createdImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'created-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = createdImage;
      a.download = 'created-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 重置
  const handleReset = () => {
    setPrompt('');
    setUploadedImages([]);
    setUploadedFiles([]);
    setCreatedImage(null);
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
    if (template.imageUrl) {
      // 清空现有图片，添加示例图片
      setUploadedImages([template.imageUrl]);
      setUploadedFiles([]);
    }
    setInspirationModalVisible(false);
  };

  return (
    <div className="flex-1 bg-[#F5F7FA]">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* 标题区域 */}
        <div className="text-center mb-8 md:mb-12">
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
              <img
                src={createdImage || previewImage}
                alt="创作结果"
                className="w-full h-full object-contain"
              />

              {/* 示例标签 */}
              {!createdImage && (
                <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                  示例
                </div>
              )}

              {/* Loading提示 */}
              {loading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="bg-white rounded-xl px-6 py-4 flex items-center gap-3">
                    <Spin size="default" />
                    <span className="text-gray-700">正在创作中...</span>
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            {createdImage && (
              <div className="flex justify-center gap-3 mt-5">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <span>重新创作</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all"
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
              </div>
            </div>

            {/* 灵感示例滚动 */}
            <div className="mt-6">
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
                    className="flex-shrink-0 w-24 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all"
                  >
                    <div className="w-24 h-20 relative">
                      {template.imageUrl ? (
                        <img
                          src={template.imageUrl!}
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
          <div className="lg:w-[44%] order-1 lg:order-2 flex flex-col gap-4">
            {/* 描述输入 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">描述画面</h3>
                <button
                  onClick={handleOpenTemplates}
                  className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
                >
                  <BulbOutlined />
                  灵感示例
                </button>
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
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">参考图（可选）</h3>
                <span className="text-xs text-gray-400">最多上传5张</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">帮助模型理解你想要的风格和构图</p>

              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200"
                  >
                    <img src={img} alt={`参考图${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                    >
                      <CloseOutlined className="text-xs" />
                    </button>
                  </div>
                ))}

                {uploadedImages.length < 5 && (
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
              className={`w-full py-3 rounded-xl font-medium text-white transition-all ${
                loading || !prompt.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30'
              }`}
            >
              {loading ? '创作中...' : '开始创作'}
            </button>

            {/* 提示信息 */}
            <div className="bg-orange-100 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-orange-500">💡</span>
                使用提示
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 描述越详细，生成效果越好</li>
                <li>• 可上传参考图帮助AI理解风格</li>
                <li>• 处理时间约 30-120 秒</li>
                <li>• 有参考图时将使用图片编辑模式</li>
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
        <div>
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

          {/* 模板列表 */}
          {loadingTemplates ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {templates.map(template => (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-orange-50 hover:border-orange-300 border border-transparent transition-all"
                >
                  {template.imageUrl && (
                    <img
                      src={template.imageUrl!}
                      alt={template.title}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}
                  <h4 className="font-medium text-gray-900 text-sm mb-1">{template.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{template.prompt}</p>
                  <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                    {template.category}
                  </span>
                </div>
              ))}

              {templates.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-400">
                  暂无模板数据
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
              <img
                src={selectedInspiration.imageUrl!}
                alt={selectedInspiration.title}
                className="w-full h-64 object-contain rounded-lg mb-4"
              />
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
    </div>
  );
}
