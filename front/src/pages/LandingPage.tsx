import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import enhanceBf from '@/assets/media/enhance-bf.webp';
import eraserBf from '@/assets/media/eraser-bf.webp';
import retouchBf from '@/assets/media/retouch-bf.webp';
import tunerBf from '@/assets/media/tuner-bf.webp';
import outfitBf from '@/assets/media/outfit-bf.webp';
import {
  HighlightOutlined,
  BgColorsOutlined,
  PictureOutlined,
  ScissorOutlined,
  EyeOutlined,
  SkinOutlined,
  SwapOutlined,
  CheckOutlined,
  StarFilled,
  PlayCircleOutlined,
  ExpandOutlined,
  SmileOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  GlobalOutlined,
  CustomerServiceOutlined,
  RocketOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  MinusOutlined,
  CameraOutlined,
} from '@ant-design/icons';

const featureCards = [
  {
    title: '图像创作',
    description: '发挥你的想象力尽情创作',
    icon: <BgColorsOutlined className="text-2xl" />,
    // gradient: 'from-blue-500 to-cyan-600',
    href: '/create',
    rotation: '-2deg',
    image: outfitBf,
  },
  {
    title: '图像增强',
    description: '一键提升照片质量',
    icon: <HighlightOutlined className="text-2xl" />,
    // gradient: 'from-amber-500 to-orange-600',
    href: '/enhance',
    rotation: '-5deg',
    image: enhanceBf,
  },
  {
    title: 'AI 背景移除',
    description: '智能识别主体，一键去除背景',
    icon: <ScissorOutlined className="text-2xl" />,
    // gradient: 'from-pink-500 to-rose-600',
    href: '/create',
    rotation: '3deg',
    image: eraserBf,
  },
  {
    title: '智能修图',
    description: 'AI 驱动的人像美容',
    icon: <SkinOutlined className="text-2xl" />,
    // gradient: 'from-violet-500 to-purple-600',
    href: '/create',
    rotation: '-3deg',
    image: retouchBf,
  },
  {
    title: '图像放大',
    description: '无损放大，保持清晰细节',
    icon: <ExpandOutlined className="text-2xl" />,
    // gradient: 'from-emerald-500 to-teal-600',
    href: '/create',
    rotation: '5deg',
    image: tunerBf,
  },
];

const userPersonas = [
  {
    title: '摄影爱好者',
    description: '强大的 RAW 解码能力，一键处理 CR3、NEF 等格式文件，让每一张照片都呈现出专业级的画质效果。',
    color: 'bg-gradient-to-r from-am' +
      'ber-500 to-orange-500',
    icon: <CameraOutlined className="text-2xl" />,
  },
  {
    title: '内容创作者',
    description: '从智能背景移除到 AI 美颜，一站式解决图片处理需求，让你的内容更快更好地发布到各大平台。',
    color: 'bg-gradient-to-r from-pink-500 to-rose-500',
    icon: <SmileOutlined className="text-2xl" />,
  },
  {
    title: '电商卖家',
    description: '批量处理商品图片，智能抠图换背景，让你的产品展示更加专业，提升转化率。',
    color: 'bg-gradient-to-r from-violet-500 to-purple-500',
    icon: <RocketOutlined className="text-2xl" />,
  },
];

const toolTabs = [
  { key: 'all', label: '全部工具' },
  { key: 'image', label: '图像工具' },
  { key: 'portrait', label: '人像工具' },
  { key: 'video', label: '视频工具' },
];

