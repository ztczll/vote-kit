#!/bin/bash

# 部署前环境检查

echo "🔍 部署前环境检查"
echo "=================="

# 检查 Docker
echo "🐳 检查 Docker..."
if command -v docker >/dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version)
    echo "✅ Docker 已安装: $DOCKER_VERSION"
    
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker 服务运行正常"
    else
        echo "❌ Docker 服务未运行，请启动 Docker"
        exit 1
    fi
else
    echo "❌ Docker 未安装"
    echo "请安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose
echo "🔧 检查 Docker Compose..."
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo "✅ Docker Compose 已安装: $COMPOSE_VERSION"
else
    echo "❌ Docker Compose 未安装"
    echo "请安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 检查端口占用
echo "🔌 检查端口占用..."
PORTS=(80 3000 3306 6379 6380 8081)
for port in "${PORTS[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "⚠️ 端口 $port 已被占用"
        lsof -i :$port
    else
        echo "✅ 端口 $port 可用"
    fi
done

# 检查磁盘空间
echo "💾 检查磁盘空间..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ 磁盘使用率较高: ${DISK_USAGE}%"
else
    echo "✅ 磁盘空间充足: ${DISK_USAGE}% 已使用"
fi

# 检查内存
echo "🧠 检查内存..."
MEMORY_MB=$(free -m | awk 'NR==2{printf "%.0f", $2}')
if [ $MEMORY_MB -lt 2048 ]; then
    echo "⚠️ 内存较少: ${MEMORY_MB}MB (建议至少 2GB)"
else
    echo "✅ 内存充足: ${MEMORY_MB}MB"
fi

# 检查必要文件
echo "📁 检查项目文件..."
FILES=(
    "/root/code/docker-compose.yml"
    "/root/code/vote-kit/backend/Dockerfile"
    "/root/code/vote-kit/frontend/Dockerfile"
    "/root/code/forge/Dockerfile"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 缺失"
    fi
done

echo ""
echo "🎯 检查完成"
echo "==========="
if [ $? -eq 0 ]; then
    echo "✅ 环境检查通过，可以开始部署"
    echo "运行: ./deploy-docker.sh"
else
    echo "❌ 环境检查失败，请解决上述问题后重试"
fi
