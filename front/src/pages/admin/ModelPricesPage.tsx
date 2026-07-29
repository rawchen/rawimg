import { useState, useEffect } from 'react';
import { message, Table, Button, Modal, Form, Input, InputNumber, Switch, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import { adminModelPriceApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';

interface ModelPrice {
  id: number;
  modelCode: string;
  modelName: string;
  provider: string;
  price: number;
  description: string;
  enabled: boolean;
  sortOrder: number;
  createTime: string;
  updateTime: string;
}

export function ModelPricesPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ModelPrice[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await adminModelPriceApi.list(1, 100);
      setData(result.records || []);
    } catch (error: any) {
      message.error(error.msg || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ enabled: true, sortOrder: 0 });
    setModalVisible(true);
  };

  const handleEdit = (record: ModelPrice) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await adminModelPriceApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.msg || '删除失败');
    }
  };

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await adminModelPriceApi.toggle(id);
      message.success(enabled ? '已禁用' : '已启用');
      loadData();
    } catch (error: any) {
      message.error(error.msg || '操作失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingId) {
        await adminModelPriceApi.update(editingId, values);
        message.success('更新成功');
      } else {
        await adminModelPriceApi.create(values);
        message.success('创建成功');
      }

      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.msg || '操作失败');
    }
  };

  const columns = [
    {
      title: '模型代码',
      dataIndex: 'modelCode',
      key: 'modelCode',
      width: 200,
    },
    {
      title: '模型名称',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 200,
    },
    {
      title: '提供商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => {
        const color = provider === 'OpenAI' ? 'green' : provider === 'Google' ? 'blue' : 'default';
        return <Tag color={color}>{provider}</Tag>;
      },
    },
    {
      title: '价格（元）',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price: number) => (
        <span className="font-medium text-orange-600">¥{price.toFixed(4)}</span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: ModelPrice) => (
        <Switch
          checked={enabled}
          onChange={() => handleToggle(record.id, enabled)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ModelPrice) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模型价格管理</h1>
          <p className="text-gray-500 mt-1">管理AI模型的调用价格</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新增价格
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 20,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title={editingId ? '编辑模型价格' : '新增模型价格'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="modelCode"
            label="模型代码"
            rules={[{ required: true, message: '请输入模型代码' }]}
          >
            <Input placeholder="如：gpt-image-2" disabled={!!editingId} />
          </Form.Item>

          <Form.Item
            name="modelName"
            label="模型名称"
            rules={[{ required: true, message: '请输入模型名称' }]}
          >
            <Input placeholder="如：GPT Image 2" />
          </Form.Item>

          <Form.Item
            name="provider"
            label="提供商"
            rules={[{ required: true, message: '请输入提供商' }]}
          >
            <Input placeholder="如：OpenAI、Google" />
          </Form.Item>

          <Form.Item
            name="price"
            label="价格（元）"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={4}
              style={{ width: '100%' }}
              placeholder="如：0.04"
              prefix={<DollarOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="模型描述说明" />
          </Form.Item>

          <Form.Item
            name="sortOrder"
            label="排序顺序"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="是否启用"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
