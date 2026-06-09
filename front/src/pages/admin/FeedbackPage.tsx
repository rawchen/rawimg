import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  message,
  Space,
  Popconfirm,
  Select,
  Tag,
  Modal,
  Input,
  Image, Tooltip
} from 'antd';
import {
  DeleteOutlined,
  CheckOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { feedbackApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import type { Feedback } from '@/types';

const { TextArea } = Input;

export function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, [pagination.current, pagination.pageSize, statusFilter]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await feedbackApi.getFeedbackList(
        pagination.current,
        pagination.pageSize,
        statusFilter
      );
      setFeedbacks(response.content || []);
      setPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await feedbackApi.deleteFeedback(id);
      message.success('删除成功');
      fetchFeedbacks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleUpdateStatus = async (id: number, status: number) => {
    try {
      await feedbackApi.updateFeedbackStatus(id, status);
      message.success('状态更新成功');
      fetchFeedbacks();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  const handleReply = async () => {
    if (!currentFeedback) return;
    try {
      await feedbackApi.updateFeedbackStatus(currentFeedback.id, 1, replyContent);
      message.success('回复成功');
      setReplyModalVisible(false);
      setReplyContent('');
      fetchFeedbacks();
    } catch (error) {
      message.error('回复失败');
    }
  };

  const openReplyModal = (feedback: Feedback) => {
    setCurrentFeedback(feedback);
    setReplyContent(feedback.reply || '');
    setReplyModalVisible(true);
  };

  const renderImages = (images?: string) => {
    if (!images) return '-';
    const imageList = images.split(',').filter(img => img.trim());
    if (imageList.length === 0) return '-';
    return (
      <Image.PreviewGroup>
        <Space size="small">
          {imageList.map((img, index) => (
            <Image
              key={index}
              src={img}
              width={40}
              height={40}
              style={{ objectFit: 'cover', borderRadius: 4 }}
              placeholder
            />
          ))}
        </Space>
      </Image.PreviewGroup>
    );
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 40
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (username: string) => username || '-'
    },
    {
      title: '反馈内容',
      dataIndex: 'content',
      key: 'content',
      width: 200,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <div
            style={{
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {text || '-'}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contact',
      key: 'contact',
      width: 120,
      render: (contact: string) => contact || '-'
    },
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 100,
      render: renderImages
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number) => {
        const statusMap: Record<number, { color: string; text: string }> = {
          0: { color: 'orange', text: '待处理' },
          1: { color: 'green', text: '已处理' }
        };
        const item = statusMap[status] || { color: 'default', text: '未知' };
        return <Tag color={item.color}>{item.text}</Tag>;
      }
    },
    {
      title: '回复',
      dataIndex: 'reply',
      key: 'reply',
      width: 120,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <div
            style={{
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {text || '-'}
          </div>
        </Tooltip>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 150,
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      render: (_: any, record: Feedback) => (
        <Space>
          {record.status === 0 && (
            <>
              <Button
                type="link"
                icon={<CheckOutlined />}
                style={{ paddingInline: 2 }}
                onClick={() => handleUpdateStatus(record.id, 1)}
              >
                标记
              </Button>
              <Button
                type="link"
                icon={<MessageOutlined />}
                style={{ paddingInline: 2 }}
                onClick={() => openReplyModal(record)}
              >
                回复
              </Button>
            </>
          )}
          <Popconfirm
            title="确定删除该反馈吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} style={{ paddingInline: 2 }}>
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
        <Card>
          <Space>
            <span>状态筛选：</span>
            <Select
              style={{ width: 150 }}
              placeholder="全部状态"
              allowClear
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
              options={[
                { value: 0, label: '待处理' },
                { value: 1, label: '已处理' }
              ]}
            />
          </Space>
        </Card>

        <Card>
          <Table
            columns={columns}
            dataSource={feedbacks}
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

      <Modal
        title="回复反馈"
        open={replyModalVisible}
        onOk={handleReply}
        onCancel={() => setReplyModalVisible(false)}
        okText="提交"
        cancelText="取消"
      >
        <div className="mb-4">
          <p className="text-gray-600 mb-2">反馈内容：</p>
          <p>{currentFeedback?.content}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-2">回复内容：</p>
          <TextArea
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="请输入回复内容"
          />
        </div>
      </Modal>
    </AdminLayout>
  );
}
