# 钱包余额系统实施文档 V2

## 已完成的工作

### 1. 数据库设计 ✅
创建了三张核心数据表:
- `user_balance` - 用户余额表
- `model_price` - 模型价格配置表（简化版，按模型固定定价）
- `consume_log` - 消费日志表（简化版）

SQL文件位置: `/doc/wallet_system.sql`

**关键变化（V2）：**
- `model_price` 表不再区分操作类型，改为按模型固定定价
- `consume_log` 表简化字段，移除复杂的费用计算字段
- 初始价格配置：
  - `gemini-3.1-flash-image-preview`: ¥0.60
  - `gemini-3.1-flash-image-preview-2k`: ¥0.60
  - `gemini-3.1-flash-image-preview-4k`: ¥0.80
  - `gemini-2.5-flash-image`: ¥0.06
  - `gpt-image-2`: ¥0.04

### 2. 后端实体类 ✅
创建了三个实体类（简化版）:
- `UserBalance` - 用户余额实体
- `ModelPrice` - 模型价格配置实体（移除操作类型字段）
- `ConsumeLog` - 消费日志实体（简化费用字段）

位置: `/src/main/java/com/rawchen/entity/`

### 3. 后端服务层 ✅
实现了三个Service接口和实现类（简化版）:
- `UserBalanceService` - 余额管理服务
- `ModelPriceService` - 模型价格服务（简化查询逻辑）
- `ConsumeLogService` - 消费日志服务

位置: `/src/main/java/com/rawchen/service/`

核心功能:
- 余额充值、扣费、查询
- 根据模型代码直接获取价格（无需操作类型）
- 消费日志记录和统计（按小时、按模型）

### 4. 后端控制器 ✅
更新了三个Controller（简化版）:
- `AdminModelPriceController` - 模型价格管理后台接口
- `UserBalanceController` - 用户余额查询接口
- `ModelPricePublicController` - 公开的价格查询接口

位置: `/src/main/java/com/rawchen/controller/`

### 5. 集成扣费逻辑 ✅
修改了现有的图像处理控制器:
- `ImageCreateAsyncController` - 创建任务前检查余额并扣费
- `ImageBeautyAsyncController` - 美颜任务前检查余额并扣费
- `AsyncImageTaskExecutor` - 任务完成后更新消费日志

**关键变化（V2）：**
- 费用计算简化为：直接根据模型代码获取价格
- 移除了尺寸倍率、token计费等复杂逻辑

### 6. 前端API接口 ✅
在 `/front/src/api/index.ts` 中更新了:
- `modelPriceApi.getPrice()` - 获取指定模型价格（无需操作类型）
- 相关TypeScript类型定义

### 7. 前端组件修改 ✅
修改了 `UserDropdown` 组件:
- 显示"今日用量"和"余额"
- 移除了原有的"今日下载"显示
- 实时加载余额信息

## 价格配置说明

### 当前模型定价
| 模型代码 | 模型名称 | 提供商 | 价格 |
|---------|---------|--------|------|
| gemini-3.1-flash-image-preview | Gemini 3.1 Flash Image Preview | Google | ¥0.60 |
| gemini-3.1-flash-image-preview-2k | Gemini 3.1 Flash Image Preview 2K | Google | ¥0.60 |
| gemini-3.1-flash-image-preview-4k | Gemini 3.1 Flash Image Preview 4K | Google | ¥0.80 |
| gemini-2.5-flash-image | Gemini 2.5 Flash Image | Google | ¥0.06 |
| gpt-image-2 | GPT Image 2 | OpenAI | ¥0.04 |

### 费用计算规则
- **固定定价**：每次调用某个模型，收取该模型的固定价格
- **示例**：
  - 使用 `gemini-3.1-flash-image-preview` 生图 → 扣费 ¥0.60
  - 使用 `gpt-image-2` 美颜 → 扣费 ¥0.04

## 待完成的工作

### 1. 前端页面开发

