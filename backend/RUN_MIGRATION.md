# 运行数据库迁移

## 问题
如果遇到以下错误：
```
Unknown column 'tokens_used' in 'field list'
```

说明数据库迁移未执行，需要运行迁移来添加新字段。

## 解决方法

### 方法 1：使用 npm 脚本运行迁移（推荐）

```bash
cd backend
npm run build
npm run migrate:latest
```

### 方法 2：如果遇到数据库连接错误

如果看到 `Access denied for user 'root'@'...' (using password: NO)` 错误，说明 `.env` 文件未正确加载。

**解决方案：**

1. 确保 `.env` 文件在 `backend` 目录下：
```bash
cd backend
ls -la .env
```

2. 检查 `.env` 文件内容，确保包含数据库配置：
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vote_kit_dev
```

3. 重新编译项目（已修复 knexfile.ts 来正确加载 .env）：
```bash
npm run build
npm run migrate:latest
```

### 方法 3：手动运行迁移（如果方法 1 和 2 都失败）

1. 确保项目已编译：
```bash
cd backend
npm run build
```

2. 检查编译后的迁移文件是否存在：
```bash
ls dist/database/migrations/
```

3. 从 backend 目录运行迁移（不要切换到 dist 目录）：
```bash
# 在 backend 目录下运行
NODE_ENV=development npx knex migrate:latest --knexfile dist/knexfile.js
```

或者，如果 .env 文件在 backend 目录，可以这样运行：
```bash
cd backend
# 确保在 backend 目录，然后运行
npx knex migrate:latest --knexfile dist/knexfile.js
```

## 验证迁移是否成功

运行迁移后，应该看到类似输出：
```
Batch 1 run: 1 migrations
```

然后可以验证字段是否已添加：
```sql
DESCRIBE generated_apps;
```

应该能看到以下新字段：
- `tokens_used` (integer)
- `cost_cents` (integer)
- `billing_status` (enum)

## 回滚迁移（如果需要）

如果需要回滚迁移：
```bash
npm run migrate:rollback
```

