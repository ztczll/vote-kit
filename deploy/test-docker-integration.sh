#!/bin/bash

# 快速测试 Vote-Kit + Forge Engine 集成

echo "🧪 Vote-Kit + Forge Engine 集成测试"
echo "=================================="

# 测试前端
echo "🌐 测试前端服务..."
if curl -s http://localhost > /dev/null; then
    echo "✅ 前端可访问"
else
    echo "❌ 前端不可访问"
fi

# 测试后端健康检查
echo "🔧 测试后端服务..."
BACKEND_HEALTH=$(curl -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
    echo "✅ 后端健康: $BACKEND_HEALTH"
else
    echo "❌ 后端不健康"
fi

# 测试导出服务
echo "📦 测试导出服务..."
if curl -s http://localhost:8081/health > /dev/null; then
    echo "✅ 导出服务可访问"
else
    echo "❌ 导出服务不可访问"
fi

# 测试 Redis 连接
echo "📬 测试 Redis 连接..."
FORGE_REDIS=$(docker-compose exec -T redis-forge redis-cli -a testpass ping 2>/dev/null)
VOTE_REDIS=$(docker-compose exec -T redis-vote redis-cli ping 2>/dev/null)

if [ "$FORGE_REDIS" = "PONG" ]; then
    echo "✅ Forge Redis 连接正常"
else
    echo "❌ Forge Redis 连接失败"
fi

if [ "$VOTE_REDIS" = "PONG" ]; then
    echo "✅ Vote-Kit Redis 连接正常"
else
    echo "❌ Vote-Kit Redis 连接失败"
fi

# 测试数据库连接
echo "🗄️ 测试数据库连接..."
DB_TEST=$(docker-compose exec -T mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD:-changeme} -e "SELECT 1" vote_kit_prod 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
fi

echo ""
echo "🎯 测试结果总结"
echo "==============="
echo "现在可以进行前端测试："
echo "1. 打开浏览器访问: http://localhost"
echo "2. 注册新用户或登录"
echo "3. 提交测试需求"
echo "4. 生成应用测试 Forge Engine 集成"
echo ""
echo "📊 实时监控:"
echo "docker-compose logs -f vote-kit-backend | grep -E '(Forge|callback|generate)'"
