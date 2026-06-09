import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserOutlined, CrownOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserDropdown } from '@/components/auth/UserDropdown';

export function Header() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭移动端菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isHeader = headerRef.current?.contains(target);
      const isMenu = mobileMenuRef.current?.contains(target);

      // 点击非 header 和非菜单区域时关闭
      if (!isHeader && !isMenu) {
        event.stopPropagation();
        event.preventDefault();
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      // 使用捕获阶段，确保在其他点击事件之前处理
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
      // 清除 state，避免刷新后再次打开
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state, isAuthenticated, isLoading]);

  // Get or create a unique clientId for this browser (shared across tabs)
  const getClientId = () => {
    let clientId = localStorage.getItem('ws_client_id');
    if (!clientId) {
      clientId = 'client_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ws_client_id', clientId);
    }
    return clientId;
  };

  useEffect(() => {
    // WebSocket connection for online users
    const API_WS_URL = import.meta.env.VITE_WS_URL || '/ws';
    const ws = new WebSocket(API_WS_URL + "/online");
    const clientId = getClientId();

    ws.onopen = () => {
      // Register with clientId on connection open
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

  const handleAuthClick = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleLogoClick = () => {
    window.location.href = window.location.origin;
  };

  const navItems = [
    { label: '最新', path: '/', key: 'latest' },
    { label: '热门', path: '/hot', key: 'hot' },
    { label: '喜爱', path: '/like', key: 'like' },
    { label: '下载', path: '/down', key: 'down' },
    { label: '编辑', path: '/editor', key: 'editor' },
  ];

  const currentSort = location.pathname.slice(1) || 'latest';

  return (
    <>
      <header ref={headerRef} className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={handleLogoClick} className="flex items-center space-x-2 cursor-pointer">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold text-black">RawImg</span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    const targetSort = item.key === 'latest' ? '' : item.key;
                    const currentPath = location.pathname;
                    const targetPath = item.path;
                    
                    if (currentPath === targetPath) {
                      // window.location.reload();
                    } else {
                      navigate(targetPath);
                    }
                  }}
                  className={`text-sm font-medium transition-colors ${
                    (item.key === 'latest' && !currentSort) || currentSort === item.key
                      ? 'text-black cursor-default'
                      : 'text-gray-500 hover:text-black cursor-pointer'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Online count */}
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>{onlineCount} 在线</span>
              </div>

              {/* Auth buttons */}
              {isLoading ? (
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
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
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <UserOutlined className="text-lg text-gray-600" />
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1 text-gray-500 hover:text-black"
              >
                {mobileMenuOpen ? <CloseOutlined className="text-xl" /> : <MenuOutlined className="text-xl" />}
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 bg-black/40 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation - Floating */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden fixed top-16 left-0 right-0 bg-white shadow-lg border border-gray-200 py-2 z-50"
        >
          <nav className="flex flex-col">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setMobileMenuOpen(false);
                  const targetPath = item.path;

                  if (location.pathname === targetPath) {
                    window.location.reload();
                  } else {
                    navigate(targetPath);
                  }
                }}
                className={`px-4 py-3 text-sm font-medium text-left cursor-pointer hover:bg-gray-50 ${
                  (item.key === 'latest' && !currentSort) || currentSort === item.key
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-500'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
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
