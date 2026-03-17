# 灵感收藏夹 (Inspiration Collector)

一个专注于高效收集、结构化整理与快速检索多媒体灵感素材的个人知识管理系统。

## 项目概述

灵感收藏夹是 vote-kit 项目的子项目，为内容创作者、设计师、研究人员及新媒体运营者提供专业级的素材管理工作流解决方案。

## 核心功能

- 🎯 **多种采集方式**：拖拽上传、粘贴图片、URL 抓取
- 🏷️ **智能标签管理**：多标签支持、标签统计、批量操作
- 🔍 **全文搜索**：跨字段搜索、关键词高亮、高级筛选
- 📊 **多视图展示**：网格视图、列表视图、自动缩略图
- 👥 **用户隔离**：独立数据空间、安全认证
- 🐳 **容器化部署**：Docker 支持、一键部署

## 技术栈

### 前端
- Vue 3 (Composition API)
- TypeScript
- Pinia (状态管理)
- Vite (构建工具)
- Element Plus (UI 组件库)

### 后端
- Node.js + Express
- TypeScript
- PostgreSQL (生产) / SQLite (开发)
- JWT 认证
- Multer (文件上传)

### 部署
- Docker + Docker Compose
- Nginx (反向代理)
- 支持阿里云 ACR

## 项目结构

```
inspiration-collector/
├── frontend/           # Vue 3 前端应用
│   ├── src/
│   │   ├── components/ # 可复用组件
│   │   ├── views/      # 页面组件
│   │   ├── stores/     # Pinia stores
│   │   ├── router/     # 路由配置
│   │   └── api/        # API 客户端
│   ├── public/
│   └── package.json
├── backend/            # Node.js 后端应用
│   ├── src/
│   │   ├── routes/     # API 路由
│   │   ├── controllers/# 控制器
│   │   ├── models/     # 数据模型
│   │   ├── middleware/ # 中间件
│   │   └── utils/      # 工具函数
│   └── package.json
├── docker/             # Docker 配置
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   └── nginx.conf
├── Dockerfile          # 根目录 Dockerfile
├── docker-compose.yml  # Docker Compose 配置
└── README.md

```

## 快速开始

### 开发环境

1. **安装依赖**
```bash
# 前端
cd frontend
npm install

# 后端
cd backend
npm install
```

2. **配置环境变量**
```bash
# 后端 .env
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库等信息
```

3. **启动开发服务器**
```bash
# 后端（端口 3000）
cd backend
npm run dev

# 前端（端口 5173）
cd frontend
npm run dev
```

4. **访问应用**
- 前端：http://localhost:5173
- 后端 API：http://localhost:3000

### Docker 部署

1. **构建镜像**
```bash
docker build -t inspiration-collector:latest .
```

2. **使用 Docker Compose 启动**
```bash
docker-compose up -d
```

3. **访问应用**
- 应用：http://localhost:80

### 阿里云 ACR 部署

```bash
# 标记镜像
docker tag inspiration-collector:latest registry.cn-shanghai.aliyuncs.com/<命名空间>/inspiration-collector:latest

# 推送到 ACR
docker push registry.cn-shanghai.aliyuncs.com/<命名空间>/inspiration-collector:latest
```

## 开发指南

### 数据库迁移

```bash
cd backend
npm run migrate
```

### 运行测试

```bash
# 前端测试
cd frontend
npm run test

# 后端测试
cd backend
npm run test

# 属性测试
npm run test:property
```

### 代码规范

```bash
# 检查代码规范
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

## API 文档

API 文档位于 `backend/docs/api.md`，包含所有端点的详细说明。

主要端点：
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/items` - 获取收藏项列表
- `POST /api/items` - 创建收藏项
- `POST /api/upload` - 上传文件
- `GET /api/search` - 搜索收藏项
- `GET /api/tags` - 获取标签列表

## 规格说明文档

完整的规格说明文档位于项目根目录的 `.kiro/specs/inspiration-collector/`：
- `requirements.md` - 需求文档
- `design.md` - 设计文档
- `tasks.md` - 任务列表

## 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目是 vote-kit 的子项目，遵循相同的许可证。

## 联系方式

如有问题或建议，请通过 issue 或 PR 与我们联系。
