import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Space,
  Popconfirm,
  Tag
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
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
  createTime: string;
  updateTime: string;
}

export function VipPackagesPage() {
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] = useState<VipPackage | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getVipPackages() as VipPackage[];
      setPackages(response || []);
    } catch (error) {
      message.error('获取套餐列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: VipPackage) => {
    setEditingPackage(pkg);
    form.setFieldsValue({
      packageCode: pkg.packageCode,
      packageName: pkg.packageName,
      days: pkg.days,
      dailyDownloadCount: pkg.dailyDownloadCount,
      price: pkg.price,
      sortOrder: pkg.sortOrder,
      popular: pkg.popular,
      enabled: pkg.enabled,
      purchaseUrl: pkg.purchaseUrl,
      description: pkg.description
    });
    setEditModalVisible(true);
  };

  const handleAdd = () => {
    setEditingPackage(null);
    form.resetFields();
    form.setFieldsValue({
      sortOrder: packages.length + 1,
      popular: false,
      enabled: true
    });
    setEditModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingPackage) {
        await adminApi.updateVipPackage(editingPackage.id, values);
        message.success('更新套餐成功');
      } else {
        await adminApi.createVipPackage(values);
        message.success('创建套餐成功');
      }
      setEditModalVisible(false);
      fetchPackages();
    } catch (error: any) {
      message.error(error.msg || '保存套餐失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteVipPackage(id);
      message.success('删除套餐成功');
      fetchPackages();
    } catch (error: any) {
      message.error(error.msg || '删除套餐失败');
    }
  };

  const handleToggleEnabled = async (id: number) => {
    try {
      await adminApi.toggleVipPackageEnabled(id);
      message.success('状态切换成功');
      fetchPackages();
    } catch (error: any) {
      message.error(error.msg || '切换状态失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: '标识',
      dataIndex: 'packageCode',
      key: 'packageCode',
      width: 100,
      render: (code: string) => <Tag color="blue">{code}</Tag>
    },
    {
      title: '名称',
      dataIndex: 'packageName',
      key: 'packageName',
      width: 120,
      render: (name: string) => (
        <span className="flex items-center">
          <CrownOutlined className="text-yellow-500 mr-2" />
          {name}
        </span>
      )
    },
    {
      title: '天数',
      dataIndex: 'days',
      key: 'days',
      width: 80,
      render: (days: number) => `${days}天`
    },
    {
      title: '每日下载',
      dataIndex: 'dailyDownloadCount',
      key: 'dailyDownloadCount',
      width: 100,
      render: (count: number) => `${count}次`
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => <span className="text-red-500 font-medium">¥{price}</span>
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 60
    },
    {
      title: '热门',
      dataIndex: 'popular',
      key: 'popular',
      width: 80,
      render: (popular: boolean) => popular ? (
        <Tag color="orange">热门</Tag>
      ) : '-'
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => enabled ? (
        <Tag icon={<CheckCircleOutlined />} color="success">启用</Tag>
      ) : (
        <Tag icon={<CloseCircleOutlined />} color="error">禁用</Tag>
      )
    },
    {
      title: '购买链接',
      dataIndex: 'purchaseUrl',
      key: 'purchaseUrl',
      width: 200,
      ellipsis: true,
      render: (url: string) => url || '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: VipPackage) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleEnabled(record.id)}
          >
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此套餐吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card
          title="VIP套餐管理"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增套餐
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={packages}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* 新增/编辑弹窗 */}
        <Modal
          title={editingPackage ? '编辑套餐' : '新增套餐'}
          open={editModalVisible}
          onOk={handleSubmit}
          onCancel={() => setEditModalVisible(false)}
          okText="保存"
          cancelText="取消"
          width={600}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="套餐标识"
              name="packageCode"
              rules={[{ required: true, message: '请输入套餐标识' }]}
              extra="如：WEEK, MONTH, YEAR, DAY 等，用于系统识别"
            >
              <Input placeholder="如：WEEK" disabled={!!editingPackage} />
            </Form.Item>
            <Form.Item
              label="套餐名称"
              name="packageName"
              rules={[{ required: true, message: '请输入套餐名称' }]}
            >
              <Input placeholder="如：周卡VIP" />
            </Form.Item>
            <Space className="w-full" size="large">
              <Form.Item
                label="VIP天数"
                name="days"
                rules={[{ required: true, message: '请输入VIP天数' }]}
              >
                <InputNumber min={1} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item
                label="每日下载次数"
                name="dailyDownloadCount"
                rules={[{ required: true, message: '请输入每日下载次数' }]}
              >
                <InputNumber min={1} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item
                label="价格"
                name="price"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber min={0} step={0.01} precision={2} style={{ width: 150 }} prefix="¥" />
              </Form.Item>
            </Space>
            <Space className="w-full" size="large">
              <Form.Item
                label="排序"
                name="sortOrder"
                extra="数字越小越靠前"
              >
                <InputNumber min={1} style={{ width: 150 }} />
              </Form.Item>
              <Form.Item
                label="是否热门"
                name="popular"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="是否启用"
                name="enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Space>
            <Form.Item
              label="购买链接"
              name="purchaseUrl"
            >
              <Input placeholder="可选，购买页面链接" />
            </Form.Item>
            <Form.Item
              label="描述"
              name="description"
            >
              <Input.TextArea rows={2} placeholder="可选，套餐描述" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
