import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { UserOutlined, CrownOutlined, LogoutOutlined, SettingOutlined, HeartOutlined, WalletOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { balanceApi } from '@/api';
import type { SysUser } from '@/types';
import type { BalanceStats } from '@/api';

interface UserDropdownProps {
  user: SysUser;
  onAvatarClick?: () => void;
}

export function UserDropdown({ user, onAvatarClick }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ right: 0, top: 64 });
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { logout } = useAuth();

  const openDropdown = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
    updatePosition();
  };

  const closeDropdownWithDelay = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        right: window.innerWidth - rect.right - 8,
        top: rect.bottom + 16,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => updatePosition();
      window.addEventListener('scroll', handleScroll);
      // 加载余额信息
      loadBalanceStats();
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isOpen]);

  const loadBalanceStats = async () => {
    try {
      console.log('[UserDropdown] Loading balance stats...');
      const stats = await balanceApi.getStats();
      console.log('[UserDropdown] Balance stats loaded:', stats);
      setBalanceStats(stats);
    } catch (error: any) {
      console.error('[UserDropdown] Failed to load balance stats:', error);
      // 如果API失败，显示默认值而不是"加载中"
      setBalanceStats({
        userId: user.id,
        balance: 0,
        totalRecharged: 0,
        totalConsumed: 0,
        todayConsumed: 0,
        todayOperations: 0
      });
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF';

  return (
    <div
      className="relative"
      onMouseEnter={openDropdown}
      onMouseLeave={closeDropdownWithDelay}
    >
      <button
        ref={buttonRef}
        onClick={() => {
          onAvatarClick?.();
        }}
        className="flex items-center space-x-2 px-1 md:px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <UserOutlined className="text-sm text-white" />
          )}
        </div>
        <span className="text-sm font-medium text-gray-700 hidden md:flex">{user.username}</span>
      </button>

      {isOpen && createPortal(
        <div
          className="fixed z-[60]"
          style={{
            right: dropdownPosition.right,
            top: dropdownPosition.top,
          }}
          onMouseEnter={openDropdown}
          onMouseLeave={closeDropdownWithDelay}
        >
          <div className="w-56 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 py-2">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-black">{user.username}</span>
                {user.vip && user.vipLevel ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                    <CrownOutlined className="text-xs mr-1"/>
                    {user.vipLevel}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                    <CrownOutlined className="text-xs mr-1"/>
                    非会员
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{user.email}</p>

              {/* 余额信息 */}
              <div className="flex items-center justify-between pt-2">
                {balanceStats ? (
                  <>
                    <span className="text-xs text-gray-500">
                      今日用量: <span className="font-medium text-black">¥{(balanceStats.todayConsumed || 0).toFixed(2)}</span>
                    </span>
                    <span className="text-xs text-gray-500 flex items-center">
                      <WalletOutlined className="text-xs mr-1" />
                      余额: <span className="font-medium text-black ml-1">¥{(balanceStats.balance || 0).toFixed(2)}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">加载中...</span>
                )}
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <UserOutlined className="text-base mr-3" />
                个人中心
              </Link>
              <Link
                to="/favorites"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <HeartOutlined className="text-base mr-3" />
                我的收藏
              </Link>
              <Link
                to="/recharge"
                onClick={() => setIsOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <CrownOutlined className="text-base mr-3 text-yellow-500" />
                充值会员
              </Link>

              {/* Admin link */}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <SettingOutlined className="text-base mr-3" />
                  管理后台
                </Link>
              )}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 pt-1">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogoutOutlined className="text-base mr-3" />
                退出登录
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
