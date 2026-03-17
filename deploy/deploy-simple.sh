#!/bin/bash

# 简化的 Docker 部署脚本 - 使用预构建的二进制文件

set -e

echo "🚀 简化 Docker 部署 - Vote-Kit + Forge Engine"
echo "============================================="

# 构建 Forge Engine 二进制文件
echo "🔨 构建 Forge Engine 二进制文件..."
cd /root/code/forge
export GOPROXY=https://goproxy.cn,direct
go build -o forge-engine ./cmd/forge
go build -o export-server ./cmd/export-server

# 创建简化的 Forge Dockerfile
cat > Dockerfile.simple << 'EOF'
FROM alpine:latest
RUN apk --no-cache add ca-certificates git
WORKDIR /root/

# Mock kiro-cli for container
RUN echo '#!/bin/sh' > /usr/local/bin/kiro-cli && \
    echo 'echo "Mock Kiro CLI - generating sample code..."' >> /usr/local/bin/kiro-cli && \
    echo 'mkdir -p /tmp/generated-code' >> /usr/local/bin/kiro-cli && \
    echo 'echo "console.log(\"Hello from generated app\");" > /tmp/generated-code/app.js' >> /usr/local/bin/kiro-cli && \
    chmod +x /usr/local/bin/kiro-cli

COPY forge-engine .
COPY export-server .
COPY configs ./configs

EXPOSE 8081
CMD ["./forge-engine"]
EOF

# 停止现有容器
echo "🛑 停止现有容器..."
cd /root/code
docker compose down --remove-orphans 2>/dev/null || true

# 更新 docker compose 使用简化的 Dockerfile
cat > docker compose.simple.yml << 'EOF'
version: '3.2'

services:
  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: vote-kit-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-changeme}
      MYSQL_DATABASE: vote_kit_prod
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - vote-kit-network

  # Redis (Vote-Kit)
  redis-vote:
    image: redis:7-alpine
    container_name: vote-kit-redis
    ports:
      - "6379:6379"
    networks:
      - vote-kit-network

  # Redis (Forge Engine)
  redis-forge:
    image: redis:7-alpine
    container_name: forge-redis
    command: redis-server --requirepass testpass
    ports:
      - "6380:6379"
    networks:
      - vote-kit-network

  # Forge Engine
  forge-engine:
    build:
      context: ./forge
      dockerfile: Dockerfile.simple
    container_name: forge-engine
    environment:
      - REDIS_HOST=redis-forge
      - REDIS_PORT=6379
      - REDIS_PASSWORD=testpass
      - KIRO_CLI_PATH=/usr/local/bin/kiro-cli
    volumes:
      - forge_repos:/tmp/forge-repos
    depends_on:
      - redis-forge
    networks:
      - vote-kit-network

  # Forge Export Server
  forge-export:
    build:
      context: ./forge
      dockerfile: Dockerfile.simple
    container_name: forge-export
    command: ["./export-server"]
    ports:
      - "8081:8081"
    volumes:
      - forge_repos:/tmp/forge-repos
    depends_on:
      - forge-engine
    networks:
      - vote-kit-network

  # Vote-Kit Backend
  vote-kit-backend:
    build:
      context: ./vote-kit/backend
      dockerfile: Dockerfile
    container_name: vote-kit-backend
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD:-changeme}
      - DB_NAME=vote_kit_prod
      - REDIS_HOST=redis-vote
      - REDIS_PORT=6379
      - JWT_SECRET=your-production-jwt-secret
      - VOTE_KIT_BASE_URL=http://vote-kit-backend:3000
      - FORGE_REDIS_HOST=redis-forge
      - FORGE_REDIS_PORT=6379
      - FORGE_REDIS_PASSWORD=testpass
      - FORGE_EXPORT_SERVICE_URL=http://forge-export:8081
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - redis-vote
      - redis-forge
      - forge-engine
    networks:
      - vote-kit-network

  # Vote-Kit Frontend
  vote-kit-frontend:
    build:
      context: ./vote-kit/frontend
      dockerfile: Dockerfile
    container_name: vote-kit-frontend
    ports:
      - "80:80"
    depends_on:
      - vote-kit-backend
    networks:
      - vote-kit-network

volumes:
  mysql_data:
  forge_repos:

networks:
  vote-kit-network:
    driver: bridge
EOF

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker compose -f docker compose.simple.yml up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 运行数据库迁移
echo "📊 运行数据库迁移..."
docker compose -f docker compose.simple.yml exec vote-kit-backend npm run migrate:latest

# 检查服务状态
echo "🏥 检查服务状态..."
docker compose -f docker compose.simple.yml ps

echo ""
echo "🎉 简化部署完成！"
echo "=================="
echo "🌐 前端地址: http://localhost"
echo "🔧 后端API: http://localhost:3000"
echo "📦 导出服务: http://localhost:8081"
echo ""
echo "📋 测试步骤:"
echo "1. 访问 http://localhost"
echo "2. 注册/登录用户"
echo "3. 提交需求并生成应用"
echo ""
echo "📊 监控命令:"
echo "docker compose -f docker compose.simple.yml logs -f"
