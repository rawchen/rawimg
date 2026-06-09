# RawImg - 在线RAW图片编辑器

一个基于Web的RAW图片编辑器，类似Adobe Lightroom，使用React、TypeScript和WebGPU/WebGL实现GPU加速的图片处理。

## 功能特性

- **RAW文件支持**: NEF、ARW、CR2、CR3、DNG（通过LibRaw WASM）
- **非破坏性编辑**: 所有调整都是基于参数的
- **GPU加速**: WebGPU优先，WebGL 2.0降级
- **实时预览**: 60 FPS的调整渲染
- **导出选项**: JPEG、PNG、TIFF、WebP

## 技术栈

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **状态管理**: Zustand
- **后端**: Spring Boot + MyBatis Plus + MySQL + Redis
- **GPU处理**: WebGPU/WebGL 2.0

## 快速开始

### 环境要求

- Node.js 18+
- pnpm
- Java 17+
- MySQL 8.0+
- Redis

### 安装运行

```bash
# 安装前端依赖
cd front
pnpm install

# 启动开发服务器
pnpm dev
```

### 后端配置

```bash
# 在 src/main/resources/application.yml 配置数据库
# 运行 Spring Boot 应用
./mvnw spring-boot:run
```

## 项目结构

```
front/src/
├── components/
│   ├── editor/           # 编辑器组件（画布、滑块、面板）
│   └── library/         # 图库/照片管理组件
├── stores/              # Zustand状态存储
├── hooks/               # 自定义React Hooks
├── shaders/             # WebGPU/WebGL着色器
└── workers/             # Web Workers用于RAW解码
```

## 许可证

MIT
