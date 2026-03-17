# 清理 AI 生成的应用数据

## ⚠️ 警告

**删除操作不可逆！** 在执行删除命令前，请确保：
1. 已备份数据库（如果需要保留数据）
2. 确认要删除所有应用数据
3. 了解外键约束的影响

## 快速清理命令

### 方法 1：删除所有应用（推荐）

```sql
-- 1. 先查看要删除的数据
SELECT COUNT(*) as total FROM generated_apps;
SELECT * FROM generated_apps ORDER BY created_at DESC LIMIT 5;

-- 2. 删除所有应用（会自动删除关联的部署记录，因为有 CASCADE）
DELETE FROM generated_apps;

-- 3. 验证删除结果
SELECT COUNT(*) FROM generated_apps;
```

### 方法 2：删除特定状态的应用

```sql
-- 只删除生成中的应用
DELETE FROM generated_apps WHERE status = 'generating';

-- 只删除错误状态的应用
DELETE FROM generated_apps WHERE status = 'error';

-- 只删除已就绪的应用
DELETE FROM generated_apps WHERE status = 'ready';
```

### 方法 3：删除特定时间之前的应用

```sql
-- 删除 7 天前的应用
DELETE FROM generated_apps 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);

-- 删除特定日期之前的应用
DELETE FROM generated_apps 
WHERE created_at < '2026-01-20 00:00:00';
```

### 方法 4：删除特定用户的应用

```sql
-- 查看特定用户的应用
SELECT * FROM generated_apps WHERE created_by = '9d92c6bd-f4e5-11f0-963b-5281d6b74138';

-- 删除特定用户的应用
DELETE FROM generated_apps WHERE created_by = '9d92c6bd-f4e5-11f0-963b-5281d6b74138';
```

## 外键约束说明

根据数据库迁移文件，`generated_apps` 表有以下外键：

1. **requirement_id** → `requirements.id` (CASCADE)
   - 删除需求时，关联的应用会自动删除
   - 删除应用时，不会影响需求

2. **created_by** → `users.id` (CASCADE)
   - 删除用户时，关联的应用会自动删除
   - 删除应用时，不会影响用户

3. **app_deployments.app_id** → `generated_apps.id` (CASCADE)
   - 删除应用时，关联的部署记录会自动删除

## 完整的清理脚本

```sql
-- 1. 查看当前数据
SELECT 
    status,
    COUNT(*) as count
FROM generated_apps
GROUP BY status;

-- 2. 查看部署记录
SELECT COUNT(*) FROM app_deployments;

-- 3. 删除所有应用（会自动删除关联的部署记录）
DELETE FROM generated_apps;

-- 4. 验证删除结果
SELECT COUNT(*) FROM generated_apps;
SELECT COUNT(*) FROM app_deployments;
```

## 重置自增 ID（可选）

如果希望重置自增 ID 从 1 开始：

```sql
-- 重置自增 ID
ALTER TABLE generated_apps AUTO_INCREMENT = 1;
```

## 备份数据（可选）

如果需要备份数据：

```bash
# 导出数据到 SQL 文件
mysqldump -u root -p vote_kit_dev generated_apps > generated_apps_backup.sql

# 或者只导出数据（不包含表结构）
mysqldump -u root -p --no-create-info vote_kit_dev generated_apps > generated_apps_data_backup.sql
```

## 使用 Node.js 脚本清理（可选）

也可以创建一个清理脚本：

```typescript
// cleanup-apps.ts
import db from './src/config/database';

async function cleanupApps() {
  try {
    // 查看要删除的数据
    const count = await db('generated_apps').count('* as total').first();
    console.log(`准备删除 ${count.total} 个应用...`);

    // 删除所有应用
    const deleted = await db('generated_apps').delete();
    console.log(`已删除 ${deleted} 个应用`);

    // 验证
    const remaining = await db('generated_apps').count('* as total').first();
    console.log(`剩余应用数: ${remaining.total}`);
  } catch (error) {
    console.error('清理失败:', error);
  } finally {
    await db.destroy();
  }
}

cleanupApps();
```

运行：
```bash
npx ts-node cleanup-apps.ts
```

## 注意事项

1. **外键约束**：删除应用会自动删除关联的 `app_deployments` 记录
2. **文件系统**：删除数据库记录不会删除文件系统中的源码包和 Git 仓库，需要手动清理：
   ```bash
   # 清理 forge 导出的 zip 文件
   rm -rf /tmp/forge-exports/*
   
   # 清理 forge 的 Git 仓库
   rm -rf /tmp/forge-repos/*
   ```
3. **日志记录**：删除操作不会记录在日志中，建议在执行前记录要删除的应用 ID

