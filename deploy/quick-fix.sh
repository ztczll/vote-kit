#!/bin/bash

# 一键修复脚本
# 解决数据库导入和MCP配置问题

set -e

echo "🔧 Vote-Kit 一键修复工具"
echo "================================"
echo ""

# 检查Docker是否运行
if ! docker compose ps &>/dev/null; then
    echo "❌ Docker Compose 未运行"
    echo "请先运行: docker compose up -d"
    exit 1
fi

# 检查MySQL容器
if ! docker compose ps votekit-mysql | grep -q "Up"; then
    echo "❌ MySQL 容器未运行"
    echo "请先运行: docker compose up -d"
    exit 1
fi

BACKUP_FILE="/root/code/vote-kit/backups/vote_kit_prod_20260227_150551.sql"

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "✓ 环境检查完成"
echo ""

# 步骤1: 修复MCP配置
echo "📋 步骤1: 修复MCP配置..."
MCP_FILE="/root/code/vote-kit/.kiro/settings/mcp.json"
if [ -f "$MCP_FILE" ]; then
    cat > "$MCP_FILE" << 'EOF'
{
  "mcpServers": {}
}
EOF
    echo "✓ MCP配置已修复"
else
    echo "⚠️  MCP配置文件不存在，跳过"
fi

echo ""

# 步骤2: 清空数据库
echo "📋 步骤2: 清空现有数据库..."
docker compose exec -T votekit-mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod 2>/dev/null << 'EOF' || true
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS `app_deployments`;
DROP TABLE IF EXISTS `app_templates`;
DROP TABLE IF EXISTS `artifact_cache`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `generated_apps`;
DROP TABLE IF EXISTS `gen_tasks`;
DROP TABLE IF EXISTS `payment_orders`;
DROP TABLE IF EXISTS `prompt_templates`;
DROP TABLE IF EXISTS `quota_topups`;
DROP TABLE IF EXISTS `requirements`;
DROP TABLE IF EXISTS `status_history`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `team_members`;
DROP TABLE IF EXISTS `teams`;
DROP TABLE IF EXISTS `user_usage`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `votes`;
DROP TABLE IF EXISTS `analytics_events`;
DROP TABLE IF EXISTS `ai_usage_logs`;
DROP TABLE IF EXISTS `plans_config`;
DROP TABLE IF EXISTS `knex_migrations`;
DROP TABLE IF EXISTS `knex_migrations_lock`;
SET FOREIGN_KEY_CHECKS=1;
EOF

echo "✓ 数据库已清空"
echo ""

# 步骤3: 导入备份
echo "📥 步骤3: 导入数据库备份..."
echo "   文件: $BACKUP_FILE"

# 创建临时SQL文件
TEMP_SQL="/tmp/import_$(date +%s).sql"
{
    echo "SET FOREIGN_KEY_CHECKS=0;"
    cat "$BACKUP_FILE"
    echo "SET FOREIGN_KEY_CHECKS=1;"
} > "$TEMP_SQL"

# 复制到容器并导入
docker compose cp "$TEMP_SQL" votekit-mysql:/tmp/import.sql
docker compose exec -T votekit-mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod < "$TEMP_SQL" 2>&1 | grep -v "Warning" || true

# 清理
rm -f "$TEMP_SQL"

echo "✓ 数据库导入完成"
echo ""

# 步骤4: 验证
echo "🔍 步骤4: 验证导入结果..."
TABLE_COUNT=$(docker compose exec -T votekit-mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='vote_kit_prod';" 2>/dev/null)

echo "✓ 表数量: $TABLE_COUNT"
echo ""

# 显示表列表
echo "📊 导入的表:"
docker compose exec -T votekit-mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod -se "SHOW TABLES;" 2>/dev/null | sed 's/^/   /'

echo ""

# 步骤5: 重启后端
echo "📋 步骤5: 重启后端服务..."
docker compose restart votekit-backend
sleep 5

echo "✓ 后端已重启"
echo ""

# 最终验证
echo "🔍 最终验证..."
if curl -s http://localhost:3000/api/health &>/dev/null; then
    echo "✓ 后端API 正常"
else
    echo "⚠️  后端API 可能未就绪，请稍候..."
fi

echo ""
echo "✅ 修复完成！"
echo ""
echo "📝 后续步骤:"
echo "1. 访问前端: http://localhost"
echo "2. 查看日志: docker compose logs -f votekit-backend"
echo "3. 验证数据: docker compose exec votekit-mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod -e 'SELECT COUNT(*) FROM users;'"
echo ""
echo "📚 更多信息请查看: /root/code/vote-kit/FIXES.md"
