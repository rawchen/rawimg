import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  message,
  Space,
  Popconfirm,
  Tag,
  Image,
  Input,
  Select,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { adminImageTaskApi, ImageTaskRecord } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';

// 确保URL有https前缀
const ensureHttpsUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return 'https://' + url;
};

export function ImageTasksPage() {
  const [tasks, setTasks] = useState<ImageTaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [searchTaskType, setSearchTaskType] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ImageTaskRecord | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, done: 0, error: 0 });

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [pagination.current, pagination.pageSize]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await adminImageTaskApi.list(
        pagination.current,
        pagination.pageSize,
        searchUserId ? parseInt(searchUserId) : undefined,
        searchTaskType || undefined,
        searchStatus || undefined
      );
      setTasks(response.records || []);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (error) {
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await adminImageTaskApi.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTasks();
  };

  const handleReset = () => {
    setSearchUserId('');
    setSearchTaskType('');
    setSearchStatus('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleDelete = async (taskId: string) => {
    try {
      await adminImageTaskApi.delete(taskId);
      message.success('删除成功');
      fetchTasks();
      fetchStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = async (taskIds: string[]) => {
    try {
      await adminImageTaskApi.deleteBatch(taskIds);
      message.success('批量删除成功');
      fetchTasks();
      fetchStats();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleViewDetail = (task: ImageTaskRecord) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'processing', text: '处理中' },
      done: { color: 'success', text: '完成' },
      error: { color: 'error', text: '失败' },
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'taskId',
      key: 'taskId',
      width: 280,
      ellipsis: true,
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
    },
    {
      title: '类型',
      dataIndex: 'taskType',
      key: 'taskType',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'create' ? 'blue' : 'green'}>
          {type === 'create' ? '创作' : '增强'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '提示词',
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
      width: 200,
    },
    {
      title: '尺寸',
      dataIndex: 'size',
      key: 'size',
      width: 100,
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (duration: number | null) =>
        duration ? `${(duration / 1000).toFixed(1)}s` : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ImageTaskRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定删除此任务?"
            onConfirm={() => handleDelete(record.taskId)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <Card className="mb-4">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总任务数"
                value={stats.total}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="处理中"
                value={stats.pending}
                prefix={<SyncOutlined spin={stats.pending > 0} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="已完成"
                value={stats.done}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="失败"
                value={stats.error}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-4">
            <Input
              placeholder="用户ID"
              value={searchUserId}
              onChange={e => setSearchUserId(e.target.value)}
              style={{ width: 120 }}
            />
            <Select
              placeholder="任务类型"
              value={searchTaskType || undefined}
              onChange={setSearchTaskType}
              style={{ width: 120 }}
              allowClear
              options={[
                { value: 'create', label: '创作' },
                { value: 'enhance', label: '增强' },
              ]}
            />
            <Select
              placeholder="状态"
              value={searchStatus || undefined}
              onChange={setSearchStatus}
              style={{ width: 120 }}
              allowClear
              options={[
                { value: 'pending', label: '处理中' },
                { value: 'done', label: '完成' },
                { value: 'error', label: '失败' },
              ]}
            />
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchTasks}>
              刷新
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="taskId"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: page, pageSize }));
              },
            }}
            rowSelection={{
              onChange: (selectedRowKeys) => {
                console.log('Selected:', selectedRowKeys);
              },
            }}
          />
        </Card>

        {/* 详情弹窗 */}
        <Modal
          title="任务详情"
          open={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={null}
          width={700}
        >
          {selectedTask && (
            <div>
              {/* 结果图片 */}
              {selectedTask.resultImageUrl && (
                <div className="relative mb-4">
                  <div className="font-medium mb-2">生成结果</div>
                  <Image
                    src={ensureHttpsUrl(selectedTask.resultImageUrl) || ''}
                    alt="结果"
                    className="rounded-lg"
                    style={{ maxHeight: 300, objectFit: 'contain' }}
                  />
                  {/* 参考图 */}
                  {selectedTask.referenceImageUrls && (
                    <div className="absolute bottom-2 right-2 w-20 h-20 rounded border border-white shadow overflow-hidden">
                      <Image
                        src={ensureHttpsUrl(JSON.parse(selectedTask.referenceImageUrls)[0]) || ''}
                        alt="参考图"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 提示词 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="font-medium mb-2">提示词</div>
                <div className="text-gray-600">{selectedTask.prompt}</div>
              </div>

              {/* 其他信息 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">任务ID：</span>
                  <span className="font-mono">{selectedTask.taskId}</span>
                </div>
                <div>
                  <span className="text-gray-500">用户ID：</span>
                  <span>{selectedTask.userId}</span>
                </div>
                <div>
                  <span className="text-gray-500">类型：</span>
                  <span>{selectedTask.taskType === 'create' ? '创作' : '增强'}</span>
                </div>
                <div>
                  <span className="text-gray-500">状态：</span>
                  {getStatusTag(selectedTask.status)}
                </div>
                <div>
                  <span className="text-gray-500">尺寸：</span>
                  <span>{selectedTask.size}</span>
                </div>
                <div>
                  <span className="text-gray-500">耗时：</span>
                  <span>{selectedTask.duration ? `${(selectedTask.duration / 1000).toFixed(1)}s` : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">创建时间：</span>
                  <span>{selectedTask.createTime}</span>
                </div>
              </div>

              {/* 错误信息 */}
              {selectedTask.errorMsg && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg text-red-600">
                  <div className="font-medium mb-1">错误信息</div>
                  <div>{selectedTask.errorMsg}</div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
