import { useState, useEffect } from 'react';
import { message, Pagination, Empty, Spin } from 'antd';
import { balanceApi, ConsumeLog } from '@/api';
import SliderSelector from '@/components/SliderSelector';
import {
  WalletOutlined,
  ClockCircleOutlined,
  PictureOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

export function ConsumeLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ConsumeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hourlyStats, setHourlyStats] = useState<any[]>([]);
  const [modelStats, setModelStats] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'7h' | '7d' | '30d' | '12m'>('7h');

  // 统计维度配置：label 标签 / hours 时长 / type 类型
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

  useEffect(() => {
    loadData();
  }, [page]);

  // 切换图表类型时重新加载图表数据
  useEffect(() => {
    loadChartData();
  }, [chartType]);

  const loadChartData = async () => {
    try {
      const config = chartTypeConfigs[chartType];
      const chartRes = await balanceApi.getConsumeChart(config.hours, config.type);
      setHourlyStats(chartRes.hourlyStats || []);
      setModelStats(chartRes.modelStats || []);
    } catch (error: any) {
      message.error(error.msg || '加载失败');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const config = chartTypeConfigs[chartType];
      const [logsRes, chartRes] = await Promise.all([
        balanceApi.getConsumeLogs(page, 20),
        balanceApi.getConsumeChart(config.hours, config.type)
      ]);
      setLogs(logsRes.records || []);
      setTotal(logsRes.total || 0);
      setHourlyStats(chartRes.hourlyStats || []);
      setModelStats(chartRes.modelStats || []);
    } catch (error: any) {
      message.error(error.msg || '加载失败');
    } finally {
      setLoading(false);
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

  // 计算柱状图的最大值，过滤异常值
  const validCosts = hourlyStats
    .map(h => h.cost || 0)
    .filter(cost => cost >= 0 && cost < 1000000 && isFinite(cost));
  const maxCost = validCosts.length > 0 ? Math.max(...validCosts, 0.01) : 0.01;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-black mb-8">消费记录</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 柱状图区域 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
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
            <div className="flex items-end gap-2 h-48">
              {hourlyStats.map((stat, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: '150px' }}>
                    <div
                      className="bg-gradient-to-t from-amber-500 to-orange-500 rounded-t-lg transition-all hover:from-amber-600 hover:to-orange-600"
                      style={{
                        width: '100%',
                        height: `${(stat.cost / maxCost) * 100}%`,
                        minHeight: stat.cost > 0 ? '4px' : '0'
                      }}
                      title={`¥${stat.cost.toFixed(2)}`}
                    />
                  </div>
                  <div 
                    className="text-xs text-gray-500 whitespace-nowrap"
                    style={{
                      transform: chartType === '30d' ? 'rotate(-45deg)' : 'none',
                      transformOrigin: 'top left',
                      marginLeft: chartType === '30d' ? '-10px' : '0',
                      marginTop: chartType === '30d' ? '5px' : '0'
                    }}
                  >
                    {formatXAxis(stat.hour)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 模型消费分布 */}
          {modelStats.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
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

            {logs.length === 0 ? (
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
                      {logs.map((log) => (
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
                    current={page}
                    total={total}
                    pageSize={20}
                    onChange={setPage}
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
  );
}
