// Types for the LensLog application

/**
 * 统一响应结果类型
 */
export interface R<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

export interface SysUser {
  id: number;
  userId: number;
  username: string;
  nickname?: string;
  email: string;
  avatar?: string;
  role: 'ADMIN' | 'STAFF' | 'USER';
  vip: boolean;
  vipExpireTime?: string;
  vipLevel?: string;
  dailyDownloadCount?: number;
  dailyDownloadLimit?: number;
  points: number;
  createTime: string;
  lastLoginTime?: string;
  status: 'NORMAL' | 'BANNED';
}

export interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  email: string;
  avatar: string;
  role: string;
  vip: boolean;
  vipExpireTime: string;
  points: number;
}

export interface UserStats {
  userId: number;
  downloadCount: number;
  likeCount: number;
  favoriteCount: number;
  vipType: string;
  vipLevel?: string;
  vip: boolean;
  vipRemainingDays: number;
  dailyDownloadCount?: number;
  dailyDownloadLimit?: number;
}

export interface BalanceStats {
  userId: number;
  balance: number;
  totalRecharged: number;
  totalConsumed: number;
  todayConsumed: number;
  todayOperations: number;
}

export interface Gallery {
  id: number;
  title: string;
  description?: string;
  coverUrl: string;
  content?: string;
  status: 'DRAFT' | 'PUBLISHED';
  viewCount: number;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  downloadCount: number;
  downloadLink?: string;
  createTime: string;
}

export interface GalleryImage {
  id: number;
  url: string;
  description?: string;
  sortOrder: number;
}

/**
 * 图集图片DTO，用于编辑页面
 */
export interface GalleryImageDto {
  /** 图片ID（已有图片才有ID） */
  id?: number;
  /** 图片URL */
  url: string;
  /** 排序顺序 */
  sortOrder?: number;
  /** 描述 */
  description?: string;
  /** 是否预览图 */
  isPreview?: boolean;
  /** 操作类型：create（新增）, update（修改）, delete（删除） */
  operation?: 'create' | 'update' | 'delete';
}

export interface GalleryDetail extends Gallery {
  images: GalleryImage[];
  vip: boolean;
  locked: boolean;
  previewLimit: number;
  totalImageCount: number;
  liked: boolean;
  favorited: boolean;
}

export interface Comment {
  id: number;
  content: string;
  createTime: string;
  userId: number;
  username: string;
  avatar?: string;
  parentId?: number;
}

export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
  email: string;
  role: string;
  vip: boolean;
  vipExpireTime?: string;
  vipLevel?: string;
  dailyDownloadCount?: number;
  dailyDownloadLimit?: number;
  points: number;
  avatar?: string;
}

export interface PageResponse<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
  // 兼容旧格式
  content?: T[];
  totalPages?: number;
  totalElements?: number;
  currentPage?: number;
}

export interface Captcha {
  question: string;
  sessionId: string;
}

export interface DashboardStats {
  totalGalleries: number;
  totalUsers: number;
  totalVipUsers: number;
  yesterdayGalleries: number;
  yesterdayLikes: number;
  yesterdayComments: number;
  yesterdayUsers: number;
  uniqueVisitors30Days: number;
  totalAccess30Days: number;
}

export interface Order {
  id: number;
  orderNo: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  paymentMethod: 'ALIPAY' | 'WECHAT' | 'CARD_KEY';
  orderType: 'VIP' | 'POINTS';
  vipDays?: number;
  points?: number;
  createTime: string;
  payTime?: string;
  cardKeyId?: number;
  cardCode?: string;
  cardType?: string;
}

export interface CardKey {
  id: number;
  cardCode: string;
  cardType: string;
  cardTypeName: string;
  cardValue: number;
  amount: number;
  status: string;
  statusName: string;
  batchNo: string;
  usedBy: number | null;
  usedByUsername: string | null;
  usedAt: string | null;
  orderId: number | null;
  expireTime: string | null;
  remark: string | null;
  createTime: string;
}

export interface Feedback {
  id: number;
  userId: number;
  content: string;
  contact?: string;
  images?: string;
  status: number;
  reply?: string;
  username?: string;
  createTime: string;
}

