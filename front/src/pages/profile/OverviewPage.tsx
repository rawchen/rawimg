import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Avatar, Tag, Empty, Spin } from 'antd';
import { UserOutlined, MailOutlined, CalendarOutlined, CrownOutlined, WalletOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { userApi, balanceApi } from '@/api';
import type { UserStats, BalanceStats } from '@/types';

const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stats, balance] = await Promise.all([
          userApi.getStats(),
          balanceApi.getStats(),
        ]);
        setUserStats(stats);
        setBalanceStats(balance);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 用户信息卡片 */}
      <Card>
        <div className="flex items-center gap-6">
          <Avatar size={80} icon={<UserOutlined />} src={user?.avatar} />
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{user?.username}</h2>
            <div className="flex items-center gap-4 text-gray-600">
              <span className="flex items-center gap-1">
                <MailOutlined /> {user?.email}
              </span>
              <span className="flex items-center gap-1">
                <CalendarOutlined /> 注册于 {new Date(user?.createTime || '').toLocaleDateString()}
              </span>
            </div>
            <div className="mt-2">
              <Tag color={user?.vip ? 'gold' : 'default'} icon={<CrownOutlined />}>
                {user?.vip ? `VIP会员 (到期: ${new Date(user.vipExpireTime || '').toLocaleDateString()})` : '普通用户'}
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      {/* 统计信息 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="账户余额"
              value={balanceStats?.balance || 0}
              precision={2}
              prefix={<WalletOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日消耗"
              value={balanceStats?.todayConsumed || 0}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总消耗"
              value={balanceStats?.totalConsumed || 0}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="请求次数"
              value={userStats?.totalRequests || 0}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      {/* 最近活动 */}
      <Card title="最近活动">
        {userStats?.recentActivities && userStats.recentActivities.length > 0 ? (
          <div className="space-y-4">
            {userStats.recentActivities.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-gray-500">{activity.description}</div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(activity.createTime).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无最近活动" />
        )}
      </Card>
    </div>
  );
};

export default OverviewPage;
