import React, { useState } from 'react';
import { Form, Input, Button, message, Steps } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/api';

const EmailPage: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendCode = async () => {
    try {
      const email = form.getFieldValue('newEmail');
      if (!email) {
        message.warning('请输入新邮箱');
        return;
      }
      await userApi.sendEmailCode(email);
      message.success('验证码已发送');
      setCodeSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      message.error(error.response?.data?.msg || '发送验证码失败');
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await userApi.updateEmail({
        newEmail: values.newEmail,
        code: values.code,
        password: values.password,
      });
      message.success('邮箱修改成功');
      setCurrentStep(2);
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.msg || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">修改邮箱</h2>

      <Steps 
        current={currentStep} 
        className="mb-8"
        items={[
          { title: '验证身份' },
          { title: '设置新邮箱' },
          { title: '完成' },
        ]}
      />

      {currentStep === 0 && (
        <div className="max-w-md">
          <p className="mb-4 text-gray-600">当前邮箱: {user?.email}</p>
          <Button type="primary" onClick={() => setCurrentStep(1)}>
            下一步
          </Button>
        </div>
      )}

      {currentStep === 1 && (
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="max-w-md">
          <Form.Item
            label="新邮箱"
            name="newEmail"
            rules={[
              { required: true, message: '请输入新邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="请输入新邮箱" />
          </Form.Item>

          <Form.Item label="验证码" name="code" rules={[{ required: true, message: '请输入验证码' }]}>
            <div className="flex gap-2">
              <Input placeholder="请输入验证码" />
              <Button onClick={handleSendCode} disabled={countdown > 0}>
                {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
              </Button>
            </div>
          </Form.Item>

          <Form.Item
            label="登录密码"
            name="password"
            rules={[{ required: true, message: '请输入登录密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入登录密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      )}

      {currentStep === 2 && (
        <div className="text-center py-8">
          <p className="text-lg text-green-600 mb-4">邮箱修改成功！</p>
          <Button onClick={() => setCurrentStep(0)}>返回</Button>
        </div>
      )}
    </div>
  );
};

export default EmailPage;
