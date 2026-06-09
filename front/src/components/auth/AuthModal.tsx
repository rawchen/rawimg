import { useState, useEffect } from 'react';
import { CloseOutlined, LoadingOutlined, UserOutlined, MailOutlined, LockOutlined, SafetyOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaSessionId, setCaptchaSessionId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    setMode(initialMode);
    if (isOpen) {
      fetchCaptcha();
      // 触发进入动画
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
    }
  }, [initialMode, isOpen]);

  // 错误提示自动消失
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchCaptcha = async () => {
    try {
      const result = await authApi.getCaptcha();
      setCaptchaSessionId(result.sessionId);
      setCaptchaQuestion(result.question);
    } catch (err) {
      console.error('Failed to fetch captcha');
    }
  };

  const handleSendEmailCode = async () => {
    if (!email || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setSendingCode(true);
    try {
      await authApi.sendRegisterEmailCode(email);
      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.msg || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await authApi.login({
          username,
          password,
          captchaAnswer: captcha,
          captchaSessionId,
        });
        login(result.token, result);
        // 如果是管理员或员工，跳转到管理后台
        if (result.role === 'ADMIN' || result.role === 'STAFF') {
          window.location.href = '/admin';
          return;
        }
      } else {
        const result = await authApi.register({
          username,
          email,
          password,
          captchaAnswer: captcha,
          captchaSessionId,
          emailCode,
        });
        login(result.token, result);
      }
      onClose();
      setUsername('');
      setEmail('');
      setPassword('');
      setCaptcha('');
      setEmailCode('');
      setCountdown(0);
    } catch (err: any) {
      // 使用后端返回的错误消息
      setError(err.msg || err.message || '操作失败，请重试');
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={`relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 transform transition-all duration-300 ease-out ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <CloseOutlined className="text-lg" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-black">
              {mode === 'login' ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-gray-500 mt-1">
              {mode === 'login' ? '登录您的账户' : '注册一个新账户'}
            </p>
          </div>

          {/* Error message - 绝对定位，不占用布局空间 */}
          {error && (
            <div className="absolute top-14 left-6 right-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg shadow-sm z-10 flex items-center gap-2">
              <ExclamationCircleOutlined className="text-base flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <UserOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                placeholder="请输入用户名"
                required
                minLength={3}
                maxLength={50}
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="relative">
                  <MailOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                    placeholder="请输入邮箱"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <SafetyOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                      placeholder="请输入邮箱验证码"
                      required
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={countdown > 0 || sendingCode}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </button>
                </div>
              </>
            )}

            <div className="relative">
              <LockOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                placeholder="请输入密码"
                required
                minLength={6}
                maxLength={100}
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <SafetyOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={captcha}
                  onChange={(e) => setCaptcha(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                  placeholder="请输入计算结果"
                  required
                />
              </div>
              <button
                type="button"
                onClick={fetchCaptcha}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                {captchaQuestion || '获取验证码'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <LoadingOutlined className="text-lg" spin />
              ) : mode === 'login' ? (
                '登录'
              ) : (
                '注册'
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div className="mt-4 text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>
                还没有账号？{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-black font-medium hover:underline"
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-black font-medium hover:underline"
                >
                  立即登录
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
