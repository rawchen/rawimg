import React from 'react';

interface SliderSelectorProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

const SliderSelector: React.FC<SliderSelectorProps> = ({ options, value, onChange }) => {
  const selectedIndex = options.findIndex(opt => opt.key === value);
  const optionWidth = 100 / options.length;
  
  // 根据索引调整偏移量，确保滑动块位置精确对齐
  const leftOffsets = [4, 4, 2, 0]; // 对应4个选项的额外偏移量（像素）
  const leftOffset = selectedIndex < leftOffsets.length ? leftOffsets[selectedIndex] : 0;

  return (
    <div className="relative flex items-center rounded-lg p-1 ml-1 bg-white border border-gray-200">
      {/* 滑动背景块 */}
      <div
        className="absolute top-1 bottom-1 rounded transition-all duration-200 bg-orange-500"
        style={{
          width: `calc(${optionWidth}% - 4px)`,
          left: `calc(${selectedIndex * optionWidth}% + ${leftOffset}px)`,
        }}
      />
      
      {/* 选项按钮 */}
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`relative z-10 px-3 py-1 text-xs font-medium transition-colors duration-200 whitespace-nowrap ${
            value === option.key ? 'text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SliderSelector;
