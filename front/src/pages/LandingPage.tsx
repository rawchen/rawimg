import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SparklesOutlined, BgColorsOutlined, PictureOutlined, ScissorOutlined, EyeOutlined, SkinOutlined, SwapOutlined, CrownOutlined, CheckOutlined, StarFilled, PlayCircleOutlined, ExpandOutlined, CameraOutlined, SmileOutlined, ThunderboltOutlined, SafetyOutlined, GlobalOutlined, CustomerServiceOutlined, RocketOutlined, DownOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';

const featureCards = [
  { title: 'RAW 图像增强', description: '一键提升 RAW 照片质量', icon: <SparklesOutlined className="text-2xl" />, color: 'from-violet-500 to-purple-600', href: '/editor' },
  { title: 'AI 背景移除', description: '智能识别主体，一键去除背景', icon: <ScissorOutlined className="text-2xl" />, color: 'from-pink-500 to-rose-600', href: '/editor' },
  { title: '智能修图', description: 'AI 驱动的人像美容', icon: <SkinOutlined className="text-2xl" />, color: 'from-amber-500 to-orange-600', href: '/editor' },
  { title: '图像放大', description: '无损放大，保持清晰细节', icon: <ExpandOutlined className="text-2xl" />, color: 'from-emerald-500 to-teal-600', href: '/editor' },
  { title: 'AI 滤镜', description: '一键应用专业级滤镜', icon: <BgColorsOutlined className="text-2xl" />, color: 'from-blue-500 to-cyan-600', href: '/editor' },
];

const toolCategories = [
  { title: '图像工具', items: [
    { name: '图像增强器', icon: <SparklesOutlined />, hot: true },
    { name: 'AI 图像扩展器', icon: <ExpandOutlined />, new: true },
    { name: '照片修复', icon: <PictureOutlined /> },
    { name: 'AI 物体移除器', icon: <ScissorOutlined /> },
    { name: '背景移除器', icon: <BgColorsOutlined /> },
    { name: 'AI 滤镜', icon: <BgColorsOutlined />, hot: true },
  ]},
  { title: '人像工具', items: [
    { name: 'AI 美颜', icon: <SkinOutlined /> },
    { name: 'AI 发型', icon: <SmileOutlined />, hot: true },
    { name: '睁眼修复', icon: <EyeOutlined /> },
    { name: 'AI 换脸', icon: <SwapOutlined /> },
  ]},
  { title: '视频工具', items: [
    { name: 'AI 视频增强器', icon: <PlayCircleOutlined /> },
    { name: '视频背景移除', icon: <ScissorOutlined />, new: true },
  ]},
];

const pricingPlans = [
  { name: '免费版', price: '0', period: '元/月', description: '适合个人体验', features: ['每月 10 次 AI 处理', '基础 RAW 解码', '标准画质导出', '基础滤镜'], cta: '免费开始', popular: false },
  { name: '专业版', price: '49', period: '元/月', description: '适合创作者', features: ['无限 AI 处理', '完整 RAW 解码', '高清画质导出', '全部 AI 滤镜', '批量处理', '优先客服'], cta: '立即订阅', popular: true },
  { name: '企业版', price: '199', period: '元/月', description: '适合团队', features: ['专业版全部功能', 'API 接入', '团队协作', '私有化部署', '专属客户经理', 'SLA 保障'], cta: '联系销售', popular: false },
];

const reviews = [
  { name: '李明', role: '摄影师', avatar: 'L', content: 'RAW 解码能力太强了，一键处理 CR3 文件。', rating: 5 },
  { name: '王芳', role: '自媒体博主', avatar: 'W', content: '在线编辑太方便了，不用安装任何软件。', rating: 5 },
  { name: '张伟', role: '设计师', avatar: 'Z', content: 'AI 背景移除非常精准，边缘处理自然。', rating: 5 },
  { name: '陈晓', role: '电商运营', avatar: 'C', content: '批量处理效率提升了 3 倍，强烈推荐。', rating: 5 },
];

const trustBadges = [
  { icon: <SafetyOutlined className="text-3xl" />, label: '数据安全', desc: '端到端加密' },
  { icon: <GlobalOutlined className="text-3xl" />, label: '全球加速', desc: 'CDN 分发' },
  { icon: <ThunderboltOutlined className="text-3xl" />, label: '极速处理', desc: 'GPU 加速' },
  { icon: <CustomerServiceOutlined className="text-3xl" />, label: '专业支持', desc: '7x24 小时' },
];
export function LandingPage() {
  const navigate = useNavigate();
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleStartEdit = () => navigate('/editor');
}
