import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { userApi } from '@/api';

const PasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await userApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功，请重新登录');
      form.resetFields();
      // 可以在这里添加登出逻辑
    } catch (error: any) {
      message.error(error.response?.data?.msg || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">修改密码</h2>

      <Form form={form} layout="vertical" onFinish={handleSubmit} className="max-w-md">
        <Form.Item
          label="当前密码"
          name="oldPassword"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6位' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请确认新密码" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            确认修改
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default PasswordPage;
