import { useState, useEffect } from 'react';
import { message, Upload, Image, Pagination, Empty, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { userApi, feedbackApi, balanceApi, ConsumeLog } from '@/api';
import { UserStats, BalanceStats } from '@/types';
import walletIcon from '@/assets/media/wallet.svg';
import WalletTab from '@/components/WalletTab';
import SliderSelector from '@/components/SliderSelector';
import {
  UserOutlined,
  CrownOutlined,
  MailOutlined,
  LockOutlined,
  HeartOutlined,
  DownloadOutlined,
  StarOutlined,
  ClockCircleOutlined,
  PictureOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [userStats, setStats] = useState<UserStats | null>(null);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'email' | 'password' | 'feedback' | 'consume' | 'wallet'>('overview');

  // 消费记录状态
  const [consumeLogs, setConsumeLogs] = useState<ConsumeLog[]>([]);
  const [consumeTotal, setConsumeTotal] = useState(0);
  const [consumePage, setConsumePage] = useState(1);
  const [consumeLoading, setConsumeLoading] = useState(false);
  const [hourlyStats, setHourlyStats] = useState<any[]>([]);
  const [modelStats, setModelStats] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'7h' | '7d' | '30d' | '12m'>('7h');

  // 统计维度配置
  const chartTypeConfigs: Record<string, { label: string; title: string; hours: number; type: 'hour' | 'day' | 'month' }> = {
    '7h':  { label: '近7时',  title: '近7小时消费分布',  hours: 7,  type: 'hour' },
    '7d':  { label: '近7天',    title: '近7天消费分布',    hours: 7,  type: 'day' },
    '30d': { label: '近1月',  title: '近1个月消费分布',  hours: 30, type: 'day' },
    '12m': { label: '近1年',    title: '近1年消费分布',    hours: 12, type: 'month' },
  };

  // 根据当前类型格式化 x 轴显示文字
  const formatXAxis = (value: string) => {
    const config = chartTypeConfigs[chartType];
    if (config.type === 'hour') {
      return value.split(' ')[1] || value;
    }
    if (config.type === 'day') {
      return value.split('-').slice(1).join('-') || value;
    }
    // month: yyyy-MM -> MM
    return value.split('-')[1] || value;
  };

  // 表单状态
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentNickname, setCurrentNickname] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 意见反馈状态
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 图表颜色配置
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  // 从小时统计数据中提取所有模型名称
  const getModelBarData = () => {
    const modelSet = new Set<string>();
    hourlyStats.forEach(stat => {
      if (stat.modelDistribution) {
        stat.modelDistribution.forEach((m: any) => {
          modelSet.add(m.modelName);
        });
      }
    });

    return Array.from(modelSet).map(modelName => ({
      modelName,
      dataKey: modelName
    }));
  };

  // 转换数据格式供 Recharts 使用 - 扁平化模型数据，并过滤异常值
  const chartData = hourlyStats.map(stat => {
    const cost = parseFloat(stat.cost) || 0;
    const result: any = {
      hour: stat.hour,
      cost: (cost >= 0 && cost < 1000000 && isFinite(cost)) ? cost : 0
    };
    if (stat.modelDistribution) {
      stat.modelDistribution.forEach((m: any) => {
        const modelCost = parseFloat(m.cost) || 0;
        result[m.modelName] = (modelCost >= 0 && modelCost < 1000000 && isFinite(modelCost)) ? modelCost : 0;
      });
    }
    return result;
  });

  useEffect(() => {
    fetchStats();
    if (user) {
      setNickname(user.nickname || user.username);
      setCurrentNickname(user.nickname || user.username);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'consume') {
      fetchConsumeLogs();
    }
  }, [activeTab, consumePage, chartType]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCodeSent(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsResult, balanceResult] = await Promise.all([
        userApi.getStats(),
        balanceApi.getStats()
      ]);
      setStats(statsResult);
      setBalanceStats(balanceResult);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumeLogs = async () => {
    try {
      setConsumeLoading(true);
      const config = chartTypeConfigs[chartType];
      const [logsRes, chartRes] = await Promise.all([
        balanceApi.getConsumeLogs(consumePage, 20),
        balanceApi.getConsumeChart(config.hours, config.type)
      ]);
      setConsumeLogs(logsRes.records || []);
      setConsumeTotal(logsRes.total || 0);
      setHourlyStats(chartRes.hourlyStats || []);
      setModelStats(chartRes.modelStats || []);
    } catch (error: any) {
      message.error(error.msg || '加载失败');
    } finally {
      setConsumeLoading(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!email || email.trim() === '') {
      message.warning('请输入邮箱');
      return;
    }
    if (email === user?.email) {
      message.warning('新邮箱不能与当前邮箱相同');
      return;
    }
    try {
      setSendingCode(true);
      await userApi.sendEmailCode(email);
      setCodeSent(true);
      setCountdown(60);
      message.success('验证码已发送到您的邮箱');
    } catch (error: any) {
      message.error(error.msg || '验证码发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleUpdateNickname = async () => {
    if (!nickname || nickname.trim() === '') {
      message.warning('昵称不能为空');
      return;
    }
    try {
      await userApi.updateNickname(nickname);
      message.success('昵称修改成功');
      setCurrentNickname(nickname);
      refreshUser();
    } catch (error: any) {
      message.error(error.msg || '昵称修改失败');
    }
  };

  const handleUpdateEmail = async () => {
    if (!email || email.trim() === '') {
      message.warning('邮箱不能为空');
      return;
    }
    if (email === user?.email) {
      message.warning('新邮箱不能与当前邮箱相同');
      return;
    }
    if (!emailCode || emailCode.trim() === '') {
      message.warning('请输入验证码');
      return;
    }
    try {
      await userApi.updateEmail({ newEmail: email, code: emailCode });
      message.success('邮箱修改成功');
      setEmailCode('');
      setCodeSent(false);
      refreshUser();
    } catch (error: any) {
      message.error(error.msg || '邮箱修改失败');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || oldPassword.trim() === '') {
      message.warning('请输入原密码');
      return;
    }
    if (!newPassword || newPassword.trim() === '') {
      message.warning('请输入新密码');
      return;
    }
    if (!confirmPassword || confirmPassword.trim() === '') {
      message.warning('请确认新密码');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning('两次输入的密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      message.warning('密码长度不能少于6位');
      return;
    }
    try {
      await userApi.changePassword(oldPassword, newPassword, confirmPassword);
      message.success('密码修改成功，请重新登录');
      logout();
      window.location.href = '/';
    } catch (error: any) {
      message.error(error.msg || '密码修改失败');
    }
  };

  const handleUploadImage = async (file: File): Promise<boolean> => {
    try {
      const url = await userApi.uploadImage(file);
      setFeedbackImages(prev => [...prev, url]);
      return false;
    } catch (error) {
      message.error('上传失败');
      return false;
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackContent || feedbackContent.trim() === '') {
      message.warning('请输入反馈内容');
      return;
    }
    try {
      setSubmitting(true);
      await feedbackApi.createFeedback({
        content: feedbackContent,
        contact: feedbackContact || undefined,
        images: feedbackImages.length > 0 ? feedbackImages.join(',') : undefined
      });
      message.success('提交成功，感谢您的反馈');
      setFeedbackContent('');
      setFeedbackContact('');
      setFeedbackImages([]);
    } catch (error: any) {
      message.error(error.msg || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getOperationName = (type: string) => {
    const map: Record<string, string> = {
      create: '创作',
      beauty: '美颜',
      expand: '扩图',
      matting: '抠图',
      enhance: '增强',
      restore: '修复',
    };
    return map[type] || type;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') {
      return <CheckCircleOutlined className="text-green-500" />;
    } else if (status === 'failed') {
      return <CloseCircleOutlined className="text-red-500" />;
    }
    return <ClockCircleOutlined className="text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">个人中心</h1>
        <p className="mt-2 text-gray-500">管理您的个人信息和账户设置</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <div className="flex space-x-5 md:space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            概览
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            个人信息
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'email'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            修改邮箱
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'password'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            修改密码
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'feedback'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            意见反馈
          </button>
          <button
            onClick={() => setActiveTab('consume')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'consume'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            消费记录
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`pb-4 text-sm font-medium transition-colors ${
              activeTab === 'wallet'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            钱包管理
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* VIP Status and Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* VIP Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-black mb-4">会员状态</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {userStats?.vip ? (
                    <>
                      <CrownOutlined className="text-4xl text-yellow-500" />
                      <div className="flex-1">
                        <p className="text-lg font-medium text-black">{userStats?.vipType}</p>
                        <p className="text-sm text-gray-500">
                          剩余 {userStats?.vipRemainingDays} 天
                        </p>
                        {userStats?.dailyDownloadLimit && userStats?.dailyDownloadLimit > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            今日下载: {userStats?.dailyDownloadCount || 0}/{userStats?.dailyDownloadLimit}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <UserOutlined className="text-4xl text-gray-400" />
                      <div className="flex-1">
                        <p className="text-lg font-medium text-black">非VIP</p>
                        <p className="text-sm text-gray-500">
                          升级VIP享受更多特权
                        </p>
                      </div>
                      <Link
                        to="/recharge"
                        target="_blank"
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                      >
                        去升级
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl border border-orange-200 p-6">
              <h2 className="text-lg font-semibold text-black mb-4 flex items-center justify-between">
                <span>钱包余额</span>
                <button
                  onClick={() => setActiveTab('consume')}
                  className="text-sm font-normal text-orange-600 hover:text-orange-700"
                >
                  查看消费记录 →
                </button>
              </h2>
              <div className="flex items-center space-x-4">
                <img src={walletIcon} alt="余额" className="w-10 h-10" />
                <div className="flex-1">
                  <p className="text-3xl font-bold text-black">¥{balanceStats?.balance.toFixed(2) || '0.00'}</p>
                  <div className="flex gap-4 mt-1">
                    <p className="text-xs text-gray-500">今日消费: ¥{balanceStats?.todayConsumed.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500">累计消费: ¥{balanceStats?.totalConsumed.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                <Link
                  to="/recharge"
                  target="_blank"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                >
                  充值
                </Link>
              </div>
            </div>
          </div>

          {/* Admin Role */}
          {user?.role === 'ADMIN' || user?.role === 'STAFF' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-black mb-4">管理员角色</h2>
              <div className="flex items-center space-x-4">
                <UserOutlined className="text-4xl text-blue-500" />
                <div>
                  <p className="text-lg font-medium text-black">
                    {user.role === 'ADMIN' ? '超级管理员' : '工作人员'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.role === 'ADMIN'
                      ? '拥有所有管理权限'
                      : '拥有部分管理权限'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">下载次数</p>
                  <p className="text-2xl font-bold text-black mt-1">
                    {userStats?.downloadCount || 0}
                  </p>
                </div>
                <DownloadOutlined className="text-2xl text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">喜爱总数</p>
                  <p className="text-2xl font-bold text-black mt-1">
                    {userStats?.likeCount || 0}
                  </p>
                </div>
                <HeartOutlined className="text-2xl text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">收藏数</p>
                  <p className="text-2xl font-bold text-black mt-1">
                    {userStats?.favoriteCount || 0}
                  </p>
                </div>
                <StarOutlined className="text-2xl text-yellow-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4">头像</h2>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserOutlined className="text-3xl text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-500">头像暂不支持修改</p>
            </div>
          </div>

          {/* Username (Read-only) */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4">用户名</h2>
            <div className="flex items-center space-x-4">
              <UserOutlined className="text-2xl text-gray-400" />
              <p className="text-lg text-black">{user?.username}</p>
            </div>
            <p className="mt-2 text-sm text-gray-500">用户名不能修改</p>
          </div>

          {/* Current Nickname Display */}
          {currentNickname && currentNickname !== user?.username && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-black mb-4">当前昵称</h2>
              <div className="flex items-center space-x-4">
                <UserOutlined className="text-2xl text-gray-400" />
                <p className="text-lg text-black">{currentNickname}</p>
              </div>
            </div>
          )}

          {/* Nickname */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4">昵称</h2>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="输入昵称"
              />
            </div>
            <button
              onClick={handleUpdateNickname}
              className="mt-4 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              保存昵称
            </button>
          </div>
        </div>
      )}

      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4">修改邮箱</h2>
            <p className="text-sm text-gray-500 mb-6">
              为了您的账户安全，修改邮箱需要验证新邮箱
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当前邮箱
                </label>
                <div className="flex items-center space-x-3">
                  <MailOutlined className="text-gray-400" />
                  <p className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新邮箱
                </label>
                <div className="flex items-center space-x-3">
                  <MailOutlined className="text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="请输入新邮箱"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  验证码
                </label>
                <div className="flex items-center space-x-3">
                  <ClockCircleOutlined className="text-gray-400" />
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    className="w-full flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="请输入验证码"
                  />
                  <button
                    onClick={handleSendEmailCode}
                    disabled={sendingCode || countdown > 0}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleUpdateEmail}
              className="mt-6 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              修改邮箱
            </button>
          </div>
        </div>
      )}

      {activeTab === 'password' && (        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4">修改密码</h2>
            <p className="text-sm text-gray-500 mb-6">
              为了您的账户安全，修改密码后需要重新登录
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  原密码
                </label>
                <div className="flex items-center space-x-3">
                  <LockOutlined className="text-gray-400" />
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="请输入原密码"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新密码
                </label>
                <div className="flex items-center space-x-3">
                  <LockOutlined className="text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="请输入新密码（至少6位）"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认新密码
                </label>
                <div className="flex items-center space-x-3">
                  <LockOutlined className="text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="请再次输入新密码"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              className="mt-6 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              修改密码
            </button>
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-black mb-4">意见反馈</h2>
            <p className="text-sm text-gray-500 mb-6">
              感谢您的反馈，我们会认真处理您的意见和建议
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  反馈内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black min-h-[120px] resize-y"
                  placeholder="请详细描述您遇到的问题或建议..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  联系方式（选填）
                </label>
                <input
                  type="text"
                  value={feedbackContact}
                  onChange={(e) => setFeedbackContact(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="邮箱或手机号，方便我们联系您"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传图片（选填）
                </label>
                <div className="flex flex-wrap gap-2">
                  {feedbackImages.map((img, index) => (
                    <div key={index} className="relative w-20 h-20">
                      <Image
                        src={img}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setFeedbackImages(prev => prev.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {feedbackImages.length < 5 && (
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={handleUploadImage}
                    >
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400">
                        <PlusOutlined className="text-2xl text-gray-400" />
                      </div>
                    </Upload>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">最多上传5张图片</p>
              </div>
            </div>
            <button
              onClick={handleSubmitFeedback}
              disabled={submitting}
              className="mt-6 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : '立即提交'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'consume' && (
        <div className="space-y-6">
          {consumeLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* 柱状图区域 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-lg font-semibold text-black">
                    {chartTypeConfigs[chartType].title}
                  </h2>
                  <SliderSelector
                    options={Object.entries(chartTypeConfigs).map(([key, config]) => ({
                      key,
                      label: config.label,
                    }))}
                    value={chartType}
                    onChange={(value) => setChartType(value as '7h' | '7d' | '30d' | '12m')}
                  />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(value) => formatXAxis(value)}
                      tick={(props: any) => {
                        const { x, y, payload } = props;
                        const value = formatXAxis(payload.value);
                        if (chartType === '30d') {
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text
                                x={0}
                                y={0}
                                dy={16}
                                textAnchor="end"
                                fill="#666"
                                fontSize={12}
                                transform="rotate(-45)"
                              >
                                {value}
                              </text>
                            </g>
                          );
                        }
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={16} textAnchor="middle" fill="#666" fontSize={12}>
                              {value}
                            </text>
                          </g>
                        );
                      }}
                      height={chartType === '30d' ? 60 : 30}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `¥${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
                        return `¥${value.toFixed(2)}`;
                      }}
                      domain={[0, (dataMax: number) => dataMax * 1.15]}
                    />
                    <Tooltip
                      formatter={(value: number) => [`¥${value.toFixed(2)}`, '']}
                      labelFormatter={(label) => `时间: ${label}`}
                    />
                    <Legend />
                    {getModelBarData().map((model, index, arr) => (
                      <Bar
                        key={model.modelName}
                        dataKey={model.modelName}
                        name={model.modelName}
                        stackId="a"
                        fill={COLORS[index % COLORS.length]}
                      >
                        {index === arr.length - 1 && (
                          <LabelList
                            dataKey="cost"
                            position="top"
                            offset={12}
                            fill="#333"
                            fontSize={12}
                            fontWeight="bold"
                            formatter={(value: number) => value > 0 ? `¥${value.toFixed(2)}` : ''}
                          />
                        )}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 模型消费分布 */}
              {modelStats.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-black mb-4">模型消费分布</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {modelStats.map((stat, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-900 truncate">{stat.modelName}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">¥{stat.cost.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.count} 次</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 消费日志列表 */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-black">消费明细</h2>
                </div>

                {consumeLogs.length === 0 ? (
                  <div className="py-20">
                    <Empty description="暂无消费记录" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              时间
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              类型
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              模型
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              状态
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              尺寸
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              用时
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              花费
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {consumeLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(log.createTime).toLocaleString('zh-CN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {getOperationName(log.operationType)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {log.modelName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(log.status)}
                                  <span className={log.status === 'success' ? 'text-green-600' : log.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}>
                                    {log.status === 'success' ? '成功' : log.status === 'failed' ? '失败' : '处理中'}
                                  </span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {log.imageSize || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                ¥{log.cost.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 分页 */}
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
                      <Pagination
                        current={consumePage}
                        total={consumeTotal}
                        pageSize={20}
                        onChange={setConsumePage}
                        showSizeChanger={false}
                        showTotal={(total) => `共 ${total} 条`}
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'wallet' && (
        <div className="space-y-6">
          <WalletTab />
        </div>
      )}
    </div>
  );
}
