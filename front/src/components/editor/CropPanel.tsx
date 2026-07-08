import React, { useState, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { ASPECT_RATIOS } from '@/types';
import { LockOutlined, UnlockOutlined, ReloadOutlined } from '@ant-design/icons';

export function CropPanel() {
  const {
    currentImage,
    params,
    setCrop,
    setCropAspectRatio,
    resetCrop,
    ui,
    applyCrop
  } = useEditorStore();

  const [aspectLocked, setAspectLocked] = useState(true);
  const [inputWidth, setInputWidth] = useState<number>(0);
  const [inputHeight, setInputHeight] = useState<number>(0);

  const crop = params.crop;

  // 计算当前裁剪后的尺寸
  const croppedWidth = currentImage ? Math.round(currentImage.width * crop.width) : 0;
  const croppedHeight = currentImage ? Math.round(currentImage.height * crop.height) : 0;

  // 同步输入框的值
  useEffect(() => {
    setInputWidth(croppedWidth);
    setInputHeight(croppedHeight);
  }, [croppedWidth, croppedHeight]);

  // 选择比例
  const handleAspectRatioSelect = useCallback((ratio: number | null) => {
    setCropAspectRatio(ratio);
  }, [setCropAspectRatio]);

  // 处理宽度变化
  const handleWidthChange = useCallback((value: number) => {
    setInputWidth(value);
    if (!currentImage) return;

    if (aspectLocked) {
      // 锁定宽高比，自动计算高度
      const ratio = crop.aspectRatio || (currentImage.width / currentImage.height);
      const newHeight = Math.round(value / ratio);
      setInputHeight(newHeight);

      // 更新裁剪区域
      const newCropWidth = value / currentImage.width;
      const newCropHeight = newHeight / currentImage.height;
      setCrop({
        ...crop,
        width: newCropWidth,
        height: newCropHeight
      });
    } else {
      // 未锁定，仅更新宽度
      const newCropWidth = value / currentImage.width;
      setCrop({
        ...crop,
        width: newCropWidth
      });
    }
  }, [currentImage, aspectLocked, crop, setCrop]);

  // 处理高度变化
  const handleHeightChange = useCallback((value: number) => {
    setInputHeight(value);
    if (!currentImage) return;

    if (aspectLocked) {
      // 锁定宽高比，自动计算宽度
      const ratio = crop.aspectRatio || (currentImage.width / currentImage.height);
      const newWidth = Math.round(value * ratio);
      setInputWidth(newWidth);

      // 更新裁剪区域
      const newCropWidth = newWidth / currentImage.width;
      const newCropHeight = value / currentImage.height;
      setCrop({
        ...crop,
        width: newCropWidth,
        height: newCropHeight
      });
    } else {
      // 未锁定，仅更新高度
      const newCropHeight = value / currentImage.height;
      setCrop({
        ...crop,
        height: newCropHeight
      });
    }
  }, [currentImage, aspectLocked, crop, setCrop]);

  // 切换宽高比锁定
  const toggleAspectLock = useCallback(() => {
    setAspectLocked(!aspectLocked);
  }, [aspectLocked]);

  // 重置裁剪
  const handleReset = useCallback(() => {
    resetCrop();
  }, [resetCrop]);

  // 应用裁剪
  const handleApplyCrop = useCallback(() => {
    applyCrop();
  }, [applyCrop]);

  if (!currentImage) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        请先导入照片
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 裁剪比例 */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">裁剪比例</label>
        <div className="grid grid-cols-4 gap-1.5">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.label}
              onClick={() => handleAspectRatioSelect(ratio.value)}
              className={cn(
                'px-2 py-1.5 rounded text-xs transition-colors cursor-pointer',
                crop.aspectRatio === ratio.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600'
              )}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </div>

      {/* 分辨率调整 */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">分辨率</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">宽</span>
              <input
                type="number"
                value={inputWidth}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                min={1}
                max={currentImage.width}
                className="w-full h-8 text-sm text-center text-gray-700 bg-gray-100 border border-gray-200 rounded px-2 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <button
            onClick={toggleAspectLock}
            className={cn(
              'p-2 rounded transition-colors cursor-pointer',
              aspectLocked
                ? 'text-orange-500 bg-orange-50'
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
            )}
            title={aspectLocked ? '点击解锁宽高比' : '点击锁定宽高比'}
          >
            {aspectLocked ? <LockOutlined /> : <UnlockOutlined />}
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">高</span>
              <input
                type="number"
                value={inputHeight}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                min={1}
                max={currentImage.height}
                className="w-full h-8 text-sm text-center text-gray-700 bg-gray-100 border border-gray-200 rounded px-2 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          原始尺寸: {currentImage.width} × {currentImage.height}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleReset}
          className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <ReloadOutlined className="mr-1" />
          重置
        </button>
        <button
          onClick={handleApplyCrop}
          className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer"
        >
          应用裁剪
        </button>
      </div>
    </div>
  );
}

export default CropPanel;
