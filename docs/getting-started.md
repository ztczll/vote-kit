# 快速开始

## 前置要求

- Node.js 18+
- Go 1.21+
- Docker & Docker Compose
- MySQL 8.0
- Redis 6+

## 本地开发

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/vote-kit.git
cd vote-kit
```

### 2. 配置后端环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env，填写数据库、Redis、AI API 等配置
```

关键配置项：

| 变量 | 说明 |
|------|------|
| `DB_HOST` / `DB_PASSWORD` | MySQL 连接信息 |
| `REDIS_HOST` / `REDIS_PASSWORD` | Redis 连接信息 |
| `JWT_SECRET` | JWT 签名密钥，生产环境请使用随机长字符串 |
| `AI_PROVIDER` | AI 提供商，`deepseek` 或 `coze` |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `COZE_CLIENT_ID` 等 | Coze 相关配置（使用 Coze 时填写） |

### 3. 初始化数据库

```bash
cd backend
npm install
npm run migrate:latest
```

### 4. 启动后端

```bash
npm run dev
# 后端运行在 http://localhost:3000
```

### 5. 启动前端

```bash
cd ../frontend
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

### 6. 构建并启动 Forge 引擎（可选）

Forge 引擎负责 Docker 构建与应用部署，本地开发可跳过。

```bash
cd ../forge
go build ./cmd/forge
./forge
```

## 使用 Docker Compose 启动完整环境

```bash
cd docker-deployment
cp .env.example .env   # 填写必要配置
docker compose up -d
```

服务启动后访问 `http://localhost`。

## 下一步

- [部署到生产环境](deployment.md)
- [API 文档](api.md)
