import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Input, Button, Card, Modal } from 'antd';
import { GiftOutlined, CrownOutlined, ThunderboltOutlined, CheckOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { cardKeyApi, configApi, vipPackageApi } from '@/api';

interface VipPackageItem {
  id: number;
  packageCode: string;
  packageName: string;
  days: number;
  dailyDownloadCount: number;
  price: number;
  sortOrder: number;
  popular: boolean;
  purchaseUrl: string;
  description: string;
}

export function RechargePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [cardCode, setCardCode] = useState('');
  const [cardInfo, setCardInfo] = useState<any>(null);
  const [purchaseUrl, setPurchaseUrl] = useState<string>('');
  const [vipPackages, setVipPackages] = useState<VipPackageItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/', { state: { showLogin: true } });
      return;
    }
    const fetchConfig = async () => {
      try {
        const config = await configApi.getPublicConfig() as any;
        if (config.cardKeyPurchaseUrl) {
          setPurchaseUrl(config.cardKeyPurchaseUrl);
        }
      } catch (error) {
        console.error('Failed to fetch config');
      }
    };
    
    const fetchVipPackages = async () => {
      try {
        const packages = await vipPackageApi.getEnabledPackages() as VipPackageItem[];
        setVipPackages(packages || []);
      } catch (error) {
        console.error('Failed to fetch vip packages');
      }
    };
    
    fetchConfig();
    fetchVipPackages();
  }, []);

  const handleValidate = async () => {
    if (!cardCode.trim()) {
      message.warning('请输入卡密');
      return;
    }

    setValidating(true);
    try {
      const info = await cardKeyApi.validateCardKey(cardCode.trim()) as any;
      setCardInfo(info);
    } catch (error: any) {
      message.error(error.msg || '卡密验证失败');
      setCardInfo(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRedeem = async () => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    if (!cardCode.trim()) {
      message.warning('请输入卡密');
      return;
    }

    // 如果用户已经是会员，提示确认
    if (user?.vip) {
      Modal.confirm({
        title: '兑换说明',
        content: (
          <div>
            <p>您当前已经是【{user.vipLevel === 'WEEK' ? '周卡' : user.vipLevel === 'MONTH' ? '月卡' : '年卡'}】VIP会员，过期：{user.vipExpireTime ? new Date(user.vipExpireTime).toLocaleDateString() : '未知'}</p>
            <p className="text-red-500">兑换后原剩余时长将被清空，重新按卡密时长计算</p>
            <p>是否继续兑换？</p>
          </div>
        ),
        okText: '确认兑换',
        cancelText: '取消',
        onOk: async () => {
          await performRedeem();
        },
      });
    } else {
      await performRedeem();
    }
  };

  const performRedeem = async () => {
    setLoading(true);
    try {
      const result = await cardKeyApi.redeemCardKey(cardCode.trim()) as any;
      message.success(result.message || '兑换成功！');
      await refreshUser();
      setCardCode('');
      setCardInfo(null);
    } catch (error: any) {
      message.error(error.msg || '兑换失败，请检查卡密是否正确');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 py-12 min-h-[60vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-black mb-4">卡密兑换</h1>
          <p className="text-gray-600">
            {isAuthenticated && user?.vip
              ? `您当前是VIP会员，到期时间: ${user.vipExpireTime ? new Date(user.vipExpireTime).toLocaleDateString() : '未知'}`
              : '使用卡密激活VIP会员或充值积分'}
          </p>
        </div>

        {/* 卡密输入区域 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
          <h3 className="text-xl font-medium text-black mb-6 flex items-center">
            <GiftOutlined className="text-2xl mr-3 text-blue-500" />
            输入卡密
          </h3>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="请输入16位卡密"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value.toUpperCase())}
              className="flex-1 h-12 text-lg"
              maxLength={16}
            />
            <Button
              onClick={handleValidate}
              loading={validating}
              className="h-12 px-8 bg-gray-100 hover:bg-gray-200 border-gray-300"
            >
              验证卡密
            </Button>
          </div>

          {/* 卡密信息展示 */}
          {cardInfo && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <div className="space-y-3">
                <div className="flex items-center text-lg">
                  {cardInfo.cardType === 'POINTS' ? (
                    <ThunderboltOutlined className="text-yellow-500 mr-2 text-xl" />
                  ) : (
                    <CrownOutlined className="text-yellow-500 mr-2 text-xl" />
                  )}
                  <span className="font-medium">
                    {cardInfo.cardTypeName}
                    {cardInfo.cardType === 'POINTS'
                      ? ` - ${cardInfo.cardValue} 积分`
                      : ` - ${cardInfo.cardValue} 天`}
                  </span>
                </div>
                <div className="text-gray-600">
                  面值：¥{cardInfo.amount?.toFixed(2)}
                </div>
                {cardInfo.expireTime && (
                  <div className="text-gray-500 text-sm">
                    过期时间：{new Date(cardInfo.expireTime).toLocaleString('zh-CN')}
                  </div>
                )}
                {cardInfo.status === 'USED' ? (
                  <div className="text-red-600 font-medium">
                    卡密已被使用，无法兑换
                  </div>
                ) : cardInfo.status === 'EXPIRED' ? (
                  <div className="text-red-600 font-medium">
                    卡密已过期，无法兑换
                  </div>
                ) : (
                  <div className="text-green-600 font-medium">
                    卡密有效，可以兑换
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 兑换按钮 */}
          <Button
            type="primary"
            size="large"
            onClick={handleRedeem}
            loading={loading}
            disabled={!isAuthenticated || (cardInfo && (cardInfo.status === 'USED' || cardInfo.status === 'EXPIRED'))}
            className="w-full h-14 text-lg bg-black "
            icon={<GiftOutlined />}
          >
            {!isAuthenticated ? '请先登录' : (cardInfo && (cardInfo.status === 'USED' || cardInfo.status === 'EXPIRED')) ? '卡密无效' : '立即兑换'}
          </Button>


        </div>

        {/* 购买卡密入口 */}
        {purchaseUrl && (
            <div className="mt-6 p-4 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center">
                  <ShoppingOutlined className="text-2xl text-blue-500 mr-3" />
                  <div>
                    <p className="font-medium text-black">还没有卡密？</p>
                    <p className="text-sm text-gray-500">前往发卡网购买VIP会员卡或积分卡</p>
                  </div>
                </div>
                <a
                    href={purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <ShoppingOutlined className="mr-2" />
                  购买卡密
                </a>
              </div>
            </div>
        )}

        {/* VIP Packages */}
        {vipPackages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {vipPackages.map((pkg) => {
              const bgClass = pkg.packageCode === 'WEEK' 
                ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
                : pkg.packageCode === 'MONTH'
                ? 'bg-gradient-to-br from-pink-50 to-red-50 border-pink-200'
                : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200';
              
              return (
                <div
                  key={pkg.id}
                  onClick={() => pkg.purchaseUrl && window.open(pkg.purchaseUrl, '_blank')}
                  className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg border-gray-200 ${bgClass}`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                      喜爱
                    </span>
                  )}
                  <div className="flex items-center">
                    <CrownOutlined className="text-yellow-500 text-2xl mb-2 mr-2" />
                    <h3 className="text-lg font-medium text-black mb-2">{pkg.packageName}</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-black">¥{pkg.price}</span>
                    <span className="text-gray-500 text-sm">/{pkg.days}天</span>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-600 mb-6">
                    <li className="flex items-center">
                      <CheckOutlined className="text-base text-green-500 mr-2" />
                      解锁全部高清图片
                    </li>
                    <li className="flex items-center">
                      <CheckOutlined className="text-base text-green-500 mr-2" />
                      每日下载<span className="font-bold px-1">{pkg.dailyDownloadCount}</span>次
                    </li>
                    <li className="flex items-center">
                      <CheckOutlined className="text-base text-green-500 mr-2" />
                      专属客服支持
                    </li>
                  </ul>
                  <button className={`w-full py-3 rounded-lg font-medium transition-colors hover:opacity-80 bg-black text-white`}>
                    购买
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