const tools = [
  { key: 'enhance', name: '图像增强器', desc: '一键提升照片质量', icon: <HighlightOutlined />, category: 'image', hot: true },
  { key: 'expand', name: 'AI 图像扩展器', desc: '智能扩展图片边界', icon: <ExpandOutlined />, category: 'image', new: true },
  { key: 'restore', name: '照片修复', desc: '修复老照片损伤', icon: <PictureOutlined />, category: 'image' },
  { key: 'remove', name: 'AI 物体移除器', desc: '智能移除不需要的元素', icon: <ScissorOutlined />, category: 'image' },
  { key: 'bgremove', name: '背景移除器', desc: '一键抠图换背景', icon: <BgColorsOutlined />, category: 'image', hot: true },
  { key: 'filter', name: 'AI 滤镜', desc: '专业级滤镜效果', icon: <BgColorsOutlined />, category: 'image' },
  { key: 'beauty', name: 'AI 美颜', desc: '自然美颜效果', icon: <SkinOutlined />, category: 'portrait' },
  { key: 'hairstyle', name: 'AI 发型', desc: '智能换发型', icon: <SmileOutlined />, category: 'portrait', hot: true },
  { key: 'eye', name: '睁眼修复', desc: '修复闭眼照片', icon: <EyeOutlined />, category: 'portrait' },
  { key: 'face', name: 'AI 换脸', desc: '智能人脸替换', icon: <SwapOutlined />, category: 'portrait' },
  { key: 'venhance', name: 'AI 视频增强器', desc: '提升视频画质', icon: <PlayCircleOutlined />, category: 'video' },
  { key: 'vbgremove', name: '视频背景移除', desc: '智能视频抠图', icon: <ScissorOutlined />, category: 'video', new: true },
];

const reviews = [
  {
    name: '李明',
    role: '摄影师',
    avatar: 'L',
    content: 'RAW 解码能力太强了，一键处理 CR3 文件，效果远超预期！',
    rating: 5,
    rotation: '-2deg',
  },
  {
    name: '王芳',
    role: '自媒体博主',
    avatar: 'W',
    content: '在线编辑太方便了，不用安装任何软件，随时随地处理图片。',
    rating: 5,
    rotation: '3deg',
  },
  {
    name: '张伟',
    role: '设计师',
    avatar: 'Z',
    content: 'AI 背景移除非常精准，边缘处理自然，省了我大量时间。',
    rating: 5,
    rotation: '-1deg',
  },
  {
    name: '陈晓',
    role: '电商运营',
    avatar: 'C',
    content: '批量处理效率提升了 3 倍，强烈推荐给所有电商同行！',
    rating: 5,
    rotation: '2deg',
  },
  {
    name: '赵雷',
    role: '视频创作者',
    avatar: 'R',
    content: '视频增强功能很实用，老素材焕然一新。',
    rating: 5,
    rotation: '-3deg',
  },
];

const faqs = [
  {
    question: 'RawImg 是什么？',
    answer: 'RawImg 是一个 AI 驱动的在线图像处理平台，支持 RAW 格式解码、智能背景移除、AI 美颜、图像放大等专业功能，无需安装软件，打开浏览器即可使用。',
  },
  {
    question: '支持哪些 RAW 格式？',
    answer: '我们支持主流相机的 RAW 格式，包括 Canon (CR3/CR2)、Nikon (NEF)、Sony (ARW)、Fuji (RAF)、Panasonic (RW2) 等，覆盖 90% 以上的相机型号。',
  },
  {
    question: '免费版有什么限制？',
    answer: '免费版每月可进行 10 次 AI 处理，支持基础 RAW 解码和标准画质导出。如果需要更多功能，可以考虑升级到专业版或企业版。',
  },
  {
    question: '数据安全有保障吗？',
    answer: '我们采用端到端加密技术，所有上传的图片会在处理完成后自动删除，不会被保存或用于其他用途。您可以放心使用。',
  },
  {
    question: '如何升级到专业版？',
    answer: '您可以在登录后访问定价页面，选择适合您的订阅计划。我们支持支付宝、微信支付等多种支付方式。',
  },
  {
    question: '可以取消订阅吗？',
    answer: '当然可以。您可以随时在账户设置中取消订阅，取消后您仍可以使用当前计费周期内的服务。',
  },
];

const trustBadges = [
  { icon: <SafetyOutlined className="text-3xl" />, label: '数据安全', desc: '端到端加密' },
  { icon: <GlobalOutlined className="text-3xl" />, label: '全球加速', desc: 'CDN 分发' },
  { icon: <ThunderboltOutlined className="text-3xl" />, label: '极速处理', desc: 'GPU 加速' },
  { icon: <CustomerServiceOutlined className="text-3xl" />, label: '专业支持', desc: '7x24 小时' },
];

