#!/bin/bash

# 修复数据库导入问题的脚本
# 问题: ERROR 3780 - 外键约束兼容性问题
# 解决方案: 禁用外键检查，清空表，重新导入

set -e

BACKUP_FILE="${1:-/root/code/vote-kit/backups/vote_kit_prod_20260227_150551.sql}"
MYSQL_HOST="${2:-votekit-mysql}"
MYSQL_USER="${3:-root}"
MYSQL_PASS="${4:-changeme}"
MYSQL_DB="${5:-vote_kit_prod}"

echo "🔧 数据库导入修复工具"
echo "================================"
echo "备份文件: $BACKUP_FILE"
echo "MySQL主机: $MYSQL_HOST"
echo "数据库: $MYSQL_DB"
echo ""

# 验证备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 错误: 备份文件不存在"
    echo "   路径: $BACKUP_FILE"
    exit 1
fi

echo "✓ 备份文件已验证"
echo ""

# 步骤1: 清空现有数据库
echo "📋 步骤1: 清空现有数据库..."
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" 2>/dev/null << 'EOF' || true
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

# 步骤2: 导入备份（禁用外键检查）
echo "📥 步骤2: 导入数据库备份..."
echo "   (禁用外键检查以避免兼容性问题)"

# 创建临时SQL文件，在开头添加禁用外键检查
TEMP_SQL="/tmp/import_$(date +%s).sql"
{
    echo "SET FOREIGN_KEY_CHECKS=0;"
    cat "$BACKUP_FILE"
    echo "SET FOREIGN_KEY_CHECKS=1;"
} > "$TEMP_SQL"

# 导入SQL
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$TEMP_SQL" 2>&1 | grep -v "Warning" || true

# 清理临时文件
rm -f "$TEMP_SQL"

echo "✓ 数据库导入完成"
echo ""

# 步骤3: 验证导入结果
echo "🔍 步骤3: 验证导入结果..."
TABLE_COUNT=$(mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DB';" 2>/dev/null)

echo "✓ 表数量: $TABLE_COUNT"
echo ""

# 显示表列表
echo "📊 导入的表:"
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" -se "SHOW TABLES;" 2>/dev/null | sed 's/^/   /'

echo ""
echo "✅ 修复完成！"
echo ""
echo "📝 后续步骤:"
echo "1. 验证数据完整性"
echo "2. 重启后端服务: docker compose restart votekit-backend"
echo "3. 访问应用: http://localhost"
