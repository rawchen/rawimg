import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleOutlined, HomeOutlined } from '@ant-design/icons';

export function NotFoundPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center px-4 overflow-hidden">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* 404 Icon */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <ExclamationCircleOutlined className="text-5xl text-red-500" />
          </div>
        </div>

        {/* 404 Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">页面未找到</h2>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          抱歉，您访问的图集不存在或已被删除
        </p>

        {/* Countdown */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-blue-700">
            将在 <span className="font-bold text-2xl">{countdown}</span> 秒后自动跳转到首页
          </p>
        </div>

        {/* Manual Return Button */}
        <button
          onClick={handleGoHome}
          className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
        >
          <HomeOutlined />
          <span>立即返回首页</span>
        </button>

        {/* Additional Links */}
        <div className="mt-4 flex justify-center space-x-4 text-sm text-gray-600">
          <button
            onClick={() => navigate(-1)}
            className="hover:text-black transition-colors"
          >
            返回上一页
          </button>
          <span>|</span>
          <button
            onClick={() => navigate('/')}
            className="hover:text-black transition-colors"
          >
            浏览图集
          </button>
        </div>
      </div>
    </div>
  );
}
