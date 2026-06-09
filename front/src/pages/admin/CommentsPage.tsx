import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  message,
  Space,
  Popconfirm,
  Input,
  Tag
} from 'antd';
import {
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { adminApi } from '@/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useNavigate } from 'react-router-dom';
import type { Comment } from '@/types';

interface CommentWithDetail extends Comment {
  id: number;
  galleryId: number;
}

export function CommentsPage() {
  const [comments, setComments] = useState<CommentWithDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchComments();
  }, [pagination.current, pagination.pageSize]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getAllComments(
        pagination.current,
        pagination.pageSize
      ) as any;
      setComments(response.content || []);
      setPagination(prev => ({ ...prev, total: response.totalElements }));
    } catch (error) {
      message.error('获取评论列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteCommentAdmin(id);
      message.success('删除评论成功');
      fetchComments();
    } catch (error) {
      message.error('删除评论失败');
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
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 100
    },
    {
      title: '图集ID',
      dataIndex: 'galleryId',
      key: 'galleryId',
      width: 100,
      render: (galleryId: number) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/id/${galleryId}`)}
        >
          查看
        </Button>
      )
    },
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      width: 400,
      ellipsis: true
    },
    {
      title: '父评论ID',
      dataIndex: 'parentId',
      key: 'parentId',
      width: 100,
      render: (parentId: number | null) => parentId ? parentId : '-'
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
      width: 100,
      render: (_: any, record: CommentWithDetail) => (
        <Space>
          <Popconfirm
            title="确定删除该评论吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
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
        {/* 搜索框 */}
        <Card>
          <Space>
            <Input
              placeholder="搜索评论内容"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Space>
        </Card>

        {/* 评论列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={comments.filter(comment => 
              !searchText || comment.content.toLowerCase().includes(searchText.toLowerCase())
            )}
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
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
