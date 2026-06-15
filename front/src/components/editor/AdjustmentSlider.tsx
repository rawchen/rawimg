import React, { useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface AdjustmentSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  unit?: string;
  step?: number;
  /** Called during drag - update value without saving history */
  onChange: (value: number) => void;
  /** Called when drag ends or input commits - save history here */
  onCommit?: (value: number) => void;
  disabled?: boolean;
  backgroundGradient?: 'exposure' | 'contrast' | 'temperature' | 'tint' | 'saturation' | 'neutral';
  className?: string;
  showValueInput?: boolean;
  /** Multiplier for display value vs actual value. E.g., 10 means display = actual * 10 */
  displayMultiplier?: number;
}

const BACKGROUND_GRADIENTS = {
  exposure: 'bg-gradient-to-r from-gray-300 via-gray-200 to-white',
  contrast: 'bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200',
  temperature: 'bg-gradient-to-r from-blue-300 via-white to-orange-400',
  tint: 'bg-gradient-to-r from-green-300 via-white to-pink-400',
  saturation: 'bg-gradient-to-r from-gray-300 via-gray-300 to-orange-400',
  neutral: 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200',
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
  onCommit,
  disabled = false,
  backgroundGradient = 'neutral',
  className,
  showValueInput = true,
  displayMultiplier = 1,
}: AdjustmentSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputValue, setInputValue] = useState<string | null>(null);
  const inputValueRef = useRef<string | null>(null);
  const didDragRef = useRef(false);
  const lastCommittedValue = useRef(value);

  const isDefault = value === defaultValue;
  const range = max - min;

  // Display values (what user sees and interacts with)
  const displayValue = value * displayMultiplier;
  const displayMin = min * displayMultiplier;
  const displayMax = max * displayMultiplier;
  const displayDefaultValue = defaultValue * displayMultiplier;
  const displayRange = displayMax - displayMin;

  // Format display value for input
  const formatDisplayValue = (val: number) => {
    return val.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2);
  };

  // Current shown value (input state or actual value)
  const shownValue = inputValue !== null ? inputValue : formatDisplayValue(displayValue);

  // Calculate position percentage
  const getPositionPercent = useCallback((displayVal: number) => {
    return ((displayVal - displayMin) / displayRange) * 100;
  }, [displayMin, displayRange]);

  const positionPercent = getPositionPercent(displayValue);

  // Convert display value back to actual value
  const toActualValue = (displayVal: number) => {
    const actualVal = displayVal / displayMultiplier;
    return Math.round(actualVal * 100) / 100;
  };

  // Handle mouse/touch drag — jump to click position immediately, then track relative movement
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled || !sliderRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    didDragRef.current = false;

    const rect = sliderRef.current.getBoundingClientRect();
    const startX = e.clientX;
    // Immediately jump to click position (using display values)
    const clickPercent = ((startX - rect.left) / rect.width) * 100;
    const startDisplayValue = Math.round(Math.max(displayMin, Math.min(displayMax, displayMin + (clickPercent / 100) * displayRange)) * 100) / 100;
    onChange(toActualValue(startDisplayValue));

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!sliderRef.current) return;
      didDragRef.current = true;
      const sliderWidth = sliderRef.current.offsetWidth;
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / sliderWidth) * 100;
      const deltaDisplayValue = (deltaPercent / 100) * displayRange;
      const newDisplayValue = Math.round(Math.max(displayMin, Math.min(displayMax, startDisplayValue + deltaDisplayValue)) * 100) / 100;
      const actualValue = toActualValue(newDisplayValue);
      lastCommittedValue.current = actualValue;
      onChange(actualValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Commit final value when drag ends
      if (onCommit) {
        onCommit(lastCommittedValue.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, displayMin, displayMax, displayRange, onChange, toActualValue]);

  // Double-click to reset to default value
  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    onChange(defaultValue);
    if (onCommit) onCommit(defaultValue);
  }, [disabled, defaultValue, onChange, onCommit]);

  // Handle direct click on slider track — skip if drag just happened
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled || didDragRef.current) return;
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const clickPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const newDisplayValue = Math.round((displayMin + (clickPercent / 100) * displayRange) * 100) / 100;
    const actualValue = toActualValue(Math.max(displayMin, Math.min(displayMax, newDisplayValue)));
    onChange(actualValue);
    if (onCommit) onCommit(actualValue);
  }, [disabled, displayMin, displayMax, displayRange, onChange, onCommit, toActualValue]);

  // Handle value input (user types in the input box)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
    inputValueRef.current = rawValue;

    // If empty, reset to default immediately and clear input state
    if (rawValue === '' || rawValue === '-') {
      onChange(defaultValue);
      setInputValue(null);
      inputValueRef.current = null;
      return;
    }

    const newDisplayValue = parseFloat(rawValue);
    if (!isNaN(newDisplayValue)) {
      // Clamp to range and trigger onChange
      const clampedValue = Math.max(displayMin, Math.min(displayMax, newDisplayValue));
      onChange(toActualValue(clampedValue));
    }
  }, [displayMin, displayMax, defaultValue, onChange, toActualValue]);

  // Handle input blur - commit final value or reset to default
  const handleInputBlur = useCallback(() => {
    const currentInput = inputValueRef.current;

    // Clear input state
    setInputValue(null);
    inputValueRef.current = null;

    // If empty, reset to default
    if (currentInput === '' || currentInput === '-') {
      onChange(defaultValue);
      if (onCommit) onCommit(defaultValue);
      return;
    }

    // Parse and clamp final value
    if (currentInput !== null) {
      const newDisplayValue = parseFloat(currentInput);
      if (!isNaN(newDisplayValue)) {
        const clampedValue = Math.max(displayMin, Math.min(displayMax, newDisplayValue));
        const actualValue = toActualValue(clampedValue);
        onChange(actualValue);
        if (onCommit) onCommit(actualValue);
      }
      // Invalid value, reset to current value (will sync display)
    }
  }, [displayMin, displayMax, defaultValue, onChange, onCommit, toActualValue]);

  // Handle Enter key to commit value
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    const displayStep = (step || 1) * displayMultiplier;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      onChange(toActualValue(Math.max(displayMin, displayValue - displayStep)));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      onChange(toActualValue(Math.min(displayMax, displayValue + displayStep)));
    } else if (e.key === 'Home') {
      onChange(min);
    } else if (e.key === 'End') {
      onChange(max);
    }
  }, [disabled, displayValue, displayMin, displayMax, min, max, step, displayMultiplier, onChange, toActualValue]);

  return (
    <div className={cn('mb-3', className)}>
      {/* Label and value display */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm select-none text-gray-700">{label}</span>
        {showValueInput && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={shownValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              disabled={disabled}
              className="w-12 h-5 text-xs text-center text-gray-700 bg-gray-100 border border-gray-200 rounded px-1 focus:outline-none focus:border-orange-500 disabled:opacity-50"
            />
            {unit && <span className="text-xs text-gray-500">{unit}</span>}
          </div>
        )}
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        className={cn(
          'relative h-5 cursor-pointer rounded-sm',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
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
        {/*<div*/}
        {/*  className="absolute h-full bg-gray-400/30 rounded-sm"*/}
        {/*  style={{*/}
        {/*    left: value < defaultValue ? `${positionPercent}%` : `${getPositionPercent(defaultValue)}%`,*/}
        {/*    width: `${Math.abs(positionPercent - getPositionPercent(defaultValue))}%`,*/}
        {/*  }}*/}
        {/*/>*/}

        {/* Tick mark at default position */}
        {/*<div*/}
        {/*  className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-gray-600/50"*/}
        {/*  style={{ left: `${getPositionPercent(defaultValue)}%` }}*/}
        {/*/>*/}

        {/* Slider thumb - triangle pointing up (Photoshop style) */}
        <div
          className={cn(
            'absolute bottom-0 -translate-x-1/2 w-0 h-0 transition-shadow',
            isDragging
              ? 'border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-gray-800'
              : 'border-l-[7px] border-r-[7px] border-t-[10px] border-l-transparent border-r-transparent border-t-gray-600',
            isDefault && 'border-t-gray-400'
          )}
          style={{ left: `${positionPercent}%` }}
        />
      </div>
    </div>
  );
}