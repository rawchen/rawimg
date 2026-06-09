import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Form, Input, message, Popconfirm, Select, Space, Switch, Table, Tag, Tooltip } from 'antd';
import {DeleteOutlined, EditOutlined, EyeOutlined, LinkOutlined, PlusOutlined} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import type { Gallery } from '@/types';

// 状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'DRAFT': { label: '草稿', color: 'default' },
  'PUBLISHED': { label: '已发布', color: 'success' }
};

// 排序配置
const SORT_CONFIG: Record<string, string> = {
  'latest': '最新',
  'hot': '热门',
  'like': '喜爱',
  'down': '下载'
};

export function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState<any>({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchGalleries();
  }, [filters]);

  const fetchGalleries = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const result = await adminApi.getAllGalleries(page, pageSize, filters.title || undefined, filters.status || undefined, filters.sortBy || undefined);
      setGalleries(result.content);
      setPagination({
        current: page,
        pageSize,
        total: result.totalElements,
      });
    } catch (error) {
      console.error('Failed to fetch galleries:', error);
      message.error('获取图集列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pag: any) => {
    fetchGalleries(pag.current, pag.pageSize);
  };

  const handleSearch = (values: any) => {
    setFilters(values);
  };

  const handleValueChange = (changedValues: any) => {
    setFilters({ ...filters, ...changedValues });
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await adminApi.updateGalleryStatus(id, status);
      message.success('状态更新成功');
      fetchGalleries(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Failed to update status:', error);
      message.error(error.msg || '更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteGallery(id);
      message.success('删除成功');
      fetchGalleries(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Failed to delete gallery:', error);
      message.error(error.msg || '删除失败');
    }
  };

  // 列定义
  const columns = [
    {
      title: '封面',
      dataIndex: 'coverUrl',
      key: 'coverUrl',
      width: 80,
      render: (url: string, record: Gallery) => (
        <img
          src={url}
          alt={record.title}
          className="w-16 h-12 object-cover rounded"
        />
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '浏览数',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 80,
      render: (count: number) => <Badge count={count} overflowCount={999999} showZero style={{ backgroundColor: '#1890ff' }} />,
    },
    {
      title: '点赞数',
      dataIndex: 'likeCount',
      key: 'likeCount',
      width: 80,
      render: (count: number) => <Badge count={count} overflowCount={999999} showZero style={{ backgroundColor: '#ff5959' }} />,
    },
    {
      title: '评论数',
      dataIndex: 'commentCount',
      key: 'commentCount',
      width: 80,
      render: (count: number) => <Badge count={count} overflowCount={999999} showZero style={{ backgroundColor: '#faad14' }} />,
    },
    {
      title: '下载数',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
      width: 80,
      render: (count: number) => <Badge count={count} overflowCount={999999} showZero style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '发布时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: Gallery) => (
        <Space size="small" wrap>
          <Tooltip title={record.status === 'PUBLISHED' ? '点击切换为草稿' : '点击发布'}>
            <Switch
              checked={record.status === 'PUBLISHED'}
              onChange={(checked) => handleStatusChange(record.id, checked ? 'PUBLISHED' : 'DRAFT')}
              checkedChildren="发布"
              unCheckedChildren="草稿"
            />
          </Tooltip>
          <Tooltip title="查看">
            <Link to={`/id/${record.id}`} target="_blank">
              <Button type="link" size="small" icon={<LinkOutlined />}>查看</Button>
            </Link>
          </Tooltip>
          <Tooltip title="编辑">
            <Link to={`/admin/galleries/${record.id}/edit`}>
              <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
            </Link>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个图集吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-black">图集管理</h1>
        <Link to="/admin/galleries/new">
          <Button type="primary" icon={<PlusOutlined />}>新建图集</Button>
        </Link>
      </div>

      {/* Search Form */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onValuesChange={handleValueChange} onFinish={handleSearch}>
          <Form.Item name="title" label="标题">
            <Input placeholder="请输入" allowClear style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <Select.Option key={key} value={key}>{val.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="sortBy" label="排序">
            <Select placeholder="默认" allowClear style={{ width: 120 }}>
              {Object.entries(SORT_CONFIG).map(([key, val]) => (
                <Select.Option key={key} value={key}>{val}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => { form.resetFields(); setFilters({}); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={galleries}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
      />
    </AdminLayout>
  );
}
