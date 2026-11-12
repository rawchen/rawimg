import { useEffect, useState } from 'react';
import { configApi } from '@/api';
import type { PublicConfig } from '@/api';

let cachedConfig: PublicConfig | null = null;
let pendingRequest: Promise<PublicConfig> | null = null;

/**
 * 加载公共配置（全局仅请求一次，多个组件共享）
 */
export function loadPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) {
    return Promise.resolve(cachedConfig);
  }
  if (!pendingRequest) {
    pendingRequest = configApi
      .getPublicConfig()
      .then((config) => {
        cachedConfig = config;
        return config;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
}

/**
 * 清除配置缓存（如后台修改配置后可调用）
 */
export function clearPublicConfigCache() {
  cachedConfig = null;
  pendingRequest = null;
}

/**
 * 获取公共配置（如站点标题、备案号等）
 */
export function usePublicConfig(): PublicConfig | null {
  const [config, setConfig] = useState<PublicConfig | null>(cachedConfig);

  useEffect(() => {
    let mounted = true;
    loadPublicConfig()
      .then((data) => {
        if (mounted) {
          setConfig(data);
        }
      })
      .catch(() => {
        // 公共配置加载失败时静默处理，不影响页面展示
      });
    return () => {
      mounted = false;
    };
  }, []);

  return config;
}
