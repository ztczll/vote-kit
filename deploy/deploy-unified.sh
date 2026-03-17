#!/bin/bash

# 统一Redis部署脚本 - Vote-Kit + Forge Engine

set -e

echo "🚀 统一Redis部署 - Vote-Kit + Forge Engine"
echo "============================================="

# 停止现有容器
echo "🛑 停止现有容器..."
cd /root/code
docker compose -f docker-compose.simple.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.unified.yml down --remove-orphans 2>/dev/null || true

# 清理旧的Redis容器
echo "🧹 清理旧的Redis容器..."
docker stop vote-kit-redis forge-redis unified-redis shared-redis 2>/dev/null || true
docker rm vote-kit-redis forge-redis unified-redis shared-redis 2>/dev/null || true

# 构建并启动服务
echo "🔨 构建并启动服务..."
docker compose -f docker-compose.unified.yml up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 运行数据库迁移
echo "📊 运行数据库迁移..."
docker compose -f docker-compose.unified.yml exec vote-kit-backend npm run migrate:latest

# 检查服务状态
echo "🏥 检查服务状态..."
docker compose -f docker-compose.unified.yml ps

echo ""
echo "🎉 统一Redis部署完成！"
echo "======================"
echo "🌐 前端地址: http://localhost"
echo "🔧 后端API: http://localhost:3000"
echo "⚙️  Forge Engine: http://localhost:8080"
echo "📦 导出服务: http://localhost:8081"
echo "🗄️  MySQL: localhost:3306"
echo "📊 共享Redis: localhost:6379"
echo ""
echo "📋 Redis数据库分配："
echo "• DB 0: Vote-Kit 数据"
echo "• DB 1: Forge Engine 任务队列"
echo ""
echo "🔧 修复内容："
echo "• Docker socket已挂载到forge-engine"
echo "• Redis容器名: shared-redis"
echo ""
echo "⏱️  超时配置优化："
echo "• 前端等待时间: 5分钟"
echo "• Forge任务超时: 1小时"
echo "• 后端AI生成超时: 5分钟"
echo ""
echo "📊 监控命令:"
echo "docker compose -f docker-compose.unified.yml logs -f"
