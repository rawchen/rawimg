import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  UserOutlined,
  MenuOutlined,
  CloseOutlined,
  CameraOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserDropdown } from '@/components/auth/UserDropdown';
import {
  Sparkles,
  Palette,
  ImageUpscale,
  ImagePlus,
  PackageMinus,
  ImageMinus,
  Blend,
  Panda,
  SquareScissors,
  PenTool, Shirt,
} from 'lucide-react';

const tools = [
  { key: 'create', name: '生成创作', icon: Sparkles, hot: true },
  { key: 'beauty', name: '智能美颜', icon: Panda, hot: true },
  { key: 'clothes', name: '智能换装', icon: Shirt, new: true },
  { key: 'edit', name: '局部改图', icon: PenTool, new: true },
  { key: 'remove', name: '物体移除', icon: PackageMinus },
  { key: 'enhance', name: '图像增强', icon: Palette },
  { key: 'matting', name: '背景移除', icon: ImageMinus },
  { key: 'expand', name: '图像扩展', icon: ImageUpscale },
  { key: 'restore', name: '照片修复', icon: ImagePlus },
  { key: 'hairstyle', name: '发型创意', icon: SquareScissors },
];

export function Header({ scrolled: scrolledProp }: { scrolled?: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const closeDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLandingPage = location.pathname === '/';
  const scrolled = scrolledProp ?? false;

  const openDropdown = () => {
    if (closeDropdownTimeoutRef.current) {
      clearTimeout(closeDropdownTimeoutRef.current);
      closeDropdownTimeoutRef.current = null;
    }
    setToolsDropdownOpen(true);
  };

  const closeDropdownWithDelay = () => {
    closeDropdownTimeoutRef.current = setTimeout(() => {
      setToolsDropdownOpen(false);
    }, 100);
  };

  // Update dropdown position when opened or scrolled
  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    const updatePosition = () => {
      if (toolsButtonRef.current && toolsDropdownOpen) {
        const rect = toolsButtonRef.current.getBoundingClientRect();
        setDropdownPosition({ left: Math.min(rect.left, window.innerWidth - 400) });
      }
    };

    updatePosition();
    scrollContainer?.addEventListener('scroll', updatePosition);
    return () => scrollContainer?.removeEventListener('scroll', updatePosition);
  }, [toolsDropdownOpen]);

  // Get or create a unique clientId for this browser
  const getClientId = () => {
    let clientId = localStorage.getItem('ws_client_id');
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ws_client_id', clientId);
    }
    return clientId;
  };

  // WebSocket connection for online users
  useEffect(() => {
    // 构建完整的 WebSocket URL
    const getWebSocketUrl = () => {
      const wsPath = import.meta.env.VITE_WS_URL || '/ws';
      // 如果已经是完整 URL，直接使用
      if (wsPath.startsWith('ws://') || wsPath.startsWith('wss://')) {
        return wsPath;
      }
      // 根据当前页面协议构建完整 URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}${wsPath}`;
    };
    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl + "/online");
    const clientId = getClientId();

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'register', clientId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'online_count') {
          setOnlineCount(data.count);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      // Silently handle connection errors
    };

    return () => {
      ws.close();
    };
  }, []);

  // 点击外部关闭移动端菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isHeader = headerRef.current?.contains(target);
      const isMenu = mobileMenuRef.current?.contains(target);

      if (!isHeader && !isMenu) {
        event.stopPropagation();
        event.preventDefault();
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [mobileMenuOpen]);

  // 检查是否需要显示登录模态框（从其他页面跳转过来）
  useEffect(() => {
    const state = location.state as { showLogin?: boolean } | null;
    if (state?.showLogin && !isAuthenticated && !isLoading) {
      setShowAuthModal(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, isAuthenticated, isLoading]);

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleGoToGalleries = () => navigate('/galleries');
  const handleGoToCreate = () => navigate('/create');
  const handleGoToEditor = () => navigate('/editor');

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 shadow-custom ${
            scrolled
                ? 'bg-white/80 shadow-custom'
                : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center font-medium justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <CameraOutlined className="text-white text-lg" />
              </div>
              <span className="text-xl font-bold text-gray-900 font-serif">RAWIMG</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center h-full -mx-2">
              <div
                className="relative h-full flex items-center px-2"
                onMouseEnter={openDropdown}
                onMouseLeave={closeDropdownWithDelay}
              >
                <button
                  ref={toolsButtonRef}
                  className="relative flex items-center space-x-1 text-gray-600 hover:text-orange-600 transition-all duration-300 cursor-pointer h-full px-4 group"
                >
                  <span className="relative z-10 font-medium">在线工具</span>
                  <DownOutlined
                    className={`text-[10px] transition-transform duration-300 relative z-10 ${toolsDropdownOpen ? 'rotate-180' : ''}`}
                  />
                  <div className="absolute inset-x-1 bottom-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>

              <a
                onClick={handleGoToCreate}
                className="relative h-full flex items-center px-4 text-gray-600 hover:text-orange-600 transition-all duration-300 cursor-pointer group"
              >
                <span className="relative z-10 font-medium w-10 text-center">创作</span>
                <div className="absolute inset-x-1 bottom-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>

              <a
                onClick={handleGoToGalleries}
                className="relative h-full flex items-center px-4 text-gray-600 hover:text-orange-600 transition-all duration-300 cursor-pointer group"
              >
                <span className="relative z-10 font-medium w-10 text-center">图集</span>
                <div className="absolute inset-x-1 bottom-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>

              <a
                onClick={handleGoToEditor}
                className="relative h-full flex items-center px-4 text-gray-600 hover:text-orange-600 transition-all duration-300 cursor-pointer group"
              >
                <span className="relative z-10 font-medium w-10 text-center">编辑</span>
                <div className="absolute inset-x-1 bottom-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center"></div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Online count */}
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="w-2">{onlineCount}</span><span>在线</span>
              </div>

              {/* Auth buttons */}
              {isLoading ? (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-100">
                  <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin"></div>
                </div>
              ) : isAuthenticated ? (
                <UserDropdown
                  user={user!}
                  onAvatarClick={() => {
                    if (mobileMenuOpen) {
                      setMobileMenuOpen(false);
                    }
                  }}
                />
              ) : (
                <button
                  onClick={() => handleAuthClick('login')}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer"
                >
                  <UserOutlined className="text-lg text-white" />
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4">
            <div className="space-y-3">
              {/* Online count */}
              <div className="flex items-center space-x-1 text-sm text-gray-500 py-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>{onlineCount} 在线</span>
              </div>

              <Link
                to="/editor"
                className="block text-gray-600 hover:text-orange-600 py-2 cursor-pointer"
              >
                在线工具
              </Link>
              <a
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleGoToGalleries();
                }}
                className="block text-gray-600 hover:text-orange-600 py-2 cursor-pointer"
              >
                图集
              </a>
              <div className="pt-3 border-t border-gray-100">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleGoToEditor();
                      }}
                      className="w-full mb-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      编辑器
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg cursor-pointer"
                    >
                      {user?.username || '用户'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleAuthClick('login');
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg cursor-pointer"
                  >
                    登录 / 注册
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Tools Dropdown - Outside header for proper backdrop-blur */}
      {toolsDropdownOpen && (
        <div
          className="fixed z-[60] pt-2"
          style={{
            left: dropdownPosition.left,
            top: 64,
          }}
          onMouseEnter={openDropdown}
          onMouseLeave={closeDropdownWithDelay}
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 p-4 grid grid-cols-2 gap-0 w-96"
          >
            {tools.slice(0, 9).map((tool) => (
              <Link
                key={tool.key}
                to={"/" + tool.key}
                onClick={() => setToolsDropdownOpen(false)}
                className="flex items-center space-x-2 text-gray-600 hover:bg-[rgba(224,225,225,0.6)] rounded-md text-sm px-4 py-1.5 cursor-pointer transition-colors group"
              >
                <tool.icon className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                <span>{tool.name}</span>
                {tool.hot && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                    热
                  </span>
                )}
                {tool.new && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                    新
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </>
  );
}
