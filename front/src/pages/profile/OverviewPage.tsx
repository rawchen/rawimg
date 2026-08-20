import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Avatar, Tag, Spin } from 'antd';
import { UserOutlined, MailOutlined, CalendarOutlined, CrownOutlined } from '@ant-design/icons';
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
                <CalendarOutlined /> 注册于 {user?.createTime && !isNaN(new Date(user.createTime).getTime()) ? new Date(user.createTime).toLocaleDateString() : '未知'}
              </span>
            </div>
            <div className="mt-2">
              <Tag color={user?.vip ? 'gold' : 'default'} icon={<CrownOutlined />}>
                {user?.vip ? `VIP会员 (到期: ${user.vipExpireTime && !isNaN(new Date(user.vipExpireTime).getTime()) ? new Date(user.vipExpireTime).toLocaleDateString() : '未知'})` : '普通用户'}
              </Tag>
            </div>
          </div>
        </div>
      </Card>

      {/* 统计信息 */}
      <Card 
        style={{ 
          background: 'linear-gradient(135deg, rgb(51, 65, 85), rgb(30, 41, 59), rgb(15, 23, 42))',
          position: 'relative',
          overflow: 'hidden'
        }} 
        styles={{ body: { padding: '16px' } }}
      >
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'rgba(255, 255, 255, 0.05)' }} />
        <div className="absolute -right-4 -bottom-10 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'rgba(255, 255, 255, 0.05)' }} />
        <Row gutter={24} style={{ position: 'relative', zIndex: 1 }}>
          <Col span={6}>
            <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>账户余额</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              {balanceStats?.balance?.toFixed(2) || '0.00'}元
            </div>
          </Col>
          <Col span={6}>
            <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>今日消耗</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              ¥{balanceStats?.todayConsumed?.toFixed(2) || '0.00'}
            </div>
          </Col>
          <Col span={6}>
            <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>总消耗</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              ¥{balanceStats?.totalConsumed?.toFixed(2) || '0.00'}
            </div>
          </Col>
          <Col span={6}>
            <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>下载次数</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              {userStats?.downloadCount || 0}<span style={{ fontSize: 14, marginLeft: 4 }}>次</span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 最近活动 */}
      <Card title="最近活动">
        <div className="text-center text-gray-400 py-8">
          暂无活动记录
        </div>
      </Card>
    </div>
  );
};

export default OverviewPage;
