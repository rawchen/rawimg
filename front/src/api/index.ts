import axios, { AxiosError } from 'axios';
import {
  AuthResponse,
  Captcha,
  Gallery,
  GalleryDetail,
  PageResponse,
  Comment,
  SysUser,
  CurrentUser,
  DashboardStats,
  Order,
  CardKey,
  R, UserStats, Feedback, GalleryImageDto
} from '@/types';
import { message } from "antd";

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response - 统一处理R类型响应
api.interceptors.response.use(
  (response) => {
    const data = response.data as R;
    // code === 0 表示成功，直接返回data.data
    if (data.code === 0) {
      // 返回 data.data，由具体 API 方法指定类型
      return data.data as any;
    } else {
      // 业务错误，抛出异常
      const error = new Error(data.msg || '请求失败') as Error & { code: number; msg: string };
      (error as any).code = data.code;
      (error as any).msg = data.msg;
      return Promise.reject(error);
    }
  },
  (error: AxiosError<R>) => {
    // HTTP错误或网络错误
    if (error.response?.data) {
      const data = error.response.data;
      const err = new Error(data.msg || '请求失败') as Error & { code: number; msg: string };
      (err as any).code = data.code || error.response.status;
      (err as any).msg = data.msg || '请求失败';
      
      // 401 未登录，清除token并跳转首页
      if (data.code === 401 || error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
      return Promise.reject(err);
    }
    
    // 网络错误等
    if (error.code === 'ECONNREFUSED') {
      message.error('服务器未运行，请检查服务器状态');
    } else if (error.code === 'ENOTFOUND') {
      message.error('域名解析失败');
    } else {
      message.error(error.message);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  getCaptcha: () => api.post<Captcha>('/auth/captcha') as unknown as Promise<Captcha>,

  sendRegisterEmailCode: (email: string) =>
    api.post<void>('/auth/send-email-code', { email }) as unknown as Promise<void>,

  register: (data: {
    username: string;
    email: string;
    password: string;
    captchaAnswer: string;
    captchaSessionId: string;
    emailCode: string;
  }) => api.post<AuthResponse>('/auth/register', data) as unknown as Promise<AuthResponse>,

  login: (data: {
    username: string;
    password: string;
    captchaAnswer: string;
    captchaSessionId: string;
  }) => api.post<AuthResponse>('/auth/login', data) as unknown as Promise<AuthResponse>,

  getCurrentUser: () => api.get<AuthResponse>('/auth/me') as unknown as Promise<AuthResponse>,

  logout: () => api.post<void>('/auth/logout') as unknown as Promise<void>,
};

// Gallery API
export const galleryApi = {
  getGalleries: (page = 1, size = 20, sortBy = 'latest') =>
    api.post<PageResponse<Gallery>>('/public/galleries', { page, size, sortBy }) as unknown as Promise<PageResponse<Gallery>>,

  getGalleryDetail: (id: number) =>
    api.get<GalleryDetail>(`/public/galleries/${id}`) as unknown as Promise<GalleryDetail>,

  getRecommendedGalleries: (id: number) =>
    api.get<Gallery[]>(`/public/galleries/${id}/recommend`) as unknown as Promise<Gallery[]>,

  toggleLike: (id: number) =>
    api.post<{ liked: boolean }>(`/galleries/${id}/like`) as unknown as Promise<{ liked: boolean }>,

  toggleFavorite: (id: number) =>
    api.post<{ favorited: boolean }>(`/galleries/${id}/favorite`) as unknown as Promise<{ favorited: boolean }>,

  download: (id: number) =>
    api.post<{ downloadLink: string }>(`/galleries/${id}/download`) as unknown as Promise<{ downloadLink: string }>,
};

// Comment API
export const commentApi = {
  getComments: (galleryId: number, page = 1, size = 20) =>
    api.get<PageResponse<Comment>>(`/public/galleries/${galleryId}/comments`, { params: { page, size } }) as unknown as Promise<PageResponse<Comment>>,

  createComment: (galleryId: number, content: string, captchaAnswer: string, captchaSessionId: string, parentId?: number) =>
    api.post<Comment>(`/galleries/${galleryId}/comments`, { content, captchaAnswer, captchaSessionId, parentId }) as unknown as Promise<Comment>,

  deleteComment: (id: number) =>
    api.delete<void>(`/comments/${id}`) as unknown as Promise<void>,
};

// User API
export const userApi = {
  getProfile: (id: number) => api.get<SysUser>(`/users/${id}`) as unknown as Promise<SysUser>,

  getCurrentUser: () => api.get<CurrentUser>('/users/me') as unknown as Promise<CurrentUser>,

  updateProfile: (data: { avatar?: string; email?: string }) =>
    api.put<SysUser>('/users/profile', data) as unknown as Promise<SysUser>,

  getFavorites: (id: number, page = 1, size = 20) =>
    api.get<PageResponse<Gallery>>(`/users/${id}/favorites`, { params: { page, size } }) as unknown as Promise<PageResponse<Gallery>>,

  getOrders: (page = 1, size = 20) =>
    api.get<PageResponse<Order>>('/users/orders', { params: { page, size } }) as unknown as Promise<PageResponse<Order>>,

  getStats: () => api.get<UserStats>('/users/stats') as unknown as Promise<UserStats>,

  sendEmailCode: (email: string) =>
    api.post<void>('/users/send-email-code', { email }) as unknown as Promise<void>,

  updateEmail: (email: string, code: string) =>
    api.put<SysUser>('/users/update-email', { email, code }) as unknown as Promise<SysUser>,

  updateNickname: (nickname: string) =>
    api.put<SysUser>('/users/update-nickname', { nickname }) as unknown as Promise<SysUser>,

  changePassword: (oldPassword: string, newPassword: string, confirmPassword: string) =>
    api.put<void>('/users/change-password', { oldPassword, newPassword, confirmPassword }) as unknown as Promise<void>,

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<string>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<string>;
  },

  uploadImageToOss: (file: File, folder = 'expand-temp/') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return api.post<string>('/upload/oss', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<string>;
  },
};

// Admin API
export const adminApi = {
  // Dashboard
  getDashboardStats: () => api.get<DashboardStats>('/admin/dashboard/stats') as unknown as Promise<DashboardStats>,
  getLikesChart: () => api.get<{ title: string; count: number }[]>('/admin/dashboard/charts/likes') as unknown as Promise<{ title: string; count: number }[]>,
  getFavoritesChart: () => api.get<{ title: string; count: number }[]>('/admin/dashboard/charts/favorites') as unknown as Promise<{ title: string; count: number }[]>,
  getViewsChart: () => api.get<{ title: string; count: number }[]>('/admin/dashboard/charts/views') as unknown as Promise<{ title: string; count: number }[]>,
  getTrendChart: () => api.get<{ date: string; views: number; downloads: number; likes: number; favorites: number }[]>('/admin/dashboard/charts/trend') as unknown as Promise<{ date: string; views: number; downloads: number; likes: number; favorites: number }[]>,
  getViewsTrendChart: () => api.get<{ date: string; views: number; downloads: number; likes: number; favorites: number }[]>('/admin/dashboard/charts/views-trend') as unknown as Promise<{ date: string; views: number; downloads: number; likes: number; favorites: number }[]>,

  // Galleries
  getAllGalleries: (page = 1, size = 10, title?: string, status?: string, sortBy?: string) =>
    api.get<PageResponse<Gallery>>('/admin/galleries', { params: { page, size, title, status, sortBy } }) as unknown as Promise<PageResponse<Gallery>>,

  getGalleryForEdit: (id: number) =>
    api.get<{
      id: number;
      title: string;
      description: string;
      coverUrl: string;
      content: string;
      downloadLink: string;
      status: string;
      images: GalleryImageDto[];
    }>(`/admin/galleries/${id}`) as unknown as Promise<{
      id: number;
      title: string;
      description: string;
      coverUrl: string;
      content: string;
      downloadLink: string;
      status: string;
      images: GalleryImageDto[];
    }>,

  createGallery: (data: {
    title: string;
    description?: string;
    coverUrl: string;
    content?: string;
    downloadLink?: string;
    images?: GalleryImageDto[];
    status?: string;
  }) => api.post<Gallery>('/admin/galleries', data) as unknown as Promise<Gallery>,

  updateGallery: (id: number, data: {
    title: string;
    description?: string;
    coverUrl: string;
    content?: string;
    downloadLink?: string;
    images?: GalleryImageDto[];
  }) =>
    api.put<Gallery>(`/admin/galleries/${id}`, data) as unknown as Promise<Gallery>,

  updateGalleryStatus: (id: number, status: string) =>
    api.put<Gallery>(`/admin/galleries/${id}/status`, null, { params: { status } }) as unknown as Promise<Gallery>,

  deleteGallery: (id: number) => api.delete<void>(`/admin/galleries/${id}`) as unknown as Promise<void>,

  // Users
  getAllUsers: (page = 1, size = 20, role?: string) =>
    api.get<PageResponse<SysUser>>('/admin/users', { params: { page, size, role } }) as unknown as Promise<PageResponse<SysUser>>,

  updateUserRole: (id: number, role: string) =>
    api.put<SysUser>(`/admin/users/${id}/role`, null, { params: { role } }) as unknown as Promise<SysUser>,

  updateUserStatus: (id: number, status: string) =>
    api.put<SysUser>(`/admin/users/${id}/status`, null, { params: { status } }) as unknown as Promise<SysUser>,

  // Config
  getConfigs: () => api.get<{ configKey: string; configValue: string; configType: string; description: string; id: number }[]>('/admin/config') as unknown as Promise<{ configKey: string; configValue: string; configType: string; description: string; id: number }[]>,
  setConfig: (key: string, value: string, type: string, description?: string) =>
    api.post<void>('/admin/config', { key, value, type, description }) as unknown as Promise<void>,

  // Comments
  getAllComments: (page = 1, size = 20, userId?: number, galleryId?: number) =>
    api.get<PageResponse<{ id: number; userId: number; galleryId: number; content: string; createTime: string; parentId?: number }>>('/admin/comments', { params: { page, size, userId, galleryId } }) as unknown as Promise<PageResponse<{ id: number; userId: number; galleryId: number; content: string; createTime: string; parentId?: number }>>,

  deleteCommentAdmin: (id: number) =>
    api.delete<void>(`/admin/comments/${id}`) as unknown as Promise<void>,

  // Orders
  getAllOrders: (page = 1, size = 20, status?: string, orderType?: string) =>
    api.get<PageResponse<Order & { id: number; username: string; email: string; transactionId: string; payTime: string }>>('/admin/orders', { params: { page, size, status, orderType } }) as unknown as Promise<PageResponse<Order & { id: number; username: string; email: string; transactionId: string; payTime: string }>>,

  updateOrderStatus: (id: number, status: string) =>
    api.put<Order>(`/admin/orders/${id}/status`, null, { params: { status } }) as unknown as Promise<Order>,

  // Logs
  getAccessLogs: (page = 1, size = 20, action?: string, userId?: number, galleryId?: number) =>
    api.get<PageResponse<{ id: number; userId: number; galleryId: number; ip: string; region: string; userAgent: string; action: string; createTime: string }>>('/admin/logs', { params: { page, size, action, userId, galleryId } }) as unknown as Promise<PageResponse<{ id: number; userId: number; galleryId: number; ip: string; region: string; userAgent: string; action: string; createTime: string }>>,

  deleteLog: (id: number) =>
    api.delete<void>(`/admin/logs/${id}`) as unknown as Promise<void>,

  clearLogs: (days?: number) =>
    api.delete<void>('/admin/logs/clear', { params: { days } }) as unknown as Promise<void>,

  // User Actions
  getUserActions: (page = 1, size = 20, actionType?: string, userId?: number, galleryId?: number) =>
    api.get<PageResponse<{ id: number; userId: number; galleryId: number; actionType: string; createTime: string }>>('/admin/user-actions', { params: { page, size, actionType, userId, galleryId } }) as unknown as Promise<PageResponse<{ id: number; userId: number; galleryId: number; actionType: string; createTime: string }>>,

  deleteUserAction: (id: number) =>
    api.delete<void>(`/admin/user-actions/${id}`) as unknown as Promise<void>,

  clearUserActions: (actionType?: string, days?: number) =>
    api.delete<void>('/admin/user-actions/clear', { params: { actionType, days } }) as unknown as Promise<void>,

  // Upload
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<string>('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<string>;
  },

  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return api.post<string[]>('/admin/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<string[]>;
  },

  // Card Keys
  getCardKeys: (page = 1, size = 10, status?: string, cardType?: string, batchNo?: string) =>
    api.get<PageResponse<CardKey>>('/admin/card-keys', { params: { page, size, status, cardType, batchNo } }) as unknown as Promise<PageResponse<CardKey>>,

  generateCardKeys: (cardType: string, cardValue: number, amount: number, quantity: number, expireDays?: number, remark?: string) =>
    api.post<CardKey[]>('/admin/card-keys/generate', null, { params: { cardType, cardValue, amount, quantity, expireDays, remark } }) as unknown as Promise<CardKey[]>,

  invalidateCardKey: (id: number) =>
    api.put<void>(`/admin/card-keys/${id}/invalidate`) as unknown as Promise<void>,

  getCardKeyBatchNos: () =>
    api.get<string[]>('/admin/card-keys/batch-nos') as unknown as Promise<string[]>,

  getCardKeyStats: () =>
    api.get<{ unusedCount: number; usedCount: number; expiredCount: number; totalCount: number }>('/admin/card-keys/stats') as unknown as Promise<{ unusedCount: number; usedCount: number; expiredCount: number; totalCount: number }>,

  // VIP Packages
  getVipPackages: () =>
    api.get<{ id: number; packageCode: string; packageName: string; days: number; dailyDownloadCount: number; price: number; sortOrder: number; popular: boolean; enabled: boolean; purchaseUrl: string; description: string }[]>('/admin/vip-packages') as unknown as Promise<{ id: number; packageCode: string; packageName: string; days: number; dailyDownloadCount: number; price: number; sortOrder: number; popular: boolean; enabled: boolean; purchaseUrl: string; description: string }[]>,

  createVipPackage: (data: { packageCode: string; packageName: string; days: number; dailyDownloadCount: number; price: number; sortOrder?: number; popular?: boolean; enabled?: boolean; purchaseUrl?: string; description?: string }) =>
    api.post<{ id: number; packageCode: string; packageName: string }>('/admin/vip-packages', data) as unknown as Promise<{ id: number; packageCode: string; packageName: string }>,

  updateVipPackage: (id: number, data: { packageCode?: string; packageName?: string; days?: number; dailyDownloadCount?: number; price?: number; sortOrder?: number; popular?: boolean; enabled?: boolean; purchaseUrl?: string; description?: string }) =>
    api.put<{ id: number; packageCode: string; packageName: string }>(`/admin/vip-packages/${id}`, data) as unknown as Promise<{ id: number; packageCode: string; packageName: string }>,

  deleteVipPackage: (id: number) =>
    api.delete<void>(`/admin/vip-packages/${id}`) as unknown as Promise<void>,

  toggleVipPackageEnabled: (id: number) =>
    api.put<void>(`/admin/vip-packages/${id}/toggle`) as unknown as Promise<void>,
};

// VIP Package API (public)
export const vipPackageApi = {
  getEnabledPackages: () =>
    api.get<{ id: number; packageCode: string; packageName: string; days: number; dailyDownloadCount: number; price: number; sortOrder: number; popular: boolean; purchaseUrl: string; description: string }[]>('/public/vip-packages') as unknown as Promise<{ id: number; packageCode: string; packageName: string; days: number; dailyDownloadCount: number; price: number; sortOrder: number; popular: boolean; purchaseUrl: string; description: string }[]>,
};

// Config API
export const configApi = {
  getPublicConfig: () => api.get<{
    siteTitle: string;
    siteDescription: string;
    freePreviewLimit: string;
    cardKeyPurchaseUrl: string;
  }>('/public/config') as unknown as Promise<{
    siteTitle: string;
    siteDescription: string;
    freePreviewLimit: string;
    cardKeyPurchaseUrl: string;
  }>,
};

// Order API
export const orderApi = {
  createVipOrder: (days: number, paymentMethod: 'ALIPAY' | 'WECHAT') =>
    api.post<Order>('/orders/vip', { days, paymentMethod }) as unknown as Promise<Order>,

  createPointsOrder: (points: number, paymentMethod: 'ALIPAY' | 'WECHAT') =>
    api.post<Order>('/orders/points', { points, paymentMethod }) as unknown as Promise<Order>,

  getOrderStatus: (orderNo: string) =>
    api.get<Order>(`/orders/${orderNo}/status`) as unknown as Promise<Order>,
};

// Card Key API
export const cardKeyApi = {
  // 用户端 - 兑换卡密
  redeemCardKey: (cardCode: string) =>
    api.post<{ orderNo: string; orderType: string; amount: number; vipDays?: number; points?: number; message: string }>(
      '/card-keys/redeem', { cardCode }
    ) as unknown as Promise<{ orderNo: string; orderType: string; amount: number; vipDays?: number; points?: number; message: string }>,

  // 用户端 - 验证卡密
  validateCardKey: (cardCode: string) =>
    api.post<{ cardType: string; cardTypeName: string; cardValue: number; amount: number; status: string; expireTime: string | null }>(
      '/card-keys/validate', { cardCode }
    ) as unknown as Promise<{ cardType: string; cardTypeName: string; cardValue: number; amount: number; status: string; expireTime: string | null }>,
};

// RAW Image API
export const rawImageApi = {
  // 提取 RAW 文件预览图
  extractPreview: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{
      previewUrl: string;
      filename: string;
      width: number;
      height: number;
      isRaw: boolean;
      exif: Record<string, unknown>;
    }>('/raw/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<{
      previewUrl: string;
      filename: string;
      width: number;
      height: number;
      isRaw: boolean;
      exif: Record<string, unknown>;
    }>;
  },
};

// Feedback API
export const feedbackApi = {
  createFeedback: (data: { content: string; contact?: string; images?: string }) =>
    api.post<Feedback>('/feedback', data) as unknown as Promise<Feedback>,

  getFeedbackList: (page = 1, size = 20, status?: number) =>
    api.get<PageResponse<Feedback>>('/admin/feedback', { params: { page, size, status } }) as unknown as Promise<PageResponse<Feedback>>,

  deleteFeedback: (id: number) =>
    api.delete<void>(`/admin/feedback/${id}`) as unknown as Promise<void>,

  updateFeedbackStatus: (id: number, status: number, reply?: string) =>
    api.put<void>(`/admin/feedback/${id}/status`, null, { params: { status, reply } }) as unknown as Promise<void>,
};

// Image Enhance API
export const imageEnhanceApi = {
  enhanceImage: (file: File, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return api.post<{
      originalFilename: string;
      enhancedUrl: string;
      category: string;
    }>('/image-enhance/enhance', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<{
      originalFilename: string;
      enhancedUrl: string;
      category: string;
    }>;
  },
};

// Image Remove API
export const imageRemoveApi = {
  removeObjects: (file: File, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return api.post<{
      originalFilename: string;
      removedUrl: string;
      category: string;
    }>('/image-remove/remove', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<{
      originalFilename: string;
      removedUrl: string;
      category: string;
    }>;
  },
};

// Image Matting API
export const imageMattingApi = {
  // 异步抠图
  mattingImageAsync: (originalImageUrl: string, subject: string, bgColor: string, model: string = 'gpt-image-2') => {
    const params = new URLSearchParams();
    params.append('originalImageUrl', originalImageUrl);
    params.append('subject', subject);
    params.append('bgColor', bgColor);
    params.append('model', model);
    return api.post<{ taskId: string; model: string }>('/image-matting/matting_async', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }) as unknown as Promise<{ taskId: string; model: string }>;
  },

  // 查询任务结果
  getTaskResult: (taskId: string) =>
    api.get<{
      status: 'pending' | 'done' | 'error' | 'not_found';
      imageUrl?: string;
      originalImageUrl?: string;
      msg?: string;
    }>('/image-matting/result', { params: { id: taskId } }) as unknown as Promise<{
      status: 'pending' | 'done' | 'error' | 'not_found';
      imageUrl?: string;
      originalImageUrl?: string;
      msg?: string;
    }>,

  // 获取历史记录
  getHistory: (page = 1, size = 12, status?: string) =>
    api.get<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>('/image-matting/history', { params: { page, size, status } }) as unknown as Promise<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>,

  // 获取任务详情
  getTaskDetail: (taskId: string) =>
    api.get<ImageTaskRecord>(`/image-matting/task/${taskId}`) as unknown as Promise<ImageTaskRecord>,
};

// Image Expand API
export const imageExpandApi = {
  // 异步扩展图片
  expandImageAsync: (originalImageUrl: string, maskImageUrl: string, size: string, model: string = 'gpt-image-2') => {
    const params = new URLSearchParams();
    params.append('originalImageUrl', originalImageUrl);
    params.append('maskImageUrl', maskImageUrl);
    params.append('size', size);
    params.append('model', model);
    return api.post<{ taskId: string; model: string }>('/image-expand/expand_async', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }) as unknown as Promise<{ taskId: string; model: string }>;
  },

  // 查询任务结果
  getTaskResult: (taskId: string) =>
    api.get<{
      status: 'pending' | 'done' | 'error' | 'not_found';
      imageUrl?: string;
      originalImageUrl?: string;
      maskImageUrl?: string;
      msg?: string;
    }>('/image-expand/result', { params: { id: taskId } }) as unknown as Promise<{
      status: 'pending' | 'done' | 'error' | 'not_found';
      imageUrl?: string;
      originalImageUrl?: string;
      maskImageUrl?: string;
      msg?: string;
    }>,

  // 获取历史记录
  getHistory: (page = 1, size = 12, status?: string) =>
    api.get<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>('/image-expand/history', { params: { page, size, status } }) as unknown as Promise<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>,

  // 获取任务详情
  getTaskDetail: (taskId: string) =>
    api.get<ImageTaskRecord>(`/image-expand/task/${taskId}`) as unknown as Promise<ImageTaskRecord>,
};

// Image Create API
export const imageCreateApi = {
  createImage: (files: File[], prompt: string, size: string) => {
    const formData = new FormData();
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }
    formData.append('prompt', prompt);
    formData.append('size', size);
    return api.post<{
      createdUrl: string;
      prompt: string;
      size: string;
    }>('/image-create/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<{
      createdUrl: string;
      prompt: string;
      size: string;
    }>;
  },

  // 异步创建图片（旧版本，已废弃）
  createImageAsync: (files: File[], prompt: string, size: string) => {
    const formData = new FormData();
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }
    formData.append('prompt', prompt);
    formData.append('size', size);
    return api.post<{ taskId: string }>('/image-create/create_async', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<{ taskId: string }>;
  },

  // 异步创建图片 - 通过OSS URL（推荐）
  createImageAsyncWithUrls: (referenceUrls: string | undefined, prompt: string, size: string) => {
    const params = new URLSearchParams();
    if (referenceUrls) {
      params.append('referenceUrls', referenceUrls);
    }
    params.append('prompt', prompt);
    params.append('size', size);
    return api.post<{ taskId: string }>('/image-create/create_async', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }) as unknown as Promise<{ taskId: string }>;
  },

  // 查询任务结果
  getTaskResult: (taskId: string) =>
    api.get<{
      status: 'pending' | 'done' | 'error' | 'not_found';
      imageUrl?: string;
      msg?: string;
    }>('/image-create/result', { params: { id: taskId } }) as unknown as Promise<{
      status: 'pending' | 'done' | 'error' | 'not_found';
      imageUrl?: string;
      msg?: string;
    }>,

  // 获取任务图片
  getTaskImage: (taskId: string) =>
    api.get<{
      taskId: string;
      imageUrl: string;
      prompt: string;
    }>('/image-create/image', { params: { id: taskId } }) as unknown as Promise<{
      taskId: string;
      imageUrl: string;
      prompt: string;
    }>,

  // 获取用户的任务历史
  getHistory: (page = 1, size = 10, taskType?: string, status?: string) =>
    api.get<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>('/image-create/history', { params: { page, size, taskType, status } }) as unknown as Promise<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>,

  // 获取任务详情
  getTaskDetail: (taskId: string) =>
    api.get<ImageTaskRecord>(`/image-create/task/${taskId}`) as unknown as Promise<ImageTaskRecord>,

  getTemplates: (category?: string) =>
    api.get<{
      id: number;
      title: string;
      prompt: string;
      category: string;
      imageUrl: string | null;
      sortOrder: number;
    }[]>('/image-create/templates', { params: { category } }) as unknown as Promise<{
      id: number;
      title: string;
      prompt: string;
      category: string;
      imageUrl: string | null;
      sortOrder: number;
    }[]>,

  getRandomTemplates: (count = 10) =>
    api.get<{
      id: number;
      title: string;
      prompt: string;
      category: string;
      imageUrl: string | null;
      sortOrder: number;
    }[]>('/image-create/templates/random', { params: { count } }) as unknown as Promise<{
      id: number;
      title: string;
      prompt: string;
      category: string;
      imageUrl: string | null;
      sortOrder: number;
    }[]>,

  getCategories: () =>
    api.get<string[]>('/image-create/categories') as unknown as Promise<string[]>,
};

