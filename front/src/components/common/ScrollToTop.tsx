import { useState, useEffect } from 'react';
import { ArrowUpOutlined } from '@ant-design/icons';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // 向下滚动超过 200px 时显示按钮
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed z-40
        bottom-6 right-6
        sm:bottom-8 sm:right-8
        lg:bottom-24 lg:right-8
        xl:bottom-24 xl:right-[calc((100vw-80rem)/2-3rem)]
        w-12 h-12 sm:w-14 sm:h-14
        bg-black hover:bg-black/80
        text-white
        rounded-full
        shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:shadow-[0_14px_35px_rgba(0,0,0,0.35)]
        flex items-center justify-center
        transition-all ease-in-out duration-150
        hover:scale-110 active:scale-95
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}
      aria-label="返回顶部"
    >
      <ArrowUpOutlined className="text-xl sm:text-2xl" />
    </button>
  );
}
