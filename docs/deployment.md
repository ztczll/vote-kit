# 生产部署

## 架构概览

```
Internet → Caddy (反向代理) → Frontend (Nginx)
                            → Backend (Koa API)
                                    ↓
                            MySQL + Redis
                                    ↓
                            Forge Engine (Docker 构建/部署)
```

## 使用 Docker Compose 部署

### 1. 准备服务器

- Ubuntu 20.04+
- Docker 20.10+
- Docker Compose v2

### 2. 克隆项目

```bash
git clone https://github.com/your-org/vote-kit.git
cd vote-kit/docker-deployment
```

### 3. 配置环境变量

`docker-deployment/docker-compose.yml` 通过环境变量注入敏感配置，在服务器上设置：

```bash
export MYSQL_ROOT_PASSWORD=your-strong-password
export DB_PASSWORD=your-strong-password
export REDIS_PASSWORD=your-strong-password
export DOMAIN=your-domain.com
```

或创建 `.env` 文件（不要提交到 git）：

```bash
MYSQL_ROOT_PASSWORD=your-strong-password
DB_PASSWORD=your-strong-password
REDIS_PASSWORD=your-strong-password
DOMAIN=your-domain.com
```

同时在 `docker-compose.yml` 的 `votekit-backend` 服务中补充：

```yaml
- DEEPSEEK_API_KEY=your-api-key
- JWT_SECRET=your-random-secret
```

### 4. 配置域名

编辑 `Caddyfile`，将 `{$DOMAIN}` 替换为实际域名，或通过环境变量 `DOMAIN` 传入。

### 5. 启动服务

```bash
docker compose up -d
```

### 6. 运行数据库迁移

```bash
docker compose exec votekit-backend npm run migrate:latest
```

### 7. 创建管理员账号

注册账号后，进入数据库手动设置 `is_admin = 1`：

```bash
docker compose exec votekit-mysql mysql -u root -p vote_kit_prod \
  -e "UPDATE users SET is_admin=1 WHERE email='your@email.com';"
```

## 部署 Forge 引擎

Forge 引擎需要单独部署在有 Docker 权限的宿主机上。

```bash
cd forge
./install.sh
```

安装后编辑 `/etc/forge/config.yaml`，配置 Redis 连接和 AI 服务。

详见 [forge/README.md](../forge/README.md)。

## 更新部署

```bash
git pull
docker compose build
docker compose up -d
docker compose exec votekit-backend npm run migrate:latest
```

## 常见问题

**后端无法连接数据库**：检查 `DB_HOST` 是否为 Docker 服务名（`votekit-mysql`），而非 `localhost`。

**Forge 任务卡住**：检查 Forge 引擎是否运行，以及 Redis 连接配置是否与后端一致。

**邮件发送失败**：开发环境默认使用 Mailpit（`http://localhost:8025` 查看），生产环境需配置真实 SMTP。
