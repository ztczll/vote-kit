#!/bin/bash

# 修复SQL导入问题的脚本
# 1. 修复外键约束兼容性问题
# 2. 清空现有数据库

set -e

BACKUP_FILE="${1:-/root/code/vote-kit/backups/vote_kit_prod_20260227_150551.sql}"
FIXED_FILE="/tmp/vote_kit_prod_fixed.sql"

echo "🔧 修复SQL导入问题..."
echo "原始备份文件: $BACKUP_FILE"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 创建修复后的SQL文件
echo "📝 生成修复后的SQL文件..."

cat > "$FIXED_FILE" << 'EOF'
-- 禁用外键检查
SET FOREIGN_KEY_CHECKS=0;

-- 删除所有表
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

-- 启用外键检查
SET FOREIGN_KEY_CHECKS=1;
EOF

# 提取原始SQL中的CREATE TABLE和INSERT语句，跳过DROP和外键检查
echo "📋 提取表定义和数据..."
grep -v "^DROP TABLE" "$BACKUP_FILE" | \
grep -v "SET FOREIGN_KEY_CHECKS" | \
grep -v "^/\*" | \
grep -v "^\*/" | \
grep -v "^--" | \
sed '/^$/d' >> "$FIXED_FILE"

echo "✅ 修复后的SQL文件已生成: $FIXED_FILE"
echo ""
echo "📊 文件大小:"
echo "  原始: $(wc -c < "$BACKUP_FILE") 字节"
echo "  修复后: $(wc -c < "$FIXED_FILE") 字节"
echo ""
echo "🚀 现在可以使用以下命令导入数据库:"
echo "  mysql -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod < $FIXED_FILE"
