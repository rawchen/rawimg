# 钱包管理功能使用指南

## 路由说明

个人中心现在使用独立的路由，每个tab对应一个独立的页面：

- `/profile/overview` - 概览
- `/profile/info` - 个人信息
- `/profile/email` - 修改邮箱
- `/profile/password` - 修改密码
- `/profile/feedback` - 意见反馈
- `/profile/consume` - 消费记录
- `/profile/wallet` - 钱包管理

## 功能特性

### 1. 余额充值

- **当前余额展示**：显示账户余额、历史消耗、请求次数
- **充值步骤指引**：简化的步骤节点展示（选择额度 → 选择支付 → 确认支付）
- **充值套餐选择**：
  - ¥10 到账 ¥10
  - ¥30 到账 ¥30
  - ¥100 到账 ¥120（推荐，含赠送 ¥20）
  - ¥500 到账 ¥560（含赠送 ¥60）
- **支付方式选择**：
  - 微信支付（享95折优惠）
  - 支付宝（预留接口）
- **支付二维码**：扫码支付，支持倒计时和订单状态轮询

### 2. 账单明细

- **订单列表**：显示所有充值订单
- **状态筛选**：全部、成功、待支付、已过期、失败
- **订单搜索**：支持按订单号搜索
- **详细信息**：订单号、支付方式、充值额度、支付金额、状态、创建时间

## 后端配置

### 1. 数据库初始化

执行SQL文件初始化数据库表：

```bash
mysql -u root -p your_database < sql/recharge_system.sql
```

### 2. 支付配置

在 `application.yml` 中配置YunGouOS支付参数：

```yaml
payment:
  yungouos:
    mch-id: YOUR_MCH_ID
    key: YOUR_KEY
    notify-url: https://yourdomain.com/api/recharge/notify
    enabled: true  # 生产环境设置为true
```

### 3. API接口

#### 获取充值套餐列表
```
GET /api/recharge/packages
```

#### 创建充值订单
```
POST /api/recharge/create?amount=100&paymentMethod=WECHAT
```

#### 查询订单状态
```
GET /api/recharge/order/{orderNo}
```

#### 获取用户订单列表
```
GET /api/recharge/orders?status=SUCCESS&page=1&size=10
```

#### 支付回调
```
POST /api/recharge/notify
```

## 前端安装依赖

```bash
cd front
pnpm install
```

## 启动应用

### 后端
```bash
mvn spring-boot:run
```

### 前端
```bash
cd front
pnpm dev
```

## 注意事项

1. **支付回调地址**必须是公网可访问的HTTPS地址
2. **测试环境**设置 `payment.yungouos.enabled=false`，会返回模拟二维码
3. **微信支付**享受95折优惠
4. **订单过期时间**为30分钟
5. **支付宝支付**已预留接口，待后续实现
6. **定时任务**每分钟自动更新过期订单状态

## 界面优化

### 紧凑布局
- 减少了卡片的padding和margin
- 简化了充值步骤展示
- 优化了字体大小和间距
- 确保在一个屏幕内无滚动条显示全部余额充值内容

### 响应式设计
- 支持不同屏幕尺寸
- 保持良好的用户体验

## 技术栈

### 后端
- Spring Boot
- MyBatis Plus
- YunGouOS Pay SDK
- MySQL

### 前端
- React
- TypeScript
- Ant Design
- React Router
- qrcode.react
