import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  message,
  Tag,
  Space,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Switch,
  Drawer,
} from 'antd';
import {
  UserOutlined,
  CrownOutlined,
  StopOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileTextOutlined, EyeOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import type { SysUser } from '@/types';

interface UserWithDetail extends SysUser {
  id: number;
}

export function UsersPage() {
  const [users, setUsers] = useState<UserWithDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithDetail | null>(null);
  const [form] = Form.useForm();

  // 用户行为日志侧拉框相关状态
  const [actionDrawerVisible, setActionDrawerVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [userActions, setUserActions] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionPagination, setActionPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [actionTypeFilter, setActionTypeFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getAllUsers(
        pagination.current,
        pagination.pageSize,
        roleFilter
      ) as any;
      setUsers(response.content || []);
      setPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      message.success('更新角色成功');
      fetchUsers();
    } catch (error) {
      message.error('更新角色失败');
    }
  };

  const handleStatusChange = async (userId: number, status: string) => {
    try {
      await adminApi.updateUserStatus(userId, status);
      message.success('更新状态成功');
      fetchUsers();
    } catch (error) {
      message.error('更新状态失败');
    }
  };

  const handleEdit = (user: UserWithDetail) => {
    setEditingUser(user);
    form.setFieldsValue({
      role: user.role,
      status: user.status
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    if (!editingUser) return;
    
    try {
      const values = await form.validateFields();
      await Promise.all([
        adminApi.updateUserRole(editingUser.id, values.role),
        adminApi.updateUserStatus(editingUser.id, values.status)
      ]);
      message.success('更新成功');
      setEditModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('更新失败');
    }
  };

  // 打开用户行为日志侧拉框
  const handleViewActions = (user: UserWithDetail) => {
    setSelectedUserId(user.id);
    setSelectedUsername(user.username);
    setActionDrawerVisible(true);
    setActionPagination({ current: 1, pageSize: 10, total: 0 });
    setActionTypeFilter(undefined);
  };

  // 获取用户行为日志
  const fetchUserActions = async () => {
    if (!selectedUserId) return;
    
    setActionLoading(true);
    try {
      const response = await adminApi.getUserActions(
        actionPagination.current,
        actionPagination.pageSize,
        actionTypeFilter,
        selectedUserId,
        undefined
      ) as any;
      setUserActions(response.content || []);
      setActionPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取用户行为日志失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 当侧拉框打开或分页/筛选条件变化时重新获取数据
  useEffect(() => {
    if (actionDrawerVisible && selectedUserId) {
      fetchUserActions();
    }
  }, [actionDrawerVisible, actionPagination.current, actionPagination.pageSize, actionTypeFilter, selectedUserId]);

  // 关闭侧拉框时重置状态
  const handleDrawerClose = () => {
    setActionDrawerVisible(false);
    setSelectedUserId(null);
    setSelectedUsername('');
    setUserActions([]);
    setActionTypeFilter(undefined);
  };

  // 用户行为类型映射
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

  // 用户行为日志表格列定义
  const actionColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
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
            size="small"
            icon={<EyeOutlined />}
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
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    }
  ];

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string, record: UserWithDetail) => (
        <Tag color={role === 'ADMIN' ? 'red' : role === 'STAFF' ? 'orange' : 'blue'}>
          {role === 'ADMIN' ? '管理员' : role === 'STAFF' ? '员工' : '普通用户'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'NORMAL' ? 'green' : 'red'}>
          {status === 'NORMAL' ? '正常' : '禁用'}
        </Tag>
      )
    },
    {
      title: 'VIP',
      dataIndex: 'vip',
      key: 'vip',
      width: 80,
      render: (vip: boolean) => (
        vip ? <Tag icon={<CrownOutlined />} color="gold">VIP</Tag> : <Tag>普通</Tag>
      )
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 100,
      render: (points: number) => <span>{points}</span>
    },
    {
      title: '注册时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      key: 'lastLoginTime',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: UserWithDetail) => (
        <Space>
          <Switch
            checked={record.status === 'NORMAL'}
            onChange={(checked) => handleStatusChange(record.id, checked ? 'NORMAL' : 'BANNED')}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => handleViewActions(record)}
          >
            日志
          </Button>
        </Space>
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
                title="总用户数"
                value={pagination.total}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选器 */}
        <Card>
          <Space>
            <Select
              placeholder="筛选角色"
              allowClear
              style={{ width: 150 }}
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { label: '管理员', value: 'ADMIN' },
                { label: '员工', value: 'STAFF' },
                { label: '普通用户', value: 'USER' }
              ]}
            />
          </Space>
        </Card>

        {/* 用户列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={users}
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
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* 编辑弹窗 */}
        <Modal
          title="编辑用户"
          open={editModalVisible}
          onOk={handleEditSubmit}
          onCancel={() => setEditModalVisible(false)}
          okText="保存"
          cancelText="取消"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="角色"
              name="role"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select>
                <Select.Option value="ADMIN">管理员</Select.Option>
                <Select.Option value="STAFF">员工</Select.Option>
                <Select.Option value="USER">普通用户</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select>
                <Select.Option value="NORMAL">正常</Select.Option>
                <Select.Option value="BANNED">禁用</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>

        {/* 用户行为日志侧拉框 */}
        <Drawer
          title={`用户行为日志 - ${selectedUsername}`}
          placement="right"
          width={720}
          onClose={handleDrawerClose}
          open={actionDrawerVisible}
        >
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="筛选行为类型"
              allowClear
              style={{ width: 150 }}
              value={actionTypeFilter}
              onChange={(value) => {
                setActionTypeFilter(value);
                setActionPagination(prev => ({ ...prev, current: 1 }));
              }}
              options={[
                { label: '点赞', value: 'LIKE' },
                { label: '收藏', value: 'FAVORITE' },
                { label: '下载', value: 'DOWNLOAD' },
                { label: '卡密验证', value: 'CARD_VALIDATE' },
                { label: '卡密兑换', value: 'CARD_REDEEM' }
              ]}
            />
          </Space>
          <Table
            columns={actionColumns}
            dataSource={userActions}
            rowKey="id"
            loading={actionLoading}
            pagination={{
              current: actionPagination.current,
              pageSize: actionPagination.pageSize,
              total: actionPagination.total,
              onChange: (page, pageSize) => {
                setActionPagination({ current: page, pageSize, total: actionPagination.total });
              },
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
            scroll={{ x: 500 }}
          />
        </Drawer>
      </div>
    </AdminLayout>
  );
}
