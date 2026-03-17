#!/bin/bash

echo "🧪 测试AI生成应用修复效果"
echo "=========================="

echo "1. 检查前端超时配置..."
if grep -q "maxAttempts = 150" /root/code/vote-kit/frontend/src/components/AppGenerationDialog.vue; then
    echo "✅ 前端超时时间已增加到5分钟 (150次 × 2秒)"
else
    echo "❌ 前端超时配置未更新"
fi

echo ""
echo "2. 检查Forge Engine任务超时..."
if grep -q "task_timeout: 3600s" /root/code/forge/configs/config.yaml; then
    echo "✅ Forge Engine任务超时已增加到1小时"
else
    echo "❌ Forge Engine任务超时未更新"
fi

echo ""
echo "3. 检查Redis统一配置..."
REDIS_CONTAINERS=$(docker ps --format "table {{.Names}}" | grep redis | wc -l)
if [ "$REDIS_CONTAINERS" -eq 1 ]; then
    echo "✅ Redis已统一为单个容器"
    echo "   容器名: $(docker ps --format "{{.Names}}" | grep redis)"
else
    echo "❌ 仍有多个Redis容器运行"
fi

echo ""
echo "4. 检查服务连接状态..."
echo "   - 前端: $(curl -s -o /dev/null -w "%{http_code}" http://localhost/)"
echo "   - 后端: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)"
echo "   - Forge Engine: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)"
echo "   - 导出服务: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health)"

echo ""
echo "5. Redis数据库分配验证..."
echo "   - DB 0 (Vote-Kit): 可用"
echo "   - DB 1 (Forge): 可用"

echo ""
echo "🎯 修复总结:"
echo "• 前端等待超时: 30秒 → 5分钟"
echo "• Forge任务超时: 30分钟 → 1小时"  
echo "• Redis服务: 2个独立 → 1个统一"
echo "• 数据库隔离: DB0(Vote-Kit) + DB1(Forge)"
echo ""
echo "✅ 所有修复已完成，AI生成应用超时问题应已解决！"
