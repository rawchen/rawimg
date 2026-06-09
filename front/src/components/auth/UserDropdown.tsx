import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserOutlined, CrownOutlined, LogoutOutlined, SettingOutlined, HeartOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import type { SysUser } from '@/types';

interface UserDropdownProps {
  user: SysUser;
  onAvatarClick?: () => void;
}

export function UserDropdown({ user, onAvatarClick }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout, refreshUser, isRefreshing } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleRefresh = async () => {
    try {
      await refreshUser();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          onAvatarClick?.();
          setIsOpen(!isOpen);
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
        {/*{user.vip && (*/}
        {/*  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">*/}
        {/*    <CrownOutlined className="text-xs mr-1" />*/}
        {/*    VIP*/}
        {/*  </span>*/}
        {/*)}*/}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-black">{user.username}</span>
              {user.vip && user.vipLevel ? (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                      <CrownOutlined className="text-xs mr-1"/>
                  {user.vipLevel}
                </span>
              ) : (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                      <CrownOutlined className="text-xs mr-1"/>
                  非会员
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{user.email}</p>
              {/* VIP等级和积分 */}
              <div className="flex items-center justify-between pt-1">
                  {/* 下载次数显示 */}
                  {user.vip ? (
                    user.dailyDownloadLimit !== undefined && user.dailyDownloadLimit > 0 && (
                      <span className="text-xs text-gray-500">
                        今日下载: <span
                        className="font-medium text-black">{user.dailyDownloadCount || 0}/{user.dailyDownloadLimit}次</span>
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-gray-500">
                      今日下载: <span className="font-medium">0/0次</span>
                    </span>
                  )}
                  {/* 到期时间 */}
                  {user.vip && (
                    user.vipExpireTime && (
                      <span className="text-xs text-gray-500">
                        到期: <span className="inline-flex items-center text-xs text-black">
                        {new Date(user.vipExpireTime).toLocaleDateString()}
                        </span>
                      </span>
                    )
                  )}
                  {!user.vip && (
                    <span className="text-xs text-gray-500">
                    积分: <span className="font-medium text-black">{user.points}</span>
                  </span>
                  )}
                  {/*{user.vip && user.vipLevel && (*/}
                  {/*  <span*/}
                  {/*    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">*/}
                  {/*    <CrownOutlined className="text-xs mr-1"/>*/}
                  {/*    {user.vipLevel}*/}
                  {/*  </span>*/}
                  {/*)}*/}

                {/*</div>*/}
              {/*</div>*/}
              {/*<div className="flex items-center justify-between">*/}
              {/*    <span className="text-xs text-gray-500">*/}
              {/*        积分: <span className="font-medium text-black">{user.points}</span>*/}
              {/*      </span>*/}
              {/*</div>*/}
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/*<button*/}
            {/*  onClick={handleRefresh}*/}
            {/*  disabled={isRefreshing}*/}
            {/*  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"*/}
            {/*>*/}
            {/*  <ReloadOutlined className="text-base mr-3" spin={isRefreshing} />*/}
            {/*  刷新信息*/}
            {/*</button>*/}
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
      )}
    </div>
  );
}
