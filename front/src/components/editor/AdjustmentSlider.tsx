import React, { useRef, useCallback, useState } from 'react';
import { RestOutlined } from '@ant-design/icons';
import { cn } from '@/lib/utils';

interface AdjustmentSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  step?: number;
  onChange: (value: number) => void;
  onReset?: () => void;
  disabled?: boolean;
  backgroundGradient?: 'exposure' | 'contrast' | 'temperature' | 'tint' | 'saturation' | 'neutral';
  className?: string;
  showValueInput?: boolean;
}

const BACKGROUND_GRADIENTS = {
  exposure: 'bg-gradient-to-r from-gray-800 via-gray-400 to-white',
  contrast: 'bg-gradient-to-r from-gray-300 via-gray-600 to-gray-300',
  temperature: 'bg-gradient-to-r from-blue-400 via-white to-orange-400',
  tint: 'bg-gradient-to-r from-green-400 via-white to-magenta-400',
  saturation: 'bg-gradient-to-r from-gray-400 via-gray-400 to-red-400',
  neutral: 'bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200',
};

export function AdjustmentSlider({
  label,
  value,
  min,
  max,
  defaultValue,
  unit = '',
  step = 1,
  onChange,
  onReset,
  disabled = false,
  backgroundGradient = 'neutral',
  className,
  showValueInput = true,
}: AdjustmentSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(value);

  const isDefault = value === defaultValue;
  const range = max - min;

  // Calculate position percentage (default at center = 50%)
  const getPositionPercent = useCallback((val: number) => {
    // Map value to 0-100% position, with default at center
    return ((val - min) / range) * 100;
  }, [min, range]);

  const positionPercent = getPositionPercent(value);

  // Handle mouse/touch drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartValue(value);

    // Add global mouse move and up listeners
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!sliderRef.current) return;
      const sliderWidth = sliderRef.current.offsetWidth;
      const deltaX = moveEvent.clientX - dragStartX;
      const deltaPercent = (deltaX / sliderWidth) * 100;
      const deltaValue = (deltaPercent / 100) * range;
      const newValue = Math.round(Math.max(min, Math.min(max, dragStartValue + deltaValue)) * 100) / 100;
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, value, dragStartX, dragStartValue, min, max, range, onChange]);

  // Handle direct click on slider track
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || isDragging) return;
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const clickPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const newValue = Math.round((min + (clickPercent / 100) * range) * 100) / 100;
    onChange(Math.max(min, Math.min(max, newValue)));
  }, [disabled, isDragging, min, max, range, onChange]);

  // Handle value input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)));
    }
  }, [min, max, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      onChange(Math.max(min, value - (step || 1)));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      onChange(Math.min(max, value + (step || 1)));
    } else if (e.key === 'Home') {
      onChange(min);
    } else if (e.key === 'End') {
      onChange(max);
    }
  }, [disabled, value, min, max, step, onChange]);

  return (
    <div className={cn('mb-3', className)}>
      {/* Label and value display */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        {showValueInput && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={value.toFixed(step < 1 ? 1 : 0)}
              onChange={handleInputChange}
              disabled={disabled}
              className="w-12 h-6 text-xs text-center bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            {unit && <span className="text-xs text-gray-500">{unit}</span>}
          </div>
        )}
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className={cn(
          'relative h-6 cursor-pointer rounded-sm',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        {/* Background gradient */}
        <div className={cn(
          'absolute inset-0 rounded-sm',
          BACKGROUND_GRADIENTS[backgroundGradient]
        )} />

        {/* Fill from center */}
        <div
          className="absolute h-full bg-gray-400/30 rounded-sm"
          style={{
            left: value < defaultValue ? `${positionPercent}%` : `${getPositionPercent(defaultValue)}%`,
            width: `${Math.abs(positionPercent - getPositionPercent(defaultValue))}%`,
          }}
        />

        {/* Tick mark at default position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-gray-600/50"
          style={{ left: `${getPositionPercent(defaultValue)}%` }}
        />

        {/* Slider thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 transition-shadow',
            isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-700 dark:border-gray-300',
            isDefault && 'border-gray-500'
          )}
          style={{ left: `${positionPercent}%` }}
        />
      </div>

      {/* Reset button (only shown when value differs from default) */}
      {!isDefault && onReset && !disabled && (
        <button
          onClick={onReset}
          className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <RestOutlined className="text-xs" />
          重置
        </button>
      )}
    </div>
  );
}