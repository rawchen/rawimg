import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { EditParams, RawImage, EditorUIState, CropParams, DEFAULT_EDIT_PARAMS } from '@/types';

// Create thumbnail from pixel data
const createThumbnailFromData = (data: Uint8ClampedArray, width: number, height: number): string => {
  const maxSize = 200;
  const scale = Math.min(maxSize / width, maxSize / height);
  const thumbWidth = Math.round(width * scale);
  const thumbHeight = Math.round(height * scale);

  // Create canvas for thumbnail
  const canvas = document.createElement('canvas');
  canvas.width = thumbWidth;
  canvas.height = thumbHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Create ImageData from source
  const imageData = new ImageData(data, width, height);

  // Create temporary canvas for source data
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return '';

  srcCtx.putImageData(imageData, 0, 0);

  // Draw scaled version
  ctx.drawImage(srcCanvas, 0, 0, thumbWidth, thumbHeight);

  return canvas.toDataURL('image/jpeg', 0.8);
};

// Clone edit params for history
const cloneParams = (params: EditParams): EditParams => {
  return JSON.parse(JSON.stringify(params));
};

interface EditorState {
  // Current image
  currentImage: RawImage | null;

  // Edit parameters (current state)
  params: EditParams;

  // History for undo/redo
  history: EditParams[];
  historyIndex: number;
  maxHistorySize: number;

  // UI State
  ui: EditorUIState;

  // Loading states
  isLoading: boolean;
  isProcessing: boolean;

  // Actions - Image
  setCurrentImage: (image: RawImage | null) => void;

  // Actions - Parameters
  setParam: <K extends keyof EditParams>(key: K, value: EditParams[K]) => void;
  setNestedParam: <K extends keyof EditParams, SK extends keyof EditParams[K]>(
    key: K,
    subKey: SK,
    value: EditParams[K][SK]
  ) => void;
  resetParams: () => void;
  resetParam: <K extends keyof EditParams>(key: K) => void;

  // Actions - History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;

  // Actions - UI
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleHistogram: () => void;
  toggleBeforeAfter: () => void;
  setActivePanel: (panel: EditorUIState['activePanel']) => void;
  togglePanelCollapse: () => void;
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  zoomTo100: () => void;
  setShowingOriginal: (showing: boolean) => void;
  setCropping: (cropping: boolean) => void;

  // Actions - Crop
  setCrop: (crop: CropParams) => void;
  setCropAspectRatio: (aspectRatio: number | null) => void;
  resetCrop: () => void;
  applyCrop: () => void;  // Request crop, EditorCanvas will execute
  completeCrop: (croppedData: Uint8ClampedArray, width: number, height: number) => void;  // Called by EditorCanvas after crop

  // Actions - Loading
  setLoading: (loading: boolean) => void;
  setProcessing: (processing: boolean) => void;
}

const DEFAULT_UI_STATE: EditorUIState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  showHistogram: true,
  showBeforeAfter: false,
  showingOriginal: false,
  activePanel: 'light',
  isPanelCollapsed: false,
  isCropping: false,
  cropPending: false,  // Flag to trigger crop operation in EditorCanvas
};