// CSS animations styles
const animationStyles = `
  @keyframes fade-in-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slide-in-left {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slide-in-right {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .animate-fade-in-up {
    animation: fade-in-up 0.6s ease-out forwards;
  }

  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }

  .animate-scale-in {
    animation: scale-in 0.4s ease-out forwards;
  }

  .animate-slide-in-left {
    animation: slide-in-left 0.5s ease-out forwards;
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.5s ease-out forwards;
  }

  .animate-delay-100 { animation-delay: 0.1s; }
  .animate-delay-200 { animation-delay: 0.2s; }
  .animate-delay-300 { animation-delay: 0.3s; }
  .animate-delay-400 { animation-delay: 0.4s; }
  .animate-delay-500 { animation-delay: 0.5s; }
  .animate-delay-600 { animation-delay: 0.6s; }

  .opacity-0-initial { opacity: 0; }

  .scroll-animate {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  }

  .scroll-animate.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Feature Card hover animation */
  .feature-card-wrapper {
    position: relative;
    z-index: var(--z-index, 10);
    display: block;
    flex-shrink: 0;
  }

  .feature-card {
    display: block;
    transform: rotate(var(--rotation, 0deg)) scale(var(--scale, 1)) translateX(var(--translate-x, 0px));
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    clip-path: inset(0 round 1rem);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = animationStyles;
  document.head.appendChild(styleSheet);
}

export function LandingPage() {
  const navigate = useNavigate();
  const [activeToolTab, setActiveToolTab] = useState('all');
  const [activePersona, setActivePersona] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [hoveredFeatureIndex, setHoveredFeatureIndex] = useState<number | null>(null);
  const sectionsRef = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // Hero loaded animation
    setTimeout(() => setHeroLoaded(true), 100);
  }, []);

  // Scroll animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleStartEdit = () => navigate('/create');
  const handleGoToGalleries = () => navigate('/editor');

  const filteredTools = activeToolTab === 'all'
    ? tools
    : tools.filter(t => t.category === activeToolTab);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Hero Section */}
      <section className="pt-8 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12">
            {/* Badge */}
            {/*<div className={`inline-flex items-center space-x-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-6 transition-all duration-500 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>*/}
            {/*  <RocketOutlined className="transition-transform hover:rotate-12 duration-300" />*/}
            {/*  <span>AI 驱动的图像处理平台</span>*/}
            {/*</div>*/}

            {/* Headline */}
            <h1 className={`text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-1.5 leading-tight transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              懂你的照片编辑器
            </h1>
            <h1 className={`text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight transition-all duration-700 delay-200 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                AI 让创作更简单
              </span>
            </h1>

            {/* Subheadline */}
            {/*<p className={`text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto transition-all duration-700 delay-300 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>*/}
            {/*  在线编辑 RAW 格式照片，智能背景移除、AI 修图、无损放大，专业级效果触手可及。*/}
            {/*</p>*/}
          </div>

          {/* Feature Cards - Rotated Layout */}
          <div className={`hidden md:flex justify-center gap-4 lg:gap-6 mb-20 transition-all duration-700 delay-400 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {featureCards.map((feature, index) => {
              const isHovered = hoveredFeatureIndex === index;
              const isLeft = hoveredFeatureIndex !== null && index < hoveredFeatureIndex;
              const isRight = hoveredFeatureIndex !== null && index > hoveredFeatureIndex;
              const distance = hoveredFeatureIndex !== null ? Math.abs(index - hoveredFeatureIndex) : 0;

              // 计算位移：距离越远位移越小
              let translateX = 0;
              if (isLeft) {
                translateX = -(50 / distance);
              } else if (isRight) {
                translateX = 50 / distance;
              }

              // 计算 transform
              const rotation = isHovered ? '0deg' : feature.rotation;
              const scale = isHovered ? 1.5 : 1;

              return (
                <div
                  key={feature.title}
                  className="feature-card-wrapper w-40 lg:w-48"
                  style={{
                    zIndex: isHovered ? 50 : 10 - index,
                  }}
                  onMouseEnter={() => setHoveredFeatureIndex(index)}
                  onMouseLeave={() => setHoveredFeatureIndex(null)}
                >
                  <a
                    href={feature.href}
                    className="feature-card group relative w-full aspect-[3/4] bg-white cursor-pointer"
                    style={{
                      '--rotation': isHovered ? '0deg' : feature.rotation,
                      '--scale': isHovered ? 1.5 : 1,
                      '--translate-x': `${translateX}px`,
                    } as React.CSSProperties}
                  >
                    {/* Background Image Container */}
                    <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-white bg-white shadow-[0_4px_32px_rgba(205,211,238,0.50)]">
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Content - 底部半透明背景 */}
                      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center h-8 w-full bg-[rgba(0,0,0,0.30)] backdrop-blur-md">
                        <h3 className="text-sm leading-none text-white lg:text-base">{feature.title}</h3>
                      </div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>

          {/* Mobile Feature Cards */}
          <div className="md:hidden grid grid-cols-2 gap-4 mb-8">
            {featureCards.slice(0, 4).map((feature) => (
              <a
                key={feature.title}
                href={feature.href}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {/* Background Image */}
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Content - 底部半透明背景 */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center h-8 w-full bg-[rgba(0,0,0,0.30)] backdrop-blur-md transition-opacity duration-200">
                  <h3 className="text-sm leading-none text-white">{feature.title}</h3>
                </div>
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div
            className={`relative flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-500 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ zIndex: 10 }}
          >
            <button
              onClick={handleStartEdit}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-semibold rounded-full hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              开始创作
            </button>
            <button
              onClick={handleGoToGalleries}
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-full border-2 border-gray-200 hover:border-orange-500 hover:text-orange-600 hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              在线修图
            </button>
          </div>

          {/* Trust Indicators */}
          <div className={`relative mt-10 flex flex-wrap items-center justify-center gap-6 text-gray-500 text-sm transition-all duration-700 delay-600 ${heroLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center space-x-2 hover:text-green-600 transition-colors duration-300">
              <CheckOutlined className="text-green-500 transition-transform hover:scale-125 duration-300" />
              <span>AI 辅助</span>
            </div>
            <div className="flex items-center space-x-2 hover:text-green-600 transition-colors duration-300">
              <CheckOutlined className="text-green-500 transition-transform hover:scale-125 duration-300" />
              <span>在线编辑</span>
            </div>
            <div className="flex items-center space-x-2 hover:text-green-600 transition-colors duration-300">
              <CheckOutlined className="text-green-500 transition-transform hover:scale-125 duration-300" />
              <span>云端处理</span>
            </div>
          </div>
        </div>
      </section>

      {/* User Personas Section */}
      <section className="py-16 px-4 bg-white scroll-animate">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            RawImg：适合你的 AI 图像编辑器
          </h2>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Video/Image Preview */}
            <div className="lg:w-2/3">
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <PlayCircleOutlined className="text-4xl text-white" />
                  </div>
                  <p className="text-gray-500">编辑器预览</p>
                </div>
              </div>
            </div>

            {/* Accordion Cards */}
            <div className="lg:w-1/3 flex flex-col gap-3">
              {userPersonas.map((persona, index) => (
                <div
                  key={persona.title}
                  className={`rounded-xl overflow-hidden transition-all duration-400 cursor-pointer ${
                    activePersona === index ? persona.color + ' text-white scale-[1.02] shadow-lg' : 'bg-gray-50 hover:bg-gray-100 hover:translate-x-1'
                  }`}
                  onClick={() => setActivePersona(index)}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        activePersona === index ? 'bg-white/20 scale-110' : 'bg-white'
                      }`}>
                        <span className={activePersona === index ? 'text-white' : 'text-gray-600'}>{persona.icon}</span>
                      </div>
                      <h3 className="font-semibold">{persona.title}</h3>
                    </div>
                    <div className={`transition-transform duration-300 ${activePersona === index ? 'rotate-180' : ''}`}>
                      {activePersona === index ? <MinusOutlined /> : <PlusOutlined className="text-gray-400" />}
                    </div>
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ease-out ${
                    activePersona === index ? 'max-h-40 px-4 pb-4 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <p className={`text-sm ${activePersona === index ? 'text-white/90' : 'text-gray-600'}`}>
                      {persona.description}
                    </p>
                  </div>
                </div>
              ))}

              <button
                onClick={handleStartEdit}
                className="mt-4 w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
              >
                立即开始
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-16 px-4 bg-[#F5F7FA] scroll-animate">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center text-gray-900 mb-3">
            AI 驱动的创意工具
          </h2>
          <p className="text-center text-gray-500 mb-8">激发无限创意可能</p>

          {/* Tab Filters */}
          <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {toolTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveToolTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeToolTab === tab.key
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTools.map((tool, index) => (
              <Link
                key={tool.key}
                to="/editor"
                className="group bg-white rounded-xl p-4 shadow-md hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-orange-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                    {tool.icon}
                  </div>
                  <ArrowRightOutlined className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-orange-600 transition-colors duration-300">{tool.name}</h3>
                <p className="text-xs text-gray-500">{tool.desc}</p>
                <div className="flex gap-1 mt-2">
                  {tool.hot && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded animate-pulse">热门</span>
                  )}
                  {tool.new && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded">新</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 px-4 bg-white scroll-animate">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">用户评价</h2>
            <p className="text-orange-500 font-medium">数万用户的信赖</p>
          </div>

          <div className="hidden lg:flex justify-center gap-4">
            {reviews.map((review, index) => (
              <div
                key={review.name}
                className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl hover:-translate-y-2 hover:scale-105 transition-all duration-400 w-52 flex-shrink-0"
                style={{
                  transform: `rotate(${review.rotation})`,
                  transitionDelay: `${index * 100}ms`
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm hover:scale-110 transition-transform duration-300">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{review.name}</p>
                    <p className="text-xs text-gray-500">{review.role}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{review.content}</p>
                <div className="flex gap-0.5">
                  {[...Array(review.rating)].map((_, i) => (
                    <StarFilled key={i} className="text-orange-500 text-xs hover:scale-125 transition-transform duration-200" style={{ transitionDelay: `${i * 50}ms` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Reviews */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.slice(0, 4).map((review) => (
              <div key={review.name} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{review.name}</p>
                    <p className="text-xs text-gray-500">{review.role}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{review.content}</p>
                <div className="flex gap-0.5">
                  {[...Array(review.rating)].map((_, i) => (
                    <StarFilled key={i} className="text-orange-500 text-sm" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 px-4 bg-gray-50 scroll-animate">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {trustBadges.map((badge, index) => (
              <div
                key={badge.label}
                className="text-center group hover:-translate-y-1 transition-all duration-300"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="text-orange-500 mb-3 flex justify-center group-hover:scale-110 transition-transform duration-300">{badge.icon}</div>
                <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors duration-300">{badge.label}</h4>
                <p className="text-sm text-gray-500">{badge.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4 bg-white scroll-animate">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">简单透明的定价</h2>
            <p className="text-gray-600">选择适合你的方案，开始创作之旅</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-2 hover:scale-[1.02] transition-all duration-400 group">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">免费版</h3>
              <p className="text-gray-500 text-sm mb-4">适合个人体验</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">¥0</span>
                <span className="text-gray-500">/月</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300"><CheckOutlined className="text-green-500" />每月 10 次 AI 处理</li>
                <li className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 delay-100"><CheckOutlined className="text-green-500" />基础 RAW 解码</li>
                <li className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 delay-200"><CheckOutlined className="text-green-500" />标准画质导出</li>
              </ul>
              <button onClick={handleStartEdit} className="w-full py-3 border border-gray-200 rounded-full font-medium hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-300 cursor-pointer">
                免费开始
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-500/20 scale-105 hover:scale-[1.08] hover:shadow-2xl hover:shadow-orange-500/30 transition-all duration-400">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-orange-600 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                最受欢迎
              </div>
              <h3 className="text-xl font-semibold mb-2">专业版</h3>
              <p className="text-white/80 text-sm mb-4">适合创作者</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">¥49</span>
                <span className="text-white/80">/月</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 hover:translate-x-2 transition-transform duration-300"><CheckOutlined />无限 AI 处理</li>
                <li className="flex items-center gap-2 hover:translate-x-2 transition-transform duration-300 delay-100"><CheckOutlined />完整 RAW 解码</li>
                <li className="flex items-center gap-2 hover:translate-x-2 transition-transform duration-300 delay-200"><CheckOutlined />高清画质导出</li>
                <li className="flex items-center gap-2 hover:translate-x-2 transition-transform duration-300 delay-300"><CheckOutlined />全部 AI 滤镜</li>
                <li className="flex items-center gap-2 hover:translate-x-2 transition-transform duration-300 delay-400"><CheckOutlined />批量处理</li>
              </ul>
              <button onClick={handleStartEdit} className="w-full py-3 bg-white text-orange-600 rounded-full font-semibold hover:shadow-lg hover:bg-gray-100 transition-all duration-300 cursor-pointer">
                立即订阅
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-2 hover:scale-[1.02] transition-all duration-400 group">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">企业版</h3>
              <p className="text-gray-500 text-sm mb-4">适合团队</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">¥199</span>
                <span className="text-gray-500">/月</span>
              </div>
              <ul className="space-y-2 mb-6 text-sm text-gray-600">
                <li className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300"><CheckOutlined className="text-green-500" />专业版全部功能</li>
                <li className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 delay-100"><CheckOutlined className="text-green-500" />API 接入</li>
                <li className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 delay-200"><CheckOutlined className="text-green-500" />团队协作</li>
                <li className="flex items-center gap-2 group-hover:translate-x-1 transition-transform duration-300 delay-300"><CheckOutlined className="text-green-500" />私有化部署</li>
              </ul>
              <button className="w-full py-3 border border-gray-200 rounded-full font-medium hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-300 cursor-pointer">
                联系销售
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-gray-50 scroll-animate">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold text-center text-gray-900 mb-10">常见问题</h2>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <button
                  className="w-full flex items-center justify-between p-4 text-left cursor-pointer group"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                >
                  <span className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors duration-300">{faq.question}</span>
                  {activeFaq === index ? (
                    <MinusOutlined className="text-orange-500 transition-transform duration-300 rotate-0" />
                  ) : (
                    <PlusOutlined className="text-gray-400 group-hover:text-orange-500 group-hover:rotate-90 transition-all duration-300" />
                  )}
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ease-out ${
                    activeFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="px-4 pb-4 text-gray-600 text-sm">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-amber-500 to-orange-600 scroll-animate">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            准备好开始创作了吗？
          </h2>
          <p className="text-white/90 mb-8 text-lg">
            立即免费体验，无需信用卡
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleStartEdit}
              className="w-full sm:w-auto px-8 py-4 bg-white text-orange-600 text-lg font-semibold rounded-full hover:shadow-xl hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              开始编辑
            </button>
            <button
              onClick={handleGoToGalleries}
              className="w-full sm:w-auto px-8 py-4 bg-transparent text-white text-lg font-semibold rounded-full border-2 border-white/30 hover:bg-white/10 hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              浏览图集
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <CameraOutlined className="text-white" />
                </div>
                <span className="text-xl font-bold text-white">RawImg</span>
              </div>
              <p className="text-sm text-gray-500">AI 驱动的图像处理平台</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">产品</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/editor" className="hover:text-white transition-colors cursor-pointer">编辑器</Link></li>
                <li><Link to="/galleries" className="hover:text-white transition-colors cursor-pointer">图集</Link></li>
                <li><a href="#pricing" className="hover:text-white transition-colors cursor-pointer">定价</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">工具</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/editor" className="hover:text-white transition-colors cursor-pointer">RAW 解码</Link></li>
                <li><Link to="/editor" className="hover:text-white transition-colors cursor-pointer">背景移除</Link></li>
                <li><Link to="/editor" className="hover:text-white transition-colors cursor-pointer">AI 滤镜</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">支持</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors cursor-pointer">帮助中心</a></li>
                <li><a href="#" className="hover:text-white transition-colors cursor-pointer">联系我们</a></li>
                <li><a href="#" className="hover:text-white transition-colors cursor-pointer">隐私政策</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 RawImg. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating CTA Banner - Desktop Only */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">专业级图像处理，无需安装软件</p>
              <p className="text-gray-500 text-xs">免费试用，无需信用卡</p>
            </div>
          </div>
          <button
            onClick={handleStartEdit}
            className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-medium hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            立即开始
          </button>
        </div>
      </div>
    </div>
  );
}
