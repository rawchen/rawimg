import { useState, useEffect, useCallback } from 'react';
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
  Spin,
  Switch,
  Tabs,
  Upload,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  PictureOutlined,
  AppstoreOutlined,
  UploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { materialAdminApi, MaterialAsset, MaterialCategory } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import type { UploadProps } from 'antd';

interface GroupTab {
  key: string;
  label: string;
  libraryTypes: { value: string; label: string }[];
}

const GROUP_TABS: GroupTab[] = [
  {
    key: 'portrait',
    label: '人物素材库',
    libraryTypes: [
      { value: 'portrait_face', label: '人脸' },
      { value: 'portrait_styling', label: '造型' },
    ],
  },
  {
    key: 'costume',
    label: '服装素材库',
    libraryTypes: [
      { value: 'costume_real', label: '写实' },
      { value: 'costume_anime', label: '动漫' },
    ],
  },
  {
    key: 'pose',
    label: '姿态库',
    libraryTypes: [{ value: 'pose', label: '全部' }],
  },
];

export function MaterialLibraryAdminPage() {
  const [groupType, setGroupType] = useState('portrait');
  const [libraryType, setLibraryType] = useState('portrait_face');
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [assets, setAssets] = useState<MaterialAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [categoryCode, setCategoryCode] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  const [editVisible, setEditVisible] = useState(false);
  const [editing, setEditing] = useState<MaterialAsset | null>(null);
  const [form] = Form.useForm();

  const [categoryVisible, setCategoryVisible] = useState(false);
  const [categoryForm] = Form.useForm();
  const [editingCategory, setEditingCategory] = useState<MaterialCategory | null>(null);

  const [importVisible, setImportVisible] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  const currentGroup = GROUP_TABS.find((g) => g.key === groupType) ?? GROUP_TABS[0];

  const fetchCategories = useCallback(async () => {
    try {
      const list = await materialAdminApi.categories({ groupType });
      setCategories(list || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, [groupType]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await materialAdminApi.list({
        groupType,
        libraryType,
        categoryCode,
        keyword: keyword.trim() || undefined,
        status: statusFilter,
        page: pagination.current,
        size: pagination.pageSize,
      });
      setAssets(res?.content || []);
      setPagination((prev) => ({ ...prev, total: res?.totalElements || 0 }));
    } catch (error: any) {
      message.error(error?.msg || '获取素材列表失败');
    } finally {
      setLoading(false);
    }
  }, [groupType, libraryType, categoryCode, keyword, statusFilter, pagination.current, pagination.pageSize]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleGroupChange = (key: string) => {
    const group = GROUP_TABS.find((g) => g.key === key) ?? GROUP_TABS[0];
    setGroupType(key);
    setLibraryType(group.libraryTypes[0].value);
    setCategoryCode(undefined);
    setKeyword('');
    setStatusFilter(undefined);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    fetchAssets();
  };

  const handleEdit = (asset: MaterialAsset) => {
    setEditing(asset);
    form.setFieldsValue({
      title: asset.title,
      titleOrigin: asset.titleOrigin,
      categoryCode: asset.categoryCode,
      sortOrder: asset.sortOrder,
      status: asset.status === 1,
      thumbUrl: asset.thumbUrl,
      previewUrl: asset.previewUrl,
      fullUrl: asset.fullUrl,
      extra: asset.extra,
    });
    setEditVisible(true);
  };

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sortOrder: 0, status: true });
    setEditVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<MaterialAsset> = {
        groupType,
        libraryType,
        categoryCode: values.categoryCode,
        title: values.title,
        titleOrigin: values.titleOrigin,
        thumbUrl: values.thumbUrl,
        previewUrl: values.previewUrl,
        fullUrl: values.fullUrl,
        extra: values.extra,
        sortOrder: values.sortOrder ?? 0,
        status: values.status ? 1 : 0,
      };

      if (editing) {
        await materialAdminApi.update(editing.id!, payload);
        message.success('更新素材成功');
      } else {
        await materialAdminApi.create(payload);
        message.success('创建素材成功');
      }
      setEditVisible(false);
      fetchAssets();
      fetchCategories();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.msg || '保存素材失败');
    }
  };

  const handleToggleStatus = async (asset: MaterialAsset, checked: boolean) => {
    try {
      await materialAdminApi.updateStatus(asset.id!, checked ? 1 : 0);
      message.success(checked ? '已启用' : '已停用');
      fetchAssets();
      fetchCategories();
    } catch (error: any) {
      message.error(error?.msg || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await materialAdminApi.remove(id);
      message.success('删除素材成功');
      fetchAssets();
      fetchCategories();
    } catch (error: any) {
      message.error(error?.msg || '删除素材失败');
    }
  };

  // ---------- 分类管理 ----------
  const handleEditCategory = (category: MaterialCategory) => {
    setEditingCategory(category);
    categoryForm.setFieldsValue({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      categoryNameOrigin: category.categoryNameOrigin,
      sortOrder: category.sortOrder,
      status: category.status === 1,
    });
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue({ sortOrder: 0, status: true });
  };

  const handleSubmitCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      await materialAdminApi.saveCategory({
        id: editingCategory?.id,
        groupType,
        libraryType,
        categoryCode: values.categoryCode,
        categoryName: values.categoryName,
        categoryNameOrigin: values.categoryNameOrigin,
        sortOrder: values.sortOrder ?? 0,
        status: values.status ? 1 : 0,
      });
      message.success(editingCategory ? '更新分类成功' : '创建分类成功');
      setEditingCategory(null);
      fetchCategories();
      fetchAssets();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.msg || '保存分类失败');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await materialAdminApi.removeCategory(id);
      message.success('删除分类成功');
      setEditingCategory(null);
      fetchCategories();
      fetchAssets();
    } catch (error: any) {
      message.error(error?.msg || '删除分类失败');
    }
  };

  // ---------- 批量导入 ----------
  const handleImport = async () => {
    if (!importJson.trim()) {
      message.warning('请粘贴素材 JSON 数组');
      return;
    }
    let list: any[];
    try {
      list = JSON.parse(importJson);
      if (!Array.isArray(list)) throw new Error('not array');
    } catch (e) {
      message.error('JSON 格式错误，请确保是数组');
      return;
    }
    setImporting(true);
    try {
      const res = await materialAdminApi.importAssets(list);
      message.success(`导入完成：新增 ${res.inserted} 条，更新 ${res.updated} 条`);
      setImportVisible(false);
      setImportJson('');
      fetchAssets();
      fetchCategories();
    } catch (error: any) {
      message.error(error?.msg || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const importUploadProps: UploadProps = {
    accept: '.json,application/json',
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = () => setImportJson(String(reader.result || ''));
      reader.readAsText(file);
      return false;
    },
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: '预览',
      dataIndex: 'thumbUrl',
      key: 'thumbUrl',
      width: 80,
      render: (_: any, record: MaterialAsset) =>
        record.thumbUrl || record.previewUrl ? (
          <Image
            src={record.thumbUrl || record.previewUrl}
            alt={record.title}
            width={44}
            height={44}
            style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }}
          />
        ) : (
          <div className="w-[44px] h-[44px] bg-gray-100 rounded flex items-center justify-center">
            <PictureOutlined className="text-gray-400" />
          </div>
        ),
    },
    {
      title: '中文标题',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      ellipsis: true,
      render: (title: string) => (
        <span title={title} className="text-gray-800">
          {title}
        </span>
      ),
    },
    {
      title: '原始标题',
      dataIndex: 'titleOrigin',
      key: 'titleOrigin',
      width: 220,
      ellipsis: true,
      render: (title: string) => (
        <span title={title} className="text-gray-500 text-xs">
          {title || '-'}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryCode',
      key: 'categoryCode',
      width: 140,
      render: (code: string, record: MaterialAsset) => (
        <Tag color="blue">{record.categoryName || code}</Tag>
      ),
    },
    {
      title: '来源ID',
      dataIndex: 'sourceId',
      key: 'sourceId',
      width: 150,
      ellipsis: true,
    },
    {
      title: '正式图',
      dataIndex: 'fullUrl',
      key: 'fullUrl',
      width: 90,
      render: (url: string) =>
        url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs">
            查看
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number, record: MaterialAsset) => (
        <Switch
          size="small"
          checked={status === 1}
          onChange={(checked) => handleToggleStatus(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: MaterialAsset) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该素材吗？"
            onConfirm={() => handleDelete(record.id!)}
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
              <DatabaseOutlined className="text-violet-500" />
              素材库管理
            </span>
          }
          extra={
            <Space>
              <Button icon={<AppstoreOutlined />} onClick={() => setCategoryVisible(true)}>
                分类管理
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => setImportVisible(true)}>
                批量导入
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增素材
              </Button>
            </Space>
          }
        >
          <Tabs
            activeKey={groupType}
            onChange={handleGroupChange}
            items={GROUP_TABS.map((g) => ({ key: g.key, label: g.label }))}
          />

          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="搜索标题 / 原标题 / 来源ID"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 240 }}
              onPressEnter={handleSearch}
              allowClear
            />
            <Select
              placeholder="选择分类"
              value={categoryCode}
              onChange={(v) => setCategoryCode(v)}
              allowClear
              style={{ width: 180 }}
              options={categories.map((c) => ({ label: c.categoryName, value: c.categoryCode }))}
            />
            <Select
              placeholder="状态"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              allowClear
              style={{ width: 120 }}
              options={[
                { label: '启用', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchAssets(); fetchCategories(); }}>
              刷新
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={assets}
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
            scroll={{ x: 1300 }}
          />
        </Card>

        {/* 素材编辑弹窗 */}
        <Modal
          title={editing ? '编辑素材' : '新增素材'}
          open={editVisible}
          onOk={handleSubmit}
          onCancel={() => setEditVisible(false)}
          okText="保存"
          cancelText="取消"
          width={680}
          maskClosable={false}
        >
          <Form form={form} layout="vertical">
            <div className="flex gap-4">
              <Form.Item label="中文标题" name="title" className="flex-1" rules={[{ required: true, message: '请输入中文标题' }]}>
                <Input placeholder="如：米色 · 迷你 · 连衣裙 · 外套" />
              </Form.Item>
              <Form.Item label="排序" name="sortOrder" className="w-32">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>

            <Form.Item label="原始标题（日文/英文）" name="titleOrigin">
              <Input placeholder="如：S字立ち・腰を横に突き出す" />
            </Form.Item>

            <div className="flex gap-4">
              <Form.Item label="分类" name="categoryCode" className="flex-1" rules={[{ required: true, message: '请选择分类' }]}>
                <Select
                  options={categories.map((c) => ({ label: `${c.categoryName} (${c.categoryCode})`, value: c.categoryCode }))}
                />
              </Form.Item>
              <Form.Item label="启用" name="status" valuePropName="checked" className="w-20">
                <Switch />
              </Form.Item>
            </div>

            <Form.Item label="预览图URL（webp/jpg）" name="thumbUrl">
              <Input placeholder="https://cdn.rawchen.com/rawimg/material/..." />
            </Form.Item>
            <Form.Item label="列表预览URL" name="previewUrl">
              <Input placeholder="同预览图URL" />
            </Form.Item>
            <Form.Item label="正式图URL（png）" name="fullUrl">
              <Input placeholder="https://cdn.rawchen.com/rawimg/material/..." />
            </Form.Item>
            <Form.Item label="扩展信息JSON" name="extra">
              <Input.TextArea rows={3} placeholder='{"hair":"中长发","angle":"正面","poseType":"站立"}' />
            </Form.Item>
          </Form>
        </Modal>

        {/* 分类管理弹窗 */}
        <Modal
          title={`分类管理 - ${currentGroup.label}`}
          open={categoryVisible}
          onCancel={() => setCategoryVisible(false)}
          footer={null}
          width={760}
        >
          <div className="mb-3 flex justify-end">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCategory}>
              新增分类
            </Button>
          </div>

          <Table
            size="small"
            rowKey={(r) => `${r.libraryType}-${r.categoryCode}`}
            pagination={false}
            dataSource={categories}
            columns={[
              { title: '库', dataIndex: 'libraryType', width: 140 },
              { title: '编码', dataIndex: 'categoryCode', width: 140 },
              { title: '中文名', dataIndex: 'categoryName', width: 160 },
              { title: '原名', dataIndex: 'categoryNameOrigin', width: 160 },
              { title: '素材数', dataIndex: 'assetCount', width: 90 },
              { title: '排序', dataIndex: 'sortOrder', width: 80 },
              {
                title: '操作',
                key: 'action',
                width: 160,
                render: (_: any, record: MaterialCategory) => (
                  <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditCategory(record)}>
                      编辑
                    </Button>
                    <Popconfirm
                      title="确定删除该分类？"
                      onConfirm={() => handleDeleteCategory(record.id!)}
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
            ]}
          />

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">
              {editingCategory ? `编辑分类：${editingCategory.categoryName}` : '新增分类'}
            </p>
            <Form form={categoryForm} layout="inline">
              <Form.Item name="categoryCode" rules={[{ required: true, message: '请输入分类编码' }]}>
                <Input placeholder="分类编码" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="categoryName" rules={[{ required: true, message: '请输入中文名' }]}>
                <Input placeholder="分类中文名" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="categoryNameOrigin">
                <Input placeholder="原名（日/英）" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item name="sortOrder">
                <InputNumber min={0} placeholder="排序" style={{ width: 100 }} />
              </Form.Item>
              <Form.Item name="status" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" onClick={handleSubmitCategory}>
                    保存
                  </Button>
                  {editingCategory && (
                    <Button onClick={() => setEditingCategory(null)}>取消编辑</Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </div>
        </Modal>

        {/* 批量导入弹窗 */}
        <Modal
          title="批量导入素材"
          open={importVisible}
          onCancel={() => setImportVisible(false)}
          onOk={handleImport}
          confirmLoading={importing}
          okText="开始导入"
          cancelText="取消"
          width={720}
        >
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="粘贴或上传素材 JSON 数组（字段与 /api/admin/material-library/import 一致）"
            description="推荐使用仓库内的爬虫脚本 scripts/material-crawler 完成抓取、上传 OSS 与入库。"
          />
          <Upload {...importUploadProps}>
            <Button icon={<UploadOutlined />}>选择 JSON 文件</Button>
          </Upload>
          <Input.TextArea
            rows={12}
            className="mt-3 font-mono text-xs"
            placeholder='[{"groupType":"portrait","libraryType":"portrait_face","categoryCode":"short","sourceId":"...","title":"短发","thumbUrl":"...","fullUrl":"..."}]'
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
          {importing && (
            <div className="mt-3 flex justify-center">
              <Spin />
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
