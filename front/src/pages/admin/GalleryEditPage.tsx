import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Space,
  Spin,
  Upload
} from 'antd';
import {
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
  CloseOutlined,
  StarOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { GalleryImageDto } from '@/types';

const { TextArea } = Input;

export function GalleryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [form] = Form.useForm();
  const [images, setImages] = useState<GalleryImageDto[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    fetchGallery();
  }, [id]);

  const fetchGallery = async () => {
    if (!id) return;
    setFetching(true);
    try {
      const result = await adminApi.getGalleryForEdit(Number(id));
      form.setFieldsValue({
        title: result.title || '',
        description: result.description || '',
        coverUrl: result.coverUrl || '',
        content: result.content || '',
        downloadLink: result.downloadLink || '',
      });
      setImages(result.images || []);
    } catch (error: any) {
      console.error('Failed to fetch gallery:', error);
      message.error(error.msg || '获取图集信息失败');
      navigate('/admin/galleries');
    } finally {
      setFetching(false);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      const newImage: GalleryImageDto = {
        url: newImageUrl.trim(),
        sortOrder: images.filter(img => img.operation !== 'delete').length,
        operation: 'create',
        isPreview: true
      };
      setImages(prev => [...prev, newImage]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index];
    if (imageToRemove.id) {
      // 已有图片：标记为删除
      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, operation: 'delete' as const } : img
      ));
      message.info('图片已标记为删除，保存后生效');
    } else {
      // 新图片：直接移除
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSetAsCover = (url: string) => {
    form.setFieldValue('coverUrl', url);
    message.success('已设为封面图');
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await adminApi.uploadImage(file);
      const newImage: GalleryImageDto = {
        url: result,
        sortOrder: images.filter(img => img.operation !== 'delete').length,
        operation: 'create',
        isPreview: true
      };
      setImages(prev => [...prev, newImage]);
      message.success('上传成功');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      message.error(error.msg || '图片上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleSubmit = async (values: any) => {
    if (!values.title?.trim()) {
      message.error('请输入图集标题');
      return;
    }
    if (!values.coverUrl?.trim()) {
      message.error('请输入封面图URL');
      return;
    }

    setLoading(true);
    try {
      // 准备图片列表，只包含未删除的图片，并更新sortOrder
      const imagesToSubmit: GalleryImageDto[] = images
        .filter(img => img.operation !== 'delete')
        .map((img, index): GalleryImageDto => ({
          id: img.id,
          url: img.url,
          sortOrder: index,
          description: img.description,
          isPreview: img.isPreview,
          operation: (img.id ? 'update' : 'create') as 'create' | 'update'
        }));

      // 添加所有标记为删除的图片
      const deletedImages: GalleryImageDto[] = images
        .filter(img => img.operation === 'delete')
        .map((img): GalleryImageDto => ({
          id: img.id,
          url: img.url,
          sortOrder: img.sortOrder,
          description: img.description,
          isPreview: img.isPreview,
          operation: 'delete'
        }));

      const finalImages: GalleryImageDto[] = [...imagesToSubmit, ...deletedImages];

      await adminApi.updateGallery(Number(id), {
        title: values.title,
        description: values.description || undefined,
        coverUrl: values.coverUrl,
        content: values.content || undefined,
        downloadLink: values.downloadLink || undefined,
        images: finalImages.length > 0 ? finalImages : undefined,
      });
      message.success('更新成功');
      navigate('/admin/galleries');
    } catch (error: any) {
      console.error('Failed to update gallery:', error);
      message.error(error.msg || '更新图集失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算活跃图片数量（不包含标记为删除的）
  const activeImageCount = images.filter(img => img.operation !== 'delete').length;

  if (fetching) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Spin size="large" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-black">编辑图集</h1>
        <Link to="/admin/galleries">
          <Button>返回列表</Button>
        </Link>
      </div>

      {/* Form */}
      <Card>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入图集标题' }]}>
                <Input placeholder="请输入图集标题" />
              </Form.Item>
              <Form.Item name="downloadLink" label="下载链接">
                <TextArea rows={2} placeholder="请输入下载链接" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="封面图URL" required>
                <Input.Group compact style={{ display: 'flex' }}>
                  <Upload
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={async (file) => {
                      setUploading(true);
                      try {
                        const result = await adminApi.uploadImage(file);
                        form.setFieldValue('coverUrl', result);
                        message.success('封面上传成功');
                      } catch (error: any) {
                        console.error('Failed to upload cover:', error);
                        message.error(error.msg || '封面上传失败');
                      } finally {
                        setUploading(false);
                      }
                      return false;
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={uploading} style={{ borderRadius: '6px 0 0 6px' }}>
                      {uploading ? '上传中...' : '上传'}
                    </Button>
                  </Upload>
                  <Form.Item
                    name="coverUrl"
                    noStyle
                    rules={[{ required: true, message: '请输入封面图URL' }]}
                  >
                    <Input
                      placeholder="请输入封面图URL"
                      style={{ flex: 1, borderRadius: '0 6px 6px 0' }}
                    />
                  </Form.Item>
                </Input.Group>
              </Form.Item>
              <Form.Item shouldUpdate={(prev, cur) => prev.coverUrl !== cur.coverUrl}>
                {({ getFieldValue }) => {
                  const coverUrl = getFieldValue('coverUrl');
                  return coverUrl ? (
                    <img
                      src={coverUrl}
                      alt="封面预览"
                      style={{ maxWidth: 150, maxHeight: 86, objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null;
                }}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={24}>
              <Form.Item name="description" label="描述">
                <TextArea rows={2} placeholder="请输入图集描述" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={24}>
              <Form.Item name="content" label="内容">
                <TextArea rows={3} placeholder="请输入图集内容" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="添加图片">
            <Space.Compact style={{ width: '100%' }}>
              <Upload
                multiple
                accept="image/*"
                showUploadList={false}
                beforeUpload={handleUpload}
              >
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {uploading ? '上传中...' : '上传图片'}
                </Button>
              </Upload>
              <Input
                placeholder="输入图片URL按回车添加"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onPressEnter={handleAddImage}
                style={{ flex: 1 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddImage}>添加</Button>
            </Space.Compact>
            <span style={{ color: '#999' }}>支持 JPEG, PNG, GIF, WebP</span>
          </Form.Item>

          {images.length > 0 && (
            <Form.Item label={`图片列表 (${activeImageCount})`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {images.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      width: 128,
                      height: 96,
                      borderRadius: 4,
                      overflow: 'hidden',
                      border: img.operation === 'delete' ? '2px solid #ff4d4f' : '1px solid #d9d9d9',
                      opacity: img.operation === 'delete' ? 0.5 : 1
                    }}
                  >
                    <img
                      src={img.url}
                      alt={`图片 ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" fill="%239ca3af" font-size="12">加载失败</text></svg>';
                      }}
                    />
                    <Button
                      type="primary"
                      danger={img.operation !== 'delete'}
                      size="small"
                      icon={<CloseOutlined />}
                      style={{ position: 'absolute', top: 4, right: 4 }}
                      onClick={() => handleRemoveImage(index)}
                    />
                    {img.operation !== 'delete' && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<StarOutlined />}
                        style={{ position: 'absolute', bottom: 4, right: 4 }}
                        onClick={() => handleSetAsCover(img.url)}
                      />
                    )}
                    {img.operation === 'delete' && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(255, 77, 79, 0.8)',
                        color: 'white',
                        fontSize: '10px',
                        textAlign: 'center',
                        padding: '2px 4px'
                      }}>
                        待删除
                      </div>
                    )}
                    {img.id && (
                      <div style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        background: 'rgba(0, 0, 0, 0.5)',
                        color: 'white',
                        fontSize: '10px',
                        padding: '2px 4px',
                        borderRadius: 2
                      }}>
                        ID: {img.id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Form.Item>
          )}

          <Form.Item style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                保存修改
              </Button>
              <Link to="/admin/galleries">
                <Button>取消</Button>
              </Link>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </AdminLayout>
  );
}
