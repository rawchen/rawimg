import { useState, useEffect } from 'react';
import {
  Card,
  Col,
  Row,
  Spin,
  Statistic
} from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import type { DashboardStats } from '@/types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [likesData, setLikesData] = useState<{ title: string; count: number }[]>([]);
  const [favoritesData, setFavoritesData] = useState<{ title: string; count: number }[]>([]);
  const [viewsData, setViewsData] = useState<{ title: string; count: number }[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; views: number; downloads: number; likes: number; favorites: number }[]>([]);
  const [viewsTrendData, setViewsTrendData] = useState<{ date: string; views: number; uv: number; downloads: number; likes: number; favorites: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, likes, favorites, views, trend, viewsTrend] = await Promise.all([
        adminApi.getDashboardStats() as any,
        adminApi.getLikesChart() as any,
        adminApi.getFavoritesChart() as any,
        adminApi.getViewsChart() as any,
        adminApi.getTrendChart() as any,
        adminApi.getViewsTrendChart() as any,
      ]);

      setStats(statsData);
      setLikesData(likes);
      setFavoritesData(favorites);
      setViewsData(views);
      setTrendData(trend);
      setViewsTrendData(viewsTrend);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Spin size="large" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{  }}>
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="总图集数" value={stats?.totalGalleries || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="总用户数" value={stats?.totalUsers || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="VIP会员数" value={stats?.totalVipUsers || 0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="昨日新增用户" value={stats?.yesterdayUsers || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      {/*</Row>*/}

      {/* Yesterday Stats */}
      {/*<Row gutter={[16, 16]} style={{ marginTop: 16 }}>*/}
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="昨日新增图集" value={stats?.yesterdayGalleries || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="昨日获赞" value={stats?.yesterdayLikes || 0} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="昨日评论" value={stats?.yesterdayComments || 0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Card size="small" style={{ paddingLeft: 8 }}>
            <Statistic title="30天访问量" value={stats?.totalAccess30Days || 0} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="30天浏览趋势">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={viewsTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="views" name="PV页面浏览" stroke="#1890ff" strokeWidth={2} />
                <Line type="monotone" dataKey="uv" name="UV独立访客" stroke="#52c41a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="30天趋势图（下载/点赞/收藏）">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="downloads" name="下载量" stroke="#52c41a" strokeWidth={2} />
                <Line type="monotone" dataKey="likes" name="点赞量" stroke="#ff4d4f" strokeWidth={2} />
                <Line type="monotone" dataKey="favorites" name="收藏量" stroke="#faad14" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="点赞排行榜">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={likesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1890ff" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      {/*</Row>*/}

      {/*<Row gutter={[16, 16]} style={{ marginTop: 16 }}>*/}
        <Col xs={24} lg={8}>
          <Card title="收藏排行榜">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={favoritesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ title, percent }: { title: string; percent: number }) => `${title}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {favoritesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="访问排行榜">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={viewsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}
