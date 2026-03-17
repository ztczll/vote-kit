#!/bin/bash
# 生产环境数据导入脚本

set -e

echo "📥 导入生产环境数据..."

# 等待 MySQL 就绪
until mysqladmin ping -h votekit-mysql -u root -p${MYSQL_ROOT_PASSWORD:-changeme} --silent; do
    echo "等待 MySQL 启动..."
    sleep 2
done

# 检查是否有备份文件需要导入
if [ -f "/tmp/vote_kit_prod.sql" ]; then
    echo "导入数据库备份..."
    mysql -h votekit-mysql -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod < /tmp/vote_kit_prod.sql
    echo "✓ 数据库导入完成"
fi

echo "✓ 数据导入完成"