// ============================================
// RawImg - RAW图片编辑器类型定义
// ============================================

/**
 * EXIF metadata extracted from RAW image
 */
export interface ExifData {
  make?: string;
  model?: string;
  lens?: string;
  focalLength?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  datetime?: string;
  width?: number;
  height?: number;
  orientation?: number;
  whiteBalance?: number;
  flash?: number;
  exposureMode?: string;  // 拍摄模式：手动、光圈优先、快门优先等
  meteringMode?: string;  // 测光模式
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
}

/**
 * Histogram data for RGB channels
 */
export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  luminance: number[];
}

/**
 * Point on a tone curve
 */
export interface CurvePoint {
  x: number;  // 0-255 input value
  y: number;  // 0-255 output value
}

/**
 * HSL adjustment for a specific color range
 */
export interface HSLAdjustment {
  color: 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta';
  hue: number;        // -100 to +100
  saturation: number; // -100 to +100
  luminance: number;  // -100 to +100
}

/**
 * Non-destructive edit parameters
 */
export interface EditParams {
  // Light adjustments
  exposure: number;          // -5 to +5, default 0
  contrast: number;         // -100 to +100, default 0
  highlights: number;       // -100 to +100, default 0
  shadows: number;          // -100 to +100, default 0
  whites: number;           // -100 to +100, default 0
  blacks: number;           // -100 to +100, default 0

  // Color adjustments
  temperature: number;       // 2000 to 50000 Kelvin, default 6500
  tint: number;             // -150 to +150, default 0
  vibrance: number;         // -100 to +100, default 0
  saturation: number;       // -100 to +100, default 0

  // Tone curves
  curves: {
    rgb: CurvePoint[];
    r: CurvePoint[];
    g: CurvePoint[];
    b: CurvePoint[];
  };

  // HSL adjustments
  hsl: {
    hue: HSLAdjustment[];
    saturation: HSLAdjustment[];
    luminance: HSLAdjustment[];
  };

  // Effects
  clarity: number;          // -100 to +100, default 0
  dehaze: number;          // -100 to +100, default 0
  texture: number;         // -100 to +100, default 0

  // Sharpening
  sharpening: {
    amount: number;         // 0-150, default 0
    radius: number;         // 0.5-3.0, default 1.0
    detail: number;         // 0-100, default 25
    masking: number;        // 0-100, default 0
  };

  // Noise reduction
  noiseReduction: {
    luminance: number;      // 0-100, default 0
    luminanceDetail: number;// 0-100, default 50
    luminanceContrast: number; // 0-100, default 50
    color: number;          // 0-100, default 0
    colorDetail: number;    // 0-100, default 50
    colorSmoothness: number;// 0-100, default 50
  };

  // Optics
  removeChromaticAberration: boolean;
  enableLensCorrection: boolean;
  distortion: number;       // -100 to +100, default 0
  vignette: number;         // -100 to +100, default 0

  // Effects - Vignette
  postCropVignette: {
    amount: number;         // -100 to +100, default 0
    midpoint: number;       // 0-100, default 50
    roundness: number;      // 0-100, default 50
    feather: number;        // 0-100, default 50
    highlights: number;     // 0-100, default 0
  };

  // Effects - Grain
  grain: {
    amount: number;         // 0-100, default 0
    size: number;           // 0-100, default 25
    roughness: number;      // 0-100, default 50
  };

  // Crop
  crop: CropParams;
}

/**
 * Default edit parameters
 */
export const DEFAULT_EDIT_PARAMS: EditParams = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 6500,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  curves: {
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    r: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    g: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    b: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  },
  hsl: {
    hue: [],
    saturation: [],
    luminance: [],
  },
  clarity: 0,
  dehaze: 0,
  texture: 0,
  sharpening: {
    amount: 0,
    radius: 1.0,
    detail: 25,
    masking: 0,
  },
  noiseReduction: {
    luminance: 0,
    luminanceDetail: 50,
    luminanceContrast: 50,
    color: 0,
    colorDetail: 50,
    colorSmoothness: 50,
  },
  removeChromaticAberration: false,
  enableLensCorrection: false,
  distortion: 0,
  vignette: 0,
  postCropVignette: {
    amount: 0,
    midpoint: 50,
    roundness: 50,
    feather: 50,
    highlights: 0,
  },
  grain: {
    amount: 0,
    size: 25,
    roughness: 50,
  },
  crop: {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    aspectRatio: null,
  },
};