// Import default params from types
const defaultEditParams: EditParams = {
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

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentImage: null,
    params: defaultEditParams,
    history: [cloneParams(defaultEditParams)],
    historyIndex: 0,
    maxHistorySize: 100,
    ui: DEFAULT_UI_STATE,
    isLoading: false,
    isProcessing: false,

    // Image actions
    setCurrentImage: (image) => {
      set({
        currentImage: image,
        params: image ? cloneParams(image.editParams) : defaultEditParams,
        history: [cloneParams(image ? image.editParams : defaultEditParams)],
        historyIndex: 0,
      });
      // Fit to screen when loading new image
      if (image) {
        get().fitToScreen();
      }
    },

    // Parameter actions
    setParam: (key, value) => {
      const state = get();
      set((state) => ({
        params: { ...state.params, [key]: value },
      }));
    },

    setNestedParam: (key, subKey, value) => {
      set((state) => ({
        params: {
          ...state.params,
          [key]: {
            ...(state.params[key] as object),
            [subKey]: value,
          },
        },
      }));
    },

    resetParams: () => {
      get().pushHistory();
      set({ params: defaultEditParams });
    },

    resetParam: (key) => {
      get().pushHistory();
      set((state) => ({
        params: { ...state.params, [key]: defaultEditParams[key] },
      }));
    },

    // History actions
    pushHistory: () => {
      const state = get();
      const newHistory = [...state.history];
      // Remove any redo states
      newHistory.splice(state.historyIndex + 1);
      // Add current state
      newHistory.push(cloneParams(state.params));
      // Limit history size
      if (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      }
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1
      });
    },

    undo: () => {
      const state = get();
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        set({
          params: cloneParams(state.history[newIndex]),
          historyIndex: newIndex
        });
      }
    },

    redo: () => {
      const state = get();
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        set({
          params: cloneParams(state.history[newIndex]),
          historyIndex: newIndex
        });
      }
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    // UI actions
    setZoom: (zoom) => {
      set((state) => ({
        ui: { ...state.ui, zoom: Math.max(0.1, Math.min(10, zoom)) }
      }));
    },

    setPan: (x, y) => {
      set((state) => ({
        ui: { ...state.ui, panX: x, panY: y }
      }));
    },

    toggleHistogram: () => {
      set((state) => ({
        ui: { ...state.ui, showHistogram: !state.ui.showHistogram }
      }));
    },

    toggleBeforeAfter: () => {
      set((state) => ({
        ui: { ...state.ui, showBeforeAfter: !state.ui.showBeforeAfter }
      }));
    },

    setActivePanel: (panel) => {
      set((state) => ({
        ui: { ...state.ui, activePanel: panel }
      }));
    },

    togglePanelCollapse: () => {
      set((state) => ({
        ui: { ...state.ui, isPanelCollapsed: !state.ui.isPanelCollapsed }
      }));
    },

    fitToScreen: () => {
      const state = get();
      if (!state.currentImage) return;
      // Will be calculated by canvas component
      set((state) => ({
        ui: { ...state.ui, zoom: 1, panX: 0, panY: 0 }
      }));
    },

    zoomIn: () => {
      const state = get();
      const newZoom = Math.min(10, state.ui.zoom * 1.25);
      set((state) => ({
        ui: { ...state.ui, zoom: newZoom }
      }));
    },

    zoomOut: () => {
      const state = get();
      const newZoom = Math.max(0.1, state.ui.zoom / 1.25);
      set((state) => ({
        ui: { ...state.ui, zoom: newZoom }
      }));
    },

    zoomTo: (zoom) => {
      set((state) => ({
        ui: { ...state.ui, zoom: Math.max(0.1, Math.min(10, zoom)) }
      }));
    },

    zoomTo100: () => {
      set((state) => ({
        ui: { ...state.ui, zoom: 1 }
      }));
    },

    setShowingOriginal: (showing) => {
      set((state) => ({
        ui: { ...state.ui, showingOriginal: showing }
      }));
    },

    setCropping: (cropping) => {
      set((state) => ({
        ui: { ...state.ui, isCropping: cropping }
      }));
    },

    // Crop actions
    setCrop: (crop) => {
      set((state) => ({
        params: { ...state.params, crop }
      }));
    },

    setCropAspectRatio: (aspectRatio) => {
      const state = get();
      const image = state.currentImage;

      if (aspectRatio === null) {
        // 自由裁剪，保持当前裁剪区域
        set((state) => ({
          params: {
            ...state.params,
            crop: { ...state.params.crop, aspectRatio: null }
          }
        }));
        return;
      }

      // 计算保持目标宽高比的最大裁剪区域
      // 图片宽高比 = width / height
      const imageAspect = image ? image.width / image.height : 1;

      // 裁剪区域必须满足: width/height = targetAspect（考虑图片实际尺寸）
      // 即: (w * imageWidth) / (h * imageHeight) = targetAspect
      // 简化: w / h = targetAspect * imageHeight / imageWidth = targetAspect / imageAspect

      // 方案1: 高度填满（h = 1）
      // w = targetAspect / imageAspect
      // 如果 w <= 1，方案可行
      const width1 = aspectRatio / imageAspect;

      // 方案2: 宽度填满（w = 1）
      // h = imageAspect / aspectRatio
      // 如果 h <= 1，方案可行
      const height2 = imageAspect / aspectRatio;

      let newWidth: number;
      let newHeight: number;

      if (width1 <= 1) {
        // 方案1可行：高度填满
        newWidth = width1;
        newHeight = 1;
      } else {
        // 方案2：宽度填满
        newWidth = 1;
        newHeight = height2;
      }

      // 居中裁剪
      const newX = (1 - newWidth) / 2;
      const newY = (1 - newHeight) / 2;

      console.log('setCropAspectRatio:', {
        aspectRatio,
        imageAspect,
        width1,
        height2,
        selected: { w: newWidth, h: newHeight },
        actualRatio: newWidth / newHeight,
        pixelSize: {
          w: Math.round(newWidth * (image?.width || 0)),
          h: Math.round(newHeight * (image?.height || 0))
        }
      });

      set((state) => ({
        params: {
          ...state.params,
          crop: {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            aspectRatio
          }
        }
      }));
    },

    resetCrop: () => {
      set((state) => ({
        params: {
          ...state.params,
          crop: {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            aspectRatio: null
          }
        }
      }));
    },

    applyCrop: () => {
      // 设置裁剪待执行标志，EditorCanvas 会监听并执行实际裁剪
      set((state) => ({
        ui: { ...state.ui, cropPending: true }
      }));
    },

    completeCrop: (croppedData: Uint8ClampedArray, newWidth: number, newHeight: number) => {
      const state = get();
      const image = state.currentImage;

      if (!image) return;

      // 创建裁剪后的图像对象
      const croppedImage: RawImage = {
        ...image,
        width: newWidth,
        height: newHeight,
        decodedData: croppedData,
        // 生成新的缩略图
        thumbnail: createThumbnailFromData(croppedData, newWidth, newHeight),
        editParams: {
          ...image.editParams,
          crop: {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            aspectRatio: null
          }
        }
      };

      // 保存历史并更新图像
      get().pushHistory();
      set({
        currentImage: croppedImage,
        params: {
          ...state.params,
          crop: {
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            aspectRatio: null
          }
        },
        ui: { ...state.ui, cropPending: false }
      });
      get().fitToScreen();
    },

    // Loading actions
    setLoading: (loading) => set({ isLoading: loading }),
    setProcessing: (processing) => set({ isProcessing: processing }),
  }))
);

// Export selectors for component use
export const selectParams = (state: EditorState) => state.params;
export const selectUI = (state: EditorState) => state.ui;
export const selectCurrentImage = (state: EditorState) => state.currentImage;
export const selectCanUndo = (state: EditorState) => state.historyIndex > 0;
export const selectCanRedo = (state: EditorState) => state.historyIndex < state.history.length - 1;
