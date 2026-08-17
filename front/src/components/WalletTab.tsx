import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Radio, Table, Input, Select, Tag, Modal, message, Empty, Row, Col, Badge, Divider } from 'antd';
import { WechatOutlined, AlipayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, QrcodeOutlined, SearchOutlined, ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
import { rechargeApi, balanceApi } from '../api';
import type { RechargePackage, RechargeOrder, BalanceStats } from '../api';
import QRCode from 'qrcode.react';

const { Search } = Input;
const { Option } = Select;

const WalletTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recharge' | 'orders'>('recharge');
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<{ orderNo: string; payUrl: string; paidAmount: number; expireTime: string } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string | undefined>(undefined);
  const [searchOrderNo, setSearchOrderNo] = useState<string>('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadBalanceStats();
    loadPackages();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, orderStatus, pagination.current]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const loadBalanceStats = async () => {
    try {
      const stats = await balanceApi.getStats();
      setBalanceStats(stats);
    } catch (error) {
      console.error('Failed to load balance stats:', error);
    }
  };

  const loadPackages = async () => {
    try {
      const data = await rechargeApi.getPackages();
      setPackages(data);
      // 默认选中第一个套餐
      if (data && data.length > 0) {
        setSelectedPackage(data[0]);
      }
    } catch (error) {
      console.error('Failed to load packages:', error);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const result = await rechargeApi.getOrders({
        status: orderStatus,
        orderNo: searchOrderNo || undefined,
        page: pagination.current,
        size: pagination.pageSize,
      });
      setOrders(result.records);
      setPagination({ ...pagination, total: result.total });
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedPackage) {
      message.warning('请选择充值套餐');
      return;
    }

    if (!paymentMethod) {
      message.warning('请选择支付方式');
      return;
    }

    setLoading(true);
    try {
      // 先查询是否有待支付的订单
      const ordersResult = await rechargeApi.getOrders({ status: 'PENDING', page: 1, size: 10 });
      const pendingOrders = ordersResult.records || [];
      
      // 筛选出相同金额、相同支付方式、未过期的订单
      const currentTime = Date.now();
      const matchingOrder = pendingOrders.find(order => {
        const orderAmount = Number(order.paidAmount);
        const selectedAmount = Number(selectedPackage.amount);
        const isExpired = new Date(order.expireTime).getTime() <= currentTime;
        
        return orderAmount === selectedAmount && 
               order.paymentMethod === paymentMethod && 
               !isExpired;
      });
      
      let result;
      if (matchingOrder) {
        // 使用现有订单
        result = {
          orderNo: matchingOrder.orderNo,
          payUrl: matchingOrder.payUrl,
          amount: matchingOrder.amount,
          paidAmount: matchingOrder.paidAmount,
          creditAmount: matchingOrder.creditAmount,
          expireTime: matchingOrder.expireTime
        };
        message.info('检测到未完成的订单，继续支付');
      } else {
        // 创建新订单
        result = await rechargeApi.createOrder(selectedPackage.amount, paymentMethod);
      }
      
      setCurrentOrder(result);
      setPaymentSuccess(false);
      setQrModalVisible(true);

      // 开始倒计时
      if (result.expireTime) {
        const expireTime = new Date(result.expireTime).getTime();
        const now = Date.now();
        const remaining = Math.floor((expireTime - now) / 1000);
        setCountdown(remaining > 0 ? remaining : 0);
      } else {
        // 默认30分钟倒计时
        setCountdown(1800);
      }

      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            setQrModalVisible(false);
            message.warning('订单已过期');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 开始轮询订单状态
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      pollingRef.current = setInterval(async () => {
        try {
          const order = await rechargeApi.queryOrder(result.orderNo);
          if (order.status === 'SUCCESS') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
            }
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            setPaymentSuccess(true);
            message.success('支付成功');
            loadBalanceStats();
            loadOrders();
          }
        } catch (error) {
          console.error('Failed to query order:', error);
        }
      }, 3000);
    } catch (error: any) {
      message.error(error.response?.data?.msg || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
    if (!currentOrder) return;

    try {
      const order = await rechargeApi.queryOrder(currentOrder.orderNo);
      if (order.status === 'SUCCESS') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
        setPaymentSuccess(true);
        message.success('支付成功');
        loadBalanceStats();
        loadOrders();
      } else {
        message.info('订单尚未支付，请稍后再试');
      }
    } catch (error) {
      message.error('查询订单失败');
    }
  };

  const handleModalClose = () => {
    setQrModalVisible(false);
    setPaymentSuccess(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      SUCCESS: { color: 'success', text: '成功', icon: <CheckCircleOutlined /> },
      PENDING: { color: 'processing', text: '待支付', icon: <ClockCircleOutlined /> },
      EXPIRED: { color: 'default', text: '已过期', icon: <CloseCircleOutlined /> },
      FAILED: { color: 'error', text: '失败', icon: <CloseCircleOutlined /> },
    };
    const config = statusMap[status] || { color: 'default', text: status, icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 220,
    },
    {
      title: '支付方式',
      dataIndex: 'paymentChannel',
      key: 'paymentChannel',
      width: 100,
    },
    {
      title: '充值额度',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number) => `¥${(amount || 0).toFixed(2)}`,
    },
    {
      title: '支付金额',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 100,
      render: (paidAmount: number) => `¥${(paidAmount || 0).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
  ];

  return (
    <div>
      {/* Tab 切换 */}
      <div style={{ marginBottom: 16 }}>
        <Radio.Group value={activeTab} onChange={(e) => setActiveTab(e.target.value)}>
          <Radio.Button value="recharge">余额充值</Radio.Button>
          <Radio.Button value="orders">账单明细</Radio.Button>
        </Radio.Group>
      </div>

      {activeTab === 'recharge' && (
        <div>
          {/* 当前余额卡片 */}
          <Card 
            style={{ 
              marginBottom: 16,
              background: 'linear-gradient(135deg, rgb(51, 65, 85), rgb(30, 41, 59), rgb(15, 23, 42))',
              position: 'relative',
              overflow: 'hidden'
            }} 
            bodyStyle={{ padding: '16px' }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(at right top, rgba(99, 102, 241, 0.3), transparent 60%)',
              pointerEvents: 'none'
            }} />
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'rgba(255, 255, 255, 0.05)' }} />
            <div className="absolute -right-4 -bottom-10 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'rgba(255, 255, 255, 0.05)' }} />
            <Row gutter={24} style={{ position: 'relative', zIndex: 1 }}>
              <Col span={12}>
                <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: 12, marginBottom: 0 }}>当前余额</div>
                <div style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>
                  ¥{(balanceStats?.balance || 0).toFixed(2)}
                </div>
                <div style={{ marginTop: 8, color: 'rgba(255, 255, 255, 0.65)', fontSize: 12 }}>
                  历史消耗 ¥{balanceStats?.totalConsumed?.toFixed(2) || '0.00'} · 请求次数 {balanceStats?.todayConsumed || 0}
                </div>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Badge status="success" text={<span style={{ color: 'rgba(255, 255, 255, 0.85)' }}>账户正常</span>} />
              </Col>
            </Row>
          </Card>

          {/* 充值步骤 - 简化版 */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1890ff', color: '#fff', textAlign: 'center', lineHeight: '24px', fontSize: 12 }}>1</div>
              <span style={{ marginLeft: 6, fontSize: 13 }}>选择额度</span>
            </div>
            <div style={{ width: 40, height: 1, background: '#d9d9d9' }} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1890ff', color: '#fff', textAlign: 'center', lineHeight: '24px', fontSize: 12 }}>2</div>
              <span style={{ marginLeft: 6, fontSize: 13 }}>选择支付</span>
            </div>
            <div style={{ width: 40, height: 1, background: '#d9d9d9' }} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1890ff', color: '#fff', textAlign: 'center', lineHeight: '24px', fontSize: 12 }}>3</div>
              <span style={{ marginLeft: 6, fontSize: 13 }}>确认支付</span>
            </div>
          </div>

          {/* 选择充值套餐 */}
          <Card title="选择充值套餐" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px' }}>
            <Row gutter={[12, 12]}>
              {packages.map((pkg) => (
                <Col span={6} key={pkg.id}>
                  <Card
                    style={{
                      border: selectedPackage?.id === pkg.id ? '2px solid #10b981' : '2px solid #d9d9d9',
                      background: selectedPackage?.id === pkg.id ? '#f0fdf4' : '#fff',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    }}
                    bodyStyle={{ padding: '12px' }}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`package-card ${selectedPackage?.id === pkg.id ? 'selected' : ''}`}
                  >
                    {pkg.recommended && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: '#ff4d4f',
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                        }}
                      >
                        推荐
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                        ¥{pkg.amount}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#666', fontSize: 12 }}>
                          到账 ¥{pkg.creditAmount}
                        </div>
                        {pkg.bonusAmount > 0 && (
                          <div style={{ color: '#ff4d4f', fontSize: 11 }}>
                            含赠送 ¥{pkg.bonusAmount}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 支付方式 */}
          <Card title="支付方式" style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px' }}>
            <Row gutter={12}>
              <Col span={12}>
                <Card
                  style={{
                    border: paymentMethod === 'WECHAT' ? '2px solid #07c160' : '2px solid #d9d9d9',
                    background: paymentMethod === 'WECHAT' ? '#f0fdf4' : '#fff',
                    textAlign: 'center',
                    opacity: paymentMethod === '' ? 0.8 : 1,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  bodyStyle={{ padding: '12px' }}
                  onClick={() => setPaymentMethod('WECHAT')}
                  className={`payment-card wechat-card ${paymentMethod === 'WECHAT' ? 'selected' : ''}`}
                >
                  <WechatOutlined style={{ fontSize: 24, color: '#07c160' }} />
                  <div style={{ marginTop: 4, fontSize: 13 }}>微信</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  style={{
                    border: paymentMethod === 'ALIPAY' ? '2px solid #1677ff' : '2px solid #d9d9d9',
                    background: paymentMethod === 'ALIPAY' ? '#e6f4ff' : '#fff',
                    textAlign: 'center',
                    opacity: paymentMethod === '' ? 0.8 : 1,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                  bodyStyle={{ padding: '12px' }}
                  onClick={() => setPaymentMethod('ALIPAY')}
                  className={`payment-card alipay-card ${paymentMethod === 'ALIPAY' ? 'selected' : ''}`}
                >
                  <AlipayCircleOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                  <div style={{ marginTop: 4, fontSize: 13 }}>支付宝</div>
                </Card>
              </Col>
            </Row>
          </Card>

          {/* 充值金额确认 */}
          {selectedPackage && (
            <Card bodyStyle={{ padding: '16px' }}>
              <Row gutter={24} align="middle">
                <Col span={16}>
                  <Row gutter={16} align="middle">
                    <Col span={10}>
                      <div>
                        <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14, marginBottom: 4 }}>充值金额</div>
                        <div style={{ fontSize: 24 }}>
                          ¥{selectedPackage.amount.toFixed(2)}
                        </div>
                      </div>
                    </Col>
                    <Col span={2}>
                      <Divider type="vertical" style={{ height: 60, margin: 0 }} />
                    </Col>
                    <Col span={12}>
                      <div>
                        <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: 14, marginBottom: 4 }}>实付金额</div>
                        <div style={{ fontSize: 24, color: '#ff4d4f', fontWeight: 'bold' }}>
                          {selectedPackage.amount.toFixed(2)} 元
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Col>
                <Col span={8} style={{ textAlign: 'right' }}>
                  <Button
                    type="primary"
                    size="large"
                    loading={loading}
                    disabled={!paymentMethod}
                    onClick={handleCreateOrder}
                    icon={<SafetyOutlined />}
                  >
                    立即支付
                  </Button>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <Card>
          {/* 筛选和搜索 */}
          <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
            <Select
              placeholder="订单状态"
              style={{ width: 120 }}
              value={orderStatus}
              onChange={(value) => {
                setOrderStatus(value);
                setPagination({ ...pagination, current: 1 });
              }}
              allowClear
            >
              <Option value="SUCCESS">成功</Option>
              <Option value="PENDING">待支付</Option>
              <Option value="EXPIRED">已过期</Option>
              <Option value="FAILED">失败</Option>
            </Select>
            <Search
              placeholder="搜索订单号"
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 300 }}
              onSearch={(value) => {
                setSearchOrderNo(value);
                setPagination({ ...pagination, current: 1 });
              }}
            />
          </div>

          {/* 订单列表 */}
          <Table
            columns={orderColumns}
            dataSource={orders}
            rowKey="id"
            loading={ordersLoading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total) => `显示第 ${(pagination.current - 1) * pagination.pageSize + 1} – ${Math.min(pagination.current * pagination.pageSize, total)} 条，共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPagination({ ...pagination, current: page, pageSize });
              },
            }}
            locale={{ emptyText: <Empty description="暂无订单记录" /> }}
          />
        </Card>
      )}

      {/* 支付二维码模态框 */}
      <Modal
        title="扫码支付"
        open={qrModalVisible}
        onCancel={handleModalClose}
        centered
        footer={paymentSuccess ? [
          <Button key="close" type="primary" onClick={handleModalClose}>
            关闭
          </Button>,
        ] : [
          <Button key="check" type="primary" icon={<ReloadOutlined />} onClick={handleManualCheck}>
            我已支付
          </Button>,
          <Button key="close" onClick={handleModalClose}>
            关闭
          </Button>,
        ]}
        width={400}
      >
        <div style={{ textAlign: 'center' }}>
          {paymentSuccess ? (
            <>
              <div style={{ marginBottom: 24 }}>
                <CheckCircleOutlined style={{ fontSize: 80, color: '#52c41a' }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a', marginBottom: 16 }}>
                支付成功
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#999', fontSize: 12 }}>订单号: {currentOrder?.orderNo}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>
                  ¥ {currentOrder?.paidAmount?.toFixed(2)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ 
                display: 'inline-block',
                padding: '16px',
                border: '2px dashed #d9d9d9',
                borderRadius: '8px',
                marginBottom: 16
              }}>
                <QRCode value={currentOrder?.payUrl || ''} size={200} />
              </div>
              <div style={{ color: '#666', marginBottom: 16 }}>请使用手机扫码支付</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#999', fontSize: 12 }}>订单号: {currentOrder?.orderNo}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>
                  ¥ {currentOrder?.paidAmount?.toFixed(2)}
                </div>
              </div>
              <div style={{ color: countdown < 60 ? '#ff4d4f' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockCircleOutlined style={{ marginRight: 8 }} />
                剩余: {formatCountdown(countdown)}
              </div>
              <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
                支付完成后会自动刷新余额，若未刷新可点击上方按钮
              </div>
            </>
          )}
        </div>
      </Modal>

      <style>{`
        .package-card:not(.selected):hover {
          border: 2px solid #10b981 !important;
        }
        .wechat-card:not(.selected):hover {
          border: 2px solid #10b981 !important;
        }
        .alipay-card:not(.selected):hover {
          border: 2px solid #1677ff !important;
        }
      `}</style>
    </div>
  );
};

export default WalletTab;
