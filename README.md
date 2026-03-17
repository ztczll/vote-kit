# VoteKit

一个面向产品团队的需求投票与 AI 应用生成平台。用户可以提交产品需求、社区投票决定优先级，平台通过 AI 自动生成可运行的原型应用。

## 功能特性

- **需求投票**：提交需求、社区投票、管理员审核
- **AI 原型生成**：基于需求描述，通过 DeepSeek / Coze AI 自动生成可运行的 Web 应用原型
- **应用管理**：查看、部署、管理已生成的应用
- **积分系统**：按使用量计费，支持套餐订阅
- **Forge 引擎**：Go 编写的后台任务引擎，负责 Docker 构建与部署

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus |
| 后端 | Node.js + Koa + TypeScript + Knex |
| 数据库 | MySQL 8.0 |
| 缓存/队列 | Redis |
| AI | DeepSeek API / Coze API |
| 部署引擎 | Go (Forge Engine) |
| 容器化 | Docker + Docker Compose |
| 反向代理 | Caddy |

## 项目结构

```
vote-kit/
├── frontend/               # Vue 3 前端
├── backend/                # Koa 后端 API
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── database/       # 迁移文件
│   │   └── middleware/     # 认证等中间件
│   └── .env.example
├── forge/                  # Go 构建/部署引擎
├── docker-deployment/      # 生产 Docker Compose
├── deploy/                 # 部署脚本
├── docs/                   # 文档
└── Caddyfile               # 反向代理配置
```

## 快速开始

见 [docs/getting-started.md](docs/getting-started.md)

## 部署

见 [docs/deployment.md](docs/deployment.md)

## 许可证

MIT
