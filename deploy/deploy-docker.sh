#!/bin/bash

# Vote-Kit + Forge Engine Docker 部署脚本

set -e

echo "🚀 启动 Vote-Kit + Forge Engine Docker 部署"
echo "============================================"

# 检查 Docker 和 Docker Compose
echo "📋 检查环境..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker 未安装"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose 未安装"; exit 1; }

# 停止现有容器
echo "🛑 停止现有容器..."
docker-compose down --remove-orphans 2>/dev/null || true

# 清理旧镜像（可选）
echo "🧹 清理旧镜像..."
docker system prune -f

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker-compose up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 运行数据库迁移
echo "📊 运行数据库迁移..."
docker-compose exec vote-kit-backend npm run migrate:latest

# 检查服务状态
echo "🏥 检查服务状态..."
echo "MySQL: $(docker-compose ps mysql | grep -q 'Up' && echo '✅ 运行中' || echo '❌ 未运行')"
echo "Redis (Vote-Kit): $(docker-compose ps redis-vote | grep -q 'Up' && echo '✅ 运行中' || echo '❌ 未运行')"
echo "Redis (Forge): $(docker-compose ps redis-forge | grep -q 'Up' && echo '✅ 运行中' || echo '❌ 未运行')"
echo "Forge Engine: $(docker-compose ps forge-engine | grep -q 'Up' && echo '✅ 运行中' || echo '❌ 未运行')"
echo "Forge Export: $(docker-compose ps forge-export | grep -q 'Up' && echo '✅ 运行中' || echo '❌ 未运行')"
echo "Vote-Kit Backend: $(docker-compose ps vote-kit-backend | grep -q 'Up' && echo '✅ 运行中' || echo '❌ 未运行')"
echo "Vote-Kit Frontend: $(docker-compose ps vote-kit-frontend | grep -q 'Up' && echo '✅ 运行中' || echo '❌ 未运行')"

# 健康检查
echo ""
echo "🔍 健康检查..."
sleep 5

# 检查前端
if curl -s http://localhost/health > /dev/null; then
    echo "✅ 前端服务健康"
else
    echo "❌ 前端服务不健康"
fi

# 检查后端
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ 后端服务健康"
else
    echo "❌ 后端服务不健康"
fi

# 检查导出服务
if curl -s http://localhost:8081/health > /dev/null; then
    echo "✅ 导出服务健康"
else
    echo "❌ 导出服务不健康"
fi

echo ""
echo "🎉 部署完成！"
echo "==============="
echo "🌐 前端地址: http://localhost"
echo "🔧 后端API: http://localhost:3000"
echo "📦 导出服务: http://localhost:8081"
echo ""
echo "📋 测试步骤:"
echo "1. 访问 http://localhost 打开 Vote-Kit 前端"
echo "2. 注册/登录用户账号"
echo "3. 提交一个需求"
echo "4. 生成开发计划"
echo "5. 点击'生成应用'测试 Forge Engine 集成"
echo "6. 等待应用生成完成后下载源码"
echo ""
echo "📊 监控命令:"
echo "docker-compose logs -f                    # 查看所有日志"
echo "docker-compose logs -f vote-kit-backend   # 查看后端日志"
echo "docker-compose logs -f forge-engine       # 查看 Forge Engine 日志"
echo "docker-compose ps                         # 查看服务状态"
