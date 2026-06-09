import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Select,
  Space,
  Popconfirm,
  Tag,
  Statistic,
  Row,
  Col,
  Tooltip,
  message,
} from 'antd';
import {
  DeleteOutlined,
  ClearOutlined,
  EyeOutlined,
  SearchOutlined, LinkOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface LogItem {
  id: number;
  userId: number;
  username: string;
  galleryId: number;
  ip: string;
  region: string;
  userAgent: string;
  action: string;
  createTime: string;
}

export function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const [userIdFilter, setUserIdFilter] = useState<number | undefined>(undefined);
  const [galleryIdFilter, setGalleryIdFilter] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchLogs();
  }, [pagination.current, pagination.pageSize, actionFilter, userIdFilter, galleryIdFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getAccessLogs(
        pagination.current,
        pagination.pageSize,
        actionFilter,
        userIdFilter,
        galleryIdFilter
      ) as any;
      setLogs(response.content || []);
      setPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取日志列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteLog(id);
      message.success('删除日志成功');
      fetchLogs();
    } catch (error) {
      message.error('删除日志失败');
    }
  };

  const handleClearLogs = async (days?: number) => {
    try {
      await adminApi.clearLogs(days);
      message.success(days ? `清理${days}天前的日志成功` : '清理所有日志成功');
      fetchLogs();
    } catch (error) {
      message.error('清理日志失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
      render: (userId: number) => userId || '-'
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (username: string) => username || '-'
    },
    {
      title: '图集ID',
      dataIndex: 'galleryId',
      key: 'galleryId',
      width: 80,
      textAlign: 'center',
      render: (galleryId: number) => (
        galleryId ? (
          <Button
            type="link"
            icon={<LinkOutlined />}
            style={{ paddingInline: 0 }}
            onClick={() => window.open(`/id/${galleryId}`, '_blank')}
          >
            查看
          </Button>
        ) : '-'
      )
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: string) => {
        const colorMap: Record<string, string> = {
          'HOME': 'purple',
          'VIEW': 'blue',
          'DOWNLOAD': 'green',
          'LIKE': 'orange',
          'FAVORITE': 'red'
        };
        return <Tag color={colorMap[action] || 'default'}>{action || '-'}</Tag>;
      }
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 150
    },
    {
      title: '地区',
      dataIndex: 'region',
      key: 'region',
      width: 200
    },
    {
      title: 'User Agent',
      dataIndex: 'userAgent',
      key: 'userAgent',
      width: 270,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <div
            style={{
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: LogItem) => (
        <Popconfirm
          title="确定删除该日志吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        {/* 统计信息 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总日志数"
                value={pagination.total}
                prefix={<SearchOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div style={{ marginBottom: 24 }}>
        {/* 筛选器和操作 */}
        <Card>
          <Space wrap>
            <Select
              placeholder="筛选操作类型"
              allowClear
              style={{ width: 150 }}
              value={actionFilter}
              onChange={setActionFilter}
              options={[
                { label: '主页', value: 'HOME' },
                { label: '详情', value: 'VIEW' },
                { label: '下载', value: 'DOWNLOAD' },
                { label: '点赞', value: 'LIKE' },
                { label: '收藏', value: 'FAVORITE' }
              ]}
            />
            <Popconfirm
              title="确定清理30天前的日志吗？"
              onConfirm={() => handleClearLogs(30)}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<ClearOutlined />}>
                清理30天前日志
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确定清理所有日志吗？此操作不可恢复！"
              onConfirm={() => handleClearLogs()}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                清理所有日志
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      </div>

      {/* 日志列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize, total: pagination.total });
            },
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </AdminLayout>
  );
}
