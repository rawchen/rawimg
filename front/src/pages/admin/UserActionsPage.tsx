import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Select,
  message,
  Space,
  Popconfirm,
  Tag,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  DeleteOutlined,
  ClearOutlined,
  EyeOutlined,
  SearchOutlined, LinkOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface UserActionItem {
  id: number;
  userId: number;
  username: string;
  galleryId: number;
  actionType: string;
  createTime: string;
}

export function UserActionsPage() {
  const [actions, setActions] = useState<UserActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [actionTypeFilter, setActionTypeFilter] = useState<string | undefined>(undefined);
  const [userIdFilter, setUserIdFilter] = useState<number | undefined>(undefined);
  const [galleryIdFilter, setGalleryIdFilter] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchActions();
  }, [pagination.current, pagination.pageSize, actionTypeFilter, userIdFilter, galleryIdFilter]);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getUserActions(
        pagination.current,
        pagination.pageSize,
        actionTypeFilter,
        userIdFilter,
        galleryIdFilter
      ) as any;
      setActions(response.content || []);
      setPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取用户行为日志列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteUserAction(id);
      message.success('删除用户行为日志成功');
      fetchActions();
    } catch (error) {
      message.error('删除用户行为日志失败');
    }
  };

  const handleClearActions = async (actionType?: string, days?: number) => {
    try {
      await adminApi.clearUserActions(actionType, days);
      message.success(days ? `清理${days}天前的用户行为日志成功` : '清理用户行为日志成功');
      fetchActions();
    } catch (error) {
      message.error('清理用户行为日志失败');
    }
  };

  const getActionTypeColor = (actionType: string) => {
    const colorMap: Record<string, string> = {
      'LIKE': 'orange',
      'FAVORITE': 'red',
      'DOWNLOAD': 'green',
      'CARD_VALIDATE': 'blue',
      'CARD_REDEEM': 'purple'
    };
    return colorMap[actionType] || 'default';
  };

  const getActionTypeText = (actionType: string) => {
    const textMap: Record<string, string> = {
      'LIKE': '点赞',
      'FAVORITE': '收藏',
      'DOWNLOAD': '下载',
      'CARD_VALIDATE': '卡密验证',
      'CARD_REDEEM': '卡密兑换'
    };
    return textMap[actionType] || actionType;
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
      width: 100,
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
      width: 100,
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
      title: '行为类型',
      dataIndex: 'actionType',
      key: 'actionType',
      width: 120,
      render: (actionType: string) => (
        <Tag color={getActionTypeColor(actionType)}>
          {getActionTypeText(actionType)}
        </Tag>
      )
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
      render: (_: any, record: UserActionItem) => (
        <Popconfirm
          title="确定删除该用户行为日志吗？"
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
      <div className="space-y-6">
        {/* 统计信息 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总记录数"
                value={pagination.total}
                prefix={<SearchOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选器和操作 */}
        <Card>
          <Space wrap>
            <Select
              placeholder="筛选行为类型"
              allowClear
              style={{ width: 150 }}
              value={actionTypeFilter}
              onChange={setActionTypeFilter}
              options={[
                { label: '点赞', value: 'LIKE' },
                { label: '收藏', value: 'FAVORITE' },
                { label: '下载', value: 'DOWNLOAD' },
                { label: '卡密验证', value: 'CARD_VALIDATE' },
                { label: '卡密兑换', value: 'CARD_REDEEM' }
              ]}
            />
            <Popconfirm
              title="确定清理30天前的用户行为日志吗？"
              onConfirm={() => handleClearActions(undefined, 30)}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<ClearOutlined />}>
                清理30天前日志
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确定清理所有用户行为日志吗？此操作不可恢复！"
              onConfirm={() => handleClearActions()}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                清理所有日志
              </Button>
            </Popconfirm>
          </Space>
        </Card>

        {/* 日志列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={actions}
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
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
