import React, { useState } from 'react';
import { Form, Input, Button, Avatar, Upload, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/api';

const InfoPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await userApi.updateProfile(values);
      message.success('个人信息更新成功');
      refreshUser();
    } catch (error: any) {
      message.error(error.response?.data?.msg || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (info: any) => {
    if (info.file.status === 'done') {
      message.success('头像上传成功');
      refreshUser();
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">个人信息</h2>

      <div className="mb-8">
        <div className="flex items-center gap-6">
          <Avatar size={100} icon={<UserOutlined />} src={user?.avatar} />
          <div>
            <Upload
              name="avatar"
              action="/api/user/avatar"
              headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }}
              showUploadList={false}
              onChange={handleAvatarChange}
            >
              <Button>更换头像</Button>
            </Upload>
            <p className="text-sm text-gray-500 mt-2">支持 JPG、PNG 格式，大小不超过 2MB</p>
          </div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          username: user?.username,
          nickname: user?.nickname,
        }}
        onFinish={handleSubmit}
      >
        <Form.Item label="用户名" name="username">
          <Input disabled />
        </Form.Item>

        <Form.Item
          label="昵称"
          name="nickname"
          rules={[{ required: true, message: '请输入昵称' }]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>

        <Form.Item label="手机号" name="phone">
          <Input placeholder="请输入手机号" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存修改
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default InfoPage;
