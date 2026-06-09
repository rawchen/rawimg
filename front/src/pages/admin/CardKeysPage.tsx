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
  Modal,
  Form,
  InputNumber,
  Input,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  GiftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { adminApi, vipPackageApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface VipPackage {
  id: number;
  packageCode: string;
  packageName: string;
  days: number;
  dailyDownloadCount: number;
  price: number;
  sortOrder: number;
  popular: boolean;
  enabled: boolean;
  purchaseUrl: string;
  description: string;
}

interface CardKey {
  id: number;
  cardCode: string;
  cardType: string;
  cardTypeName: string;
  cardValue: number;
  amount: number;
  status: string;
  statusName: string;
  batchNo: string;
  usedBy: number | null;
  usedByUsername: string | null;
  usedAt: string | null;
  orderId: number | null;
  expireTime: string | null;
  remark: string | null;
  createTime: string;
}

interface CardKeyStats {
  unusedCount: number;
  usedCount: number;
  expiredCount: number;
  totalCount: number;
}

export function CardKeysPage() {
  const [cardKeys, setCardKeys] = useState<CardKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [cardTypeFilter, setCardTypeFilter] = useState<string | undefined>(undefined);
  const [batchNoFilter, setBatchNoFilter] = useState<string | undefined>(undefined);
  const [batchNos, setBatchNos] = useState<string[]>([]);
  const [stats, setStats] = useState<CardKeyStats>({ unusedCount: 0, usedCount: 0, expiredCount: 0, totalCount: 0 });
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [generateForm] = Form.useForm();
  const [generatedCards, setGeneratedCards] = useState<CardKey[]>([]);
  const [showGeneratedModal, setShowGeneratedModal] = useState(false);
  const [vipPackages, setVipPackages] = useState<VipPackage[]>([]);

  useEffect(() => {
    fetchCardKeys();
    fetchStats();
    fetchBatchNos();
    fetchVipPackages();
  }, [pagination.current, pagination.pageSize, statusFilter, cardTypeFilter, batchNoFilter]);

  const fetchCardKeys = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getCardKeys(
        pagination.current,
        pagination.pageSize,
        statusFilter,
        cardTypeFilter,
        batchNoFilter
      ) as any;
      setCardKeys(response.content || []);
      setPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取卡密列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminApi.getCardKeyStats() as CardKeyStats;
      setStats(response);
    } catch (error) {
      console.error('获取统计失败');
    }
  };

  const fetchBatchNos = async () => {
    try {
      const response = await adminApi.getCardKeyBatchNos() as string[];
      setBatchNos(response || []);
    } catch (error) {
      console.error('获取批次号失败');
    }
  };

  const fetchVipPackages = async () => {
    try {
      const response = await adminApi.getVipPackages() as VipPackage[];
      setVipPackages(response || []);
    } catch (error) {
      console.error('获取套餐列表失败');
    }
  };

  const handleGenerate = async (values: any) => {
    try {
      const response = await adminApi.generateCardKeys(
        values.cardType,
        values.cardValue,
        values.amount,
        values.quantity,
        values.expireDays,
        values.remark
      ) as CardKey[];
      message.success(`成功生成 ${response.length} 张卡密`);
      setGeneratedCards(response);
      setShowGeneratedModal(true);
      setGenerateModalVisible(false);
      generateForm.resetFields();
      fetchCardKeys();
      fetchStats();
      fetchBatchNos();
    } catch (error: any) {
      message.error(error.msg || '生成卡密失败');
    }
  };

  const handleInvalidate = async (id: number) => {
    try {
      await adminApi.invalidateCardKey(id);
      message.success('卡密已作废');
      fetchCardKeys();
      fetchStats();
    } catch (error: any) {
      message.error(error.msg || '作废失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const copyAllCards = () => {
    const text = generatedCards.map(c => c.cardCode).join('\n');
    navigator.clipboard.writeText(text);
    message.success('已复制所有卡密');
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '卡密码',
      dataIndex: 'cardCode',
      key: 'cardCode',
      width: 180,
      render: (code: string) => (
        <Space>
          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{code}</code>
          <Tooltip title="复制">
            <CopyOutlined className="cursor-pointer text-gray-400 hover:text-blue-500" onClick={() => copyToClipboard(code)} />
          </Tooltip>
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'cardTypeName',
      key: 'cardTypeName',
      width: 100,
      render: (name: string, record: CardKey) => {
        const colorMap: Record<string, string> = {
          '周卡': 'cyan',
          '月卡': 'blue',
          '年卡': 'gold',
          '积分': 'purple'
        };
        return <Tag color={colorMap[name] || 'default'}>{name} ({record.cardValue}{record.cardType === 'POINTS' ? '积分' : '天'})</Tag>;
      }
    },
    {
      title: '面值',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number) => `¥${amount.toFixed(2)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: CardKey) => {
        const statusMap: Record<string, { color: string; text: string; icon: any }> = {
          'UNUSED': { color: 'blue', text: '未使用', icon: <ClockCircleOutlined /> },
          'USED': { color: 'green', text: '已使用', icon: <CheckCircleOutlined /> },
          'EXPIRED': { color: 'red', text: '已过期', icon: <CloseCircleOutlined /> }
        };
        const info = statusMap[status] || { color: 'default', text: status, icon: null };
        return <Tag icon={info.icon} color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 160
    },
    {
      title: '使用用户',
      key: 'usedBy',
      width: 120,
      render: (_: any, record: CardKey) => record.usedByUsername || '-'
    },
    {
      title: '过期时间',
      dataIndex: 'expireTime',
      key: 'expireTime',
      width: 160,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '永久有效'
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
      render: (_: any, record: CardKey) => (
        record.status === 'UNUSED' && (
          <Popconfirm
            title="确定要作废此卡密吗？"
            onConfirm={() => handleInvalidate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small">作废</Button>
          </Popconfirm>
        )
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
                title="总卡密数"
                value={stats.totalCount}
                prefix={<GiftOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="未使用"
                value={stats.unusedCount}
                valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已使用"
                value={stats.usedCount}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已过期"
                value={stats.expiredCount}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选器和操作 */}
        <Card>
          <div className="flex flex-wrap justify-between items-center gap-4">
            <Space wrap>
              <Select
                placeholder="筛选状态"
                allowClear
                style={{ width: 120 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: '未使用', value: 'UNUSED' },
                  { label: '已使用', value: 'USED' },
                  { label: '已过期', value: 'EXPIRED' }
                ]}
              />
              <Select
                placeholder="筛选类型"
                allowClear
                style={{ width: 120 }}
                value={cardTypeFilter}
                onChange={setCardTypeFilter}
                options={vipPackages.map(pkg => ({
                  label: pkg.packageName,
                  value: pkg.packageCode
                }))}
              />
              <Select
                placeholder="筛选批次"
                allowClear
                showSearch
                style={{ width: 200 }}
                value={batchNoFilter}
                onChange={setBatchNoFilter}
                options={batchNos.map(no => ({ label: no, value: no }))}
              />
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setGenerateModalVisible(true);
                // 默认选择第一个套餐
                if (vipPackages.length > 0) {
                  const firstPkg = vipPackages[0];
                  generateForm.setFieldsValue({
                    cardType: firstPkg.packageCode,
                    cardValue: firstPkg.days,
                    amount: firstPkg.price,
                    quantity: 10
                  });
                }
              }}
            >
              批量生成卡密
            </Button>
          </div>
        </Card>

        {/* 卡密列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={cardKeys}
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

        {/* 生成卡密Modal */}
        <Modal
          title="批量生成卡密"
          open={generateModalVisible}
          onCancel={() => {
            setGenerateModalVisible(false);
            generateForm.resetFields();
          }}
          footer={null}
        >
          <Form
            form={generateForm}
            layout="vertical"
            onFinish={handleGenerate}
          >
            <Form.Item
              name="cardType"
              label="卡类型"
              rules={[{ required: true, message: '请选择卡类型' }]}
            >
              <Select
                placeholder="请选择卡类型"
                options={vipPackages.map(pkg => ({
                  label: pkg.packageName,
                  value: pkg.packageCode
                }))}
                onChange={(value) => {
                  const selectedPkg = vipPackages.find(pkg => pkg.packageCode === value);
                  if (selectedPkg) {
                    generateForm.setFieldsValue({
                      cardValue: selectedPkg.days,
                      amount: selectedPkg.price
                    });
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              name="cardValue"
              label="卡值（天数或积分）"
              rules={[{ required: true, message: '请输入卡值' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="amount"
              label="面值金额"
              rules={[{ required: true, message: '请输入面值金额' }]}
            >
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} prefix="¥" />
            </Form.Item>
            <Form.Item
              name="quantity"
              label="生成数量"
              rules={[{ required: true, message: '请输入生成数量' }]}
              extra="单次最多生成1000张"
            >
              <InputNumber min={1} max={1000} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="expireDays"
              label="有效期（天）"
              extra="留空表示永久有效"
            >
              <InputNumber min={1} style={{ width: '100%' }} placeholder="留空永久有效" />
            </Form.Item>
            <Form.Item
              name="remark"
              label="备注"
            >
              <Input placeholder="可选备注信息" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">生成</Button>
                <Button onClick={() => setGenerateModalVisible(false)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 生成结果Modal */}
        <Modal
          title={`成功生成 ${generatedCards.length} 张卡密`}
          open={showGeneratedModal}
          onCancel={() => setShowGeneratedModal(false)}
          footer={[
            <Button key="copy" type="primary" onClick={copyAllCards}>复制全部卡密</Button>,
            <Button key="close" onClick={() => setShowGeneratedModal(false)}>关闭</Button>
          ]}
          width={600}
        >
          <div className="max-h-96 overflow-auto">
            <Table
              dataSource={generatedCards}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '卡密码', dataIndex: 'cardCode', key: 'cardCode' },
                { title: '类型', dataIndex: 'cardTypeName', key: 'cardTypeName' },
                { 
                  title: '操作', 
                  key: 'action',
                  render: (_: any, record: CardKey) => (
                    <Button type="link" size="small" onClick={() => copyToClipboard(record.cardCode)}>复制</Button>
                  )
                }
              ]}
            />
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
