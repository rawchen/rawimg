import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Popconfirm,
  Tag,
  Select,
  Switch
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { clearPublicConfigCache } from '@/hooks/usePublicConfig';

interface ConfigItem {
  id: number;
  configKey: string;
  configValue: string;
  configType: string;
  description: string;
}

export function ConfigPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);
  const [toggleSavingKey, setToggleSavingKey] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getConfigs() as any;
      setConfigs(response);
    } catch (error) {
      message.error('获取配置列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 布尔类型配置直接在表格内切换（true/false）
  const handleToggleBoolean = async (config: ConfigItem, checked: boolean) => {
    setToggleSavingKey(config.configKey);
    try {
      await adminApi.setConfig(
        config.configKey,
        checked ? 'true' : 'false',
        'boolean',
        config.description
      );
      message.success(`${config.configKey} 已${checked ? '开启' : '关闭'}`);
      clearPublicConfigCache();
      fetchConfigs();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setToggleSavingKey(null);
    }
  };

  const handleEdit = (config: ConfigItem) => {
    setEditingConfig(config);
    const isBoolean = (config.configType || 'string') === 'boolean';
    form.setFieldsValue({
      key: config.configKey,
      value: isBoolean
        ? String(config.configValue ?? '').trim().toLowerCase() === 'true'
        : config.configValue,
      type: config.configType || 'string',
      description: config.description
    });
    setEditModalVisible(true);
  };

  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    setEditModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const value = values.type === 'boolean'
        ? (values.value === true || String(values.value).toLowerCase() === 'true' ? 'true' : 'false')
        : values.value;
      await adminApi.setConfig(values.key, value, values.type, values.description);
      message.success('保存配置成功');
      setEditModalVisible(false);
      clearPublicConfigCache();
      fetchConfigs();
    } catch (error) {
      message.error('保存配置失败');
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
      title: '配置键',
      dataIndex: 'configKey',
      key: 'configKey',
      width: 200
    },
    {
      title: '类型',
      dataIndex: 'configType',
      key: 'configType',
      width: 100,
      render: (type: string) => {
        const colors: Record<string, string> = {
          number: 'blue',
          string: 'green',
          boolean: 'orange'
        };
        return <Tag color={colors[type] || 'default'}>{type || 'string'}</Tag>;
      }
    },
    {
      title: '配置值',
      dataIndex: 'configValue',
      key: 'configValue',
      width: 300,
      ellipsis: true,
      render: (value: string, record: ConfigItem) => {
        if (record.configType === 'boolean') {
          return (
            <Switch
              size="small"
              checked={String(value ?? '').trim().toLowerCase() === 'true'}
              loading={toggleSavingKey === record.configKey}
              checkedChildren="true"
              unCheckedChildren="false"
              onChange={(checked) => handleToggleBoolean(record, checked)}
            />
          );
        }
        return (
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {value}
          </code>
        );
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
      render: (description: string) => (
        <span title={description}>{description}</span>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ConfigItem) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Space>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 配置列表 */}
        <Card
          title="系统配置"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              新增配置
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={configs}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1200 }}
          />
        </Card>

        {/* 新增/编辑弹窗 */}
        <Modal
          title={editingConfig ? '编辑配置' : '新增配置'}
          open={editModalVisible}
          onOk={handleSubmit}
          onCancel={() => setEditModalVisible(false)}
          okText="保存"
          cancelText="取消"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="配置键"
              name="key"
              rules={[{ required: true, message: '请输入配置键' }]}
            >
              <Input placeholder="例如: site_title" disabled={!!editingConfig} />
            </Form.Item>
            <Form.Item
              label="类型"
              name="type"
              rules={[{ required: true, message: '请选择配置类型' }]}
              initialValue="string"
            >
              <Select placeholder="请选择配置类型">
                <Select.Option value="string">文本</Select.Option>
                <Select.Option value="number">数字</Select.Option>
                <Select.Option value="boolean">布尔</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
              {({ getFieldValue }) =>
                getFieldValue('type') === 'boolean' ? (
                  <Form.Item
                    label="配置值"
                    name="value"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="true" unCheckedChildren="false" />
                  </Form.Item>
                ) : (
                  <Form.Item
                    label="配置值"
                    name="value"
                    rules={[{ required: true, message: '请输入配置值' }]}
                  >
                    <Input.TextArea rows={4} placeholder="请输入配置值" />
                  </Form.Item>
                )
              }
            </Form.Item>
            <Form.Item
              label="描述"
              name="description"
            >
              <Input placeholder="请输入配置描述" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
