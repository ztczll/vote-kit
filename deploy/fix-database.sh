#!/bin/bash

# 修复数据库表结构

echo "🔧 修复数据库表结构..."

# 重置数据库
docker-compose -f docker-compose.simple.yml exec mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD:-changeme} -e "DROP DATABASE IF EXISTS vote_kit_prod; CREATE DATABASE vote_kit_prod;"

# 重新运行迁移
docker-compose -f docker-compose.simple.yml exec vote-kit-backend npm run migrate:latest

echo "✅ 数据库修复完成"
