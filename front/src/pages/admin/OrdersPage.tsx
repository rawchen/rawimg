import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Select,
  message,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Popconfirm
} from 'antd';
import {
  EyeOutlined,
  PayCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useNavigate } from 'react-router-dom';
import type { Order } from '@/types';

interface OrderWithDetail extends Order {
  id: number;
  username: string;
  email: string;
  cardCode?: string;
  cardType?: string;
}

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize, statusFilter, orderTypeFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getAllOrders(
        pagination.current,
        pagination.pageSize,
        statusFilter,
        orderTypeFilter
      ) as any;
      setOrders(response.content || []);
      setPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      message.success('更新订单状态成功');
      fetchOrders();
    } catch (error) {
      message.error('更新订单状态失败');
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
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
      render: (orderNo: string) => (
        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
          {orderNo}
        </code>
      )
    },
    {
      title: '用户',
      key: 'user',
      width: 200,
      render: (_: any, record: OrderWithDetail) => (
        <div>
          <div className="font-medium">{record.username}</div>
          <div className="text-gray-500 text-xs">{record.email}</div>
        </div>
      )
    },
    {
      title: '订单类型',
      dataIndex: 'orderType',
      key: 'orderType',
      width: 110,
      render: (orderType: string) => {
        if (orderType === 'VIP') {
          return <Tag color="gold">VIP会员</Tag>;
        } else if (orderType === 'POINTS') {
          return <Tag color="blue">积分充值</Tag>;
        }
        return <Tag>{orderType}</Tag>;
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number) => `¥${amount.toFixed(2)}`
    },
    {
      title: '详情',
      key: 'details',
      width: 150,
      render: (_: any, record: OrderWithDetail) => {
        if (record.orderType === 'VIP') {
          return <span>{record.vipDays} 天</span>;
        } else if (record.orderType === 'POINTS') {
          return <span>{record.points} 积分</span>;
        }
        return '-';
      }
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          'ALIPAY': 'blue',
          'WECHAT': 'green',
          'CARD_KEY': 'purple'
        };
        const nameMap: Record<string, string> = {
          'ALIPAY': '支付宝',
          'WECHAT': '微信',
          'CARD_KEY': '卡密兑换'
        };
        return <Tag color={colorMap[method] || 'default'}>
          {nameMap[method] || method}
        </Tag>;
      }
    },
    {
      title: '卡密信息',
      key: 'cardInfo',
      width: 150,
      render: (_: any, record: OrderWithDetail) => {
        if (record.paymentMethod === 'CARD_KEY' && record.cardCode) {
          return (
            <div className="text-xs">
              <div className="font-mono bg-gray-100 px-1 rounded">{record.cardCode}</div>
              {record.cardType && <div className="text-gray-500 mt-1">{record.cardType}</div>}
            </div>
          );
        }
        return '-';
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string; icon: any }> = {
          'PENDING': { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
          'PAID': { color: 'green', text: '已支付', icon: <CheckCircleOutlined /> },
          'CANCELLED': { color: 'default', text: '已取消', icon: <CloseCircleOutlined /> },
          'REFUNDED': { color: 'red', text: '已退款', icon: <CloseCircleOutlined /> }
        };
        const info = statusMap[status] || { color: 'default', text: status, icon: null };
        return <Tag icon={info.icon} color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '支付时间',
      dataIndex: 'payTime',
      key: 'payTime',
      width: 180,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: OrderWithDetail) => (
        <Space>
          {record.status === 'PENDING' && (
            <>
              <Popconfirm
                title="确定标记为已支付吗？"
                onConfirm={() => handleUpdateStatus(record.id, 'PAID')}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  icon={<CheckCircleOutlined />}
                >
                  确认支付
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确定取消订单吗？"
                onConfirm={() => handleUpdateStatus(record.id, 'CANCELLED')}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  danger
                  icon={<CloseCircleOutlined />}
                >
                  取消订单
                </Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'PAID' && (
            <Popconfirm
              title="确定退款吗？"
              onConfirm={() => handleUpdateStatus(record.id, 'REFUNDED')}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                danger
                icon={<PayCircleOutlined />}
              >
                退款
              </Button>
            </Popconfirm>
          )}
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
                title="总订单数"
                value={pagination.total}
                prefix={<PayCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="待支付订单"
                value={orders.filter(o => o.status === 'PENDING').length}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已支付订单"
                value={orders.filter(o => o.status === 'PAID').length}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总收入"
                value={orders.filter(o => o.status === 'PAID').reduce((sum, o) => sum + o.amount, 0)}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选器 */}
        <Card>
          <Space>
            <Select
              placeholder="筛选订单状态"
              allowClear
              style={{ width: 150 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: '待支付', value: 'PENDING' },
                { label: '已支付', value: 'PAID' },
                { label: '已取消', value: 'CANCELLED' },
                { label: '已退款', value: 'REFUNDED' }
              ]}
            />
            <Select
              placeholder="筛选订单类型"
              allowClear
              style={{ width: 150 }}
              value={orderTypeFilter}
              onChange={setOrderTypeFilter}
              options={[
                { label: 'VIP会员', value: 'VIP' },
                { label: '积分充值', value: 'POINTS' }
              ]}
            />
          </Space>
        </Card>

        {/* 订单列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={orders}
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
      </div>
    </AdminLayout>
  );
}