// OSS API
export const ossApi = {
  getStsToken: () =>
    api.get<{
      accessKeyId: string;
      accessKeySecret: string;
      securityToken: string;
      expiration: string;
      endpoint: string;
      bucketName: string;
      customDomain: string;
      uploadFolder: string;
      region: string;
    }>('/oss/sts-token') as unknown as Promise<{
      accessKeyId: string;
      accessKeySecret: string;
      securityToken: string;
      expiration: string;
      endpoint: string;
      bucketName: string;
      customDomain: string;
      uploadFolder: string;
      region: string;
    }>,
};

// Inspiration Admin API
export const inspirationAdminApi = {
  list: (page = 1, size = 10, title?: string, category?: string) =>
    api.get<{
      records: InspirationTemplate[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>('/admin/inspiration/list', { params: { page, size, title, category } }) as unknown as Promise<{
      records: InspirationTemplate[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>,

  get: (id: number) =>
    api.get<InspirationTemplate>(`/admin/inspiration/${id}`) as unknown as Promise<InspirationTemplate>,

  add: (data: Partial<InspirationTemplate>) =>
    api.post<InspirationTemplate>('/admin/inspiration', data) as unknown as Promise<InspirationTemplate>,

  update: (id: number, data: Partial<InspirationTemplate>) =>
    api.put<InspirationTemplate>(`/admin/inspiration/${id}`, data) as unknown as Promise<InspirationTemplate>,

  delete: (id: number) =>
    api.delete<void>(`/admin/inspiration/${id}`) as unknown as Promise<void>,

  deleteBatch: (ids: number[]) =>
    api.delete<void>('/admin/inspiration/batch', { data: ids }) as unknown as Promise<void>,
};

// Admin Image Task API
export const adminImageTaskApi = {
  list: (page = 1, size = 20, userId?: number, taskType?: string, status?: string) =>
    api.get<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>('/admin/image-tasks/list', { params: { page, size, userId, taskType, status } }) as unknown as Promise<{
      records: ImageTaskRecord[];
      total: number;
      pages: number;
      current: number;
      size: number;
    }>,

  get: (taskId: string) =>
    api.get<ImageTaskRecord>(`/admin/image-tasks/${taskId}`) as unknown as Promise<ImageTaskRecord>,

  delete: (taskId: string) =>
    api.delete<void>(`/admin/image-tasks/${taskId}`) as unknown as Promise<void>,

  deleteBatch: (taskIds: string[]) =>
    api.delete<void>('/admin/image-tasks/batch', { data: taskIds }) as unknown as Promise<void>,

  getStats: () =>
    api.get<{ total: number; pending: number; done: number; error: number }>('/admin/image-tasks/stats') as unknown as Promise<{ total: number; pending: number; done: number; error: number }>,
};

interface InspirationTemplate {
  id: number;
  title: string;
  prompt: string;
  category: string;
  imageUrl: string | null;
  sortOrder: number;
  createTime?: string;
  updateTime?: string;
}

// 图像任务记录类型
export interface ImageTaskRecord {
  id: number;
  taskId: string;
  userId: number;
  taskType: string;
  status: string;
  prompt: string;
  size: string;
  referenceImageUrls: string | null;
  originalImageUrl: string | null;
  maskImageUrl: string | null;
  model: string | null;
  resultImageUrl: string | null;
  errorMsg: string | null;
  duration: number | null;
  createTime: string;
  updateTime: string;
}

export default api;
