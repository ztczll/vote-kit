#!/bin/bash

# 修复并导入数据库的脚本
# 解决外键约束兼容性问题

set -e

BACKUP_FILE="${1:-/root/code/vote-kit/backups/vote_kit_prod_20260227_150551.sql}"
MYSQL_HOST="${2:-votekit-mysql}"
MYSQL_USER="${3:-root}"
MYSQL_PASS="${4:-changeme}"
MYSQL_DB="${5:-vote_kit_prod}"

echo "🔧 开始修复并导入数据库..."
echo "备份文件: $BACKUP_FILE"
echo "MySQL主机: $MYSQL_HOST"
echo "数据库: $MYSQL_DB"
echo ""

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 创建临时修复文件
FIXED_FILE="/tmp/vote_kit_fixed_$(date +%s).sql"

echo "📝 生成修复后的SQL文件..."

# 使用sed处理SQL文件，修复问题
cat "$BACKUP_FILE" | \
  sed '/^SET FOREIGN_KEY_CHECKS/d' | \
  sed '/^\/\*.*\*\//d' | \
  sed '/^\/\*/,/^\*\//d' | \
  sed '/^--/d' > "$FIXED_FILE"

# 在文件开头添加禁用外键检查
sed -i '1i SET FOREIGN_KEY_CHECKS=0;' "$FIXED_FILE"

# 在文件末尾添加启用外键检查
echo "SET FOREIGN_KEY_CHECKS=1;" >> "$FIXED_FILE"

echo "✅ 修复后的SQL文件: $FIXED_FILE"
echo ""

# 清空现有数据库
echo "🗑️  清空现有数据库..."
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" << 'CLEANUP_SQL'
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
CLEANUP_SQL

echo "✓ 数据库已清空"
echo ""

# 导入修复后的SQL
echo "📥 导入修复后的数据库备份..."
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" < "$FIXED_FILE"

echo "✅ 数据库导入完成！"
echo ""

# 验证导入结果
echo "🔍 验证导入结果..."
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" "$MYSQL_DB" -e "SHOW TABLES;" | head -20

echo ""
echo "✅ 修复和导入完成！"
echo "📝 临时文件: $FIXED_FILE (可以删除)"

# 清理临时文件
rm -f "$FIXED_FILE"
