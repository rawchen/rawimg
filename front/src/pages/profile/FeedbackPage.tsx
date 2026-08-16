import React, { useState } from 'react';
import { Form, Input, Button, message, Select } from 'antd';
import { useAuth } from '@/context/AuthContext';
import { feedbackApi } from '@/api';

const { TextArea } = Input;
const { Option } = Select;

const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await feedbackApi.createFeedback({
        ...values,
        userId: user?.id,
      });
      message.success('感谢您的反馈，我们会认真处理');
      form.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.msg || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">意见反馈</h2>

      <Form form={form} layout="vertical" onFinish={handleSubmit} className="max-w-2xl">
        <Form.Item
          label="反馈类型"
          name="type"
          rules={[{ required: true, message: '请选择反馈类型' }]}
        >
          <Select placeholder="请选择反馈类型">
            <Option value="BUG">Bug反馈</Option>
            <Option value="FEATURE">功能建议</Option>
            <Option value="IMPROVEMENT">体验优化</Option>
            <Option value="OTHER">其他</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="反馈标题"
          name="title"
          rules={[{ required: true, message: '请输入反馈标题' }]}
        >
          <Input placeholder="请输入反馈标题" maxLength={100} />
        </Form.Item>

        <Form.Item
          label="详细描述"
          name="content"
          rules={[{ required: true, message: '请输入详细描述' }]}
        >
          <TextArea rows={6} placeholder="请详细描述您的问题或建议" maxLength={1000} showCount />
        </Form.Item>

        <Form.Item label="联系方式" name="contact">
          <Input placeholder="请输入联系方式（选填）" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            提交反馈
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default FeedbackPage;