#### ProfilePage修改
在个人中心添加"钱包余额"板块:
```tsx
// 显示当前余额
// 显示今日消费
// 显示累计充值/消费
// 充值按钮
```

#### 消费记录页面
创建新页面显示:
- 近8小时消费柱状图(按小时)
- 模型消费分布饼图
- 详细消费日志列表

位置建议: `/front/src/pages/ConsumeLogsPage.tsx`

#### 后台管理页面
创建模型价格管理页面:
- 价格列表展示
- 新增/编辑价格配置
- 启用/禁用价格

位置建议: `/front/src/pages/admin/ModelPricesPage.tsx`

### 2. ImageCreatePage价格显示

修改生图页面,在"开始创作"按钮旁显示价格:
```tsx
// 页面加载时获取模型价格
const [price, setPrice] = useState(0);

useEffect(() => {
  modelPriceApi.getPrice(selectedModel).then(res => {
    setPrice(res.price);
  });
}, [selectedModel]);

// 按钮显示
<Button>
  开始创作 ¥{price}
</Button>
```

### 3. 充值功能

需要实现:
- 充值金额选择
- 支付接口集成
- 充值记录

### 4. 错误处理

完善余额不足的提示:
```tsx
// 在任务创建失败时提示
if (error.msg.includes('余额不足')) {
  message.warning('余额不足,请前往充值');
}
```

## 部署步骤

### 1. 执行数据库脚本
```bash
# 注意：会删除原有的model_price表
mysql -u root -p rawimg < /doc/wallet_system.sql
```

### 2. 后端编译
```bash
cd /Users/rawchen/IdeaProjects/rawimg
mvn clean package
```

### 3. 前端编译
```bash
cd front
npm run build
```

### 4. 重启服务
```bash
# 停止旧服务
# 启动新服务
java -jar target/rawimg-xxx.jar
```

## 测试清单

- [ ] 数据库表创建成功
- [ ] 后端服务启动无报错
- [ ] 模型价格管理接口正常
- [ ] 用户余额查询接口正常
- [ ] 生图时正确扣费（根据模型代码）
- [ ] 美颜时正确扣费（根据模型代码）
- [ ] 消费日志正确记录
- [ ] 前端余额显示正常
- [ ] 余额不足时正确提示
- [ ] 模型价格显示正常

## API文档

### 公开接口

#### GET /api/public/model-prices
获取所有启用的模型价格
返回示例:
```json
[
  {
    "modelCode": "gemini-3.1-flash-image-preview",
    "modelName": "Gemini 3.1 Flash Image Preview",
    "provider": "Google",
    "price": 0.60
  }
]
```

#### GET /api/public/model-prices/price
获取指定模型的价格
参数: modelCode

### 用户接口

#### GET /api/balance/stats
获取用户余额统计

#### GET /api/balance/consume-logs
获取消费日志列表

#### GET /api/balance/consume-chart
获取消费统计图表数据

### 管理接口

#### GET /api/admin/model-prices
获取所有模型价格(分页)

#### POST /api/admin/model-prices
创建模型价格配置

#### PUT /api/admin/model-prices/{id}
更新模型价格配置

#### DELETE /api/admin/model-prices/{id}
删除模型价格配置

#### PUT /api/admin/model-prices/{id}/toggle
切换启用状态

## 常见问题

Q: 如何修改价格?
A: 在后台管理页面修改,或直接修改数据库 `model_price` 表的 `price` 字段

Q: 如何给用户充值?
A: 目前需要手动调用后端接口或修改数据库,后续会开发充值页面

Q: 任务失败会退款吗?
A: 当前版本不支持自动退款,需要手动处理

Q: 如何查看消费详情?
A: 前端消费记录页面开发中,目前可通过数据库 `consume_log` 表查看

Q: 如何添加新模型?
A: 在 `model_price` 表中插入新记录即可，包含 model_code、model_name、provider、price 等字段
