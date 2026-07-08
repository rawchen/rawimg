import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';

type DragHandle = 'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left' | 'center';

interface CropOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
}

export function CropOverlay({ canvasWidth, canvasHeight, imageWidth, imageHeight, zoom }: CropOverlayProps) {
  const { currentImage, params, setCrop } = useEditorStore();
  const crop = params.crop;

  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<DragHandle | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 使用 ref 存储初始裁剪状态，避免闭包问题
  const initialCropRef = useRef(crop);

  const overlayRef = useRef<HTMLDivElement>(null);

  // 计算裁剪框在画布上的像素位置
  const cropRect = {
    x: crop.x * canvasWidth,
    y: crop.y * canvasHeight,
    width: crop.width * canvasWidth,
    height: crop.height * canvasHeight
  };

  // 开始拖拽 - 直接从 store 获取最新状态
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: DragHandle) => {
    e.preventDefault();
    e.stopPropagation();
    // 直接从 store 获取最新的 crop 值
    const currentCrop = useEditorStore.getState().params.crop;
    initialCropRef.current = currentCrop;
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  // 拖拽处理
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragHandle || !overlayRef.current) return;

    const initialCrop = initialCropRef.current;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    // 使用视觉尺寸计算百分比，使鼠标移动与裁切变化视觉上同步
    const visualWidth = canvasWidth * zoom;
    const visualHeight = canvasHeight * zoom;
    const deltaPercentX = deltaX / visualWidth;
    const deltaPercentY = deltaY / visualHeight;

    console.log('=== 拖拽 ===', dragHandle, 'delta:', deltaPercentX.toFixed(4), deltaPercentY.toFixed(4));

    if (dragHandle === 'center') {
      let newX = initialCrop.x + deltaPercentX;
      let newY = initialCrop.y + deltaPercentY;
      newX = Math.max(0, Math.min(1 - initialCrop.width, newX));
      newY = Math.max(0, Math.min(1 - initialCrop.height, newY));
      setCrop({ x: newX, y: newY, width: initialCrop.width, height: initialCrop.height, aspectRatio: initialCrop.aspectRatio });
      return;
    }

    const aspectRatio = initialCrop.aspectRatio;

    const fixLeft = dragHandle.includes('right');
    const fixRight = dragHandle.includes('left');
    const fixTop = dragHandle.includes('bottom');
    const fixBottom = dragHandle.includes('top');

    const anchorX = fixRight ? initialCrop.x + initialCrop.width :
                    fixLeft ? initialCrop.x :
                    initialCrop.x + initialCrop.width / 2;
    const anchorY = fixBottom ? initialCrop.y + initialCrop.height :
                    fixTop ? initialCrop.y :
                    initialCrop.y + initialCrop.height / 2;

    console.log('锚点:', anchorX.toFixed(4), anchorY.toFixed(4), 'fix:', fixLeft, fixRight, fixTop, fixBottom);

    let newWidth = initialCrop.width;
    let newHeight = initialCrop.height;

    if (dragHandle.includes('right')) newWidth = initialCrop.width + deltaPercentX;
    if (dragHandle.includes('left')) newWidth = initialCrop.width - deltaPercentX;
    if (dragHandle.includes('bottom')) newHeight = initialCrop.height + deltaPercentY;
    if (dragHandle.includes('top')) newHeight = initialCrop.height - deltaPercentY;

    console.log('原始尺寸:', newWidth.toFixed(4), newHeight.toFixed(4));

    newWidth = Math.max(0.05, newWidth);
    newHeight = Math.max(0.05, newHeight);

    if (aspectRatio !== null) {
      // 注意：aspectRatio 是像素宽高比，而 newWidth/newHeight 是相对于图片的百分比
      // 转换关系：newWidth/newHeight = (像素宽/图片宽) / (像素高/图片高) = 像素宽高比 / 图片宽高比
      // 即：newWidth / newHeight = aspectRatio / imageAspect
      const imageAspect = imageWidth / imageHeight;

      // 计算哪个维度变化更大，保持变化更大的那个
      const widthChange = Math.abs(newWidth - initialCrop.width) / initialCrop.width;
      const heightChange = Math.abs(newHeight - initialCrop.height) / initialCrop.height;
      const keepWidth = widthChange >= heightChange;

      console.log('宽高比约束:', aspectRatio, 'imageAspect:', imageAspect.toFixed(4), 'widthChange:', widthChange.toFixed(4), 'heightChange:', heightChange.toFixed(4), '保持:', keepWidth ? '宽度' : '高度');

      if (keepWidth) {
        // 保持宽度，调整高度：newHeight = newWidth * imageAspect / aspectRatio
        newHeight = newWidth * imageAspect / aspectRatio;
      } else {
        // 保持高度，调整宽度：newWidth = newHeight * aspectRatio / imageAspect
        newWidth = newHeight * aspectRatio / imageAspect;
      }
      console.log('调整后:', newWidth.toFixed(4), newHeight.toFixed(4));
    }

    let newX = fixRight ? anchorX - newWidth : fixLeft ? anchorX : anchorX - newWidth / 2;
    let newY = fixBottom ? anchorY - newHeight : fixTop ? anchorY : anchorY - newHeight / 2;

    console.log('位置:', newX.toFixed(4), newY.toFixed(4));

    // 边界检查：当超出边界时，基于锚点重新计算最大尺寸
    // 锚点是固定不动的点，裁剪框围绕锚点调整
    if (aspectRatio !== null) {
      const imageAspect = imageWidth / imageHeight;

      // 计算锚点在各方向的最大可用空间
      const maxSpaceLeft = fixLeft ? anchorX : anchorX;  // 锚点到左边界的距离
      const maxSpaceRight = fixRight ? 1 - anchorX : 1 - anchorX;  // 锚点到右边界的距离
      const maxSpaceTop = fixTop ? anchorY : anchorY;  // 锚点到上边界的距离
      const maxSpaceBottom = fixRight ? 1 - anchorY : 1 - anchorY;  // 锚点到下边界的距离

      // 根据锚点位置计算最大允许尺寸
      let maxWidth: number, maxHeight: number;
      if (fixRight) {
        // 右边界锚定，裁剪框向左延伸
        maxWidth = anchorX;
      } else if (fixLeft) {
        // 左边界锚定，裁剪框向右延伸
        maxWidth = 1 - anchorX;
      } else {
        maxWidth = Math.min(anchorX, 1 - anchorX) * 2;
      }

      if (fixBottom) {
        // 下边界锚定，裁剪框向上延伸
        maxHeight = anchorY;
      } else if (fixTop) {
        // 上边界锚定，裁剪框向下延伸
        maxHeight = 1 - anchorY;
      } else {
        maxHeight = Math.min(anchorY, 1 - anchorY) * 2;
      }

      console.log('最大空间:', maxWidth.toFixed(4), maxHeight.toFixed(4));

      // 在宽高比约束下计算最大尺寸
      const maxHFromW = maxWidth * imageAspect / aspectRatio;
      const maxWFromH = maxHeight * aspectRatio / imageAspect;

      // 选择在边界内能保持比例的最大尺寸
      if (maxHFromW <= maxHeight) {
        // 以宽度为限制
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = newWidth * imageAspect / aspectRatio;
      } else {
        // 以高度为限制
        newHeight = Math.min(newHeight, maxHeight);
        newWidth = newHeight * aspectRatio / imageAspect;
      }

      // 重新计算位置
      newX = fixRight ? anchorX - newWidth : fixLeft ? anchorX : anchorX - newWidth / 2;
      newY = fixBottom ? anchorY - newHeight : fixTop ? anchorY : anchorY - newHeight / 2;
    } else {
      // 自由裁剪
      if (newX < 0) { newWidth += newX; newX = 0; }
      if (newY < 0) { newHeight += newY; newY = 0; }
      if (newX + newWidth > 1) { newWidth = 1 - newX; }
      if (newY + newHeight > 1) { newHeight = 1 - newY; }
    }

    newWidth = Math.max(0.05, newWidth);
    newHeight = Math.max(0.05, newHeight);

    newX = fixRight ? anchorX - newWidth : fixLeft ? anchorX : anchorX - newWidth / 2;
    newY = fixBottom ? anchorY - newHeight : fixTop ? anchorY : anchorY - newHeight / 2;
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    console.log('最终:', newX.toFixed(4), newY.toFixed(4), newWidth.toFixed(4), newHeight.toFixed(4), '像素:', Math.round(newWidth * imageWidth), Math.round(newHeight * imageHeight));

    setCrop({ x: newX, y: newY, width: newWidth, height: newHeight, aspectRatio });
  }, [isDragging, dragHandle, dragStart, canvasWidth, canvasHeight, setCrop, imageWidth, imageHeight]);

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  // 添加/移除事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 拖拽点大小（Photoshop风格的大手柄）
  // 由于外层容器有 scale(zoom)，拖拽点大小需要反向补偿，保持视觉大小恒定
  const baseHandleSize = 12; // 视觉上的固定大小（像素）
  const handleSize = baseHandleSize / zoom;

  // 角落拖拽点位置
  const handles: { position: DragHandle; x: number; y: number; isCorner: boolean }[] = [
    { position: 'top-left', x: cropRect.x, y: cropRect.y, isCorner: true },
    { position: 'top-right', x: cropRect.x + cropRect.width, y: cropRect.y, isCorner: true },
    { position: 'bottom-right', x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height, isCorner: true },
    { position: 'bottom-left', x: cropRect.x, y: cropRect.y + cropRect.height, isCorner: true },
    { position: 'top', x: cropRect.x + cropRect.width / 2, y: cropRect.y, isCorner: false },
    { position: 'right', x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height / 2, isCorner: false },
    { position: 'bottom', x: cropRect.x + cropRect.width / 2, y: cropRect.y + cropRect.height, isCorner: false },
    { position: 'left', x: cropRect.x, y: cropRect.y + cropRect.height / 2, isCorner: false },
  ];

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {/* 遮罩区域 */}
      <div className="absolute bg-black/70" style={{ left: 0, top: 0, width: canvasWidth, height: cropRect.y }} />
      <div className="absolute bg-black/70" style={{ left: 0, top: cropRect.y + cropRect.height, width: canvasWidth, height: canvasHeight - cropRect.y - cropRect.height }} />
      <div className="absolute bg-black/70" style={{ left: 0, top: cropRect.y, width: cropRect.x, height: cropRect.height }} />
      <div className="absolute bg-black/70" style={{ left: cropRect.x + cropRect.width, top: cropRect.y, width: canvasWidth - cropRect.x - cropRect.width, height: cropRect.height }} />

      {/* 裁剪框边框 */}
      <div
        className="absolute cursor-move"
        style={{
          left: cropRect.x,
          top: cropRect.y,
          width: cropRect.width,
          height: cropRect.height,
          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.8), 0 0 0 1px rgba(0,0,0,0.5)',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'center')}
      >
        {/* 网格线 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 bottom-0 left-1/3" style={{ width: 1, background: 'rgba(255,255,255,0.6)' }} />
          <div className="absolute top-0 bottom-0 left-2/3" style={{ width: 1, background: 'rgba(255,255,255,0.6)' }} />
          <div className="absolute left-0 right-0 top-1/3" style={{ height: 1, background: 'rgba(255,255,255,0.6)' }} />
          <div className="absolute left-0 right-0 top-2/3" style={{ height: 1, background: 'rgba(255,255,255,0.6)' }} />
        </div>
      </div>

      {/* 拖拽点 */}
      {handles.map((handle) => {
        const size = handleSize;
        return (
          <div
            key={handle.position}
            className={cn(
              'absolute pointer-events-auto transition-transform',
              handle.position === 'top-left' && 'cursor-nw-resize',
              handle.position === 'top-right' && 'cursor-ne-resize',
              handle.position === 'bottom-left' && 'cursor-sw-resize',
              handle.position === 'bottom-right' && 'cursor-se-resize',
              handle.position === 'top' && 'cursor-n-resize',
              handle.position === 'bottom' && 'cursor-s-resize',
              handle.position === 'left' && 'cursor-w-resize',
              handle.position === 'right' && 'cursor-e-resize'
            )}
            style={{
              width: size,
              height: size,
              left: handle.x - size / 2,
              top: handle.y - size / 2,
              background: 'rgba(0,0,0,0.6)',
              border: '2px solid rgba(255,255,255,0.9)',
              borderRadius: handle.isCorner ? 0 : '2px',
              transform: isDragging && dragHandle === handle.position ? 'scale(1.3)' : 'scale(1)',
            }}
            onMouseDown={(e) => handleMouseDown(e, handle.position)}
          />
        );
      })}

      {/* 裁剪尺寸显示 */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded text-sm font-medium pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.75)',
          color: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(255,255,255,0.3)'
        }}
      >
        {Math.round(imageWidth * crop.width)} × {Math.round(imageHeight * crop.height)}
      </div>
    </div>
  );
}

export default CropOverlay;