/**
 * RAW image data structure
 */
export interface RawImage {
  id: string;
  filename: string;
  width: number;
  height: number;
  rgb16?: Float32Array;     // 16-bit linear RGB data (optional, may be in GPU texture)
  decodedData?: Uint8ClampedArray;  // Full resolution decoded RGBA data from WASM
  exif: ExifData;
  histogram?: HistogramData;
  thumbnail: string;        // Base64 thumbnail or data URL
  editParams: EditParams;
  isRaw: boolean;          // True if RAW file, false if JPEG/PNG
  loadedAt: number;        // Timestamp when loaded
}

/**
 * Export options for image export
 */
export interface ExportOptions {
  format: 'jpeg' | 'png' | 'tiff' | 'webp' | 'avif';
  quality: number;         // 1-100 for JPEG/WebP
  width?: number;          // Optional resize
  height?: number;         // Optional resize
  colorSpace: 'srgb' | 'adobe-rgb' | 'prophoto-rgb';
  bitDepth: 8 | 16;
  includeMetadata: boolean;
}

/**
 * 裁剪参数
 */
export interface CropParams {
  x: number;        // 裁剪区域左上角 x（相对于原图百分比 0-1）
  y: number;        // 裁剪区域左上角 y（相对于原图百分比 0-1）
  width: number;    // 裁剪宽度（百分比 0-1）
  height: number;   // 裁剪高度（百分比 0-1）
  aspectRatio: number | null;  // 锁定的宽高比，null 表示自由裁剪
}

/**
 * 尺寸调整参数
 */
export interface ResizeParams {
  width: number;           // 目标宽度（像素）
  height: number;          // 目标高度（像素）
  aspectLocked: boolean;   // 是否锁定宽高比
}

/**
 * 预设裁剪比例
 */
export interface AspectRatioPreset {
  label: string;
  value: number | null;  // null 表示自由裁剪
}

export const ASPECT_RATIOS: AspectRatioPreset[] = [
  { label: '自由', value: null },
  { label: '1:1', value: 1 },
  { label: '2:3', value: 2/3 },
  { label: '3:2', value: 3/2 },
  { label: '16:9', value: 16/9 },
  { label: '9:16', value: 9/16 },
  { label: '18:9', value: 18/9 },
];

/**
 * Editor state for UI
 */
export interface EditorUIState {
  zoom: number;            // 0.1 to 10 (10% to 1000%)
  panX: number;
  panY: number;
  showHistogram: boolean;
  showBeforeAfter: boolean;
  showingOriginal: boolean; // 是否正在显示原图（用于实时对比）
  activePanel: 'light' | 'color' | 'effects' | 'detail' | 'optics' | 'crop';
  isPanelCollapsed: boolean;
  isCropping: boolean;     // 是否处于裁剪模式
  cropPending: boolean;    // 标记需要执行裁剪操作
}

/**
 * White balance preset options
 */
export interface WhiteBalancePreset {
  label: string;
  value: number;
}

export const WHITE_BALANCE_PRESETS: WhiteBalancePreset[] = [
  { label: '原照设置', value: 6500 },
  { label: '日光', value: 5500 },
  { label: '阴影', value: 7500 },
  { label: '阴天', value: 6500 },
  { label: '钨丝灯', value: 2850 },
  { label: '荧光灯', value: 3800 },
  { label: '闪光灯', value: 5500 },
];

/**
 * Photo file for library view
 */
export interface PhotoFile {
  id: string;
  filename: string;
  file: File;
  thumbnail?: string;
  isRaw: boolean;
  exif?: ExifData;
  loadStatus: 'pending' | 'loading' | 'loaded' | 'error';
}
