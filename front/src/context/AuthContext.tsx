import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, userApi } from '@/api';
import type { AuthResponse, SysUser } from '@/types';
import { message } from "antd";

interface AuthContextType {
  user: SysUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  login: (token: string, user: AuthResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 清理过期的下载链接缓存
const cleanupExpiredDownloadLinks = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('download_link_')) {
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          const { expireAt } = JSON.parse(cached);
          if (Date.now() >= expireAt) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

// 同步读取 localStorage 初始状态
const getInitialState = () => {
  try {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      return {
        token: storedToken,
        user: JSON.parse(storedUser),
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { token: null, user: null };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(getInitialState);
  const [user, setUser] = useState<SysUser | null>(initialState.user);
  const [token, setToken] = useState<string | null>(initialState.token);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 页面加载时，清理过期缓存并刷新用户数据
  useEffect(() => {
    // 清理过期的下载链接缓存
    cleanupExpiredDownloadLinks();

    if (token && initialState.user) {
      refreshUser().catch(() => {
        // 如果刷新失败，继续使用本地缓存的数据
        console.log('Failed to refresh user data, using cached data');
      });
    }
  }, []);

  // 定时刷新用户数据（每5分钟）
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      refreshUser().catch(() => {
        // 静默失败，不影响用户体验
        console.log('Auto refresh failed');
      });
    }, 5 * 60 * 1000); // 5分钟

    return () => clearInterval(interval);
  }, [token]);

  const login = (newToken: string, userData: AuthResponse) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser({
      id: userData.userId,
      userId: userData.userId,
      username: userData.username,
      nickname: userData.username,
      email: userData.email,
      avatar: userData.avatar,
      role: userData.role as SysUser['role'],
      vip: userData.vip,
      vipExpireTime: userData.vipExpireTime,
      vipLevel: userData.vipLevel,
      dailyDownloadCount: userData.dailyDownloadCount,
      dailyDownloadLimit: userData.dailyDownloadLimit,
      points: userData.points,
      createTime: userData.createTime || '',
      status: 'NORMAL',
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;

    setIsRefreshing(true);
    try {
      const result = await userApi.getCurrentUser() as any;
      const userData = {
        id: result.id,
        userId: result.id,
        username: result.username,
        nickname: result.nickname,
        email: result.email,
        avatar: result.avatar,
        role: result.role as SysUser['role'],
        vip: result.vip,
        vipExpireTime: result.vipExpireTime,
        vipLevel: result.vipLevel,
        dailyDownloadCount: result.dailyDownloadCount,
        dailyDownloadLimit: result.dailyDownloadLimit,
        points: result.points,
        createTime: result.createTime || '',
        status: 'NORMAL' as const,
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      const isAuthError = error?.code === 401 || error?.response?.status === 401;
      if (isAuthError) {
        logout();
      } else {
        // 服务不可用时，静默失败，保留本地缓存的用户数据
        console.log('Failed to refresh user data, service might be unavailable:', error?.message);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isRefreshing,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
