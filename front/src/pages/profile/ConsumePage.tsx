import React, { useState, useEffect } from 'react';
import { Table, Card, Empty, Tag, Row, Col, Radio, Skeleton } from 'antd';
import SliderSelector from '@/components/SliderSelector';
import { balanceApi } from '@/api';
import type { ConsumeLog, BalanceStats, HourlyStats as HourlyStatsType, ModelStats as ModelStatsType } from '@/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

const ConsumePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'records' | 'details'>('records');
  const [logs, setLogs] = useState<ConsumeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  
  // 图表相关状态
  const [hourlyStats, setHourlyStats] = useState<HourlyStatsType[]>([]);
  const [modelStats, setModelStats] = useState<ModelStatsType[]>([]);
  const [chartType, setChartType] = useState<'7h' | '7d' | '30d' | '12m'>('7h');
  
  // 统计维度配置
  const chartTypeConfigs: Record<string, { label: string; title: string; hours: number; type: 'hour' | 'day' | 'month' }> = {
    '7h':  { label: '近7时',  title: '近7小时消费分布',  hours: 7,  type: 'hour' },
    '7d':  { label: '近7天',    title: '近7天消费分布',    hours: 7,  type: 'day' },
    '30d': { label: '近1月',  title: '近1个月消费分布',  hours: 30, type: 'day' },
    '12m': { label: '近1年',    title: '近1年消费分布',    hours: 12, type: 'month' },
  };

  // 图表颜色配置
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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
    const cost = stat.cost || 0;
    const result: any = {
      hour: stat.hour,
      cost: (cost >= 0 && cost < 1000000 && isFinite(cost)) ? cost : 0
    };
    if (stat.modelDistribution) {
      stat.modelDistribution.forEach((m: any) => {
        const modelCost = m.cost || 0;
        result[m.modelName] = (modelCost >= 0 && modelCost < 1000000 && isFinite(modelCost)) ? modelCost : 0;
      });
    }
    return result;
  });

  useEffect(() => {
    void loadLogs();
    void loadStats();
  }, [pagination.current]);
  
  useEffect(() => {
    void fetchChartData();
  }, [chartType]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await balanceApi.getConsumeLogs(pagination.current, pagination.pageSize);
      setLogs(result.records);
      setPagination({ ...pagination, total: result.total });
    } catch (error) {
      console.error('Failed to load consume logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const stats = await balanceApi.getStats();
      setBalanceStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };
  
  // 获取图表数据
  const fetchChartData = async () => {
    try {
      const config = chartTypeConfigs[chartType];
      const result = await balanceApi.getConsumeChart(config.hours, config.type);
      setHourlyStats(result.hourlyStats || []);
      setModelStats(result.modelStats || []);
    } catch (error) {
      console.error('获取图表数据失败:', error);
    }
  };

  const columns = [
    {
      title: '消费类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 150,
      render: (type: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          create: { color: 'blue', text: '图像创作' },
          beauty: { color: 'pink', text: '图像美颜' },
          expand: { color: 'purple', text: '图像扩展' },
          matting: { color: 'cyan', text: '图像抠图' },
          enhance: { color: 'green', text: '图像增强' },
          remove: { color: 'orange', text: '图像去除' },
          restore: { color: 'magenta', text: '图像修复' },
          edit: { color: 'gold', text: '图像编辑' },
          clothes: { color: 'lime', text: '换装' },
        };
        const config = typeMap[type] || { color: 'default', text: type };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '消费金额',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      render: (cost: number) => (
        <span style={{ color: '#ff4d4f' }}>
          -¥{(cost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '模型',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 150,
      ellipsis: true,
      render: (modelName: string) => modelName || '-',
    },
    {
      title: '图片尺寸',
      dataIndex: 'imageSize',
      key: 'imageSize',
      width: 120,
      render: (size: string) => size || '-',
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (duration: number) => duration ? `${(duration / 1000).toFixed(2)}s` : '-',
    },
    {
      title: '消费时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">消费中心</h2>
      
      {/* Tab 切换 */}
      <div style={{ marginBottom: 16 }}>
        <Radio.Group value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
          <Radio.Button value="records">消费记录</Radio.Button>
          <Radio.Button value="details">消费明细</Radio.Button>
        </Radio.Group>
      </div>

      {activeTab === 'records' && (
        <>
          {/* 统计信息 */}
          <Card 
            style={{ 
              marginBottom: 16,
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
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>当前余额</div>
                <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                  {statsLoading ? <Skeleton.Input active size="small" style={{ width: 80, height: 24, background: 'rgba(255,255,255,0.2)' }} /> : `¥${(balanceStats?.balance || 0).toFixed(2)}`}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>今日消耗</div>
                <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                  {statsLoading ? <Skeleton.Input active size="small" style={{ width: 80, height: 24, background: 'rgba(255,255,255,0.2)' }} /> : `¥${(balanceStats?.todayConsumed || 0).toFixed(2)}`}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>今日操作</div>
                <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                  {statsLoading ? <Skeleton.Input active size="small" style={{ width: 80, height: 24, background: 'rgba(255,255,255,0.2)' }} /> : <>{balanceStats?.todayOperations || 0}<span style={{ fontSize: 14, marginLeft: 4 }}>次</span></>}
                </div>
              </Col>
              <Col span={6}>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 4 }}>总消耗</div>
                <div style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                  {statsLoading ? <Skeleton.Input active size="small" style={{ width: 80, height: 24, background: 'rgba(255,255,255,0.2)' }} /> : `¥${(balanceStats?.totalConsumed || 0).toFixed(2)}`}
                </div>
              </Col>
            </Row>
          </Card>

          {/* 柱状图区域 */}
          <Card className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{chartTypeConfigs[chartType].title}</h3>
              <SliderSelector
                options={Object.entries(chartTypeConfigs).map(([key, config]) => ({
                  key,
                  label: config.label,
                }))}
                value={chartType}
                onChange={(value) => setChartType(value as any)}
              />
            </div>
            <ResponsiveContainer width="100%" height={240}>
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
                  tickFormatter={(value: number) => {
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
                        offset={5}
                        fill="#333"
                        fontSize={12}
                        fontWeight="bold"
                        formatter={(value: number) => value > 0 ? `${value.toFixed(2)}` : ''}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* 模型消费分布 */}
          {modelStats.length > 0 && (
            <Card>
              {/*<h3 className="text-lg font-semibold mb-3">模型消费分布</h3>*/}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {modelStats.map((stat, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{stat.modelName}</p>
                    <p className="text-base font-bold text-gray-900 mt-1">¥{stat.cost.toFixed(2)} <span className="font-normal pl-2">{stat.count} 次</span></p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {activeTab === 'details' && (
        <Card>
          <Table
            className="compact-table"
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize });
              },
            }}
            locale={{ emptyText: <Empty description="暂无消费记录" /> }}
          />
        </Card>
      )}
    </div>
  );
};

export default ConsumePage;
