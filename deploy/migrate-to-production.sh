#!/bin/bash

# Vote-Kit 生产环境迁移脚本
# 从开发环境迁移到 Docker 生产环境，保留数据库和上传文件

set -e

echo "🚀 Vote-Kit 生产环境迁移"
echo "============================================="

# 检查必要的目录
echo "📁 检查并创建必要的目录..."
mkdir -p data/mysql
mkdir -p data/redis
mkdir -p logs/backend
mkdir -p logs/nginx
mkdir -p logs/mysql
mkdir -p logs/forge
mkdir -p logs/export-server

# 备份上传文件
echo "💾 备份上传文件..."
if [ -d "backend/uploads" ]; then
    BACKUP_DIR="backups/uploads_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r backend/uploads/* "$BACKUP_DIR/"
    echo "✓ 上传文件已备份到: $BACKUP_DIR"
else
    echo "⚠️  backend/uploads 目录不存在"
fi

# 导出开发环境数据库（如果 MySQL 正在运行）
echo "📊 导出开发环境数据库..."
if command -v mysql &> /dev/null; then
    if mysql -h localhost -P 3306 -u root -p${MYSQL_ROOT_PASSWORD:-changeme} -e "USE vote_kit_prod;" 2>/dev/null; then
        BACKUP_SQL="backups/vote_kit_prod_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p backups
        mysqldump -h localhost -P 3306 -u root -p${MYSQL_ROOT_PASSWORD:-changeme} vote_kit_prod > "$BACKUP_SQL" 2>/dev/null || true
        if [ -f "$BACKUP_SQL" ] && [ -s "$BACKUP_SQL" ]; then
            echo "✓ 数据库已导出到: $BACKUP_SQL"
        else
            echo "⚠️  数据库导出失败或数据库为空"
        fi
    else
        echo "⚠️  无法连接到开发环境 MySQL"
    fi
else
    echo "⚠️  MySQL 客户端未安装"
fi

# 更新 docker-compose.yml 添加 uploads 映射
echo "📝 更新 docker-compose.yml..."
if grep -q "backend-uploads" docker-compose.yml; then
    echo "✓ docker-compose.yml 已包含 uploads 映射"
else
    # 在 backend 服务的 volumes 部分添加 uploads 映射
    sed -i '/votekit-backend:/,/volumes:/s|volumes:|volumes:\n      - ./backend/uploads:/app/uploads|' docker-compose.yml
    echo "✓ 已添加 uploads 映射到 docker-compose.yml"
fi

# 创建生产环境初始化脚本
echo "📝 创建生产环境初始化脚本..."
cat > init/prod-data-import.sh << 'EOF_INIT'
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
EOF_INIT
chmod +x init/prod-data-import.sh

echo ""
echo "📋 迁移准备完成！"
echo "======================"
echo "📦 备份位置: $BACKUP_DIR"
echo "📊 数据库备份: ${BACKUP_SQL:-未生成}"
echo ""
echo "🔄 下一步操作："
echo "1. 检查备份文件是否正确"
echo "2. 运行 ./deploy-to-production.sh 开始部署"
echo ""
echo "⚠️  注意事项："
echo "• 确保 data/mysql 目录为空，除非你想保留现有数据库"
echo "• 上传文件将在启动时自动映射到容器"
echo "• 如果数据库备份已生成，将自动导入到生产环境"
