import React, { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { AdjustmentSlider } from './AdjustmentSlider';
import { cn } from '@/lib/utils';
import {
  RightOutlined,
  SunOutlined,
  BgColorsOutlined,
  FilterOutlined,
  AimOutlined,
  CameraOutlined,
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
    <div className="border-b border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-gray-200 hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
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
  const { params, setParam, resetParam, pushHistory, ui, setActivePanel } = useEditorStore();

  // Helper to create slider change handler with history
  const createChangeHandler = <K extends keyof typeof params>(key: K) => {
    return (value: typeof params[K]) => {
      pushHistory();
      setParam(key, value);
    };
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Panel Tabs */}
      <div className="flex border-b border-gray-700 px-2 py-1 gap-1">
        <button
          onClick={() => setActivePanel('edit')}
          className={cn(
            'px-2 py-1 text-xs rounded',
            ui.activePanel === 'edit' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          编辑
        </button>
        <button
          onClick={() => setActivePanel('light')}
          className={cn(
            'px-2 py-1 text-xs rounded',
            ui.activePanel === 'light' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          浅色
        </button>
        <button
          onClick={() => setActivePanel('color')}
          className={cn(
            'px-2 py-1 text-xs rounded',
            ui.activePanel === 'color' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          颜色
        </button>
        <button
          onClick={() => setActivePanel('effects')}
          className={cn(
            'px-2 py-1 text-xs rounded',
            ui.activePanel === 'effects' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          效果
        </button>
        <button
          onClick={() => setActivePanel('detail')}
          className={cn(
            'px-2 py-1 text-xs rounded',
            ui.activePanel === 'detail' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          细节
        </button>
        <button
          onClick={() => setActivePanel('optics')}
          className={cn(
            'px-2 py-1 text-xs rounded',
            ui.activePanel === 'optics' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          )}
        >
          光学
        </button>
      </div>

      {/* Panel Content */}
      <div className="py-2">
        {ui.activePanel === 'edit' && (
          <PanelSection title="编辑" icon={<span>✨</span>} defaultOpen>
            <div className="flex gap-2 mb-3">
              <button className="flex-1 py-2 bg-gray-700 text-gray-200 rounded text-sm hover:bg-gray-600">
                自动
              </button>
              <button className="flex-1 py-2 bg-gray-700 text-gray-200 rounded text-sm hover:bg-gray-600">
                黑白
              </button>
              <button className="flex-1 py-2 bg-gray-700 text-gray-200 rounded text-sm hover:bg-gray-600">
                HDR
              </button>
            </div>
          </PanelSection>
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
                step={0.1}
                onChange={createChangeHandler('exposure')}
                onReset={() => resetParam('exposure')}
                backgroundGradient="exposure"
              />
              <AdjustmentSlider
                label="对比度"
                value={params.contrast}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={createChangeHandler('contrast')}
                onReset={() => resetParam('contrast')}
                backgroundGradient="contrast"
              />
              <AdjustmentSlider
                label="高光"
                value={params.highlights}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={createChangeHandler('highlights')}
                onReset={() => resetParam('highlights')}
                backgroundGradient="neutral"
              />
              <AdjustmentSlider
                label="阴影"
                value={params.shadows}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={createChangeHandler('shadows')}
                onReset={() => resetParam('shadows')}
                backgroundGradient="neutral"
              />
              <AdjustmentSlider
                label="白色"
                value={params.whites}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={createChangeHandler('whites')}
                onReset={() => resetParam('whites')}
                backgroundGradient="neutral"
              />
              <AdjustmentSlider
                label="黑色"
                value={params.blacks}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={createChangeHandler('blacks')}
                onReset={() => resetParam('blacks')}
                backgroundGradient="neutral"
              />
            </PanelSection>

            <PanelSection title="点曲线" icon={<FilterOutlined />} defaultOpen={false}>
              <div className="h-40 bg-gray-800 rounded flex items-center justify-center text-gray-500 text-sm">
                曲线编辑器 (TODO)
              </div>
            </PanelSection>
          </>
        )}

        {ui.activePanel === 'color' && (
          <>
            <PanelSection title="白平衡" icon={<BgColorsOutlined />} defaultOpen>
              <div className="mb-3">
                <select className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-3 py-2 text-sm">
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
                onChange={createChangeHandler('temperature')}
                onReset={() => resetParam('temperature')}
                backgroundGradient="temperature"
              />
              <AdjustmentSlider
                label="色调"
                value={params.tint}
                min={-150}
                max={150}
                defaultValue={0}
                onChange={createChangeHandler('tint')}
                onReset={() => resetParam('tint')}
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
                onChange={createChangeHandler('vibrance')}
                onReset={() => resetParam('vibrance')}
                backgroundGradient="saturation"
              />
              <AdjustmentSlider
                label="饱和度"
                value={params.saturation}
                min={-100}
                max={100}
                defaultValue={0}
                onChange={createChangeHandler('saturation')}
                onReset={() => resetParam('saturation')}
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
              onChange={createChangeHandler('texture')}
              onReset={() => resetParam('texture')}
              backgroundGradient="neutral"
            />
            <AdjustmentSlider
              label="清晰度"
              value={params.clarity}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={createChangeHandler('clarity')}
              onReset={() => resetParam('clarity')}
              backgroundGradient="neutral"
            />
            <AdjustmentSlider
              label="去除薄雾"
              value={params.dehaze}
              min={-100}
              max={100}
              defaultValue={0}
              onChange={createChangeHandler('dehaze')}
              onReset={() => resetParam('dehaze')}
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
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={params.removeChromaticAberration}
                  onChange={(e) => setParam('removeChromaticAberration', e.target.checked)}
                  className="rounded"
                />
                删除色差
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={params.enableLensCorrection}
                  onChange={(e) => setParam('enableLensCorrection', e.target.checked)}
                  className="rounded"
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
