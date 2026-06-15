import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const tools = [
  { key: 'enhance', name: '图像增强', icon: '🎨', hot: true },
  { key: 'expand', name: 'AI 图像扩展', icon: '📐', new: true },
  { key: 'restore', name: '照片修复', icon: '🖼️' },
  { key: 'remove', name: 'AI 物体移除', icon: '✂️' },
  { key: 'bgremove', name: '背景移除', icon: '🎭', hot: true },
  { key: 'filter', name: 'AI 滤镜', icon: '🌈' },
  { key: 'beauty', name: 'AI 美颜', icon: '💄' },
  { key: 'hairstyle', name: 'AI 发型', icon: '💇' },
];

export function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0 });
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);
  const closeDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isLandingPage = location.pathname === '/';

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

  // Scroll detection for LandingPage
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update dropdown position when opened or scrolled
  useEffect(() => {
    const updatePosition = () => {
      if (toolsButtonRef.current && toolsDropdownOpen) {
        const rect = toolsButtonRef.current.getBoundingClientRect();
        setDropdownPosition({ left: Math.min(rect.left, window.innerWidth - 400) });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    return () => window.removeEventListener('scroll', updatePosition);
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
    const API_WS_URL = import.meta.env.VITE_WS_URL || '/ws';
    const ws = new WebSocket(API_WS_URL + "/online");
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
  const handleStartEdit = () => navigate('/editor');

  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 z-50 transition-all duration-300 ${
            scrolled
                ? 'bg-white/80 backdrop-blur-xl shadow-sm'
                : 'bg-[rgba(255,255,255,0.8)]'
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
            <div className="hidden lg:flex items-center space-x-8">
              <div
                className="relative"
                onMouseEnter={openDropdown}
                onMouseLeave={closeDropdownWithDelay}
              >
                <button
                  ref={toolsButtonRef}
                  className="flex items-center space-x-1 text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <span>在线工具</span>
                  <DownOutlined className={`text-[10px] transition-transform duration-300 ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <a
                onClick={handleGoToGalleries}
                className="text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
              >
                图集
              </a>
              {isLandingPage && (
                <a
                  href="#pricing"
                  className="text-gray-600 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  定价
                </a>
              )}
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Online count */}
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>{onlineCount} 在线</span>
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

              <a
                href="/editor"
                className="block text-gray-600 hover:text-orange-600 py-2 cursor-pointer"
              >
                在线工具
              </a>
              <a
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleGoToGalleries();
                }}
                className="block text-gray-600 hover:text-orange-600 py-2 cursor-pointer"
              >
                图集
              </a>
              {isLandingPage && (
                <a
                  href="#pricing"
                  className="block text-gray-600 hover:text-orange-600 py-2 cursor-pointer"
                >
                  定价
                </a>
              )}
              <div className="pt-3 border-t border-gray-100">
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleStartEdit();
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
            {tools.slice(0, 8).map((tool) => (
              <a
                key={tool.key}
                href= {"/" + tool.key}
                className="flex items-center space-x-2 text-gray-600 hover:bg-[rgba(224,225,225,0.6)] rounded-md text-sm px-4 py-1.5 cursor-pointer transition-colors group"
              >
                <span className="text-gray-400 group-hover:text-orange-500 transition-colors">
                  {tool.icon}
                </span>
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
              </a>
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
