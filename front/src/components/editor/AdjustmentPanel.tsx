import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { AdjustmentSlider } from './AdjustmentSlider';
import { CropPanel } from './CropPanel';
import { cn } from '@/lib/utils';
import {
  RightOutlined,
  SunOutlined,
  BgColorsOutlined,
  FilterOutlined,
  AimOutlined,
  CameraOutlined,
  ScissorOutlined,
} from '@ant-design/icons';

type PanelType = 'edit' | 'light' | 'color' | 'effects' | 'detail' | 'optics';

interface PanelSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function PanelSection({ title, icon, defaultOpen = true, children }: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-orange-500">{icon}</span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <RightOutlined
          className={cn(
            'text-gray-400 transition-transform',
            isOpen && 'rotate-90'
          )}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function AdjustmentPanel() {
  const { params, setParam, resetParam, pushHistory, ui, setActivePanel, setCropping, setCrop } = useEditorStore();

  // Helper to create slider handlers: onChange for real-time update, onCommit for history
  const createHandlers = <K extends keyof typeof params>(key: K) => {
    return {
      onChange: (value: typeof params[K]) => setParam(key, value),
      onCommit: (value: typeof params[K]) => {
        pushHistory();
        setParam(key, value);
      },
    };
  };

  // Handle panel change - enter crop mode on crop, exit crop mode on others
  const handlePanelChange = (panel: typeof ui.activePanel) => {
    if (panel === 'crop') {
      // 进入裁剪模式时，初始化裁剪区域为整个图片
      setCrop({
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        aspectRatio: null
      });
      setCropping(true);
    } else if (ui.isCropping) {
      // 退出裁剪模式
      setCropping(false);
    }
    setActivePanel(panel);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      {/* Panel Tabs */}
      <div className="flex border-b border-gray-200 px-2 py-1 gap-1 bg-gray-50">
        <button
          onClick={() => handlePanelChange('crop')}
          className={cn(
            'px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer',
            ui.activePanel === 'crop' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
          )}
        >
          裁剪
        </button>
        <button
          onClick={() => handlePanelChange('light')}
          className={cn(
            'px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer',
            ui.activePanel === 'light' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
          )}
        >
          浅色
        </button>
        <button
          onClick={() => handlePanelChange('color')}
          className={cn(
            'px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer',
            ui.activePanel === 'color' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
          )}
        >
          颜色
        </button>
        <button
          onClick={() => handlePanelChange('effects')}
          className={cn(
            'px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer',
            ui.activePanel === 'effects' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
          )}
        >
          效果
        </button>
        <button
          onClick={() => handlePanelChange('detail')}
          className={cn(
            'px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer',
            ui.activePanel === 'detail' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
          )}
        >
          细节
        </button>
        <button
          onClick={() => handlePanelChange('optics')}
          className={cn(
            'px-2 py-1 text-xs rounded-lg transition-colors cursor-pointer',
            ui.activePanel === 'optics' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'text-gray-500 hover:text-orange-600 hover:bg-gray-100'
          )}
        >
          光学
        </button>
      </div>

      {/* Panel Content */}
      <div className="py-2">
        {ui.activePanel === 'crop' && (
          <CropPanel />
        )}

        {ui.activePanel === 'light' && (
          <>
            <PanelSection title="浅色" icon={<SunOutlined />} defaultOpen>
              <AdjustmentSlider
                label="曝光"
                value={params.exposure}
                min={-5}
                max={5}
                defaultValue={0}
                step={0.01}
                {...createHandlers('exposure')}
                backgroundGradient="exposure"
              />
              <AdjustmentSlider
                label="对比度"
                value={params.contrast}
                min={-100}
                max={100}
                defaultValue={0}
                {...createHandlers('contrast')}
                backgroundGradient="exposure"
              />
              <AdjustmentSlider
                label="高光"
                value={params.highlights}
                min={-10}
                max={10}
                defaultValue={0}
                displayMultiplier={10}
                {...createHandlers('highlights')}
                backgroundGradient="exposure"
              />
              <AdjustmentSlider
                label="阴影"
                value={params.shadows}
                min={-100}
                max={100}
                defaultValue={0}
                {...createHandlers('shadows')}
                backgroundGradient="exposure"
              />
              <AdjustmentSlider
                label="白色"
                value={params.whites}
                min={-100}
                max={100}
                defaultValue={0}
                {...createHandlers('whites')}
                backgroundGradient="exposure"
              />
              <AdjustmentSlider
                label="黑色"
                value={params.blacks}
                min={-100}
                max={100}
                defaultValue={0}
                {...createHandlers('blacks')}
                backgroundGradient="exposure"
              />
            </PanelSection>

            <PanelSection title="点曲线" icon={<FilterOutlined />} defaultOpen={false}>
              <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                曲线编辑器 (TODO)
              </div>
            </PanelSection>
          </>
        )}

        {ui.activePanel === 'color' && (
          <>
            <PanelSection title="白平衡" icon={<BgColorsOutlined />} defaultOpen>
              <div className="mb-3">
                <select className="w-full bg-gray-100 text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none cursor-pointer">
                  <option>原照设置</option>
                  <option>日光</option>
                  <option>阴影</option>
                  <option>阴天</option>
                  <option>钨丝灯</option>
                  <option>荧光灯</option>
                  <option>闪光灯</option>
                </select>
              </div>
              <AdjustmentSlider
                label="色温"
                value={params.temperature}
                min={2000}
                max={50000}
                defaultValue={6500}
                unit="K"
                step={100}
                {...createHandlers('temperature')}
                backgroundGradient="temperature"
              />
              <AdjustmentSlider
                label="色调"
                value={params.tint}
                min={-150}
                max={150}
                defaultValue={0}
                {...createHandlers('tint')}
                backgroundGradient="tint"
              />
            </PanelSection>

            <PanelSection title="饱和度" icon={<span>🎨</span>} defaultOpen>
              <AdjustmentSlider
                label="自然饱和度"
                value={params.vibrance}
                min={-100}
                max={100}
                defaultValue={0}
                {...createHandlers('vibrance')}
                backgroundGradient="saturation"
              />
              <AdjustmentSlider
                label="饱和度"
                value={params.saturation}
                min={-100}
                max={100}
                defaultValue={0}
                {...createHandlers('saturation')}
                backgroundGradient="saturation"
              />
            </PanelSection>

            <PanelSection title="混色器" icon={<span>🖌️</span>} defaultOpen={false}>
              <div className="text-gray-500 text-sm text-center py-4">
                HSL调整 (TODO)
              </div>
            </PanelSection>

            <PanelSection title="颜色分级" icon={<span>🌈</span>} defaultOpen={false}>
              <div className="text-gray-500 text-sm text-center py-4">
                颜色轮 (TODO)
              </div>
            </PanelSection>
          </>
        )}

        {ui.activePanel === 'effects' && (
          <PanelSection title="效果" icon={<span>✨</span>} defaultOpen>
            <AdjustmentSlider
              label="纹理"
              value={params.texture}
              min={-100}
              max={100}
              defaultValue={0}
              {...createHandlers('texture')}
              backgroundGradient="neutral"
            />
            <AdjustmentSlider
              label="清晰度"
              value={params.clarity}
              min={-100}
              max={100}
              defaultValue={0}
              {...createHandlers('clarity')}
              backgroundGradient="neutral"
            />
            <AdjustmentSlider
              label="去除薄雾"
              value={params.dehaze}
              min={-100}
              max={100}
              defaultValue={0}
              {...createHandlers('dehaze')}
              backgroundGradient="neutral"
            />
          </PanelSection>
        )}

        {ui.activePanel === 'detail' && (
          <PanelSection title="细节" icon={<AimOutlined />} defaultOpen>
            <div className="text-gray-500 text-sm text-center py-4">
              锐化和降噪调整 (TODO)
            </div>
          </PanelSection>
        )}

        {ui.activePanel === 'optics' && (
          <PanelSection title="光学" icon={<CameraOutlined />} defaultOpen>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.removeChromaticAberration}
                  onChange={(e) => setParam('removeChromaticAberration', e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                />
                删除色差
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.enableLensCorrection}
                  onChange={(e) => setParam('enableLensCorrection', e.target.checked)}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                />
                启用镜头校正
              </label>
            </div>
          </PanelSection>
        )}
      </div>
    </div>
  );
}

export default AdjustmentPanel;
