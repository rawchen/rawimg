import { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Space,
  Popconfirm,
  Tag,
  Image,
  Upload,
  Spin,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  BulbOutlined,
  PictureOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { inspirationAdminApi, ossApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import type { UploadProps } from 'antd';

// 动态导入 ali-oss
let OSS: any = null;
const loadOSS = async () => {
  if (!OSS) {
    const module = await import('ali-oss');
    OSS = module.default;
  }
  return OSS;
};

interface InspirationTemplate {
  id: number;
  title: string;
  prompt: string;
  category: string;
  imageUrl: string | null;
  sortOrder: number;
  attachExampleImage?: number;
  requireUserPhoto?: number;
  createTime?: string;
  updateTime?: string;
}

// 分类选项
const categoryOptions = [
  '写实摄影',
  '电影感',
  '二次元',
  '卡通动漫',
  '游戏原画',
  '国风古风',
  '奇幻魔幻',
  '赛博朋克/科幻',
  '3D渲染',
  '传统绘画',
  '抽象艺术',
  '概念分解'
];

export function InspirationAdminPage() {
  const [templates, setTemplates] = useState<InspirationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InspirationTemplate | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchTitle, setSearchTitle] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [pagination.current, pagination.pageSize]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await inspirationAdminApi.list(
        pagination.current,
        pagination.pageSize,
        searchTitle || undefined,
        searchCategory || undefined
      );
      setTemplates(response.records || []);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (error) {
      message.error('获取灵感模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTemplates();
  };

  const handleEdit = (template: InspirationTemplate) => {
    setEditingTemplate(template);
    form.setFieldsValue({
      title: template.title,
      prompt: template.prompt,
      category: template.category,
      sortOrder: template.sortOrder,
      attachExampleImage: template.attachExampleImage === 1,
      requireUserPhoto: template.requireUserPhoto === 1,
    });
    setImageUrl(template.imageUrl || '');
    setEditModalVisible(true);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.resetFields();
    form.setFieldsValue({ sortOrder: 0, attachExampleImage: false, requireUserPhoto: false });
    setImageUrl('');
    setEditModalVisible(true);
  };

  // 上传图片到OSS
  const uploadToOSS = async (file: File): Promise<string> => {
    const OSSClient = await loadOSS();
    const stsToken = await ossApi.getStsToken();

    // 生成文件路径
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateFolder = `${year}/${month}`;
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop() || 'png';
    const objectKey = `${stsToken.uploadFolder || 'inspiration'}/${dateFolder}/${randomStr}.${fileExt}`;

    const client = new OSSClient({
      region: stsToken.region,
      accessKeyId: stsToken.accessKeyId,
      accessKeySecret: stsToken.accessKeySecret,
      stsToken: stsToken.securityToken,
      bucket: stsToken.bucketName,
      secure: true,
    });

    await client.put(objectKey, file);

    // OSS图片处理样式参数（质量压缩）
    const ossStyle = '?x-oss-process=style/rawimg';

    // 返回文件URL（拼接OSS处理参数）
    if (stsToken.customDomain) {
      return `https://${stsToken.customDomain}/${objectKey}${ossStyle}`;
    }
    return `https://${stsToken.bucketName}.${stsToken.endpoint}/${objectKey}${ossStyle}`;
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToOSS(file);
      setImageUrl(url);
      message.success('上传成功');
    } catch (error) {
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      handleUpload(file);
      return false;
    },
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        imageUrl: imageUrl || null,
        attachExampleImage: values.attachExampleImage ? 1 : 0,
        requireUserPhoto: values.requireUserPhoto ? 1 : 0,
      };

      if (editingTemplate) {
        await inspirationAdminApi.update(editingTemplate.id, data);
        message.success('更新模板成功');
      } else {
        await inspirationAdminApi.add(data);
        message.success('创建模板成功');
      }
      setEditModalVisible(false);
      fetchTemplates();
    } catch (error: any) {
      message.error(error.msg || '保存模板失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await inspirationAdminApi.delete(id);
      message.success('删除模板成功');
      fetchTemplates();
    } catch (error: any) {
      message.error(error.msg || '删除模板失败');
    }
  };

  const handleDeleteBatch = async (ids: number[]) => {
    try {
      await inspirationAdminApi.deleteBatch(ids);
      message.success('批量删除成功');
      fetchTemplates();
    } catch (error: any) {
      message.error(error.msg || '批量删除失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '图片',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 80,
      render: (url: string | null) =>
        url ? (
          <Image src={url} alt="示例图" width={40} height={40} className="object-cover rounded" style={{ display: 'block' }} />
        ) : (
          <div className="w-[40px] h-[40px] bg-gray-100 rounded flex items-center justify-center">
            <PictureOutlined className="text-gray-400 text-sm" />
          </div>
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 150,
    },
    {
      title: '提示词',
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
      render: (prompt: string) => (
        <span className="text-gray-600" title={prompt}>
          {prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '贴案例图',
      dataIndex: 'attachExampleImage',
      key: 'attachExampleImage',
      width: 80,
      render: (val: number) => (
        <Tag color={val === 1 ? 'green' : 'default'}>{val === 1 ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '需上传照片',
      dataIndex: 'requireUserPhoto',
      key: 'requireUserPhoto',
      width: 90,
      render: (val: number) => (
        <Tag color={val === 1 ? 'orange' : 'default'}>{val === 1 ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
      render: (time: string) => (time ? new Date(time).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: InspirationTemplate) => (
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
            title="确定要删除此模板吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card
          title={
            <span className="flex items-center gap-2">
              <BulbOutlined className="text-orange-500" />
              灵感模板管理
            </span>
          }
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增模板
            </Button>
          }
        >
          {/* 搜索区域 */}
          <div className="mb-4 flex gap-4">
            <Input
              placeholder="搜索标题"
              value={searchTitle}
              onChange={(e) => setSearchTitle(e.target.value)}
              style={{ width: 200 }}
              onPressEnter={handleSearch}
            />
            <Select
              placeholder="选择分类"
              value={searchCategory || undefined}
              onChange={(v) => setSearchCategory(v || '')}
              allowClear
              style={{ width: 150 }}
              options={categoryOptions.map((c) => ({ label: c, value: c }))}
            />
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={templates}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPagination((prev) => ({ ...prev, current: page, pageSize }));
              },
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* 新增/编辑弹窗 */}
        <Modal
          title={editingTemplate ? '编辑模板' : '新增模板'}
          open={editModalVisible}
          onOk={handleSubmit}
          onCancel={() => setEditModalVisible(false)}
          okText="保存"
          cancelText="取消"
          width={600}
          maskClosable={false}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="模板标题"
              name="title"
              rules={[{ required: true, message: '请输入模板标题' }]}
            >
              <Input placeholder="如：梦幻森林" />
            </Form.Item>

            <Form.Item
              label="提示词"
              name="prompt"
              rules={[{ required: true, message: '请输入提示词' }]}
              extra="支持 {{变量}} 格式的动态变量"
            >
              <Input.TextArea rows={12} placeholder="输入AI生成提示词..." />
            </Form.Item>

            <div className="flex gap-4">
              <Form.Item
                label="分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
                className="flex-1"
              >
                <Select
                  placeholder="选择分类"
                  options={categoryOptions.map((c) => ({ label: c, value: c }))}
                />
              </Form.Item>

              <Form.Item
                label="排序"
                name="sortOrder"
                className="flex-1"
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>

            <Form.Item label="示例图片">
              <div className="flex items-start gap-4">
                {imageUrl && (
                  <div className="relative">
                    <Image
                      src={imageUrl}
                      alt="示例图"
                      width={120}
                      height={120}
                      className="object-cover rounded"
                    />
                    <Button
                      size="small"
                      danger
                      className="absolute top-1 right-1"
                      onClick={() => setImageUrl('')}
                    >
                      删除
                    </Button>
                  </div>
                )}
                <Upload {...uploadProps}>
                  <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}>
                    {uploading ? '上传中...' : '上传图片'}
                  </Button>
                </Upload>
              </div>
              <p className="text-gray-400 text-xs mt-2">上传示例图片（可选）</p>
            </Form.Item>

            <div className="flex gap-6">
              <Form.Item
                name="attachExampleImage"
                label="贴案例图到图一"
                valuePropName="checked"
                extra="开启后，使用此灵感时自动将案例图贴到上传图列表"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                name="requireUserPhoto"
                label="需要上传照片"
                valuePropName="checked"
                extra="开启后，使用此灵感时会提示用户需要上传真实照片"
              >
                <Switch />
              </Form.Item>
            </div>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
